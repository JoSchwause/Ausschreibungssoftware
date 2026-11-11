// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.3: mechanisch angepasst, Folgeticket (speicher v1.3, Ticket 57). Was `speicher` für den Vertrag v1.3 (Ticket 53)
// braucht, bis Ticket 57 die neuen Felder speichert: die leeren alten Summen und ein lauter Abbruch statt stillen
// Verlusts (Q5). Ticket 57 löscht `pruefeV13` samt Aufruf in `kern.ts`.

import type { ChangeSet, Knoten, LvInhaltKopf, Summenvorher } from '@tethys/vertrag';
import { abbruch } from './ergebnis';

/** Keine alten Summen: das Aggregat entsteht erst (Anlegen, Import der Projektdatei). `Summenaenderung.vorher` ist Pflicht. */
export const LEERES_SUMMENVORHER: Summenvorher = {
  positionen: [],
  gliederungen: [],
  gesamt: null,
  entfernt: { positionen: [], gliederungen: [] },
};

const kopfNeu = (k: LvInhaltKopf | null): string | null =>
  k === null
    ? null
    : k.auftragnehmer !== undefined
      ? 'Auftragnehmer'
      : k.epaBezeichnungen !== undefined
        ? 'EPA-Bezeichnungen'
        : null;

const knotenNeu = (k: Knoten): boolean => k.art === 'position' && k.mengenansatz !== undefined;

/**
 * Weist ein ChangeSet mit `unbekannt` ab, das ein Feld aus v1.3 setzt, das die Tabellen noch nicht halten: Auftragnehmer
 * und EPA-Bezeichnungen am Kopf, Mengenansatz an einer Position (LV und Auftrags-LV). Vor jedem Schreiben, damit nichts
 * halb geschrieben wird.
 */
export function pruefeV13(cs: ChangeSet): void {
  if (cs.art !== 'leistungsverzeichnis' && cs.art !== 'auftrags-leistungsverzeichnis') return;
  const feld = kopfNeu(cs.kopf?.nachher ?? null);
  if (feld !== null) abbruch('unbekannt', `ChangeSet: ${feld} speichert erst Ticket 57 (Vertrag v1.3).`);
  const knoten = [...cs.knoten.hinzugefuegt, ...cs.knoten.geaendert.map((g) => g.nachher)];
  if (knoten.some(knotenNeu))
    abbruch('unbekannt', 'ChangeSet: Mengenansatz speichert erst Ticket 57 (Vertrag v1.3).');
}
