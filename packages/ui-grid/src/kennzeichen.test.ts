// SPDX-License-Identifier: AGPL-3.0-or-later
// Kennzeichen des Vergleichsgrids (U4, U8): Jedes eingebaute Kennzeichen hat in `grid.css` eine eigene Regel aus
// Design-Tokens (Textfarbe auf eigener Fläche), und dieses Paar hat in hell und dunkel mindestens 4,5 : 1.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { KENNZEICHEN } from './vergleich';

const gridCss = readFileSync(new URL('./grid.css', import.meta.url), 'utf8');
const tokensCss = readFileSync(createRequire(import.meta.url).resolve('@tethys/ui-basis/tokens.css'), 'utf8');

function farben(anfang: string): Map<string, string> {
  const start = tokensCss.indexOf(anfang);
  if (start < 0) throw new Error(`Block nicht gefunden: ${anfang}`);
  const block = tokensCss.slice(start, tokensCss.indexOf('\n}', start));
  return new Map(
    [...block.matchAll(/--tx-color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [
      m[1] ?? '',
      m[2] ?? '',
    ]),
  );
}

const linear = (k: number): number => {
  const c = k / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const leuchtdichte = (hex: string): number =>
  0.2126 * linear(parseInt(hex.slice(1, 3), 16)) +
  0.7152 * linear(parseInt(hex.slice(3, 5), 16)) +
  0.0722 * linear(parseInt(hex.slice(5, 7), 16));
const kontrast = (a: string, b: string): number => {
  const [x, y] = [leuchtdichte(a), leuchtdichte(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Text- und Flächen-Token einer Kennzeichen-Regel (`color` und `background` aus `var(--tx-color-…)`). */
function paar(selektor: string): { text: string; flaeche: string } {
  const start = gridCss.indexOf(`${selektor} {`);
  if (start < 0) throw new Error(`Regel fehlt: ${selektor}`);
  const regel = gridCss.slice(start, gridCss.indexOf('}', start));
  const text = /\bcolor:\s*var\(--tx-color-([a-z-]+)\)/.exec(regel)?.[1];
  const flaeche = /\bbackground:\s*var\(--tx-color-([a-z-]+)\)/.exec(regel)?.[1];
  if (!text || !flaeche) throw new Error(`${selektor}: color und background aus Tokens erwartet`);
  return { text, flaeche };
}

const modi = { hell: farben("[data-theme='light']"), dunkel: farben("[data-theme='dark']") };
const selektoren = [
  '.tx-grid__kennzeichen',
  ...Object.keys(KENNZEICHEN).map((k) => `.tx-grid__kennzeichen--${k}`),
];

describe('Kennzeichen-Farben', () => {
  for (const [modus, tokens] of Object.entries(modi)) {
    for (const selektor of selektoren) {
      it(`${selektor} (${modus}) hat mindestens 4,5 : 1`, () => {
        const { text, flaeche } = paar(selektor);
        const t = tokens.get(text);
        const f = tokens.get(flaeche);
        if (!t || !f) throw new Error(`Token fehlt: ${text} oder ${flaeche}`);
        expect(kontrast(t, f)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
