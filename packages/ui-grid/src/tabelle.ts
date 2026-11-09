// SPDX-License-Identifier: AGPL-3.0-or-later
// Spaltenmodell auf TanStack Table (v9). TanStack liefert Spalten-, Kopf-, Zeilen- und Zellenmodell und die
// Spaltenbreiten; Rendern, Baum und Bearbeiten gehören dem Grid. Die Zeilen sind bereits der sichtbare, flache Baum
// (`LvAnsicht.zeilen`), deshalb gibt es hier weder Aufklapp- noch Zeilenmodell-Features.

import { columnSizingFeature, createColumnHelper, tableFeatures } from '@tanstack/react-table';
import type { LvSpalte, LvZeile } from '@tethys/vertrag';
import { SPALTENTITEL } from './texte';

export const features = tableFeatures({ columnSizingFeature });

export const spaltenHelfer = createColumnHelper<typeof features, LvZeile>();

/** Breiten in Pixeln; `kurztext` nimmt zusätzlich den Rest ein. */
export const SPALTENBREITE: Readonly<Record<LvSpalte, number>> = {
  ordnungszahl: 112,
  positionsart: 112,
  kurztext: 320,
  menge: 108,
  einheit: 84,
  einheitspreis: 120,
  gesamtpreis: 128,
};

export const STANDARDSPALTEN: readonly LvSpalte[] = [
  'ordnungszahl',
  'positionsart',
  'kurztext',
  'menge',
  'einheit',
  'einheitspreis',
  'gesamtpreis',
];

export function spaltenDefinitionen(spalten: readonly LvSpalte[]) {
  return spalten.map((s) =>
    spaltenHelfer.display({ id: s, header: SPALTENTITEL[s], size: SPALTENBREITE[s] }),
  );
}
