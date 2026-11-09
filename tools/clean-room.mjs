// SPDX-License-Identifier: AGPL-3.0-or-later
// Clean-Room-Prüfung (Regel C2, ADR 0007) und DCO-Prüfung (ADR 0008).

import { execFileSync } from 'node:child_process';

/** Pfade, unter denen nie etwas versioniert sein darf. */
export const VERBOTENE_PFADE = ['docs/research/nova-ava', 'okf/research'];

const git = (wurzel, args) =>
  execFileSync('git', args, { cwd: wurzel, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/**
 * Liefert alle versionierten Dateien (Index) unter den verbotenen Pfaden.
 * @param {string} wurzel Git-Arbeitsverzeichnis
 * @returns {string[]}
 */
export function pruefeCleanRoom(wurzel) {
  const ausgabe = git(wurzel, ['ls-files', '-z', '--', ...VERBOTENE_PFADE]);
  return ausgabe.split('\0').filter(Boolean);
}

/**
 * Liefert Commits im Bereich `bereich` (z. B. "origin/main..HEAD") ohne Signed-off-by-Zeile.
 * Merge-Commits werden übersprungen.
 * @param {string} wurzel
 * @param {string} bereich
 * @returns {string[]} Kurz-Hash und Betreff
 */
export function pruefeDco(wurzel, bereich) {
  const ausgabe = git(wurzel, ['log', '--no-merges', '-z', '--format=%H%x01%s%x01%B', bereich]);
  const fehlend = [];
  for (const eintrag of ausgabe.split('\0').filter(Boolean)) {
    const [hash, betreff, text] = eintrag.trim().split('\x01');
    if (!/^Signed-off-by: .+ <.+@.+>$/m.test(text ?? '')) fehlend.push(`${hash?.slice(0, 10)} ${betreff}`);
  }
  return fehlend;
}
