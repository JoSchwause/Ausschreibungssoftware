// SPDX-License-Identifier: AGPL-3.0-or-later
// Einheit einer Position ↔ Art einer Bauteilmenge (Ticket 108 Punkt 2, D-53): welche Einheit zu welcher Art passt und wie
// der Wert in SI exakt umgerechnet wird. Eine Einheit, die hier nicht steht, passt zu keiner Art (Befund). Rein (A2).

import { alsDezimal, multipliziere, runden } from '@tethys/dezimal';
import type { Bauteilmenge, Dezimal, Menge } from '@tethys/vertrag';

/** Wie eine Einheit der Position eine Bauteilmenge liest: ihre Art und der Faktor von der SI-Grundeinheit zur Einheit. */
export interface Einheitsregel {
  readonly art: Bauteilmenge['art'];
  /** Wert in der Einheit = SI-Wert × `faktor` (z. B. kg → t: 0,001). */
  readonly faktor: Dezimal;
}

function konstante(text: string): Dezimal {
  const d = alsDezimal(text);
  if (!d.ok) throw new Error(`Konstante ${text}: ${d.fehler.meldung}`);
  return d.wert;
}

const EINS = konstante('1.0');
const TAUSENDSTEL = konstante('0.001');

/**
 * Einheiten der Position (nach Abschneiden von Leerraum am Rand, Groß- und Kleinschreibung zählt) und ihre Art (vorläufige
 * Annahme, D-108.4): m ↔ Länge; m² und m2 ↔ Fläche; m³ und m3 ↔ Volumen; St, Stk, Stck und Stück ↔ Anzahl (dazu die
 * Mengenart `Stueck`); kg und t ↔ Gewicht. Zeit und jede andere Einheit (psch, h, cm …) passen zu nichts.
 */
export const EINHEITSREGELN: Readonly<Record<string, Einheitsregel>> = {
  m: { art: 'laenge', faktor: EINS },
  'm²': { art: 'flaeche', faktor: EINS },
  m2: { art: 'flaeche', faktor: EINS },
  'm³': { art: 'volumen', faktor: EINS },
  m3: { art: 'volumen', faktor: EINS },
  St: { art: 'anzahl', faktor: EINS },
  Stk: { art: 'anzahl', faktor: EINS },
  Stck: { art: 'anzahl', faktor: EINS },
  Stück: { art: 'anzahl', faktor: EINS },
  kg: { art: 'gewicht', faktor: EINS },
  t: { art: 'gewicht', faktor: TAUSENDSTEL },
};

/** Die Regel zur Einheit einer Position oder `null`, wenn die Einheit zu keiner Art passt. */
export function einheitsregel(einheit: string | null): Einheitsregel | null {
  if (einheit === null) return null;
  return Object.hasOwn(EINHEITSREGELN, einheit.trim()) ? (EINHEITSREGELN[einheit.trim()] ?? null) : null;
}

/** Der SI-Wert in der Einheit der Regel, exakt multipliziert und erst dann kaufmännisch auf 3 Stellen (N3). */
export function inEinheit(wert: Menge, regel: Einheitsregel): Menge {
  return runden(multipliziere(wert, regel.faktor), 'menge');
}
