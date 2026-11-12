// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Adresse der Preisspiegel-Seite an einer Stelle (Review Welle 4, S10): bauen (Link, Ziel nach Undo) und lesen
// (Routing der App). Ohne Oberfläche, damit die Hülle und `auftrag/ziel.ts` es billig importieren.

import type { LeistungsverzeichnisId } from '@tethys/vertrag';

export const preisspiegelPfad = (lvId: LeistungsverzeichnisId): string => `/lv/${lvId}/preisspiegel`;

/** Das LV einer Preisspiegel-Adresse; `null`, wenn `pfad` keine ist. */
export function preisspiegelLvId(pfad: string): LeistungsverzeichnisId | null {
  const m = /^\/lv\/([^/]+)\/preisspiegel$/.exec(pfad);
  return m?.[1] === undefined ? null : (decodeURIComponent(m[1]) as LeistungsverzeichnisId);
}
