// SPDX-License-Identifier: AGPL-3.0-or-later
// Vergleichsgrid (Ticket 60) auf der Testseite `vergleich.html` mit einem erfundenen Preisspiegel: 3 Bieter, dazu
// Min/Mittel/Max. Die erwarteten Texte stehen als Literale da (Herleitung in `harness/vergleich-daten.ts`):
//   01.0010 (Menge 10): A 10,00 (min), B 10,50, C 16,00 (hoch, max; Mittel 12,17)
//   01.0020 (Menge 23): A 89,19 (max), B nicht angeboten, C 86,51 (min); GP A 2.051,37
//   01.0030 (Menge 36): A 0,00 (Nullpreis), B 176,80 (max), C 163,33 (min)

import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Preisspiegel' });
const zeile = (page: Page, oz: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({ has: page.locator('[data-spalte="oz"] .tx-grid__text', { hasText: new RegExp(`^${oz}$`) }) });
const summenzeile = (page: Page, name: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({
      has: page.locator('[data-spalte="kurztext"] .tx-grid__text', { hasText: new RegExp(`^${name}$`) }),
    });
const zelle = (page: Page, oz: string, spalte: string): Locator =>
  zeile(page, oz).locator(`[data-spalte="${spalte}"]`);
const text = (z: Locator): Locator => z.locator('.tx-grid__text');
const status = (page: Page): Locator => page.getByRole('status');
/** OZ (bzw. bei Summenzeilen der Kurztext) und Spalte der fokussierten Zelle. */
const fokus = (page: Page): Promise<[string, string]> =>
  page.evaluate(() => {
    const el = document.activeElement;
    const z = el?.closest('[role="row"]');
    const oz = z?.querySelector('[data-spalte="oz"] .tx-grid__text')?.textContent ?? '';
    const name = z?.querySelector('[data-spalte="kurztext"] .tx-grid__text')?.textContent ?? '';
    return [oz === '' ? name : oz, el?.getAttribute('data-spalte') ?? ''];
  });

test.describe('Vergleichsgrid: Aufbau', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vergleich.html');
    await expect(grid(page)).toBeVisible();
  });

  test('zweizeiliger Kopf: Bietername über EP und GP, OZ und Kurztext über beide Kopfzeilen', async ({
    page,
  }) => {
    await expect(grid(page)).toHaveAttribute('aria-readonly', 'true');
    // 2 Kopfzeilen + 1 Titel + 11 Positionen + 5 Summenzeilen
    await expect(grid(page)).toHaveAttribute('aria-rowcount', '19');
    await expect(grid(page)).toHaveAttribute('aria-colcount', '16');
    const kopf = grid(page).getByRole('columnheader');
    const bieterA = kopf.filter({ hasText: /^Bieter A$/ });
    await expect(bieterA).toHaveAttribute('aria-colspan', '2');
    await expect(bieterA).toHaveAttribute('aria-colindex', '5');
    await expect(kopf.filter({ hasText: /^Mittel$/ })).toHaveAttribute('aria-colindex', '13');
    await expect(kopf.filter({ hasText: /^OZ$/ })).toHaveAttribute('aria-rowspan', '2');
    const epA = page.locator('[data-spalte-kopf="b1-ep"]');
    await expect(epA).toHaveText('EP');
    // EP steht unter dem Bieternamen
    const [a, ep] = [await bieterA.boundingBox(), await epA.boundingBox()];
    expect(ep?.y).toBeGreaterThan(a?.y ?? Infinity);
    expect(Math.abs((ep?.x ?? 0) - (a?.x ?? 0))).toBeLessThan(1);
  });

  test('Zellen zeigen die fertigen Texte; Gliederung und Positionen als Baum', async ({ page }) => {
    await expect(text(zelle(page, '01.0010', 'b1-ep'))).toHaveText('10,00');
    await expect(text(zelle(page, '01.0010', 'b1-gp'))).toHaveText('100,00');
    await expect(text(zelle(page, '01.0020', 'b1-gp'))).toHaveText('2.051,37');
    await expect(text(zelle(page, '01.0010', 'mittel-ep'))).toHaveText('12,17');
    await expect(zeile(page, '01')).toHaveAttribute('aria-level', '1');
    await expect(zeile(page, '01')).toHaveAttribute('aria-expanded', 'true');
    await expect(zeile(page, '01.0010')).toHaveAttribute('aria-level', '2');
  });

  test('Kennzeichen: Symbol in der Zelle und Beschreibung in Worten, nicht nur Farbe', async ({ page }) => {
    const hoch = zelle(page, '01.0010', 'b3-ep');
    await expect(text(hoch)).toHaveText('16,00');
    await expect(hoch.locator('[data-kennzeichen]')).toHaveText(['▲', 'max']);
    await expect(hoch).toHaveAccessibleDescription('Ausreißer nach oben. höchster Preis. Mittel 12,17');
    await expect(hoch).toHaveAttribute('title', 'Ausreißer nach oben. höchster Preis. Mittel 12,17');

    const nicht = zelle(page, '01.0020', 'b2-ep');
    await expect(text(nicht)).toHaveText('nicht angeboten');
    await expect(nicht).toHaveAccessibleDescription('nicht angeboten');

    const null0 = zelle(page, '01.0030', 'b1-ep');
    await expect(text(null0)).toHaveText('0,00');
    await expect(null0.locator('[data-kennzeichen]')).toHaveText(['0']);
    await expect(null0).toHaveAccessibleDescription('Nullpreis');

    await expect(zelle(page, '01.0010', 'b1-ep')).toHaveAccessibleDescription('niedrigster Preis');
    await expect(zelle(page, '01.0010', 'b2-ep')).not.toHaveAttribute('aria-describedby');
    // Die Farbe kommt aus den Tokens: Die Marke „hoch“ hat eine andere Farbe als „min“
    const farbe = (l: Locator): Promise<string> => l.evaluate((el) => getComputedStyle(el).color);
    expect(await farbe(hoch.locator('[data-kennzeichen="hoch"]'))).not.toBe(
      await farbe(zelle(page, '01.0010', 'b1-ep').locator('[data-kennzeichen="min"]')),
    );
  });

  test('Summenzeilen am Ende in Reihenfolge, Werte in den Spalten der Bieter', async ({ page }) => {
    const fuss = grid(page).locator('.tx-grid__fuss [role="row"]');
    await expect(fuss.locator('[data-spalte="kurztext"] .tx-grid__text')).toHaveText([
      'Netto',
      'Nachlass',
      'Netto nach Nachlass',
      'Brutto',
      'Rang',
    ]);
    await expect(text(summenzeile(page, 'Nachlass').locator('[data-spalte="b1-gp"]'))).toHaveText('0,00');
    const raenge = await summenzeile(page, 'Rang')
      .locator('[data-spalte$="-gp"] .tx-grid__text')
      .allTextContents();
    expect(raenge.filter((r) => r !== '').sort()).toEqual(['1', '2', '3']);
    await expect(summenzeile(page, 'Rang')).toHaveAttribute('aria-rowindex', '19');
  });
});

test.describe('Vergleichsgrid: Tastatur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vergleich.html');
    await expect(grid(page)).toBeVisible();
  });

  test('Tab ins Grid, Pfeile, Pos1/Ende, Strg+Pos1/Ende, Strg+Pfeil, Tab verlässt am Ende', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Davor' }).focus();
    await page.keyboard.press('Tab');
    expect(await fokus(page)).toEqual(['01', 'oz']);
    await page.keyboard.press('ArrowDown');
    expect(await fokus(page)).toEqual(['01.0010', 'oz']);
    await page.keyboard.press('ArrowRight');
    expect(await fokus(page)).toEqual(['01.0010', 'kurztext']);
    await page.keyboard.press('End');
    expect(await fokus(page)).toEqual(['01.0010', 'max-gp']);
    await page.keyboard.press('Home');
    expect(await fokus(page)).toEqual(['01.0010', 'oz']);
    await page.keyboard.press('Control+ArrowRight');
    expect(await fokus(page)).toEqual(['01.0010', 'max-gp']);
    await page.keyboard.press('Control+ArrowDown');
    expect(await fokus(page)).toEqual(['Rang', 'max-gp']);
    await page.keyboard.press('Control+Home');
    expect(await fokus(page)).toEqual(['01', 'oz']);
    await page.keyboard.press('Control+End');
    expect(await fokus(page)).toEqual(['Rang', 'max-gp']);
    await page.keyboard.press('ArrowUp');
    expect(await fokus(page)).toEqual(['Brutto', 'max-gp']);
    await page.keyboard.press('Tab');
    expect(await fokus(page)).toEqual(['Rang', 'oz']);
    await page.keyboard.press('Shift+Tab');
    expect(await fokus(page)).toEqual(['Brutto', 'max-gp']);
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Danach' })).toBeFocused();
  });

  test('Bild ab/auf bewegt eine Seite; die Zelle bleibt sichtbar', async ({ page }) => {
    await page.goto('/vergleich.html?zeilen=500');
    await zelle(page, '01', 'oz').click();
    await page.keyboard.press('PageDown');
    const [oz] = await fokus(page);
    expect(oz).toMatch(/^01\.0\d{3}$/);
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageDown');
    await expect(page.locator(':focus')).toBeInViewport();
    await page.keyboard.press('PageUp');
    await page.keyboard.press('PageUp');
    await page.keyboard.press('PageUp');
    expect(await fokus(page)).toEqual(['01', 'oz']);
  });

  test('Pfeil links/rechts in der Baumspalte klappt zu und auf; Alt+Pfeil überall', async ({ page }) => {
    await zelle(page, '01', 'kurztext').click();
    await page.keyboard.press('ArrowLeft');
    await expect(zeile(page, '01')).toHaveAttribute('aria-expanded', 'false');
    await expect(zeile(page, '01.0010')).toHaveCount(0);
    await expect(grid(page)).toHaveAttribute('aria-rowcount', '8');
    await page.keyboard.press('ArrowRight');
    await expect(zeile(page, '01')).toHaveAttribute('aria-expanded', 'true');
    await zelle(page, '01', 'b2-gp').click();
    await page.keyboard.press('Alt+ArrowLeft');
    await expect(zeile(page, '01')).toHaveAttribute('aria-expanded', 'false');
    // Klick auf den Knopf klappt wieder auf
    await zeile(page, '01').getByRole('button', { name: 'Aufklappen' }).click();
    await expect(zeile(page, '01.0010')).toBeVisible();
  });

  test('aktive Zeile und Zelle werden gemeldet; Sprungziel fokussiert die Zelle', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => window.__vergleich.aktiveZeilen)).toEqual(['t01']);
    await zelle(page, '01.0020', 'b2-ep').click();
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => window.__vergleich.aktiveZeilen)).toEqual(['t01', 'p1']);
    expect(await page.evaluate(() => window.__vergleich.aktiveZellen)).toEqual([
      { zeilenId: 't01', spalte: 'oz' },
      { zeilenId: 'p1', spalte: 'b2-ep' },
      { zeilenId: 'p1', spalte: 'b2-gp' },
    ]);
    await page.evaluate(() => {
      window.__vergleich.springe('p8', 'b3-gp');
    });
    await expect.poll(() => fokus(page)).toEqual(['01.0090', 'b3-gp']);
  });

  test('nur lesen: Tippen, F2 und Entf ändern nichts und werden angesagt', async ({ page }) => {
    await zelle(page, '01.0010', 'b1-ep').click();
    await page.keyboard.press('5');
    await expect(status(page)).toHaveText('Schreibgeschützt: Hier lässt sich nichts ändern.');
    await page.keyboard.press('F2');
    await expect(grid(page).locator('input')).toHaveCount(0);
    await expect(text(zelle(page, '01.0010', 'b1-ep'))).toHaveText('10,00');
  });
});

test.describe('Vergleichsgrid: Zellauswahl und Kopieren', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/vergleich.html');
    await expect(grid(page)).toBeVisible();
  });

  test('Umschalt+Pfeil zieht ein Rechteck auf, Strg+C kopiert seine Texte als TSV', async ({ page }) => {
    await zelle(page, '01.0010', 'b1-ep').click();
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    await expect(grid(page).locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(4);
    await page.keyboard.press('Control+c');
    await expect(status(page)).toHaveText('2 × 2 Zellen kopiert.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      '10,00\t100,00\r\n89,19\t2.051,37\r\n',
    );
    // Escape hebt die Auswahl auf; Strg+C kopiert dann die aktive Zelle
    await page.keyboard.press('Escape');
    await expect(grid(page).locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(0);
    await page.keyboard.press('Control+c');
    await expect(status(page)).toHaveText('1 Zelle kopiert.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('2.051,37\r\n');
  });

  test('Umschalt+Klick wählt bis zur Zelle; Kennzeichen kommen nicht mit, nur der Text', async ({ page }) => {
    await zelle(page, '01.0010', 'b3-ep').click();
    await zelle(page, '01.0030', 'b3-ep').click({ modifiers: ['Shift'] });
    await page.keyboard.press('Control+c');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('16,00\r\n86,51\r\n163,33\r\n');
  });

  test('Strg+A wählt alles; die Summenzeilen gehören dazu', async ({ page }) => {
    await zelle(page, '01.0010', 'oz').click();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+c');
    await expect(status(page)).toHaveText('17 × 16 Zellen kopiert.');
    const zeilen = (await page.evaluate(() => navigator.clipboard.readText())).split('\r\n');
    expect(zeilen[0]).toBe('01\tTitel 01' + '\t'.repeat(14));
    expect(zeilen[16]?.split('\t')[1]).toBe('Rang');
  });
});

test.describe('Vergleichsgrid: fixierte Spalten und große Datenmenge', () => {
  test('OZ und Kurztext bleiben beim waagerechten Scrollen stehen, die übrigen Spalten wandern', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/vergleich.html?bieter=5');
    await expect(grid(page)).toBeVisible();
    const x = async (l: Locator): Promise<number> => (await l.boundingBox())?.x ?? NaN;
    const oz = zelle(page, '01.0010', 'oz');
    const kurz = zelle(page, '01.0010', 'kurztext');
    const menge = zelle(page, '01.0010', 'menge');
    const kopfOz = grid(page).getByRole('columnheader').filter({ hasText: /^OZ$/ });
    const vorher = { oz: await x(oz), kurz: await x(kurz), menge: await x(menge), kopf: await x(kopfOz) };
    await grid(page).evaluate((el) => {
      el.scrollLeft = 400;
    });
    await expect.poll(() => x(menge)).toBeLessThan(vorher.menge - 300);
    expect(await x(oz)).toBeCloseTo(vorher.oz, 0);
    expect(await x(kurz)).toBeCloseTo(vorher.kurz, 0);
    expect(await x(kopfOz)).toBeCloseTo(vorher.kopf, 0);
    // die fixierte Spalte verdeckt die darunter wandernde: oben liegt die OZ-Zelle
    const box = await oz.boundingBox();
    const oben = await page.evaluate(
      ([px, py]) =>
        document
          .elementFromPoint(px ?? 0, py ?? 0)
          ?.closest('[data-spalte]')
          ?.getAttribute('data-spalte'),
      [(box?.x ?? 0) + 10, (box?.y ?? 0) + 10],
    );
    expect(oben).toBe('oz');
    // Fokus auf eine Zelle hinter den fixierten Spalten holt sie in den Sichtbereich
    await kurz.click();
    await page.keyboard.press('Control+ArrowRight');
    await expect(page.locator(':focus')).toBeInViewport();
  });

  test('5.000 Zeilen: virtualisiert, die Summenzeilen bleiben am unteren Rand sichtbar', async ({ page }) => {
    await page.goto('/vergleich.html?zeilen=5000&bieter=5');
    await expect(grid(page)).toBeVisible();
    await expect(grid(page)).toHaveAttribute('aria-rowcount', String(2 + 5000 + 5));
    expect(await grid(page).locator('.tx-grid__koerper [role="row"]').count()).toBeLessThan(80);
    await expect(summenzeile(page, 'Brutto')).toBeInViewport();
    await grid(page).evaluate((el) => {
      el.scrollTop = 60_000;
    });
    await expect(summenzeile(page, 'Rang')).toBeInViewport();
    // Die aktive Zeile (ohne Klick die erste) bleibt im DOM, auch weit weg gescrollt: Fokus und Strg+Ende von dort
    await zelle(page, '01', 'oz').focus();
    await page.keyboard.press('Control+End');
    expect(await fokus(page)).toEqual(['Rang', 'max-gp']);
    await page.keyboard.press('Control+Home');
    expect(await fokus(page)).toEqual(['01', 'oz']);
  });
});
