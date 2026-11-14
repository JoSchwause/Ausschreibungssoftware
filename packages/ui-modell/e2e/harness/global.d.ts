// SPDX-License-Identifier: AGPL-3.0-or-later
import type { IfcGlobalId } from '@tethys/vertrag';
import type {
  Bauteilkennzeichen,
  Bildschirmpunkt,
  Darstellungsstand,
  Ladebericht,
  Modellfehler,
} from '../../src/index';

/** Die Eingaben der Leinwand, wie die Testseite sie als App hält (Färbung als Objekt, damit Playwright sie übergibt). */
export interface Pruefeingaben {
  // Ticket 155: GlobalIds mit der Marke des Vertrags wie in der Modellansicht (D-140.7).
  auswahl: IfcGlobalId[];
  ausgeblendet: IfcGlobalId[];
  isoliert: IfcGlobalId[] | null;
  faerbung: Record<IfcGlobalId, Bauteilkennzeichen>;
}

declare global {
  interface Window {
    /** Prüfzugang der Testseite für Playwright (nur im Prüfstand, nie ausgeliefert). */
    __modell: {
      ereignisse: {
        auswahl: { globalIds: string[]; hinzufuegen: boolean }[];
        /** `seitUebergabeMs`: von der Übergabe der Bytes bis `onGeladen`, nach Abschluss der GPU-Arbeit gemessen */
        geladen: (Ladebericht & { seitUebergabeMs: number })[];
        fehler: Modellfehler[];
      };
      /** Setzt Eingaben der Leinwand; erfüllt sich, wenn React sie übernommen hat. */
      setzen: (teil: Partial<Pruefeingaben>) => Promise<void>;
      eingaben: () => Pruefeingaben;
      darstellung: () => Darstellungsstand;
      punkt: (globalId: string) => Bildschirmpunkt | null;
      auswahlZeigen: () => Promise<void>;
      ansichtZuruecksetzen: () => Promise<void>;
      /** Klick (Zeigerereignisse) auf das Bauteil bis zum gezeichneten, hervorgehobenen Bild, in Millisekunden */
      messePicken: (globalId: string) => Promise<number>;
      /** Name des WebGL-Renderers (z. B. SwiftShader) */
      renderer: () => string;
    };
  }
}
