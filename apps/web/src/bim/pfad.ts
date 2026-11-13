// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Modellseiten und das Ziel nach Rückgängig/Wiederholen eines Bauwerksmodells (Ticket 114), seit Ticket 131
// aus dem Pfadbaukasten. Ohne Abhängigkeit auf `bim`, `ifc` oder `ui-modell`, damit `App.tsx` und `historie/arten.ts` sie
// billig importieren (das Bündel der Modellseite lädt erst beim Öffnen).

import type { BauwerksmodellChangeSet, BauwerksmodellId, ProjektId } from '@tethys/vertrag';
import { projektliste, type Listenroute } from '../ui/pfade';

const modelle = projektliste<'modell', BauwerksmodellId>('modelle', 'modell');

/** Liste der Bauwerksmodelle eines Projekts. */
export const modellePfad = modelle.liste;

/** Ein Bauwerksmodell mit Baum, 3D-Ansicht und Eigenschaften. */
export const modellPfad = modelle.einzeln;

export type BimRoute = Listenroute<'modell', BauwerksmodellId>;

/** Erkennt einen Pfad der Modellseiten; `null`, wenn er keiner ist. */
export const bimRoute = modelle.route;

/**
 * Wohin nach einem Teil an einem Bauwerksmodell (D-114.6): Jede Änderung (Einlesen, Löschen, Umbenennen) ist in der Liste
 * des Projekts sichtbar; ein Umbenennen auch auf der Modellseite, dort bleibt die App. Ist das Modell nach dem Teil weg,
 * verlässt die App seine Seite. `null`: bleiben.
 */
export function bimZiel(
  projektId: ProjektId,
  cs: BauwerksmodellChangeSet,
  rueckwaerts: boolean,
  pfad: string,
): string | null {
  const nachher = rueckwaerts ? cs.kopf.vorher : cs.kopf.nachher;
  const liste = modellePfad(projektId);
  if (nachher !== null && pfad === modellPfad(projektId, cs.bauwerksmodellId)) return null;
  return pfad === liste ? null : liste;
}
