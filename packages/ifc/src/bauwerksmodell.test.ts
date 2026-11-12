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

describe('Objekte ohne GlobalId in Form', () => {
  it('fehlen im Modell; Verweise darauf entfallen mit Befund', () => {
    const lesung = lesen([
      ...grundgeruest(),
      "#16=IFCBUILDINGSTOREY('kaputt',$,'OG',$,$,$,$,$,.ELEMENT.,3.);",
      `#17=IFCRELAGGREGATES('${gid('r17')}',$,$,$,#11,(#16));`,
      `#18=IFCSPACE('${gid('raum')}',$,'Raum',$,$,$,$,$,.ELEMENT.,.INTERNAL.,$);`,
      `#19=IFCRELAGGREGATES('${gid('r19')}',$,$,$,#16,(#18));`,
      `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
      `#101=IFCSTAIR($,$,'Treppe',$,$,$,$,$,.STRAIGHT_RUN_STAIR.);`,
      `#102=IFCSTAIRFLIGHT('${gid('lauf')}',$,'Lauf',$,$,$,$,$,12,11,0.175,0.28,$);`,
      `#103=IFCRELAGGREGATES('${gid('r103')}',$,$,$,#101,(#102));`,
      `#104=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r104')}',$,$,$,(#100),#16);`,
      `#105=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r105')}',$,$,$,(#101),#12);`,
    ]);
    const modell = lesung.bauwerksmodell;
    expect(modell?.struktur.map((k) => [k.name, k.elternGlobalId])).toEqual([
      ['Projekt', null],
      ['Grundstück', gid('projekt')],
      ['Haus', gid('grundstueck')],
      ['EG', gid('gebaeude')],
      ['Raum', null],
    ]);
    expect(modell?.bauteile).toStrictEqual([
      { globalId: gid('wand'), ifcKlasse: 'IfcWall', name: 'Wand', typ: null, strukturGlobalId: null, mengen: [] },
      {
        globalId: gid('lauf'),
        ifcKlasse: 'IfcStairFlight',
        name: 'Lauf',
        typ: null,
        strukturGlobalId: gid('eg'),
        mengen: [],
      },
    ]);
    expect(lesung.befunde.map((b) => b.code)).toEqual([
      'globalid-ungueltig',
      'bauteil-ohne-mengen',
      'globalid-ungueltig',
      'bauteil-ohne-mengen',
      'bauteil-ohne-mengen',
      'strukturknoten-ohne-eltern',
      'bauteil-ohne-strukturknoten',
      'bauteil-ohne-ganzes',
    ]);
    expect(lesung.befunde[0]).toEqual({
      schwere: 'fehler',
      quelle: 'ifc-lesen',
      code: 'globalid-ungueltig',
      meldung:
        'Die GlobalId „kaputt“ von #16 ist nicht wohlgeformt (22 Zeichen aus 0-9, A-Z, a-z, _ und $). Ohne GlobalId in Form steht es nicht im Bauwerksmodell.',
      ort: { pfad: '#16', zeile: 21, feld: 'GlobalId' },
    });
    expect(lesung.befunde[2]?.meldung).toBe(
      '#101 hat keine GlobalId. Ohne GlobalId in Form steht es nicht im Bauwerksmodell.',
    );
    expect(lesung.befunde.slice(5)).toEqual([
      {
        schwere: 'warnung',
        quelle: 'ifc-lesen',
        code: 'strukturknoten-ohne-eltern',
        meldung:
          'Raum (#18) hängt an #16, das nicht im Bauwerksmodell steht (keine GlobalId in Form oder nicht lesbar); im Modell hat es keine Eltern.',
        ort: { pfad: '#18', zeile: 23, globalId: gid('raum') },
      },
      {
        schwere: 'warnung',
        quelle: 'ifc-lesen',
        code: 'bauteil-ohne-strukturknoten',
        meldung:
          'Wand (#100) steht in #16, das nicht im Bauwerksmodell steht (keine GlobalId in Form oder nicht lesbar); im Modell steht es in keinem Strukturknoten.',
        ort: { pfad: '#100', zeile: 25, globalId: gid('wand') },
      },
      {
        schwere: 'warnung',
        quelle: 'ifc-lesen',
        code: 'bauteil-ohne-ganzes',
        meldung:
          'Lauf (#102) ist Teil von #101, das nicht im Bauwerksmodell steht (keine GlobalId in Form oder nicht lesbar); im Modell ist es kein Teil.',
        ort: { pfad: '#102', zeile: 27, globalId: gid('lauf') },
      },
    ]);
  });
});

describe('Doppelte GlobalIds (D-66)', () => {
  it('behält beide Objekte; ein Verweis auf ein späteres Objekt entfällt mit Befund, weil er das erste meinen würde', () => {
    const lesung = lesen([
      ...grundgeruest(),
      `#16=IFCBUILDINGSTOREY('${gid('eg')}',$,'OG',$,$,$,$,$,.ELEMENT.,3.);`,
      `#17=IFCRELAGGREGATES('${gid('r17')}',$,$,$,#11,(#16));`,
      `#18=IFCSPACE('${gid('raum')}',$,'Raum',$,$,$,$,$,.ELEMENT.,.INTERNAL.,$);`,
      `#19=IFCRELAGGREGATES('${gid('r19')}',$,$,$,#16,(#18));`,
      `#100=IFCWALL('${gid('wandA')}',$,'Wand A',$,$,$,$,$,$);`,
      `#101=IFCWALL('${gid('wandB')}',$,'Wand B',$,$,$,$,$,$);`,
      `#102=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r102')}',$,$,$,(#100),#16);`,
      `#103=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r103')}',$,$,$,(#101,#110),#12);`,
      `#110=IFCSTAIR('${gid('raum')}',$,'Treppe',$,$,$,$,$,.STRAIGHT_RUN_STAIR.);`,
      `#111=IFCSTAIRFLIGHT('${gid('lauf')}',$,'Lauf',$,$,$,$,$,12,11,0.175,0.28,$);`,
      `#112=IFCRELAGGREGATES('${gid('r112')}',$,$,$,#110,(#111));`,
    ]);
    const modell = lesung.bauwerksmodell;
    expect(modell?.struktur.map((k) => [k.globalId, k.name, k.elternGlobalId])).toEqual([
      [gid('projekt'), 'Projekt', null],
      [gid('grundstueck'), 'Grundstück', gid('projekt')],
      [gid('gebaeude'), 'Haus', gid('grundstueck')],
      [gid('eg'), 'EG', gid('gebaeude')],
      [gid('eg'), 'OG', gid('gebaeude')],
      [gid('raum'), 'Raum', null],
    ]);
    expect(modell?.bauteile.map((b) => [b.globalId, b.name, b.strukturGlobalId, b.teilVonGlobalId])).toEqual([
      [gid('wandA'), 'Wand A', null, undefined],
      [gid('wandB'), 'Wand B', gid('eg'), undefined],
      [gid('raum'), 'Treppe', gid('eg'), undefined],
      [gid('lauf'), 'Lauf', gid('eg'), undefined],
    ]);
    expect(lesung.befunde.map((b) => [b.code, b.ort.pfad])).toEqual([
      ['globalid-doppelt', '#16'],
      ['bauteil-ohne-mengen', '#100'],
      ['bauteil-ohne-mengen', '#101'],
      ['globalid-doppelt', '#110'],
      ['bauteil-ohne-mengen', '#110'],
      ['bauteil-ohne-mengen', '#111'],
      ['verweis-mehrdeutig', '#18'],
      ['verweis-mehrdeutig', '#100'],
      ['verweis-mehrdeutig', '#111'],
    ]);
    expect(lesung.befunde[6]).toEqual({
      schwere: 'warnung',
      quelle: 'ifc-lesen',
      code: 'verweis-mehrdeutig',
      meldung: `Raum (#18) hängt an #16, dessen GlobalId ${gid('eg')} zuerst #12 trägt (ein Verweis meint im Bauwerksmodell das erste Objekt); im Modell hat es keine Eltern.`,
      ort: { pfad: '#18', zeile: 23, globalId: gid('raum') },
    });
    expect(lesung.befunde[8]?.meldung).toBe(
      `Lauf (#111) ist Teil von #110, dessen GlobalId ${gid('raum')} zuerst #18 trägt (ein Verweis meint im Bauwerksmodell das erste Objekt); im Modell ist es kein Teil.`,
    );
  });
});
