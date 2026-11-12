// SPDX-License-Identifier: AGPL-3.0-or-later
// Reine Hilfen des Vergleichsgrids (Ticket 60): Zellbereich, Kopieren als TSV, fixierte Spalten, Kennzeichentexte.
// Kein DOM, keine Zahlenlogik: Zellen sind fertige Texte (N1, A5).

import { schreibeTsv } from './tsv';
import type { Zelle } from './navigation';
import type { Kennzeichen, KennzeichenText, VergleichsSpalte, VergleichsZelle } from './vergleichTypen';

/** Standardbreite einer Spalte ohne Angabe, in Pixeln. */
export const STANDARDBREITE = 120;

/** Ein rechteckiger Zellbereich als Index-Spannen (beide Enden eingeschlossen). */
export interface Bereich {
  readonly zeilen: readonly [number, number];
  readonly spalten: readonly [number, number];
}

/** Das Rechteck zwischen Anker und Ende, gleich in welcher Richtung gezogen wurde. */
export function normiereBereich(anker: Zelle, ende: Zelle): Bereich {
  return {
    zeilen: [Math.min(anker.zeile, ende.zeile), Math.max(anker.zeile, ende.zeile)],
    spalten: [Math.min(anker.spalte, ende.spalte), Math.max(anker.spalte, ende.spalte)],
  };
}

/**
 * Die Anzeigetexte eines Bereichs als TSV wie aus Excel (Strg+C). Fehlende Zellen bleiben leer; Kennzeichen und
 * Tooltips gehören nicht dazu, nur der Text, den die Zelle zeigt.
 */
export function bereichAlsTsv(
  zeilen: readonly { readonly zellen: Readonly<Record<string, VergleichsZelle | undefined>> }[],
  spalten: readonly Pick<VergleichsSpalte, 'id'>[],
  bereich: Bereich,
): string {
  const ids = spalten.slice(bereich.spalten[0], bereich.spalten[1] + 1).map((s) => s.id);
  return schreibeTsv(
    zeilen
      .slice(bereich.zeilen[0], bereich.zeilen[1] + 1)
      .map((z) => ids.map((id) => z.zellen[id]?.text ?? '')),
  );
}

/** Linker Versatz jeder fixierten Spalte (die ersten `anzahl`), `null` für Spalten, die mitscrollen. */
export function fixierteVersaetze(
  spalten: readonly Pick<VergleichsSpalte, 'breite'>[],
  anzahl: number,
): (number | null)[] {
  let links = 0;
  return spalten.map((s, i) => {
    if (i >= anzahl) return null;
    const versatz = links;
    links += s.breite ?? STANDARDBREITE;
    return versatz;
  });
}

/**
 * Die festen Klassen der Zellen je Spalte (Ausrichtung, fixiert, letzte fixierte), einmal je Grid statt je Zelle und
 * Zeile (Ticket 74). `versaetze` wie aus `fixierteVersaetze`.
 */
export function festeZellklassen(
  spalten: readonly Pick<VergleichsSpalte, 'ausrichtung'>[],
  versaetze: readonly (number | null)[],
): string[] {
  const letzteFixierte = versaetze.reduce<number>((l, v, i) => (v === null ? l : i), -1);
  return spalten.map((s, i) => {
    let klassen = 'tx-grid__zelle';
    if (s.ausrichtung === 'rechts' || s.ausrichtung === 'mitte')
      klassen += ` tx-grid__zelle--${s.ausrichtung}`;
    if ((versaetze[i] ?? null) !== null) klassen += ' tx-grid__zelle--fixiert';
    if (i === letzteFixierte) klassen += ' tx-grid__zelle--fixiert-letzte';
    return klassen;
  });
}

/** Eingebaute Kennzeichen: Symbol in der Zelle und Beschreibung in Worten (nicht nur Farbe, U8). */
export const KENNZEICHEN: Readonly<Record<string, KennzeichenText>> = {
  hoch: { symbol: '▲', beschreibung: 'Ausreißer nach oben' },
  niedrig: { symbol: '▼', beschreibung: 'Ausreißer nach unten' },
  min: { symbol: 'min', beschreibung: 'niedrigster Preis' },
  max: { symbol: 'max', beschreibung: 'höchster Preis' },
  'nicht-angeboten': { symbol: '–', beschreibung: 'nicht angeboten' },
  nullpreis: { symbol: '0', beschreibung: 'Nullpreis' },
  hinweis: { symbol: '!', beschreibung: 'Hinweis' },
};

/** Symbol für ein Kennzeichen, das weder eingebaut ist noch Texte von der App hat. */
const UNBEKANNT_SYMBOL = '•';

export function kennzeichenText(
  k: Kennzeichen,
  eigene?: Readonly<Record<string, KennzeichenText>>,
): KennzeichenText {
  const aus = (
    tabelle: Readonly<Record<string, KennzeichenText>> | undefined,
  ): KennzeichenText | undefined =>
    tabelle !== undefined && Object.hasOwn(tabelle, k) ? tabelle[k] : undefined;
  return aus(eigene) ?? aus(KENNZEICHEN) ?? { symbol: UNBEKANNT_SYMBOL, beschreibung: k };
}

/** Beschreibung einer Zelle für Tooltip und Screenreader: die Kennzeichen in Worten, dann der Tooltip. */
export function zellbeschreibung(
  zelle: VergleichsZelle,
  eigene?: Readonly<Record<string, KennzeichenText>>,
): string {
  const teile = (zelle.kennzeichen ?? []).map((k) => kennzeichenText(k, eigene).beschreibung);
  if (zelle.tooltip !== undefined && zelle.tooltip !== '') teile.push(zelle.tooltip);
  return teile.join('. ');
}
