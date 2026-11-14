// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 155: Verweis von einer Kostenermittlung auf die Honorarberechnungen, die sie lesen.

import type { Honorarberechnung, Honorarobjekt, KostenermittlungId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { honorareDerKostenermittlung } from './verweise';

const K1 = 'k1' as KostenermittlungId;
const K2 = 'k2' as KostenermittlungId;

const objekt = (kosten: Honorarobjekt['anrechenbareKosten']): Honorarobjekt =>
  ({ bezeichnung: 'Objekt', anrechenbareKosten: kosten }) as unknown as Honorarobjekt;
const ausErmittlung = (id: KostenermittlungId): Honorarobjekt =>
  objekt({ art: 'kostenermittlung', kostenermittlungId: id } as Honorarobjekt['anrechenbareKosten']);
const berechnung = (id: string, name: string, objekte: Honorarobjekt[]): Honorarberechnung =>
  ({ id, name, objekte }) as unknown as Honorarberechnung;

describe('Honorare einer Kostenermittlung', () => {
  it('nennt jede Berechnung, von der mindestens ein Objekt die Kostenermittlung liest, einmal und in der Reihenfolge', () => {
    const liste = [
      berechnung('h1', 'Gebäude', [ausErmittlung(K1), ausErmittlung(K1)]),
      berechnung('h2', 'Freianlagen', [objekt({ art: 'betrag' } as Honorarobjekt['anrechenbareKosten'])]),
      berechnung('h3', 'Innenräume', [ausErmittlung(K2), ausErmittlung(K1)]),
    ];
    expect(honorareDerKostenermittlung(liste, K1)).toEqual([
      { id: 'h1', name: 'Gebäude' },
      { id: 'h3', name: 'Innenräume' },
    ]);
    expect(honorareDerKostenermittlung(liste, 'k9' as KostenermittlungId)).toEqual([]);
  });
});
