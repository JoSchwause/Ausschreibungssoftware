// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Materialnamen (Ticket 98, Punkt 5): `IfcRelAssociatesMaterial` mit Material, Schichten, Bestandteilen,
// Profilen und Listen; die des Typs nur, wenn das Bauteil selbst keine nennt. Sollwerte von Hand.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import { bytes, gid, grundgeruest, ifcText } from './testhilfen';

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

describe('Material', () => {
  it('liest den Namen eines Materials', () => {
    const lesung = lesen(
      "#140=IFCMATERIAL('Kalksandstein',$,$);",
      `#141=IFCRELASSOCIATESMATERIAL('${gid('r141')}',$,$,$,(#100),#140);`,
    );
    expect(lesung.befunde).toEqual([]);
    expect(lesung.modell?.bauteile[0]?.materialien).toEqual(['Kalksandstein']);
  });

  it('liest die Materialien einer Schichtenfolge ohne Wiederholung, in ihrer Reihenfolge', () => {
    const lesung = lesen(
      "#140=IFCMATERIAL('Putz');",
      "#141=IFCMATERIAL('Kalksandstein');",
      "#142=IFCMATERIAL('D\\X\\E4mmung');",
      '#143=IFCMATERIALLAYER(#140,0.015,$);',
      '#144=IFCMATERIALLAYER(#141,0.24,$);',
      '#145=IFCMATERIALLAYER(#142,0.16,.F.);',
      '#146=IFCMATERIALLAYER(#140,0.015,$);',
      "#147=IFCMATERIALLAYERSET((#143,#144,#145,#146),'AW 43');",
      '#148=IFCMATERIALLAYERSETUSAGE(#147,.AXIS2.,.POSITIVE.,0.);',
      `#149=IFCRELASSOCIATESMATERIAL('${gid('r149')}',$,$,$,(#100),#148);`,
    );
    expect(lesung.modell?.bauteile[0]?.materialien).toEqual(['Putz', 'Kalksandstein', 'Dämmung']);
  });

  it('IFC 4: liest Bestandteile, Profile und Listen', () => {
    const lesung = lesen(
      "#150=IFCMATERIALCONSTITUENTSET('Fenster',$,(#151,#152));",
      "#151=IFCMATERIALCONSTITUENT('Rahmen',$,#153,$,$);",
      "#152=IFCMATERIALCONSTITUENT('Verglasung',$,#154,$,$);",
      "#153=IFCMATERIAL('Holz',$,$);",
      "#154=IFCMATERIAL('Glas',$,$);",
      "#160=IFCMATERIALPROFILESET('HEA',$,(#161),$);",
      "#161=IFCMATERIALPROFILE('HEA 200',$,#162,$,$,$);",
      "#162=IFCMATERIAL('S235',$,$);",
      '#163=IFCMATERIALPROFILESETUSAGE(#160,$,$);',
      '#164=IFCMATERIALLIST((#153,#165));',
      "#165=IFCMATERIAL('Stahl',$,$);",
      `#170=IFCRELASSOCIATESMATERIAL('${gid('r170')}',$,$,$,(#100),#150);`,
      `#171=IFCRELASSOCIATESMATERIAL('${gid('r171')}',$,$,$,(#100),#163);`,
      `#172=IFCRELASSOCIATESMATERIAL('${gid('r172')}',$,$,$,(#100),#164);`,
    );
    expect(lesung.modell?.bauteile[0]?.materialien).toEqual(['Holz', 'Glas', 'S235', 'Stahl']);
  });

  it('nimmt die Materialien des Typs nur, wenn das Bauteil selbst keine nennt', () => {
    const lesung = lesen(
      `#200=IFCWALL('${gid('wand2')}',$,'Wand 2',$,$,$,$,$,$);`,
      `#201=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r201')}',$,$,$,(#200),#12);`,
      `#202=IFCRELDEFINESBYPROPERTIES('${gid('r202')}',$,$,$,(#200),#102);`,
      `#110=IFCWALLTYPE('${gid('typ')}',$,'AW',$,$,$,$,$,$,.STANDARD.);`,
      `#111=IFCRELDEFINESBYTYPE('${gid('r111')}',$,$,$,(#100,#200),#110);`,
      "#140=IFCMATERIAL('Beton',$,$);",
      "#141=IFCMATERIAL('Ziegel',$,$);",
      `#142=IFCRELASSOCIATESMATERIAL('${gid('r142')}',$,$,$,(#110),#140);`,
      `#143=IFCRELASSOCIATESMATERIAL('${gid('r143')}',$,$,$,(#100),#141);`,
    );
    expect(lesung.modell?.bauteile.map((b) => b.materialien)).toEqual([['Ziegel'], ['Beton']]);
  });
});
