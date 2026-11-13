// SPDX-License-Identifier: AGPL-3.0-or-later
// Testhilfen: kleine, selbst erzeugte Bilder für den Langtext (Ticket 141), nicht exportiert über index.ts. Ein PNG wird
// nach der Formatbeschreibung gebaut (Signatur, IHDR, IDAT mit zlib, IEND, je mit CRC-32); ein JPEG nur als Kopf mit SOF0,
// denn der Druck bettet JPEG unverändert ein und liest nur die Maße.

import { zlibSync } from 'fflate';
import type { Bild, BildId } from '@tethys/vertrag';

const CRC_TABELLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(daten: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of daten) c = (CRC_TABELLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u32 = (n: number): number[] => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

function chunk(typ: string, daten: Uint8Array): number[] {
  const typUndDaten = new Uint8Array([...Buffer.from(typ, 'latin1'), ...daten]);
  return [...u32(daten.length), ...typUndDaten, ...u32(crc32(typUndDaten))];
}

const base64 = (bytes: readonly number[] | Uint8Array): string => Buffer.from(bytes).toString('base64');

const PNG_SIGNATUR = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SOI_APP0 = [0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
/** Drei Komponenten (Y, Cb, Cr) mit Abtastung und Quantisierungstabelle, dann EOI. */
const JPEG_KOMPONENTEN_EOI = [3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9];

/** Ein graues PNG (Graustufen, 8 Bit) mit den angegebenen Pixelmaßen, Base64. */
export function pngBase64(breite: number, hoehe: number): string {
  const zeilen = new Uint8Array((breite + 1) * hoehe).fill(0x80);
  for (let y = 0; y < hoehe; y++) zeilen[y * (breite + 1)] = 0; // Filter „None“ je Zeile
  const ihdr = new Uint8Array([...u32(breite), ...u32(hoehe), 8, 0, 0, 0, 0]);
  const idat = chunk('IDAT', zlibSync(zeilen));
  return base64([...PNG_SIGNATUR, ...chunk('IHDR', ihdr), ...idat, ...chunk('IEND', new Uint8Array())]);
}

/** Kopf eines JPEG (SOI, APP0, SOF0 mit drei Komponenten, EOI) mit den angegebenen Pixelmaßen, Base64. */
export function jpegBase64(breite: number, hoehe: number): string {
  const zwei = (n: number): number[] => [(n >>> 8) & 0xff, n & 0xff];
  const sof0 = [0xff, 0xc0, 0, 17, 8, ...zwei(hoehe), ...zwei(breite), ...JPEG_KOMPONENTEN_EOI];
  return base64([...JPEG_SOI_APP0, ...sof0]);
}

export const bild = (daten: string, medientyp = 'image/png', id = 'bild-1'): Bild => ({
  id: id as BildId,
  medientyp,
  daten,
});
