// SPDX-License-Identifier: AGPL-3.0-or-later
// Lizenzprüfung aller installierten Abhängigkeiten (Regel C5, ADR 0008).
// Erlaubt sind Lizenzen, die sich in ein AGPL-3.0-or-later-Projekt einbinden lassen.

import { execFileSync } from 'node:child_process';

/** SPDX-Kennungen (kleingeschrieben), die in ein AGPL-3.0-or-later-Projekt eingebunden werden dürfen. */
export const ERLAUBT = new Set(
  [
    'MIT',
    'MIT-0',
    'ISC',
    'BSD-2-Clause',
    'BSD-3-Clause',
    '0BSD',
    'Apache-2.0',
    'BlueOak-1.0.0',
    'CC0-1.0',
    'CC-BY-3.0',
    'CC-BY-4.0',
    'Unlicense',
    'Zlib',
    'Python-2.0',
    'MPL-2.0',
    'Unicode-3.0',
    'LGPL-2.1-or-later',
    'LGPL-3.0-only',
    'LGPL-3.0-or-later',
    'GPL-3.0-only',
    'GPL-3.0-or-later',
    'AGPL-3.0-only',
    'AGPL-3.0-or-later',
  ].map((s) => s.toLowerCase()),
);

/**
 * Wertet einen SPDX-Ausdruck aus: OR = eine Alternative genügt, AND = alle müssen erlaubt sein.
 * Unbekannte oder fehlende Lizenzen gelten als nicht erlaubt.
 * @param {string} ausdruck
 */
export function istErlaubt(ausdruck) {
  const token = ausdruck.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const oder = () => {
    let ok = und();
    while (token[i]?.toUpperCase() === 'OR') {
      i++;
      const rechts = und();
      ok = ok || rechts;
    }
    return ok;
  };
  const und = () => {
    let ok = atom();
    while (token[i]?.toUpperCase() === 'AND') {
      i++;
      const rechts = atom();
      ok = ok && rechts;
    }
    return ok;
  };
  const atom = () => {
    const t = token[i++];
    if (t === undefined) return false;
    if (t === '(') {
      const ok = oder();
      if (token[i] === ')') i++;
      return ok;
    }
    let id = t.replace(/\+$/, '');
    if (token[i]?.toUpperCase() === 'WITH') i += 2; // Ausnahme-Zusatz, z. B. "GPL-3.0-only WITH GCC-exception"
    id = id.toLowerCase();
    return ERLAUBT.has(id) || (t.endsWith('+') && ERLAUBT.has(`${id}-or-later`));
  };
  const ok = oder();
  return ok && i === token.length;
}

/**
 * Prüft alle installierten Pakete unter `verzeichnis` (liest `pnpm licenses list`).
 * @param {string} verzeichnis
 * @returns {string[]} Verstöße als "name@version: Lizenz"
 */
export function pruefeLizenzen(verzeichnis) {
  const roh = execFileSync('pnpm', ['licenses', 'list', '--json'], {
    cwd: verzeichnis,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  /** @type {Record<string, {name: string, versions: string[]}[]>} */
  const nachLizenz = JSON.parse(roh);
  const verstoesse = [];
  for (const [lizenz, pakete] of Object.entries(nachLizenz)) {
    if (istErlaubt(lizenz)) continue;
    for (const p of pakete) verstoesse.push(`${p.name}@${p.versions.join(',')}: ${lizenz}`);
  }
  return verstoesse;
}
