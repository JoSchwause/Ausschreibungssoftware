// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { Geometriesammler, TEIL_FELDER } from './geometrie';

/** Ein Dreieck mit drei Ecken (x, y, z, nx, ny, nz). */
const dreieck = (n: readonly [number, number, number] = [0, 0, 1]): Float32Array =>
  new Float32Array([0, 0, 0, ...n, 1, 0, 0, ...n, 0, 1, 0, ...n]);
const EINHEIT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// So liefert web-ifc die Lage: z oben (IFC) wird y oben (x, y, z) → (x, z, −y), dazu eine Verschiebung (spaltenweise)
const Z_NACH_Y_VERSCHOBEN = [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 10, 20, 30, 1];

const nahe = (ist: ArrayLike<number>, soll: readonly number[]): void => {
  expect(ist.length).toBe(soll.length);
  soll.forEach((x, i) => {
    expect(ist[i]).toBeCloseTo(x, 5);
  });
};

describe('Geometriesammler: Teile je Deckung in einem Puffer, Lage eingerechnet', () => {
  it('übernimmt ein Teil mit Einheitslage unverändert und merkt Bauteil, Bereich und Grenzen', () => {
    const s = new Geometriesammler();
    s.hinzufuegen({
      bauteil: 7,
      ecken: dreieck(),
      dreiecke: new Uint32Array([0, 1, 2]),
      lage: EINHEIT,
      farbe: [0.5, 0.25, 1, 1],
    });
    const [g] = s.fertig();
    if (!g) throw new Error('keine Gruppe');
    expect(g.durchsichtig).toBe(false);
    nahe(g.positionen, [0, 0, 0, 1, 0, 0, 0, 1, 0]);
    nahe(g.normalen, [0, 0, 1, 0, 0, 1, 0, 0, 1]);
    expect([...g.indizes]).toEqual([0, 1, 2]);
    expect(TEIL_FELDER).toBe(5);
    expect([...g.teile]).toEqual([7, 0, 3, 0, 3]);
    nahe(g.farben, [0.5, 0.25, 1, 1]);
    nahe(g.grenzen, [0, 0, 0, 1, 1, 0]);
  });

  it('rechnet die Lage von web-ifc ein: Ecken mit Drehung und Verschiebung, Normalen nur gedreht', () => {
    const s = new Geometriesammler();
    s.hinzufuegen({
      bauteil: 0,
      ecken: new Float32Array([1, 2, 3, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0]),
      dreiecke: new Uint32Array([0, 1, 2]),
      lage: Z_NACH_Y_VERSCHOBEN,
      farbe: [1, 1, 1, 1],
    });
    const [g] = s.fertig();
    nahe(g?.positionen ?? [], [11, 23, 28, 10, 20, 30, 10, 21, 30]);
    nahe(g?.normalen ?? [], [0, 1, 0, 0, 0, -1, 1, 0, 0]);
    nahe(g?.grenzen ?? [], [10, 20, 28, 11, 23, 30]);
  });

  it('hält Normalen bei ungleicher Streckung senkrecht zur Fläche und auf Länge 1', () => {
    const s = new Geometriesammler();
    s.hinzufuegen({
      bauteil: 0,
      ecken: dreieck([Math.SQRT1_2, Math.SQRT1_2, 0]),
      dreiecke: new Uint32Array([0, 1, 2]),
      lage: [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      farbe: [1, 1, 1, 1],
    });
    // inverse Transponierte von diag(2, 1, 1): (0,5 · 0,707; 0,707; 0), normiert
    const l = Math.hypot(0.5, 1);
    nahe((s.fertig()[0]?.normalen ?? []).slice(0, 3), [0.5 / l, 1 / l, 0]);
  });

  it('trennt deckende und durchsichtige Teile; Dreiecke bleiben je Teil ab 0 gezählt', () => {
    const s = new Geometriesammler();
    const teil = { ecken: dreieck(), dreiecke: new Uint32Array([0, 1, 2]), lage: EINHEIT };
    s.hinzufuegen({ ...teil, bauteil: 0, farbe: [1, 0, 0, 1] });
    s.hinzufuegen({ ...teil, bauteil: 1, farbe: [0, 0, 1, 0.4] });
    s.hinzufuegen({ ...teil, bauteil: 2, farbe: [0, 1, 0, 1] });
    const gruppen = s.fertig();
    const deckend = gruppen.find((g) => !g.durchsichtig);
    const durchsichtig = gruppen.find((g) => g.durchsichtig);
    expect([...(deckend?.teile ?? [])]).toEqual([0, 0, 3, 0, 3, 2, 3, 3, 3, 3]);
    expect([...(deckend?.indizes ?? [])]).toEqual([0, 1, 2, 0, 1, 2]);
    expect([...(durchsichtig?.teile ?? [])]).toEqual([1, 0, 3, 0, 3]);
    nahe(durchsichtig?.farben ?? [], [0, 0, 1, 0.4]);
  });

  it('liefert keine leeren Gruppen und die Grenzen des ganzen Modells', () => {
    const s = new Geometriesammler();
    expect(s.fertig()).toEqual([]);
    expect(s.grenzen()).toBeNull();
    s.hinzufuegen({
      bauteil: 0,
      ecken: dreieck(),
      dreiecke: new Uint32Array([0, 1, 2]),
      lage: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -5, 0, 2, 1],
      farbe: [1, 1, 1, 1],
    });
    s.hinzufuegen({
      bauteil: 1,
      ecken: dreieck(),
      dreiecke: new Uint32Array([0, 1, 2]),
      lage: EINHEIT,
      farbe: [1, 1, 1, 0.5],
    });
    expect(s.fertig()).toHaveLength(2);
    expect(s.grenzen()).toEqual({ min: [-5, 0, 0], max: [1, 1, 2] });
  });
});
