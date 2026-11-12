// SPDX-License-Identifier: AGPL-3.0-or-later
// Berichtsmodell: die Naht der Tabellen-Ausgaben X2 bis X4 (Mängelliste, Mängelanzeige, Bautagebuch, Honorarberechnung,
// Bauzeitenplan; Ticket 113). Wie das `Ausgabemodell` des LV-Drucks (ADR 0012) trägt es fertig formatierte de-DE-Texte und
// rechnet nichts (A2); der Renderer (`bericht-pdf.ts`, pdfmake) liest nur dieses Modell. Das Datum des Drucks und die
// Kopfdaten kommen aus der Eingabe, das Paket kennt keine Uhr.

import type { Betrag, Prozent } from '@tethys/vertrag';
import { formatiereBetragDe, formatiereProzentDe } from '@tethys/dezimal';
import { datumDe } from './modell';

/** Keine Angabe im Quelldatum: Es steht ein Strich statt einer leeren Zelle (nichts verschwindet still, Q5). */
export const KEINE_ANGABE = '–';

export interface BerichtFeld {
  readonly bezeichnung: string;
  readonly wert: string;
}

export interface BerichtSpalte {
  readonly titel: string;
  /** Feste Breite in pt; `'*'`: Rest der Satzbreite. */
  readonly breite: number | '*';
  readonly rechts?: boolean;
}

export interface BerichtZeile {
  readonly zellen: readonly string[];
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

export interface Berichtsmodell {
  /** Titel im Dokumentkopf und in den PDF-Metadaten. */
  readonly titel: string;
  readonly kopf: readonly BerichtFeld[];
  /** Druckdatum `TT.MM.JJJJ` (Eingabe); `null`: keines. */
  readonly datum: string | null;
  /** Dasselbe Datum als `JJJJ-MM-TT` für die PDF-Metadaten (gleiche Eingabe, gleiche Bytes); `null`: keines. */
  readonly erstellt: string | null;
  readonly abschnitte: readonly BerichtAbschnitt[];
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

/** Ganze Zahl mit echtem Minuszeichen (U+2212), z. B. Temperaturen. */
export const ganzeZahl = (n: number): string => (n < 0 ? `−${String(-n)}` : String(n));
