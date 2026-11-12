// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeitachse für die Anzeige (Ticket 102 Punkt 5): aus erstem und letztem Tag der Tagesindex je Datum, die Abschnitte der
// Kopfzeilen (Monate, Kalenderwochen nach ISO 8601) und die Indizes der freien Tage, passend zur Balkenspalte des
// Vergleichsgrids (Ticket 96: `Zeitleiste`, `Zeitabschnitt`, `Balken` mit Tagesindex, `bisTag` exklusiv). Rein, ohne DOM
// (A2); die Texte der Abschnitte formatiert die App (N4).

import type { Arbeitskalender, Ergebnis, Vorgangsart } from '@tethys/vertrag';
import type { Datum, Tagnummer } from './datum';
import {
  kalenderwocheVon,
  tagnummerAusZivil,
  tagnummerLesen,
  tageImMonat,
  wochentagVon,
  zivilAusTagnummer,
} from './datum';
import { Tageskalender } from './kalender';

/** Ein Monat der Achse; `bisTag` exklusiv, am Rand auf die Achse geschnitten. */
export interface Monatsabschnitt {
  readonly jahr: number;
  /** 1 = Januar. */
  readonly monat: number;
  readonly vonTag: number;
  readonly bisTag: number;
}

/** Eine Kalenderwoche nach ISO 8601 (Montag bis Sonntag); `jahr` ist das Wochenjahr. `bisTag` exklusiv. */
export interface Wochenabschnitt {
  readonly jahr: number;
  readonly woche: number;
  readonly vonTag: number;
  readonly bisTag: number;
}

export interface Zeitachse {
  /** Tag 0 der Achse. */
  readonly von: Datum;
  /** Letzter Tag der Achse (einschließlich). */
  readonly bis: Datum;
  /** Zahl der Tage, `bis − von + 1` (≥ 1). */
  readonly tage: number;
  readonly monate: readonly Monatsabschnitt[];
  readonly kalenderwochen: readonly Wochenabschnitt[];
  /** Indizes der Tage, die keine Arbeitstage des Kalenders sind, aufsteigend. */
  readonly freieTage: readonly number[];
}

export interface Zeitachsenfehler {
  readonly code: 'zeitraum-leer'; // `bis` liegt vor `von`
  readonly meldung: string;
}

function tagnummer(datum: Datum): Tagnummer {
  const tag = tagnummerLesen(datum);
  if (!tag.ok) throw new RangeError(tag.fehler.meldung);
  return tag.wert;
}

/** Zeitachse von `von` bis `bis` (beide einschließlich) mit den freien Tagen des Kalenders. */
export function zeitachseBerechnen(
  von: Datum,
  bis: Datum,
  kalender: Arbeitskalender,
): Ergebnis<Zeitachse, Zeitachsenfehler> {
  const anfang = tagnummer(von);
  const ende = tagnummer(bis);
  if (ende < anfang) {
    return {
      ok: false,
      fehler: { code: 'zeitraum-leer', meldung: `Das Ende ${bis} liegt vor dem Beginn ${von}` },
    };
  }
  const tage = ende - anfang + 1;

  const monate: Monatsabschnitt[] = [];
  for (let t = anfang; t <= ende;) {
    const { jahr, monat } = zivilAusTagnummer(t);
    const naechster = Math.min(tagnummerAusZivil(jahr, monat, tageImMonat(jahr, monat)) + 1, ende + 1);
    monate.push({ jahr, monat, vonTag: t - anfang, bisTag: naechster - anfang });
    t = naechster;
  }

  const kalenderwochen: Wochenabschnitt[] = [];
  for (let t = anfang; t <= ende;) {
    const { jahr, woche } = kalenderwocheVon(t);
    const naechster = Math.min(t - wochentagVon(t) + 8, ende + 1); // Montag der nächsten Woche
    kalenderwochen.push({ jahr, woche, vonTag: t - anfang, bisTag: naechster - anfang });
    t = naechster;
  }

  const tageskalender = new Tageskalender(kalender);
  const freieTage: number[] = [];
  for (let t = anfang; t <= ende; t++) if (!tageskalender.istArbeitstag(t)) freieTage.push(t - anfang);

  return { ok: true, wert: { von, bis, tage, monate, kalenderwochen, freieTage } };
}

/** Tagesindex eines Datums auf der Achse; vor der Achse negativ, danach ab `tage` (die Balkenspalte schneidet ab). */
export function tagesindex(achse: Zeitachse, datum: Datum): number {
  return tagnummer(datum) - tagnummer(achse.von);
}

/**
 * Lage eines Balkens auf der Achse: `bisTag` exklusiv, also Index des Endes + 1, weil das Ende eines Vorgangs sein letzter
 * Arbeitstag ist; beim Meilenstein `bisTag = vonTag` (Ticket 96).
 */
export function balkenlage(
  achse: Zeitachse,
  beginn: Datum,
  ende: Datum,
  art: Vorgangsart,
): { readonly vonTag: number; readonly bisTag: number } {
  const vonTag = tagesindex(achse, beginn);
  return { vonTag, bisTag: art === 'meilenstein' ? vonTag : tagesindex(achse, ende) + 1 };
}
