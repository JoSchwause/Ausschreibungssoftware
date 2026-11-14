// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 120: Web Worker für die drei PDFs der Bauleitung (Mängelliste, Mängelanzeige, Bautagebuch; Ticket 113). Wie der
// LV-Druck (Ticket 66) lädt er `@tethys/ausgabe` (pdfmake) und die Schriften über `ui/pdf-worker-basis.ts` erst hier, nie ins
// Hauptbündel. Die Eingaben kommen fertig vom Hauptthread (Datum, Befunde und Auswahl: A2); der Worker rechnet nichts.

import type { BautagebuchEingabe, MaengelanzeigeEingabe, MaengellisteEingabe } from '@tethys/ausgabe';
import { pdfWorkerBedienen } from '../ui/pdf-worker-basis';

export type Druckauftrag =
  | { readonly art: 'maengelliste'; readonly eingabe: MaengellisteEingabe }
  | { readonly art: 'maengelanzeige'; readonly eingabe: MaengelanzeigeEingabe }
  | { readonly art: 'bautagebuch'; readonly eingabe: BautagebuchEingabe };

pdfWorkerBedienen<Druckauftrag>((ausgabe, a, schriften) =>
  a.art === 'maengelliste'
    ? ausgabe.erzeugeMaengellistePdf(a.eingabe, schriften)
    : a.art === 'maengelanzeige'
      ? ausgabe.erzeugeMaengelanzeigePdf(a.eingabe, schriften)
      : ausgabe.erzeugeBautagebuchPdf(a.eingabe, schriften),
);
