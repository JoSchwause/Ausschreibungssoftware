// SPDX-License-Identifier: AGPL-3.0-or-later
// PDF-Renderer des LV-Drucks (ADR 0012): zeichnet ein `Ausgabemodell` mit pdfmake. Liefert Bytes, kein Dialog, kein
// Server. pdfmake bleibt hinter dem Modell; wer den Renderer tauscht, ändert nur diese Datei. Die Ausgabe ist
// ungetaggt (kein Strukturbaum); das PDF trägt Sprache und Titel.

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { LvZustand } from '@tethys/vertrag';
import { baueAusgabemodell } from './modell';
import type { AusgabeZeile, Ausgabemodell, ModellOptionen, PositionZeile } from './modell';
import { ersetzePlatzhalter } from './platzhalter';
import type { DruckBlock, DruckLauf } from './langtext';
import { SCHRIFT, erzeugungsdatum, pdfBytes } from './pdfmake';
import type { Schriften } from './schriften';

// Spaltenbreiten in pt (A4 hoch, 40 pt Rand links/rechts = 515 pt Satzbreite).
const BREITEN = [58, '*', 54, 28, 58, 66] as const;
const EINRUECKUNG = 62;
const SEITENBREITE = 595.28; // A4 in pt
/** Seitenränder `[links, oben, rechts, unten]` in pt. */
const RAENDER = { normal: [40, 62, 40, 46], eng: [28, 56, 28, 40] } as const;
const GRAU = '#555555';

type Zelle =
  string | { text: string; [schluessel: string]: unknown } | { canvas: unknown[]; [k: string]: unknown };

/** Eine Zeile aus sechs Zellen; Menge, EP und GP stehen rechtsbündig. */
function zeile(zellen: readonly Zelle[]): { columns: Content[]; columnGap: number } {
  return {
    columns: zellen.map((z, i) => ({
      ...(typeof z === 'string' ? { text: z } : z),
      width: BREITEN[i],
      ...(i === 2 || i >= 4 ? { alignment: 'right' as const } : {}),
    })) as Content[],
    columnGap: 4,
  };
}

/** Leeres Eingabefeld mit Linie (Blankett: Der Bieter trägt EP und GP ein). */
const eingabefeld = (breite: number): Zelle => ({
  canvas: [{ type: 'line', x1: 2, y1: 9, x2: breite, y2: 9, lineWidth: 0.4 }],
});

// --- Langtext -----------------------------------------------------------------------------------

function laufInhalt(l: DruckLauf): Content {
  return {
    text: l.text,
    ...(l.fett ? { bold: true } : {}),
    ...(l.kursiv ? { italics: true } : {}),
    ...(l.unterstrichen ? { decoration: 'underline' as const } : {}),
  };
}

function bloeckeInhalt(bloecke: readonly DruckBlock[]): Content {
  if (bloecke.length === 0) return '';
  const knoten = bloecke.map(blockInhalt);
  return knoten.length === 1 ? (knoten[0] as Content) : { stack: knoten };
}

function blockInhalt(b: DruckBlock): Content {
  switch (b.art) {
    case 'absatz':
      return { text: b.laeufe.map(laufInhalt), margin: [0, 0, 0, 2] };
    case 'liste': {
      const punkte = b.punkte.map(bloeckeInhalt);
      return b.geordnet ? { ol: punkte, margin: [8, 0, 0, 2] } : { ul: punkte, margin: [8, 0, 0, 2] };
    }
    case 'tabelle': {
      const spaltenzahl = Math.max(1, ...b.zeilen.map((z) => z.zellen.reduce((n, c) => n + c.spalten, 0)));
      const body = b.zeilen.map((z) => {
        const zellen: Content[] = [];
        for (const c of z.zellen) {
          const inhalt = bloeckeInhalt(c.inhalt);
          zellen.push(
            c.spalten > 1 ? ({ stack: [inhalt], colSpan: c.spalten } as Content) : { stack: [inhalt] },
          );
          for (let i = 1; i < c.spalten; i++) zellen.push({ text: '' });
        }
        while (zellen.length < spaltenzahl) zellen.push({ text: '' });
        return zellen;
      });
      return {
        table: { widths: Array.from({ length: spaltenzahl }, () => '*'), body },
        layout: {
          hLineWidth: () => 0.4,
          vLineWidth: () => 0.4,
          hLineColor: () => GRAU,
          vLineColor: () => GRAU,
          paddingLeft: () => 3,
          paddingRight: () => 3,
          paddingTop: () => 1,
          paddingBottom: () => 1,
        },
        margin: [0, 1, 0, 3],
      };
    }
  }
}

/**
 * Langtext einer Position oder Unterbeschreibung, eingerückt und klein. Ein einzelner Absatz ohne Auszeichnung (der Normalfall
 * bei 5.000 Positionen) wird zu einem einzigen Textknoten; das hält pdfmake schnell.
 */
function langtextKasten(bloecke: readonly DruckBlock[], links = EINRUECKUNG): Content | null {
  const stil = { fontSize: 7, color: GRAU } as const;
  const [einziger] = bloecke;
  if (bloecke.length === 1 && einziger?.art === 'absatz') {
    const schlicht = einziger.laeufe.every((l) => !l.fett && !l.kursiv && !l.unterstrichen);
    return {
      text: schlicht ? einziger.laeufe.map((l) => l.text).join('') : einziger.laeufe.map(laufInhalt),
      ...stil,
      margin: [links, 1, 0, 3],
    };
  }
  return bloecke.length === 0 ? null : { stack: bloecke.map(blockInhalt), ...stil, margin: [links, 1, 0, 2] };
}

// --- Zeilen -------------------------------------------------------------------------------------

/**
 * Knoten einer Zeile als Anfang und Rest. Nur der Anfang (Kopfzeile einer Position, erster Block eines Hinweises) bleibt
 * bei Titeln in der unteilbaren Kopfgruppe; der Rest darf umbrechen. Sonst würde pdfmake ein erstes Kind, das höher als
 * eine Seite ist, abschneiden (stiller Datenverlust, Q5). Titelzeilen gibt es hier nicht: Sie hängen sich an den Anfang
 * des nächsten Knotens.
 */
function inhaltsKnoten(
  z: Exclude<AusgabeZeile, { art: 'titel' }>,
  mitPreisen: boolean,
): { anfang: Content; rest: Content | null } {
  switch (z.art) {
    case 'position':
      return positionsKnoten(z, mitPreisen);
    case 'hinweis': {
      const [erster, ...weitere] = z.text.map(blockInhalt);
      const stil = { fontSize: 8, color: GRAU } as const;
      return {
        anfang: {
          ...(erster === undefined ? { text: '' } : { stack: [erster] }),
          ...stil,
          margin: [EINRUECKUNG, 3, 0, 3],
        },
        rest: weitere.length === 0 ? null : { stack: weitere, ...stil, margin: [EINRUECKUNG, 0, 0, 3] },
      };
    }
    case 'titelsumme': {
      const ausweis: string[] = [];
      if (z.bedarf !== null) ausweis.push(`Bedarfssumme ${z.bedarf}`);
      if (z.wahl !== null) ausweis.push(`Wahlsumme ${z.wahl}`);
      const stack: Content[] = [
        {
          columns: [
            { text: `Summe ${z.ordnungszahl} ${z.kurztext}`, bold: true, width: '*' },
            { text: z.summe, bold: true, alignment: 'right', width: 80 },
          ],
        },
      ];
      if (ausweis.length > 0)
        stack.push({
          text: `${ausweis.join(' · ')} (nicht in der Summe enthalten)`,
          fontSize: 7,
          color: GRAU,
          alignment: 'right',
        });
      return { anfang: { stack, margin: [0, 2, 0, 6] }, rest: null };
    }
  }
}

function positionsKnoten(z: PositionZeile, mitPreisen: boolean): { anfang: Content; rest: Content | null } {
  // Klammern nur, wenn es einen GP gibt; ohne GP bleibt die Zelle leer.
  const gp: Zelle = !mitPreisen
    ? eingabefeld(BREITEN[5])
    : z.gehtInSummeEin || z.gesamtpreis === ''
      ? z.gesamtpreis
      : { text: `(${z.gesamtpreis})`, color: GRAU };
  const ep: Zelle = !mitPreisen
    ? eingabefeld(BREITEN[4])
    : z.einheitspreis !== ''
      ? z.einheitspreis
      : (z.zuschlag?.satz ?? '');
  const kopf = zeile([z.ordnungszahl, z.kurztext, z.menge, z.einheit, ep, gp]);
  const zusatz: string[] = [...z.merkmale];
  if (z.zuschlag !== null) zusatz.push(`Zuschlag ${z.zuschlag.bezug}`);
  const stack: Content[] = [kopf];
  const nurKopf = zusatz.length === 0;
  if (zusatz.length > 0)
    stack.push({
      text: zusatz.join(' · '),
      fontSize: 7,
      italics: true,
      color: GRAU,
      margin: [EINRUECKUNG, 0, 0, 0],
    });

  const rest: Content[] = [];
  const text = langtextKasten(z.langtext);
  if (text) rest.push(text);
  for (const u of z.unterbeschreibungen) {
    const menge = [u.menge, u.einheit].filter((t) => t !== '').join(' ');
    const unterText = langtextKasten(u.langtext, 8);
    rest.push({
      stack: [
        {
          text: [
            { text: `${u.nummer}  `, bold: true },
            u.kurztext,
            ...(menge === '' ? [] : [`  (${menge})`]),
          ],
          margin: [0, 1, 0, 0],
        },
        ...(unterText ? [unterText] : []),
      ],
      fontSize: 7,
      margin: [EINRUECKUNG + 6, 1, 0, 1],
    });
  }
  const anfang: Content = nurKopf ? { ...kopf, margin: [0, 2, 0, 0] } : { stack, margin: [0, 2, 0, 0] };
  return { anfang, rest: rest.length === 0 ? null : rest.length === 1 ? (rest[0] ?? null) : { stack: rest } };
}

function summenKnoten(m: NonNullable<Ausgabemodell['summen']>): Content {
  const z = (bezeichnung: string, wert: string, fett = false): Content => ({
    columns: [
      { text: bezeichnung, width: '*', alignment: 'right', bold: fett },
      { text: wert, width: 90, alignment: 'right', bold: fett },
    ],
    margin: [0, 1, 0, 1],
  });
  const ausweise: Content[] = [];
  if (m.bedarf !== null) ausweise.push(z('Bedarfssumme (nicht in der Netto-Summe enthalten)', m.bedarf));
  if (m.wahl !== null) ausweise.push(z('Wahlsumme (nicht in der Netto-Summe enthalten)', m.wahl));
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
      ...(ausweise.length > 0 ? [{ text: '', margin: [0, 4, 0, 0] } as Content, ...ausweise] : []),
    ],
  };
}

function kopfBlock(m: Ausgabemodell): Content {
  return {
    margin: [0, 0, 0, 10],
    stack: [
      { text: m.kopf.lvName, bold: true, fontSize: 14, margin: [0, 0, 0, 6] },
      ...m.kopf.felder.map((f): Content => ({
        columns: [
          { text: f.bezeichnung, width: 110, color: GRAU },
          { text: f.wert, width: '*' },
        ],
        margin: [0, 0, 0, 1],
      })),
    ],
  };
}

/** Baut die Dokumentdefinition. Titel und der Anfang ihres ersten Kindes stehen in einem unteilbaren Block (nie Titel allein am Seitenende). */
function dokument(modell: Ausgabemodell, optionen: PdfOptionen): TDocumentDefinitions {
  const { datum } = optionen;
  const tagged = optionen.tagged ?? false;
  const rand = RAENDER[optionen.seitenrand ?? 'normal'];
  const links = rand[0];
  const satzbreite = SEITENBREITE - links - rand[2];
  const platzhalter = (text: string, seite: number, seiten: number): string =>
    ersetzePlatzhalter(text, { seite, seiten, datum: modell.datum, lv: modell.name });
  const inhalt: Content[] = [kopfBlock(modell)];
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
    const { anfang, rest } = inhaltsKnoten(z, modell.mitPreisen);
    if (kopfgruppe.length > 0) {
      inhalt.push({ unbreakable: true, stack: [...kopfgruppe, anfang] });
      kopfgruppe = [];
    } else inhalt.push(anfang);
    if (rest) inhalt.push(rest);
  }
  if (kopfgruppe.length > 0) inhalt.push({ stack: kopfgruppe }); // Titel ohne Kind am Ende
  if (modell.summen) inhalt.push(summenKnoten(modell.summen));
  const stand = erzeugungsdatum(datum);
  return {
    info: { title: modell.name, creationDate: stand, modDate: stand },
    language: 'de-DE',
    tagged,
    pageSize: 'A4',
    pageMargins: [...rand],
    defaultStyle: { font: SCHRIFT, fontSize: 8 },
    header: (seite: number, seiten: number) => ({
      margin: [links, rand[1] - 38, rand[2], 0],
      stack: [
        // Ohne eigenen Kopfzeilentext steht auf der ersten Seite der LV-Name im Kopf des Inhalts.
        {
          text:
            optionen.kopfzeile !== undefined
              ? platzhalter(optionen.kopfzeile, seite, seiten)
              : seite > 1
                ? modell.name
                : '',
          bold: true,
          fontSize: 9,
          margin: [0, 0, 0, 4],
        },
        zeile(
          ['OZ', 'Kurztext', 'Menge', 'Einh.', 'EP in €', 'GP in €'].map((t) => ({
            text: t,
            bold: true,
            fontSize: 7,
          })),
        ),
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: satzbreite, y2: 2, lineWidth: 0.5 }] },
      ],
    }),
    footer: (seite: number, seiten: number) => ({
      margin: [links, 14, rand[2], 0],
      fontSize: 7,
      ...(optionen.fusszeile !== undefined
        ? { text: platzhalter(optionen.fusszeile, seite, seiten) }
        : {
            columns: [
              { text: modell.datum === null ? '' : `Stand: ${modell.datum}`, width: '*' },
              { text: `Seite ${String(seite)} von ${String(seiten)}`, alignment: 'right', width: 'auto' },
            ],
          }),
    }),
    content: inhalt,
  };
}

export interface PdfOptionen extends ModellOptionen {
  // `tagged` steht standardmäßig aus: pdfmake setzt dann zwar /MarkInfo, schreibt aber keinen Strukturbaum. Ein
  // „getaggtes“ PDF ohne Struktur täuscht Barrierefreiheit nur vor (ADR 0012, Messung in Ticket 28).
  readonly tagged?: boolean;
  /** Vorgabe `'normal'` (40 pt links und rechts); `'eng'`: 28 pt, mehr Platz für den Kurztext. */
  readonly seitenrand?: 'normal' | 'eng';
  /** Text im Seitenkopf jeder Seite, mit Platzhaltern (`ersetzePlatzhalter`). Ohne Angabe: der LV-Name ab Seite 2. */
  readonly kopfzeile?: string;
  /** Text im Seitenfuß, mit Platzhaltern. Ohne Angabe: „Stand: Datum“ links und „Seite x von y“ rechts. */
  readonly fusszeile?: string;
}

/**
 * Erzeugt das PDF des LV als Bytes: Kopf, Gliederung mit Positionen und Langtext, Titelsummen, Schlussblöcke, Seitenkopf
 * und -fuß mit „Seite x von y“. `mitPreisen: false` druckt das Blankett für Bieter. Das Datum kommt als Eingabe.
 */
export function erzeugePdf(
  zustand: LvZustand,
  schriften: Schriften,
  optionen: PdfOptionen = {},
): Promise<Uint8Array> {
  return pdfBytes(dokument(baueAusgabemodell(zustand, optionen), optionen), schriften);
}
