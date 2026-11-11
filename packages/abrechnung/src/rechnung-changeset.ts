// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet an der Rechnung anwenden und umkehren (Ticket 81; vertrag v1.4, D-36 (8)). Das ChangeSet trägt die ganze
// Rechnung vorher und nachher: Anwenden setzt `nachher`, Umkehren tauscht beide (wie beim Aufmaßblatt, Ticket 80).
// Freigeben und Freigabe aufheben sind so Gegenstücke.

import type { RechnungChangeSetAnwenden, RechnungChangeSetUmkehren } from '@tethys/vertrag';

/**
 * Wendet ein Rechnungs-ChangeSet an. `zustand: null` mit `vorher: null`: die Rechnung entsteht; Ergebnis `null`: sie ist
 * gelöscht. Ein ChangeSet, das nicht zum Zustand passt (Anlegen auf eine vorhandene, Ändern ohne Rechnung, eine andere
 * Kennung), ist ein Programmfehler: die Funktion wirft. Den Inhalt von `vorher` vergleicht sie nicht (D-80.5).
 */
export const rechnungChangeSetAnwenden: RechnungChangeSetAnwenden = (zustand, cs) => {
  const { vorher, nachher } = cs.rechnung;
  if (vorher === null && zustand !== null)
    throw new Error(`Rechnungs-ChangeSet legt ${cs.rechnungId} an, die Rechnung gibt es schon`);
  if (vorher !== null && zustand?.rechnung.id !== cs.rechnungId)
    throw new Error(`Rechnungs-ChangeSet passt nicht zum Zustand: ${cs.rechnungId}`);
  if (nachher !== null && nachher.id !== cs.rechnungId)
    throw new Error(`Rechnungs-ChangeSet mit fremder Rechnung: ${nachher.id} statt ${cs.rechnungId}`);
  return nachher === null ? null : { rechnung: nachher };
};

/** Kehrt ein Rechnungs-ChangeSet ohne Vorzustand um: `vorher` und `nachher` tauschen. */
export const rechnungChangeSetUmkehren: RechnungChangeSetUmkehren = (cs) => ({
  art: 'rechnung',
  rechnungId: cs.rechnungId,
  rechnung: { vorher: cs.rechnung.nachher, nachher: cs.rechnung.vorher },
});
