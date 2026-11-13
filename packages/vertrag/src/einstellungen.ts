// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstellungen (v1.7a, Ticket 127; E10, E15, D-73; Glossar „Einstellungen“): was für alle Projekte eines Geräts gilt. Nur
// Typen und eine Konstante. Befehle in `befehle.ts` (`EinstellungenBefehl`), ChangeSet und Ausführer in `changeset.ts`, das
// Repository und der Block der Projektdatei in `speicher.ts`.
//
// Lesarten (vorläufige Annahme, Entscheidung offen, enge Lesart; D-73, D-127):
// - Ein einziges, globales Aggregat ohne Kennung und ohne Projekt. Seine Befehle stehen **nicht** im Befehlsprotokoll eines
//   Projekts und nicht in dessen Undo-Historie (ein `Protokolleintrag` gehört zu einem Projekt, ADR 0009); sie sind trotzdem
//   Befehle mit ChangeSet (A5), geschrieben über `EinstellungenRepository.anwenden`. Q5: Entfernen eines Druckprofils fragt die
//   Oberfläche vorher; das ChangeSet bleibt durch Tausch umkehrbar.
// - Die Projektdatei (Schema 7) trägt eine Kopie als optionalen Block `Projektdatei.einstellungen`; das Einlesen füllt nur
//   Fehlendes je Schlüssel (D-73, siehe dort).

import type { Kostengruppennummer } from './marken';
import type { Anschrift } from './modell';

/**
 * Das Büro als Absender (v1.7a, E10; Glossar „Büro“): Name, Anschrift, Telefon, E-Mail für die Köpfe der PDFs. `name` nicht
 * leer (ein Büro ohne Namen ist keines: `BueroSetzen` mit `null`); die übrigen Felder nullbar, nie `''` (Normalisierung im
 * Kern wie bei `Bieterangaben`).
 */
export interface Buero {
  readonly name: string;
  readonly anschrift: Anschrift | null;
  readonly telefon: string | null;
  readonly email: string | null;
}

/**
 * Umfang des Langtexts im Druck (v1.7a, aus `ausgabe` gewandert, gleich gebaut): voll, gar nicht (nur Kurztext) oder die ersten
 * `anzahl` Zeilen (Absatz, Listenpunkt, Tabellenzeile; ein Zeilenumbruch im Absatz zählt mit), `anzahl` ganze Zahl ≥ 1.
 */
export type LangtextUmfang =
  | { readonly art: 'voll' }
  | { readonly art: 'kein' }
  | { readonly art: 'zeilen'; readonly anzahl: number };

/**
 * Druckprofil (v1.7a, Ticket 127, E15; Glossar „Druckprofil“): gleich gebaut wie in `ausgabe` (Ticket 90), das den Typ ab
 * Ticket 141 von hier nimmt. In den Einstellungen stehen nur die **eigenen** Profile des Nutzers; die mitgelieferten
 * (`STANDARD_DRUCKPROFILE` in `ausgabe`) nie. Die Kennung eines Profils ist sein `name` (D-73 „Kennung“): nicht leer und in
 * `Einstellungen.druckprofile` eindeutig (der Kern prüft beides).
 */
export interface Druckprofil {
  /** Name, unter dem der Nutzer das Profil wählt; zugleich seine Kennung in den Einstellungen. */
  readonly name: string;
  /** `false`: Blankett für Bieter, kein Preis im Druck (auch keine Titelsummen, kein Schlussblock). */
  readonly mitPreisen: boolean;
  readonly langtext: LangtextUmfang;
  readonly titelsummen: boolean;
  /** Netto, Nachlass, MwSt, Brutto sowie Bedarfs- und Wahlsumme getrennt (F4). */
  readonly schlussblock: boolean;
  /** Kopf mit Projekt, Bauherr, Auftraggeber, Vergabeinformationen und LV-Name; aus: nur der LV-Name. */
  readonly deckblatt: boolean;
  /** Freier Text im Seitenkopf mit Platzhaltern `{seite}`, `{seiten}`, `{datum}`, `{lv}`; `null`: Vorgabe. */
  readonly kopfzeile: string | null;
  /** Freier Text im Seitenfuß mit denselben Platzhaltern; `null`: „Stand: Datum“ und „Seite x von y“. */
  readonly fusszeile: string | null;
  readonly seitenrand: 'normal' | 'eng';
}

/**
 * Bezeichnung einer Kostengruppe (v1.7a, E15; Glossar „Kostengruppe“), wie der Nutzer sie aus seiner CSV einliest (G-16; die
 * Texte der Norm stehen nie im Repo, C1). `bezeichnung` nicht leer.
 */
export interface Kostengruppenbezeichnung {
  readonly nummer: Kostengruppennummer;
  readonly bezeichnung: string;
}

/**
 * Einstellungen (v1.7a, Ticket 127, E15, D-73; Glossar): Büro, eigene Druckprofile, Kostengruppenbezeichnungen.
 *
 * - `buero`: `null`, solange keines gesetzt ist.
 * - `druckprofile`: in der Reihenfolge des Anlegens (`DruckprofilSetzen` ersetzt ein Profil gleichen Namens an seiner Stelle,
 *   sonst kommt es ans Ende); Namen eindeutig.
 * - `kostengruppenbezeichnungen`: nach `nummer` aufsteigend (wie `kgSortieren`), jede Nummer höchstens einmal.
 */
export interface Einstellungen {
  readonly buero: Buero | null;
  readonly druckprofile: readonly Druckprofil[];
  readonly kostengruppenbezeichnungen: readonly Kostengruppenbezeichnung[];
}

/**
 * Die Einstellungen, solange nichts gesetzt ist (v1.7a): Das Repository liefert sie, wenn der Speicher noch keine hat, und
 * der Ausführer beginnt mit ihnen. Eine Konstante wie `NACHKOMMASTELLEN`, keine Logik.
 */
export const LEERE_EINSTELLUNGEN: Einstellungen = {
  buero: null,
  druckprofile: [],
  kostengruppenbezeichnungen: [],
};
