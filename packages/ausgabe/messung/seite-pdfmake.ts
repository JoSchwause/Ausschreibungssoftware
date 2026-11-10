// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstieg für das Browser-Bündel der Messung (Weg A): hängt `erzeugePdf` an `globalThis`.

import type { LvZustand } from '@tethys/vertrag';
import { erzeugePdf } from '../src/index';

const dekodiere = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

(globalThis as unknown as { ausgabe: unknown }).ausgabe = {
  /** Dauer in ms und PDF-Größe; die Bytes bleiben im Browser. */
  async messe(
    zustand: LvZustand,
    normalB64: string,
    fettB64: string,
  ): Promise<{ ms: number; bytes: number }> {
    const schriften = { normal: dekodiere(normalB64), fett: dekodiere(fettB64) };
    const t0 = performance.now();
    const pdf = await erzeugePdf(zustand, schriften);
    return { ms: performance.now() - t0, bytes: pdf.length };
  },
  /** Liefert die Bytes (Base64) zur Prüfung im Test. */
  async erzeuge(zustand: LvZustand, normalB64: string, fettB64: string): Promise<string> {
    const pdf = await erzeugePdf(zustand, { normal: dekodiere(normalB64), fett: dekodiere(fettB64) });
    let s = '';
    for (let i = 0; i < pdf.length; i += 0x8000) s += String.fromCharCode(...pdf.subarray(i, i + 0x8000));
    return btoa(s);
  },
};
