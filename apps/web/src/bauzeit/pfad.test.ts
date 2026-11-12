// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Bauzeitenplan, BauzeitenplanId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { bauzeitPfad, bauzeitRoute, bauzeitZiel, bauzeitenplanPfad } from './pfad';

const p = 'p1' as ProjektId;
const plan = (id: string): Bauzeitenplan => ({
  id: id as BauzeitenplanId,
  projektId: p,
  name: 'Rohbau',
  projektbeginn: '2026-11-02',
  kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: null, freieTage: [] },
  vorgaenge: [],
});

describe('Pfade der Bauzeitenpläne', () => {
  it('Adressen und Erkennung passen zueinander', () => {
    expect(bauzeitPfad(p)).toBe('/projekt/p1/bauzeit');
    expect(bauzeitRoute(bauzeitPfad(p))).toEqual({ art: 'liste', projektId: p });
    expect(bauzeitRoute(bauzeitenplanPfad(p, 'b1' as BauzeitenplanId))).toEqual({
      art: 'plan',
      projektId: p,
      id: 'b1',
    });
  });

  it('andere Pfade sind keine Bauzeitseiten', () => {
    expect(bauzeitRoute('/projekt/p1')).toBeNull();
    expect(bauzeitRoute('/projekt/p1/kosten')).toBeNull();
    expect(bauzeitRoute('/projekt/p1/bauzeit/a/b')).toBeNull();
  });

  it('nach Undo/Redo: Plan da → sein Editor, Plan weg → die Liste, schon dort → bleiben', () => {
    const b = plan('b1');
    const angelegt = { bauzeitenplan: { vorher: null, nachher: b } };
    const geaendert = { bauzeitenplan: { vorher: b, nachher: { ...b, name: 'Neu' } } };
    // Rückgängig eines Anlegens: der Plan ist weg
    expect(bauzeitZiel(p, angelegt, true, bauzeitenplanPfad(p, b.id))).toBe(bauzeitPfad(p));
    expect(bauzeitZiel(p, angelegt, true, bauzeitPfad(p))).toBeNull();
    // Wiederholen eines Anlegens
    expect(bauzeitZiel(p, angelegt, false, bauzeitPfad(p))).toBe(bauzeitenplanPfad(p, b.id));
    // Änderung, Editor schon offen
    expect(bauzeitZiel(p, geaendert, true, bauzeitenplanPfad(p, b.id))).toBeNull();
    expect(bauzeitZiel(p, geaendert, false, '/projekt/p1')).toBe(bauzeitenplanPfad(p, b.id));
  });
});
