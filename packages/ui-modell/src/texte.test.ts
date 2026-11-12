// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { leinwandName } from './texte';

describe('Name der Leinwand für Screenreader (U8)', () => {
  it('nennt die Zahl der Bauteile und der ausgewählten', () => {
    expect(leinwandName('3D-Ansicht des Modells', { bauteile: 7, ausgewaehlt: 2 })).toBe(
      '3D-Ansicht des Modells: 7 Bauteile, 2 ausgewählt',
    );
    expect(leinwandName('Modell', { bauteile: 1, ausgewaehlt: 0 })).toBe('Modell: 1 Bauteil, keine Auswahl');
    expect(leinwandName('Modell', { bauteile: 0, ausgewaehlt: 0 })).toBe('Modell: keine Bauteile, keine Auswahl');
  });

  it('nennt den Ladezustand, solange kein Modell da ist', () => {
    expect(leinwandName('Modell', null)).toBe('Modell: wird geladen');
  });
});
