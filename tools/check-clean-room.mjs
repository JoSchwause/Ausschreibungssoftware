// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufruf: node tools/check-clean-room.mjs [Repo-Wurzel]
import { resolve } from 'node:path';
import { pruefeCleanRoom, VERBOTENE_PFADE } from './clean-room.mjs';

const wurzel = resolve(process.argv[2] ?? '.');
const dateien = pruefeCleanRoom(wurzel);
if (dateien.length > 0) {
  console.error(`Versionierte Dateien unter ${VERBOTENE_PFADE.join(' und ')} (Regel C2):`);
  for (const d of dateien) console.error(`  ${d}`);
  process.exit(1);
}
console.log('Clean-Room: nichts Verbotenes versioniert.');
