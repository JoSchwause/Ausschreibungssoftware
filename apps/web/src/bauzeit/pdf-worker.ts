// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 118: Web Worker für das PDF eines Bauzeitenplans (wie der LV-Druck, Ticket 66). `@tethys/ausgabe` (pdfmake) und die
// Schriften lädt `ui/pdf-worker-basis.ts` erst hier, nie ins Hauptbündel; die Termine hat die App vorher mit `bauzeit`
// gerechnet (A2, D-113.8).

import type { BauzeitenplanEingabe } from '@tethys/ausgabe';
import { pdfAuftraegeBedienen } from '../ui/pdf-worker-basis';

self.onmessage = pdfAuftraegeBedienen<BauzeitenplanEingabe>((ausgabe, eingabe, schriften) =>
  ausgabe.erzeugeBauzeitenplanPdf(eingabe, schriften),
);
