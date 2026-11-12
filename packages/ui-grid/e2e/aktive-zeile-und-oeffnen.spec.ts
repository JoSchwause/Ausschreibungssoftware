// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 54, Punkte 1 und 2: aktive Zeile melden (`onAktiveZeileChange`), Zeile öffnen (`onZeileOeffnen`).
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

interface FxKnoten {
  id: string;
  parentId: string;
  art: string;
  kurztext?: string;
}
const typisch = (
  JSON.parse(readFileSync(new URL('../../../fixtures/typisch.json', import.meta.url), 'utf8')) as {
    knoten: FxKnoten[];
  }
).knoten;
const idVon = (kurztext: string): string => {
  const k = typisch.find((x) => x.kurztext === kurztext);
  if (!k) throw new Error(`nicht in typisch: ${kurztext}`);
  return k.id;
};

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Leistungsverzeichnis' });
const zeile = (page: Page, kurztext: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({ has: page.getByText(kurztext, { exact: true }) });
const zelle = (page: Page, kurztext: string, spalte: string): Locator =>
  zeile(page, kurztext).locator(`[data-spalte="${spalte}"]`);
const aktiveZeilen = (page: Page): Promise<(string | null)[]> =>
  page.evaluate(() => window.__harness.aktiveZeilen);
const geoeffnet = (page: Page): Promise<unknown[]> => page.evaluate(() => window.__harness.geoeffnet);

test.describe('aktive Zeile (Punkt 1)', () => {
  test('meldet die erste Zeile beim Laden, jede neue aktive Zeile genau einmal, auch nach Tab ins Grid', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch');
    await expect(grid(page)).toBeVisible();
    const erste = typisch[0]?.id;
    await expect.poll(() => aktiveZeilen(page)).toEqual([erste]);

    // Tab ins Grid: Der Fokus landet auf der gemeldeten Zeile, keine zweite Meldung.
    await page.getByRole('button', { name: 'Davor' }).focus();
    await page.keyboard.press('Tab');
    await expect(grid(page).locator(':focus')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight'); // andere Spalte, gleiche Zeile: keine Meldung
    await zelle(page, 'Bauzaun stellen', 'menge').click();
    await expect.poll(() => aktiveZeilen(page)).toEqual([erste, typisch[1]?.id, idVon('Bauzaun stellen')]);

    // Wieder hinaus und per Umschalt+Tab zurück: dieselbe Zeile, keine Meldung.
    await page.getByRole('button', { name: 'Danach' }).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(zelle(page, 'Bauzaun stellen', 'menge')).toBeFocused();
    expect(await aktiveZeilen(page)).toHaveLength(3);
  });

  test('verschwindet die aktive Zeile (gelöscht), meldet das Grid die Zeile, die an ihre Stelle rückt', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&modus=live');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Control+Delete');
    await page.keyboard.press('Enter');
    await expect(zeile(page, 'Bauzaun stellen')).toHaveCount(0);
    await expect.poll(async () => (await aktiveZeilen(page)).at(-1)).toBe(idVon('Baustrom und Bauwasser'));
  });

  test('im leeren LV meldet das Grid null', async ({ page }) => {
    await page.goto('/?fixture=typisch&leer=1');
    await expect(grid(page)).toBeVisible();
    await expect.poll(() => aktiveZeilen(page)).toEqual([null]);
  });
});

test.describe('Zeile öffnen (Punkt 2)', () => {
  test('Strg+Enter öffnet die Zeile, Doppelklick nur auf eine Zelle ohne Eingabe; sonst wird bearbeitet', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&oeffnen=1');
    const id = idVon('Bauzaun stellen');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Control+Enter');
    expect(await geoeffnet(page)).toEqual([{ knotenId: id, spalte: 'kurztext' }]);
    await expect(grid(page).getByRole('textbox')).toHaveCount(0);
    await expect(zelle(page, 'Bauzaun stellen', 'kurztext')).toBeFocused();

    await zelle(page, 'Bauzaun stellen', 'ordnungszahl').dblclick();
    await zelle(page, 'Bauzaun stellen', 'gesamtpreis').dblclick();
    await zelle(page, 'Baustelleneinrichtung und Vorarbeiten', 'menge').dblclick();
    expect(await geoeffnet(page)).toEqual([
      { knotenId: id, spalte: 'kurztext' },
      { knotenId: id, spalte: 'ordnungszahl' },
      { knotenId: id, spalte: 'gesamtpreis' },
      { knotenId: idVon('Baustelleneinrichtung und Vorarbeiten'), spalte: 'menge' },
    ]);
    await expect(grid(page).getByRole('textbox')).toHaveCount(0);

    // Bearbeitbare Zelle: Doppelklick bearbeitet wie bisher (U3), öffnet nicht.
    await zelle(page, 'Bauzaun stellen', 'menge').dblclick();
    await expect(zelle(page, 'Bauzaun stellen', 'menge').getByRole('textbox')).toBeFocused();
    expect(await geoeffnet(page)).toHaveLength(4);
  });

  test('ohne onZeileOeffnen bleibt alles wie bisher: Strg+Enter bearbeitet, Doppelklick ohne Eingabe meldet', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Control+Enter');
    // Im Bearbeiten steht der Kurztext im Eingabefeld, nicht mehr als Text in der Zeile.
    await expect(grid(page).getByRole('textbox', { name: 'Kurztext' })).toHaveValue('Bauzaun stellen');
    await expect(grid(page).getByRole('textbox', { name: 'Kurztext' })).toBeFocused();
    await page.keyboard.press('Escape');
    await zelle(page, 'Bauzaun stellen', 'ordnungszahl').dblclick();
    await expect(page.locator('.tx-grid__status')).toHaveText('Diese Zelle lässt sich nicht bearbeiten.');
    expect(await geoeffnet(page)).toEqual([]);
  });
});
