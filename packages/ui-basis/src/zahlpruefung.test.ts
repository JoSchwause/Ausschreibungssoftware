// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { pruefeZahlformatDeDE } from './Felder';

describe('pruefeZahlformatDeDE (reine Formprüfung)', () => {
  it.each(['', ' ', '0', '12', '1234', '1.234', '1.234.567,89', '-1.234,5', '12,', '0,001'])(
    '%j sieht aus wie eine deutsche Zahl',
    (text) => {
      expect(pruefeZahlformatDeDE(text).gueltig).toBe(true);
    },
  );

  it.each(['1,234.56', '12a', '1.23', '1,2,3', 'abc', '--1', '1 234'])('%j wird als Hinweis gemeldet', (text) => {
    const r = pruefeZahlformatDeDE(text);
    expect(r.gueltig).toBe(false);
    if (!r.gueltig) expect(r.meldung.length).toBeGreaterThan(0);
  });
});
