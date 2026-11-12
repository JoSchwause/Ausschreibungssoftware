// SPDX-License-Identifier: AGPL-3.0-or-later
// Dateiname der Sicherung: `<Projektname>-<Datum>.tethys.json` (G-03). Das Datum ist das Ortsdatum des Nutzers.

import { ERSATZ_PROJEKT, dateinameSauber } from '../dateiname';

const zweistellig = (n: number): string => String(n).padStart(2, '0');

export function sicherungsdateiname(projektname: string, datum: Date): string {
  const tag = `${String(datum.getFullYear())}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
  return `${dateinameSauber(projektname, ERSATZ_PROJEKT)}-${tag}.tethys.json`;
}
