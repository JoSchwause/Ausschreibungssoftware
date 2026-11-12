// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüfzugang der Modellseite für Playwright (Ticket 114, D-58, D-100.3): nur im Test-Build (VITE_TESTPFAD=1; ein normaler
// Build enthält ihn nicht, die Konstante wird zur Bauzeit ersetzt). Er liest nur: den Zeichenstand der Leinwand über die Ref
// von `ui-modell` und die Auswahl der App. Tests prüfen so Zustand statt Pixel.

import type { Bildschirmpunkt, Darstellungsstand, ModellansichtRef } from '@tethys/ui-modell';
import type { RefObject } from 'react';

export interface ModellTesthaken {
  /** `null`, solange die Leinwand nicht bereit ist. */
  darstellung(): Darstellungsstand | null;
  /** Ein Punkt, an dem ein Klick dieses Bauteil trifft (Client-Koordinaten). */
  punkt(globalId: string): Bildschirmpunkt | null;
  /** Erfüllt sich, sobald die Leinwand den aktuellen Stand gezeichnet hat. */
  gezeichnet(): Promise<void>;
  /** Die Auswahl der App (GlobalIds). */
  auswahl(): readonly string[];
  /** Die Färbung, die die App der Leinwand gibt (Ticket 115): Kennzeichen je GlobalId. */
  faerbung(): Readonly<Record<string, string>>;
}

declare global {
  interface Window {
    tethysModell?: ModellTesthaken;
  }
}

const AKTIV = import.meta.env.VITE_TESTPFAD === '1';

/** Meldet den Haken an; Rückgabe: abmelden (für `useEffect`). */
export function modellTesthaken(
  ansicht: RefObject<ModellansichtRef | null>,
  auswahl: () => readonly string[],
  faerbung: () => ReadonlyMap<string, string> = () => new Map(),
): () => void {
  if (!AKTIV) return () => undefined;
  const haken: ModellTesthaken = {
    darstellung: () => ansicht.current?.darstellung() ?? null,
    punkt: (g) => ansicht.current?.bildschirmpunkt(g) ?? null,
    gezeichnet: () => ansicht.current?.gezeichnet() ?? Promise.resolve(),
    auswahl,
    faerbung: () => Object.fromEntries(faerbung()),
  };
  window.tethysModell = haken;
  return () => {
    if (window.tethysModell === haken) delete window.tethysModell;
  };
}
