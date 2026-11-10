// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffentliche Typen des Grids. Das Grid ist vollständig gesteuert (controlled): Zeilen, Spalten und Summen
// kommen als Eigenschaften herein, jede Änderung geht als Befehl hinaus (A5). Es rechnet nie (N1, A5).

import type {
  Befehlshinweis,
  BefehlsEmpfaenger,
  GridIdQuelle,
  GridZahlen,
  KnotenId,
  LvAnsicht,
  LvSpalte,
} from '@tethys/vertrag';

export interface LvGridProps {
  /**
   * Sichtbare Zeilen (aufgeklappt/zugeklappt steht in `zeile.aufgeklappt`), Summenzeile und Wurzel. In ein leeres LV
   * fügt das Grid am Ende von `ansicht.wurzelId` ein.
   */
  readonly ansicht: LvAnsicht;
  /** Anzeige- und Navigationsreihenfolge der Spalten; Standard: alle sieben in der Reihenfolge von `LvSpalte`. */
  readonly spalten?: readonly LvSpalte[];
  /** Zahlenränder (N4); die App schließt sie an `dezimal` an. */
  readonly zahlen: GridZahlen;
  /** Kennungen für neue Positionen beim Einfügen (A2: das Grid erzeugt nie selbst Kennungen). */
  readonly ids: GridIdQuelle;
  /** Jede Änderung, auch jede eingefügte Zeile, geht hier als genau ein Befehl hinaus. */
  readonly onBefehl: BefehlsEmpfaenger;
  /** Der Nutzer will einen Knoten auf- oder zuklappen. Der Zustand gehört dem Aufrufer, das Grid merkt ihn sich nicht. */
  readonly onAufklappen?: (knotenId: KnotenId, aufgeklappt: boolean) => void;
  /** Die Mehrfachauswahl (Zeilen) hat sich geändert, in Anzeigereihenfolge. */
  readonly onAuswahlChange?: (knotenIds: readonly KnotenId[]) => void;
  /**
   * Hinweise zum zuletzt angenommenen Befehl (v1.1a, Punkt 10). Der Aufrufer setzt und leert sie; das Grid zeigt sie
   * in einer Hinweisleiste an, mit Sprungknopf, wenn ein Hinweis einen Knoten nennt. Sie sperren nie (U5).
   */
  readonly hinweise?: readonly Befehlshinweis[];
  /** Zugänglicher Name des Grids. */
  readonly beschriftung?: string;
  /** Spalte mit Einzug und Auf-/Zuklappknopf; Standard `kurztext`. */
  readonly baumspalte?: LvSpalte;
  /** Zeilenhöhe in Pixeln; Standard 28 (wie `--tx-control-height`). */
  readonly zeilenhoehe?: number;
}
