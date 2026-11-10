// SPDX-License-Identifier: AGPL-3.0-or-later
// Toleranter Leser für Dezimalwerte aus Austauschformaten (GAEB u. a.): Punktnotation, aber mit allem, was
// Dateien in der Praxis liefern. Er liest, was sich eindeutig lesen lässt, und meldet jede Abweichung als Hinweis,
// damit der Aufrufer sie als Befund ausgeben kann. Nichts davon geschieht still.

import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Zahlenart } from '@tethys/vertrag';
import { MAX_ZEICHEN, baue, fehler, rundeGanz } from './kern';
import type { Dezimalfehler, Zahl } from './kern';

export type Austauschhinweiscode =
  | 'leerraum-entfernt'
  | 'dezimalkomma' // „12,5“ als 12.5 gelesen (Datei verletzt die Punktnotation)
  | 'plus-entfernt'
  | 'fuehrende-nullen-entfernt'
  | 'vorzeichen-null-entfernt' // „-0.00“
  | 'nachkommastellen-aufgefuellt' // weniger Stellen als die Skala
  | 'nullen-abgeschnitten' // mehr Stellen, aber nur Nullen: verlustfrei
  | 'gerundet'; // mehr Stellen mit Wert ungleich 0: kaufmännisch gerundet, Wert hat sich geändert

export interface Austauschhinweis {
  readonly code: Austauschhinweiscode;
  /** Die Eingabe, so wie sie gelesen wurde. */
  readonly original: string;
}

/** Wie `Ergebnis`, aber der Erfolg trägt zusätzlich die Hinweise (leer, wenn der Wert unverändert kanonisch war). */
export type Austauschergebnis<Z extends Zahlenart> =
  | { readonly ok: true; readonly wert: Zahl<Z>; readonly hinweise: readonly Austauschhinweis[] }
  | { readonly ok: false; readonly fehler: Dezimalfehler };

const PUNKTNOTATION = /^([+-]?)([0-9]*)(?:\.([0-9]*))?$/;

/**
 * Liest einen Austausch-Dezimalwert zur Zahlenart. Unlesbares (`1.2.3`, `1e3`, `1.000,00`, leer) ergibt einen
 * Fehlerwert. Ein einzelnes Komma ohne Punkt gilt als Dezimalkomma und wird gemeldet.
 */
export function leseAustausch<Z extends Zahlenart>(art: Z, eingabe: string): Austauschergebnis<Z> {
  const hinweise: Austauschhinweis[] = [];
  const hinweis = (code: Austauschhinweiscode): void => void hinweise.push({ code, original: eingabe });

  let text = eingabe.trim();
  if (text === '') return fehler('leer', 'Leere Eingabe.');
  if (text.length > MAX_ZEICHEN) return fehler('zu-lang', `Mehr als ${String(MAX_ZEICHEN)} Zeichen.`);
  if (text !== eingabe) hinweis('leerraum-entfernt');

  if (text.includes(',')) {
    if (text.includes('.') || text.indexOf(',') !== text.lastIndexOf(',')) {
      return fehler('ungueltiges-format', `Mehrdeutiges Zahlenformat: ${JSON.stringify(eingabe)}`);
    }
    text = text.replace(',', '.');
    hinweis('dezimalkomma');
  }

  const m = PUNKTNOTATION.exec(text);
  const [, vorzeichen = '', ganzRoh = '', nach = ''] = m ?? [];
  if (!m || (ganzRoh === '' && nach === '')) {
    return fehler('ungueltiges-format', `Kein lesbarer Dezimalwert: ${JSON.stringify(eingabe)}`);
  }
  if (vorzeichen === '+') hinweis('plus-entfernt');
  if (ganzRoh.length > 1 && ganzRoh.startsWith('0')) hinweis('fuehrende-nullen-entfernt');

  const skala = NACHKOMMASTELLEN[art];
  const betrag = BigInt((ganzRoh === '' ? '0' : ganzRoh) + nach);
  if (vorzeichen === '-' && betrag === 0n) hinweis('vorzeichen-null-entfernt');

  if (nach.length < skala) hinweis('nachkommastellen-aufgefuellt');
  else if (nach.length > skala) hinweis(/^0*$/.test(nach.slice(skala)) ? 'nullen-abgeschnitten' : 'gerundet');

  const gerundet = rundeGanz(vorzeichen === '-' ? -betrag : betrag, nach.length, skala);
  return { ok: true, wert: baue(gerundet, skala) as Zahl<Z>, hinweise };
}
