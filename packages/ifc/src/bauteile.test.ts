// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Bauteile (Ticket 98, Punkt 5): enthaltene Produkte und ihre Teile, Klasse wie in der Datei, keine
// Öffnungen, virtuellen Elemente, Beschriftungen und Raster. Sollwerte von Hand aus den IFC-Texten unten.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import type { Bauteil } from './index';
import { bytes, codes, gid, grundgeruest, ifcText } from './testhilfen';

/** Bauteil mit allen Feldern; nicht genannte Felder sind leer. */
function bauteil(b: Partial<Bauteil>): Bauteil {
  return {
    globalId: '',
    ifcKlasse: '',
    name: null,
    typ: null,
    strukturGlobalId: null,
    teilVonGlobalId: null,
    kostengruppe: null,
    mengen: [],
    eigenschaften: [],
    klassifikationen: [],
    materialien: [],
    ...b,
  };
}

/** Liest Grundgerüst plus Zeilen. */
function lesen(...zeilen: string[]) {
  return ifcLesen(bytes(ifcText([...grundgeruest(), ...zeilen])));
}

describe('Bauteile', () => {
  it('liest ein Produkt, das in einem Geschoss steht, mit Klasse wie in der Datei', () => {
    const lesung = lesen(
      `#100=IFCWALLSTANDARDCASE('${gid('wand1')}',$,'Wand 1',$,$,$,$,$);`,
      `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
    );
    expect(lesung.modell?.bauteile).toEqual([
      bauteil({
        globalId: gid('wand1'),
        ifcKlasse: 'IfcWallStandardCase',
        name: 'Wand 1',
        strukturGlobalId: gid('eg'),
      }),
    ]);
    expect(codes(lesung)).toEqual(['bauteil-ohne-mengen']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'warnung', ort: { pfad: '#100' } });
  });

  it('gibt die Bauteile in der Reihenfolge der Datei aus', () => {
    const lesung = lesen(
      `#100=IFCSLAB('${gid('decke')}',$,'Decke',$,$,$,$,$,.FLOOR.);`,
      `#101=IFCDOOR('${gid('tuer')}',$,'T\\X\\FCr',$,$,$,$,$,2.01,0.885,.DOOR.,.SINGLE_SWING_LEFT.,$);`,
      `#102=IFCWINDOW('${gid('fenster')}',$,'Fenster',$,$,$,$,$,1.25,1.01,.WINDOW.,.SINGLE_PANEL.,$);`,
      `#103=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r103')}',$,$,$,(#102,#101),#12);`,
      `#104=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r104')}',$,$,$,(#100),#12);`,
    );
    expect(lesung.modell?.bauteile.map((b) => [b.ifcKlasse, b.name])).toEqual([
      ['IfcSlab', 'Decke'],
      ['IfcDoor', 'Tür'],
      ['IfcWindow', 'Fenster'],
    ]);
  });

  it('nimmt Öffnungen, virtuelle Elemente, Beschriftungen, Raster und Strukturknoten nicht auf', () => {
    const lesung = lesen(
      `#100=IFCOPENINGELEMENT('${gid('oeffnung')}',$,'\\X\\D6ffnung',$,$,$,$,$,.OPENING.);`,
      `#101=IFCOPENINGSTANDARDCASE('${gid('oeffnung2')}',$,$,$,$,$,$,$,$);`,
      `#102=IFCVIRTUALELEMENT('${gid('virtuell')}',$,$,$,$,$,$,$);`,
      `#103=IFCANNOTATION('${gid('text')}',$,$,$,$,$,$);`,
      `#104=IFCGRID('${gid('raster')}',$,$,$,$,$,$,(),(),$,$);`,
      `#105=IFCSPACE('${gid('raum')}',$,'R1',$,$,$,$,$,.ELEMENT.,.INTERNAL.,$);`,
      `#106=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r106')}',$,$,$,(#100,#101,#102,#103,#104,#105),#12);`,
    );
    expect(lesung.modell?.bauteile).toEqual([]);
  });

  it('behält eine Klasse, die das Paket nicht kennt, wie sie in der Datei steht', () => {
    const lesung = lesen(
      `#100=IFCNEUEKLASSE('${gid('neu')}',$,'Neu',$,$,$,$,$);`,
      `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
    );
    expect(lesung.modell?.bauteile.map((b) => b.ifcKlasse)).toEqual(['IFCNEUEKLASSE']);
  });

  it('liest die Teile eines Bauteils mit Verweis auf das Ganze; sie erben dessen Strukturknoten', () => {
    const lesung = lesen(
      `#100=IFCSTAIR('${gid('treppe')}',$,'Treppe',$,$,$,$,$,.STRAIGHT_RUN_STAIR.);`,
      `#101=IFCSTAIRFLIGHT('${gid('lauf1')}',$,'Lauf 1',$,$,$,$,$,12,11,0.175,0.28,$);`,
      `#102=IFCRAILING('${gid('gelaender')}',$,'Gel\\X\\E4nder',$,$,$,$,$,.HANDRAIL.);`,
      `#103=IFCMEMBER('${gid('pfosten')}',$,'Pfosten',$,$,$,$,$,.POST.);`,
      `#104=IFCRELAGGREGATES('${gid('r104')}',$,$,$,#100,(#101,#102));`,
      `#105=IFCRELAGGREGATES('${gid('r105')}',$,$,$,#102,(#103));`,
      `#106=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r106')}',$,$,$,(#100),#12);`,
    );
    expect(lesung.modell?.bauteile.map((b) => [b.name, b.strukturGlobalId, b.teilVonGlobalId])).toEqual([
      ['Treppe', gid('eg'), null],
      ['Lauf 1', gid('eg'), gid('treppe')],
      ['Geländer', gid('eg'), gid('treppe')],
      ['Pfosten', gid('eg'), gid('gelaender')],
    ]);
  });

  it('meldet ein Bauteil, das in zwei Strukturknoten steht; der erste gilt', () => {
    const lesung = lesen(
      `#20=IFCBUILDINGSTOREY('${gid('og')}',$,'OG',$,$,$,$,$,.ELEMENT.,3.);`,
      `#21=IFCRELAGGREGATES('${gid('r21')}',$,$,$,#11,(#20));`,
      `#100=IFCCOLUMN('${gid('stuetze')}',$,'St\\X\\FCtze',$,$,$,$,$,.COLUMN.);`,
      `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
      `#102=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r102')}',$,$,$,(#100),#20);`,
    );
    expect(lesung.modell?.bauteile.map((b) => b.strukturGlobalId)).toEqual([gid('eg')]);
    expect(codes(lesung)).toEqual(['bauteil-mehrfach-enthalten', 'bauteil-ohne-mengen']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'warnung', ort: { pfad: '#102' } });
  });

  it('behält ein Bauteil, dessen Behälter kein Strukturknoten ist, ohne Strukturknoten und meldet es', () => {
    const lesung = lesen(
      `#20=IFCEXTERNALSPATIALELEMENT('${gid('aussen')}',$,'Au\\X\\DFen',$,$,$,$,$,.EXTERNAL.);`,
      `#100=IFCFURNITURE('${gid('bank')}',$,'Bank',$,$,$,$,$,$);`,
      `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#20);`,
    );
    expect(lesung.modell?.bauteile.map((b) => [b.name, b.strukturGlobalId])).toEqual([['Bank', null]]);
    expect(codes(lesung)).toEqual(['bauteil-ohne-strukturknoten', 'bauteil-ohne-mengen']);
  });
});
