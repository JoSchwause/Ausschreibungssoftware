// SPDX-License-Identifier: AGPL-3.0-or-later
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { istErlaubt, pruefeLizenzen } from './licenses.mjs';

describe('istErlaubt', () => {
  it.each(['MIT', 'Apache-2.0', '(MIT OR GPL-2.0-only)', 'MIT AND BSD-3-Clause', '(MIT AND (ISC OR Foo))'])(
    'erlaubt %s',
    (l) => expect(istErlaubt(l)).toBe(true),
  );
  it.each(['GPL-2.0-only', 'UNLICENSED', 'SSPL-1.0', 'UNKNOWN', '', 'MIT AND GPL-2.0-only', 'BUSL-1.1'])(
    'verbietet %s',
    (l) => expect(istErlaubt(l)).toBe(false),
  );
});

describe('pruefeLizenzen', () => {
  let dir = '';
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  function projekt(lizenz) {
    dir = mkdtempSync(join(tmpdir(), 'lizenz-'));
    mkdirSync(join(dir, 'fremd'));
    writeFileSync(
      join(dir, 'fremd/package.json'),
      JSON.stringify({ name: 'fremd-paket', version: '1.0.0', license: lizenz }),
    );
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'testprojekt',
        version: '0.0.0',
        private: true,
        dependencies: { 'fremd-paket': 'file:./fremd' },
      }),
    );
    execFileSync('pnpm', ['install', '--offline', '--ignore-workspace'], { cwd: dir, stdio: 'pipe' });
  }

  it('meldet eine nicht lizenzkonforme Testabhängigkeit', () => {
    projekt('GPL-2.0-only');
    const v = pruefeLizenzen(dir);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatch(/^fremd-paket@.*: GPL-2.0-only$/);
  });

  it('akzeptiert eine konforme Testabhängigkeit', () => {
    projekt('MIT');
    expect(pruefeLizenzen(dir)).toEqual([]);
  });

  it('lässt das CLI mit Fehlercode enden', () => {
    projekt('UNLICENSED');
    const cli = join(import.meta.dirname, 'check-licenses.mjs');
    expect(() => execFileSync('node', [cli, dir], { stdio: 'pipe' })).toThrow();
  });
});
