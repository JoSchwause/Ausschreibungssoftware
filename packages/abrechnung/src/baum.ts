// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleine Baumhilfen für Leistungsstand und Soll/Ist: Dokumentreihenfolge eines Auftrags-LV.

import type { Knoten } from '@tethys/vertrag';

/**
 * Die Knoten unter `wurzel` in Dokumentreihenfolge (Vorordnung: Eltern vor Kindern, Geschwister nach `reihenfolge`).
 * Knoten, die von der Wurzel nicht erreichbar sind, fehlen (ein gültiges Auftrags-LV hat keine).
 */
export function dokumentreihenfolge(wurzel: string, knoten: readonly Knoten[]): Knoten[] {
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) {
    const liste = kinder.get(k.elternId);
    if (liste) liste.push(k);
    else kinder.set(k.elternId, [k]);
  }
  for (const liste of kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  const aus: Knoten[] = [];
  const stapel: Knoten[] = [...(kinder.get(wurzel) ?? [])].reverse();
  for (let k = stapel.pop(); k !== undefined; k = stapel.pop()) {
    aus.push(k);
    const unter = kinder.get(k.id);
    if (unter) for (let i = unter.length - 1; i >= 0; i--) stapel.push(unter[i] as Knoten);
  }
  return aus;
}
