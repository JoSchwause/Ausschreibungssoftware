import { describe, expect, it } from 'vitest';
import { APP_BUILD, APP_VERSION, bauStandText } from './version';

describe('Version und Build-Stand', () => {
  it('liefert in Tests den Ersatzwert, nicht undefined', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_BUILD.commit).toBe('unbekannt');
    expect(APP_BUILD.datum).toBe('unbekannt');
  });

  it('formatiert den Stand als Text', () => {
    expect(bauStandText({ commit: 'abc1234', datum: '2026-11-13' })).toBe('abc1234 vom 2026-11-13');
    expect(bauStandText({ commit: 'unbekannt', datum: 'unbekannt' })).toBe('unbekannt');
  });
});
