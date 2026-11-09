// SPDX-License-Identifier: AGPL-3.0-or-later
// Dezimalarithmetik ohne Gleitkomma (Regel N1, ADR 0003). Eigene Implementierung auf BigInt: Ein Wert ist eine
// ganze Zahl mit Skala („Ganzzahl durch 10^Skala“). `number` kommt nur für Skalen und Stellenzahlen vor, nie für Werte.
//
// Darstellung nach dem Vertrag in `vertrag/zahlen.ts`: kanonische Zeichenkette in Punktnotation, Skala nach Typ.

import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Betrag, Dezimal, Einheitspreis, Ergebnis, Menge, Prozent, Zahlenart } from '@tethys/vertrag';

// --- Fehler ----------------------------------------------------------------------------------------------------

export type Dezimalfehlercode =
  | 'leer'
  | 'ungueltiges-format'
  | 'zu-lang'
  | 'falsche-nachkommastellen' // kanonischer Wert hat nicht die Skala des Typs
  | 'zu-viele-nachkommastellen'; // de-DE-Eingabe hat mehr Stellen als die Skala (kein stilles Runden)

export interface Dezimalfehler {
  readonly code: Dezimalfehlercode;
  /** Meldung für Entwickler und Protokoll; die deutsche Anzeige entsteht in der Oberfläche. */
  readonly meldung: string;
}

/** Der Typ zu einem Zahlenart-Namen: `Zahl<'betrag'>` ist `Betrag`. */
export interface ZahlenTypen {
  readonly menge: Menge;
  readonly einheitspreis: Einheitspreis;
  readonly prozent: Prozent;
  readonly betrag: Betrag;
}
export type Zahl<Z extends Zahlenart> = ZahlenTypen[Z];

export function fehler(
  code: Dezimalfehlercode,
  meldung: string,
): { readonly ok: false; readonly fehler: Dezimalfehler } {
  return { ok: false, fehler: { code, meldung } };
}

// --- Ganzzahldarstellung (intern) -------------------------------------------------------------------------------

/** Wert = `ganz` / 10^`skala`. */
export interface Skaliert {
  readonly ganz: bigint;
  readonly skala: number;
}

/** Obergrenze der Eingabelänge: schützt vor absichtlich riesigen Zeichenketten. */
export const MAX_ZEICHEN = 1000;

const KANONISCH = /^(-?)(0|[1-9][0-9]*)\.([0-9]+)$/;

const potenz = (n: number): bigint => 10n ** BigInt(n);

/** Zerlegt einen kanonischen Text; `null`, wenn er nicht kanonisch ist (auch „-0.00“). */
function zerlegeKanonisch(text: string): Skaliert | null {
  const m = KANONISCH.exec(text);
  if (!m) return null;
  const [, vorzeichen = '', ganz = '', nach = ''] = m;
  const betrag = BigInt(ganz + nach);
  if (vorzeichen === '-' && betrag === 0n) return null;
  return { ganz: vorzeichen === '-' ? -betrag : betrag, skala: nach.length };
}

/**
 * Liest einen Wert, dessen Typ Gültigkeit zusichert. Ein Verstoß ist ein Programmfehler (Cast an der
 * Typprüfung vorbei) und löst eine Ausnahme aus, nie ein stilles Weiterrechnen.
 */
export function lies(wert: string): Skaliert {
  const z = zerlegeKanonisch(wert);
  if (z === null) throw new TypeError(`Kein kanonischer Dezimalwert: ${JSON.stringify(wert)}`);
  return z;
}

/** Baut die kanonische Zeichenkette. Skala muss mindestens 1 sein (der Vertrag verlangt einen Dezimalpunkt). */
export function baue(ganz: bigint, skala: number): Dezimal {
  if (!Number.isInteger(skala) || skala < 1)
    throw new RangeError(`Skala muss eine ganze Zahl >= 1 sein: ${String(skala)}`);
  const negativ = ganz < 0n;
  const ziffern = (negativ ? -ganz : ganz).toString().padStart(skala + 1, '0');
  const kopf = ziffern.slice(0, ziffern.length - skala);
  const nach = ziffern.slice(ziffern.length - skala);
  return `${negativ ? '-' : ''}${kopf}.${nach}` as Dezimal;
}

/**
 * Kaufmännisch runden (half-up auf den Betrag, Vorzeichen danach wieder setzen) von Skala `von` auf `nach`.
 * Weniger Stellen als vorhanden: auffüllen, exakt.
 */
export function rundeGanz(ganz: bigint, von: number, nach: number): bigint {
  if (von <= nach) return ganz * potenz(nach - von);
  const teiler = potenz(von - nach); // gerade, da von - nach >= 1
  const negativ = ganz < 0n;
  const betrag = negativ ? -ganz : ganz;
  const gerundet = (betrag + teiler / 2n) / teiler;
  return negativ ? -gerundet : gerundet;
}

function angleichen(a: Skaliert, b: Skaliert): [bigint, bigint, number] {
  const skala = Math.max(a.skala, b.skala);
  return [a.ganz * potenz(skala - a.skala), b.ganz * potenz(skala - b.skala), skala];
}

// --- Konstruktoren aus kanonischen Zeichenketten ---------------------------------------------------------------

/** Prüft eine kanonische Zeichenkette beliebiger Skala (Zwischenwerte). */
export function alsDezimal(text: string): Ergebnis<Dezimal, Dezimalfehler> {
  if (text === '') return fehler('leer', 'Leere Zeichenkette ist kein Dezimalwert.');
  if (text.length > MAX_ZEICHEN) return fehler('zu-lang', `Mehr als ${String(MAX_ZEICHEN)} Zeichen.`);
  if (zerlegeKanonisch(text) === null) {
    return fehler(
      'ungueltiges-format',
      `Kein kanonischer Dezimalwert (Punktnotation, kein "-0.00"): ${JSON.stringify(text)}`,
    );
  }
  return { ok: true, wert: text as Dezimal };
}

/** Prüft eine kanonische Zeichenkette gegen Format und Skala der Zahlenart (Skala aus `NACHKOMMASTELLEN`). */
export function alsZahl<Z extends Zahlenart>(art: Z, text: string): Ergebnis<Zahl<Z>, Dezimalfehler> {
  const e = alsDezimal(text);
  if (!e.ok) return e;
  const soll = NACHKOMMASTELLEN[art];
  const ist = lies(text).skala;
  if (ist !== soll) {
    return fehler(
      'falsche-nachkommastellen',
      `${art} hat ${String(soll)} Nachkommastellen, nicht ${String(ist)}: ${text}`,
    );
  }
  return { ok: true, wert: text as Zahl<Z> };
}

export const alsMenge = (text: string): Ergebnis<Menge, Dezimalfehler> => alsZahl('menge', text);
export const alsEinheitspreis = (text: string): Ergebnis<Einheitspreis, Dezimalfehler> =>
  alsZahl('einheitspreis', text);
export const alsBetrag = (text: string): Ergebnis<Betrag, Dezimalfehler> => alsZahl('betrag', text);
export const alsProzent = (text: string): Ergebnis<Prozent, Dezimalfehler> => alsZahl('prozent', text);

/** Null jeder Zahlenart mit allen Nachkommastellen. */
export const NULL_MENGE = baue(0n, NACHKOMMASTELLEN.menge) as Menge;
export const NULL_EINHEITSPREIS = baue(0n, NACHKOMMASTELLEN.einheitspreis) as Einheitspreis;
export const NULL_BETRAG = baue(0n, NACHKOMMASTELLEN.betrag) as Betrag;
export const NULL_PROZENT = baue(0n, NACHKOMMASTELLEN.prozent) as Prozent;

// --- Rechnen ---------------------------------------------------------------------------------------------------

/**
 * Summe zweier Werte. Gleiche Typen haben gleiche Skala; bei verschiedenen Skalen (unbenannte Zwischenwerte)
 * gilt die größere. Das Ergebnis behält den Typ der Eingaben.
 */
export function addiere<Z extends Dezimal>(a: Z, b: Z): Z {
  const [x, y, skala] = angleichen(lies(a), lies(b));
  return baue(x + y, skala) as Z;
}

/** Differenz `a - b`; Skalenregel wie bei {@link addiere}. */
export function subtrahiere<Z extends Dezimal>(a: Z, b: Z): Z {
  const [x, y, skala] = angleichen(lies(a), lies(b));
  return baue(x - y, skala) as Z;
}

/** Vorzeichenwechsel; Null bleibt Null (nie „-0“). */
export function negiere<Z extends Dezimal>(a: Z): Z {
  const w = lies(a);
  return baue(-w.ganz, w.skala) as Z;
}

/** −1, 0 oder 1. */
export function vergleiche(a: Dezimal, b: Dezimal): -1 | 0 | 1 {
  const [x, y] = angleichen(lies(a), lies(b));
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Vorzeichen: −1, 0 oder 1. */
export function vorzeichen(a: Dezimal): -1 | 0 | 1 {
  const { ganz } = lies(a);
  return ganz < 0n ? -1 : ganz > 0n ? 1 : 0;
}

/** Summe beliebig vieler Beträge; leere Liste ergibt `NULL_BETRAG`. Reihenfolge unerheblich. */
export function summiereBetraege(werte: readonly Betrag[]): Betrag {
  let summe = 0n;
  for (const w of werte) {
    const z = lies(w);
    summe += rundeGanz(z.ganz, z.skala, NACHKOMMASTELLEN.betrag);
  }
  return baue(summe, NACHKOMMASTELLEN.betrag) as Betrag;
}

/** Exaktes Produkt; die Skalen addieren sich (Zwischenwert, wird nie gespeichert). */
export function multipliziere(a: Dezimal, b: Dezimal): Dezimal {
  const x = lies(a);
  const y = lies(b);
  return baue(x.ganz * y.ganz, x.skala + y.skala);
}

/** Rundet kaufmännisch auf die Skala der Zahlenart (Skala aus `NACHKOMMASTELLEN`). */
export function runden<Z extends Zahlenart>(wert: Dezimal, art: Z): Zahl<Z> {
  const w = lies(wert);
  const skala = NACHKOMMASTELLEN[art];
  return baue(rundeGanz(w.ganz, w.skala, skala), skala) as Zahl<Z>;
}

/**
 * Rundet kaufmännisch auf `stellen` Nachkommastellen (ganze Zahl >= 1, sonst `RangeError`: Programmfehler).
 * Eine Rundung auf 0 Stellen hat keine kanonische Darstellung, dafür gibt es {@link rundeAufGanzzahl}.
 */
export function rundeAufStellen(wert: Dezimal, stellen: number): Dezimal {
  if (!Number.isInteger(stellen) || stellen < 1)
    throw new RangeError(`Stellenzahl muss eine ganze Zahl >= 1 sein: ${String(stellen)}`);
  const w = lies(wert);
  return baue(rundeGanz(w.ganz, w.skala, stellen), stellen);
}

/** Rundet kaufmännisch auf eine ganze Zahl (0 Nachkommastellen). */
export function rundeAufGanzzahl(wert: Dezimal): bigint {
  const w = lies(wert);
  return rundeGanz(w.ganz, w.skala, 0);
}

// --- Fachrechnung ----------------------------------------------------------------------------------------------

/** GP = round(Menge × EP, 2) (N2). */
export function gesamtpreis(menge: Menge, einheitspreis: Einheitspreis): Betrag {
  const m = lies(menge);
  const e = lies(einheitspreis);
  const skala = NACHKOMMASTELLEN.betrag;
  return baue(rundeGanz(m.ganz * e.ganz, m.skala + e.skala, skala), skala) as Betrag;
}

/** Zwei Nachkommastellen entsprechen dem Teilen durch 100 („Prozent“). */
const PROZENT_STELLEN = 2;

/** round(Betrag × Prozent / 100, 2): Nachlass und MwSt (N2). Negative Beträge nach der DIN-1333-Regel. */
export function prozentVon(betrag: Betrag, prozent: Prozent): Betrag {
  const b = lies(betrag);
  const p = lies(prozent);
  const skala = NACHKOMMASTELLEN.betrag;
  return baue(rundeGanz(b.ganz * p.ganz, b.skala + p.skala + PROZENT_STELLEN, skala), skala) as Betrag;
}
