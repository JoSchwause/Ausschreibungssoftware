// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Tastenkürzel der Hilfeseite (Ticket 147, B-09): erzeugt aus der einen Kürzeltabelle der Grids (`GRID_KUERZEL`), aus
// der die Grids auch ihre Tasten binden. Kein zweites Verzeichnis: Ein neues Kürzel erscheint hier von selbst.

import { GRID_KUERZEL, type Kuerzel, type Kuerzelbereich } from '@tethys/ui-grid';

export interface Kuerzelgruppe {
  readonly bereich: Kuerzelbereich;
  readonly kuerzel: readonly Kuerzel[];
}

/** Reihenfolge der Gruppen auf der Hilfeseite: vom Bewegen über das Bearbeiten zur Gliederung. */
const REIHENFOLGE: readonly Kuerzelbereich[] = [
  'Navigation',
  'Auswahl',
  'Bearbeiten',
  'Zeilen',
  'Zwischenablage',
  'Gliederung',
  'Spalten',
];

/** Die Kürzel nach Bereichen, in der Reihenfolge der Tabelle; leere Bereiche entfallen. */
export function kuerzelGruppen(kuerzel: readonly Kuerzel[] = GRID_KUERZEL): Kuerzelgruppe[] {
  return REIHENFOLGE.map((bereich) => ({
    bereich,
    kuerzel: kuerzel.filter((k) => k.bereich === bereich),
  })).filter((g) => g.kuerzel.length > 0);
}
