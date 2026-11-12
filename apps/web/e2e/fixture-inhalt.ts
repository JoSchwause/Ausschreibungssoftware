// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine Fixture als `LvInhalt` des Vertrags, für den Testpfad (großes LV laden). Reine Daten, keine Rechnung: Die
// Summen berechnet der Kern beim `LeistungsverzeichnisAnlegen`. Abbildung wie in
// `packages/vertrag/src/fixtures-abbildung.test.ts`.

import { readFileSync } from 'node:fs';
import { schreibeGaeb } from '../../../packages/gaeb/src/index';
import type {
  Betrag,
  Einheitspreis,
  ElternId,
  HinweistextId,
  Knoten,
  LeistungsverzeichnisId,
  LvInhalt,
  Menge,
  Nachlass,
  Ordnungszahl,
  OzStelle,
  PositionId,
  Prozent,
  TitelId,
  Zuschlag,
} from '@tethys/vertrag';

interface FxKnoten {
  readonly id: string;
  readonly parentId: string;
  readonly art: 'titel' | 'hinweis' | 'position';
  readonly ordnungszahl?: string;
  readonly ozIndex?: string;
  readonly kurztext?: string;
  readonly text?: string;
  readonly positionsart?: 'normal' | 'bedarf' | 'wahl' | 'zuschlag';
  // Ticket 51: Fixture-Format, mechanisch: an der Zuschlagsposition `null`, Satz und Bezug stehen in `zuschlag` (Vertragsform)
  readonly menge?: string | null;
  readonly einheit?: string | null;
  readonly einheitspreis?: string | null;
  readonly bedarfMitGesamtbetrag?: boolean;
  readonly grundpositionId?: string;
  readonly zuschlag?: Zuschlag;
}

interface FxLv {
  readonly id: string;
  readonly name: string;
  readonly ozMaske: string;
  readonly mwstSatz: string;
  readonly nachlass: { readonly art: 'prozent' | 'betrag'; readonly wert: string } | null;
  readonly knoten: readonly FxKnoten[];
}

function knoten(k: FxKnoten, reihenfolge: number): Knoten {
  const lage = { elternId: k.parentId as ElternId, reihenfolge };
  const ordnungszahl = (k.ordnungszahl ?? null) as Ordnungszahl | null;
  if (k.art === 'titel')
    return { ...lage, art: 'titel', id: k.id as TitelId, ordnungszahl, kurztext: k.kurztext ?? '' };
  if (k.art === 'hinweis') {
    const text = k.text ?? '';
    return {
      ...lage,
      art: 'hinweis',
      id: k.id as HinweistextId,
      text: [{ art: 'absatz', inhalt: [{ art: 'text', text }] }],
    };
  }
  const art = k.positionsart ?? 'normal';
  const bedarf = k.bedarfMitGesamtbetrag === true ? 'mit-gesamtbetrag' : 'ohne-gesamtbetrag';
  const grundpositionId = (k.grundpositionId ?? null) as PositionId | null;
  return {
    ...lage,
    art: 'position',
    id: k.id as PositionId,
    ordnungszahl,
    ozIndex: k.ozIndex ?? null,
    merkmale: {
      bedarf: art === 'bedarf' ? bedarf : null,
      wahl: art === 'wahl' ? { gruppe: null, variante: null, grundpositionId } : null,
      stundenlohn: false,
      pauschal: false,
      zuschlagskennzeichen: false,
    },
    zuschlag: k.zuschlag ?? null, // Ticket 51: Fixture-Format, mechanisch
    kurztext: k.kurztext ?? '',
    langtext: [],
    menge: (k.menge ?? null) as Menge | null,
    einheit: k.einheit ?? null,
    einheitspreis: (k.einheitspreis ?? null) as Einheitspreis | null,
    epa: null,
  };
}

export function fixtureInhalt(name: string): LvInhalt {
  const pfad = new URL(`../../../fixtures/${name}.json`, import.meta.url);
  const fx = JSON.parse(readFileSync(pfad, 'utf8')) as FxLv;
  const muster = fx.ozMaske.split(':')[0] ?? '';
  const teile = muster.replace('[I]', '').split('.');
  const stelle = (t: string): OzStelle => ({ laenge: t.length, zeichen: 'numerisch' });
  const folge = new Map<string, number>();
  const nachlass: Nachlass | null =
    fx.nachlass === null
      ? null
      : fx.nachlass.art === 'prozent'
        ? { art: 'prozent', wert: fx.nachlass.wert as Prozent }
        : { art: 'betrag', wert: fx.nachlass.wert as Betrag };
  return {
    name: fx.name,
    ozMaske: {
      gliederung: teile.slice(0, -1).map(stelle),
      position: stelle(teile.at(-1) ?? 'NNNN'),
      index: muster.includes('[I]') ? { laenge: 1, zeichen: 'alphanumerisch' } : null,
      trennzeichen: '.',
    },
    mwstSatz: fx.mwstSatz as Prozent,
    nachlass,
    wurzelId: fx.id as LeistungsverzeichnisId,
    knoten: fx.knoten.map((k) => {
      const r = folge.get(k.parentId) ?? 0;
      folge.set(k.parentId, r + 1);
      return knoten(k, r);
    }),
  };
}

/**
 * Ticket 91 (D-64.1 zurückgenommen, Ticket 73): die Fixture als X83 3.3, geschrieben vom GAEB-Writer der App (`gaeb`),
 * als Datei für „GAEB einlesen“. Datum und Uhrzeit fest (A2: kein `Date.now()` im Writer), damit die Datei je Lauf gleich ist.
 */
export function fixtureAlsX83(name: string): { name: string; mimeType: string; buffer: Buffer } {
  const e = schreibeGaeb(fixtureInhalt(name), {
    phase: 'X83',
    version: '3.3',
    erstellt: { datum: '2026-11-11', zeit: '12:00:00' },
    programm: 'Tethys AVA (E2E)',
  });
  return { name: `${name}.x83`, mimeType: 'application/xml', buffer: Buffer.from(e.xml, 'utf8') };
}
