// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffentliche Typen des Grids. Das Grid ist vollständig gesteuert (controlled): Zeilen, Spalten und Summen
// kommen als Eigenschaften herein, jede Änderung geht als Befehl hinaus (A5). Es rechnet nie (N1, A5).

import type {
  BefehlsEmpfaenger,
  Betrag,
  Einheitspreis,
  ElternId,
  Ergebnis,
  IdQuelle,
  KnotenId,
  LvAnsicht,
  LvSpalte,
  Menge,
} from '@tethys/vertrag';

/**
 * Ränder zwischen Text und Dezimalwert (N4). Nur `packages/dezimal` darf `Menge`, `Einheitspreis` und `Betrag`
 * erzeugen und formatieren; das Grid darf `dezimal` nicht importieren (A3). Die App verdrahtet diese Funktionen
 * mit `dezimal`; Tests und die Browser-Testseite des Pakets reichen Attrappen.
 *
 * Verträge:
 * - `parse*` bekommt den **getrimmten, nicht leeren** Text so, wie der Nutzer ihn tippt oder aus Excel einfügt
 *   (de-DE: Tausenderpunkt, Dezimalkomma). Ein leerer Text erreicht den Parser nie; das Grid macht daraus `null`.
 *   Rückgabe `{ ok: false, fehler }` mit einer deutschen Meldung für die Zelle; das Grid zeigt sie als Hinweis.
 * - `format*` liefert den Anzeigetext (de-DE). Derselbe Text steht beim Bearbeiten im Eingabefeld und muss sich
 *   von `parse*` wieder lesen lassen, sonst ändert ein unverändertes Bestätigen den Wert.
 * - Das Grid vergleicht Werte nur als Zeichenketten auf Gleichheit; es addiert, multipliziert und rundet nie.
 */
export interface GridZahlen {
  parseMenge(text: string): Ergebnis<Menge, string>;
  parseEinheitspreis(text: string): Ergebnis<Einheitspreis, string>;
  formatMenge(wert: Menge): string;
  formatEinheitspreis(wert: Einheitspreis): string;
  formatBetrag(wert: Betrag): string;
}

/** Kennungen für neue Positionen beim Einfügen (A2: das Grid erzeugt nie selbst Kennungen). */
export type GridIdQuelle = Pick<IdQuelle, 'position'>;

export interface LvGridProps {
  /** Sichtbare Zeilen (aufgeklappt/zugeklappt steht in `zeile.aufgeklappt`) und Summenzeile. */
  readonly ansicht: LvAnsicht;
  /** Anzeige- und Navigationsreihenfolge der Spalten; Standard: alle sieben in der Reihenfolge von `LvSpalte`. */
  readonly spalten?: readonly LvSpalte[];
  readonly zahlen: GridZahlen;
  readonly ids: GridIdQuelle;
  /** Jede Änderung, auch jede eingefügte Zeile, geht hier als genau ein Befehl hinaus. */
  readonly onBefehl: BefehlsEmpfaenger;
  /** Der Nutzer will einen Knoten auf- oder zuklappen. Der Zustand gehört dem Aufrufer, das Grid merkt ihn sich nicht. */
  readonly onAufklappen?: (knotenId: KnotenId, aufgeklappt: boolean) => void;
  /** Die Mehrfachauswahl (Zeilen) hat sich geändert, in Anzeigereihenfolge. */
  readonly onAuswahlChange?: (knotenIds: readonly KnotenId[]) => void;
  /** Elternknoten für das Einfügen in ein leeres LV (sonst gibt es keinen Ort). */
  readonly wurzelId?: ElternId;
  /** Zugänglicher Name des Grids. */
  readonly beschriftung?: string;
  /** Spalte mit Einzug und Auf-/Zuklappknopf; Standard `kurztext`. */
  readonly baumspalte?: LvSpalte;
  /** Zeilenhöhe in Pixeln; Standard 28 (wie `--tx-control-height`). */
  readonly zeilenhoehe?: number;
}
