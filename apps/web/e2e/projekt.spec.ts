// SPDX-License-Identifier: AGPL-3.0-or-later
// Projektliste und Projektseite (Ticket 39, Punkt 3): anlegen, umbenennen, öffnen; LV anlegen, umbenennen, öffnen;
// Projektdatei sichern und in einem frischen Speicher (neuer Browser-Kontext, leeres OPFS) importieren.

import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  lvAnlegen,
  neueZeile,
  positionTippen,
  projektAnlegen,
  summen,
  fixture,
  type FxPosition,
} from './hilfen';
import { werkzeug } from './werkzeuge';

const typisch = fixture('typisch');
const p0020 = typisch.knoten.find((k) => k.ordnungszahl === '01.0020') as FxPosition;

test('Projekte nach Name; Projekt und LV anlegen, umbenennen und öffnen', async ({ page }) => {
  await projektAnlegen(page, 'Zeppelinhalle', 'Stadtwerke');
  await page.getByRole('link', { name: 'Zur Projektliste' }).click();
  await projektAnlegen(page, 'Amtsgericht', 'Land');
  await page.getByRole('link', { name: 'Zur Projektliste' }).click();
  const liste = page.getByRole('list', { name: 'Projekte' });
  await expect(liste.getByRole('link')).toHaveText(['Amtsgericht', 'Zeppelinhalle']);

  // Stammdaten ändern (ProjektStammdatenSetzen).
  await liste.getByRole('link', { name: 'Zeppelinhalle' }).click();
  await page.getByRole('button', { name: 'Stammdaten ändern' }).click();
  const dialog = page.getByRole('dialog', { name: 'Stammdaten ändern' });
  await dialog.getByLabel('Projektname').fill('Bürgerhaus');
  await dialog.getByLabel('Projektname').press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Bürgerhaus' })).toBeVisible();
  await expect(page.getByText('Bauherr: Stadtwerke')).toBeVisible();

  // LV anlegen, öffnen, zurück, umbenennen.
  await lvAnlegen(page, 'Dach');
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  const lvs = page.getByRole('list', { name: 'Leistungsverzeichnisse' });
  await expect(lvs.getByRole('link')).toHaveText(['Dach']);
  await lvs.getByRole('button', { name: 'Umbenennen: Dach' }).click();
  const lvDialog = page.getByRole('dialog', { name: 'Leistungsverzeichnis umbenennen' });
  await lvDialog.getByLabel('Neuer Name').fill('Dach und Fassade');
  await lvDialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(lvs.getByRole('link')).toHaveText(['Dach und Fassade']);
  await lvs.getByRole('link', { name: 'Dach und Fassade' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dach und Fassade' })).toBeVisible();

  // Nach dem Neuladen ist alles noch da.
  await page.goto('/');
  await expect(page.getByRole('list', { name: 'Projekte' }).getByRole('link')).toHaveText([
    'Amtsgericht',
    'Bürgerhaus',
  ]);
});

test('Eine ungültige OZ-Maske wird am Feld gemeldet, nichts wird angelegt', async ({ page }) => {
  await projektAnlegen(page, 'Maskentest', 'B');
  await page.getByLabel('Name des LV').fill('X');
  await page.getByLabel('OZ-Maske').fill('NN..NN');
  await page.getByRole('button', { name: 'LV anlegen' }).click();
  await expect(page.getByText(/Die Maske besteht aus Gruppen/)).toBeVisible();
  await expect(page.getByText('Noch keine Leistungsverzeichnisse.')).toBeVisible();
});

test('Projektdatei sichern und in einem frischen Speicher einlesen: gleiche Summen', async ({
  page,
  browser,
}) => {
  await projektAnlegen(page, 'Exportprojekt', 'Bauherr X');
  await lvAnlegen(page, 'Zaun');
  await neueZeile(page, () => werkzeug(page, 'Einfügen', /^Titel anlegen/));
  await page.keyboard.type('Einfriedung');
  await page.keyboard.press('Enter');
  await positionTippen(page, p0020);
  await expect.poll(async () => (await summen(page))['Netto']).toBe('644,43');
  const vorher = await summen(page);

  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  // Die Liste kommt samt Netto nach Nachlass aus der Übersicht (Ticket 121, D-62).
  await expect(page.getByLabel('Netto nach Nachlass Zaun')).toHaveText('644,43 €');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Projektdatei sichern' }).click(),
  ]);
  const pfad = await download.path();
  const inhalt = readFileSync(pfad, 'utf8');
  expect(download.suggestedFilename()).toBe('Exportprojekt.tethys.json');

  // Frischer Kontext: eigenes, leeres OPFS.
  const kontext = await browser.newContext();
  const neu = await kontext.newPage();
  await neu.goto('/');
  await expect(neu.getByText('Noch keine Projekte.')).toBeVisible();
  await neu.getByLabel('Projektdatei einlesen').setInputFiles({
    name: 'Exportprojekt.tethys.json',
    mimeType: 'application/json',
    buffer: Buffer.from(inhalt),
  });
  await neu.getByRole('link', { name: 'Exportprojekt' }).click();
  await neu.getByRole('link', { name: 'Zaun' }).click();
  await expect.poll(() => summen(neu)).toEqual(vorher);

  // Ein zweiter Import desselben Projekts: Meldung statt stiller Überschreibung.
  await neu.goto('/');
  await neu.getByLabel('Projektdatei einlesen').setInputFiles({
    name: 'Exportprojekt.tethys.json',
    mimeType: 'application/json',
    buffer: Buffer.from(inhalt),
  });
  await expect(neu.getByText('Dieses Projekt ist schon vorhanden.', { exact: true })).toBeVisible();
  await kontext.close();
});
