// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Bauzeitseiten und das Ziel nach Rückgängig/Wiederholen eines Bauzeitenplans (Ticket 118). Ohne Abhängigkeit
// auf Fachpakete oder Speicher, damit Hülle und Historie sie billig importieren (wie `kosten/pfad.ts`).

import type { Aenderung, Bauzeitenplan, BauzeitenplanId, ProjektId } from '@tethys/vertrag';

/** Liste der Bauzeitenpläne eines Projekts. */
export function bauzeitPfad(projektId: ProjektId): string {
  return `/projekt/${projektId}/bauzeit`;
}

/** Ein Bauzeitenplan. */
export function bauzeitenplanPfad(projektId: ProjektId, id: BauzeitenplanId): string {
  return `/projekt/${projektId}/bauzeit/${id}`;
}

export type BauzeitRoute =
  | { readonly art: 'liste'; readonly projektId: ProjektId }
  | { readonly art: 'plan'; readonly projektId: ProjektId; readonly id: BauzeitenplanId };

/** Erkennt einen Pfad der Bauzeitseiten; `null`, wenn er keiner ist. */
export function bauzeitRoute(pfad: string): BauzeitRoute | null {
  const m = /^\/projekt\/([^/]+)\/bauzeit(?:\/([^/]+))?$/.exec(pfad);
  if (m?.[1] === undefined) return null;
  const projektId = decodeURIComponent(m[1]) as ProjektId;
  if (m[2] === undefined) return { art: 'liste', projektId };
  return { art: 'plan', projektId, id: decodeURIComponent(m[2]) as BauzeitenplanId };
}

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
  const nachher = rueckwaerts ? cs.bauzeitenplan.vorher : cs.bauzeitenplan.nachher;
  const b = nachher ?? (rueckwaerts ? cs.bauzeitenplan.nachher : cs.bauzeitenplan.vorher);
  if (b === null) return null;
  const ziel = nachher !== null ? bauzeitenplanPfad(projektId, b.id) : bauzeitPfad(projektId);
  return ziel === pfad ? null : ziel;
}
