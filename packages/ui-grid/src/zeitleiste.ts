// SPDX-License-Identifier: AGPL-3.0-or-later
// Lagen-Rechnung der Balkenspalte (Ticket 96): Tagesindex → Pixel, Abschneiden an der Achse, Meilenstein, Fortschritt,
// freie Tage und Markierungen. Kein DOM, kein Kalender, keine Daten: Das Grid kennt nur Tagesindizes und fertige Texte
// (N4); Pixel sind Bildschirmlagen, keine Fachzahlen.

import { texte } from './texte';
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
  /** Die Ist-Termine; `null` ohne `ist`. */
  readonly ist: Lage | null;
  /**
   * Gefüllte Breite in Pixeln ab dem linken Rand des sichtbaren Balkens. Der Anteil gilt für den ganzen Balken, auch
   * wenn er abgeschnitten ist. `null` ohne Fortschritt, beim Meilenstein und ohne sichtbaren Balken.
   */
  readonly fortschritt: number | null;
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
  const soll = lage(b.vonTag, b.art === 'meilenstein' ? b.vonTag : b.bisTag, a);
  return {
    soll,
    ist: b.ist ? lage(b.ist.vonTag, b.ist.bisTag, a) : null,
    fortschritt: fuellung(b, soll.sichtbar, a),
  };
}

/** Was am Anfang und am Ende der Achse abgeschnitten ist, in Worten; je Rand Balken und Ist-Termine. */
function randteile(l: Balkenlage): { anfang: string[]; ende: string[] } {
  const anfang: string[] = [];
  const ende: string[] = [];
  const { soll, ist } = l;
  if (soll.vorAnfang) anfang.push(soll.sichtbar ? texte.balkenVorher : texte.balkenGanzVorher);
  if (ist?.vorAnfang) anfang.push(ist.sichtbar ? texte.istVorher : texte.istGanzVorher);
  if (soll.nachEnde) ende.push(soll.sichtbar ? texte.balkenNachher : texte.balkenGanzNachher);
  if (ist?.nachEnde) ende.push(ist.sichtbar ? texte.istNachher : texte.istGanzNachher);
  return { anfang, ende };
}

/** Texte der Kennzeichen am Anfang und am Ende der Achse; `null`, wenn dort nichts abgeschnitten ist. */
export function randhinweise(l: Balkenlage): {
  readonly anfang: string | null;
  readonly ende: string | null;
} {
  const { anfang, ende } = randteile(l);
  return {
    anfang: anfang.length > 0 ? anfang.join('; ') : null,
    ende: ende.length > 0 ? ende.join('; ') : null,
  };
}

/**
 * Zugänglicher Name einer Balkenzelle: Zelltext, Beschreibung des Balkens und, was abgeschnitten ist (nichts
 * verschwindet still, Q5). Leere Teile fallen weg.
 */
export function balkenName(text: string, b: Balken, l: Balkenlage): string {
  const { anfang, ende } = randteile(l);
  return [text, b.beschreibung, ...anfang, ...ende].filter((t) => t !== '').join(', ');
}

/** Ein Abschnitt des Kopfes auf der Achse. */
export interface Kopfabschnitt extends Strecke {
  readonly text: string;
}

/** Eine Markierung auf der Achse; `links` ist die Lage der Linie. */
export interface Markierungslage {
  readonly links: number;
  readonly art: string;
  readonly beschreibung: string;
}

/** Was eine Balkenspalte für Kopf und Zeilen braucht, einmal je Spalte gerechnet (nicht je Zeile). */
export interface Zeitleistenbild {
  readonly achse: Achse;
  /** Abschnitte der oberen Kopfzeile, auf die Achse geschnitten; leere und ganz außerhalb liegende fehlen. */
  readonly kopf: readonly Kopfabschnitt[];
  /** Abschnitte der unteren Kopfzeile wie `kopf`; `null` ohne `unterkopf`. */
  readonly unterkopf: readonly Kopfabschnitt[] | null;
  /** Freie Tage als Läufe aufeinanderfolgender Tage, aufsteigend; Tage außerhalb der Achse fehlen. */
  readonly freieTage: readonly Strecke[];
  /** Markierungen auf der Achse, die Ränder eingeschlossen; außerhalb fehlen sie. */
  readonly markierungen: readonly Markierungslage[];
}

export function zeitleistenbild(z: Zeitleiste): Zeitleistenbild {
  const a = achse(z);
  const abschnitte = (liste: Zeitleiste['kopf']): Kopfabschnitt[] =>
    liste.flatMap((ab) => {
      const s = lage(ab.vonTag, ab.bisTag, a).sichtbar;
      return s && s.breite > 0 ? [{ text: ab.text, links: s.links, breite: s.breite }] : [];
    });
  return {
    achse: a,
    kopf: abschnitte(z.kopf),
    unterkopf: z.unterkopf ? abschnitte(z.unterkopf) : null,
    freieTage: laeufe(z.freieTage ?? [], a),
    markierungen: (z.markierungen ?? [])
      .filter((m) => m.tag >= 0 && m.tag <= a.tage)
      .map((m) => ({ links: m.tag * a.pixelJeTag, art: m.art, beschreibung: m.beschreibung })),
  };
}

/** Freie Tage zu Läufen aufeinanderfolgender Tage, in Pixeln. */
function laeufe(tage: readonly number[], a: Achse): Strecke[] {
  const sortiert = [...new Set(tage)]
    .filter((t) => Number.isInteger(t) && t >= 0 && t < a.tage)
    .sort((x, y) => x - y);
  const ergebnis: Strecke[] = [];
  let von = -1;
  let bis = -1;
  for (const t of sortiert) {
    if (t === bis) {
      bis++;
      continue;
    }
    if (bis > von) ergebnis.push({ links: von * a.pixelJeTag, breite: (bis - von) * a.pixelJeTag });
    von = t;
    bis = t + 1;
  }
  if (bis > von) ergebnis.push({ links: von * a.pixelJeTag, breite: (bis - von) * a.pixelJeTag });
  return ergebnis;
}

function fuellung(b: Balken, sichtbar: Strecke | null, a: Achse): number | null {
  const f = b.fortschritt;
  if (f === undefined || !Number.isFinite(f) || b.art === 'meilenstein' || !sichtbar) return null;
  const anteil = Math.min(100, Math.max(0, f)) / 100;
  const grenze = (b.vonTag + (b.bisTag - b.vonTag) * anteil) * a.pixelJeTag;
  return Math.min(sichtbar.breite, Math.max(0, grenze - sichtbar.links));
}
