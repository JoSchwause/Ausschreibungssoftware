// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsstand (Ticket 81, D-34 Schritt 1 bis 3; Vertragstyp `Leistungsstand` aus v1.4, D-70.7): die geprüfte Leistung je
// Position aus Auftrags-LV und Aufmaßblättern, dazu Nachlass und Netto nach Nachlass.

import type {
  AufmassId,
  Aufmass,
  AuftragsLvZustand,
  Leistungsstand,
  PositionId,
  Rechnungsart,
} from '@tethys/vertrag';

/**
 * Ein Befund zum Leistungsstand (U5: keine Sperre). Reihenfolge: Zeilenbefunde in der Reihenfolge der Blätter (nach
 * Blattnummer) und ihrer Zeilen, dann Positionsbefunde in Dokumentreihenfolge, zuletzt die Befunde der Abzugskette.
 * - `zeile-zaehlt-nicht`: Eine Zeile eines Blatts zählt nicht (Grund wie in `aufmassPruefen`: keine Position des
 *   Auftrags-LV, keine Position, Zuschlagsposition, keine Menge).
 * - `ohne-einheitspreis`: Die Position ist aufgemessen, hat aber keinen EP; ihr GP zählt 0,00 (D-34 (1)).
 * - `ohne-zuschlagssatz`: Eine Zuschlagsposition ohne Satz, deren Basis nicht 0,00 ist; ihr GP zählt 0,00 (Review D-42).
 * - `nachlass-ohne-basis`: Absoluter Nachlass in einer Abschlagsrechnung, aber das Auftrags-LV hat Netto 0,00; der
 *   anteilige Nachlass ist 0,00 (D-34 (2)).
 * - `netto-nach-nachlass-negativ`: Das Netto nach Nachlass ist negativ (E-06).
 */
export type Leistungsbefund =
  | {
      readonly code: 'zeile-zaehlt-nicht';
      readonly aufmassId: AufmassId;
      readonly positionId: PositionId;
      readonly grund: 'position-unbekannt' | 'keine-position' | 'zuschlagsposition' | 'menge-fehlt';
    }
  | { readonly code: 'ohne-einheitspreis'; readonly positionId: PositionId }
  | { readonly code: 'ohne-zuschlagssatz'; readonly positionId: PositionId }
  | { readonly code: 'nachlass-ohne-basis' }
  | { readonly code: 'netto-nach-nachlass-negativ' };

/** Der Leistungsstand und seine Befunde. */
export interface Leistungsergebnis {
  readonly leistungsstand: Leistungsstand;
  readonly befunde: readonly Leistungsbefund[];
}

/**
 * Leistungsstand aus den Aufmaßblättern `aufmasse` (alle zählen, die Auswahl trifft der Aufrufer; bei einer Rechnung die
 * Blätter aus `Rechnung.aufmassIds`). `art` entscheidet nur den absoluten Nachlass (Abschlag anteilig, Schluss voll).
 */
export function leistungsstandBerechnen(
  _auftragsLv: AuftragsLvZustand,
  _aufmasse: readonly Aufmass[],
  _art: Rechnungsart,
): Leistungsergebnis {
  throw new Error('Ticket 81: leistungsstandBerechnen folgt');
}
