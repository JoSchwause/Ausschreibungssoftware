// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { projektPfad, projektliste } from './pfade';

const p = 'p1' as ProjektId;
const liste = projektliste<'eintrag', string>('dinge', 'eintrag');

describe('Pfadbaukasten', () => {
  it('Adressen und Erkennung passen zueinander', () => {
    expect(projektPfad(p)).toBe('/projekt/p1');
    expect(liste.liste(p)).toBe('/projekt/p1/dinge');
    expect(liste.einzeln(p, 'd1')).toBe('/projekt/p1/dinge/d1');
    expect(liste.route('/projekt/p1/dinge')).toEqual({ art: 'liste', projektId: p });
    expect(liste.route('/projekt/p%201/dinge/d%2F1')).toEqual({
      art: 'eintrag',
      projektId: 'p 1',
      id: 'd/1',
    });
  });

  it('andere Pfade gehören nicht zur Liste', () => {
    expect(liste.route('/projekt/p1')).toBeNull();
    expect(liste.route('/projekt/p1/dingex')).toBeNull();
    expect(liste.route('/projekt/p1/dinge/a/b')).toBeNull();
  });

  it('Ziel nach Rückgängig/Wiederholen: da → seine Seite, weg → die Liste, schon dort → bleiben', () => {
    const angelegt = { vorher: null, nachher: { id: 'd1' } };
    expect(liste.ziel(p, angelegt, true, liste.einzeln(p, 'd1'))).toBe(liste.liste(p));
    expect(liste.ziel(p, angelegt, true, liste.liste(p))).toBeNull();
    expect(liste.ziel(p, angelegt, false, liste.liste(p))).toBe(liste.einzeln(p, 'd1'));
    expect(liste.ziel(p, { vorher: null, nachher: null }, false, '/')).toBeNull();
  });
});
