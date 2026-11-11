// SPDX-License-Identifier: AGPL-3.0-or-later
// Tabelle einfügen (Ticket 54, Punkt 5): Dokumentknoten einer leeren Tabelle und Grenzen der Auswahl.

import { describe, expect, it } from 'vitest';
import { dokumentZuLangtext, langtextZuDokument } from './abbildung';
import { begrenzeTabellenmass, leereTabelle, TABELLE_GRENZEN } from './tabelle';

describe('leereTabelle', () => {
  it('erzeugt Zeilen × Spalten Zellen mit je einem leeren losen Absatz', () => {
    const t = leereTabelle(2, 3);
    expect(t.type).toBe('table');
    expect(t.content).toHaveLength(2);
    for (const z of t.content ?? []) {
      expect(z.content).toHaveLength(3);
      for (const c of z.content ?? []) {
        expect(c.attrs).toEqual({ colspan: 1, rowspan: 1, colwidth: null });
        expect(c.content).toEqual([{ type: 'paragraph', attrs: { lose: true } }]);
      }
    }
  });

  it('bildet formgültig ab: jede Zeile hat Zellen, jede Zelle spalten 1 und leeren Inhalt', () => {
    const l = dokumentZuLangtext({ type: 'doc', content: [leereTabelle(3, 2)] });
    expect(l).toEqual([
      {
        art: 'tabelle',
        zeilen: [0, 1, 2].map(() => ({
          zellen: [
            { spalten: 1, inhalt: [] },
            { spalten: 1, inhalt: [] },
          ],
        })),
      },
    ]);
    // Rundweg bleibt gleich.
    expect(dokumentZuLangtext(langtextZuDokument(l))).toEqual(l);
  });
});

describe('begrenzeTabellenmass', () => {
  it('klemmt auf die Grenzen und rundet auf ganze Zahlen; Unsinn wird 1', () => {
    expect(begrenzeTabellenmass(0, TABELLE_GRENZEN.spalten.max + 5)).toEqual({
      zeilen: 1,
      spalten: TABELLE_GRENZEN.spalten.max,
    });
    expect(begrenzeTabellenmass(2.6, Number.NaN)).toEqual({ zeilen: 3, spalten: 1 });
    expect(begrenzeTabellenmass(TABELLE_GRENZEN.zeilen.max + 1, 2).zeilen).toBe(TABELLE_GRENZEN.zeilen.max);
  });
});
