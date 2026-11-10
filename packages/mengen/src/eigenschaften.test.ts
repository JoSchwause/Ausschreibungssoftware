// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests des Mengenansatzes (Ticket 35, Q1). Die Orakel rechnen unabhängig von der Implementierung:
// Zahlentext und Erwartungswert entstehen im Test selbst, ganzzahlig über `bigint`.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Dezimal } from '@tethys/vertrag';
import { ausdruckFormatieren, ausdruckLesen, mengenansatzBerechnen } from './index';
import type { Ausdruck } from './index';

const runs = { numRuns: 300 };

/** Syntaxbaum ohne Spalten: die Spalten hängen am Text, nicht an der Bedeutung. */
function ohneSpalten(a: Ausdruck): unknown {
  switch (a.art) {
    case 'zahl':
      return { art: a.art, wert: a.wert };
    case 'bezug':
      return { art: a.art, zeile: a.zeile };
    case 'name':
      return { art: a.art, name: a.name };
    case 'vorzeichen':
      return { art: a.art, zeichen: a.zeichen, operand: ohneSpalten(a.operand) };
    case 'rechnung':
      return { art: a.art, operator: a.operator, links: ohneSpalten(a.links), rechts: ohneSpalten(a.rechts) };
  }
}

/** Normalisierte Dezimalzahl (keine Nullen am Ende, mindestens eine Nachkommastelle), selbst gebaut. */
const zahlGen = fc
  .tuple(fc.bigInt({ min: 0n, max: 10n ** 12n }), fc.integer({ min: 1, max: 6 }))
  .map(([g, s]) => {
    const z = g.toString().padStart(s + 1, '0');
    const nach = z.slice(z.length - s).replace(/0+$/, '') || '0';
    return `${z.slice(0, z.length - s)}.${nach}` as Dezimal;
  });
const nameGen = fc
  .stringMatching(/^[a-zA-ZäöüÄÖÜß][a-zA-Z0-9_äöü]{0,6}$/)
  .filter((n) => !/^Z[0-9]+$/.test(n));

const baumGen: fc.Arbitrary<Ausdruck> = fc.letrec<{ knoten: Ausdruck }>((tie) => ({
  knoten: fc.oneof(
    { depthSize: 'small', maxDepth: 8 },
    zahlGen.map((wert): Ausdruck => ({ art: 'zahl', wert, spalte: 0 })),
    fc.integer({ min: 0, max: 1_000_000 }).map((zeile): Ausdruck => ({ art: 'bezug', zeile, spalte: 0 })),
    nameGen.map((name): Ausdruck => ({ art: 'name', name, spalte: 0 })),
    fc
      .tuple(fc.constantFrom<'+' | '-'>('+', '-'), tie('knoten'))
      .map(([zeichen, operand]): Ausdruck => ({ art: 'vorzeichen', zeichen, operand, spalte: 0 })),
    fc
      .tuple(fc.constantFrom<'+' | '-' | '*' | '/'>('+', '-', '*', '/'), tie('knoten'), tie('knoten'))
      .map(([operator, links, rechts]): Ausdruck => ({
        art: 'rechnung',
        operator,
        links,
        rechts,
        spalte: 0,
      })),
  ),
})).knoten;

describe('Eigenschaft: Lesen nach Formatieren ergibt denselben Baum', () => {
  it('ausdruckLesen(ausdruckFormatieren(a)) = a (bis auf Spalten)', () => {
    fc.assert(
      fc.property(baumGen, (a) => {
        const text = ausdruckFormatieren(a);
        fc.pre(text.length <= 1000);
        const e = ausdruckLesen(text);
        if (!e.ok) throw new Error(`${text}: ${e.fehler.code} an ${String(e.fehler.spalte)}`);
        expect(ohneSpalten(e.wert)).toEqual(ohneSpalten(a));
        expect(ausdruckFormatieren(e.wert)).toBe(text);
      }),
      runs,
    );
  });
});

/** Ganzzahliger Ausdruck als Text samt Wert, der Text voll geklammert, mit zufälligem Leerraum und Ersatzzeichen. */
interface Ganzausdruck {
  readonly text: string;
  readonly wert: bigint;
}
const leer = fc.constantFrom('', ' ', '  ', '\t');
const ganzGen: fc.Arbitrary<Ganzausdruck> = fc.letrec<{ g: Ganzausdruck }>((tie) => ({
  g: fc.oneof(
    { depthSize: 'small', maxDepth: 7 },
    fc.bigInt({ min: 0n, max: 10n ** 9n }).map((n) => ({ text: n.toString(), wert: n })),
    fc
      .tuple(fc.constantFrom('-', '−'), tie('g'), leer)
      .map(([m, o, l]) => ({ text: `${m}${l}(${o.text})`, wert: -o.wert })),
    fc
      .tuple(fc.constantFrom('+', '-', '−', '*', '×'), tie('g'), tie('g'), leer, leer)
      .map(([op, a, b, l1, l2]) => ({
        text: `(${a.text})${l1}${op}${l2}(${b.text})`,
        wert: op === '+' ? a.wert + b.wert : op === '*' || op === '×' ? a.wert * b.wert : a.wert - b.wert,
      })),
  ),
})).g;

describe('Eigenschaft: ganze Zahlen mit +, -, * wie über bigint gerechnet', () => {
  it('Zeilenergebnis = bigint-Wert mit drei Nullstellen', () => {
    fc.assert(
      fc.property(ganzGen, ({ text, wert }) => {
        fc.pre(text.length <= 1000);
        const e = mengenansatzBerechnen([{ zeile: 1, formel: 91, ausdruck: text, variable: null }]);
        expect(e.zeilen[0]?.fehler ?? null).toBeNull();
        expect(e.zeilen[0]?.menge).toBe(`${wert.toString()}.000`);
        expect(e.summe).toBe(`${wert.toString()}.000`);
      }),
      runs,
    );
  });
});

describe('Eigenschaft: beliebiger Text wirft nie', () => {
  const zeichen = fc.constantFrom(...'0123456789,.+-*/:()Zza_ä#\t ', '×', '÷', '−', ' ', '\u{1f600}');
  const texte = fc.oneof(
    fc.string({ unit: zeichen, maxLength: 1000 }),
    fc.string({ unit: 'grapheme', maxLength: 1000 }),
    fc.string({ unit: 'binary', maxLength: 1000 }),
  );

  it('Wert oder Fehlerwert, nie eine Ausnahme', () => {
    fc.assert(
      fc.property(texte, fc.option(fc.string({ maxLength: 8 })), (text, variable) => {
        const lesen = ausdruckLesen(text);
        expect(typeof lesen.ok).toBe('boolean');
        const e = mengenansatzBerechnen([
          { zeile: 1, formel: 91, ausdruck: '2', variable },
          { zeile: 2, formel: 91, ausdruck: text, variable: null },
        ]);
        for (const z of e.zeilen) expect((z.menge === null) !== (z.fehler === null)).toBe(true);
        if (lesen.ok) expect(ausdruckLesen(ausdruckFormatieren(lesen.wert)).ok).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('Grenzen: 50 Klammern gehen, 51 sind zu tief, lange Vorzeichenketten laufen nicht über', () => {
    const tief = (n: number) => `${'('.repeat(n)}2${')'.repeat(n)}`;
    const ok = mengenansatzBerechnen([{ zeile: 1, formel: 91, ausdruck: tief(50), variable: null }]);
    expect(ok.zeilen[0]?.menge).toBe('2.000');
    const zuTief = mengenansatzBerechnen([{ zeile: 1, formel: 91, ausdruck: tief(51), variable: null }]);
    expect(zuTief.zeilen[0]?.fehler?.code).toBe('zu-tief');
    // 998 Minuszeichen: gerade Anzahl → +2
    const kette = mengenansatzBerechnen([
      { zeile: 1, formel: 91, ausdruck: `${'-'.repeat(998)}2`, variable: null },
    ]);
    expect(kette.zeilen[0]?.menge).toBe('2.000');
    const lang = mengenansatzBerechnen([
      { zeile: 1, formel: 91, ausdruck: `${'1+'.repeat(499)}11`, variable: null },
    ]);
    // 499 Einsen + 11 = 510
    expect(lang.zeilen[0]?.menge).toBe('510.000');
  });
});
