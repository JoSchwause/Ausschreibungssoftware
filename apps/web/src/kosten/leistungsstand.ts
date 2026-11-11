// SPDX-License-Identifier: AGPL-3.0-or-later
// Anschluss der Spalte „Abrechnung“ an `abrechnung` (Ticket 89, D-37): Der Leistungsstand je Rechnung kommt aus
// `leistungsstandBerechnen` (Ticket 81). Solange das Paket die Funktion noch nicht liefert, ist der Rechner `null` und die
// Spalte bleibt leer.

import type { LeistungsstandRechner } from './kontrolle';

export const LEISTUNGSSTAND_RECHNER: LeistungsstandRechner | null = null;
