// SPDX-License-Identifier: AGPL-3.0-or-later
// PDF der Honorarberechnung (Ticket 119, 113): seit Ticket 155 im Web Worker (`pdf-worker.ts`, ADR 0012 Folgen) wie
// Bauzeitenplan und Bauleitung; `ausgabe` (pdfmake) und die Schriften lädt nur der Worker. Der Worker wird je Lauf über den
// gemeinsamen Worker-Start (`ui/pdf-lauf.ts`) angelegt und danach beendet.

import type { Befundtext, HonorarEingabe } from '@tethys/ausgabe';
import type { Honorarberechnung, Honorarergebnis } from '@tethys/vertrag';
import { PdfFehler, pdfLauf } from '../ui/pdf-lauf';

/**
 * Die Bytes des PDF; `datum` als `JJJJ-MM-TT` aus der Uhr der App (die Ausgabe selbst liest keine Uhr). `befunde`: die Befunde
 * mit den Texten der Seite (Ticket 122, D-122.1), damit Seite und PDF dasselbe sagen. Ein Fehler wird zur Ablehnung
 * (`PdfFehler`); die Seite zeigt dann ihren eigenen Satz, nie den technischen Text.
 */
export async function honorarPdf(
  berechnung: Honorarberechnung,
  ergebnis: Honorarergebnis,
  befunde: readonly Befundtext[],
  projekt: string,
  datum: string,
): Promise<Uint8Array> {
  const auftrag: HonorarEingabe = {
    berechnung,
    ergebnis,
    befundtexte: befunde.map(({ schwere, ort, text }) => ({ schwere, ort, text })),
    projekt,
    datum,
  };
  const lauf = pdfLauf(new Worker(new URL('./pdf-worker.ts', import.meta.url), { type: 'module' }), auftrag);
  const bytes = await lauf.ergebnis;
  if (bytes === null) throw new PdfFehler('PDF-Lauf ohne Ergebnis');
  return bytes;
}
