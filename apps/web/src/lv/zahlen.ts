// SPDX-License-Identifier: AGPL-3.0-or-later
// Zahlenränder des Grids und der Summenzeile (N4): de-DE-Text ↔ Dezimalwert, nur über `@tethys/dezimal`.

import {
  formatiereBetragDe,
  formatiereEinheitspreisDe,
  formatiereMengeDe,
  formatiereProzentDe,
  parseDe,
  type Dezimalfehler,
  type Zahl,
} from '@tethys/dezimal';
import type { Ergebnis, GridZahlen, Zahlenart } from '@tethys/vertrag';
import { texte } from './texte';

/** Deutsche Meldung zu einem Parserfehler; `art` nennt, was erwartet wird. */
export function zahlFehlerText(art: Zahlenart, f: Dezimalfehler): string {
  const t = texte.zahlen;
  switch (f.code) {
    case 'zu-viele-nachkommastellen':
      return t.zuVieleStellen[art];
    case 'zu-lang':
      return t.zuLang;
    default:
      return t.ungueltig[art];
  }
}

/** Parst de-DE-Text zur Zahlenart; der Fehler ist eine deutsche Meldung. */
export function zahlLesen<Z extends Zahlenart>(art: Z, text: string): Ergebnis<Zahl<Z>, string> {
  const r = parseDe(art, text);
  return r.ok ? r : { ok: false, fehler: zahlFehlerText(art, r.fehler) };
}

export const gridZahlen: GridZahlen = {
  parseMenge: (text) => zahlLesen('menge', text),
  parseEinheitspreis: (text) => zahlLesen('einheitspreis', text),
  formatMenge: formatiereMengeDe,
  formatEinheitspreis: formatiereEinheitspreisDe,
  formatBetrag: formatiereBetragDe,
};

export { formatiereBetragDe, formatiereProzentDe };
