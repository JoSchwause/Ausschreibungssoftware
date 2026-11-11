// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: ein PDF-Lauf im Web Worker, abbrechbar. Der Worker wird je Lauf angelegt und danach beendet; Abbrechen
// beendet ihn sofort (die Seite bleibt bedienbar, es bleibt nichts zurück).

import type { PdfOptionen } from '@tethys/ausgabe';
import type { LvZustand } from '@tethys/vertrag';
import type { PdfAntwort, PdfAuftrag } from './pdf-worker';

export type PdfSchritt = 'schriften' | 'setzen';

export interface PdfLauf {
  /** Bytes des PDF; `null`, wenn der Lauf abgebrochen wurde. Ein Fehler des Erzeugers wird zur Ablehnung. */
  readonly ergebnis: Promise<Uint8Array | null>;
  abbrechen: () => void;
}

export function pdfErzeugen(
  zustand: LvZustand,
  optionen: PdfOptionen,
  beiSchritt: (s: PdfSchritt) => void,
): PdfLauf {
  const worker = new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' });
  let fertig: (b: Uint8Array | null) => void = () => undefined;
  const ergebnis = new Promise<Uint8Array | null>((ok, fehler) => {
    fertig = ok;
    worker.onmessage = (e: MessageEvent<PdfAntwort>) => {
      const a = e.data;
      if (a.art === 'schritt') beiSchritt(a.schritt);
      else {
        worker.terminate();
        if (a.art === 'fertig') ok(a.bytes);
        else fehler(new Error(a.meldung));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      fehler(new Error(e.message || 'Der Druck-Worker ist abgestürzt.'));
    };
  });
  const auftrag: PdfAuftrag = { zustand, optionen };
  worker.postMessage(auftrag);
  return {
    ergebnis,
    abbrechen: () => {
      worker.terminate();
      fertig(null);
    },
  };
}
