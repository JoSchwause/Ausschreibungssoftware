// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Einfuegeort, KnotenId, LvBefehl, LvSpalte } from '@tethys/vertrag';

declare global {
  interface Window {
    /** Schnittstelle der Testseite für Playwright. */
    __harness: {
      /** Alle vom Grid ausgegebenen Befehle in Reihenfolge. */
      befehle: LvBefehl[];
      /** Aktuell ausgewählte Knoten. */
      auswahl: string[];
      /** Wendet die aufgezeichneten Befehle an und gibt dem Grid damit neue Eigenschaften (Modus attrappe). */
      uebernehmen: () => void;
      ausstehend: () => number;
      /** Befehlsfolgen über `onBefehlsfolge` (nur mit `folge=1`); ihre Befehle stehen zusätzlich in `befehle`. */
      folgen: LvBefehl[][];
      /** Aufrufe von `onKopieEinfuegen` (nur mit `kopie=1`). */
      kopien: { knotenIds: KnotenId[]; ort: Einfuegeort }[];
      /** Setzt das Sprungziel (neue `nr` je Aufruf). */
      springe: (knotenId: string, spalte?: LvSpalte) => void;
    };
  }
}
