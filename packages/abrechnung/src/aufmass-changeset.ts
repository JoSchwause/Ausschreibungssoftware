// SPDX-License-Identifier: AGPL-3.0-or-later
// ChangeSet am Aufmaßblatt anwenden und umkehren (Ticket 80; vertrag v1.4, D-36 (8)). Das ChangeSet trägt das ganze Blatt
// vorher und nachher: Anwenden setzt `nachher`, Umkehren tauscht beide. Beides rein, ohne Vorzustand umkehrbar (ADR 0006).

import type { AufmassChangeSetAnwenden, AufmassChangeSetUmkehren } from '@tethys/vertrag';

/**
 * Wendet ein Aufmaß-ChangeSet an. `zustand: null` mit `vorher: null`: das Blatt entsteht; Ergebnis `null`: das Blatt ist
 * gelöscht (`nachher: null`). Ein ChangeSet, das nicht zum Zustand passt (Anlegen auf ein vorhandenes Blatt, Ändern ohne
 * Blatt, eine andere Kennung), ist ein Programmfehler: die Funktion wirft. Den Inhalt von `vorher` vergleicht sie nicht
 * mit dem Zustand (wie `angebotChangeSetAnwenden`); dass beide übereinstimmen, hält der Befehlsweg.
 */
export const aufmassChangeSetAnwenden: AufmassChangeSetAnwenden = (zustand, cs) => {
  const { vorher, nachher } = cs.aufmass;
  if (vorher === null && zustand !== null)
    throw new Error(`Aufmaß-ChangeSet legt ${cs.aufmassId} an, das Blatt gibt es schon`);
  if (vorher !== null && zustand?.aufmass.id !== cs.aufmassId)
    throw new Error(`Aufmaß-ChangeSet passt nicht zum Zustand: ${cs.aufmassId}`);
  if (nachher !== null && nachher.id !== cs.aufmassId)
    throw new Error(`Aufmaß-ChangeSet mit fremdem Blatt: ${nachher.id} statt ${cs.aufmassId}`);
  return nachher === null ? null : { aufmass: nachher };
};

/** Kehrt ein Aufmaß-ChangeSet ohne Vorzustand um: `vorher` und `nachher` tauschen; Anlegen und Löschen sind Gegenstücke. */
export const aufmassChangeSetUmkehren: AufmassChangeSetUmkehren = (cs) => ({
  art: 'aufmass',
  aufmassId: cs.aufmassId,
  aufmass: { vorher: cs.aufmass.nachher, nachher: cs.aufmass.vorher },
});
