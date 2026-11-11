// SPDX-License-Identifier: AGPL-3.0-or-later
// Teilbäume an einen Ort legen (K9, Ticket 42): gemeinsamer Ablauf für `KnotenEinfuegen`, `KnotenlisteVerschieben` und
// `PapierkorbeintragWiederherstellen`. Rein (A2). Die Befehle bestimmen, welche Wurzeln wohin kommen; hier stehen die
// Auflösung des Einfügeorts, die Prüfungen am Ziel (Knotenart, Los, Ebenen, F1) und die neuen Geschwisterlisten.
//
// Lesart von „nach X“ wie bei `KnotenVerschieben` (`knoten-befehle.ts`): X eine Position oder ein Hinweistext: hinter X
// unter dessen Elternknoten; X eine Gliederung: deren erste Stelle. Liegt X selbst unter den bewegten Wurzeln, landet die
// Liste an der Stelle, an der X stand.

import type { Befehlsfehler, Einfuegeort, Ergebnis, Knoten, KnotenId, LvZustand } from '@tethys/vertrag';
import { befehlsfehler, nein, ok } from './fehler';
import {
  MAX_GLIEDERUNGSEBENEN,
  darfKinderHaben,
  ebenenbeitrag,
  losErlaubtUnter,
  obersteEbeneFehler,
} from './regeln';
import type { ElternArt } from './regeln';
import { ebenenBis } from './struktur';
import type { Baumindex } from './struktur';

/** Aufgelöster Einfügeort: Elternknoten und Index in dessen Kinderliste ohne die bewegten Wurzeln. */
export interface Ziel {
  readonly eltern: string;
  readonly elternArt: ElternArt;
  readonly index: number;
}

/** Wurzeln, die zusammen an `index` unter `eltern` kommen (in dieser Reihenfolge, hintereinander). */
export interface Gruppe {
  readonly eltern: string;
  readonly index: number;
  readonly wurzeln: readonly Knoten[];
}

const elternArtVon = (idx: Baumindex, eltern: string): ElternArt | undefined =>
  eltern === idx.lvId ? 'wurzel' : idx.byId.get(eltern)?.art;

/** Löst einen Einfügeort auf. `bewegt`: Kennungen, die ihre alte Stelle verlassen (fehlen beim Zählen). */
export function ortAufloesen(
  idx: Baumindex,
  ort: Einfuegeort,
  bewegt: ReadonlySet<string>,
): Ergebnis<Ziel, Befehlsfehler> {
  if (ort.art === 'nach') {
    const x = idx.byId.get(ort.knotenId);
    if (!x) return nein('knoten-unbekannt', `Knoten unbekannt: ${ort.knotenId}`, ort.knotenId);
    if (x.art === 'los' || x.art === 'titel') return ok({ eltern: x.id, elternArt: x.art, index: 0 });
    let index = 0;
    for (const k of idx.kinder.get(x.elternId) ?? []) {
      if (k.id === x.id) break;
      if (!bewegt.has(k.id)) index++;
    }
    return ok({
      eltern: x.elternId,
      elternArt: elternArtVon(idx, x.elternId) ?? 'wurzel',
      index: bewegt.has(x.id) ? index : index + 1,
    });
  }
  const eltern = ort.elternId;
  const elternArt = elternArtVon(idx, eltern);
  if (elternArt === undefined) return nein('eltern-unbekannt', `Elternknoten unbekannt: ${eltern}`, eltern);
  if (!darfKinderHaben(elternArt))
    return nein('knotenart-unzulaessig', `Unter einer Knotenart „${elternArt}“ stehen keine Kinder.`, eltern);
  const anzahl = (idx.kinder.get(eltern) ?? []).filter((k) => !bewegt.has(k.id)).length;
  return ok({ eltern, elternArt, index: ort.art === 'anfang' ? 0 : anzahl });
}

/**
 * Prüft eine Wurzel am Ziel: der Elternknoten darf Kinder haben, ein Los nur unter der Wurzel, die Ebenen des Teilbaums
 * (`hoehe`, siehe `ebenenHoehe`) passen unter die Grenze. F1 prüft `obenFehler` nach dem Platzieren.
 */
export function wurzelFehler(
  idx: Baumindex,
  ziel: Pick<Ziel, 'eltern' | 'elternArt'>,
  wurzel: Knoten,
  hoehe: number,
): Befehlsfehler | null {
  if (!darfKinderHaben(ziel.elternArt))
    return befehlsfehler(
      'knotenart-unzulaessig',
      `Unter einer Knotenart „${ziel.elternArt}“ stehen keine Kinder.`,
      wurzel.id,
    );
  if (wurzel.art === 'los' && !losErlaubtUnter(ziel.elternArt))
    return befehlsfehler(
      'knotenart-unzulaessig',
      'Ein Los steht nur direkt unter dem LV (vorläufige Annahme).',
      wurzel.id,
    );
  if (ebenenbeitrag(wurzel.art) > 0 && ebenenBis(idx, ziel.eltern) + hoehe > MAX_GLIEDERUNGSEBENEN)
    return befehlsfehler(
      'ebene-ueberschritten',
      `Mehr als ${String(MAX_GLIEDERUNGSEBENEN)} Gliederungsebenen.`,
      wurzel.id,
    );
  return null;
}

/**
 * Neue Kinderlisten: aus den betroffenen Elternknoten fallen die Knoten in `weg` heraus (die Lücken schließen sich), die
 * Gruppen kommen der Reihe nach an ihren Index (höchstens ans Ende). Ergebnis je Elternknoten die Liste in neuer
 * Reihenfolge; die Lage (`elternId`, `reihenfolge`) setzt der Aufrufer daraus.
 */
export function platzieren(
  idx: Baumindex,
  weg: ReadonlySet<string>,
  gruppen: readonly Gruppe[],
): Map<string, Knoten[]> {
  const listen = new Map<string, Knoten[]>();
  const liste = (eltern: string): Knoten[] => {
    let l = listen.get(eltern);
    if (!l) {
      l = (idx.kinder.get(eltern) ?? []).filter((k) => !weg.has(k.id));
      listen.set(eltern, l);
    }
    return l;
  };
  for (const kennung of weg) {
    const k = idx.byId.get(kennung);
    if (k) liste(k.elternId);
  }
  for (const g of gruppen) {
    const l = liste(g.eltern);
    l.splice(Math.min(g.index, l.length), 0, ...g.wurzeln);
  }
  return listen;
}

/**
 * F1 nach dem Platzieren: jede Wurzel in `neuOben`, die auf der obersten Ebene landet, gegen ihre neuen Geschwister
 * (`obersteEbeneFehler`). `neuOben`: Wurzeln, die vorher nicht unter dem LV standen.
 */
export function obenFehler(
  z: LvZustand,
  idx: Baumindex,
  listen: ReadonlyMap<string, readonly Knoten[]>,
  neuOben: ReadonlySet<string>,
): Befehlsfehler | null {
  const oben = listen.get(idx.lvId);
  if (oben === undefined) return null;
  const losStufe = z.leistungsverzeichnis.ozMaske.losStufe === true;
  for (const k of oben) {
    if (!neuOben.has(k.id)) continue;
    const f = obersteEbeneFehler(
      k.art,
      oben.filter((g) => g.id !== k.id).map((g) => g.art),
      losStufe,
    );
    if (f !== null) return befehlsfehler('knotenart-unzulaessig', f, k.id);
  }
  return null;
}

/**
 * Die genannten Knoten als Wurzeln: unbekannte Kennung `knoten-unbekannt`, leere Liste `ungueltige-eingabe`
 * (`feld: 'knotenIds'`). Doppelte Nennungen und Knoten, die unter einem anderen genannten Knoten liegen, zählen nicht
 * eigens (sie gehen mit ihm). Reihenfolge wie genannt.
 */
export function wurzelnVon(
  idx: Baumindex,
  knotenIds: readonly KnotenId[],
): Ergebnis<readonly Knoten[], Befehlsfehler> {
  if (!Array.isArray(knotenIds) || knotenIds.length === 0)
    return nein('ungueltige-eingabe', 'Die Liste der Knoten ist leer.', undefined, 'knotenIds');
  const genannt = new Set<string>();
  for (const kennung of knotenIds) {
    if (!idx.byId.has(kennung)) return nein('knoten-unbekannt', `Knoten unbekannt: ${kennung}`, kennung);
    genannt.add(kennung);
  }
  const wurzeln: Knoten[] = [];
  const gesehen = new Set<string>();
  for (const kennung of knotenIds) {
    const k = idx.byId.get(kennung);
    if (k === undefined || gesehen.has(kennung)) continue;
    gesehen.add(kennung);
    if (!liegtUnterEinem(idx, k, genannt)) wurzeln.push(k);
  }
  return ok(wurzeln);
}

/** Liegt ein Vorfahr von `k` (nicht `k` selbst) in `menge`? */
function liegtUnterEinem(idx: Baumindex, k: Knoten, menge: ReadonlySet<string>): boolean {
  let aktuell = k.elternId as string;
  for (let schritt = 0; schritt <= idx.byId.size && aktuell !== idx.lvId; schritt++) {
    if (menge.has(aktuell)) return true;
    const e = idx.byId.get(aktuell);
    if (!e) return false;
    aktuell = e.elternId;
  }
  return false;
}
