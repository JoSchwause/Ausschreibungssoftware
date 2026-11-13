// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 131 (E1): Die Seitenleiste folgt dem geöffneten Projekt, Brotkrumen und markierter Eintrag stimmen überein, der
// Fenstertitel nennt Seite und Projekt, die Projektseite läuft bei 1280 × 800 nicht waagerecht über. Nur Rollen und
// Beschriftungen, keine Testhaken, keine getippten Adressen nach dem Start.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { lvAnlegen, projektAnlegen } from './hilfen';

const leiste = (page: Page): Locator => page.getByRole('navigation', { name: 'Hauptnavigation' });
const pfad = (page: Page): Locator => page.getByRole('navigation', { name: 'Pfad' });

/** Der markierte Eintrag der Seitenleiste. */
const markiert = (page: Page): Locator => leiste(page).locator('[aria-current="page"]');

async function krumen(page: Page): Promise<string[]> {
  return pfad(page).getByRole('listitem').allInnerTexts();
}

test('Seitenleiste, Brotkrumen und Titel folgen dem Projekt; 1280 × 800 ohne waagerechten Überlauf', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await projektAnlegen(page, 'Turnhalle Nord', 'Gemeinde (erfunden)');

  // Übersicht: Einträge des Projekts samt Gruppe „Vorschau“, Krumen „Projekte › Projekt“, Titel mit einem Trennzeichen.
  await expect(markiert(page)).toHaveText('Übersicht');
  for (const eintrag of [
    'Leistungsverzeichnisse',
    'Vergabe',
    'Auftrags-LV',
    'Nachträge',
    'Aufmaß',
    'Rechnungen',
    'Kosten',
    'Modelle',
    'Bauzeitenpläne',
    'Honorar',
    'Mängel',
    'Bautagebuch',
    'Hilfe',
  ]) {
    await expect(leiste(page).getByRole('link', { name: eintrag, exact: true })).toBeVisible();
  }
  await expect(leiste(page).getByText('Vorschau', { exact: true })).toBeVisible();
  await expect.poll(() => krumen(page)).toEqual(['Projekte', 'Turnhalle Nord']);
  await expect(page).toHaveTitle('Übersicht – Turnhalle Nord – Tethys AVA');
  const ueberlauf = await page.evaluate(() => {
    const main = document.querySelector('main');
    return (
      document.documentElement.scrollWidth > window.innerWidth ||
      (main !== null && main.scrollWidth > main.clientWidth)
    );
  });
  expect(ueberlauf).toBe(false);
  // „Projekt löschen“ steht im Menü, nicht zwischen den Verweisen.
  await expect(page.getByRole('button', { name: 'Projekt löschen' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
  const loeschen = page.getByRole('menuitem', { name: 'Projekt löschen' });
  await expect(loeschen).toBeVisible();
  await page.keyboard.press('Escape');
  // Das Menü gibt den Fokus an „Weitere Aktionen“ zurück; erst danach weiter, sonst landen Tasten dort.
  await expect(loeschen).toBeHidden();
  await expect(page.getByRole('button', { name: 'Weitere Aktionen' })).toBeFocused();

  // Ein LV: Krumen bis zum LV, markiert ist „Leistungsverzeichnisse“, wie die dritte Krume.
  await lvAnlegen(page, 'Rohbau');
  await expect(markiert(page)).toHaveText('Leistungsverzeichnisse');
  await expect
    .poll(() => krumen(page))
    .toEqual(['Projekte', 'Turnhalle Nord', 'Leistungsverzeichnisse', 'Rohbau']);
  await expect(page).toHaveTitle('Rohbau – Turnhalle Nord – Tethys AVA');

  // Vergabe über die Seitenleiste, von dort der Preisspiegel.
  await leiste(page).getByRole('link', { name: 'Vergabe', exact: true }).click();
  await expect(markiert(page)).toHaveText('Vergabe');
  await expect(page.getByRole('heading', { level: 1, name: 'Vergabe – Turnhalle Nord' })).toBeVisible();
  await page.getByRole('link', { name: 'Preisspiegel: Rohbau' }).click();
  await expect
    .poll(() => krumen(page))
    .toEqual(['Projekte', 'Turnhalle Nord', 'Vergabe', 'Rohbau', 'Preisspiegel']);
  await expect(markiert(page)).toHaveText('Vergabe');
  await expect(page).toHaveTitle('Preisspiegel – Turnhalle Nord – Tethys AVA');

  // Krume „Projekt“ führt zurück zur Übersicht.
  await pfad(page).getByRole('link', { name: 'Turnhalle Nord' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Turnhalle Nord' })).toBeVisible();
  await expect(markiert(page)).toHaveText('Übersicht');

  // Aufträge: die schlichte Liste je Projekt erklärt, woher ein Auftrags-LV kommt.
  await leiste(page).getByRole('link', { name: 'Rechnungen', exact: true }).click();
  await expect(markiert(page)).toHaveText('Rechnungen');
  await expect(page.getByText('Rechnungen setzen einen Zuschlag voraus.')).toBeVisible();

  // Module in Vorschau tragen das Kennzeichen in Seitenleiste und Kopfzeile, Honorar den Satz zu den Tafelwerten.
  await leiste(page).getByRole('link', { name: 'Modelle', exact: true }).click();
  await expect(markiert(page)).toHaveText('Modelle');
  await expect(page.getByRole('banner').getByRole('note')).toContainText('Vorschau');
  await leiste(page).getByRole('link', { name: 'Honorar', exact: true }).click();
  await expect(page.getByRole('banner').getByRole('note')).toContainText(
    'Die Tafelwerte sind nicht gegen die amtliche Fassung der HOAI geprüft.',
  );
  await expect(page).toHaveTitle('Honorar – Turnhalle Nord – Tethys AVA');

  // Zurück zur Projektliste: die Seitenleiste zeigt nur noch Projekte und Hilfe.
  await leiste(page).getByRole('link', { name: 'Projekte', exact: true }).click();
  await expect(markiert(page)).toHaveText('Projekte');
  await expect(leiste(page).getByRole('link', { name: 'Übersicht' })).toHaveCount(0);
  await expect(page).toHaveTitle('Projekte – Tethys AVA');
});

test('Nach dem Neuladen findet die LV-Seite ihr Projekt wieder', async ({ page }) => {
  await projektAnlegen(page, 'Halle Süd', 'Bauherr (erfunden)');
  await lvAnlegen(page, 'Dach');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Dach' })).toBeVisible();
  await expect.poll(() => krumen(page)).toEqual(['Projekte', 'Halle Süd', 'Leistungsverzeichnisse', 'Dach']);
  await expect(markiert(page)).toHaveText('Leistungsverzeichnisse');
});
