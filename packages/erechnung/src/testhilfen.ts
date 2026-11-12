// SPDX-License-Identifier: AGPL-3.0-or-later
// Nur für Tests: liest Testdateien als Text (Produktivcode macht nie I/O, A2).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const paket = join(dirname(fileURLToPath(import.meta.url)), '..');
const wurzel = join(paket, '..', '..');

/** Datei der KoSIT-Testsuite unter `fixtures/extern/xrechnung/`. */
export function kosit(name: string): string {
  return readFileSync(join(wurzel, 'fixtures', 'extern', 'xrechnung', name), 'utf8');
}

/** Selbst verfasste Testdatei unter `packages/erechnung/testdaten/`. */
export function testdatei(name: string): string {
  return readFileSync(join(paket, 'testdaten', name), 'utf8');
}
