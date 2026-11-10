// SPDX-License-Identifier: AGPL-3.0-or-later
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { keineNumberFuerGeld } from './eslint-regeln.mjs';

function lint(code) {
  const linter = new Linter();
  return linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        plugins: { tethys: { rules: { r: keineNumberFuerGeld } } },
        rules: { 'tethys/r': 'error' },
      },
    ],
    'datei.ts',
  );
}

describe('N1: keine number für Geld', () => {
  it.each([
    'const menge: number = 1;',
    'function f(einheitspreis: number) {}',
    'interface P { gesamtBetrag: number }',
    'class K { nettoSumme: number = 0 }',
    'type T = { prozent: number };',
  ])('meldet %s', (code) => {
    const fehler = lint(code);
    expect(fehler).toHaveLength(1);
    expect(fehler[0]?.message).toContain('N1');
  });

  it.each([
    'const index: number = 1;',
    'const epoche: number = 1;',
    'interface P { zeile: number; menge: Decimal }',
    'const menge: string = "1,5";',
  ])('lässt %s zu', (code) => {
    expect(lint(code)).toEqual([]);
  });
});
