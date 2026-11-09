// SPDX-License-Identifier: AGPL-3.0-or-later
// Reine Logik zwischen Zellentext und Befehl. Kein React, kein DOM. Das Grid rechnet nie (A5, N1): Es reicht
// Text an die eingesteckten Parser und vergleicht Werte höchstens als Zeichenketten auf Gleichheit.

import type { Einheitspreis, LvBefehl, LvSpalte, LvZeile, Menge } from '@tethys/vertrag';
import { ARTTEXT, texte } from './texte';
import type { GridZahlen } from './typen';

/** Spalten, die sich bearbeiten lassen (nur bei den passenden Knotenarten). */
export type BearbeitbareSpalte = 'kurztext' | 'menge' | 'einheit' | 'einheitspreis';

const BEARBEITBAR: ReadonlySet<LvSpalte> = new Set<LvSpalte>([
  'kurztext',
  'menge',
  'einheit',
  'einheitspreis',
]);

/** Spalten, die überhaupt Eingaben annehmen (unabhängig von der Knotenart). */
export function istBearbeitbareSpalte(spalte: LvSpalte): spalte is BearbeitbareSpalte {
  return BEARBEITBAR.has(spalte);
}

export function istBearbeitbar(zeile: LvZeile, spalte: LvSpalte): spalte is BearbeitbareSpalte {
  const art = zeile.knoten.art;
  switch (spalte) {
    case 'kurztext':
      return art === 'los' || art === 'titel' || art === 'position';
    case 'menge':
    case 'einheit':
    case 'einheitspreis':
      return art === 'position';
    default:
      return false;
  }
}

/** Klartext eines Hinweistexts: Textbausteine aneinandergehängt, Bilder als Marke. */
export function hinweisKlartext(zeile: LvZeile): string {
  if (zeile.knoten.art !== 'hinweis') return '';
  return zeile.knoten.text.map((b) => (b.art === 'text' ? b.text : texte.bild)).join(' ');
}

/** Anzeigetext einer Zelle. Derselbe Text steht beim Bearbeiten im Eingabefeld. */
export function anzeigeText(zeile: LvZeile, spalte: LvSpalte, zahlen: GridZahlen): string {
  const k = zeile.knoten;
  switch (spalte) {
    case 'ordnungszahl':
      if (k.art === 'hinweis') return '';
      return (k.ordnungszahl ?? '') + (k.art === 'position' ? (k.ozIndex ?? '') : '');
    case 'positionsart':
      switch (k.art) {
        case 'los':
          return texte.los;
        case 'titel':
          return texte.titel;
        case 'hinweis':
          return texte.hinweis;
        case 'position':
          return k.pauschal ? `${ARTTEXT[k.positionsart]}, ${texte.pauschal}` : ARTTEXT[k.positionsart];
      }
    // eslint-disable-next-line no-fallthrough -- der innere switch ist erschöpfend
    case 'kurztext':
      return k.art === 'hinweis' ? hinweisKlartext(zeile) : k.kurztext;
    case 'menge':
      return k.art === 'position' && k.menge !== null ? zahlen.formatMenge(k.menge) : '';
    case 'einheit':
      return k.art === 'position' ? (k.einheit ?? '') : '';
    case 'einheitspreis':
      return k.art === 'position' && k.einheitspreis !== null
        ? zahlen.formatEinheitspreis(k.einheitspreis)
        : '';
    case 'gesamtpreis':
      return zeile.summe === null ? '' : zahlen.formatBetrag(zeile.summe);
  }
}

export type Eingabeergebnis =
  | { readonly art: 'keine-aenderung' }
  | { readonly art: 'befehl'; readonly befehl: LvBefehl }
  | { readonly art: 'ungueltig'; readonly meldung: string }
  | { readonly art: 'schreibgeschuetzt' };

/**
 * Macht aus dem Text einer bestehenden Zelle genau einen Befehl. Leerer Text leert die Zelle (`null`, bei Kurztext
 * ein leerer Text). Ein unlesbarer Zahlentext ist kein Befehl, sondern ein Hinweis; die Eingabe bleibt sichtbar
 * markiert (U5), das Grid sperrt nichts.
 */
export function befehlAusEingabe(
  zeile: LvZeile,
  spalte: LvSpalte,
  text: string,
  zahlen: GridZahlen,
): Eingabeergebnis {
  if (!istBearbeitbar(zeile, spalte)) return { art: 'schreibgeschuetzt' };
  const k = zeile.knoten;
  if (text === anzeigeText(zeile, spalte, zahlen)) return { art: 'keine-aenderung' };
  const t = text.trim();
  switch (spalte) {
    case 'kurztext':
      if (k.art === 'position' || k.art === 'titel' || k.art === 'los') {
        return { art: 'befehl', befehl: { art: 'KurztextAendern', knotenId: k.id, kurztext: text } };
      }
      return { art: 'schreibgeschuetzt' };
    case 'einheit':
      if (k.art !== 'position') return { art: 'schreibgeschuetzt' };
      if (t === (k.einheit ?? '')) return { art: 'keine-aenderung' };
      return {
        art: 'befehl',
        befehl: { art: 'EinheitAendern', positionId: k.id, einheit: t === '' ? null : t },
      };
    case 'menge': {
      if (k.art !== 'position') return { art: 'schreibgeschuetzt' };
      if (t === '') {
        return k.menge === null
          ? { art: 'keine-aenderung' }
          : { art: 'befehl', befehl: { art: 'MengeAendern', positionId: k.id, menge: null } };
      }
      const r = zahlen.parseMenge(t);
      if (!r.ok) return { art: 'ungueltig', meldung: r.fehler };
      if (r.wert === k.menge) return { art: 'keine-aenderung' };
      return { art: 'befehl', befehl: { art: 'MengeAendern', positionId: k.id, menge: r.wert } };
    }
    case 'einheitspreis': {
      if (k.art !== 'position') return { art: 'schreibgeschuetzt' };
      if (t === '') {
        return k.einheitspreis === null
          ? { art: 'keine-aenderung' }
          : { art: 'befehl', befehl: { art: 'EinheitspreisAendern', positionId: k.id, einheitspreis: null } };
      }
      const r = zahlen.parseEinheitspreis(t);
      if (!r.ok) return { art: 'ungueltig', meldung: r.fehler };
      if (r.wert === k.einheitspreis) return { art: 'keine-aenderung' };
      return {
        art: 'befehl',
        befehl: { art: 'EinheitspreisAendern', positionId: k.id, einheitspreis: r.wert },
      };
    }
    default:
      return { art: 'schreibgeschuetzt' };
  }
}

/** Zahlentext → Wert oder Hinweis; leer ist `null`. Gemeinsam für Einfügen und Eingabe. */
export type Zahlenlesung<T> =
  { readonly ok: true; readonly wert: T | null } | { readonly ok: false; readonly meldung: string };

export function leseMenge(text: string, zahlen: GridZahlen): Zahlenlesung<Menge> {
  const t = text.trim();
  if (t === '') return { ok: true, wert: null };
  const r = zahlen.parseMenge(t);
  return r.ok ? { ok: true, wert: r.wert } : { ok: false, meldung: r.fehler };
}

export function leseEinheitspreis(text: string, zahlen: GridZahlen): Zahlenlesung<Einheitspreis> {
  const t = text.trim();
  if (t === '') return { ok: true, wert: null };
  const r = zahlen.parseEinheitspreis(t);
  return r.ok ? { ok: true, wert: r.wert } : { ok: false, meldung: r.fehler };
}
