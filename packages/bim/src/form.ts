// SPDX-License-Identifier: AGPL-3.0-or-later
// Gemeinsame Formregeln und Nachschlagen im Bauwerksmodell (Ticket 108). Rein (A2).

import type { Bauteil, Bauwerksmodell, IfcGlobalId, Strukturknoten } from '@tethys/vertrag';

/**
 * Form einer GlobalId (Glossar „GlobalId“, `IfcGlobalId`): genau 22 Zeichen aus `0-9`, `A-Z`, `a-z`, `_`, `$`, wie `ifc`
 * sie prüft (Ticket 98). Vorläufig eigene Kopie, bis `vertrag` die Konstante führt (D-66).
 */
export const GLOBALID_FORM = /^[0-9A-Za-z_$]{22}$/;

/**
 * Bauteile und Strukturknoten eines Modells nach GlobalId. Kommt eine GlobalId mehrfach vor, gilt das **erste** Objekt in der
 * Reihenfolge des Modells (D-66); die weiteren zählen nur als Doppelte (Befund der Modellprüfung).
 */
export interface Modellindex {
  readonly bauteil: ReadonlyMap<IfcGlobalId, Bauteil>;
  readonly knoten: ReadonlyMap<IfcGlobalId, Strukturknoten>;
  /** GlobalIds, die unter den Bauteilen mehr als einmal vorkommen. */
  readonly doppelteBauteile: ReadonlySet<IfcGlobalId>;
}

export function modellIndex(modell: Pick<Bauwerksmodell, 'struktur' | 'bauteile'>): Modellindex {
  const bauteil = new Map<IfcGlobalId, Bauteil>();
  const doppelt = new Set<IfcGlobalId>();
  for (const b of modell.bauteile) {
    if (bauteil.has(b.globalId)) doppelt.add(b.globalId);
    else bauteil.set(b.globalId, b);
  }
  const knoten = new Map<IfcGlobalId, Strukturknoten>();
  for (const k of modell.struktur) if (!knoten.has(k.globalId)) knoten.set(k.globalId, k);
  return { bauteil, knoten, doppelteBauteile: doppelt };
}
