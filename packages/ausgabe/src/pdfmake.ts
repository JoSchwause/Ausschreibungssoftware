// SPDX-License-Identifier: AGPL-3.0-or-later
// Die eine Hülle um pdfmake (ADR 0012) für beide Renderer, LV-Druck (`pdf.ts`) und Berichte (`bericht-pdf.ts`):
// Zugriffsregel (kein Netz, kein Dateisystem), Schriften (Noto Sans aus den Bytes des Aufrufers) und das Erzeugungsdatum
// aus der Eingabe (keine Uhr, A2). Gleiche Dokumentdefinition, gleiche Bytes.

import pdfMake from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Schriften } from './schriften';

/** Name der eingebetteten Schriftfamilie in jeder Dokumentdefinition. */
export const SCHRIFT = 'NotoSans';

/**
 * Kopf der ersten Seite: links der Inhalt (Titel und Angaben), rechts oben der Absender (das Büro, E10) in kleiner Schrift.
 * Ohne Absender bleibt der Inhalt allein.
 */
export function briefkopf(absender: readonly string[], inhalt: Content): Content {
  if (absender.length === 0) return inhalt;
  return {
    columns: [
      { width: '*', stack: [inhalt] },
      {
        width: 170,
        stack: absender.map((z, i): Content => ({ text: z, ...(i === 0 ? { bold: true } : {}) })),
        fontSize: 7,
        alignment: 'right',
      },
    ],
    columnGap: 12,
  };
}

/** Erzeugungsdatum des PDF aus `JJJJ-MM-TT`; ohne oder mit ungültiger Angabe fest der 01.01.1970 (gleiche Bytes). */
export function erzeugungsdatum(iso: string | null | undefined): Date {
  const d = iso === null || iso === undefined ? new Date(0) : new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

/**
 * Setzt eine Dokumentdefinition als PDF-Bytes. Das Dokument braucht weder Netz noch Dateisystem: Zugriffe sind gesperrt
 * (pdfmake warnt sonst unter Node, und ein Bild- oder Schrift-URL würde nachgeladen; Bilder kommen nur als `data:`-Adresse
 * aus dem Modell). `setLocalAccessPolicy` gibt es nur in der Node-Ausgabe von pdfmake.
 */
export async function pdfBytes(dokument: TDocumentDefinitions, schriften: Schriften): Promise<Uint8Array> {
  pdfMake.setUrlAccessPolicy(() => false);
  const nodeSeitig = pdfMake as { setLocalAccessPolicy?: (f: (pfad: string) => boolean) => void };
  nodeSeitig.setLocalAccessPolicy?.(() => false);
  pdfMake.setFonts({
    [SCHRIFT]: {
      normal: schriften.normal,
      bold: schriften.fett,
      italics: schriften.kursiv ?? schriften.normal,
      bolditalics: schriften.fettKursiv ?? schriften.fett,
    },
  });
  const puffer = await pdfMake.createPdf(dokument).getBuffer();
  return new Uint8Array(puffer);
}
