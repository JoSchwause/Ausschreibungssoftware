// SPDX-License-Identifier: AGPL-3.0-or-later
// Datei lesen am Rand der App (Review S8): Nur „der Browser gibt die Bytes nicht heraus“ ist ein erwarteter Fehler
// („nicht lesbar“); alles andere ist ein Programmfehler und darf nicht in derselben Meldung verschwinden.

import { describe, expect, it } from 'vitest';
import { DateiNichtLesbar, GAEB_ENDUNGEN, dateiBytes } from './datei';

const datei = (arrayBuffer: () => Promise<ArrayBuffer>): File => ({ name: 'lv.x83', arrayBuffer }) as File;

describe('dateiBytes', () => {
  it('liefert die Bytes der Datei', async () => {
    const bytes = await dateiBytes(datei(() => Promise.resolve(new Uint8Array([60, 71]).buffer)));
    expect([...bytes]).toEqual([60, 71]);
  });

  it('verweigert der Browser die Bytes, ist das DateiNichtLesbar mit Dateiname und Ursache', async () => {
    const ursache = new DOMException('Datei verschwunden', 'NotReadableError');
    const r = dateiBytes(datei(() => Promise.reject(ursache)));
    await expect(r).rejects.toBeInstanceOf(DateiNichtLesbar);
    await expect(r).rejects.toMatchObject({ datei: 'lv.x83', cause: ursache });
  });
});

describe('GAEB_ENDUNGEN', () => {
  it('bietet DA XML, GAEB 90 und GAEB 2000 jeder Phase an, klein und groß', () => {
    const endungen = GAEB_ENDUNGEN.split(',');
    for (const e of ['.x81', '.X83', '.x85', '.X89', '.d83', '.D81', '.p84', '.P86', '.x31', '.xml'])
      expect(endungen).toContain(e);
    expect(endungen).not.toContain('.ifc');
  });
});
