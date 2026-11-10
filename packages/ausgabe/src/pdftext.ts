// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Text eines PDF mit pdf.js zurücklesen (Apache-2.0), je Seite mit Position der Textstücke.

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface Textstueck {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

export interface PdfInhalt {
  readonly seiten: readonly (readonly Textstueck[])[];
  readonly schriftnamen: readonly string[];
}

export async function liesPdf(bytes: Uint8Array): Promise<PdfInhalt> {
  const aufgabe = getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: 0 });
  const dok = await aufgabe.promise;
  const seiten: Textstueck[][] = [];
  const schriftnamen = new Set<string>();
  for (let nr = 1; nr <= dok.numPages; nr++) {
    const seite = await dok.getPage(nr);
    const inhalt = await seite.getTextContent();
    const stuecke: Textstueck[] = [];
    for (const item of inhalt.items) {
      if (!('str' in item)) continue;
      stuecke.push({ text: item.str, x: item.transform[4] as number, y: item.transform[5] as number });
    }
    for (const stil of Object.values(inhalt.styles)) schriftnamen.add(stil.fontFamily);
    seiten.push(stuecke);
  }
  await aufgabe.destroy();
  return { seiten, schriftnamen: [...schriftnamen] };
}

/** Gesamter Text, Seiten durch Zeilenumbruch getrennt, Textstücke durch Leerzeichen. */
export const alsText = (inhalt: PdfInhalt): string =>
  inhalt.seiten.map((s) => s.map((t) => t.text).join(' ')).join('\n');
