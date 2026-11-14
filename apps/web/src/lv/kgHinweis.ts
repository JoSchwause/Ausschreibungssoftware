// SPDX-License-Identifier: AGPL-3.0-or-later
// Hinweis „KG außerhalb der Gliederung“ an der Zelle (D-89.4, D-93.7): Die LV-Seite lädt die Kostenermittlungen des
// Projekts und reicht je Position, deren Kostengruppe in keiner davon liegt, eine Warnung an der Spalte „KG“ in
// `LvZeile.befunde` und ins Prüf-Panel. Ein Hinweis, nie eine Sperre (U5); die Regel ist die des Zuordnungsdialogs
// (`inGliederung`). Ohne Kostenermittlung gibt es keinen Hinweis.

import type { Knoten, Kostenermittlung, Pruefbefund } from '@tethys/vertrag';
import { inGliederung } from '../kosten/kostengruppe';
import { texte } from './texte';

export const KG_AUSSERHALB = 'kg-ausserhalb-gliederung';

export function kgAusserhalbBefunde(
  knoten: readonly Knoten[],
  ermittlungen: readonly Pick<Kostenermittlung, 'eintraege'>[],
): readonly Pruefbefund[] {
  if (ermittlungen.length === 0) return [];
  const befunde: Pruefbefund[] = [];
  for (const k of knoten) {
    if (k.art !== 'position' || k.kostengruppe === undefined) continue;
    if (inGliederung(k.kostengruppe, ermittlungen)) continue;
    befunde.push({
      schwere: 'warnung',
      quelle: 'lv-pruefung',
      code: KG_AUSSERHALB,
      meldung: texte.kgHinweis.ausserhalb(k.kostengruppe),
      ort: { knotenId: k.id, feld: 'kostengruppe' },
    });
  }
  return befunde;
}
