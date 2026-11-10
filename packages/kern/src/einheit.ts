// SPDX-License-Identifier: AGPL-3.0-or-later
// Leere Einheit (Vertrag v1.2, D-06, W-05 Nr. 3; Ticket 30, Punkt 10): Ein Befehl darf `''` als Einheit tragen (Rand:
// Grid, GAEB-Import); der Kern legt dafür `null` ab. Nur genau `''`: Leerzeichen bleiben Text (kein Trimmen, U5).

import type { Einheit, Position } from '@tethys/vertrag';

/** `''` → `null`; jede andere Einheit unverändert. */
export const einheitNormal = (einheit: Einheit | null): Einheit | null => (einheit === '' ? null : einheit);

/**
 * Die Position mit normalisierten Einheiten (eigene und die der Unterbeschreibungen ihrer Leitbeschreibung). Ändert sich
 * nichts, kommt dasselbe Objekt zurück.
 */
export function positionMitEinheiten(p: Position): Position {
  const unter = p.leitbeschreibung?.unterbeschreibungen;
  const unterLeer = unter?.some((u) => u.einheit === '') ?? false;
  if (p.einheit !== '' && !unterLeer) return p;
  return {
    ...p,
    einheit: einheitNormal(p.einheit),
    ...(p.leitbeschreibung === undefined || !unterLeer
      ? {}
      : {
          leitbeschreibung: {
            ...p.leitbeschreibung,
            unterbeschreibungen: (unter ?? []).map((u) => (u.einheit === '' ? { ...u, einheit: null } : u)),
          },
        }),
  };
}
