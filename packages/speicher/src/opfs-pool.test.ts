// SPDX-License-Identifier: AGPL-3.0-or-later
// Stille Probe des OPFS-Pools (Ticket 139 Punkt 6): Hält ein anderer Zugriff eine Datei, ist das Öffnen `gesperrt`, ohne dass
// SQLite es versucht und in der Konsole meldet. Das OPFS ist hier nachgebildet; im Browser prüft es `e2e/speicher.spec.ts`.

import { describe, expect, it } from 'vitest';
import { fehlerAusAusnahme } from './fehler';
import { pruefePoolFrei, type Ordner } from './opfs-pool';

const domFehler = (name: string, text: string): Error => Object.assign(new Error(text), { name });

/** Ein nachgebildetes Verzeichnis: Unterordner und Dateien; `gehalten` nennt Dateien, die ein anderer Zugriff hält. */
function ordner(inhalt: Record<string, Ordner | 'datei'>, gehalten: Set<string>, offen: string[]): Ordner {
  const datei = (name: string) => ({
    kind: 'file' as const,
    createSyncAccessHandle: () => {
      if (gehalten.has(name))
        return Promise.reject(domFehler('NoModificationAllowedError', 'another open Access Handle'));
      offen.push(name);
      return Promise.resolve({
        close: () => {
          offen.splice(offen.indexOf(name), 1);
        },
      });
    },
  });
  return {
    kind: 'directory',
    getDirectoryHandle: (name) => {
      const o = inhalt[name];
      return o === undefined || o === 'datei'
        ? Promise.reject(domFehler('NotFoundError', 'nicht da'))
        : Promise.resolve(o);
    },
    async *values() {
      await Promise.resolve();
      for (const [name, o] of Object.entries(inhalt)) yield o === 'datei' ? datei(name) : o;
    },
  };
}

function wurzelMitPool(gehalten: Set<string>, offen: string[]): Ordner {
  const opak = ordner({ a: 'datei', b: 'datei', c: 'datei' }, gehalten, offen);
  return ordner({ '.tethys-projekte': ordner({ '.opaque': opak }, gehalten, offen) }, gehalten, offen);
}

describe('pruefePoolFrei', () => {
  it('freie Dateien: jede wird kurz geöffnet und wieder geschlossen', async () => {
    const offen: string[] = [];
    await pruefePoolFrei(wurzelMitPool(new Set(), offen), '.tethys-projekte');
    expect(offen).toEqual([]);
  });

  it('ein Pool, den es noch nicht gibt, ist frei', async () => {
    await expect(pruefePoolFrei(ordner({}, new Set(), []), '.tethys-neu')).resolves.toBeUndefined();
  });

  it('hält ein anderer Zugriff eine Datei: ein Fehler, den der Speicher gesperrt nennt; nichts bleibt offen', async () => {
    const offen: string[] = [];
    const fehler = await pruefePoolFrei(wurzelMitPool(new Set(['b']), offen), '.tethys-projekte').catch(
      (e: unknown) => e,
    );
    expect(fehlerAusAusnahme(fehler).code).toBe('gesperrt');
    expect(offen).toEqual([]);
  });
});
