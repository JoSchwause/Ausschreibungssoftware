// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenansatz rechnen (Ticket 35). Jede goldene Zahl ist von Hand aus Arithmetik und kaufmännischer Rundung
// (N2, E-07) hergeleitet; die Herleitung steht neben dem Wert (C4).

import { describe, expect, it } from 'vitest';
import { FORMELN, MENGEN_ANNAHMEN, mengenansatzBerechnen } from './index';
import type { Ansatzzeile, Formelfehlercode } from './index';

const zeile = (nr: number, ausdruck: string, variable: string | null = null, formel = 91): Ansatzzeile => ({
  zeile: nr,
  formel,
  ausdruck,
  variable,
});

/** Ergebnis einer einzelnen Ansatzzeile mit Formel 91. */
function menge(ausdruck: string): string | null {
  const e = mengenansatzBerechnen([zeile(1, ausdruck)]);
  const z = e.zeilen[0];
  if (z?.fehler) throw new Error(`${z.fehler.code} an ${String(z.fehler.spalte)}: ${z.fehler.meldung}`);
  return z?.menge ?? null;
}

function fehler(ausdruck: string): Formelfehlercode | undefined {
  return mengenansatzBerechnen([zeile(1, ausdruck)]).zeilen[0]?.fehler?.code;
}

describe('Golden: freier Rechenansatz (Formel 91)', () => {
  it('Werte aus dem Ticket', () => {
    // 2,5 × 4 = 10; + 3 = 13
    expect(menge('2,5*4+3')).toBe('13.000');
    // 1,25 + 0,75 = 2; × 3 = 6; / 4 = 1,5
    expect(menge('(1,25+0,75)*3/4')).toBe('1.500');
    // 10 / 3 = 3,3333333333 (10 Zwischenstellen) → 3 Stellen: vierte Stelle 3 → 3,333
    expect(menge('10/3')).toBe('3.333');
    // 2 / 3 = 0,6666666667 (zehnte Stelle aufgerundet) → vierte Stelle 6 → 0,667
    expect(menge('2/3')).toBe('0.667');
    // 10 / 3 = 3,3333333333; × 3 = 9,9999999999 → vierte Stelle 9 → 10,000
    expect(menge('10/3*3')).toBe('10.000');
    // -2,5 × 1,2 = -3
    expect(menge('-2,5*1,2')).toBe('-3.000');
    // 0,0005 → vierte Stelle 5 → 0,001; negativ: Betrag runden, Vorzeichen davor (E-07)
    expect(menge('0,0005')).toBe('0.001');
    expect(menge('-0,0005')).toBe('-0.001');
    expect(fehler('1/0')).toBe('division-durch-null');
  });

  it('weitere Handrechnungen', () => {
    // Punkt vor Strich: 2 + 3 × 4 = 14; links-assoziativ: 8 - 3 - 2 = 3, 8 / 4 / 2 = 1
    expect(menge('2+3*4')).toBe('14.000');
    expect(menge('8-3-2')).toBe('3.000');
    expect(menge('8/4/2')).toBe('1.000');
    // Ersatzzeichen: 6 × 2 ÷ 4 : 3 − 1 = 0
    expect(menge('6×2÷4:3−1')).toBe('0.000');
    // -0,0004 → 0,000 ohne Vorzeichen
    expect(menge('-0,0004')).toBe('0.000');
    // 1 / (2 - 2): Teiler null mitten im Ausdruck, Spalte des Operators
    const e = mengenansatzBerechnen([zeile(1, '3 + 1/(2-2)')]);
    expect(e.zeilen[0]?.fehler).toMatchObject({ code: 'division-durch-null', spalte: 5 });
  });
});

describe('Mengenansatz: Zeilen, Bezüge, Summe', () => {
  it('Golden aus dem Ticket', () => {
    // Zeile 1: 3,5 × 2 = 7; Zeile 2: 7 × 0,5 = 3,5; Summe 10,5
    const e = mengenansatzBerechnen([zeile(1, '3,5*2'), zeile(2, 'Z1*0,5')]);
    expect(e.zeilen).toEqual([
      { zeile: 1, menge: '7.000', fehler: null },
      { zeile: 2, menge: '3.500', fehler: null },
    ]);
    expect(e.summe).toBe('10.500');

    const v = mengenansatzBerechnen([zeile(1, '3,5*2'), zeile(2, 'Z3*0,5'), zeile(3, '1')]);
    expect(v.zeilen[1]?.fehler).toMatchObject({ code: 'bezug-vorwaerts', spalte: 0 });
    expect(v.zeilen[1]?.menge).toBeNull();
    expect(v.summe).toBeNull();
  });

  it('Bezug auf das gerundete Zeilenergebnis', () => {
    // Zeile 1: 2/3 → 0,667; Zeile 2: 0,667 × 3 = 2,001 (nicht 2,000)
    const e = mengenansatzBerechnen([zeile(1, '2/3'), zeile(2, 'Z1*3')]);
    expect(e.zeilen[1]?.menge).toBe('2.001');
    // Summe der gerundeten Zeilen: 0,667 + 2,001 = 2,668
    expect(e.summe).toBe('2.668');
  });

  it('Bezugsfehler', () => {
    const codes = (zeilen: Ansatzzeile[]) =>
      mengenansatzBerechnen(zeilen).zeilen.map((z) => z.fehler?.code ?? null);
    expect(codes([zeile(1, 'Z1+1')])).toEqual(['bezug-vorwaerts']);
    expect(codes([zeile(1, '2'), zeile(2, 'Z7')])).toEqual([null, 'bezug-unbekannt']);
    expect(codes([zeile(1, '1/0'), zeile(2, 'Z1*2')])).toEqual(['division-durch-null', 'bezug-fehlerhaft']);
    // Früher heißt weiter vorn in der Folge, nicht kleinere Nummer
    expect(codes([zeile(5, '2'), zeile(3, 'Z5*2')])).toEqual([null, null]);
    expect(codes([zeile(1, '2'), zeile(1, '3')])).toEqual([null, 'zeile-doppelt']);
  });

  it('Variablen', () => {
    // Länge 2,5; Breite 4; Fläche 2,5 × 4 = 10; Summe 2,5 + 4 + 10 = 16,5
    const e = mengenansatzBerechnen([zeile(1, '2,5', 'Länge'), zeile(2, '4', 'b_2'), zeile(3, 'Länge*b_2')]);
    expect(e.zeilen.map((z) => z.menge)).toEqual(['2.500', '4.000', '10.000']);
    expect(e.summe).toBe('16.500');

    const codes = (zeilen: Ansatzzeile[]) =>
      mengenansatzBerechnen(zeilen).zeilen.map((z) => z.fehler?.code ?? null);
    expect(codes([zeile(1, '1', 'a'), zeile(2, '2', 'a')])).toEqual([null, 'variable-doppelt']);
    expect(codes([zeile(1, 'a'), zeile(2, '2', 'a')])).toEqual(['bezug-vorwaerts', null]);
    expect(codes([zeile(1, 'x')])).toEqual(['bezug-unbekannt']);
    expect(codes([zeile(1, '1/0', 'a'), zeile(2, 'a')])).toEqual(['division-durch-null', 'bezug-fehlerhaft']);
    // Groß/Klein zählt
    expect(codes([zeile(1, '1', 'a'), zeile(2, 'A')])).toEqual([null, 'bezug-unbekannt']);
    for (const name of ['Z3', 'Z03', '1a', '', 'a-b', 'a b', '_a']) {
      expect(codes([zeile(1, '1', name)])).toEqual(['variable-ungueltig']);
    }
    for (const name of ['Z', 'z3', 'Z3a', 'x_1', 'Höhe']) {
      expect(codes([zeile(1, '1', name)])).toEqual([null]);
    }
  });

  it('Fehler im Ausdruck: Zeile ohne Menge, Summe ungültig, keine Zeile still übergangen', () => {
    const e = mengenansatzBerechnen([zeile(1, '2'), zeile(2, '2 # 3'), zeile(3, '4')]);
    expect(e.zeilen.map((z) => z.menge)).toEqual(['2.000', null, '4.000']);
    expect(e.zeilen[1]?.fehler).toMatchObject({ code: 'zeichen-unerwartet', spalte: 2 });
    expect(e.summe).toBeNull();
  });

  it('leerer Mengenansatz hat die Summe 0', () => {
    expect(mengenansatzBerechnen([])).toEqual({ zeilen: [], summe: '0.000' });
  });
});

describe('Formeln', () => {
  it('nur 91 ist umgesetzt; andere Nummern sind unbekannt', () => {
    expect([...FORMELN.keys()]).toEqual([91]);
    const e = mengenansatzBerechnen([zeile(1, '2', null, 92)]);
    expect(e.zeilen[0]).toMatchObject({ menge: null, fehler: { code: 'formel-unbekannt', spalte: null } });
    expect(e.summe).toBeNull();
  });

  it('MENGEN_ANNAHMEN ist als vorläufig gekennzeichnet', () => {
    expect(MENGEN_ANNAHMEN.status).toBe('vorläufige Annahme, Entscheidung offen');
  });
});
