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

  // Frei: 1,000 × 7,250 = 7,250 (0 %) = EP; die Bezeichnung des freien Anteils kommt vom Aufrufer
  it('übernimmt die Bezeichnung des freien Anteils in die Einheitspreisanteile', () => {
    const r = einzelpreiskalkulationBerechnen([z('frei', 'Container', '1.000', '7.250')], SAETZE, 'Entsorgung');
    expect(r.anteile.frei).toBe('7.250');
    expect(r.anteile.freiBezeichnung).toBe('Entsorgung');
    expect(r.einheitspreis).toBe('7.250');
  });

  // Nachunternehmer ohne Satz (0 %): 0,500 × 4,157 = 2,0785 → kaufmännisch 2,079 (halbe Einheit aufwärts; nicht 2,078)
  it('rundet den Anteil kaufmännisch auf 3 Stellen', () => {
    const r = einzelpreiskalkulationBerechnen([z('nachunternehmer', 'Abbruch', '0.500', '4.157')], SAETZE);
    expect(r.anteile.nachunternehmer).toBe('2.079');
    expect(r.einheitspreis).toBe('2.079');
    expect(r.kostenarten.map((k) => [ohneNullen(k.einzelkosten), k.kalkulationszuschlagssatz])).toEqual([
      ['2.0785', '0.00'],
    ]);
  });
});

describe('einzelpreiskalkulationBerechnen: Befunde, nie Sperre (U5)', () => {
  // Zeile 0 (Lohn) ohne Ansatzmenge und Zeile 1 (Stoffe) ohne Kostensatz zählen nicht: Lohn und Stoffe bleiben leer.
  // Geräte: 2,000 × 3,500 = 7,000; Zuschlag 15 % = 1,050; Anteil 8,050 = EP
  it('Zeile ohne Ansatzmenge oder Kostensatz zählt nicht; eine Kostenart ohne zählende Zeile hat keinen Anteil', () => {
    const r = einzelpreiskalkulationBerechnen(
      [
        z('lohn', 'Maurer', null, '48.500'),
        z('stoffe', 'Stein', '1.000', null),
        z('geraete', 'Kran', '2.000', '3.500'),
        z('sonstiges', 'leer', null, null),
      ],
      SAETZE,
    );
    expect(r.anteile.lohn).toBeNull();
    expect(r.anteile.stoffe).toBeNull();
    expect(r.anteile.sonstiges).toBeNull();
    expect(r.anteile.geraete).toBe('8.050');
    expect(r.einheitspreis).toBe('8.050');
    expect(r.kostenarten.map((k) => k.art)).toEqual(['geraete']);
    expect(r.befunde.map((b) => [b.code, b.feld, b.zeile, b.art])).toEqual([
      ['wert-fehlt', 'ansatzmenge', 0, 'lohn'],
      ['wert-fehlt', 'kostensatz', 1, 'stoffe'],
      ['wert-fehlt', 'ansatzmenge', 3, 'sonstiges'],
      ['wert-fehlt', 'kostensatz', 3, 'sonstiges'],
    ]);
  });

  // Lohn: 1,000 × 10,000 = 10,000; × (1 + 0,285) = 12,850
  // Sonstiges (kein Satz, 0 %): 0,010 × −0,050 = −0,0005 → Betrag 0,0005 kaufmännisch 0,001, Vorzeichen davor: −0,001 (E-07)
  // EP = 12,850 − 0,001 = 12,849
  it('negativer Kostensatz zählt mit, wird kaufmännisch gerundet und gemeldet', () => {
    const r = einzelpreiskalkulationBerechnen(
      [z('lohn', 'Maurer', '1.000', '10.000'), z('sonstiges', 'Gutschrift', '0.010', '-0.050')],
      SAETZE,
    );
    expect(r.anteile.lohn).toBe('12.850');
    expect(r.anteile.sonstiges).toBe('-0.001');
    expect(r.einheitspreis).toBe('12.849');
    expect(r.befunde.map((b) => [b.code, b.feld, b.zeile, b.art])).toEqual([
      ['wert-negativ', 'kostensatz', 1, 'sonstiges'],
      ['wert-negativ', 'anteil', null, 'sonstiges'],
    ]);
  });

  // Stoffe: −1,000 × 2,000 = −2,000; × (1 + 0,12) = −2,240 = EP
  it('negative Ansatzmenge: Zeile, Anteil und EP werden gemeldet', () => {
    const r = einzelpreiskalkulationBerechnen([z('stoffe', 'Rücknahme', '-1.000', '2.000')], SAETZE);
    expect(r.einheitspreis).toBe('-2.240');
    expect(r.befunde.map((b) => [b.code, b.feld, b.zeile, b.art])).toEqual([
      ['wert-negativ', 'ansatzmenge', 0, 'stoffe'],
      ['wert-negativ', 'anteil', null, 'stoffe'],
      ['wert-negativ', 'einheitspreis', null, null],
    ]);
  });

  // Lohn:   1,000 × 10,000 = 10,000; Satz −150 %: Zuschlag −15,000; Anteil 10,000 − 15,000 = −5,000
  // Stoffe: 2,000 × 3,000 = 6,000; Satz −100 %: Zuschlag −6,000; Anteil 0,000 (genau −100 % ist kein Befund)
  // Geräte: Satz −200 %, aber keine Zeile: kein Anteil, kein Befund
  // EP = −5,000 + 0,000 = −5,000
  it('Satz unter −100 % kehrt das Vorzeichen um: Befund an der Kostenart, gerechnet wird trotzdem', () => {
    const r = einzelpreiskalkulationBerechnen(
      [z('lohn', 'Maurer', '1.000', '10.000'), z('stoffe', 'Stein', '2.000', '3.000')],
      { lohn: prozent('-150.00'), stoffe: prozent('-100.00'), geraete: prozent('-200.00') },
    );
    expect(r.anteile.lohn).toBe('-5.000');
    expect(r.anteile.stoffe).toBe('0.000');
    expect(r.anteile.geraete).toBeNull();
    expect(r.einheitspreis).toBe('-5.000');
    expect(r.kostenarten.map((k) => [k.art, ohneNullen(k.kalkulationszuschlag)])).toEqual([
      ['lohn', '-15.0'],
      ['stoffe', '-6.0'],
    ]);
    expect(r.befunde.map((b) => [b.code, b.feld, b.zeile, b.art])).toEqual([
      ['kalkulationszuschlagssatz-unter-minus-100', 'kalkulationszuschlagssatz', null, 'lohn'],
      ['wert-negativ', 'anteil', null, 'lohn'],
      ['wert-negativ', 'einheitspreis', null, null],
    ]);
  });

  it('keine Zeile: alle Anteile leer, kein EP, keine Befunde', () => {
    const r = einzelpreiskalkulationBerechnen([], SAETZE);
    expect(r).toEqual({
      anteile: {
        lohn: null,
        stoffe: null,
        geraete: null,
        nachunternehmer: null,
        sonstiges: null,
        frei: null,
        freiBezeichnung: null,
      },
      einheitspreis: null,
      kostenarten: [],
      befunde: [],
    });
  });
});
