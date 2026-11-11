// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeilenformat der Mengenermittlung in `QTakeoff/@Row` (GAEB DA XML X31; D-33, Ticket 83). In eigenen Worten
// beschrieben und hergeleitet aus dem Zeilenmuster des amtlichen XSD (80 Zeichen, die ersten 11 leer) und den Zeilen der
// BVBS-Prüfdatei Mengenermittlung 3.3; kein Text der REB-Verfahrensbeschreibung (C1). Rein (A2), rechnet nicht.
//
// Eine Zeile hat 80 Zeichen in festen Spalten (gezählt ab 1, in Zeichen, nicht in Bytes):
//
//   1–12   leer (die Ordnungszahl trägt in der XML-Fassung das `Item`)
//   13     Kennung der Zeile: Leerzeichen = Rechenzeile, `*` = Textzeile. Andere Zeichen ändern, wie das Ergebnis der
//          Zeile zählt (in der Prüfdatei `H` an einem Hilfswert und `Z` an einer Zwischensumme); das Modell kennt das nicht.
//   Textzeile:
//   14–69  der Text
//   Rechenzeile:
//   14–22  kurzer Text zur Zeile (in der Prüfdatei etwa „Achse 1“ oder ein Datum)
//   23–29  Vorzeichen und Faktor der Zeile (in der Prüfdatei „-  2000“ an einem Abzug)
//   30–31  Formelnummer; 91 ist der freie Rechenansatz
//   32–69  die Werte der Formel; bei 91 der Rechenausdruck mit Dezimalkomma. Ein Ausdruck, der mit `=` endet, ist
//          vollständig; sonst setzt ihn die nächste Zeile mit Formel 91 fort (die Teile stehen ohne Trennzeichen
//          hintereinander).
//   70–75  Zeilennummer: vier Ziffern, ein Großbuchstabe, eine Ziffer (z. B. `0004F0`). Ein Ausdruck verweist mit ihr
//          auf das Ergebnis einer anderen Zeile.
//   76–80  leer

/** Länge einer Zeile in Zeichen. */
export const ZEILENLAENGE = 80;
/** Spalten (1-basiert, einschließlich) der Felder. */
const SP = {
  kennung: 13,
  text: [14, 22],
  textzeile: [14, 69],
  vorzeichenFaktor: [23, 29],
  formel: [30, 31],
  inhalt: [32, 69],
  nummer: [70, 75],
} as const;
/** Platz für den Ausdruck der Formel 91 in einer Zeile. */
export const INHALT_ZEICHEN = SP.inhalt[1] - SP.inhalt[0] + 1;
/** Formelnummer des freien Rechenansatzes. */
export const FORMEL_91 = 91;
/** Eine Zeilennummer, wie sie in einem Ausdruck als Verweis steht. */
export const ZEILENNUMMER = /^[0-9]{4}[A-Z][0-9]$/;
/** Verweise auf Zeilennummern in einem Ausdruck (nicht Teil einer längeren Zahl oder eines Worts). */
export const VERWEIS = /(?<![0-9A-Za-z_,])([0-9]{4}[A-Z][0-9])(?![0-9A-Za-z_,])/g;

/** Eine zerlegte Zeile; Texte rechts ohne Leerraum. */
export interface RebZeile {
  /** Spalte 13: `' '` Rechenzeile, `'*'` Textzeile, sonst eine Kennung, die das Modell nicht abbildet. */
  readonly kennung: string;
  /** Textzeile: Spalten 14–69; Rechenzeile: Spalten 14–22. Ohne Leerraum an den Rändern. */
  readonly text: string;
  /** Spalten 23–29 ohne Leerraum. */
  readonly vorzeichenFaktor: string;
  /** Spalten 30–31 ohne Leerraum (zwei Ziffern, wenn vorhanden). */
  readonly formel: string;
  /** Spalten 32–69, rechts ohne Leerraum. */
  readonly inhalt: string;
  /** Spalten 70–75 ohne Leerraum. */
  readonly nummer: string;
  /** Spalten 13–69, rechts ohne Leerraum: die Zeile, wie sie in der Datei steht (für die Textform). */
  readonly roh: string;
  /** Die Zeile hatte nicht 80 Zeichen (sie wurde aufgefüllt bzw. abgeschnitten). */
  readonly laengeAbweichend: boolean;
  /** In den Spalten 1–12 oder 76–80 steht etwas (wird nicht gelesen). */
  readonly randBelegt: boolean;
}

// --- Schreiben ----------------------------------------------------------------------------------------------------

/** Buchstaben der Zeilennummern, wie in der Prüfdatei ab `B`. */
const BUCHSTABEN = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Höchste Blattnummer (vier Ziffern). */
const MAX_BLATT = 9999;
/** Zahl der Zeilennummern, die `zeilennummer` vergeben kann. */
export const MAX_ZEILEN = MAX_BLATT * BUCHSTABEN.length;

/**
 * Die `j`-te Zeilennummer einer geschriebenen Datei (ab 0): Blatt 0001 mit den Buchstaben B bis Z und der Ziffer 0, dann
 * Blatt 0002 usw. Eindeutig über die ganze Datei, damit Verweise zwischen Zeilen eindeutig sind.
 */
export function zeilennummer(j: number): string {
  const blatt = 1 + Math.floor(j / BUCHSTABEN.length);
  return `${String(blatt).padStart(4, '0')}${BUCHSTABEN[j % BUCHSTABEN.length] ?? 'B'}0`;
}

const WORTZEICHEN = /[\p{L}0-9_,]/u;

/**
 * Teilt einen Ausdruck der Formel 91 auf Zeilen auf: jede Zeile höchstens 38 Zeichen, die letzte höchstens 37 und dahinter
 * das `=`. Geteilt wird bevorzugt vor einem Leerzeichen, sonst an einer Grenze zwischen Zahl und Operator, nie hinter einem
 * Leerzeichen: Der Leser hängt die Teile rechts ohne Leerraum aneinander und erhält so genau den Ausdruck zurück.
 */
export function aufteilen(ausdruck: string): string[] {
  const z = Array.from(ausdruck);
  const teile: string[] = [];
  let start = 0;
  while (z.length - start > INHALT_ZEICHEN - 1) {
    let schnitt = -1;
    let hart = -1;
    for (let i = Math.min(start + INHALT_ZEICHEN, z.length - 1); i > start; i--) {
      const vor = z[i - 1] ?? ' ';
      const nach = z[i] ?? ' ';
      if (vor === ' ') continue;
      if (hart < 0) hart = i;
      if (nach === ' ' || !WORTZEICHEN.test(vor) || !WORTZEICHEN.test(nach)) {
        schnitt = i;
        break;
      }
    }
    if (schnitt < 0) schnitt = hart < 0 ? start + INHALT_ZEICHEN : hart;
    teile.push(z.slice(start, schnitt).join(''));
    start = schnitt;
  }
  teile.push(`${z.slice(start).join('')}=`);
  return teile;
}

/** Eine Rechenzeile der Formel 91 ohne Kennung, Text, Vorzeichen und Faktor; `inhalt` hat höchstens 38 Zeichen. */
export function rechenzeile91(inhalt: string, nummer: string): string {
  const rest = INHALT_ZEICHEN - Array.from(inhalt).length;
  return `${' '.repeat(SP.formel[0] - 1)}${String(FORMEL_91)}${inhalt}${' '.repeat(Math.max(0, rest))}${nummer}${' '.repeat(ZEILENLAENGE - SP.nummer[1])}`;
}

export function rebZeileZerlegen(row: string): RebZeile {
  const z = Array.from(row);
  const laengeAbweichend = z.length !== ZEILENLAENGE;
  while (z.length < ZEILENLAENGE) z.push(' ');
  const spalten = (von: number, bis: number): string => z.slice(von - 1, bis).join('');
  const kennung = z[SP.kennung - 1] ?? ' ';
  const textzeile = kennung === '*';
  return {
    kennung,
    text: (textzeile ? spalten(...SP.textzeile) : spalten(...SP.text)).trim(),
    vorzeichenFaktor: spalten(...SP.vorzeichenFaktor).trim(),
    formel: spalten(...SP.formel).trim(),
    inhalt: spalten(...SP.inhalt).trimEnd(),
    nummer: spalten(...SP.nummer).trim(),
    roh: spalten(SP.kennung, SP.inhalt[1]).trimEnd(),
    laengeAbweichend,
    randBelegt: spalten(1, SP.kennung - 1).trim() !== '' || z.slice(SP.nummer[1]).join('').trim() !== '',
  };
}
