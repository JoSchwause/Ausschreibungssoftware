// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 100 §6, nachgeholt in Ticket 122 (PA1): der Prüfstand mit `fixtures/ifc/haus-v1.ifc` (Ticket 99), das die Vite-Testseite
// unter `modelle/haus-v1.ifc` ausliefert. Erwartet werden die 30 Bauteile aus `fixtures/typisch-bim.json`, alle mit Geometrie;
// ein Klick auf ein sichtbares Bauteil wählt genau dieses (Zustand über den Prüfzugang, nie Pixel, D-58).

import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const BIM = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-bim.json', import.meta.url), 'utf8'),
) as { bauteile: { v1: { globalId: string; klasse: string }[] } };
const ALLE = BIM.bauteile.v1.map((b) => b.globalId).sort();

test('haus-v1.ifc: alle 30 Bauteile mit Geometrie gezeichnet; ein Klick wählt ein Bauteil', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/?modell=haus-v1');
  await page.waitForFunction(() => window.__modell.ereignisse.geladen.length > 0, null, { timeout: 60_000 });
  const [bericht] = await page.evaluate(() => window.__modell.ereignisse.geladen);
  expect([...(bericht?.mitGeometrie ?? [])].sort()).toEqual(ALLE);
  expect(bericht?.ohneGeometrie).toEqual([]);
  expect(await page.evaluate(() => window.__modell.ereignisse.fehler)).toEqual([]);
  const d = await page.evaluate(() => window.__modell.darstellung());
  expect(d.bauteile).toBe(ALLE.length);
  expect([...d.sichtbar].sort()).toEqual(ALLE);
  console.log(`[Leistung] haus-v1: Laden ${String(Math.round(bericht?.seitUebergabeMs ?? NaN))} ms`);

  // Ein sichtbares Bauteil anklicken (die erste Wand, deren Mitte im Bild liegt).
  const waende = BIM.bauteile.v1.filter((b) => b.klasse === 'IfcWall').map((b) => b.globalId);
  let gewaehlt: string | null = null;
  for (const id of waende) {
    const p = await page.evaluate((g) => window.__modell.punkt(g), id);
    if (p === null) continue;
    await page.mouse.click(p.x, p.y);
    gewaehlt = id;
    break;
  }
  expect(gewaehlt).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.__modell.eingaben().auswahl)).toEqual([gewaehlt]);
  await expect
    .poll(async () => (await page.evaluate(() => window.__modell.darstellung())).hervorgehoben)
    .toEqual([gewaehlt]);
});
