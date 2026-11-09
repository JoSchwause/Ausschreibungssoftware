// SPDX-License-Identifier: AGPL-3.0-or-later
// Bytes → Text. Rein: `TextDecoder` gibt es im Browser und in Node.
//
// Reihenfolge: Byte-Order-Mark, Deklaration in `<?xml … encoding="…"?>`, sonst UTF-8. UTF-8 wird streng
// gelesen; ungültige Bytes (typisch: Latin-1-Datei, die UTF-8 deklariert) führen zu einem Befund und zum Lesen
// als Windows-1252, nie zu einem Abbruch.

import type { Pruefbefund } from '@tethys/vertrag';

export interface Dekodierung {
  readonly text: string;
  readonly befunde: readonly Pruefbefund[];
}

const befund = (code: string, meldung: string): Pruefbefund => ({
  schwere: 'warnung',
  quelle: 'gaeb-lesen',
  code,
  meldung,
  ort: { zeile: 1, spalte: 1 },
});

const ohneBom = (s: string): string => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

function deklaration(bytes: Uint8Array): string | null {
  let kopf = '';
  const bis = Math.min(bytes.length, 256);
  for (let i = 0; i < bis; i++) kopf += String.fromCharCode(bytes[i] ?? 0);
  const m = /^\s*<\?xml[^>]*?\sencoding\s*=\s*["']([^"']+)["']/.exec(kopf);
  return m?.[1]?.trim().toLowerCase() ?? null;
}

export function dekodiereBytes(bytes: Uint8Array): Dekodierung {
  const befunde: Pruefbefund[] = [];
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return { text: ohneBom(new TextDecoder('utf-16le').decode(bytes)), befunde };
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return { text: ohneBom(new TextDecoder('utf-16be').decode(bytes)), befunde };

  const mitBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const erklaert = mitBom ? 'utf-8' : deklaration(bytes);
  const utf8 = erklaert === null || erklaert === 'utf-8' || erklaert === 'utf8';

  if (!utf8) {
    try {
      return { text: ohneBom(new TextDecoder(erklaert, { fatal: false }).decode(bytes)), befunde };
    } catch {
      befunde.push(
        befund(
          'kodierung-unbekannt',
          `Die Kodierung „${erklaert}“ ist unbekannt; die Datei wird als UTF-8 gelesen.`,
        ),
      );
    }
  }
  try {
    return { text: ohneBom(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), befunde };
  } catch {
    befunde.push(
      befund(
        'kodierung-ungueltig',
        'Die Datei enthält Bytes, die kein gültiges UTF-8 sind; sie wird als Windows-1252 gelesen.',
      ),
    );
    return { text: ohneBom(new TextDecoder('windows-1252').decode(bytes)), befunde };
  }
}
