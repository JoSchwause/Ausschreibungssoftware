// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Formprüfung in `ui-basis` darf nichts anderes sagen als der Parser in `dezimal`. ui-basis darf dezimal nicht
// importieren (A3), deshalb prüft die App, die beide kennt, dass sie sich einig sind.
import { parseDe } from '@tethys/dezimal';
import { pruefeZahlformatDeDE } from '@tethys/ui-basis';
import { describe, expect, it } from 'vitest';

describe('Zahlhinweis und parseDe', () => {
  it.each([
    '0',
    '12',
    '1.234',
    '1.234.567,89',
    '-1.234,5',
    ',5',
    '-,5',
    '−12,5',
    '12,',
    ',',
    '-',
    '--1',
    '1.23',
    '1,2,3',
    '1 234',
    '1,234.56',
    'abc',
  ])('%j: Hinweis und parseDe sind sich einig', (text) => {
    // Mehr Nachkommastellen als die Skala lehnt `parseDe` ab, ohne dass die Form falsch ist; hier zählt nur die Form.
    const parser = parseDe('betrag', text);
    const formOk = parser.ok || parser.fehler.code === 'zu-viele-nachkommastellen';
    expect(pruefeZahlformatDeDE(text).gueltig).toBe(formOk);
  });

  it('leerer Text ist gültig (ein leeres Feld ist kein Formfehler)', () => {
    expect(pruefeZahlformatDeDE('').gueltig).toBe(true);
  });
});
