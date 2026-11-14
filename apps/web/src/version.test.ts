import { describe, expect, it } from 'vitest';
import { APP_BUILD, APP_VERSION } from './version';

describe('Version und Build-Stand', () => {
  it('liefert in Tests den Ersatzwert, nicht undefined', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(APP_BUILD.commit).toBe('unbekannt');
    expect(APP_BUILD.datum).toBe('unbekannt');
  });
});
