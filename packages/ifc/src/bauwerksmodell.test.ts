// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Abbildung auf den Vertrag (Ticket 107, Punkt 1; vertrag v1.6): `bauwerksmodellLesen` liest die Datei und
// liefert ein `Bauwerksmodell` mit dem Kopf des Aufrufers und `Pruefbefund`e mit der Quelle `ifc-lesen`. Sollwerte von Hand,
// abgelesen aus den selbst verfassten IFC-Texten (C4).

import type { BauwerksmodellId, BauwerksmodellKopf, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { bauwerksmodellLesen } from './index';
import { bytes, gid, grundgeruest, ifcText } from './testhilfen';

/** Was die App beim Einlesen vorgibt (Kennung, Projekt, Name, Datei, Vorgänger, Tag); das Schema kommt aus der Datei. */
const KOPF: Omit<BauwerksmodellKopf, 'schema'> = {
  id: '0193a1b2-0000-7000-8000-000000000107' as BauwerksmodellId,
  projektId: '0193a1b2-0000-7000-8000-000000000001' as ProjektId,
  name: 'Haus',
  datei: { hash: 'ab'.repeat(32), dateiname: 'haus.ifc', groesse: 4711 },
  vorgaengerId: null,
  eingelesen: '2026-11-12',
};

/** Wand #100 im EG (#12) mit einem Mengensatz; dazu die gegebenen Zeilen. */
const WAND: readonly string[] = [
  `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
  `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
  `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto_WallBaseQuantities',$,$,(#103));`,
  "#103=IFCQUANTITYLENGTH('Length',$,$,5.,$);",
  `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
];

function lesen(zeilen: readonly string[], kopf = KOPF) {
  return bauwerksmodellLesen(bytes(ifcText(zeilen)), kopf);
}

/** Die Struktur des Grundgerüsts der Testhilfen, wie sie im Bauwerksmodell steht. */
const STRUKTUR = [
  { globalId: gid('projekt'), art: 'projekt', name: 'Projekt', elternGlobalId: null, mengen: [] },
  {
    globalId: gid('grundstueck'),
    art: 'grundstueck',
    name: 'Grundstück',
    elternGlobalId: gid('projekt'),
    mengen: [],
  },
  { globalId: gid('gebaeude'), art: 'gebaeude', name: 'Haus', elternGlobalId: gid('grundstueck'), mengen: [] },
  { globalId: gid('eg'), art: 'geschoss', name: 'EG', elternGlobalId: gid('gebaeude'), mengen: [] },
];

describe('bauwerksmodellLesen', () => {
  it('bildet Kopf, Schema, Struktur und Bauteile auf das Bauwerksmodell des Vertrags ab', () => {
    const lesung = lesen([...grundgeruest(), ...WAND]);
    expect(lesung.befunde).toEqual([]);
    expect(lesung.bauwerksmodell).toStrictEqual({
      id: KOPF.id,
      projektId: KOPF.projektId,
      name: 'Haus',
      datei: { hash: 'ab'.repeat(32), dateiname: 'haus.ifc', groesse: 4711 },
      schema: 'IFC4',
      vorgaengerId: null,
      eingelesen: '2026-11-12',
      struktur: STRUKTUR,
      bauteile: [
        {
          globalId: gid('wand'),
          ifcKlasse: 'IfcWall',
          name: 'Wand',
          typ: null,
          strukturGlobalId: gid('eg'),
          mengen: [{ satz: 'Qto_WallBaseQuantities', name: 'Length', art: 'laenge', wert: '5.000' }],
        },
      ],
    });
  });

  it('nennt das Ganze eines Teils, den Typnamen und den Kostengruppen-Vorschlag; fehlen sie, fehlt das Feld', () => {
    const lesung = lesen([
      ...grundgeruest(),
      `#100=IFCSTAIR('${gid('treppe')}',$,'Treppe',$,$,$,$,$,.STRAIGHT_RUN_STAIR.);`,
      `#101=IFCSTAIRFLIGHT('${gid('lauf')}',$,'Lauf',$,$,$,$,$,12,11,0.175,0.28,$);`,
      `#102=IFCRELAGGREGATES('${gid('r102')}',$,$,$,#100,(#101));`,
      `#103=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r103')}',$,$,$,(#100),#12);`,
      `#104=IFCSTAIRTYPE('${gid('typ')}',$,'Holztreppe',$,$,$,$,$,$,.STRAIGHT_RUN_STAIR.);`,
      `#105=IFCRELDEFINESBYTYPE('${gid('r105')}',$,$,$,(#100),#104);`,
      "#106=IFCCLASSIFICATION('DIN',$,$,'DIN 276',$,$,$);",
      "#107=IFCCLASSIFICATIONREFERENCE($,'351',$,#106,$,$);",
      `#108=IFCRELASSOCIATESCLASSIFICATION('${gid('r108')}',$,$,$,(#100),#107);`,
      `#110=IFCELEMENTQUANTITY('${gid('q110')}',$,'Qto_StairBaseQuantities',$,$,(#111));`,
      "#111=IFCQUANTITYCOUNT('NumberOfRiser',$,$,12.,$);",
      `#112=IFCRELDEFINESBYPROPERTIES('${gid('r112')}',$,$,$,(#100,#101),#110);`,
    ]);
    expect(lesung.befunde).toEqual([]);
    const menge = { satz: 'Qto_StairBaseQuantities', name: 'NumberOfRiser', art: 'anzahl', wert: '12.000' };
    expect(lesung.bauwerksmodell?.bauteile).toStrictEqual([
      {
        globalId: gid('treppe'),
        ifcKlasse: 'IfcStair',
        name: 'Treppe',
        typ: 'Holztreppe',
        strukturGlobalId: gid('eg'),
        kostengruppe: '351',
        mengen: [menge],
      },
      {
        globalId: gid('lauf'),
        ifcKlasse: 'IfcStairFlight',
        name: 'Lauf',
        typ: null,
        strukturGlobalId: gid('eg'),
        teilVonGlobalId: gid('treppe'),
        mengen: [menge],
      },
    ]);
  });
});
