// SPDX-License-Identifier: AGPL-3.0-or-later
// Spaltenbreiten des LV-Grids (Ticket 130): Standardbreiten, Mindestbreiten aus dem Inhalt und gemerkte Breiten des
// Nutzers. Reine Funktionen, kein DOM: Die Breite eines Texts kommt aus Zeichenzahl und Schriftmaß (Breite je
// Zeichenklasse in em), nicht aus dem Messen jeder Zeile. Das Grid rechnet nie mit Werten (N1): Zahlen werden nur über
// die eingesteckten Formatierer zu Text, und nur der längste Wert je Spalte.

import type { GridZahlen, LvSpalte, LvZeile, OzMaske } from '@tethys/vertrag';
import { anzeigeText } from './eingabe';

/** Standardbreiten in Pixeln, solange der Nutzer nichts anderes gezogen hat; `kurztext` nimmt zusätzlich den Rest ein. */
export const STANDARDBREITE: Readonly<Record<LvSpalte, number>> = {
  ordnungszahl: 112,
  positionsart: 112,
  kurztext: 320,
  menge: 108,
  einheit: 84,
  einheitspreis: 120,
  gesamtpreis: 128,
  kostengruppe: 72,
};

/** Untere und obere Grenze jeder Spaltenbreite in Pixeln (auch für gezogene und gemerkte Breiten). */
export const KLEINSTE_BREITE = 40;
export const GROESSTE_BREITE = 800;

/** Schrittweite der Tastatur (Alt+Umschalt+Pfeil) in Pixeln. */
export const BREITENSCHRITT = 16;

/** Schriftgröße des Grids in Pixeln (`--tx-font-size-md`). */
const SCHRIFTGROESSE = 13;

/**
 * Schriftmaß: Breite je Zeichenklasse in em, gerundet nach oben über die üblichen Systemschriften (Ziffern in
 * Tabellenziffern). Lieber etwas zu breit als abgeschnitten.
 */
function zeichenbreite(c: string): number {
  if (c >= '0' && c <= '9') return 0.64;
  if (c === '.' || c === ',' || c === ':' || c === ';' || c === "'") return 0.36;
  if (c === ' ' || c === '-' || c === '/') return 0.42;
  if (c === 'M' || c === 'W' || c === 'm' || c === 'w') return 1;
  if (c >= 'A' && c <= 'Z') return 0.8;
  if (c >= 'a' && c <= 'z') return 0.66;
  return 0.8;
}

/** Geschätzte Breite eines Texts in der Schrift des Grids, in Pixeln. */
export function textbreite(text: string): number {
  let em = 0;
  for (const c of text) em += zeichenbreite(c);
  return em * SCHRIFTGROESSE;
}

/** Innenabstand beider Seiten (2 × `--tx-space-3`), rechter Rand und etwas Reserve. */
const ZELLRAND = 16 + 1 + 6;
/** Warnzeichen vor einem Wert mit Prüfhinweis: Symbol 12 px und Abstand. */
const MARKE = 12 + 4;
/** Kennzeichen „Mengenansatz“ vor der Menge: Marke (1,4 em bei 12 px und Innenabstand) und Abstand. */
const ANSATZMARKE = 17 + 6 + 4;

/**
 * Je Zahlenspalte: gespeicherter Wert einer Zeile und Formatierer. Der Wert bleibt die Zeichenkette des Vertrags; das
 * Grid vergleicht nur ihre Länge.
 */
interface Zahlspalte {
  readonly spalte: LvSpalte;
  readonly wert: (z: LvZeile) => string | null;
  readonly text: (z: LvZeile, zahlen: GridZahlen) => string;
}

const ZAHLSPALTEN: readonly Zahlspalte[] = (['menge', 'einheitspreis', 'gesamtpreis'] as const).map((spalte) => ({
  spalte,
  wert: (z: LvZeile): string | null => {
    const k = z.knoten;
    if (spalte === 'gesamtpreis') return z.summe;
    if (k.art !== 'position') return null;
    return spalte === 'menge' ? k.menge : k.einheitspreis;
  },
  text: (z: LvZeile, zahlen: GridZahlen): string => anzeigeText(z, spalte, zahlen),
}));

/** Die breitesten Zeichen einer Stelle der OZ-Maske: Ziffern bzw. ein breiter Buchstabe. */
function stellenmuster(laenge: number, zeichen: string): string {
  return (zeichen === 'numerisch' ? '0' : 'W').repeat(laenge);
}

/** Die breiteste OZ, die eine Maske zulässt, samt Index (der Index steht ohne Trennzeichen direkt dahinter). */
export function ozMuster(maske: OzMaske): string {
  const teile = [...maske.gliederung, maske.position].map((s) => stellenmuster(s.laenge, s.zeichen));
  const index = maske.index ? stellenmuster(maske.index.laenge, maske.index.zeichen) : '';
  return teile.join(maske.trennzeichen ?? '') + index;
}

/**
 * Mindestbreiten aus dem Inhalt, in Pixeln: Die OZ-Spalte so breit wie die breiteste OZ der Maske oder der Zeilen
 * (samt Index), die Zahlenspalten so breit wie ihr längster formatierter Wert. Zahlen und OZ werden so nie abgeschnitten;
 * Textspalten haben keine (dort kürzt eine Ellipse). Ein Durchlauf über die Zeilen ohne DOM; formatiert wird je
 * Zahlenspalte nur der längste gespeicherte Wert (die Nachkommastellen sind je Art fest, N3, also ist der längste
 * gespeicherte Wert auch der längste formatierte).
 */
export function mindestbreiten(
  zeilen: readonly LvZeile[],
  zahlen: GridZahlen,
  maske?: OzMaske,
): Partial<Record<LvSpalte, number>> {
  let oz = maske ? textbreite(ozMuster(maske)) : 0;
  const laengste = new Map<Zahlspalte, LvZeile>();
  const marken = new Set<string>();
  let ansatz = false;
  for (const z of zeilen) {
    const k = z.knoten;
    if (k.art !== 'hinweis' && k.ordnungszahl !== null) {
      oz = Math.max(oz, textbreite(anzeigeText(z, 'ordnungszahl', zahlen)));
    }
    for (const s of ZAHLSPALTEN) {
      const w = s.wert(z);
      const bisher = laengste.get(s);
      if (w !== null && (bisher === undefined || w.length > (s.wert(bisher)?.length ?? 0))) laengste.set(s, z);
    }
    if (k.art === 'position' && (k.mengenansatz?.length ?? 0) > 0) ansatz = true;
    for (const b of z.befunde) if (b.ort.feld !== undefined) marken.add(b.ort.feld);
  }
  const ergebnis: Partial<Record<LvSpalte, number>> = {};
  if (oz > 0) ergebnis.ordnungszahl = Math.ceil(oz + ZELLRAND + (marken.has('ordnungszahl') ? MARKE : 0));
  for (const s of ZAHLSPALTEN) {
    const z = laengste.get(s);
    if (z === undefined) continue;
    const zusatz = (marken.has(s.spalte) ? MARKE : 0) + (s.spalte === 'menge' && ansatz ? ANSATZMARKE : 0);
    ergebnis[s.spalte] = Math.ceil(textbreite(s.text(z, zahlen)) + ZELLRAND + zusatz);
  }
  return ergebnis;
}

/** Breite in den Grenzen `[mindest, GROESSTE_BREITE]`, ganze Pixel. */
const begrenzt = (breite: number, mindest: number): number =>
  Math.round(Math.min(Math.max(breite, mindest, KLEINSTE_BREITE), Math.max(GROESSTE_BREITE, mindest)));

/**
 * Die wirksame Breite je Spalte: die gemerkte Breite des Nutzers, sonst die Standardbreite (die OZ-Spalte ohne gemerkte
 * Breite so breit wie ihr Inhalt), nie unter der Mindestbreite aus dem Inhalt.
 */
export function wirksameBreiten(
  spalten: readonly LvSpalte[],
  gemerkt: Partial<Record<LvSpalte, number>>,
  mindest: Partial<Record<LvSpalte, number>>,
): Partial<Record<LvSpalte, number>> {
  const ergebnis: Partial<Record<LvSpalte, number>> = {};
  for (const s of spalten) {
    const m = mindest[s] ?? KLEINSTE_BREITE;
    const standard = s === 'ordnungszahl' && mindest[s] !== undefined ? m : STANDARDBREITE[s];
    ergebnis[s] = begrenzt(gemerkt[s] ?? standard, m);
  }
  return ergebnis;
}

/** Neue Breite nach einer Änderung um `delta` Pixel (Ziehen oder Tastatur), in den Grenzen. */
export function geaenderteBreite(breite: number, delta: number, mindest: number): number {
  return begrenzt(breite + delta, mindest);
}

const BEKANNTE_SPALTEN: ReadonlySet<string> = new Set(Object.keys(STANDARDBREITE));

/**
 * Gemerkte Breiten aus dem Speicher, z. B. aus `localStorage`: nur bekannte Spalten mit endlichen Zahlen im erlaubten
 * Bereich, auf ganze Pixel gerundet. Alles andere wird übergangen; Unbrauchbares ergibt keine gemerkte Breite.
 */
export function gemerkteBreitenLesen(roh: unknown): Partial<Record<LvSpalte, number>> {
  const ergebnis: Partial<Record<LvSpalte, number>> = {};
  if (typeof roh !== 'object' || roh === null || Array.isArray(roh)) return ergebnis;
  for (const [s, w] of Object.entries(roh)) {
    if (!BEKANNTE_SPALTEN.has(s) || typeof w !== 'number' || !Number.isFinite(w)) continue;
    if (w < KLEINSTE_BREITE || w > GROESSTE_BREITE) continue;
    ergebnis[s as LvSpalte] = Math.round(w);
  }
  return ergebnis;
}
