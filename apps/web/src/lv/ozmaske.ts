// SPDX-License-Identifier: AGPL-3.0-or-later
// OZ-Maske als Text am Rand (Dialog „LV anlegen“): `NN.NN.NNNN[I]` heißt zwei Gliederungsstufen zu je zwei Ziffern,
// Position vierstellig, ein Indexzeichen. `N` ist eine Ziffer, `A` ein Buchstabe oder eine Ziffer, `.` trennt die
// Stufen, die letzte Gruppe ist die Position, `[I]` am Ende die Indexstelle. Gleiche Schreibweise wie die Fixtures.
// Ob die Maske fachlich zulässig ist (Länge, Stufenzahl), prüft der Kern (`ozMaskePruefen`), nicht dieser Rand.

import type { Ergebnis, OzMaske, OzStelle } from '@tethys/vertrag';

export const STANDARD_MASKE_TEXT = 'NN.NN.NNNN[I]';

const GRUPPE = /^(N+|A+)$/;

function stelle(gruppe: string): OzStelle {
  return { laenge: gruppe.length, zeichen: gruppe.startsWith('N') ? 'numerisch' : 'alphanumerisch' };
}

/** Liest die Maske aus dem Text; der Fehler ist eine deutsche Meldung für das Feld. */
export function ozMaskeLesen(text: string): Ergebnis<OzMaske, string> {
  const t = text.trim().toUpperCase();
  const mitIndex = t.endsWith('[I]');
  const gruppen = (mitIndex ? t.slice(0, -3) : t).split('.');
  if (gruppen.some((g) => !GRUPPE.test(g))) {
    return {
      ok: false,
      fehler: 'Die Maske besteht aus Gruppen von N (Ziffer) oder A (Zeichen), getrennt durch Punkte, z. B. NN.NN.NNNN[I].',
    };
  }
  const position = gruppen.at(-1) ?? '';
  return {
    ok: true,
    wert: {
      gliederung: gruppen.slice(0, -1).map(stelle),
      position: stelle(position),
      index: mitIndex ? { laenge: 1, zeichen: 'alphanumerisch' } : null,
      trennzeichen: '.',
    },
  };
}

/** Die Maske als Text, Umkehrung von `ozMaskeLesen`. */
export function ozMaskeText(maske: OzMaske): string {
  const gruppe = (s: OzStelle): string => (s.zeichen === 'numerisch' ? 'N' : 'A').repeat(s.laenge);
  const teile = [...maske.gliederung, maske.position].map(gruppe).join(maske.trennzeichen ?? '.');
  return maske.index === null ? teile : `${teile}[I]`;
}
