// SPDX-License-Identifier: AGPL-3.0-or-later
// Paketgrenzen (Regel A3), geprüft mit dependency-cruiser.
//
// Richtung: vertrag <- dezimal/kern <- Fachpakete <- apps/web. Fachpakete importieren einander nie.
// Jeder Eintrag nennt die Ordner (relativ zur Repo-Wurzel), die ein Paket importieren darf.
// Ein Paket kann sich selbst immer importieren. Fixtures dürfen Testdateien aller Pakete lesen, Produktivdateien nie. Ein neues Paket muss hier eingetragen werden,
// sonst schlägt die Prüfung fehl.

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cruise } from 'dependency-cruiser';

const FACH = ['packages/vertrag', 'packages/dezimal', 'packages/kern'];

/** @type {Record<string, string[]>} */
export const ERLAUBT = {
  'packages/vertrag': [],
  'packages/dezimal': ['packages/vertrag'],
  'packages/kern': ['packages/vertrag', 'packages/dezimal'],
  'packages/speicher': ['packages/vertrag'],
  'packages/gaeb': ['packages/vertrag', 'packages/dezimal'],
  'packages/ui-basis': [],
  'packages/ui-grid': ['packages/vertrag', 'packages/ui-basis'],
  // Weitere Fachpakete aus plan.md §1: noch nicht angelegt, Grenzen stehen schon fest.
  'packages/vergabe': FACH,
  'packages/mengen': FACH,
  'packages/abrechnung': FACH,
  'packages/kosten': FACH,
  'packages/ausgabe': FACH,
  // Die App darf alle Pakete einbinden.
  'apps/web': [
    'packages/vertrag',
    'packages/dezimal',
    'packages/kern',
    'packages/speicher',
    'packages/gaeb',
    'packages/ui-basis',
    'packages/ui-grid',
    'packages/vergabe',
    'packages/mengen',
    'packages/abrechnung',
    'packages/kosten',
    'packages/ausgabe',
  ],
  // Fixtures sind reine Daten und importieren nichts.
  fixtures: [],
};

const ALLE = Object.keys(ERLAUBT);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const alt = (ordner) => ordner.map(esc).join('|');
// Testdateien: *.test.*, *.spec.*, e2e/ und die Hilfsdateien nur für Tests (testhilfen.ts, testhilfe/).
const TESTDATEI = String.raw`(\.test\.|\.spec\.|(^|/)e2e/|(^|/)testhilfen?(\.|/))`;

/** Verbotsregeln für dependency-cruiser, abgeleitet aus der Tabelle. */
export function regeln() {
  const forbidden = [];
  for (const [von, darf] of Object.entries(ERLAUBT)) {
    const erlaubt = [von, ...darf];
    forbidden.push({
      name: `grenze-${von.replace('/', '-')}`,
      comment: `${von} darf nur ${darf.length ? darf.join(', ') : 'sich selbst'} importieren (A3).`,
      severity: 'error',
      from: { path: `^${esc(von)}/` },
      // Fixtures regelt `fixtures-nur-in-tests`: Testdateien jedes Pakets dürfen sie lesen, Produktivcode nie.
      // Aus fixtures heraus gilt weiter die Tabelle (fixtures importiert keine Pakete).
      to: {
        path: von === 'fixtures' ? `^(packages|apps|fixtures)(/|$)` : `^(packages|apps)(/|$)`,
        pathNot: `^(${alt(erlaubt)})(/|$)`,
      },
    });
  }
  forbidden.push({
    name: 'fixtures-nur-in-tests',
    comment:
      'Produktivcode importiert keine Fixtures; Testdateien (*.test.*, *.spec.*, e2e/) dürfen es (A3, Ticket 25).',
    severity: 'error',
    from: { pathNot: `^fixtures/|${TESTDATEI}` },
    to: { path: '^fixtures/' },
  });
  return forbidden;
}

/**
 * Prüft den Quelltext unter `wurzel` und liefert die Verstöße.
 * @param {string} wurzel Repo-Wurzel (enthält packages/, apps/, fixtures/)
 * @returns {Promise<string[]>}
 */
export async function pruefeGrenzen(wurzel) {
  const ordner = ['packages', 'apps', 'fixtures'].filter((o) => existiert(wurzel, o));
  const antwort = await cruise(
    ordner,
    {
      baseDir: wurzel,
      validate: true,
      ruleSet: { forbidden: regeln() },
      exclude: { path: '(^|/)(node_modules|dist)/' },
      doNotFollow: { path: 'node_modules' },
      tsPreCompilationDeps: true,
      combinedDependencies: true,
      enhancedResolveOptions: {
        exportsFields: ['exports'],
        conditionNames: ['import', 'require', 'node', 'default'],
        extensions: ['.ts', '.tsx', '.js', '.mjs', '.json'],
      },
    },
    { extensions: ['.ts', '.tsx', '.js', '.mjs'] },
  );
  const unbekannt = ['packages', 'apps']
    .filter((o) => existiert(wurzel, o))
    .flatMap((o) =>
      readdirSync(join(wurzel, o), { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => `${o}/${d.name}`),
    )
    .filter((p) => !ALLE.includes(p))
    .map((p) => `nicht-registriertes-paket: ${p} fehlt in tools/boundaries.mjs`);
  const out = /** @type {any} */ (antwort.output);
  const regelverstoesse = out.summary.violations.map(
    (/** @type {any} */ v) => `${v.rule.name}: ${v.from}${v.to && v.to !== v.from ? ` -> ${v.to}` : ''}`,
  );
  return [...unbekannt, ...regelverstoesse];
}

function existiert(wurzel, ordner) {
  return existsSync(join(wurzel, ordner));
}
