// SPDX-License-Identifier: AGPL-3.0-or-later
// Web Worker für das PDF der Honorarberechnung (Ticket 155, Rest aus Ticket 123 Punkt 4; ADR 0012 Folgen): wie Bauzeitenplan
// und Bauleitung. `@tethys/ausgabe` (pdfmake) wird erst hier geladen und kommt nie ins Hauptbündel; gerechnet hat die App
// vorher mit `honorar` (A2).

import type { HonorarEingabe } from '@tethys/ausgabe';
import fettKursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-italic.woff?url';
import fettUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-normal.woff?url';
import kursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-italic.woff?url';
import normalUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-normal.woff?url';

export type HonorarPdfAntwort =
  | { readonly art: 'fertig'; readonly bytes: Uint8Array }
  | { readonly art: 'fehler'; readonly meldung: string };

const senden = (a: HonorarPdfAntwort, uebergeben: Transferable[] = []): void => {
  (self as unknown as { postMessage: (m: HonorarPdfAntwort, t: Transferable[]) => void }).postMessage(
    a,
    uebergeben,
  );
};

async function laden(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Schrift nicht ladbar: ${url} (${String(r.status)})`);
  return new Uint8Array(await r.arrayBuffer());
}

self.onmessage = (e: MessageEvent<HonorarEingabe>): void => {
  void (async () => {
    try {
      const [ausgabe, normal, fett, kursiv, fettKursiv] = await Promise.all([
        import('@tethys/ausgabe'),
        laden(normalUrl),
        laden(fettUrl),
        laden(kursivUrl),
        laden(fettKursivUrl),
      ]);
      const bytes = await ausgabe.erzeugeHonorarPdf(e.data, { normal, fett, kursiv, fettKursiv });
      senden({ art: 'fertig', bytes }, [bytes.buffer]);
    } catch (fehler) {
      senden({ art: 'fehler', meldung: fehler instanceof Error ? fehler.message : String(fehler) });
    }
  })();
};
