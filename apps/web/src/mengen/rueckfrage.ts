// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenansatz und direkte Mengenänderung (D-22 (a)): Welche Positionen verlören ihren Ansatz. Rein; die Rückfrage
// selbst ist `AnsatzFrage.tsx`. Das Kennzeichen im Grid setzt `ui-grid` selbst (Ticket 74, D-65.2).

import type { Knoten, LvBefehl, Position } from '@tethys/vertrag';

/**
 * Die Positionen mit Mengenansatz, deren Ansatz einer der Befehle entfernen würde: ein `MengeAendern` mit anderer Menge
 * (dieselbe Menge ändert nichts, D-56.2). Jede Position einmal, in der Reihenfolge der Befehle.
 */
export function ansatzEntfernungen(
  knoten: readonly Knoten[],
  befehle: readonly LvBefehl[],
): readonly Position[] {
  const betroffen = new Map<string, Position>();
  for (const b of befehle) {
    if (b.art !== 'MengeAendern') continue;
    const k = knoten.find((x) => x.id === b.positionId);
    if (k?.art !== 'position' || (k.mengenansatz ?? []).length === 0 || k.menge === b.menge) continue;
    betroffen.set(k.id, k);
  }
  return [...betroffen.values()];
}
