// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Kostenermittlung, KostenermittlungId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  bezeichnungenPfad,
  kontrollePfad,
  kostenPfad,
  kostenRoute,
  kostenZiel,
  kostenermittlungPfad,
} from './pfad';

const p = 'p1' as ProjektId;
const k = (id: string): Kostenermittlung => ({
  id: id as KostenermittlungId,
  projektId: p,
  stufe: 'kostenberechnung',
  name: 'KB',
  eintraege: [],
});

describe('Pfade der Kostenseiten', () => {
  it('Adressen und Erkennung sind zueinander passend', () => {
    expect(kostenRoute(kostenPfad(p))).toEqual({ art: 'liste', projektId: p });
    expect(kostenRoute(kontrollePfad(p))).toEqual({ art: 'kontrolle', projektId: p });
    expect(kostenRoute(kostenermittlungPfad(p, 'k1' as KostenermittlungId))).toEqual({
      art: 'ermittlung',
      projektId: p,
      id: 'k1',
    });
  });

  it('der Verweis zum Einlesen der Bezeichnungen führt auf die Liste, an ihren Abschnitt', () => {
    expect(bezeichnungenPfad(p)).toBe('/projekt/p1/kosten#bezeichnungen');
  });

  it('andere Pfade sind keine Kostenseiten', () => {
    expect(kostenRoute('/projekt/p1')).toBeNull();
    expect(kostenRoute('/projekt/p1/auftrag/a')).toBeNull();
    expect(kostenRoute('/projekt/p1/kosten/a/b')).toBeNull();
  });
});

describe('kostenZiel', () => {
  const angelegt = { kostenermittlung: { vorher: null, nachher: k('k1') } };

  it('Wiederholen eines Anlegens führt auf den Editor, Rückgängig in die Liste', () => {
    expect(kostenZiel(p, angelegt, false, '/')).toBe('/projekt/p1/kosten/k1');
    expect(kostenZiel(p, angelegt, true, '/projekt/p1/kosten/k1')).toBe('/projekt/p1/kosten');
  });

  it('man bleibt, wo man schon ist', () => {
    expect(kostenZiel(p, angelegt, false, '/projekt/p1/kosten/k1')).toBeNull();
    expect(kostenZiel(p, angelegt, true, '/projekt/p1/kosten')).toBeNull();
  });

  it('eine Änderung führt auf den Editor der Kostenermittlung', () => {
    const geaendert = { kostenermittlung: { vorher: k('k1'), nachher: k('k1') } };
    expect(kostenZiel(p, geaendert, true, '/projekt/p1/kosten/kontrolle')).toBe('/projekt/p1/kosten/k1');
  });
});
