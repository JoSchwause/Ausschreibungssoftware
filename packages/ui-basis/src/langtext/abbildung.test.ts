// SPDX-License-Identifier: AGPL-3.0-or-later
// Abbildung Langtext <-> Editor-Dokument (Ticket 34): Beispiele und Eigenschaften, ohne DOM.

import type { BildId, Langtext, Textergaenzung } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { dokumentZuLangtext, langtextKanonisch, langtextZuDokument } from './abbildung';

const rundweg = (l: Langtext): Langtext => dokumentZuLangtext(langtextZuDokument(l));

const bild = {
  art: 'bild',
  bild: { id: 'bild-1' as BildId, medientyp: 'image/png', daten: 'iVBORw0KGgo=' },
} as const;

const ergaenzung: Textergaenzung = {
  art: 'ergaenzung',
  herkunft: 'bieter',
  kennung: '01',
  leer: true,
  davor: [{ art: 'text', text: 'Fabrikat: ', fett: true }, { art: 'umbruch' }],
  inhalt: [
    { art: 'text', text: '' },
    { art: 'text', text: '' },
  ],
  danach: [{ art: 'text', text: ' oder gleichwertig' }],
};

describe('langtextZuDokument', () => {
  it('bildet einen leeren Langtext auf ein Dokument mit einem leeren losen Absatz ab', () => {
    expect(langtextZuDokument([])).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { lose: true } }],
    });
  });

  it('macht lose Inline-Bausteine zu einem losen Absatz und den Absatz zu einem nicht losen', () => {
    expect(
      langtextZuDokument([
        { art: 'text', text: 'a', fett: true, unterstrichen: true },
        { art: 'umbruch' },
        { art: 'absatz', inhalt: [{ art: 'text', text: 'b', kursiv: true }] },
      ]),
    ).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lose: true },
          content: [
            { type: 'text', text: 'a', marks: [{ type: 'bold' }, { type: 'underline' }] },
            { type: 'hardBreak' },
          ],
        },
        {
          type: 'paragraph',
          attrs: { lose: false },
          content: [{ type: 'text', text: 'b', marks: [{ type: 'italic' }] }],
        },
      ],
    });
  });

  it('bildet Tabellenzellen mit colspan = spalten und leere Zellen als leeren losen Absatz ab', () => {
    const dokument = langtextZuDokument([
      { art: 'tabelle', zeilen: [{ zellen: [{ spalten: 2, inhalt: [] }] }] },
    ]);
    expect(dokument.content?.[0]).toEqual({
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              attrs: { colspan: 2, rowspan: 1, colwidth: null },
              content: [{ type: 'paragraph', attrs: { lose: true } }],
            },
          ],
        },
      ],
    });
  });
});

describe('Rundweg Langtext -> Dokument -> Langtext', () => {
  it('bringt eine Textergänzung mit allen sechs Feldern unverändert zurück', () => {
    const l: Langtext = [{ art: 'text', text: 'vor' }, ergaenzung, { art: 'text', text: 'nach' }];
    const zurueck = rundweg(l);
    expect(zurueck).toStrictEqual(l);
    expect(zurueck[1]).toStrictEqual(ergaenzung);
  });

  it('erhält Bild, Listen (auch leere Punkte) und Tabellen', () => {
    const l: Langtext = [
      bild,
      { art: 'liste', geordnet: true, punkte: [[], [{ art: 'text', text: 'x' }, { art: 'absatz', inhalt: [] }]] },
      { art: 'liste', geordnet: false, punkte: [[{ art: 'liste', geordnet: true, punkte: [[bild]] }]] },
      {
        art: 'tabelle',
        zeilen: [
          { zellen: [{ spalten: 1, inhalt: [bild] }, { spalten: 3, inhalt: [] }] },
          { zellen: [{ spalten: 4, inhalt: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'z\nz' }] }] }] },
        ],
      },
    ];
    expect(rundweg(l)).toStrictEqual(l);
  });

  it('macht aus zwei losen Absätzen nacheinander (wie nach Enter) einen losen Lauf und einen Absatz', () => {
    const l = dokumentZuLangtext({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { lose: true }, content: [{ type: 'text', text: 'erste' }] },
        { type: 'paragraph', attrs: { lose: true }, content: [{ type: 'text', text: 'zweite' }] },
      ],
    });
    expect(l).toStrictEqual([
      { art: 'text', text: 'erste' },
      { art: 'absatz', inhalt: [{ art: 'text', text: 'zweite' }] },
    ]);
  });
});

describe('langtextKanonisch', () => {
  it('zieht benachbarte Textläufe gleicher Auszeichnung zusammen und streicht leere', () => {
    expect(
      langtextKanonisch([
        { art: 'text', text: 'a', fett: true },
        { art: 'text', text: '' },
        { art: 'text', text: 'b', fett: true },
        { art: 'text', text: 'c' },
        { art: 'absatz', inhalt: [{ art: 'text', text: '' }] },
      ]),
    ).toStrictEqual([
      { art: 'text', text: 'ab', fett: true },
      { art: 'text', text: 'c' },
      { art: 'absatz', inhalt: [] },
    ]);
  });

  it('lässt eine Textergänzung unverändert, auch mit leeren Läufen darin', () => {
    expect(langtextKanonisch([ergaenzung])).toStrictEqual([ergaenzung]);
  });
});
