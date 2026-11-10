// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufruf: node tools/check-dco.mjs <Commit-Bereich> [<Login des PR-Autors>]   (z. B. origin/main..HEAD)
// Ist der Login in .github/dco-betreuer.txt eingetragen, entfällt die Prüfung (E-17, Regel P8).
import { resolve } from 'node:path';
import { istBetreuer, pruefeDco } from './clean-room.mjs';

const bereich = process.argv[2];
if (!bereich) {
  console.error('Aufruf: node tools/check-dco.mjs <Commit-Bereich>');
  process.exit(2);
}
const autor = process.argv[3];
if (istBetreuer(resolve('.'), autor)) {
  console.log(`DCO: Pull Request von Betreuer:in ${autor} (.github/dco-betreuer.txt), Prüfung entfällt.`);
  process.exit(0);
}
const fehlend = pruefeDco(resolve('.'), bereich);
if (fehlend.length > 0) {
  console.error('Commits ohne Signed-off-by (DCO, siehe CONTRIBUTING.md):');
  for (const c of fehlend) console.error(`  ${c}`);
  process.exit(1);
}
console.log(`DCO: alle Commits in ${bereich} sind signiert.`);
