// SPDX-License-Identifier: AGPL-3.0-or-later
// Kalendertage (Ticket 102 Punkt 1): Text `JJJJ-MM-TT`, gerechnet über eine ganze Tageszahl im proleptischen
// gregorianischen Kalender (Tag 0 = 1970-01-01), nie über `Date`, Uhr oder Zeitzonen. Rein (A2).

import { KALENDERDATUM_MUSTER } from '@tethys/vertrag';
import type { Ergebnis, Kalenderdatum, Wochentag } from '@tethys/vertrag';

export type Datumsfehlercode =
  | 'datum-form' // nicht genau `JJJJ-MM-TT` mit Ziffern 0–9
  | 'datum-unmoeglich'; // Jahr 0000, Monat oder Tag gibt es nicht (z. B. 2026-02-29)

export interface Datumsfehler {
  readonly code: Datumsfehlercode;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

/** Ganze Tageszahl: Tage seit 1970-01-01 (Tag 0); intern, nie gespeichert. */
export type Tagnummer = number;

/** Zivile Angaben eines Kalendertags. */
export interface Zivildatum {
  readonly jahr: number;
  readonly monat: number;
  readonly tag: number;
}

/** Der letzte darstellbare Tag (9999-12-31) als Tagnummer. */
export const LETZTER_TAG: Tagnummer = tagnummerAusZivil(9999, 12, 31);

function istSchaltjahr(jahr: number): boolean {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0;
}

export function tageImMonat(jahr: number, monat: number): number {
  if (monat === 2) return istSchaltjahr(jahr) ? 29 : 28;
  return monat === 4 || monat === 6 || monat === 9 || monat === 11 ? 30 : 31;
}

/**
 * Prüft Form und Existenz eines Kalendertags `JJJJ-MM-TT` (kein Leerraum, keine Zeitangabe), Jahr 0001 bis 9999 im proleptischen gregorianischen Kalender. Nur diese
 * Prüfung und die Rechnung erzeugen ein `Kalenderdatum`; Eingaben tragen Daten als ungeprüften `string`, die Rechnung prüft sie
 * selbst und meldet Ungültiges als Befund (U5).
 */
export function datumPruefen(text: string): Ergebnis<Kalenderdatum, Datumsfehler> {
  const tag = tagnummerLesen(text);
  if (tag.ok) return { ok: true, wert: text as Kalenderdatum };
  return tag;
}

/** Liest einen Kalendertag als Tagnummer. */
export function tagnummerLesen(text: string): Ergebnis<Tagnummer, Datumsfehler> {
  if (!KALENDERDATUM_MUSTER.test(text)) {
    return {
      ok: false,
      fehler: { code: 'datum-form', meldung: `Kein Datum JJJJ-MM-TT: ${JSON.stringify(text)}` },
    };
  }
  const [jahr = 0, monat = 0, tag = 0] = text.split('-').map(Number);
  if (jahr < 1 || monat < 1 || monat > 12 || tag < 1 || tag > tageImMonat(jahr, monat)) {
    return { ok: false, fehler: { code: 'datum-unmoeglich', meldung: `Diesen Tag gibt es nicht: ${text}` } };
  }
  return { ok: true, wert: tagnummerAusZivil(jahr, monat, tag) };
}

/** Tage seit 1970-01-01 (Verfahren „days from civil“, März als erster Monat des Rechenjahres). */
export function tagnummerAusZivil(jahr: number, monat: number, tag: number): Tagnummer {
  const j = monat <= 2 ? jahr - 1 : jahr;
  const aera = Math.floor(j / 400);
  const jahrDerAera = j - aera * 400;
  const monatAbMaerz = (monat + 9) % 12;
  const tagDesJahres = Math.floor((153 * monatAbMaerz + 2) / 5) + tag - 1;
  const tagDerAera =
    jahrDerAera * 365 + Math.floor(jahrDerAera / 4) - Math.floor(jahrDerAera / 100) + tagDesJahres;
  return aera * 146_097 + tagDerAera - 719_468;
}

/** Umkehrung von {@link tagnummerAusZivil}. */
export function zivilAusTagnummer(nummer: Tagnummer): Zivildatum {
  const z = nummer + 719_468;
  const aera = Math.floor(z / 146_097);
  const tagDerAera = z - aera * 146_097;
  const jahrDerAera = Math.floor(
    (tagDerAera -
      Math.floor(tagDerAera / 1460) +
      Math.floor(tagDerAera / 36_524) -
      Math.floor(tagDerAera / 146_096)) /
      365,
  );
  const tagDesJahres =
    tagDerAera - (365 * jahrDerAera + Math.floor(jahrDerAera / 4) - Math.floor(jahrDerAera / 100));
  const monatAbMaerz = Math.floor((5 * tagDesJahres + 2) / 153);
  const tag = tagDesJahres - Math.floor((153 * monatAbMaerz + 2) / 5) + 1;
  const monat = monatAbMaerz < 10 ? monatAbMaerz + 3 : monatAbMaerz - 9;
  const jahr = jahrDerAera + aera * 400 + (monat <= 2 ? 1 : 0);
  return { jahr, monat, tag };
}

/** Text `JJJJ-MM-TT` einer Tagnummer zwischen 0001-01-01 und 9999-12-31. */
export function datumAusTagnummer(nummer: Tagnummer): Kalenderdatum {
  const { jahr, monat, tag } = zivilAusTagnummer(nummer);
  return `${String(jahr).padStart(4, '0')}-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}` as Kalenderdatum;
}

/** ISO-Wochentag einer Tagnummer (1970-01-01 war ein Donnerstag). */
export function wochentagVon(nummer: Tagnummer): Wochentag {
  return ((((nummer % 7) + 7 + 3) % 7) + 1) as Wochentag;
}

/**
 * Kalenderwoche nach ISO 8601: Die Woche läuft von Montag bis Sonntag; Woche 1 ist die Woche mit dem ersten Donnerstag
 * des Jahres. Das Wochenjahr ist das Jahr des Donnerstags der Woche und kann vom Kalenderjahr abweichen.
 */
export function kalenderwocheVon(nummer: Tagnummer): { readonly jahr: number; readonly woche: number } {
  const donnerstag = nummer - wochentagVon(nummer) + 4;
  const jahr = zivilAusTagnummer(donnerstag).jahr;
  return { jahr, woche: Math.floor((donnerstag - tagnummerAusZivil(jahr, 1, 1)) / 7) + 1 };
}
