// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { ERSATZ_LV, ERSATZ_PROJEKT, dateinameSauber } from './dateiname';

describe('dateinameSauber (S4)', () => {
  it('behält Buchstaben mit Umlauten, Ziffern, Leerzeichen, _ und -; mehrere Leerzeichen werden eines', () => {
    expect(dateinameSauber('Bürgerhaus: A/B?  Los_1-2', ERSATZ_PROJEKT)).toBe('Bürgerhaus AB Los_1-2');
  });

  it('fällt ohne verwertbaren Namen auf den Ersatz zurück', () => {
    expect(dateinameSauber('  /// ', ERSATZ_PROJEKT)).toBe('projekt');
    expect(dateinameSauber('???', ERSATZ_LV)).toBe('Leistungsverzeichnis');
  });
});
