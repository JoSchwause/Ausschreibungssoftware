// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Eigenschaften bei Bedarf (Ticket 107, Punkt 2; D-51): Ein einmal gebauter Index über die Bytes einer
// Modelldatei liefert zu einer GlobalId eines Strukturknotens oder Bauteils die Eigenschaftssätze, Klassifikationen und
// Materialien, die das Bauwerksmodell nicht speichert. Sollwerte von Hand aus den IFC-Texten.

import type { IfcGlobalId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { eigenschaftenLesen, eigenschaftsindexBauen } from './index';
import type { Eigenschaftsindex } from './index';
import { bytes, fixtureBytes, gid, grundgeruest, ifcText } from './testhilfen';

const g = (kurz: string) => gid(kurz) as IfcGlobalId;

/** Wand #100 im EG mit Typ, eigenem Satz, Satz am Typ, Klassifikation und Material. */
const WAND: readonly string[] = [
  `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
  `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
  `#102=IFCWALLTYPE('${gid('typ')}',$,'AW 24',$,$,(#103),$,$,$,.STANDARD.);`,
  `#103=IFCPROPERTYSET('${gid('p103')}',$,'Pset_WallCommon',$,(#104,#105));`,
  "#104=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);",
  "#105=IFCPROPERTYSINGLEVALUE('FireRating',$,IFCLABEL('F30'),$);",
  `#106=IFCRELDEFINESBYTYPE('${gid('r106')}',$,$,$,(#100),#102);`,
  `#107=IFCPROPERTYSET('${gid('p107')}',$,'Pset_WallCommon',$,(#108));`,
  "#108=IFCPROPERTYSINGLEVALUE('FireRating',$,IFCLABEL('F90'),$);",
  `#109=IFCRELDEFINESBYPROPERTIES('${gid('r109')}',$,$,$,(#100),#107);`,
  "#110=IFCCLASSIFICATION('DIN',$,$,'DIN 276',$,$,$);",
  "#111=IFCCLASSIFICATIONREFERENCE($,'331','Tragende Au\\X\\DFenw\\X\\E4nde',#110,$,$);",
  `#112=IFCRELASSOCIATESCLASSIFICATION('${gid('r112')}',$,$,$,(#100),#111);`,
  "#113=IFCMATERIAL('Kalksandstein',$,$);",
  `#114=IFCRELASSOCIATESMATERIAL('${gid('r114')}',$,$,$,(#100),#113);`,
];

function index(zeilen: readonly string[]): Eigenschaftsindex {
  const ergebnis = eigenschaftsindexBauen(bytes(ifcText(zeilen)));
  if (!ergebnis.ok) throw new Error(ergebnis.fehler.meldung);
  return ergebnis.wert;
}

describe('Eigenschaftsindex', () => {
  it('liefert Eigenschaften (das Bauteil überschreibt den Typ), Klassifikationen und Materialien eines Bauteils', () => {
    expect(index([...grundgeruest(), ...WAND]).eigenschaften(g('wand'))).toEqual({
      eigenschaften: [
        { satz: 'Pset_WallCommon', name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'TRUE' }] },
        { satz: 'Pset_WallCommon', name: 'FireRating', werte: [{ typ: 'IfcLabel', text: 'F90' }] },
      ],
      klassifikationen: [{ system: 'DIN 276', kennung: '331', name: 'Tragende Außenwände' }],
      materialien: ['Kalksandstein'],
      befunde: [],
    });
  });
});

describe('Eigenschaften der Hausmodelle (Ticket 99)', () => {
  it('haus-v1.ifc: Außenwand Süd EG mit Pset_WallCommon, DIN 276 und Material', () => {
    const ergebnis = eigenschaftsindexBauen(fixtureBytes('ifc/haus-v1.ifc'));
    expect(ergebnis.ok).toBe(true);
    if (!ergebnis.ok) return;
    const satz = 'Pset_WallCommon';
    expect(ergebnis.wert.eigenschaften('1l3nLN5cFF3QXQ8i5cD4LA' as IfcGlobalId)).toEqual({
      eigenschaften: [
        { satz, name: 'Reference', werte: [{ typ: 'IfcIdentifier', text: 'AW 36,5' }] },
        { satz, name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'TRUE' }] },
        { satz, name: 'LoadBearing', werte: [{ typ: 'IfcBoolean', text: 'TRUE' }] },
        { satz, name: 'ExtendToStructure', werte: [{ typ: 'IfcBoolean', text: 'FALSE' }] },
        { satz, name: 'FireRating', werte: [{ typ: 'IfcLabel', text: 'REI 90' }] },
        { satz, name: 'AcousticRating', werte: [{ typ: 'IfcLabel', text: "R'w 52 dB" }] },
        {
          satz,
          name: 'ThermalTransmittance',
          werte: [{ typ: 'IfcThermalTransmittanceMeasure', text: '0.23' }],
        },
      ],
      klassifikationen: [{ system: 'DIN 276', kennung: '331', name: null }],
      materialien: ['Mauerwerk Ziegel'],
      befunde: [],
    });
  });

  it('eigenschaftenLesen liest dasselbe ohne Index', () => {
    const globalId = '1l3nLN5cFF3QXQ8i5cD4LA' as IfcGlobalId;
    const bytesHaus = fixtureBytes('ifc/haus-v1.ifc');
    const ergebnis = eigenschaftsindexBauen(bytesHaus);
    expect(eigenschaftenLesen(bytesHaus, globalId)).toEqual({
      ok: true,
      wert: ergebnis.ok ? ergebnis.wert.eigenschaften(globalId) : undefined,
    });
  });
});
