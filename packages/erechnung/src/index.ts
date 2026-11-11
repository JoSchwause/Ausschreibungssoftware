// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/erechnung (Ticket 76, D-32): eingehende XRechnung (UBL, CII) lesen. Rein (A2); importiert
// nur `vertrag` und `dezimal` (A3). Ein Format-Rand wie `gaeb` (N4), keine Fachrechnung.

export { STANDARD_MAX_TIEFE, STANDARD_MAX_ZEICHEN, xrechnungLesen } from './lesen';
export type {
  Eingangsrechnung,
  Rechnungsposition,
  Rechnungssummen,
  Umsatzsteueraufschluesselung,
  XRechnungBefund,
  XRechnungBefundcode,
  XRechnungLesung,
  XRechnungOptionen,
  XRechnungSyntax,
} from './typen';
