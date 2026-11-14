// SPDX-License-Identifier: AGPL-3.0-or-later
// Der eine Feldfehler der Formulare (Ticket 123 Punkt 4, Ticket 131). Ein Feld, das sich nicht lesen lässt, ist ein
// Feldfehler: er sperrt nie die Eingabe (U5), er verhindert nur den Befehl. Vorher gab es vier Typen in drei Formen.

/** Ein Feld, das sich nicht lesen ließ, und die Meldung dazu. */
export interface Feldfehler {
  /** Name des Felds im Formular. */
  readonly feld: string;
  readonly meldung: string;
}

/** Die Feldfehler eines Formulars als Meldung je Feld (für Formulare, die je Feld höchstens eine Meldung zeigen). */
export type Feldfehlerkarte<F extends string = string> = Readonly<Partial<Record<F, string>>>;
