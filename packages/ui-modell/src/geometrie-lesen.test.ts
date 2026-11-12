// SPDX-License-Identifier: AGPL-3.0-or-later
// Der Kern des Geometrie-Workers mit dem echten web-ifc (Node-Bauart derselben Version) auf einem selbst verfassten Modell.
import { IfcAPI } from 'web-ifc';
import { beforeAll, describe, expect, it } from 'vitest';
import { TEIL_FELDER } from './geometrie';
import { geometrieLesen, Lesefehler } from './geometrie-lesen';
import { globalId, ifcBytes, kleinesModell } from './testhilfe/ifc-erzeuger';

const api = new IfcAPI();
beforeAll(async () => {
  await api.Init();
});

const ausmass = (g: { min: readonly number[]; max: readonly number[] } | null): number[] =>
  g ? g.min.map((x, i) => Math.round(((g.max[i] ?? 0) - x) * 1000) / 1000) : [];

describe('geometrieLesen (web-ifc 0.0.78)', () => {
  const geometrie = (): ReturnType<typeof geometrieLesen> => geometrieLesen(api, ifcBytes(kleinesModell()));

  it('liefert die Bauteile mit Geometrie über ihre GlobalId, den Platzhalter ohne Geometrie, keinen Raum', () => {
    const g = geometrie();
    expect([...g.mitGeometrie].sort()).toEqual(
      [
        globalId('Wand', 1),
        globalId('Wand', 2),
        globalId('Wand', 3),
        globalId('Wand', 4),
        globalId('Platte', 1),
        globalId('Stuetze', 1),
        globalId('Fenster', 1),
      ].sort(),
    );
    expect(g.ohneGeometrie).toEqual([globalId('Platzhalter', 1)]);
    expect(g.globalIdJeIndex).toHaveLength(7);
  });

  it('fasst die Teile je Deckung zusammen: sechs deckende, das Fenster durchsichtig mit Deckkraft 0,4', () => {
    const g = geometrie();
    const deckend = g.gruppen.find((x) => !x.durchsichtig);
    const glas = g.gruppen.find((x) => x.durchsichtig);
    expect((deckend?.teile.length ?? 0) / TEIL_FELDER).toBe(6);
    expect((glas?.teile.length ?? 0) / TEIL_FELDER).toBe(1);
    expect(g.globalIdJeIndex[glas?.teile[0] ?? -1]).toBe(globalId('Fenster', 1));
    expect(glas?.farben[3]).toBeCloseTo(0.4, 5);
  });

  it('zieht die Öffnung von der Südwand ab und rechnet in Metern mit y oben', () => {
    const g = geometrie();
    const deckend = g.gruppen.find((x) => !x.durchsichtig);
    if (!deckend) throw new Error('keine deckende Gruppe');
    const sued = g.globalIdJeIndex.indexOf(globalId('Wand', 1));
    const nord = g.globalIdJeIndex.indexOf(globalId('Wand', 2));
    const indexzahl = (bauteil: number): number => {
      for (let t = 0; t < deckend.teile.length; t += TEIL_FELDER) {
        if (deckend.teile[t] === bauteil) return deckend.teile[t + 4] ?? 0;
      }
      return 0;
    };
    expect(indexzahl(nord)).toBe(36); // Quader: 12 Dreiecke
    expect(indexzahl(sued)).toBeGreaterThan(36);
    // 10,3 m (x) × 3,25 m (Bodenplatte unten bis Wand oben) × 8,3 m (IFC-y wird −z)
    expect(ausmass(g.grenzen)).toEqual([10.3, 3.25, 8.3]);
  });

  it('meldet eine Datei, die kein IFC ist, und eine leere Datei als nicht lesbar', () => {
    expect(() => geometrieLesen(api, new TextEncoder().encode('kein IFC'))).toThrow(Lesefehler);
    expect(() => geometrieLesen(api, new Uint8Array(0))).toThrow(Lesefehler);
  });
});
