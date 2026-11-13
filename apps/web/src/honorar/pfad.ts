// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Honorarseiten und das Ziel nach Rückgängig/Wiederholen einer Honorarberechnung (Ticket 119), seit Ticket 131
// aus dem Pfadbaukasten. Ohne Abhängigkeit auf Fachpakete oder Speicher, damit die Hülle sie billig importiert.

import type { Aenderung, Honorarberechnung, HonorarberechnungId, ProjektId } from '@tethys/vertrag';
import { projektliste, type Listenroute } from '../ui/pfade';

const berechnungen = projektliste<'berechnung', HonorarberechnungId>('honorar', 'berechnung');

/** Liste der Honorarberechnungen eines Projekts. */
export const honorarPfad = berechnungen.liste;

/** Eine Honorarberechnung. */
export const honorarberechnungPfad = berechnungen.einzeln;

export type HonorarRoute = Listenroute<'berechnung', HonorarberechnungId>;

/** Erkennt einen Pfad der Honorarseiten; `null`, wenn er keiner ist. */
export const honorarRoute = berechnungen.route;

/**
 * Wohin nach einem Teil an einer Honorarberechnung: Steht sie danach (Wiederholen eines Anlegens, Rückgängig eines
 * Löschens, jede Änderung), auf ihrer Seite; ist sie weg (Rückgängig eines Anlegens), in der Liste. `null`: bleiben.
 */
export function honorarZiel(
  projektId: ProjektId,
  cs: { readonly honorarberechnung: Aenderung<Honorarberechnung> },
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  return berechnungen.ziel(projektId, cs.honorarberechnung, rueckwaerts, pfad);
}
