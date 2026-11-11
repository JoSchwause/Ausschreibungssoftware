// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Kostenseiten und das Ziel nach Rückgängig/Wiederholen einer Kostenermittlung (Ticket 89). Ohne
// Abhängigkeit auf Kern oder Speicher, damit die Hülle sie billig importiert (wie `auftrag/ziel.ts`).

import type { Aenderung, Kostenermittlung, KostenermittlungId, ProjektId } from '@tethys/vertrag';

/** Liste der Kostenermittlungen eines Projekts. */
export function kostenPfad(projektId: ProjektId): string {
  return `/projekt/${projektId}/kosten`;
}

/** Eine Kostenermittlung im Editor. */
export function kostenermittlungPfad(projektId: ProjektId, id: KostenermittlungId): string {
  return `/projekt/${projektId}/kosten/${id}`;
}

/** Die Kostenkontrolle des Projekts. */
export function kontrollePfad(projektId: ProjektId): string {
  return `/projekt/${projektId}/kosten/kontrolle`;
}

export type KostenRoute =
  | { readonly art: 'liste'; readonly projektId: ProjektId }
  | { readonly art: 'kontrolle'; readonly projektId: ProjektId }
  | { readonly art: 'ermittlung'; readonly projektId: ProjektId; readonly id: KostenermittlungId };

/** Erkennt einen Pfad der Kostenseiten; `null`, wenn er keiner ist. */
export function kostenRoute(pfad: string): KostenRoute | null {
  const m = /^\/projekt\/([^/]+)\/kosten(?:\/([^/]+))?$/.exec(pfad);
  if (m?.[1] === undefined) return null;
  const projektId = decodeURIComponent(m[1]) as ProjektId;
  if (m[2] === undefined) return { art: 'liste', projektId };
  if (m[2] === 'kontrolle') return { art: 'kontrolle', projektId };
  return { art: 'ermittlung', projektId, id: decodeURIComponent(m[2]) as KostenermittlungId };
}

/**
 * Wohin nach einem Teil an einer Kostenermittlung: Steht sie danach (Wiederholen eines Anlegens, Rückgängig eines
 * Löschens, jede Änderung), auf ihren Editor; ist sie weg (Rückgängig eines Anlegens), in die Liste. `null`: bleiben.
 */
export function kostenZiel(
  projektId: ProjektId,
  cs: { readonly kostenermittlung: Aenderung<Kostenermittlung> },
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  const nachher = rueckwaerts ? cs.kostenermittlung.vorher : cs.kostenermittlung.nachher;
  const k = nachher ?? (rueckwaerts ? cs.kostenermittlung.nachher : cs.kostenermittlung.vorher);
  if (k === null) return null;
  const ziel = nachher !== null ? kostenermittlungPfad(projektId, k.id) : kostenPfad(projektId);
  return ziel === pfad ? null : ziel;
}
