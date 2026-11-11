// SPDX-License-Identifier: AGPL-3.0-or-later
// XSD-Gegenprüfung der GAEB-Exporte (Ticket 40, ADR 0010, Regel Q3).
//
// Aufruf: pnpm --filter @tethys/gaeb run xsd-gegenpruefung
//
// 1. Kein `*.xsd` darf versioniert sein (das amtliche Schema kommt nie ins Repo).
// 2. Lädt die amtlichen Schemadateien 3.3 und 3.2 (Leistungsverzeichnis und Mengenermittlung) zur Laufzeit in ein
//    Temp-Verzeichnis außerhalb des Repos (`$RUNNER_TEMP` bzw. das Temp-Verzeichnis des Systems) und prüft die SHA-256
//    der ZIP-Dateien.
// 3. Schreibt alle Exporte (jede Fixture × X81/X83/X86 × 3.3/3.2, dazu die gelesenen amtlichen X81/X83 und die
//    Aufmaßblätter als X31, Ticket 83) über den Vitest-Lauf `src/xsd-ausgabe.test.ts` in dasselbe Temp-Verzeichnis.
// 4. Prüft jede Datei mit `xmllint --noout --schema`. Jeder Schemafehler lässt das Skript scheitern und nennt Datei
//    und Zeile.
// Danach wird das Temp-Verzeichnis gelöscht.
//
// Lokal (ohne `CI`): Fehlen Netz oder xmllint, endet das Skript mit „XSD-Gegenprüfung übersprungen: <Grund>“ und
// Exit 0. In der CI (`CI=true`) ist das ein Fehler.
/* global process, console */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const PAKET = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WURZEL = resolve(PAKET, '..', '..');
const IN_CI = process.env.CI === 'true';
/** Programm für die Schemaprüfung; `XMLLINT` überschreibt es (z. B. um das Überspringen zu prüfen). */
const XMLLINT = process.env.XMLLINT ?? 'xmllint';

/**
 * Amtliche Schemapakete je Version und Phasen; weicht die Prüfsumme ab, hat sich das Schema geändert. Die Mengenermittlung
 * (X31, Ticket 83) steht in eigenen Paketen.
 */
const SCHEMAS = [
  {
    version: '3.3',
    phasen: ['81', '83', '86'],
    url: 'https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Leistungsverzeichnis.zip',
    sha256: 'd4f19a79c46119ba6a7bbca1067bc2a26ccadb60d1b5fd8a82725f45b491e203',
    datei: (phase) => `GAEB_DA_XML_${phase}_3.3_2021-05.xsd`,
  },
  {
    version: '3.2',
    phasen: ['81', '83', '86'],
    url: 'https://www.gaeb.de/wp-content/uploads/2019/04/Leistungsverzeichnis.zip',
    sha256: 'b655e955db75df43c82f49bea0a4246c19f25bcb2ad01186a6a14ffdae03fe76',
    datei: (phase) => `Leistungsverzeichnis/GAEB_DA_XML_${phase}_3.2_2013-10.xsd`,
  },
  {
    version: '3.3',
    phasen: ['31'],
    url: 'https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Mengenermittlung.zip',
    sha256: '88e796ec1c26419edf4446dab24953a83b449c0983297ae9c7e25ca3500888f0',
    datei: () => 'GAEB_DA_XML_31_3.3_2021-05.xsd',
  },
  {
    version: '3.2',
    phasen: ['31'],
    url: 'https://www.gaeb.de/wp-content/uploads/2019/04/Mengenermittlung_3.2_2013-10.zip',
    sha256: 'f360a10886d164d7b4ddf297d3327b9e70a9b1194e50f76c4e59f88cf02d9267',
    datei: () => 'Mengenermittlung/GAEB_DA_XML_31_3.2_2013-10.xsd',
  },
];

class Uebersprungen extends Error {}

function ueberspringen(grund) {
  throw new Uebersprungen(grund);
}

function lauf(befehl, args, optionen = {}) {
  return spawnSync(befehl, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...optionen });
}

/** Entpackt ein ZIP (nur „stored“ und „deflate“) über das zentrale Verzeichnis. */
function entpacke(zip, ziel) {
  let ende = -1;
  for (let i = zip.length - 22; i >= 0; i--)
    if (zip.readUInt32LE(i) === 0x06054b50) {
      ende = i;
      break;
    }
  if (ende < 0) throw new Error('ZIP ohne zentrales Verzeichnis');
  const anzahl = zip.readUInt16LE(ende + 10);
  let p = zip.readUInt32LE(ende + 16);
  for (let n = 0; n < anzahl; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP: Eintrag im Verzeichnis beschädigt');
    const methode = zip.readUInt16LE(p + 10);
    const groesse = zip.readUInt32LE(p + 20);
    const namensLaenge = zip.readUInt16LE(p + 28);
    const extraLaenge = zip.readUInt16LE(p + 30);
    const kommentarLaenge = zip.readUInt16LE(p + 32);
    const lokal = zip.readUInt32LE(p + 42);
    const name = zip.subarray(p + 46, p + 46 + namensLaenge).toString('utf8');
    p += 46 + namensLaenge + extraLaenge + kommentarLaenge;
    if (name.endsWith('/')) continue;
    if (name.includes('..') || name.startsWith('/')) throw new Error(`ZIP: unsicherer Pfad ${name}`);
    const start = lokal + 30 + zip.readUInt16LE(lokal + 26) + zip.readUInt16LE(lokal + 28);
    const roh = zip.subarray(start, start + groesse);
    const daten = methode === 0 ? roh : methode === 8 ? inflateRawSync(roh) : null;
    if (daten === null) throw new Error(`ZIP: Kompression ${String(methode)} nicht unterstützt (${name})`);
    mkdirSync(dirname(join(ziel, name)), { recursive: true });
    writeFileSync(join(ziel, name), daten);
  }
}

function pruefeNichtsVersioniert() {
  const r = lauf('git', ['-C', WURZEL, 'ls-files', '*.xsd', '*.XSD', '**/*.xsd', '**/*.XSD']);
  if (r.status !== 0) throw new Error(`git ls-files schlug fehl: ${r.stderr}`);
  const dateien = r.stdout.split('\n').filter((z) => z !== '');
  if (dateien.length > 0)
    throw new Error(`Versionierte XSD-Dateien (ADR 0010 verbietet das):\n  ${dateien.join('\n  ')}`);
}

function ladeSchemas(temp) {
  if (lauf(XMLLINT, ['--version']).error) ueberspringen('xmllint ist nicht installiert');
  /** `<version>|<phase>` → Pfad des XSD. */
  const schemas = {};
  for (const [i, s] of SCHEMAS.entries()) {
    const zip = join(temp, `schema-${String(i)}.zip`);
    const r = lauf('curl', ['-fsSL', '--retry', '2', '-o', zip, s.url]);
    if (r.error) ueberspringen('curl ist nicht installiert');
    if (r.status !== 0) ueberspringen(`Download von ${s.url} fehlgeschlagen (${r.stderr.trim()})`);
    const daten = readFileSync(zip);
    const summe = createHash('sha256').update(daten).digest('hex');
    if (summe !== s.sha256)
      throw new Error(
        `SHA-256 von ${s.url} ist ${summe}, erwartet ${s.sha256}. Das amtliche Schema hat sich geändert; ` +
          'Exporte und Prüfsumme sind zu prüfen.',
      );
    const ziel = join(temp, `xsd-${String(i)}`);
    entpacke(daten, ziel);
    for (const phase of s.phasen) schemas[`${s.version}|${phase}`] = join(ziel, s.datei(phase));
  }
  return schemas;
}

function schreibeExporte(ziel) {
  const r = lauf('pnpm', ['exec', 'vitest', 'run', 'packages/gaeb/src/xsd-ausgabe.test.ts'], {
    cwd: WURZEL,
    env: { ...process.env, GAEB_EXPORT_VERZEICHNIS: ziel },
  });
  if (r.status !== 0) throw new Error(`Exporte konnten nicht geschrieben werden:\n${r.stdout}\n${r.stderr}`);
  const dateien = readdirSync(ziel).sort();
  if (dateien.length === 0) throw new Error('Es wurden keine Exporte geschrieben.');
  return dateien;
}

function main() {
  pruefeNichtsVersioniert();
  const temp = mkdtempSync(join(process.env.RUNNER_TEMP ?? tmpdir(), 'tethys-gaeb-xsd-'));
  try {
    const schemas = ladeSchemas(temp);
    const exporte = join(temp, 'exporte');
    mkdirSync(exporte);
    const dateien = schreibeExporte(exporte);
    let fehler = 0;
    for (const datei of dateien) {
      const m = /-X(8[136]|31)-(3\.[23])\.x(?:8[136]|31)$/.exec(datei);
      if (!m) throw new Error(`Unerwarteter Dateiname ${datei}`);
      const [, phase, version] = m;
      const xsd = schemas[`${version}|${phase}`];
      if (xsd === undefined) throw new Error(`Kein Schema für X${phase} ${version}`);
      const r = lauf(XMLLINT, ['--noout', '--schema', xsd, join(exporte, datei)]);
      if (r.status === 0) console.log(`bestanden  ${datei}`);
      else {
        fehler += 1;
        console.log(`FEHLER     ${datei}`);
        for (const zeile of r.stderr.split('\n'))
          if (zeile !== '' && !zeile.endsWith('fails to validate'))
            console.log(`  ${zeile.replace(exporte + '/', '')}`);
      }
    }
    console.log(
      `XSD-Gegenprüfung: ${String(dateien.length - fehler)} von ${String(dateien.length)} Dateien bestanden.`,
    );
    if (fehler > 0) process.exitCode = 1;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

try {
  main();
} catch (e) {
  if (e instanceof Uebersprungen && !IN_CI) {
    console.log(`XSD-Gegenprüfung übersprungen: ${e.message}`);
  } else {
    console.error(
      e instanceof Uebersprungen
        ? `XSD-Gegenprüfung nicht möglich (CI): ${e.message}`
        : String(e.message ?? e),
    );
    process.exitCode = 1;
  }
}
