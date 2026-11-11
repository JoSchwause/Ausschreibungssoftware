// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateiname der Sicherung: `<Projektname>-<Datum>.tethys.json` (G-03). Das Datum ist das Ortsdatum des Nutzers.

const zweistellig = (n: number): string => String(n).padStart(2, '0');

/** Wie der Export der Projektseite: nur Buchstaben, Ziffern, Leerzeichen, `_` und `-` bleiben. */
export function dateinameSauber(name: string): string {
  return name.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'projekt';
}

export function sicherungsdateiname(projektname: string, datum: Date): string {
  const tag = `${String(datum.getFullYear())}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
  return `${dateinameSauber(projektname)}-${tag}.tethys.json`;
}
