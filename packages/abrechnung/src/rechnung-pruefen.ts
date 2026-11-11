// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnungsprüfung (Ticket 81, D-34 Schritt 4 bis 7, D-44): die Abzugskette einer Rechnung, jeder Schritt auf 2 Stellen
// gerundet und dann verrechnet (N2, N5, E-07), frühere Zahlbeträge eingefroren.

import type {
  Aufmass,
  AufmassId,
  AuftragsLvZustand,
  Betrag,
  Leistungsstand,
  Prozent,
  Rechnung,
  RechnungId,
} from '@tethys/vertrag';
import type { Leistungsbefund } from './leistungsstand';

/** Eine Umlage der Rechnung mit ihrem Betrag round(Brutto kumuliert × Satz / 100, 2) (D-34 (5)). */
export interface Umlagebetrag {
  readonly bezeichnung: string;
  readonly satz: Prozent;
  readonly betrag: Betrag;
}

/** Eine frühere, freigegebene Rechnung mit ihrem eingefrorenen Zahlbetrag (D-34 (7)). */
export interface FruehereZahlung {
  readonly rechnungId: RechnungId;
  readonly nummer: number;
  readonly zahlbetrag: Betrag;
}

/**
 * Die Abzugskette (D-34): jede Zeile auf 2 Stellen gerundet.
 * - `leistung`, `nachlass`, `nettoNachNachlass`: aus dem Leistungsstand (Schritt 1 bis 3).
 * - `mwst` = round(Netto n. N. × MwSt-Satz des Auftrags-LV / 100, 2); `bruttoKumuliert` = Netto n. N. + MwSt (Schritt 4).
 * - `umlagen`: je Umlage der Rechnung, alle auf `bruttoKumuliert` (Schritt 5).
 * - `einbehalt`: Abschlag: Sicherheitseinbehalt, Schluss: Gewährleistungseinbehalt, round(Brutto kum. × Satz / 100, 2);
 *   Satz `null`: 0,00 (Schritt 6).
 * - `fruehereZahlbetraege` = Σ der eingefrorenen Zahlbeträge der früheren freigegebenen Rechnungen (`fruehere`).
 * - `zahlbetrag` = Brutto kum. − Σ Umlagen − Einbehalt − frühere Zahlbeträge; negativ ist Überzahlung (Schritt 7).
 */
export interface Abzugskette {
  readonly leistung: Betrag;
  readonly nachlass: Betrag;
  readonly nettoNachNachlass: Betrag;
  readonly mwst: Betrag;
  readonly bruttoKumuliert: Betrag;
  readonly umlagen: readonly Umlagebetrag[];
  readonly einbehalt: {
    readonly art: 'sicherheit' | 'gewaehrleistung';
    readonly satz: Prozent | null;
    readonly betrag: Betrag;
  };
  readonly fruehere: readonly FruehereZahlung[];
  readonly fruehereZahlbetraege: Betrag;
  readonly zahlbetrag: Betrag;
}

/** Gefordert gegen geprüft (D-44): `differenz` = gefordert − geprüft. */
export interface Abweichung {
  readonly gefordert: Betrag;
  readonly geprueft: Betrag;
  readonly differenz: Betrag;
}

/**
 * Was die Rechnung fordert, gegen den geprüften Stand (D-44); je Wert `null`, wenn die Rechnung ihn nicht nennt. Netto
 * gegen `nettoNachNachlass`, Brutto gegen `bruttoKumuliert`, Zahlbetrag gegen `zahlbetrag` (kumuliert gelesen; ob die
 * Forderung kumuliert ist, sagt der Vertrag nicht, Offene Typfrage 8 zu Ticket 70).
 */
export interface Forderungsvergleich {
  readonly netto: Abweichung | null;
  readonly brutto: Abweichung | null;
  readonly zahlbetrag: Abweichung | null;
}

/**
 * Ein Befund der Rechnungsprüfung (U5: keine Sperre), dazu die Befunde des Leistungsstands. Reihenfolge: Blätter und
 * frühere Rechnungen, Leistungsstand, Schlussrechnung, Forderung, Überzahlung, Freigabe.
 * - `aufmass-unbekannt`: Eine Kennung aus `aufmassIds` hat kein Blatt in `aufmasse`; sie zählt nichts.
 * - `aufmass-fehlt`: Ein Blatt einer früheren Rechnung fehlt in `aufmassIds` (kumuliert, D-34 (1)).
 * - `fruehere-nicht-freigegeben`: Eine frühere Rechnung ist nicht freigegeben; ihr Zahlbetrag fehlt in der Kette.
 * - `freigabe-reihenfolge`: Eine freigegebene Rechnung hat eine größere Nummer als offene Rechnungen (Invariante an
 *   `Rechnung`, Review D-42); `offen` nennt deren Nummern.
 * - `schlussrechnung-nicht-letzte`: Eine Schlussrechnung (diese oder eine frühere) ist nicht die mit der größten Nummer.
 * - `gefordert-abweichend`: Der geforderte Betrag weicht ab; verglichen wird der Zahlbetrag, sonst Brutto, sonst Netto (D-44).
 * - `ueberzahlung`: Der Zahlbetrag ist negativ (D-34 (7)).
 * - `freigabe-abweichend`: Die Rechnung ist freigegeben, ihr eingefrorener Zahlbetrag ist nicht der heute geprüfte (etwa
 *   nach einer Aufmaßkorrektur, D-38); gilt bleibt der eingefrorene.
 */
export type Rechnungsbefund =
  | Leistungsbefund
  | { readonly code: 'aufmass-unbekannt'; readonly aufmassId: AufmassId }
  | {
      readonly code: 'aufmass-fehlt';
      readonly aufmassId: AufmassId;
      readonly rechnungId: RechnungId;
      readonly nummer: number;
    }
  | { readonly code: 'fruehere-nicht-freigegeben'; readonly rechnungId: RechnungId; readonly nummer: number }
  | {
      readonly code: 'freigabe-reihenfolge';
      readonly rechnungId: RechnungId;
      readonly nummer: number;
      readonly offen: readonly number[];
    }
  | {
      readonly code: 'schlussrechnung-nicht-letzte';
      readonly rechnungId: RechnungId;
      readonly nummer: number;
    }
  | ({ readonly code: 'gefordert-abweichend'; readonly feld: 'zahlbetrag' | 'brutto' | 'netto' } & Abweichung)
  | { readonly code: 'ueberzahlung'; readonly zahlbetrag: Betrag }
  | ({ readonly code: 'freigabe-abweichend' } & Abweichung);

/** Das Prüfergebnis einer Rechnung; gerechnet, nie gespeichert (D-36 (2)). */
export interface Rechnungspruefung {
  readonly rechnungId: RechnungId;
  readonly leistungsstand: Leistungsstand;
  readonly kette: Abzugskette;
  /** `null`: Die Rechnung nennt keine Forderung (`gefordert: null`). */
  readonly forderung: Forderungsvergleich | null;
  readonly befunde: readonly Rechnungsbefund[];
}

/**
 * Prüft eine Rechnung (D-34). `aufmasse`: die Blätter des Auftrags-LV (gezählt werden die aus `rechnung.aufmassIds`);
 * `rechnungen`: die übrigen Rechnungen des Auftrags-LV (die Liste aus `RechnungRepository.auflisten` darf die geprüfte
 * selbst enthalten). Frühere sind die mit kleinerer Nummer; ihre Zahlbeträge sind die gespeicherten
 * `freigabe.zahlbetrag`, nie neu gerechnet.
 */
export function rechnungPruefen(
  _rechnung: Rechnung,
  _auftragsLv: AuftragsLvZustand,
  _aufmasse: readonly Aufmass[],
  _rechnungen: readonly Rechnung[],
): Rechnungspruefung {
  throw new Error('Ticket 81: rechnungPruefen folgt');
}

/** Warum eine Rechnung nicht freigegeben werden kann (D-34 (7), D-70.4). */
export type Freigabehindernis =
  | { readonly code: 'schon-freigegeben' }
  | { readonly code: 'fruehere-offen'; readonly nummern: readonly number[] };

/**
 * Darf die Rechnung jetzt freigegeben werden? Nur, wenn sie nicht freigegeben ist und alle früheren Rechnungen (kleinere
 * Nummer) freigegeben sind. Die App fragt das vor `RechnungFreigeben`; `speicher` hält dieselbe Regel als `konflikt`.
 */
export function freigabeMoeglich(
  _rechnung: Rechnung,
  _rechnungen: readonly Rechnung[],
): { readonly moeglich: boolean; readonly hindernisse: readonly Freigabehindernis[] } {
  throw new Error('Ticket 81: freigabeMoeglich folgt');
}
