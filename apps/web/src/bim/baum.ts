// SPDX-License-Identifier: AGPL-3.0-or-later
// Der Modellbaum der Modellseite (Ticket 114, X1b): Struktur (Projekt … Geschoss, Raum) mit den Bauteilen darunter, als
// Zeilen des einen Grids (`VergleichsGrid`, U2). Rein: rechnet nichts, formatiert Mengen nur am Rand (N4).
//
// Zeilenkennungen hängen am Platz im Modell (`s<i>` für `struktur[i]`, `b<i>` für `bauteile[i]`), nicht an der GlobalId: Doppelte
// GlobalIds ergeben zwei Zeilen (D-50); ein Verweis über die GlobalId meint das erste Objekt, `struktur` vor `bauteile` (D-66).

import { formatiereMengeDe } from '@tethys/dezimal';
import type { VergleichsSpalte, VergleichsZeile } from '@tethys/ui-grid';
import type { Bauteil, Bauteilmenge, Bauwerksmodell, IfcGlobalId, Strukturknoten } from '@tethys/vertrag';
import { texte } from './texte';

/** Zeile der Gruppe „Ohne Strukturknoten“ (Bauteile, deren Strukturknoten die Datei nicht nennt). */
export const OHNE_STRUKTUR = 'ohne-struktur';

export type Baumknoten =
  | { readonly art: 'struktur'; readonly id: string; readonly knoten: Strukturknoten }
  | { readonly art: 'bauteil'; readonly id: string; readonly bauteil: Bauteil }
  | { readonly art: 'gruppe'; readonly id: string };

export interface Modellbaum {
  readonly knoten: ReadonlyMap<string, Baumknoten>;
  /** Kinder je Zeile in der Reihenfolge des Modells; `''` sind die Wurzeln. */
  readonly kinder: ReadonlyMap<string, readonly string[]>;
  readonly eltern: ReadonlyMap<string, string>;
  /** Die Zeile des ersten Objekts mit dieser GlobalId (D-66). */
  zeileVon(globalId: string): string | undefined;
}

export const BAUM_SPALTEN: readonly VergleichsSpalte[] = [
  { id: 'name', kopf: texte.baum.name, breite: 300 },
  { id: 'klasse', kopf: texte.baum.klasse, breite: 170 },
  { id: 'typ', kopf: texte.baum.typ, breite: 190 },
  { id: 'laenge', kopf: texte.baum.laenge, ausrichtung: 'rechts', breite: 100 },
  { id: 'flaeche', kopf: texte.baum.flaeche, ausrichtung: 'rechts', breite: 100 },
  { id: 'volumen', kopf: texte.baum.volumen, ausrichtung: 'rechts', breite: 100 },
];

export function modellbaumBauen(modell: Bauwerksmodell): Modellbaum {
  const knoten = new Map<string, Baumknoten>();
  const ersteStruktur = new Map<string, string>();
  const ersteBauteil = new Map<string, string>();
  modell.struktur.forEach((k, i) => {
    const id = `s${String(i)}`;
    knoten.set(id, { art: 'struktur', id, knoten: k });
    if (!ersteStruktur.has(k.globalId)) ersteStruktur.set(k.globalId, id);
  });
  modell.bauteile.forEach((b, i) => {
    const id = `b${String(i)}`;
    knoten.set(id, { art: 'bauteil', id, bauteil: b });
    if (!ersteBauteil.has(b.globalId)) ersteBauteil.set(b.globalId, id);
  });

  const eltern = new Map<string, string>();
  modell.struktur.forEach((k, i) => {
    const id = `s${String(i)}`;
    const e = k.elternGlobalId === null ? undefined : ersteStruktur.get(k.elternGlobalId);
    if (e !== undefined && e !== id) eltern.set(id, e);
  });
  let ohneStruktur = false;
  for (const [i, b] of modell.bauteile.entries()) {
    const id = `b${String(i)}`;
    const ganzes = b.teilVonGlobalId === undefined ? undefined : ersteBauteil.get(b.teilVonGlobalId);
    const struktur = b.strukturGlobalId === null ? undefined : ersteStruktur.get(b.strukturGlobalId);
    const e = ganzes !== undefined && ganzes !== id ? ganzes : struktur;
    if (e !== undefined) eltern.set(id, e);
    else {
      eltern.set(id, OHNE_STRUKTUR);
      ohneStruktur = true;
    }
  }
  // Ringe (gegen die Zusage von `ifc`, D-107.7) brechen am ersten Knoten des Rings auf, der sich selbst wieder erreicht.
  for (const start of knoten.keys()) {
    const besucht = new Set<string>([start]);
    for (let e = eltern.get(start); e !== undefined; e = eltern.get(e)) {
      if (e === start) {
        eltern.delete(start);
        break;
      }
      if (besucht.has(e)) break;
      besucht.add(e);
    }
  }
  if (ohneStruktur) knoten.set(OHNE_STRUKTUR, { art: 'gruppe', id: OHNE_STRUKTUR });

  const kinder = new Map<string, string[]>();
  const hinzu = (e: string, id: string): void => {
    const l = kinder.get(e);
    if (l === undefined) kinder.set(e, [id]);
    else l.push(id);
  };
  for (const id of knoten.keys()) hinzu(eltern.get(id) ?? '', id);

  return {
    knoten,
    kinder,
    eltern,
    zeileVon: (g) => ersteStruktur.get(g) ?? ersteBauteil.get(g),
  };
}

/** Die Menge einer Spalte (D-114.3): Länge bevorzugt `Length`, Fläche und Volumen bevorzugt netto, sonst die erste. */
export function spaltenmenge(
  mengen: readonly Bauteilmenge[],
  art: 'laenge' | 'flaeche' | 'volumen',
): Bauteilmenge | undefined {
  const vonArt = mengen.filter((m) => m.art === art);
  const bevorzugt =
    art === 'laenge' ? vonArt.find((m) => m.name === 'Length') : vonArt.find((m) => m.name.startsWith('Net'));
  return bevorzugt ?? vonArt[0];
}

function mengenzellen(mengen: readonly Bauteilmenge[]): VergleichsZeile['zellen'] {
  const zellen: Record<string, { text: string; tooltip: string }> = {};
  for (const art of ['laenge', 'flaeche', 'volumen'] as const) {
    const m = spaltenmenge(mengen, art);
    if (m !== undefined) zellen[art] = { text: formatiereMengeDe(m.wert), tooltip: m.name };
  }
  return zellen;
}

function zellen(k: Baumknoten): VergleichsZeile['zellen'] {
  switch (k.art) {
    case 'gruppe':
      return { name: { text: texte.baum.ohneStruktur } };
    case 'struktur':
      return {
        name: { text: k.knoten.name ?? texte.baum.ohneName(k.knoten.art) },
        klasse: { text: texte.strukturart[k.knoten.art] },
        ...mengenzellen(k.knoten.mengen),
      };
    case 'bauteil':
      return {
        name: { text: k.bauteil.name ?? texte.baum.ohneNameBauteil },
        klasse: { text: k.bauteil.ifcKlasse },
        typ: { text: k.bauteil.typ ?? '' },
        ...mengenzellen(k.bauteil.mengen),
      };
  }
}

/** Die sichtbaren Zeilen (flacher Baum): zugeklappte Knoten verbergen alles darunter. */
export function sichtbareZeilen(baum: Modellbaum, zugeklappt: ReadonlySet<string>): VergleichsZeile[] {
  const aus: VergleichsZeile[] = [];
  const stapel: { id: string; tiefe: number }[] = (baum.kinder.get('') ?? [])
    .map((id) => ({ id, tiefe: 0 }))
    .reverse();
  for (let s = stapel.pop(); s !== undefined; s = stapel.pop()) {
    const k = baum.knoten.get(s.id);
    if (k === undefined) continue;
    const kinder = baum.kinder.get(s.id) ?? [];
    const auf = !zugeklappt.has(s.id);
    aus.push({
      id: s.id,
      art: k.art === 'bauteil' ? 'position' : 'gliederung',
      tiefe: s.tiefe,
      hatUnterknoten: kinder.length > 0,
      aufgeklappt: kinder.length > 0 && auf,
      zellen: zellen(k),
    });
    if (auf)
      for (let i = kinder.length - 1; i >= 0; i--) stapel.push({ id: kinder[i] ?? '', tiefe: s.tiefe + 1 });
  }
  return aus;
}

/** Die Zeilen über einer Zeile, oberste zuerst (zum Aufklappen vor einem Sprung). */
export function vorfahren(baum: Modellbaum, zeilenId: string): string[] {
  const aus: string[] = [];
  for (let e = baum.eltern.get(zeilenId); e !== undefined; e = baum.eltern.get(e)) aus.unshift(e);
  return aus;
}

/** Die GlobalId einer Zeile; `null` für die Gruppe. */
export function globalIdDerZeile(baum: Modellbaum, zeilenId: string): IfcGlobalId | null {
  const k = baum.knoten.get(zeilenId);
  if (k === undefined || k.art === 'gruppe') return null;
  return k.art === 'struktur' ? k.knoten.globalId : k.bauteil.globalId;
}
