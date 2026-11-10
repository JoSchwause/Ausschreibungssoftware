// SPDX-License-Identifier: AGPL-3.0-or-later
// Fehlerwerte des Mengenansatzes (Ticket 35). Die Codes sind stabil; die deutsche Anzeige entsteht in der Oberfläche.

export type Formelfehlercode =
  | 'zeichen-unerwartet'
  | 'zahl-ungueltig'
  | 'punkt-statt-komma'
  | 'klammer-fehlt'
  | 'klammer-zu-viel'
  | 'ausdruck-leer'
  | 'ausdruck-unvollstaendig'
  | 'ausdruck-zu-lang'
  | 'zu-tief'
  | 'division-durch-null'
  | 'bezug-vorwaerts'
  | 'bezug-unbekannt'
  | 'bezug-fehlerhaft'
  | 'variable-doppelt'
  | 'variable-ungueltig'
  | 'zeile-doppelt'
  | 'formel-unbekannt';

export interface Formelfehler {
  readonly code: Formelfehlercode;
  /** Meldung für Entwickler und Protokoll. */
  readonly meldung: string;
  /** Spalte ab 0 im Ausdruckstext (UTF-16-Einheiten wie bei JavaScript-Zeichenketten); `null`, wenn ohne Ort. */
  readonly spalte: number | null;
}

export function formelfehler(code: Formelfehlercode, meldung: string, spalte: number | null): Formelfehler {
  return { code, meldung, spalte };
}
