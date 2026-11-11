// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { berechtigungSichern, inOrdnerSchreiben, type OrdnerHandle } from './ordner';

/** Attrappe der File System Access API: ein Ordner im Speicher. */
class Attrappe implements OrdnerHandle {
  readonly kind = 'directory' as const;
  readonly name = 'Sicherung';
  readonly dateien = new Map<string, string>();
  erlaubnis: PermissionState = 'granted';
  anfrage: PermissionState = 'granted';
  anfragen = 0;
  abbruchBeimSchreiben = false;

  getFileHandle(name: string, optionen?: { create?: boolean }) {
    if (optionen?.create !== true && !this.dateien.has(name)) return Promise.reject(new Error('fehlt'));
    return Promise.resolve({
      createWritable: () => {
        let puffer = '';
        return Promise.resolve({
          write: (d: string) => {
            if (this.abbruchBeimSchreiben) return Promise.reject(new Error('voll'));
            puffer += d;
            return Promise.resolve();
          },
          close: () => {
            this.dateien.set(name, puffer);
            return Promise.resolve();
          },
        });
      },
    });
  }
  queryPermission() {
    return Promise.resolve(this.erlaubnis);
  }
  requestPermission() {
    this.anfragen += 1;
    return Promise.resolve(this.anfrage);
  }
}

describe('Sicherungsordner schreiben', () => {
  it('legt die Datei an und überschreibt sie beim zweiten Mal vollständig', async () => {
    const o = new Attrappe();
    expect(await inOrdnerSchreiben(o, 'a.tethys.json', '{"lang":"inhalt"}')).toEqual({ ok: true });
    expect(await inOrdnerSchreiben(o, 'a.tethys.json', '{}')).toEqual({ ok: true });
    expect(o.dateien.get('a.tethys.json')).toBe('{}');
  });

  it('meldet einen Schreibfehler, ohne zu werfen', async () => {
    const o = new Attrappe();
    o.abbruchBeimSchreiben = true;
    expect((await inOrdnerSchreiben(o, 'a.tethys.json', '{}')).ok).toBe(false);
  });
});

describe('Berechtigung für den Sicherungsordner', () => {
  it('fragt nicht nach, wenn sie schon erteilt ist', async () => {
    const o = new Attrappe();
    expect(await berechtigungSichern(o, true)).toBe(true);
    expect(o.anfragen).toBe(0);
  });

  it('fragt nach einem Neustart neu, wenn sie fehlt und nachgefragt werden darf', async () => {
    const o = new Attrappe();
    o.erlaubnis = 'prompt';
    expect(await berechtigungSichern(o, true)).toBe(true);
    expect(o.anfragen).toBe(1);
  });

  it('fragt im Hintergrund (automatisches Sichern) nie nach', async () => {
    const o = new Attrappe();
    o.erlaubnis = 'prompt';
    expect(await berechtigungSichern(o, false)).toBe(false);
    expect(o.anfragen).toBe(0);
  });

  it('gibt false zurück, wenn der Nutzer ablehnt', async () => {
    const o = new Attrappe();
    o.erlaubnis = 'prompt';
    o.anfrage = 'denied';
    expect(await berechtigungSichern(o, true)).toBe(false);
  });
});
