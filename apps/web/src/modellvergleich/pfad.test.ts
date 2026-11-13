// SPDX-License-Identifier: AGPL-3.0-or-later
import type { BauwerksmodellId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { bimRoute } from '../bim/pfad';
import { vergleichPfad, vergleichRoute } from './pfad';

const P = 'p 1' as ProjektId;
const NEU = 'm2' as BauwerksmodellId;
const ALT = 'm1' as BauwerksmodellId;

describe('Adresse der Vergleichsseite', () => {
  it('mit und ohne alten Stand (Standard: der Vorgänger), hin und zurück', () => {
    expect(vergleichPfad(P, NEU)).toBe('/projekt/p%201/modelle/m2/vergleich');
    expect(vergleichPfad(P, NEU, ALT)).toBe('/projekt/p%201/modelle/m2/vergleich/m1');
    expect(vergleichRoute(vergleichPfad(P, NEU))).toEqual({ projektId: P, neuId: NEU, altId: null });
    expect(vergleichRoute(vergleichPfad(P, NEU, ALT))).toEqual({ projektId: P, neuId: NEU, altId: ALT });
  });

  it('andere Pfade sind keine Vergleichsseite; die Modellseiten erkennen sie nicht', () => {
    expect(vergleichRoute('/projekt/p/modelle/m2')).toBeNull();
    expect(vergleichRoute('/projekt/p/modelle/m2/vergleich/m1/x')).toBeNull();
    expect(bimRoute(vergleichPfad(P, NEU, ALT))).toBeNull();
  });
});
