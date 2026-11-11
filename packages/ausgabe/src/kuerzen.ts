// SPDX-License-Identifier: AGPL-3.0-or-later
// Langtext auf die ersten n Zeilen kürzen (Druckprofil „Langtext gekürzt“, Ticket 77). Rein darstellend. Eine Zeile ist ein
// Absatz, ein Listenpunkt oder eine Tabellenzeile; jeder Zeilenumbruch im Absatz zählt mit. Der Schnitt bleibt sichtbar (Q5).

import type { DruckAbsatz, DruckBlock, DruckLauf } from './langtext';

/** Marke am Ende eines gekürzten Langtexts, als eigener Absatz. */
export const KUERZUNGSMARKE = '[…]';

const umbrueche = (a: DruckAbsatz): number =>
  a.laeufe.reduce((n, l) => n + (l.text.match(/\n/g)?.length ?? 0), 0);

interface Ergebnis {
  readonly bloecke: DruckBlock[];
  /** Verbleibende Zeilen. */
  readonly rest: number;
  /** Es blieb Text übrig, der nicht mehr hineinpasste. */
  readonly abgeschnitten: boolean;
}

/** Schneidet einen Absatz nach der `zeilen`-ten Zeile ab (`zeilen` ≥ 1 und kleiner als seine Zeilenzahl). */
function absatzKuerzen(a: DruckAbsatz, zeilen: number): DruckAbsatz {
  const laeufe: DruckLauf[] = [];
  let gesehen = 0; // Zeilenumbrüche bisher
  for (const l of a.laeufe) {
    const behalten: string[] = [];
    let fertig = false;
    for (const [k, teil] of l.text.split('\n').entries()) {
      if (k > 0) gesehen++;
      if (gesehen >= zeilen) {
        fertig = true;
        break;
      }
      behalten.push(teil);
    }
    const text = behalten.join('\n');
    if (text !== '') laeufe.push({ ...l, text });
    if (fertig) break;
  }
  return { art: 'absatz', laeufe };
}

function nimmZeilen(bloecke: readonly DruckBlock[], n: number): Ergebnis {
  const aus: DruckBlock[] = [];
  let rest = n;
  for (const b of bloecke) {
    if (rest <= 0) return { bloecke: aus, rest: 0, abgeschnitten: true };
    switch (b.art) {
      case 'absatz': {
        const zeilen = 1 + umbrueche(b);
        if (zeilen > rest) return { bloecke: [...aus, absatzKuerzen(b, rest)], rest: 0, abgeschnitten: true };
        aus.push(b);
        rest -= zeilen;
        break;
      }
      case 'liste': {
        const punkte: (readonly DruckBlock[])[] = [];
        for (const p of b.punkte) {
          if (rest <= 0) return { bloecke: [...aus, { ...b, punkte }], rest: 0, abgeschnitten: true };
          const r = nimmZeilen(p, rest);
          punkte.push(r.bloecke);
          rest = r.rest;
          if (r.abgeschnitten) return { bloecke: [...aus, { ...b, punkte }], rest: 0, abgeschnitten: true };
        }
        aus.push(b);
        break;
      }
      case 'tabelle': {
        const zeilen = b.zeilen.slice(0, rest);
        const ganz = zeilen.length === b.zeilen.length;
        aus.push(ganz ? b : { ...b, zeilen });
        rest -= zeilen.length;
        if (!ganz) return { bloecke: aus, rest: 0, abgeschnitten: true };
        break;
      }
    }
  }
  return { bloecke: aus, rest, abgeschnitten: false };
}

/**
 * Die ersten `anzahl` Zeilen des Langtexts. Wird etwas weggelassen, steht am Ende `KUERZUNGSMARKE` als eigener Absatz; passt
 * alles hinein, bleibt der Text unverändert.
 */
export function kuerzeBloecke(bloecke: readonly DruckBlock[], anzahl: number): DruckBlock[] {
  const r = nimmZeilen(bloecke, Math.max(0, Math.floor(anzahl)));
  return r.abgeschnitten ? [...r.bloecke, { art: 'absatz', laeufe: [{ text: KUERZUNGSMARKE }] }] : r.bloecke;
}
