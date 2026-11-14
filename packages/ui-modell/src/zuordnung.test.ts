// SPDX-License-Identifier: AGPL-3.0-or-later
import type { IfcGlobalId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { Bauteilverzeichnis, zuordnen } from './zuordnung';

const wand = { expressId: 10, globalId: '0Wand00000000000000001' as IfcGlobalId, klasse: 'IFCWALL' };
const decke = { expressId: 20, globalId: '0Decke0000000000000001' as IfcGlobalId, klasse: 'IFCSLAB' };
const platzhalter = {
  expressId: 30,
  globalId: '0Platz0000000000000001' as IfcGlobalId,
  klasse: 'IFCBUILDINGELEMENTPROXY',
};
const oeffnung = {
  expressId: 40,
  globalId: '0Oeff00000000000000001' as IfcGlobalId,
  klasse: 'IFCOPENINGELEMENT',
};

describe('zuordnen: expressID der Geometrie → Bauteil mit GlobalId', () => {
  it('nummeriert die Bauteile in der Reihenfolge der Geometrie und meldet Bauteile ohne Geometrie', () => {
    const z = zuordnen([wand, decke, platzhalter], [20, 10]);
    expect(z.mitGeometrie).toEqual(['0Decke0000000000000001', '0Wand00000000000000001']);
    expect(z.indexJeExpressId.get(20)).toBe(0);
    expect(z.indexJeExpressId.get(10)).toBe(1);
    expect(z.ohneGeometrie).toEqual(['0Platz0000000000000001']);
  });

  it('zeichnet nur Bauteile: Öffnungen, virtuelle Elemente und Nicht-Elemente (Raum, Grundstück) bleiben weg', () => {
    const virtuell = {
      expressId: 50,
      globalId: '0Virt00000000000000001' as IfcGlobalId,
      klasse: 'IFCVIRTUALELEMENT',
    };
    const oeffnungNorm = {
      expressId: 60,
      globalId: '0Oeff00000000000000002' as IfcGlobalId,
      klasse: 'IfcOpeningStandardCase',
    };
    // 70 ist ein Raum (kein IfcElement, steht nicht in der Elementliste), hat aber Geometrie
    const z = zuordnen([wand, oeffnung, virtuell, oeffnungNorm], [40, 10, 70, 50, 60]);
    expect(z.mitGeometrie).toEqual(['0Wand00000000000000001']);
    expect([...z.indexJeExpressId.entries()]).toEqual([[10, 0]]);
    // ausgeschlossene Klassen sind auch ohne Geometrie keine Bauteile
    expect(z.ohneGeometrie).toEqual([]);
  });

  it('meldet jede GlobalId einmal, auch wenn web-ifc ein Bauteil zweimal liefert', () => {
    const z = zuordnen([wand], [10, 10]);
    expect(z.mitGeometrie).toEqual(['0Wand00000000000000001']);
    expect(z.indexJeExpressId.get(10)).toBe(0);
  });

  it('zeichnet beide Bauteile einer doppelten GlobalId und nennt die GlobalId einmal', () => {
    const zwilling = { ...wand, expressId: 11 };
    const z = zuordnen([wand, zwilling, platzhalter, { ...platzhalter, expressId: 31 }], [10, 11]);
    expect(z.indexJeExpressId.get(10)).toBe(0);
    expect(z.indexJeExpressId.get(11)).toBe(1);
    expect(z.globalIdJeIndex).toEqual(['0Wand00000000000000001', '0Wand00000000000000001']);
    expect(z.mitGeometrie).toEqual(['0Wand00000000000000001']);
    expect(z.ohneGeometrie).toEqual(['0Platz0000000000000001']);
  });

  it('nennt eine GlobalId mit und ohne Geometrie nur unter „mit Geometrie“', () => {
    const z = zuordnen([wand, { ...wand, expressId: 12 }], [10]);
    expect(z.mitGeometrie).toEqual(['0Wand00000000000000001']);
    expect(z.ohneGeometrie).toEqual([]);
  });
});

describe('Bauteilverzeichnis: GlobalId ↔ Bauteilindex', () => {
  const v = new Bauteilverzeichnis(['A', 'B', 'A', 'C'] as IfcGlobalId[]);

  it('kennt die GlobalId je Index und die Indizes je GlobalId, doppelte eingeschlossen', () => {
    expect(v.anzahl).toBe(4);
    expect(v.globalId(1)).toBe('B');
    expect(v.indizes('A' as IfcGlobalId)).toEqual([0, 2]);
    expect(v.indizes('C' as IfcGlobalId)).toEqual([3]);
  });

  it('übergeht unbekannte GlobalIds', () => {
    expect(v.indizes('X' as IfcGlobalId)).toEqual([]);
    expect(v.enthaelt('X' as IfcGlobalId)).toBe(false);
    expect(v.enthaelt('B' as IfcGlobalId)).toBe(true);
  });
});
