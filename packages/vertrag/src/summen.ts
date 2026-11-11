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
  /** Siehe `Gesamtsummen.summeBedarfOhneGesamtbetrag`, für die Positionen unter dieser Gliederung (v1.1b, Punkt 4). */
  readonly summeBedarfOhneGesamtbetrag?: Betrag;
  /** Siehe `Gesamtsummen.summeWahl`, für die Positionen unter dieser Gliederung (v1.1b, Punkt 4). */
  readonly summeWahl?: Betrag;
}

/**
 * Summen des LV bzw. Angebots. MwSt auf `nettoNachNachlass`, nicht je Position (N2).
 *
 * v1.1b, Punkt 4 (F4, E-04): Bedarf ohne Gesamtbetrag und Wahl werden getrennt ausgewiesen. Beide Summen gehen nicht
 * ins `netto` ein (damit auch nicht in Nachlass, MwSt und Brutto); sie sind Ausweise neben den Summen. Beide Felder sind
 * optional, damit `kern` und `speicher` ohne Änderung übersetzen: Fehlt ein Feld, berechnet der Kern es noch nicht
 * (bis K5/K6); `0.00` heißt „berechnet, keine solchen Positionen“. Alternative: Pflichtfelder in einem späteren
 * Vertragsstand (Offene Typfrage, Ticket 26).
 */
export interface Gesamtsummen {
  readonly netto: Betrag;
  readonly nachlass: Betrag;
  readonly nettoNachNachlass: Betrag;
  readonly mwst: Betrag;
  readonly brutto: Betrag;
  /**
   * Summe der Gesamtpreise der Bedarfspositionen ohne Gesamtbetrag (`Bedarf` = `ohne-gesamtbetrag`). Bedarf mit
   * Gesamtbetrag steht im `netto`, nicht hier (E-04). Ob Positionen ohne Menge oder EP zählen, legt K5 fest.
   */
  readonly summeBedarfOhneGesamtbetrag?: Betrag;
  /** Summe der Gesamtpreise der Wahlpositionen (E-04). Welche Varianten zählen, legt K6 fest. */
  readonly summeWahl?: Betrag;
}

/** Vollständiger Stand aller berechneten Werte eines Aggregats. */
export interface Summenstand {
  readonly positionen: readonly Positionssumme[];
  readonly gliederungen: readonly Gliederungssumme[];
  readonly gesamt: Gesamtsummen;
}

/**
 * Alte Werte zu einer `Summenaenderung` (v1.1a, Punkt 1): alles, was man braucht, um die Summen eines ChangeSets ohne
 * Vorzustand zurückzusetzen. Zusammen mit `Aenderungen.entfernt` und `Aenderung.vorher` ist ein ChangeSet damit
 * allein umkehrbar (Undo, LV-Stand; S3).
 */
export interface Summenvorher {
  /**
   * Alter Wert jeder Position aus `Summenaenderung.positionen`, die vorher schon eine Summe hatte. Eine Position
   * ohne Gegenstück hier ist durch das ChangeSet neu; bei der Umkehrung fällt ihre Summe weg.
   */
  readonly positionen: readonly Positionssumme[];
  /** Wie `positionen`, für Gliederungen. */
  readonly gliederungen: readonly Gliederungssumme[];
  /**
   * Gesamtsummen vor dem ChangeSet. Gesetzt, wenn das ChangeSet sie ändert (`Summenaenderung.gesamt` ist gesetzt)
   * oder das Aggregat gelöscht wird (dann ist `Summenaenderung.gesamt` `null`). `null`: es gab keine, weil das
   * Aggregat neu entsteht oder sie ändern sich nicht. Wer beides unterscheiden muss, liest `kopf.vorher` des ChangeSets:
   * `null` heißt „war neu“, sonst „unverändert“ (`Summenaenderung.gesamt` ist dann `null`).
   */
  readonly gesamt: Gesamtsummen | null;
  /**
   * Die vollständigen Summen der Knoten, die das ChangeSet entfernt (`knoten.entfernt`, `positionen.entfernt`),
   * auch beim Löschen eines ganzen Aggregats. Die Umkehrung stellt sie wieder her.
   */
  readonly entfernt: {
    readonly positionen: readonly Positionssumme[];
    readonly gliederungen: readonly Gliederungssumme[];
  };
}

/**
 * Betroffene Summen eines ChangeSets (A6): nur neue oder geänderte Werte, neu berechnet im betroffenen Teilbaum.
 * Summen entfernter Knoten fallen mit dem Knoten weg (`knoten.entfernt` im ChangeSet); sie stehen nicht in
 * `positionen`/`gliederungen`, sondern in `vorher.entfernt`.
 * `gesamt` ist `null`, wenn sich die Gesamtsummen nicht geändert haben (oder das Aggregat gelöscht wird).
 *
 * `vorher` (v1.1a) trägt die alten Werte. Seit v1.3 (Ticket 53 Punkt 3) Pflicht: Der Kern setzt es seit Ticket 30 in
 * jedem ChangeSet, `vergabe` ebenso; damit ist jedes ChangeSet allein umkehrbar und `speicher` kann es überall prüfen
 * (bisher nur beim Löschen eines Aggregats).
 */
export interface Summenaenderung {
  readonly positionen: readonly Positionssumme[];
  readonly gliederungen: readonly Gliederungssumme[];
  readonly gesamt: Gesamtsummen | null;
  readonly vorher: Summenvorher;
}
