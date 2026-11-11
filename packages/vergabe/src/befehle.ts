// SPDX-License-Identifier: AGPL-3.0-or-later
// Angebotsbefehle ausführen (Ticket 36, Punkt 3). Die Vertragssignatur `AngebotBefehlAusfuehren` kennt weder Projekt
// noch LV; die Fabrik `angebotBefehlAusfuehrer` schließt beide ein und baut den Index des LV einmal.
//
// Neuberechnung nur im betroffenen Teilbaum (A6): `AngebotspositionSetzen` rechnet den GP der einen Position neu, dazu
// die Beträge der Zuschlagspositionen, deren Basis sie berührt (Ticket 44, über den Kern), und ändert die Summen ihrer
// Gliederungen bis zur Wurzel um die Differenzen, dazu die Gesamtsummen. Kosten O(Tiefe) plus die Geschwister der
// betroffenen Zuschlagspositionen, plus einmal je Positionsarray der Aufbau eines Index (Positions-ID → Eintrag).

import { NULL_BETRAG, alsEinheitspreis, alsProzent, addiere, subtrahiere, vorzeichen } from '@tethys/dezimal';
import { betragsziel, gesamtsummen, nachlassFehler, positionsSumme, summenBerechnen } from '@tethys/kern';
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
  Prozent,
  Summenaenderung,
} from '@tethys/vertrag';
import { angebotKopf } from './changeset';
import { angebotSummenBerechnen, angebotsPosition, angebotspositionenNachId } from './summen';

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
  a.brutto === b.brutto &&
  a.summeBedarfOhneGesamtbetrag === b.summeBedarfOhneGesamtbetrag &&
  a.summeWahl === b.summeWahl;

/** Der GP der Position oder 0,00; in welche Summe er geht, sagt `betragsziel` (Kern, Ticket 37). */
const betrag = (s: Positionssumme): Betrag => s.gesamtpreis ?? NULL_BETRAG;

/** Feld einer Gliederungssumme je Betragsziel (Kern, Ticket 37: Netto, Bedarfs- oder Wahlsumme). */
const FELD = {
  netto: 'summe',
  bedarf: 'summeBedarfOhneGesamtbetrag',
  wahl: 'summeWahl',
} as const;

/** Die Ausweise der Gesamtsummen (Kern, Ticket 37); fehlen sie in einem alten Stand, gelten sie als 0,00. */
const ausweiseVon = (g: Gesamtsummen): { bedarf: Betrag; wahl: Betrag } => ({
  bedarf: g.summeBedarfOhneGesamtbetrag ?? NULL_BETRAG,
  wahl: g.summeWahl ?? NULL_BETRAG,
});

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
  /** Kinder je Elternknoten in Geschwisterreihenfolge, nur für Elternknoten mit einer Zuschlagsposition darunter. */
  readonly zuschlagsEltern: ReadonlyMap<string, readonly Knoten[]>;
  /** Je Bezugsposition die Elternknoten der Zuschlagspositionen, deren Liste (R5) sie nennt. */
  readonly listenEltern: ReadonlyMap<string, ReadonlySet<string>>;
}

function lvIndex(lv: LvZustand): LvIndex {
  const byId = new Map<string, Knoten>();
  const kinder = new Map<string, Knoten[]>();
  const listenEltern = new Map<string, Set<string>>();
  const mitZuschlag = new Set<string>();
  for (const k of lv.leistungsverzeichnis.knoten) {
    byId.set(k.id, k);
    const liste = kinder.get(k.elternId);
    if (liste) liste.push(k);
    else kinder.set(k.elternId, [k]);
    if (k.art !== 'position' || k.zuschlag === null) continue;
    mitZuschlag.add(k.elternId);
    if (k.zuschlag.bezug.art !== 'positionen') continue;
    for (const b of k.zuschlag.bezug.positionen) {
      const eltern = listenEltern.get(b.positionId) ?? new Set<string>();
      eltern.add(k.elternId);
      listenEltern.set(b.positionId, eltern);
    }
  }
  const zuschlagsEltern = new Map<string, readonly Knoten[]>();
  for (const e of mitZuschlag)
    zuschlagsEltern.set(
      e,
      [...(kinder.get(e) ?? [])].sort((a, b) => a.reihenfolge - b.reihenfolge),
    );
  return { lvId: lv.leistungsverzeichnis.id, byId, zuschlagsEltern, listenEltern };
}

/**
 * Die Elternknoten, deren Zuschlagspositionen neu zu rechnen sind, wenn sich der Preis der Position `p` ändert: ihr
 * eigener Elternknoten, wenn dort eine Zuschlagsposition steht (R3/R4, oder `p` ist selbst eine), und die Elternknoten
 * jeder Zuschlagsposition, deren Liste `p` nennt (R5).
 */
function betroffeneEltern(index: LvIndex, p: Position): readonly string[] {
  const aus = new Set<string>();
  if (index.zuschlagsEltern.has(p.elternId)) aus.add(p.elternId);
  for (const e of index.listenEltern.get(p.id) ?? []) aus.add(e);
  return [...aus];
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

/**
 * Positionssummen der Zuschlagspositionen unter dem Elternknoten `e` mit den Preisen des Angebots, gerechnet vom Kern
 * (`summenBerechnen`, R7) auf einem Teil-LV mit Wurzel `e`: alle Kinder von `e` (Bereiche R3/R4) und die Positionen,
 * die eine Liste darunter nennt (R5). Mehr hängt ein Zuschlagsbetrag nach R1 bis R5 nicht ab; eine Zuschlagsposition
 * ist nie Basis (Prüfung 3 des Kerns), also gibt es keine Ketten.
 */
function zuschlagssummenUnter(
  index: LvIndex,
  e: string,
  eintrag: (id: string) => Angebotsposition | undefined,
  mwstSatz: Prozent,
): Positionssumme[] {
  const kinder = index.zuschlagsEltern.get(e) ?? [];
  const drin = new Set<string>(kinder.map((k) => k.id));
  const teil: Knoten[] = [];
  const dazu = (k: Knoten): void => {
    teil.push(k.art === 'position' ? angebotsPosition(k, eintrag(k.id)) : k);
  };
  kinder.forEach(dazu);
  for (const k of kinder) {
    if (k.art !== 'position' || k.zuschlag?.bezug.art !== 'positionen') continue;
    for (const b of k.zuschlag.bezug.positionen) {
      const ref = index.byId.get(b.positionId);
      if (ref === undefined || drin.has(ref.id)) continue;
      drin.add(ref.id);
      dazu(ref);
    }
  }
  const zuschlaege = new Set<string>(
    kinder.flatMap((k) => (k.art === 'position' && k.zuschlag !== null ? [k.id] : [])),
  );
  return summenBerechnen({ id: e, knoten: teil, nachlass: null, mwstSatz }).positionen.filter((s) =>
    zuschlaege.has(s.positionId),
  );
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
  if (p.status === 'angeboten' && p.zuschlagssatz !== undefined) {
    // Ticket 44 (Ticket 29, Folgeliste): ein Satz an einer Position ohne Zuschlag ist ein Fehler, kein Befund.
    if (k.zuschlag === null)
      return nein(
        'ungueltige-eingabe',
        `Position ${p.positionId} ist keine Zuschlagsposition und trägt keinen Zuschlagssatz.`,
        p.positionId,
        'zuschlagssatz',
      );
    if (!alsProzent(p.zuschlagssatz).ok)
      return nein(
        'ungueltige-eingabe',
        `Kein kanonischer Zuschlagssatz mit 2 Stellen: ${JSON.stringify(p.zuschlagssatz)}`,
        p.positionId,
        'zuschlagssatz',
      );
  }
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
    // Der alte Wert ist der gespeicherte (Ticket 72, D-57.2). Eine LV-Position, die nach dem Anlegen des Angebots ins LV
    // kam, hat im Angebot keine Summe (`undefined`) und steckt mit 0,00 in den gespeicherten Gliederungs- und
    // Gesamtsummen.
    const altSumme = (p: Position): Positionssumme | undefined => positionssumme(z.summen.positionen, p.id);

    // Jede Positionssumme, die sich ändern kann: die Position selbst (ohne Zuschlag: nur aus ihrem eigenen Preis) und
    // die Zuschlagspositionen, deren Basis sie berührt (Ticket 44). Deren Beträge rechnet der Kern (R7) auf einem
    // Teil-LV, das alles enthält, wovon sie abhängen.
    const kandidaten: { lvPos: Position; vorher: Positionssumme | undefined; nachher: Positionssumme }[] = [];
    if (lvPos.zuschlag === null)
      kandidaten.push({
        lvPos,
        vorher: altSumme(lvPos),
        nachher: positionsSumme(angebotsPosition(lvPos, neu)),
      });
    const eltern = betroffeneEltern(index, lvPos);
    if (eltern.length > 0) {
      const alteEintraege = angebotspositionenNachId(z.angebot.positionen);
      const eintrag = (id: string): Angebotsposition | undefined =>
        id === neu.positionId ? neu : alteEintraege.get(id);
      for (const e of eltern) {
        for (const s of zuschlagssummenUnter(index, e, eintrag, l.mwstSatz)) {
          const zPos = index.byId.get(s.positionId) as Position;
          kandidaten.push({ lvPos: zPos, vorher: altSumme(zPos), nachher: s });
        }
      }
    }
    // Geschrieben wird eine Summe, die sich ändert. Ohne gespeicherte Summe nur zusammen mit der neuen Angebotsposition:
    // `speicher` entfernt Angebotssummen nur mit ihrer Angebotsposition, so nimmt die Umkehrung beides wieder weg (D-72.2).
    const geschrieben = kandidaten.filter((c) =>
      c.vorher === undefined
        ? alt === undefined && c.lvPos.id === neu.positionId
        : c.vorher.gesamtpreis !== c.nachher.gesamtpreis ||
          c.vorher.gehtInSummeEin !== c.nachher.gehtInSummeEin,
    );
    const altBetrag = (c: (typeof kandidaten)[number]): Betrag =>
      c.vorher === undefined ? NULL_BETRAG : betrag(c.vorher);
    const verschoben = kandidaten.filter(
      (c) => vorzeichen(subtrahiere(betrag(c.nachher), altBetrag(c))) !== 0,
    );
    if (geschrieben.length === 0 && verschoben.length === 0) return changeSet(z, positionsaenderung);

    // Differenzen je Betragsziel die Elternketten hinauf (A6), dann einmal die Gesamtsummen.
    const gliederungen = new Map<string, Gliederungssumme>();
    const gliederungenVorher: Gliederungssumme[] = [];
    const delta = { netto: NULL_BETRAG, bedarf: NULL_BETRAG, wahl: NULL_BETRAG };
    for (const c of verschoben) {
      const differenz = subtrahiere(betrag(c.nachher), altBetrag(c));
      if (vorzeichen(differenz) === 0) continue;
      const ziel = betragsziel(c.lvPos);
      const feld = FELD[ziel];
      delta[ziel] = addiere(delta[ziel], differenz);
      let k: string = c.lvPos.elternId;
      while (k !== index.lvId) {
        const g = index.byId.get(k);
        if (!g) break;
        const vorher = gliederungen.get(k) ?? gliederungssumme(z.summen.gliederungen, k);
        if (vorher) {
          if (!gliederungen.has(k)) gliederungenVorher.push(vorher);
          gliederungen.set(k, {
            summeBedarfOhneGesamtbetrag: NULL_BETRAG,
            summeWahl: NULL_BETRAG,
            ...vorher,
            gliederungId: k as GliederungId,
            [feld]: addiere(vorher[feld] ?? NULL_BETRAG, differenz),
          });
        }
        k = g.elternId;
      }
    }
    let gesamt: Gesamtsummen | null = null;
    const altGesamt = z.summen.gesamt;
    const a = ausweiseVon(altGesamt);
    const neuGesamt = gesamtsummen(addiere(altGesamt.netto, delta.netto), z.angebot.nachlass, l.mwstSatz, {
      bedarf: addiere(a.bedarf, delta.bedarf),
      wahl: addiere(a.wahl, delta.wahl),
    });
    if (!gleicheGesamtsummen(neuGesamt, altGesamt)) gesamt = neuGesamt;
    return changeSet(z, {
      ...positionsaenderung,
      summen: {
        positionen: geschrieben.map((c) => c.nachher),
        gliederungen: [...gliederungen.values()],
        gesamt,
        vorher: {
          positionen: geschrieben.flatMap((c) => (c.vorher === undefined ? [] : [c.vorher])),
          gliederungen: gliederungenVorher,
          gesamt: gesamt === null ? null : altGesamt,
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
    const neuGesamt = gesamtsummen(z.summen.gesamt.netto, nachlass, l.mwstSatz, ausweiseVon(z.summen.gesamt));
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
