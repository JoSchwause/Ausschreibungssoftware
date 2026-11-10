// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LvBefehl } from '@tethys/vertrag';

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
    };
  }
}
