// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests dieses Pakets (nicht über index.ts exportiert): kleine LVs bauen, Fixtures (`typisch`,
// `typisch-angebote`, `gross`) in Vertragstypen abbilden. Das LV legt der Kern an; die Summen im Zustand sind seine.
// Fixtures werden per Dateizugriff gelesen, nicht importiert (A3), wie in `packages/ausgabe`.

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  Angebot,
  AngebotBefehl,
  AngebotBefehlAusfuehren,
  AngebotChangeSet,
  AngebotId,
  AngebotZustand,
  Angebotsposition,
  Betrag,
  BieterId,
  ElternId,
  Einheitspreis,
  Ergebnis,
  Gesamtsummen,
  Gliederungssumme,
  HinweistextId,
  Knoten,
  LeistungsverzeichnisId,
  LvInhalt,
  LvZustand,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzMaske,
  Position,
  PositionId,
  Positionsmerkmale,
  Positionssumme,
  Projekt,
  ProjektId,
  Prozent,
  TitelId,
  Zuschlag,
} from '@tethys/vertrag';
import { angebotChangeSetAnwenden } from './changeset';

export const PROJEKT_ID = 'projekt-vergabe' as ProjektId;

const maske: OzMaske = {
  gliederung: Array.from({ length: 5 }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};

const OHNE_MERKMALE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};

export function erwarteOk<T, F>(e: Ergebnis<T, F>): T {
  if (!e.ok) throw new Error(`Unerwarteter Fehlerwert: ${JSON.stringify(e.fehler)}`);
  return e.wert;
}

/** Legt das LV über den Kern an. */
export function lvZustandAusInhalt(
  id: string,
  inhalt: LvInhalt,
  projektId: ProjektId = PROJEKT_ID,
): LvZustand {
  const cs = erwarteOk(
    lvBefehlAusfuehren(null, {
      art: 'LeistungsverzeichnisAnlegen',
      id: id as LeistungsverzeichnisId,
      projektId,
      inhalt,
    }),
  );
  // Ticket 30: mechanisch angepasst (`lvChangeSetAnwenden` liefert `null`, wenn das ChangeSet das LV entfernt).
  const zustand = lvChangeSetAnwenden(null, cs);
  if (zustand === null) throw new Error('Das ChangeSet entfernt das LV.');
  return zustand;
}

// --- Kleine LVs von Hand ------------------------------------------------------------------------------------------

export function titel(id: string, eltern: string, reihenfolge: number): Knoten {
  return {
    art: 'titel',
    id: id as TitelId,
    elternId: eltern as ElternId,
    reihenfolge,
    ordnungszahl: null,
    kurztext: `Titel ${id}`,
  };
}

export function hinweis(id: string, eltern: string, reihenfolge: number): Knoten {
  return {
    art: 'hinweis',
    id: id as HinweistextId,
    elternId: eltern as ElternId,
    reihenfolge,
    text: [{ art: 'text', text: 'Hinweis' }],
  };
}

export function position(
  id: string,
  eltern: string,
  reihenfolge: number,
  menge: string | null,
  einheitspreis: string | null = null,
  merkmale: Partial<Positionsmerkmale> = {},
): Position {
  return {
    art: 'position',
    id: id as PositionId,
    elternId: eltern as ElternId,
    reihenfolge,
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { ...OHNE_MERKMALE, ...merkmale },
    zuschlag: null,
    kurztext: `Position ${id}`,
    langtext: [],
    menge: menge as Menge | null,
    einheit: 'm',
    einheitspreis: einheitspreis as Einheitspreis | null,
    epa: null,
  };
}

/** Zuschlagsposition in GAEB-Form (Ticket 37): Satz und Bezugsform, ohne Menge, Einheit und EP. */
export function zuschlagsposition(
  id: string,
  eltern: string,
  reihenfolge: number,
  bezug: Zuschlag['bezug'],
  prozentsatz: string | null = null,
): Position {
  return {
    ...position(id, eltern, reihenfolge, null),
    einheit: null,
    zuschlag: { prozentsatz: prozentsatz as Prozent | null, bezug },
  };
}

/** Bezugsform Liste (R5) ohne Teilmengen. */
export const liste = (...ids: string[]): Zuschlag['bezug'] => ({
  art: 'positionen',
  positionen: ids.map((i) => ({ positionId: i as PositionId, teilmenge: null })),
});

export function lv(
  id: string,
  knoten: readonly Knoten[],
  mwstSatz = '19.00',
  nachlass: Nachlass | null = null,
): LvZustand {
  return lvZustandAusInhalt(id, {
    name: `LV ${id}`,
    ozMaske: maske,
    mwstSatz: mwstSatz as Prozent,
    nachlass,
    knoten,
    wurzelId: id as LeistungsverzeichnisId,
  });
}

export const prozent = (wert: string): Nachlass => ({ art: 'prozent', wert: wert as Prozent });
export const betrag = (wert: string): Nachlass => ({ art: 'betrag', wert: wert as Betrag });

export const ep = (positionId: string, einheitspreis: string): Angebotsposition => ({
  positionId: positionId as PositionId,
  status: 'angeboten',
  einheitspreis: einheitspreis as Einheitspreis,
  epa: null,
});

/** Angebotener Zuschlagssatz des Bieters; der EP ist der Platzhalter `0.000` (Vertrag v1.2), nie gerechnet. */
export const satz = (
  positionId: string,
  zuschlagssatz: string,
  einheitspreis = '0.000',
): Angebotsposition => ({
  positionId: positionId as PositionId,
  status: 'angeboten',
  einheitspreis: einheitspreis as Einheitspreis,
  epa: null,
  zuschlagssatz: zuschlagssatz as Prozent,
});

export const nichtAngeboten = (positionId: string): Angebotsposition => ({
  positionId: positionId as PositionId,
  status: 'nicht-angeboten',
});

export function angebot(
  id: string,
  z: LvZustand,
  bieterId: string,
  positionen: readonly Angebotsposition[],
  nachlass: Nachlass | null = null,
): Angebot {
  return {
    id: id as AngebotId,
    projektId: z.leistungsverzeichnis.projektId,
    leistungsverzeichnisId: z.leistungsverzeichnis.id,
    bieterId: bieterId as BieterId,
    nachlass,
    positionen,
  };
}

export function projekt(bieter: readonly string[], id: ProjektId = PROJEKT_ID): Projekt {
  return {
    id,
    name: 'Projekt',
    bauherr: { name: 'Bauherr', anschrift: null },
    bieter: bieter.map((b) => ({ id: b as BieterId, name: `Bieter ${b}` })),
  };
}

/** Befehl ausführen und anwenden; wirft bei Fehlerwert. */
export function wende(
  ausfuehren: AngebotBefehlAusfuehren,
  zustand: AngebotZustand | null,
  befehl: AngebotBefehl,
): AngebotZustand | null {
  return angebotChangeSetAnwenden(zustand, erwarteOk(ausfuehren(zustand, befehl)));
}

// --- Fixtures -----------------------------------------------------------------------------------------------------

interface FxKnoten {
  id: string;
  parentId: string;
  art: 'titel' | 'hinweis' | 'position';
  ordnungszahl?: string;
  kurztext?: string;
  text?: string;
  positionsart?: 'normal' | 'bedarf' | 'wahl' | 'zuschlag';
  ozIndex?: string;
  // Ticket 51: Fixture-Format, mechanisch: an der Zuschlagsposition `null`, Satz und Bezug stehen in `zuschlag` (Vertragsform)
  menge?: string | null;
  einheit?: string | null;
  einheitspreis?: string | null;
  bedarfMitGesamtbetrag?: boolean;
  grundpositionId?: string;
  zuschlag?: Zuschlag;
  zuschlagskennzeichen?: boolean; // nur `zuschlag.json` (Ticket 37)
}

export interface FxLv {
  id: string;
  name: string;
  mwstSatz: string;
  nachlass: { art: 'prozent' | 'betrag'; wert: string } | null;
  knoten: FxKnoten[];
}

export interface FxSummen {
  netto: string;
  nachlass: string;
  nettoNachNachlass: string;
  mwst: string;
  brutto: string;
}

export interface FxAusweis {
  summeBedarfOhneGesamtbetrag: string;
  summeWahl: string;
}

export interface FxAngebot {
  id: string;
  bieterId: string;
  nachlass: { art: 'prozent' | 'betrag'; wert: string } | null;
  positionen: {
    positionId: string;
    status: 'angeboten' | 'nicht-angeboten';
    einheitspreis?: string;
    zuschlagssatz?: string; // Ticket 51: Fixture-Format, mechanisch: Satz des Bieters statt eines EP
  }[];
  sollwerte: {
    positionen: Record<string, { gp: string | null; inSumme: boolean }>;
    titel: Record<string, { summe: string }>;
    summen: FxSummen;
    nichtAngeboten: string[];
    // Ticket 51: Fixture-Format, mechanisch: Basis und Betrag je Zuschlagsposition, Bedarfs- und Wahlsumme je Titel und gesamt
    zuschlaege: Record<string, { basis: string; betrag: string | null }>;
    ausweise: { gesamt: FxAusweis; titel: Record<string, FxAusweis> };
  };
}

export interface FxAngebotsset {
  lvId: string;
  bieter: { id: string; name: string }[];
  angebote: FxAngebot[];
  /** Ticket 69: Bietersummen je Angebot, Titelsummen nach OZ. */
  preisspiegel: {
    bieter: { angebotId: string; name: string; summen: FxSummen; titel: Record<string, string> }[];
  };
}

function lies(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8'));
}

function fxNachlass(n: FxLv['nachlass']): Nachlass | null {
  if (n === null) return null;
  return n.art === 'prozent' ? prozent(n.wert) : betrag(n.wert);
}

function fxMerkmale(k: FxKnoten): Positionsmerkmale {
  const art = k.positionsart ?? 'normal';
  return {
    ...OHNE_MERKMALE,
    bedarf:
      art === 'bedarf' ? (k.bedarfMitGesamtbetrag === true ? 'mit-gesamtbetrag' : 'ohne-gesamtbetrag') : null,
    wahl:
      art === 'wahl'
        ? { gruppe: null, variante: null, grundpositionId: (k.grundpositionId ?? null) as PositionId | null }
        : null,
    zuschlagskennzeichen: k.zuschlagskennzeichen === true,
  };
}

// Ticket 51: Fixture-Format, mechanisch: der Zuschlag steht in Vertragsform an der Position (GAEB-Form, Satz und Liste).
function fxZuschlag(k: FxKnoten): Zuschlag | null {
  return k.zuschlag ?? null;
}

export function fixtureAlsInhalt(fx: FxLv): LvInhalt {
  const zaehler = new Map<string, number>();
  const knoten = fx.knoten.map((k): Knoten => {
    const reihenfolge = zaehler.get(k.parentId) ?? 0;
    zaehler.set(k.parentId, reihenfolge + 1);
    const lage = { elternId: k.parentId as ElternId, reihenfolge };
    if (k.art === 'titel') {
      return {
        ...lage,
        art: 'titel',
        id: k.id as TitelId,
        ordnungszahl: (k.ordnungszahl ?? null) as Ordnungszahl | null,
        kurztext: k.kurztext ?? '',
      };
    }
    if (k.art === 'hinweis') {
      return {
        ...lage,
        art: 'hinweis',
        id: k.id as HinweistextId,
        text: [{ art: 'text', text: k.text ?? '' }],
      };
    }
    return {
      ...lage,
      art: 'position',
      id: k.id as PositionId,
      ordnungszahl: (k.ordnungszahl ?? null) as Ordnungszahl | null,
      ozIndex: k.ozIndex ?? null,
      merkmale: fxMerkmale(k),
      zuschlag: fxZuschlag(k),
      kurztext: k.kurztext ?? '',
      langtext: [],
      menge: (k.menge ?? null) as Menge | null,
      einheit: k.einheit ?? null,
      einheitspreis: (k.einheitspreis ?? null) as Einheitspreis | null,
      epa: null,
    };
  });
  return {
    name: fx.name,
    ozMaske: maske,
    mwstSatz: fx.mwstSatz as Prozent,
    nachlass: fxNachlass(fx.nachlass),
    knoten,
    wurzelId: fx.id as LeistungsverzeichnisId,
  };
}

export function lvAusFixture(name: 'typisch' | 'gross' | 'zuschlag'): { fx: FxLv; zustand: LvZustand } {
  const fx = lies(name) as FxLv;
  return { fx, zustand: lvZustandAusInhalt(fx.id, fixtureAlsInhalt(fx)) };
}

export function angebotsset(): FxAngebotsset {
  return lies('typisch-angebote') as FxAngebotsset;
}

export function angebotAusFixture(fx: FxAngebot, z: LvZustand): Angebot {
  return angebot(
    fx.id,
    z,
    fx.bieterId,
    fx.positionen.map((p) =>
      p.status !== 'angeboten'
        ? nichtAngeboten(p.positionId)
        : p.zuschlagssatz !== undefined
          ? satz(p.positionId, p.zuschlagssatz) // Ticket 51: Fixture-Format, mechanisch
          : ep(p.positionId, p.einheitspreis ?? ''),
    ),
    fxNachlass(fx.nachlass),
  );
}

// --- Zeilen in `speicher` (Ticket 72) -----------------------------------------------------------------------------

/**
 * Die Zeilen eines gespeicherten Angebots je Kennung: Angebotspositionen, Positions- und Gliederungssummen,
 * Gesamtsummen. `speicher` liest sie nach Kennung, nicht in der Reihenfolge des Hinzufügens; darum Maps.
 */
export interface Angebotszeilen {
  readonly angebotspositionen: ReadonlyMap<string, Angebotsposition>;
  readonly positionen: ReadonlyMap<string, Positionssumme>;
  readonly gliederungen: ReadonlyMap<string, Gliederungssumme>;
  readonly gesamt: Gesamtsummen;
}

export function angebotszeilen(z: AngebotZustand): Angebotszeilen {
  return {
    angebotspositionen: new Map(z.angebot.positionen.map((p) => [p.positionId as string, p])),
    positionen: new Map(z.summen.positionen.map((p) => [p.positionId as string, p])),
    gliederungen: new Map(z.summen.gliederungen.map((g) => [g.gliederungId as string, g])),
    gesamt: z.summen.gesamt,
  };
}

/** Gleichheit wie in `speicher`: kanonisches JSON (Schlüssel sortiert, `undefined` fehlt). */
function kanonisch(x: unknown): string {
  return JSON.stringify(x, (_k, v: unknown) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
}
const zeilengleich = (a: unknown, b: unknown): boolean => kanonisch(a) === kanonisch(b);

function speicherAbbruch(code: 'konflikt' | 'unbekannt' | 'nicht-gefunden', was: string): never {
  throw new Error(`speicher: ${code}: ${was}`);
}

/** `pruefeSummenvorher` für eine Summenart eines Angebots (keine entfernten Knoten; D-57.2, D-57.3). */
function pruefeSummenart<T>(
  was: string,
  neu: readonly T[],
  alt: readonly T[],
  entfernt: readonly T[],
  id: (x: T) => string,
  gespeichert: ReadonlyMap<string, T>,
): void {
  const neuIds = new Set(neu.map(id));
  const altNachId = new Map(alt.map((e) => [id(e), e]));
  for (const k of altNachId.keys())
    if (!neuIds.has(k)) speicherAbbruch('unbekannt', `alte ${was}summe ${k} ohne neuen Wert`);
  for (const k of neuIds) {
    const g = gespeichert.get(k);
    const a = altNachId.get(k);
    if (g !== undefined && (a === undefined || !zeilengleich(g, a)))
      speicherAbbruch('konflikt', `alte ${was}summe ${k}`);
  }
  for (const e of entfernt) {
    const g = gespeichert.get(id(e));
    if (g === undefined || !zeilengleich(g, e)) speicherAbbruch('konflikt', `entfernte ${was}summe ${id(e)}`);
  }
}

/**
 * Wendet ein ChangeSet, das ein bestehendes Angebot ändert, so auf die Zeilen an wie `speicher` (`wendeAngebotAn` in
 * `packages/speicher/src/schreiben.ts`, mit `pruefeSummenvorher` aus `summenvorher.ts`): Vorherstände prüfen (wirft
 * bei `konflikt` oder `unbekannt`), dann entfernte Angebotspositionen samt ihrer Positionssumme löschen, geänderte
 * ersetzen, neue einfügen, die Summen des ChangeSets einfügen oder ersetzen (nie löschen), die Gesamtsummen ersetzen.
 * Der Kopf (Nachlass) gehört nicht zu den Zeilen; Anlegen und Löschen des Angebots bildet das Modell nicht ab.
 */
export function speicherAnwenden(zeilen: Angebotszeilen, cs: AngebotChangeSet): Angebotszeilen {
  if (cs.kopf !== null && (cs.kopf.vorher === null || cs.kopf.nachher === null))
    throw new Error('Modell: Anlegen und Löschen nicht abgebildet');
  const p = cs.positionen;
  const ap = new Map(zeilen.angebotspositionen);
  for (const e of p.entfernt) {
    const g = ap.get(e.positionId);
    if (g === undefined) speicherAbbruch('nicht-gefunden', `Angebotsposition ${e.positionId}`);
    if (!zeilengleich(g, e)) speicherAbbruch('konflikt', `entfernte Angebotsposition ${e.positionId}`);
  }
  for (const { vorher } of p.geaendert) {
    const g = ap.get(vorher.positionId);
    if (g === undefined) speicherAbbruch('nicht-gefunden', `Angebotsposition ${vorher.positionId}`);
    if (!zeilengleich(g, vorher)) speicherAbbruch('konflikt', `Angebotsposition ${vorher.positionId}`);
  }
  for (const n of p.hinzugefuegt)
    if (ap.has(n.positionId)) speicherAbbruch('unbekannt', `Angebotsposition ${n.positionId} gibt es schon`);
  const s = cs.summen;
  const v = s.vorher;
  if (s.gesamt !== null) {
    if (!zeilengleich(v.gesamt, zeilen.gesamt)) speicherAbbruch('konflikt', 'alte Gesamtsummen');
  } else if (v.gesamt !== null) speicherAbbruch('unbekannt', 'alte Gesamtsummen ohne neue');
  pruefeSummenart(
    'Positions',
    s.positionen,
    v.positionen,
    v.entfernt.positionen,
    (x) => x.positionId,
    zeilen.positionen,
  );
  pruefeSummenart(
    'Gliederungs',
    s.gliederungen,
    v.gliederungen,
    v.entfernt.gliederungen,
    (x) => x.gliederungId,
    zeilen.gliederungen,
  );

  const positionen = new Map(zeilen.positionen);
  for (const e of p.entfernt) {
    ap.delete(e.positionId);
    positionen.delete(e.positionId);
  }
  for (const { nachher } of p.geaendert) ap.set(nachher.positionId, nachher);
  for (const n of p.hinzugefuegt) ap.set(n.positionId, n);
  for (const x of s.positionen) positionen.set(x.positionId, x);
  const gliederungen = new Map(zeilen.gliederungen);
  for (const x of s.gliederungen) gliederungen.set(x.gliederungId, x);
  return { angebotspositionen: ap, positionen, gliederungen, gesamt: s.gesamt ?? zeilen.gesamt };
}
