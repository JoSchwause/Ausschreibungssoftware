// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { appIdQuelle, uuidV7Quelle } from './ids';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('UUIDv7-Quelle der App (A7)', () => {
  it('schreibt die Zeit in die ersten 48 Bit und setzt Version 7 und Variante', () => {
    const neu = uuidV7Quelle({ jetzt: () => 0x0193_4f2a_1b2c, zufall: (b) => b.fill(0xff) });
    const id = neu();
    expect(id).toMatch(UUID_V7);
    expect(id.startsWith('01934f2a-1b2c-7')).toBe(true);
  });

  it('liefert in derselben Millisekunde streng aufsteigende Kennungen, auch über den Zählerüberlauf', () => {
    const neu = uuidV7Quelle({ jetzt: () => 1_700_000_000_000, zufall: (b) => b.fill(0xff) });
    const ids = Array.from({ length: 5000 }, neu);
    for (let i = 1; i < ids.length; i++) expect((ids[i] ?? '') > (ids[i - 1] ?? '')).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(UUID_V7);
  });

  it('bleibt aufsteigend, wenn die Uhr zurückspringt', () => {
    const zeiten = [2000, 1000, 1000];
    const neu = uuidV7Quelle({ jetzt: () => zeiten.shift() ?? 0 });
    const [a, b, c] = [neu(), neu(), neu()];
    expect(b > a && c > b).toBe(true);
  });

  it('alle Kennungsarten der IdQuelle sind UUIDv7 und verschieden', () => {
    const q = appIdQuelle();
    const ids = [q.projekt(), q.leistungsverzeichnis(), q.titel(), q.position(), q.protokoll()];
    for (const id of ids) expect(id).toMatch(UUID_V7);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
