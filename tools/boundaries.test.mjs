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
  });
});
