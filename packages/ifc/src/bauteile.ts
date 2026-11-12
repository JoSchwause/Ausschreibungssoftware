// SPDX-License-Identifier: AGPL-3.0-or-later
// Bauteile (Ticket 98, Punkt 5): jedes Produkt, das über `IfcRelContainedInSpatialStructure` in einem Strukturknoten
// steht, und seine Teile über `IfcRelAggregates`, in der Reihenfolge der Datei.

import { klassenname } from './klassen';
import { kostengruppenvorschlaege } from './klassifikation';
import { STRUKTURARTEN } from './modell';
import type { Modellleser } from './modell';
import type { Bauteil } from './typen';

/** Was zu einem Objekt außer Klasse, Name und Lage gelesen wird (Mengen, Typ, …), je Index der Instanz. */
export interface Objektdaten {
  mengen(i: number): Bauteil['mengen'];
  eigenschaften(i: number): Bauteil['eigenschaften'];
  klassifikationen(i: number): Bauteil['klassifikationen'];
  materialien(i: number): Bauteil['materialien'];
  typname(i: number): string | null;
}

/** Keine Bauteile (Ticket 98, Punkt 5), dazu die räumlichen Elemente, die keine Strukturknoten sind. */
const KEINE_BAUTEILE = new Set([
  'IFCOPENINGELEMENT',
  'IFCOPENINGSTANDARDCASE',
  'IFCVIRTUALELEMENT',
  'IFCANNOTATION',
  'IFCGRID',
  'IFCEXTERNALSPATIALELEMENT',
  'IFCSPATIALZONE',
]);

function istBauteilklasse(name: string): boolean {
  return name !== '' && !KEINE_BAUTEILE.has(name) && !STRUKTURARTEN.has(name);
}

/** Behälter jedes enthaltenen Produkts (`RelatedElements` → `RelatingStructure`); `null`, wenn der Verweis fehlt. */
function behaelterLesen(l: Modellleser): Map<number, number | null> {
  const behaelter = new Map<number, number | null>();
  for (const r of l.daten.klasse('IFCRELCONTAINEDINSPATIALSTRUCTURE')) {
    const p = l.parameter(r);
    if (p === null) continue;
    const struktur = l.ziel(r, p[5]);
    for (const e of l.ziele(r, p[4])) {
      if (!behaelter.has(e)) {
        behaelter.set(e, struktur);
        continue;
      }
      l.melde(
        'warnung',
        'bauteil-mehrfach-enthalten',
        `#${String(l.daten.id(e))} steht in mehr als einem Strukturknoten; der erste gilt.`,
        l.ort(r),
      );
    }
  }
  return behaelter;
}

/** Bauteile in der Reihenfolge der Datei. */
export function bauteileLesen(
  l: Modellleser,
  ganzes: ReadonlyMap<number, number>,
  daten: Objektdaten,
): Bauteil[] {
  const behaelter = behaelterLesen(l);
  const teile = new Map<number, number[]>();
  for (const [teil, oben] of ganzes) {
    const liste = teile.get(oben);
    if (liste === undefined) teile.set(oben, [teil]);
    else liste.push(teil);
  }

  // Enthaltene Produkte, dann ihre Teile (Breitensuche, jedes Bauteil einmal; schützt vor Kreisen).
  const struktur = new Map<number, number | null>();
  const teilVon = new Map<number, number>();
  const offen: number[] = [];
  for (const [e, s] of behaelter) {
    if (!istBauteilklasse(l.daten.name(e)) || l.parameter(e) === null) continue;
    struktur.set(e, s);
    offen.push(e);
  }
  for (let k = 0; k < offen.length; k++) {
    const oben = offen[k] ?? -1;
    for (const t of teile.get(oben) ?? []) {
      if (struktur.has(t) || !istBauteilklasse(l.daten.name(t)) || l.parameter(t) === null) {
        if (struktur.has(t) && !teilVon.has(t) && t !== oben) teilVon.set(t, oben);
        continue;
      }
      struktur.set(t, behaelter.has(t) ? (behaelter.get(t) ?? null) : (struktur.get(oben) ?? null));
      teilVon.set(t, oben);
      offen.push(t);
    }
  }

  const bauteile: Bauteil[] = [];
  for (const i of [...struktur.keys()].sort((a, b) => a - b)) {
    const globalId = l.gepruefteGlobalId(i);
    const s = struktur.get(i) ?? null;
    const strukturGlobalId = s !== null && STRUKTURARTEN.has(l.daten.name(s)) ? l.globalId(s) : null;
    const bezeichnung = `${l.name(i) ?? l.globalId(i)} (#${String(l.daten.id(i))})`;
    if (strukturGlobalId === null)
      l.melde(
        'warnung',
        'bauteil-ohne-strukturknoten',
        `${bezeichnung} steht in keinem Strukturknoten (Projekt, Grundstück, Gebäude, Geschoss, Raum).`,
        l.ort(i),
      );
    const oben = teilVon.get(i);
    const mengen = daten.mengen(i);
    if (mengen.length === 0)
      l.melde(
        'warnung',
        'bauteil-ohne-mengen',
        `${bezeichnung} hat keine Mengen (IfcElementQuantity).`,
        l.ort(i),
      );
    const klassifikationen = daten.klassifikationen(i);
    const vorschlaege = kostengruppenvorschlaege(klassifikationen);
    if (vorschlaege.length > 1)
      l.melde(
        'warnung',
        'kostengruppe-mehrdeutig',
        `${bezeichnung} hat mehrere Kostengruppen-Vorschläge (${vorschlaege.join(', ')}); vorgeschlagen wird ${vorschlaege[0] ?? ''}.`,
        l.ort(i),
      );
    bauteile.push({
      globalId,
      ifcKlasse: klassenname(l.daten.name(i)),
      name: l.name(i),
      typ: daten.typname(i),
      strukturGlobalId,
      teilVonGlobalId: oben === undefined ? null : l.globalId(oben),
      kostengruppe: vorschlaege[0] ?? null,
      mengen,
      eigenschaften: daten.eigenschaften(i),
      klassifikationen,
      materialien: daten.materialien(i),
    });
  }
  return bauteile;
}
