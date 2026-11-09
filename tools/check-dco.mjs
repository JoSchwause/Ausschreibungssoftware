// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufruf: node tools/check-dco.mjs <Commit-Bereich>   (z. B. origin/main..HEAD)
import { resolve } from 'node:path';
import { pruefeDco } from './clean-room.mjs';

const bereich = process.argv[2];
if (!bereich) {
  console.error('Aufruf: node tools/check-dco.mjs <Commit-Bereich>');
  process.exit(2);
}
const fehlend = pruefeDco(resolve('.'), bereich);
if (fehlend.length > 0) {
  console.error('Commits ohne Signed-off-by (DCO, siehe CONTRIBUTING.md):');
  for (const c of fehlend) console.error(`  ${c}`);
  process.exit(1);
}
console.log(`DCO: alle Commits in ${bereich} sind signiert.`);
