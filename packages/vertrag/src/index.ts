// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/vertrag: Domänentypen, Befehle, ChangeSet, Schnittstellen (Ticket 02).
// Nur Typen und Konstanten (Nachkommastellen, Massenbefehle, v1.6 das Muster einer GlobalId, v1.7a die Formen und Listen aus
// Ticket 123 und die leeren Einstellungen, v1.7b der Satz der Bauabzugsteuer); keine Logik, keine Laufzeitabhängigkeit.
//
// Vertragsstand: v1.7b (Ticket 128, Welle 7: Vertragsstrafe, Skonto, Bauabzugsteuer und Zahlungen an der Rechnung, A5, D-72)
// auf v1.7a (Ticket 127: Bedienung E8, Kalkulationsangaben E9, Stammdaten E10, Einstellungen E15, Herkunftsformat E6,
// Konstanten aus Ticket 123). Jede Änderung seit v1.6 ist additiv oder optional (A8); die Lesarten stehen an den Typen und als
// D-127.x und D-128.x in den Tickets.

export type * from './marken';
export type * from './zahlen';
export type * from './modell';
export type * from './summen';
export type * from './befehle';
export type * from './changeset';
export type * from './speicher';
export type * from './gaeb';
export type * from './ansicht';
// v1.6 (Ticket 97): die Aggregate der Module X1 bis X4
export type * from './bim';
export type * from './bauzeit';
export type * from './honorar';
export type * from './bauleitung';
// v1.7a (Ticket 127): Einstellungen des Geräts
export type * from './einstellungen';
// v1.7b (Ticket 128): Abzüge und Zahlungen einer Rechnung
export type * from './zahlung';

export { MASSENBEFEHLSARTEN } from './befehle';
export { NACHKOMMASTELLEN } from './zahlen';
export { IFC_GLOBALID_MUSTER } from './bim';
// v1.7a (Ticket 127; Ticket 123 Punkte 1, 5, 8)
export {
  BAUTEILMENGENARTEN,
  IFC_SCHEMATA,
  MENGENART_STUECK,
  MODELLDATEI_HASH_MUSTER,
  STRUKTURKNOTENARTEN,
} from './bim';
export { KALENDERDATUM_MUSTER, KOSTENGRUPPENNUMMER_MUSTER } from './marken';
export { LEERE_EINSTELLUNGEN } from './einstellungen';
// v1.7b (Ticket 128, D-72)
export { BAUABZUGSTEUER_SATZ } from './zahlung';
