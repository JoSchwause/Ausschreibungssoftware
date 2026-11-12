// SPDX-License-Identifier: AGPL-3.0-or-later
// Sicherheitstests des IFC-Lesers (Ticket 98, Punkt 9): Größengrenze, Tiefengrenze ohne Stapelüberlauf, Kreise in
// Beziehungen und Einheiten, Verweise auf fehlende Instanzen. Nichts davon darf eine Ausnahme auslösen.

import { describe, expect, it } from 'vitest';
import { STANDARD_MAX_TIEFE, ifcLesen } from './index';
import { abgewiesen, bytes, codes, gid, grundgeruest, ifcText } from './testhilfen';

const WAND = [
  `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
  `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
];

describe('Größe', () => {
  it('weist eine Eingabe über der Grenze ab, bevor sie gelesen wird', () => {
    const daten = bytes(ifcText([...grundgeruest(), ...WAND]));
    const lesung = ifcLesen(daten, { maxBytes: daten.length - 1 });
    expect(abgewiesen(lesung)).toBe('eingabe-zu-gross');
    expect(lesung.befunde[0]?.meldung).toContain(String(daten.length - 1));
    expect(ifcLesen(daten, { maxBytes: daten.length }).modell).not.toBeNull();
  });
});

describe('Tiefe', () => {
  it('weist eine zu tief verschachtelte Instanz ab, ohne den Stapel zu sprengen, und liest den Rest', () => {
    const tiefe = 100_000;
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(),
          `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,${'('.repeat(tiefe)}${')'.repeat(tiefe)});`,
          `#110=IFCWALL('${gid('wand2')}',$,'Wand 2',$,$,$,$,$,$);`,
          `#111=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r111')}',$,$,$,(#100,#110),#12);`,
        ]),
      ),
    );
    expect(lesung.modell?.bauteile.map((b) => b.name)).toEqual(['Wand 2']);
    expect(codes(lesung)).toEqual(['step-zu-tief', 'bauteil-ohne-mengen']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'fehler', ort: { pfad: '#100' } });
    expect(lesung.befunde[0]?.meldung).toContain(String(STANDARD_MAX_TIEFE));
  });

  it('zählt getypte Werte als Stufe', () => {
    const tiefe = 100_000;
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(),
          `#100=IFCWALL('${gid('wand')}',$,${'IFCLABEL('.repeat(tiefe)}'x'${')'.repeat(tiefe)},$,$,$,$,$,$);`,
          WAND[1] ?? '',
        ]),
      ),
    );
    expect(lesung.modell?.bauteile).toEqual([]);
    expect(codes(lesung)).toEqual(['step-zu-tief']);
  });

  it('hält eine kleinere Grenze aus den Optionen ein', () => {
    // Parameterliste (Stufe 1) und vier Listen darin: Tiefe 5.
    const zeilen = [
      ...grundgeruest(),
      `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,((((1)))));`,
      WAND[1] ?? '',
    ];
    expect(codes(ifcLesen(bytes(ifcText(zeilen)), { maxTiefe: 4 }))).toEqual(['step-zu-tief']);
    expect(codes(ifcLesen(bytes(ifcText(zeilen)), { maxTiefe: 5 }))).toEqual(['bauteil-ohne-mengen']);
  });
});

describe('Kreise und fehlende Verweise', () => {
  it('übersteht Kreise in der Zerlegung', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(),
          ...WAND,
          `#110=IFCMEMBER('${gid('teil')}',$,'Teil',$,$,$,$,$,$);`,
          `#111=IFCRELAGGREGATES('${gid('r111')}',$,$,$,#100,(#110));`,
          `#112=IFCRELAGGREGATES('${gid('r112')}',$,$,$,#110,(#100));`,
          `#113=IFCRELAGGREGATES('${gid('r113')}',$,$,$,#12,(#12));`,
        ]),
      ),
    );
    expect(lesung.modell?.bauteile.map((b) => [b.name, b.teilVonGlobalId])).toEqual([
      ['Wand', gid('teil')],
      ['Teil', gid('wand')],
    ]);
  });

  it('übersteht eine Einheit, die über ihren Faktor auf sich selbst verweist', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(["#3=IFCCONVERSIONBASEDUNIT(*,.LENGTHUNIT.,'Schleife',#30);"]),
          '#30=IFCMEASUREWITHUNIT(IFCLENGTHMEASURE(2.),#3);',
          ...WAND,
          `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto',$,$,(#103));`,
          "#103=IFCQUANTITYLENGTH('Length',$,$,1.,$);",
          `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
        ]),
      ),
    );
    expect(lesung.modell?.bauteile[0]?.mengen[0]?.wert).toBeNull();
    expect(codes(lesung)).toEqual(['einheit-ungueltig']);
  });

  it('meldet Verweise auf fehlende Instanzen überall, ohne abzustürzen', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText([
          ...grundgeruest(),
          ...WAND,
          `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto',$,$,(#103,#901));`,
          "#103=IFCQUANTITYLENGTH('Length',$,#902,1.,$);",
          `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100,#903),#102);`,
          `#105=IFCRELDEFINESBYTYPE('${gid('r105')}',$,$,$,(#100),#904);`,
          `#106=IFCRELASSOCIATESMATERIAL('${gid('r106')}',$,$,$,(#100),#905);`,
          `#107=IFCRELASSOCIATESCLASSIFICATION('${gid('r107')}',$,$,$,(#100),#906);`,
          `#108=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r108')}',$,$,$,(#907),#908);`,
        ]),
      ),
    );
    const [wand] = lesung.modell?.bauteile ?? [];
    expect(wand?.mengen).toEqual([{ satz: 'Qto', name: 'Length', art: 'laenge', wert: null }]);
    expect(
      lesung.befunde.filter((b) => b.code === 'verweis-fehlt').map((b) => b.meldung.match(/#9[0-9]{2}/)?.[0]),
    ).toEqual(expect.arrayContaining(['#901', '#902', '#903', '#904', '#905', '#906', '#907', '#908']));
    expect(lesung.befunde.every((b) => b.code === 'verweis-fehlt')).toBe(true);
  });
});
