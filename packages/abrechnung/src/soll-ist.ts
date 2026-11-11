// SPDX-License-Identifier: AGPL-3.0-or-later
// Soll/Ist (Ticket 81, D-35; VOB/B § 2 Abs. 3): je Position die Menge des Auftrags-LV gegen die aufgemessene Menge.

import type {
  Aufmass,
  AuftragsLvZustand,
  Betrag,
  GliederungId,
  Menge,
  PositionId,
  Prozent,
} from '@tethys/vertrag';

/** Einstellungen von Soll/Ist (D-35). */
export interface SollIstOptionen {
  /** `true`: Es gibt eine Schlussrechnung; erst dann gibt es Befunde `unter-schwelle`. Standard `false`. */
  readonly abgeschlossen?: boolean;
  /** Obere Schwelle in Prozent der Soll-Menge, streng überschritten ist ein Befund. Standard `110.00`. */
  readonly oberSchwelle?: Prozent;
  /** Untere Schwelle in Prozent der Soll-Menge, streng unterschritten ist ein Befund (nur abgeschlossen). Standard `90.00`. */
  readonly unterSchwelle?: Prozent;
}

/**
 * Eine Zeile je Position des Auftrags-LV in Dokumentreihenfolge, auch ohne Aufmaß.
 * - `soll`: die Menge im Auftrags-LV (`null`: keine).
 * - `ist`: Σ der Mengen auf den Blättern (Zeilen ohne Menge zählen nicht), `0.000` ohne Aufmaß; `null` nur bei einer
 *   Zuschlagsposition (sie wird nicht aufgemessen).
 * - `differenz`: `ist` − `soll`; `null`, wenn eines fehlt.
 * - `anteil`: round(`ist` / `soll` × 100, 2); `null` bei Soll `null`, 0 oder negativ und bei einer Zuschlagsposition.
 * - `gpSoll`: der GP aus den Summen des Kerns (`Positionssumme.gesamtpreis`), `null` ohne GP.
 * - `gpIst`: der geprüfte GP wie im Leistungsstand (round(`ist` × EP, 2), Zuschlagsposition aus ihrer Basis; 0,00 ohne EP).
 */
export interface SollIstZeile {
  readonly positionId: PositionId;
  readonly soll: Menge | null;
  readonly ist: Menge | null;
  readonly differenz: Menge | null;
  readonly anteil: Prozent | null;
  readonly gpSoll: Betrag | null;
  readonly gpIst: Betrag;
}

/** Summen einer Gliederung: Soll aus den Summen des Kerns (`Gliederungssumme.summe`), Ist = Σ `gpIst` darunter. */
export interface SollIstGliederung {
  readonly gliederungId: GliederungId;
  readonly gpSoll: Betrag;
  readonly gpIst: Betrag;
}

/**
 * Ein Befund (VOB/B § 2 Abs. 3, D-35), streng verglichen mit der exakten Menge, nicht mit dem gerundeten Anteil:
 * `ueber-schwelle` bei Ist > `oberSchwelle` % der Soll-Menge; `unter-schwelle` bei Ist < `unterSchwelle` % (nur
 * `abgeschlossen`). Kein Befund bei Soll `null`, 0 oder negativ, bei Pauschal und bei Zuschlagspositionen.
 */
export interface SollIstBefund {
  readonly code: 'ueber-schwelle' | 'unter-schwelle';
  readonly positionId: PositionId;
  readonly anteil: Prozent;
}

export interface SollIst {
  readonly zeilen: readonly SollIstZeile[];
  /** Je Gliederung in Dokumentreihenfolge. */
  readonly gliederungen: readonly SollIstGliederung[];
  /** Soll: Netto des Auftrags-LV vor Nachlass (Kern); Ist: Leistung (Σ `gpIst`). */
  readonly gesamt: { readonly gpSoll: Betrag; readonly gpIst: Betrag };
  /** In Dokumentreihenfolge. */
  readonly befunde: readonly SollIstBefund[];
}

/** Soll/Ist eines Auftrags-LV über die Aufmaßblätter `aufmasse` (alle zählen). */
export function sollIstBerechnen(
  _auftragsLv: AuftragsLvZustand,
  _aufmasse: readonly Aufmass[],
  _optionen: SollIstOptionen = {},
): SollIst {
  throw new Error('Ticket 81: sollIstBerechnen folgt');
}
