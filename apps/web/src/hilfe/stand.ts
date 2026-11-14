// SPDX-License-Identifier: AGPL-3.0-or-later
// Lesbarer Build-Stand für die Seite „Über“ (Wellen-Review PB7, E14/L1, N4): Das Datum steht im deutschen Format, die Wörter
// kommen aus `texte.ts`. `version.ts` liefert nur die Daten; „unbekannt“ ist dort der Ersatzwert ohne Build.

import { datumDe } from '../lv/kopfdaten';
import type { BuildStand } from '../version';
import { texte } from './texte';

const UNBEKANNT = 'unbekannt';

/** z. B. „abc1234 vom 13.11.2026“. */
export function bauStandText(stand: BuildStand): string {
  const t = texte.ueber;
  if (stand.commit === UNBEKANNT) return t.standUnbekannt;
  return stand.datum === UNBEKANNT ? stand.commit : t.standVom(stand.commit, datumDe(stand.datum));
}
