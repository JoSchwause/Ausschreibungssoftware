// SPDX-License-Identifier: AGPL-3.0-or-later
// Hilfen nur für Tests und die Messung (nicht exportiert über index.ts): Fixture laden und über den Kern in einen
// `LvZustand` überführen (Summen kommen vom Kern, der Spike rechnet nichts), Text eines PDF zurücklesen.
// Fixtures werden per Dateizugriff gelesen, nicht importiert (A3).

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type {
  Betrag,
  ElternId,
  Einheitspreis,
  HinweistextId,
  Knoten,
  LeistungsverzeichnisId,
  LvInhalt,
  LvZustand,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzMaske,
  PositionId,
  Positionsart,
  ProjektId,
  Prozent,
  TitelId,
} from '@tethys/vertrag';

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

export interface FxLv {
  id: string;
  name: string;
  mwstSatz: string;
  nachlass: { art: 'prozent' | 'betrag'; wert: string } | null;
  knoten: FxKnoten[];
  sollwerte: {
    summen: { netto: string; nachlass: string; nettoNachNachlass: string; mwst: string; brutto: string };
    titel: Record<string, { summe: string }>;
  };
}

const maske: OzMaske = {
  gliederung: Array.from({ length: 5 }, () => ({ laenge: 2, zeichen: 'numerisch' as const })),
  position: { laenge: 4, zeichen: 'numerisch' },
  index: { laenge: 1, zeichen: 'alphanumerisch' },
  trennzeichen: '.',
};

export function fixtureLesen(name: 'winzig' | 'typisch' | 'gross'): FxLv {
  return JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8')) as FxLv;
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
  return { name: fx.name, ozMaske: maske, mwstSatz: fx.mwstSatz as Prozent, nachlass, knoten };
}

/** Legt das LV über den Kern an; die Summen im Zustand sind die des Kerns. */
export function lvZustandAusInhalt(id: string, inhalt: LvInhalt): LvZustand {
  const e = lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: id as LeistungsverzeichnisId,
    projektId: 'projekt-ausgabe' as ProjektId,
    inhalt,
  });
  if (!e.ok) throw new Error(`Kern lehnt das LV ab: ${JSON.stringify(e.fehler)}`);
  return lvChangeSetAnwenden(null, e.wert);
}

export function lvZustandAusFixture(name: 'winzig' | 'typisch' | 'gross'): { fx: FxLv; zustand: LvZustand } {
  const fx = fixtureLesen(name);
  return { fx, zustand: lvZustandAusInhalt(fx.id, fixtureAlsInhalt(fx)) };
}
