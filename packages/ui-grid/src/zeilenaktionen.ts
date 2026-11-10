// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeilenaktionen des Grids (Ticket 46): Kopieren, Löschen und Verschieben als reine Planung über den sichtbaren,
// flachen Baum (`LvAnsicht.zeilen`). Kein React, kein DOM. Das Grid rechnet nie und erzeugt keine Kennungen.
//
// Der sichtbare Baum genügt: Eine sichtbare Zeile hat einen aufgeklappten Elternknoten, also sind alle ihre
// Geschwister sichtbar. Unterknoten eines zugeklappten Knotens kennt das Grid nicht; wo sie zählen, sagt es das.

import type {
  ElternId,
  Einfuegeort,
  GridZahlen,
  Knoten,
  KnotenId,
  KnotenlisteVerschieben,
  KnotenVerschieben,
  LvSpalte,
  LvZeile,
} from '@tethys/vertrag';
import { anzeigeText } from './eingabe';
import { schreibeTsv } from './tsv';

const istGliederung = (k: Knoten): boolean => k.art === 'los' || k.art === 'titel';

/** Index hinter dem letzten sichtbaren Nachfahren der Zeile `i`. */
function unterbaumEnde(zeilen: readonly LvZeile[], i: number): number {
  const tiefe = zeilen[i]?.tiefe ?? 0;
  let e = i + 1;
  while (e < zeilen.length && (zeilen[e]?.tiefe ?? 0) > tiefe) e++;
  return e;
}

/**
 * Die obersten Knoten einer Auswahl in Anzeigereihenfolge: Knoten, deren Vorfahr ebenfalls ausgewählt ist, gehen
 * mit dem Vorfahren und stehen nicht eigens in der Liste.
 */
export function obersteKnoten(zeilen: readonly LvZeile[], ausgewaehlt: ReadonlySet<string>): KnotenId[] {
  const ergebnis: KnotenId[] = [];
  let i = 0;
  while (i < zeilen.length) {
    const z = zeilen[i];
    if (z && ausgewaehlt.has(z.knoten.id)) {
      ergebnis.push(z.knoten.id);
      i = unterbaumEnde(zeilen, i);
    } else {
      i++;
    }
  }
  return ergebnis;
}

/** Ob die Zeile `index` selbst oder einer ihrer Vorfahren in `menge` liegt. */
export function liegtInMenge(zeilen: readonly LvZeile[], index: number, menge: ReadonlySet<string>): boolean {
  let tiefe = Number.POSITIVE_INFINITY;
  for (let i = index; i >= 0; i--) {
    const z = zeilen[i];
    if (!z || z.tiefe >= tiefe) continue;
    if (menge.has(z.knoten.id)) return true;
    tiefe = z.tiefe;
    if (tiefe === 0) return false;
  }
  return false;
}

/**
 * Die ausgewählten Zeilen als TSV der übergebenen Spalten, wie Excel sie einfügt (Ticket 46, Punkt 1). Jede Zelle
 * trägt ihren Anzeigetext: Zahlen über `GridZahlen.format*` (de-DE, N4), der Hinweistext als Klartext.
 */
export function zeilenAlsTsv(
  zeilen: readonly LvZeile[],
  ausgewaehlt: ReadonlySet<string>,
  spalten: readonly LvSpalte[],
  zahlen: GridZahlen,
): string {
  return schreibeTsv(
    zeilen
      .filter((z) => ausgewaehlt.has(z.knoten.id))
      .map((z) => spalten.map((s) => anzeigeText(z, s, zahlen))),
  );
}

/** Was ein Löschen trifft, für die Rückfrage (Q5). */
export interface Loeschumfang {
  /** Knoten, die in den Papierkorb gehen (die obersten der Auswahl). */
  readonly knoten: number;
  readonly lose: number;
  readonly titel: number;
  /** Positionen unter den Knoten und die Knoten selbst, soweit sichtbar. */
  readonly positionen: number;
  /** Ein zugeklappter Knoten mit Unterknoten ist dabei: Es können mehr Positionen sein. */
  readonly mindestens: boolean;
}

export function loeschUmfang(zeilen: readonly LvZeile[], knotenIds: readonly KnotenId[]): Loeschumfang {
  const menge = new Set<string>(knotenIds);
  let lose = 0;
  let titel = 0;
  let positionen = 0;
  let mindestens = false;
  let i = 0;
  while (i < zeilen.length) {
    const z = zeilen[i];
    if (!z || !menge.has(z.knoten.id)) {
      i++;
      continue;
    }
    if (z.knoten.art === 'los') lose++;
    if (z.knoten.art === 'titel') titel++;
    const ende = unterbaumEnde(zeilen, i);
    for (let j = i; j < ende; j++) {
      const u = zeilen[j];
      if (u?.knoten.art === 'position') positionen++;
      if (u?.hatUnterknoten && !u.aufgeklappt) mindestens = true;
    }
    i = ende;
  }
  return { knoten: knotenIds.length, lose, titel, positionen, mindestens };
}

export type Verschieberichtung = 'hoch' | 'runter';

/**
 * Ort, an dem eine Liste vor Index `p` der restlichen Geschwister `rest` landet; `null`, wenn er sich nicht als
 * `Einfuegeort` ausdrücken lässt: „hinter einer Gliederung“ hieße im Vertrag „als erstes Kind der Gliederung“.
 */
function ortVor(rest: readonly Knoten[], p: number, elternId: ElternId): Einfuegeort | null {
  if (p === 0) return { art: 'anfang', elternId };
  const davor = rest[p - 1];
  if (davor && !istGliederung(davor)) return { art: 'nach', knotenId: davor.id };
  if (p === rest.length) return { art: 'ende', elternId };
  return null;
}

function befehl(liste: readonly Knoten[], ziel: Einfuegeort): KnotenVerschieben | KnotenlisteVerschieben {
  const [erster] = liste;
  if (liste.length === 1 && erster) return { art: 'KnotenVerschieben', knotenId: erster.id, ziel };
  return { art: 'KnotenlisteVerschieben', knotenIds: liste.map((k) => k.id), ziel };
}

/**
 * Verschiebt Knoten um eine Stelle unter ihren Geschwistern (Ticket 46, Punkt 4) als genau einen Befehl. Die Knoten
 * müssen dieselben Eltern haben und unter den Geschwistern zusammenhängen; am Rand oder sonst: `null`.
 *
 * Bevorzugt wird der Befehl, der nur die gewählten Knoten bewegt. Lässt sich dessen Ziel nicht ausdrücken (Nachbar
 * ist eine Gliederung), wird der Nachbar auf die andere Seite gesetzt, und geht auch das nicht, wird ein Stück der
 * Geschwisterfolge in der neuen Reihenfolge neu gelegt (das Ergebnis ist dasselbe).
 */
export function planeVerschieben(
  zeilen: readonly LvZeile[],
  knotenIds: readonly KnotenId[],
  richtung: Verschieberichtung,
): KnotenVerschieben | KnotenlisteVerschieben | null {
  const menge = new Set<string>(knotenIds);
  const erste = zeilen.find((z) => menge.has(z.knoten.id));
  if (!erste) return null;
  const elternId = erste.knoten.elternId;
  const geschwister = zeilen.filter((z) => z.knoten.elternId === elternId).map((z) => z.knoten);
  const lage = geschwister.flatMap((k, i) => (menge.has(k.id) ? [i] : []));
  const i = lage[0];
  const j = lage.at(-1);
  if (i === undefined || j === undefined || lage.length !== menge.size || j - i + 1 !== lage.length) {
    return null;
  }
  const block = geschwister.slice(i, j + 1);
  const ohne = (weg: readonly Knoten[]): Knoten[] => geschwister.filter((k) => !weg.includes(k));

  const kandidaten: { liste: readonly Knoten[]; rest: readonly Knoten[]; p: number }[] = [];
  if (richtung === 'runter') {
    const nachbar = geschwister[j + 1];
    if (!nachbar) return null;
    kandidaten.push({ liste: block, rest: ohne(block), p: i + 1 });
    kandidaten.push({ liste: [nachbar], rest: ohne([nachbar]), p: i });
    for (let a = i - 1; a >= 0; a--) {
      const liste = [...geschwister.slice(a, i), nachbar, ...block];
      kandidaten.push({ liste, rest: ohne(liste), p: a });
    }
  } else {
    const nachbar = geschwister[i - 1];
    if (!nachbar) return null;
    kandidaten.push({ liste: block, rest: ohne(block), p: i - 1 });
    kandidaten.push({ liste: [nachbar], rest: ohne([nachbar]), p: j });
    for (let a = i - 2; a >= 0; a--) {
      const liste = [...geschwister.slice(a, i - 1), ...block, nachbar];
      kandidaten.push({ liste, rest: ohne(liste), p: a });
    }
  }
  for (const k of kandidaten) {
    const ziel = ortVor(k.rest, k.p, elternId);
    if (ziel) return befehl(k.liste, ziel);
  }
  return null;
}
