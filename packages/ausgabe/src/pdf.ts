// SPDX-License-Identifier: AGPL-3.0-or-later
// Weg A des Spikes: PDF im Browser (oder Node) mit pdfmake zeichnen. Liefert Bytes, kein Dialog, kein Server.

import pdfMake from 'pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { LvZustand } from '@tethys/vertrag';
import { baueAusgabemodell } from './modell';
import type { AusgabeZeile, Ausgabemodell } from './modell';
import type { Schriften } from './schriften';

// Spaltenbreiten in pt (A4 hoch, 40 pt Rand links/rechts = 515 pt Satzbreite). Wegwerf-Layout, kein Feinschliff.
const BREITEN = [58, '*', 54, 28, 58, 66] as const;
const SCHRIFT = 'NotoSans';
const GRAU = '#555555';

/** Eine Zeile aus sechs Zellen (Text oder Textobjekt); Menge, EP und GP stehen rechtsbündig. */
function zeile(zellen: readonly (string | { text: string; [schluessel: string]: unknown })[]): Content {
  return {
    columns: zellen.map((z, i) => ({
      ...(typeof z === 'string' ? { text: z } : z),
      width: BREITEN[i],
      ...(i === 2 || i >= 4 ? { alignment: 'right' as const } : {}),
    })),
    columnGap: 4,
  };
}

/**
 * Knoten einer Zeile als Anfang und Rest. Nur der Anfang (Kopfzeile einer Position, erste Zeile eines Hinweises) bleibt
 * bei Titeln in der unteilbaren Kopfgruppe; der Rest darf umbrechen. Sonst würde pdfmake ein erstes Kind, das höher als
 * eine Seite ist, abschneiden (stiller Datenverlust, Q5). Titelzeilen gibt es hier nicht: Sie hängen sich an den Anfang
 * des nächsten Knotens.
 */
function inhaltsKnoten(z: Exclude<AusgabeZeile, { art: 'titel' }>): {
  anfang: Content;
  rest: Content | null;
} {
  switch (z.art) {
    case 'position': {
      // Klammern nur, wenn es einen GP gibt; ohne GP bleibt die Zelle leer.
      const gp =
        z.gehtInSummeEin || z.gesamtpreis === ''
          ? z.gesamtpreis
          : { text: `(${z.gesamtpreis})`, color: GRAU };
      const kopf = zeile([z.ordnungszahl, z.kurztext, z.menge, z.einheit, z.einheitspreis, gp]);
      const rest: Content | null =
        z.langtext === '' ? null : { text: z.langtext, fontSize: 7, color: GRAU, margin: [62, 1, 0, 0] };
      return { anfang: { stack: [kopf], margin: [0, 2, 0, 0] }, rest };
    }
    case 'hinweis': {
      const [erste = '', ...weitere] = z.text.split('\n');
      const stil = { fontSize: 8, color: GRAU } as const;
      return {
        anfang: { text: erste, ...stil, margin: [62, 3, 0, weitere.length === 0 ? 3 : 0] },
        rest: weitere.length === 0 ? null : { text: weitere.join('\n'), ...stil, margin: [62, 0, 0, 3] },
      };
    }
    case 'titelsumme':
      return {
        anfang: {
          columns: [
            { text: `Summe ${z.ordnungszahl} ${z.kurztext}`, bold: true, width: '*' },
            { text: z.summe, bold: true, alignment: 'right', width: 80 },
          ],
          margin: [0, 2, 0, 6],
        },
        rest: null,
      };
  }
}

function summenKnoten(m: Ausgabemodell['summen']): Content {
  const z = (bezeichnung: string, wert: string, fett = false): Content => ({
    columns: [
      { text: bezeichnung, width: '*', alignment: 'right', bold: fett },
      { text: wert, width: 90, alignment: 'right', bold: fett },
    ],
    margin: [0, 1, 0, 1],
  });
  return {
    unbreakable: true,
    margin: [0, 10, 0, 0],
    stack: [
      z('Netto', m.netto),
      ...(m.nachlass
        ? [z(m.nachlass.bezeichnung, m.nachlass.betrag), z('Netto nach Nachlass', m.nettoNachNachlass)]
        : []),
      z(m.mwstBezeichnung, m.mwst),
      z('Brutto', m.brutto, true),
    ],
  };
}

/** Baut die Dokumentdefinition. Titel und der Anfang ihres ersten Kindes stehen in einem unteilbaren Block (nie Titel allein am Seitenende). */
function dokument(modell: Ausgabemodell, tagged: boolean): TDocumentDefinitions {
  const inhalt: Content[] = [];
  let kopfgruppe: Content[] = [];
  for (const z of modell.zeilen) {
    if (z.art === 'titel') {
      kopfgruppe.push({
        text: `${z.ordnungszahl}  ${z.kurztext}`,
        bold: true,
        fontSize: z.ebene === 1 ? 10 : 9,
        margin: [0, z.ebene === 1 ? 8 : 5, 0, 2],
      });
      continue;
    }
    const { anfang, rest } = inhaltsKnoten(z);
    if (kopfgruppe.length > 0) {
      inhalt.push({ unbreakable: true, stack: [...kopfgruppe, anfang] });
      kopfgruppe = [];
    } else inhalt.push(anfang);
    if (rest) inhalt.push(rest);
  }
  inhalt.push(summenKnoten(modell.summen));
  return {
    info: { title: modell.name },
    language: 'de-DE',
    tagged,
    pageSize: 'A4',
    pageMargins: [40, 62, 40, 46],
    defaultStyle: { font: SCHRIFT, fontSize: 8 },
    header: () => ({
      margin: [40, 24, 40, 0],
      stack: [
        { text: modell.name, bold: true, fontSize: 9, margin: [0, 0, 0, 4] },
        zeile(
          ['OZ', 'Kurztext', 'Menge', 'Einh.', 'EP in €', 'GP in €'].map((t) => ({
            text: t,
            bold: true,
            fontSize: 7,
          })),
        ),
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 515, y2: 2, lineWidth: 0.5 }] },
      ],
    }),
    footer: (seite: number, seiten: number) => ({
      text: `Seite ${String(seite)} von ${String(seiten)}`,
      alignment: 'right',
      fontSize: 7,
      margin: [40, 14, 40, 0],
    }),
    content: inhalt,
  };
}

/** Erzeugt das PDF des LV (Kopf, Zeilen, Titelsummen, Netto/Nachlass/MwSt/Brutto, „Seite x von y“) als Bytes. */
export async function erzeugePdf(
  zustand: LvZustand,
  schriften: Schriften,
  // `tagged` steht standardmäßig aus: pdfmake setzt dann zwar /MarkInfo, schreibt aber keinen Strukturbaum. Ein
  // „getaggtes“ PDF ohne Struktur täuscht Barrierefreiheit nur vor (Messung: Ticket 28).
  optionen: { readonly tagged?: boolean } = {},
): Promise<Uint8Array> {
  // Das Dokument braucht weder Netz noch Dateisystem: Zugriffe sperren (pdfmake warnt sonst unter Node, und ein
  // Bild-/Schrift-URL im Dokument würde nachgeladen). `setLocalAccessPolicy` gibt es nur in der Node-Ausgabe.
  pdfMake.setUrlAccessPolicy(() => false);
  const nodeSeitig = pdfMake as { setLocalAccessPolicy?: (f: (pfad: string) => boolean) => void };
  nodeSeitig.setLocalAccessPolicy?.(() => false);
  pdfMake.setFonts({
    [SCHRIFT]: {
      normal: schriften.normal,
      bold: schriften.fett,
      italics: schriften.normal,
      bolditalics: schriften.fett,
    },
  });
  const puffer = await pdfMake
    .createPdf(dokument(baueAusgabemodell(zustand), optionen.tagged ?? false))
    .getBuffer();
  return new Uint8Array(puffer);
}
