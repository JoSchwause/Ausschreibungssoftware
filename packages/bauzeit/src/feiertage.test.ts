// SPDX-License-Identifier: AGPL-3.0-or-later
// Feiertage rein aus Regeln (Ticket 102 Punkt 2, D-57): Ostersonntag nach der gregorianischen Osterformel, bundesweite
// und landesweite Feiertage je Land und Jahr. Die Erwartungswerte stammen nicht aus der Implementierung: Ostern 2026 und
// 2027 ist unten mit der Gaußschen Osterformel (mit Lichtenbergs Ergänzung) von Hand gerechnet, die Implementierung nutzt
// das Verfahren von Meeus/Jones/Butcher; die Länderlisten 2026 folgen den Feiertagsgesetzen der Länder (Quelle je Land
// in `feiertage.ts`), gegengeprüft mit der Übersicht des DGB für 2026.

import { describe, expect, it } from 'vitest';
import type { Bundesland } from './index';
import { BUNDESLAENDER, feiertage, ostersonntag } from './index';

/**
 * Gaußsche Osterformel für das Jahr X (ganzzahlige Division `div`):
 * K = X div 100, M = 15 + (3K + 3) div 4 − (8K + 13) div 25, S = 2 − (3K + 3) div 4, A = X mod 19,
 * D = (19A + M) mod 30, R = (D + A div 11) div 29, OG = 21 + D − R, SZ = 7 − (X + X div 4 + S) mod 7,
 * OE = 7 − (OG − SZ) mod 7, Ostersonntag = OG + OE als Märzdatum (32 = 1. April).
 *
 * 2026: K = 20, M = 15 + 15 − 6 = 24, S = −13, A = 12, D = 252 mod 30 = 12, R = 13 div 29 = 0, OG = 33,
 *       SZ = 7 − (2026 + 506 − 13) mod 7 = 7 − 2519 mod 7 = 7 − 6 = 1, OE = 7 − 32 mod 7 = 3, OG + OE = 36 → 5. April.
 * 2027: A = 13, D = 271 mod 30 = 1, R = 2 div 29 = 0, OG = 22, SZ = 7 − 2520 mod 7 = 7, OE = 7 − 15 mod 7 = 6,
 *       OG + OE = 28 → 28. März.
 * 1954: A = 16, D = 328 mod 30 = 28, R = 29 div 29 = 1 (Ausnahme), OG = 48, SZ = 7 − 2429 mod 7 = 7, OE = 7 − 41 mod 7
 *       = 1, OG + OE = 49 → 18. April.
 * 1981: A = 5, D = 119 mod 30 = 29, R = 1 (Ausnahme), OG = 49, SZ = 7 − 2463 mod 7 = 1, OE = 7 − 48 mod 7 = 1,
 *       OG + OE = 50 → 19. April.
 */
describe('ostersonntag', () => {
  it.each([
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [1954, '1954-04-18'],
    [1981, '1981-04-19'],
  ])('%i: %s (von Hand mit der Gaußschen Osterformel)', (jahr, datum) => {
    expect(ostersonntag(jahr)).toBe(datum);
  });

  it.each([
    [2008, '2008-03-23'],
    [2019, '2019-04-21'],
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2038, '2038-04-25'], // spätestmöglicher Ostersonntag
    [2285, '2285-03-22'], // frühestmöglicher Ostersonntag
  ])('%i: %s (veröffentlichte Ostertermine)', (jahr, datum) => {
    expect(ostersonntag(jahr)).toBe(datum);
  });

  it('weist ein Jahr außerhalb 1 bis 9999 oder eine gebrochene Zahl ab', () => {
    expect(() => ostersonntag(0)).toThrow(RangeError);
    expect(() => ostersonntag(10_000)).toThrow(RangeError);
    expect(() => ostersonntag(2026.5)).toThrow(RangeError);
  });
});

const tage = (jahr: number, land: Bundesland | null): string[] => feiertage(jahr, land).map((f) => f.datum);

describe('bundesweite Feiertage', () => {
  it('2026 ohne Land: genau die neun bundesweiten, nach Datum', () => {
    expect(feiertage(2026, null).map((f) => [f.datum, f.kennung])).toEqual([
      ['2026-01-01', 'neujahr'],
      ['2026-04-03', 'karfreitag'], // Ostersonntag − 2
      ['2026-04-06', 'ostermontag'], // Ostersonntag + 1
      ['2026-05-01', 'erster-mai'],
      ['2026-05-14', 'christi-himmelfahrt'], // Ostersonntag + 39
      ['2026-05-25', 'pfingstmontag'], // Ostersonntag + 50
      ['2026-10-03', 'tag-der-deutschen-einheit'],
      ['2026-12-25', 'erster-weihnachtstag'],
      ['2026-12-26', 'zweiter-weihnachtstag'],
    ]);
  });

  it('2027: die beweglichen folgen dem früheren Ostern (28. März)', () => {
    expect(tage(2027, null)).toEqual([
      '2027-01-01',
      '2027-03-26',
      '2027-03-29',
      '2027-05-01',
      '2027-05-06',
      '2027-05-17',
      '2027-10-03',
      '2027-12-25',
      '2027-12-26',
    ]);
  });

  it('jeder Feiertag trägt einen Namen', () => {
    expect(feiertage(2026, null).find((f) => f.kennung === 'tag-der-deutschen-einheit')?.name).toBe(
      'Tag der Deutschen Einheit',
    );
  });
});

describe('landesweite Feiertage 2026 je Land', () => {
  const bundesweit = new Set(tage(2026, null));
  // Je Land nur die Tage über die bundesweiten hinaus (Fronleichnam 2026 = Ostersonntag + 60 = 4. Juni; Buß- und Bettag =
  // Mittwoch vor dem 23. November = 18. November 2026; Pfingstsonntag = Ostersonntag + 49 = 24. Mai).
  it.each<[Bundesland, string[]]>([
    ['BW', ['2026-01-06', '2026-06-04', '2026-11-01']],
    ['BY', ['2026-01-06', '2026-06-04', '2026-11-01']],
    ['BE', ['2026-03-08']],
    ['BB', ['2026-04-05', '2026-05-24', '2026-10-31']],
    ['HB', ['2026-10-31']],
    ['HH', ['2026-10-31']],
    ['HE', ['2026-06-04']],
    ['MV', ['2026-03-08', '2026-10-31']],
    ['NI', ['2026-10-31']],
    ['NW', ['2026-06-04', '2026-11-01']],
    ['RP', ['2026-06-04', '2026-11-01']],
    ['SL', ['2026-06-04', '2026-08-15', '2026-11-01']],
    ['SN', ['2026-10-31', '2026-11-18']],
    ['ST', ['2026-01-06', '2026-10-31']],
    ['SH', ['2026-10-31']],
    ['TH', ['2026-09-20', '2026-10-31']],
  ])('%s: %j', (land, zusaetzlich) => {
    const alle = tage(2026, land);
    expect(alle.filter((t) => !bundesweit.has(t))).toEqual(zusaetzlich);
    for (const t of bundesweit) expect(alle).toContain(t);
  });

  it('kennt genau die 16 Länder', () => {
    expect([...BUNDESLAENDER].sort()).toEqual(
      ['BB', 'BE', 'BW', 'BY', 'HB', 'HE', 'HH', 'MV', 'NI', 'NW', 'RP', 'SH', 'SL', 'SN', 'ST', 'TH'].sort(),
    );
  });
});

describe('Feiertage ab ihrem Gültigkeitsjahr', () => {
  it.each<[Bundesland, string, number, string]>([
    ['BE', 'frauentag', 2019, '03-08'],
    ['MV', 'frauentag', 2023, '03-08'],
    ['TH', 'weltkindertag', 2019, '09-20'],
    ['HB', 'reformationstag', 2018, '10-31'],
    ['HH', 'reformationstag', 2018, '10-31'],
    ['NI', 'reformationstag', 2018, '10-31'],
    ['SH', 'reformationstag', 2018, '10-31'],
  ])('%s: %s erst ab %i', (land, kennung, ab, monatTag) => {
    const kennungen = (jahr: number): string[] => feiertage(jahr, land).map((f) => f.kennung);
    expect(kennungen(ab - 1)).not.toContain(kennung);
    expect(kennungen(ab)).toContain(kennung);
    expect(tage(ab, land)).toContain(`${String(ab)}-${monatTag}`);
  });

  it('der Reformationstag galt in Brandenburg und Sachsen schon vor 2018', () => {
    expect(tage(2016, 'BB')).toContain('2016-10-31');
    expect(tage(2016, 'SN')).toContain('2016-10-31');
  });
});

describe('Buß- und Bettag (Sachsen): Mittwoch vor dem 23. November', () => {
  it.each([
    [2022, '2022-11-16'], // 23.11.2022 ist ein Mittwoch: der Mittwoch davor
    [2023, '2023-11-22'], // 23.11.2023 ist ein Donnerstag
    [2026, '2026-11-18'],
    [2027, '2027-11-17'],
  ])('%i: %s', (jahr, datum) => {
    expect(feiertage(jahr, 'SN').find((f) => f.kennung === 'buss-und-bettag')?.datum).toBe(datum);
  });
});
