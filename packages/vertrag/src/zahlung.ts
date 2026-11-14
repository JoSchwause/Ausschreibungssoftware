// SPDX-License-Identifier: AGPL-3.0-or-later
// Abzüge und Zahlungen einer Rechnung (v1.7b, Ticket 128; A5, D-72): Vertragsstrafe, Skonto, Bauabzugsteuer und Zahlungen an
// der Rechnung (gespeichert, Felder in `Rechnung`), dazu der gerechnete Zahlungsstand und seine Befunde (nie gespeichert).
// Nur Typen und der Satz der Bauabzugsteuer als Konstante; gerechnet wird in `abrechnung` (Ticket 143).
//
// Die Kette nach D-72 (jeder Schritt auf 2 Stellen gerundet, dann verrechnet; N2, E-07): Leistung → Nachlass → MwSt →
// Brutto kumuliert → Umlagen → **Vertragsstrafe** → Einbehalt → frühere eingefrorene Zahlbeträge → **Zahlbetrag** (eingefroren,
// D-34 unverändert) → **Skonto** → **Bauabzugsteuer** → **Auszahlung** → **Zahlungen** → **offen**. Skonto und
// Bauabzugsteuer sind Erfüllung, keine Kürzung der Forderung: Folgerechnungen lesen weiter nur den eingefrorenen Zahlbetrag.

import type { Kalenderdatum, ZahlungId } from './marken';
import type { Betrag, Prozent } from './zahlen';

/**
 * Vertragsstrafe einer Rechnung (v1.7b, D-72; Glossar „Vertragsstrafe“): ein fester Betrag **brutto** mit Grund, ohne Wirkung
 * auf die MwSt. **Kumuliert** wie die Abschlagsrechnung: `betrag` ist die ganze bis zu dieser Rechnung geltend gemachte
 * Vertragsstrafe; die früheren Zahlbeträge haben die frühere schon abgezogen. Die Prüfung zieht `betrag` nach den Umlagen und
 * vor dem Einbehalt vom Brutto kumuliert ab; die Basis von Umlagen und Einbehalt bleibt das Brutto kumuliert.
 *
 * Lesart (D-128.3; vorläufige Annahme, enge Lesart): `betrag` > 0,00 (keine Vertragsstrafe: das Feld fehlt), `grund` nicht
 * leer; sonst `ungueltige-eingabe` (`feld: 'vertragsstrafe.betrag'` bzw. `'vertragsstrafe.grund'`).
 */
export interface Vertragsstrafe {
  readonly betrag: Betrag;
  /** Grund, freier Text (etwa „Zwischenfrist Rohbau um 5 Werktage überschritten“), nicht leer. */
  readonly grund: string;
}

/**
 * Vereinbarter Skonto einer Rechnung (v1.7b, D-72; Glossar „Skonto / Skontofrist“). Die Prüfung rechnet den möglichen Skonto
 * round(Zahlbetrag × `satz` / 100, 2), 0,00 bei einem Zahlbetrag ≤ 0,00, und das Fristende `Rechnung.eingang` + `fristTage`
 * Kalendertage (der Eingangstag zählt nicht, keine Verschiebung auf einen Werktag). Ohne `Rechnung.eingang` gibt es keinen
 * Skonto (Befund `skonto-ohne-eingang`).
 *
 * Lesart (D-128.4; enge Lesart): `satz` größer 0,00 und kleiner 100,00 (`'3.00'` heißt 3 %); `fristTage` ganze Zahl von 1 bis
 * 365 (eine Anzahl, N1 gilt nicht); sonst `ungueltige-eingabe` (`feld: 'skonto.satz'` bzw. `'skonto.fristTage'`).
 */
export interface Skonto {
  readonly satz: Prozent;
  /** Skontofrist in Kalendertagen ab dem Tag nach dem Eingang. */
  readonly fristTage: number;
}

/**
 * Eine Zahlung des Auftraggebers an den Auftragnehmer auf eine Rechnung (v1.7b, D-72; Glossar „Zahlung“). Die Bauabzugsteuer
 * an das Finanzamt ist keine Zahlung in diesem Sinn und wird nicht erfasst. Kein eigenes Aggregat: Zahlungen stehen in
 * `Rechnung.zahlungen` und gibt es nur an einer freigegebenen Rechnung (D-128.1, D-128.7).
 *
 * Lesart (D-128.6; enge Lesart): `datum` ein Tag, den es gibt (der Ausführer prüft ihn nach, `feld: 'zahlung.datum'`);
 * `betrag` > 0,00 (`feld: 'zahlung.betrag'`); eine Rückzahlung des Auftragnehmers kennt v1 nicht.
 */
export interface Zahlung {
  /** Kennung aus `IdQuelle.zahlung` (A7), eindeutig in der Rechnung. */
  readonly id: ZahlungId;
  readonly datum: Kalenderdatum;
  readonly betrag: Betrag;
}

/**
 * Satz der Bauabzugsteuer (v1.7b, D-72; Glossar „Bauabzugsteuer“; § 48 Abs. 1 EStG): 15 %, als `Prozent` mit 2 Stellen. Die
 * eine Stelle, an der der Satz steht: `abrechnung` rechnet mit ihm, Oberfläche und Ausgabe nennen ihn. Eine Konstante wie
 * `NACHKOMMASTELLEN`, keine Logik; an der Rechnung gibt es nur den Schalter (`Rechnung.bauabzugsteuer`).
 */
export const BAUABZUGSTEUER_SATZ: Prozent = '15.00' as Prozent;

/**
 * Die Auszahlung einer Rechnung in einem der beiden Auszahlungsszenarien (v1.7b, D-72; Glossar „Auszahlungsszenario“ und
 * „Auszahlung“): bei Zahlung bis zum Fristende (mit Skonto) oder danach (ohne Skonto). Gerechnet, nie gespeichert.
 */
export interface Auszahlungsszenario {
  /** Mit Skonto: der mögliche Skonto (siehe `Skonto`); ohne Skonto: 0,00. */
  readonly skonto: Betrag;
  /**
   * round((Zahlbetrag − `skonto`) × `BAUABZUGSTEUER_SATZ` / 100, 2), wenn die Bauabzugsteuer eingeschaltet ist; 0,00, wenn
   * sie aus ist oder die Basis ≤ 0,00 ist (Lesart D-128.5, wie der Skonto bei einem Zahlbetrag ≤ 0,00). Umlagen und
   * Vertragsstrafe zählen in v1 nicht zur Basis (D-72, steht auf der Seite „Annahmen“).
   */
  readonly bauabzugsteuer: Betrag;
  /** Zahlbetrag − `skonto` − `bauabzugsteuer`: was in diesem Fall an den Auftragnehmer geht. */
  readonly auszahlung: Betrag;
}

/**
 * Zahlungsstand einer Rechnung (v1.7b, D-72; Glossar „Offener Betrag / Zahlungsstand“): der Teil der Rechnungsprüfung nach
 * dem Zahlbetrag. `abrechnung` rechnet ihn (Ticket 143, als Feld der `Rechnungspruefung`), `ausgabe` druckt ihn mit der
 * Zahlungsfreigabe (Ticket 153; Glossar „Zahlungsfreigabe“), ohne `abrechnung` zu importieren (A3; wie `Leistungsstand`). Nie gespeichert. Jeder Betrag
 * auf 2 Stellen gerundet und dann verrechnet (N2, E-07).
 */
export interface Zahlungsstand {
  /**
   * Der Zahlbetrag, von dem aus gerechnet wird: der eingefrorene `Rechnung.freigabe.zahlbetrag`, sobald die Rechnung
   * freigegeben ist, sonst der geprüfte der Kette (Vorschau auf die Freigabe; D-128.8).
   */
  readonly zahlbetrag: Betrag;
  /**
   * Letzter Tag der Skontofrist: `Rechnung.eingang` + `Skonto.fristTage` Kalendertage; eine Zahlung an diesem Tag ist
   * rechtzeitig. `null`: kein Skonto vereinbart, oder kein Eingangsdatum (dann Befund `skonto-ohne-eingang`).
   */
  readonly fristende: Kalenderdatum | null;
  /** Auszahlung bei Zahlung bis `fristende`; ohne möglichen Skonto gleich `ohneSkonto`. */
  readonly mitSkonto: Auszahlungsszenario;
  /** Auszahlung bei Zahlung nach `fristende` oder ohne Skonto (`skonto` 0,00). */
  readonly ohneSkonto: Auszahlungsszenario;
  /**
   * Der Skonto ist verwirklicht (D-72): Der mögliche Skonto ist > 0,00, und die Zahlungen mit `datum` ≤ `fristende` erreichen
   * zusammen mindestens `mitSkonto.auszahlung`.
   */
  readonly skontoVerwirklicht: boolean;
  /** `mitSkonto.skonto`, wenn der Skonto verwirklicht ist, sonst 0,00. */
  readonly verwirklichterSkonto: Betrag;
  /** Die Bauabzugsteuer des geltenden Falls (verwirklicht: mit Skonto, sonst ohne), „an das Finanzamt“. */
  readonly bauabzugsteuer: Betrag;
  /** Die geltende Auszahlung: `zahlbetrag` − `verwirklichterSkonto` − `bauabzugsteuer`. */
  readonly auszahlung: Betrag;
  /** Summe aller `Rechnung.zahlungen`, gleich mit welchem Datum; 0,00 ohne Zahlungen. */
  readonly summeZahlungen: Betrag;
  /**
   * Offener Betrag (D-72): `zahlbetrag` − `verwirklichterSkonto` − `bauabzugsteuer` − `summeZahlungen`. Negativ heißt, es
   * wurde mehr gezahlt als auszuzahlen war: ein Befund (`zahlungen-ueber-auszahlung`), keine Sperre (U5).
   */
  readonly offen: Betrag;
}

/**
 * Befund zum Zahlungsstand (v1.7b, D-72; U5: keine Sperre). `abrechnung` führt ihn in `Rechnungsbefund` (Ticket 143), nach
 * den Befunden aus D-34, in dieser Reihenfolge (D-128.8):
 * - `skonto-ohne-eingang`: Ein Skonto ist vereinbart, die Rechnung hat kein Eingangsdatum: kein Fristende, kein Skonto.
 * - `zahlungen-ueber-auszahlung`: Es gibt Zahlungen, und `offen` ist negativ (mehr gezahlt als die geltende Auszahlung).
 *   Ohne Zahlungen meldet ein negativer Zahlbetrag weiter nur `ueberzahlung` (D-34 (7)).
 */
export type Zahlungsbefund =
  | { readonly code: 'skonto-ohne-eingang' }
  | { readonly code: 'zahlungen-ueber-auszahlung'; readonly offen: Betrag };
