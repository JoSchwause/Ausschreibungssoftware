// SPDX-License-Identifier: AGPL-3.0-or-later
// Ausgaben der Kosten (Ticket 154, E12): Vorschau, PDF und Excel aus `ausgabe`. Das Paket (pdfmake) wird erst beim Öffnen
// des Dialogs per `import()` geladen und kommt nie ins Hauptbündel; die Schriften kommen über den Export
// `./schriften/*.woff` des Pakets (S9) wie beim LV-Druck. Die Berichte sind klein (eine Zeile je Kostengruppe): Sie entstehen
// im Hauptthread wie die Honorarberechnung, ohne eigenen Worker.

import type { Berichtsmodell, KostenermittlungEingabe, KostenkontrolleEingabe } from '@tethys/ausgabe';
import fettKursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-italic.woff?url';
import fettUrl from '@tethys/ausgabe/schriften/noto-sans-latin-700-normal.woff?url';
import kursivUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-italic.woff?url';
import normalUrl from '@tethys/ausgabe/schriften/noto-sans-latin-400-normal.woff?url';

export type Kostenbericht =
  | { readonly art: 'ermittlung'; readonly eingabe: KostenermittlungEingabe }
  | { readonly art: 'kontrolle'; readonly eingabe: KostenkontrolleEingabe };

async function schrift(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Schrift nicht ladbar: ${url} (${String(r.status)})`);
  return new Uint8Array(await r.arrayBuffer());
}

/** Das Berichtsmodell, das PDF und Excel lesen; die Vorschau zeigt genau dieses. */
export async function berichtModell(b: Kostenbericht): Promise<Berichtsmodell> {
  const a = await import('@tethys/ausgabe');
  return b.art === 'ermittlung'
    ? a.baueKostenermittlungModell(b.eingabe)
    : a.baueKostenkontrolleModell(b.eingabe);
}

export async function berichtPdf(b: Kostenbericht): Promise<Uint8Array> {
  const [a, normal, fett, kursiv, fettKursiv] = await Promise.all([
    import('@tethys/ausgabe'),
    schrift(normalUrl),
    schrift(fettUrl),
    schrift(kursivUrl),
    schrift(fettKursivUrl),
  ]);
  const s = { normal, fett, kursiv, fettKursiv };
  return b.art === 'ermittlung'
    ? a.erzeugeKostenermittlungPdf(b.eingabe, s)
    : a.erzeugeKostenkontrollePdf(b.eingabe, s);
}

export async function berichtExcel(b: Kostenbericht): Promise<Uint8Array> {
  const a = await import('@tethys/ausgabe');
  return b.art === 'ermittlung'
    ? a.kostenermittlungAlsExcel(b.eingabe)
    : a.kostenkontrolleAlsExcel(b.eingabe);
}
