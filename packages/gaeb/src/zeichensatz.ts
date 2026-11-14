// SPDX-License-Identifier: AGPL-3.0-or-later
// Zeichensatz von Dateien ohne Angabe dazu (GAEB 90, später GAEB 2000): am Inhalt schätzen und damit lesen (Ticket 136, 144;
// D-71). Rein (A2). `TextDecoder` kennt die DOS-Codepages nicht (WHATWG Encoding), deshalb steht die obere Hälfte von
// Codepage 850 hier als Tabelle (Unicode-Werte der Zeichen 0x80 bis 0xFF). Codepage 437 hat die deutschen Umlaute und das ß an
// denselben Stellen; beide sind am Inhalt nicht zu unterscheiden, gelesen wird als 850 (Lesart D-144.4).

/** `ascii`: nur 7-Bit-Zeichen; `cp850`: DOS-Codepage 437/850; `iso-8859-1`: Latin-1 (gelesen als Windows-1252). */
export type Zeichensatz = 'ascii' | 'utf-8' | 'cp850' | 'iso-8859-1';

/** Umlaute und ß in CP437/850 (ä ö ü Ä Ö Ü ß) und in ISO-8859-1. */
const DOS_UMLAUTE: ReadonlySet<number> = new Set([0x84, 0x94, 0x81, 0x8e, 0x99, 0x9a, 0xe1]);
const LATIN_UMLAUTE: ReadonlySet<number> = new Set([0xe4, 0xf6, 0xfc, 0xc4, 0xd6, 0xdc, 0xdf]);

/** Zeichensatz einer Datei ohne Angabe, am Inhalt geschätzt: gültiges UTF-8, sonst wer mehr Umlaute stellt. */
export function schaetzeZeichensatz(bytes: Uint8Array): Zeichensatz {
  if (!bytes.some((b) => b >= 0x80)) return 'ascii';
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'utf-8';
  } catch {
    let dos = 0;
    let latin = 0;
    for (const b of bytes) {
      if (DOS_UMLAUTE.has(b)) dos += 1;
      else if (LATIN_UMLAUTE.has(b)) latin += 1;
    }
    return dos > latin ? 'cp850' : 'iso-8859-1';
  }
}

// prettier-ignore
const CP850_OBEN: readonly number[] = [
  0xc7, 0xfc, 0xe9, 0xe2, 0xe4, 0xe0, 0xe5, 0xe7, 0xea, 0xeb, 0xe8, 0xef, 0xee, 0xec, 0xc4, 0xc5,
  0xc9, 0xe6, 0xc6, 0xf4, 0xf6, 0xf2, 0xfb, 0xf9, 0xff, 0xd6, 0xdc, 0xf8, 0xa3, 0xd8, 0xd7, 0x192,
  0xe1, 0xed, 0xf3, 0xfa, 0xf1, 0xd1, 0xaa, 0xba, 0xbf, 0xae, 0xac, 0xbd, 0xbc, 0xa1, 0xab, 0xbb,
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0xc1, 0xc2, 0xc0, 0xa9, 0x2563, 0x2551, 0x2557, 0x255d, 0xa2, 0xa5, 0x2510,
  0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0xe3, 0xc3, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0xa4,
  0xf0, 0xd0, 0xca, 0xcb, 0xc8, 0x131, 0xcd, 0xce, 0xcf, 0x2518, 0x250c, 0x2588, 0x2584, 0xa6, 0xcc, 0x2580,
  0xd3, 0xdf, 0xd4, 0xd2, 0xf5, 0xd5, 0xb5, 0xfe, 0xde, 0xda, 0xdb, 0xd9, 0xfd, 0xdd, 0xaf, 0xb4,
  0xad, 0xb1, 0x2017, 0xbe, 0xb6, 0xa7, 0xf7, 0xb8, 0xb0, 0xa8, 0xb7, 0xb9, 0xb3, 0xb2, 0x25a0, 0xa0,
];

function cp850(bytes: Uint8Array): string {
  const teile: string[] = [];
  let lauf = '';
  for (const b of bytes) {
    lauf += String.fromCharCode(b < 0x80 ? b : (CP850_OBEN[b - 0x80] ?? 0xfffd));
    if (lauf.length >= 8192) {
      teile.push(lauf);
      lauf = '';
    }
  }
  teile.push(lauf);
  return teile.join('');
}

/** Bytes → Text im geschätzten Zeichensatz; ein Byte-Order-Mark bei UTF-8 fällt weg. */
export function dekodiereMit(bytes: Uint8Array, zeichensatz: Zeichensatz): string {
  switch (zeichensatz) {
    case 'cp850':
      return cp850(bytes);
    case 'iso-8859-1':
      return new TextDecoder('windows-1252').decode(bytes);
    case 'ascii':
    case 'utf-8': {
      const t = new TextDecoder('utf-8').decode(bytes);
      return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t;
    }
  }
}

/** Der Zeichensatz in Worten für Befunde (L5: keine Kennungen). */
export const ZEICHENSATZ_NAME: Readonly<Record<Zeichensatz, string>> = {
  ascii: 'nur 7-Bit-Zeichen (ASCII)',
  'utf-8': 'UTF-8',
  cp850: 'DOS-Zeichensatz (Codepage 437 oder 850, gelesen als 850)',
  'iso-8859-1': 'ISO-8859-1 (Latin-1)',
};
