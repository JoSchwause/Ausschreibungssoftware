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

describe('Befunde der Abbildung', () => {
  it('liefert die Befunde des Lesers als Prüfbefund (Quelle ifc-lesen), mit GlobalId, wenn sie ein Objekt betreffen', () => {
    const lesung = lesen([
      ...grundgeruest([
        '#3=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);',
        "#4=IFCCONVERSIONBASEDUNIT(#30,.AREAUNIT.,'square foot',#31);",
      ]),
      '#30=IFCDIMENSIONALEXPONENTS(2,0,0,0,0,0,0);',
      '#31=IFCMEASUREWITHUNIT(IFCAREAMEASURE(0.09290304),#32);',
      '#32=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);',
      `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
      `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
      `#102=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r102')}',$,$,$,(#100),#11);`,
      `#103=IFCELEMENTQUANTITY('${gid('q103')}',$,'Qto_WallBaseQuantities',$,$,(#104));`,
      "#104=IFCQUANTITYAREA('NetSideArea',$,$,100.,$);",
      `#105=IFCRELDEFINESBYPROPERTIES('${gid('r105')}',$,$,$,(#100),#103);`,
      `#110=IFCSLAB('${gid('decke')}',$,'Decke',$,$,$,$,$,.FLOOR.);`,
      `#111=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r111')}',$,$,$,(#110),#12);`,
    ]);
    expect(lesung.bauwerksmodell?.bauteile[0]?.mengen).toEqual([
      { satz: 'Qto_WallBaseQuantities', name: 'NetSideArea', art: 'flaeche', wert: '9.290' },
    ]);
    expect(lesung.befunde).toEqual([
      {
        schwere: 'warnung',
        quelle: 'ifc-lesen',
        code: 'bauteil-mehrfach-enthalten',
        meldung: '#100 steht in mehr als einem Strukturknoten; der erste gilt.',
        ort: { pfad: '#102', zeile: 23, globalId: gid('wand') },
      },
      {
        schwere: 'warnung',
        quelle: 'ifc-lesen',
        code: 'einheit-umgerechnet',
        meldung: expect.stringContaining('square foot') as string,
        ort: { pfad: '#4', zeile: 11 },
      },
      {
        schwere: 'warnung',
        quelle: 'ifc-lesen',
        code: 'bauteil-ohne-mengen',
        meldung: 'Decke (#110) hat keine Mengen (IfcElementQuantity).',
        ort: { pfad: '#110', zeile: 27, globalId: gid('decke') },
      },
    ]);
  });

  it.each([
    ['keine IFC-Datei', 'Hallo Welt', 'keine-ifc-datei'],
    ['ein anderes Schema', ifcText([], { schema: 'IFC4X3' }), 'schema-nicht-unterstuetzt'],
  ])('weist %s ohne Modell mit genau einem Fehler ab', (_fall, text, code) => {
    const lesung = bauwerksmodellLesen(bytes(text), KOPF);
    expect(lesung.bauwerksmodell).toBeNull();
    expect(lesung.befunde).toEqual([
      expect.objectContaining({ schwere: 'fehler', quelle: 'ifc-lesen', code }) as unknown,
    ]);
  });

  it('lässt eine Menge ohne Wert weg (nie 0), mit einem Befund je Objekt, Mengensatz und Name', () => {
    const lesung = lesen([
      ...grundgeruest(['#3=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);']),
      `#20=IFCELEMENTQUANTITY('${gid('q20')}',$,'Qto_BuildingStoreyBaseQuantities',$,$,(#21,#22));`,
      "#21=IFCQUANTITYLENGTH('GrossHeight',$,$,3.,$);",
      "#22=IFCQUANTITYAREA('GrossFloorArea',$,$,120.,$);",
      `#23=IFCRELDEFINESBYPROPERTIES('${gid('r23')}',$,$,$,(#12),#20);`,
      `#100=IFCWALL('${gid('wand1')}',$,'Wand 1',$,$,$,$,$,$);`,
      `#101=IFCWALL('${gid('wand2')}',$,'Wand 2',$,$,$,$,$,$);`,
      `#102=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r102')}',$,$,$,(#100,#101),#12);`,
      `#110=IFCWALLTYPE('${gid('typ')}',$,'IW',$,$,(#111),$,$,$,.STANDARD.);`,
      `#111=IFCELEMENTQUANTITY('${gid('q111')}',$,$,$,$,(#112,#113));`,
      "#112=IFCQUANTITYLENGTH('Width',$,$,0.24,$);",
      "#113=IFCQUANTITYLENGTH('Length',$,$,$,$);",
      `#114=IFCRELDEFINESBYTYPE('${gid('r114')}',$,$,$,(#100,#101),#110);`,
    ]);
    const modell = lesung.bauwerksmodell;
    expect(modell?.struktur[3]?.mengen).toEqual([
      { satz: 'Qto_BuildingStoreyBaseQuantities', name: 'GrossHeight', art: 'laenge', wert: '3.000' },
    ]);
    const breite = { satz: null, name: 'Width', art: 'laenge', wert: '0.240' };
    expect(modell?.bauteile.map((b) => b.mengen)).toEqual([[breite], [breite]]);
    expect(lesung.befunde.map((b) => b.code)).toEqual([
      'einheit-fehlt',
      'menge-ungueltig',
      'menge-ohne-wert',
      'menge-ohne-wert',
      'menge-ohne-wert',
    ]);
    expect(lesung.befunde.slice(2)).toEqual([
      {
        schwere: 'fehler',
        quelle: 'ifc-lesen',
        code: 'menge-ohne-wert',
        meldung:
          'Die Menge GrossFloorArea (Qto_BuildingStoreyBaseQuantities) von EG (#12) hat keinen Wert und fehlt im Bauwerksmodell (nie 0).',
        ort: { pfad: '#22', zeile: 19, globalId: gid('eg') },
      },
      {
        schwere: 'fehler',
        quelle: 'ifc-lesen',
        code: 'menge-ohne-wert',
        meldung:
          'Die Menge Length (ohne Mengensatz) von Wand 1 (#100) hat keinen Wert und fehlt im Bauwerksmodell (nie 0).',
        ort: { pfad: '#113', zeile: 27, globalId: gid('wand1') },
      },
      {
        schwere: 'fehler',
        quelle: 'ifc-lesen',
        code: 'menge-ohne-wert',
        meldung:
          'Die Menge Length (ohne Mengensatz) von Wand 2 (#101) hat keinen Wert und fehlt im Bauwerksmodell (nie 0).',
        ort: { pfad: '#113', zeile: 27, globalId: gid('wand2') },
      },
    ]);
  });

  it('weist eine Datei über der Größengrenze ab', () => {
    const lesung = bauwerksmodellLesen(bytes(ifcText(grundgeruest())), KOPF, { maxBytes: 100 });
    expect(lesung.bauwerksmodell).toBeNull();
    expect(lesung.befunde.map((b) => b.code)).toEqual(['eingabe-zu-gross']);
  });
});
