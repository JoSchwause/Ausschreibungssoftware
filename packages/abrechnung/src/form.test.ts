// SPDX-License-Identifier: AGPL-3.0-or-later
import { KALENDERDATUM_MUSTER } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { datumFehler, tageImMonat } from './form';
import { plusKalendertage } from './zahlungsstand';

describe('Kalender des Pakets (ein Kalender für Formprüfung und Fristende)', () => {
  it('tageImMonat kennt Schaltjahre nach dem gregorianischen Kalender', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => tageImMonat(2025, m))).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect([2024, 2000, 1900, 2100].map((j) => tageImMonat(j, 2))).toEqual([29, 29, 28, 28]);
    expect(tageImMonat(2025, 13)).toBe(0);
  });

  it('datumFehler prüft die Form nach KALENDERDATUM_MUSTER und den Tag im Kalender', () => {
    expect(datumFehler(null)).toBeNull();
    expect(datumFehler('2024-02-29')).toBeNull();
    expect(datumFehler('2025-02-29')).toBe('Den Tag 2025-02-29 gibt es im Kalender nicht.');
    expect(datumFehler('2025-13-01')).toBe('Den Tag 2025-13-01 gibt es im Kalender nicht.');
    expect(datumFehler('2025-04-00')).toBe('Den Tag 2025-04-00 gibt es im Kalender nicht.');
    for (const falsch of ['2025-1-01', ' 2025-01-01', '2025-01-01T00:00', 20250101, undefined]) {
      expect(typeof falsch === 'string' && KALENDERDATUM_MUSTER.test(falsch)).toBe(false);
      expect(datumFehler(falsch)).toMatch(/^Das Datum muss null oder JJJJ-MM-TT sein/);
    }
  });

  it('plusKalendertage zählt über Monats- und Jahresgrenzen mit demselben Kalender', () => {
    expect(plusKalendertage('2024-02-28', 1)).toBe('2024-02-29');
    expect(plusKalendertage('2025-02-28', 1)).toBe('2025-03-01');
    expect(plusKalendertage('2025-12-31', 1)).toBe('2026-01-01');
    expect(plusKalendertage('2025-02-29', 1)).toBeNull();
  });
});
