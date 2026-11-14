// SPDX-License-Identifier: AGPL-3.0-or-later
// PDF-Renderer für das `Berichtsmodell` (Ticket 113, ADR 0012): pdfmake, ungetaggt, A4 hoch oder quer, Noto Sans. Bytes
// statt Dialog; bei gleicher Eingabe gleiche Bytes (das Erzeugungsdatum kommt aus dem Modell, keine Uhr).

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type {
  Balken,
  BerichtAbschnitt,
  BerichtBlock,
  BerichtSpalte,
  BerichtZelle,
  Berichtsmodell,
} from './bericht';
import { briefkopf, SCHRIFT, erzeugungsdatum, pdfBytes } from './pdfmake';
import { ersetzePlatzhalter } from './platzhalter';
import type { Schriften } from './schriften';

const GRAU = '#555555';
/** Seitenränder `[links, oben, rechts, unten]` in pt, wie beim LV-Druck „normal“ und „eng“. */
const RAENDER = { normal: [40, 50, 40, 46], eng: [28, 44, 28, 40] } as const;
const EINRUECKUNG = 10;
/** Bis zu so vielen Zeilen wird eine Tabelle nicht über eine Seite hinweg geteilt. */
const KLEINE_TABELLE = 8;

/** Linien und Abstände der Tabellen: oben und unten kräftiger, zwischen den Zeilen fein, keine senkrechten Linien. */
const TABELLENLINIEN = {
  hLineWidth: (i: number, k: { table: { body: unknown[] } }) =>
    i === 0 || i === k.table.body.length ? 0.6 : 0.3,
  vLineWidth: () => 0,
  hLineColor: () => GRAU,
  paddingLeft: () => 2,
  paddingRight: () => 2,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

/** Kopf einer Spalte; bei Teilen deren Bezeichnungen darunter („EP / GP“). */
function spaltenkopf(s: BerichtSpalte): Content {
  return {
    stack: [
      { text: s.titel, bold: true },
      ...(s.teile === undefined ? [] : [{ text: s.teile.join(' / '), color: GRAU }]),
    ],
    fontSize: 7,
    ...(s.rechts === true ? { alignment: 'right' as const } : {}),
  };
}

/** Inhalt einer Zelle mit mehreren Werten untereinander und dem Hinweis klein darunter. */
function zellInhalt(z: BerichtZelle): Content[] {
  return [
    ...z.werte.map((w): Content => ({ text: w.text, ...(z.fett === true ? { bold: true } : {}) })),
    ...(z.hinweis === undefined ? [] : [{ text: z.hinweis, fontSize: 6, color: GRAU }]),
  ];
}

/** Breite der Zeitachse im Balkenplan in pt; passt neben einer Namensspalte auf A4 hoch, auch mit normalem Rand. */
const BALKEN_BREITE = 300;
/** Höhe einer Zeile des Balkenplans in pt. */
const BALKEN_HOEHE = 10;
/** Unter dieser Breite in pt bleibt ein Abschnitt der Achse ohne Beschriftung (sie passte nicht). */
const MIN_BESCHRIFTUNG = 24;
const LINIE = '#bbbbbb';
const BALKENFARBE: Readonly<Record<Balken['art'], string>> = {
  vorgang: '#8d9aa8',
  kritisch: '#222222',
  sammelvorgang: '#000000',
  meilenstein: '#000000',
};

/** Die Zeichnung eines Balkens samt Linien der Achsenabschnitte (pdfmake-Canvas, Koordinaten in pt). */
function balkenZeichnung(balken: Balken | null, grenzen: readonly number[]): Content {
  const x = (anteil: number): number => Math.round(anteil * BALKEN_BREITE * 100) / 100;
  const linien = grenzen.map((g) => ({
    type: 'line' as const,
    x1: x(g),
    y1: 0,
    x2: x(g),
    y2: BALKEN_HOEHE,
    lineWidth: 0.3,
    lineColor: LINIE,
  }));
  const farbe = balken === null ? '' : BALKENFARBE[balken.art];
  const form =
    balken === null
      ? []
      : balken.art === 'meilenstein'
        ? [
            {
              type: 'polyline' as const,
              closePath: true,
              color: farbe,
              points: [
                { x: x(balken.von), y: 1 },
                { x: x(balken.von) + 4, y: 5 },
                { x: x(balken.von), y: 9 },
                { x: x(balken.von) - 4, y: 5 },
              ],
            },
          ]
        : [
            {
              type: 'rect' as const,
              x: x(balken.von),
              y: balken.art === 'sammelvorgang' ? 3.5 : 2,
              w: Math.max(x(balken.bis) - x(balken.von), 1),
              h: balken.art === 'sammelvorgang' ? 3 : 6,
              color: farbe,
            },
          ];
  return { canvas: [...linien, ...form] };
}

function balkenplanBlock(b: Extract<BerichtBlock, { art: 'balkenplan' }>): Content {
  const grenzen = b.achse.slice(1).map((a) => a.von);
  const kopf: Content[] = [
    { text: 'Vorgang', bold: true, fontSize: 7 },
    {
      columns: b.achse.map((a) => {
        const breite = Math.round((a.bis - a.von) * BALKEN_BREITE * 100) / 100;
        return {
          width: breite,
          text: breite < MIN_BESCHRIFTUNG ? '' : a.text,
          fontSize: 6,
          color: GRAU,
        };
      }),
      columnGap: 0,
    },
  ];
  const zeilen = b.zeilen.map((z): Content[] => [
    {
      text: z.name,
      ...(z.fett === true ? { bold: true } : {}),
      ...((z.einrueckung ?? 0) > 0
        ? { margin: [(z.einrueckung ?? 0) * EINRUECKUNG, 0, 0, 0] as [number, number, number, number] }
        : {}),
    },
    balkenZeichnung(z.balken, grenzen),
  ]);
  return {
    table: { headerRows: 1, dontBreakRows: true, widths: ['*', BALKEN_BREITE], body: [kopf, ...zeilen] },
    layout: TABELLENLINIEN,
    margin: [0, 2, 0, 6],
  };
}

function block(b: BerichtBlock): Content {
  switch (b.art) {
    case 'absatz':
      return {
        text: b.text,
        ...(b.klein === true ? { fontSize: 7, color: GRAU } : {}),
        margin: [0, 2, 0, 4],
      };
    case 'liste':
      return { ul: [...b.punkte], margin: [8, 2, 0, 4] };
    case 'angaben':
      return {
        margin: [0, 2, 0, 4],
        stack: b.felder.map((f): Content => ({
          columns: [
            { text: f.bezeichnung, width: 100, color: GRAU },
            { text: f.wert, width: '*' },
          ],
          columnGap: 6,
          margin: [0, 1, 0, 1],
        })),
      };
    case 'felder':
      return {
        margin: [0, 2, 0, 4],
        stack: b.felder.map((f): Content => ({
          columns: [
            {
              text: f.bezeichnung,
              width: '*',
              color: f.fett === true ? 'black' : GRAU,
              bold: f.fett === true,
            },
            { text: f.wert, width: 'auto', alignment: 'right', bold: f.fett === true },
          ],
          columnGap: 8,
          margin: [0, 1, 0, 1],
        })),
      };
    case 'balkenplan':
      return balkenplanBlock(b);
    case 'tabelle': {
      const kopf = b.spalten.map(spaltenkopf);
      const zeilen = b.zeilen.map((z) =>
        b.spalten.map((s, i) => {
          const zelle = z.zellen[i] ?? '';
          const letzte = i === b.spalten.length - 1;
          const stufe = z.einrueckung ?? 0;
          const fett = z.fett === true ? { bold: true } : {};
          const inhalt: Content[] =
            typeof zelle === 'string'
              ? [{ text: zelle, ...fett }]
              : zellInhalt(z.fett === true ? { ...zelle, fett: true } : zelle);
          if (letzte && z.kleinerText !== undefined)
            inhalt.push({ text: z.kleinerText, fontSize: 7, color: GRAU });
          return {
            stack: inhalt,
            ...(i === 0 && stufe > 0
              ? { margin: [stufe * EINRUECKUNG, 0, 0, 0] as [number, number, number, number] }
              : {}),
            ...(s.rechts === true ? { alignment: 'right' as const } : {}),
          };
        }),
      );
      const tabelle: Content = {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: b.spalten.map((s) => s.breite),
          body: [kopf, ...zeilen],
        },
        layout: TABELLENLINIEN,
        margin: [0, 2, 0, 6],
      };
      // Eine kleine Tabelle (etwa die Fälle der Zahlungsfreigabe) bleibt auf einer Seite.
      return b.zeilen.length <= KLEINE_TABELLE ? { stack: [tabelle], unbreakable: true } : tabelle;
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
  // `keepWithNext` hält die Überschrift nicht bei einem ungeteilten Block (kleine Tabelle): beide in einen Block.
  const ersterBlock = a.bloecke[0];
  if (anfang !== undefined && ersterBlock?.art === 'tabelle' && ersterBlock.zeilen.length <= KLEINE_TABELLE)
    return [{ stack: [kopf, anfang], unbreakable: true }, ...rest];
  return [kopf, ...(anfang === undefined ? [] : [anfang]), ...rest];
}

function dokument(m: Berichtsmodell): TDocumentDefinitions {
  const stand = erzeugungsdatum(m.erstellt);
  const seite = m.seite;
  const rand = RAENDER[seite?.rand ?? 'normal'];
  const platzhalter = (text: string, nr: number, seiten: number): string =>
    ersetzePlatzhalter(text, { seite: nr, seiten, datum: m.datum, lv: seite?.lv ?? m.titel });
  const inhalt: Content[] = [
    briefkopf(m.absender ?? [], {
      margin: [0, 0, 0, 8],
      stack: [
        { text: m.titel, bold: true, fontSize: 14, margin: [0, 0, 0, 6] },
        ...m.kopf.map((f): Content => ({
          columns: [
            { text: f.bezeichnung, width: 110, color: GRAU },
            { text: f.wert, width: '*' },
          ],
          margin: [0, 0, 0, 1],
        })),
      ],
    }),
    ...m.abschnitte.flatMap((a, i) => abschnitt(a, i === 0)),
  ];
  const kopfzeile = seite?.kopfzeile ?? null;
  const fusszeile = seite?.fusszeile ?? null;
  return {
    info: { title: m.titel, creationDate: stand, modDate: stand },
    language: 'de-DE',
    pageSize: 'A4',
    pageOrientation: seite?.ausrichtung === 'quer' ? 'landscape' : 'portrait',
    pageMargins: [...rand],
    defaultStyle: { font: SCHRIFT, fontSize: 8 },
    ...(kopfzeile === null
      ? {}
      : {
          header: (nr: number, seiten: number) => ({
            margin: [rand[0], rand[1] - 30, rand[2], 0],
            text: platzhalter(kopfzeile, nr, seiten),
            fontSize: 8,
            bold: true,
          }),
        }),
    footer: (nr: number, seiten: number) => ({
      margin: [rand[0], 14, rand[2], 0],
      fontSize: 7,
      ...(fusszeile !== null
        ? { text: platzhalter(fusszeile, nr, seiten) }
        : {
            columns: [
              { text: m.datum === null ? '' : `Stand: ${m.datum}`, width: '*' },
              { text: `Seite ${String(nr)} von ${String(seiten)}`, alignment: 'right', width: 'auto' },
            ],
          }),
    }),
    content: inhalt,
  };
}

/** Erzeugt das PDF eines `Berichtsmodell` als Bytes. */
export function erzeugeBerichtPdf(modell: Berichtsmodell, schriften: Schriften): Promise<Uint8Array> {
  return pdfBytes(dokument(modell), schriften);
}
