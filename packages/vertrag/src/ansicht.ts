// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeilen und Spalten für das gemeinsame Grid (U2, Ticket 21). Nur Typen. Das Grid rechnet nie selbst: Summen
// kommen als Werte von außen, Änderungen gehen als Befehle hinaus (A5).

import type { LvBefehl } from './befehle';
import type { Ergebnis } from './changeset';
import type { Pruefbefund } from './gaeb';
import type { IdQuelle, WurzelId } from './marken';
import type { Knoten } from './modell';
import type { Betrag, Einheitspreis, Menge } from './zahlen';
import type { Gesamtsummen } from './summen';

/** Spalten des LV-Grids. */
export type LvSpalte =
  'ordnungszahl' | 'positionsart' | 'kurztext' | 'menge' | 'einheit' | 'einheitspreis' | 'gesamtpreis';

/** Eine sichtbare Zeile des LV-Baums. */
export interface LvZeile {
  readonly knoten: Knoten;
  /** Tiefe im Baum, 0 für Knoten direkt unter der Wurzel. */
  readonly tiefe: number;
  readonly hatUnterknoten: boolean;
  readonly aufgeklappt: boolean;
  /** Gesamtpreis der Position bzw. Summe der Gliederung; `null`, wenn es keinen Wert gibt (Hinweistext). */
  readonly summe: Betrag | null;
  /** Ob die Position in die Summen eingeht; `null` bei Gliederung und Hinweistext. */
  readonly gehtInSummeEin: boolean | null;
  /** Prüfhinweise je Zelle (`ort.feld` nennt die Spalte). Sperren nie die Eingabe (U5). */
  readonly befunde: readonly Pruefbefund[];
}

/** Alles, was das Grid zum Anzeigen bekommt. */
export interface LvAnsicht {
  /**
   * Die Wurzel des angezeigten Baums (v1.1a): Elternknoten für das Einfügen in ein leeres LV und für Knoten der
   * obersten Ebene. Auch ein leeres LV kennt sie, deshalb steht sie hier und nicht an einer Zeile.
   */
  readonly wurzelId: WurzelId;
  readonly zeilen: readonly LvZeile[];
  /** Summenzeile; `null`, solange keine Summen vorliegen. */
  readonly gesamt: Gesamtsummen | null;
}

/** Das Grid gibt Änderungen so aus: ein Befehl je Änderung, auch beim Einfügen aus der Zwischenablage. */
export type BefehlsEmpfaenger = (befehl: LvBefehl) => void;

// --- Ränder des Grids (v1.1a, Punkt 7) -----------------------------------------------------------------------------

/**
 * Zahlenränder des Grids (N4): de-DE-Text ↔ Dezimalwert. Die App schließt sie an `dezimal` an; das Grid rechnet nie
 * selbst und vergleicht Werte nur als Zeichenketten auf Gleichheit. Funktionen, keine Daten: Das ist eine
 * Schnittstelle des Rands, kein Teil von Befehl oder ChangeSet.
 *
 * - `parse*` bekommt getrimmten, nicht leeren Text; der Fehler ist eine deutsche Meldung für die Zelle.
 * - `format*` liefert Anzeige und Startwert des Eingabefelds; das Ergebnis muss sich wieder parsen lassen.
 */
export interface GridZahlen {
  parseMenge(text: string): Ergebnis<Menge, string>;
  parseEinheitspreis(text: string): Ergebnis<Einheitspreis, string>;
  formatMenge(wert: Menge): string;
  formatEinheitspreis(wert: Einheitspreis): string;
  /** GP, Gliederungssummen und Summenzeile. */
  formatBetrag(wert: Betrag): string;
}

/**
 * Kennungen für neue Positionen beim Einfügen aus der Zwischenablage (A2: das Grid erzeugt nie selbst Kennungen).
 * Ein Zuschnitt der einen `IdQuelle`, keine zweite Schnittstelle.
 *
 * v1.2 (D-10 (4)): dazu `papierkorbEintrag`, damit das Grid `KnotenInPapierkorbLegen` aussenden kann (Ticket 46).
 */
export type GridIdQuelle = Pick<IdQuelle, 'position' | 'papierkorbEintrag'>;
