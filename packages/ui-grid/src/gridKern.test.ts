// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { klappAbsicht, waagerechterVersatz } from './gridKern';

// Sichtbereich von 100 bis 500 (z. B. rechts der fixierten Spalten); Ergebnis: um wie viel scrollLeft wächst.
describe('waagerechterVersatz', () => {
  it('ein Ziel, das ganz sichtbar ist, bleibt stehen', () => {
    expect(waagerechterVersatz(150, 300, 100, 500)).toBe(0);
  });

  it('ein schmales Ziel links oder rechts außerhalb kommt gerade so in Sicht', () => {
    expect(waagerechterVersatz(40, 140, 100, 500)).toBe(-60);
    expect(waagerechterVersatz(450, 620, 100, 500)).toBe(120);
  });

  it('ein Ziel breiter als der Sichtbereich zeigt seinen Anfang, von links kommend sein Ende', () => {
    // Anfang sichtbar, Ende weit rechts: der Anfang rückt an den linken Rand
    expect(waagerechterVersatz(300, 2300, 100, 500)).toBe(200);
    // ganz rechts außerhalb: ebenso der Anfang
    expect(waagerechterVersatz(900, 2900, 100, 500)).toBe(800);
    // Ende sichtbar, Anfang weit links: das Ende rückt an den rechten Rand
    expect(waagerechterVersatz(-1600, 400, 100, 500)).toBe(-100);
  });

  it('ein Ziel, das den Sichtbereich ganz überdeckt, bleibt stehen', () => {
    expect(waagerechterVersatz(-1000, 3000, 100, 500)).toBe(0);
  });

  it('genügt ein Teil (breite Zelle ohne eigenes Ziel), bleibt ein teils sichtbares Ziel stehen', () => {
    expect(waagerechterVersatz(300, 2300, 100, 500, true)).toBe(0);
    expect(waagerechterVersatz(-1600, 400, 100, 500, true)).toBe(0);
    // ganz außerhalb kommt es wie sonst in Sicht; schmale Ziele wie sonst ganz
    expect(waagerechterVersatz(900, 2900, 100, 500, true)).toBe(800);
    expect(waagerechterVersatz(450, 620, 100, 500, true)).toBe(120);
  });
});

const taste = (
  key: string,
  mehr: Partial<{ altKey: boolean; ctrlKey: boolean; shiftKey: boolean }> = {},
) => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mehr,
});
const zu = { hatUnterknoten: true, aufgeklappt: false };
const auf = { hatUnterknoten: true, aufgeklappt: true };
const blatt = { hatUnterknoten: false, aufgeklappt: false };

describe('klappAbsicht', () => {
  it('Pfeil rechts/links in der Baumspalte klappt eine Zeile mit Unterknoten auf bzw. zu', () => {
    expect(klappAbsicht(taste('ArrowRight'), zu, true)).toBe(true);
    expect(klappAbsicht(taste('ArrowLeft'), auf, true)).toBe(false);
  });

  it('steht die Zeile schon so, außerhalb der Baumspalte, ohne Unterknoten oder mit Umschalter: keine Absicht', () => {
    expect(klappAbsicht(taste('ArrowRight'), auf, true)).toBeNull();
    expect(klappAbsicht(taste('ArrowRight'), zu, false)).toBeNull();
    expect(klappAbsicht(taste('ArrowRight'), blatt, true)).toBeNull();
    expect(klappAbsicht(taste('ArrowRight', { shiftKey: true }), zu, true)).toBeNull();
    expect(klappAbsicht(taste('ArrowRight', { ctrlKey: true }), zu, true)).toBeNull();
    expect(klappAbsicht(taste('ArrowDown'), zu, true)).toBeNull();
  });

  it('Alt+Pfeil rechts/links klappt überall in der Zeile', () => {
    expect(klappAbsicht(taste('ArrowRight', { altKey: true }), zu, false)).toBe(true);
    expect(klappAbsicht(taste('ArrowLeft', { altKey: true }), auf, false)).toBe(false);
  });
});
