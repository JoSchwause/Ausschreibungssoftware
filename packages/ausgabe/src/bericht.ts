// SPDX-License-Identifier: AGPL-3.0-or-later
// Berichtsmodell: die Naht der Tabellen-Ausgaben (Ticket 113: Mängelliste, Mängelanzeige, Bautagebuch, Honorarberechnung,
// Bauzeitenplan; Ticket 141: Preisspiegel, Vergabevorschlag, Aufmaßblatt, Soll/Ist, Rechnungsprüfung). Wie das
// `Ausgabemodell` des LV-Drucks (ADR 0012) trägt es fertig formatierte de-DE-Texte und rechnet nichts (A2); die Renderer
// (`bericht-pdf.ts` mit pdfmake, `bericht-excel.ts`) lesen nur dieses Modell. Eine Zahl trägt neben ihrem Text den Wert in
// Punktnotation, damit Excel mit ihr rechnen kann (N4: formatiert wird hier, gelesen nur am Rand). Das Datum des Drucks und
// die Kopfdaten kommen aus der Eingabe, das Paket kennt keine Uhr.

import type {
  Befundschwere,
  Betrag,
  Druckprofil,
  Einheitspreis,
  Menge,
  Prozent,
  Zahlenart,
} from '@tethys/vertrag';
import {
  formatiereBetragDe,
  formatiereEinheitspreisDe,
  formatiereMengeDe,
  formatiereProzentDe,
} from '@tethys/dezimal';
import { datumDe } from './modell';

/** Keine Angabe im Quelldatum: Es steht ein Strich statt einer leeren Zelle (nichts verschwindet still, Q5). */
export const KEINE_ANGABE = '–';

/**
 * Ein Befund, wie die App ihn am Bildschirm zeigt (Ticket 122, D-122.1): Ort und Text fertig formatiert (N4, L1). Der
 * Druck gibt ihn unverändert wieder; die Meldung eines `Pruefbefund` (kanonische Zahlen, Kennungen) druckt er nie.
 */
export interface Befundtext {
  readonly schwere: Befundschwere;
  /** Wo, z. B. „Objekt 1, Umbauzuschlag“ oder „1.2 Mauerwerk EG“; `null`: die ganze Berechnung bzw. der ganze Plan. */
  readonly ort: string | null;
  readonly text: string;
}

/** Eine Zeile der Befundliste im Druck: „Warnung (Ort): Text“, wie am Bildschirm. */
export const befundZeile = (b: Befundtext): string =>
  `${b.schwere === 'fehler' ? 'Fehler' : 'Warnung'}${b.ort === null ? '' : ` (${b.ort})`}: ${b.text}`;

/** Eine Zahl für Excel: der Wert in Punktnotation mit seiner Zahlenart (Nachkommastellen nach N3). */
export interface BerichtZahl {
  readonly wert: string;
  readonly art: Zahlenart;
}

export interface BerichtFeld {
  readonly bezeichnung: string;
  readonly wert: string;
  /** Der Wert als Zahl (Excel); fehlt: Text. */
  readonly zahl?: BerichtZahl;
}

/** Ein Wert einer Zelle: der Text des Drucks und, bei einer Zahl, ihr Wert für Excel. */
export interface BerichtWert {
  readonly text: string;
  readonly zahl?: BerichtZahl;
}

/**
 * Eine Zelle mit mehr als einem Text: die Werte der Teile ihrer Spalte untereinander (`BerichtSpalte.teile`, etwa EP und
 * GP), darunter klein ein Hinweis (etwa „Ausreißer hoch“), der als Text dasteht, nicht nur als Farbe.
 */
export interface BerichtZelle {
  readonly werte: readonly BerichtWert[];
  readonly hinweis?: string;
  readonly fett?: boolean;
}

export interface BerichtSpalte {
  readonly titel: string;
  /** Feste Breite in pt; `'*'`: Rest der Satzbreite. */
  readonly breite: number | '*';
  readonly rechts?: boolean;
  /**
   * Bezeichnungen der Werte, die in jeder Zelle der Spalte untereinander stehen (etwa `['EP', 'GP']`). Der Druck nennt sie
   * im Spaltenkopf; Excel schreibt je Teil eine eigene Spalte. Fehlt: ein Wert je Zelle.
   */
  readonly teile?: readonly string[];
}

export interface BerichtZeile {
  readonly zellen: readonly (string | BerichtZelle)[];
  /** Einrückung der ersten Zelle in Stufen (Gliederung, z. B. Vorgänge unter einem Sammelvorgang). */
  readonly einrueckung?: number;
  readonly fett?: boolean;
  /** Zusatztext unter der letzten Zelle, z. B. „überfällig“; steht als Text da, nicht nur als Farbe. */
  readonly kleinerText?: string;
}

export type BerichtBlock =
  | { readonly art: 'absatz'; readonly text: string; readonly klein?: boolean }
  | {
      readonly art: 'tabelle';
      readonly spalten: readonly BerichtSpalte[];
      readonly zeilen: readonly BerichtZeile[];
    }
  /** Bezeichnung links, Wert rechts (Summenblöcke, Tageskopf). */
  | { readonly art: 'felder'; readonly felder: readonly (BerichtFeld & { readonly fett?: boolean })[] }
  /** Bezeichnung links (feste Breite), Text rechts daneben, linksbündig und umbrechend (Freitexte). */
  | { readonly art: 'angaben'; readonly felder: readonly BerichtFeld[] }
  | { readonly art: 'liste'; readonly punkte: readonly string[] };

export interface BerichtAbschnitt {
  readonly ueberschrift: string | null;
  readonly bloecke: readonly BerichtBlock[];
}

/** Seite und Kopf- und Fußzeile eines Berichts, aus dem Druckprofil (wie beim LV) und der Art des Berichts. */
export interface BerichtSeite {
  readonly ausrichtung: 'hoch' | 'quer';
  readonly rand: 'normal' | 'eng';
  /** Text im Seitenkopf jeder Seite mit Platzhaltern (`{seite}`, `{seiten}`, `{datum}`, `{lv}`); `null`: keiner. */
  readonly kopfzeile: string | null;
  /** Text im Seitenfuß mit denselben Platzhaltern; `null`: „Stand: Datum“ und „Seite x von y“. */
  readonly fusszeile: string | null;
  /** Wert des Platzhalters `{lv}`: der Name des LV, auf das sich der Bericht bezieht, sonst sein Titel. */
  readonly lv: string;
}

export interface Berichtsmodell {
  /** Titel im Dokumentkopf und in den PDF-Metadaten. */
  readonly titel: string;
  /** Das Büro als Absender (E10), je Angabe eine Zeile, rechts oben auf der ersten Seite; fehlt oder leer: keiner. */
  readonly absender?: readonly string[];
  readonly kopf: readonly BerichtFeld[];
  /** Druckdatum `TT.MM.JJJJ` (Eingabe); `null`: keines. */
  readonly datum: string | null;
  /** Dasselbe Datum als `JJJJ-MM-TT` für die PDF-Metadaten (gleiche Eingabe, gleiche Bytes); `null`: keines. */
  readonly erstellt: string | null;
  readonly abschnitte: readonly BerichtAbschnitt[];
  /** Fehlt: A4 hoch, normaler Rand, Vorgabe für Kopf- und Fußzeile. */
  readonly seite?: BerichtSeite;
}

/** Text einer Zelle, wie ihn eine reine Textausgabe liest: die Werte untereinander, durch Zeilenumbruch getrennt. */
export const zellText = (z: string | BerichtZelle): string =>
  typeof z === 'string' ? z : z.werte.map((w) => w.text).join('\n');

/**
 * Seite eines Berichts nach einem Druckprofil (wie beim LV): Seitenrand, Kopf- und Fußzeile. Preise, Langtext, Titelsummen
 * und Schlussblock eines Profils gelten nur für den LV-Druck; ein Bericht ist ohne seine Zahlen keiner. `deckblatt: false`
 * wirkt im Modell des Berichts (ohne Absender und Kopfangaben).
 */
export function berichtSeite(
  profil: Druckprofil | undefined,
  ausrichtung: BerichtSeite['ausrichtung'],
  lv: string,
): BerichtSeite {
  return {
    ausrichtung,
    rand: profil?.seitenrand ?? 'normal',
    kopfzeile: profil?.kopfzeile ?? null,
    fusszeile: profil?.fusszeile ?? null,
    lv,
  };
}

export { datumDe };

/** Kopf der Berichte: Druckdatum aus der Eingabe (`JJJJ-MM-TT`). */
export const druckdatum = (iso: string | undefined): { datum: string | null; erstellt: string | null } =>
  iso === undefined ? { datum: null, erstellt: null } : { datum: datumDe(iso), erstellt: iso };

export const datumOderStrich = (iso: string | null | undefined): string =>
  iso === null || iso === undefined ? KEINE_ANGABE : datumDe(iso);

export const textOderStrich = (t: string | null | undefined): string =>
  t === null || t === undefined || t.trim() === '' ? KEINE_ANGABE : t;

export const euro = (b: Betrag): string => `${formatiereBetragDe(b)} €`;
export const prozent = (p: Prozent): string => `${formatiereProzentDe(p)} %`;

/** Zahlwerte einer Zelle: de-DE-Text (N4) und Wert für Excel; `null` ist ein Strich (Q5). */
export const wert = {
  menge: (m: Menge | null): BerichtWert =>
    m === null ? { text: KEINE_ANGABE } : { text: formatiereMengeDe(m), zahl: { wert: m, art: 'menge' } },
  einheitspreis: (e: Einheitspreis | null): BerichtWert =>
    e === null
      ? { text: KEINE_ANGABE }
      : { text: formatiereEinheitspreisDe(e), zahl: { wert: e, art: 'einheitspreis' } },
  betrag: (b: Betrag | null): BerichtWert =>
    b === null ? { text: KEINE_ANGABE } : { text: formatiereBetragDe(b), zahl: { wert: b, art: 'betrag' } },
  prozent: (p: Prozent | null): BerichtWert =>
    p === null ? { text: KEINE_ANGABE } : { text: formatiereProzentDe(p), zahl: { wert: p, art: 'prozent' } },
  text: (t: string): BerichtWert => ({ text: t }),
} as const;

/** Eine Zelle mit einem Wert (und wahlweise Hinweis oder fett). */
export const zelle = (w: BerichtWert, mehr: { hinweis?: string; fett?: boolean } = {}): BerichtZelle => ({
  werte: [w],
  ...(mehr.hinweis === undefined ? {} : { hinweis: mehr.hinweis }),
  ...(mehr.fett === true ? { fett: true } : {}),
});

/** Ein Betrag als Feld eines Summenblocks: Text mit „€“, Wert für Excel. */
export const betragFeld = (
  bezeichnung: string,
  b: Betrag,
  fett = false,
): BerichtFeld & { fett?: boolean } => ({
  bezeichnung,
  wert: euro(b),
  zahl: { wert: b, art: 'betrag' },
  ...(fett ? { fett: true } : {}),
});

/** Ganze Zahl mit echtem Minuszeichen (U+2212), z. B. Temperaturen. */
export const ganzeZahl = (n: number): string => (n < 0 ? `−${String(-n)}` : String(n));
