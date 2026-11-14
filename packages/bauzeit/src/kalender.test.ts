// SPDX-License-Identifier: AGPL-3.0-or-later
// Arbeitskalender (Ticket 102 Punkt 2): Arbeitstage der Woche (ISO, 1 = Montag), Feiertage des Landes, freie Tage.
// Wochentage im Herbst 2026: 12.11. Donnerstag, 14.11. Samstag, 15.11. Sonntag, 18.11. Mittwoch (Buß- und Bettag).

import { describe, expect, it } from 'vitest';
import type { Arbeitskalender } from './index';
import type { Kalenderdatum } from '@tethys/vertrag';
import { STANDARD_ARBEITSTAGE, datumPruefen, istArbeitstag } from './index';

function datum(text: string): Kalenderdatum {
  const e = datumPruefen(text);
  if (!e.ok) throw new Error(`Testdatum ungültig: ${text}`);
  return e.wert;
}

const MO_FR: Arbeitskalender = { arbeitstage: STANDARD_ARBEITSTAGE, bundesland: null, freieTage: [] };

describe('istArbeitstag', () => {
  it('Standard: Montag bis Freitag', () => {
    expect(STANDARD_ARBEITSTAGE).toEqual([1, 2, 3, 4, 5]);
    expect(istArbeitstag(MO_FR, datum('2026-11-12'))).toBe(true);
    expect(istArbeitstag(MO_FR, datum('2026-11-14'))).toBe(false);
    expect(istArbeitstag(MO_FR, datum('2026-11-15'))).toBe(false);
  });

  it('ein bundesweiter Feiertag ist frei, auch ohne Land (Christi Himmelfahrt, Donnerstag 14.05.2026)', () => {
    expect(istArbeitstag(MO_FR, datum('2026-05-14'))).toBe(false);
    expect(istArbeitstag(MO_FR, datum('2026-05-13'))).toBe(true);
  });

  it('ein landesweiter Feiertag ist nur in seinem Land frei', () => {
    const land = (bundesland: Arbeitskalender['bundesland']): Arbeitskalender => ({ ...MO_FR, bundesland });
    expect(istArbeitstag(land('BY'), datum('2026-06-04'))).toBe(false); // Fronleichnam
    expect(istArbeitstag(land('BE'), datum('2026-06-04'))).toBe(true);
    expect(istArbeitstag(land('SN'), datum('2026-11-18'))).toBe(false); // Buß- und Bettag
    expect(istArbeitstag(land('BY'), datum('2026-11-18'))).toBe(true);
  });

  it('freie Tage des Plans sind frei', () => {
    const k: Arbeitskalender = { ...MO_FR, freieTage: ['2026-12-24', '2026-12-31'] };
    expect(istArbeitstag(k, datum('2026-12-24'))).toBe(false);
    expect(istArbeitstag(k, datum('2026-12-31'))).toBe(false);
    expect(istArbeitstag(k, datum('2026-12-30'))).toBe(true);
  });

  it('eigene Arbeitstage: Samstag als Arbeitstag', () => {
    const k: Arbeitskalender = { ...MO_FR, arbeitstage: [1, 2, 3, 4, 5, 6] };
    expect(istArbeitstag(k, datum('2026-11-14'))).toBe(true);
    expect(istArbeitstag(k, datum('2026-11-15'))).toBe(false);
  });

  it('mit Sonntag als Arbeitstag bleibt Ostersonntag in Brandenburg frei, in Berlin nicht', () => {
    const alle = [1, 2, 3, 4, 5, 6, 7] as const;
    expect(istArbeitstag({ ...MO_FR, arbeitstage: alle, bundesland: 'BB' }, datum('2026-04-05'))).toBe(false);
    expect(istArbeitstag({ ...MO_FR, arbeitstage: alle, bundesland: 'BE' }, datum('2026-04-05'))).toBe(true);
  });

  it('übergeht unlesbare freie Tage und unbekannte Wochentage (die Rechnung meldet sie als Befund)', () => {
    const k = { ...MO_FR, arbeitstage: [1, 2, 3, 4, 5, 9], freieTage: ['24.12.2026', '2026-12-24'] };
    expect(istArbeitstag(k as Arbeitskalender, datum('2026-12-24'))).toBe(false);
    expect(istArbeitstag(k as Arbeitskalender, datum('2026-12-23'))).toBe(true);
  });

  it('ein ungeprüfter Text statt eines Datums ist ein Programmierfehler', () => {
    expect(() => istArbeitstag(MO_FR, '2026-02-30' as Kalenderdatum)).toThrow(RangeError);
  });
});
