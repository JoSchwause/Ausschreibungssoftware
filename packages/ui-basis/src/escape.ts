// SPDX-License-Identifier: AGPL-3.0-or-later
// Escape zwischen Meldung und Dialog (Ticket 163). Radix gibt Escape der zuletzt registrierten Ebene; eine Meldung ist eine
// solche Ebene. Steht der Fokus in einem Dialog, gehört die Taste dem Dialog: Die Meldung lässt sie stehen und gibt sie hier
// frei, der Dialog schließt dann selbst (auch in dem Augenblick nach dem Öffnen, bevor Radix seine Ebenen neu geordnet hat).

const freigegeben = new WeakSet<Event>();

/** Eine Ebene (die Meldung) hat dieses Escape nicht genommen; der Dialog, in dem der Fokus steht, darf es nehmen. */
export function escapeFreigeben(e: Event): void {
  freigegeben.add(e);
}

/** Nimmt ein freigegebenes Escape genau einmal (ein Dialog in einem Dialog schließt nur den inneren). */
export function freigegebenesEscapeNehmen(e: Event): boolean {
  return freigegeben.delete(e);
}

/** Steht das Ziel der Taste in einem Dialog? */
export const imDialog = (ziel: EventTarget | null): boolean =>
  ziel instanceof Element && ziel.closest('[role="dialog"], [role="alertdialog"]') !== null;
