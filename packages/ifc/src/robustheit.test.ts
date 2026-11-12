// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests des IFC-Lesers (Ticket 98, Punkt 9; Q1): Beliebige Bytes führen zu Fehler oder Befunden, nie zu einer
// Ausnahme; was gelesen wird, ist kanonisch und deterministisch. Das Orakel der Mengen rechnet unabhängig vom Leser in
// ganzen Zahlen (`bigint`) im Test.

import { alsMenge } from '@tethys/dezimal';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import type { IfcBefundcode, IfcLesung } from './index';
import { bytes, gid, grundgeruest, ifcText } from './testhilfen';

const KOPF = "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n";

/** Jede gelesene Menge ist eine gültige `Menge` (3 Stellen, kanonisch) oder leer; jede GlobalId ein Text. */
function pruefeKanonisch(lesung: IfcLesung): void {
  const modell = lesung.modell;
  if (modell === null) {
    expect(lesung.befunde).toHaveLength(1);
    expect(lesung.befunde[0]?.schwere).toBe('fehler');
    return;
  }
  for (const objekt of [...modell.struktur, ...modell.bauteile])
    for (const m of objekt.mengen) if (m.wert !== null) expect(alsMenge(m.wert).ok).toBe(true);
}

/** Ein mittleres Modell mit allem, was der Leser kennt; Ausgang für Verstümmelungen. */
const VORLAGE = ifcText([
  ...grundgeruest([
    '#3=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);',
    '#4=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);',
    "#5=IFCCONVERSIONBASEDUNIT(#30,.VOLUMEUNIT.,'Liter',#31);",
  ]),
  '#30=IFCDIMENSIONALEXPONENTS(3,0,0,0,0,0,0);',
  '#31=IFCMEASUREWITHUNIT(IFCVOLUMEMEASURE(0.001),#32);',
  '#32=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);',
  `#16=IFCSPACE('${gid('raum')}',$,'0.01',$,$,$,$,'K\\X2\\00FC\\X0\\che',.ELEMENT.,.INTERNAL.,$);`,
  `#17=IFCRELAGGREGATES('${gid('r17')}',$,$,$,#12,(#16));`,
  `#100=IFCWALLSTANDARDCASE('${gid('wand')}',$,'Wand ''A''',$,$,$,$,$);`,
  `#101=IFCSTAIR('${gid('treppe')}',$,'Treppe',$,$,$,$,$,.STRAIGHT_RUN_STAIR.);`,
  `#102=IFCSTAIRFLIGHT('${gid('lauf')}',$,'Lauf',$,$,$,$,$,12,11,0.175,0.28,$);`,
  `#103=IFCRELAGGREGATES('${gid('r103')}',$,$,$,#101,(#102));`,
  `#104=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r104')}',$,$,$,(#100,#101),#12);`,
  `#110=IFCWALLTYPE('${gid('typ')}',$,'AW',$,$,(#111),$,$,$,.STANDARD.);`,
  `#111=IFCELEMENTQUANTITY('${gid('q111')}',$,'Qto_WallBaseQuantities',$,$,(#112,#113));`,
  "#112=IFCQUANTITYLENGTH('Width',$,$,240.,$);",
  "#113=IFCQUANTITYVOLUME('NetVolume',$,$,3600.,'V');",
  `#114=IFCRELDEFINESBYTYPE('${gid('r114')}',$,$,$,(#100),#110);`,
  `#120=IFCELEMENTQUANTITY('${gid('q120')}',$,'Qto_WallBaseQuantities',$,$,(#121,#122));`,
  "#121=IFCQUANTITYLENGTH('Length',$,$,5000.0000000000009,$);",
  "#122=IFCQUANTITYAREA('NetSideArea',$,$,1.25E1,$);",
  `#123=IFCRELDEFINESBYPROPERTIES('${gid('r123')}',$,$,$,(#100,#16),#120);`,
  `#130=IFCPROPERTYSET('${gid('p130')}',$,'Pset_WallCommon',$,(#131,#132));`,
  "#131=IFCPROPERTYSINGLEVALUE('IsExternal',$,IFCBOOLEAN(.T.),$);",
  "#132=IFCPROPERTYENUMERATEDVALUE('Status',$,(IFCLABEL('NEW')),$);",
  `#133=IFCRELDEFINESBYPROPERTIES('${gid('r133')}',$,$,$,(#100),#130);`,
  "#140=IFCCLASSIFICATION($,$,$,'DIN 276',$,$,$);",
  "#141=IFCCLASSIFICATIONREFERENCE($,'331',$,#140,$,$);",
  `#142=IFCRELASSOCIATESCLASSIFICATION('${gid('r142')}',$,$,$,(#100),#141);`,
  "#150=IFCMATERIAL('Beton',$,$);",
  '#151=IFCMATERIALLAYER(#150,0.24,$);',
  "#152=IFCMATERIALLAYERSET((#151),'AW');",
  '#153=IFCMATERIALLAYERSETUSAGE(#152,.AXIS2.,.POSITIVE.,0.);',
  `#154=IFCRELASSOCIATESMATERIAL('${gid('r154')}',$,$,$,(#100),#153);`,
]);

/** Alle Codes, die der Leser kennt; ein anderer Code wäre ein Fehler im Leser. */
const CODES: ReadonlySet<IfcBefundcode> = new Set<IfcBefundcode>([
  'eingabe-zu-gross',
  'keine-ifc-datei',
  'schema-nicht-unterstuetzt',
  'kodierung-utf8',
  'kodierung-latin1',
  'datei-unvollstaendig',
  'step-syntaxfehler',
  'step-zu-tief',
  'instanz-doppelt',
  'zeichenkette-ungueltig',
  'verweis-fehlt',
  'strukturknoten-ohne-eltern',
  'bauteil-mehrfach-enthalten',
  'bauteil-ohne-strukturknoten',
  'bauteil-ohne-mengen',
  'projekt-fehlt',
  'einheit-fehlt',
  'einheit-ungueltig',
  'einheit-umgerechnet',
  'menge-ungueltig',
  'menge-nicht-gelesen',
  'eigenschaft-nicht-gelesen',
  'klassifikation-nicht-gelesen',
  'kostengruppe-mehrdeutig',
  'globalid-ungueltig',
  'globalid-doppelt',
]);

describe('Robustheit', () => {
  it('die Vorlage selbst wird ohne Fehler gelesen', () => {
    const lesung = ifcLesen(bytes(VORLAGE));
    // Liter am Typ der Wand; Treppe und Lauf haben keine Mengen.
    expect(lesung.befunde.map((b) => b.code)).toEqual([
      'einheit-umgerechnet',
      'bauteil-ohne-mengen',
      'bauteil-ohne-mengen',
    ]);
    expect(lesung.modell?.bauteile.map((b) => b.name)).toEqual(["Wand 'A'", 'Treppe', 'Lauf']);
  });

  it('stürzt bei beliebigen Bytes nicht ab', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 600 }), (daten) => {
        pruefeKanonisch(ifcLesen(daten));
      }),
      { numRuns: 1000 },
    );
  });

  it('stürzt bei beliebigen Bytes hinter einem gültigen Kopf nicht ab', () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 600 }), (daten) => {
        const kopf = bytes(KOPF);
        const alles = new Uint8Array(kopf.length + daten.length);
        alles.set(kopf);
        alles.set(daten, kopf.length);
        pruefeKanonisch(ifcLesen(alles));
      }),
      { numRuns: 1000 },
    );
  });

  it('stürzt bei STEP-artigem Text nicht ab', () => {
    const baustein = fc.constantFrom(
      '#1=',
      '#2=',
      '#12',
      '#999',
      'IFCPROJECT(',
      'IFCUNITASSIGNMENT((#3));',
      '#3=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);',
      'IFCWALL(',
      'IFCRELAGGREGATES(',
      'IFCRELCONTAINEDINSPATIALSTRUCTURE(',
      'IFCRELDEFINESBYPROPERTIES(',
      'IFCRELDEFINESBYTYPE(',
      'IFCELEMENTQUANTITY(',
      'IFCQUANTITYLENGTH(',
      'IFCPROPERTYSET(',
      'IFCPROPERTYSINGLEVALUE(',
      'IFCLABEL(',
      'IFCCLASSIFICATIONREFERENCE(',
      'IFCMATERIAL(',
      `'${gid('x')}'`,
      "'a''b'",
      "'\\X2\\00E4",
      '\\X0\\',
      "'\\S\\",
      "'\\PB\\",
      "'",
      '"0F"',
      '"',
      '(',
      ')',
      ',',
      ';',
      '$',
      '*',
      '.T.',
      '.',
      '1.E-05',
      '-0.5',
      '1E999999',
      '/*',
      '*/',
      ' ',
      '\n',
      'ENDSEC;',
      'END-ISO-10303-21;',
      'DATA;',
    );
    fc.assert(
      fc.property(fc.array(baustein, { maxLength: 120 }), (teile) => {
        pruefeKanonisch(ifcLesen(bytes(KOPF + teile.join(''))));
      }),
      { numRuns: 1000 },
    );
  });

  it('stürzt bei verstümmelten Modellen nicht ab; jeder Befund hat einen bekannten Code; das Lesen ist deterministisch', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            stelle: fc.nat(),
            loeschen: fc.nat({ max: 30 }),
            einfuegen: fc.constantFrom(
              '',
              '(',
              ')',
              "'",
              ',',
              ';',
              '#',
              '#999',
              '$',
              '.',
              '9',
              'E',
              '\\',
              '/*',
              'ä',
            ),
          }),
          { minLength: 1, maxLength: 6 },
        ),
        (eingriffe) => {
          let text = VORLAGE;
          for (const e of eingriffe) {
            const p = e.stelle % (text.length + 1);
            text = text.slice(0, p) + e.einfuegen + text.slice(p + e.loeschen);
          }
          const lesung = ifcLesen(bytes(text));
          pruefeKanonisch(lesung);
          for (const b of lesung.befunde) expect(CODES.has(b.code)).toBe(true);
          expect(ifcLesen(bytes(text))).toEqual(lesung);
        },
      ),
      { numRuns: 500 },
    );
  });
});

/** Orakel: `ziffern` × 10^`potenz` kaufmännisch auf 3 Stellen, als Text; ganze Zahlen, unabhängig vom Leser. */
function orakel(negativ: boolean, ziffern: bigint, potenz: number): string {
  let tausendstel: bigint;
  if (potenz + 3 >= 0) tausendstel = ziffern * 10n ** BigInt(potenz + 3);
  else {
    const teiler = 10n ** BigInt(-(potenz + 3));
    tausendstel = (ziffern + teiler / 2n) / teiler;
  }
  const text = `${(tausendstel / 1000n).toString()}.${(tausendstel % 1000n).toString().padStart(3, '0')}`;
  return negativ && tausendstel !== 0n ? `-${text}` : text;
}

describe('Exaktheit der Mengen', () => {
  it('liest jeden Gleitkommatext in mm exakt wie das Orakel (kaufmännisch auf 3 Stellen in m)', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.bigInt({ min: 0n, max: 10n ** 12n }),
        fc.nat({ max: 8 }),
        fc.integer({ min: -12, max: 8 }),
        (negativ, mantisse, nachkomma, exponent) => {
          const ziffern = mantisse.toString().padStart(nachkomma + 1, '0');
          const text = `${negativ ? '-' : ''}${ziffern.slice(0, ziffern.length - nachkomma)}.${ziffern.slice(ziffern.length - nachkomma)}E${String(exponent)}`;
          const lesung = ifcLesen(
            bytes(
              ifcText([
                ...grundgeruest(['#3=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);']),
                `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
                `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
                `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto',$,$,(#103));`,
                `#103=IFCQUANTITYLENGTH('Length',$,$,${text},$);`,
                `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
              ]),
            ),
          );
          // mm → m: Potenz −3 zusätzlich zum Exponenten und den Nachkommastellen.
          const soll = orakel(negativ, mantisse, exponent - nachkomma - 3);
          expect(lesung.modell?.bauteile[0]?.mengen[0]?.wert).toBe(soll);
        },
      ),
      { numRuns: 500 },
    );
  });
});
