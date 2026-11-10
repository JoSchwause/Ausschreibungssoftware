// SPDX-License-Identifier: AGPL-3.0-or-later
// Berechnete Werte: Gesamtpreise und Summen. Nur Typen. Die Regeln, welche Positionen eingehen, stehen im Kern.

import type { GliederungId, PositionId } from './marken';
import type { Betrag } from './zahlen';

/**
 * Ergebnis je Position. `gesamtpreis` ist `null`, wenn kein GP entsteht (z. B. nicht angeboten oder Menge/EP
 * nicht gesetzt). `gehtInSummeEin` hält nur das Ergebnis fest; ob Bedarfs-, Wahl- und Zuschlagspositionen
 * einfließen, legt K5/K6 fest, nicht dieser Typ (Fixture-Annahmen A1–A4).
 */
export interface Positionssumme {
  readonly positionId: PositionId;
  readonly gesamtpreis: Betrag | null;
  readonly gehtInSummeEin: boolean;
}

/** Summe eines Loses oder Titels (einschließlich Untergliederungen). */
export interface Gliederungssumme {
  readonly gliederungId: GliederungId;
  readonly summe: Betrag;
}

/** Summen des LV bzw. Angebots. MwSt auf `nettoNachNachlass`, nicht je Position (N2). */
export interface Gesamtsummen {
  readonly netto: Betrag;
  readonly nachlass: Betrag;
  readonly nettoNachNachlass: Betrag;
  readonly mwst: Betrag;
  readonly brutto: Betrag;
}

/** Vollständiger Stand aller berechneten Werte eines Aggregats. */
export interface Summenstand {
  readonly positionen: readonly Positionssumme[];
  readonly gliederungen: readonly Gliederungssumme[];
  readonly gesamt: Gesamtsummen;
}

/**
 * Betroffene Summen eines ChangeSets (A6): nur neue oder geänderte Werte, neu berechnet im betroffenen Teilbaum.
 * Summen entfernter Knoten fallen mit dem Knoten weg (`knoten.entfernt` im ChangeSet); sie werden hier nicht gelistet.
 * `gesamt` ist `null`, wenn sich die Gesamtsummen nicht geändert haben.
 */
export interface Summenaenderung {
  readonly positionen: readonly Positionssumme[];
  readonly gliederungen: readonly Gliederungssumme[];
  readonly gesamt: Gesamtsummen | null;
}
