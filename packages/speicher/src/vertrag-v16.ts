// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.6: mechanisch angepasst, Folgeticket 106 (vertrag v1.6, Ticket 97). Was `speicher` aus v1.6 noch nicht speichern kann,
// weist `anwenden` laut ab (`unbekannt`, Q5), statt es still zu verwerfen: die ChangeSets der neuen Aggregate. Ticket 106 löscht
// diese Datei samt Test, wenn es sie speichert.

import type { ChangeSet } from '@tethys/vertrag';
import { abbruch } from './ergebnis';

/** Die Aggregatarten aus vertrag v1.6, die `speicher` bis Ticket 106 nicht kennt. */
const ARTEN_V16: ReadonlySet<string> = new Set([
  'bauzeitenplan',
  'honorarberechnung',
  'mangel',
  'bautagebucheintrag',
]);

type ChangeSetV16 = Extract<
  ChangeSet,
  { art: 'bauzeitenplan' | 'honorarberechnung' | 'mangel' | 'bautagebucheintrag' }
>;

/** Ist das ChangeSet eines der Aggregate aus v1.6? */
const istV16Aggregat = (cs: ChangeSet): cs is ChangeSetV16 => ARTEN_V16.has(cs.art);

/**
 * Weist ein ChangeSet ab, das Teile aus vertrag v1.6 trägt, die `speicher` noch nicht kennt (Ticket 106). Danach ist es keines
 * der neuen Aggregate (Zusicherung für den Typprüfer).
 */
export function pruefeV16(cs: ChangeSet): asserts cs is Exclude<ChangeSet, ChangeSetV16> {
  if (istV16Aggregat(cs))
    abbruch('unbekannt', `ChangeSets der Art „${cs.art}“ speichert erst Ticket 106 (vertrag v1.6).`);
}
