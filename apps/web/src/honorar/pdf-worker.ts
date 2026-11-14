// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker für das PDF der Honorarberechnung (Ticket 155, Rest aus Ticket 123 Punkt 4; ADR 0012 Folgen): wie Bauzeitenplan
// und Bauleitung. `@tethys/ausgabe` (pdfmake) und die Schriften lädt `ui/pdf-worker-basis.ts` erst hier, nie ins Hauptbündel;
// gerechnet hat die App vorher mit `honorar` (A2).

import type { HonorarEingabe } from '@tethys/ausgabe';
import { pdfAuftraegeBedienen } from '../ui/pdf-worker-basis';

self.onmessage = pdfAuftraegeBedienen<HonorarEingabe>((ausgabe, eingabe, schriften) =>
  ausgabe.erzeugeHonorarPdf(eingabe, schriften),
);
