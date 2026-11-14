// SPDX-License-Identifier: AGPL-3.0-or-later
// Sichtbarkeit der 3D-Ansicht (Ticket 114, X1b): Ausblenden, Isolieren, alles zeigen, je Geschoss und je Klasse. Die App hält
// den Stand, die Leinwand zeichnet ihn (`ausgeblendet`, `isoliert` von `ui-modell`; ausgeblendet geht vor isoliert).

import type { Bauwerksmodell, IfcGlobalId } from '@tethys/vertrag';
import { auswahlDerZeile } from './auswahl';
import { texte } from './texte';
import type { Modellbaum } from './baum';

export interface Sichtbarkeit {
  readonly ausgeblendet: readonly IfcGlobalId[];
  /** `null`: nichts isoliert. */
  readonly isoliert: readonly IfcGlobalId[] | null;
}

export const ALLES_SICHTBAR: Sichtbarkeit = { ausgeblendet: [], isoliert: null };

export function ausblenden(s: Sichtbarkeit, globalIds: readonly IfcGlobalId[]): Sichtbarkeit {
  return { ...s, ausgeblendet: [...new Set([...s.ausgeblendet, ...globalIds])] };
}

/** Nur diese Bauteile zeigen; ein früheres Ausblenden fällt weg (D-114.5). Ohne Bauteile: unverändert. */
export function isolieren(s: Sichtbarkeit, globalIds: readonly IfcGlobalId[]): Sichtbarkeit {
  if (globalIds.length === 0) return s;
  return { ausgeblendet: [], isoliert: [...new Set(globalIds)] };
}

export interface Geschoss {
  readonly zeilenId: string;
  readonly name: string;
  readonly bauteile: readonly IfcGlobalId[];
}

/** Die Geschosse in Modellreihenfolge mit allen Bauteilen darunter (auch in ihren Räumen). */
export function geschosse(baum: Modellbaum): Geschoss[] {
  const aus: Geschoss[] = [];
  for (const k of baum.knoten.values())
    if (k.art === 'struktur' && k.knoten.art === 'geschoss')
      aus.push({
        zeilenId: k.id,
        name: k.knoten.name ?? texte.baum.ohneName('geschoss'),
        bauteile: auswahlDerZeile(baum, k.id),
      });
  return aus;
}

/** Die IFC-Klassen des Modells mit der Zahl ihrer Bauteile, nach Namen geordnet. */
export function klassen(modell: Bauwerksmodell): { klasse: string; anzahl: number }[] {
  const zahl = new Map<string, number>();
  for (const b of modell.bauteile) zahl.set(b.ifcKlasse, (zahl.get(b.ifcKlasse) ?? 0) + 1);
  return [...zahl]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([klasse, anzahl]) => ({ klasse, anzahl }));
}

export function bauteileDerKlasse(modell: Bauwerksmodell, klasse: string): IfcGlobalId[] {
  return [...new Set(modell.bauteile.filter((b) => b.ifcKlasse === klasse).map((b) => b.globalId))];
}
