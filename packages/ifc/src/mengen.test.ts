// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Mengen und Einheiten (Ticket 98, Punkte 2, 3 und 6). Die Sollwerte sind von Hand gerechnet: Text der
// Datei exakt × Faktor der Einheit (exakt), dann kaufmännisch auf 3 Stellen. Mehrere Werte sind so gewählt, dass eine
// Rechnung in Gleitkomma anders runden würde (1.0005 ist binär 1.000499…; 1000.5 / 1000 ebenso).

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import type { IfcLesung } from './index';
import { EINHEITEN_SI, bytes, codes, gid, grundgeruest, ifcText } from './testhilfen';

/** Wand #100 im EG mit einem Mengensatz #110 aus den gegebenen Mengen (#111 …). */
function wandMitMengen(mengen: readonly string[], satz = 'Qto_WallBaseQuantities'): string[] {
  const nummern = mengen.map((_, k) => `#${String(111 + k)}`);
  return [
    `#100=IFCWALL('${gid('wand')}',$,'Wand',$,$,$,$,$,$);`,
    `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
    `#110=IFCELEMENTQUANTITY('${gid('qto')}',$,'${satz}',$,$,(${nummern.join(',')}));`,
    ...mengen.map((m, k) => `${nummern[k] ?? ''}=${m}`),
    `#130=IFCRELDEFINESBYPROPERTIES('${gid('r130')}',$,$,$,(#100),#110);`,
  ];
}

function lesen(einheiten: readonly string[], ...zeilen: string[]): IfcLesung {
  return ifcLesen(bytes(ifcText([...grundgeruest(einheiten), ...zeilen])));
}

/** Mengen der ersten Wand als [Name, Art, Wert]. */
function mengen(lesung: IfcLesung): [string, string, string | null][] {
  return (lesung.modell?.bauteile[0]?.mengen ?? []).map((m) => [m.name, m.art, m.wert]);
}

describe('Mengen in SI-Einheiten', () => {
  it('liest alle sechs Arten mit Satz, Name, Art und Wert auf 3 Stellen', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('Length',$,$,5.,$);",
        "IFCQUANTITYAREA('NetSideArea',$,$,12.5,$);",
        "IFCQUANTITYVOLUME('NetVolume',$,$,3.6000000000000001,$);",
        "IFCQUANTITYCOUNT('Anzahl',$,$,2,$);",
        "IFCQUANTITYWEIGHT('GrossWeight',$,$,7200.,$);",
        "IFCQUANTITYTIME('Montagezeit',$,$,1800.,$);",
      ]),
    );
    expect(lesung.befunde).toEqual([]);
    expect(lesung.modell?.bauteile[0]?.mengen).toEqual([
      { satz: 'Qto_WallBaseQuantities', name: 'Length', art: 'laenge', wert: '5.000' },
      { satz: 'Qto_WallBaseQuantities', name: 'NetSideArea', art: 'flaeche', wert: '12.500' },
      { satz: 'Qto_WallBaseQuantities', name: 'NetVolume', art: 'volumen', wert: '3.600' },
      { satz: 'Qto_WallBaseQuantities', name: 'Anzahl', art: 'anzahl', wert: '2.000' },
      { satz: 'Qto_WallBaseQuantities', name: 'GrossWeight', art: 'gewicht', wert: '7200.000' },
      { satz: 'Qto_WallBaseQuantities', name: 'Montagezeit', art: 'zeit', wert: '1800.000' },
    ]);
  });

  it('liest IFC 2x3 (vier Attribute) wie IFC 4 (fünf Attribute mit Formula)', () => {
    const zeilen = (formel: string) =>
      wandMitMengen([
        `IFCQUANTITYLENGTH('Length',$,$,2.5${formel});`,
        `IFCQUANTITYAREA('Area',$,$,1.25${formel});`,
      ]);
    const ifc4 = ifcLesen(bytes(ifcText([...grundgeruest(), ...zeilen(",'L = 2.5'")])));
    const ifc2x3 = ifcLesen(bytes(ifcText([...grundgeruest(), ...zeilen('')], { schema: 'IFC2X3' })));
    expect(mengen(ifc4)).toEqual([
      ['Length', 'laenge', '2.500'],
      ['Area', 'flaeche', '1.250'],
    ]);
    expect(ifc2x3.modell?.bauteile).toEqual(ifc4.modell?.bauteile);
  });

  it('rundet kaufmännisch auf 3 Stellen, exakt aus dem Text der Datei', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('a',$,$,1.0005,$);",
        "IFCQUANTITYLENGTH('b',$,$,1.00049999999999999,$);",
        "IFCQUANTITYLENGTH('c',$,$,2.4999999999999996,$);",
        "IFCQUANTITYLENGTH('d',$,$,-0.0005,$);",
        "IFCQUANTITYLENGTH('e',$,$,0.0004,$);",
        "IFCQUANTITYLENGTH('f',$,$,-0.0004,$);",
      ]),
    );
    expect(mengen(lesung)).toEqual([
      ['a', 'laenge', '1.001'],
      ['b', 'laenge', '1.000'],
      ['c', 'laenge', '2.500'],
      ['d', 'laenge', '-0.001'],
      ['e', 'laenge', '0.000'],
      ['f', 'laenge', '0.000'],
    ]);
  });

  it('liest Gleitkommatext mit Exponent und Ganzzahlen exakt', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('a',$,$,1.E-05,$);",
        "IFCQUANTITYLENGTH('b',$,$,2.5E3,$);",
        "IFCQUANTITYLENGTH('c',$,$,1.2345e+2,$);",
        "IFCQUANTITYLENGTH('d',$,$,-0.5,$);",
        "IFCQUANTITYLENGTH('e',$,$,+7,$);",
        "IFCQUANTITYLENGTH('f',$,$,5.E-4,$);",
        "IFCQUANTITYLENGTH('g',$,$,0.,$);",
      ]),
    );
    expect(mengen(lesung)).toEqual([
      ['a', 'laenge', '0.000'],
      ['b', 'laenge', '2500.000'],
      ['c', 'laenge', '123.450'],
      ['d', 'laenge', '-0.500'],
      ['e', 'laenge', '7.000'],
      ['f', 'laenge', '0.001'],
      ['g', 'laenge', '0.000'],
    ]);
  });

  it('behält denselben Namen in zwei Mengensätzen beide, je mit Satz', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      ...wandMitMengen(["IFCQUANTITYAREA('NetSideArea',$,$,10.,$);"]),
      `#140=IFCELEMENTQUANTITY('${gid('qto2')}',$,'Qto_Eigene',$,$,(#141));`,
      "#141=IFCQUANTITYAREA('NetSideArea',$,$,9.75,$);",
      `#142=IFCRELDEFINESBYPROPERTIES('${gid('r142')}',$,$,$,(#100),#140);`,
    );
    expect(lesung.modell?.bauteile[0]?.mengen).toEqual([
      { satz: 'Qto_WallBaseQuantities', name: 'NetSideArea', art: 'flaeche', wert: '10.000' },
      { satz: 'Qto_Eigene', name: 'NetSideArea', art: 'flaeche', wert: '9.750' },
    ]);
  });
});

describe('Einheiten', () => {
  const MM = [
    '#3=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);',
    '#4=IFCSIUNIT(*,.AREAUNIT.,.MILLI.,.SQUARE_METRE.);',
    '#5=IFCSIUNIT(*,.VOLUMEUNIT.,.CENTI.,.CUBIC_METRE.);',
    '#6=IFCSIUNIT(*,.MASSUNIT.,$,.GRAM.);',
    '#7=IFCSIUNIT(*,.TIMEUNIT.,.MILLI.,.SECOND.);',
  ];

  it('rechnet Präfixe exakt in SI-Grundeinheiten um (mm, mm², cm³, g, ms)', () => {
    const lesung = lesen(
      MM,
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('Length',$,$,5000.,$);",
        "IFCQUANTITYLENGTH('Width',$,$,1000.5,$);",
        "IFCQUANTITYLENGTH('Height',$,$,3600.0000000000001,$);",
        "IFCQUANTITYAREA('NetSideArea',$,$,12500000.,$);",
        "IFCQUANTITYVOLUME('NetVolume',$,$,3600000.,$);",
        "IFCQUANTITYWEIGHT('GrossWeight',$,$,7200000.,$);",
        "IFCQUANTITYTIME('Montagezeit',$,$,1800000.,$);",
        "IFCQUANTITYCOUNT('Anzahl',$,$,3.,$);",
      ]),
    );
    expect(lesung.befunde).toEqual([]);
    expect(mengen(lesung)).toEqual([
      ['Length', 'laenge', '5.000'],
      ['Width', 'laenge', '1.001'],
      ['Height', 'laenge', '3.600'],
      ['NetSideArea', 'flaeche', '12.500'],
      ['NetVolume', 'volumen', '3.600'],
      ['GrossWeight', 'gewicht', '7200.000'],
      ['Montagezeit', 'zeit', '1800.000'],
      ['Anzahl', 'anzahl', '3.000'],
    ]);
  });

  it('nutzt die eigene Einheit einer Menge statt der des Projekts', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      '#40=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);',
      ...wandMitMengen(["IFCQUANTITYLENGTH('Width',$,#40,240.,$);", "IFCQUANTITYLENGTH('Length',$,$,5.,$);"]),
    );
    expect(mengen(lesung)).toEqual([
      ['Width', 'laenge', '0.240'],
      ['Length', 'laenge', '5.000'],
    ]);
  });

  it('rechnet eine umgerechnete Einheit über ihren Faktor exakt um und meldet es', () => {
    const lesung = lesen(
      [
        "#3=IFCCONVERSIONBASEDUNIT(#30,.LENGTHUNIT.,'FOOT',#31);",
        "#4=IFCCONVERSIONBASEDUNIT(#30,.AREAUNIT.,'SQUARE FOOT',#33);",
        '#5=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);',
        "#6=IFCCONVERSIONBASEDUNIT(#30,.PLANEANGLEUNIT.,'DEGREE',#35);",
      ],
      '#30=IFCDIMENSIONALEXPONENTS(1,0,0,0,0,0,0);',
      '#31=IFCMEASUREWITHUNIT(IFCLENGTHMEASURE(304.8),#32);',
      '#32=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);',
      '#33=IFCMEASUREWITHUNIT(IFCAREAMEASURE(0.09290304),#34);',
      '#34=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);',
      '#35=IFCMEASUREWITHUNIT(IFCPLANEANGLEMEASURE(0.0174532925199433),#36);',
      '#36=IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.);',
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('Length',$,$,10.,$);",
        "IFCQUANTITYLENGTH('Height',$,$,8.5,$);",
        "IFCQUANTITYAREA('NetSideArea',$,$,100.,$);",
      ]),
    );
    expect(mengen(lesung)).toEqual([
      ['Length', 'laenge', '3.048'],
      ['Height', 'laenge', '2.591'],
      ['NetSideArea', 'flaeche', '9.290'],
    ]);
    // Einmal je umgerechneter Einheit, die eine Menge betrifft; der Winkel betrifft keine.
    expect(codes(lesung)).toEqual(['einheit-umgerechnet', 'einheit-umgerechnet']);
    expect(lesung.befunde.map((b) => [b.schwere, b.ort.pfad])).toEqual([
      ['warnung', '#3'],
      ['warnung', '#4'],
    ]);
    expect(lesung.befunde[0]?.meldung).toContain('FOOT');
    expect(lesung.befunde[0]?.meldung).toContain('0.3048');
  });

  it('lässt eine Menge ohne Einheit ohne Wert (nie 0) und meldet es einmal je Art', () => {
    const lesung = lesen(
      ['#5=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);'],
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('Length',$,$,5.,$);",
        "IFCQUANTITYLENGTH('Height',$,$,3.,$);",
        "IFCQUANTITYVOLUME('NetVolume',$,$,1.5,$);",
        "IFCQUANTITYCOUNT('Anzahl',$,$,1.,$);",
      ]),
    );
    expect(mengen(lesung)).toEqual([
      ['Length', 'laenge', null],
      ['Height', 'laenge', null],
      ['NetVolume', 'volumen', '1.500'],
      ['Anzahl', 'anzahl', '1.000'],
    ]);
    expect(codes(lesung)).toEqual(['einheit-fehlt']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'fehler', ort: { pfad: '#111' } });
  });

  it('lässt eine Menge mit unpassender oder unlesbarer Einheit ohne Wert und meldet die Einheit einmal', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      '#40=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);',
      '#41=IFCSIUNIT(*,.LENGTHUNIT.,.ZEHNTEL.,.METRE.);',
      "#42=IFCCONTEXTDEPENDENTUNIT(#30,.LENGTHUNIT.,'Schritt');",
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('a',$,#40,1.,$);",
        "IFCQUANTITYLENGTH('b',$,#40,2.,$);",
        "IFCQUANTITYLENGTH('c',$,#41,3.,$);",
        "IFCQUANTITYLENGTH('d',$,#42,4.,$);",
      ]),
    );
    expect(mengen(lesung)).toEqual([
      ['a', 'laenge', null],
      ['b', 'laenge', null],
      ['c', 'laenge', null],
      ['d', 'laenge', null],
    ]);
    expect(codes(lesung)).toEqual(['einheit-ungueltig', 'einheit-ungueltig', 'einheit-ungueltig']);
    expect(lesung.befunde.map((b) => b.ort.pfad)).toEqual(['#40', '#41', '#42']);
  });

  it('meldet ein fehlendes Projekt; Mengen bleiben dann ohne Einheit', () => {
    const lesung = ifcLesen(
      bytes(
        ifcText([
          `#12=IFCBUILDINGSTOREY('${gid('eg')}',$,'EG',$,$,$,$,$,.ELEMENT.,0.);`,
          ...wandMitMengen(["IFCQUANTITYLENGTH('Length',$,$,5.,$);"]),
        ]),
      ),
    );
    expect(mengen(lesung)).toEqual([['Length', 'laenge', null]]);
    expect(codes(lesung)).toEqual(['projekt-fehlt', 'strukturknoten-ohne-eltern', 'einheit-fehlt']);
  });
});

describe('Unlesbare Mengen', () => {
  it('meldet eine Menge ohne lesbare Zahl und behält sie ohne Wert', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      ...wandMitMengen([
        "IFCQUANTITYLENGTH('a',$,$,$,$);",
        "IFCQUANTITYLENGTH('b',$,$,'zwei',$);",
        "IFCQUANTITYLENGTH('c',$,$,1.E999999,$);",
        "IFCQUANTITYLENGTH('d',$,$,IFCLENGTHMEASURE(4.),$);",
      ]),
    );
    expect(mengen(lesung)).toEqual([
      ['a', 'laenge', null],
      ['b', 'laenge', null],
      ['c', 'laenge', null],
      ['d', 'laenge', '4.000'],
    ]);
    expect(codes(lesung)).toEqual(['menge-ungueltig', 'menge-ungueltig', 'menge-ungueltig']);
    expect(lesung.befunde.map((b) => b.ort.pfad)).toEqual(['#111', '#112', '#113']);
  });

  it('liest andere Mengenarten nicht und meldet sie; eine Menge ohne Namen fällt mit Befund weg', () => {
    const lesung = lesen(
      EINHEITEN_SI,
      ...wandMitMengen([
        "IFCPHYSICALCOMPLEXQUANTITY('Schichten',$,(),'layer',$,$);",
        'IFCQUANTITYLENGTH($,$,$,1.,$);',
        "IFCQUANTITYLENGTH('Length',$,$,2.,$);",
      ]),
    );
    expect(mengen(lesung)).toEqual([['Length', 'laenge', '2.000']]);
    expect(codes(lesung)).toEqual(['menge-nicht-gelesen', 'menge-ungueltig']);
  });
});
