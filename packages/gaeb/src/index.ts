// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/gaeb (Ticket 22): GAEB DA XML 3.3, Phasen X81 und X83 lesen.
// Schreiben (G2), X84 (G3) und Version 3.2 (G4) folgen in eigenen Tickets.

export { leseGaeb, MAX_STUFEN, OZ_MAX_LAENGE, STANDARD_MAX_BYTES } from './lesen';
export type { GaebLesungErgebnis, LeseOptionen } from './lesen';
