// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker für die PDFs der Vergabe (Ticket 149, E11): Preisspiegel (quer) und Vergabevorschlag. Wie der LV-Druck lädt er
// `@tethys/ausgabe` (pdfmake) und die Schriften über `ui/pdf-worker-basis.ts` erst hier, nie ins Hauptbündel. Die Eingaben
// kommen fertig vom Hauptthread (Preisspiegel aus `vergabe`, Datum aus der Uhr der App: A2); der Worker rechnet nichts.

import type { PreisspiegelEingabe, VergabevorschlagEingabe } from '@tethys/ausgabe';
import { pdfWorkerBedienen } from '../ui/pdf-worker-basis';

export type Druckauftrag =
  | { readonly art: 'preisspiegel'; readonly eingabe: PreisspiegelEingabe }
  | { readonly art: 'vergabevorschlag'; readonly eingabe: VergabevorschlagEingabe };

pdfWorkerBedienen<Druckauftrag>((ausgabe, a, schriften) =>
  a.art === 'preisspiegel'
    ? ausgabe.erzeugePreisspiegelPdf(a.eingabe, schriften)
    : ausgabe.erzeugeVergabevorschlagPdf(a.eingabe, schriften),
);
