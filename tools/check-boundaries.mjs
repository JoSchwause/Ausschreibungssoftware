// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufruf: node tools/check-boundaries.mjs [Repo-Wurzel]
import { resolve } from 'node:path';
import { pruefeGrenzen } from './boundaries.mjs';

const wurzel = resolve(process.argv[2] ?? '.');
const verstoesse = await pruefeGrenzen(wurzel);
if (verstoesse.length > 0) {
  console.error('Paketgrenzen verletzt (Regel A3):');
  for (const v of verstoesse) console.error(`  ${v}`);
  process.exit(1);
}
console.log('Paketgrenzen eingehalten.');
