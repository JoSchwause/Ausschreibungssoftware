// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde der Modellprüfung (Ticket 108; Quelle `modell-pruefung`, D-97.11): die Liste der Codes und der Baustein. Ort nach
// der Lesart an `Befundort`: `globalId` das Bauteil oder der Strukturknoten, `knotenId` die Position einer Zuordnung, `feld`
// das betroffene Feld; ein Befund über zwei Modellstände hat keinen Ort. Rein (A2).

import type { Befundort, Befundschwere, Pruefbefund } from '@tethys/vertrag';

/**
 * Codes der Modellprüfung (stabil für Tests und Oberfläche; die deutsche Anzeige entsteht in der App).
 *
 * - `bauteil-fehlt` (Warnung): Die GlobalId einer Zuordnung steht nicht im gewählten Modell (hängende Zuordnung); keine Zeile.
 * - `globalid-doppelt` (Warnung): Die GlobalId steht mehrfach im Modell; ein Verweis meint das erste Objekt (D-66).
 * - `menge-fehlt` (Fehler): Das Bauteil bzw. der Strukturknoten hat keine Menge dieses Namens; keine Zeile, nie 0.
 * - `mengenart-mehrdeutig` (Fehler): Der Name steht in mehr als einem Mengensatz desselben Objekts; keine Wahl.
 * - `einheit-passt-nicht` (Fehler): Die Einheit der Position passt nicht zur Art der Menge (oder zu `Stueck`); keine Zeile.
 * - `geschosse-fehlen`, `raeume-fehlen` (Fehler): Das Modell hat keinen Strukturknoten dieser Art für eine Bezugsgröße.
 * - `bezugsgroesse-fehlt` (Fehler): Eine Kennwertzeile nennt eine Bezugsgröße ohne Wert; kein Eintrag.
 * - `kostengruppe-doppelt` (Warnung): Zwei Kennwertzeilen nennen dieselbe Kostengruppe; die Beträge werden addiert.
 * - `ueberdeckung-gering` (Warnung): Zwei Modellstände teilen weniger als die Hälfte der GlobalIds des kleineren.
 * - `bauteil-ohne-geometrie` (Warnung): Die Modellansicht fand zu einem Bauteil keine Geometrie (die App meldet es, D-66).
 */
export type Modellbefundcode =
  | 'bauteil-fehlt'
  | 'globalid-doppelt'
  | 'menge-fehlt'
  | 'mengenart-mehrdeutig'
  | 'einheit-passt-nicht'
  | 'geschosse-fehlen'
  | 'raeume-fehlen'
  | 'bezugsgroesse-fehlt'
  | 'kostengruppe-doppelt'
  | 'ueberdeckung-gering'
  | 'bauteil-ohne-geometrie';

const SCHWERE: Readonly<Record<Modellbefundcode, Befundschwere>> = {
  'bauteil-fehlt': 'warnung',
  'globalid-doppelt': 'warnung',
  'menge-fehlt': 'fehler',
  'mengenart-mehrdeutig': 'fehler',
  'einheit-passt-nicht': 'fehler',
  'geschosse-fehlen': 'fehler',
  'raeume-fehlen': 'fehler',
  'bezugsgroesse-fehlt': 'fehler',
  'kostengruppe-doppelt': 'warnung',
  'ueberdeckung-gering': 'warnung',
  'bauteil-ohne-geometrie': 'warnung',
};

/** Ein Befund der Modellprüfung; die Schwere folgt aus dem Code. */
export function modellbefund(code: Modellbefundcode, meldung: string, ort: Befundort = {}): Pruefbefund {
  return { schwere: SCHWERE[code], quelle: 'modell-pruefung', code, meldung, ort };
}
