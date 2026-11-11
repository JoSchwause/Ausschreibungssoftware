// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenansatz rechnen (Ticket 35): Ansatzzeilen → Zeilenergebnisse und Summe. Rein (A2), nur Dezimalwerte (N1);
// `number` nur für Zeilennummer, Formelnummer und Spalte.

import { NULL_MENGE, addiere, dividiere, multipliziere, negiere, runden, subtrahiere } from '@tethys/dezimal';
import type { Ansatzzeile, Dezimal, Ergebnis, Menge } from '@tethys/vertrag';
import { FREIER_RECHENANSATZ, ZWISCHENSTELLEN } from './annahmen';
import { ausdruckLesen } from './ausdruck';
import type { Ausdruck } from './ausdruck';
import { formelfehler } from './fehler';
import type { Formelfehler } from './fehler';

// --- Schnittstelle ---------------------------------------------------------------------------------------------

// v1.3: mechanisch angepasst, Folgeticket (Vertrag v1.3, D-22: `Ansatzzeile` liegt jetzt in `vertrag`)
/** Eine Zeile eines Mengenansatzes (Typ aus `vertrag`, v1.3). Hier weiter exportiert, damit Aufrufer unverändert bleiben. */
export type { Ansatzzeile };

/** Ergebnis einer Ansatzzeile: genau eins von `menge` und `fehler` ist gesetzt. */
export interface Zeilenergebnis {
  readonly zeile: number;
  readonly menge: Menge | null;
  readonly fehler: Formelfehler | null;
}

export interface Mengenansatzergebnis {
  readonly zeilen: readonly Zeilenergebnis[];
  /** Summe der gerundeten Zeilenergebnisse; `null`, sobald eine Zeile einen Fehler hat. */
  readonly summe: Menge | null;
}

/** Eine REB-Formel: Anzahl der Parameter und reine Rechenfunktion über die Parameterwerte. */
export interface Formel {
  readonly parameter: number;
  readonly rechne: (werte: readonly Dezimal[]) => Dezimal;
}

/**
 * Umgesetzte REB-Formeln nach Nummer. Nur 91, der freie Rechenansatz (`MENGEN_ANNAHMEN.formel91`): ein Parameter,
 * der Wert des Ausdrucks. Weitere Nummern kommen in eigenen Tickets mit Herkunftsvermerk dazu; wie ein Ausdruck
 * mehrere Parameter trennt, entscheidet das erste Ticket mit einer solchen Formel.
 */
export const FORMELN: ReadonlyMap<number, Formel> = new Map<number, Formel>([
  [FREIER_RECHENANSATZ, { parameter: 1, rechne: (werte) => werte[0] ?? NULL_MENGE }],
]);

// --- Rechnen ---------------------------------------------------------------------------------------------------

type Aufloesen = (knoten: Extract<Ausdruck, { art: 'bezug' | 'name' }>) => Ergebnis<Dezimal, Formelfehler>;

function wertVon(a: Ausdruck, aufloesen: Aufloesen): Ergebnis<Dezimal, Formelfehler> {
  switch (a.art) {
    case 'zahl':
      return { ok: true, wert: a.wert };
    case 'bezug':
    case 'name':
      return aufloesen(a);
    case 'vorzeichen': {
      const w = wertVon(a.operand, aufloesen);
      if (!w.ok || a.zeichen === '+') return w;
      return { ok: true, wert: negiere(w.wert) };
    }
    case 'rechnung': {
      const l = wertVon(a.links, aufloesen);
      if (!l.ok) return l;
      const r = wertVon(a.rechts, aufloesen);
      if (!r.ok) return r;
      switch (a.operator) {
        case '+':
          return { ok: true, wert: addiere(l.wert, r.wert) };
        case '-':
          return { ok: true, wert: subtrahiere(l.wert, r.wert) };
        case '*':
          return { ok: true, wert: multipliziere(l.wert, r.wert) };
        case '/': {
          const q = dividiere(l.wert, r.wert, ZWISCHENSTELLEN);
          return q.ok
            ? q
            : { ok: false, fehler: formelfehler('division-durch-null', q.fehler.meldung, a.spalte) };
        }
      }
    }
  }
}

const NAME = /^\p{L}[\p{L}0-9_]*$/u;
const KEIN_NAME = /^Z[0-9]+$/;

/** Ein zulässiger Variablenname (`MENGEN_ANNAHMEN.variable`). */
function nameGueltig(name: string): boolean {
  return NAME.test(name) && !KEIN_NAME.test(name);
}

/** Bisher berechnete Zeile oder Variable: gerundetes Ergebnis, `null` bei Fehler. */
type Bekannt = ReadonlyMap<string | number, Menge | null>;

function zeileRechnen(
  z: Ansatzzeile,
  aufloesen: Aufloesen,
):
  { readonly menge: Menge; readonly fehler: null } | { readonly menge: null; readonly fehler: Formelfehler } {
  const formel = FORMELN.get(z.formel);
  if (formel === undefined) {
    return {
      menge: null,
      fehler: formelfehler('formel-unbekannt', `REB-Formel ${String(z.formel)} ist nicht umgesetzt`, null),
    };
  }
  const baum = ausdruckLesen(z.ausdruck);
  if (!baum.ok) return { menge: null, fehler: baum.fehler };
  const w = wertVon(baum.wert, aufloesen);
  if (!w.ok) return { menge: null, fehler: w.fehler };
  return { menge: runden(formel.rechne([w.wert]), 'menge'), fehler: null };
}

/**
 * Rechnet einen Mengenansatz: jede Zeile für sich (Fehler als Wert, nie eine Ausnahme), Bezüge nur auf frühere
 * Zeilen, Summe der gerundeten Zeilenergebnisse oder `null`, sobald eine Zeile fehlerhaft ist.
 */
export function mengenansatzBerechnen(zeilen: readonly Ansatzzeile[]): Mengenansatzergebnis {
  const alleZeilen = new Set(zeilen.map((z) => z.zeile));
  const alleNamen = new Set(zeilen.map((z) => z.variable));
  const zeilenwerte = new Map<number, Menge | null>();
  const variablen = new Map<string, Menge | null>();
  const ergebnisse: Zeilenergebnis[] = [];

  const nachschlagen = (
    bekannt: Bekannt,
    schluessel: string | number,
    spaeter: boolean,
    text: string,
    spalte: number,
  ): Ergebnis<Dezimal, Formelfehler> => {
    if (bekannt.has(schluessel)) {
      const m = bekannt.get(schluessel) ?? null;
      return m === null
        ? { ok: false, fehler: formelfehler('bezug-fehlerhaft', `${text} hat einen Fehler`, spalte) }
        : { ok: true, wert: m };
    }
    return spaeter
      ? { ok: false, fehler: formelfehler('bezug-vorwaerts', `${text} steht nicht vor dieser Zeile`, spalte) }
      : { ok: false, fehler: formelfehler('bezug-unbekannt', `${text} gibt es nicht`, spalte) };
  };

  const aufloesen: Aufloesen = (k) =>
    k.art === 'bezug'
      ? nachschlagen(zeilenwerte, k.zeile, alleZeilen.has(k.zeile), `Zeile ${String(k.zeile)}`, k.spalte)
      : nachschlagen(variablen, k.name, alleNamen.has(k.name), `Variable ${k.name}`, k.spalte);

  for (const z of zeilen) {
    let e: Zeilenergebnis;
    const doppelteZeile = zeilenwerte.has(z.zeile);
    const name = z.variable;
    if (doppelteZeile) {
      e = {
        zeile: z.zeile,
        menge: null,
        fehler: formelfehler('zeile-doppelt', `Zeile ${String(z.zeile)} gibt es schon`, null),
      };
    } else if (name !== null && !nameGueltig(name)) {
      e = {
        zeile: z.zeile,
        menge: null,
        fehler: formelfehler(
          'variable-ungueltig',
          `Kein zulässiger Variablenname: ${JSON.stringify(name)}`,
          null,
        ),
      };
    } else if (name !== null && variablen.has(name)) {
      e = {
        zeile: z.zeile,
        menge: null,
        fehler: formelfehler('variable-doppelt', `Variable ${name} gibt es schon`, null),
      };
    } else {
      e = { zeile: z.zeile, ...zeileRechnen(z, aufloesen) };
    }
    ergebnisse.push(e);
    if (!doppelteZeile) zeilenwerte.set(z.zeile, e.menge);
    if (name !== null && nameGueltig(name) && !variablen.has(name)) variablen.set(name, e.menge);
  }

  let summe: Menge | null = NULL_MENGE;
  for (const e of ergebnisse) summe = summe === null || e.menge === null ? null : addiere(summe, e.menge);
  return { zeilen: ergebnisse, summe };
}
