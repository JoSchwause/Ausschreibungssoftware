// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/mengen (Ticket 35): Mengenansatz nach Art der REB-Verfahrensbeschreibung 23.003,
// zuerst nur der freie Rechenansatz (Formel 91). Rein (A2); importiert nur `vertrag` und `dezimal` (A3).

export {
  FREIER_RECHENANSATZ,
  MAX_AUSDRUCK_ZEICHEN,
  MAX_KLAMMERTIEFE,
  MENGEN_ANNAHMEN,
  ZWISCHENSTELLEN,
} from './annahmen';
export type { Ausdruck, Operator, Punktoperator, Strichoperator } from './ausdruck';
export { ausdruckFormatieren, ausdruckLesen } from './ausdruck';
export type { Formelfehler, Formelfehlercode } from './fehler';
