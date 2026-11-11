// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Kalkulationsübersicht (Ticket 78, Q1). Regeln: GP je Position = kaufmännisch(Menge × EP, 2) (N2);
// je Kostenart Σ kaufmännisch(Menge × Einzelkosten, 2) und Σ kaufmännisch(Menge × Anteil, 2); Herstellkosten = Σ der
// Einzelkosten aller Kostenarten; Lohnstunden = kaufmännisch(Σ Menge × Lohnstunden je Einheit, 3); Mittellohn =
// kaufmännisch(Σ Menge × Einzelkosten Lohn / Σ Menge × Lohnstunden je Einheit, 3), beides exakt vor der einen Rundung.
// Die Erwartungswerte sind von Hand hergeleitet (Rechnung im Kommentar); Ansätze und Sätze sind erfundene Beispielzahlen.

import { alsEinheitspreis, alsMenge, alsProzent } from '@tethys/dezimal';
import type { Einheitspreis, EpaArt, Menge, PositionId, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kalkulationsuebersichtBerechnen } from './index';
import type { Kalkulationsansatz, Kalkulationsposition } from './index';

function menge(text: string): Menge {
  const e = alsMenge(text);
  if (!e.ok) throw new Error(`Testmenge ungültig: ${text}`);
  return e.wert;
}
function kostensatz(text: string): Einheitspreis {
  const e = alsEinheitspreis(text);
  if (!e.ok) throw new Error(`Testkostensatz ungültig: ${text}`);
  return e.wert;
}
function prozent(text: string): Prozent {
  const e = alsProzent(text);
  if (!e.ok) throw new Error(`Testprozent ungültig: ${text}`);
  return e.wert;
}
function z(art: EpaArt, bezeichnung: string, m: string, k: string): Kalkulationsansatz {
  return { art, bezeichnung, ansatzmenge: menge(m), kostensatz: kostensatz(k) };
}
function p(id: string, m: string, ansaetze: readonly Kalkulationsansatz[]): Kalkulationsposition {
  return { positionId: id as PositionId, menge: menge(m), ansaetze };
}

const SAETZE = { lohn: prozent('28.50'), stoffe: prozent('12.00'), geraete: prozent('15.00') };

/** Mauerwerk wie im Golden-Test der Einzelpreiskalkulation: Anteile 28,045 / 24,063 / 0,713, EP 52,821. */
const MAUERWERK = [
  z('lohn', 'Maurer', '0.450', '48.500'),
  z('stoffe', 'Kalksandstein', '1.050', '18.200'),
  z('stoffe', 'Mörtel', '0.025', '95.000'),
  z('geraete', 'Mischer', '0.050', '12.400'),
];
/** Putz: Lohn 0,300 × 52,000 = 15,600 × 1,285 = 20,046; Stoffe 0,018 × 180,000 = 3,240 × 1,12 = 3,6288 → 3,629. */
const PUTZ = [z('lohn', 'Putzer', '0.300', '52.000'), z('stoffe', 'Putzmörtel', '0.018', '180.000')];

describe('kalkulationsuebersichtBerechnen', () => {
  // p1 Mauerwerk, 120,000 m²: GP 120 × 52,821 = 6.338,52
  //    Einzelkosten × Menge: Lohn 21,825 × 120 = 2.619,00; Stoffe 21,485 × 120 = 2.578,20; Geräte 0,620 × 120 = 74,40
  //    Anteil × Menge:       Lohn 28,045 × 120 = 3.365,40; Stoffe 24,063 × 120 = 2.887,56; Geräte 0,713 × 120 = 85,56
  // p2 Putz, 33,333 m²: EP 20,046 + 3,629 = 23,675; GP 33,333 × 23,675 = 789,158775 → 789,16
  //    Einzelkosten × Menge: Lohn 33,333 × 15,600 = 519,9948 → 519,99; Stoffe 33,333 × 3,240 = 107,99892 → 108,00
  //    Anteil × Menge:       Lohn 33,333 × 20,046 = 668,193318 → 668,19; Stoffe 33,333 × 3,629 = 120,965457 → 120,97
  // p3 ohne Ansatz: kein EP, kein GP
  // Lohn: 2.619,00 + 519,99 = 3.138,99 und 3.365,40 + 668,19 = 4.033,59
  // Stoffe: 2.578,20 + 108,00 = 2.686,20 und 2.887,56 + 120,97 = 3.008,53; Geräte: 74,40 und 85,56
  // Herstellkosten = 3.138,99 + 2.686,20 + 74,40 = 5.899,59; Gesamtsumme = 6.338,52 + 789,16 = 7.127,68
  // Lohnstunden exakt 120 × 0,450 + 33,333 × 0,300 = 54,000 + 9,9999 = 63,9999 → 64,000
  // Mittellohn exakt (120 × 21,825 + 33,333 × 15,600) / 63,9999 = 3.138,9948 / 63,9999 = 49,04687… → 49,047
  it('zwei kalkulierte Positionen und eine ohne Ansatz', () => {
    const r = kalkulationsuebersichtBerechnen(
      [p('p1', '120.000', MAUERWERK), p('p2', '33.333', PUTZ), p('p3', '5.000', [])],
      SAETZE,
    );
    expect(
      r.positionen.map((x) => [x.positionId, x.menge, x.kalkulation.einheitspreis, x.gesamtpreis]),
    ).toEqual([
      ['p1', '120.000', '52.821', '6338.52'],
      ['p2', '33.333', '23.675', '789.16'],
      ['p3', '5.000', null, null],
    ]);
    expect(r.kostenarten).toEqual([
      { art: 'lohn', einzelkosten: '3138.99', anteilsumme: '4033.59' },
      { art: 'stoffe', einzelkosten: '2686.20', anteilsumme: '3008.53' },
      { art: 'geraete', einzelkosten: '74.40', anteilsumme: '85.56' },
    ]);
    expect(r.herstellkosten).toBe('5899.59');
    expect(r.gesamtsumme).toBe('7127.68');
    expect(r.lohnstunden).toBe('64.000');
    expect(r.mittellohn).toBe('49.047');
  });
});
