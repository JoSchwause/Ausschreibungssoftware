// SPDX-License-Identifier: AGPL-3.0-or-later
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pruefeCleanRoom, pruefeDco } from './clean-room.mjs';

let repo = '';
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: 'pipe' });
const cli = (name, ...args) =>
  execFileSync('node', [join(import.meta.dirname, name), ...args], { cwd: repo, stdio: 'pipe' });

function datei(pfad, inhalt = 'x\n') {
  const voll = join(repo, pfad);
  mkdirSync(dirname(voll), { recursive: true });
  writeFileSync(voll, inhalt);
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'cleanroom-'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test Person');
  git('config', 'user.email', 'test@example.org');
  git('config', 'commit.gpgsign', 'false');
  datei('.gitignore', 'docs/research/nova-ava/\nokf/research/\n');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe('Clean-Room (C2)', () => {
  it('akzeptiert ein Repo, in dem die Rechercheordner ignoriert bleiben', () => {
    datei('okf/research/notiz.md');
    datei('docs/research/nova-ava/bericht.md');
    datei('README.md');
    git('add', '-A');
    expect(pruefeCleanRoom(repo)).toEqual([]);
    expect(() => cli('check-clean-room.mjs', repo)).not.toThrow();
  });

  it('schlägt fehl, wenn eine Datei unter okf/research/ versioniert ist', () => {
    datei('okf/research/notiz.md');
    git('add', '-f', 'okf/research/notiz.md');
    expect(pruefeCleanRoom(repo)).toEqual(['okf/research/notiz.md']);
    expect(() => cli('check-clean-room.mjs', repo)).toThrow();
  });

  it('schlägt fehl, wenn eine Datei unter docs/research/nova-ava/ versioniert ist', () => {
    datei('docs/research/nova-ava/bericht.md');
    git('add', '-f', 'docs/research/nova-ava/bericht.md');
    expect(pruefeCleanRoom(repo)).toEqual(['docs/research/nova-ava/bericht.md']);
  });
});

describe('DCO', () => {
  it('meldet Commits ohne Signed-off-by und akzeptiert signierte', () => {
    datei('a.txt');
    git('add', '-A');
    git('commit', '-q', '-m', 'Basis');
    datei('b.txt');
    git('add', '-A');
    git('commit', '-q', '-s', '-m', 'Signiert');
    datei('c.txt');
    git('add', '-A');
    git('commit', '-q', '-m', 'Unsigniert');
    const fehlend = pruefeDco(repo, 'HEAD~2..HEAD');
    expect(fehlend).toHaveLength(1);
    expect(fehlend[0]).toContain('Unsigniert');
    expect(() => cli('check-dco.mjs', 'HEAD~2..HEAD')).toThrow();
    expect(() => cli('check-dco.mjs', 'HEAD~2..HEAD~1')).not.toThrow();
  });
});
