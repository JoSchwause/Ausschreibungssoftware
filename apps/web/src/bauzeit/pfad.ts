// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Bauzeitseiten und das Ziel nach Rückgängig/Wiederholen eines Bauzeitenplans (Ticket 118), seit Ticket 131
// aus dem Pfadbaukasten. Ohne Abhängigkeit auf Fachpakete oder Speicher, damit Hülle und Historie sie billig importieren.

import type { Aenderung, Bauzeitenplan, BauzeitenplanId, ProjektId } from '@tethys/vertrag';
import { projektliste, type Listenroute } from '../ui/pfade';

const plaene = projektliste<'plan', BauzeitenplanId>('bauzeit', 'plan');

/** Liste der Bauzeitenpläne eines Projekts. */
export const bauzeitPfad = plaene.liste;

/** Ein Bauzeitenplan. */
export const bauzeitenplanPfad = plaene.einzeln;

export type BauzeitRoute = Listenroute<'plan', BauzeitenplanId>;

/** Erkennt einen Pfad der Bauzeitseiten; `null`, wenn er keiner ist. */
export const bauzeitRoute = plaene.route;

/**
 * Wohin nach einem Teil an einem Bauzeitenplan: Steht er danach, auf seine Seite; ist er weg (Rückgängig eines Anlegens,
 * Wiederholen eines Löschens), in die Liste. `null`: bleiben.
 */
export function bauzeitZiel(
  projektId: ProjektId,
  cs: { readonly bauzeitenplan: Aenderung<Bauzeitenplan> },
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  return plaene.ziel(projektId, cs.bauzeitenplan, rueckwaerts, pfad);
}
