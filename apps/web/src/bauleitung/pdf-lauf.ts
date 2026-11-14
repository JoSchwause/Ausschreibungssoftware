// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: ein PDF-Lauf der Bauleitung im Web Worker, über den gemeinsamen Worker-Start (`ui/pdf-lauf.ts`).

import { PdfFehler, pdfLauf } from '../ui/pdf-lauf';
import type { Druckauftrag } from './pdf-worker';

/** Bytes des PDF; ein Fehler des Erzeugers wird zur Ablehnung (`PdfFehler`). */
export async function bauleitungPdf(auftrag: Druckauftrag): Promise<Uint8Array> {
  const lauf = pdfLauf(new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' }), auftrag);
  const bytes = await lauf.ergebnis;
  // Ohne Abbrechen gibt es kein `null`; die Prüfung hält nur den Typ ehrlich.
  if (bytes === null) throw new PdfFehler('PDF-Lauf ohne Ergebnis');
  return bytes;
}
