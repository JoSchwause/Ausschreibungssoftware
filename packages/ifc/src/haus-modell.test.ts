// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Abbildung mit den Hausmodellen aus Ticket 99 (Ticket 107, Punkt 3): `haus-v1.ifc` (IFC 4, m) und
// `haus-v1-ifc2x3.ifc` (IFC 2x3, mm) ergeben dasselbe Bauwerksmodell bis auf das Schema, passend zu
// `fixtures/typisch-bim.json`; `haus-v2.ifc` trägt die erwarteten Änderungen (`erweitert.vergleich`). Die Sollwerte rechnet
// das Fixture-Skript aus der Geometrie, unabhängig von diesem Paket (C4).

import type { Bauwerksmodell, BauwerksmodellId, BauwerksmodellKopf, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { bauwerksmodellLesen } from './index';
import { fixtureBytes, fixtureJson } from './testhilfen';

interface Sollbauteil {
  readonly globalId: string;
  readonly klasse: string;
  readonly name: string;
  readonly geschoss: string;
  readonly mengen: readonly { readonly name: string; readonly art: string; readonly wert: string }[];
}

interface Mengenaenderung {
  readonly name: string;
  readonly vorher: string;
  readonly nachher: string;
}

interface Soll {
  readonly modelle: readonly { readonly stand: string; readonly datei: string; readonly schema: string }[];
  readonly bauteile: { readonly v1: readonly Sollbauteil[]; readonly v2: readonly Sollbauteil[] };
  readonly erweitert: {
    readonly din277: {
      readonly geschosse: readonly { globalId: string; name: string; bgf: string; bri: string }[];
      readonly raeume: readonly { globalId: string; name: string; geschoss: string; nrf: string }[];
    };
    readonly vergleich: {
      readonly hinzugefuegt: readonly { readonly globalId: string }[];
      readonly entfernt: readonly { readonly globalId: string }[];
      readonly geaendert: readonly {
        readonly globalId: string;
        readonly felder: readonly string[];
        readonly name?: { readonly vorher: string; readonly nachher: string };
        readonly strukturknoten?: { readonly vorher: string; readonly nachher: string };
        readonly mengen?: readonly Mengenaenderung[];
      }[];
    };
  };
}

const SOLL = fixtureJson('typisch-bim.json') as Soll;

function kopf(dateiname: string): Omit<BauwerksmodellKopf, 'schema'> {
  return {
    id: '0193a1b2-0000-7000-8000-000000000107' as BauwerksmodellId,
    projektId: '0193a1b2-0000-7000-8000-000000000001' as ProjektId,
    name: dateiname.replace(/\.ifc$/, ''),
    datei: { hash: '0'.repeat(64), dateiname, groesse: fixtureBytes(`ifc/${dateiname}`).length },
    vorgaengerId: null,
    eingelesen: '2026-11-12',
  };
}

/** Liest eine Hausdatei als Bauwerksmodell; sie hat keinen Befund. */
function lesen(dateiname: string): Bauwerksmodell {
  const lesung = bauwerksmodellLesen(fixtureBytes(`ifc/${dateiname}`), kopf(dateiname));
  expect(lesung.befunde).toEqual([]);
  expect(lesung.bauwerksmodell).not.toBeNull();
  return lesung.bauwerksmodell as Bauwerksmodell;
}

/**
 * Orakel aus dem Text der Datei (unabhängig vom Leser): GlobalId → Nummer der `IfcClassificationReference`, die eine
 * `IfcRelAssociatesClassification` dem Objekt zuordnet. Das Haus schreibt jede Instanz auf eine Zeile.
 */
function kostengruppenDerDatei(dateiname: string): Map<string, string> {
  const text = new TextDecoder().decode(fixtureBytes(`ifc/${dateiname}`));
  const globalId = new Map<string, string>();
  for (const [, n = '', g = ''] of text.matchAll(/^#(\d+)=IFC[A-Z]+\('([0-9A-Za-z_$]{22})'/gm))
    globalId.set(`#${n}`, g);
  const referenz = new Map<string, string>();
  for (const [, n = '', k = ''] of text.matchAll(/^#(\d+)=IFCCLASSIFICATIONREFERENCE\(\$,'(\d{3})'/gm))
    referenz.set(`#${n}`, k);
  const kg = new Map<string, string>();
  for (const [, objekte = '', ref = ''] of text.matchAll(
    /^#\d+=IFCRELASSOCIATESCLASSIFICATION\([^(]*\(([^)]*)\),(#\d+)\);/gm,
  ))
    for (const o of objekte.split(',')) kg.set(globalId.get(o) ?? '', referenz.get(ref) ?? '');
  return kg;
}

const geschossname = (modell: Bauwerksmodell) => {
  const name = new Map(modell.struktur.map((k) => [k.globalId as string, k.name ?? '']));
  return (globalId: string | null) => (globalId === null ? '' : (name.get(globalId) ?? ''));
};

/** Bauteile in der Form der Sollwerte, nach GlobalId sortiert. */
function inSollform(modell: Bauwerksmodell): Sollbauteil[] {
  const geschoss = geschossname(modell);
  return modell.bauteile
    .map((b) => ({
      globalId: b.globalId,
      klasse: b.ifcKlasse,
      name: b.name ?? '',
      geschoss: geschoss(b.strukturGlobalId),
      mengen: b.mengen.map((m) => ({ name: m.name, art: m.art, wert: m.wert })),
    }))
    .sort((a, b) => a.globalId.localeCompare(b.globalId));
}

function knapp(soll: readonly Sollbauteil[]): Sollbauteil[] {
  return soll
    .map((s) => ({
      globalId: s.globalId,
      klasse: s.klasse,
      name: s.name,
      geschoss: s.geschoss,
      mengen: s.mengen.map((m) => ({ name: m.name, art: m.art, wert: m.wert })),
    }))
    .sort((a, b) => a.globalId.localeCompare(b.globalId));
}

describe('Hausmodelle aus Ticket 99 als Bauwerksmodell', () => {
  it('haus-v1.ifc: Kopf des Aufrufers, Schema IFC4, 30 Bauteile mit Klasse, Name, Geschoss und Mengen wie die Sollwerte', () => {
    const modell = lesen('haus-v1.ifc');
    const { id, projektId, name, datei, vorgaengerId, eingelesen } = modell;
    expect({ id, projektId, name, datei, vorgaengerId, eingelesen }).toEqual(kopf('haus-v1.ifc'));
    expect(modell.schema).toBe(SOLL.modelle.find((m) => m.stand === 'v1')?.schema);
    expect(inSollform(modell)).toEqual(knapp(SOLL.bauteile.v1));
    // Das Haus hat keine Teile (das Feld fehlt ganz), aber je Bauteil eine DIN-276-Nummer (README „BIM: Haus und Tor X1“).
    const kg = kostengruppenDerDatei('haus-v1.ifc');
    expect(kg.size).toBe(30);
    for (const b of modell.bauteile) {
      expect(Object.keys(b)).toEqual([
        'globalId',
        'ifcKlasse',
        'name',
        'typ',
        'strukturGlobalId',
        'kostengruppe',
        'mengen',
      ]);
      expect(b.kostengruppe).toBe(kg.get(b.globalId));
      expect(b.mengen.every((m) => m.satz?.startsWith('Qto_'))).toBe(true);
    }
  });

  it('haus-v1-ifc2x3.ifc (IFC 2x3, mm) ergibt dasselbe Bauwerksmodell bis auf das Schema', () => {
    const ifc4 = lesen('haus-v1.ifc');
    const ifc2x3 = lesen('haus-v1-ifc2x3.ifc');
    expect(ifc2x3.schema).toBe('IFC2X3');
    expect({ ...ifc2x3, name: ifc4.name, datei: ifc4.datei, schema: 'IFC4' }).toEqual(ifc4);
  });

  it('Geschosse und Räume tragen die Mengen der DIN-277-Sollwerte', () => {
    const modell = lesen('haus-v1.ifc');
    const knoten = new Map(modell.struktur.map((k) => [k.globalId as string, k]));
    const wert = (globalId: string, name: string) =>
      knoten.get(globalId)?.mengen.find((m) => m.name === name)?.wert;
    for (const g of SOLL.erweitert.din277.geschosse) {
      expect(knoten.get(g.globalId)).toMatchObject({ art: 'geschoss', name: g.name });
      expect([wert(g.globalId, 'GrossFloorArea'), wert(g.globalId, 'GrossVolume')]).toEqual([g.bgf, g.bri]);
    }
    const geschossId = new Map(SOLL.erweitert.din277.geschosse.map((g) => [g.name, g.globalId]));
    for (const r of SOLL.erweitert.din277.raeume) {
      expect(knoten.get(r.globalId)).toMatchObject({
        art: 'raum',
        name: r.name,
        elternGlobalId: geschossId.get(r.geschoss),
      });
      expect(wert(r.globalId, 'NetFloorArea')).toBe(r.nrf);
    }
  });

  it('haus-v2.ifc: 30 Bauteile wie die Sollwerte des zweiten Stands, mit den erwarteten Änderungen gegen v1', () => {
    const v1 = lesen('haus-v1.ifc');
    const v2 = lesen('haus-v2.ifc');
    expect(inSollform(v2)).toEqual(knapp(SOLL.bauteile.v2));

    const vorher = new Map(v1.bauteile.map((b) => [b.globalId as string, b]));
    const nachher = new Map(v2.bauteile.map((b) => [b.globalId as string, b]));
    const geschossVorher = geschossname(v1);
    const geschossNachher = geschossname(v2);
    const soll = SOLL.erweitert.vergleich;
    expect(v2.bauteile.filter((b) => !vorher.has(b.globalId)).map((b) => b.globalId)).toEqual(
      soll.hinzugefuegt.map((b) => b.globalId),
    );
    expect(v1.bauteile.filter((b) => !nachher.has(b.globalId)).map((b) => b.globalId)).toEqual(
      soll.entfernt.map((b) => b.globalId),
    );
    const geaendert = v1.bauteile.flatMap((alt) => {
      const neu = nachher.get(alt.globalId);
      if (neu === undefined) return [];
      const mengen: Mengenaenderung[] = alt.mengen.flatMap((m) => {
        const n = neu.mengen.find((x) => x.name === m.name);
        return n === undefined || n.wert === m.wert
          ? []
          : [{ name: m.name, vorher: m.wert, nachher: n.wert }];
      });
      const felder = [
        ...(alt.ifcKlasse === neu.ifcKlasse ? [] : ['klasse']),
        ...(alt.name === neu.name ? [] : ['name']),
        ...(geschossVorher(alt.strukturGlobalId) === geschossNachher(neu.strukturGlobalId)
          ? []
          : ['strukturknoten']),
        ...(mengen.length === 0 ? [] : ['mengen']),
      ];
      return felder.length === 0 ? [] : [{ globalId: alt.globalId, felder, mengen }];
    });
    const sortiert = <T extends { globalId: string }>(liste: readonly T[]) =>
      [...liste].sort((a, b) => a.globalId.localeCompare(b.globalId));
    expect(sortiert(geaendert)).toEqual(
      sortiert(
        soll.geaendert.map((g) => ({ globalId: g.globalId, felder: g.felder, mengen: g.mengen ?? [] })),
      ),
    );
  });
});
