// SPDX-License-Identifier: AGPL-3.0-or-later
// Statustabelle der Mängel (Ticket 111 Punkt 1; D-57, Glossar „Mangelstatus“, „Mängelverlauf“). Die Lesart steht hier als
// Tabelle, der Vertrag nennt sie nur (`Mangelstatus`). Rein (A2).

import type { Mangel, Mangelstatus } from '@tethys/vertrag';

/**
 * Zulässige Statuswechsel je Status (Lesart D-57, vorläufige Annahme): offen → angezeigt → beseitigt → abgenommen und
 * beseitigt → offen (die Beseitigung wird nicht anerkannt). Jeder andere Wechsel, auch zum selben Status, ist unzulässig
 * (`statuswechsel-unzulaessig`); `abgenommen` ist endgültig. Ein weiterer Wechsel braucht einen Grund und ein
 * Vertragsticket (Offene Typfrage 12, Ticket 97).
 */
export const MANGELSTATUSWECHSEL: Readonly<Record<Mangelstatus, readonly Mangelstatus[]>> = {
  offen: ['angezeigt'],
  angezeigt: ['beseitigt'],
  beseitigt: ['offen', 'abgenommen'],
  abgenommen: [],
};

/** Die vier Status in der Reihenfolge des Regelwegs. */
export const MANGELSTATUS: readonly Mangelstatus[] = ['offen', 'angezeigt', 'beseitigt', 'abgenommen'];

/** Ist `wert` ein Mangelstatus? (Form eines Befehls prüfen.) */
export function istMangelstatus(wert: unknown): wert is Mangelstatus {
  return typeof wert === 'string' && (MANGELSTATUS as readonly string[]).includes(wert);
}

/**
 * Darf der Verlauf von `von` nach `nach` wechseln? `von: null` heißt: `nach` wäre der erste Eintrag des Verlaufs; der muss
 * `offen` sein.
 */
export function statuswechselZulaessig(von: Mangelstatus | null, nach: Mangelstatus): boolean {
  if (von === null) return nach === 'offen';
  return MANGELSTATUSWECHSEL[von].includes(nach);
}

/**
 * Status eines Mangels: der seines letzten Verlaufseintrags (der Verlauf ist die Quelle, D-57). Der Vertrag sagt einen
 * Verlauf mit mindestens einem Eintrag zu; ein leerer Verlauf ist ein Programmfehler.
 */
export function mangelstatus(mangel: Pick<Mangel, 'verlauf'>): Mangelstatus {
  const letzter = mangel.verlauf.at(-1);
  if (letzter === undefined) throw new Error('Mangel ohne Verlauf');
  return letzter.status;
}
