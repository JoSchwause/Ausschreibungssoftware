// SPDX-License-Identifier: AGPL-3.0-or-later
// Die OZ eines Knotens als Anzeigetext, an einer Stelle für die App (Review Welle 4, S6). Das LV-Grid (`ui-grid`,
// `anzeigeText`) und der Druck (`ausgabe`) bilden denselben Text in ihrem Paket; Pakete teilen keinen Code (A3).

import type { Knoten } from '@tethys/vertrag';

/** Ordnungszahl, an einer Position mit Index (`02.0070` + `A`); ein Hinweistext und eine fehlende OZ ergeben ''. */
export function ozText(k: Knoten): string {
  if (k.art === 'hinweis') return '';
  return (k.ordnungszahl ?? '') + (k.art === 'position' ? (k.ozIndex ?? '') : '');
}
