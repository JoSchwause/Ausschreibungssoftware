// SPDX-License-Identifier: AGPL-3.0-or-later
// Abbildung auf den Vertrag (Ticket 107, Punkt 1; vertrag v1.6, D-50, D-51, D-53): aus dem Leseergebnis ein `Bauwerksmodell`
// mit dem Kopf des Aufrufers, Befunde als `Pruefbefund` mit der Quelle `ifc-lesen`. Was dabei wegfällt, ist ein Befund
// (Q5, U5). Rein (A2): Datum, Kennungen und Hash kommen vom Aufrufer.

import type {
  Bauteil,
  Bauteilmenge,
  Bauwerksmodell,
  BauwerksmodellKopf,
  IfcGlobalId,
  Pruefbefund,
  Strukturknoten,
} from '@tethys/vertrag';
import { alsMenge } from '@tethys/dezimal';
import { istGlobalId } from './globalid';
import { dateiOeffnen, inhaltLesen } from './lesen';
import type { GelesenerInhalt } from './lesen';
import type { Modellleser } from './modell';
import type * as Gelesen from './typen';

/** Ergebnis von `bauwerksmodellLesen`. `bauwerksmodell` ist `null`, wenn die Datei nicht gelesen wird (dann genau ein Befund). */
export interface BauwerksmodellLesung {
  readonly bauwerksmodell: Bauwerksmodell | null;
  /** Befunde in der Reihenfolge, in der sie beim Lesen und Abbilden entstehen; Quelle immer `ifc-lesen`. */
  readonly befunde: readonly Pruefbefund[];
}

/** Ein Befund des Lesers als Prüfbefund des Vertrags; `globalId`, wenn er ein Objekt des Modells betrifft. */
function pruefbefund(b: Gelesen.IfcBefund, globalId: IfcGlobalId | undefined): Pruefbefund {
  return {
    schwere: b.schwere,
    quelle: 'ifc-lesen',
    code: b.code,
    meldung: b.meldung,
    ort: globalId === undefined ? b.ort : { ...b.ort, globalId },
  };
}

/** Das Objekt eines Befunds: angegeben beim Melden, sonst die Instanz seines Orts (`#n`). */
function objektDesBefunds(l: Modellleser, b: Gelesen.IfcBefund): number | undefined {
  const objekt = l.objektVon.get(b);
  if (objekt !== undefined) return objekt;
  const nummer = /^#([0-9]+)$/.exec(b.ort.pfad ?? '');
  return nummer === null ? undefined : l.daten.index(Number(nummer[1]));
}

/** Name und Instanz eines Objekts für Meldungen, wie im Leser: `Wand 1 (#100)`. */
function bezeichnung(l: Modellleser, i: number): string {
  return `${l.name(i) ?? l.globalId(i)} (#${String(l.daten.id(i))})`;
}

/**
 * Bildet Struktur und Bauteile ab. Ein Objekt ohne GlobalId in Form fehlt (Befund des Lesers); was dabei sonst wegfällt,
 * meldet die Abbildung über den Leser (`melde` mit dem betroffenen Objekt), damit die Befunde in einer Liste stehen.
 */
function abbilden(
  inhalt: GelesenerInhalt,
  imModell: ReadonlyMap<number, IfcGlobalId>,
): Pick<Bauwerksmodell, 'struktur' | 'bauteile'> {
  const l = inhalt.leser;

  /** Mengen mit Wert; eine ohne (oder mit einem Wert, der keine `Menge` ist) fällt mit Befund weg, nie 0 (D-53). */
  const mengen = (i: number, gelesen: readonly Gelesen.Bauteilmenge[]): Bauteilmenge[] => {
    const aus: Bauteilmenge[] = [];
    for (const m of gelesen) {
      if (m.wert !== null && alsMenge(m.wert).ok) {
        aus.push({ satz: m.satz, name: m.name, art: m.art, wert: m.wert });
        continue;
      }
      const q = inhalt.mengen.instanzOhneWert(m);
      const grund = m.wert === null ? 'hat keinen Wert' : 'hat einen Wert, der keine gültige Menge ist (zu lang),';
      l.melde(
        'fehler',
        'menge-ohne-wert',
        `Die Menge ${m.name} (${m.satz ?? 'ohne Mengensatz'}) von ${bezeichnung(l, i)} ${grund} und fehlt im Bauwerksmodell (nie 0).`,
        l.ort(q ?? i),
        i,
      );
    }
    return aus;
  };

  const struktur: Strukturknoten[] = [];
  for (const k of inhalt.struktur) {
    const globalId = imModell.get(k.i);
    if (globalId === undefined) continue;
    struktur.push({
      globalId,
      art: k.knoten.art,
      name: k.knoten.name,
      elternGlobalId: k.eltern === null ? null : (imModell.get(k.eltern) ?? null),
      mengen: mengen(k.i, k.knoten.mengen),
    });
  }
  const bauteile: Bauteil[] = [];
  for (const b of inhalt.bauteile) {
    const globalId = imModell.get(b.i);
    if (globalId === undefined) continue;
    const teilVon = b.teilVon === null ? undefined : imModell.get(b.teilVon);
    const kostengruppe = b.bauteil.kostengruppe;
    bauteile.push({
      globalId,
      ifcKlasse: b.bauteil.ifcKlasse,
      name: b.bauteil.name,
      typ: b.bauteil.typ,
      strukturGlobalId: b.struktur === null ? null : (imModell.get(b.struktur) ?? null),
      // Optionale Felder fehlen statt `null` (vertrag v1.6).
      ...(teilVon === undefined ? {} : { teilVonGlobalId: teilVon }),
      ...(kostengruppe === null ? {} : { kostengruppe }),
      mengen: mengen(b.i, b.bauteil.mengen),
    });
  }
  return { struktur, bauteile };
}

/**
 * Liest eine IFC-Datei (IFC 2x3 oder IFC 4, ohne Geometrie) als `Bauwerksmodell` des Vertrags (v1.6). Den Kopf ohne Schema
 * gibt der Aufrufer (die App): Kennung, Projekt, Name, `datei` (Hash, Dateiname und Größe der Bytes, die er ablegt),
 * Vorgänger und Tag des Einlesens (A2); das Schema kommt aus der Datei. Jede Auffälligkeit ist ein Befund (U5);
 * `bauwerksmodell` ist nur `null`, wenn die Datei zu groß, keine IFC-Datei oder in einem anderen Schema ist.
 */
export function bauwerksmodellLesen(
  bytes: Uint8Array,
  kopf: Omit<BauwerksmodellKopf, 'schema'>,
  optionen: Gelesen.IfcOptionen = {},
): BauwerksmodellLesung {
  const datei = dateiOeffnen(bytes, optionen);
  if (!datei.ok) return { bauwerksmodell: null, befunde: [pruefbefund(datei.befund, undefined)] };
  const inhalt = inhaltLesen(datei, 'modell');
  // Die Objekte des Modells: Strukturknoten und Bauteile mit GlobalId in Form, je Instanz der Datei.
  const imModell = new Map<number, IfcGlobalId>();
  for (const k of inhalt.struktur) if (istGlobalId(k.knoten.globalId)) imModell.set(k.i, k.knoten.globalId);
  for (const b of inhalt.bauteile) if (istGlobalId(b.bauteil.globalId)) imModell.set(b.i, b.bauteil.globalId);
  const { struktur, bauteile } = abbilden(inhalt, imModell);
  const befunde = datei.befunde.map((b) => {
    const objekt = objektDesBefunds(inhalt.leser, b);
    return pruefbefund(b, objekt === undefined ? undefined : imModell.get(objekt));
  });
  return {
    bauwerksmodell: {
      id: kopf.id,
      projektId: kopf.projektId,
      name: kopf.name,
      datei: kopf.datei,
      schema: datei.schema,
      vorgaengerId: kopf.vorgaengerId,
      eingelesen: kopf.eingelesen,
      struktur,
      bauteile,
    },
    befunde,
  };
}
