// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Mengenermittlung (L1). Die Fehlercodes kommen aus `mengen`; die Anzeige entsteht hier.

import type { Formelfehler, Formelfehlercode } from '@tethys/mengen';

/** Anzeigetext je Fehlercode (vollständig, sonst übersetzt der Compiler nicht). */
const FEHLER: Readonly<Record<Formelfehlercode, string>> = {
  'zeichen-unerwartet': 'Unerwartetes Zeichen',
  'zahl-ungueltig': 'Keine gültige Zahl',
  'punkt-statt-komma': 'Dezimalkomma statt Punkt verwenden',
  'klammer-fehlt': 'Klammer wird nicht geschlossen',
  'klammer-zu-viel': 'Schließende Klammer ohne öffnende',
  'ausdruck-leer': 'Ausdruck fehlt',
  'ausdruck-unvollstaendig': 'Ausdruck ist unvollständig',
  'ausdruck-zu-lang': 'Ausdruck ist zu lang',
  'zu-tief': 'Zu viele verschachtelte Klammern',
  'division-durch-null': 'Division durch null',
  'bezug-vorwaerts': 'Bezug auf eine Zeile, die nicht davor steht',
  'bezug-unbekannt': 'Bezug auf eine Zeile oder Variable, die es nicht gibt',
  'bezug-fehlerhaft': 'Bezug auf eine fehlerhafte Zeile',
  'variable-doppelt': 'Variablenname kommt schon vor',
  'variable-ungueltig': 'Kein zulässiger Variablenname',
  'zeile-doppelt': 'Zeilennummer kommt schon vor',
  'formel-unbekannt': 'Diese Formel ist nicht umgesetzt',
};

/** Fehlertext mit Spalte ab 1 (die Spalte aus `mengen` zählt ab 0). */
export function fehlerText(f: Formelfehler): string {
  const text = FEHLER[f.code];
  return f.spalte === null ? text : `${text} (Spalte ${String(f.spalte + 1)})`;
}

export const texte = {
  oeffnen: 'Mengenermittlung',
  tasten: ['Strg', 'Alt', 'E'],
  keinePosition: 'Die Mengenermittlung gibt es nur an Positionen',
  keinePositionText: 'Bitte zuerst eine Position im Grid wählen.',
  titel: 'Mengenermittlung',
  beschreibung:
    'Die Menge der Position ist die Summe der Zeilenergebnisse. Z und Zeilennummer (Z1) oder ein Variablenname beziehen sich auf eine Zeile weiter oben.',
  tabelle: 'Ansatzzeilen',
  spalten: {
    zeile: 'Zeile',
    formel: 'Formel',
    ausdruck: 'Ausdruck',
    variable: 'Variable',
    ergebnis: 'Ergebnis',
    aktionen: 'Aktionen',
  },
  formeln: { 91: 'Freier Rechenansatz' } as Readonly<Record<number, string>>,
  keinAnsatz: 'Noch keine Zeile. Mit „Zeile anlegen“ beginnen.',
  zeileAnlegen: 'Zeile anlegen',
  zeileLoeschen: 'Löschen',
  nachOben: 'Nach oben',
  nachUnten: 'Nach unten',
  ausdruckLabel: (z: number): string => `Ausdruck Zeile ${String(z)}`,
  formelLabel: (z: number): string => `Formel Zeile ${String(z)}`,
  variableLabel: (z: number): string => `Variable Zeile ${String(z)}`,
  loeschenLabel: (z: number): string => `Zeile ${String(z)} löschen`,
  obenLabel: (z: number): string => `Zeile ${String(z)} nach oben`,
  untenLabel: (z: number): string => `Zeile ${String(z)} nach unten`,
  fehlerZu: (z: number): string => `Fehler in Zeile ${String(z)}`,
  summe: 'Summe',
  summeFehler: 'keine Summe, solange eine Zeile einen Fehler hat',
  einheit: 'Einheit',
  tastenHinweis:
    'Enter legt eine Zeile an, Strg+Entf löscht sie, Alt+Pfeil hoch und runter verschieben sie, Strg+Enter übernimmt.',
  abbrechen: 'Abbrechen',
  uebernehmen: 'Übernehmen',
  ansatzEntfernen: 'Ansatz entfernen',
  kennzeichen: 'Menge aus Mengenansatz. Eine direkte Änderung der Menge entfernt den Mengenansatz.',
  imDialog: {
    hinweis: 'Menge aus Mengenansatz',
    oeffnen: 'Mengenermittlung …',
  },
  rueckfrage: {
    titel: 'Mengenansatz wird entfernt',
    einzeln: (name: string): string =>
      `Die Menge von ${name} ergibt sich aus einem Mengenansatz. Ändern Sie die Menge direkt, wird der Mengenansatz entfernt.`,
    mehrere: (n: number): string =>
      `Die Menge von ${String(n)} Positionen ergibt sich aus einem Mengenansatz. Ändern Sie die Mengen direkt, werden die Mengenansätze entfernt.`,
    rueckgaengig: 'Mit Strg+Z lässt sich das rückgängig machen.',
    bestaetigen: 'Mengenansatz entfernen',
    abbrechen: 'Abbrechen',
  },
} as const;
