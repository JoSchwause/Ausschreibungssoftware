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
const ZONEN_I_BIS_III: readonly Honorarzone[] = ['I', 'II', 'III'];

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

/**
 * § 52 Abs. 1 HOAI: Honorartafel für Grundleistungen bei Tragwerksplanungen (Honorarzonen I bis V).
 * https://www.gesetze-im-internet.de/hoai_2013/__52.html, abgerufen am 2026-11-12.
 * Spalten: anrechenbare Kosten | I von | I bis | II von | II bis | III von | III bis | IV von | IV bis | V von | V bis.
 */
export const TAFEL_52 = tafelLesen(
  quelle(52, 1),
  ZONEN_I_BIS_V,
  `
10 000 | 1 461 | 1 624 | 1 624 | 2 064 | 2 064 | 2 575 | 2 575 | 3 015 | 3 015 | 3 178
15 000 | 2 011 | 2 234 | 2 234 | 2 841 | 2 841 | 3 543 | 3 543 | 4 149 | 4 149 | 4 373
25 000 | 3 006 | 3 340 | 3 340 | 4 247 | 4 247 | 5 296 | 5 296 | 6 203 | 6 203 | 6 537
50 000 | 5 187 | 5 763 | 5 763 | 7 327 | 7 327 | 9 139 | 9 139 | 10 703 | 10 703 | 11 279
75 000 | 7 135 | 7 928 | 7 928 | 10 080 | 10 080 | 12 572 | 12 572 | 14 724 | 14 724 | 15 517
100 000 | 8 946 | 9 940 | 9 940 | 12 639 | 12 639 | 15 763 | 15 763 | 18 461 | 18 461 | 19 455
150 000 | 12 303 | 13 670 | 13 670 | 17 380 | 17 380 | 21 677 | 21 677 | 25 387 | 25 387 | 26 754
250 000 | 18 370 | 20 411 | 20 411 | 25 951 | 25 951 | 32 365 | 32 365 | 37 906 | 37 906 | 39 947
350 000 | 23 909 | 26 565 | 26 565 | 33 776 | 33 776 | 42 125 | 42 125 | 49 335 | 49 335 | 51 992
500 000 | 31 594 | 35 105 | 35 105 | 44 633 | 44 633 | 55 666 | 55 666 | 65 194 | 65 194 | 68 705
750 000 | 43 463 | 48 293 | 48 293 | 61 401 | 61 401 | 76 578 | 76 578 | 89 686 | 89 686 | 94 515
1 000 000 | 54 495 | 60 550 | 60 550 | 76 984 | 76 984 | 96 014 | 96 014 | 112 449 | 112 449 | 118 504
1 250 000 | 64 940 | 72 155 | 72 155 | 91 740 | 91 740 | 114 418 | 114 418 | 134 003 | 134 003 | 141 218
1 500 000 | 74 938 | 83 265 | 83 265 | 105 865 | 105 865 | 132 034 | 132 034 | 154 635 | 154 635 | 162 961
2 000 000 | 93 923 | 104 358 | 104 358 | 132 684 | 132 684 | 165 483 | 165 483 | 193 808 | 193 808 | 204 244
3 000 000 | 129 059 | 143 398 | 143 398 | 182 321 | 182 321 | 227 389 | 227 389 | 266 311 | 266 311 | 280 651
5 000 000 | 192 384 | 213 760 | 213 760 | 271 781 | 271 781 | 338 962 | 338 962 | 396 983 | 396 983 | 418 359
7 500 000 | 264 487 | 293 874 | 293 874 | 373 640 | 373 640 | 466 001 | 466 001 | 545 767 | 545 767 | 575 154
10 000 000 | 331 398 | 368 220 | 368 220 | 468 166 | 468 166 | 583 892 | 583 892 | 683 838 | 683 838 | 720 660
15 000 000 | 455 117 | 505 686 | 505 686 | 642 943 | 642 943 | 801 873 | 801 873 | 939 131 | 939 131 | 989 699
`,
);

/**
 * § 56 Abs. 1 HOAI: Honorartafel für Grundleistungen der Technischen Ausrüstung (nur Honorarzonen I bis III).
 * https://www.gesetze-im-internet.de/hoai_2013/__56.html, abgerufen am 2026-11-12.
 * Spalten: anrechenbare Kosten | I von | I bis | II von | II bis | III von | III bis.
 */
export const TAFEL_56 = tafelLesen(
  quelle(56, 1),
  ZONEN_I_BIS_III,
  `
5 000 | 2 132 | 2 547 | 2 547 | 2 990 | 2 990 | 3 405
10 000 | 3 689 | 4 408 | 4 408 | 5 174 | 5 174 | 5 893
15 000 | 5 084 | 6 075 | 6 075 | 7 131 | 7 131 | 8 122
25 000 | 7 615 | 9 098 | 9 098 | 10 681 | 10 681 | 12 164
35 000 | 9 934 | 11 869 | 11 869 | 13 934 | 13 934 | 15 869
50 000 | 13 165 | 15 729 | 15 729 | 18 465 | 18 465 | 21 029
75 000 | 18 122 | 21 652 | 21 652 | 25 418 | 25 418 | 28 948
100 000 | 22 723 | 27 150 | 27 150 | 31 872 | 31 872 | 36 299
150 000 | 31 228 | 37 311 | 37 311 | 43 800 | 43 800 | 49 883
250 000 | 46 640 | 55 726 | 55 726 | 65 418 | 65 418 | 74 504
500 000 | 80 684 | 96 402 | 96 402 | 113 168 | 113 168 | 128 886
750 000 | 111 105 | 132 749 | 132 749 | 155 836 | 155 836 | 177 480
1 000 000 | 139 347 | 166 493 | 166 493 | 195 448 | 195 448 | 222 594
1 250 000 | 166 043 | 198 389 | 198 389 | 232 891 | 232 891 | 265 237
1 500 000 | 191 545 | 228 859 | 228 859 | 268 660 | 268 660 | 305 974
2 000 000 | 239 792 | 286 504 | 286 504 | 336 331 | 336 331 | 383 044
2 500 000 | 285 649 | 341 295 | 341 295 | 400 650 | 400 650 | 456 296
3 000 000 | 329 420 | 393 593 | 393 593 | 462 044 | 462 044 | 526 217
3 500 000 | 371 491 | 443 859 | 443 859 | 521 052 | 521 052 | 593 420
4 000 000 | 412 126 | 492 410 | 492 410 | 578 046 | 578 046 | 658 331
`,
);
