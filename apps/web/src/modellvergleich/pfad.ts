// SPDX-License-Identifier: AGPL-3.0-or-later
// Adresse der Vergleichsseite (Ticket 116): `/projekt/<id>/modelle/<neu>/vergleich[/<alt>]`; ohne `<alt>` der Vorgänger.
// Ohne Abhängigkeit auf `bim`, `ifc` oder `ui-modell`, damit `App.tsx` und die Modellseite sie billig importieren.

import type { BauwerksmodellId, ProjektId } from '@tethys/vertrag';

export interface VergleichRoute {
  readonly projektId: ProjektId;
  readonly neuId: BauwerksmodellId;
  /** `null`: der Vorgänger des neuen Stands. */
  readonly altId: BauwerksmodellId | null;
}

export function vergleichPfad(
  projektId: ProjektId,
  neuId: BauwerksmodellId,
  altId?: BauwerksmodellId,
): string {
  const basis = `/projekt/${encodeURIComponent(projektId)}/modelle/${encodeURIComponent(neuId)}/vergleich`;
  return altId === undefined ? basis : `${basis}/${encodeURIComponent(altId)}`;
}

export function vergleichRoute(pfad: string): VergleichRoute | null {
  const t = /^\/projekt\/([^/]+)\/modelle\/([^/]+)\/vergleich(?:\/([^/]+))?$/.exec(pfad);
  if (t?.[1] === undefined || t[2] === undefined) return null;
  return {
    projektId: decodeURIComponent(t[1]) as ProjektId,
    neuId: decodeURIComponent(t[2]) as BauwerksmodellId,
    altId: t[3] === undefined ? null : (decodeURIComponent(t[3]) as BauwerksmodellId),
  };
}
