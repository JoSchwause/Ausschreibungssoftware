// SPDX-License-Identifier: AGPL-3.0-or-later
// Adressen der Modellseiten und das Ziel nach Rückgängig/Wiederholen eines Bauwerksmodells (Ticket 114), seit Ticket 131
// aus dem Pfadbaukasten. Ohne Abhängigkeit auf `bim`, `ifc` oder `ui-modell`, damit `App.tsx` und `historie/arten.ts` sie
// billig importieren (das Bündel der Modellseite lädt erst beim Öffnen).

import type {
  AuftragsLeistungsverzeichnisId,
  BauwerksmodellChangeSet,
  BauwerksmodellId,
  BauwerksmodellKopf,
  ProjektId,
} from '@tethys/vertrag';
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

// --- „Aufmaß aus Modell“ (Ticket 155): das Modell mit dem Auftrags-LV vorgewählt ---------------------------------------

/** Name des Suchparameters, der das Auftrags-LV für „LV für Zuordnung“ vorwählt; die Seite selbst erkennt nur den Pfad. */
const VORWAHL = 'auftrag';

/** Eine Adresse der Modellseiten mit vorgewähltem Auftrags-LV (`null`: ohne Vorwahl). */
export function mitAuftrag(pfad: string, auftragsLvId: AuftragsLeistungsverzeichnisId | null): string {
  return auftragsLvId === null ? pfad : `${pfad}?${VORWAHL}=${encodeURIComponent(auftragsLvId)}`;
}

/** Das vorgewählte Auftrags-LV aus der Suche der Adresse (`window.location.search`); `null`: keines. */
export function auftragAusAdresse(suche: string): AuftragsLeistungsverzeichnisId | null {
  const id = new URLSearchParams(suche).get(VORWAHL);
  return id === null || id === '' ? null : (id as AuftragsLeistungsverzeichnisId);
}

/**
 * Ziel von „Aufmaß aus Modell“ auf der Seite eines Auftrags-LV: Hat das Projekt genau einen aktuellen Stand (ein Modell, das
 * kein anderes als Vorgänger nennt), dieses Modell; sonst die Liste der Modelle. Beide mit dem Auftrags-LV vorgewählt.
 */
export function aufmassAusModellPfad(
  projektId: ProjektId,
  auftragsLvId: AuftragsLeistungsverzeichnisId,
  modelle: readonly Pick<BauwerksmodellKopf, 'id' | 'vorgaengerId'>[],
): string {
  const vorgaenger = new Set(modelle.map((m) => m.vorgaengerId));
  const aktuell = modelle.filter((m) => !vorgaenger.has(m.id));
  const [einziger] = aktuell;
  const pfad =
    aktuell.length === 1 && einziger !== undefined
      ? modellPfad(projektId, einziger.id)
      : modellePfad(projektId);
  return mitAuftrag(pfad, auftragsLvId);
}
