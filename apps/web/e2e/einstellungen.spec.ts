// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 150: Projektangaben, Büro (Absender) mit eigenem Rückgängig der Einstellungen, LV-Stand umbenennen und löschen,
// Übernahme aus dem Browserspeicher, Projektdatei als Kopie einlesen und Sicherung → Projekt löschen → Einlesen.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { lvAnlegen, projektAnlegen } from './hilfen';
import { werkzeug } from './werkzeuge';

const projektRueckgaengig = (page: Page) => page.getByRole('button', { name: /^Rückgängig/ });

async function bueroSetzen(page: Page, name: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Büro (Absender) …' }).click();
  const dialog = page.getByRole('dialog', { name: 'Büro (Absender)' });
  await dialog.getByLabel('Name des Büros').fill(name);
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Büro gespeichert').first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(dialog).toBeHidden();
}

async function sichern(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Projektdatei sichern' }).click(),
  ]);
  return readFileSync(await download.path(), 'utf8');
}

async function einlesen(page: Page, inhalt: string): Promise<void> {
  await page.getByLabel('Projektdatei einlesen').setInputFiles({
    name: 'Schule.tethys.json',
    mimeType: 'application/json',
    buffer: Buffer.from(inhalt),
  });
}

test('Projektangaben: Nummer, Ort und Baustelle im Kopf der Projektseite; Rückgängig des Projekts', async ({
  page,
}) => {
  await projektAnlegen(page, 'Schule', 'Stadt');
  await page.getByRole('button', { name: 'Projektangaben …' }).click();
  const dialog = page.getByRole('dialog', { name: 'Projektangaben' });
  await expect(dialog.getByLabel('Projektname')).toHaveValue('Schule');
  await dialog.getByLabel('Projektnummer').fill('2026-017');
  await dialog.getByLabel('Ort', { exact: true }).fill('Musterstadt');
  await dialog.getByLabel('Straße').fill('Schulweg 3');
  await dialog.getByLabel('PLZ').fill('12345');
  await dialog.getByLabel('Ort der Baustelle').fill('Musterstadt');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Projektnummer: 2026-017')).toBeVisible();
  await expect(page.getByText('Baustelle: Schulweg 3, 12345 Musterstadt')).toBeVisible();

  // Ein leerer Name wird am Feld gemeldet.
  await page.getByRole('button', { name: 'Projektangaben …' }).click();
  await dialog.getByLabel('Projektname').fill('');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog.getByText('Bitte einen Projektnamen eingeben.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();

  await projektRueckgaengig(page).click();
  await expect(page.getByText('Projektnummer: 2026-017')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Schule' })).toBeVisible();
  await expect(page.getByText('Projektnummer: 2026-017')).toHaveCount(0);
});

test('Büro (Absender) für alle Projekte; Rückgängig der Einstellungen getrennt vom Projekt', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Büro (Absender) …' }).click();
  const dialog = page.getByRole('dialog', { name: 'Büro (Absender)' });
  // Angaben ohne Namen: Hinweis, nichts gespeichert.
  await dialog.getByLabel('Telefon').fill('0123 456');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog.getByText('Ein Büro braucht einen Namen.')).toBeVisible();
  await dialog.getByLabel('Name des Büros').fill('Planungsbüro Muster');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog.getByRole('button', { name: 'Einstellung rückgängig' })).toBeEnabled();
  await dialog.getByLabel('Name des Büros').fill('Büro Zwei');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog.getByRole('button', { name: 'Einstellung wiederholen' })).toBeDisabled();

  // Rückgängig über die Schaltfläche, dann mit Strg+Z im Dialog (außerhalb eines Feldes).
  await dialog.getByRole('button', { name: 'Einstellung rückgängig' }).click();
  await expect(dialog.getByLabel('Name des Büros')).toHaveValue('Planungsbüro Muster');
  await dialog.getByRole('button', { name: 'Einstellung wiederholen' }).focus();
  await page.keyboard.press('Control+z');
  await expect(dialog.getByLabel('Name des Büros')).toHaveValue('');
  await expect(dialog.getByLabel('Telefon')).toHaveValue('');
  await page.keyboard.press('Control+y');
  await expect(dialog.getByLabel('Name des Büros')).toHaveValue('Planungsbüro Muster');
  await expect(dialog.getByLabel('Telefon')).toHaveValue('0123 456');
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  // Das Rückgängig des Projekts weiß von den Einstellungen nichts.
  await expect(projektRueckgaengig(page)).toBeDisabled();

  // Nach dem Neuladen und in jedem Projekt dasselbe Büro.
  await projektAnlegen(page, 'Turnhalle', 'Land');
  await page.goto('/');
  await page.getByRole('button', { name: 'Büro (Absender) …' }).click();
  await expect(dialog.getByLabel('Name des Büros')).toHaveValue('Planungsbüro Muster');
});

test('LV-Stand umbenennen und löschen; Rückgängig holt ihn zurück', async ({ page }) => {
  await projektAnlegen(page, 'Schule', 'Stadt');
  await lvAnlegen(page, 'Rohbau');
  await werkzeug(page, 'LV', 'LV-Stände');
  const staende = page.getByRole('dialog', { name: 'LV-Stände' });
  await staende.getByLabel('Name des Stands').fill('Versand');
  await staende.getByRole('button', { name: 'Stand anlegen' }).click();
  const liste = staende.getByRole('list', { name: 'LV-Stände' });
  await expect(liste).toContainText('Versand');

  await liste.getByRole('button', { name: 'Umbenennen: Versand' }).click();
  const umbenennen = page.getByRole('dialog', { name: 'LV-Stand umbenennen' });
  await umbenennen.getByLabel('Neuer Name').fill('Vergabe');
  await umbenennen.getByRole('button', { name: 'Speichern' }).click();
  await expect(umbenennen).toBeHidden();
  await expect(liste).toContainText('Vergabe');

  await liste.getByRole('button', { name: 'Löschen: Vergabe' }).click();
  const frage = page.getByRole('dialog', { name: 'LV-Stand löschen' });
  await expect(frage).toContainText('„Rückgängig“');
  await frage.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(liste).toContainText('Vergabe');
  await liste.getByRole('button', { name: 'Löschen: Vergabe' }).click();
  await frage.getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(staende.getByText('Noch kein LV-Stand angelegt.')).toBeVisible();
  await staende.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(staende).toBeHidden();

  await projektRueckgaengig(page).click();
  await werkzeug(page, 'LV', 'LV-Stände');
  await expect(liste).toContainText('Vergabe');
  await staende.getByRole('link', { name: 'Öffnen: Vergabe' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Rohbau – Vergabe' })).toBeVisible();
});

test('Druckprofile und Kostengruppen aus dem Browserspeicher: einmal übernommen, dann nie wieder', async ({
  page,
}) => {
  const altprofil = {
    name: 'Altprofil',
    mitPreisen: false,
    langtext: { art: 'kein' },
    titelsummen: false,
    schlussblock: false,
    deckblatt: true,
    kopfzeile: null,
    fusszeile: null,
    seitenrand: 'eng',
  };
  await page.goto('/');
  await page.evaluate((profil) => {
    window.localStorage.setItem('tethys-druckprofile', JSON.stringify([profil, 42]));
    window.localStorage.setItem('tethys.kosten.bezeichnungen', 'Nummer;Bezeichnung\n330;Außenwände\n');
  }, altprofil);
  await page.reload();
  await projektAnlegen(page, 'Schule', 'Stadt');
  const block = JSON.parse(await sichern(page)) as {
    einstellungen?: { druckprofile: { name: string }[]; kostengruppenbezeichnungen: unknown[] };
  };
  expect(block.einstellungen?.druckprofile.map((p) => p.name)).toEqual(['Altprofil']);
  expect(block.einstellungen?.kostengruppenbezeichnungen).toEqual([
    { nummer: '330', bezeichnung: 'Außenwände' },
  ]);

  // Der alte Schlüssel bleibt; was sich nicht als Profil lesen ließ, zeigt der Druckdialog weiter an.
  await lvAnlegen(page, 'Rohbau');
  await werkzeug(page, 'Ausgabe', 'Als PDF');
  const pdf = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await pdf.getByRole('combobox', { name: 'Druckprofil' }).click();
  await expect(page.getByRole('option', { name: 'Altprofil' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pdf.getByRole('region', { name: 'Nicht verwendete gespeicherte Profile' })).toContainText(
    'lässt sich nicht als Druckprofil lesen',
  );

  // Ein neuer Inhalt im Browserspeicher kommt nicht mehr herein: Das Einstellungsprotokoll ist nicht mehr leer.
  await page.evaluate(() => {
    window.localStorage.setItem('tethys.kosten.bezeichnungen', 'Nummer;Bezeichnung\n340;Innenwände\n');
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Schule' }).click();
  const danach = JSON.parse(await sichern(page)) as {
    einstellungen?: { kostengruppenbezeichnungen: unknown[] };
  };
  expect(danach.einstellungen?.kostengruppenbezeichnungen).toEqual([
    { nummer: '330', bezeichnung: 'Außenwände' },
  ]);
});

test('Sicherung → Projekt löschen → Einlesen ergibt dieselben Einstellungen; ein vorhandenes Projekt als Kopie', async ({
  page,
  browser,
}) => {
  await bueroSetzen(page, 'Planungsbüro Muster');
  await projektAnlegen(page, 'Schule', 'Stadt');
  const datei = await sichern(page);

  // Dasselbe Projekt noch einmal: als Kopie einlesen; die Einstellungen waren alle schon da.
  await page.goto('/');
  await einlesen(page, datei);
  const frage = page.getByRole('dialog', { name: 'Projekt schon vorhanden' });
  await expect(frage.getByLabel('Name der Kopie')).toHaveValue('Schule (Kopie)');
  await frage.getByRole('button', { name: 'Als Kopie einlesen' }).click();
  const bericht = page.getByRole('dialog', { name: 'Projektdatei eingelesen' });
  await expect(bericht.getByRole('list', { name: /^Belassen/ }).getByRole('listitem')).toHaveText([
    'Büro (Absender)',
  ]);
  await expect(bericht.getByRole('list', { name: /^Übernommen/ })).toHaveCount(0);
  await bericht.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(page.getByRole('list', { name: 'Projekte' }).getByRole('link')).toHaveText([
    'Schule',
    'Schule (Kopie)',
  ]);

  // Projekt löschen und die Sicherung wieder einlesen.
  await page.getByRole('link', { name: 'Schule', exact: true }).click();
  await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
  await page.getByRole('menuitem', { name: 'Projekt löschen' }).click();
  await page
    .getByRole('dialog', { name: 'Projekt löschen' })
    .getByRole('button', { name: 'Endgültig löschen' })
    .click();
  await expect(page.getByRole('list', { name: 'Projekte' }).getByRole('link')).toHaveText(['Schule (Kopie)']);
  await einlesen(page, datei);
  await expect(bericht.getByRole('list', { name: /^Belassen/ })).toContainText('Büro (Absender)');
  await bericht.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(page.getByRole('list', { name: 'Projekte' }).getByRole('link')).toHaveText([
    'Schule',
    'Schule (Kopie)',
  ]);

  // Ein anderes Gerät (leerer Speicher): Die Sicherung bringt die Einstellungen mit.
  const kontext = await browser.newContext();
  const neu = await kontext.newPage();
  await neu.goto('/');
  await einlesen(neu, datei);
  const neuBericht = neu.getByRole('dialog', { name: 'Projektdatei eingelesen' });
  await expect(neuBericht.getByRole('list', { name: /^Übernommen/ }).getByRole('listitem')).toHaveText([
    'Büro (Absender)',
  ]);
  await neuBericht.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await neu.getByRole('button', { name: 'Büro (Absender) …' }).click();
  await expect(neu.getByRole('dialog', { name: 'Büro (Absender)' }).getByLabel('Name des Büros')).toHaveValue(
    'Planungsbüro Muster',
  );
  await kontext.close();
});
