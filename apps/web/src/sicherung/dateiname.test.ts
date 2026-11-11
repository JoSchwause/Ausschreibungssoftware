// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { sicherungsdateiname } from './dateiname';

describe('Dateiname der Sicherung', () => {
  it('lautet <Projektname>-<Datum>.tethys.json mit dem Ortsdatum', () => {
    expect(sicherungsdateiname('Zeppelinhalle', new Date(2026, 10, 5, 23, 59))).toBe(
      'Zeppelinhalle-2026-11-05.tethys.json',
    );
  });

  it('entfernt Zeichen, die in Dateinamen nicht erlaubt sind, und behält Umlaute', () => {
    expect(sicherungsdateiname('Bürgerhaus: A/B?', new Date(2026, 0, 2))).toBe(
      'Bürgerhaus AB-2026-01-02.tethys.json',
    );
  });

  it('fällt bei leerem Namen auf „projekt“ zurück', () => {
    expect(sicherungsdateiname('  /// ', new Date(2026, 0, 2))).toBe('projekt-2026-01-02.tethys.json');
  });
});
