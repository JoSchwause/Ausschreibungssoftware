// SPDX-License-Identifier: AGPL-3.0-or-later
// IFC 2x3 und IFC 4 mit gleichem Ergebnis (Ticket 98, Acceptance): dasselbe kleine Haus, einmal in IFC 4 mit Längen in m,
// einmal in IFC 2x3 mit Längen in mm und den Attributfolgen von 2x3. Nach dem Lesen sind Struktur und Bauteile gleich.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './lesen';
import { bytes, gid, ifcText } from './testhilfen';

/** Das Haus im Schema `schema`; nur Einheiten und schemaabhängige Attributfolgen unterscheiden sich. */
function haus(schema: 'IFC2X3' | 'IFC4'): Uint8Array {
  const vier = schema === 'IFC4';
  const laenge = (m: string, mm: string): string => (vier ? m : mm);
  const formel = vier ? ",'aus Modell'" : '';
  return bytes(
    ifcText(
      [
        `#1=IFCPROJECT('${gid('projekt')}',$,'Haus',$,$,$,$,(#9),#2);`,
        '#2=IFCUNITASSIGNMENT((#3,#4,#5));',
        `#3=IFCSIUNIT(*,.LENGTHUNIT.,${vier ? '$' : '.MILLI.'},.METRE.);`,
        '#4=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);',
        '#5=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);',
        `#9=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#90,$);`,
        '#90=IFCAXIS2PLACEMENT3D(#91,$,$);',
        '#91=IFCCARTESIANPOINT((0.,0.,0.));',
        `#10=IFCSITE('${gid('grundstueck')}',$,'Grundst\\X\\FCck',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);`,
        `#11=IFCBUILDING('${gid('gebaeude')}',$,'Haus',$,$,$,$,$,.ELEMENT.,$,$,$);`,
        `#12=IFCBUILDINGSTOREY('${gid('eg')}',$,'EG',$,$,$,$,$,.ELEMENT.,${laenge('0.', '0.')});`,
        // 2x3: InteriorOrExteriorSpace, 4: PredefinedType an derselben Stelle.
        `#16=IFCSPACE('${gid('kueche')}',$,'0.01',$,$,$,$,'K\\X\\FCche',.ELEMENT.,.INTERNAL.,$);`,
        `#13=IFCRELAGGREGATES('${gid('r13')}',$,$,$,#1,(#10));`,
        `#14=IFCRELAGGREGATES('${gid('r14')}',$,$,$,#10,(#11));`,
        `#15=IFCRELAGGREGATES('${gid('r15')}',$,$,$,#11,(#12));`,
        `#17=IFCRELAGGREGATES('${gid('r17')}',$,$,$,#12,(#16));`,
        `#20=IFCELEMENTQUANTITY('${gid('q20')}',$,'Qto_BuildingStoreyBaseQuantities',$,$,(#21,#22));`,
        `#21=IFCQUANTITYAREA('GrossFloorArea',$,$,96.04${formel});`,
        `#22=IFCQUANTITYVOLUME('GrossVolume',$,$,288.12${formel});`,
        `#23=IFCRELDEFINESBYPROPERTIES('${gid('r23')}',$,$,$,(#12),#20);`,
        vier
          ? `#100=IFCWALL('${gid('wand')}',$,'Au\\X\\DFenwand Nord',$,$,$,$,$,.STANDARD.);`
          : `#100=IFCWALL('${gid('wand')}',$,'Au\\X\\DFenwand Nord',$,$,$,$,$);`,
        `#101=IFCWALLTYPE('${gid('typ')}',$,'AW 24',$,$,(#120),$,$,$,.STANDARD.);`,
        `#102=IFCRELDEFINESBYTYPE('${gid('r102')}',$,$,$,(#100),#101);`,
        `#103=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r103')}',$,$,$,(#100),#12);`,
        `#110=IFCELEMENTQUANTITY('${gid('q110')}',$,'Qto_WallBaseQuantities',$,$,(#111,#112,#113,#114));`,
        `#111=IFCQUANTITYLENGTH('Length',$,$,${laenge('9.8', '9800.')}${formel});`,
        `#112=IFCQUANTITYLENGTH('Height',$,$,${laenge('3.0000000000000004', '3000.0000000000005')}${formel});`,
        `#113=IFCQUANTITYAREA('NetSideArea',$,$,27.4${formel});`,
        `#114=IFCQUANTITYVOLUME('NetVolume',$,$,6.576${formel});`,
        `#115=IFCRELDEFINESBYPROPERTIES('${gid('r115')}',$,$,$,(#100),#110);`,
        `#120=IFCELEMENTQUANTITY('${gid('q120')}',$,'Qto_WallBaseQuantities',$,$,(#121));`,
        `#121=IFCQUANTITYLENGTH('Width',$,$,${laenge('0.24', '240.')}${formel});`,
        `#130=IFCPROPERTYSET('${gid('p130')}',$,'Pset_WallCommon',$,(#131,#132));`,
        "#131=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);",
        "#132=IFCPROPERTYSINGLEVALUE('LoadBearing',$,IFCBOOLEAN(.T.),$);",
        `#133=IFCRELDEFINESBYPROPERTIES('${gid('r133')}',$,$,$,(#100),#130);`,
        vier
          ? "#140=IFCCLASSIFICATION('DIN',$,$,'DIN 276',$,$,$);"
          : "#140=IFCCLASSIFICATION('DIN',$,$,'DIN 276');",
        vier
          ? "#141=IFCCLASSIFICATIONREFERENCE($,'331','Tragende Au\\X\\DFenw\\X\\E4nde',#140,$,$);"
          : "#141=IFCCLASSIFICATIONREFERENCE($,'331','Tragende Au\\X\\DFenw\\X\\E4nde',#140);",
        `#142=IFCRELASSOCIATESCLASSIFICATION('${gid('r142')}',$,$,$,(#100),#141);`,
        vier ? "#150=IFCMATERIAL('Kalksandstein',$,$);" : "#150=IFCMATERIAL('Kalksandstein');",
        `#151=IFCMATERIALLAYER(#150,${laenge('0.24', '240.')},$);`,
        "#152=IFCMATERIALLAYERSET((#151),'AW 24');",
        `#153=IFCMATERIALLAYERSETUSAGE(#152,.AXIS2.,.POSITIVE.,${laenge('-0.12', '-120.')});`,
        `#154=IFCRELASSOCIATESMATERIAL('${gid('r154')}',$,$,$,(#100),#153);`,
      ],
      { schema },
    ),
  );
}

describe('IFC 2x3 und IFC 4', () => {
  it('ergeben für dasselbe Haus dieselbe Struktur und dieselben Bauteile', () => {
    const ifc4 = ifcLesen(haus('IFC4'));
    const ifc2x3 = ifcLesen(haus('IFC2X3'));
    expect(ifc4.befunde).toEqual([]);
    expect(ifc2x3.befunde).toEqual([]);
    expect(ifc4.modell?.schema).toBe('IFC4');
    expect(ifc2x3.modell?.schema).toBe('IFC2X3');
    expect(ifc2x3.modell?.struktur).toEqual(ifc4.modell?.struktur);
    expect(ifc2x3.modell?.bauteile).toEqual(ifc4.modell?.bauteile);
  });

  it('liefert die Sollwerte des Hauses (von Hand aus dem Text oben)', () => {
    const modell = ifcLesen(haus('IFC2X3')).modell;
    expect(modell?.struktur.map((k) => [k.art, k.name])).toEqual([
      ['projekt', 'Haus'],
      ['grundstueck', 'Grundstück'],
      ['gebaeude', 'Haus'],
      ['geschoss', 'EG'],
      ['raum', '0.01'],
    ]);
    expect(modell?.struktur[3]?.mengen.map((m) => [m.name, m.wert])).toEqual([
      ['GrossFloorArea', '96.040'],
      ['GrossVolume', '288.120'],
    ]);
    expect(modell?.bauteile).toEqual([
      {
        globalId: gid('wand'),
        ifcKlasse: 'IfcWall',
        name: 'Außenwand Nord',
        typ: 'AW 24',
        strukturGlobalId: gid('eg'),
        teilVonGlobalId: null,
        kostengruppe: '331',
        mengen: [
          { satz: 'Qto_WallBaseQuantities', name: 'Length', art: 'laenge', wert: '9.800' },
          { satz: 'Qto_WallBaseQuantities', name: 'Height', art: 'laenge', wert: '3.000' },
          { satz: 'Qto_WallBaseQuantities', name: 'NetSideArea', art: 'flaeche', wert: '27.400' },
          { satz: 'Qto_WallBaseQuantities', name: 'NetVolume', art: 'volumen', wert: '6.576' },
          { satz: 'Qto_WallBaseQuantities', name: 'Width', art: 'laenge', wert: '0.240' },
        ],
        eigenschaften: [
          { satz: 'Pset_WallCommon', name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'TRUE' }] },
          { satz: 'Pset_WallCommon', name: 'LoadBearing', werte: [{ typ: 'IfcBoolean', text: 'TRUE' }] },
        ],
        klassifikationen: [{ system: 'DIN 276', kennung: '331', name: 'Tragende Außenwände' }],
        materialien: ['Kalksandstein'],
      },
    ]);
  });
});
