// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 63: Eingabe der Schwellen des Preisspiegels (G-26) in de-DE; eine falsche Eingabe meldet, sperrt nie (U5).

import { describe, expect, it } from 'vitest';
import { schwelleLesen } from './einstellungen';

describe('schwelleLesen', () => {
  it('liest de-DE-Prozent auf zwei Stellen', () => {
    expect(schwelleLesen('20')).toEqual({ ok: true, wert: '20.00' });
    expect(schwelleLesen(' 12,5 ')).toEqual({ ok: true, wert: '12.50' });
    expect(schwelleLesen('100')).toEqual({ ok: true, wert: '100.00' });
    expect(schwelleLesen('100')).toEqual({ ok: true, wert: '100.00' });
  });

  it('meldet Unlesbares, zu viele Stellen, negative Werte und Werte über 100 (Ticket 149: auch die Ausreißer-Schwelle)', () => {
    expect(schwelleLesen('zwanzig')).toEqual({
      ok: false,
      fehler: 'Bitte eine Zahl wie 20 oder 12,5 eingeben.',
    });
    expect(schwelleLesen('').ok).toBe(false);
    expect(schwelleLesen('1,234')).toEqual({
      ok: false,
      fehler: 'Höchstens zwei Nachkommastellen.',
    });
    expect(schwelleLesen('-5')).toEqual({
      ok: false,
      fehler: 'Der Wert darf nicht negativ sein.',
    });
    expect(schwelleLesen('100,01')).toEqual({
      ok: false,
      fehler: 'Der Wert darf höchstens 100 sein.',
    });
    expect(schwelleLesen('250')).toEqual({
      ok: false,
      fehler: 'Der Wert darf höchstens 100 sein.',
    });
  });
});
