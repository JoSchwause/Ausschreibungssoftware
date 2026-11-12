// SPDX-License-Identifier: AGPL-3.0-or-later
// Anzeige am Rand (Ticket 115, N4): Ansatzzeilen als kurzer Text für die Vorschauen.

import type { Ansatzzeile } from '@tethys/vertrag';

/** „18,874 + 8,649 + 5,500“: die Ausdrücke der Zeilen (aus `bim` schon de-DE mit 3 Stellen, D-108.5). */
export function ansatzText(zeilen: readonly Ansatzzeile[]): string {
  return zeilen.map((z) => z.ausdruck).join(' + ');
}
