import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { keineNumberFuerGeld } from './tools/eslint-regeln.mjs';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'LICENSES/**',
      '.scratch/**',
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((c) => ({ ...c, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['tools/**/*.mjs', 'fixtures/**/*.mjs', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  // N1: kein `number` für Menge, Preis, Betrag, Prozent. Ausnahme: das Paket `dezimal` selbst und Tests.
  {
    files: ['packages/*/src/**/*.ts', 'apps/web/src/**/*.{ts,tsx}'],
    ignores: ['packages/dezimal/**', '**/*.test.*'],
    plugins: { tethys: { rules: { 'keine-number-fuer-geld': keineNumberFuerGeld } } },
    rules: { 'tethys/keine-number-fuer-geld': 'error' },
  },
);
