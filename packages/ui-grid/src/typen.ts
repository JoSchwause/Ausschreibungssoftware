// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffentliche Typen des Grids. Das Grid ist vollständig gesteuert (controlled): Zeilen, Spalten und Summen
// kommen als Eigenschaften herein, jede Änderung geht als Befehl hinaus (A5). Es rechnet nie (N1, A5).

import type {
  Befehlshinweis,
  BefehlsEmpfaenger,
  Einfuegeort,
  GridIdQuelle,
  GridZahlen,
  KnotenId,
  LvAnsicht,
  LvBefehl,
  LvSpalte,
  PositionAnlegen,
} from '@tethys/vertrag';

/** Ziel eines Sprunglinks (Ticket 46, Punkt 8): Ändert sich `nr`, springt das Grid zur Zelle. */
export interface Sprungziel {
  readonly knotenId: KnotenId;
  /** Spalte der Zelle; ohne Angabe bleibt die aktive Spalte. */
  readonly spalte?: LvSpalte;
  /** Zähler des Aufrufers: Jeder neue Wert ist ein neuer Sprung, auch zum selben Knoten. */
  readonly nr: number;
}

/** Eigenschaften, die ein bearbeitbares und ein schreibgeschütztes Grid gleich haben. */
interface LvGridGemeinsam {
  /**
   * Sichtbare Zeilen (aufgeklappt/zugeklappt steht in `zeile.aufgeklappt`), Summenzeile und Wurzel. In ein leeres LV
   * fügt das Grid am Ende von `ansicht.wurzelId` ein.
   */
  readonly ansicht: LvAnsicht;
  /** Anzeige- und Navigationsreihenfolge der Spalten; Standard: alle sieben in der Reihenfolge von `LvSpalte`. */
  readonly spalten?: readonly LvSpalte[];
  /** Zahlenränder (N4); die App schließt sie an `dezimal` an. */
  readonly zahlen: GridZahlen;
  /** Sprung zu einer Zelle (Prüf-Links). Steht die Zeile nicht in der Ansicht (zugeklappt), tut das Grid nichts. */
  readonly sprungziel?: Sprungziel;
  /** Der Nutzer will einen Knoten auf- oder zuklappen. Der Zustand gehört dem Aufrufer, das Grid merkt ihn sich nicht. */
  readonly onAufklappen?: (knotenId: KnotenId, aufgeklappt: boolean) => void;
  /** Die Mehrfachauswahl (Zeilen) hat sich geändert, in Anzeigereihenfolge. */
  readonly onAuswahlChange?: (knotenIds: readonly KnotenId[]) => void;
  /**
   * Die aktive Zeile hat sich geändert (Ticket 54, Punkt 1): die Zeile der aktiven Zelle, an der Strg+Plus, Strg+V
   * und Tab ins Grid ansetzen. Gemeldet wird nach dem Rendern, sobald sie sich ändert, auch beim ersten Rendern (ohne
   * Klick ist es die erste Zeile), beim Fokus per Tab und wenn die Zeile aus der Ansicht verschwindet; `null` im
   * leeren LV.
   */
  readonly onAktiveZeileChange?: (knotenId: KnotenId | null) => void;
  /**
   * Der Nutzer will eine Zeile öffnen (Ticket 54, Punkt 2), z. B. für den Positionsdialog: Strg+Enter auf einer Zelle
   * oder Doppelklick auf eine Zelle, die sich nicht bearbeiten lässt (im schreibgeschützten Grid: jede Zelle). Ein
   * Doppelklick auf eine bearbeitbare Zelle bearbeitet sie weiter (U3). Das Grid meldet jede Zeilenart; was geöffnet
   * wird, entscheidet die App.
   */
  readonly onZeileOeffnen?: (knotenId: KnotenId, spalte: LvSpalte) => void;
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

/** Das bearbeitbare Grid: Jede Änderung geht als Befehl hinaus. */
export interface LvGridBearbeitbar extends LvGridGemeinsam {
  readonly schreibgeschuetzt?: false;
  /**
   * Kennungen für neue Positionen und Papierkorbeinträge (A2: das Grid erzeugt nie selbst Kennungen). Ein Zuschnitt der
   * einen `IdQuelle` des Vertrags.
   */
  readonly ids: GridIdQuelle;
  /** Jede Änderung, auch jede eingefügte Zeile, geht hier als genau ein Befehl hinaus. */
  readonly onBefehl: BefehlsEmpfaenger;
  /**
   * Mehrere Befehle aus einer Benutzeraktion (Einfügen aus der Zwischenablage) als **eine** Folge, damit die App sie
   * als einen Undo-Schritt führt. Fehlt die Eigenschaft, gehen die Befehle einzeln über `onBefehl`.
   */
  readonly onBefehlsfolge?: (befehle: readonly LvBefehl[]) => void;
  /**
   * Einfügen nach Strg+C im selben Grid: die kopierten obersten Knoten und der Ort hinter der aktiven Zeile. Die App
   * baut daraus `KnotenEinfuegen` mit Langtext, Merkmalen und Unterknoten (die Kopie baut der Kern, nicht das Grid).
   * Fehlt die Eigenschaft, fügt das Grid den Text wie aus Excel ein (neue Positionen).
   */
  readonly onKopieEinfuegen?: (knotenIds: readonly KnotenId[], ort: Einfuegeort) => void;
  /**
   * Strg+Plus legt eine leere Position an; hier kann die App den Befehl ergänzen (z. B. die OZ), bevor er hinausgeht.
   * Die Kennung muss bleiben, sonst findet das Grid die neue Zeile nicht. Ohne die Eigenschaft geht er ohne OZ hinaus.
   */
  readonly vorPositionAnlegen?: (befehl: PositionAnlegen) => PositionAnlegen;
  /**
   * Genaue Zahl der Positionen in diesen Knoten samt aller, auch zugeklappter Unterknoten (Ticket 54, Punkt 4), für
   * die Rückfrage beim Löschen. Ohne die Eigenschaft zählt das Grid die sichtbaren Zeilen und sagt bei zugeklappten
   * Knoten „mindestens“.
   */
  readonly positionenZaehlen?: (knotenIds: readonly KnotenId[]) => number;
}

/**
 * Das schreibgeschützte Grid (Ticket 54, Punkt 3), z. B. für einen LV-Stand oder ein Auftrags-LV: kein Zelleditor,
 * keine Zeilenaktionen außer Kopieren (Strg+C), kein Befehl. Fokus, Navigation, Auswahl, Auf- und Zuklappen, Sprungziel
 * und Zeile öffnen bleiben. Der Versuch zu ändern wird angesagt.
 */
export interface LvGridSchreibgeschuetzt extends LvGridGemeinsam {
  readonly schreibgeschuetzt: true;
  readonly ids?: never;
  readonly onBefehl?: never;
  readonly onBefehlsfolge?: never;
  readonly onKopieEinfuegen?: never;
  readonly vorPositionAnlegen?: never;
  readonly positionenZaehlen?: never;
}

export type LvGridProps = LvGridBearbeitbar | LvGridSchreibgeschuetzt;
