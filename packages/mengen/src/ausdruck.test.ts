// SPDX-License-Identifier: AGPL-3.0-or-later
// Lesen und Formatieren eines Rechenausdrucks (Ticket 35): Fehler mit Spalte, kanonischer Text.

import { describe, expect, it } from 'vitest';
import { ausdruckFormatieren, ausdruckLesen } from './index';
import type { Formelfehlercode } from './index';

function fehlerVon(text: string): { code: Formelfehlercode; spalte: number | null } {
  const e = ausdruckLesen(text);
  if (e.ok) throw new Error(`Fehler erwartet für ${JSON.stringify(text)}`);
  return { code: e.fehler.code, spalte: e.fehler.spalte };
}

function kanonisch(text: string): string {
  const e = ausdruckLesen(text);
  if (!e.ok) throw new Error(`${e.fehler.code} an ${String(e.fehler.spalte)}: ${e.fehler.meldung}`);
  return ausdruckFormatieren(e.wert);
}

describe('ausdruckLesen: Fehler mit Spalte', () => {
  it('Golden aus dem Ticket', () => {
    expect(fehlerVon('2*(3+').code).toBe('klammer-fehlt');
    expect(fehlerVon('1.5')).toEqual({ code: 'punkt-statt-komma', spalte: 1 });
    expect(fehlerVon('2 # 3')).toEqual({ code: 'zeichen-unerwartet', spalte: 2 });
  });

  it('Klammern', () => {
    expect(fehlerVon('2*(3+')).toEqual({ code: 'klammer-fehlt', spalte: 2 });
    expect(fehlerVon('(1+2))')).toEqual({ code: 'klammer-zu-viel', spalte: 5 });
    expect(fehlerVon('()')).toEqual({ code: 'zeichen-unerwartet', spalte: 1 });
    expect(fehlerVon('2(3)')).toEqual({ code: 'zeichen-unerwartet', spalte: 1 });
  });

  it('Zahlen', () => {
    expect(fehlerVon(',5')).toEqual({ code: 'zahl-ungueltig', spalte: 0 });
    expect(fehlerVon('2,')).toEqual({ code: 'zahl-ungueltig', spalte: 1 });
    expect(fehlerVon('1,5,3')).toEqual({ code: 'zahl-ungueltig', spalte: 3 });
    expect(fehlerVon('1 000')).toEqual({ code: 'zeichen-unerwartet', spalte: 2 });
    expect(fehlerVon('3 * 1.000,5')).toEqual({ code: 'punkt-statt-komma', spalte: 5 });
    expect(fehlerVon('.5')).toEqual({ code: 'punkt-statt-komma', spalte: 0 });
  });

  it('leer, unvollständig, zu lang', () => {
    expect(fehlerVon('')).toEqual({ code: 'ausdruck-leer', spalte: null });
    expect(fehlerVon('  \t ')).toEqual({ code: 'ausdruck-leer', spalte: null });
    expect(fehlerVon('2+')).toEqual({ code: 'ausdruck-unvollstaendig', spalte: 2 });
    expect(fehlerVon('2 *  ')).toEqual({ code: 'ausdruck-unvollstaendig', spalte: 5 });
    expect(fehlerVon('1'.repeat(1001)).code).toBe('ausdruck-zu-lang');
    expect(ausdruckLesen(`${'1+'.repeat(499)}11`).ok).toBe(true);
    // Eine Zahl braucht als Dezimalwert „.0“ dazu; mit 1.000 Ziffern ist sie zu lang für `dezimal`.
    expect(fehlerVon('1'.repeat(1000))).toEqual({ code: 'zahl-ungueltig', spalte: 0 });
  });

  it('Schachtelung: 50 Klammern gehen, 51 sind zu tief', () => {
    expect(ausdruckLesen(`${'('.repeat(50)}1${')'.repeat(50)}`).ok).toBe(true);
    expect(fehlerVon(`${'('.repeat(51)}1${')'.repeat(51)}`)).toEqual({ code: 'zu-tief', spalte: 50 });
  });
});

describe('ausdruckFormatieren: kanonischer Text', () => {
  it('Dezimalkomma, * und /, Leerzeichen um + und -, nur nötige Klammern', () => {
    expect(kanonisch('2,5*4+3')).toBe('2,5*4 + 3');
    expect(kanonisch('(1,25+0,75)*3/4')).toBe('(1,25 + 0,75)*3/4');
    expect(kanonisch(' 2 × 3 ÷ 4 : 5 − 1 ')).toBe('2*3/4/5 - 1');
    expect(kanonisch('((2))*((3+4))')).toBe('2*(3 + 4)');
    expect(kanonisch('1-(2-3)')).toBe('1 - (2 - 3)');
    expect(kanonisch('(1-2)-3')).toBe('1 - 2 - 3');
    expect(kanonisch('2/(3*4)')).toBe('2/(3*4)');
    expect(kanonisch('-2,5*1,2')).toBe('-2,5*1,2');
    expect(kanonisch('-(2+3)')).toBe('-(2 + 3)');
    expect(kanonisch('2*-3')).toBe('2*-3');
    expect(kanonisch('1--3')).toBe('1 - -3');
    expect(kanonisch('+-3')).toBe('+-3');
  });

  it('Zahlen normalisiert, Bezüge und Namen unverändert', () => {
    expect(kanonisch('2,50 + 007 + 3,0')).toBe('2,5 + 7 + 3');
    expect(kanonisch('Z3*Länge_1 + z3 + Z03')).toBe('Z3*Länge_1 + z3 + Z3');
    expect(kanonisch('0,000')).toBe('0');
  });
});
