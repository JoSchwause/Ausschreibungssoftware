// SPDX-License-Identifier: AGPL-3.0-or-later
// Kostengruppennummer (Ticket 55): Form, Ebene, Elternteil, Vorfahren, Sortierung allein aus den Ziffern (D-24).
// Die Nummern hier sind beliebige Ziffernfolgen der Form, keine Liste der Norm (G-16).

import { describe, expect, it } from 'vitest';
import type { Kostengruppennummer } from '@tethys/vertrag';
import { kgEbene, kgElternteil, kgLesen, kgSortieren, kgVergleichen, kgVorfahren } from './index';

function kg(text: string): Kostengruppennummer {
  const e = kgLesen(text);
  if (!e.ok) throw new Error(`Testnummer ungültig: ${text}`);
  return e.wert;
}

describe('kgLesen', () => {
  it('nimmt drei Ziffern mit erster Ziffer 1 bis 9 an', () => {
    expect(kgLesen('100')).toEqual({ ok: true, wert: '100' });
    expect(kgLesen('370')).toEqual({ ok: true, wert: '370' });
    expect(kgLesen('999')).toEqual({ ok: true, wert: '999' });
  });

  it('entfernt Leerraum am Rand', () => {
    expect(kgLesen('  451\t')).toEqual({ ok: true, wert: '451' });
  });

  it.each([
    ['', 'nummer-leer'],
    ['   ', 'nummer-leer'],
    ['12', 'nummer-form'],
    ['1234', 'nummer-form'],
    ['1a0', 'nummer-form'],
    ['１００', 'nummer-form'],
    ['1 00', 'nummer-form'],
    ['KG 100', 'nummer-form'],
    ['-100', 'nummer-form'],
    ['100.0', 'nummer-form'],
    ['000', 'nummer-null'],
    ['099', 'nummer-null'],
  ])('weist %j ab mit %s', (text, code) => {
    const e = kgLesen(text);
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe(code);
  });
});

describe('Ebene und Elternteil', () => {
  it.each([
    ['200', 1, null],
    ['230', 2, '200'],
    ['231', 3, '230'],
    ['209', 3, '200'],
    ['905', 3, '900'],
  ])('%s hat Ebene %i und Elternteil %s', (nummer, ebene, eltern) => {
    expect(kgEbene(kg(nummer))).toBe(ebene);
    expect(kgElternteil(kg(nummer))).toBe(eltern);
  });

  it('Vorfahren laufen vom Elternteil bis zur Ebene 1', () => {
    expect(kgVorfahren(kg('231'))).toEqual(['230', '200']);
    expect(kgVorfahren(kg('230'))).toEqual(['200']);
    expect(kgVorfahren(kg('200'))).toEqual([]);
  });
});

describe('Sortierung', () => {
  it('ordnet nach Nummer, Elternteil vor Kindern', () => {
    const ungeordnet = ['310', '200', '311', '300', '219', '210'].map(kg);
    expect(kgSortieren(ungeordnet)).toEqual(['200', '210', '219', '300', '310', '311']);
    expect(ungeordnet[0]).toBe('310');
  });

  it('vergleicht dreiwertig', () => {
    expect(kgVergleichen(kg('120'), kg('121'))).toBe(-1);
    expect(kgVergleichen(kg('121'), kg('121'))).toBe(0);
    expect(kgVergleichen(kg('200'), kg('199'))).toBe(1);
  });
});
