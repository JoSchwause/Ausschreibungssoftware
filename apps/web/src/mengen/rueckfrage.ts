// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenansatz und direkte Mengenänderung (D-22 (a)): Welche Positionen verlören ihren Ansatz, und woran das Grid
// erkennt, dass eine Menge aus einem Ansatz stammt. Rein; die Rückfrage selbst ist `AnsatzFrage.tsx`.

import type { Knoten, LvBefehl, Position, Pruefbefund } from '@tethys/vertrag';
import { texte } from './texte';

/**
 * Die Positionen mit Mengenansatz, deren Ansatz einer der Befehle entfernen würde: ein `MengeAendern` mit anderer Menge
 * (dieselbe Menge ändert nichts, D-56.2). Jede Position einmal, in der Reihenfolge der Befehle.
 */
export function ansatzEntfernungen(knoten: readonly Knoten[], befehle: readonly LvBefehl[]): readonly Position[] {
  const betroffen = new Map<string, Position>();
  for (const b of befehle) {
    if (b.art !== 'MengeAendern') continue;
    const k = knoten.find((x) => x.id === b.positionId);
    if (k?.art !== 'position' || (k.mengenansatz ?? []).length === 0 || k.menge === b.menge) continue;
    betroffen.set(k.id, k);
  }
  return [...betroffen.values()];
}

/**
 * Kennzeichen im Grid: ein Hinweis an der Mengenzelle jeder Position mit Ansatz. Das Grid kennt nur Befunde als
 * Hinweisdarstellung (Warnzeichen mit Text); eine eigene Marke bräuchte eine Grid-Änderung (D-65.2).
 */
export function ansatzKennzeichen(knoten: readonly Knoten[]): ReadonlyMap<string, readonly Pruefbefund[]> {
  const m = new Map<string, readonly Pruefbefund[]>();
  for (const k of knoten) {
    if (k.art !== 'position' || (k.mengenansatz ?? []).length === 0) continue;
    m.set(k.id, [
      {
        schwere: 'warnung',
        quelle: 'lv-pruefung',
        code: 'mengenansatz',
        meldung: texte.kennzeichen,
        ort: { knotenId: k.id, feld: 'menge' },
      },
    ]);
  }
  return m;
}

/** Befunde je Knoten zusammenlegen: erst die der Prüfung, dann die Kennzeichen. */
export function befundeZusammen(
  a: ReadonlyMap<string, readonly Pruefbefund[]>,
  b: ReadonlyMap<string, readonly Pruefbefund[]>,
): ReadonlyMap<string, readonly Pruefbefund[]> {
  if (b.size === 0) return a;
  const m = new Map(a);
  for (const [id, liste] of b) m.set(id, [...(a.get(id) ?? []), ...liste]);
  return m;
}
