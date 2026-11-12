// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Modellansicht im Prüfstand. Die Tests lesen den Zustand der Leinwand über den Prüfzugang (`window.__modell`), nie
// Pixel (D-58).

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { globalId } from '../src/testhilfe/ifc-erzeuger';

const WAND_SUED = globalId('Wand', 1);
const WAND_NORD = globalId('Wand', 2);
const WAND_WEST = globalId('Wand', 3);
const WAND_OST = globalId('Wand', 4);
const PLATTE = globalId('Platte', 1);
const STUETZE = globalId('Stuetze', 1);
const FENSTER = globalId('Fenster', 1);
const ALLE = [WAND_SUED, WAND_NORD, WAND_WEST, WAND_OST, PLATTE, STUETZE, FENSTER].sort();

const leinwand = (page: Page) => page.getByRole('application', { name: /3D-Ansicht des Modells/ });

async function laden(page: Page, url = '/?modell=klein'): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => window.__modell.ereignisse.geladen.length > 0);
}

test.describe('kleines Modell', () => {
  test.beforeEach(async ({ page }) => {
    await laden(page);
  });

  test('lädt das Modell und meldet Bauteile mit und ohne Geometrie', async ({ page }) => {
    const [bericht] = await page.evaluate(() => window.__modell.ereignisse.geladen);
    expect([...(bericht?.mitGeometrie ?? [])].sort()).toEqual(ALLE);
    expect(bericht?.ohneGeometrie).toEqual([globalId('Platzhalter', 1)]);
    expect(bericht?.dauerMs).toBeGreaterThan(0);

    const d = await page.evaluate(() => window.__modell.darstellung());
    expect(d.geladen).toBe(true);
    expect(d.bauteile).toBe(7);
    expect([...d.sichtbar].sort()).toEqual(ALLE);
    expect(d.hervorgehoben).toEqual([]);
    expect(d.bilder).toBeGreaterThan(0);
    await expect(leinwand(page)).toHaveAccessibleName('3D-Ansicht des Modells: 7 Bauteile, keine Auswahl');
    expect(await page.evaluate(() => window.__modell.ereignisse.fehler)).toEqual([]);
  });
});
