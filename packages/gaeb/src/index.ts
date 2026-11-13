// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/gaeb: GAEB DA XML 3.3, 3.2 und 3.1 lesen (X81, X83, X86; Ticket 22, 32, 40, 129),
// schreiben nur 3.3 und 3.2 (X81, X83, X86; Ticket 40, G-10); Angebote X84 → `AngebotAnlegen` (Ticket 45; 3.1 seit 129).

export { leseGaeb, MAX_STUFEN, OZ_MAX_LAENGE, STANDARD_MAX_BYTES, STANDARD_MWST_SATZ } from './lesen';
export type { GaebLesungErgebnis, LeseOptionen } from './lesen';
export { GRENZEN, VERSIONSDATUM, gaebKennung, schreibeGaeb } from './schreiben';
export type { ExportPhase, ExportVersion, SchreibInhalt, SchreibOptionen } from './schreiben';
export { leseAngebot } from './angebot';
export type { AngebotLeseOptionen, AngebotLesung } from './angebot';
export { x31Lesen } from './x31';
export type { X31Aufmass, X31Lesung } from './x31';
export { aufmassAlsX31 } from './x31-schreiben';
export type { X31SchreibOptionen } from './x31-schreiben';
