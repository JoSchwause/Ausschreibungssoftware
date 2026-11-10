// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { parseTsv } from './tsv';

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
