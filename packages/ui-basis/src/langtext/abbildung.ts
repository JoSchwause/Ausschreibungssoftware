// SPDX-License-Identifier: AGPL-3.0-or-later
// Abbildung `Langtext` <-> JSON-Dokument des Langtext-Editors (Ticket 34, F6). Reine Funktionen ohne DOM und ohne
// TipTap zur Laufzeit; die Knotennamen müssen zum Schema in `schema.ts` passen.
//
// - Lose Inline-Bausteine (Textläufe, Umbrüche, Bilder ohne Absatz) werden je maximaler Folge ein Absatz mit
//   `lose: true`; ein leerer Langtext, Listenpunkt oder eine leere Zelle ist ein leerer loser Absatz.
// - Folgt beim Zurückabbilden ein loser Absatz direkt auf einen losen, wird er ein `absatz` (entsteht nur durch
//   Bearbeiten, z. B. Enter).
// - ProseMirror verschmilzt Textknoten gleicher Marken und kennt keine leeren; der Rundweg ist daher
//   `langtextKanonisch(l)`, nicht `l`. Die Textergänzung trägt ihre sechs Felder unverändert als Daten.

import type {
  Absatz,
  Bild,
  BildId,
  Ergaenzungsherkunft,
  Langtext,
  LangtextBaustein,
  LangtextInline,
  LangtextInnen,
  LangtextInnenBaustein,
  Liste,
  Tabelle,
  Textergaenzung,
  Textfluss,
  Textlauf,
} from '@tethys/vertrag';

/** Marke eines Textknotens im Editor-Dokument. */
export interface DokumentMarke {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
}

/** Knoten des Editor-Dokuments (JSON wie `editor.getJSON()` / `Node.toJSON()`). */
export interface DokumentKnoten {
  readonly type?: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly DokumentKnoten[];
  readonly marks?: readonly DokumentMarke[];
  readonly text?: string;
}

/** Knotennamen des Schemas (siehe `schema.ts`). */
export const KNOTEN = {
  dokument: 'doc',
  absatz: 'paragraph',
  text: 'text',
  umbruch: 'hardBreak',
  aufzaehlung: 'bulletList',
  nummerierteListe: 'orderedList',
  listenpunkt: 'listItem',
  tabelle: 'table',
  tabellenzeile: 'tableRow',
  tabellenzelle: 'tableCell',
  bild: 'image',
  textergaenzung: 'textergaenzung',
} as const;

/** Markennamen des Schemas, in der Reihenfolge des Schemas. */
export const MARKEN = { fett: 'bold', kursiv: 'italic', unterstrichen: 'underline' } as const;

// --- Kanonische Form -----------------------------------------------------------------------------

/**
 * Kanonische Form eines Langtexts (vorläufige Annahme, Ticket 34): benachbarte Textläufe mit gleicher Auszeichnung
 * werden zusammengezogen, leere Textläufe gestrichen. Sonst nichts; Textergänzungen bleiben unverändert, ein `\n` im
 * Text bleibt stehen.
 */
export function langtextKanonisch(l: Langtext): Langtext {
  return kanonischeFolge(l, kanonischerBaustein);
}

function kanonischerBaustein(b: LangtextBaustein): LangtextBaustein {
  return b.art === 'ergaenzung' ? b : kanonischerInnenBaustein(b);
}

function kanonischerInnenBaustein(b: LangtextInnenBaustein): LangtextInnenBaustein {
  switch (b.art) {
    case 'absatz':
      return { art: 'absatz', inhalt: kanonischeFolge(b.inhalt, (x) => x) };
    case 'liste':
      return { art: 'liste', geordnet: b.geordnet, punkte: b.punkte.map(kanonischInnen) };
    case 'tabelle':
      return {
        art: 'tabelle',
        zeilen: b.zeilen.map((z) => ({
          zellen: z.zellen.map((c) => ({ spalten: c.spalten, inhalt: kanonischInnen(c.inhalt) })),
        })),
      };
    default:
      return b;
  }
}

function kanonischInnen(l: LangtextInnen): LangtextInnen {
  return kanonischeFolge(l, kanonischerInnenBaustein);
}

/** Streicht leere Textläufe und zieht benachbarte gleicher Auszeichnung zusammen; andere Bausteine über `abbilden`. */
function kanonischeFolge<T extends { readonly art: string }>(
  folge: readonly T[],
  abbilden: (b: T) => T,
): T[] {
  const aus: T[] = [];
  for (const b of folge) {
    if (istTextlauf(b)) {
      if (b.text === '') continue;
      const vorher = aus.at(-1);
      if (vorher !== undefined && istTextlauf(vorher) && gleicheAuszeichnung(vorher, b)) {
        aus[aus.length - 1] = textlauf(vorher.text + b.text, vorher) as unknown as T;
        continue;
      }
      aus.push(textlauf(b.text, b) as unknown as T);
      continue;
    }
    aus.push(abbilden(b));
  }
  return aus;
}

function istTextlauf(b: { readonly art: string }): b is Textlauf {
  return b.art === 'text';
}

function gleicheAuszeichnung(a: Textlauf, b: Textlauf): boolean {
  return a.fett === b.fett && a.kursiv === b.kursiv && a.unterstrichen === b.unterstrichen;
}

/** Textlauf ohne `undefined`-Felder (nur `true` oder fehlend, wie im Vertrag). */
function textlauf(
  text: string,
  a: { readonly fett?: true; readonly kursiv?: true; readonly unterstrichen?: true },
) {
  return {
    art: 'text',
    text,
    ...(a.fett ? { fett: true } : {}),
    ...(a.kursiv ? { kursiv: true } : {}),
    ...(a.unterstrichen ? { unterstrichen: true } : {}),
  } as Textlauf;
}

// --- Langtext -> Dokument ------------------------------------------------------------------------

/** JSON-Dokument des Editors zu einem Langtext (über die kanonische Form). */
export function langtextZuDokument(l: Langtext): DokumentKnoten {
  return { type: KNOTEN.dokument, content: bloecke(langtextKanonisch(l)) };
}

function bloecke(folge: readonly LangtextBaustein[]): DokumentKnoten[] {
  const aus: DokumentKnoten[] = [];
  let lauf: LangtextInline[] = [];
  const abschliessen = (): void => {
    if (lauf.length > 0) aus.push(absatzKnoten(lauf, true));
    lauf = [];
  };
  for (const b of folge) {
    switch (b.art) {
      case 'text':
      case 'umbruch':
      case 'bild':
        lauf.push(b);
        break;
      case 'absatz':
        abschliessen();
        aus.push(absatzKnoten(b.inhalt, false));
        break;
      case 'liste':
        abschliessen();
        aus.push(listenKnoten(b));
        break;
      case 'tabelle':
        abschliessen();
        aus.push(tabellenKnoten(b));
        break;
      case 'ergaenzung':
        abschliessen();
        aus.push(ergaenzungsKnoten(b));
        break;
    }
  }
  abschliessen();
  if (aus.length === 0) aus.push(absatzKnoten([], true));
  return aus;
}

function absatzKnoten(inhalt: readonly LangtextInline[], lose: boolean): DokumentKnoten {
  const knoten = { type: KNOTEN.absatz, attrs: { lose } };
  return inhalt.length === 0 ? knoten : { ...knoten, content: inhalt.map(inlineKnoten) };
}

function inlineKnoten(b: LangtextInline): DokumentKnoten {
  switch (b.art) {
    case 'text': {
      const marken: DokumentMarke[] = [];
      if (b.fett) marken.push({ type: MARKEN.fett });
      if (b.kursiv) marken.push({ type: MARKEN.kursiv });
      if (b.unterstrichen) marken.push({ type: MARKEN.unterstrichen });
      return marken.length === 0
        ? { type: KNOTEN.text, text: b.text }
        : { type: KNOTEN.text, text: b.text, marks: marken };
    }
    case 'umbruch':
      return { type: KNOTEN.umbruch };
    case 'bild':
      return {
        type: KNOTEN.bild,
        attrs: { id: b.bild.id, medientyp: b.bild.medientyp, daten: b.bild.daten },
      };
  }
}

function listenKnoten(b: Liste): DokumentKnoten {
  return {
    type: b.geordnet ? KNOTEN.nummerierteListe : KNOTEN.aufzaehlung,
    content: b.punkte.map((p) => ({ type: KNOTEN.listenpunkt, content: bloecke(p) })),
  };
}

function tabellenKnoten(b: Tabelle): DokumentKnoten {
  return {
    type: KNOTEN.tabelle,
    content: b.zeilen.map((z) => ({
      type: KNOTEN.tabellenzeile,
      content: z.zellen.map((c) => ({
        type: KNOTEN.tabellenzelle,
        attrs: { colspan: c.spalten, rowspan: 1, colwidth: null },
        content: bloecke(c.inhalt),
      })),
    })),
  };
}

function ergaenzungsKnoten(b: Textergaenzung): DokumentKnoten {
  return {
    type: KNOTEN.textergaenzung,
    attrs: {
      herkunft: b.herkunft,
      kennung: b.kennung,
      leer: b.leer,
      davor: b.davor,
      inhalt: b.inhalt,
      danach: b.danach,
    },
  };
}

// --- Dokument -> Langtext ------------------------------------------------------------------------

/** Langtext zu einem JSON-Dokument des Editors. Wirft bei einem Knoten, den das Schema nicht kennt. */
export function dokumentZuLangtext(d: DokumentKnoten): Langtext {
  return folgeAus(d.content ?? [], true);
}

function folgeAus(knoten: readonly DokumentKnoten[], obersteEbene: boolean): LangtextBaustein[] {
  const aus: LangtextBaustein[] = [];
  let vorherLose = false;
  for (const k of knoten) {
    if (k.type === KNOTEN.absatz) {
      const lose = k.attrs?.['lose'] === true;
      const inhalt = (k.content ?? []).map(inlineAus);
      if (lose && !vorherLose) aus.push(...inhalt);
      else aus.push({ art: 'absatz', inhalt } satisfies Absatz);
      vorherLose = lose;
      continue;
    }
    vorherLose = false;
    if (k.type === KNOTEN.textergaenzung && obersteEbene) aus.push(ergaenzungAus(k));
    else aus.push(innenBlockAus(k));
  }
  return aus;
}

function innenAus(knoten: readonly DokumentKnoten[]): LangtextInnen {
  return folgeAus(knoten, false) as LangtextInnenBaustein[];
}

function innenBlockAus(k: DokumentKnoten): LangtextInnenBaustein {
  switch (k.type) {
    case KNOTEN.aufzaehlung:
    case KNOTEN.nummerierteListe:
      return {
        art: 'liste',
        geordnet: k.type === KNOTEN.nummerierteListe,
        punkte: (k.content ?? []).map((p) => innenAus(p.content ?? [])),
      };
    case KNOTEN.tabelle:
      return {
        art: 'tabelle',
        zeilen: (k.content ?? []).map((z) => ({
          zellen: (z.content ?? []).map((c) => ({
            spalten: Number(c.attrs?.['colspan'] ?? 1),
            inhalt: innenAus(c.content ?? []),
          })),
        })),
      };
    default:
      throw new Error(`Langtext-Editor: unbekannter Block „${String(k.type)}“`);
  }
}

function inlineAus(k: DokumentKnoten): LangtextInline {
  switch (k.type) {
    case KNOTEN.text: {
      const marken = new Set((k.marks ?? []).map((m) => m.type));
      return textlauf(k.text ?? '', {
        ...(marken.has(MARKEN.fett) ? { fett: true } : {}),
        ...(marken.has(MARKEN.kursiv) ? { kursiv: true } : {}),
        ...(marken.has(MARKEN.unterstrichen) ? { unterstrichen: true } : {}),
      });
    }
    case KNOTEN.umbruch:
      return { art: 'umbruch' };
    case KNOTEN.bild: {
      const a = k.attrs ?? {};
      const bild: Bild = {
        id: String(a['id']) as BildId,
        medientyp: String(a['medientyp']),
        daten: String(a['daten']),
      };
      return { art: 'bild', bild };
    }
    default:
      throw new Error(`Langtext-Editor: unbekannter Inline-Knoten „${String(k.type)}“`);
  }
}

function ergaenzungAus(k: DokumentKnoten): Textergaenzung {
  const a = k.attrs ?? {};
  return {
    art: 'ergaenzung',
    herkunft: a['herkunft'] as Ergaenzungsherkunft,
    kennung: String(a['kennung']),
    leer: a['leer'] === true,
    davor: a['davor'] as Textfluss,
    inhalt: a['inhalt'] as Textfluss,
    danach: a['danach'] as Textfluss,
  };
}
