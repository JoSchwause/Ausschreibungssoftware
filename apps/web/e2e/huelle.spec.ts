import { expect, test } from '@playwright/test';

test('Navigation wechselt per Tastatur zwischen Projekt, LV und Vergabe', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await expect(nav.getByRole('link', { name: 'Projekt' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'LV' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/lv$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Leistungsverzeichnis' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'LV' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'Vergabe' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vergabe' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Leistungsverzeichnis' })).toBeVisible();
});

test('Unbekannte Adresse zeigt eine deutsche Fehlerseite statt einer leeren Fläche', async ({ page }) => {
  await page.goto('/gibt-es-nicht');
  await expect(page.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' })).toBeVisible();
});

test('Ab 1280 px erscheint kein Breitenhinweis', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Projekt' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Fenster zu schmal' })).toHaveCount(0);
});

test('Unter 1280 px erscheint ein Hinweis und die Hülle bleibt bedienbar', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto('/');
  const hinweis = page.getByRole('status').filter({ hasText: 'Fenster zu schmal' });
  await expect(hinweis).toBeVisible();
  await expect(hinweis).toContainText('1280');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Projekt' })).toBeVisible();
  // Kein waagerechtes Scrollen bei 1100 px.
  const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(ueberlauf).toBe(false);

  // Der Hinweis verschwindet wieder, wenn das Fenster breit genug wird.
  await page.setViewportSize({ width: 1400, height: 800 });
  await expect(hinweis).toHaveCount(0);
});

test('Der Moduswechsel setzt data-theme und bleibt nach dem Neuladen erhalten', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Zum dunklen Modus wechseln' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Zum hellen Modus wechseln' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
