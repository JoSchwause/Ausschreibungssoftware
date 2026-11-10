// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests dieses Pakets (nicht exportiert über index.ts). Liest die Fixtures per Dateizugriff, nicht per
// Import: Produktivcode importiert keine Fixtures (A3); der Dateizugriff ist hier ein Test-Rand.

import { readFileSync } from 'node:fs';
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
  LvInhalt,
  LvZustand,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzMaske,
  Position,
  PositionId,
  Positionsdaten,
  Positionsart,
  Prozent,
  Titel,
  TitelId,
  LosId,
  ProjektId,
  KnotenId,
} from '@tethys/vertrag';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from './index';

export const LV_ID = 'lv-test' as LeistungsverzeichnisId;
export const PROJEKT_ID = 'projekt-test' as ProjektId;

export const standardMaske: OzMaske = {
  gliederung: Array.from({ length: 5 }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
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
    wurzelId: LV_ID, // v1.1a: mechanisch angepasst, Folgeticket
  };
}

export function positionsdaten(kurztext: string, ueber: Partial<Positionsdaten> = {}): Positionsdaten {
  return {
    ordnungszahl: null,
    ozIndex: null,
    positionsart: 'normal',
    pauschal: false,
    bedarfMitGesamtbetrag: false,
    bezugspositionId: null,
    grundpositionId: null,
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

/** Befehl ausführen und das ChangeSet anwenden; wirft bei Fehlerwert. */
export function wende(zustand: LvZustand | null, befehl: LvBefehl): LvZustand {
  return lvChangeSetAnwenden(zustand, erwarteOk(lvBefehlAusfuehren(zustand, befehl)));
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

export function fixtureLesen(name: 'winzig' | 'typisch' | 'gross'): FxLv {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8')) as FxLv;
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
      positionsart: k.positionsart ?? 'normal',
      pauschal: false,
      bedarfMitGesamtbetrag: k.bedarfMitGesamtbetrag ?? false,
      bezugspositionId: (k.bezugspositionId as PositionId | undefined) ?? null,
      grundpositionId: (k.grundpositionId as PositionId | undefined) ?? null,
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
    wurzelId: fx.id as LeistungsverzeichnisId, // v1.1a: mechanisch angepasst, Folgeticket
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
  const fx = JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8')) as {
    sollwerte: Sollwerte;
  };
  return fx.sollwerte;
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
  return JSON.parse(
    readFileSync(new URL('../../../fixtures/handbeispiele.json', import.meta.url), 'utf8'),
  ) as Handbeispiele;
}
