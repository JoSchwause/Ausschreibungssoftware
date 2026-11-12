// SPDX-License-Identifier: AGPL-3.0-or-later
// Bautagebuchauswertung (Ticket 111 Punkt 4; Glossar „Bautagebuchauswertung“): Arbeitskräfte je Tag und je Firma in einem
// Zeitraum mit beiden Grenzen.

import { describe, expect, it } from 'vitest';
import { bautagebuchAuswerten } from './index';
import { eintrag } from './testhilfen';

const EINTRAEGE = [
  eintrag(3, '2026-11-19', {
    arbeitskraefte: [
      { firma: 'Rohbau', anzahl: 7 },
      { firma: 'Elektro', anzahl: 2 },
    ],
  }),
  eintrag(1, '2026-11-16', {
    arbeitskraefte: [
      { firma: 'Rohbau', anzahl: 6 },
      { firma: 'Tiefbau', anzahl: 3 },
    ],
  }),
  eintrag(2, '2026-11-17', {
    arbeitskraefte: [
      { firma: 'Rohbau', anzahl: 6 },
      { firma: 'Tiefbau', anzahl: 2 },
    ],
  }),
  eintrag(4, '2026-11-23', { arbeitskraefte: [{ firma: 'Rohbau', anzahl: 5 }] }),
];

describe('bautagebuchAuswerten', () => {
  it('summiert die Köpfe je Tag (nach Datum) und je Firma (nach Namen), beide Grenzen eingeschlossen', () => {
    expect(bautagebuchAuswerten(EINTRAEGE, '2026-11-16', '2026-11-19')).toEqual({
      von: '2026-11-16',
      bis: '2026-11-19',
      jeTag: [
        { datum: '2026-11-16', arbeitskraefte: 9 },
        { datum: '2026-11-17', arbeitskraefte: 8 },
        { datum: '2026-11-19', arbeitskraefte: 9 },
      ],
      jeFirma: [
        { firma: 'Elektro', arbeitskraefte: 2 },
        { firma: 'Rohbau', arbeitskraefte: 19 },
        { firma: 'Tiefbau', arbeitskraefte: 5 },
      ],
      arbeitskraefte: 26,
    });
  });

  it('Tage ohne Eintrag fehlen; ein Eintrag ohne Arbeitskräfte zählt mit 0', () => {
    const a = bautagebuchAuswerten(
      [...EINTRAEGE, eintrag(5, '2026-11-18', { arbeitskraefte: [] })],
      '2026-11-17',
      '2026-11-18',
    );
    expect(a.jeTag).toEqual([
      { datum: '2026-11-17', arbeitskraefte: 8 },
      { datum: '2026-11-18', arbeitskraefte: 0 },
    ]);
    expect(a.arbeitskraefte).toBe(8);
  });

  it('ein leerer oder umgekehrter Zeitraum ergibt keine Zeilen', () => {
    expect(bautagebuchAuswerten(EINTRAEGE, '2026-11-20', '2026-11-22')).toEqual({
      von: '2026-11-20',
      bis: '2026-11-22',
      jeTag: [],
      jeFirma: [],
      arbeitskraefte: 0,
    });
    expect(bautagebuchAuswerten(EINTRAEGE, '2026-11-19', '2026-11-16').jeTag).toEqual([]);
  });

  it('ordnet Firmen deutsch nach Namen (Umlaute nicht hinter z)', () => {
    const a = bautagebuchAuswerten(
      [
        eintrag(1, '2026-11-16', {
          arbeitskraefte: [
            { firma: 'Zimmerei', anzahl: 1 },
            { firma: 'Ökobau', anzahl: 1 },
            { firma: 'Maler', anzahl: 1 },
          ],
        }),
      ],
      '2026-11-16',
      '2026-11-16',
    );
    expect(a.jeFirma.map((f) => f.firma)).toEqual(['Maler', 'Ökobau', 'Zimmerei']);
  });

  it('weist einen Zeitraum ab, dessen Grenzen keine Kalendertage sind', () => {
    expect(() => bautagebuchAuswerten(EINTRAEGE, '2026-11-16', '')).toThrow(RangeError);
    expect(() => bautagebuchAuswerten(EINTRAEGE, '16.11.2026', '2026-11-20')).toThrow(RangeError);
  });
});
