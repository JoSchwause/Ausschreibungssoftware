// SPDX-License-Identifier: AGPL-3.0-or-later
// Kalendertage als Text `JJJJ-MM-TT` (Ticket 102 Punkt 1): proleptischer gregorianischer Kalender, keine Zeitzonen.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { datumPruefen } from './index';

describe('datumPruefen', () => {
  it.each(['2026-11-12', '2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31', '1582-10-10'])(
    'nimmt %s an',
    (text) => {
      expect(datumPruefen(text)).toEqual({ ok: true, wert: text });
    },
  );

  it.each([
    ['', 'datum-form'],
    ['2026-1-12', 'datum-form'],
    ['12.11.2026', 'datum-form'],
    ['2026-11-12T00:00:00Z', 'datum-form'],
    [' 2026-11-12', 'datum-form'],
    ['20261112', 'datum-form'],
    ['+2026-11-12', 'datum-form'],
    ['２０２６-11-12', 'datum-form'],
    ['0000-01-01', 'datum-unmoeglich'],
    ['2026-00-10', 'datum-unmoeglich'],
    ['2026-13-01', 'datum-unmoeglich'],
    ['2026-04-31', 'datum-unmoeglich'],
    ['2026-02-29', 'datum-unmoeglich'],
    ['1900-02-29', 'datum-unmoeglich'],
    ['2026-01-00', 'datum-unmoeglich'],
    ['2026-01-32', 'datum-unmoeglich'],
  ])('weist %j ab mit %s', (text, code) => {
    const e = datumPruefen(text);
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe(code);
  });
});

describe('Benennung (Glossar „Kalenderdatum“, keine Synonyme)', () => {
  it('das Paket führt den alten Namen `Datum` nicht mehr, auch nicht als Alias für die App (Ticket 163)', () => {
    const verzeichnis = dirname(fileURLToPath(import.meta.url));
    const nutzer = readdirSync(verzeichnis)
      .filter((f) => f.endsWith('.ts') && f !== 'datum.test.ts')
      .filter((f) =>
        /(?:[:<|(,]\s*|\bas\s+|\btype\s+|\{\s*|,\s*)Datum\b(?![-\wäöü])/.test(
          readFileSync(join(verzeichnis, f), 'utf8'),
        ),
      );
    expect(nutzer).toEqual([]);
  });
});
