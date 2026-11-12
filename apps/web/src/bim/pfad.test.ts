// SPDX-License-Identifier: AGPL-3.0-or-later
import type {
  BauwerksmodellChangeSet,
  BauwerksmodellId,
  BauwerksmodellKopf,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { bimRoute, bimZiel, modellPfad, modellePfad } from './pfad';

const p = 'p1' as ProjektId;
const m = 'm1' as BauwerksmodellId;
const kopf = (name: string): BauwerksmodellKopf => ({
  id: m,
  projektId: p,
  name,
  datei: { hash: 'a'.repeat(64), dateiname: 'haus.ifc', groesse: 3 },
  schema: 'IFC4',
  vorgaengerId: null,
  eingelesen: '2026-11-12',
});
const inhalt = { struktur: [], bauteile: [] };

describe('Pfade der Modellseiten', () => {
  it('Adressen und Erkennung passen zueinander', () => {
    expect(modellePfad(p)).toBe('/projekt/p1/modelle');
    expect(bimRoute(modellePfad(p))).toEqual({ art: 'liste', projektId: p });
    expect(bimRoute(modellPfad(p, m))).toEqual({ art: 'modell', projektId: p, id: m });
  });

  it('andere Pfade sind keine Modellseiten', () => {
    expect(bimRoute('/projekt/p1')).toBeNull();
    expect(bimRoute('/projekt/p1/kosten')).toBeNull();
    expect(bimRoute('/projekt/p1/modelle/a/b')).toBeNull();
  });
});

describe('bimZiel nach Undo/Redo', () => {
  const angelegt: BauwerksmodellChangeSet = {
    art: 'bauwerksmodell',
    bauwerksmodellId: m,
    kopf: { vorher: null, nachher: kopf('Haus') },
    inhalt: { vorher: null, nachher: inhalt },
  };
  const umbenannt: BauwerksmodellChangeSet = {
    art: 'bauwerksmodell',
    bauwerksmodellId: m,
    kopf: { vorher: kopf('Haus'), nachher: kopf('Haus neu') },
  };

  it('Rückgängig eines Einlesens führt in die Liste (das Modell ist weg), von dort bleibt es', () => {
    expect(bimZiel(p, angelegt, true, '/projekt/p1/modelle/m1')).toBe('/projekt/p1/modelle');
    expect(bimZiel(p, angelegt, true, '/projekt/p1/modelle')).toBeNull();
  });

  it('Wiederholen eines Einlesens: die Liste zeigt das Modell', () => {
    expect(bimZiel(p, angelegt, false, '/')).toBe('/projekt/p1/modelle');
    expect(bimZiel(p, angelegt, false, '/projekt/p1/modelle')).toBeNull();
  });

  it('Umbenennen ist in der Liste und auf der Modellseite sichtbar: dort bleiben, sonst in die Liste', () => {
    expect(bimZiel(p, umbenannt, true, '/projekt/p1/modelle/m1')).toBeNull();
    expect(bimZiel(p, umbenannt, true, '/projekt/p1/modelle')).toBeNull();
    expect(bimZiel(p, umbenannt, false, '/projekt/p1')).toBe('/projekt/p1/modelle');
  });
});
