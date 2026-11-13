// SPDX-License-Identifier: AGPL-3.0-or-later
// „Beispielprojekt laden“ (Ticket 147, E2): ein Projekt aus den Fixtures `typisch` (LV), `typisch-angebote` (drei Bieter mit
// Angeboten), `typisch-abrechnung` (Zuschlag, Kostengruppen, Blatt 1, Rechnung 1) und dem Haus `haus-v1.ifc`. Aufgebaut über
// die Befehlswege der App (A5), nie als Rohdaten in die Datenbank: Jeder Schritt ist ein Befehl mit Protokolleintrag, alle
// zusammen sind **ein** Undo-Schritt (Rückgängig nimmt das ganze Beispiel zurück). Jede Kennung kommt neu aus der
// `IdQuelle` (A7); so lässt sich das Beispiel mehrmals laden. Die Daten kommen als Text (der Build bindet die Fixtures ein,
// `beispielquelle.ts`); gelesen werden sie erst hier.
//
// Abweichungen von den Fixtures, weil das Beispiel keinen Nachtrag hat: Das Aufmaßblatt trägt die Zeilen von Blatt 1 ohne
// die Nachtragsposition; die Rechnung ist Rechnung 1 ohne Freigabe (sie lässt sich so in der App prüfen und freigeben).

import { rechnungBefehlAusfuehren } from '@tethys/abrechnung';
import { auftragsLvBefehlAusfuehren } from '@tethys/kern';
import { mengenansatzBerechnen } from '@tethys/mengen';
import { angebotBefehlAusfuehrer } from '@tethys/vergabe';
import type {
  Angebot,
  AngebotBefehl,
  Angebotsposition,
  Ansatzzeile,
  Aufmassposition,
  Betrag,
  BieterId,
  Einheitspreis,
  ElternId,
  HinweistextId,
  IdQuelle,
  Knoten,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  LvInhalt,
  LvZustand,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzStelle,
  PositionId,
  Projekt,
  ProjektId,
  Prozent,
  Pruefbefund,
  Rechnungsart,
  TitelId,
  Zuschlagsbezug,
} from '@tethys/vertrag';
import { aufmassBefehlAnwenden, neuesBlatt } from '../abrechnung/aufmass';
import { zuschlagserteilungPlanen } from '../auftrag/zuschlagserteilung';
import { namensvorschlag, tagDesEinlesens, type Lesen } from '../bim/einlesen';
import { bauwerksmodellBefehlAnwenden } from '../bim/schreiben';
import type { Teil } from '../historie/historie';
import {
  befehlswegFuer,
  eintrag,
  lvBefehlAnwenden,
  projektBefehlAnwenden,
  speichern,
  type Abweisung,
  type Lauf,
  type Umgebung,
} from '../lv/befehlsweg';
import { datumDe } from '../lv/kopfdaten';
import { formatiereProzentDe } from '../lv/zahlen';
import { projektAnlegenBefehl } from '../projekt/befehle';
import { entwurfLesen, neuerEntwurf, rechnungAnlegenBefehl } from '../rechnung/entwurf';
import { texte } from './texte';

/** Die Dateien des Beispiels, wie der Build sie einbindet: die drei JSON-Fixtures als Text, das Modell als Bytes. */
export interface Beispielquelle {
  /** `fixtures/typisch.json` */
  readonly lv: string;
  /** `fixtures/typisch-angebote.json` */
  readonly angebote: string;
  /** `fixtures/typisch-abrechnung.json` */
  readonly abrechnung: string;
  /** `fixtures/ifc/haus-v1.ifc` */
  readonly modell: { readonly dateiname: string; readonly bytes: Uint8Array };
}

export type Beispielergebnis =
  | { readonly ok: true; readonly projektId: ProjektId; readonly befunde: readonly Pruefbefund[] }
  /**
   * Ein Schritt wurde abgewiesen. Was davor geschrieben wurde, bleibt (Q5) und ist ein Undo-Schritt; `projektId` ist
   * gesetzt, sobald das Projekt angelegt ist.
   */
  | { readonly ok: false; readonly projektId: ProjektId | null; readonly abweisung: Abweisung };

// --- Form der Fixtures (README der Fixtures, „JSON-Form“) ----------------------------------------------------------

type FxBezug =
  | {
      readonly art: 'positionen';
      readonly positionen: readonly { readonly positionId: string; readonly teilmenge: string | null }[];
    }
  | { readonly art: 'gliederung' }
  | { readonly art: 'kennzeichnung' };

interface FxKnoten {
  readonly id: string;
  readonly parentId: string;
  readonly art: 'titel' | 'hinweis' | 'position';
  readonly ordnungszahl?: string;
  readonly ozIndex?: string;
  readonly kurztext?: string;
  readonly langtext?: string;
  readonly text?: string;
  readonly positionsart?: 'normal' | 'bedarf' | 'wahl' | 'zuschlag';
  readonly menge?: string | null;
  readonly einheit?: string | null;
  readonly einheitspreis?: string | null;
  readonly bedarfMitGesamtbetrag?: boolean;
  readonly grundpositionId?: string;
  readonly zuschlag?: { readonly prozentsatz: string | null; readonly bezug: FxBezug };
}

interface FxLv {
  readonly id: string;
  readonly name: string;
  /** Muster vor dem Doppelpunkt, z. B. `NN.NN.NNNN[I]: Erläuterung`. */
  readonly ozMaske: string;
  readonly mwstSatz: string;
  readonly nachlass: { readonly art: 'prozent' | 'betrag'; readonly wert: string } | null;
  readonly knoten: readonly FxKnoten[];
}

interface FxAngebote {
  readonly bieter: readonly { readonly id: string; readonly name: string }[];
  readonly angebote: readonly {
    readonly bieterId: string;
    readonly nachlass: { readonly art: 'prozent' | 'betrag'; readonly wert: string } | null;
    readonly positionen: readonly {
      readonly positionId: string;
      readonly status: 'angeboten' | 'nicht-angeboten';
      readonly einheitspreis?: string;
      readonly zuschlagssatz?: string;
    }[];
  }[];
}

interface FxAbrechnung {
  readonly zuschlag: { readonly bieterId: string; readonly gewaehlt: readonly string[] };
  readonly positionen: readonly { readonly positionId: string; readonly kostengruppe: string | null }[];
  readonly aufmasse: readonly {
    readonly aufmass: {
      readonly bezeichnung: string;
      readonly datum: string;
      readonly positionen: readonly {
        readonly positionId: string;
        readonly mengenansatz:
          | readonly {
              readonly zeile: string;
              readonly formel: string;
              readonly ausdruck: string;
              readonly variable: string | null;
            }[]
          | null;
      }[];
    };
  }[];
  readonly rechnungen: readonly {
    readonly art: Rechnungsart;
    readonly eingang: string | null;
    readonly rechnungsnummerAuftragnehmer: string | null;
    readonly umlagen: readonly { readonly bezeichnung: string; readonly satz: string }[];
    readonly sicherheitSatz: string | null;
    readonly gewaehrleistungSatz: string | null;
  }[];
}

// --- Abbildung mit neuen Kennungen ---------------------------------------------------------------------------------

/** Alte Kennung der Fixture → neue Kennung der App. */
class Kennungen {
  readonly #neu = new Map<string, string>();

  setzen(alt: string, neu: string): void {
    this.#neu.set(alt, neu);
  }

  /** Die neue Kennung; `undefined`, wenn die Fixture-Kennung nicht zum Beispiel gehört (z. B. eine Nachtragsposition). */
  von(alt: string): string | undefined {
    return this.#neu.get(alt);
  }

  muss(alt: string): string {
    const k = this.von(alt);
    if (k === undefined) throw new Error(`Beispielprojekt: unbekannte Kennung ${alt}`);
    return k;
  }

  /** Die neue Kennung einer Position (Alle Kennungen sind Zeichenketten; die Marke unterscheidet nur der Typ, A7). */
  position(alt: string): PositionId {
    return this.muss(alt) as PositionId;
  }
}

const nachlassAus = (n: FxLv['nachlass']): Nachlass | null =>
  n === null
    ? null
    : n.art === 'prozent'
      ? { art: 'prozent', wert: n.wert as Prozent }
      : { art: 'betrag', wert: n.wert as Betrag };

const absatz = (text: string) => [{ art: 'absatz' as const, inhalt: [{ art: 'text' as const, text }] }];

/** Die OZ-Maske aus dem Muster der Fixture (`NN.NN.NNNN[I]`): numerische Stufen, Index ein Zeichen. */
function ozMaskeAus(text: string): LvInhalt['ozMaske'] {
  const muster = text.split(':')[0]?.trim() ?? '';
  const teile = muster.replace('[I]', '').split('.');
  const stelle = (t: string): OzStelle => ({ laenge: t.length, zeichen: 'numerisch' });
  return {
    gliederung: teile.slice(0, -1).map(stelle),
    position: stelle(teile.at(-1) ?? 'NNNN'),
    index: muster.includes('[I]') ? { laenge: 1, zeichen: 'alphanumerisch' } : null,
    trennzeichen: '.',
  };
}

function bezugAus(b: FxBezug, k: Kennungen): Zuschlagsbezug {
  if (b.art !== 'positionen') return b;
  return {
    art: 'positionen',
    positionen: b.positionen.map((p) => ({
      positionId: k.position(p.positionId),
      teilmenge: p.teilmenge as Menge | null,
    })),
  };
}

/** Das LV `typisch` als Inhalt mit neuen Kennungen, die Kostengruppen aus der Abrechnung an den Positionen. */
function lvInhalt(
  fx: FxLv,
  kostengruppen: FxAbrechnung['positionen'],
  ids: IdQuelle,
  k: Kennungen,
): LvInhalt {
  const lvId = ids.leistungsverzeichnis();
  k.setzen(fx.id, lvId);
  // Erst alle Kennungen, dann die Knoten: Wahl und Zuschlag verweisen auch auf spätere Positionen.
  for (const x of fx.knoten) {
    k.setzen(
      x.id,
      x.art === 'titel' ? ids.titel() : x.art === 'hinweis' ? ids.hinweistext() : ids.position(),
    );
  }
  const kg = new Map(kostengruppen.map((p) => [p.positionId, p.kostengruppe]));
  const folge = new Map<string, number>();
  const knoten = fx.knoten.map((x): Knoten => {
    const reihenfolge = folge.get(x.parentId) ?? 0;
    folge.set(x.parentId, reihenfolge + 1);
    const lage = { elternId: k.muss(x.parentId) as ElternId, reihenfolge };
    const ordnungszahl = (x.ordnungszahl ?? null) as Ordnungszahl | null;
    if (x.art === 'titel')
      return { ...lage, art: 'titel', id: k.muss(x.id) as TitelId, ordnungszahl, kurztext: x.kurztext ?? '' };
    if (x.art === 'hinweis')
      return { ...lage, art: 'hinweis', id: k.muss(x.id) as HinweistextId, text: absatz(x.text ?? '') };
    const art = x.positionsart ?? 'normal';
    const gruppe = kg.get(x.id) ?? null;
    return {
      ...lage,
      art: 'position',
      id: k.position(x.id),
      ordnungszahl,
      ozIndex: x.ozIndex ?? null,
      merkmale: {
        bedarf:
          art === 'bedarf'
            ? x.bedarfMitGesamtbetrag === true
              ? 'mit-gesamtbetrag'
              : 'ohne-gesamtbetrag'
            : null,
        wahl:
          art === 'wahl'
            ? {
                gruppe: null,
                variante: null,
                grundpositionId: x.grundpositionId === undefined ? null : k.position(x.grundpositionId),
              }
            : null,
        stundenlohn: false,
        pauschal: false,
        zuschlagskennzeichen: false,
      },
      zuschlag:
        x.zuschlag === undefined
          ? null
          : { prozentsatz: x.zuschlag.prozentsatz as Prozent | null, bezug: bezugAus(x.zuschlag.bezug, k) },
      kurztext: x.kurztext ?? '',
      langtext: x.langtext === undefined || x.langtext === '' ? [] : absatz(x.langtext),
      menge: (x.menge ?? null) as Menge | null,
      einheit: x.einheit ?? null,
      einheitspreis: (x.einheitspreis ?? null) as Einheitspreis | null,
      epa: null,
      ...(gruppe === null ? {} : { kostengruppe: gruppe as Kostengruppennummer }),
    };
  });
  return {
    name: fx.name,
    ozMaske: ozMaskeAus(fx.ozMaske),
    mwstSatz: fx.mwstSatz as Prozent,
    nachlass: nachlassAus(fx.nachlass),
    wurzelId: lvId,
    knoten,
  };
}

function angebotAus(
  fx: FxAngebote['angebote'][number],
  projektId: ProjektId,
  lvId: LeistungsverzeichnisId,
  bieterId: BieterId,
  ids: IdQuelle,
  k: Kennungen,
): Angebot {
  return {
    id: ids.angebot(),
    projektId,
    leistungsverzeichnisId: lvId,
    bieterId,
    nachlass: nachlassAus(fx.nachlass),
    positionen: fx.positionen.map((p): Angebotsposition => {
      const positionId = k.position(p.positionId);
      if (p.status === 'nicht-angeboten') return { positionId, status: 'nicht-angeboten' };
      return {
        positionId,
        status: 'angeboten',
        einheitspreis: (p.einheitspreis ?? '0.000') as Einheitspreis,
        epa: null,
        ...(p.zuschlagssatz === undefined ? {} : { zuschlagssatz: p.zuschlagssatz as Prozent }),
      };
    }),
  };
}

/** Die Zeilen eines Blatts der Fixture, soweit ihre Positionen zum Beispiel gehören; die Menge rechnet `mengen` (D-22). */
function aufmasspositionen(
  fx: FxAbrechnung['aufmasse'][number]['aufmass']['positionen'],
  k: Kennungen,
): Aufmassposition[] {
  const zeilen: Aufmassposition[] = [];
  for (const p of fx) {
    const positionId = k.von(p.positionId) as PositionId | undefined;
    if (positionId === undefined) continue;
    const mengenansatz =
      p.mengenansatz === null
        ? null
        : p.mengenansatz.map((z): Ansatzzeile => ({
            zeile: Number(z.zeile),
            formel: Number(z.formel),
            ausdruck: z.ausdruck,
            variable: z.variable,
          }));
    zeilen.push({
      positionId,
      mengenansatz,
      menge: mengenansatz === null ? null : mengenansatzBerechnen(mengenansatz).summe,
    });
  }
  return zeilen;
}

// --- Aufbau über die Befehlswege -----------------------------------------------------------------------------------

/** Ein Schritt ist abgewiesen worden (der Grund steht in `abweisung`). */
class Abgewiesen extends Error {
  constructor(readonly abweisung: Abweisung) {
    super('Beispielprojekt: Schritt abgewiesen');
  }
}

/**
 * Legt das Beispielprojekt an. Das Modell wird vorab gelesen (`lesen`, in der App im Worker); geschrieben wird danach in einem
 * Zug der Kette des Befehlswegs, damit kein anderer Befehl dazwischenkommt, und als ein Undo-Schritt.
 */
export async function beispielprojektAnlegen(
  u: Umgebung,
  quelle: Beispielquelle,
  lesen: Lesen,
): Promise<Beispielergebnis> {
  const fxLv = JSON.parse(quelle.lv) as FxLv;
  const fxAngebote = JSON.parse(quelle.angebote) as FxAngebote;
  const fxAbrechnung = JSON.parse(quelle.abrechnung) as FxAbrechnung;
  const projektBefehl = projektAnlegenBefehl(u.ids, texte.beispiel.projektname, texte.beispiel.bauherr);
  const projektId = projektBefehl.id;
  const modell = await lesen(quelle.modell.bytes, {
    id: u.ids.bauwerksmodell(),
    projektId,
    name: namensvorschlag(quelle.modell.dateiname),
    datei: { hash: '', dateiname: quelle.modell.dateiname, groesse: quelle.modell.bytes.length },
    vorgaengerId: null,
    eingelesen: tagDesEinlesens(u.uhr()),
  });

  const weg = befehlswegFuer(u);
  return weg.reihe(async (): Promise<Beispielergebnis> => {
    const teile: Teil[] = [];
    let angelegt = false;
    /** Nimmt den Teil eines Laufs auf; eine Abweisung beendet den Aufbau. */
    const nimm = <Z>(lauf: Lauf<Z>): Z => {
      if (!lauf.ok) throw new Abgewiesen(lauf.abweisung);
      teile.push(lauf.teil);
      return lauf.zustand;
    };
    const k = new Kennungen();
    try {
      let projekt = nimm(await projektBefehlAnwenden(u, null, projektBefehl));
      angelegt = true;
      const inhalt = lvInhalt(fxLv, fxAbrechnung.positionen, u.ids, k);
      const lv = nimm(
        await lvBefehlAnwenden(u, projektId, null, {
          art: 'LeistungsverzeichnisAnlegen',
          id: inhalt.wurzelId,
          projektId,
          inhalt,
        }),
      );
      if (projekt === null || lv === null) throw new Error('Beispielprojekt: Projekt oder LV fehlt');

      // Je Bieter: Bieter anlegen, dann sein Angebot (wie beim Einlesen einer X84).
      const angebote = new Map<string, Angebot>();
      for (const b of fxAngebote.bieter) {
        const bieter = { id: u.ids.bieter(), name: b.name };
        k.setzen(b.id, bieter.id);
        projekt = nimm(await projektBefehlAnwenden(u, projekt, { art: 'BieterAnlegen', bieter }));
        if (projekt === null) throw new Error('Beispielprojekt: Projekt fehlt');
        const fx = fxAngebote.angebote.find((a) => a.bieterId === b.id);
        if (fx === undefined) continue;
        const angebot = angebotAus(fx, projektId, lv.leistungsverzeichnis.id, bieter.id, u.ids, k);
        nimm(await angebotSchreiben(u, projekt, lv, angebot));
        angebote.set(b.id, angebot);
      }

      // Zuschlag wie im Dialog „Zuschlag erteilen“, geschrieben wie dort (ein Befehl), aber im selben Undo-Schritt.
      const angebot = angebote.get(fxAbrechnung.zuschlag.bieterId);
      if (angebot === undefined) throw new Error('Beispielprojekt: Angebot für den Zuschlag fehlt');
      const plan = zuschlagserteilungPlanen({
        lv,
        angebot,
        projekt,
        gewaehlt: new Set(fxAbrechnung.zuschlag.gewaehlt.map((p) => k.position(p))),
        neueId: u.ids.auftragsLeistungsverzeichnis(),
      });
      if (plan.befehl === null)
        throw new Error(`Beispielprojekt: Zuschlag nicht möglich (${plan.fehler ?? ''})`);
      const zuschlag = plan.befehl;
      const auftrag = zuschlag.auftragsLeistungsverzeichnis;
      const cs = auftragsLvBefehlAusfuehren(null, zuschlag);
      if (!cs.ok) throw new Abgewiesen({ art: 'befehl', fehler: cs.fehler });
      nimm(
        await speichern(
          u,
          eintrag(u, projektId, { art: 'auftrags-leistungsverzeichnis', id: auftrag.id }, zuschlag),
          cs.wert,
          () => null,
        ),
      );

      // Ein Aufmaßblatt (Blatt 1 der Fixture) und eine Abschlagsrechnung darüber, wie die Formulare der App sie anlegen.
      const fxBlatt = fxAbrechnung.aufmasse[0]?.aufmass;
      const fxRechnung = fxAbrechnung.rechnungen[0];
      if (fxBlatt === undefined || fxRechnung === undefined)
        throw new Error('Beispielprojekt: Abrechnung fehlt');
      const blatt = neuesBlatt(
        u.ids,
        auftrag,
        [],
        { bezeichnung: fxBlatt.bezeichnung, datum: fxBlatt.datum },
        aufmasspositionen(fxBlatt.positionen, k),
      );
      nimm(await aufmassBefehlAnwenden(u, projektId, null, blatt));
      const werte = entwurfLesen({
        ...neuerEntwurf([], [blatt.aufmass]),
        art: fxRechnung.art,
        eingang: fxRechnung.eingang === null ? '' : datumDe(fxRechnung.eingang),
        rechnungsnummerAuftragnehmer: fxRechnung.rechnungsnummerAuftragnehmer ?? '',
        umlagen: fxRechnung.umlagen.map((x) => ({
          bezeichnung: x.bezeichnung,
          satz: formatiereProzentDe(x.satz as Prozent),
        })),
        sicherheitSatz:
          fxRechnung.sicherheitSatz === null ? '' : formatiereProzentDe(fxRechnung.sicherheitSatz as Prozent),
        gewaehrleistungSatz:
          fxRechnung.gewaehrleistungSatz === null
            ? ''
            : formatiereProzentDe(fxRechnung.gewaehrleistungSatz as Prozent),
      });
      if (!werte.ok) throw new Error('Beispielprojekt: Rechnung nicht lesbar');
      const rechnung = rechnungAnlegenBefehl(u.ids.rechnung(), projektId, auftrag.id, [], werte.wert);
      const rcs = rechnungBefehlAusfuehren(null, rechnung);
      if (!rcs.ok) throw new Abgewiesen({ art: 'befehl', fehler: rcs.fehler });
      nimm(
        await speichern(
          u,
          eintrag(u, projektId, { art: 'rechnung', id: rcs.wert.rechnungId }, rechnung),
          rcs.wert,
          () => null,
        ),
      );

      // Das Haus als Bauwerksmodell: Bytes ablegen, dann `BauwerksmodellAnlegen` (wie „Modell einlesen“).
      if (modell.bauwerksmodell === null) throw new Error('Beispielprojekt: Modell nicht lesbar');
      const abgelegt = await u.speicher.modelldateien.ablegen(quelle.modell.bytes);
      if (!abgelegt.ok) throw new Abgewiesen({ art: 'speicher', fehler: abgelegt.fehler });
      nimm(
        await bauwerksmodellBefehlAnwenden(u, projektId, null, {
          art: 'BauwerksmodellAnlegen',
          bauwerksmodell: {
            ...modell.bauwerksmodell,
            datei: { ...modell.bauwerksmodell.datei, hash: abgelegt.wert },
          },
        }),
      );
      return { ok: true, projektId, befunde: modell.befunde };
    } catch (f) {
      if (!(f instanceof Abgewiesen)) throw f;
      return { ok: false, projektId: angelegt ? projektId : null, abweisung: f.abweisung };
    } finally {
      weg.historie.aufnehmen(teile);
    }
  });
}

/** `AngebotAnlegen` durch `vergabe` und den Speicher (wie `Befehlsweg.angebotAnlegen`, ohne eigenen Undo-Schritt). */
async function angebotSchreiben(
  u: Umgebung,
  projekt: Projekt,
  lv: LvZustand,
  angebot: Angebot,
): Promise<Lauf<null>> {
  const befehl: AngebotBefehl = { art: 'AngebotAnlegen', angebot };
  const r = angebotBefehlAusfuehrer(projekt, lv)(null, befehl);
  if (!r.ok) return { ok: false, abweisung: { art: 'befehl', fehler: r.fehler } };
  return speichern(
    u,
    eintrag(u, projekt.id, { art: 'angebot', id: r.wert.angebotId }, befehl),
    r.wert,
    () => null,
  );
}
