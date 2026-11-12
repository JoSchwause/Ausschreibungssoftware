// SPDX-License-Identifier: AGPL-3.0-or-later
// Farben der Leinwand (U4, U8): jede Farbe ist eine Variable in `modellansicht.css`, die genau auf ein Design-Token von
// ui-basis zeigt. In hell und dunkel heben sich Auswahl und Kennzeichen mit mindestens 3 : 1 vom Hintergrund ab
// (WCAG 1.4.11, grafische Objekte) und sind innerhalb einer Färbungsart verschieden.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { BAUTEILKENNZEICHEN } from './darstellung';
import { FARBVARIABLEN } from './farben';

const modellCss = readFileSync(new URL('./modellansicht.css', import.meta.url), 'utf8');
const tokensCss = readFileSync(createRequire(import.meta.url).resolve('@tethys/ui-basis/tokens.css'), 'utf8');

function tokens(anfang: string): Map<string, string> {
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

/** Variable → Token-Name aus `modellansicht.css`, z. B. `--tx-modell-auswahl` → `focus`. */
function zuordnungAusCss(): Map<string, string> {
  return new Map(
    [...modellCss.matchAll(/(--tx-modell-[a-z-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]),
  );
}

describe('Farben der Leinwand', () => {
  const css = zuordnungAusCss();

  it('nennt für Hintergrund, Auswahl und jedes Kennzeichen eine Variable, die nur auf ein Farb-Token zeigt', () => {
    expect(Object.keys(FARBVARIABLEN).sort()).toEqual(['auswahl', 'hintergrund', ...BAUTEILKENNZEICHEN].sort());
    for (const variable of Object.values(FARBVARIABLEN)) {
      expect(css.get(variable), variable).toMatch(/^var\(--tx-color-[a-z-]+\)$/);
    }
  });

  const token = (variable: string): string => /--tx-color-([a-z-]+)/.exec(css.get(variable) ?? '')?.[1] ?? '';

  for (const [modus, farben] of Object.entries({
    hell: tokens("[data-theme='light']"),
    dunkel: tokens("[data-theme='dark']"),
  })) {
    describe(modus, () => {
      const farbe = (name: keyof typeof FARBVARIABLEN): string => farben.get(token(FARBVARIABLEN[name])) ?? '';
      const hintergrund = farbe('hintergrund');

      for (const name of ['auswahl', ...BAUTEILKENNZEICHEN] as const) {
        it(`${name} hebt sich mit mindestens 3 : 1 vom Hintergrund ab`, () => {
          expect(farbe(name)).toMatch(/^#[0-9a-f]{6}$/i);
          expect(kontrast(farbe(name), hintergrund)).toBeGreaterThanOrEqual(3);
        });
      }

      it('Modellvergleich: Auswahl, hinzugefügt, entfernt und geändert sind verschiedene Farben', () => {
        const liste = (['auswahl', 'hinzugefuegt', 'entfernt', 'geaendert'] as const).map(farbe);
        expect(new Set(liste).size).toBe(liste.length);
      });

      it('Zuordnung: Auswahl, zugeordnet und ohne Zuordnung sind verschiedene Farben', () => {
        const liste = (['auswahl', 'zugeordnet', 'ohne-zuordnung'] as const).map(farbe);
        expect(new Set(liste).size).toBe(liste.length);
      });
    });
  }
});
