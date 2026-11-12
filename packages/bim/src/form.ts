// SPDX-License-Identifier: AGPL-3.0-or-later
// Nachschlagen im Bauwerksmodell über die GlobalId (Ticket 108). Rein (A2).

import type { Bauteil, Bauwerksmodell, IfcGlobalId, Strukturknoten } from '@tethys/vertrag';

/**
 * Bauteile und Strukturknoten eines Modells nach GlobalId. Kommt eine GlobalId mehrfach vor, meint jeder Verweis das
 * **erste** Objekt in der Reihenfolge der Datei, `struktur` vor `bauteile` (D-66); die späteren zählen für Zuordnung,
 * Mengen und Vergleich nicht (Befund der Modellprüfung). Ein Bauteil, dessen GlobalId zuerst ein Strukturknoten trägt, steht
 * darum nicht in `bauteil`.
 */
export interface Modellindex {
  readonly bauteil: ReadonlyMap<IfcGlobalId, Bauteil>;
  readonly knoten: ReadonlyMap<IfcGlobalId, Strukturknoten>;
  /** GlobalIds, die das Modell mehr als einmal trägt (über Struktur und Bauteile). */
  readonly doppelt: ReadonlySet<IfcGlobalId>;
}

export function modellIndex(modell: Pick<Bauwerksmodell, 'struktur' | 'bauteile'>): Modellindex {
  const knoten = new Map<IfcGlobalId, Strukturknoten>();
  const doppelt = new Set<IfcGlobalId>();
  for (const k of modell.struktur) {
    if (knoten.has(k.globalId)) doppelt.add(k.globalId);
    else knoten.set(k.globalId, k);
  }
  const bauteil = new Map<IfcGlobalId, Bauteil>();
  for (const b of modell.bauteile) {
    if (knoten.has(b.globalId) || bauteil.has(b.globalId)) doppelt.add(b.globalId);
    else bauteil.set(b.globalId, b);
  }
  return { bauteil, knoten, doppelt };
}

/** Die doppelten GlobalIds in der Reihenfolge ihres ersten Vorkommens (Struktur vor Bauteilen), jede einmal. */
export function doppelteInReihenfolge(
  modell: Pick<Bauwerksmodell, 'struktur' | 'bauteile'>,
  index: Modellindex,
): IfcGlobalId[] {
  const liste = new Set<IfcGlobalId>();
  for (const o of [...modell.struktur, ...modell.bauteile])
    if (index.doppelt.has(o.globalId)) liste.add(o.globalId);
  return [...liste];
}
