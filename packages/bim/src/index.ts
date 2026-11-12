// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/bim (Ticket 108, D-50): Fachlogik rund um das Bauwerksmodell. Rein (A2); importiert nur
// `vertrag` und `dezimal` (A3). Baut Befehle und Ansatzzeilen als Daten; die Mengen eines Ansatzes rechnet die App mit
// `mengen` (D-22, D-53).

export {
  bauwerksmodellBefehlAusfuehren,
  bauwerksmodellChangeSetAnwenden,
  bauwerksmodellChangeSetUmkehren,
} from './bauwerksmodell-befehle';
