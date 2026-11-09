// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufruf: node tools/check-licenses.mjs [Verzeichnis]
import { resolve } from 'node:path';
import { pruefeLizenzen } from './licenses.mjs';

const verzeichnis = resolve(process.argv[2] ?? '.');
const verstoesse = pruefeLizenzen(verzeichnis);
if (verstoesse.length > 0) {
  console.error('Abhängigkeiten mit nicht erlaubter Lizenz (Regel C5):');
  for (const v of verstoesse) console.error(`  ${v}`);
  process.exit(1);
}
console.log('Alle Abhängigkeiten haben eine AGPL-3.0-or-later-kompatible Lizenz.');
