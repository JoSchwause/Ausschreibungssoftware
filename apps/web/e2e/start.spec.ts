import { expect, test } from '@playwright/test';

test('Startseite zeigt die Hülle mit leerem Projekt und das PWA-Manifest ist erreichbar', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Projekte – Tethys AVA');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Projekt' })).toBeVisible();
  await expect(page.getByText('Noch keine Projekte.')).toBeVisible();

  const antwort = await request.get('/manifest.webmanifest');
  expect(antwort.ok()).toBe(true);
  const manifest = (await antwort.json()) as { name: string; display: string };
  expect(manifest.name).toBe('Tethys AVA');
  expect(manifest.display).toBe('standalone');
});
