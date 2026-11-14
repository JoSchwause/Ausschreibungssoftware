// SPDX-License-Identifier: AGPL-3.0-or-later
// Gegenseite von `pdf-lauf.ts` im Web Worker (ADR 0012 Folgen; Wellen-Review SB7): der eine Schriftlader und die eine
// Antwortschleife aller PDF-Worker. Nur aus Worker-Dateien importieren: `@tethys/ausgabe` (pdfmake) wird erst hier per
// `import()` geladen und kommt nie ins Hauptbündel; die Schriften kommen über den Export `./schriften/*.woff` des Pakets (S9).

import type { Schriften } from '@tethys/ausgabe';
import fettKursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-italic.woff?url';
import fettUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-normal.woff?url';
import kursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-italic.woff?url';
import normalUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-normal.woff?url';
import type { PdfAntwort } from './pdf-lauf';

export type Ausgabe = typeof import('@tethys/ausgabe');

async function laden(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  // Technischer Text: Er erreicht nur die Einzelheiten, die Dialoge zeigen ihren eigenen Satz (`PdfFehler`).
  if (!r.ok) throw new Error(`Schrift nicht ladbar: ${url} (${String(r.status)})`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Die vier Schnitte der Schrift für pdfmake. */
export async function schriftenLaden(): Promise<Schriften> {
  const [normal, fett, kursiv, fettKursiv] = await Promise.all([
    laden(normalUrl),
    laden(fettUrl),
    laden(kursivUrl),
    laden(fettKursivUrl),
  ]);
  return { normal, fett, kursiv, fettKursiv };
}

const senden = (a: PdfAntwort, uebergeben: Transferable[] = []): void => {
  (self as unknown as { postMessage: (m: PdfAntwort, t: Transferable[]) => void }).postMessage(a, uebergeben);
};

/**
 * Die Antwortschleife eines PDF-Workers (`self.onmessage = pdfAuftraegeBedienen(…)`): meldet die Schritte `schriften` und
 * `setzen` (der LV-Druck zeigt sie an), lädt `ausgabe` und die Schriften, ruft
 * `erzeugen` und schickt die Bytes (übergeben, nicht kopiert) oder den Fehler zurück. Der Worker rechnet nichts (A2); die
 * Eingaben kommen fertig vom Hauptthread.
 */
export function pdfAuftraegeBedienen<A>(
  erzeugen: (ausgabe: Ausgabe, auftrag: A, schriften: Schriften) => Promise<Uint8Array>,
): (e: MessageEvent<A>) => void {
  return (e) => {
    void (async () => {
      try {
        senden({ art: 'schritt', schritt: 'schriften' });
        const [ausgabe, schriften] = await Promise.all([import('@tethys/ausgabe'), schriftenLaden()]);
        senden({ art: 'schritt', schritt: 'setzen' });
        const bytes = await erzeugen(ausgabe, e.data, schriften);
        senden({ art: 'fertig', bytes }, [bytes.buffer]);
      } catch (fehler) {
        senden({ art: 'fehler', meldung: fehler instanceof Error ? fehler.message : String(fehler) });
      }
    })();
  };
}
