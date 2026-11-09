// SPDX-License-Identifier: AGPL-3.0-or-later
// Prüft fixtures/extern/HERKUNFT.md gegen den Dateibaum (Ticket 23, Regel C4, ADR 0010).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Dateien im Ordner, die selbst keine Fremddateien sind (Metadaten des Ordners). */
const EIGENE = new Set(['HERKUNFT.md', 'README.md', '.gitattributes']);

/** @param {string} dir @returns {string[]} alle Dateien unterhalb von dir, relativ, mit "/" */
function dateien(dir) {
  /** @type {string[]} */
  const out = [];
  const gehe = (/** @type {string} */ d) => {
    for (const name of readdirSync(d)) {
      const voll = join(d, name);
      if (statSync(voll).isDirectory()) gehe(voll);
      else out.push(relative(dir, voll).split(sep).join('/'));
    }
  };
  gehe(dir);
  return out.sort();
}

/**
 * Liest die Tabellenzeilen aus HERKUNFT.md: Spalte 1 ist der Pfad in Backticks (relativ zu fixtures/extern/),
 * die letzte Spalte die SHA-256 der Datei in Backticks.
 * @param {string} text
 * @returns {{ pfad: string, sha256: string, zeile: number }[]}
 */
export function leseHerkunft(text) {
  /** @type {{ pfad: string, sha256: string, zeile: number }[]} */
  const eintraege = [];
  text.split('\n').forEach((zeile, i) => {
    if (!zeile.startsWith('| `')) return;
    const spalten = zeile.split('|').map((s) => s.trim());
    const pfad = /^`([^`]+)`$/.exec(spalten[1] ?? '')?.[1];
    const sha = /^`([0-9a-f]{64})`$/.exec(spalten[spalten.length - 2] ?? '')?.[1];
    eintraege.push({ pfad: pfad ?? '', sha256: sha ?? '', zeile: i + 1 });
  });
  return eintraege;
}

/**
 * @param {string} ordner Pfad zu fixtures/extern
 * @param {string[]} [versioniert] Dateien, die Git verfolgt (relativ zur Wurzel); prüft zusätzlich auf .xsd
 * @returns {string[]} Fehlermeldungen; leer heißt in Ordnung
 */
export function pruefeHerkunft(ordner, versioniert = []) {
  /** @type {string[]} */
  const fehler = [];
  const text = readFileSync(join(ordner, 'HERKUNFT.md'), 'utf8');
  const eintraege = leseHerkunft(text);
  const gesehen = new Set();
  for (const e of eintraege) {
    if (e.pfad === '' || e.sha256 === '') {
      fehler.push(`HERKUNFT.md Zeile ${String(e.zeile)}: Pfad oder SHA-256 nicht lesbar`);
      continue;
    }
    if (gesehen.has(e.pfad)) fehler.push(`HERKUNFT.md: ${e.pfad} steht mehrfach drin`);
    gesehen.add(e.pfad);
    try {
      const ist = createHash('sha256')
        .update(readFileSync(join(ordner, e.pfad)))
        .digest('hex');
      if (ist !== e.sha256) fehler.push(`Prüfsumme stimmt nicht: ${e.pfad} (ist ${ist}, steht ${e.sha256})`);
    } catch {
      fehler.push(`Datei fehlt: ${e.pfad} (steht in HERKUNFT.md)`);
    }
  }
  for (const d of dateien(ordner)) {
    if (EIGENE.has(d) || d.startsWith('LICENSES/')) continue;
    if (!gesehen.has(d)) fehler.push(`Nicht in HERKUNFT.md: ${d}`);
  }
  for (const d of [...dateien(ordner), ...versioniert]) {
    if (d.toLowerCase().endsWith('.xsd')) fehler.push(`XSD im Baum (ADR 0010 verbietet das): ${d}`);
  }
  return fehler;
}
