// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type { BildId, Langtext } from '@tethys/vertrag';
import { BILDMARKE, MAX_BILD_BYTES, bloeckeAlsText, langtextAlsBloecke } from './langtext';
import type { DruckBlock } from './langtext';
import { kuerzeBloecke } from './kuerzen';
import { bild as bildAus, jpegBase64, pngBase64 } from './testhilfe/bilder';

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

describe('Bilder im Langtext', () => {
  const nurBild = (daten: string, medientyp = 'image/png'): DruckBlock[] =>
    langtextAlsBloecke([{ art: 'bild', bild: bildAus(daten, medientyp) }]);

  it('macht aus einem PNG einen Bildblock mit Pixelmaßen an seiner Stelle im Absatz', () => {
    const b = langtextAlsBloecke([
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'Vorher ' },
          { art: 'bild', bild: bildAus(pngBase64(3, 2)) },
          { art: 'text', text: ' nachher' },
        ],
      },
    ]);
    expect(b.map((x) => x.art)).toEqual(['absatz', 'bild', 'absatz']);
    expect(b[1]).toMatchObject({ art: 'bild', breite: 3, hoehe: 2 });
    expect(b[1]?.art === 'bild' && b[1].daten.startsWith('data:image/png;base64,iVBOR')).toBe(true);
    expect(bloeckeAlsText(b)).toBe(`Vorher \n${BILDMARKE}\n nachher`);
  });

  it('erkennt ein JPEG am Inhalt, auch wenn der Medientyp etwas anderes sagt', () => {
    const [b] = nurBild(jpegBase64(640, 480), 'application/octet-stream');
    expect(b).toMatchObject({ art: 'bild', breite: 640, hoehe: 480 });
    expect(b?.art === 'bild' && b.daten.startsWith('data:image/jpeg;base64,')).toBe(true);
  });

  it('lässt ein unvollständiges, fremdes oder zu großes Bild als Marke stehen (Q5)', () => {
    const marke = [{ art: 'absatz', laeufe: [{ text: BILDMARKE, kursiv: true }] }];
    expect(nurBild('iVBORw0KGgo=')).toEqual(marke); // nur die PNG-Signatur
    expect(nurBild(Buffer.from('GIF89a\x01\x00\x01\x00').toString('base64'), 'image/gif')).toEqual(marke);
    expect(nurBild('kein base64!')).toEqual(marke);
    const kaputt = Buffer.from(pngBase64(2, 2), 'base64');
    const stelle = kaputt.indexOf('IDAT') + 6;
    kaputt.writeUInt8((kaputt[stelle] ?? 0) ^ 0xff, stelle); // Bilddaten verändert: Prüfsumme stimmt nicht mehr
    expect(nurBild(kaputt.toString('base64'))).toEqual(marke);
    expect(nurBild('A'.repeat(Math.ceil((MAX_BILD_BYTES * 4) / 3) + 8))).toEqual(marke);
  });

  it('zählt ein Bild beim Kürzen als eine Zeile', () => {
    const b = langtextAlsBloecke([
      { art: 'absatz', inhalt: [{ art: 'text', text: 'Eins' }] },
      { art: 'bild', bild: bildAus(pngBase64(2, 2)) },
      { art: 'absatz', inhalt: [{ art: 'text', text: 'Drei' }] },
    ]);
    expect(kuerzeBloecke(b, 2).map((x) => x.art)).toEqual(['absatz', 'bild', 'absatz']);
    expect(bloeckeAlsText(kuerzeBloecke(b, 2))).toBe(`Eins\n${BILDMARKE}\n[…]`);
    expect(bloeckeAlsText(kuerzeBloecke(b, 1))).toBe('Eins\n[…]');
  });
});
