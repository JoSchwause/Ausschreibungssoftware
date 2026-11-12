// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type { BildId, Langtext } from '@tethys/vertrag';
import { bloeckeAlsText, langtextAlsBloecke } from './langtext';

const bild = { id: 'bild-1' as BildId, medientyp: 'image/png', daten: 'iVBORw0KGgo=' };

const beispiel: Langtext = [
  {
    art: 'absatz',
    inhalt: [
      { art: 'text', text: 'Wand ' },
      { art: 'text', text: 'tragend', fett: true },
      { art: 'umbruch' },
      { art: 'text', text: 'nach Plan', kursiv: true, unterstrichen: true },
    ],
  },
  {
    art: 'liste',
    geordnet: true,
    punkte: [
      [{ art: 'text', text: 'Untergrund prüfen' }],
      [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Anschlüsse herstellen' }] }],
    ],
  },
  {
    art: 'tabelle',
    zeilen: [
      { zellen: [{ spalten: 2, inhalt: [{ art: 'text', text: 'Kennwerte' }] }] },
      {
        zellen: [
          { spalten: 1, inhalt: [{ art: 'text', text: 'Dicke' }] },
          { spalten: 1, inhalt: [{ art: 'text', text: '100 mm' }] },
        ],
      },
    ],
  },
  {
    art: 'ergaenzung',
    herkunft: 'bieter',
    kennung: '60',
    leer: true,
    davor: [{ art: 'text', text: 'Breite von ' }],
    inhalt: [{ art: 'text', text: '...........' }],
    danach: [{ art: 'text', text: ' cm.' }],
  },
  { art: 'bild', bild },
];

describe('langtextAlsBloecke', () => {
  it('macht aus Absatz, Liste, Tabelle, Textergänzung und Bild druckfertige Blöcke', () => {
    const b = langtextAlsBloecke(beispiel);
    expect(b.map((x) => x.art)).toEqual(['absatz', 'liste', 'tabelle', 'absatz', 'absatz']);
    expect(b[0]).toEqual({
      art: 'absatz',
      laeufe: [
        { text: 'Wand ' },
        { text: 'tragend', fett: true },
        { text: '\n' },
        { text: 'nach Plan', kursiv: true, unterstrichen: true },
      ],
    });
  });

  it('fasst aufeinanderfolgende lose Textbausteine zu einem Absatz zusammen', () => {
    const b = langtextAlsBloecke([
      { art: 'text', text: 'Eins' },
      { art: 'text', text: ' zwei' },
    ]);
    expect(b).toEqual([{ art: 'absatz', laeufe: [{ text: 'Eins' }, { text: ' zwei' }] }]);
  });

  it('lässt leeren Langtext leer', () => {
    expect(langtextAlsBloecke([])).toEqual([]);
    expect(langtextAlsBloecke([{ art: 'text', text: '' }])).toEqual([]);
  });

  it('markiert eine leere Textergänzung als Lücke und zeigt einen gesetzten Wert', () => {
    const luecke = bloeckeAlsText(langtextAlsBloecke(beispiel));
    expect(luecke).toContain('Breite von [______] cm.');
    const wert = bloeckeAlsText(
      langtextAlsBloecke([
        {
          art: 'ergaenzung',
          herkunft: 'bieter',
          kennung: '61',
          leer: false,
          davor: [{ art: 'text', text: 'Dicke ' }],
          inhalt: [{ art: 'text', text: '24' }],
          danach: [{ art: 'text', text: ' mm' }],
        },
      ]),
    );
    expect(wert).toBe('Dicke [24] mm');
  });

  it('zeigt ein Bild als Marke, damit nichts still verschwindet (Q5)', () => {
    expect(bloeckeAlsText(langtextAlsBloecke([{ art: 'bild', bild }]))).toBe('[Abbildung]');
  });
});

describe('bloeckeAlsText', () => {
  it('schreibt Liste und Tabelle lesbar', () => {
    const text = bloeckeAlsText(langtextAlsBloecke(beispiel));
    expect(text).toContain('Wand tragend\nnach Plan');
    expect(text).toContain('1. Untergrund prüfen');
    expect(text).toContain('2. Anschlüsse herstellen');
    expect(text).toContain('Kennwerte');
    expect(text).toContain('Dicke | 100 mm');
  });

  it('schreibt eine Aufzählung mit Spiegelstrichen', () => {
    const text = bloeckeAlsText(
      langtextAlsBloecke([{ art: 'liste', geordnet: false, punkte: [[{ art: 'text', text: 'a' }]] }]),
    );
    expect(text).toBe('- a');
  });
});
