// SPDX-License-Identifier: AGPL-3.0-or-later
// Das Haus aus Ticket 99 als Bauwerksmodell und `typisch` mit den Zuordnungen aus `fixtures/typisch-bim.json` (nur Tests).
// `bim` darf `ifc` nicht importieren (A3), auch nicht im Test; darum entsteht das Modell aus den Sollwerten der Fixture, die
// `ifc` Zeile für Zeile gegen die IFC-Dateien prüft (Ticket 98, `haus.test.ts`: Klasse, Name, Geschoss und alle Mengen in
// ihrer Reihenfolge; BGF, BRI, NRF). Den Weg Datei → Modell → `bim` prüft der Kettentest des Tors (Ticket 117). D-108.1.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Ansatzzeile,
  Bauteil,
  Bauteilmenge,
  Bauteilzuordnung,
  Bauwerksmodell,
  Betrag,
  ElternId,
  HinweistextId,
  IfcGlobalId,
  Knoten,
  Kostengruppennummer,
  Menge,
  Position,
  Strukturknoten,
  TitelId,
} from '@tethys/vertrag';
import { gid, modell, position } from './bauen';

const WURZEL = join(import.meta.dirname, '..', '..', '..', '..');
const lesen = (pfad: string): unknown => JSON.parse(readFileSync(join(WURZEL, 'fixtures', pfad), 'utf8'));

interface FxMenge {
  readonly name: string;
  readonly art: Bauteilmenge['art'];
  readonly wert: string;
}
interface FxBauteil {
  readonly globalId: string;
  readonly kennung: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
  readonly mengen: readonly FxMenge[];
}
interface FxZeile {
  readonly zeile: string;
  readonly formel: string;
  readonly ausdruck: string;
  readonly variable: string | null;
}
export interface FxVordersatz {
  readonly positionId: string;
  readonly oz: string;
  readonly mengenansatz: readonly FxZeile[];
  readonly menge: string;
}
interface FxAenderung {
  readonly globalId: string;
  readonly kennung: string;
  readonly felder: readonly string[];
  readonly name?: { readonly vorher: string; readonly nachher: string };
  readonly strukturknoten?: { readonly vorher: string; readonly nachher: string };
  readonly mengen?: readonly { readonly name: string; readonly vorher: string; readonly nachher: string }[];
}
interface FxListeneintrag {
  readonly globalId: string;
  readonly kennung: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
}

/** Form von `fixtures/typisch-bim.json`, soweit `bim` sie liest (README „BIM: Haus und Tor X1“). */
export interface FxBim {
  readonly bauteile: { readonly v1: readonly FxBauteil[]; readonly v2: readonly FxBauteil[] };
  readonly zuordnungen: readonly {
    readonly positionId: string;
    readonly oz: string;
    readonly einheit: string;
    readonly bauteile: readonly Bauteilzuordnung[];
  }[];
  readonly kern: { readonly vordersaetze: readonly FxVordersatz[] };
  readonly erweitert: {
    readonly din277: {
      readonly geschosse: readonly { globalId: string; name: string; bgf: string; bri: string }[];
      readonly raeume: readonly { globalId: string; name: string; geschoss: string; nrf: string }[];
      readonly summen: { readonly bgf: string; readonly bri: string; readonly nrf: string };
    };
    readonly kostenschaetzung: {
      readonly stufe: string;
      readonly bezugsgroesse: { readonly art: string; readonly wert: string };
      readonly kennwerte: readonly { readonly nummer: string; readonly kennwert: string }[];
      readonly eintraege: readonly { readonly nummer: string; readonly betrag: string }[];
      readonly gesamt: string;
    };
    readonly aufmassAusAuswahl: {
      readonly modell: string;
      readonly auswahl: { readonly art: string; readonly globalId: string; readonly name: string };
      readonly positionen: readonly (FxVordersatz & { readonly bauteile: readonly string[] })[];
    };
    readonly vergleich: {
      readonly hinzugefuegt: readonly FxListeneintrag[];
      readonly entfernt: readonly FxListeneintrag[];
      readonly geaendert: readonly FxAenderung[];
    };
    readonly betroffenePositionen: readonly {
      readonly positionId: string;
      readonly oz: string;
      readonly vorher: string;
      readonly nachher: string;
      readonly differenz: string;
    }[];
    readonly mengenAktualisieren: {
      readonly vordersaetze: readonly FxVordersatz[];
      readonly befunde: readonly { positionId: string; art: string; globalId: string; kennung: string }[];
    };
  };
}

export const BIM = lesen('typisch-bim.json') as FxBim;

interface FxKnoten {
  readonly id: string;
  readonly parentId: string;
  readonly art: 'titel' | 'position' | 'hinweis';
  readonly ordnungszahl?: string;
  readonly kurztext?: string;
  readonly menge?: string | null;
  readonly einheit?: string | null;
}
const TYPISCH = lesen('typisch.json') as { readonly knoten: readonly FxKnoten[] };

const PROJEKT = gid('HausProjekt');
const GEBAEUDE = gid('HausGebaeude');

/** Kennung (`AW-EG-S` …) je GlobalId, über beide Stände. */
export const KENNUNG: ReadonlyMap<string, string> = new Map(
  [...BIM.bauteile.v1, ...BIM.bauteile.v2].map((b) => [b.globalId, b.kennung]),
);

/** GlobalId je Kennung. */
export function globalIdVon(kennung: string): IfcGlobalId {
  const b = [...BIM.bauteile.v1, ...BIM.bauteile.v2].find((x) => x.kennung === kennung);
  if (b === undefined) throw new Error(`Kennung unbekannt: ${kennung}`);
  return b.globalId as IfcGlobalId;
}

function struktur(): Strukturknoten[] {
  const { geschosse, raeume } = BIM.erweitert.din277;
  const geschossId = new Map(geschosse.map((g) => [g.name, g.globalId as IfcGlobalId]));
  const q = (satz: string, name: string, art: Bauteilmenge['art'], wert: string): Bauteilmenge => ({
    satz,
    name,
    art,
    wert: wert as Menge,
  });
  return [
    { globalId: PROJEKT, art: 'projekt', name: 'Musterhaus', elternGlobalId: null, mengen: [] },
    { globalId: GEBAEUDE, art: 'gebaeude', name: 'Haus', elternGlobalId: PROJEKT, mengen: [] },
    ...geschosse.map((g): Strukturknoten => ({
      globalId: g.globalId as IfcGlobalId,
      art: 'geschoss',
      name: g.name,
      elternGlobalId: GEBAEUDE,
      mengen: [
        q('Qto_BuildingStoreyBaseQuantities', 'GrossFloorArea', 'flaeche', g.bgf),
        q('Qto_BuildingStoreyBaseQuantities', 'GrossVolume', 'volumen', g.bri),
      ],
    })),
    ...raeume.map((r): Strukturknoten => ({
      globalId: r.globalId as IfcGlobalId,
      art: 'raum',
      name: r.name,
      elternGlobalId: geschossId.get(r.geschoss) ?? null,
      mengen: [q('Qto_SpaceBaseQuantities', 'NetFloorArea', 'flaeche', r.nrf)],
    })),
  ];
}

/** Das Haus als Bauwerksmodell (Stand v1 oder v2), Bauteile in der Reihenfolge der Fixture. */
export function hausModell(stand: 'v1' | 'v2'): Bauwerksmodell {
  const geschossId = new Map(BIM.erweitert.din277.geschosse.map((g) => [g.name, g.globalId as IfcGlobalId]));
  const bauteile = BIM.bauteile[stand].map((b): Bauteil => ({
    globalId: b.globalId as IfcGlobalId,
    ifcKlasse: b.klasse,
    name: b.name,
    typ: null,
    strukturGlobalId: geschossId.get(b.geschoss) ?? null,
    // Satzname wie in `fixtures/ifc/schreiben.mjs` (`MENGENSATZ`); `bim` liest ihn nur bei Mehrdeutigkeit.
    mengen: b.mengen.map((q) => ({
      satz: `Qto_${b.klasse.slice(3)}BaseQuantities`,
      name: q.name,
      art: q.art,
      wert: q.wert as Menge,
    })),
  }));
  return modell({ name: `Haus ${stand}`, struktur: struktur(), bauteile });
}

/**
 * `typisch` als Knotenliste: Titel, Hinweistexte und Positionen in Dokumentreihenfolge; die Positionen mit Menge, Einheit
 * und den Zuordnungen aus `typisch-bim.json`. Was `bim` nicht liest, steht neutral.
 */
export function typischKnoten(): Knoten[] {
  const zuordnung = new Map(BIM.zuordnungen.map((z) => [z.positionId, z.bauteile]));
  return TYPISCH.knoten.map((k, reihenfolge): Knoten => {
    const lage = { elternId: k.parentId as ElternId, reihenfolge };
    if (k.art === 'titel')
      return { art: 'titel', id: k.id as TitelId, ordnungszahl: null, kurztext: k.kurztext ?? '', ...lage };
    if (k.art === 'hinweis') return { art: 'hinweis', id: k.id as HinweistextId, text: [], ...lage };
    return position(k.id, k.einheit ?? null, zuordnung.get(k.id), {
      ...lage,
      menge: (k.menge ?? null) as Menge | null,
    });
  });
}

/** Ansatzzeile der Fixture (Nummern als Text, D-99.5) in Vertragsform. */
export const zeileAusFixture = (z: FxZeile): Ansatzzeile => ({
  zeile: Number(z.zeile),
  formel: Number(z.formel),
  ausdruck: z.ausdruck,
  variable: z.variable,
});

/** `typisch` nach der Übernahme mit einem Stand: jede Position mit ihren Ansatzzeilen und ihrer Menge. */
export function nachUebernahme(knoten: readonly Knoten[], vordersaetze: readonly FxVordersatz[]): Knoten[] {
  const v = new Map(vordersaetze.map((x) => [x.positionId, x]));
  return knoten.map((k): Knoten => {
    const x = v.get(k.id);
    if (k.art !== 'position' || x === undefined) return k;
    const p: Position = { ...k, mengenansatz: x.mengenansatz.map(zeileAusFixture), menge: x.menge as Menge };
    return p;
  });
}

export const betrag = (w: string): Betrag => w as Betrag;
export const kg = (w: string): Kostengruppennummer => w as Kostengruppennummer;
