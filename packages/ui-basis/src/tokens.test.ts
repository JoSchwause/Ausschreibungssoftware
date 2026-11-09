// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

/** Liest die Farb-Tokens (#rrggbb) aus dem Block, der mit `anfang` beginnt. */
function farben(anfang: string): Map<string, string> {
  const start = css.indexOf(anfang);
  if (start < 0) throw new Error(`Block nicht gefunden: ${anfang}`);
  const ende = css.indexOf('\n}', start);
  const block = css.slice(start, ende);
  const out = new Map<string, string>();
  for (const m of block.matchAll(/--tx-color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out.set(m[1] ?? '', m[2] ?? '');
  }
  return out;
}

function linear(kanal: number): number {
  const c = kanal / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative Leuchtdichte nach WCAG 2.x. */
function leuchtdichte(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function kontrast(a: string, b: string): number {
  const la = leuchtdichte(a);
  const lb = leuchtdichte(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text-Fläche-Paare, die in der Oberfläche vorkommen (WCAG-AA für Text: 4,5 : 1). */
const TEXTPAARE: [text: string, flaeche: string][] = [
  ['text', 'surface'],
  ['text', 'surface-raised'],
  ['text', 'surface-sunken'],
  ['text', 'surface-hover'],
  ['text-muted', 'surface'],
  ['text-muted', 'surface-raised'],
  ['text-muted', 'surface-sunken'],
  ['text-muted', 'surface-hover'],
  ['accent-contrast', 'accent'],
  ['accent-contrast', 'accent-hover'],
  ['accent-text', 'surface'],
  ['accent-text', 'surface-raised'],
  ['accent-text', 'accent-subtle'],
  ['danger', 'surface'],
  ['danger', 'surface-raised'],
  ['danger', 'danger-subtle'],
  ['warning', 'surface'],
  ['warning', 'warning-subtle'],
  ['success', 'surface'],
  ['success', 'success-subtle'],
];

/** Bedienelemente und Fokus müssen sich mit 3 : 1 abheben (WCAG 1.4.11). */
const BAUTEILPAARE: [string, string][] = [
  ['focus', 'surface'],
  ['focus', 'surface-raised'],
  ['border-strong', 'surface'],
];

const modi = { hell: farben("[data-theme='light']"), dunkel: farben("[data-theme='dark']") };

describe('Design-Tokens: Kontrast', () => {
  it('beide Modi definieren dieselben Farb-Tokens', () => {
    expect([...modi.dunkel.keys()].sort()).toEqual([...modi.hell.keys()].sort());
  });

  for (const [modus, tokens] of Object.entries(modi)) {
    describe(modus, () => {
      for (const [text, flaeche] of TEXTPAARE) {
        it(`${text} auf ${flaeche} hat mindestens 4,5 : 1`, () => {
          const t = tokens.get(text);
          const f = tokens.get(flaeche);
          if (!t || !f) throw new Error(`Token fehlt: ${text} oder ${flaeche}`);
          expect(kontrast(t, f)).toBeGreaterThanOrEqual(4.5);
        });
      }
      for (const [a, b] of BAUTEILPAARE) {
        it(`${a} gegen ${b} hat mindestens 3 : 1`, () => {
          const x = tokens.get(a);
          const y = tokens.get(b);
          if (!x || !y) throw new Error(`Token fehlt: ${a} oder ${b}`);
          expect(kontrast(x, y)).toBeGreaterThanOrEqual(3);
        });
      }
    });
  }

  it('Kontrastberechnung stimmt mit bekannten Werten überein', () => {
    expect(kontrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(kontrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
