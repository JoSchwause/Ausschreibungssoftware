// SPDX-License-Identifier: AGPL-3.0-or-later
// Suchen und Filtern im LV-Grid (Ticket 156, B-09): reine Funktionen ohne React und DOM. Der Suchtext je Knoten (OZ,
// Kurztext, Langtext in Kleinbuchstaben) wird erst beim Suchen gebaut und am Knoten zwischengespeichert: Knoten sind
// unveränderlich, eine Änderung bringt einen neuen Knoten und damit neuen Text. So bleibt der Renderpfad unberührt (Q4).

import type { Knoten, LvZeile } from '@tethys/vertrag';
import { hinweisKlartext } from './eingabe';
import { suchtexte } from './texte';

/** Feld, in dem eine Zeile gefunden wurde; der Text eines Hinweistexts steht in der Spalte „Kurztext“. */
export type Suchfeld = 'ordnungszahl' | 'kurztext' | 'langtext';

export interface Suchtreffer {
  readonly knotenId: string;
  readonly feld: Suchfeld;
}

interface Suchtext {
  readonly ordnungszahl: string;
  readonly kurztext: string;
  readonly langtext: string;
}

const klein = (text: string): string => text.toLocaleLowerCase('de-DE');

const SUCHTEXTE = new WeakMap<Knoten, Suchtext>();

function suchtext(k: Knoten): Suchtext {
  const da = SUCHTEXTE.get(k);
  if (da) return da;
  const neu: Suchtext =
    k.art === 'hinweis'
      ? { ordnungszahl: '', kurztext: klein(hinweisKlartext(k.text)), langtext: '' }
      : {
          ordnungszahl: klein((k.ordnungszahl ?? '') + (k.art === 'position' ? (k.ozIndex ?? '') : '')),
          kurztext: klein(k.kurztext),
          langtext: k.art === 'position' ? klein(hinweisKlartext(k.langtext)) : '',
        };
  SUCHTEXTE.set(k, neu);
  return neu;
}

/**
 * Die Zeilen, deren OZ (samt Index), Kurztext oder Langtext die Anfrage enthält, ohne Groß- und Kleinschreibung, in der
 * Reihenfolge von `zeilen`; je Zeile das erste passende Feld in dieser Reihenfolge. Leere Anfrage: keine Treffer.
 */
export function suchtreffer(zeilen: readonly LvZeile[], anfrage: string): readonly Suchtreffer[] {
  const a = klein(anfrage.trim());
  if (a === '') return [];
  const treffer: Suchtreffer[] = [];
  for (const z of zeilen) {
    const t = suchtext(z.knoten);
    const feld: Suchfeld | null = t.ordnungszahl.includes(a)
      ? 'ordnungszahl'
      : t.kurztext.includes(a)
        ? 'kurztext'
        : t.langtext.includes(a)
          ? 'langtext'
          : null;
    if (feld !== null) treffer.push({ knotenId: z.knoten.id, feld });
  }
  return treffer;
}

// --- Filter ------------------------------------------------------------------------------------------------------

/** Art einer Zeile für den Filter: jede Position, nur Zuschlagspositionen, Hinweistexte oder Gliederungen (Titel, Lose). */
export type Zeilenart = 'position' | 'zuschlagsposition' | 'hinweis' | 'gliederung';
/** Positionsmerkmal für den Filter (F5); das Zuschlagskennzeichen ist eine Bezugsangabe und kein Filter. */
export type Merkmalfilter = 'bedarf' | 'wahl' | 'stundenlohn' | 'pauschal';

/** Was der Filter zeigt; alle Angaben gelten zugleich, `null` bzw. `false` heißt „gleich“. */
export interface Zeilenfilter {
  readonly art: Zeilenart | null;
  readonly merkmal: Merkmalfilter | null;
  /** Nur Positionen ohne Einheitspreis (eine Zuschlagsposition, solange ihr Satz fehlt). */
  readonly ohnePreis: boolean;
}

export const KEIN_FILTER: Zeilenfilter = { art: null, merkmal: null, ohnePreis: false };

/** Die Arten und Merkmale des Filters in der Reihenfolge der Auswahl, mit ihrem Text. */
export const ZEILENARTEN: readonly (readonly [Zeilenart, string])[] = (
  ['position', 'zuschlagsposition', 'hinweis', 'gliederung'] as const
).map((a) => [a, suchtexte.arten[a]] as const);
export const MERKMALFILTER: readonly (readonly [Merkmalfilter, string])[] = (
  ['bedarf', 'wahl', 'stundenlohn', 'pauschal'] as const
).map((m) => [m, suchtexte.merkmale[m]] as const);

export function filterAktiv(f: Zeilenfilter): boolean {
  return f.art !== null || f.merkmal !== null || f.ohnePreis;
}

/** Der Filter in Worten, z. B. „Positionen, Bedarf, ohne Preis“. */
export function filterText(f: Zeilenfilter): string {
  const teile: string[] = [];
  const art = ZEILENARTEN.find(([a]) => a === f.art);
  if (art) teile.push(art[1]);
  const merkmal = MERKMALFILTER.find(([m]) => m === f.merkmal);
  if (merkmal) teile.push(merkmal[1]);
  if (f.ohnePreis) teile.push(suchtexte.ohnePreis);
  return teile.join(', ');
}

function passt(k: Knoten, f: Zeilenfilter): boolean {
  switch (f.art) {
    case null:
      break;
    case 'position':
      if (k.art !== 'position') return false;
      break;
    case 'zuschlagsposition':
      if (k.art !== 'position' || k.zuschlag === null) return false;
      break;
    case 'hinweis':
      if (k.art !== 'hinweis') return false;
      break;
    case 'gliederung':
      if (k.art !== 'los' && k.art !== 'titel') return false;
      break;
  }
  if (f.merkmal !== null) {
    if (k.art !== 'position') return false;
    const m = k.merkmale;
    const hat =
      f.merkmal === 'bedarf'
        ? m.bedarf !== null
        : f.merkmal === 'wahl'
          ? m.wahl !== null
          : f.merkmal === 'stundenlohn'
            ? m.stundenlohn
            : m.pauschal;
    if (!hat) return false;
  }
  if (f.ohnePreis) {
    if (k.art !== 'position' || k.einheitspreis !== null) return false;
    if (k.zuschlag !== null && k.zuschlag.prozentsatz !== null) return false;
  }
  return true;
}

const OHNE_KLAPPEN = new WeakMap<LvZeile, LvZeile>();
/** Im gefilterten Grid ist alles offen: kein Klappknopf (dieselbe Zeile für dieselbe Eingabe, damit das Memo greift). */
function ohneKlappen(z: LvZeile): LvZeile {
  if (!z.hatUnterknoten && !z.aufgeklappt) return z;
  const da = OHNE_KLAPPEN.get(z);
  if (da) return da;
  const neu: LvZeile = { ...z, hatUnterknoten: false, aufgeklappt: false };
  OHNE_KLAPPEN.set(z, neu);
  return neu;
}

/**
 * Die Zeilen, die zum Filter passen, mit den Gliederungen darüber (damit der Ort erkennbar bleibt), in der Reihenfolge
 * von `zeilen`. `zeilen` sollen alle Zeilen des LV sein (auch unter zugeklappten Gliederungen); im Ergebnis ist alles offen
 * und keine Zeile lässt sich klappen. Ohne Filter: `zeilen` selbst.
 */
export function gefilterteZeilen(zeilen: readonly LvZeile[], f: Zeilenfilter): readonly LvZeile[] {
  if (!filterAktiv(f)) return zeilen;
  const elternVon = new Map<string, string>();
  for (const z of zeilen) elternVon.set(z.knoten.id, z.knoten.elternId);
  const zeigen = new Set<string>();
  for (const z of zeilen) {
    if (!passt(z.knoten, f)) continue;
    let id: string | undefined = z.knoten.id;
    while (id !== undefined && !zeigen.has(id)) {
      zeigen.add(id);
      id = elternVon.has(id) ? elternVon.get(id) : undefined;
    }
  }
  const ergebnis: LvZeile[] = [];
  for (const z of zeilen) if (zeigen.has(z.knoten.id)) ergebnis.push(ohneKlappen(z));
  return ergebnis;
}

/**
 * Die zugeklappten Gliederungen über dem Knoten `id` in `zeilen` (alle Zeilen des LV), von außen nach innen: Sie muss
 * das Grid aufklappen, damit ein Treffer darunter sichtbar wird.
 */
export function vorfahrenZugeklappt(zeilen: readonly LvZeile[], id: string): readonly string[] {
  const jeId = new Map<string, LvZeile>();
  for (const z of zeilen) jeId.set(z.knoten.id, z);
  const zu: string[] = [];
  let eltern = jeId.get(id)?.knoten.elternId;
  while (eltern !== undefined) {
    const z = jeId.get(eltern);
    if (!z) break;
    if (z.hatUnterknoten && !z.aufgeklappt) zu.push(z.knoten.id);
    eltern = z.knoten.elternId;
  }
  return zu.reverse();
}
