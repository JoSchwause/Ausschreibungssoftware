// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { klappAbsicht } from './gridKern';

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
