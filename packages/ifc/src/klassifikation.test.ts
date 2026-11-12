// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Klassifikation (Ticket 98, Punkt 8): `IfcRelAssociatesClassification` → `IfcClassificationReference`
// (2x3 `ItemReference`, 4 `Identification`) samt System; eine dreistellige Nummer aus einem System mit „276“ im Namen
// ist ein Kostengruppen-Vorschlag. Sollwerte von Hand aus den IFC-Texten unten.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import { bytes, codes, gid, grundgeruest, ifcText } from './testhilfen';

/** Wand #100 im EG mit einer Menge, damit kein Befund „ohne Mengen“ stört. */
const WAND = [
  `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
  `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
  `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto_WallBaseQuantities',$,$,(#103));`,
  "#103=IFCQUANTITYLENGTH('Length',$,$,5.,$);",
  `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
];

function lesen(...zeilen: string[]) {
  return ifcLesen(bytes(ifcText([...grundgeruest(), ...WAND, ...zeilen])));
}

describe('Klassifikation', () => {
  it('IFC 4: liest Identification, Name und System; eine dreistellige Nummer aus DIN 276 ist ein KG-Vorschlag', () => {
    const lesung = lesen(
      "#130=IFCCLASSIFICATION('DIN',$,$,'DIN 276',$,$,$);",
      "#131=IFCCLASSIFICATIONREFERENCE($,'331','Tragende Au\\X\\DFenw\\X\\E4nde',#130,$,$);",
      `#132=IFCRELASSOCIATESCLASSIFICATION('${gid('r132')}',$,$,$,(#100),#131);`,
    );
    expect(lesung.befunde).toEqual([]);
    const [wand] = lesung.modell?.bauteile ?? [];
    expect(wand?.klassifikationen).toEqual([
      { system: 'DIN 276', kennung: '331', name: 'Tragende Außenwände' },
    ]);
    expect(wand?.kostengruppe).toBe('331');
  });

  it('IFC 2x3: liest ItemReference an derselben Stelle wie Identification', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText(
          [
            ...grundgeruest(),
            ...WAND,
            "#130=IFCCLASSIFICATION('DIN','2018-12',$,'DIN 276-1');",
            "#131=IFCCLASSIFICATIONREFERENCE($,'342','Nichttragende Innenw\\X\\E4nde',#130);",
            `#132=IFCRELASSOCIATESCLASSIFICATION('${gid('r132')}',$,$,$,(#100),#131);`,
          ],
          { schema: 'IFC2X3' },
        ),
      ),
    );
    const [wand] = lesung.modell?.bauteile ?? [];
    expect(wand?.klassifikationen).toEqual([
      { system: 'DIN 276-1', kennung: '342', name: 'Nichttragende Innenwände' },
    ]);
    expect(wand?.kostengruppe).toBe('342');
  });

  it.each([
    ['Uniclass 2015', 'Ss_25_10_30'],
    ['DIN 276', '331.1'],
    ['DIN 276', 'KG 331'],
    ['DIN 276', '031'],
    ['Kostengruppen', '331'],
  ])('macht aus %s / %s keinen KG-Vorschlag, behält aber den Text', (system, kennung) => {
    const lesung = lesen(
      `#130=IFCCLASSIFICATION($,$,$,'${system}',$,$,$);`,
      `#131=IFCCLASSIFICATIONREFERENCE($,'${kennung}',$,#130,$,$);`,
      `#132=IFCRELASSOCIATESCLASSIFICATION('${gid('r132')}',$,$,$,(#100),#131);`,
    );
    const [wand] = lesung.modell?.bauteile ?? [];
    expect(wand?.kostengruppe).toBeNull();
    expect(wand?.klassifikationen).toEqual([{ system, kennung, name: null }]);
  });

  it('IFC 4: findet das System über eine übergeordnete Referenz', () => {
    const lesung = lesen(
      "#130=IFCCLASSIFICATION($,$,$,'DIN 276',$,$,$);",
      "#131=IFCCLASSIFICATIONREFERENCE($,'330','Au\\X\\DFenw\\X\\E4nde',#130,$,$);",
      "#132=IFCCLASSIFICATIONREFERENCE($,'331',$,#131,$,$);",
      `#133=IFCRELASSOCIATESCLASSIFICATION('${gid('r133')}',$,$,$,(#100),#132);`,
    );
    const [wand] = lesung.modell?.bauteile ?? [];
    expect(wand?.klassifikationen).toEqual([{ system: 'DIN 276', kennung: '331', name: null }]);
    expect(wand?.kostengruppe).toBe('331');
  });

  it('übersteht eine Referenz, die im Kreis auf sich selbst verweist', () => {
    const lesung = lesen(
      "#130=IFCCLASSIFICATIONREFERENCE($,'331',$,#131,$,$);",
      "#131=IFCCLASSIFICATIONREFERENCE($,'330',$,#130,$,$);",
      `#133=IFCRELASSOCIATESCLASSIFICATION('${gid('r133')}',$,$,$,(#100),#130);`,
    );
    expect(lesung.modell?.bauteile[0]?.klassifikationen).toEqual([
      { system: null, kennung: '331', name: null },
    ]);
  });

  it('nimmt die Klassifikation des Typs dazu; zwei verschiedene Vorschläge: der erste gilt, mit Befund', () => {
    const lesung = lesen(
      `#110=IFCWALLTYPE('${gid('typ')}',$,'AW',$,$,$,$,$,$,.STANDARD.);`,
      `#111=IFCRELDEFINESBYTYPE('${gid('r111')}',$,$,$,(#100),#110);`,
      "#130=IFCCLASSIFICATION($,$,$,'DIN 276',$,$,$);",
      "#131=IFCCLASSIFICATIONREFERENCE($,'331',$,#130,$,$);",
      "#132=IFCCLASSIFICATIONREFERENCE($,'332',$,#130,$,$);",
      `#133=IFCRELASSOCIATESCLASSIFICATION('${gid('r133')}',$,$,$,(#110),#132);`,
      `#134=IFCRELASSOCIATESCLASSIFICATION('${gid('r134')}',$,$,$,(#100),#131);`,
    );
    const [wand] = lesung.modell?.bauteile ?? [];
    expect(wand?.klassifikationen.map((k) => k.kennung)).toEqual(['331', '332']);
    expect(wand?.kostengruppe).toBe('331');
    expect(codes(lesung)).toEqual(['kostengruppe-mehrdeutig']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'warnung', ort: { pfad: '#100' } });
  });

  it('meldet eine Klassifikation, die keine Referenz ist, und erfindet nichts', () => {
    const lesung = lesen(
      "#130=IFCCLASSIFICATION($,$,$,'DIN 276',$,$,$);",
      `#131=IFCRELASSOCIATESCLASSIFICATION('${gid('r131')}',$,$,$,(#100),#130);`,
    );
    expect(lesung.modell?.bauteile[0]?.klassifikationen).toEqual([]);
    expect(codes(lesung)).toEqual(['klassifikation-nicht-gelesen']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'warnung', ort: { pfad: '#130' } });
  });
});
