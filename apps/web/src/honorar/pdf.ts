// SPDX-License-Identifier: AGPL-3.0-or-later
// PDF der Honorarberechnung (Ticket 119, 113): `ausgabe` (pdfmake) wird erst beim Klick per `import()` geladen und kommt nie
// ins Hauptbündel. Die Schriften kommen über den Export `./schriften/*.woff` des Pakets (S9) wie beim LV-Druck.

import type { Honorarberechnung, Honorarergebnis } from '@tethys/vertrag';
import fettKursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-italic.woff?url';
import fettUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-normal.woff?url';
import kursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-italic.woff?url';
import normalUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-normal.woff?url';

async function laden(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Schrift nicht ladbar: ${url} (${String(r.status)})`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Die Bytes des PDF; `datum` als `JJJJ-MM-TT` aus der Uhr der App (die Ausgabe selbst liest keine Uhr). */
export async function honorarPdf(
  berechnung: Honorarberechnung,
  ergebnis: Honorarergebnis,
  projekt: string,
  datum: string,
): Promise<Uint8Array> {
  const [ausgabe, normal, fett, kursiv, fettKursiv] = await Promise.all([
    import('@tethys/ausgabe'),
    laden(normalUrl),
    laden(fettUrl),
    laden(kursivUrl),
    laden(fettKursivUrl),
  ]);
  return ausgabe.erzeugeHonorarPdf(
    { berechnung, ergebnis, projekt, datum },
    { normal, fett, kursiv, fettKursiv },
  );
}
