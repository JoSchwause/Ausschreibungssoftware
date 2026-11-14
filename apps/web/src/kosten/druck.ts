// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Kosten (Ticket 154, E12): Vorschau, PDF und Excel aus `ausgabe`. Das Paket wird für Vorschau und Excel erst
// beim Öffnen des Dialogs per `import()` geladen und kommt nie ins Hauptbündel. Das PDF entsteht seit dem Wellen-Review
// (SB6, ADR 0012) wie jeder Druck im Web Worker (`druck-worker.ts`) über den gemeinsamen Worker-Start (`ui/pdf-lauf.ts`).

import type { Berichtsmodell } from '@tethys/ausgabe';
import { PdfFehler, pdfLauf } from '../ui/pdf-lauf';
import type { Kostenbericht } from './druck-worker';

export type { Kostenbericht } from './druck-worker';

/** Das Berichtsmodell, das PDF und Excel lesen; die Vorschau zeigt genau dieses. */
export async function berichtModell(b: Kostenbericht): Promise<Berichtsmodell> {
  const a = await import('@tethys/ausgabe');
  return b.art === 'ermittlung'
    ? a.baueKostenermittlungModell(b.eingabe)
    : a.baueKostenkontrolleModell(b.eingabe);
}

/** Die Bytes des PDF aus dem Worker; ein Fehler wird zur Ablehnung (`PdfFehler`). */
export async function berichtPdf(b: Kostenbericht): Promise<Uint8Array> {
  const lauf = pdfLauf(new Worker(new URL('./druck-worker.ts', import.meta.url), { type: 'module' }), b);
  const bytes = await lauf.ergebnis;
  if (bytes === null) throw new PdfFehler('PDF-Lauf ohne Ergebnis');
  return bytes;
}

export async function berichtExcel(b: Kostenbericht): Promise<Uint8Array> {
  const a = await import('@tethys/ausgabe');
  return b.art === 'ermittlung'
    ? a.kostenermittlungAlsExcel(b.eingabe)
    : a.kostenkontrolleAlsExcel(b.eingabe);
}
