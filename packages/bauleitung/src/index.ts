// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/bauleitung (Ticket 111, X4, D-57): Befehle an Mangel und Bautagebucheintrag, Statustabelle,
// Fristprüfung zu einem Stichtag und Auswertungen. Rein (A2: keine Uhr, der Stichtag kommt vom Aufrufer); importiert nur
// `vertrag` (A3; `dezimal` wäre erlaubt, wird aber nicht gebraucht).

export { MANGELSTATUS, MANGELSTATUSWECHSEL, mangelstatus, statuswechselZulaessig } from './mangelstatus';
export {
  mangelBefehlAusfuehren,
  mangelChangeSetAnwenden,
  mangelChangeSetUmkehren,
  naechsteMangelnummer,
} from './mangel-befehle';
export type { Fristangaben, Fristbefundcode } from './fristpruefung';
export { fristPruefen, istUeberfaellig } from './fristpruefung';
export type {
  Auftragnehmerangabe,
  Maengelauswertung,
  Maengelauswertungszeile,
  Maengelzahlen,
} from './maengelauswertung';
export { maengelAuswerten } from './maengelauswertung';
export {
  bautagebucheintragBefehlAusfuehren,
  bautagebucheintragChangeSetAnwenden,
  bautagebucheintragChangeSetUmkehren,
} from './bautagebuch-befehle';
export type { Bautagebuchauswertung } from './bautagebuchauswertung';
export { bautagebuchAuswerten } from './bautagebuchauswertung';
