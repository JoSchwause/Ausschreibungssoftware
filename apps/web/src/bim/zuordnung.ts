// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuordnung Bauteil ↔ Position in der App (Ticket 115, X1c, D-52): Befehle `BauteileZuordnen` aus der Auswahl der
// Modellseite, Mengenarten der Auswahl, Positionssuche und die Färbung „zugeordnet“/„ohne Zuordnung“ für die 3D-Ansicht.
// Rein; die Prüfung der Zuordnungen gegen das Modell rechnet `bim` (`zuordnungenPruefen`).

import { MENGENART_STUECK, zuordnungenPruefen } from '@tethys/bim';
import type {
  Bauteilmenge,
  Bauteilzuordnung,
  Bauwerksmodell,
  BauteileZuordnen,
  IfcGlobalId,
  Knoten,
  Position,
} from '@tethys/vertrag';

/** Eine wählbare Mengenart: der Name der Menge im Modell (oder `Stueck`), ihre Einheit und an wie vielen Bauteilen sie steht. */
export interface Mengenartwahl {
  readonly name: string;
  readonly einheit: string;
  readonly anzahl: number;
}

const EINHEIT: Readonly<Record<Bauteilmenge['art'], string>> = {
  laenge: 'm',
  flaeche: 'm²',
  volumen: 'm³',
  anzahl: 'St',
  gewicht: 'kg',
  zeit: 's',
};

const gleich = (a: Bauteilzuordnung, b: Bauteilzuordnung): boolean =>
  a.globalId === b.globalId && a.mengenart === b.mengenart;

/**
 * Die Mengennamen der ausgewählten Bauteile (erstes Bauteil einer GlobalId, D-66) in der Reihenfolge des ersten Vorkommens,
 * je Name einmal mit der Zahl der Bauteile, die ihn tragen; zuletzt immer „Stück“ (`Stueck`, D-52) für alle.
 */
export function mengenartenDerAuswahl(modell: Bauwerksmodell, auswahl: readonly string[]): Mengenartwahl[] {
  const gewaehlt = new Set(auswahl);
  const gesehen = new Set<string>();
  const arten = new Map<string, { einheit: string; anzahl: number }>();
  let bauteile = 0;
  for (const b of modell.bauteile) {
    if (!gewaehlt.has(b.globalId) || gesehen.has(b.globalId)) continue;
    gesehen.add(b.globalId);
    bauteile += 1;
    const namen = new Set<string>();
    for (const m of b.mengen) {
      if (namen.has(m.name)) continue;
      namen.add(m.name);
      const a = arten.get(m.name);
      if (a === undefined) arten.set(m.name, { einheit: EINHEIT[m.art], anzahl: 1 });
      else a.anzahl += 1;
    }
  }
  return [
    ...[...arten].map(([name, a]) => ({ name, einheit: a.einheit, anzahl: a.anzahl })),
    { name: MENGENART_STUECK, einheit: 'St', anzahl: bauteile },
  ];
}

/**
 * Die ausgewählten Bauteile in der Reihenfolge des Modells, jede GlobalId einmal; GlobalIds, die kein Bauteil des Modells
 * tragen (Strukturknoten, Fremdes), fallen weg. So hängt die Reihenfolge der Ansatzzeilen (D-53) nicht von der Klickfolge ab.
 */
export function bauteileInModellreihenfolge(
  modell: Bauwerksmodell,
  auswahl: readonly string[],
): IfcGlobalId[] {
  const gewaehlt = new Set(auswahl);
  const aus = new Set<IfcGlobalId>();
  for (const b of modell.bauteile) if (gewaehlt.has(b.globalId)) aus.add(b.globalId);
  return [...aus];
}

/**
 * `BauteileZuordnen` mit der bisherigen Liste der Position und den neuen Paaren dahinter (Reihenfolge der Auswahl); ein Paar,
 * das schon da ist, kommt nicht noch einmal (der Kern wiese es ab, D-105.5). `null`, wenn sich nichts ändert.
 */
export function zuordnenBefehl(
  position: Position,
  globalIds: readonly IfcGlobalId[],
  mengenart: string,
): BauteileZuordnen | null {
  const liste = [...(position.bauteile ?? [])];
  const vorher = liste.length;
  for (const globalId of globalIds) {
    const neu = { globalId, mengenart };
    if (!liste.some((x) => gleich(x, neu))) liste.push(neu);
  }
  if (liste.length === vorher) return null;
  return { art: 'BauteileZuordnen', positionId: position.id, bauteile: liste };
}

/** `BauteileZuordnen` ohne dieses Paar; die leere Liste wird `null`. `null`, wenn die Position das Paar nicht trägt. */
export function zuordnungEntfernenBefehl(
  position: Position,
  paar: Bauteilzuordnung,
): BauteileZuordnen | null {
  const liste = position.bauteile ?? [];
  const rest = liste.filter((x) => !gleich(x, paar));
  if (rest.length === liste.length) return null;
  return { art: 'BauteileZuordnen', positionId: position.id, bauteile: rest.length === 0 ? null : rest };
}

/** Positionen, deren OZ mit dem Suchtext beginnt oder deren Kurztext ihn enthält (ohne Groß/Klein), in LV-Reihenfolge. */
export function positionenSuchen(knoten: readonly Knoten[], suche: string): Position[] {
  const s = suche.trim().toLocaleLowerCase('de-DE');
  return knoten.filter(
    (k): k is Position =>
      k.art === 'position' &&
      (s === '' ||
        (k.ordnungszahl ?? '').toLocaleLowerCase('de-DE').startsWith(s) ||
        k.kurztext.toLocaleLowerCase('de-DE').includes(s)),
  );
}

/** Die Positionen mit mindestens einer Zuordnung, in der Reihenfolge der Knotenliste. */
export function zuordnungenDerPositionen(knoten: readonly Knoten[]): Position[] {
  return knoten.filter((k): k is Position => k.art === 'position' && (k.bauteile?.length ?? 0) > 0);
}

export type Zuordnungskennzeichen = 'zugeordnet' | 'ohne-zuordnung';

/** Färbung der 3D-Ansicht bezogen auf ein LV: jedes Bauteil des Modells „zugeordnet“ oder „ohne Zuordnung“ (`bim`). */
export function zuordnungsfaerbung(
  modell: Bauwerksmodell,
  knoten: readonly Knoten[],
): Map<string, Zuordnungskennzeichen> {
  const ohne = new Set<string>(zuordnungenPruefen(knoten, modell).ohneZuordnung);
  const f = new Map<string, Zuordnungskennzeichen>();
  for (const b of modell.bauteile)
    if (!f.has(b.globalId)) f.set(b.globalId, ohne.has(b.globalId) ? 'ohne-zuordnung' : 'zugeordnet');
  return f;
}
