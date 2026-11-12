// SPDX-License-Identifier: AGPL-3.0-or-later
// Bytes der Modelldateien (D-51): SHA-256 über Web Crypto (Worker und Node, keine Abhängigkeit), deflate-raw (RFC 1951) mit
// `fflate` (MIT, genau gepinnt) und Base64 (RFC 4648, mit Auffüllung) für die Projektdatei. Kein DOM, nur, was im Worker und
// unter Node gleich vorhanden ist (`crypto.subtle`, `btoa`, `atob`).

import { deflateSync, inflateSync } from 'fflate';

const hex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 der Bytes, 64 Hexziffern klein (`Modelldatei.hash`). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>));
}

/** deflate-raw (ohne zlib-Kopf), Stufe 6: auf einer IFC-Datei von 25 MB etwa 0,5 s und ein Sechstel der Größe. */
export const deflateRaw = (bytes: Uint8Array): Uint8Array => deflateSync(bytes, { level: 6 });

/** Entpackt deflate-raw; wirft bei einem Strom, der kein gültiges deflate-raw ist. */
export const inflateRaw = (bytes: Uint8Array): Uint8Array => inflateSync(bytes);

/** Stücke für `String.fromCharCode` (Argumentliste) beim Kodieren. */
const STUECK = 0x8000;

/** Base64 mit Auffüllung (RFC 4648, Abschnitt 4). */
export function base64(bytes: Uint8Array): string {
  const teile: string[] = [];
  for (let i = 0; i < bytes.length; i += STUECK)
    teile.push(String.fromCharCode(...bytes.subarray(i, i + STUECK)));
  return btoa(teile.join(''));
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Liest Base64 mit Auffüllung streng (Länge durch 4 teilbar, nur das Alphabet); sonst `null`. */
export function ausBase64(text: string): Uint8Array | null {
  if (text.length % 4 !== 0 || !BASE64.test(text)) return null;
  let binaer: string;
  try {
    binaer = atob(text);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binaer.length);
  for (let i = 0; i < binaer.length; i++) bytes[i] = binaer.charCodeAt(i);
  return bytes;
}
