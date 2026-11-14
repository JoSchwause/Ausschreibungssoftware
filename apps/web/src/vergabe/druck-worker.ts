// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker für die PDFs der Vergabe (Ticket 149, E11): Preisspiegel (quer) und Vergabevorschlag. Wie der LV-Druck lädt er
// `@tethys/ausgabe` (pdfmake) erst hier, nie ins Hauptbündel. Die Eingaben kommen fertig vom Hauptthread (Preisspiegel aus
// `vergabe`, Datum aus der Uhr der App: A2); der Worker rechnet nichts.

import type { PreisspiegelEingabe, VergabevorschlagEingabe } from '@tethys/ausgabe';
import fettKursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-italic.woff?url';
import fettUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-normal.woff?url';
import kursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-italic.woff?url';
import normalUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-normal.woff?url';

export type Druckauftrag =
  | { readonly art: 'preisspiegel'; readonly eingabe: PreisspiegelEingabe }
  | { readonly art: 'vergabevorschlag'; readonly eingabe: VergabevorschlagEingabe };

export type Druckantwort =
  | { readonly art: 'fertig'; readonly bytes: Uint8Array }
  | { readonly art: 'fehler'; readonly meldung: string };

const senden = (a: Druckantwort, uebergeben: Transferable[] = []): void => {
  (self as unknown as { postMessage: (m: Druckantwort, t: Transferable[]) => void }).postMessage(
    a,
    uebergeben,
  );
};

async function laden(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Schrift nicht ladbar: ${url} (${String(r.status)})`);
  return new Uint8Array(await r.arrayBuffer());
}

self.onmessage = (e: MessageEvent<Druckauftrag>): void => {
  void (async () => {
    try {
      const [ausgabe, normal, fett, kursiv, fettKursiv] = await Promise.all([
        import('@tethys/ausgabe'),
        laden(normalUrl),
        laden(fettUrl),
        laden(kursivUrl),
        laden(fettKursivUrl),
      ]);
      const schriften = { normal, fett, kursiv, fettKursiv };
      const a = e.data;
      const bytes =
        a.art === 'preisspiegel'
          ? await ausgabe.erzeugePreisspiegelPdf(a.eingabe, schriften)
          : await ausgabe.erzeugeVergabevorschlagPdf(a.eingabe, schriften);
      senden({ art: 'fertig', bytes }, [bytes.buffer]);
    } catch (fehler) {
      senden({ art: 'fehler', meldung: fehler instanceof Error ? fehler.message : String(fehler) });
    }
  })();
};
