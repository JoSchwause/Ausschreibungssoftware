// SPDX-License-Identifier: AGPL-3.0-or-later
// Build-Stand auf der Seite „Über“ (Wellen-Review PB7, E14/L1): Datum im deutschen Format, Wörter aus den Texten der Hilfe.
import { describe, expect, it } from 'vitest';
import { bauStandText } from './stand';

describe('Build-Stand als Text', () => {
  it('nennt Commit und Datum im deutschen Format', () => {
    expect(bauStandText({ commit: 'abc1234', datum: '2026-11-13' })).toBe('abc1234 vom 13.11.2026');
  });

  it('ohne Stand oder ohne Datum', () => {
    expect(bauStandText({ commit: 'unbekannt', datum: 'unbekannt' })).toBe('unbekannt');
    expect(bauStandText({ commit: 'abc1234', datum: 'unbekannt' })).toBe('abc1234');
  });
});
