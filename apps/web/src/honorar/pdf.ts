// SPDX-License-Identifier: AGPL-3.0-or-later
// PDF der Honorarberechnung (Ticket 119, 113): seit Ticket 155 im Web Worker (`pdf-worker.ts`, ADR 0012 Folgen) wie
// Bauzeitenplan und Bauleitung; `ausgabe` (pdfmake) und die Schriften lädt nur der Worker. Der Worker wird je Lauf angelegt
// und danach beendet.

import type { Befundtext } from '@tethys/ausgabe';
import type { Honorarberechnung, Honorarergebnis } from '@tethys/vertrag';
import type { HonorarPdfAntwort } from './pdf-worker';

/**
 * Die Bytes des PDF; `datum` als `JJJJ-MM-TT` aus der Uhr der App (die Ausgabe selbst liest keine Uhr). `befunde`: die Befunde
 * mit den Texten der Seite (Ticket 122, D-122.1), damit Seite und PDF dasselbe sagen.
 */
export function honorarPdf(
  berechnung: Honorarberechnung,
  ergebnis: Honorarergebnis,
  befunde: readonly Befundtext[],
  projekt: string,
  datum: string,
): Promise<Uint8Array> {
  const worker = new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' });
  return new Promise<Uint8Array>((ok, fehler) => {
    worker.onmessage = (e: MessageEvent<HonorarPdfAntwort>) => {
      worker.terminate();
      if (e.data.art === 'fertig') ok(e.data.bytes);
      else fehler(new Error(e.data.meldung));
    };
    worker.onerror = (e) => {
      worker.terminate();
      fehler(new Error(e.message || 'Der Druck-Worker ist abgestürzt.'));
    };
    worker.postMessage({
      berechnung,
      ergebnis,
      befundtexte: befunde.map(({ schwere, ort, text }) => ({ schwere, ort, text })),
      projekt,
      datum,
    });
  });
}
