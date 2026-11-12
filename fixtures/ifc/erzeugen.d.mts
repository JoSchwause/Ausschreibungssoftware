// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2026 Tethys AVA contributors
//
// Typen für TypeScript-Verbraucher des Erzeugers (Ticket 99; Leistungsbudgets D-54 in ifc, ui-modell, bim, apps/web).

/**
 * Text des großen IFC-4-Modells: `bauteile` Bauteile (Standard 10.000) auf `geschosse` Geschossen (Standard 10),
 * deterministisch (gleiche Eingabe, gleicher Text). Wirft bei einer Zahl, die keine ganze Zahl ab 1 ist.
 */
export function erzeugeModell(optionen?: { readonly bauteile?: number; readonly geschosse?: number }): string;
