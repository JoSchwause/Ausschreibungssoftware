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

// v1.1b: mechanisch angepasst, Folgeticket. Seit v1.1b hat eine Position keine einzelne Positionsart mehr. Die Tests des Kerns schreiben ihre Fälle
// weiter in der alten Kurzform (`positionsart: 'wahl'`, `bedarfMitGesamtbetrag`, `bezugspositionId` …); `positionsfelder`
// übersetzt sie in `merkmale` und `zuschlag`. Nur Testhilfe, kein Kern-Verhalten. Gruppe und Variante bleiben `null`.

/** Alte Positionsart, nur als Kurzform der Tests. */
export type Positionsart = 'normal' | 'bedarf' | 'wahl' | 'zuschlag' | 'stundenlohn';

export interface PositionsKurzform {
  positionsart?: Positionsart;
  pauschal?: boolean;
  bedarfMitGesamtbetrag?: boolean;
  bezugspositionId?: string | null;
  grundpositionId?: string | null;
}

/** Wandelt die Kurzform in Felder des Vertrags; alle anderen Felder bleiben, wie sie sind. */
export function positionsfelder<T extends PositionsKurzform>(
  ueber: T,
): Partial<Position> & Omit<T, keyof PositionsKurzform> {
  const { positionsart, pauschal, bedarfMitGesamtbetrag, bezugspositionId, grundpositionId, ...rest } = ueber;
  const aus: Record<string, unknown> = { ...rest };
  if (
    positionsart !== undefined ||
    pauschal !== undefined ||
    bedarfMitGesamtbetrag !== undefined ||
    grundpositionId !== undefined
  ) {
    const merkmale: Positionsmerkmale = {
      bedarf:
        positionsart === 'bedarf'
          ? bedarfMitGesamtbetrag === true
            ? 'mit-gesamtbetrag'
            : 'ohne-gesamtbetrag'
          : null,
      wahl:
        positionsart === 'wahl'
          ? { gruppe: null, variante: null, grundpositionId: (grundpositionId ?? null) as PositionId | null }
          : null,
      stundenlohn: positionsart === 'stundenlohn',
      pauschal: pauschal ?? false,
      zuschlagskennzeichen: false,
    };
    aus['merkmale'] = merkmale;
  }
  if (positionsart === 'zuschlag') {
    const z: Zuschlag = {
      prozentsatz: null,
      bezug: {
        art: 'positionen',
        positionen:
          bezugspositionId == null ? [] : [{ positionId: bezugspositionId as PositionId, teilmenge: null }],
      },
    };
    aus['zuschlag'] = z;
  }
  return aus as Partial<Position> & Omit<T, keyof PositionsKurzform>;
}

/** Die alte Positionsart einer Position, für Zählungen in Tests. */
export function positionsartVon(p: Pick<Position, 'merkmale' | 'zuschlag'>): Positionsart {
  // Die alte Ausschließlichkeit der Art bleibt hier behauptet: mehr als ein Merkmal in diesem Test ist ein Fehler.
  const gesetzt = [
    p.zuschlag !== null,
    p.merkmale.wahl !== null,
    p.merkmale.bedarf !== null,
    p.merkmale.stundenlohn,
  ];
  if (gesetzt.filter(Boolean).length > 1)
    throw new Error('Mehrere Positionsmerkmale zugleich gesetzt (Art nicht eindeutig).');
  if (p.zuschlag !== null) return 'zuschlag';
  if (p.merkmale.wahl !== null) return 'wahl';
  if (p.merkmale.bedarf !== null) return 'bedarf';
  if (p.merkmale.stundenlohn) return 'stundenlohn';
  return 'normal';
}

export function positionsdaten(
  kurztext: string,
  ueber: Partial<Positionsdaten> & PositionsKurzform = {},
): Positionsdaten {
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
    ...positionsfelder(ueber),
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
  positionsart?: Positionsart;
  ozIndex?: string;
  langtext?: string;
  menge?: string;
  einheit?: string;
  einheitspreis?: string;
  bedarfMitGesamtbetrag?: boolean;
  bezugspositionId?: string;
  grundpositionId?: string;
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
      ...(({ merkmale, zuschlag }) => ({ merkmale, zuschlag }))(
        positionsdaten('', {
          positionsart: k.positionsart ?? 'normal',
          bedarfMitGesamtbetrag: k.bedarfMitGesamtbetrag ?? false,
          bezugspositionId: k.bezugspositionId ?? null,
          grundpositionId: k.grundpositionId ?? null,
        }),
      ),
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
  ueber: Partial<Positionsdaten> & PositionsKurzform = {},
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
