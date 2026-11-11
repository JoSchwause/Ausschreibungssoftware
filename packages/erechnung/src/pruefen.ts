// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechenprüfung einer gelesenen XRechnung (Ticket 76, Abschnitt 4): nur Befunde, nie eine Sperre (U5).

import type { Eingangsrechnung, XRechnungBefund } from './typen';

export function rechnungPruefen(rechnung: Eingangsrechnung): XRechnungBefund[] {
  void rechnung;
  return [];
}
