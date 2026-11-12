// SPDX-License-Identifier: AGPL-3.0-or-later
// Gemeinsame Hilfen der beiden Ausführer (Mangel, Bautagebucheintrag). Intern, nicht exportiert.

import type { Befehlsfehler, Befehlsfehlercode } from '@tethys/vertrag';

/** Abgewiesener Befehl: passt zu jedem `Ergebnis<…, Befehlsfehler>`. */
export interface Abweisung {
  readonly ok: false;
  readonly fehler: Befehlsfehler;
}

export function nein(code: Befehlsfehlercode, meldung: string, feld?: string): Abweisung {
  return { ok: false, fehler: feld === undefined ? { code, meldung } : { code, meldung, feld } };
}

/** Ist `x` eine Abweisung statt eines gelesenen Werts? (Gelesene Werte tragen kein Feld `ok`.) */
export function istFehler(x: unknown): x is Abweisung {
  return typeof x === 'object' && x !== null && 'ok' in x;
}

/** Freier Text oder `null`; `''` wird `null` (D-111.4). `undefined`: kein Text und nicht `null` (Formfehler). */
export function textOderNull(wert: unknown): string | null | undefined {
  if (wert === null || wert === '') return null;
  return typeof wert === 'string' ? wert : undefined;
}

/** Eine Kennung ist ein nicht leerer Text (die Form der UUID prüft `speicher`). */
export function istKennung(wert: unknown): boolean {
  return typeof wert === 'string' && wert !== '';
}
