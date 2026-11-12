// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: ein PDF-Lauf der Bauleitung im Web Worker. Der Worker wird je Lauf angelegt und danach beendet.

import type { Druckantwort, Druckauftrag } from './pdf-worker';

/** Bytes des PDF; ein Fehler des Erzeugers wird zur Ablehnung. */
export function bauleitungPdf(auftrag: Druckauftrag): Promise<Uint8Array> {
  const worker = new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' });
  return new Promise<Uint8Array>((ok, fehler) => {
    worker.onmessage = (e: MessageEvent<Druckantwort>) => {
      worker.terminate();
      if (e.data.art === 'fertig') ok(e.data.bytes);
      else fehler(new Error(e.data.meldung));
    };
    worker.onerror = (e) => {
      worker.terminate();
      fehler(new Error(e.message || 'Der Druck-Worker ist abgestürzt.'));
    };
    worker.postMessage(auftrag);
  });
}
