// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 50: LangtextAendern und HinweistextAendern nehmen den vollen Langtext (Vertrag v1.1b) an und prüfen nur seine
// Form, so streng wie `speicher` ihn liest (Ticket 31). Inhalt (Längen, leere Zellen) prüft K8, nie der Befehl (U5).
// Zuerst geschrieben (Q1).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  BildId,
  Hinweistext,
  Langtext,
  LangtextInline,
  LangtextInnen,
  LangtextInnenBaustein,
  LvBefehl,
  LvZustand,
  Position,
  Textergaenzung,
  Textfluss,
  Textlauf,
} from '@tethys/vertrag';
// Das Beispiel steht nicht im Paketindex (nur kompilierbare Doku); A3 erlaubt kern den Ordner `packages/vertrag`.
import { beispielLangtext } from '../../vertrag/src/beispiele';
import { changeSetUmkehren, langtextGleich, lvBefehlAusfuehren, summenBerechnen } from './index';
import { KEINE_SUMMEN, anwenden, id, lvMit, ohneReihenfolge, posKnoten, titelKnoten } from './testhilfen';

const hinweis = (kennung: string, text: Langtext): Hinweistext => ({
  art: 'hinweis',
  id: id.hinweis(kennung),
  elternId: id.eltern('T1'),
  reihenfolge: 2,
  text,
});

function basis(): LvZustand {
  return lvMit([
    titelKnoten('T1', 'lv-test', 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000', { einheit: 'm', langtext: [{ art: 'text', text: 'alt' }] }),
    posKnoten('P2', 'T1', 1, '3.500', '1.235'),
    hinweis('H1', [{ art: 'text', text: 'Hinweis' }]),
  ]);
}

const langtextBefehl = (langtext: unknown, kennung = 'P1'): LvBefehl => ({
  art: 'LangtextAendern',
  positionId: id.pos(kennung),
  langtext: langtext as Langtext,
});
const hinweisBefehl = (text: unknown): LvBefehl => ({
  art: 'HinweistextAendern',
  knotenId: id.hinweis('H1'),
  text: text as Langtext,
});

const bild = (kennung: string) =>
  ({ art: 'bild', bild: { id: kennung as BildId, medientyp: 'image/png', daten: 'QQ==' } }) as const;

/** Langtext in der Form, die der gaeb-Leser aus den amtlichen Dateien erzeugt (BVBS 3.3: Tabellen mit `colspan`,
 * Listen in Zellen, alter Textlauf mit `\n`, leere Absätze und Zellen, Textergänzung mit Umbruch). */
const amtlicheForm: Langtext = [
  { art: 'text', text: 'Zeile eins\nZeile zwei' },
  { art: 'absatz', inhalt: [] },
  {
    art: 'tabelle',
    zeilen: [
      {
        zellen: [
          { spalten: 3, inhalt: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Kopf', fett: true }] }] },
        ],
      },
      {
        zellen: [
          { spalten: 1, inhalt: [] },
          {
            spalten: 2,
            inhalt: [
              { art: 'liste', geordnet: false, punkte: [[{ art: 'text', text: 'a' }], [], [bild('z')]] },
            ],
          },
        ],
      },
      { zellen: [] },
    ],
  },
  { art: 'tabelle', zeilen: [] },
  { art: 'liste', geordnet: true, punkte: [] },
  {
    art: 'ergaenzung',
    herkunft: 'ausschreibender',
    kennung: '',
    leer: false,
    davor: [],
    inhalt: [{ art: 'text', text: 'x', unterstrichen: true }, { art: 'umbruch' }, { art: 'text', text: '' }],
    danach: [],
  },
  { art: 'umbruch' },
];

/** Annahme und Wirkung: genau die Position geändert, keine Summen, Wiederholen leer, Umkehren ergibt den Zustand. */
function erwarteAngenommen(z: LvZustand, b: LvBefehl): void {
  const e = lvBefehlAusfuehren(z, b);
  if (!e.ok) throw new Error(JSON.stringify(e.fehler));
  const cs = e.wert;
  expect(cs.knoten.geaendert).toHaveLength(1);
  expect(cs.summen).toEqual(KEINE_SUMMEN);
  const neu = anwenden(z, cs);
  const nochmal = lvBefehlAusfuehren(neu, b);
  expect(nochmal.ok && nochmal.wert.knoten.geaendert).toEqual([]);
  expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
}

describe('LangtextAendern und HinweistextAendern nehmen den vollen Langtext an', () => {
  it('beispielLangtext aus dem Vertrag', () => {
    erwarteAngenommen(basis(), langtextBefehl(beispielLangtext));
    erwarteAngenommen(basis(), hinweisBefehl(beispielLangtext));
  });

  it('die Formen aus den amtlichen Dateien (leere Absätze, Zellen, Listen; colspan; Umbruch)', () => {
    erwarteAngenommen(basis(), langtextBefehl(amtlicheForm));
    erwarteAngenommen(basis(), hinweisBefehl(amtlicheForm));
  });

  it('Text wird unverändert übernommen: das ChangeSet trägt genau den gesendeten Langtext', () => {
    const e = lvBefehlAusfuehren(basis(), langtextBefehl(beispielLangtext));
    expect(e.ok && (e.wert.knoten.geaendert[0]?.nachher as Position).langtext).toEqual(beispielLangtext);
  });
});

/** Formfehler: `ungueltige-eingabe` mit Feld und einem Pfad in der Meldung, für beide Befehle. */
const FORMFEHLER: readonly (readonly [string, unknown, string])[] = [
  ['kein Array', 'Text', 'langtext'],
  ['Baustein kein Objekt', [null], 'langtext[0]'],
  ['Baustein ist ein Array', [[]], 'langtext[0]'],
  ['unbekannte Art', [{ art: 'fussnote' }], 'langtext[0].art'],
  ['Textlauf ohne Text', [{ art: 'text' }], 'langtext[0].text'],
  ['Auszeichnung false', [{ art: 'text', text: 'a', fett: false }], 'langtext[0].fett'],
  ['fremdes Feld', [{ art: 'text', text: 'a', farbe: 'rot' }], 'langtext[0]'],
  ['Umbruch mit Feld', [{ art: 'umbruch', text: 'x' }], 'langtext[0]'],
  ['Bild ohne Daten', [{ art: 'bild', bild: { id: 'b', medientyp: 'image/png' } }], 'langtext[0].bild'],
  ['Absatz ohne Inhalt', [{ art: 'absatz' }], 'langtext[0].inhalt'],
  [
    'Absatz mit Liste',
    [{ art: 'absatz', inhalt: [{ art: 'liste', geordnet: false, punkte: [] }] }],
    'langtext[0].inhalt[0].art',
  ],
  ['Liste ohne geordnet', [{ art: 'liste', punkte: [] }], 'langtext[0].geordnet'],
  [
    'Listenpunkt kein Array',
    [{ art: 'liste', geordnet: true, punkte: [{ art: 'text', text: 'a' }] }],
    'punkte[0]',
  ],
  [
    'Textergänzung in einem Listenpunkt',
    [
      {
        art: 'liste',
        geordnet: true,
        punkte: [
          [
            {
              art: 'ergaenzung',
              herkunft: 'bieter',
              kennung: '1',
              leer: true,
              davor: [],
              inhalt: [],
              danach: [],
            },
          ],
        ],
      },
    ],
    'langtext[0].punkte[0][0].art',
  ],
  [
    'Textergänzung in einer Tabellenzelle',
    [
      {
        art: 'tabelle',
        zeilen: [
          {
            zellen: [
              {
                spalten: 1,
                inhalt: [
                  {
                    art: 'ergaenzung',
                    herkunft: 'bieter',
                    kennung: '1',
                    leer: true,
                    davor: [],
                    inhalt: [],
                    danach: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    'langtext[0].zeilen[0].zellen[0].inhalt[0].art',
  ],
  ['Zeile ohne Zellen', [{ art: 'tabelle', zeilen: [{}] }], 'langtext[0].zeilen[0].zellen'],
  ['spalten 0', [{ art: 'tabelle', zeilen: [{ zellen: [{ spalten: 0, inhalt: [] }] }] }], 'spalten'],
  [
    'spalten gebrochen',
    [{ art: 'tabelle', zeilen: [{ zellen: [{ spalten: 1.5, inhalt: [] }] }] }],
    'spalten',
  ],
  ['spalten Text', [{ art: 'tabelle', zeilen: [{ zellen: [{ spalten: '1', inhalt: [] }] }] }], 'spalten'],
  [
    'Herkunft unbekannt',
    [{ art: 'ergaenzung', herkunft: 'planer', kennung: '1', leer: true, davor: [], inhalt: [], danach: [] }],
    'langtext[0].herkunft',
  ],
  [
    'leer kein Wahrheitswert',
    [{ art: 'ergaenzung', herkunft: 'bieter', kennung: '1', leer: 'ja', davor: [], inhalt: [], danach: [] }],
    'langtext[0].leer',
  ],
  [
    'Bild in einer Textergänzung',
    [
      {
        art: 'ergaenzung',
        herkunft: 'bieter',
        kennung: '1',
        leer: true,
        davor: [],
        inhalt: [bild('b')],
        danach: [],
      },
    ],
    'langtext[0].inhalt[0].art',
  ],
  [
    'Absatz in einer Textergänzung',
    [
      {
        art: 'ergaenzung',
        herkunft: 'bieter',
        kennung: '1',
        leer: true,
        davor: [{ art: 'absatz', inhalt: [] }],
        inhalt: [],
        danach: [],
      },
    ],
    'langtext[0].davor[0].art',
  ],
];

describe('Formfehler bleiben ungueltige-eingabe mit Feld', () => {
  it.each(FORMFEHLER)('%s', (_name, wert, pfad) => {
    const z = basis();
    const a = lvBefehlAusfuehren(z, langtextBefehl(wert));
    expect(a.ok).toBe(false);
    if (a.ok) return;
    expect(a.fehler.code).toBe('ungueltige-eingabe');
    expect(a.fehler.feld).toBe('langtext');
    expect(a.fehler.knotenId).toBe('P1');
    expect(a.fehler.meldung).toContain(pfad);
    const h = lvBefehlAusfuehren(z, hinweisBefehl(wert));
    expect(!h.ok && h.fehler.code).toBe('ungueltige-eingabe');
    expect(!h.ok && h.fehler.feld).toBe('text');
    expect(!h.ok && h.fehler.meldung).toContain(pfad.replace(/^langtext/, 'text'));
  });
});

describe('langtextGleich vergleicht den ganzen Baum', () => {
  it('gleiche Struktur in anderen Objekten ist gleich', () => {
    expect(langtextGleich(beispielLangtext, structuredClone(beispielLangtext))).toBe(true);
    expect(langtextGleich(amtlicheForm, structuredClone(amtlicheForm))).toBe(true);
  });

  it('jede Abweichung in Auszeichnung, Struktur oder Ergänzung zählt', () => {
    const varianten: Langtext[] = [
      [{ art: 'text', text: 'a', fett: true }],
      [{ art: 'text', text: 'a', kursiv: true }],
      [{ art: 'text', text: 'a', unterstrichen: true }],
      [{ art: 'absatz', inhalt: [{ art: 'text', text: 'a' }] }],
      [{ art: 'absatz', inhalt: [{ art: 'text', text: 'a' }, { art: 'umbruch' }] }],
      [{ art: 'liste', geordnet: true, punkte: [[{ art: 'text', text: 'a' }]] }],
      [{ art: 'liste', geordnet: false, punkte: [[{ art: 'text', text: 'a' }]] }],
      [{ art: 'liste', geordnet: false, punkte: [[{ art: 'text', text: 'a' }], []] }],
      [{ art: 'tabelle', zeilen: [{ zellen: [{ spalten: 1, inhalt: [{ art: 'text', text: 'a' }] }] }] }],
      [{ art: 'tabelle', zeilen: [{ zellen: [{ spalten: 2, inhalt: [{ art: 'text', text: 'a' }] }] }] }],
      [{ art: 'tabelle', zeilen: [{ zellen: [{ spalten: 1, inhalt: [{ art: 'text', text: 'b' }] }] }] }],
      [{ art: 'tabelle', zeilen: [{ zellen: [] }, { zellen: [] }] }],
      [{ art: 'text', text: 'a' }],
      [{ art: 'umbruch' }],
      ...(['bieter', 'ausschreibender'] as const).flatMap((herkunft) =>
        [true, false].map((leer): Langtext => [
          { art: 'ergaenzung', herkunft, kennung: '1', leer, davor: [], inhalt: [], danach: [] },
        ]),
      ),
      [
        {
          art: 'ergaenzung',
          herkunft: 'bieter',
          kennung: '2',
          leer: true,
          davor: [],
          inhalt: [],
          danach: [],
        },
      ],
      [
        {
          art: 'ergaenzung',
          herkunft: 'bieter',
          kennung: '1',
          leer: true,
          davor: [{ art: 'umbruch' }],
          inhalt: [],
          danach: [],
        },
      ],
      [
        {
          art: 'ergaenzung',
          herkunft: 'bieter',
          kennung: '1',
          leer: true,
          davor: [],
          inhalt: [],
          danach: [{ art: 'umbruch' }],
        },
      ],
    ];
    varianten.forEach((a, i) => {
      varianten.forEach((b, j) => {
        expect(langtextGleich(a, b)).toBe(i === j);
      });
    });
  });
});

// --- Property-Test: zufälliger formgültiger Langtext -----------------------------------------------------------

const textArb = fc.string({ maxLength: 6, unit: fc.constantFrom('a', 'Ü', ' ', '\n', '²') });
const textlaufArb: fc.Arbitrary<Textlauf> = fc
  .record(
    {
      text: textArb,
      fett: fc.constant(true as const),
      kursiv: fc.constant(true as const),
      unterstrichen: fc.constant(true as const),
    },
    { requiredKeys: ['text'] },
  )
  .map((t) => ({ art: 'text', ...t }));
const umbruchArb = fc.constant({ art: 'umbruch' } as const);
const bildArb = fc.constantFrom('b1', 'b2').map(bild);
const inlineArb: fc.Arbitrary<LangtextInline> = fc.oneof(textlaufArb, umbruchArb, bildArb);
const flussArb: fc.Arbitrary<Textfluss> = fc.array(fc.oneof(textlaufArb, umbruchArb), { maxLength: 3 });

const { baustein } = fc.letrec<{ innen: LangtextInnen; baustein: LangtextInnenBaustein }>((tie) => ({
  innen: fc.array(tie('baustein'), { maxLength: 3 }),
  baustein: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    inlineArb,
    fc.array(inlineArb, { maxLength: 3 }).map((inhalt) => ({ art: 'absatz', inhalt }) as const),
    fc
      .record({ geordnet: fc.boolean(), punkte: fc.array(tie('innen'), { maxLength: 3 }) })
      .map((l) => ({ art: 'liste', ...l }) as const),
    fc
      .array(
        fc
          .array(fc.record({ spalten: fc.integer({ min: 1, max: 4 }), inhalt: tie('innen') }), {
            maxLength: 3,
          })
          .map((zellen) => ({ zellen })),
        { maxLength: 3 },
      )
      .map((zeilen) => ({ art: 'tabelle', zeilen }) as const),
  ),
}));
const ergaenzungArb: fc.Arbitrary<Textergaenzung> = fc
  .record({
    herkunft: fc.constantFrom('bieter' as const, 'ausschreibender' as const),
    kennung: fc.constantFrom('', '1', '60'),
    leer: fc.boolean(),
    davor: flussArb,
    inhalt: flussArb,
    danach: flussArb,
  })
  .map((e) => ({ art: 'ergaenzung', ...e }));
const langtextArb: fc.Arbitrary<Langtext> = fc.array(fc.oneof(baustein, ergaenzungArb), { maxLength: 5 });

describe('Eigenschaft: zufälliger formgültiger Langtext', () => {
  it('wird angenommen, ist umkehrbar, Summen bleiben gleich', () => {
    fc.assert(
      fc.property(langtextArb, fc.boolean(), (langtext, alsHinweis) => {
        const z = basis();
        const b = alsHinweis ? hinweisBefehl(langtext) : langtextBefehl(langtext);
        const e = lvBefehlAusfuehren(z, b);
        if (!e.ok) throw new Error(JSON.stringify(e.fehler));
        const cs = e.wert;
        const neu = anwenden(z, cs);
        expect(cs.summen).toEqual(KEINE_SUMMEN);
        expect(neu.summen).toEqual(z.summen);
        expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
        const rueck = changeSetUmkehren(cs);
        expect(anwenden(neu, rueck)).toEqual(z);
        expect(ohneReihenfolge(changeSetUmkehren(rueck))).toEqual(ohneReihenfolge(cs));
        // Derselbe Wert noch einmal, als Kopie: leeres ChangeSet (strukturelle Gleichheit über den ganzen Baum)
        const nochmal = lvBefehlAusfuehren(
          neu,
          alsHinweis ? hinweisBefehl(structuredClone(langtext)) : langtextBefehl(structuredClone(langtext)),
        );
        expect(nochmal.ok && nochmal.wert.knoten.geaendert).toEqual([]);
        expect(langtextGleich(langtext, structuredClone(langtext))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});
