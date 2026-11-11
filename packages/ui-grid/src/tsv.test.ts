// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { parseTsv, schreibeTsv } from './tsv';

describe('schreibeTsv', () => {
  it('schreibt Zeilen wie Excel: Tab, CRLF, abschließender Zeilenumbruch', () => {
    expect(
      schreibeTsv([
        ['01.0010', 'Bauzaun', '86,500'],
        ['', 'Schalung', ''],
      ]),
    ).toBe('01.0010\tBauzaun\t86,500\r\n\tSchalung\t\r\n');
  });

  it('setzt Zellen mit Tab, Zeilenumbruch oder Anführungszeichen in Excel-Anführung', () => {
    expect(schreibeTsv([['Bewehrung,\nzweilagig', 'mit\tTab', '5" Rohr', 'ohne']])).toBe(
      '"Bewehrung,\nzweilagig"\t"mit\tTab"\t"5"" Rohr"\tohne\r\n',
    );
  });

  it('parseTsv liest zurück, was schreibeTsv geschrieben hat', () => {
    const matrix = [
      ['"zitiert"', 'a\r\nb', ''],
      ['1.234,500', 'm³', 'x\ty'],
    ];
    expect(parseTsv(schreibeTsv(matrix))).toEqual(matrix);
  });

  it('keine Zeilen ergeben leeren Text', () => {
    expect(schreibeTsv([])).toBe('');
  });
});

describe('parseTsv', () => {
  it('zerlegt Tabulatoren und Zeilen; der abschließende Zeilenumbruch erzeugt keine leere Zeile', () => {
    expect(parseTsv('a\tb\nc\td\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseTsv('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('liest zitierte Zellen mit Zeilenumbruch, Tabulator und doppelten Anführungszeichen wie Excel', () => {
    const text = '"Zeile 1\nZeile 2"\t"mit ""Zitat"" und\tTab"\t5,5\n';
    expect(parseTsv(text)).toEqual([['Zeile 1\nZeile 2', 'mit "Zitat" und\tTab', '5,5']]);
  });

  it('behält leere Zellen und leere Zeilen', () => {
    expect(parseTsv('a\t\tc\n\nx\t')).toEqual([['a', '', 'c'], [''], ['x', '']]);
  });

  it('ein Anführungszeichen mitten in einer Zelle ist ein gewöhnliches Zeichen', () => {
    expect(parseTsv('5" Rohr\t2')).toEqual([['5" Rohr', '2']]);
  });

  it('nimmt auch einen unvollständig zitierten Rest mit statt ihn zu verwerfen', () => {
    expect(parseTsv('"offen\nweiter')).toEqual([['offen\nweiter']]);
  });

  it('leerer Text ergibt keine Zeilen', () => {
    expect(parseTsv('')).toEqual([]);
  });
});
