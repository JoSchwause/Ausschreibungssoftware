// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: Adressen der Mängel- und Bautagebuchseite und das Ziel nach Rückgängig/Wiederholen (für `historie/arten.ts`).
// Ohne Abhängigkeit auf Kern oder Speicher, damit die Hülle und `App.tsx` sie billig importieren.

import type { Aenderung, Bautagebucheintrag, Mangel, ProjektId } from '@tethys/vertrag';

export const maengelPfad = (projektId: ProjektId): string => `/projekt/${projektId}/maengel`;
export const bautagebuchPfad = (projektId: ProjektId): string => `/projekt/${projektId}/bautagebuch`;

export type BauleitungRoute =
  | { readonly art: 'maengel'; readonly projektId: ProjektId }
  | { readonly art: 'bautagebuch'; readonly projektId: ProjektId };

/** Erkennt einen Pfad der Bauleitungsseiten; `null`, wenn er keiner ist. */
export function bauleitungRoute(pfad: string): BauleitungRoute | null {
  const m = /^\/projekt\/([^/]+)\/(maengel|bautagebuch)$/.exec(pfad);
  if (m?.[1] === undefined) return null;
  return {
    art: m[2] === 'maengel' ? 'maengel' : 'bautagebuch',
    projektId: decodeURIComponent(m[1]) as ProjektId,
  };
}

/**
 * Wohin nach einem Teil an einem Mangel bzw. Bautagebucheintrag (Undo/Redo): auf die Liste des Projekts, damit die Änderung
 * sichtbar wird. Die Listen laden nach jedem Undo/Redo neu, also genügt der Wechsel. `null`: bleiben.
 */
const listenZiel = (liste: string, pfad: string): string | null => (pfad === liste ? null : liste);

export function mangelZiel(
  projektId: ProjektId,
  _cs: { readonly mangel: Aenderung<Pick<Mangel, 'id'>> },
  _rueckwaerts: boolean,
  pfad: string,
): string | null {
  return listenZiel(maengelPfad(projektId), pfad);
}

export function bautagebuchZiel(
  projektId: ProjektId,
  _cs: { readonly bautagebucheintrag: Aenderung<Pick<Bautagebucheintrag, 'id'>> },
  _rueckwaerts: boolean,
  pfad: string,
): string | null {
  return listenZiel(bautagebuchPfad(projektId), pfad);
}
