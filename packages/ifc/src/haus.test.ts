// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests mit den Hausmodellen aus Ticket 99 (`fixtures/ifc/`, Ticket 98, Punkt 10). Die Sollwerte stehen in
// `fixtures/typisch-bim.json`; das Fixture-Skript rechnet sie aus der Geometrie in ganzen Zahlen, unabhängig von diesem
// Paket (C4). Dazu das große Modell aus dem Erzeuger in klein (das Budget mit 10.000 Bauteilen prüft Ticket 107).

import { describe, expect, it } from 'vitest';
import { erzeugeModell } from '../../../fixtures/ifc/erzeugen.mjs';
import { ifcLesen } from './lesen';
import type { StepBauwerksmodell } from './typen';
import { bytes, fixtureBytes, fixtureJson } from './testhilfen';

interface Sollmenge {
  readonly name: string;
  readonly art: string;
  readonly wert: string;
}

interface Sollbauteil {
  readonly globalId: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
  readonly mengen: readonly Sollmenge[];
}

interface Soll {
  readonly bauteile: { readonly v1: readonly Sollbauteil[]; readonly v2: readonly Sollbauteil[] };
  readonly erweitert: {
    readonly din277: {
      readonly geschosse: readonly { globalId: string; name: string; bgf: string; bri: string }[];
      readonly raeume: readonly { globalId: string; name: string; geschoss: string; nrf: string }[];
    };
  };
}

const SOLL = fixtureJson('typisch-bim.json') as Soll;

/** Liest eine Hausdatei; sie hat keinen Befund. */
function lesen(datei: string): StepBauwerksmodell {
  const lesung = ifcLesen(fixtureBytes(`ifc/${datei}`));
  expect(lesung.befunde).toEqual([]);
  expect(lesung.modell).not.toBeNull();
  return lesung.modell as StepBauwerksmodell;
}

/** Bauteile in der Form der Sollwerte: Geschoss über den Namen des Strukturknotens, Mengen ohne Satz. */
function inSollform(modell: StepBauwerksmodell): Sollbauteil[] {
  const knotenname = new Map(modell.struktur.map((k) => [k.globalId, k.name ?? '']));
  return modell.bauteile.map((b) => ({
    globalId: b.globalId,
    klasse: b.ifcKlasse,
    name: b.name ?? '',
    geschoss: knotenname.get(b.strukturGlobalId ?? '') ?? '',
    mengen: b.mengen.map((m) => ({ name: m.name, art: m.art, wert: m.wert ?? '' })),
  }));
}

/** Sollwerte ohne die Felder, die der Leser nicht kennt (Kennung, exakter Wert, Herleitung). */
function knapp(soll: readonly Sollbauteil[]): Sollbauteil[] {
  const nachGlobalId = (a: Sollbauteil, b: Sollbauteil) => a.globalId.localeCompare(b.globalId);
  return soll
    .map((s) => ({
      globalId: s.globalId,
      klasse: s.klasse,
      name: s.name,
      geschoss: s.geschoss,
      mengen: s.mengen.map((m) => ({ name: m.name, art: m.art, wert: m.wert })),
    }))
    .sort(nachGlobalId);
}

const sortiert = (liste: Sollbauteil[]) => [...liste].sort((a, b) => a.globalId.localeCompare(b.globalId));

describe('Hausmodelle aus Ticket 99', () => {
  it('haus-v1.ifc (IFC 4, m): 30 Bauteile mit Klasse, Name, Geschoss und Mengen wie die Sollwerte', () => {
    const modell = lesen('haus-v1.ifc');
    expect(modell.schema).toBe('IFC4');
    expect(sortiert(inSollform(modell))).toEqual(knapp(SOLL.bauteile.v1));
  });

  it('haus-v1-ifc2x3.ifc (IFC 2x3, mm) liest sich wie haus-v1.ifc', () => {
    const ifc4 = lesen('haus-v1.ifc');
    const ifc2x3 = lesen('haus-v1-ifc2x3.ifc');
    expect(ifc2x3.schema).toBe('IFC2X3');
    expect(ifc2x3.struktur).toEqual(ifc4.struktur);
    expect(ifc2x3.bauteile).toEqual(ifc4.bauteile);
  });

  it('haus-v2.ifc: 30 Bauteile wie die Sollwerte des zweiten Stands', () => {
    expect(sortiert(inSollform(lesen('haus-v2.ifc')))).toEqual(knapp(SOLL.bauteile.v2));
  });

  it('Geschosse und Räume tragen die Mengen der DIN-277-Sollwerte', () => {
    const modell = lesen('haus-v1.ifc');
    const knoten = new Map(modell.struktur.map((k) => [k.globalId, k]));
    const wert = (globalId: string, name: string) =>
      knoten.get(globalId)?.mengen.find((m) => m.name === name)?.wert;
    for (const g of SOLL.erweitert.din277.geschosse) {
      expect(knoten.get(g.globalId)?.art).toBe('geschoss');
      expect(knoten.get(g.globalId)?.name).toBe(g.name);
      expect(wert(g.globalId, 'GrossFloorArea')).toBe(g.bgf);
      expect(wert(g.globalId, 'GrossVolume')).toBe(g.bri);
    }
    const geschossId = new Map(SOLL.erweitert.din277.geschosse.map((g) => [g.name, g.globalId]));
    for (const r of SOLL.erweitert.din277.raeume) {
      expect(knoten.get(r.globalId)?.art).toBe('raum');
      expect(knoten.get(r.globalId)?.name).toBe(r.name);
      expect(knoten.get(r.globalId)?.elternGlobalId).toBe(geschossId.get(r.geschoss));
      expect(wert(r.globalId, 'NetFloorArea')).toBe(r.nrf);
    }
  });

  it('liest ein Modell des Erzeugers (600 Bauteile auf 3 Geschossen) ohne Befund', () => {
    const lesung = ifcLesen(bytes(erzeugeModell({ bauteile: 600, geschosse: 3 })));
    expect(lesung.befunde).toEqual([]);
    expect(lesung.modell?.bauteile).toHaveLength(600);
    expect(lesung.modell?.struktur.filter((k) => k.art === 'geschoss')).toHaveLength(3);
    expect(lesung.modell?.bauteile.every((b) => b.strukturGlobalId !== null && b.mengen.length > 0)).toBe(
      true,
    );
  });
});
