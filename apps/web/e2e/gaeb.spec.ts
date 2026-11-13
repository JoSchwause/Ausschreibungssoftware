// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 49: GAEB-Import und -Export, X84-Angebot. Nur Dateiauswahl, Schaltflächen und Tastatur (U3, U8); über den
// Testpfad nur das Laden einer Fixture. Befunde sperren nie (U5), der Export einer Datei mit Fehlern ist ein Entwurf.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { projektAnlegen } from './hilfen';
import { erwartePunkt, werkzeug } from './werkzeuge';

const AVA = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021';
const pfad = (rel: string): string => new URL(`../../../${rel}`, import.meta.url).pathname;

const projektIdAusUrl = (page: Page): string =>
  decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');

/** Die BVBS-X81 über „GAEB einlesen“ übernehmen; danach steht die Projektseite mit dem LV in der Liste. */
async function bvbsEinlesen(page: Page): Promise<void> {
  await projektAnlegen(page, 'Prüfdatei', 'BVBS');
  await page.getByLabel('GAEB-Datei wählen').setInputFiles(pfad(`${AVA}.X81`));
  const dialog = page.getByRole('dialog', { name: 'GAEB-Datei einlesen' });
  await expect(dialog.getByTestId('anzahl-positionen')).toBeVisible();
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toBeHidden();
}

test('X81 einlesen: Vorschau mit Zahlen und Befunden, Übernehmen legt das LV an, Neuladen behält es', async ({
  page,
}) => {
  await projektAnlegen(page, 'Prüfdatei', 'BVBS');
  await page.getByLabel('GAEB-Datei wählen').setInputFiles(pfad(`${AVA}.X81`));
  const dialog = page.getByRole('dialog', { name: 'GAEB-Datei einlesen' });
  await expect(dialog.getByTestId('anzahl-gliederungen')).toHaveText('22');
  await expect(dialog.getByTestId('anzahl-positionen')).toHaveText('74');
  await expect(dialog.getByTestId('anzahl-hinweistexte')).toHaveText('14');
  const befunde = dialog.getByRole('region', { name: 'Befunde der Datei' });
  await expect(befunde.getByRole('heading', { name: /^Warnungen \(\d+\)$/ })).toBeVisible();
  await expect(befunde.getByRole('listitem').first()).toBeVisible();

  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toBeHidden();
  const liste = page.getByRole('list', { name: /Leistungsverzeichnisse/i });
  await expect(liste.getByRole('link', { name: 'BVBS GAEB AVA' })).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('list', { name: /Leistungsverzeichnisse/i }).getByRole('link', { name: 'BVBS GAEB AVA' }),
  ).toBeVisible();
});

test('Eine Datei ohne Inhalt zeigt die Befunde und bietet kein Übernehmen an', async ({ page }) => {
  await projektAnlegen(page, 'Leer', 'Test');
  await page.getByLabel('GAEB-Datei wählen').setInputFiles({
    name: 'kaputt.x83',
    mimeType: 'application/xml',
    buffer: Buffer.from('das ist kein XML'),
  });
  const dialog = page.getByRole('dialog', { name: 'GAEB-Datei einlesen' });
  await expect(dialog.getByText(/kein Leistungsverzeichnis/)).toBeVisible();
  await expect(
    dialog.getByRole('region', { name: 'Befunde der Datei' }).getByRole('listitem').first(),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Übernehmen' })).toHaveCount(0);
});

test('Das Einlesen ist ein Undo-Schritt', async ({ page }) => {
  await bvbsEinlesen(page);
  const liste = page.getByRole('list', { name: /Leistungsverzeichnisse/i });
  await expect(liste.getByRole('link', { name: 'BVBS GAEB AVA' })).toBeVisible();
  await page
    .getByRole('button', { name: /Rückgängig/ })
    .first()
    .click();
  await expect(liste.getByRole('link', { name: 'BVBS GAEB AVA' })).toHaveCount(0);
  await expect(page.getByText('Noch keine Leistungsverzeichnisse')).toBeVisible();
});

async function typischOeffnen(page: Page, einheit?: string): Promise<void> {
  const inhalt = fixtureInhalt('typisch');
  const knoten =
    einheit === undefined
      ? inhalt.knoten
      : inhalt.knoten.map((k, i) =>
          k.art === 'position' &&
          k.einheit !== null &&
          i === inhalt.knoten.findIndex((x) => x.art === 'position')
            ? { ...k, einheit }
            : k,
        );
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = projektIdAusUrl(page);
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    { ...inhalt, knoten },
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
}

test('typisch als X83 3.3 ausgeben: Datei wird heruntergeladen, die eigene Prüfung zeigt keine Fehler', async ({
  page,
}) => {
  await typischOeffnen(page);
  await werkzeug(page, 'Ausgabe', 'GAEB ausgeben');
  const dialog = page.getByRole('dialog', { name: 'GAEB-Datei ausgeben' });
  await expect(dialog.getByText('Die eigene Prüfung fand keine Fehler.')).toBeVisible();
  await expect(dialog.getByTestId('ausgabe-dateiname')).toHaveText('Typisch Musterhaus erfunden.x83');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Typisch Musterhaus erfunden.x83');
  const text = readFileSync(await download.path(), 'utf8');
  expect(text).toContain('GAEB');
  expect(text).not.toContain('Entwurf:');
});

test('Eine Einheit über 4 Zeichen macht den Export zum Entwurf; er geschieht trotzdem', async ({ page }) => {
  await typischOeffnen(page, 'Stunden');
  await werkzeug(page, 'Ausgabe', 'GAEB ausgeben');
  const dialog = page.getByRole('dialog', { name: 'GAEB-Datei ausgeben' });
  await expect(dialog.getByRole('alert')).toContainText('Entwurf');
  await expect(dialog.getByTestId('ausgabe-dateiname')).toHaveText('Typisch Musterhaus erfunden_Entwurf.x83');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Typisch Musterhaus erfunden_Entwurf.x83');
  expect(readFileSync(await download.path(), 'utf8')).toContain('Entwurf:');
});

test('X84 zum eingelesenen BVBS-LV: Bieter wird angelegt, Angebot erscheint mit Bietersumme, ein Undo-Schritt', async ({
  page,
}) => {
  await bvbsEinlesen(page);
  await page.getByRole('link', { name: 'BVBS GAEB AVA' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'BVBS GAEB AVA' })).toBeVisible();
  await erwartePunkt(page, 'Angebote', 'Angebote (0)');

  await page.getByLabel('Angebotsdatei wählen').setInputFiles(pfad(`${AVA}.X84`));
  const dialog = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await expect(dialog.getByLabel('Bieter')).toHaveValue('Maler + Lackierer Pinsel und Co KG');
  await expect(dialog.getByTestId('anzahl-angebotspositionen')).toHaveText('74');
  await expect(
    dialog.getByRole('region', { name: 'Befunde der Datei' }).getByRole('listitem').first(),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();

  const liste = page.getByRole('dialog', { name: 'Angebote' });
  const tabelle = liste.getByRole('table', { name: 'Angebote dieses Leistungsverzeichnisses' });
  const zeile = tabelle.getByRole('row', { name: /Pinsel und Co KG/ });
  await expect(zeile.getByRole('cell').nth(1)).toHaveText('1.421.024.428,85');
  await expect(zeile.getByRole('cell').nth(3)).toHaveText('1.691.019.070,33');
  await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await erwartePunkt(page, 'Angebote', 'Angebote (1)');

  // Bieter und Angebot sind ein Schritt: ein Rückgängig nimmt beide zurück.
  await page
    .getByRole('button', { name: /Rückgängig/ })
    .first()
    .click();
  await erwartePunkt(page, 'Angebote', 'Angebote (0)');
});
