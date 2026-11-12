// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget (Q4, D-54; Ticket 107, Punkt 4): das 10.000-Bauteile-Modell aus `fixtures/ifc/erzeugen.mjs` lesen und auf
// das Bauwerksmodell abbilden in höchstens 5 s CPU in Node, Median mehrerer Läufe. Gemessen wird die CPU-Zeit des Prozesses,
// nicht die Wanduhr: Neben anderen Läufen schwankt die Wanduhr um ein Mehrfaches (wie `ausgabe`, Ticket 58). Das Budget
// wird nie gelockert; Messwerte stehen im Ticket.

import type { BauwerksmodellId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { erzeugeModell } from '../../../fixtures/ifc/erzeugen.mjs';
import { bauwerksmodellLesen } from './index';
import type { BauwerksmodellLesung } from './index';
import { bytes } from './testhilfen';

const BUDGET_MS = 5000;
const LAEUFE = 3;

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

describe('Leistung (D-54)', () => {
  it(`liest und bildet 10.000 Bauteile in höchstens ${String(BUDGET_MS)} ms CPU ab (Median)`, () => {
    const datei = bytes(erzeugeModell({ bauteile: 10_000, geschosse: 10 }));
    const kopf = {
      id: '0193a1b2-0000-7000-8000-000000000107' as BauwerksmodellId,
      projektId: '0193a1b2-0000-7000-8000-000000000001' as ProjektId,
      name: 'Groß',
      datei: { hash: '0'.repeat(64), dateiname: 'gross.ifc', groesse: datei.length },
      vorgaengerId: null,
      eingelesen: '2026-11-12',
    };
    const werte: number[] = [];
    let lesung: BauwerksmodellLesung | null = null;
    for (let i = 0; i < LAEUFE; i++) {
      const c0 = process.cpuUsage();
      lesung = bauwerksmodellLesen(datei, kopf);
      const c = process.cpuUsage(c0);
      werte.push((c.user + c.system) / 1000);
    }
    expect(lesung?.befunde).toEqual([]);
    expect(lesung?.bauwerksmodell?.bauteile).toHaveLength(10_000);
    expect(lesung?.bauwerksmodell?.struktur.filter((k) => k.art === 'geschoss')).toHaveLength(10);
    expect(
      mitte(werte),
      `CPU-Zeiten in ms: ${werte.map((w) => w.toFixed(0)).join(', ')}`,
    ).toBeLessThanOrEqual(BUDGET_MS);
  }, 180_000);
});
