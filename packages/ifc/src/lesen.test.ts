// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Datei als Ganzes (Ticket 98, Punkt 1): Erkennen, Schema, Kopf. Die Sollwerte stehen hier von Hand,
// abgelesen aus den selbst verfassten IFC-Texten (C4); sie werden nie aus dem Leser erzeugt.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import { abgewiesen, bytes, ifcText } from './testhilfen';

describe('Keine IFC-Datei', () => {
  it.each([
    ['leere Eingabe', ''],
    ['Text', 'Hallo Welt'],
    ['ZIP (ifcZIP)', 'PK\u0003\u0004\u0014\u0000\u0000\u0000'],
    ['XML (ifcXML)', '<?xml version="1.0"?>\n<ifcXML/>'],
    ['nur der Anfang', 'ISO-10303-21'],
  ])('weist %s ab', (_name, text) => {
    expect(abgewiesen(ifcLesen(bytes(text)))).toBe('keine-ifc-datei');
  });
});

describe('Schema', () => {
  it.each([
    ['IFC4', 'IFC4'],
    ['IFC4X0_ADD2', 'IFC4'],
    ['IFC4_ADD2', 'IFC4'],
    ['ifc4', 'IFC4'],
    ['IFC2X3', 'IFC2X3'],
    ['IFC2X3_TC1', 'IFC2X3'],
  ])('liest FILE_SCHEMA %s als %s', (kennung, schema) => {
    const lesung = ifcLesen(bytes(ifcText([], { schema: kennung })));
    expect(lesung.modell?.schema).toBe(schema);
    expect(lesung.modell?.kopf.schemakennung).toBe(kennung);
  });

  it.each(['IFC2X2_FINAL', 'IFC4X1', 'IFC4X3_ADD2', 'AUTOMOTIVE_DESIGN', ''])(
    'weist das Schema „%s“ ab',
    (kennung) => {
      const lesung = ifcLesen(bytes(ifcText([], { schema: kennung })));
      expect(abgewiesen(lesung)).toBe('schema-nicht-unterstuetzt');
      expect(lesung.befunde[0]?.meldung).toContain(kennung === '' ? 'kein Schema' : kennung);
    },
  );

  it('weist einen Kopf ohne FILE_SCHEMA als „keine IFC-Datei“ ab', () => {
    const text = "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((''),'2;1');\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n";
    expect(abgewiesen(ifcLesen(bytes(text)))).toBe('keine-ifc-datei');
  });

  it('weist eine Datei ohne Abschnitt DATA als „keine IFC-Datei“ ab', () => {
    const text = "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nEND-ISO-10303-21;\n";
    expect(abgewiesen(ifcLesen(bytes(text)))).toBe('keine-ifc-datei');
  });
});

describe('Kopf', () => {
  it('liest FILE_DESCRIPTION, FILE_NAME und FILE_SCHEMA', () => {
    const text = [
      'ISO-10303-21;',
      'HEADER;',
      "/* ein Kommentar; mit Semikolon */ FILE_DESCRIPTION(('ViewDefinition [ReferenceView_V1.2]','Zweite Zeile'),'2;1');",
      "FILE_NAME('Haus EG.ifc','2026-11-12T10:15:00',('Anna Muster','Ben'),('B\\X\\FCro'),'Leser 1.0','CAD 26','Keine');",
      "FILE_SCHEMA(('IFC4X0_ADD2'));",
      'ENDSEC;',
      'DATA;',
      'ENDSEC;',
      'END-ISO-10303-21;',
    ].join('\n');
    const lesung = ifcLesen(bytes(text));
    expect(lesung.befunde).toEqual([]);
    expect(lesung.modell?.kopf).toEqual({
      beschreibung: ['ViewDefinition [ReferenceView_V1.2]', 'Zweite Zeile'],
      name: 'Haus EG.ifc',
      zeitstempel: '2026-11-12T10:15:00',
      autoren: ['Anna Muster', 'Ben'],
      organisationen: ['Büro'],
      praeprozessor: 'Leser 1.0',
      erzeugendesSystem: 'CAD 26',
      autorisierung: 'Keine',
      schemakennung: 'IFC4X0_ADD2',
    });
  });

  it('liest leere Angaben als null bzw. leere Liste', () => {
    const text = [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION((''),'2;1');",
      "FILE_NAME('','',(''),(''),'','','');",
      "FILE_SCHEMA(('IFC2X3'));",
      'ENDSEC;',
      'DATA;',
      'ENDSEC;',
      'END-ISO-10303-21;',
    ].join('\n');
    expect(ifcLesen(bytes(text)).modell?.kopf).toEqual({
      beschreibung: [],
      name: null,
      zeitstempel: null,
      autoren: [],
      organisationen: [],
      praeprozessor: null,
      erzeugendesSystem: null,
      autorisierung: null,
      schemakennung: 'IFC2X3',
    });
  });
});
