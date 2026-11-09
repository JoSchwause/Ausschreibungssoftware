import { expect, test } from '@playwright/test';

test('Startseite ist leer und das PWA-Manifest ist erreichbar', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Tethys AVA');
  await expect(page.getByRole('heading', { name: 'Tethys AVA' })).toBeVisible();

  const antwort = await request.get('/manifest.webmanifest');
  expect(antwort.ok()).toBe(true);
  const manifest = (await antwort.json()) as { name: string; display: string };
  expect(manifest.name).toBe('Tethys AVA');
  expect(manifest.display).toBe('standalone');
});
