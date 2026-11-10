// SPDX-License-Identifier: AGPL-3.0-or-later
// Parser für die Excel-Zwischenablage (Text mit Tabulatoren und Zeilenumbrüchen, RFC-4180-artig mit Tab als
// Trenner). Reine Funktion, keine Zahlenlogik: Zellen bleiben Text, die de-DE-Zahlen liest der Aufrufer (N4).

/**
 * Zerlegt Text in Zeilen und Zellen.
 *
 * - Zeilentrenner: `\n`, `\r\n` oder `\r`; ein abschließender Zeilentrenner erzeugt keine leere Zeile
 *   (Excel hängt ihn an).
 * - Zellentrenner: Tabulator.
 * - Eine Zelle, die mit `"` beginnt, ist zitiert: Tabulator und Zeilenumbruch gehören dann zum Inhalt, `""` ist ein
 *   Anführungszeichen. Ein `"` mitten in einer Zelle ist ein gewöhnliches Zeichen (so schreibt Excel es nicht,
 *   aber andere Quellen tun es).
 * - Leere Zellen und vollständig leere Zeilen bleiben erhalten; es geht nichts verloren.
 */
export function parseTsv(text: string): string[][] {
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let zelle = '';
  let zellenAnfang = true;
  let zitiert = false;
  let offen = false; // es gibt Inhalt seit dem letzten Zeilentrenner

  const zellenEnde = (): void => {
    zeile.push(zelle);
    zelle = '';
    zellenAnfang = true;
  };
  const zeilenEnde = (): void => {
    zellenEnde();
    zeilen.push(zeile);
    zeile = [];
    offen = false;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text.charAt(i);
    if (zitiert) {
      if (c === '"') {
        if (text.charAt(i + 1) === '"') {
          zelle += '"';
          i++;
        } else {
          zitiert = false;
        }
      } else {
        zelle += c;
      }
      continue;
    }
    offen = true;
    if (c === '"' && zellenAnfang) {
      zitiert = true;
      zellenAnfang = false;
    } else if (c === '\t') {
      zellenEnde();
    } else if (c === '\n') {
      zeilenEnde();
    } else if (c === '\r') {
      if (text.charAt(i + 1) === '\n') i++;
      zeilenEnde();
    } else {
      zelle += c;
      zellenAnfang = false;
    }
  }
  if (offen || zitiert || zelle !== '' || zeile.length > 0) zeilenEnde();
  return zeilen;
}
