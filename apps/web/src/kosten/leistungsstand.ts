// SPDX-License-Identifier: AGPL-3.0-or-later
// Anschluss der Spalte „Abrechnung“ an `abrechnung` (Ticket 89, D-37): Leistungsstand einer Rechnung aus dem Auftrags-LV, den
// Aufmaßblättern der Rechnung (`aufmassIds`) und ihrer Art (`leistungsstandBerechnen`, Ticket 81). Befunde der Berechnung
// gehören zur Rechnungsprüfung (Ticket 88), nicht zur Kostenkontrolle.

import { leistungsstandBerechnen } from '@tethys/abrechnung';
import type { LeistungsstandRechner } from './kontrolle';

export const LEISTUNGSSTAND_RECHNER: LeistungsstandRechner | null = (auftrag, rechnung, aufmasse) =>
  leistungsstandBerechnen(auftrag, aufmasse, rechnung.art).leistungsstand;
