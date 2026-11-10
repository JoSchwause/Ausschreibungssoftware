// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests dieses Pakets (nicht exportiert über index.ts). Importiert die Fixtures direkt: Testdateien
// dürfen das (A3, Ticket 25); Produktivcode nicht.

import gross from '../../../fixtures/gross.json';
import handbeispiele from '../../../fixtures/handbeispiele.json';
import typisch from '../../../fixtures/typisch.json';
import winzig from '../../../fixtures/winzig.json';
import type {
  Betrag,
  Einheitspreis,
  Ergebnis,
  ElternId,
  GliederungId,
  HinweistextId,
  Knoten,
  LeistungsverzeichnisId,
  LvBefehl,
  LvChangeSet,
  LvInhalt,
  LvZustand,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzMaske,
  Position,
  PositionId,
  Positionsdaten,
  Positionsmerkmale,
  Wahlzuordnung,
  Zuschlag,
  Prozent,
  Titel,
  TitelId,
  LosId,
  ProjektId,
  KnotenId,
  Summenvorher,
} from '@tethys/vertrag';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from './index';

export const LV_ID = 'lv-test' as LeistungsverzeichnisId;
export const PROJEKT_ID = 'projekt-test' as ProjektId;

/** 14 Stellen (F2): fünf Stufen zu 2, Position 4, kein Index (mit Index wären es 15). */
export const standardMaske: OzMaske = {
  gliederung: Array.from({ length: 5 }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
  position: { laenge: 4, zeichen: 'numerisch' },
  index: null,
  trennzeichen: '.',
};

export const id = {
  pos: (s: string) => s as PositionId,
  titel: (s: string) => s as TitelId,
  los: (s: string) => s as LosId,
  hinweis: (s: string) => s as HinweistextId,
  knoten: (s: string) => s as KnotenId,
  eltern: (s: string) => s as ElternId,
};

export function inhalt(knoten: readonly Knoten[] = []): LvInhalt {
  return {
    name: 'Testverzeichnis',
    ozMaske: standardMaske,
    mwstSatz: '19.00' as Prozent,
    nachlass: null,
    knoten,
    wurzelId: LV_ID,
  };
}

/** Keine Merkmale gesetzt: eine Normalposition (F5). */
export const OHNE_MERKMALE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};

/** Merkmale; was fehlt, ist nicht gesetzt. */
export const merkmale = (ueber: Partial<Positionsmerkmale> = {}): Positionsmerkmale => ({
  ...OHNE_MERKMALE,
  ...ueber,
});

/** Wahlzuordnung; Gruppe und Variante `null` wie in Daten vor v1.1b. */
export const wahlzuordnung = (
  variante: number | null = null,
  gruppe: number | null = null,
  grundpositionId: string | null = null,
): Wahlzuordnung => ({ gruppe, variante, grundpositionId: grundpositionId as PositionId | null });

/** Zuschlag mit Bezugsform `positionen` (R5); ohne Satz ist es die Altform (R8). */
export const zuschlagsliste = (bezug: readonly string[], prozentsatz: string | null = null): Zuschlag => ({
  prozentsatz: prozentsatz as Prozent | null,
  bezug: {
    art: 'positionen',
    positionen: bezug.map((b) => ({ positionId: b as PositionId, teilmenge: null })),
  },
});

/** Zuschlag mit Bezugsform `gliederung` (R3) oder `kennzeichnung` (R4). */
export const zuschlagAuf = (art: 'gliederung' | 'kennzeichnung', prozentsatz: string | null): Zuschlag => ({
  prozentsatz: prozentsatz as Prozent | null,
  bezug: { art },
});

export function positionsdaten(kurztext: string, ueber: Partial<Positionsdaten> = {}): Positionsdaten {
  return {
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext,
    langtext: [],
    menge: null,
    einheit: null,
    einheitspreis: null,
    epa: null,
    ...ueber,
  };
}

/** Ergebnis auspacken; ein Fehlerwert ist im Test ein Fehlschlag. */
export function erwarteOk<T, F>(e: Ergebnis<T, F>): T {
  if (!e.ok) throw new Error(`Unerwarteter Fehlerwert: ${JSON.stringify(e.fehler)}`);
  return e.wert;
}

/**
 * `lvChangeSetAnwenden` für Tests, in denen das LV bestehen bleibt: Ein Ergebnis `null` (das ChangeSet entfernt das LV)
 * ist dort ein Fehlschlag.
 */
export function anwenden(zustand: LvZustand | null, cs: LvChangeSet): LvZustand {
  const neu = lvChangeSetAnwenden(zustand, cs);
  if (neu === null) throw new Error('Das ChangeSet entfernt das LV.');
  return neu;
}

/** Befehl ausführen und das ChangeSet anwenden; wirft bei Fehlerwert. */
export function wende(zustand: LvZustand | null, befehl: LvBefehl): LvZustand {
  return anwenden(zustand, erwarteOk(lvBefehlAusfuehren(zustand, befehl)));
}

/** Summen eines ChangeSets, das keine Summe ändert: auch keine alten Werte (v1.1a). */
export const KEINE_SUMMEN = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  vorher: { positionen: [], gliederungen: [], gesamt: null, entfernt: { positionen: [], gliederungen: [] } },
} as const;

const nachSchluessel = <T>(liste: readonly T[], schluessel: (x: T) => string): T[] =>
  [...liste].sort((a, b) => (schluessel(a) < schluessel(b) ? -1 : schluessel(a) > schluessel(b) ? 1 : 0));

/**
 * Das ChangeSet mit kanonisch (nach Kennung) geordneten Summenlisten und ohne Hinweise, für den Vergleich mit der
 * Umkehrung der Umkehrung: Die Summen werden als Mengen verglichen, nicht nach ihrer Reihenfolge (Ticket 30, Punkt 2;
 * `LeistungsverzeichnisAnlegen` liefert sie in Knotenreihenfolge); Hinweise gehen nicht in die Umkehrung ein.
 */
export function ohneReihenfolge(cs: LvChangeSet): LvChangeSet {
  const p = <T extends { positionId: string }>(l: readonly T[]): T[] =>
    nachSchluessel(l, (x) => x.positionId);
  const g = <T extends { gliederungId: string }>(l: readonly T[]): T[] =>
    nachSchluessel(l, (x) => x.gliederungId);
  const v: Summenvorher | undefined = cs.summen.vorher;
  return {
    art: cs.art,
    leistungsverzeichnisId: cs.leistungsverzeichnisId,
    kopf: cs.kopf,
    knoten: cs.knoten,
    ...(cs.papierkorb === undefined ? {} : { papierkorb: cs.papierkorb }),
    ...(cs.lvStand === undefined ? {} : { lvStand: cs.lvStand }),
    summen: {
      ...cs.summen,
      positionen: p(cs.summen.positionen),
      gliederungen: g(cs.summen.gliederungen),
      ...(v === undefined
        ? {}
        : {
            vorher: {
              ...v,
              positionen: p(v.positionen),
              gliederungen: g(v.gliederungen),
              entfernt: {
                positionen: p(v.entfernt.positionen),
                gliederungen: g(v.entfernt.gliederungen),
              },
            },
          }),
    },
  };
}

export function neuesLv(knoten: readonly Knoten[] = []): LvZustand {
  return wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: LV_ID,
    projektId: PROJEKT_ID,
    inhalt: inhalt(knoten),
  });
}

/** Kinder eines Elternknotens in Anzeigereihenfolge (Test-Orakel, unabhängig vom Index des Kerns). */
export function kinderIds(z: LvZustand, eltern: string): string[] {
  return z.leistungsverzeichnis.knoten
    .filter((k) => k.elternId === eltern)
    .sort((a, b) => a.reihenfolge - b.reihenfolge)
    .map((k) => k.id);
}

// --- Fixtures (Form: fixtures/README.md) ---------------------------------------------------------------------

interface FxKnoten {
  id: string;
  parentId: string;
  art: 'titel' | 'hinweis' | 'position';
  ordnungszahl?: string;
  kurztext?: string;
  text?: string;
  positionsart?: FxPositionsart;
  ozIndex?: string;
  langtext?: string;
  menge?: string;
  einheit?: string;
  einheitspreis?: string;
  bedarfMitGesamtbetrag?: boolean;
  bezugspositionId?: string;
  grundpositionId?: string;
}
/** Positionsart des Fixture-Formats (`fixtures/README.md`, Annahmen A1 bis A4); Ticket 44 stellt das Format um. */
export type FxPositionsart = 'normal' | 'bedarf' | 'wahl' | 'zuschlag';

/** Merkmale und Zuschlag aus dem Fixture-Format; eine Zuschlagsposition der Fixtures ist die Altform (R8, D-10). */
function fixtureMerkmale(k: FxKnoten): Pick<Position, 'merkmale' | 'zuschlag'> {
  const art = k.positionsart ?? 'normal';
  return {
    merkmale: merkmale({
      bedarf:
        art === 'bedarf'
          ? k.bedarfMitGesamtbetrag === true
            ? 'mit-gesamtbetrag'
            : 'ohne-gesamtbetrag'
          : null,
      wahl: art === 'wahl' ? wahlzuordnung(null, null, k.grundpositionId ?? null) : null,
    }),
    zuschlag:
      art === 'zuschlag'
        ? zuschlagsliste(k.bezugspositionId === undefined ? [] : [k.bezugspositionId])
        : null,
  };
}

interface FxLv {
  id: string;
  name: string;
  mwstSatz: string;
  nachlass: { art: 'prozent' | 'betrag'; wert: string } | null;
  knoten: FxKnoten[];
}

const FIXTURES = { winzig, typisch, gross };

export function fixtureLesen(name: 'winzig' | 'typisch' | 'gross'): FxLv {
  return FIXTURES[name] as unknown as FxLv;
}

/** Fixture → `LvInhalt` (wie `fixtures-abbildung.test.ts` in `vertrag`; Lage aus Array-Reihenfolge). */
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
      ...fixtureMerkmale(k),
      kurztext: k.kurztext ?? '',
      langtext: [{ art: 'text', text: k.langtext ?? '' }],
      menge: (k.menge ?? null) as Menge | null,
      einheit: k.einheit ?? null,
      einheitspreis: (k.einheitspreis ?? null) as Einheitspreis | null,
      epa: null,
    };
  });
  const nachlass: Nachlass | null =
    fx.nachlass === null
      ? null
      : fx.nachlass.art === 'prozent'
        ? { art: 'prozent', wert: fx.nachlass.wert as Prozent }
        : { art: 'betrag', wert: fx.nachlass.wert as Betrag };
  return {
    name: fx.name,
    ozMaske: standardMaske,
    mwstSatz: fx.mwstSatz as Prozent,
    nachlass,
    knoten,
    wurzelId: fx.id as LeistungsverzeichnisId,
  };
}

export const gliederungId = (s: string): GliederungId => s as GliederungId;

// --- Summen (Ticket 07) --------------------------------------------------------------------------------------

/** Position als Knoten (für `LeistungsverzeichnisAnlegen`); Zahlen in kanonischer Schreibweise. */
export function posKnoten(
  kennung: string,
  eltern: string,
  reihenfolge: number,
  menge: string | null,
  einheitspreis: string | null,
  ueber: Partial<Positionsdaten> = {},
): Position {
  return {
    art: 'position',
    id: id.pos(kennung),
    elternId: id.eltern(eltern),
    reihenfolge,
    ...positionsdaten(`Position ${kennung}`, {
      menge: menge as Menge | null,
      einheitspreis: einheitspreis as Einheitspreis | null,
      ...ueber,
    }),
  };
}

export function titelKnoten(kennung: string, eltern: string, reihenfolge: number): Titel {
  return {
    art: 'titel',
    id: id.titel(kennung),
    elternId: id.eltern(eltern),
    reihenfolge,
    ordnungszahl: null,
    kurztext: `Titel ${kennung}`,
  };
}

/** LV aus Knoten mit wählbarem Nachlass und MwSt-Satz. */
export function lvMit(
  knoten: readonly Knoten[],
  kopf: { nachlass?: Nachlass | null; mwstSatz?: string } = {},
): LvZustand {
  const basis = inhalt(knoten);
  return wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: LV_ID,
    projektId: PROJEKT_ID,
    inhalt: {
      ...basis,
      nachlass: kopf.nachlass === undefined ? basis.nachlass : kopf.nachlass,
      mwstSatz: (kopf.mwstSatz ?? basis.mwstSatz) as Prozent,
    },
  });
}

export const prozentNachlass = (wert: string): Nachlass => ({ art: 'prozent', wert: wert as Prozent });
export const betragNachlass = (wert: string): Nachlass => ({ art: 'betrag', wert: wert as Betrag });

export interface Sollwerte {
  positionen: Record<string, { gp: string | null; inSumme: boolean }>;
  titel: Record<string, { summe: string }>;
  summen: { netto: string; nachlass: string; nettoNachNachlass: string; mwst: string; brutto: string };
}

export function sollwerteLesen(name: 'winzig' | 'typisch' | 'gross'): Sollwerte {
  return (FIXTURES[name] as unknown as { sollwerte: Sollwerte }).sollwerte;
}

export interface Handbeispiele {
  gesamtpreise: { menge: string; einheitspreis: string; gp: string }[];
  summenketten: {
    netto: string;
    nachlass: { art: 'prozent' | 'betrag'; wert: string } | null;
    mwstSatz: string;
    soll: Sollwerte['summen'];
  }[];
}

export function handbeispieleLesen(): Handbeispiele {
  return handbeispiele as unknown as Handbeispiele;
}
