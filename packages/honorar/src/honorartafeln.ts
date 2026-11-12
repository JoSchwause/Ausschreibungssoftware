// SPDX-License-Identifier: AGPL-3.0-or-later
// Honorartafeln der HOAI 2021 als Daten (Ticket 101, D-56). Die HOAI ist ein amtliches Werk (§ 5 Abs. 1 UrhG); im Repo
// stehen nur die Tafelwerte, je mit Vorschrift, Adresse und Abrufdatum. Die Abschriften folgen Zeile für Zeile der
// Quelle: anrechenbare Kosten, dann je Honorarzone „von“ und „bis“, ganze Euro, Leerzeichen als Tausendertrenner wie
// dort. Die Datentests (`honorartafeln.test.ts`) prüfen Ordnung und Zonenübergänge und schreiben die erste und letzte
// Zeile jeder Tafel ein zweites Mal ab.

import { alsBetrag } from '@tethys/dezimal';
import type { Betrag } from '@tethys/vertrag';

// --- Typen -----------------------------------------------------------------------------------------------------

/** Honorarzone nach § 5; die Technische Ausrüstung kennt nur I bis III (§ 56 Abs. 1). */
export type Honorarzone = 'I' | 'II' | 'III' | 'IV' | 'V';

/** „von“ (Basishonorarsatz) und „bis“ (oberer Honorarsatz) einer Honorarzone, in Euro mit 2 Stellen. */
export interface Honorarspanne {
  readonly von: Betrag;
  readonly bis: Betrag;
}

/** Eine Zeile einer Honorartafel: anrechenbare Kosten und je Honorarzone der Tafel ihre Honorarspanne. */
export interface Tafelzeile {
  readonly anrechenbareKosten: Betrag;
  readonly spannen: Readonly<Partial<Record<Honorarzone, Honorarspanne>>>;
}

/** Fundstelle einer Tafel oder eines Prozentsatzes in der HOAI. */
export interface Quelle {
  /** Paragraph und Absatz, z. B. `§ 35 Abs. 1`. */
  readonly vorschrift: string;
  readonly url: string;
  /** Abrufdatum der Quelle (ISO-Datum). */
  readonly abgerufen: string;
}

export interface Honorartafel {
  readonly quelle: Quelle;
  /** Die Honorarzonen der Tafel, aufsteigend. */
  readonly honorarzonen: readonly Honorarzone[];
  /** Nach anrechenbaren Kosten streng steigend. */
  readonly zeilen: readonly Tafelzeile[];
}

// --- Abschrift lesen -------------------------------------------------------------------------------------------

/** Abrufdatum aller Abschriften in diesem Paket. */
export const ABGERUFEN = '2026-11-12';

/** Fundstelle in der amtlichen Fassung auf gesetze-im-internet.de (die HOAI 2021 steht unter `hoai_2013`). */
export function quelle(paragraph: number, absatz: number): Quelle {
  return {
    vorschrift: `§ ${String(paragraph)} Abs. ${String(absatz)}`,
    url: `https://www.gesetze-im-internet.de/hoai_2013/__${String(paragraph)}.html`,
    abgerufen: ABGERUFEN,
  };
}

/** Ganze Euro der Abschrift (`1 049 587`) als Betrag (`1049587.00`). Unlesbares ist ein Datenfehler: Ausnahme. */
function euro(zelle: string, ort: string): Betrag {
  const ziffern = zelle.trim().split(' ').join('');
  if (!/^[1-9][0-9]*$/.test(ziffern))
    throw new Error(`${ort}: kein ganzer Eurobetrag: ${JSON.stringify(zelle)}`);
  const betrag = alsBetrag(`${ziffern}.00`);
  if (!betrag.ok) throw new Error(`${ort}: ${betrag.fehler.meldung}`);
  return betrag.wert;
}

/**
 * Liest die Abschrift einer Tafel. Jede Zeile hat die anrechenbaren Kosten und je Honorarzone „von“ und „bis“, durch
 * `|` getrennt. Eine falsche Spaltenzahl oder ein unlesbarer Wert ist ein Datenfehler und wirft beim Laden des Pakets;
 * die Datentests decken das sofort auf.
 */
function tafelLesen(
  quelleDerTafel: Quelle,
  honorarzonen: readonly Honorarzone[],
  abschrift: string,
): Honorartafel {
  const zeilen = abschrift
    .trim()
    .split('\n')
    .map((text, index): Tafelzeile => {
      const ort = `${quelleDerTafel.vorschrift}, Zeile ${String(index + 1)}`;
      const [kosten, ...werte] = text.split('|').map((zelle) => euro(zelle, ort));
      if (kosten === undefined || werte.length !== 2 * honorarzonen.length)
        throw new Error(`${ort}: erwartet ${String(1 + 2 * honorarzonen.length)} Spalten: ${text}`);
      const spannen: Partial<Record<Honorarzone, Honorarspanne>> = {};
      honorarzonen.forEach((zone, n) => {
        const von = werte[2 * n];
        const bis = werte[2 * n + 1];
        if (von === undefined || bis === undefined) throw new Error(`${ort}: Zone ${zone} unvollständig`);
        spannen[zone] = { von, bis };
      });
      return { anrechenbareKosten: kosten, spannen };
    });
  return { quelle: quelleDerTafel, honorarzonen, zeilen };
}

const ZONEN_I_BIS_V: readonly Honorarzone[] = ['I', 'II', 'III', 'IV', 'V'];

// --- Tafeln ----------------------------------------------------------------------------------------------------

/**
 * § 35 Abs. 1 HOAI: Honorartafel für Grundleistungen bei Gebäuden und Innenräumen (Honorarzonen I bis V).
 * https://www.gesetze-im-internet.de/hoai_2013/__35.html, abgerufen am 2026-11-12.
 * Spalten: anrechenbare Kosten | I von | I bis | II von | II bis | III von | III bis | IV von | IV bis | V von | V bis.
 */
export const TAFEL_35 = tafelLesen(
  quelle(35, 1),
  ZONEN_I_BIS_V,
  `
25 000 | 3 120 | 3 657 | 3 657 | 4 339 | 4 339 | 5 412 | 5 412 | 6 094 | 6 094 | 6 631
35 000 | 4 217 | 4 942 | 4 942 | 5 865 | 5 865 | 7 315 | 7 315 | 8 237 | 8 237 | 8 962
50 000 | 5 804 | 6 801 | 6 801 | 8 071 | 8 071 | 10 066 | 10 066 | 11 336 | 11 336 | 12 333
75 000 | 8 342 | 9 776 | 9 776 | 11 601 | 11 601 | 14 469 | 14 469 | 16 293 | 16 293 | 17 727
100 000 | 10 790 | 12 644 | 12 644 | 15 005 | 15 005 | 18 713 | 18 713 | 21 074 | 21 074 | 22 928
150 000 | 15 500 | 18 164 | 18 164 | 21 555 | 21 555 | 26 883 | 26 883 | 30 274 | 30 274 | 32 938
200 000 | 20 037 | 23 480 | 23 480 | 27 863 | 27 863 | 34 751 | 34 751 | 39 134 | 39 134 | 42 578
300 000 | 28 750 | 33 692 | 33 692 | 39 981 | 39 981 | 49 864 | 49 864 | 56 153 | 56 153 | 61 095
500 000 | 45 232 | 53 006 | 53 006 | 62 900 | 62 900 | 78 449 | 78 449 | 88 343 | 88 343 | 96 118
750 000 | 64 666 | 75 781 | 75 781 | 89 927 | 89 927 | 112 156 | 112 156 | 126 301 | 126 301 | 137 416
1 000 000 | 83 182 | 97 479 | 97 479 | 115 675 | 115 675 | 144 268 | 144 268 | 162 464 | 162 464 | 176 761
1 500 000 | 119 307 | 139 813 | 139 813 | 165 911 | 165 911 | 206 923 | 206 923 | 233 022 | 233 022 | 253 527
2 000 000 | 153 965 | 180 428 | 180 428 | 214 108 | 214 108 | 267 034 | 267 034 | 300 714 | 300 714 | 327 177
3 000 000 | 220 161 | 258 002 | 258 002 | 306 162 | 306 162 | 381 843 | 381 843 | 430 003 | 430 003 | 467 843
5 000 000 | 343 879 | 402 984 | 402 984 | 478 207 | 478 207 | 596 416 | 596 416 | 671 640 | 671 640 | 730 744
7 500 000 | 493 923 | 578 816 | 578 816 | 686 862 | 686 862 | 856 648 | 856 648 | 964 694 | 964 694 | 1 049 587
10 000 000 | 638 277 | 747 981 | 747 981 | 887 604 | 887 604 | 1 107 012 | 1 107 012 | 1 246 635 | 1 246 635 | 1 356 339
15 000 000 | 915 129 | 1 072 416 | 1 072 416 | 1 272 601 | 1 272 601 | 1 587 176 | 1 587 176 | 1 787 360 | 1 787 360 | 1 944 648
20 000 000 | 1 180 414 | 1 383 298 | 1 383 298 | 1 641 513 | 1 641 513 | 2 047 281 | 2 047 281 | 2 305 496 | 2 305 496 | 2 508 380
25 000 000 | 1 436 874 | 1 683 837 | 1 683 837 | 1 998 153 | 1 998 153 | 2 492 079 | 2 492 079 | 2 806 395 | 2 806 395 | 3 053 358
`,
);
