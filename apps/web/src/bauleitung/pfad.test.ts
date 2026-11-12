// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: Adressen der Bauleitungsseiten und das Ziel nach Rückgängig/Wiederholen.

import type { Bautagebucheintrag, Mangel, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { bautagebuchPfad, bautagebuchZiel, bauleitungRoute, maengelPfad, mangelZiel } from './pfad';

const P = 'p1' as ProjektId;

describe('Adressen', () => {
  it('bauen und lesen beide Seiten, andere Pfade nicht', () => {
    expect(maengelPfad(P)).toBe('/projekt/p1/maengel');
    expect(bautagebuchPfad(P)).toBe('/projekt/p1/bautagebuch');
    expect(bauleitungRoute('/projekt/p1/maengel')).toEqual({ art: 'maengel', projektId: P });
    expect(bauleitungRoute('/projekt/p1/bautagebuch')).toEqual({ art: 'bautagebuch', projektId: P });
    expect(bauleitungRoute('/projekt/p1')).toBeNull();
    expect(bauleitungRoute('/projekt/p1/maengel/x')).toBeNull();
    expect(bauleitungRoute('/projekt/p1/kosten')).toBeNull();
  });
});

describe('Ziel nach Undo/Redo', () => {
  const mcs = { mangel: { vorher: null, nachher: { id: 'm' } as Mangel } };
  const bcs = { bautagebucheintrag: { vorher: null, nachher: { id: 'b' } as Bautagebucheintrag } };
  it('wechselt auf die Liste und bleibt dort', () => {
    expect(mangelZiel(P, mcs, true, '/')).toBe('/projekt/p1/maengel');
    expect(mangelZiel(P, mcs, false, '/projekt/p1/maengel')).toBeNull();
    expect(bautagebuchZiel(P, bcs, true, '/projekt/p1/maengel')).toBe('/projekt/p1/bautagebuch');
    expect(bautagebuchZiel(P, bcs, false, '/projekt/p1/bautagebuch')).toBeNull();
  });
});
