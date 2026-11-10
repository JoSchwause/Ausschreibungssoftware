// SPDX-License-Identifier: AGPL-3.0-or-later
// Angebotsbefehle ausführen (Ticket 36, Punkt 3). Die Vertragssignatur `AngebotBefehlAusfuehren` kennt weder Projekt
// noch LV; die Fabrik `angebotBefehlAusfuehrer` schließt beide ein und baut den Index des LV einmal.
//
// Neuberechnung nur im betroffenen Teilbaum (A6): `AngebotspositionSetzen` rechnet den GP der einen Position neu und
// ändert die Summen ihrer Gliederungen bis zur Wurzel um die Differenz, dazu die Gesamtsummen. Kosten O(Tiefe) plus
// einmal je Positionsarray der Aufbau eines Index (Positions-ID → Eintrag).

import { NULL_BETRAG, alsEinheitspreis, addiere, subtrahiere, vorzeichen } from '@tethys/dezimal';
import { gesamtsummen, nachlassFehler, positionsSumme } from '@tethys/kern';
import type {
  Aenderung,
  Angebot,
  AngebotBefehl,
  AngebotBefehlAusfuehren,
  AngebotChangeSet,
  AngebotKopf,
  AngebotZustand,
  Angebotsposition,
  Befehlsfehler,
  Befehlsfehlercode,
  Betrag,
  Ergebnis,
  Gesamtsummen,
  GliederungId,
  Gliederungssumme,
  Knoten,
  LvZustand,
  Nachlass,
  Position,
  Positionssumme,
  Projekt,
  Summenaenderung,
} from '@tethys/vertrag';
import { angebotKopf } from './changeset';
import { angebotSummenBerechnen, angebotsEinheitspreis, angebotspositionenNachId } from './summen';

type Antwort = Ergebnis<AngebotChangeSet, Befehlsfehler>;

function nein(code: Befehlsfehlercode, meldung: string, knotenId?: string, feld?: string): Antwort {
  const fehler = {
    code,
    meldung,
    ...(knotenId === undefined ? {} : { knotenId }),
    ...(feld === undefined ? {} : { feld }),
  } as Befehlsfehler;
  return { ok: false, fehler };
}

/** Gleichheit reiner Daten (Angebotspositionen, Nachlass): gleiche Schlüssel, gleiche Werte. */
function gleich(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => gleich((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

const gleicheGesamtsummen = (a: Gesamtsummen, b: Gesamtsummen): boolean =>
  a.netto === b.netto &&
  a.nachlass === b.nachlass &&
  a.nettoNachNachlass === b.nettoNachNachlass &&
  a.mwst === b.mwst &&
  a.brutto === b.brutto;

/** Was die Position zur Summe beiträgt (wie im Kern): ihr GP, wenn sie eingeht, sonst 0,00. */
const beitrag = (s: Positionssumme): Betrag =>
  s.gehtInSummeEin && s.gesamtpreis !== null ? s.gesamtpreis : NULL_BETRAG;

const LEERES_VORHER = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  entfernt: { positionen: [], gliederungen: [] },
} as const;

const LEERE_SUMMEN: Summenaenderung = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  vorher: LEERES_VORHER,
};

function changeSet(
  zustand: { readonly angebot: Pick<Angebot, 'id'> },
  teile: {
    kopf?: Aenderung<AngebotKopf>;
    hinzugefuegt?: readonly Angebotsposition[];
    geaendert?: readonly { readonly vorher: Angebotsposition; readonly nachher: Angebotsposition }[];
    entfernt?: readonly Angebotsposition[];
    summen?: Summenaenderung;
  },
): Antwort {
  return {
    ok: true,
    wert: {
      art: 'angebot',
      angebotId: zustand.angebot.id,
      kopf: teile.kopf ?? null,
      positionen: {
        hinzugefuegt: teile.hinzugefuegt ?? [],
        geaendert: teile.geaendert ?? [],
        entfernt: teile.entfernt ?? [],
      },
      summen: teile.summen ?? LEERE_SUMMEN,
    },
  };
}

// --- Index des LV ---------------------------------------------------------------------------------------------------

interface LvIndex {
  readonly lvId: string;
  readonly byId: ReadonlyMap<string, Knoten>;
}

function lvIndex(lv: LvZustand): LvIndex {
  const byId = new Map<string, Knoten>();
  for (const k of lv.leistungsverzeichnis.knoten) byId.set(k.id, k);
  return { lvId: lv.leistungsverzeichnis.id, byId };
}

/** Summenstand-Eintrag einer Gliederung nach Kennung (Index je Array einmal). */
const gliederungsIndexCache = new WeakMap<
  readonly Gliederungssumme[],
  ReadonlyMap<string, Gliederungssumme>
>();
function gliederungssumme(liste: readonly Gliederungssumme[], id: string): Gliederungssumme | undefined {
  let m = gliederungsIndexCache.get(liste);
  if (!m) {
    m = new Map(liste.map((g) => [g.gliederungId as string, g]));
    gliederungsIndexCache.set(liste, m);
  }
  return m.get(id);
}

const positionsIndexCache = new WeakMap<readonly Positionssumme[], ReadonlyMap<string, Positionssumme>>();
function positionssumme(liste: readonly Positionssumme[], id: string): Positionssumme | undefined {
  let m = positionsIndexCache.get(liste);
  if (!m) {
    m = new Map(liste.map((p) => [p.positionId as string, p]));
    positionsIndexCache.set(liste, m);
  }
  return m.get(id);
}

// --- Prüfungen ------------------------------------------------------------------------------------------------------

function kopfFehler(projekt: Projekt, lv: LvZustand, a: AngebotKopf): Antwort | null {
  const l = lv.leistungsverzeichnis;
  if (a.leistungsverzeichnisId !== l.id)
    return nein(
      'ungueltige-eingabe',
      `Das Angebot gehört nicht zum LV ${l.id}.`,
      undefined,
      'leistungsverzeichnisId',
    );
  if (a.projektId !== l.projektId)
    return nein(
      'ungueltige-eingabe',
      `Das Angebot gehört nicht zum Projekt ${l.projektId}.`,
      undefined,
      'projektId',
    );
  return null;
}

function positionFehler(index: LvIndex, p: Angebotsposition): Antwort | null {
  const k = index.byId.get(p.positionId);
  if (!k)
    return nein(
      'knoten-unbekannt',
      `Position ${p.positionId} gibt es im LV nicht.`,
      p.positionId,
      'positionId',
    );
  if (k.art !== 'position')
    return nein(
      'knotenart-unzulaessig',
      `Knoten ${p.positionId} ist keine Position.`,
      p.positionId,
      'positionId',
    );
  if (p.status === 'angeboten' && !alsEinheitspreis(p.einheitspreis).ok)
    return nein(
      'ungueltige-eingabe',
      `Kein kanonischer Einheitspreis mit 3 Stellen: ${JSON.stringify(p.einheitspreis)}`,
      p.positionId,
      'einheitspreis',
    );
  return null;
}

function nachlassPruefen(n: Nachlass | null): Antwort | null {
  if (n === null) return null;
  const meldung = nachlassFehler(n);
  return meldung === null ? null : nein('ungueltige-eingabe', meldung, undefined, 'nachlass');
}

// --- Fabrik ---------------------------------------------------------------------------------------------------------

/**
 * Liefert die Ausführung der Angebotsbefehle zu einem Projekt und einem Ausschreibungs-LV. Rein und deterministisch
 * (A2); erwartbare Fehler sind Werte. `BieterAnlegen` ist ein Projektbefehl (Kern); hier wird nur gelesen, ob es den
 * Bieter gibt.
 */
export function angebotBefehlAusfuehrer(projekt: Projekt, lv: LvZustand): AngebotBefehlAusfuehren {
  const index = lvIndex(lv);
  const l = lv.leistungsverzeichnis;

  function anlegen(a: Angebot): Antwort {
    const f = kopfFehler(projekt, lv, a);
    if (f) return f;
    if (!projekt.bieter.some((b) => b.id === a.bieterId))
      return nein(
        'ungueltige-eingabe',
        `Bieter ${a.bieterId} gibt es im Projekt nicht.`,
        undefined,
        'bieterId',
      );
    const nf = nachlassPruefen(a.nachlass);
    if (nf) return nf;
    const gesehen = new Set<string>();
    for (const p of a.positionen) {
      const pf = positionFehler(index, p);
      if (pf) return pf;
      if (gesehen.has(p.positionId))
        return nein(
          'ungueltige-eingabe',
          `Position ${p.positionId} steht zweimal im Angebot.`,
          p.positionId,
          'positionen',
        );
      gesehen.add(p.positionId);
    }
    const s = angebotSummenBerechnen(lv, a);
    return changeSet(
      { angebot: a },
      {
        kopf: { vorher: null, nachher: angebotKopf(a) },
        hinzugefuegt: a.positionen,
        summen: {
          positionen: s.positionen,
          gliederungen: s.gliederungen,
          gesamt: s.gesamt,
          vorher: LEERES_VORHER,
        },
      },
    );
  }

  function positionSetzen(z: AngebotZustand, neu: Angebotsposition): Antwort {
    const pf = positionFehler(index, neu);
    if (pf) return pf;
    const lvPos = index.byId.get(neu.positionId) as Position;
    const alt = angebotspositionenNachId(z.angebot.positionen).get(neu.positionId);
    if (alt !== undefined && gleich(alt, neu)) return changeSet(z, {});

    const positionsaenderung =
      alt === undefined ? { hinzugefuegt: [neu] } : { geaendert: [{ vorher: alt, nachher: neu }] };
    const altSumme =
      positionssumme(z.summen.positionen, neu.positionId) ??
      positionsSumme({ ...lvPos, einheitspreis: angebotsEinheitspreis(alt) });
    const neuSumme = positionsSumme({ ...lvPos, einheitspreis: angebotsEinheitspreis(neu) });
    if (altSumme.gesamtpreis === neuSumme.gesamtpreis && altSumme.gehtInSummeEin === neuSumme.gehtInSummeEin)
      return changeSet(z, positionsaenderung);

    const differenz = subtrahiere(beitrag(neuSumme), beitrag(altSumme));
    const gliederungen: Gliederungssumme[] = [];
    const gliederungenVorher: Gliederungssumme[] = [];
    let gesamt: Gesamtsummen | null = null;
    if (vorzeichen(differenz) !== 0) {
      let k: string = lvPos.elternId;
      while (k !== index.lvId) {
        const g = index.byId.get(k);
        if (!g) break;
        const vorher = gliederungssumme(z.summen.gliederungen, k);
        if (vorher) {
          gliederungenVorher.push(vorher);
          gliederungen.push({
            ...vorher,
            gliederungId: k as GliederungId,
            summe: addiere(vorher.summe, differenz),
          });
        }
        k = g.elternId;
      }
      const neuGesamt = gesamtsummen(
        addiere(z.summen.gesamt.netto, differenz),
        z.angebot.nachlass,
        l.mwstSatz,
      );
      if (!gleicheGesamtsummen(neuGesamt, z.summen.gesamt)) gesamt = neuGesamt;
    }
    return changeSet(z, {
      ...positionsaenderung,
      summen: {
        positionen: [neuSumme],
        gliederungen,
        gesamt,
        vorher: {
          positionen: [altSumme],
          gliederungen: gliederungenVorher,
          gesamt: gesamt === null ? null : z.summen.gesamt,
          entfernt: { positionen: [], gliederungen: [] },
        },
      },
    });
  }

  function nachlassAendern(z: AngebotZustand, nachlass: Nachlass | null): Antwort {
    const nf = nachlassPruefen(nachlass);
    if (nf) return nf;
    if (gleich(z.angebot.nachlass, nachlass)) return changeSet(z, {});
    const vorher = angebotKopf(z.angebot);
    const neuGesamt = gesamtsummen(z.summen.gesamt.netto, nachlass, l.mwstSatz);
    const gesamt = gleicheGesamtsummen(neuGesamt, z.summen.gesamt) ? null : neuGesamt;
    return changeSet(z, {
      kopf: { vorher, nachher: { ...vorher, nachlass } },
      summen: {
        positionen: [],
        gliederungen: [],
        gesamt,
        vorher: { ...LEERES_VORHER, gesamt: gesamt === null ? null : z.summen.gesamt },
      },
    });
  }

  function loeschen(z: AngebotZustand): Antwort {
    return changeSet(z, {
      kopf: { vorher: angebotKopf(z.angebot), nachher: null },
      entfernt: z.angebot.positionen,
      summen: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        vorher: {
          positionen: [],
          gliederungen: [],
          gesamt: z.summen.gesamt,
          entfernt: { positionen: z.summen.positionen, gliederungen: z.summen.gliederungen },
        },
      },
    });
  }

  return (zustand, befehl: AngebotBefehl): Antwort => {
    if (befehl.art === 'AngebotAnlegen') {
      if (zustand !== null) return nein('befehl-nicht-zustaendig', 'AngebotAnlegen verlangt keinen Zustand.');
      return anlegen(befehl.angebot);
    }
    if (zustand === null) return nein('befehl-nicht-zustaendig', `${befehl.art} verlangt ein Angebot.`);
    const f = kopfFehler(projekt, lv, zustand.angebot);
    if (f) return f;
    switch (befehl.art) {
      case 'AngebotspositionSetzen':
        return positionSetzen(zustand, befehl.position);
      case 'AngebotsNachlassSetzen':
        return nachlassAendern(zustand, befehl.nachlass);
      case 'AngebotsNachlassEntfernen':
        return nachlassAendern(zustand, null);
      case 'AngebotLoeschen':
        return loeschen(zustand);
    }
  };
}
