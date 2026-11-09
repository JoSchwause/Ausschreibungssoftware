// SPDX-License-Identifier: AGPL-3.0-or-later
// Bildschirmfotos zum Ansehen (kein Vergleichstest). Sie entstehen nur, wenn GRID_SCREENSHOT_DIR gesetzt ist,
// und liegen dann außerhalb des Repos.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const verzeichnis = process.env['GRID_SCREENSHOT_DIR'];
test.skip(!verzeichnis, 'GRID_SCREENSHOT_DIR nicht gesetzt');

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Leistungsverzeichnis' });

function pfad(name: string): string {
  if (!verzeichnis) throw new Error('GRID_SCREENSHOT_DIR fehlt');
  mkdirSync(verzeichnis, { recursive: true });
  return join(verzeichnis, name);
}

test('typisch hell und dunkel', async ({ page }) => {
  for (const thema of ['light', 'dark'] as const) {
    await page.goto(`/?fixture=typisch&thema=${thema}&befunde=1`);
    await expect(grid(page)).toBeVisible();
    await grid(page).locator('[data-i="3"] [data-spalte="kurztext"]').click();
    await page.screenshot({ path: pfad(`typisch-${thema}.png`) });
  }
});

test('Zelle im Bearbeitungsmodus und Zelle mit abgelehnter Eingabe', async ({ page }) => {
  await page.goto('/?fixture=typisch&thema=light&befunde=1');
  const zeile = grid(page).locator('[data-i="4"]');
  await zeile.locator('[data-spalte="menge"]').click();
  await page.keyboard.press('F2');
  await page.screenshot({ path: pfad('typisch-bearbeiten.png') });

  await page.keyboard.press('Control+A');
  await page.keyboard.type('1.2x');
  await page.screenshot({ path: pfad('typisch-bearbeiten-hinweis.png') });
  await page.keyboard.press('Enter');
  await page.screenshot({ path: pfad('typisch-abgelehnt.png') });
});

test('zugeklappter Baum und Auswahl', async ({ page }) => {
  await page.goto('/?fixture=typisch&thema=dark&auf=keine');
  await expect(grid(page)).toBeVisible();
  await page.screenshot({ path: pfad('typisch-zu-dunkel.png') });
});
