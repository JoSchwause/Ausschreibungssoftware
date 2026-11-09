// SPDX-License-Identifier: AGPL-3.0-or-later
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { pruefeHerkunft } from './herkunft.mjs';

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('fixtures/extern', () => {
  it('stimmt mit HERKUNFT.md überein und enthält kein XSD', () => {
    const verfolgt = execFileSync('git', ['ls-files', '-z'], { cwd: wurzel, encoding: 'utf8' })
      .split('\0')
      .filter(Boolean);
    expect(pruefeHerkunft(join(wurzel, 'fixtures/extern'), verfolgt)).toEqual([]);
  });
});

describe('pruefeHerkunft', () => {
  let dir = '';
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const sha = (/** @type {string} */ s) => createHash('sha256').update(s).digest('hex');

  /** @param {Record<string, string>} dateien @param {string} tabelle Zeilen der Tabelle */
  function ordner(dateien, tabelle) {
    dir = mkdtempSync(join(tmpdir(), 'herkunft-'));
    for (const [pfad, inhalt] of Object.entries(dateien)) {
      mkdirSync(dirname(join(dir, pfad)), { recursive: true });
      writeFileSync(join(dir, pfad), inhalt);
    }
    writeFileSync(join(dir, 'HERKUNFT.md'), `| Datei | SHA-256 |\n|---|---|\n${tabelle}\n`);
    return dir;
  }
  const zeile = (/** @type {string} */ pfad, /** @type {string} */ inhalt) =>
    `| \`${pfad}\` | x | \`${sha(inhalt)}\` |`;

  it('akzeptiert einen vollständigen Stand', () => {
    expect(pruefeHerkunft(ordner({ 'a/x.X83': 'eins' }, zeile('a/x.X83', 'eins')))).toEqual([]);
  });

  it('meldet eine Datei, die in HERKUNFT.md fehlt', () => {
    const f = pruefeHerkunft(ordner({ 'a/x.X83': 'eins', 'a/y.X83': 'zwei' }, zeile('a/x.X83', 'eins')));
    expect(f).toEqual(['Nicht in HERKUNFT.md: a/y.X83']);
  });

  it('meldet eine falsche Prüfsumme', () => {
    const f = pruefeHerkunft(ordner({ 'a/x.X83': 'eins' }, zeile('a/x.X83', 'zwei')));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/^Prüfsumme stimmt nicht: a\/x\.X83/);
  });

  it('meldet einen Eintrag ohne Datei', () => {
    const f = pruefeHerkunft(ordner({}, zeile('a/weg.X83', 'eins')));
    expect(f).toEqual(['Datei fehlt: a/weg.X83 (steht in HERKUNFT.md)']);
  });

  it('meldet eine .xsd im Ordner, auch wenn sie eingetragen ist', () => {
    const f = pruefeHerkunft(ordner({ 'a/Schema.XSD': 'x' }, zeile('a/Schema.XSD', 'x')));
    expect(f).toEqual(['XSD im Baum (ADR 0010 verbietet das): a/Schema.XSD']);
  });

  it('meldet eine versionierte .xsd außerhalb des Ordners', () => {
    const f = pruefeHerkunft(ordner({ 'a/x.X83': 'eins' }, zeile('a/x.X83', 'eins')), [
      'packages/gaeb/GAEB_DA_XML_83.xsd',
    ]);
    expect(f).toEqual(['XSD im Baum (ADR 0010 verbietet das): packages/gaeb/GAEB_DA_XML_83.xsd']);
  });

  it('meldet eine nicht lesbare Zeile', () => {
    const f = pruefeHerkunft(ordner({}, '| `a/x.X83` | x | kaputt |'));
    expect(f[0]).toMatch(/nicht lesbar/);
  });
});
