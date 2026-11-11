// SPDX-License-Identifier: AGPL-3.0-or-later
// Bereinigung von Dateinamen an einer Stelle (Review Welle 4, S4): GAEB-Export, Druck und Excel, Sicherung und Export
// der Projektdatei nehmen den Namen von hier.

/** Ersatzname für ein LV ohne verwertbaren Namen. */
export const ERSATZ_LV = 'Leistungsverzeichnis';
/** Ersatzname für ein Projekt ohne verwertbaren Namen. */
export const ERSATZ_PROJEKT = 'projekt';

/**
 * Nur Buchstaben (auch Umlaute), Ziffern, Leerzeichen, `_` und `-` bleiben; mehrere Leerzeichen werden eines, Ränder
 * fallen weg. Bleibt nichts übrig, gilt `ersatz`.
 */
export function dateinameSauber(name: string, ersatz: string): string {
  return (
    name
      .replace(/[^\p{L}\p{N} _-]+/gu, '')
      .replace(/ {2,}/g, ' ')
      .trim() || ersatz
  );
}
