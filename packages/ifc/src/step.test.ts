// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests des STEP-Lesens (ISO 10303-21; Ticket 98, Punkt 1) über die öffentliche Schnittstelle: Zeichenketten und
// ihre Kodierungen, Kommentare, Aufzählungen, Binärwerte, Syntaxfehler, doppelte Instanzen, abgeschnittene Dateien und
// Dateien, die nicht nur ASCII enthalten. Sollwerte von Hand.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import type { IfcLesung } from './index';
import { bytes, codes, gid, grundgeruest, ifcText, latin1 } from './testhilfen';

/** Wand #100 im EG mit Menge; `name` ist der STEP-Parameter des Namens (mit Apostrophen). */
function wand(name: string): string[] {
  return [
    `#100=IFCWALL('${gid('wand')}',$,${name},$,$,$,$,$,$);`,
    `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
    `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto',$,$,(#103));`,
    "#103=IFCQUANTITYLENGTH('Length',$,$,1.,$);",
    `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
  ];
}

function lesen(...zeilen: string[]): IfcLesung {
  return ifcLesen(bytes(ifcText([...grundgeruest(), ...zeilen])));
}

const name = (lesung: IfcLesung): string | null | undefined => lesung.modell?.bauteile[0]?.name;

describe('Zeichenketten', () => {
  it.each([
    ['Apostroph', "'O''Brien'", "O'Brien"],
    ['\\X\\ (ISO 8859-1)', "'Au\\X\\DFenwand gro\\X\\DF'", 'Außenwand groß'],
    ['\\X2\\ (UCS-2)', "'\\X2\\00E400F600FC\\X0\\ und \\X2\\20AC\\X0\\'", 'äöü und €'],
    ['\\X4\\ (UCS-4)', "'Smiley \\X4\\0001F600\\X0\\'", 'Smiley 😀'],
    ['\\S\\ (Codeseite A)', "'K\\S\\|che'", 'Küche'],
    ['\\P?\\ mit \\S\\ (ISO 8859-2)', "'\\PB\\\\S\\9koda'", 'škoda'],
    ['Backslash', "'C:\\\\Plan'", 'C:\\Plan'],
    ['\\N\\ und \\F\\ fallen weg', "'eins\\N\\zwei\\F\\'", 'einszwei'],
    ['Zeilenumbruch in der Zeichenkette fällt weg', "'Wand\nNord'", 'WandNord'],
    ['Semikolon und Kommentarzeichen sind Text', "'a;b /* c */ d'", 'a;b /* c */ d'],
  ])('%s', (_fall, parameter, erwartet) => {
    const lesung = lesen(...wand(parameter));
    expect(lesung.befunde).toEqual([]);
    expect(name(lesung)).toBe(erwartet);
  });

  it('behält eine ungültige Anweisung als Text und meldet sie', () => {
    const lesung = lesen(...wand("'a\\Q\\b'"));
    expect(name(lesung)).toBe('a\\Q\\b');
    expect(codes(lesung)).toEqual(['zeichenkette-ungueltig']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'warnung', ort: { pfad: '#100' } });
  });

  it.each([
    ['\\X\\ ohne Hexziffern', "'a\\X\\zz'", 'a\\X\\zz'],
    ['\\X2\\ ohne \\X0\\', "'a\\X2\\00E4'", 'a\\X2\\00E4'],
    ['\\X2\\ mit ungerader Länge', "'a\\X2\\0E4\\X0\\'", 'a\\X2\\0E4\\X0\\'],
    ['\\X4\\ über U+10FFFF', "'a\\X4\\00110000\\X0\\'", 'a\\X4\\00110000\\X0\\'],
    ['\\S\\ ohne Zeichen', "'a\\S\\'", 'a\\S\\'],
  ])('meldet %s', (_fall, parameter, erwartet) => {
    const lesung = lesen(...wand(parameter));
    expect(name(lesung)).toBe(erwartet);
    expect(codes(lesung)).toEqual(['zeichenkette-ungueltig']);
  });
});

describe('Aufbau der Datei', () => {
  it('überspringt Kommentare und Leerraum zwischen allen Teilen', () => {
    const lesung = lesen(
      `/* Wand */ #100 = IFCWALL ( /* GlobalId */ '${gid('wand')}' , $ ,\n 'Wand' /* Name */, $,$,$,$,$,$ ) /* Ende */ ;`,
      `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
      `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto',$,$,(#103));`,
      "#103=IFCQUANTITYLENGTH('Length',$,$,1.,$);",
      `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
    );
    expect(lesung.befunde).toEqual([]);
    expect(name(lesung)).toBe('Wand');
  });

  it('liest Klassennamen und Aufzählungen auch in Kleinbuchstaben', () => {
    const lesung = lesen(
      `#100=ifcwall('${gid('wand')}',$,'Wand',$,$,$,$,$,.notdefined.);`,
      `#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r101')}',$,$,$,(#100),#12);`,
      `#102=IFCELEMENTQUANTITY('${gid('q102')}',$,'Qto',$,$,(#103));`,
      "#103=IFCQUANTITYLENGTH('Length',$,$,1.,$);",
      `#104=IFCRELDEFINESBYPROPERTIES('${gid('r104')}',$,$,$,(#100),#102);`,
    );
    expect(lesung.modell?.bauteile[0]?.ifcKlasse).toBe('IfcWall');
  });

  it('liest Binärwerte als Hexziffern', () => {
    const lesung = lesen(
      ...wand("'Wand'"),
      `#110=IFCPROPERTYSET('${gid('p110')}',$,'Pset_Bits',$,(#111));`,
      '#111=IFCPROPERTYSINGLEVALUE(\'Maske\',$,IFCBINARY("20FF"),$);',
      `#112=IFCRELDEFINESBYPROPERTIES('${gid('r112')}',$,$,$,(#100),#110);`,
    );
    expect(lesung.modell?.bauteile[0]?.eigenschaften).toEqual([
      { satz: 'Pset_Bits', name: 'Maske', werte: [{ typ: 'IfcBinary', text: '20FF' }] },
    ]);
  });

  it('meldet eine Instanz mit Syntaxfehler, lässt sie weg und liest den Rest', () => {
    const lesung = lesen(
      `#100=IFCWALL('${gid('wand')}',$,'Wand' 'zwei',$,$,$,$,$,$);`,
      'UNSINN;',
      `#110=IFCWALL('${gid('wand2')}',$,'Wand 2',$,$,$,$,$,$);`,
      `#111=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid('r111')}',$,$,$,(#100,#110),#12);`,
    );
    expect(lesung.modell?.bauteile.map((b) => b.name)).toEqual(['Wand 2']);
    expect(codes(lesung)).toEqual(['step-syntaxfehler', 'step-syntaxfehler', 'bauteil-ohne-mengen']);
    // Kopf 7 Zeilen, Grundgerüst 13 Zeilen: #100 in Zeile 21, UNSINN in Zeile 22.
    expect(lesung.befunde.map((b) => b.ort.zeile)).toEqual([22, 21, 23]);
    expect(lesung.befunde[1]?.ort.pfad).toBe('#100');
  });

  it('meldet eine doppelte Instanznummer; die erste gilt', () => {
    const lesung = lesen(...wand("'Erste'"), `#100=IFCWALL('${gid('wand2')}',$,'Zweite',$,$,$,$,$,$);`);
    expect(name(lesung)).toBe('Erste');
    expect(codes(lesung)).toEqual(['instanz-doppelt']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'fehler', ort: { pfad: '#100', zeile: 26 } });
  });

  it('liest eine abgeschnittene Datei bis zur letzten vollständigen Instanz und meldet es', () => {
    const text = ifcText([...grundgeruest(), ...wand("'Wand'")]);
    const ende = text.indexOf('ENDSEC;\nEND-ISO');
    const lesung = ifcLesen(bytes(`${text.slice(0, ende)}#200=IFCWALL('${gid('halb')}',$,'Ha`));
    expect(name(lesung)).toBe('Wand');
    expect(codes(lesung)).toEqual(['datei-unvollstaendig']);
    expect(lesung.befunde[0]?.schwere).toBe('warnung');
  });

  it('meldet eine Datei ohne Schluss END-ISO-10303-21', () => {
    const text = ifcText([...grundgeruest(), ...wand("'Wand'")]).replace('END-ISO-10303-21;\n', '');
    const lesung = ifcLesen(bytes(text));
    expect(name(lesung)).toBe('Wand');
    expect(codes(lesung)).toEqual(['datei-unvollstaendig']);
  });
});

describe('Kodierung der Datei', () => {
  it('liest UTF-8 statt ASCII und meldet es', () => {
    const lesung = ifcLesen(bytes(ifcText([...grundgeruest(), ...wand("'Wand Süd'")])));
    expect(name(lesung)).toBe('Wand Süd');
    expect(codes(lesung)).toEqual(['kodierung-utf8']);
    expect(lesung.befunde[0]?.schwere).toBe('warnung');
  });

  it('liest Latin-1 statt ASCII und meldet es', () => {
    const lesung = ifcLesen(latin1(ifcText([...grundgeruest(), ...wand("'Wand Süd'")])));
    expect(name(lesung)).toBe('Wand Süd');
    expect(codes(lesung)).toEqual(['kodierung-latin1']);
  });

  it('liest eine Datei mit Byte-Order-Mark als UTF-8 und meldet es', () => {
    const lesung = ifcLesen(bytes(`\uFEFF${ifcText([...grundgeruest(), ...wand("'Wand'")])}`));
    expect(name(lesung)).toBe('Wand');
    expect(codes(lesung)).toEqual(['kodierung-utf8']);
  });
});
