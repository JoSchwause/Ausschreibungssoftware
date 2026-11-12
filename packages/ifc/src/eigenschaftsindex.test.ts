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

  it('liefert die Eigenschaften eines Strukturknotens; null für jede GlobalId, die kein Objekt des Modells trägt', () => {
    const i = index([
      ...grundgeruest(),
      ...WAND,
      `#16=IFCSPACE('${gid('raum')}',$,'Bad',$,$,$,$,$,.ELEMENT.,.INTERNAL.,$);`,
      `#17=IFCRELAGGREGATES('${gid('r17')}',$,$,$,#12,(#16));`,
      `#18=IFCPROPERTYSET('${gid('p18')}',$,'Pset_SpaceCommon',$,(#19));`,
      "#19=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.F.),$);",
      `#20=IFCRELDEFINESBYPROPERTIES('${gid('r20')}',$,$,$,(#16),#18);`,
      `#120=IFCOPENINGELEMENT('${gid('oeffnung')}',$,'Öffnung',$,$,$,$,$,.OPENING.);`,
      `#121=IFCRELVOIDSELEMENT('${gid('r121')}',$,$,$,#100,#120);`,
    ]);
    expect(i.eigenschaften(g('raum'))).toEqual({
      eigenschaften: [
        { satz: 'Pset_SpaceCommon', name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'FALSE' }] },
      ],
      klassifikationen: [],
      materialien: [],
      befunde: [],
    });
    expect(i.eigenschaften(g('eg'))).toEqual({
      eigenschaften: [],
      klassifikationen: [],
      materialien: [],
      befunde: [],
    });
    for (const fremd of ['unbekannt', 'oeffnung', 'typ', 'r101'])
      expect(i.eigenschaften(g(fremd))).toBeNull();
  });

  it('weist eine Datei ab, die nicht gelesen wird, mit dem Befund wie beim Bauwerksmodell', () => {
    const ergebnis = eigenschaftsindexBauen(bytes('Hallo Welt'));
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok)
      expect(ergebnis.fehler).toMatchObject({
        schwere: 'fehler',
        quelle: 'ifc-lesen',
        code: 'keine-ifc-datei',
      });
    expect(eigenschaftenLesen(bytes('Hallo Welt'), g('wand')).ok).toBe(false);
  });

  it('meldet bei jeder Abfrage, was sie betrifft, unabhängig von früheren Abfragen', () => {
    const zeilen = [
      ...grundgeruest(),
      `#100=IFCWALL('${gid('wand1')}',$,'Wand 1',$,$,$,$,$,$);`,
      `#101=IFCWALL('${gid('wand2')}',$,'Wand 2',$,$,$,$,$,$);`,
      `#102=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r102')}',$,$,$,(#100,#101),#12);`,
      `#103=IFCWALLTYPE('${gid('typ')}',$,'IW',$,$,(#104),$,$,$,.STANDARD.);`,
      `#104=IFCPROPERTYSET('${gid('p104')}',$,'Pset_WallCommon',$,(#105,#106,#107));`,
      "#105=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.F.),$);",
      "#106=IFCPROPERTYBOUNDEDVALUE('Temperatur',$,IFCREAL(30.),IFCREAL(-10.),$,$);",
      "#107=IFCPROPERTYSINGLEVALUE('Kaputt',$,IFCLABEL('a' 'b'),$);",
      `#108=IFCRELDEFINESBYTYPE('${gid('r108')}',$,$,$,(#100,#101),#103);`,
    ];
    const erwartet = (wand: string) => ({
      eigenschaften: [
        { satz: 'Pset_WallCommon', name: 'IsExternal', werte: [{ typ: 'IfcBoolean', text: 'FALSE' }] },
      ],
      klassifikationen: [],
      materialien: [],
      befunde: [
        expect.objectContaining({
          code: 'eigenschaft-nicht-gelesen',
          ort: { pfad: '#106', zeile: 27, globalId: g(wand) },
        }),
        expect.objectContaining({
          code: 'step-syntaxfehler',
          ort: { pfad: '#107', zeile: 28, globalId: g(wand) },
        }),
      ],
    });
    const i = index(zeilen);
    expect(i.eigenschaften(g('wand1'))).toEqual(erwartet('wand1'));
    expect(i.eigenschaften(g('wand2'))).toEqual(erwartet('wand2'));
    expect(i.eigenschaften(g('wand1'))).toEqual(erwartet('wand1'));
    expect(index(zeilen).eigenschaften(g('wand2'))).toEqual(i.eigenschaften(g('wand2')));
  });

  it('nimmt bei einer doppelten GlobalId das erste Objekt (Strukturknoten vor Bauteilen) und meldet es', () => {
    const i = index([
      ...grundgeruest(),
      ...WAND,
      `#120=IFCSLAB('${gid('eg')}',$,'Decke',$,$,$,$,$,.FLOOR.);`,
      `#121=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r121')}',$,$,$,(#120),#12);`,
      `#122=IFCRELASSOCIATESMATERIAL('${gid('r122')}',$,$,$,(#120),#113);`,
    ]);
    expect(i.eigenschaften(g('eg'))).toEqual({
      eigenschaften: [],
      klassifikationen: [],
      materialien: [],
      befunde: [
        {
          schwere: 'warnung',
          quelle: 'ifc-lesen',
          code: 'globalid-doppelt',
          meldung: `Die GlobalId ${gid('eg')} tragen 2 Objekte (#12, #120); gezeigt werden die Angaben des ersten.`,
          ort: { pfad: '#12', zeile: 17, feld: 'GlobalId', globalId: g('eg') },
        },
      ],
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
