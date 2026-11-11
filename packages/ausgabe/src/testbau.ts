// SPDX-License-Identifier: AGPL-3.0-or-later
// Testhilfen für den LV-Druck (Ticket 58), nicht exportiert über index.ts. Ergänzt `testhilfen.ts` (das Ticket 51
// parallel ändert) um die Fixture `zuschlag` und um Hilfen, die ein LV über den Kern mit Kopfdaten, Merkmalen und
// Langtext versehen. Summen kommen immer vom Kern.

import { readFileSync } from 'node:fs';
import type {
  Knoten,
  LvInhalt,
  LvZustand,
  Position,
  PositionId,
  Positionsmerkmale,
  Prozent,
  Zuschlagsbezug,
} from '@tethys/vertrag';
import { fixtureAlsInhalt, lvZustandAusFixture, lvZustandAusInhalt } from './testhilfen';
import type { FxLv } from './testhilfen';

interface RohZuschlag {
  readonly prozentsatz: string | null;
  readonly bezug:
    | { readonly art: 'gliederung' }
    | { readonly art: 'kennzeichnung' }
    | {
        readonly art: 'positionen';
        readonly positionen: readonly { readonly positionId: string; readonly teilmenge: string | null }[];
      };
}

interface RohKnoten {
  readonly id: string;
  readonly zuschlag?: RohZuschlag;
  readonly zuschlagskennzeichen?: boolean;
}

export interface FxZuschlagLv extends FxLv {
  readonly sollwerte: FxLv['sollwerte'] & {
    readonly zuschlaege: Record<string, { basis: string; betrag: string }>;
    readonly positionen: Record<string, { gp: string; inSumme: boolean }>;
  };
}

/** Fixture `zuschlag` (Zuschlagspositionen in GAEB-Form), vom Kern gerechnet. */
export function zuschlagFixture(): { fx: FxZuschlagLv; zustand: LvZustand } {
  const text = readFileSync(new URL('../../../fixtures/zuschlag.json', import.meta.url), 'utf8');
  const fx = JSON.parse(text) as FxZuschlagLv;
  const roh = new Map((JSON.parse(text) as { knoten: RohKnoten[] }).knoten.map((k) => [k.id, k]));
  const inhalt = fixtureAlsInhalt(fx);
  const knoten = inhalt.knoten.map((k): Knoten => {
    const r = roh.get(k.id);
    if (k.art !== 'position' || r === undefined) return k;
    const merkmale: Positionsmerkmale = {
      ...k.merkmale,
      zuschlagskennzeichen: r.zuschlagskennzeichen === true,
    };
    const zuschlag =
      r.zuschlag === undefined
        ? k.zuschlag
        : {
            prozentsatz: r.zuschlag.prozentsatz as Prozent | null,
            bezug: (r.zuschlag.bezug.art === 'positionen'
              ? {
                  art: 'positionen',
                  positionen: r.zuschlag.bezug.positionen.map((b) => ({
                    positionId: b.positionId as PositionId,
                    teilmenge: null,
                  })),
                }
              : r.zuschlag.bezug) as Zuschlagsbezug,
          };
    return { ...k, merkmale, zuschlag };
  });
  return { fx, zustand: lvZustandAusInhalt(fx.id, { ...inhalt, knoten }) };
}

export type FixtureName = 'winzig' | 'typisch' | 'zuschlag';

export function fixtureZustand(name: FixtureName): { fx: FxLv; zustand: LvZustand } {
  return name === 'zuschlag' ? zuschlagFixture() : lvZustandAusFixture(name);
}

/** Das LV neu über den Kern anlegen, mit geändertem Inhalt (Kopfdaten, Knoten); die Summen rechnet der Kern. */
export function mitInhalt(zustand: LvZustand, aendern: (inhalt: LvInhalt) => LvInhalt): LvZustand {
  const lv = zustand.leistungsverzeichnis;
  const inhalt: LvInhalt = {
    name: lv.name,
    ozMaske: lv.ozMaske,
    mwstSatz: lv.mwstSatz,
    nachlass: lv.nachlass,
    ...(lv.auftraggeber ? { auftraggeber: lv.auftraggeber } : {}),
    ...(lv.vergabeinformationen ? { vergabeinformationen: lv.vergabeinformationen } : {}),
    wurzelId: lv.id,
    knoten: lv.knoten,
  };
  return lvZustandAusInhalt(lv.id, aendern(inhalt));
}

/** Ändert jede Position, die `waehle` trifft. */
export function positionenAendern(
  inhalt: LvInhalt,
  waehle: (p: Position) => boolean,
  aendern: (p: Position) => Position,
): LvInhalt {
  return {
    ...inhalt,
    knoten: inhalt.knoten.map((k) => (k.art === 'position' && waehle(k) ? aendern(k) : k)),
  };
}
