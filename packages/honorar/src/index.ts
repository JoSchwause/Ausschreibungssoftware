// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/honorar (Ticket 101, D-56): Honorare nach der HOAI 2021 mit den Honorartafeln als Daten.
// Rein (A2); importiert nur `vertrag` und `dezimal` (A3).

export type { Honorarspanne, Honorartafel, Honorarzone, Quelle, Tafelzeile } from './honorartafeln';
export type {
  Leistungsbild,
  Leistungsbilddaten,
  Leistungsphase,
  Leistungsphasennummer,
} from './leistungsbilder';
export { LEISTUNGSBILDER } from './leistungsbilder';
