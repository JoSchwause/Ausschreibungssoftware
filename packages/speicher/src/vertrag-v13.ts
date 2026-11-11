// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.3: mechanisch angepasst, Folgeticket (speicher v1.3, Ticket 57). Was `speicher` für den Vertrag v1.3 (Ticket 53)
// braucht, bis Ticket 57 die neuen Felder speichert: die leeren alten Summen und ein lauter Abbruch statt stillen
// Verlusts (Q5). Ticket 57 löscht `pruefeV13` samt Aufruf in `kern.ts`.

import type { Summenvorher } from '@tethys/vertrag';

/** Keine alten Summen: das Aggregat entsteht erst (Anlegen, Import der Projektdatei). `Summenaenderung.vorher` ist Pflicht. */
export const LEERES_SUMMENVORHER: Summenvorher = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  entfernt: { positionen: [], gliederungen: [] },
};
