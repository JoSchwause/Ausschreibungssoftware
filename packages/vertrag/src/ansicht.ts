// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeilen und Spalten für das gemeinsame Grid (U2, Ticket 21). Nur Typen. Das Grid rechnet nie selbst: Summen
// kommen als Werte von außen, Änderungen gehen als Befehle hinaus (A5).

import type { LvBefehl } from './befehle';
import type { Pruefbefund } from './gaeb';
import type { Knoten } from './modell';
import type { Betrag } from './zahlen';
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
  readonly zeilen: readonly LvZeile[];
  /** Summenzeile; `null`, solange keine Summen vorliegen. */
  readonly gesamt: Gesamtsummen | null;
}

/** Das Grid gibt Änderungen so aus: ein Befehl je Änderung, auch beim Einfügen aus der Zwischenablage. */
export type BefehlsEmpfaenger = (befehl: LvBefehl) => void;
