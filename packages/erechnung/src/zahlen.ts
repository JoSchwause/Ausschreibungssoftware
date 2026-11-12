// SPDX-License-Identifier: AGPL-3.0-or-later
// Zahlen und Daten aus der Datei lesen (Rand, N4). Gerechnet, gerundet und verglichen wird nur mit `dezimal` (N1);
// hier wird nur die lexikalische Form von `xsd:decimal` in die kanonische Punktnotation des Vertrags gebracht.

import { alsDezimal, runden, vergleiche } from '@tethys/dezimal';
import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Betrag, Dezimal, Zahlenart } from '@tethys/vertrag';

/** Lexikalische Form von `xsd:decimal` (nach Entfernen von Leerraum außen): kein Exponent, kein Komma. */
const XSD_DECIMAL = /^([+-]?)([0-9]*)(?:\.([0-9]*))?$/;

/** Exakter Wert und Zahl der Nachkommastellen, wie sie in der Datei stehen; `null`, wenn der Text keine Zahl ist. */
export function dezimalLesen(text: string): { readonly exakt: Dezimal; readonly stellen: number } | null {
  const m = XSD_DECIMAL.exec(text.trim());
  if (!m) return null;
  const [, vorzeichen = '', ganzRoh = '', nach = ''] = m;
  if (ganzRoh === '' && nach === '') return null;
  const ganz = ganzRoh.replace(/^0+(?=[0-9])/, '') || '0';
  const null_ = !/[1-9]/.test(ganz + nach);
  const e = alsDezimal(`${vorzeichen === '-' && !null_ ? '-' : ''}${ganz}.${nach === '' ? '0' : nach}`);
  return e.ok ? { exakt: e.wert, stellen: nach.length } : null;
}

/**
 * Betrag: kaufmännisch auf 2 Stellen gerundet (Ticket 76, Abschnitt 3). `nichtKanonisch` heißt: Die Datei hatte mehr
 * als 2 Nachkommastellen (EN 16931 erlaubt höchstens 2); der Aufrufer meldet `betrag-nicht-kanonisch`.
 */
export function betragLesen(
  text: string,
): { readonly wert: Betrag; readonly nichtKanonisch: boolean } | null {
  const d = dezimalLesen(text);
  if (d === null) return null;
  return { wert: runden(d.exakt, 'betrag'), nichtKanonisch: d.stellen > NACHKOMMASTELLEN.betrag };
}

/**
 * Menge, Preis oder Satz: Passt der Wert verlustfrei in die Skala der Zahlenart, kommt er mit genau dieser Skala
 * zurück (`passt`), sonst exakt (nie still gekürzt, Q5).
 */
export function vertragszahlLesen(
  art: Zahlenart,
  text: string,
): { readonly wert: Dezimal; readonly passt: boolean } | null {
  const d = dezimalLesen(text);
  if (d === null) return null;
  const gerundet = runden(d.exakt, art);
  return vergleiche(gerundet, d.exakt) === 0
    ? { wert: gerundet, passt: true }
    : { wert: d.exakt, passt: false };
}

const TAGE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/**
 * Prüft ein Kalenderdatum ohne `Date` (A2) und liefert es als `JJJJ-MM-TT`. Dieselbe Regel steht in `abrechnung`
 * (`datumFehler` in `form.ts`); Fachpakete importieren einander nicht (A3), darum bleibt sie doppelt (Review Welle 5, S4).
 */
function kalenderdatum(jahr: string, monat: string, tag: string): string | null {
  const j = Number.parseInt(jahr, 10);
  const m = Number.parseInt(monat, 10);
  const t = Number.parseInt(tag, 10);
  if (j < 1 || m < 1 || m > 12 || t < 1) return null;
  const schalt = (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
  const max = m === 2 && schalt ? 29 : (TAGE[m - 1] ?? 0);
  return t <= max ? `${jahr}-${monat}-${tag}` : null;
}

/** UBL `xsd:date` ohne Zeitzone, wie XRechnung ihn verlangt: `JJJJ-MM-TT`. */
export function datumUblLesen(text: string): string | null {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(text.trim());
  return m ? kalenderdatum(m[1] ?? '', m[2] ?? '', m[3] ?? '') : null;
}

/** CII `udt:DateTimeString` im Format `102` (`JJJJMMTT`); andere Formate sind in XRechnung nicht zulässig. */
export function datumCiiLesen(text: string, format: string | undefined): string | null {
  if (format !== '102') return null;
  const m = /^([0-9]{4})([0-9]{2})([0-9]{2})$/.exec(text.trim());
  return m ? kalenderdatum(m[1] ?? '', m[2] ?? '', m[3] ?? '') : null;
}
