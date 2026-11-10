// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Langtext-Abbildung und des Schemas (Ticket 34), ohne DOM.

import type {
  BildId,
  Langtext,
  LangtextBaustein,
  LangtextInline,
  LangtextInnen,
  LangtextInnenBaustein,
  Liste,
  Tabelle,
  Textergaenzung,
  Textlauf,
  Zeilenumbruch,
} from '@tethys/vertrag';
import { Node as PmNode } from '@tiptap/pm/model';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { dokumentZuLangtext, langtextKanonisch, langtextZuDokument } from './abbildung';
import { langtextSchema } from './schema';

const LAEUFE = 500;
const schema = langtextSchema();

// --- Erzeuger ---------------------------------------------------------------------------------------

/** Wenige Zeichen, damit gleiche Auszeichnungen, leere Läufe und `\n` (Altwerte) oft vorkommen. */
const text = fc.string({ unit: fc.constantFrom('a', 'b', ' ', 'ä', '\n'), maxLength: 4 });

const textlauf: fc.Arbitrary<Textlauf> = fc
  .record(
    { text, fett: fc.constant(true), kursiv: fc.constant(true), unterstrichen: fc.constant(true) },
    { requiredKeys: ['text'] },
  )
  .map((r): Textlauf => ({ art: 'text', ...r }));

const umbruch: fc.Arbitrary<Zeilenumbruch> = fc.constant({ art: 'umbruch' });

const bild: fc.Arbitrary<LangtextInline> = fc
  .record({
    id: fc.constantFrom('b1', 'b2'),
    medientyp: fc.constantFrom('image/png', 'image/jpeg'),
    daten: fc.base64String({ maxLength: 8 }),
  })
  .map(({ id, medientyp, daten }) => ({ art: 'bild', bild: { id: id as BildId, medientyp, daten } }));

const inline: fc.Arbitrary<LangtextInline> = fc.oneof(textlauf, textlauf, umbruch, bild);

const ergaenzung: fc.Arbitrary<Textergaenzung> = fc
  .record({
    herkunft: fc.constantFrom('bieter' as const, 'ausschreibender' as const),
    kennung: fc.string({ maxLength: 3 }),
    leer: fc.boolean(),
    davor: fc.array(fc.oneof(textlauf, umbruch), { maxLength: 3 }),
    inhalt: fc.array(fc.oneof(textlauf, umbruch), { maxLength: 3 }),
    danach: fc.array(fc.oneof(textlauf, umbruch), { maxLength: 3 }),
  })
  .map((r) => ({ art: 'ergaenzung', ...r }));

/** Innenbausteine bis Tiefe 4: Inline, Absatz, Liste, Tabelle (auch leere Punkte und Zellen, `spalten > 1`). */
const { baustein: innenBaustein } = fc.letrec<{
  innen: LangtextInnen;
  baustein: LangtextInnenBaustein;
  liste: Liste;
  tabelle: Tabelle;
}>((tie) => ({
  innen: fc.array(tie('baustein'), { maxLength: 4 }),
  baustein: fc.oneof(
    { maxDepth: 4, depthIdentifier: 'langtext' },
    inline,
    fc.array(inline, { maxLength: 3 }).map((inhalt) => ({ art: 'absatz', inhalt }) as const),
    tie('liste'),
    tie('tabelle'),
  ),
  liste: fc.record({
    art: fc.constant('liste'),
    geordnet: fc.boolean(),
    punkte: fc.array(tie('innen'), { minLength: 1, maxLength: 3 }),
  }),
  tabelle: fc.record({
    art: fc.constant('tabelle'),
    zeilen: fc.array(
      fc.record({
        zellen: fc.array(fc.record({ spalten: fc.integer({ min: 1, max: 3 }), inhalt: tie('innen') }), {
          minLength: 1,
          maxLength: 3,
        }),
      }),
      { minLength: 1, maxLength: 3 },
    ),
  }),
}));

const langtext: fc.Arbitrary<Langtext> = fc.array(
  fc.oneof<fc.Arbitrary<LangtextBaustein>[]>(innenBaustein, inline, ergaenzung),
  { maxLength: 6 },
);

/** Sichtbarer Text in Lesereihenfolge (Umbrüche und Grenzen als Trenner, damit Zusammenziehen ihn nicht ändert). */
function klartext(l: readonly LangtextBaustein[]): string {
  return l
    .map((b): string => {
      switch (b.art) {
        case 'text':
          return b.text;
        case 'umbruch':
          return ' ';
        case 'bild':
          return `[${b.bild.id}]`;
        case 'absatz':
          return `¶${klartext(b.inhalt)}¶`;
        case 'liste':
          return `•${b.punkte.map(klartext).join('•')}•`;
        case 'tabelle':
          return b.zeilen.map((z) => `|${z.zellen.map((c) => klartext(c.inhalt)).join('|')}|`).join('');
        case 'ergaenzung':
          return `{${klartext(b.davor)}/${klartext(b.inhalt)}/${klartext(b.danach)}}`;
      }
    })
    .join('');
}

// --- Eigenschaften ----------------------------------------------------------------------------------

describe('Langtext-Abbildung (Eigenschaften)', () => {
  it('Rundweg ergibt die kanonische Form', () => {
    fc.assert(
      fc.property(langtext, (l) => {
        expect(dokumentZuLangtext(langtextZuDokument(l))).toStrictEqual(langtextKanonisch(l));
      }),
      { numRuns: LAEUFE },
    );
  });

  it('Rundweg einer kanonischen Eingabe ist die Identität', () => {
    fc.assert(
      fc.property(langtext, (roh) => {
        const l = langtextKanonisch(roh);
        expect(dokumentZuLangtext(langtextZuDokument(l))).toStrictEqual(l);
      }),
      { numRuns: LAEUFE },
    );
  });

  it('das erzeugte Dokument ist im Schema gültig', () => {
    fc.assert(
      fc.property(langtext, (l) => {
        expect(() => {
          PmNode.fromJSON(schema, langtextZuDokument(l)).check();
        }).not.toThrow();
      }),
      { numRuns: LAEUFE },
    );
  });

  it('langtextKanonisch ist idempotent und ändert keinen sichtbaren Text', () => {
    fc.assert(
      fc.property(langtext, (l) => {
        const k = langtextKanonisch(l);
        expect(langtextKanonisch(k)).toStrictEqual(k);
        expect(klartext(k)).toBe(klartext(l));
      }),
      { numRuns: LAEUFE },
    );
  });
});

describe('Schema', () => {
  const ergaenzungsKnoten = langtextZuDokument([
    {
      art: 'ergaenzung',
      herkunft: 'ausschreibender',
      kennung: 'A1',
      leer: false,
      davor: [],
      inhalt: [{ art: 'text', text: 'x' }],
      danach: [],
    },
  ]).content?.[0];

  it('stellt eine Textergänzung auf oberster Ebene dar', () => {
    expect(() => {
      PmNode.fromJSON(schema, { type: 'doc', content: [ergaenzungsKnoten] }).check();
    }).not.toThrow();
  });

  it('kann eine Textergänzung in einer Tabellenzelle oder einem Listenpunkt nicht darstellen', () => {
    const inZelle = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [ergaenzungsKnoten] }] }],
        },
      ],
    };
    const inPunkt = {
      type: 'doc',
      content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [ergaenzungsKnoten] }] }],
    };
    expect(() => {
      PmNode.fromJSON(schema, inZelle).check();
    }).toThrow();
    expect(() => {
      PmNode.fromJSON(schema, inPunkt).check();
    }).toThrow();
  });

  it('kennt nur die erlaubten Knoten und Marken', () => {
    expect(Object.keys(schema.nodes).sort()).toEqual(
      [
        'bulletList',
        'doc',
        'hardBreak',
        'image',
        'listItem',
        'orderedList',
        'paragraph',
        'table',
        'tableCell',
        'tableRow',
        'text',
        'textergaenzung',
      ].sort(),
    );
    expect(Object.keys(schema.marks).sort()).toEqual(['bold', 'italic', 'underline']);
    expect(Object.keys(schema.nodes['tableCell']?.spec.attrs ?? {}).sort()).toEqual([
      'colspan',
      'colwidth',
      'rowspan',
    ]);
    expect(Object.keys(schema.nodes['orderedList']?.spec.attrs ?? {})).toEqual([]);
  });
});
