// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffentliche Typen der Modellansicht (3D-Leinwand). Bauteile kennt die Leinwand nur über ihre GlobalId (D-50).

import type { Ref } from 'react';
import type { Bauteilkennzeichen } from './darstellung';
import type { Kamerastand } from './kamera';

export interface Ladebericht {
  /** GlobalIds der gezeichneten Bauteile, jede einmal */
  readonly mitGeometrie: readonly string[];
  /**
   * GlobalIds der Bauteile (IfcElement außer Öffnungen und virtuellen Elementen), für die web-ifc keine Geometrie liefert.
   * Die App gleicht über die GlobalId mit ihrem eigenen Leser ab (D-50).
   */
  readonly ohneGeometrie: readonly string[];
  /** Millisekunden von der Übergabe der Datei bis zur ersten vollständigen Darstellung */
  readonly dauerMs: number;
}

export type Modellfehlercode = 'webgl-fehlt' | 'datei-nicht-lesbar' | 'worker-fehler';

export interface Modellfehler {
  readonly code: Modellfehlercode;
  /** technische Meldung für das Protokoll; der Text für den Nutzer steht in der Leinwand */
  readonly meldung: string;
}

export interface Bildschirmpunkt {
  /** wie `MouseEvent.clientX` und `clientY` */
  readonly x: number;
  readonly y: number;
}

/** Was die Leinwand gerade zeichnet, gelesen aus der Szene (nicht aus den Eingaben). */
export interface Darstellungsstand {
  readonly geladen: boolean;
  /** Zahl der gezeichneten Bauteile (eine doppelte GlobalId zählt je Bauteil) */
  readonly bauteile: number;
  /** GlobalIds der sichtbaren Bauteile, jede einmal */
  readonly sichtbar: readonly string[];
  /** GlobalIds der Bauteile in der Farbe der Auswahl, jede einmal */
  readonly hervorgehoben: readonly string[];
  /** gezeichnete Farbe je GlobalId als `#rrggbb` (sRGB) */
  readonly farben: Readonly<Record<string, string>>;
  /** Hintergrund als `#rrggbb` */
  readonly hintergrund: string;
  readonly kamera: Kamerastand;
  /** Zahl der gezeichneten Bilder seit dem Start */
  readonly bilder: number;
}

export interface ModellansichtRef {
  /** Kamera auf die ausgewählten Bauteile (wie Taste F); ohne Auswahl geschieht nichts. */
  auswahlZeigen(): void;
  /** Startansicht auf das ganze Modell (wie Taste Pos1). */
  ansichtZuruecksetzen(): void;
  /** Der Zeichenstand, z. B. für Testpfade der App. */
  darstellung(): Darstellungsstand;
  /**
   * Ein Punkt der Leinwand (Client-Koordinaten), an dem ein Klick dieses Bauteil trifft, möglichst nahe seiner Mitte;
   * `null`, wenn es nicht sichtbar oder ganz verdeckt ist.
   */
  bildschirmpunkt(globalId: string): Bildschirmpunkt | null;
  /** Erfüllt sich, sobald die Leinwand den aktuellen Stand gezeichnet hat. */
  gezeichnet(): Promise<void>;
}

export interface ModellansichtProps {
  /** Die Bytes der IFC-Datei. Eine neue Datei (anderes Objekt) lädt neu. */
  readonly datei: Uint8Array;
  /** GlobalIds der ausgewählten Bauteile */
  readonly auswahl: readonly string[];
  readonly ausgeblendet: readonly string[];
  /** `null`: nichts isoliert; sonst sind nur diese Bauteile sichtbar */
  readonly isoliert: readonly string[] | null;
  /** Kennzeichen je GlobalId; die Farben kommen aus den Design-Tokens (U4) */
  readonly faerbung: ReadonlyMap<string, Bauteilkennzeichen>;
  /** Klick: das getroffene Bauteil oder `[]` (ins Leere); Strg+Klick: `hinzufuegen` */
  readonly onAuswahl: (globalIds: readonly string[], art: { readonly hinzufuegen: boolean }) => void;
  readonly onGeladen?: (bericht: Ladebericht) => void;
  readonly onFehler?: (fehler: Modellfehler) => void;
  /** Name der Leinwand für Screenreader, Standard „3D-Ansicht des Modells“ */
  readonly beschriftung?: string;
  readonly ref?: Ref<ModellansichtRef>;
}
