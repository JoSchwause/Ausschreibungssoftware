// SPDX-License-Identifier: AGPL-3.0-or-later
// Bilder aus dem Langtext für den Druck (B-22, Ticket 141): Ist der Inhalt ein vollständiges PNG oder ein JPEG mit lesbaren
// Maßen? Erkannt wird am Inhalt, nicht am Medientyp (Dateien aus GAEB nennen ihn uneinheitlich). Was nicht passt, bleibt im
// Druck die sichtbare Marke (Q5).
//
// Ein PNG wird ganz geprüft (Signatur, IHDR, Blöcke bis IEND, die entpackten Bilddaten mit Prüfsumme, Länge und
// Zeilenfiltern): Die PDF-Bibliothek entpackt PNG mit Alphakanal oder Zeilensprung selbst, und an kaputten Daten bliebe sie
// hängen, statt einen Fehler zu melden. Ein JPEG bettet sie unverändert ein; geprüft werden die Marker bis zum Bildkopf.

import { unzlibSync } from 'fflate';

/** Größte Bilddatei, die der Druck einbettet (Bytes nach dem Dekodieren); größere bleiben eine Marke. */
export const MAX_BILD_BYTES = 5 * 1024 * 1024;
/** Größte Bildfläche in Pixeln (25 Megapixel); größere bleiben eine Marke. */
export const MAX_BILD_PIXEL = 25_000_000;

export interface Druckbild {
  /** `data:`-Adresse des Bildes, wie pdfmake sie liest. */
  readonly daten: string;
  /** Maße in Pixeln aus dem Bildkopf. */
  readonly breite: number;
  readonly hoehe: number;
}

const ZEICHEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const WERT = new Map(Array.from({ length: ZEICHEN.length }, (_, i) => [ZEICHEN.charAt(i), i]));

/** Base64 ohne Leerraum; `null` bei ungültigen Zeichen oder falscher Länge. */
function dekodiere(text: string): Uint8Array | null {
  if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return null;
  const fuell = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((text.length / 4) * 3 - fuell);
  let j = 0;
  for (let i = 0; i < text.length; i += 4) {
    const n =
      ((WERT.get(text.charAt(i)) ?? 0) << 18) |
      ((WERT.get(text.charAt(i + 1)) ?? 0) << 12) |
      ((WERT.get(text.charAt(i + 2)) ?? 0) << 6) |
      (WERT.get(text.charAt(i + 3)) ?? 0);
    for (const b of [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]) if (j < bytes.length) bytes[j++] = b;
  }
  return bytes;
}

const u16 = (b: Uint8Array, i: number): number => ((b[i] ?? 0) << 8) | (b[i + 1] ?? 0);
const u32 = (b: Uint8Array, i: number): number => u16(b, i) * 0x10000 + u16(b, i + 2);
const ascii = (b: Uint8Array, i: number, n: number): string => String.fromCharCode(...b.subarray(i, i + n));

const PNG_SIGNATUR = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Erlaubte Bittiefen je Farbtyp (PNG-Spezifikation, Tabelle zu IHDR). */
const PNG_BITTIEFEN: Readonly<Record<number, readonly number[]>> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

/** Kanäle je Pixel nach Farbtyp. */
const PNG_KANAELE: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
/** Die sieben Durchgänge des Zeilensprungs (Adam7): Start x, Start y, Schritt x, Schritt y. */
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const;

/** Zeilen der entpackten Bilddaten als `[Anzahl, Bytes je Zeile ohne Filterbyte]`, je Durchgang. */
function pngZeilen(
  breite: number,
  hoehe: number,
  bitsJePixel: number,
  zeilensprung: boolean,
): [number, number][] {
  const zeile = (b: number): number => Math.ceil((b * bitsJePixel) / 8);
  if (!zeilensprung) return [[hoehe, zeile(breite)]];
  return ADAM7.flatMap(([x0, y0, dx, dy]): [number, number][] => {
    const b = breite > x0 ? Math.ceil((breite - x0) / dx) : 0;
    const h = hoehe > y0 ? Math.ceil((hoehe - y0) / dy) : 0;
    return b > 0 && h > 0 ? [[h, zeile(b)]] : [];
  });
}

function adler32(daten: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < daten.length; i += 5552) {
    const ende = Math.min(i + 5552, daten.length);
    for (let j = i; j < ende; j++) {
      a += daten[j] ?? 0;
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  return b * 65536 + a;
}

/** Entpackt die Bilddaten und prüft Prüfsumme, Länge und die Filter (0 bis 4) am Anfang jeder Zeile. */
function pngDatenGanz(zlib: Uint8Array, zeilen: readonly [number, number][]): boolean {
  let roh: Uint8Array;
  try {
    roh = unzlibSync(zlib);
  } catch {
    return false;
  }
  if (zlib.length < 6 || adler32(roh) !== u32(zlib, zlib.length - 4)) return false;
  const erwartet = zeilen.reduce((n, [anzahl, bytes]) => n + anzahl * (bytes + 1), 0);
  if (roh.length !== erwartet) return false;
  let pos = 0;
  for (const [anzahl, bytes] of zeilen)
    for (let z = 0; z < anzahl; z++, pos += bytes + 1) if ((roh[pos] ?? 99) > 4) return false;
  return true;
}

function pngMasse(b: Uint8Array): { breite: number; hoehe: number } | null {
  if (b.length < 8 + 25 + 12 || PNG_SIGNATUR.some((z, i) => b[i] !== z)) return null;
  if (u32(b, 8) !== 13 || ascii(b, 12, 4) !== 'IHDR') return null;
  const breite = u32(b, 16);
  const hoehe = u32(b, 20);
  const tiefe = b[24] ?? 0;
  const farbtyp = b[25] ?? 99;
  if (breite === 0 || hoehe === 0 || breite * hoehe > MAX_BILD_PIXEL) return null;
  if (!(PNG_BITTIEFEN[farbtyp] ?? []).includes(tiefe)) return null;
  if (b[26] !== 0 || b[27] !== 0 || (b[28] !== 0 && b[28] !== 1)) return null;
  let pos = 8;
  const daten: Uint8Array[] = [];
  let palette = false;
  while (pos + 12 <= b.length) {
    const laenge = u32(b, pos);
    const typ = ascii(b, pos + 4, 4);
    if (laenge > b.length - pos - 12) return null;
    if (typ === 'IDAT') daten.push(b.subarray(pos + 8, pos + 8 + laenge));
    if (typ === 'PLTE') palette = true;
    if (typ === 'IEND') {
      if (daten.length === 0 || (farbtyp === 3 && !palette)) return null;
      const zlib = new Uint8Array(daten.reduce((n, d) => n + d.length, 0));
      let o = 0;
      for (const d of daten) {
        zlib.set(d, o);
        o += d.length;
      }
      const zeilen = pngZeilen(breite, hoehe, tiefe * (PNG_KANAELE[farbtyp] ?? 1), b[28] === 1);
      return pngDatenGanz(zlib, zeilen) ? { breite, hoehe } : null;
    }
    pos += 12 + laenge;
  }
  return null;
}

/** Marker eines Bildkopfs (SOF), außer DHT (C4), JPG (C8) und DAC (CC). */
const istSof = (m: number): boolean => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

function jpegMasse(b: Uint8Array): { breite: number; hoehe: number } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let pos = 2;
  while (pos + 4 <= b.length) {
    if (b[pos] !== 0xff) return null;
    const marker = b[pos + 1] ?? 0;
    if (marker === 0xff) {
      pos++; // Füllbyte
      continue;
    }
    const laenge = u16(b, pos + 2);
    if (laenge < 2 || pos + 2 + laenge > b.length) return null;
    if (istSof(marker)) {
      const hoehe = u16(b, pos + 5);
      const breite = u16(b, pos + 7);
      const kanaele = b[pos + 9] ?? 0;
      const passt =
        breite > 0 && hoehe > 0 && breite * hoehe <= MAX_BILD_PIXEL && [1, 3, 4].includes(kanaele);
      return passt ? { breite, hoehe } : null;
    }
    if (marker === 0xda || marker === 0xd9) return null; // Bilddaten oder Ende vor dem Bildkopf
    pos += 2 + laenge;
  }
  return null;
}

/** Das Bild für den Druck, oder `null`, wenn es kein vollständiges PNG oder JPEG ist oder zu groß. */
export function druckbild(base64: string): Druckbild | null {
  const text = base64.replace(/\s+/g, '');
  if ((text.length / 4) * 3 > MAX_BILD_BYTES + 2) return null;
  const bytes = dekodiere(text);
  if (bytes === null || bytes.length > MAX_BILD_BYTES) return null;
  const png = pngMasse(bytes);
  if (png !== null) return { daten: `data:image/png;base64,${text}`, ...png };
  const jpeg = jpegMasse(bytes);
  return jpeg === null ? null : { daten: `data:image/jpeg;base64,${text}`, ...jpeg };
}
