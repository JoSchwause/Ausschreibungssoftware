// SPDX-License-Identifier: AGPL-3.0-or-later
// PDF-Renderer für das `Berichtsmodell` (Ticket 113, ADR 0012): pdfmake, ungetaggt, A4 hoch, Noto Sans. Bytes statt Dialog;
// bei gleicher Eingabe gleiche Bytes (das Erzeugungsdatum kommt aus dem Modell, keine Uhr).

import pdfMake from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { BerichtAbschnitt, BerichtBlock, Berichtsmodell } from './bericht';
import type { Schriften } from './schriften';

const SCHRIFT = 'NotoSans';
const GRAU = '#555555';
const RAENDER = [40, 50, 40, 46] as const;
const EINRUECKUNG = 10;

function block(b: BerichtBlock): Content {
  switch (b.art) {
    case 'absatz':
      return { text: b.text, ...(b.klein === true ? { fontSize: 7, color: GRAU } : {}), margin: [0, 2, 0, 4] };
    case 'liste':
      return { ul: [...b.punkte], margin: [8, 2, 0, 4] };
    case 'angaben':
      return {
        margin: [0, 2, 0, 4],
        stack: b.felder.map(
          (f): Content => ({
            columns: [
              { text: f.bezeichnung, width: 100, color: GRAU },
              { text: f.wert, width: '*' },
            ],
            columnGap: 6,
            margin: [0, 1, 0, 1],
          }),
        ),
      };
    case 'felder':
      return {
        margin: [0, 2, 0, 4],
        stack: b.felder.map(
          (f): Content => ({
            columns: [
              { text: f.bezeichnung, width: '*', color: f.fett === true ? 'black' : GRAU, bold: f.fett === true },
              { text: f.wert, width: 'auto', alignment: 'right', bold: f.fett === true },
            ],
            columnGap: 8,
            margin: [0, 1, 0, 1],
          }),
        ),
      };
    case 'tabelle': {
      const kopf = b.spalten.map((s) => ({
        text: s.titel,
        bold: true,
        fontSize: 7,
        ...(s.rechts === true ? { alignment: 'right' as const } : {}),
      }));
      const zeilen = b.zeilen.map((z) =>
        b.spalten.map((s, i) => {
          const text = z.zellen[i] ?? '';
          const letzte = i === b.spalten.length - 1;
          const stufe = z.einrueckung ?? 0;
          const inhalt: Content[] = [
            {
              text,
              ...(z.fett === true ? { bold: true } : {}),
              ...(i === 0 && stufe > 0 ? { margin: [stufe * EINRUECKUNG, 0, 0, 0] } : {}),
            },
          ];
          if (letzte && z.kleinerText !== undefined) inhalt.push({ text: z.kleinerText, fontSize: 7, color: GRAU });
          return { stack: inhalt, ...(s.rechts === true ? { alignment: 'right' as const } : {}) };
        }),
      );
      return {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: b.spalten.map((s) => s.breite),
          body: [kopf, ...zeilen],
        },
        layout: {
          hLineWidth: (i: number, k: { table: { body: unknown[] } }) =>
            i === 0 || i === k.table.body.length ? 0.6 : 0.3,
          vLineWidth: () => 0,
          hLineColor: () => GRAU,
          paddingLeft: () => 2,
          paddingRight: () => 2,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
        margin: [0, 2, 0, 6],
      };
    }
  }
}

function abschnitt(a: BerichtAbschnitt, erster: boolean): Content[] {
  const bloecke = a.bloecke.map(block);
  if (a.ueberschrift === null) return bloecke;
  const [anfang, ...rest] = bloecke;
  const kopf: Content = {
    text: a.ueberschrift,
    bold: true,
    fontSize: 10,
    margin: [0, erster ? 0 : 8, 0, 3],
    keepWithNext: true,
  } as Content;
  return [kopf, ...(anfang === undefined ? [] : [anfang]), ...rest];
}

function erzeugungsdatum(erstellt: string | null): Date {
  const d = erstellt === null ? new Date(0) : new Date(`${erstellt}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function dokument(m: Berichtsmodell): TDocumentDefinitions {
  const stand = erzeugungsdatum(m.erstellt);
  const inhalt: Content[] = [
    {
      margin: [0, 0, 0, 8],
      stack: [
        { text: m.titel, bold: true, fontSize: 14, margin: [0, 0, 0, 6] },
        ...m.kopf.map(
          (f): Content => ({
            columns: [
              { text: f.bezeichnung, width: 110, color: GRAU },
              { text: f.wert, width: '*' },
            ],
            margin: [0, 0, 0, 1],
          }),
        ),
      ],
    },
    ...m.abschnitte.flatMap((a, i) => abschnitt(a, i === 0)),
  ];
  return {
    info: { title: m.titel, creationDate: stand, modDate: stand },
    language: 'de-DE',
    pageSize: 'A4',
    pageMargins: [...RAENDER],
    defaultStyle: { font: SCHRIFT, fontSize: 8 },
    footer: (seite: number, seiten: number) => ({
      margin: [RAENDER[0], 14, RAENDER[2], 0],
      fontSize: 7,
      columns: [
        { text: m.datum === null ? '' : `Stand: ${m.datum}`, width: '*' },
        { text: `Seite ${String(seite)} von ${String(seiten)}`, alignment: 'right', width: 'auto' },
      ],
    }),
    content: inhalt,
  };
}

/** Erzeugt das PDF eines `Berichtsmodell` als Bytes. */
export async function erzeugeBerichtPdf(modell: Berichtsmodell, schriften: Schriften): Promise<Uint8Array> {
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
  const puffer = await pdfMake.createPdf(dokument(modell)).getBuffer();
  return new Uint8Array(puffer);
}
