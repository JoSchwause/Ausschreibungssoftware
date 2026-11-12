// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 94: `kanonischeListe` schreibt eine Liste genau wie `kanonischKompakt`, auch wenn eine Merkliste über zwei Listen
// läuft, die Elemente teilen (vorher und nachher eines ChangeSets). Der gespeicherte Text eines Aufmaßblatts hängt daran.

import { describe, expect, it } from 'vitest';
import { kanonischeListe, kanonischKompakt } from './kanonisch';

const zeile = {
  positionId: 'position-1',
  mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '0,5*2', variable: null }],
  menge: '1.000',
  bemerkung: undefined,
};

const mitLuecke: unknown[] = [1];
mitLuecke[2] = 3;

describe('kanonischeListe', () => {
  const faelle: Record<string, readonly unknown[]> = {
    'leere Liste': [],
    'Zeilen mit Schlüsseln in Vertragsreihenfolge und undefined-Feld': [
      zeile,
      { b: 1, a: { d: 'x', c: undefined } },
    ],
    'Werte statt Objekte und verschachtelte Listen': ['text', 7, -0, true, null, [[1], { z: [] }]],
    'Lücke (wie JSON.stringify: null)': mitLuecke,
  };
  for (const [name, liste] of Object.entries(faelle))
    it(`gleich kanonischKompakt: ${name}`, () => {
      expect(kanonischeListe(liste, new WeakMap())).toBe(kanonischKompakt(liste));
    });

  it('mit Merkliste über zwei Listen, die Elemente teilen, auch an anderer Stelle: gleich kanonischKompakt', () => {
    const a = { x: 1, y: [2] };
    const b = { y: 'b', x: null };
    const merkliste = new WeakMap<object, string>();
    const vorher = [a, b, zeile];
    const nachher = [zeile, { ...a, x: 2 }, b, a];
    expect(kanonischeListe(vorher, merkliste)).toBe(kanonischKompakt(vorher));
    expect(kanonischeListe(nachher, merkliste)).toBe(kanonischKompakt(nachher));
  });

  it('ein Element, das kein JSON ist: TypeError mit Pfad wie bei kanonischKompakt', () => {
    expect(() => kanonischeListe([zeile, { menge: 1.5 }], new WeakMap(), '$.positionen')).toThrow(
      /^\$\.positionen\[1\]\.menge: nur ganze Zahlen/,
    );
    expect(() => kanonischeListe([undefined], new WeakMap())).toThrow(TypeError);
    expect(() => kanonischKompakt([undefined])).toThrow(TypeError);
  });
});
