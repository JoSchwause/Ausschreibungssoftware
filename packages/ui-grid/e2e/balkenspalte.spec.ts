// SPDX-License-Identifier: AGPL-3.0-or-later
// Balkenspalte im Vergleichsgrid (Ticket 96) auf der Testseite `bauzeit.html` mit einem erfundenen Bauzeitenplan.
// Achse: 120 Tage ab Fr 01.01.2027 (Tag 0) zu 16 px, bis 30.04.2027. Die erwarteten Lagen stehen als Literale da
// (Tag × 16; Herleitung der Zeilen in `harness/bauzeit-daten.ts`):
//   1.2 Erdarbeiten   Tag 10–22 (11.01.–22.01.), kritisch, 40 %  → links 160, breit 192
//   1    Rohbau        Tag 3–59, Sammelvorgang                   → links 48, breit 896
//   1.4 Rohbau fertig Tag 59, Meilenstein, kritisch             → Mitte bei 944
//   0.1 Planung       Tag −20–6, vorn abgeschnitten              → links 0, breit 96
//   2.3 Fliesen       Tag 108–130, hinten abgeschnitten          → links 1728, breit 192
//   2.4 Abnahme       Tag 140, Meilenstein ganz hinter der Achse

import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Bauzeitenplan' });
const zeile = (page: Page, nr: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({
      has: page.locator('[data-spalte="nr"] .tx-grid__text', {
        hasText: new RegExp(`^${nr.replaceAll('.', '\\.')}$`),
      }),
    });
const balkenzelle = (page: Page, nr: string): Locator => zeile(page, nr).locator('[data-spalte="balken"]');
const achsenkopf = (page: Page): Locator => grid(page).getByRole('columnheader', { name: 'Zeitplan' });

async function box(l: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await l.boundingBox();
  if (!b) throw new Error('kein Rahmen');
  return b;
}

test.describe('Balkenspalte: Kopf und Lage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bauzeit.html');
    await expect(grid(page)).toBeVisible();
  });

  test('zweizeiliger Kopf: Monate oben, Kalenderwochen unten, an der Lage ihrer Tage', async ({ page }) => {
    const kopf = achsenkopf(page);
    const oben = kopf.locator('[data-zeitabschnitt="kopf"]');
    const unten = kopf.locator('[data-zeitabschnitt="unterkopf"]');
    await expect(oben).toHaveText(['Januar 2027', 'Februar 2027', 'März 2027', 'April 2027']);
    // KW 53 (ab Mo 28.12.2026, auf Fr–So geschnitten) und KW 1 bis KW 17
    await expect(unten).toHaveCount(18);
    await expect(unten.first()).toHaveText('KW 53');
    await expect(unten.nth(1)).toHaveText('KW 1');
    const k = await box(kopf);
    const februar = await box(oben.nth(1));
    expect(februar.x - k.x).toBeCloseTo(31 * 16, 0);
    expect(februar.width).toBeCloseTo(28 * 16, 0);
    const kw53 = await box(unten.first());
    expect(kw53.x - k.x).toBeCloseTo(0, 0);
    expect(kw53.width).toBeCloseTo(3 * 16, 0);
    const kw1 = await box(unten.nth(1));
    expect(kw1.x - k.x).toBeCloseTo(48, 0);
    expect(kw1.width).toBeCloseTo(7 * 16, 0);
    expect(kw1.y).toBeGreaterThan(februar.y);
    // Die Achse reicht über beide Kopfzeilen, wie die Spalten ohne Gruppe; die Gruppe „Termine“ steht über Anfang/Ende.
    const nr = await box(grid(page).getByRole('columnheader', { name: 'Nr.' }));
    expect(k.height).toBeCloseTo(56, 0);
    expect(nr.height).toBeCloseTo(56, 0);
    const termine = await box(grid(page).getByRole('columnheader', { name: 'Termine' }));
    const anfang = await box(grid(page).getByRole('columnheader', { name: 'Anfang' }));
    expect(anfang.y).toBeGreaterThan(termine.y);
    expect(k.y).toBeCloseTo(termine.y, 0);
  });

  test('ohne untere Kopfzeile füllen die Monate die volle Höhe; ohne Gruppen bleibt der Kopf zweizeilig', async ({
    page,
  }) => {
    await page.goto('/bauzeit.html?unterkopf=0&gruppen=0');
    const kopf = achsenkopf(page);
    await expect(kopf.locator('[data-zeitabschnitt="unterkopf"]')).toHaveCount(0);
    const januar = await box(kopf.locator('[data-zeitabschnitt="kopf"]').first());
    const k = await box(kopf);
    expect(k.height).toBeCloseTo(56, 0);
    expect(januar.height).toBeGreaterThan(50);
    // Die übrigen Kopfzellen reichen über die volle Höhe; für den Screenreader ist es eine Kopfzeile.
    expect((await box(grid(page).getByRole('columnheader', { name: 'Anfang' }))).height).toBeCloseTo(56, 0);
    await expect(grid(page)).toHaveAttribute('aria-rowcount', String(1 + 12));
    await expect(zeile(page, '0')).toHaveAttribute('aria-rowindex', '2');
  });

  test('Balken an der Lage und in der Breite ihrer Tage, bündig mit dem Kopf', async ({ page }) => {
    const zelle = balkenzelle(page, '1.2');
    const z = await box(zelle);
    const erdarbeiten = await box(zelle.locator('[data-balken="vorgang"]'));
    expect(erdarbeiten.x - z.x).toBeCloseTo(160, 0);
    expect(erdarbeiten.width).toBeCloseTo(192, 0);
    // beginnt mit KW 2 (Mo 11.01.2027)
    const kw2 = await box(achsenkopf(page).locator('[data-zeitabschnitt="unterkopf"]').nth(2));
    expect(erdarbeiten.x).toBeCloseTo(kw2.x, 0);

    const rohbau = await box(balkenzelle(page, '1').locator('[data-balken="sammelvorgang"]'));
    expect(rohbau.x - z.x).toBeCloseTo(48, 0);
    expect(rohbau.width).toBeCloseTo(896, 0);

    const fertig = await box(balkenzelle(page, '1.4').locator('[data-balken="meilenstein"]'));
    expect(fertig.x + fertig.width / 2 - z.x).toBeCloseTo(944, 0);
    // eine Raute: so hoch wie breit
    expect(fertig.height).toBeCloseTo(fertig.width, 0);
  });
});
