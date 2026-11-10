// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pruefeGrenzen } from './boundaries.mjs';

let wurzel = '';

function datei(pfad, inhalt) {
  const voll = join(wurzel, pfad);
  mkdirSync(dirname(voll), { recursive: true });
  writeFileSync(voll, inhalt);
}

/** Legt ein Paket mit Einstiegspunkt an und verlinkt es wie pnpm unter node_modules/@tethys. */
function paket(ordner, importe = []) {
  const name = ordner.split('/').pop();
  datei(
    `${ordner}/package.json`,
    JSON.stringify({ name: `@tethys/${name}`, exports: { '.': './src/index.ts' } }),
  );
  datei(`${ordner}/src/index.ts`, importe.map((i) => `import '${i}';`).join('\n') + '\nexport {};\n');
  const link = join(wurzel, 'node_modules/@tethys', name);
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(relative(dirname(link), join(wurzel, ordner)), link);
}

beforeEach(() => {
  wurzel = mkdtempSync(join(tmpdir(), 'grenzen-'));
});
afterEach(() => {
  rmSync(wurzel, { recursive: true, force: true });
});

describe('Paketgrenzen (A3)', () => {
  it('erlaubt die vorgesehenen Richtungen', async () => {
    paket('packages/vertrag');
    paket('packages/dezimal', ['@tethys/vertrag']);
    paket('packages/kern', ['@tethys/vertrag', '@tethys/dezimal']);
    paket('packages/speicher', ['@tethys/vertrag']);
    paket('packages/ui-basis');
    paket('packages/ui-grid', ['@tethys/vertrag', '@tethys/ui-basis']);
    paket('apps/web', ['@tethys/kern', '@tethys/speicher', '@tethys/ui-grid']);
    expect(await pruefeGrenzen(wurzel)).toEqual([]);
  });

  it('weist einen Import zwischen zwei Fachpaketen ab (Paketname)', async () => {
    paket('packages/vertrag');
    paket('packages/gaeb', ['@tethys/vertrag']);
    paket('packages/speicher', ['@tethys/gaeb']);
    const verstoesse = await pruefeGrenzen(wurzel);
    expect(verstoesse).toHaveLength(1);
    expect(verstoesse[0]).toContain('grenze-packages-speicher');
  });

  it('weist einen relativen Import in ein anderes Paket ab', async () => {
    paket('packages/vertrag');
    paket('packages/kern');
    datei('packages/vertrag/src/boese.ts', "import '../../kern/src/index';\nexport {};\n");
    const verstoesse = await pruefeGrenzen(wurzel);
    expect(verstoesse.some((v) => v.startsWith('grenze-packages-vertrag'))).toBe(true);
  });

  it('weist kern -> speicher, ui-grid -> kern und ui-basis -> vertrag ab', async () => {
    paket('packages/vertrag');
    paket('packages/kern', ['@tethys/speicher']);
    paket('packages/speicher');
    paket('packages/ui-basis', ['@tethys/vertrag']);
    paket('packages/ui-grid', ['@tethys/kern']);
    const regeln = (await pruefeGrenzen(wurzel)).map((v) => v.split(':')[0]).sort();
    expect(regeln).toEqual(['grenze-packages-kern', 'grenze-packages-ui-basis', 'grenze-packages-ui-grid']);
  });

  it('weist Import der App durch ein Paket ab', async () => {
    paket('packages/vertrag', ['@tethys/web']);
    paket('apps/web');
    expect((await pruefeGrenzen(wurzel)).length).toBeGreaterThan(0);
  });

  it('weist ein nicht registriertes Paket ab', async () => {
    paket('packages/unbekannt');
    const verstoesse = await pruefeGrenzen(wurzel);
    expect(verstoesse.some((v) => v.startsWith('nicht-registriertes-paket'))).toBe(true);
  });

  it('erlaubt Fixtures nur in Tests', async () => {
    paket('packages/kern');
    paket('fixtures');
    datei('packages/kern/src/rechnen.ts', "import '@tethys/fixtures';\nexport {};\n");
    datei('packages/kern/src/rechnen.test.ts', "import '@tethys/fixtures';\nexport {};\n");
    const verstoesse = await pruefeGrenzen(wurzel);
    expect(verstoesse.filter((v) => v.startsWith('fixtures-nur-in-tests'))).toHaveLength(1);
    // Die Testdatei darf Fixtures lesen, die Produktivdatei nicht: genau ein Verstoß, und nur gegen die Fixture-Regel.
    expect(verstoesse).toHaveLength(1);
    expect(verstoesse[0]).toContain('rechnen.ts');
  });

  it('weist Produktivcode ab, der über eine Testhilfe zu Fixtures gelangt', async () => {
    paket('packages/kern');
    paket('fixtures');
    datei('packages/kern/src/prod.ts', "import './testhilfen';\nexport {};\n");
    datei('packages/kern/src/testhilfen.ts', "import '../../../fixtures/a';\nexport {};\n");
    datei('fixtures/a.ts', 'export {};\n');
    const verstoesse = await pruefeGrenzen(wurzel);
    expect(verstoesse.some((v) => v.startsWith('testhilfen-nur-in-tests') && v.includes('prod.ts'))).toBe(
      true,
    );
  });

  it('weist Produktivcode ab, der ein Verzeichnis testhilfe/ importiert', async () => {
    paket('packages/speicher');
    datei('packages/speicher/src/prod.ts', "import './testhilfe/x';\nexport {};\n");
    datei('packages/speicher/src/testhilfe/x.ts', 'export {};\n');
    const verstoesse = await pruefeGrenzen(wurzel);
    expect(verstoesse.some((v) => v.startsWith('testhilfen-nur-in-tests'))).toBe(true);
  });

  it('zählt harness/ zu den Testdateien: darf testhilfe/ importieren, src/ nicht', async () => {
    paket('packages/speicher');
    datei('packages/speicher/harness/main.ts', "import '../src/testhilfe/x';\nexport {};\n");
    datei('packages/speicher/src/testhilfe/x.ts', 'export {};\n');
    expect(await pruefeGrenzen(wurzel)).toEqual([]);
    datei('packages/speicher/src/prod.ts', "import './testhilfe/x';\nexport {};\n");
    const verstoesse = await pruefeGrenzen(wurzel);
    expect(verstoesse).toHaveLength(1);
    expect(verstoesse[0]).toContain('prod.ts');
  });

  it('erlaubt einer Testdatei, testhilfen zu importieren', async () => {
    paket('packages/kern');
    paket('fixtures');
    datei('packages/kern/src/a.test.ts', "import './testhilfen';\nexport {};\n");
    datei('packages/kern/src/testhilfen.ts', "import '../../../fixtures/a';\nexport {};\n");
    datei('fixtures/a.ts', 'export {};\n');
    expect(await pruefeGrenzen(wurzel)).toEqual([]);
  });

  it('zählt Testhilfen (testhilfen.ts) zu den Testdateien', async () => {
    paket('packages/kern');
    paket('fixtures');
    datei('packages/kern/src/testhilfen.ts', "import '@tethys/fixtures';\nexport {};\n");
    expect(await pruefeGrenzen(wurzel)).toEqual([]);
  });

  it('erlaubt einer Testdatei Fixtures auch aus e2e-Ordnern und per relativem Pfad', async () => {
    paket('packages/ui-grid');
    paket('fixtures');
    datei('packages/ui-grid/e2e/grid.spec.ts', "import '../../../fixtures/index';\nexport {};\n");
    datei('fixtures/index.ts', 'export {};\n');
    expect(await pruefeGrenzen(wurzel)).toEqual([]);
  });
});
