// SPDX-License-Identifier: AGPL-3.0-or-later
// Zustandsdarstellung und Baumindex (Ticket 05).
//
// Der Zustand des Vertrags ist ein flaches, unveränderliches Array (`Leistungsverzeichnis.knoten`). Der Kern ändert
// diese Typen nicht. Für schnelle Zugriffe (Knoten per ID, Kinder je Elternknoten) baut er einen `Baumindex`
// einmal je Array und merkt ihn in einer `WeakMap`, deren Schlüssel das Array selbst ist:
//  - Wer dasselbe Array wieder übergibt, bekommt den Index ohne Neuaufbau; fällt das Array weg, fällt der Index mit.
//  - `lvChangeSetAnwenden` baut den Index für das neue Array gleich mit und trägt ihn ein; der nächste Befehl auf
//    dem Ergebniszustand findet ihn fertig vor.
//  - Der Index wird nie verändert (nur gelesen), also ist der Cache unsichtbar: dieselbe Eingabe, dasselbe Ergebnis.
//
// Kanonische Ordnung des Arrays: Tiefensuche (Vorordnung) von der Wurzel, Geschwister nach `reihenfolge`; Eltern
// stehen vor Kindern, wie in `LvInhalt` („Dokumentreihenfolge“). Jeder vom Kern erzeugte Zustand ist kanonisch; damit
// ist „ChangeSet anwenden, Umkehrung anwenden“ auch im Array exakt die Identität.

import type { Knoten } from '@tethys/vertrag';
import { ebenenbeitrag } from './regeln';

export type KinderMap = ReadonlyMap<string, readonly Knoten[]>;

export interface Baumindex {
  readonly lvId: string;
  readonly byId: ReadonlyMap<string, Knoten>;
  /** Kinder je Elternknoten (Schlüssel: LV-ID oder Gliederungs-ID), nach `reihenfolge` sortiert. */
  readonly kinder: KinderMap;
}

/** Kopf eines Aggregats: alles außer `knoten` (ohne Entpacken in unbenutzte Variablen). */
export function ohneKnoten<T extends { readonly knoten: unknown }>(aggregat: T): Omit<T, 'knoten'> {
  const kopie: { -readonly [K in keyof T]?: T[K] } = { ...aggregat };
  delete kopie.knoten;
  return kopie as Omit<T, 'knoten'>;
}

const nachReihenfolge = (a: Knoten, b: Knoten): number => a.reihenfolge - b.reihenfolge;

/** Gruppiert nach Elternknoten, je Gruppe nach `reihenfolge` (stabil) sortiert. */
export function gruppiere(knoten: readonly Knoten[]): Map<string, Knoten[]> {
  const gruppen = new Map<string, Knoten[]>();
  for (const k of knoten) {
    const g = gruppen.get(k.elternId);
    if (g) g.push(k);
    else gruppen.set(k.elternId, [k]);
  }
  for (const g of gruppen.values()) g.sort(nachReihenfolge);
  return gruppen;
}

/** Vorordnung von der Wurzel aus. Was von der Wurzel aus nicht erreichbar ist (Zyklen), fehlt im Ergebnis. */
export function praeorder(lvId: string, kinder: KinderMap): Knoten[] {
  const aus: Knoten[] = [];
  const besucht = new Set<Knoten>();
  const stapel: Knoten[] = [];
  const schiebe = (liste: readonly Knoten[] | undefined): void => {
    if (!liste) return;
    for (let i = liste.length - 1; i >= 0; i--) {
      const k = liste[i];
      if (k) stapel.push(k);
    }
  };
  schiebe(kinder.get(lvId));
  for (let k = stapel.pop(); k; k = stapel.pop()) {
    if (besucht.has(k)) continue;
    besucht.add(k);
    aus.push(k);
    schiebe(kinder.get(k.id));
  }
  return aus;
}

const cache = new WeakMap<readonly Knoten[], Baumindex>();

/** Baut den Index für ein Array beliebiger Reihenfolge, ohne zu cachen. */
export function baueIndex(lvId: string, knoten: readonly Knoten[]): Baumindex {
  const byId = new Map<string, Knoten>();
  for (const k of knoten) byId.set(k.id, k);
  return { lvId, byId, kinder: gruppiere(knoten) };
}

/** Index zum Array, gebaut beim ersten Zugriff und danach aus dem Cache. */
export function indexVon(lvId: string, knoten: readonly Knoten[]): Baumindex {
  const vorhanden = cache.get(knoten);
  if (vorhanden?.lvId === lvId) return vorhanden;
  const neu = baueIndex(lvId, knoten);
  cache.set(knoten, neu);
  return neu;
}

/**
 * Bringt beliebig angelieferte Knoten in kanonische Reihenfolge und trägt den Index für das Ergebnisarray in den
 * Cache ein. Nicht von der Wurzel erreichbare Knoten stehen am Ende (so fallen sie der Invariantenprüfung auf,
 * statt stillschweigend zu verschwinden).
 */
export function kanonisch(lvId: string, knoten: readonly Knoten[]): readonly Knoten[] {
  const kinder = gruppiere(knoten);
  const geordnet = praeorder(lvId, kinder);
  if (geordnet.length < knoten.length) {
    const drin = new Set(geordnet);
    for (const k of knoten) if (!drin.has(k)) geordnet.push(k);
  }
  const byId = new Map<string, Knoten>();
  for (const k of geordnet) byId.set(k.id, k);
  cache.set(geordnet, { lvId, byId, kinder });
  return geordnet;
}

/** Ebenen oberhalb: Summe der Ebenenbeiträge der Gliederungen von `elternId` bis zur Wurzel (einschließlich). */
export function ebenenBis(index: Baumindex, elternId: string): number {
  let summe = 0;
  let aktuell = elternId;
  for (let schritt = 0; aktuell !== index.lvId && schritt <= index.byId.size; schritt++) {
    const k = index.byId.get(aktuell);
    if (!k) break;
    summe += ebenenbeitrag(k.art);
    aktuell = k.elternId;
  }
  return summe;
}

/** Wie viele Ebenen belegt die Gliederung `g` samt ihrer untergeordneten Gliederungen (mindestens ihr eigener Beitrag)? */
export function ebenenHoehe(index: Baumindex, g: Knoten, grenze = 16): number {
  let tiefste = 0;
  if (grenze > 0) {
    for (const kind of index.kinder.get(g.id) ?? []) {
      if (kind.art === 'los' || kind.art === 'titel')
        tiefste = Math.max(tiefste, ebenenHoehe(index, kind, grenze - 1));
    }
  }
  return ebenenbeitrag(g.art) + tiefste;
}

/** Der Knoten und alle seine Nachfahren in Vorordnung (Eltern vor Kindern). */
export function unterbaum(index: Baumindex, wurzel: Knoten): Knoten[] {
  const aus: Knoten[] = [];
  const besucht = new Set<Knoten>();
  const stapel: Knoten[] = [wurzel];
  for (let k = stapel.pop(); k; k = stapel.pop()) {
    if (besucht.has(k)) continue;
    besucht.add(k);
    aus.push(k);
    const kinder = index.kinder.get(k.id) ?? [];
    for (let i = kinder.length - 1; i >= 0; i--) {
      const kind = kinder[i];
      if (kind) stapel.push(kind);
    }
  }
  return aus;
}

/** Liegt `knoten` im Unterbaum von `wurzelId` (oder ist es die Wurzel selbst)? Aufstieg über die Eltern. */
export function liegtUnter(index: Baumindex, knotenId: string, wurzelId: string): boolean {
  let aktuell = knotenId;
  for (let schritt = 0; schritt <= index.byId.size; schritt++) {
    if (aktuell === wurzelId) return true;
    if (aktuell === index.lvId) return false;
    const k = index.byId.get(aktuell);
    if (!k) return false;
    aktuell = k.elternId;
  }
  return false;
}
