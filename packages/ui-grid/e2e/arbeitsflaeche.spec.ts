// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 130: die Arbeitsfläche des LV-Grids. OZ und Zahlen werden nie abgeschnitten (Breite aus Maske bzw. längstem
// Wert), Spaltenbreiten lassen sich per Maus (Ziehgriff im Kopf) und Tastatur (Alt+Umschalt+Pfeil) ändern und werden je
// Grid unter dem Schlüssel des Aufrufers gemerkt, und das Grid füllt die restliche Höhe, ohne den Summenfuß zu verlieren.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Leistungsverzeichnis' });
const zeile = (page: Page, kurztext: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({ has: page.getByText(kurztext, { exact: true }) });
const zelle = (page: Page, kurztext: string, spalte: string): Locator =>
  zeile(page, kurztext).locator(`[data-spalte="${spalte}"]`);
const kopf = (page: Page, spalte: string): Locator => grid(page).locator(`.tx-grid__kopfzelle--${spalte}`);
const griff = (page: Page, spalte: string): Locator => grid(page).locator(`[data-ziehgriff="${spalte}"]`);
const status = (page: Page): Locator => page.locator('.tx-grid__status');
const breite = async (l: Locator): Promise<number> => (await l.boundingBox())?.width ?? NaN;

/** Ob der Text einer Zelle ganz sichtbar ist: nicht breiter als sein Platz und nicht durch die Zelle beschnitten. */
async function ganzSichtbar(z: Locator): Promise<boolean> {
  return z.evaluate((el) => {
    const text = el.querySelector<HTMLElement>('.tx-grid__text');
    if (!text) return false;
    const t = text.getBoundingClientRect();
    const c = el.getBoundingClientRect();
    return text.scrollWidth <= text.clientWidth && t.left >= c.left && t.right <= c.right;
  });
}

async function ziehe(page: Page, spalte: string, dx: number): Promise<void> {
  const box = await griff(page, spalte).boundingBox();
  if (!box) throw new Error(`kein Ziehgriff für ${spalte}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y, { steps: 3 });
  await page.mouse.move(x + dx, y, { steps: 3 });
  await page.mouse.up();
}

test.describe('Inhalt bestimmt die Mindestbreite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?fixture=typisch&breit=1');
    await expect(grid(page)).toBeVisible();
  });

  test('lange OZ samt Index sind ganz sichtbar und unterscheidbar', async ({ page }) => {
    const a = zelle(page, 'Baustelle einrichten', 'ordnungszahl');
    const b = zelle(page, 'Bauzaun stellen', 'ordnungszahl');
    await expect(a).toHaveText('001.001.00101');
    await expect(b).toHaveText('001.001.0010A');
    expect(await ganzSichtbar(a)).toBe(true);
    expect(await ganzSichtbar(b)).toBe(true);
    // Der Kopf zeigt die Abkürzung, der zugängliche Name bleibt der volle Titel.
    await expect(grid(page).getByRole('columnheader', { name: 'Ordnungszahl' })).toHaveText('OZ');
  });

  test('eine achtstellige Menge ist ganz sichtbar, auch nach dem Verschmälern per Tastatur', async ({
    page,
  }) => {
    const menge = zelle(page, 'Baustrom und Bauwasser', 'menge');
    await expect(menge).toHaveText('12.345.678,012');
    expect(await ganzSichtbar(menge)).toBe(true);
    await menge.click();
    for (let i = 0; i < 12; i++) await page.keyboard.press('Alt+Shift+ArrowLeft');
    await expect(status(page)).toContainText('Spalte Menge:');
    expect(await ganzSichtbar(menge)).toBe(true);
  });

  test('ein Kurztext wird in einer schmalen Spalte mit Ellipse gekürzt', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 800 });
    await ziehe(page, 'kurztext', -400);
    const text = zelle(page, 'Verkehrssicherung Zufahrt', 'kurztext').locator('.tx-grid__text');
    expect(await text.evaluate((el) => getComputedStyle(el).textOverflow)).toBe('ellipsis');
    expect(await text.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });
});

test('die OZ-Maske bestimmt die Breite der OZ-Spalte, auch ohne so lange OZ in den Zeilen', async ({
  page,
}) => {
  await page.goto('/?fixture=typisch');
  await expect(grid(page)).toBeVisible();
  const ohneMaske = await breite(kopf(page, 'ordnungszahl'));
  await page.goto('/?fixture=typisch&maske=1');
  await expect(grid(page)).toBeVisible();
  const mitMaske = await breite(kopf(page, 'ordnungszahl'));
  expect(mitMaske).toBeGreaterThan(ohneMaske + 20);
});

test.describe('Spaltenbreite ändern', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?fixture=typisch');
    await expect(grid(page)).toBeVisible();
  });

  test('per Maus am Ziehgriff im Kopf; Doppelklick setzt zurück', async ({ page }) => {
    const vorher = await breite(kopf(page, 'einheit'));
    await ziehe(page, 'einheit', 60);
    await expect.poll(() => breite(kopf(page, 'einheit'))).toBeCloseTo(vorher + 60, 0);
    // Kopf und Zellen bleiben bündig.
    expect(await breite(zelle(page, 'Bauzaun stellen', 'einheit'))).toBeCloseTo(vorher + 60, 0);
    // Das Ziehen wählt keine Zeile und ändert die aktive Zelle nicht.
    await expect(grid(page).locator('[aria-selected="true"]')).toHaveCount(0);
    await griff(page, 'einheit').dblclick();
    await expect.poll(() => breite(kopf(page, 'einheit'))).toBeCloseTo(vorher, 0);
  });

  test('per Tastatur: Alt+Umschalt+Pfeil auf einer Zelle der Spalte, Alt+Umschalt+Pos1 zurück', async ({
    page,
  }) => {
    const vorher = await breite(kopf(page, 'einheitspreis'));
    await zelle(page, 'Bauzaun stellen', 'einheitspreis').click();
    await page.keyboard.press('Alt+Shift+ArrowRight');
    await page.keyboard.press('Alt+Shift+ArrowRight');
    await expect.poll(() => breite(kopf(page, 'einheitspreis'))).toBeCloseTo(vorher + 32, 0);
    await expect(status(page)).toHaveText(
      `Spalte Einheitspreis: ${String(Math.round(vorher + 32))} Pixel breit.`,
    );
    // Der Fokus bleibt in der Zelle; nichts wurde geklappt oder bearbeitet.
    await expect(zelle(page, 'Bauzaun stellen', 'einheitspreis')).toBeFocused();
    await expect(page.locator('[data-editor]')).toHaveCount(0);
    await page.keyboard.press('Alt+Shift+Home');
    await expect.poll(() => breite(kopf(page, 'einheitspreis'))).toBeCloseTo(vorher, 0);
    await expect(status(page)).toHaveText('Spalte Einheitspreis: Standardbreite.');
  });

  test('Alt+Pfeil links klappt weiter zu (ohne Umschalt keine Breitenänderung)', async ({ page }) => {
    const titel = zeile(page, 'Baustelleneinrichtung und Vorarbeiten');
    await expect(titel).toHaveAttribute('aria-expanded', 'true');
    const vorher = await breite(kopf(page, 'kurztext'));
    await titel.locator('[data-spalte="einheit"]').click();
    await page.keyboard.press('Alt+ArrowLeft');
    await expect(titel).toHaveAttribute('aria-expanded', 'false');
    expect(await breite(kopf(page, 'kurztext'))).toBeCloseTo(vorher, 0);
  });
});

test.describe('Breiten gemerkt je Grid', () => {
  test('bleiben unter demselben Schlüssel nach dem Neuladen, unter einem anderen nicht', async ({ page }) => {
    await page.goto('/?fixture=typisch&merken=lv-test');
    await expect(grid(page)).toBeVisible();
    const vorher = await breite(kopf(page, 'einheit'));
    await ziehe(page, 'einheit', 50);
    await expect.poll(() => breite(kopf(page, 'einheit'))).toBeCloseTo(vorher + 50, 0);
    await page.reload();
    await expect(grid(page)).toBeVisible();
    expect(await breite(kopf(page, 'einheit'))).toBeCloseTo(vorher + 50, 0);
    await page.goto('/?fixture=typisch&merken=anderes-grid');
    await expect(grid(page)).toBeVisible();
    expect(await breite(kopf(page, 'einheit'))).toBeCloseTo(vorher, 0);
    // Ohne Schlüssel merkt das Grid nichts.
    await page.goto('/?fixture=typisch');
    await expect(grid(page)).toBeVisible();
    expect(await breite(kopf(page, 'einheit'))).toBeCloseTo(vorher, 0);
  });

  test('ein gesperrter Speicher stört nicht: Die Breite gilt bis zum Neuladen', async ({ page }) => {
    await page.addInitScript(() => {
      const fehler = (): never => {
        throw new DOMException('gesperrt', 'SecurityError');
      };
      Object.defineProperty(window, 'localStorage', { get: fehler });
    });
    await page.goto('/?fixture=typisch&merken=lv-test');
    await expect(grid(page)).toBeVisible();
    const vorher = await breite(kopf(page, 'einheit'));
    await zelle(page, 'Bauzaun stellen', 'einheit').click();
    await page.keyboard.press('Alt+Shift+ArrowRight');
    await expect.poll(() => breite(kopf(page, 'einheit'))).toBeCloseTo(vorher + 16, 0);
    await page.reload();
    await expect(grid(page)).toBeVisible();
    expect(await breite(kopf(page, 'einheit'))).toBeCloseTo(vorher, 0);
  });
});

test.describe('Höhe', () => {
  for (const huelle of ['mit Hülle', 'ohne Hülle'] as const) {
    test(`füllt die restliche Höhe, der Summenfuß bleibt sichtbar (${huelle})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/?fixture=gross${huelle === 'ohne Hülle' ? '&ohnehuelle=1' : ''}`);
      await expect(grid(page)).toBeVisible();
      const wurzel = page.locator('.tx-grid');
      const danach = page.getByRole('button', { name: 'Danach' });
      const [w, d] = [await wurzel.boundingBox(), await danach.boundingBox()];
      if (!w || !d) throw new Error('keine Box');
      // Das Grid reicht bis an den Knopf darunter (Abstand der Seite: `--tx-space-3`, 8 px), nicht weiter.
      expect(d.y - (w.y + w.height)).toBeCloseTo(8, 0);
      expect(d.y + d.height).toBeLessThanOrEqual(800);
      const summen = await page.getByRole('group', { name: 'Summen' }).boundingBox();
      expect(summen && summen.y + summen.height).toBeLessThanOrEqual(w.y + w.height);
      // Mindestens 15 Zeilen stehen im Sichtbereich.
      const sicht = await grid(page).evaluate((el) => el.clientHeight);
      expect(Math.floor((sicht - 28) / 28)).toBeGreaterThanOrEqual(15);

      // Bei wenig Höhe schrumpft nur der Scrollbereich; Summen und Knopf bleiben im Fenster.
      await page.setViewportSize({ width: 1280, height: 420 });
      const klein = await page.getByRole('group', { name: 'Summen' }).boundingBox();
      expect(klein && klein.y + klein.height).toBeLessThanOrEqual(420);
      await expect(page.getByRole('group', { name: 'Summen' })).toBeInViewport({ ratio: 1 });
    });
  }
});
