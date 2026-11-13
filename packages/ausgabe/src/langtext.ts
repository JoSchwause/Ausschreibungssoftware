// SPDX-License-Identifier: AGPL-3.0-or-later
// Langtext (F6) als druckfertige Blöcke: Absätze aus Textläufen mit Auszeichnung, Listen, Tabellen und Bilder. Die
// Textergänzung wird zu einer markierten Lücke oder zum eingesetzten Wert. Rein darstellend, ohne Rechnung; jeder Renderer
// (PDF, später Excel) liest diese Blöcke, nicht den Vertragstyp.

import type {
  Bild,
  Langtext,
  LangtextBaustein,
  LangtextInnen,
  LangtextInline,
  Textfluss,
} from '@tethys/vertrag';
import { druckbild } from './bild';

export { MAX_BILD_BYTES } from './bild';

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

/**
 * Ein Bild aus dem Langtext (B-22) als eigener Block an seiner Stelle; ein Bild mitten im Absatz teilt ihn. Nur ein
 * vollständiges PNG oder JPEG bis `MAX_BILD_BYTES` wird ein Bildblock; die Größe auf dem Papier begrenzt der Renderer.
 */
export interface DruckBild {
  readonly art: 'bild';
  /** `data:`-Adresse (PNG oder JPEG). */
  readonly daten: string;
  /** Maße in Pixeln. */
  readonly breite: number;
  readonly hoehe: number;
}

export type DruckBlock = DruckAbsatz | DruckListe | DruckTabelle | DruckBild;

/** Lücke einer leeren Textergänzung: der Bieter oder Ausschreibende füllt sie aus. */
export const LUECKE = '[______]';
/**
 * Marke für ein Bild, das der Druck nicht setzen kann (kein vollständiges PNG oder JPEG, zu groß), und für Bilder in reinen
 * Textausgaben: Ihr Fehlen soll sichtbar sein (Q5).
 */
export const BILDMARKE = '[Abbildung]';

const BILDMARKE_LAUF: DruckLauf = { text: BILDMARKE, kursiv: true };

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

/** Bildblock, oder `null`, wenn der Druck das Bild nicht setzen kann (dann steht die Marke im Text). */
function bildBlock(b: Bild): DruckBild | null {
  const d = druckbild(b.daten);
  return d === null ? null : { art: 'bild', ...d };
}

function inlineLaeufe(b: Exclude<LangtextInline, { art: 'bild' }>): DruckLauf[] {
  return b.art === 'umbruch' ? [{ text: '\n' }] : b.text === '' ? [] : [lauf(b.text, b)];
}

/** Blöcke eines Langtexts oder des Inhalts eines Listenpunkts bzw. einer Zelle. */
export function langtextAlsBloecke(langtext: Langtext | LangtextInnen): DruckBlock[] {
  const bloecke: DruckBlock[] = [];
  let laufend: DruckLauf[] = [];
  const abschliessen = (): void => {
    if (laufend.length > 0) bloecke.push({ art: 'absatz', laeufe: laufend });
    laufend = [];
  };
  /** Ein Textbaustein im laufenden Absatz; ein druckbares Bild beendet ihn und steht als eigener Block. */
  const inline = (b: LangtextInline): void => {
    if (b.art !== 'bild') {
      laufend.push(...inlineLaeufe(b));
      return;
    }
    const bild = bildBlock(b.bild);
    if (bild === null) laufend.push(BILDMARKE_LAUF);
    else {
      abschliessen();
      bloecke.push(bild);
    }
  };
  for (const b of langtext as readonly LangtextBaustein[]) {
    switch (b.art) {
      case 'text':
      case 'umbruch':
      case 'bild':
        inline(b);
        break;
      case 'absatz': {
        abschliessen();
        const vorher = bloecke.length;
        b.inhalt.forEach(inline);
        // Ein Absatz mit Inhalt, aber ohne Text (etwa nur leere Läufe) bleibt als leerer Absatz stehen, wie bisher.
        if (laufend.length === 0 && bloecke.length === vorher && b.inhalt.length > 0)
          bloecke.push({ art: 'absatz', laeufe: [] });
        abschliessen();
        break;
      }
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
      case 'bild':
        zeilen.push(BILDMARKE);
        break;
    }
  }
  return zeilen.join('\n');
}
