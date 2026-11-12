// SPDX-License-Identifier: AGPL-3.0-or-later
// Farben der Balkenspalte (Ticket 96, U4, U8): Die Tokens des Grids (`--tx-grid-…` in `grid.css`) verweisen nur auf
// Tokens aus ui-basis, haben also hell und dunkel; und jede Grafik (Balkenrand, Schraffur, Fortschritt, Ist-Balken,
// Klammer, Raute, Markierung) hebt sich von ihrer Fläche mit mindestens 3 : 1 ab (WCAG 1.4.11, Grafik). Die freien Tage
// sind eine durchscheinende Tönung (keine Information allein in der Farbe) und deshalb nur auf Tokens geprüft.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const gridCss = readFileSync(new URL('./grid.css', import.meta.url), 'utf8');
const tokensCss = readFileSync(createRequire(import.meta.url).resolve('@tethys/ui-basis/tokens.css'), 'utf8');

function farben(anfang: string): Map<string, string> {
  const start = tokensCss.indexOf(anfang);
  if (start < 0) throw new Error(`Block nicht gefunden: ${anfang}`);
  const block = tokensCss.slice(start, tokensCss.indexOf('\n}', start));
  return new Map(
    [...block.matchAll(/--tx-color-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1] ?? '', m[2] ?? '']),
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

/** Die Farb-Tokens des Grids aus `grid.css`: Name → Wert. */
const gridTokens = new Map(
  [...gridCss.matchAll(/(--tx-grid-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
);

/** Das Token aus ui-basis hinter einem Namen: ein Grid-Token wird aufgelöst, ein Name ohne Präfix ist schon eines. */
function basistoken(name: string): string {
  if (!name.startsWith('--tx-grid-')) return name;
  const wert = gridTokens.get(name);
  const ziel = wert === undefined ? undefined : /^var\(--tx-color-([a-z-]+)\)$/.exec(wert)?.[1];
  if (ziel === undefined) throw new Error(`${name} verweist nicht direkt auf ein Token aus ui-basis: ${String(wert)}`);
  return ziel;
}

const modi = { hell: farben("[data-theme='light']"), dunkel: farben("[data-theme='dark']") };
/** Flächen, auf denen Balken stehen: Zeile, Gliederung, Zeile unter der Maus, ausgewählte Zelle. */
const ZEILENFLAECHEN = ['surface', 'surface-raised', 'surface-hover', 'accent-subtle'];
const GRAFIK = [
  '--tx-grid-balken-rand',
  '--tx-grid-balken-kritisch-rand',
  '--tx-grid-balken-ist',
  '--tx-grid-sammelvorgang',
  '--tx-grid-meilenstein',
  '--tx-grid-markierung',
];
/** Grafik im Balken: Fortschritt auf der Fläche des Balkens, Schraffur und Fortschritt im kritischen Balken. */
const IM_BALKEN: readonly (readonly [string, string])[] = [
  ['--tx-grid-balken-rand', '--tx-grid-balken'],
  ['--tx-grid-balken-kritisch-rand', '--tx-grid-balken-kritisch'],
];
const PAARE = [...GRAFIK.flatMap((g) => ZEILENFLAECHEN.map((f) => [g, f] as const)), ...IM_BALKEN];

describe('Farben der Balkenspalte', () => {
  it('jedes Token der Balkenspalte verweist auf Tokens aus ui-basis, ohne feste Farbe (U4)', () => {
    const balkenTokens = [...gridTokens].filter(([name]) => name !== '--tx-grid-zeilenhoehe');
    expect(balkenTokens.length).toBeGreaterThanOrEqual(9);
    for (const [name, wert] of balkenTokens) {
      expect(wert, name).toMatch(/var\(--tx-color-[a-z-]+\)/);
      expect(wert, name).not.toMatch(/#[0-9a-fA-F]{3}|\brgba?\(|\bhsla?\(/);
    }
  });

  for (const [modus, tokens] of Object.entries(modi)) {
    for (const [grafik, flaeche] of PAARE) {
      it(`${grafik} auf ${flaeche} (${modus}) hat mindestens 3 : 1`, () => {
        const g = tokens.get(basistoken(grafik));
        const f = tokens.get(basistoken(flaeche));
        if (!g || !f) throw new Error(`Token fehlt: ${grafik} oder ${flaeche}`);
        expect(kontrast(g, f)).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
