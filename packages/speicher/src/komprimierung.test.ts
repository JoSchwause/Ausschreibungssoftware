// SPDX-License-Identifier: AGPL-3.0-or-later
// Entpacken mit Obergrenze (Ticket 122, SA12): Die Bytes einer Modelldatei aus einer fremden Projektdatei werden höchstens bis
// zu der Größe entpackt, die ihr Bauwerksmodell nennt; ein Strom, der mehr ergäbe, bricht ab, statt den Speicher zu füllen.

import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { inflateRawHoechstens } from './komprimierung';

describe('inflateRawHoechstens', () => {
  const roh = new Uint8Array(1_000_000).map((_, i) => i % 7);
  const komprimiert = new Uint8Array(deflateRawSync(roh));

  it('gibt die Bytes zurück, wenn sie die Obergrenze nicht überschreiten', () => {
    expect(inflateRawHoechstens(komprimiert, roh.length)).toEqual(roh);
    expect(inflateRawHoechstens(komprimiert, roh.length + 1)).toEqual(roh);
  });

  it('ergäbe der Strom mehr Bytes: null, ohne alles zu entpacken', () => {
    expect(inflateRawHoechstens(komprimiert, roh.length - 1)).toBeNull();
    const bombe = new Uint8Array(deflateRawSync(new Uint8Array(64 * 1024 * 1024)));
    expect(bombe.length).toBeLessThan(100_000);
    expect(inflateRawHoechstens(bombe, 1024)).toBeNull();
  });

  it('wirft bei einem Strom, der kein deflate-raw ist, auch bei leerem oder abgeschnittenem', () => {
    expect(() => inflateRawHoechstens(new TextEncoder().encode('xyz'), 100)).toThrow();
    expect(() => inflateRawHoechstens(new Uint8Array(0), 100)).toThrow();
    expect(() => inflateRawHoechstens(komprimiert.subarray(0, 10), 2_000_000)).toThrow();
  });
});
