// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Honorarseiten und das Ziel nach Rückgängig/Wiederholen einer Honorarberechnung (Ticket 119). Ohne
// Abhängigkeit auf Fachpakete oder Speicher, damit die Hülle sie billig importiert (wie `kosten/pfad.ts`).

import type { Aenderung, Honorarberechnung, HonorarberechnungId, ProjektId } from '@tethys/vertrag';

/** Liste der Honorarberechnungen eines Projekts. */
export function honorarPfad(projektId: ProjektId): string {
  return `/projekt/${projektId}/honorar`;
}

/** Eine Honorarberechnung. */
export function honorarberechnungPfad(projektId: ProjektId, id: HonorarberechnungId): string {
  return `/projekt/${projektId}/honorar/${id}`;
}

export type HonorarRoute =
  | { readonly art: 'liste'; readonly projektId: ProjektId }
  | { readonly art: 'berechnung'; readonly projektId: ProjektId; readonly id: HonorarberechnungId };

/** Erkennt einen Pfad der Honorarseiten; `null`, wenn er keiner ist. */
export function honorarRoute(pfad: string): HonorarRoute | null {
  const m = /^\/projekt\/([^/]+)\/honorar(?:\/([^/]+))?$/.exec(pfad);
  if (m?.[1] === undefined) return null;
  const projektId = decodeURIComponent(m[1]) as ProjektId;
  if (m[2] === undefined) return { art: 'liste', projektId };
  return { art: 'berechnung', projektId, id: decodeURIComponent(m[2]) as HonorarberechnungId };
}

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
  const nachher = rueckwaerts ? cs.honorarberechnung.vorher : cs.honorarberechnung.nachher;
  const h = nachher ?? (rueckwaerts ? cs.honorarberechnung.nachher : cs.honorarberechnung.vorher);
  if (h === null) return null;
  const ziel = nachher !== null ? honorarberechnungPfad(projektId, h.id) : honorarPfad(projektId);
  return ziel === pfad ? null : ziel;
}
