// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde rund um ein Modell (Ticket 114, U5): aus dem Einlesen (`ifc`: doppelte GlobalIds, fehlende Mengen …, dazu die Größe)
// und aus der 3D-Ansicht (Bauteile ohne Geometrie, `bim` mit dem Ladebericht von `ui-modell`). Sie sperren nie.

import { bauteileOhneGeometrie } from '@tethys/bim';
import type { Ladebericht } from '@tethys/ui-modell';
import type { Bauwerksmodell, Pruefbefund } from '@tethys/vertrag';

export function geometriebefunde(modell: Bauwerksmodell, bericht: Ladebericht): Pruefbefund[] {
  return bauteileOhneGeometrie(modell, bericht.mitGeometrie);
}

export interface Befundeintrag {
  readonly befund: Pruefbefund;
  /** Sprungziel im Modellbaum; `null`, wenn der Befund kein Objekt nennt. */
  readonly globalId: string | null;
}

/** Fehler vor Warnungen, sonst in der gemeldeten Reihenfolge. */
export function befundliste(befunde: readonly Pruefbefund[]): Befundeintrag[] {
  const eintrag = (b: Pruefbefund): Befundeintrag => ({ befund: b, globalId: b.ort.globalId ?? null });
  return [
    ...befunde.filter((b) => b.schwere === 'fehler').map(eintrag),
    ...befunde.filter((b) => b.schwere !== 'fehler').map(eintrag),
  ];
}

export function befundzusammenfassung(befunde: readonly Pruefbefund[]): string {
  if (befunde.length === 0) return 'Keine Befunde.';
  const f = befunde.filter((b) => b.schwere === 'fehler').length;
  const w = befunde.length - f;
  const teile: string[] = [];
  if (f > 0) teile.push(`${String(f)} Fehler`);
  if (w > 0) teile.push(`${String(w)} ${w === 1 ? 'Warnung' : 'Warnungen'}`);
  return teile.join(', ');
}
