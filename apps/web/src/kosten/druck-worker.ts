// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker für die PDFs der Kosten (Wellen-Review SB6, ADR 0012 „aus einem Worker“): Kostenermittlung und Kostenkontrolle.
// Wie die übrigen Drucke lädt er `@tethys/ausgabe` (pdfmake) und die Schriften über `ui/pdf-worker-basis.ts` erst hier. Die
// Eingaben kommen fertig vom Hauptthread (A2); der Worker rechnet nichts.

import type { KostenermittlungEingabe, KostenkontrolleEingabe } from '@tethys/ausgabe';
import { pdfAuftraegeBedienen } from '../ui/pdf-worker-basis';

export type Kostenbericht =
  | { readonly art: 'ermittlung'; readonly eingabe: KostenermittlungEingabe }
  | { readonly art: 'kontrolle'; readonly eingabe: KostenkontrolleEingabe };

self.onmessage = pdfAuftraegeBedienen<Kostenbericht>((ausgabe, b, schriften) =>
  b.art === 'ermittlung'
    ? ausgabe.erzeugeKostenermittlungPdf(b.eingabe, schriften)
    : ausgabe.erzeugeKostenkontrollePdf(b.eingabe, schriften),
);
