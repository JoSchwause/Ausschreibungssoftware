// SPDX-License-Identifier: AGPL-3.0-or-later
// Messung ohne Gate (Ticket 04): 100.000 Multiplikationen mit Rundung. Der Wert wird ausgegeben und ins
// Ticket geschrieben; der Test schlägt nur bei einem Rechenfehler fehl, nie wegen der Zeit.

import { describe, expect, it } from 'vitest';
import type { Einheitspreis, Menge } from '@tethys/vertrag';
import { gesamtpreis } from './index';

describe('Leistung (Messung, kein Gate)', () => {
  it('100.000 × gesamtpreis', () => {
    const mengen: Menge[] = [];
    const eps: Einheitspreis[] = [];
    for (let i = 0; i < 1000; i++) {
      mengen.push(`${String(1 + ((i * 37) % 900))}.${String((i * 7919) % 1000).padStart(3, '0')}` as Menge);
      eps.push(`${String(1 + ((i * 53) % 500))}.${String((i * 104729) % 1000).padStart(3, '0')}` as Einheitspreis);
    }
    gesamtpreis(mengen[0]!, eps[0]!); // Warmlauf
    const start = performance.now();
    let letzter = '';
    for (let i = 0; i < 100_000; i++) letzter = gesamtpreis(mengen[i % 1000]!, eps[(i * 7) % 1000]!);
    const ms = performance.now() - start;
    console.log(`dezimal: 100.000 gesamtpreis in ${ms.toFixed(1)} ms`);
    expect(letzter).toMatch(/^\d+\.\d{2}$/);
  });
});
