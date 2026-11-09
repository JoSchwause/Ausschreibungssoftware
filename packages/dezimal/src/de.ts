// SPDX-License-Identifier: AGPL-3.0-or-later
// de-DE-Parsen und -Formatieren: nur an den Rändern (N4). Der Kern sieht nur Dezimalwerte.

import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Betrag, Dezimal, Einheitspreis, Ergebnis, Menge, Prozent, Zahlenart } from '@tethys/vertrag';
import { MAX_ZEICHEN, baue, fehler, lies } from './kern';
import type { Dezimalfehler, Zahl } from './kern';

/**
 * Ganzzahlteil: Ziffernfolge oder korrekt gruppiert (`1.072`); Nachkommateil nach dem Komma. Mindestens einer
 * der beiden Teile muss vorhanden sein (`,5` ist 0,5). Ein einzelner Punkt wie in `12.34` ist kein Tausenderpunkt
 * und wird abgelehnt; `1.235` ist eintausendzweihundertfünfunddreißig.
 */
const DE = /^(-)?([0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)?(?:,([0-9]+))?$/;

/**
 * Parst eine deutsche Eingabe zur Zahlenart. Erlaubt: Tausenderpunkte, optionales Dezimalkomma, `-` oder `−`,
 * Leerraum außen, weniger Nachkommastellen als die Skala (werden mit Nullen aufgefüllt). Mehr Stellen als die
 * Skala ergeben einen Fehler: Der Rand rundet nie still.
 */
export function parseDe<Z extends Zahlenart>(art: Z, eingabe: string): Ergebnis<Zahl<Z>, Dezimalfehler> {
  const text = eingabe.trim().replace(/^−/, '-');
  if (text === '') return fehler('leer', 'Leere Eingabe.');
  if (text.length > MAX_ZEICHEN) return fehler('zu-lang', `Mehr als ${String(MAX_ZEICHEN)} Zeichen.`);
  const m = DE.exec(text);
  const [, minus, ganzMitPunkten, nach = ''] = m ?? [];
  if (!m || (ganzMitPunkten === undefined && m[3] === undefined)) {
    return fehler('ungueltiges-format', `Keine gültige Zahl im deutschen Format: ${JSON.stringify(eingabe)}`);
  }
  const skala = NACHKOMMASTELLEN[art];
  if (nach.length > skala) {
    return fehler(
      'zu-viele-nachkommastellen',
      `${art} erlaubt ${String(skala)} Nachkommastellen: ${JSON.stringify(eingabe)}`,
    );
  }
  const ganz = (ganzMitPunkten ?? '').replaceAll('.', '');
  const betrag = BigInt(ganz + nach.padEnd(skala, '0'));
  return { ok: true, wert: baue(minus === '-' ? -betrag : betrag, skala) as Zahl<Z> };
}

/** Deutsche Schreibweise mit Tausenderpunkt und Dezimalkomma; alle Nachkommastellen des Werts bleiben stehen. */
export function formatiereDe(wert: Dezimal): string {
  lies(wert); // Typvertrag prüfen
  const minus = wert.startsWith('-') ? '-' : '';
  const [ganz = '', nach = ''] = wert.slice(minus.length).split('.');
  return `${minus}${ganz.replace(/\B(?=(?:[0-9]{3})+$)/g, '.')},${nach}`;
}

export const parseMengeDe = (eingabe: string): Ergebnis<Menge, Dezimalfehler> => parseDe('menge', eingabe);
export const parseEinheitspreisDe = (eingabe: string): Ergebnis<Einheitspreis, Dezimalfehler> =>
  parseDe('einheitspreis', eingabe);
export const parseBetragDe = (eingabe: string): Ergebnis<Betrag, Dezimalfehler> => parseDe('betrag', eingabe);
export const parseProzentDe = (eingabe: string): Ergebnis<Prozent, Dezimalfehler> =>
  parseDe('prozent', eingabe);

export const formatiereMengeDe = (wert: Menge): string => formatiereDe(wert);
export const formatiereEinheitspreisDe = (wert: Einheitspreis): string => formatiereDe(wert);
export const formatiereBetragDe = (wert: Betrag): string => formatiereDe(wert);
export const formatiereProzentDe = (wert: Prozent): string => formatiereDe(wert);
