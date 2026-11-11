// SPDX-License-Identifier: AGPL-3.0-or-later
// Lädt die mitgelieferten Schriftdateien unter Node (Tests, Messung). Nicht Teil von `index.ts`.

import { readFileSync } from 'node:fs';
import type { Schriften } from './schriften';

export function schriftenAusDateien(): Schriften {
  const lies = (datei: string): Uint8Array =>
    new Uint8Array(readFileSync(new URL(`../schriften/${datei}`, import.meta.url)));
  return {
    normal: lies('noto-sans-latin-400-normal.woff'),
    fett: lies('noto-sans-latin-700-normal.woff'),
    kursiv: lies('noto-sans-latin-400-italic.woff'),
    fettKursiv: lies('noto-sans-latin-700-italic.woff'),
  };
}
