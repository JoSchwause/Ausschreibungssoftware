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
 * Bricht die Ringe eines Verweises auf, den jedes Objekt höchstens einmal hat (`ziel`, je Instanz; ein Ziel ist selbst eines
 * der `objekte`): Je Ring verliert das erste Objekt in der Reihenfolge der Datei seinen Verweis (D-66). Liefert die Ringe,
 * jeden beginnend beim aufgebrochenen Objekt. Jedes Objekt wird einmal besucht.
 */
function ringeAufbrechen(objekte: readonly number[], ziel: Map<number, number | null>): number[][] {
  const fertig = new Set<number>();
  const ringe: number[][] = [];
  for (const start of objekte) {
    const pfad: number[] = [];
    const stelle = new Map<number, number>();
    let n: number | null = start;
    while (n !== null && !fertig.has(n) && !stelle.has(n)) {
      stelle.set(n, pfad.length);
      pfad.push(n);
      n = ziel.get(n) ?? null;
    }
    const anfang = n === null ? undefined : stelle.get(n);
    if (anfang !== undefined) {
      const ring = pfad.slice(anfang);
      const erstes = ring.reduce((a, b) => Math.min(a, b));
      const ab = ring.indexOf(erstes);
      ringe.push([...ring.slice(ab), ...ring.slice(0, ab)]);
      ziel.set(erstes, null);
    }
    for (const p of pfad) fertig.add(p);
  }
  return ringe;
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
  // Erster Träger jeder GlobalId: Ein Verweis über eine GlobalId meint das erste Objekt in der Reihenfolge der Datei,
  // `struktur` vor `bauteile` (vertrag v1.6, Nachtrag D-66). `imModell` ist in dieser Reihenfolge gefüllt.
  const ersterTraeger = new Map<IfcGlobalId, number>();
  for (const [i, globalId] of imModell) if (!ersterTraeger.has(globalId)) ersterTraeger.set(globalId, i);

  /** Mengen mit Wert; eine ohne (oder mit einem Wert, der keine `Menge` ist) fällt mit Befund weg, nie 0 (D-53). */
  const mengen = (i: number, gelesen: readonly Gelesen.Bauteilmenge[]): Bauteilmenge[] => {
    const aus: Bauteilmenge[] = [];
    for (const m of gelesen) {
      if (m.wert !== null && alsMenge(m.wert).ok) {
        aus.push({ satz: m.satz, name: m.name, art: m.art, wert: m.wert });
        continue;
      }
      const q = inhalt.mengen.instanzOhneWert(m);
      const grund =
        m.wert === null ? 'hat keinen Wert' : 'hat einen Wert, der keine gültige Menge ist (zu lang),';
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

  /**
   * Das Ziel eines Verweises von `i` auf die Instanz `ziel`, wenn das Modell es über seine GlobalId nennen kann. Der Verweis
   * entfällt mit Befund, wenn das Ziel nicht im Modell steht (`code`) oder seine GlobalId zuerst ein anderes Objekt trägt
   * (`verweis-mehrdeutig`): Der Verweis würde dann dieses meinen, und das Modell sagte etwas, das die Datei nicht sagt.
   * `wie`: wie `i` auf `ziel` verweist, `folge`: was im Modell daraus wird.
   */
  const verweis = (
    i: number,
    ziel: number | null,
    code: Gelesen.IfcBefundcode,
    wie: string,
    folge: string,
  ): number | null => {
    if (ziel === null) return null;
    const globalId = imModell.get(ziel);
    const erstes = globalId === undefined ? undefined : ersterTraeger.get(globalId);
    if (globalId !== undefined && erstes === ziel) return ziel;
    if (globalId !== undefined && erstes !== undefined) {
      l.melde(
        'warnung',
        'verweis-mehrdeutig',
        `${bezeichnung(l, i)} ${wie} #${String(l.daten.id(ziel))}, dessen GlobalId ${globalId} zuerst #${String(l.daten.id(erstes))} trägt (ein Verweis meint im Bauwerksmodell das erste Objekt); im Modell ${folge}.`,
        l.ort(i),
        i,
      );
      return null;
    }
    l.melde(
      'warnung',
      code,
      `${bezeichnung(l, i)} ${wie} #${String(l.daten.id(ziel))}, das nicht im Bauwerksmodell steht (keine GlobalId in Form oder nicht lesbar); im Modell ${folge}.`,
      l.ort(i),
      i,
    );
    return null;
  };

  /** Bricht die Ringe eines Verweises auf und meldet je Ring das Objekt, das seinen Verweis verliert. */
  const ringe = (
    ziel: Map<number, number | null>,
    code: Gelesen.IfcBefundcode,
    wie: string,
    folge: string,
  ): void => {
    for (const ring of ringeAufbrechen([...ziel.keys()], ziel)) {
      const erstes = ring[0] ?? -1;
      const kette = [...ring, erstes].map((r) => `#${String(l.daten.id(r))}`).join(' → ');
      l.melde(
        'fehler',
        code,
        `${bezeichnung(l, erstes)} ${wie} (Ring ${kette}); im Modell ${folge}.`,
        l.ort(erstes),
        erstes,
      );
    }
  };
  const globalIdVon = (ziel: number | null | undefined): IfcGlobalId | null =>
    ziel === null || ziel === undefined ? null : (imModell.get(ziel) ?? null);

  /** Die Objekte einer Art, die im Modell stehen, mit ihrer GlobalId. */
  const imModellMit = <T extends { readonly i: number }>(liste: readonly T[]) =>
    liste.flatMap((o) => {
      const globalId = imModell.get(o.i);
      return globalId === undefined ? [] : [{ ...o, globalId }];
    });

  const knoten = imModellMit(inhalt.struktur);
  const eltern = new Map<number, number | null>();
  for (const k of knoten)
    eltern.set(k.i, verweis(k.i, k.eltern, 'strukturknoten-ohne-eltern', 'hängt an', 'hat es keine Eltern'));
  ringe(eltern, 'strukturknoten-ring', 'hängt über seine Eltern an sich selbst', 'hat es keine Eltern');
  const struktur: Strukturknoten[] = knoten.map((k) => ({
    globalId: k.globalId,
    art: k.knoten.art,
    name: k.knoten.name,
    elternGlobalId: globalIdVon(eltern.get(k.i)),
    mengen: mengen(k.i, k.knoten.mengen),
  }));

  const teile = imModellMit(inhalt.bauteile);
  const strukturVon = new Map<number, number | null>();
  const ganzes = new Map<number, number | null>();
  for (const b of teile) {
    strukturVon.set(
      b.i,
      verweis(
        b.i,
        b.struktur,
        'bauteil-ohne-strukturknoten',
        'steht in',
        'steht es in keinem Strukturknoten',
      ),
    );
    ganzes.set(b.i, verweis(b.i, b.teilVon, 'bauteil-ohne-ganzes', 'ist Teil von', 'ist es kein Teil'));
  }
  ringe(ganzes, 'bauteil-ring', 'ist über das Ganze Teil von sich selbst', 'ist es kein Teil');
  const bauteile: Bauteil[] = teile.map((b) => {
    const teilVon = globalIdVon(ganzes.get(b.i));
    const kostengruppe = b.bauteil.kostengruppe;
    return {
      globalId: b.globalId,
      ifcKlasse: b.bauteil.ifcKlasse,
      name: b.bauteil.name,
      typ: b.bauteil.typ,
      strukturGlobalId: globalIdVon(strukturVon.get(b.i)),
      // Optionale Felder fehlen statt `null` (vertrag v1.6).
      ...(teilVon === null ? {} : { teilVonGlobalId: teilVon }),
      ...(kostengruppe === null ? {} : { kostengruppe }),
      mengen: mengen(b.i, b.bauteil.mengen),
    };
  });
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
