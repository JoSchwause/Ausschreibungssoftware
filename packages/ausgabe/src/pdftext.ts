// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: Text eines PDF mit pdf.js zurücklesen (Apache-2.0), je Seite mit Position der Textstücke.

import { OPS, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

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

/** Gezeichnete Bilder je Seite mit ihrer Größe auf dem Papier in pt (aus der Transformationsmatrix vor dem Zeichnen). */
export async function liesBildgroessen(
  bytes: Uint8Array,
): Promise<readonly (readonly { breite: number; hoehe: number }[])[]> {
  const aufgabe = getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: 0 });
  const dok = await aufgabe.promise;
  const seiten: { breite: number; hoehe: number }[][] = [];
  for (let nr = 1; nr <= dok.numPages; nr++) {
    const seite = await dok.getPage(nr);
    const liste = await seite.getOperatorList();
    const bilder: { breite: number; hoehe: number }[] = [];
    let matrix: readonly number[] = [1, 0, 0, 1, 0, 0];
    liste.fnArray.forEach((fn, i) => {
      if (fn === OPS.transform) matrix = liste.argsArray[i] as number[];
      if (fn === OPS.paintImageXObject)
        bilder.push({
          breite: Math.round(Math.abs(matrix[0] ?? 0) * 100) / 100,
          hoehe: Math.round(Math.abs(matrix[3] ?? 0) * 100) / 100,
        });
    });
    seiten.push(bilder);
  }
  await aufgabe.destroy();
  return seiten;
}

/** Gesamter Text, Seiten durch Zeilenumbruch getrennt, Textstücke durch Leerzeichen. */
export const alsText = (inhalt: PdfInhalt): string =>
  inhalt.seiten.map((s) => s.map((t) => t.text).join(' ')).join('\n');
