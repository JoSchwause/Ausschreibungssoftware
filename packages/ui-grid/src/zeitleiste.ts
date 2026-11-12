// SPDX-License-Identifier: AGPL-3.0-or-later
// Lagen-Rechnung der Balkenspalte (Ticket 96): Tagesindex → Pixel, Abschneiden an der Achse, Meilenstein, Fortschritt,
// freie Tage und Markierungen. Kein DOM, kein Kalender, keine Daten: Das Grid kennt nur Tagesindizes und fertige Texte
// (N4); Pixel sind Bildschirmlagen, keine Fachzahlen.

import type { Balken, Zeitleiste } from './vergleichTypen';

/** Breite eines Tages ohne Angabe, in Pixeln. */
export const STANDARD_PIXEL_JE_TAG = 16;

/** Die Achse einer Zeitleiste in Pixeln. */
export interface Achse {
  /** Zahl der Tage, mindestens 1. */
  readonly tage: number;
  readonly pixelJeTag: number;
  /** `tage × pixelJeTag`: die Breite der Spalte. */
  readonly breite: number;
}

/** Die Achse einer Zeitleiste; weniger als ein Tag gilt als ein Tag, ein Maßstab ohne Breite als Standard. */
export function achse(z: Pick<Zeitleiste, 'tage' | 'pixelJeTag'>): Achse {
  const tage = Number.isFinite(z.tage) ? Math.max(1, Math.round(z.tage)) : 1;
  const px = z.pixelJeTag;
  const pixelJeTag = px !== undefined && Number.isFinite(px) && px > 0 ? px : STANDARD_PIXEL_JE_TAG;
  return { tage, pixelJeTag, breite: tage * pixelJeTag };
}

/** Ein waagerechtes Stück in Pixeln ab dem Anfang der Achse. */
export interface Strecke {
  readonly links: number;
  readonly breite: number;
}

/** Lage eines Balkens (oder seines Ist-Balkens) auf der Achse. */
export interface Lage {
  /** Der Teil auf der Achse; `null`, wenn der Balken ganz außerhalb liegt. Ein Meilenstein hat die Breite 0. */
  readonly sichtbar: Strecke | null;
  /** Der Balken reicht vor den Anfang der Achse (vor Tag 0) und ist dort abgeschnitten oder liegt ganz davor. */
  readonly vorAnfang: boolean;
  /** Der Balken reicht hinter das Ende der Achse und ist dort abgeschnitten oder liegt ganz dahinter. */
  readonly nachEnde: boolean;
}

/** Lage eines Balkens, seines Ist-Balkens und seines Fortschritts. */
export interface Balkenlage {
  readonly soll: Lage;
}

/**
 * Lage der Tage `[vonTag, bisTag)` auf der Achse, abgeschnitten auf `[0, tage)`. Ohne Dauer (`bisTag ≤ vonTag`) ist sie
 * ein Punkt bei `vonTag`, der auch auf den Rändern der Achse noch auf ihr liegt.
 */
export function lage(vonTag: number, bisTag: number, a: Achse): Lage {
  if (bisTag <= vonTag) {
    const aufAchse = vonTag >= 0 && vonTag <= a.tage;
    return {
      sichtbar: aufAchse ? { links: vonTag * a.pixelJeTag, breite: 0 } : null,
      vorAnfang: vonTag < 0,
      nachEnde: vonTag > a.tage,
    };
  }
  const von = Math.max(vonTag, 0);
  const bis = Math.min(bisTag, a.tage);
  return {
    sichtbar: bis > von ? { links: von * a.pixelJeTag, breite: (bis - von) * a.pixelJeTag } : null,
    vorAnfang: vonTag < 0,
    nachEnde: bisTag > a.tage,
  };
}

/** Lage eines Balkens; ein Meilenstein ist ein Punkt bei `vonTag`, auch wenn `bisTag` davon abweicht. */
export function balkenLage(b: Balken, a: Achse): Balkenlage {
  return { soll: lage(b.vonTag, b.art === 'meilenstein' ? b.vonTag : b.bisTag, a) };
}
