// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Erzeugungsfunktion der Marke `IfcGlobalId` (Ticket 107, Punkt 1; vertrag v1.6): genau 22 Zeichen aus dem
// IFC-Base64-Alphabet `0-9A-Za-z_$`, sonst ein Fehlerwert. Der Text wird nicht verändert (kein Kürzen von Leerraum).

import { describe, expect, it } from 'vitest';
import { globalIdLesen } from './index';

describe('globalIdLesen', () => {
  it.each(['0aZ9_$bY8xW7vU6tS5rQ4p', '3vB2YO$MX4xv5uCqZZG05x', '______________________'])(
    'nimmt %s unverändert als GlobalId',
    (text) => {
      expect(globalIdLesen(text)).toEqual({ ok: true, wert: text });
    },
  );

  it.each([
    ['leer', ''],
    ['21 Zeichen', '0123456789abcdefghijk'],
    ['23 Zeichen', '0123456789abcdefghijklm'],
    ['Bindestrich', '0123456789-bcdefghijkl'],
    ['Leerraum am Rand', ' 0aZ9_$bY8xW7vU6tS5rQ4'],
    ['Umlaut', '0aZ9_$bY8xW7vU6tS5rQ4ä'],
  ])('weist %s ab', (_fall, text) => {
    const ergebnis = globalIdLesen(text);
    expect(ergebnis.ok).toBe(false);
    if (!ergebnis.ok) expect(ergebnis.fehler.code).toBe('globalid-ungueltig');
  });
});
