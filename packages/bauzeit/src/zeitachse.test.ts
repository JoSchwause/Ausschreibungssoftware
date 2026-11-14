// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeitachse für die Balkenspalte des Grids (Ticket 102 Punkt 5, Ticket 96: `Zeitleiste`, `Zeitabschnitt`, `Balken`):
// Tagesindex ab dem ersten Tag der Achse, Abschnitte für Monate und ISO-Kalenderwochen mit exklusivem Ende, Indizes der
// freien Tage. Die Texte formatiert die App (N4).
//
// Kalender: 28.12.2026 ist ein Montag (01.01.2026 Donnerstag + 361 Tage). 2026 hat 53 ISO-Wochen (01.01.2026 ist ein
// Donnerstag): KW 53/2026 = Mo 28.12.2026 bis So 03.01.2027, KW 1/2027 = Mo 04.01. bis So 10.01.2027. Fr 01.01.2027 ist
// Neujahr, Mi 06.01.2027 Heilige Drei Könige (Bayern). 30.12.2024 (Montag) gehört zu KW 1/2025 (Donnerstag 02.01.2025).

import { describe, expect, it } from 'vitest';
import type { Arbeitskalender } from './index';
import type { Kalenderdatum } from '@tethys/vertrag';
import { STANDARD_ARBEITSTAGE, balkenlage, datumPruefen, tagesindex, zeitachseBerechnen } from './index';

function datum(text: string): Kalenderdatum {
  const e = datumPruefen(text);
  if (!e.ok) throw new Error(`Testdatum ungültig: ${text}`);
  return e.wert;
}
function achse(von: string, bis: string, kalender: Arbeitskalender = MO_FR) {
  const e = zeitachseBerechnen(datum(von), datum(bis), kalender);
  if (!e.ok) throw new Error(e.fehler.meldung);
  return e.wert;
}
const MO_FR: Arbeitskalender = { arbeitstage: STANDARD_ARBEITSTAGE, bundesland: null, freieTage: [] };

describe('zeitachseBerechnen', () => {
  it('zwei Wochen über den Jahreswechsel: Monate, KW 53 und KW 1, freie Tage', () => {
    expect(achse('2026-12-28', '2027-01-10')).toEqual({
      von: '2026-12-28',
      bis: '2027-01-10',
      tage: 14,
      monate: [
        { jahr: 2026, monat: 12, vonTag: 0, bisTag: 4 },
        { jahr: 2027, monat: 1, vonTag: 4, bisTag: 14 },
      ],
      kalenderwochen: [
        { jahr: 2026, woche: 53, vonTag: 0, bisTag: 7 },
        { jahr: 2027, woche: 1, vonTag: 7, bisTag: 14 },
      ],
      // Neujahr (4), Wochenenden 02./03.01. (5, 6) und 09./10.01. (12, 13).
      freieTage: [4, 5, 6, 12, 13],
    });
  });

  it('freie Tage folgen dem Kalender: Feiertage des Landes und freie Tage des Plans', () => {
    const k: Arbeitskalender = { ...MO_FR, bundesland: 'BY', freieTage: ['2026-12-31'] };
    // Do 31.12.2026 (3) als freier Tag, Mi 06.01.2027 (9) Heilige Drei Könige.
    expect(achse('2026-12-28', '2027-01-10', k).freieTage).toEqual([3, 4, 5, 6, 9, 12, 13]);
  });

  it('Abschnitte am Rand werden auf die Achse geschnitten', () => {
    // Mi 13.01. bis Di 02.02.2027: 19 Januartage und 2 Februartage; KW 2 ab Mittwoch, KW 5 bis Dienstag.
    const a = achse('2027-01-13', '2027-02-02');
    expect(a.tage).toBe(21);
    expect(a.monate).toEqual([
      { jahr: 2027, monat: 1, vonTag: 0, bisTag: 19 },
      { jahr: 2027, monat: 2, vonTag: 19, bisTag: 21 },
    ]);
    expect(a.kalenderwochen).toEqual([
      { jahr: 2027, woche: 2, vonTag: 0, bisTag: 5 },
      { jahr: 2027, woche: 3, vonTag: 5, bisTag: 12 },
      { jahr: 2027, woche: 4, vonTag: 12, bisTag: 19 },
      { jahr: 2027, woche: 5, vonTag: 19, bisTag: 21 },
    ]);
  });

  it('das ISO-Wochenjahr kann dem Kalenderjahr vorauslaufen (30.12.2024 in KW 1/2025)', () => {
    const a = achse('2024-12-30', '2025-01-05');
    expect(a.kalenderwochen).toEqual([{ jahr: 2025, woche: 1, vonTag: 0, bisTag: 7 }]);
    expect(a.monate).toEqual([
      { jahr: 2024, monat: 12, vonTag: 0, bisTag: 2 },
      { jahr: 2025, monat: 1, vonTag: 2, bisTag: 7 },
    ]);
  });

  it('ein einzelner Tag ist eine Achse mit einem Tag', () => {
    expect(achse('2027-01-04', '2027-01-04')).toMatchObject({ tage: 1, freieTage: [] });
  });

  it('ein Ende vor dem Beginn ist ein Fehler', () => {
    const e = zeitachseBerechnen(datum('2027-01-10'), datum('2027-01-04'), MO_FR);
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe('zeitraum-leer');
  });
});

describe('Tagesindex und Balkenlage', () => {
  const a = achse('2026-12-28', '2027-01-10');

  it('Tagesindex: erster Tag 0, letzter tage − 1, außerhalb negativ oder ab tage', () => {
    expect(tagesindex(a, datum('2026-12-28'))).toBe(0);
    expect(tagesindex(a, datum('2027-01-10'))).toBe(13);
    expect(tagesindex(a, datum('2026-12-20'))).toBe(-8);
    expect(tagesindex(a, datum('2027-01-11'))).toBe(14);
  });

  it('Balken: Ende einschließlich wird exklusives bisTag; beim Meilenstein bisTag = vonTag', () => {
    // Vorgang Mo 04.01. bis Fr 08.01.2027: Tage 7 bis 11, bisTag 12.
    expect(balkenlage(a, datum('2027-01-04'), datum('2027-01-08'), 'vorgang')).toEqual({
      vonTag: 7,
      bisTag: 12,
    });
    expect(balkenlage(a, datum('2027-01-05'), datum('2027-01-05'), 'meilenstein')).toEqual({
      vonTag: 8,
      bisTag: 8,
    });
    expect(balkenlage(a, datum('2026-12-29'), datum('2027-01-05'), 'sammelvorgang')).toEqual({
      vonTag: 1,
      bisTag: 9,
    });
  });
});
