// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests (Vitest und Playwright, beide unter Node): bildet die Fixtures aus `fixtures/` auf Typen aus
// `vertrag` ab und erzeugt daraus die Folge von Protokolleinträgen und ChangeSets, wie der Kern sie später
// liefert (Projekt anlegen, LV anlegen, Angebote anlegen). Die Abbildung folgt `vertrag/src/fixtures-abbildung.test.ts`.
// Die `as`-Casts auf Dezimal- und Kennungstypen ersetzen hier `dezimal` und die App.

import { readFileSync } from 'node:fs';
import type {
  AngebotChangeSet,
  AngebotId,
  AngebotZustand,
  Angebotsposition,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Betrag,
  BieterId,
  ChangeSet,
  ElternId,
  Einheitspreis,
  Gesamtsummen,
  GliederungId,
  HinweistextId,
  Knoten,
  Leistungsverzeichnis,
  LeistungsverzeichnisId,
  LvChangeSet,
  LvZustand,
  Menge,
  Nachlass,
  NutzerId,
  Ordnungszahl,
  OzMaske,
  PositionId,
  Positionsmerkmale,
  Zuschlag,
  Projekt,
  ProjektChangeSet,
  ProjektId,
  Protokolleintrag,
  ProtokollId,
  Prozent,
  Summenaenderung,
  Summenstand,
  TitelId,
  Zeitstempel,
} from '@tethys/vertrag';

interface FxNachlass {
  art: 'prozent' | 'betrag';
  wert: string;
}
interface FxSollwerte {
  positionen: Record<string, { gp: string | null; inSumme: boolean }>;
  titel: Record<string, { summe: string }>;
  summen: { netto: string; nachlass: string; nettoNachNachlass: string; mwst: string; brutto: string };
}
type FxKnoten =
  | { id: string; parentId: string; art: 'titel'; ordnungszahl: string; kurztext: string }
  | { id: string; parentId: string; art: 'hinweis'; text: string }
  | {
      id: string;
      parentId: string;
      art: 'position';
      positionsart: 'normal' | 'bedarf' | 'wahl' | 'zuschlag' | 'stundenlohn';
      ordnungszahl: string;
      ozIndex?: string;
      kurztext: string;
      langtext: string;
      menge: string;
      einheit: string;
      einheitspreis: string;
      bedarfMitGesamtbetrag?: boolean;
      bezugspositionId?: string;
      grundpositionId?: string;
    };
interface FxLv {
  id: string;
  name: string;
  mwstSatz: string;
  nachlass: FxNachlass | null;
  knoten: FxKnoten[];
  sollwerte: FxSollwerte;
}
interface FxAngebotsset {
  lvId: string;
  bieter: { id: string; name: string }[];
  angebote: {
    id: string;
    bieterId: string;
    nachlass: FxNachlass | null;
    positionen: (
      | { positionId: string; status: 'angeboten'; einheitspreis: string }
      | { positionId: string; status: 'nicht-angeboten' }
    )[];
    sollwerte: FxSollwerte;
  }[];
}

const lesen = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../fixtures/${name}.json`, import.meta.url), 'utf8')) as unknown;

const fixtureMaske: OzMaske = {
  gliederung: Array.from({ length: 5 }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};

const nachlass = (n: FxNachlass | null): Nachlass | null =>
  n === null
    ? null
    : n.art === 'prozent'
      ? { art: 'prozent', wert: n.wert as Prozent }
      : { art: 'betrag', wert: n.wert as Betrag };

function summen(s: FxSollwerte): Summenstand {
  const gesamt: Gesamtsummen = {
    netto: s.summen.netto as Betrag,
    nachlass: s.summen.nachlass as Betrag,
    nettoNachNachlass: s.summen.nettoNachNachlass as Betrag,
    mwst: s.summen.mwst as Betrag,
    brutto: s.summen.brutto as Betrag,
  };
  return {
    positionen: Object.entries(s.positionen).map(([id, w]) => ({
      positionId: id as PositionId,
      gesamtpreis: w.gp as Betrag | null,
      gehtInSummeEin: w.inSumme,
    })),
    gliederungen: Object.entries(s.titel).map(([id, w]) => ({
      gliederungId: id as GliederungId,
      summe: w.summe as Betrag,
    })),
    gesamt,
  };
}

function abbilden(fx: FxLv, projektId: ProjektId): LvZustand {
  const zaehler = new Map<string, number>();
  const knoten: Knoten[] = fx.knoten.map((k): Knoten => {
    const reihenfolge = zaehler.get(k.parentId) ?? 0;
    zaehler.set(k.parentId, reihenfolge + 1);
    const lage = { elternId: k.parentId as ElternId, reihenfolge };
    if (k.art === 'titel') {
      return {
        ...lage,
        art: 'titel',
        id: k.id as TitelId,
        ordnungszahl: k.ordnungszahl as Ordnungszahl,
        kurztext: k.kurztext,
      };
    }
    if (k.art === 'hinweis') {
      return { ...lage, art: 'hinweis', id: k.id as HinweistextId, text: [{ art: 'text', text: k.text }] };
    }
    return {
      ...lage,
      art: 'position',
      id: k.id as PositionId,
      ordnungszahl: k.ordnungszahl as Ordnungszahl,
      ozIndex: k.ozIndex ?? null,
      merkmale: fixtureMerkmale(k),
      zuschlag: fixtureZuschlag(k),
      kurztext: k.kurztext,
      langtext: [{ art: 'text', text: k.langtext }],
      menge: k.menge as Menge,
      einheit: k.einheit,
      einheitspreis: k.einheitspreis as Einheitspreis,
      epa: null,
    };
  });
  const lv: Leistungsverzeichnis = {
    id: fx.id as LeistungsverzeichnisId,
    projektId,
    name: fx.name,
    ozMaske: fixtureMaske,
    mwstSatz: fx.mwstSatz as Prozent,
    nachlass: nachlass(fx.nachlass),
    knoten,
  };
  return { leistungsverzeichnis: lv, summen: summen(fx.sollwerte) };
}

/** Ein Fixture als Projekt, LV-Zustand und Angebote. `typisch` hat drei Angebote, die anderen keine. */
export interface FixtureDaten {
  readonly projekt: Projekt;
  readonly lv: LvZustand;
  readonly angebote: readonly AngebotZustand[];
}

// Dauerhafte Abbildung des Fixture-Formats: Die Fixtures (`fixtures/*.json`) führen je Position eine einzelne
// `positionsart` und behalten sie; hier wird sie in die Merkmale und den Zuschlag von `vertrag` übersetzt (Gruppe und
// Variante der Wahl `null`: die Fixtures haben keine, nichts erfunden).
type FxPosition = Extract<FxKnoten, { art: 'position' }>;

function fixtureMerkmale(k: FxPosition): Positionsmerkmale {
  return {
    bedarf:
      k.positionsart === 'bedarf'
        ? k.bedarfMitGesamtbetrag === true
          ? 'mit-gesamtbetrag'
          : 'ohne-gesamtbetrag'
        : null,
    wahl:
      k.positionsart === 'wahl'
        ? {
            gruppe: null,
            variante: null,
            grundpositionId: (k.grundpositionId as PositionId | undefined) ?? null,
          }
        : null,
    stundenlohn: k.positionsart === 'stundenlohn',
    pauschal: false,
    zuschlagskennzeichen: false,
  };
}

function fixtureZuschlag(k: FxPosition): Zuschlag | null {
  if (k.positionsart !== 'zuschlag') return null;
  const bezug = k.bezugspositionId as PositionId | undefined;
  return {
    prozentsatz: null,
    bezug: {
      art: 'positionen',
      positionen: bezug === undefined ? [] : [{ positionId: bezug, teilmenge: null }],
    },
  };
}

export function ladeFixture(name: 'winzig' | 'typisch' | 'gross'): FixtureDaten {
  const projektId = `projekt-${name}` as ProjektId;
  const lv = abbilden(lesen(name) as FxLv, projektId);
  const set = name === 'typisch' ? (lesen('typisch-angebote') as FxAngebotsset) : null;
  const projekt: Projekt = {
    id: projektId,
    name: `Fixture ${name}`,
    bauherr: { name: 'Bauherr (erfunden)', anschrift: null },
    bieter: (set?.bieter ?? []).map((b) => ({ id: b.id as BieterId, name: b.name })),
  };
  const angebote = (set?.angebote ?? []).map((a): AngebotZustand => ({
    angebot: {
      id: a.id as AngebotId,
      projektId,
      leistungsverzeichnisId: set?.lvId as LeistungsverzeichnisId,
      bieterId: a.bieterId as BieterId,
      nachlass: nachlass(a.nachlass),
      positionen: a.positionen.map((p): Angebotsposition =>
        p.status === 'angeboten'
          ? {
              positionId: p.positionId as PositionId,
              status: 'angeboten',
              einheitspreis: p.einheitspreis as Einheitspreis,
              epa: null,
            }
          : { positionId: p.positionId as PositionId, status: 'nicht-angeboten' },
      ),
    },
    summen: summen(a.sollwerte),
  }));
  return { projekt, lv, angebote };
}

// --- Folge von Befehlen ----------------------------------------------------------------------------------------

export interface Schritt {
  readonly eintrag: Protokolleintrag;
  readonly changeSet: ChangeSet;
}

export const NUTZER = 'nutzer-1' as NutzerId;
export const ZEIT = '2026-11-09T12:00:00.000Z' as Zeitstempel;

/** Protokolleintrag mit laufender Nummer als Kennung; Zeit und Nutzer sind fest (A2: kein Zufall im Test). */
export function eintrag(
  nr: number,
  projektId: ProjektId,
  aggregat: Protokolleintrag['aggregat'],
  befehl: Protokolleintrag['befehl'],
): Protokolleintrag {
  return {
    id: `protokoll-${String(nr).padStart(6, '0')}` as ProtokollId,
    projektId,
    aggregat,
    wer: NUTZER,
    wann: ZEIT,
    befehl,
  };
}

export const projektChangeSet = (p: Projekt): ProjektChangeSet => ({
  art: 'projekt',
  projektId: p.id,
  projekt: { vorher: null, nachher: p },
});

export function lvAnlegenChangeSet(z: LvZustand): LvChangeSet {
  const { knoten, ...kopf } = z.leistungsverzeichnis;
  return {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: kopf.id,
    kopf: { vorher: null, nachher: kopf },
    knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
    summen: z.summen,
  };
}

/** Löschen eines LV, wie der Vertrag es beschreibt: voller Kopf in `vorher`, alle Knoten und alle Summen als entfernt. */
export function lvLoeschenChangeSet(z: LvZustand): LvChangeSet {
  const { knoten, ...kopf } = z.leistungsverzeichnis;
  return {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: kopf.id,
    kopf: { vorher: kopf, nachher: null },
    knoten: { hinzugefuegt: [], geaendert: [], entfernt: knoten },
    summen: loeschSummen(z.summen),
  };
}

/** Löschen eines Angebots: voller Kopf in `vorher`, alle Angebotspositionen und Summen als entfernt. */
export function angebotLoeschenChangeSet(z: AngebotZustand): AngebotChangeSet {
  const { positionen, ...kopf } = z.angebot;
  return {
    art: 'angebot',
    angebotId: kopf.id,
    kopf: { vorher: kopf, nachher: null },
    positionen: { hinzugefuegt: [], geaendert: [], entfernt: positionen },
    summen: loeschSummen(z.summen),
  };
}

function loeschSummen(s: Summenstand): Summenaenderung {
  return {
    positionen: [],
    gliederungen: [],
    gesamt: null,
    vorher: {
      positionen: [],
      gliederungen: [],
      gesamt: s.gesamt,
      entfernt: { positionen: s.positionen, gliederungen: s.gliederungen },
    },
  };
}

/** Ein Auftrags-LV aus dem LV und einem Angebot des Fixtures (Knoten und Summen wie im LV; nur für Speichertests). */
export function auftragsLvAus(lv: LvZustand, angebotId: AngebotId, id = 'auftrags-lv-1'): AuftragsLvZustand {
  const { id: lvId, ...rest } = lv.leistungsverzeichnis;
  return {
    auftragsLeistungsverzeichnis: {
      ...rest,
      id: id as AuftragsLeistungsverzeichnisId,
      leistungsverzeichnisId: lvId,
      angebotId,
      name: `Auftrag zu ${rest.name}`,
      knoten: rest.knoten.map((k) => (k.elternId === lvId ? { ...k, elternId: id as ElternId } : k)),
    },
    summen: lv.summen,
  };
}

export function auftragsLvAnlegenChangeSet(z: AuftragsLvZustand): AuftragsLvChangeSet {
  const { knoten, ...kopf } = z.auftragsLeistungsverzeichnis;
  return {
    art: 'auftrags-leistungsverzeichnis',
    auftragsLeistungsverzeichnisId: kopf.id,
    kopf: { vorher: null, nachher: kopf },
    knoten: { hinzugefuegt: knoten, geaendert: [], entfernt: [] },
    summen: z.summen,
  };
}

export function angebotAnlegenChangeSet(z: AngebotZustand): AngebotChangeSet {
  const { positionen, ...kopf } = z.angebot;
  return {
    art: 'angebot',
    angebotId: kopf.id,
    kopf: { vorher: null, nachher: kopf },
    positionen: { hinzugefuegt: positionen, geaendert: [], entfernt: [] },
    summen: z.summen,
  };
}

/** Die Schritte, die ein Fixture in den Speicher bringen: Projekt, LV, Angebote. Protokollnummern ab `ab`. */
export function anlegenSchritte(f: FixtureDaten, ab = 1): Schritt[] {
  const { knoten, ...kopf } = f.lv.leistungsverzeichnis;
  const p = f.projekt.id;
  const schritte: Schritt[] = [
    {
      eintrag: eintrag(
        ab,
        p,
        { art: 'projekt', id: p },
        { art: 'ProjektAnlegen', id: p, name: f.projekt.name, bauherr: f.projekt.bauherr },
      ),
      changeSet: projektChangeSet(f.projekt),
    },
    {
      eintrag: eintrag(
        ab + 1,
        p,
        { art: 'leistungsverzeichnis', id: kopf.id },
        {
          art: 'LeistungsverzeichnisAnlegen',
          id: kopf.id,
          projektId: p,
          inhalt: {
            name: kopf.name,
            ozMaske: kopf.ozMaske,
            mwstSatz: kopf.mwstSatz,
            nachlass: kopf.nachlass,
            knoten,
            wurzelId: kopf.id,
          },
        },
      ),
      changeSet: lvAnlegenChangeSet(f.lv),
    },
  ];
  f.angebote.forEach((a, i) => {
    schritte.push({
      eintrag: eintrag(
        ab + 2 + i,
        p,
        { art: 'angebot', id: a.angebot.id },
        { art: 'AngebotAnlegen', angebot: a.angebot },
      ),
      changeSet: angebotAnlegenChangeSet(a),
    });
  });
  return schritte;
}
export { normalisiere } from './normalisiere';
