// SPDX-License-Identifier: AGPL-3.0-or-later
// Modellprüfung (Ticket 108 Punkt 7; Glossar „Modellprüfung“, Quelle `modell-pruefung`): die Zuordnungen eines LV gegen ein
// gewähltes Modell, doppelte GlobalIds des Modells, Bauteile ohne Zuordnung (gezählt, kein Befund) und, aus dem Ladebericht
// der Modellansicht, Bauteile ohne Geometrie (D-66). Rein (A2).

import type { Bauwerksmodell, IfcGlobalId, Knoten, Pruefbefund } from '@tethys/vertrag';
import { modellbefund } from './befunde';
import { modellIndex } from './form';
import { zeilenLesen, zugeordnetePositionen } from './mengenuebernahme';

export interface Zuordnungspruefung {
  /**
   * Erst je GlobalId, die das Modell mehrfach trägt (über Struktur und Bauteile, in der Reihenfolge des ersten Vorkommens),
   * ein Befund `globalid-doppelt` mit der GlobalId als Ort; dann je Position mit Zuordnungen (Reihenfolge des LV) die Befunde
   * der Mengenübernahme: hängende Zuordnung, Menge fehlt oder mehrdeutig, Einheit passt nicht, doppelte GlobalId.
   */
  readonly befunde: readonly Pruefbefund[];
  /** Die Bauteile des Modells, die keine Position der Knotenliste nennt, in der Reihenfolge des Modells (für Zählung und 3D). */
  readonly ohneZuordnung: readonly IfcGlobalId[];
}

/**
 * Prüft die Bauteilzuordnungen gegen ein Modell (Ticket 108 Punkt 7). Die Knotenliste kann Positionen mehrerer LVs enthalten
 * (etwa Ausschreibungs-LV und Auftrags-LV); „ohne Zuordnung“ gilt dann über alle.
 */
export function zuordnungenPruefen(knoten: readonly Knoten[], modell: Bauwerksmodell): Zuordnungspruefung {
  const index = modellIndex(modell);
  const befunde: Pruefbefund[] = [];
  const gesehen = new Set<IfcGlobalId>();
  const gemeldet = new Set<IfcGlobalId>();
  const doppelt = new Set<IfcGlobalId>();
  for (const o of [...modell.struktur, ...modell.bauteile]) {
    if (gesehen.has(o.globalId)) doppelt.add(o.globalId);
    gesehen.add(o.globalId);
  }
  for (const o of [...modell.struktur, ...modell.bauteile])
    if (doppelt.has(o.globalId) && !gemeldet.has(o.globalId)) {
      gemeldet.add(o.globalId);
      befunde.push(
        modellbefund(
          'globalid-doppelt',
          `GlobalId ${o.globalId} steht mehrfach im Modell; das erste Objekt gilt`,
          {
            globalId: o.globalId,
          },
        ),
      );
    }
  const zugeordnet = new Set<IfcGlobalId>();
  for (const p of zugeordnetePositionen(knoten)) {
    for (const z of p.bauteile ?? []) zugeordnet.add(z.globalId);
    befunde.push(...zeilenLesen(p, index).befunde);
  }
  const ohneZuordnung = [...index.bauteil.keys()].filter((id) => !zugeordnet.has(id));
  return { befunde, ohneZuordnung };
}

/**
 * Befunde `bauteil-ohne-geometrie` (Warnung, Ort: GlobalId) je Bauteil des Modells, das die Modellansicht nicht gezeichnet
 * hat (`mitGeometrie` aus ihrem Ladebericht, Paket `ui-modell`; D-66), in der Reihenfolge des Modells, jede GlobalId einmal.
 * Ein Ganzes mit Teilen zählt nicht: Seine Geometrie sind die Teile. GlobalIds, die das Modell nicht kennt, zählen nicht.
 */
export function bauteileOhneGeometrie(
  modell: Bauwerksmodell,
  mitGeometrie: readonly string[],
): Pruefbefund[] {
  const gezeichnet = new Set<string>(mitGeometrie);
  const ganze = new Set<IfcGlobalId>();
  for (const b of modell.bauteile) if (b.teilVonGlobalId !== undefined) ganze.add(b.teilVonGlobalId);
  return [...modellIndex(modell).bauteil.values()]
    .filter((b) => !gezeichnet.has(b.globalId) && !ganze.has(b.globalId))
    .map((b) =>
      modellbefund('bauteil-ohne-geometrie', `Bauteil ${b.globalId} (${b.ifcKlasse}) hat keine Geometrie`, {
        globalId: b.globalId,
      }),
    );
}
