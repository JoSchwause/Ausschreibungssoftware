// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Knoten, LvBefehl, Menge, PositionId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { ansatzEntfernungen, ansatzKennzeichen } from './rueckfrage';

const ansatz = [{ zeile: 1, formel: 91, ausdruck: '2*3', variable: null }];
const knoten = [
  { art: 'position', id: 'a', menge: '6.000', mengenansatz: ansatz },
  { art: 'position', id: 'b', menge: '1.000' },
  { art: 'titel', id: 't' },
] as unknown as readonly Knoten[];
const menge = (positionId: string, m: string | null): LvBefehl => ({
  art: 'MengeAendern',
  positionId: positionId as PositionId,
  menge: m as Menge | null,
});

describe('ansatzEntfernungen (Lesart a, D-22)', () => {
  it('Mengenänderung an einer Position mit Ansatz betrifft sie', () => {
    expect(ansatzEntfernungen(knoten, [menge('a', '7.000')]).map((p) => p.id)).toEqual(['a']);
    expect(ansatzEntfernungen(knoten, [menge('a', null)]).map((p) => p.id)).toEqual(['a']);
  });
  it('gleiche Menge ändert nichts (D-56.2), Position ohne Ansatz ist egal', () => {
    expect(ansatzEntfernungen(knoten, [menge('a', '6.000')])).toEqual([]);
    expect(ansatzEntfernungen(knoten, [menge('b', '2.000')])).toEqual([]);
  });
  it('andere Befehle und unbekannte Positionen betreffen nichts; jede Position einmal', () => {
    expect(ansatzEntfernungen(knoten, [menge('x', '1.000')])).toEqual([]);
    expect(
      ansatzEntfernungen(knoten, [{ art: 'KurztextAendern', knotenId: 'a', kurztext: 'x' } as LvBefehl]),
    ).toEqual([]);
    expect(ansatzEntfernungen(knoten, [menge('a', '7.000'), menge('a', '8.000')])).toHaveLength(1);
  });
});

describe('ansatzKennzeichen', () => {
  it('nur Positionen mit Ansatz, ein Hinweis an der Mengenzelle', () => {
    const k = ansatzKennzeichen(knoten);
    expect([...k.keys()]).toEqual(['a']);
    const b = k.get('a')?.[0];
    expect(b).toMatchObject({ code: 'mengenansatz', ort: { knotenId: 'a', feld: 'menge' } });
    expect(b?.meldung).toContain('Mengenansatz');
  });
});
