// SPDX-License-Identifier: AGPL-3.0-or-later
// Reine Logik zwischen Zellentext und Befehl. Kein React, kein DOM. Das Grid rechnet nie (A5, N1): Es reicht
// Text an die eingesteckten Parser und vergleicht Werte höchstens als Zeichenketten auf Gleichheit.

import type {
  Einheitspreis,
  GridZahlen,
  Kostengruppennummer,
  Langtext,
  LangtextBaustein,
  LangtextInline,
  LvBefehl,
  LvSpalte,
  LvZeile,
  Menge,
  Textfluss,
} from '@tethys/vertrag';
import { artText, texte } from './texte';
import type { KostengruppeLesen } from './typen';

/**
 * Spalten, die sich bearbeiten lassen (nur bei den passenden Knotenarten). Die Spalte „KG“ (Ticket 93) nur, wenn die App
 * eine Lesefunktion hereinreicht (`LvGridProps.kostengruppeLesen`); das prüft das Grid, nicht diese Liste.
 */
export type BearbeitbareSpalte = 'kurztext' | 'menge' | 'einheit' | 'einheitspreis' | 'kostengruppe';

const BEARBEITBAR: ReadonlySet<LvSpalte> = new Set<LvSpalte>([
  'kurztext',
  'menge',
  'einheit',
  'einheitspreis',
  'kostengruppe',
]);

/** Spalten, die überhaupt Eingaben annehmen (unabhängig von der Knotenart). */
export function istBearbeitbareSpalte(spalte: LvSpalte): spalte is BearbeitbareSpalte {
  return BEARBEITBAR.has(spalte);
}

/**
 * Ob eine Spalte Eingaben annimmt, wenn das Grid Eingaben überhaupt annimmt: die Spalte „KG“ nur mit Lesefunktion der App
 * (Ticket 93), die übrigen bearbeitbaren Spalten immer. Die eine Stelle für diese Bedingung (`schreibrechte`, Einfügen).
 */
export function nimmtEingabe(spalte: LvSpalte, kostengruppeLesen: KostengruppeLesen | undefined): boolean {
  return istBearbeitbareSpalte(spalte) && (spalte !== 'kostengruppe' || kostengruppeLesen !== undefined);
}

export function istBearbeitbar(zeile: LvZeile, spalte: LvSpalte): spalte is BearbeitbareSpalte {
  const art = zeile.knoten.art;
  switch (spalte) {
    case 'kurztext':
      return art === 'los' || art === 'titel' || art === 'position';
    case 'menge':
    case 'einheit':
    case 'einheitspreis':
    case 'kostengruppe':
      return art === 'position';
    default:
      return false;
  }
}

/** Mehrfache Leerräume (auch `\n` aus Textläufen vor v1.1b) werden zu einem Leerzeichen. */
const einzeilig = (text: string): string => text.replace(/\s+/g, ' ').trim();

function inlineKlartext(b: LangtextInline): string {
  switch (b.art) {
    case 'text':
      return b.text;
    case 'umbruch':
      return ' ';
    case 'bild':
      return ` ${texte.bild} `;
  }
}

const flussKlartext = (fluss: Textfluss): string => einzeilig(fluss.map(inlineKlartext).join(''));

function bausteinKlartext(b: LangtextBaustein): string {
  switch (b.art) {
    case 'text':
    case 'umbruch':
    case 'bild':
      // Inline-Bausteine ohne Absatz bilden zusammen einen Absatz: direkt aneinander, ohne Trenner.
      return inlineKlartext(b);
    case 'absatz':
      return ` ${b.inhalt.map(inlineKlartext).join('')} `;
    case 'liste':
      return ` ${b.punkte.map((p) => `${texte.listenpunkt}${hinweisKlartext(p)}`).join(' ')} `;
    case 'tabelle':
      return ` ${b.zeilen
        .map((z) => z.zellen.map((c) => hinweisKlartext(c.inhalt)).join(texte.zellentrenner))
        .join(' ')} `;
    case 'ergaenzung': {
      const inhalt = flussKlartext(b.inhalt);
      return ` ${flussKlartext(b.davor)} ${inhalt === '' ? texte.leereErgaenzung : inhalt} ${flussKlartext(b.danach)} `;
    }
  }
}

/**
 * Klartext eines Hinweistexts für die einzeilige Zelle: Textläufe ohne Auszeichnung, Zeilenumbrüche und
 * Absatzgrenzen als Leerzeichen, Listenpunkte mit „• “, Tabellenzellen mit „ | “ (Zeilen durch Leerzeichen getrennt),
 * Textergänzung als davor, Stelle (leer: „…“) und danach, Bild als „[Bild]“. Rein und deterministisch.
 */
export function hinweisKlartext(text: Langtext): string {
  return einzeilig(text.map(bausteinKlartext).join(''));
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
          return artText(k);
      }
    // eslint-disable-next-line no-fallthrough -- der innere switch ist erschöpfend
    case 'kurztext':
      return k.art === 'hinweis' ? hinweisKlartext(k.text) : k.kurztext;
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
    case 'kostengruppe':
      return k.art === 'position' ? (k.kostengruppe ?? '') : '';
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
 * markiert (U5), das Grid sperrt nichts. Die Spalte „KG“ liest `kostengruppeLesen` (die Form prüft die App, Ticket 93);
 * ohne die Funktion ist sie schreibgeschützt.
 */
export function befehlAusEingabe(
  zeile: LvZeile,
  spalte: LvSpalte,
  text: string,
  zahlen: GridZahlen,
  kostengruppeLesen?: KostengruppeLesen,
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
    case 'kostengruppe': {
      if (k.art !== 'position' || kostengruppeLesen === undefined) return { art: 'schreibgeschuetzt' };
      const r = leseKostengruppe(text, kostengruppeLesen);
      if (!r.ok) return { art: 'ungueltig', meldung: r.meldung };
      if (r.wert === (k.kostengruppe ?? null)) return { art: 'keine-aenderung' };
      return { art: 'befehl', befehl: { art: 'KostengruppeSetzen', positionId: k.id, kostengruppe: r.wert } };
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

/** Text der Spalte „KG“ → Nummer oder Hinweis über die Lesefunktion der App; leer ist `null` (Zuordnung entfernen). */
export function leseKostengruppe(text: string, lesen: KostengruppeLesen): Zahlenlesung<Kostengruppennummer> {
  const t = text.trim();
  if (t === '') return { ok: true, wert: null };
  const r = lesen(t);
  return r.ok ? { ok: true, wert: r.wert } : { ok: false, meldung: r.fehler };
}
