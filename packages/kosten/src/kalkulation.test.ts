// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Einzelpreiskalkulation (Ticket 78, Q1). Regel (D-39): Einzelkosten einer Zeile = Ansatzmenge ×
// Kostensatz, ungerundet; Anteil je Kostenart = (Σ Einzelkosten) × (1 + Satz/100), kaufmännisch auf 3 Stellen (N3,
// E-07); EP = Σ der gerundeten Anteile. Die Erwartungswerte sind von Hand hergeleitet (Rechnung im Kommentar über jedem
// Fall); Ansätze und Sätze sind erfundene Beispielzahlen.

import { alsEinheitspreis, alsMenge, alsProzent } from '@tethys/dezimal';
import type { Einheitspreis, EpaArt, Menge, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { einzelpreiskalkulationBerechnen } from './index';
import type { Kalkulationsansatz } from './index';

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
/** Ein Kalkulationsansatz aus Klartext; `null` lässt den Wert fehlen. */
function z(art: EpaArt, bezeichnung: string, m: string | null, k: string | null): Kalkulationsansatz {
  return {
    art,
    bezeichnung,
    ansatzmenge: m === null ? null : menge(m),
    kostensatz: k === null ? null : kostensatz(k),
  };
}
/** Ungerundete Zwischenwerte ohne Nullen am Ende vergleichen (die Skala eines Zwischenwerts ist kein Verhalten). */
function ohneNullen(text: string): string {
  return text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '.0');
}

/** Sätze des Beispiels „Mauerwerk“: Lohn 28,50 %, Stoffe 12,00 %, Geräte 15,00 %. */
const SAETZE = { lohn: prozent('28.50'), stoffe: prozent('12.00'), geraete: prozent('15.00') };

describe('einzelpreiskalkulationBerechnen: Rechenweg', () => {
  // Lohn:    0,450 h × 48,500 €/h = 21,825; Zuschlag 21,825 × 0,285 = 6,220125; 21,825 + 6,220125 = 28,045125 → 28,045
  // Stoffe:  1,050 × 18,200 = 19,110; 0,025 × 95,000 = 2,375; Σ 21,485; Zuschlag × 0,12 = 2,5782; 24,0632 → 24,063
  // Geräte:  0,050 × 12,400 = 0,620; Zuschlag × 0,15 = 0,093; 0,713 → 0,713
  // EP = 28,045 + 24,063 + 0,713 = 52,821
  it('Mauerwerk: Anteile je Kostenart, EP als Summe der gerundeten Anteile, Nachweis je Kostenart', () => {
    const r = einzelpreiskalkulationBerechnen(
      [
        z('lohn', 'Maurer', '0.450', '48.500'),
        z('stoffe', 'Kalksandstein', '1.050', '18.200'),
        z('geraete', 'Mischer', '0.050', '12.400'),
        z('stoffe', 'Mörtel', '0.025', '95.000'),
      ],
      SAETZE,
    );
    expect(r.anteile).toEqual({
      lohn: '28.045',
      stoffe: '24.063',
      geraete: '0.713',
      nachunternehmer: null,
      sonstiges: null,
      frei: null,
      freiBezeichnung: null,
    });
    expect(r.einheitspreis).toBe('52.821');
    expect(
      r.kostenarten.map((k) => [
        k.art,
        ohneNullen(k.einzelkosten),
        k.kalkulationszuschlagssatz,
        ohneNullen(k.kalkulationszuschlag),
        k.anteil,
      ]),
    ).toEqual([
      ['lohn', '21.825', '28.50', '6.220125', '28.045'],
      ['stoffe', '21.485', '12.00', '2.5782', '24.063'],
      ['geraete', '0.62', '15.00', '0.093', '0.713'],
    ]);
    expect(r.befunde).toEqual([]);
  });
});
