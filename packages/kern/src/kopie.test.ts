// SPDX-License-Identifier: AGPL-3.0-or-later
// kopieBauen (Ticket 42, Punkt 1): Kopie samt umgebogener Bezüge, Kennungen aus der übergebenen ID-Quelle. Zuerst
// geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type { HinweistextId, KnotenId, LosId, Position, PositionId, TitelId } from '@tethys/vertrag';
import { kopieBauen } from './index';
import type { KopieIdQuelle } from './index';
import {
  LV_ID,
  id,
  lvMit,
  merkmale,
  posKnoten,
  titelKnoten,
  wahlzuordnung,
  zuschlagsliste,
} from './testhilfen';

/** Zählende ID-Quelle, die jeden Aufruf mitschreibt. */
function quelle(): KopieIdQuelle & { readonly aufrufe: string[] } {
  const aufrufe: string[] = [];
  let n = 0;
  const neu = (art: string): string => {
    n++;
    aufrufe.push(art);
    return `${art}-${String(n)}`;
  };
  return {
    aufrufe,
    los: () => neu('los') as LosId,
    titel: () => neu('titel') as TitelId,
    position: () => neu('position') as PositionId,
    hinweistext: () => neu('hinweis') as HinweistextId,
  };
}

const z = lvMit([
  titelKnoten('T1', LV_ID, 0),
  posKnoten('P1', 'T1', 0, '2.000', '10.000'),
  {
    art: 'hinweis',
    id: id.hinweis('H1'),
    elternId: id.eltern('T1'),
    reihenfolge: 1,
    text: [{ art: 'text', text: 'Hinweis' }],
  },
  posKnoten('Z', 'T1', 2, null, null, { zuschlag: zuschlagsliste(['P1', 'P3'], '10.00') }),
  titelKnoten('T2', LV_ID, 1),
  posKnoten('P3', 'T2', 0, '1.000', '100.000'),
  posKnoten('W', 'T2', 1, '1.000', '90.000', { merkmale: merkmale({ wahl: wahlzuordnung(1, 1, 'P3') }) }),
]);
const k = (...ids: string[]): KnotenId[] => ids.map(id.knoten);

describe('kopieBauen', () => {
  it('Teilbaum flach in Vorordnung, neue Kennungen in Präorder, innere Lage umgehängt, Wurzel mit alter Lage', () => {
    const q = quelle();
    const kopie = kopieBauen(z, k('T1'), q);
    expect(q.aufrufe).toEqual(['titel', 'position', 'hinweis', 'position']);
    expect(kopie.map((n) => [n.id, n.elternId, n.reihenfolge])).toEqual([
      ['titel-1', LV_ID, 0],
      ['position-2', 'titel-1', 0],
      ['hinweis-3', 'titel-1', 1],
      ['position-4', 'titel-1', 2],
    ]);
    // Inhalt bleibt sonst gleich.
    expect({ ...kopie[1], id: 'P1', elternId: 'T1' }).toEqual(z.leistungsverzeichnis.knoten[1]);
  });

  it('Zuschlagsbezug auf eine kopierte Position zeigt auf die Kopie, Bezug nach außen bleibt', () => {
    const kopie = kopieBauen(z, k('T1'), quelle());
    const zk = kopie[3] as Position;
    expect(zk.zuschlag).toEqual(zuschlagsliste(['position-2', 'P3'], '10.00'));
  });

  it('Wahl auf kopierte Grundposition zeigt auf die Kopie; ohne die Grundposition bleibt der Bezug', () => {
    const beide = kopieBauen(z, k('P3', 'W'), quelle());
    expect((beide[1] as Position).merkmale.wahl?.grundpositionId).toBe('position-1');
    const allein = kopieBauen(z, k('W'), quelle());
    expect((allein[0] as Position).merkmale.wahl?.grundpositionId).toBe('P3');
  });

  it('Wurzeln in genannter Reihenfolge; Doppelte und Nachfahren genannter Knoten zählen nicht eigens', () => {
    const q = quelle();
    const kopie = kopieBauen(z, k('T2', 'P1', 'P3', 'T2'), q);
    expect(kopie.map((n) => n.id)).toEqual(['titel-1', 'position-2', 'position-3', 'position-4']);
    expect(kopie.map((n) => n.elternId)).toEqual([LV_ID, 'titel-1', 'titel-1', 'T1']);
  });

  it('unbekannte Kennung: Programmfehler (wirft)', () => {
    expect(() => kopieBauen(z, k('gibt-es-nicht'), quelle())).toThrow(/gibt-es-nicht/);
  });
});
