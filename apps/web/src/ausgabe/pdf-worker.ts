// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: Web Worker für den LV-Druck (Ticket 28 maß 2,5–3 s bei 5.000 Zeilen; der Hauptthread bleibt bedienbar).
// `@tethys/ausgabe` (pdfmake) wird erst hier per `import()` geladen und kommt nie ins Hauptbündel. Die Schriften kommen
// über den Export `./schriften/*.woff` des Pakets (S9), nicht über einen Pfad in dessen Ordner.

import type { PdfOptionen } from '@tethys/ausgabe';
import type { LvZustand } from '@tethys/vertrag';
import fettKursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-italic.woff?url';
import fettUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-normal.woff?url';
import kursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-italic.woff?url';
import normalUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-normal.woff?url';

export interface PdfAuftrag {
  readonly zustand: LvZustand;
  readonly optionen: PdfOptionen;
}

export type PdfAntwort =
  | { readonly art: 'schritt'; readonly schritt: 'schriften' | 'setzen' }
  | { readonly art: 'fertig'; readonly bytes: Uint8Array }
  | { readonly art: 'fehler'; readonly meldung: string };

const senden = (a: PdfAntwort, uebergeben: Transferable[] = []): void => {
  (self as unknown as { postMessage: (m: PdfAntwort, t: Transferable[]) => void }).postMessage(a, uebergeben);
};

async function laden(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Schrift nicht ladbar: ${url} (${String(r.status)})`);
  return new Uint8Array(await r.arrayBuffer());
}

self.onmessage = (e: MessageEvent<PdfAuftrag>): void => {
  void (async () => {
    try {
      senden({ art: 'schritt', schritt: 'schriften' });
      const [ausgabe, normal, fett, kursiv, fettKursiv] = await Promise.all([
        import('@tethys/ausgabe'),
        laden(normalUrl),
        laden(fettUrl),
        laden(kursivUrl),
        laden(fettKursivUrl),
      ]);
      senden({ art: 'schritt', schritt: 'setzen' });
      const bytes = await ausgabe.erzeugePdf(
        e.data.zustand,
        { normal, fett, kursiv, fettKursiv },
        e.data.optionen,
      );
      senden({ art: 'fertig', bytes }, [bytes.buffer]);
    } catch (fehler) {
      senden({ art: 'fehler', meldung: fehler instanceof Error ? fehler.message : String(fehler) });
    }
  })();
};
