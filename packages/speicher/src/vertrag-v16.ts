// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.6: mechanisch angepasst, Folgeticket 106 (vertrag v1.6, Ticket 97). Was `speicher` aus v1.6 noch nicht speichern kann,
// weist `anwenden` laut ab (`unbekannt`, Q5), statt es still zu verwerfen: Bauteilzuordnungen an Positionen (die Spalten fehlen
// bis Migration 6) und die ChangeSets der neuen Aggregate. Ticket 106 löscht diese Datei samt Test, wenn es sie speichert.

import type { ChangeSet, Knoten } from '@tethys/vertrag';
import { abbruch } from './ergebnis';

/** Die Aggregatarten aus vertrag v1.6, die `speicher` bis Ticket 106 nicht kennt. */
const ARTEN_V16: ReadonlySet<string> = new Set([
  'bauwerksmodell',
  'bauzeitenplan',
  'honorarberechnung',
  'mangel',
  'bautagebucheintrag',
]);

type ChangeSetV16 = Extract<
  ChangeSet,
  { art: 'bauwerksmodell' | 'bauzeitenplan' | 'honorarberechnung' | 'mangel' | 'bautagebucheintrag' }
>;

/** Ist das ChangeSet eines der Aggregate aus v1.6? */
const istV16Aggregat = (cs: ChangeSet): cs is ChangeSetV16 => ARTEN_V16.has(cs.art);

const mitBauteilen = (k: Knoten): boolean => k.art === 'position' && k.bauteile !== undefined;

/**
 * Weist ein ChangeSet ab, das Teile aus vertrag v1.6 trägt, die `speicher` noch nicht kennt (Ticket 106). Danach ist es keines
 * der neuen Aggregate (Zusicherung für den Typprüfer).
 */
export function pruefeV16(cs: ChangeSet): asserts cs is Exclude<ChangeSet, ChangeSetV16> {
  if (istV16Aggregat(cs))
    abbruch('unbekannt', `ChangeSets der Art „${cs.art}“ speichert erst Ticket 106 (vertrag v1.6).`);
  if (cs.art !== 'leistungsverzeichnis' && cs.art !== 'auftrags-leistungsverzeichnis') return;
  const knoten: Knoten[] = [...cs.knoten.hinzugefuegt, ...cs.knoten.geaendert.map((g) => g.nachher)];
  if (cs.art === 'leistungsverzeichnis' && cs.papierkorb !== undefined) {
    for (const e of [...cs.papierkorb.hinzugefuegt, ...cs.papierkorb.geaendert.map((g) => g.nachher)])
      knoten.push(...e.knoten);
  }
  if (knoten.some(mitBauteilen))
    abbruch('unbekannt', 'Bauteilzuordnungen an Positionen speichert erst Ticket 106 (vertrag v1.6).');
}
