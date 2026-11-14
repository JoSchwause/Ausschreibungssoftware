// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker für die PDFs der Vergabe (Ticket 149, E11): Preisspiegel (quer) und Vergabevorschlag; seit Ticket 152 (D-98)
// auch Aufmaßblatt, Soll/Ist und Rechnungsprüfung, die über `PdfMitVorschau` derselben Seite drucken. Wie der LV-Druck lädt
// er `@tethys/ausgabe` (pdfmake) und die Schriften über `ui/pdf-worker-basis.ts` erst hier, nie ins Hauptbündel. Die
// Eingaben kommen fertig vom Hauptthread (Preisspiegel aus `vergabe`, Datum aus der Uhr der App: A2); der Worker rechnet nichts.

import type {
  AufmassblattEingabe,
  PreisspiegelEingabe,
  RechnungspruefungEingabe,
  SollIstEingabe,
  VergabevorschlagEingabe,
} from '@tethys/ausgabe';
import { pdfAuftraegeBedienen } from '../ui/pdf-worker-basis';

export type Druckauftrag =
  | { readonly art: 'preisspiegel'; readonly eingabe: PreisspiegelEingabe }
  | { readonly art: 'vergabevorschlag'; readonly eingabe: VergabevorschlagEingabe }
  | { readonly art: 'aufmassblatt'; readonly eingabe: AufmassblattEingabe }
  | { readonly art: 'soll-ist'; readonly eingabe: SollIstEingabe }
  | { readonly art: 'rechnungspruefung'; readonly eingabe: RechnungspruefungEingabe };

self.onmessage = pdfAuftraegeBedienen<Druckauftrag>((ausgabe, a, schriften) =>
  a.art === 'preisspiegel'
    ? ausgabe.erzeugePreisspiegelPdf(a.eingabe, schriften)
    : a.art === 'vergabevorschlag'
      ? ausgabe.erzeugeVergabevorschlagPdf(a.eingabe, schriften)
      : a.art === 'aufmassblatt'
        ? ausgabe.erzeugeAufmassblattPdf(a.eingabe, schriften)
        : a.art === 'soll-ist'
          ? ausgabe.erzeugeSollIstPdf(a.eingabe, schriften)
          : ausgabe.erzeugeRechnungspruefungPdf(a.eingabe, schriften),
);
