// SPDX-License-Identifier: AGPL-3.0-or-later
// Langtext (F6) als druckfertige Blöcke: Absätze aus Textläufen mit Auszeichnung, Listen, Tabellen. Die Textergänzung
// wird zu einer markierten Lücke oder zum eingesetzten Wert. Rein darstellend, ohne Rechnung; jeder Renderer (PDF, später
// Excel) liest diese Blöcke, nicht den Vertragstyp.

import type { Langtext, LangtextBaustein, LangtextInnen, LangtextInline, Textfluss } from '@tethys/vertrag';

/** Textlauf mit Auszeichnung. Ein `\n` im Text ist ein Zeilenumbruch. */
export interface DruckLauf {
  readonly text: string;
  readonly fett?: true;
  readonly kursiv?: true;
  readonly unterstrichen?: true;
}

export interface DruckAbsatz {
  readonly art: 'absatz';
  readonly laeufe: readonly DruckLauf[];
}

export interface DruckListe {
  readonly art: 'liste';
  readonly geordnet: boolean;
  readonly punkte: readonly (readonly DruckBlock[])[];
}

export interface DruckZelle {
  readonly spalten: number;
  readonly inhalt: readonly DruckBlock[];
}

export interface DruckTabelle {
  readonly art: 'tabelle';
  readonly zeilen: readonly { readonly zellen: readonly DruckZelle[] }[];
}

export type DruckBlock = DruckAbsatz | DruckListe | DruckTabelle;

/** Lücke einer leeren Textergänzung: der Bieter oder Ausschreibende füllt sie aus. */
export const LUECKE = '[______]';
/** Marke für ein Bild im Text: Bilder druckt v1 nicht, ihr Fehlen soll aber sichtbar sein. */
export const BILDMARKE = '[Abbildung]';

function lauf(text: string, aus: { fett?: true; kursiv?: true; unterstrichen?: true }): DruckLauf {
  return {
    text,
    ...(aus.fett ? { fett: true as const } : {}),
    ...(aus.kursiv ? { kursiv: true as const } : {}),
    ...(aus.unterstrichen ? { unterstrichen: true as const } : {}),
  };
}

function flussLaeufe(fluss: Textfluss): DruckLauf[] {
  return fluss.flatMap((b) =>
    b.art === 'umbruch' ? [{ text: '\n' }] : b.text === '' ? [] : [lauf(b.text, b)],
  );
}

function inlineLaeufe(b: LangtextInline): DruckLauf[] {
  switch (b.art) {
    case 'text':
      return b.text === '' ? [] : [lauf(b.text, b)];
    case 'umbruch':
      return [{ text: '\n' }];
    case 'bild':
      return [{ text: BILDMARKE, kursiv: true }];
  }
}

/** Blöcke eines Langtexts oder des Inhalts eines Listenpunkts bzw. einer Zelle. */
export function langtextAlsBloecke(langtext: Langtext | LangtextInnen): DruckBlock[] {
  const bloecke: DruckBlock[] = [];
  let laufend: DruckLauf[] = [];
  const abschliessen = (): void => {
    if (laufend.length > 0) bloecke.push({ art: 'absatz', laeufe: laufend });
    laufend = [];
  };
  for (const b of langtext as readonly LangtextBaustein[]) {
    switch (b.art) {
      case 'text':
      case 'umbruch':
      case 'bild':
        laufend.push(...inlineLaeufe(b));
        break;
      case 'absatz':
        abschliessen();
        bloecke.push(
          ...(b.inhalt.length === 0
            ? []
            : [{ art: 'absatz' as const, laeufe: b.inhalt.flatMap(inlineLaeufe) }]),
        );
        break;
      case 'liste':
        abschliessen();
        bloecke.push({ art: 'liste', geordnet: b.geordnet, punkte: b.punkte.map(langtextAlsBloecke) });
        break;
      case 'tabelle':
        abschliessen();
        bloecke.push({
          art: 'tabelle',
          zeilen: b.zeilen.map((z) => ({
            zellen: z.zellen.map((c) => ({
              spalten: Math.max(1, c.spalten),
              inhalt: langtextAlsBloecke(c.inhalt),
            })),
          })),
        });
        break;
      case 'ergaenzung': {
        abschliessen();
        const wert = flussLaeufe(b.inhalt);
        const gesetzt = !b.leer && wert.some((l) => l.text.trim() !== '');
        bloecke.push({
          art: 'absatz',
          laeufe: [
            ...flussLaeufe(b.davor),
            gesetzt
              ? { text: '[', unterstrichen: true as const }
              : { text: LUECKE, unterstrichen: true as const },
            ...(gesetzt
              ? [
                  ...wert.map((l) => ({ ...l, unterstrichen: true as const })),
                  { text: ']', unterstrichen: true as const },
                ]
              : []),
            ...flussLaeufe(b.danach),
          ],
        });
        break;
      }
    }
  }
  abschliessen();
  return bloecke;
}

const absatzText = (a: DruckAbsatz): string => a.laeufe.map((l) => l.text).join('');

/** Blöcke als einfacher Text (für Tests und Renderer ohne Auszeichnung): Listen mit „- “ bzw. „1. “, Tabellenzellen mit „ | “. */
export function bloeckeAlsText(bloecke: readonly DruckBlock[]): string {
  const zeilen: string[] = [];
  for (const b of bloecke) {
    switch (b.art) {
      case 'absatz':
        zeilen.push(absatzText(b));
        break;
      case 'liste':
        b.punkte.forEach((p, i) => {
          zeilen.push(`${b.geordnet ? `${String(i + 1)}.` : '-'} ${bloeckeAlsText(p).replace(/\n/g, ' ')}`);
        });
        break;
      case 'tabelle':
        for (const z of b.zeilen)
          zeilen.push(z.zellen.map((c) => bloeckeAlsText(c.inhalt).replace(/\n/g, ' ')).join(' | '));
        break;
    }
  }
  return zeilen.join('\n');
}
