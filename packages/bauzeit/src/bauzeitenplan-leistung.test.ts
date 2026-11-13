// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget als Test (Q4, Ticket 102): 1.000 Vorgänge mit 2.000 Anordnungsbeziehungen in höchstens 100 ms CPU-Zeit.
// Gemessen wird die CPU-Zeit des Prozesses, nicht die Wanduhr (parallele Läufe teilen sich die Kerne), warm, als Median
// von fünf Läufen. Der Plan entsteht deterministisch (linearer Kongruenzgenerator im Test); das Budget wird nie gelockert.

import { describe, expect, it } from 'vitest';
import type { Anordnungsbeziehung, Bauzeitenplaneingabe, Anordnungsart, Vorgang, VorgangId } from './index';
import { STANDARD_ARBEITSTAGE, bauzeitenplanBerechnen } from './index';

const ARTEN: readonly Anordnungsart[] = ['ende-anfang', 'anfang-anfang', 'ende-ende', 'anfang-ende'];
const vid = (id: string): VorgangId => id as VorgangId;

/** 20 Sammelvorgänge mit je 49 Kindern (980 Blätter) und genau 2.000 Beziehungen zwischen den Blättern. */
function grosserPlan(): Bauzeitenplaneingabe {
  let zustand = 12_345;
  const zufall = (grenze: number): number => {
    zustand = (zustand * 1_103_515_245 + 12_345) % 2_147_483_648;
    return zustand % grenze;
  };
  const blaetter = 980;
  const beziehungen: Anordnungsbeziehung[][] = Array.from({ length: blaetter }, () => []);
  for (let i = 1; i < blaetter; i++)
    beziehungen[i]?.push({ vorgaengerId: vid(`v${String(i - 1)}`), art: 'ende-anfang', abstand: 0 });
  for (let k = 0; k < 2000 - (blaetter - 1); k++) {
    const nach = 1 + zufall(blaetter - 1);
    beziehungen[nach]?.push({
      vorgaengerId: vid(`v${String(zufall(nach))}`),
      art: ARTEN[zufall(4)] ?? 'ende-anfang',
      abstand: zufall(6) - 2,
    });
  }
  const sammel: Vorgang[] = Array.from({ length: 20 }, (_, s) => ({
    id: vid(`s${String(s)}`),
    nummer: null,
    bezeichnung: `Abschnitt ${String(s)}`,
    elternId: null,
    dauer: 0,
    vorgaenger: [],
    fruehesterBeginn: null,
    bezug: null,
    ist: null,
  }));
  const vorgaenge: Vorgang[] = Array.from({ length: blaetter }, (_, i) => ({
    id: vid(`v${String(i)}`),
    nummer: null,
    bezeichnung: `Vorgang ${String(i)}`,
    elternId: vid(`s${String(Math.floor(i / 49))}`),
    dauer: (i * 7 + 3) % 11,
    vorgaenger: beziehungen[i] ?? [],
    fruehesterBeginn: i % 97 === 0 ? '2027-03-01' : null,
    bezug: null,
    ist: null,
  }));
  return {
    projektbeginn: '2027-01-04',
    kalender: {
      arbeitstage: STANDARD_ARBEITSTAGE,
      bundesland: 'BY',
      freieTage: ['2027-12-24', '2027-12-31', '2028-12-24', '2028-12-31', '2029-12-24', '2029-12-31'],
    },
    vorgaenge: [...sammel, ...vorgaenge],
  };
}

describe('Leistungsbudget Terminrechnung (Q4)', () => {
  it('1.000 Vorgänge mit 2.000 Beziehungen in höchstens 100 ms CPU-Zeit', () => {
    const plan = grosserPlan();
    expect(plan.vorgaenge).toHaveLength(1000);
    expect(plan.vorgaenge.reduce((n, v) => n + v.vorgaenger.length, 0)).toBe(2000);

    bauzeitenplanBerechnen(plan); // Aufwärmen
    const messungen: number[] = [];
    let ergebnis = bauzeitenplanBerechnen(plan);
    for (let lauf = 0; lauf < 5; lauf++) {
      const c0 = process.cpuUsage();
      ergebnis = bauzeitenplanBerechnen(plan);
      const c = process.cpuUsage(c0);
      messungen.push((c.user + c.system) / 1000);
    }
    const median = [...messungen].sort((x, y) => x - y)[2] ?? Infinity;
    console.log(
      `bauzeit: 1.000 Vorgänge, 2.000 Beziehungen: Median ${median.toFixed(1)} ms CPU (${messungen.map((m) => m.toFixed(1)).join(', ')})`,
    );
    expect(median).toBeLessThanOrEqual(100);

    expect(ergebnis.befunde).toEqual([]);
    expect(ergebnis.vorgaenge.every((v) => v.termine !== null)).toBe(true);
    expect(ergebnis.kritischeWege.length).toBeGreaterThan(0);
  });
});
