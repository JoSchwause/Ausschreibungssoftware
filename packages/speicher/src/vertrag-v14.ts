// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.4: mechanisch angepasst, Folgeticket (Ticket 79). Vertrag v1.4 (Ticket 70) bringt Felder und Aggregate, die
// `speicher` noch nicht ablegt. Statt sie still zu verwerfen (Q5: Kopf und Knoten liegen spaltenweise), weist `anwenden`
// ein solches ChangeSet laut mit `unbekannt` ab, wie bis Ticket 57 `pruefeV13` (D-53.3). Ticket 79 legt die Felder ab und
// löscht diese Datei samt Aufruf und Test.

import type { ChangeSet, LvKopf } from '@tethys/vertrag';
import { abbruch } from './ergebnis';

/** Das erste Feld aus Vertrag v1.4 am LV-Kopf, das `speicher` noch nicht ablegt; `null`: keines. */
function kopfFeldV14(k: LvKopf | null): string | null {
  if (k?.nachtrag !== undefined) return 'nachtrag';
  return null;
}

/** Wirft `unbekannt`, wenn das ChangeSet etwas aus Vertrag v1.4 trägt, das `speicher` noch nicht ablegt. */
export function pruefeV14(cs: ChangeSet): void {
  const nein = (was: string): never =>
    abbruch('unbekannt', `${was} (Vertrag v1.4) speichert erst Ticket 79; es wurde nichts geschrieben.`);
  if (cs.art === 'leistungsverzeichnis' && cs.kopf !== null) {
    const feld = kopfFeldV14(cs.kopf.nachher) ?? kopfFeldV14(cs.kopf.vorher);
    if (feld !== null) nein(`Das Feld ${feld} am LV-Kopf`);
  }
}
