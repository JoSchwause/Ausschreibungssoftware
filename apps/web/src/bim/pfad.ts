// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Modellseiten und das Ziel nach Rückgängig/Wiederholen eines Bauwerksmodells (Ticket 114). Ohne Abhängigkeit
// auf `bim`, `ifc` oder `ui-modell`, damit `App.tsx` und `historie/arten.ts` sie billig importieren (das Bündel der
// Modellseite lädt erst beim Öffnen).

import type { BauwerksmodellChangeSet, BauwerksmodellId, ProjektId } from '@tethys/vertrag';

/** Liste der Bauwerksmodelle eines Projekts. */
export function modellePfad(projektId: ProjektId): string {
  return `/projekt/${projektId}/modelle`;
}

/** Ein Bauwerksmodell mit Baum, 3D-Ansicht und Eigenschaften. */
export function modellPfad(projektId: ProjektId, id: BauwerksmodellId): string {
  return `/projekt/${projektId}/modelle/${id}`;
}

export type BimRoute =
  | { readonly art: 'liste'; readonly projektId: ProjektId }
  | { readonly art: 'modell'; readonly projektId: ProjektId; readonly id: BauwerksmodellId };

/** Erkennt einen Pfad der Modellseiten; `null`, wenn er keiner ist. */
export function bimRoute(pfad: string): BimRoute | null {
  const t = /^\/projekt\/([^/]+)\/modelle(?:\/([^/]+))?$/.exec(pfad);
  if (t?.[1] === undefined) return null;
  const projektId = decodeURIComponent(t[1]) as ProjektId;
  if (t[2] === undefined) return { art: 'liste', projektId };
  return { art: 'modell', projektId, id: decodeURIComponent(t[2]) as BauwerksmodellId };
}

/**
 * Wohin nach einem Teil an einem Bauwerksmodell (D-114.6): Jede Änderung (Einlesen, Löschen, Umbenennen) ist in der Liste
 * des Projekts sichtbar; ein Umbenennen auch auf der Modellseite, dort bleibt die App. Ist das Modell nach dem Teil weg,
 * verlässt die App seine Seite. `null`: bleiben.
 */
export function bimZiel(
  projektId: ProjektId,
  cs: BauwerksmodellChangeSet,
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  const nachher = rueckwaerts ? cs.kopf.vorher : cs.kopf.nachher;
  const liste = modellePfad(projektId);
  if (nachher !== null && pfad === modellPfad(projektId, cs.bauwerksmodellId)) return null;
  return pfad === liste ? null : liste;
}
