// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Modellansicht (L1, U8) an einer Stelle. Keine Übersetzung in v1.

import type { Modellfehlercode } from './typen';

export const BESCHRIFTUNG = '3D-Ansicht des Modells';

export const BEDIENHILFE =
  'Pfeiltasten drehen die Ansicht, Umschalt und Pfeiltasten verschieben sie, Plus und Minus zoomen, F zeigt die ' +
  'Auswahl, Pos1 setzt die Ansicht zurück. Ein Klick wählt ein Bauteil aus, Strg und Klick ergänzt die Auswahl. ' +
  'Die Bauteile lassen sich auch im Modellbaum auswählen.';

export const LAEDT = 'Modell wird geladen …';

export const OHNE_GEOMETRIE = 'Das Modell enthält keine Bauteile mit Geometrie.';

export const FEHLERTEXT: Readonly<Record<Modellfehlercode, string>> = {
  'webgl-fehlt': 'Die 3D-Ansicht braucht WebGL 2. Dieser Browser stellt es nicht bereit.',
  'datei-nicht-lesbar': 'Die Datei lässt sich nicht als IFC-Modell lesen.',
  'worker-fehler': 'Die Geometrie des Modells konnte nicht berechnet werden.',
};

/** Name der Leinwand mit der Zahl der Bauteile und der Auswahl; `null`: das Modell lädt noch. */
export function leinwandName(
  beschriftung: string,
  zahlen: { readonly bauteile: number; readonly ausgewaehlt: number } | null,
): string {
  if (zahlen === null) return `${beschriftung}: wird geladen`;
  const bauteile =
    zahlen.bauteile === 0
      ? 'keine Bauteile'
      : `${String(zahlen.bauteile)} ${zahlen.bauteile === 1 ? 'Bauteil' : 'Bauteile'}`;
  const auswahl = zahlen.ausgewaehlt === 0 ? 'keine Auswahl' : `${String(zahlen.ausgewaehlt)} ausgewählt`;
  return `${beschriftung}: ${bauteile}, ${auswahl}`;
}
