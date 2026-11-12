// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Test der Terminrechnung (Ticket 102 Punkt 6, C4, Q1): Rohbau mit 8 Vorgängen, allen vier Anordnungsarten, Abstand 0
// und −1, einem Meilenstein, Feiertagen und Wochenenden auf dem kritischen Weg. Alle Sollwerte sind unten von Hand
// hergeleitet, aus den Lesarten in `BAUZEIT_ANNAHMEN` und den Feiertagsregeln (Bayern), nicht aus der Implementierung.
//
// Kalender Mai/Juni 2027, Bayern, Montag bis Freitag (01.01.2027 ist ein Freitag, also 01.05.2027 ein Samstag).
// Ostersonntag 2027 = 28.03. (Gaußsche Formel, siehe `feiertage.test.ts`), daraus:
//   Christi Himmelfahrt = 28.03. + 39 = Do 06.05., Pfingstmontag = 28.03. + 50 = Mo 17.05.,
//   Fronleichnam (Bayern) = 28.03. + 60 = Do 27.05.
// Arbeitstage ab dem Projektbeginn Mo 03.05.2027 (Index = Arbeitstag Nummer k):
//    0 Mo 03.05.   1 Di 04.05.   2 Mi 05.05.   (Do 06.05. Feiertag)   3 Fr 07.05.   (Wochenende)
//    4 Mo 10.05.   5 Di 11.05.   6 Mi 12.05.   7 Do 13.05.   8 Fr 14.05.   (Wochenende, Mo 17.05. Feiertag)
//    9 Di 18.05.  10 Mi 19.05.  11 Do 20.05.  12 Fr 21.05.   (Wochenende)
//   13 Mo 24.05.  14 Di 25.05.  15 Mi 26.05.   (Do 27.05. Feiertag)   16 Fr 28.05.   (Wochenende)
//   17 Mo 31.05.  18 Di 01.06.  19 Mi 02.06.  20 Do 03.06.
//
// Anfang a = Index des ersten Tages, Ende e = a + Dauer (Index nach dem letzten Tag); angezeigt wird e − 1.
// Vorwärtsrechnung:
//   A Baustelleneinrichtung 3, ohne Vorgänger:        a = 0,                     e = 3   → 03.05. bis 05.05.
//   B Erdarbeiten 4, Ende-Anfang A +0:                a ≥ e(A) + 0 = 3,          e = 7   → 07.05. bis 12.05.
//   C Fundamente 5, Anfang-Anfang B +2:               a ≥ a(B) + 2 = 5,          e = 10  → 11.05. bis 18.05.
//   D Bodenplatte 3, Ende-Ende C +1:                  e ≥ e(C) + 1 = 11, a = 8           → 14.05. bis 19.05.
//   E Mauerwerk 6, Ende-Anfang D −1:                  a ≥ e(D) − 1 = 10,         e = 16  → 19.05. bis 26.05.
//   M Rohbau fertig 0 (Meilenstein), Ende-Anfang E:   a = e = e(E) = 16                  → Fr 28.05.
//   G Dachstuhl 4, Ende-Anfang M +0:                  a ≥ e(M) = 16,             e = 20  → 28.05. bis 02.06.
//   W Witterungsschutz 3, Anfang-Ende G +0:           e ≥ a(G) + 0 = 16, a = 13          → 24.05. bis 26.05.
// Projektende = größtes e = 20 (G) → Mi 02.06.2027.
// Rückwärtsrechnung (spätestes Ende se, spätester Anfang sa = se − Dauer), vom Projektende 20:
//   W: ohne Nachfolger, se = 20, sa = 17 (Mo 31.05. bis Mi 02.06.); Gesamtpuffer 17 − 13 = 4.
//   G: se = min(20, Anfang-Ende zu W: se(W) − 0 + 4 = 24) = 20, sa = 16; Gesamtpuffer 0.
//   M: se ≤ sa(G) − 0 = 16, sa = 16.   E: se ≤ sa(M) = 16, sa = 10.   D: se ≤ sa(E) + 1 = 11, sa = 8.
//   C: se ≤ se(D) − 1 = 10, sa = 5.     B: se ≤ sa(C) − 2 + 4 = 7, sa = 3.   A: se ≤ sa(B) = 3, sa = 0.
// Freier Puffer: W = 20 − 16 = 4; alle anderen 0 (jede Beziehung ohne Spielraum, G endet am Projektende).
// Kritischer Weg: A → B → C → D → E → M → G (W hat Puffer).

import { describe, expect, it } from 'vitest';
import type { Anordnungsbeziehung, Bauzeitenplaneingabe, Anordnungsart, Vorgang } from './index';
import { STANDARD_ARBEITSTAGE, bauzeitenplanBerechnen } from './index';

const nach = (vorgaengerId: string, art: Anordnungsart, abstand: number): Anordnungsbeziehung => ({
  vorgaengerId,
  art,
  abstand,
});
const vorgang = (
  id: string,
  bezeichnung: string,
  dauer: number,
  vorgaenger: Anordnungsbeziehung[],
): Vorgang => ({
  id,
  bezeichnung,
  elternId: null,
  dauer,
  vorgaenger,
  fruehesterBeginn: null,
  ist: null,
});

const ROHBAU: Bauzeitenplaneingabe = {
  projektbeginn: '2027-05-03',
  kalender: { arbeitstage: STANDARD_ARBEITSTAGE, bundesland: 'BY', freieTage: [] },
  vorgaenge: [
    vorgang('A', 'Baustelleneinrichtung', 3, []),
    vorgang('B', 'Erdarbeiten', 4, [nach('A', 'ende-anfang', 0)]),
    vorgang('C', 'Fundamente', 5, [nach('B', 'anfang-anfang', 2)]),
    vorgang('D', 'Bodenplatte', 3, [nach('C', 'ende-ende', 1)]),
    vorgang('E', 'Mauerwerk', 6, [nach('D', 'ende-anfang', -1)]),
    vorgang('M', 'Rohbau fertig', 0, [nach('E', 'ende-anfang', 0)]),
    vorgang('G', 'Dachstuhl', 4, [nach('M', 'ende-anfang', 0)]),
    vorgang('W', 'Witterungsschutz', 3, [nach('G', 'anfang-ende', 0)]),
  ],
};

describe('Golden: Rohbau, Bayern, Mai 2027', () => {
  const e = bauzeitenplanBerechnen(ROHBAU);

  it('Termine, späte Lage und Puffer je Vorgang', () => {
    const kritisch = (beginn: string, ende: string) => ({
      beginn,
      ende,
      spaetesterBeginn: beginn,
      spaetestesEnde: ende,
      gesamtpuffer: 0,
      freierPuffer: 0,
      kritisch: true,
    });
    expect(e.vorgaenge.map((v) => [v.id, v.art, v.termine])).toEqual([
      ['A', 'vorgang', kritisch('2027-05-03', '2027-05-05')],
      ['B', 'vorgang', kritisch('2027-05-07', '2027-05-12')],
      ['C', 'vorgang', kritisch('2027-05-11', '2027-05-18')],
      ['D', 'vorgang', kritisch('2027-05-14', '2027-05-19')],
      ['E', 'vorgang', kritisch('2027-05-19', '2027-05-26')],
      ['M', 'meilenstein', kritisch('2027-05-28', '2027-05-28')],
      ['G', 'vorgang', kritisch('2027-05-28', '2027-06-02')],
      [
        'W',
        'vorgang',
        {
          beginn: '2027-05-24',
          ende: '2027-05-26',
          spaetesterBeginn: '2027-05-31',
          spaetestesEnde: '2027-06-02',
          gesamtpuffer: 4,
          freierPuffer: 4,
          kritisch: false,
        },
      ],
    ]);
  });

  it('Projektbeginn, Projektende, kritischer Weg, keine Befunde', () => {
    expect(e.projektbeginn).toBe('2027-05-03');
    expect(e.projektende).toBe('2027-06-02');
    expect(e.kritischeWege).toEqual([['A', 'B', 'C', 'D', 'E', 'M', 'G']]);
    expect(e.befunde).toEqual([]);
  });

  it('ohne Fronleichnam (Berlin) liegen M und G einen Arbeitstag früher', () => {
    // Do 27.05. wird Arbeitstag Nummer 16: M am Do 27.05., G Do 27.05. bis Di 01.06.
    const berlin = bauzeitenplanBerechnen({ ...ROHBAU, kalender: { ...ROHBAU.kalender, bundesland: 'BE' } });
    const lage = (id: string) => berlin.vorgaenge.find((v) => v.id === id)?.termine;
    expect([lage('M')?.beginn, lage('G')?.beginn, lage('G')?.ende]).toEqual([
      '2027-05-27',
      '2027-05-27',
      '2027-06-01',
    ]);
    expect(berlin.projektende).toBe('2027-06-01');
  });
});
