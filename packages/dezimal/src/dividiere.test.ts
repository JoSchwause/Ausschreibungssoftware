// SPDX-License-Identifier: AGPL-3.0-or-later
// Division (Ticket 35, D-08): exakter Quotient, kaufmännisch gerundet wie `rundeAufStellen` (E-07).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Dezimal } from '@tethys/vertrag';
import { alsDezimal, dividiere, multipliziere, negiere, rundeAufStellen } from './index';

function d(text: string): Dezimal {
  const e = alsDezimal(text);
  if (!e.ok) throw new Error(e.fehler.meldung);
  return e.wert;
}

function wert(e: ReturnType<typeof dividiere>): Dezimal {
  if (!e.ok) throw new Error(`unerwarteter Fehler: ${e.fehler.code}`);
  return e.wert;
}

describe('dividiere: Golden (Handrechnung)', () => {
  it('rundet den exakten Quotienten kaufmännisch', () => {
    // 10 / 3 = 3,3333… → 3 Stellen: vierte Stelle 3 < 5 → 3.333
    expect(wert(dividiere(d('10.0'), d('3.0'), 3))).toBe('3.333');
    // 2 / 3 = 0,6666… → vierte Stelle 6 ≥ 5 → 0.667
    expect(wert(dividiere(d('2.0'), d('3.0'), 3))).toBe('0.667');
    // 1 / 8 = 0,125 → 2 Stellen: dritte Stelle 5 → aufrunden 0.13
    expect(wert(dividiere(d('1.0'), d('8.0'), 2))).toBe('0.13');
    // 7,5 / 2,5 = 3 exakt, aufgefüllt
    expect(wert(dividiere(d('7.5'), d('2.5'), 3))).toBe('3.000');
    // 1 / 3 auf 10 Stellen
    expect(wert(dividiere(d('1.00'), d('3.000'), 10))).toBe('0.3333333333');
  });

  it('Vorzeichen: Betrag runden, Vorzeichen davor (E-07), nie -0', () => {
    // -1 / 8 = -0,125 → |0,125| → 0,13 → -0.13
    expect(wert(dividiere(d('-1.0'), d('8.0'), 2))).toBe('-0.13');
    expect(wert(dividiere(d('1.0'), d('-8.0'), 2))).toBe('-0.13');
    expect(wert(dividiere(d('-1.0'), d('-8.0'), 2))).toBe('0.13');
    // -2 / 3 → -0.667
    expect(wert(dividiere(d('-2.0'), d('3.0'), 3))).toBe('-0.667');
    // -0,0004 / 1 → |0,0004| → 0,000 → kein Vorzeichen
    expect(wert(dividiere(d('-0.0004'), d('1.0'), 3))).toBe('0.000');
    expect(wert(dividiere(d('0.0'), d('-3.0'), 2))).toBe('0.00');
  });

  it('Division durch null ist ein Fehlerwert', () => {
    const e = dividiere(d('1.0'), d('0.000'), 3);
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe('division-durch-null');
    expect(dividiere(d('0.0'), d('0.0'), 3).ok).toBe(false);
  });

  it('ungültige Stellenzahl ist ein Programmfehler wie bei rundeAufStellen', () => {
    expect(() => dividiere(d('1.0'), d('2.0'), 0)).toThrow(RangeError);
    expect(() => dividiere(d('1.0'), d('2.0'), 1.5)).toThrow(RangeError);
  });
});

const wertGen = fc
  .tuple(fc.bigInt({ min: -(10n ** 18n), max: 10n ** 18n }), fc.integer({ min: 1, max: 8 }))
  .map(([g, s]) => {
    const neg = g < 0n;
    const z = (neg ? -g : g).toString().padStart(s + 1, '0');
    return d(`${neg ? '-' : ''}${z.slice(0, z.length - s)}.${z.slice(z.length - s)}`);
  });
const nichtNullGen = wertGen.filter((w) => !/^-?0\.0+$/.test(w));
const stellenGen = fc.integer({ min: 1, max: 12 });
const runs = { numRuns: 500 };

describe('dividiere: Eigenschaften', () => {
  it('dividiere(a × b, b, s) = rundeAufStellen(a, s) für b ≠ 0', () => {
    fc.assert(
      fc.property(wertGen, nichtNullGen, stellenGen, (a, b, s) => {
        expect(wert(dividiere(multipliziere(a, b), b, s))).toBe(rundeAufStellen(a, s));
      }),
      runs,
    );
  });

  it('Vorzeichenregel: -a / b = a / -b = -(a / b), nie -0', () => {
    fc.assert(
      fc.property(wertGen, nichtNullGen, stellenGen, (a, b, s) => {
        const q = wert(dividiere(a, b, s));
        expect(wert(dividiere(negiere(a), b, s))).toBe(negiere(q));
        expect(wert(dividiere(a, negiere(b), s))).toBe(negiere(q));
        expect(/^-0\.0+$/.test(q)).toBe(false);
      }),
      runs,
    );
  });
});
