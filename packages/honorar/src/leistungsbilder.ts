// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbilder der HOAI 2021 als Daten (Ticket 101, D-56): je Leistungsbild die Honorartafel. Nur Namen, Tafelwerte
// und Prozentsätze, je mit Vorschrift und Abrufdatum; keine Texte der Grundleistungen aus den Anlagen (C1).

import type { Honorartafel } from './honorartafeln';
import { TAFEL_35, TAFEL_52, TAFEL_56 } from './honorartafeln';

/** Leistungsbild der HOAI, für das die App Honorare rechnet. */
export type Leistungsbild = 'gebaeude' | 'innenraeume' | 'tragwerksplanung' | 'technische-ausruestung';

export interface Leistungsbilddaten {
  /** Anzeigename, z. B. „Gebäude“. */
  readonly bezeichnung: string;
  readonly honorartafel: Honorartafel;
}

export const LEISTUNGSBILDER: Readonly<Record<Leistungsbild, Leistungsbilddaten>> = {
  // Gebäude und Innenräume teilen die Tafel des § 35 Abs. 1.
  gebaeude: { bezeichnung: 'Gebäude', honorartafel: TAFEL_35 },
  innenraeume: { bezeichnung: 'Innenräume', honorartafel: TAFEL_35 },
  tragwerksplanung: { bezeichnung: 'Tragwerksplanung', honorartafel: TAFEL_52 },
  'technische-ausruestung': { bezeichnung: 'Technische Ausrüstung', honorartafel: TAFEL_56 },
};
