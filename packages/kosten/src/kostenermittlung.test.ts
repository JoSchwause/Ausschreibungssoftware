// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Kostenermittlung (Ticket 55, Q1). Regel (D-24): Summe einer Gruppe = eigener Betrag + Summen der
// Kinder; Gesamtsumme = Summe der Ebene-1-Gruppen. Die Erwartungswerte sind von Hand hergeleitet (Rechnung im
// Kommentar über jedem Fall). Nummern sind beliebige Ziffernfolgen der Form, keine Gruppen der Norm (G-16).

import { describe, expect, it } from 'vitest';
import { kgLesen, kostenermittlungBerechnen } from './index';
import type { Kostenermittlungseintrag, Kostengruppennummer } from './index';

function kg(text: string): Kostengruppennummer {
  const e = kgLesen(text);
  if (!e.ok) throw new Error(`Testnummer ungültig: ${text}`);
  return e.wert;
}

/** Eintrag aus Klartext; der Betrag ist ungeprüfter Text (S11), damit auch Fehleingaben testbar sind. */
function e(nummer: string, betrag: string, bemerkung?: string): Kostenermittlungseintrag {
  return bemerkung === undefined
    ? { nummer: nummer as Kostengruppennummer, betrag }
    : { nummer: nummer as Kostengruppennummer, betrag, bemerkung };
}

describe('kostenermittlungBerechnen: Summen', () => {
  it('leere Ermittlung: keine Gruppen, Gesamtsumme 0.00', () => {
    expect(kostenermittlungBerechnen([])).toEqual({ gruppen: [], gesamtsumme: '0.00', befunde: [] });
  });

  // 220 = 221 + 222 = 250.50 + 49.50 = 300.00
  // 200 = 210 + 220 = 1000.00 + 300.00 = 1300.00
  // 410 = 412 = 0.01; 400 = 410 = 0.01
  // gesamt = 200 + 300 + 400 = 1300.00 + 10.00 + 0.01 = 1310.01
  it('summiert über Ebenen und legt fehlende Vorfahren an', () => {
    const r = kostenermittlungBerechnen([
      e('412', '0.01'),
      e('221', '250.50', 'Angebot Gruppe B'),
      e('300', '10.00'),
      e('210', '1000.00'),
      e('222', '49.50'),
    ]);
    expect(r.gruppen).toEqual([
      { nummer: '200', ebene: 1, eigenerBetrag: null, summe: '1300.00' },
      { nummer: '210', ebene: 2, eigenerBetrag: '1000.00', summe: '1000.00' },
      { nummer: '220', ebene: 2, eigenerBetrag: null, summe: '300.00' },
      { nummer: '221', ebene: 3, eigenerBetrag: '250.50', summe: '250.50' },
      { nummer: '222', ebene: 3, eigenerBetrag: '49.50', summe: '49.50' },
      { nummer: '300', ebene: 1, eigenerBetrag: '10.00', summe: '10.00' },
      { nummer: '400', ebene: 1, eigenerBetrag: null, summe: '0.01' },
      { nummer: '410', ebene: 2, eigenerBetrag: null, summe: '0.01' },
      { nummer: '412', ebene: 3, eigenerBetrag: '0.01', summe: '0.01' },
    ]);
    expect(r.gesamtsumme).toBe('1310.01');
    expect(r.befunde).toEqual([]);
  });

  // 707 hängt direkt unter 700 (Ebene 3 mit Elternteil 700, siehe kgElternteil): 700 = 707 = 3.33
  it('Ebene 3 mit mittlerer Ziffer 0 hängt unter der Ebene-1-Gruppe', () => {
    const r = kostenermittlungBerechnen([e('707', '3.33')]);
    expect(r.gruppen).toEqual([
      { nummer: '700', ebene: 1, eigenerBetrag: null, summe: '3.33' },
      { nummer: '707', ebene: 3, eigenerBetrag: '3.33', summe: '3.33' },
    ]);
    expect(r.gesamtsumme).toBe('3.33');
  });
});

describe('kostenermittlungBerechnen: Befunde, nie Sperre (U5)', () => {
  // 511 = 5.00; 510 = 20.00 + 5.00 = 25.00; 500 = 100.00 + 25.00 = 125.00; gesamt 125.00
  it('eigener Betrag neben Kinderbeträgen: wird mitgezählt, Befund je betroffener Gruppe', () => {
    const r = kostenermittlungBerechnen([e('500', '100.00'), e('510', '20.00'), e('511', '5.00')]);
    expect(r.gruppen).toEqual([
      { nummer: '500', ebene: 1, eigenerBetrag: '100.00', summe: '125.00' },
      { nummer: '510', ebene: 2, eigenerBetrag: '20.00', summe: '25.00' },
      { nummer: '511', ebene: 3, eigenerBetrag: '5.00', summe: '5.00' },
    ]);
    expect(r.gesamtsumme).toBe('125.00');
    expect(r.befunde.map((b) => [b.code, b.nummer, b.eintrag])).toEqual([
      ['eigener-betrag-und-kinder', '500', null],
      ['eigener-betrag-und-kinder', '510', null],
    ]);
  });

  // 610 = 10.00 + 2.50 = 12.50; 620 = −3.00; 600 = 12.50 − 3.00 = 9.50
  it('doppelte Nummer wird addiert, negativer Betrag zählt; beides als Befund', () => {
    const r = kostenermittlungBerechnen([e('610', '10.00'), e('620', '-3.00'), e('610', '2.50')]);
    expect(r.gruppen).toEqual([
      { nummer: '600', ebene: 1, eigenerBetrag: null, summe: '9.50' },
      { nummer: '610', ebene: 2, eigenerBetrag: '12.50', summe: '12.50' },
      { nummer: '620', ebene: 2, eigenerBetrag: '-3.00', summe: '-3.00' },
    ]);
    expect(r.gesamtsumme).toBe('9.50');
    expect(r.befunde.map((b) => [b.code, b.nummer, b.eintrag])).toEqual([
      ['betrag-negativ', '620', 1],
      ['nummer-doppelt', '610', 2],
    ]);
  });

  // 12.345 → 12.35 (half-up), 7.5 → 7.50 (aufgefüllt), −0.005 → −0.01 (Betrag runden, Vorzeichen davor, E-07)
  // 810 = 12.35; 820 = 7.50; 830 = −0.01; 800 = 12.35 + 7.50 − 0.01 = 19.84
  it('nicht kanonischer Betrag wird kaufmännisch auf 2 Stellen gebracht, mit Befund', () => {
    const r = kostenermittlungBerechnen([e('810', '12.345'), e('820', '7.5'), e('830', '-0.005')]);
    expect(r.gruppen.find((g) => g.nummer === kg('800'))?.summe).toBe('19.84');
    expect(r.gruppen.find((g) => g.nummer === kg('810'))?.eigenerBetrag).toBe('12.35');
    expect(r.gruppen.find((g) => g.nummer === kg('820'))?.eigenerBetrag).toBe('7.50');
    expect(r.gesamtsumme).toBe('19.84');
    expect(r.befunde.map((b) => [b.code, b.eintrag])).toEqual([
      ['betrag-nicht-kanonisch', 0],
      ['betrag-nicht-kanonisch', 1],
      ['betrag-nicht-kanonisch', 2],
      ['betrag-negativ', 2],
    ]);
  });

  // Nur 910 = 1.00 zählt; 900 = 1.00
  it('ungültige Nummer oder unlesbarer Betrag: Eintrag zählt nicht, Befund', () => {
    const r = kostenermittlungBerechnen([
      e('050', '5.00'),
      e('910', '1,00'),
      e('910', '1.00'),
      e('9100', '2.00'),
    ]);
    expect(r.gruppen).toEqual([
      { nummer: '900', ebene: 1, eigenerBetrag: null, summe: '1.00' },
      { nummer: '910', ebene: 2, eigenerBetrag: '1.00', summe: '1.00' },
    ]);
    expect(r.gesamtsumme).toBe('1.00');
    expect(r.befunde.map((b) => [b.code, b.nummer, b.eintrag])).toEqual([
      ['nummer-ungueltig', null, 0],
      ['betrag-ungueltig', '910', 1],
      ['nummer-ungueltig', null, 3],
    ]);
  });
});
