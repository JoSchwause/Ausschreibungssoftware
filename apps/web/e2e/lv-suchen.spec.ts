// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 156: Suchen, Filtern und Kontextmenü im LV-Grid der App. Die Suche sieht auch zugeklappte Gliederungen und klappt
// sie für den Treffer auf; „Suchen und filtern“ steht auch in der Werkzeugleiste; das Kontextmenü führt zur Übersicht der
// Tastenkürzel auf der Hilfeseite, die aus derselben Tabelle wie die Tasten des Grids entsteht.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureAlsX83 } from './fixture-inhalt';
import { gaebEinlesen, projektAnlegen } from './hilfen';
import { werkzeug } from './werkzeuge';

const TYPISCH = 'Typisch: Musterhaus (erfunden)';
const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Positionen' });
const zeile = (page: Page, kurztext: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({ has: page.getByText(kurztext, { exact: true }) });
const zelle = (page: Page, kurztext: string, spalte: string): Locator =>
  zeile(page, kurztext).locator(`[data-spalte="${spalte}"]`);
const leiste = (page: Page): Locator => page.getByRole('search', { name: 'Suchen und filtern' });
const suchfeld = (page: Page): Locator =>
  page.getByRole('searchbox', { name: 'Suchen in Ordnungszahl, Kurztext und Langtext' });

test.beforeEach(async ({ page }) => {
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  await gaebEinlesen(page, fixtureAlsX83('typisch'), TYPISCH);
  await expect(grid(page)).toBeVisible();
});

test('Suchen aus der Werkzeugleiste findet unter einer zugeklappten Gliederung', async ({ page }) => {
  await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').click();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(zeile(page, 'Erd- und Betonarbeiten')).toHaveAttribute('aria-expanded', 'false');
  await expect(zeile(page, 'Fundamente betonieren')).toHaveCount(0);

  await werkzeug(page, 'Bearbeiten', /^Suchen und filtern/);
  await expect(suchfeld(page)).toBeFocused();
  await page.keyboard.type('frost');
  await expect(zelle(page, 'Zuschlag Frosteinbau', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);
  await expect(zeile(page, 'Erd- und Betonarbeiten')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.tx-grid__status')).toHaveText('Treffer 1 von 1 im Kurztext.');
  await page.keyboard.press('Escape');
  await expect(zelle(page, 'Zuschlag Frosteinbau', 'kurztext')).toBeFocused();
});

test('Filter nach Merkmal mit Strg+F, sichtbar über dem Grid, ein Klick hebt ihn auf', async ({ page }) => {
  const alle = await grid(page).locator('.tx-grid__koerper [role="row"]').count();
  await zelle(page, 'Baustelle einrichten', 'kurztext').click();
  await page.keyboard.press('Control+f');
  await leiste(page).getByLabel('Merkmal').selectOption({ label: 'Wahl' });
  // Der Titel, die Grundposition (Variante 0) und die Alternative.
  await expect(grid(page).locator('.tx-grid__koerper [role="row"]')).toHaveCount(3);
  await expect(zeile(page, 'Bodenplatte herstellen')).toBeVisible();
  await expect(zeile(page, 'Bodenplatte wasserundurchlässig')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(leiste(page)).toContainText('Gefiltert: Wahl');
  await leiste(page).getByRole('button', { name: 'Filter aufheben' }).click();
  await expect(grid(page).locator('.tx-grid__koerper [role="row"]')).toHaveCount(alle);
});

test('Kontextmenü: Umschalt+F10 an einer Zelle, „Tastenkürzel anzeigen“ öffnet die Übersicht der Hilfe', async ({
  page,
}) => {
  await zelle(page, 'Bauzaun stellen', 'menge').click({ button: 'right' });
  const menue = page.getByRole('menu', { name: 'Aktionen der Zelle' });
  await expect(menue.getByRole('menuitem', { name: /^Zelle bearbeiten/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(zelle(page, 'Bauzaun stellen', 'menge')).toBeFocused();

  await page.keyboard.press('Shift+F10');
  await menue.getByRole('menuitem', { name: 'Tastenkürzel anzeigen' }).click();
  await expect(page).toHaveURL(/hilfe#tastenkuerzel$/);
  const tabelle = page.getByRole('table', { name: 'Tastenkürzel: Navigation' });
  await expect(tabelle).toContainText('Strg+F');
  await expect(page.getByRole('table', { name: 'Tastenkürzel: Zeilen' })).toContainText(
    'Umschalt+F10 oder Menütaste',
  );
});

test('Auftrags-LV: die Suche findet auch unter einer zugeklappten Gliederung (D-101)', async ({ page }) => {
  // Angebot von Bieter A und Zuschlag über die Oberfläche; danach steht die Seite des Auftrags-LV.
  await page
    .getByLabel('Angebotsdatei wählen')
    .setInputFiles(new URL('../../../fixtures/angebote/typisch-bieter-a.x84', import.meta.url).pathname);
  await page
    .getByRole('dialog', { name: 'Angebot (X84) einlesen' })
    .getByRole('button', { name: 'Übernehmen' })
    .click();
  const liste = page.getByRole('dialog', { name: 'Angebote' });
  await expect(liste.getByRole('row', { name: /Bieter A/ })).toBeVisible();
  await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: 'Zuschlag erteilen: Bieter A' })
    .click();
  await page
    .getByRole('dialog', { name: 'Zuschlag erteilen – Bieter A' })
    .getByRole('button', { name: 'Zuschlag erteilen', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();

  await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').click();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(zeile(page, 'Erd- und Betonarbeiten')).toHaveAttribute('aria-expanded', 'false');
  await expect(zeile(page, 'Fundamente betonieren')).toHaveCount(0);
  await page.keyboard.press('Control+f');
  await expect(suchfeld(page)).toBeFocused();
  await page.keyboard.type('frost');
  await expect(zelle(page, 'Zuschlag Frosteinbau', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);
  await expect(zeile(page, 'Erd- und Betonarbeiten')).toHaveAttribute('aria-expanded', 'true');
});
