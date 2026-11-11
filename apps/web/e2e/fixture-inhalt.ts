// SPDX-License-Identifier: AGPL-3.0-or-later
// Eine Fixture als `LvInhalt` des Vertrags, für den Testpfad (großes LV laden). Reine Daten, keine Rechnung: Die
// Summen berechnet der Kern beim `LeistungsverzeichnisAnlegen`. Abbildung wie in
// `packages/vertrag/src/fixtures-abbildung.test.ts`.

import { readFileSync } from 'node:fs';
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
  readonly menge?: string;
  readonly einheit?: string;
  readonly einheitspreis?: string;
  readonly bedarfMitGesamtbetrag?: boolean;
  readonly bezugspositionId?: string;
  readonly grundpositionId?: string;
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
  const bezug =
    k.bezugspositionId === undefined
      ? []
      : [{ positionId: k.bezugspositionId as PositionId, teilmenge: null }];
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
    zuschlag:
      art === 'zuschlag' ? { prozentsatz: null, bezug: { art: 'positionen', positionen: bezug } } : null,
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
