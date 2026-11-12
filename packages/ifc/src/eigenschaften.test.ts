// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Eigenschaften (Ticket 98, Punkt 7): `IfcPropertySet` an Bauteil und Typ mit Einzelwerten und
// Aufzählungen, Wert als Text mit IFC-Typname; andere Eigenschaftsarten sind ein Befund. Sollwerte von Hand.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './lesen';
import type { IfcLesung } from './typen';
import { bytes, codes, gid, grundgeruest, ifcText } from './testhilfen';

/** Wand #100 im EG mit Mengensatz (damit kein Befund „ohne Mengen“ stört) und den gegebenen Zeilen. */
function lesen(...zeilen: string[]): IfcLesung {
  return ifcLesen(
    bytes(
      ifcText([
        ...grundgeruest(),
        `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
        `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
        `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto_WallBaseQuantities',$,$,(#103));`,
        "#103=IFCQUANTITYLENGTH('Length',$,$,5.,$);",
        `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
        ...zeilen,
      ]),
    ),
  );
}

describe('Eigenschaften', () => {
  it('liest Einzelwerte als Text mit IFC-Typname, getrennt von den Mengen', () => {
    const lesung = lesen(
      `#110=IFCPROPERTYSET('${gid('p110')}',$,'Pset_WallCommon',$,(#111,#112,#113,#114,#115,#116,#117,#118,#119));`,
      "#111=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);",
      "#112=IFCPROPERTYSINGLEVALUE('LoadBearing',$,IFCBOOLEAN(.F.),$);",
      "#113=IFCPROPERTYSINGLEVALUE('ThermalTransmittance',$,IFCTHERMALTRANSMITTANCEMEASURE(0.28),$);",
      "#114=IFCPROPERTYSINGLEVALUE('Reference',$,IFCIDENTIFIER('AW 24'),$);",
      "#115=IFCPROPERTYSINGLEVALUE('FireRating',$,IFCLABEL('F90'),$);",
      "#116=IFCPROPERTYSINGLEVALUE('Lagen',$,IFCINTEGER(+03),$);",
      "#117=IFCPROPERTYSINGLEVALUE('Toleranz',$,IFCLENGTHMEASURE(1.E-05),$);",
      "#118=IFCPROPERTYSINGLEVALUE('Geprueft',$,IFCLOGICAL(.U.),$);",
      "#119=IFCPROPERTYSINGLEVALUE('Leer',$,$,$);",
      `#120=IFCRELDEFINESBYPROPERTIES('${gid('r120')}',$,$,$,(#100),#110);`,
    );
    expect(lesung.befunde).toEqual([]);
    const [wand] = lesung.modell?.bauteile ?? [];
    expect(wand?.mengen.map((m) => m.name)).toEqual(['Length']);
    const satz = 'Pset_WallCommon';
    expect(wand?.eigenschaften).toEqual([
      { satz, name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'TRUE' }] },
      { satz, name: 'LoadBearing', werte: [{ typ: 'IfcBoolean', text: 'FALSE' }] },
      {
        satz,
        name: 'ThermalTransmittance',
        werte: [{ typ: 'IfcThermalTransmittanceMeasure', text: '0.28' }],
      },
      { satz, name: 'Reference', werte: [{ typ: 'IfcIdentifier', text: 'AW 24' }] },
      { satz, name: 'FireRating', werte: [{ typ: 'IfcLabel', text: 'F90' }] },
      { satz, name: 'Lagen', werte: [{ typ: 'IfcInteger', text: '3' }] },
      { satz, name: 'Toleranz', werte: [{ typ: 'IfcLengthMeasure', text: '0.00001' }] },
      { satz, name: 'Geprueft', werte: [{ typ: 'IfcLogical', text: 'UNKNOWN' }] },
      { satz, name: 'Leer', werte: [] },
    ]);
  });

  it('liest Aufzählungen mit allen Werten', () => {
    const lesung = lesen(
      `#110=IFCPROPERTYSET('${gid('p110')}',$,'Pset_Status',$,(#111));`,
      "#111=IFCPROPERTYENUMERATEDVALUE('Status',$,(IFCLABEL('NEW'),IFCLABEL('EXISTING')),$);",
      `#120=IFCRELDEFINESBYPROPERTIES('${gid('r120')}',$,$,$,(#100),#110);`,
    );
    expect(lesung.modell?.bauteile[0]?.eigenschaften).toEqual([
      {
        satz: 'Pset_Status',
        name: 'Status',
        werte: [
          { typ: 'IfcLabel', text: 'NEW' },
          { typ: 'IfcLabel', text: 'EXISTING' },
        ],
      },
    ]);
  });

  it('meldet andere Eigenschaftsarten und Werte ohne Typ, erfindet nichts', () => {
    const lesung = lesen(
      `#110=IFCPROPERTYSET('${gid('p110')}',$,'Pset_Gemischt',$,(#111,#112,#113,#114,#115));`,
      "#111=IFCPROPERTYBOUNDEDVALUE('Spanne',$,IFCREAL(2.),IFCREAL(1.),$,$);",
      "#112=IFCPROPERTYLISTVALUE('Liste',$,(IFCLABEL('a')),$);",
      "#113=IFCCOMPLEXPROPERTY('Komplex',$,'x',(#111));",
      "#114=IFCPROPERTYSINGLEVALUE('OhneTyp',$,'roh',$);",
      "#115=IFCPROPERTYSINGLEVALUE('Gut',$,IFCLABEL('ja'),$);",
      `#120=IFCRELDEFINESBYPROPERTIES('${gid('r120')}',$,$,$,(#100),#110);`,
    );
    expect(lesung.modell?.bauteile[0]?.eigenschaften).toEqual([
      { satz: 'Pset_Gemischt', name: 'Gut', werte: [{ typ: 'IfcLabel', text: 'ja' }] },
    ]);
    expect(codes(lesung)).toEqual([
      'eigenschaft-nicht-gelesen',
      'eigenschaft-nicht-gelesen',
      'eigenschaft-nicht-gelesen',
      'eigenschaft-nicht-gelesen',
    ]);
    expect(lesung.befunde.map((b) => [b.schwere, b.ort.pfad])).toEqual([
      ['warnung', '#111'],
      ['warnung', '#112'],
      ['warnung', '#113'],
      ['warnung', '#114'],
    ]);
  });

  it('liest Eigenschaften des Typs; die am Bauteil überschreibt die gleichnamige des Typs, gemeldet wird einmal', () => {
    const lesung = lesen(
      `#200=IFCWALL('${gid('wand2')}',$,'Wand 2',$,$,$,$,$,$);`,
      `#201=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r201')}',$,$,$,(#200),#12);`,
      `#202=IFCRELDEFINESBYPROPERTIES('${gid('r202')}',$,$,$,(#200),#102);`,
      `#110=IFCWALLTYPE('${gid('typ')}',$,'AW',$,$,(#111),$,$,$,.STANDARD.);`,
      `#111=IFCPROPERTYSET('${gid('p111')}',$,'Pset_WallCommon',$,(#112,#113,#114));`,
      "#112=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.F.),$);",
      "#113=IFCPROPERTYSINGLEVALUE('FireRating',$,IFCLABEL('F30'),$);",
      "#114=IFCPROPERTYTABLEVALUE('Tabelle',$,(),(),$,$,$);",
      `#115=IFCRELDEFINESBYTYPE('${gid('r115')}',$,$,$,(#100,#200),#110);`,
      `#116=IFCPROPERTYSET('${gid('p116')}',$,'Pset_WallCommon',$,(#117));`,
      "#117=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);",
      `#118=IFCRELDEFINESBYPROPERTIES('${gid('r118')}',$,$,$,(#100),#116);`,
    );
    const [wand1, wand2] = lesung.modell?.bauteile ?? [];
    expect(wand1?.eigenschaften).toEqual([
      { satz: 'Pset_WallCommon', name: 'FireRating', werte: [{ typ: 'IfcLabel', text: 'F30' }] },
      { satz: 'Pset_WallCommon', name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'TRUE' }] },
    ]);
    expect(wand2?.eigenschaften).toEqual([
      { satz: 'Pset_WallCommon', name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'FALSE' }] },
      { satz: 'Pset_WallCommon', name: 'FireRating', werte: [{ typ: 'IfcLabel', text: 'F30' }] },
    ]);
    expect(codes(lesung)).toEqual(['eigenschaft-nicht-gelesen']);
  });
});
