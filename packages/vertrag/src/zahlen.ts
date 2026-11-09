// SPDX-License-Identifier: AGPL-3.0-or-later
// Zahlentypen (Regel N1, N3). Nur Typen und eine Konstantentabelle.

import type { Marke } from './marken';

/**
 * Dezimalzahl ohne Gleitkomma. Opak: Nur `packages/dezimal` erzeugt und verrechnet Werte; `vertrag` enthält
 * keinen Konstruktor.
 *
 * **Darstellungsvertrag** (verbindlich für `dezimal`, `speicher`, `gaeb`):
 *
 * Ein `Dezimal` ist zur Laufzeit eine Zeichenkette in kanonischer Punktnotation, genau wie in den Fixtures:
 *
 * - Muster `-?(0|[1-9][0-9]*)\.[0-9]+` mit Dezimalpunkt; kein Tausenderzeichen, kein Dezimalkomma, kein `+`,
 *   kein Exponent, keine führenden Nullen, kein `-0.00` (negative Null ist ungültig).
 * - Die Zahl der Nachkommastellen ist Teil des Werts und folgt dem Typ: `Menge` und `Einheitspreis` 3,
 *   `Prozent` und `Betrag` 2 (siehe {@link NACHKOMMASTELLEN}), mit allen Nullen (`"10.000"`, `"12.35"`).
 *   Zwischenwerte einer Rechnung sind unbenannte `Dezimal` mit mehr Stellen und werden nie gespeichert.
 * - `speicher` schreibt den Wert unverändert als Text in SQLite und in die kanonische JSON-Datei. Er rechnet nie
 *   damit und wandelt ihn nie in `number`. `gaeb` liest und schreibt GAEB-Dezimalwerte (Punktnotation) über
 *   `dezimal`. de-DE-Formatierung gibt es nur an den Rändern (N4).
 * - Negative Werte sind darstellbar (`-` vor der ersten Ziffer). Wie negative Beträge gerundet werden, regelt
 *   Ticket 04, nicht dieser Vertrag.
 *
 * Eine Zeichenkette ist nicht ohne Weiteres ein `Dezimal`; die Marke verhindert Zuweisungen von `string` und `number`.
 */
export type Dezimal = string & Marke<'Dezimal'>;

/** Menge (Vordersatz), 3 Nachkommastellen. */
export type Menge = string & Marke<'Dezimal' | 'Menge'>;
/** Einheitspreis (EP), 3 Nachkommastellen gespeichert (G-21). */
export type Einheitspreis = string & Marke<'Dezimal' | 'Einheitspreis'>;
/** Geldbetrag (GP, Summen, Nachlass, MwSt), 2 Nachkommastellen. */
export type Betrag = string & Marke<'Dezimal' | 'Betrag'>;
/** Prozentwert (Nachlass, MwSt-Satz), 2 Nachkommastellen. `19.00` bedeutet 19 %. */
export type Prozent = string & Marke<'Dezimal' | 'Prozent'>;

/**
 * Die einzige Tabelle der Nachkommastellen (N3, G-21). Keine andere Stelle im Repo nennt diese Zahlen;
 * `dezimal` liest die Skalen von hier.
 */
export const NACHKOMMASTELLEN = {
  menge: 3,
  einheitspreis: 3,
  prozent: 2,
  betrag: 2,
} as const;

/** Name eines Zahlentyps mit fester Skala. */
export type Zahlenart = keyof typeof NACHKOMMASTELLEN;
