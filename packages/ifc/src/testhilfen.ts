// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: kleine, selbst verfasste IFC-Texte (C4) und die Fixtures unter `fixtures/`. Produktivcode importiert
// diese Datei nie (A2, Paketgrenzen).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import type { IfcLesung } from './typen';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Bytes einer Datei unter `fixtures/`, z. B. `ifc/haus-v1.ifc`. */
export function fixtureBytes(pfad: string): Uint8Array {
  return new Uint8Array(readFileSync(join(wurzel, 'fixtures', pfad)));
}

/** Inhalt einer JSON-Datei unter `fixtures/`. */
export function fixtureJson(pfad: string): unknown {
  return JSON.parse(readFileSync(join(wurzel, 'fixtures', pfad), 'utf8'));
}

/** Text als Bytes (UTF-8; für reinen ASCII-Text gleich ASCII). */
export function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Text als Bytes in ISO 8859-1 (jedes Zeichen bis U+00FF ein Byte). */
export function latin1(text: string): Uint8Array {
  return Uint8Array.from(text, (z) => z.charCodeAt(0));
}

/** Gültige GlobalId (22 Zeichen, IFC-Base64) aus einem lesbaren Kürzel: `gid('wand1')` → `wand1_________________`. */
export function gid(kurz: string): string {
  return kurz.padEnd(22, '_');
}

export interface Kopfangaben {
  readonly schema?: string;
  readonly beschreibung?: string;
  readonly name?: string;
}

/** Ganze STEP-Datei mit Kopf und den gegebenen DATA-Zeilen. */
export function ifcText(daten: readonly string[], kopf: Kopfangaben = {}): string {
  return [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('${kopf.beschreibung ?? 'ViewDefinition [CoordinationView]'}'),'2;1');`,
    `FILE_NAME('${kopf.name ?? 'haus.ifc'}','2026-11-12T10:00:00',('Autorin'),('Planungsb\\X\\FCro'),'Testhilfe','Tethys Test','');`,
    `FILE_SCHEMA(('${kopf.schema ?? 'IFC4'}'));`,
    'ENDSEC;',
    'DATA;',
    ...daten,
    'ENDSEC;',
    'END-ISO-10303-21;',
    '',
  ].join('\n');
}

/** Einheiten in Meter, Quadratmeter, Kubikmeter, Kilogramm, Sekunde. */
export const EINHEITEN_SI: readonly string[] = [
  '#3=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);',
  '#4=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);',
  '#5=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);',
  '#6=IFCSIUNIT(*,.MASSUNIT.,.KILO.,.GRAM.);',
  '#7=IFCSIUNIT(*,.TIMEUNIT.,$,.SECOND.);',
];

/**
 * Projekt (#1) mit Einheiten (#2 bis #9), Grundstück (#10), Gebäude (#11), Geschoss EG (#12), verbunden über
 * `IfcRelAggregates` (#13 bis #15). Die Einheitenzeilen tragen die Nummern #3 bis #9; die Zuweisung nennt alle.
 */
export function grundgeruest(einheiten: readonly string[] = EINHEITEN_SI): string[] {
  const nummern = einheiten.map((z) => /^(#[0-9]+)=/.exec(z)?.[1] ?? '');
  return [
    `#1=IFCPROJECT('${gid('projekt')}',$,'Projekt',$,$,$,$,$,#2);`,
    `#2=IFCUNITASSIGNMENT((${nummern.join(',')}));`,
    ...einheiten,
    `#10=IFCSITE('${gid('grundstueck')}',$,'Grundst\\X\\FCck',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);`,
    `#11=IFCBUILDING('${gid('gebaeude')}',$,'Haus',$,$,$,$,$,.ELEMENT.,$,$,$);`,
    `#12=IFCBUILDINGSTOREY('${gid('eg')}',$,'EG',$,$,$,$,$,.ELEMENT.,0.);`,
    `#13=IFCRELAGGREGATES('${gid('r13')}',$,$,$,#1,(#10));`,
    `#14=IFCRELAGGREGATES('${gid('r14')}',$,$,$,#10,(#11));`,
    `#15=IFCRELAGGREGATES('${gid('r15')}',$,$,$,#11,(#12));`,
  ];
}

/** Abgewiesen mit genau einem Fehler, ohne Modell; liefert dessen Code. */
export function abgewiesen(lesung: IfcLesung): string {
  expect(lesung.modell).toBeNull();
  expect(lesung.befunde).toHaveLength(1);
  expect(lesung.befunde[0]?.schwere).toBe('fehler');
  return lesung.befunde[0]?.code ?? '';
}

/** Codes der Befunde in ihrer Reihenfolge. */
export function codes(lesung: IfcLesung): string[] {
  return lesung.befunde.map((b) => b.code);
}
