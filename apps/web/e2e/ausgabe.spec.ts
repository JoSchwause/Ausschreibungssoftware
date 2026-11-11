// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 66: Drucken (PDF im Web Worker) und Excel-Rundlauf für Bieter. Nur Dateiauswahl, Schaltflächen und Tastatur
// (U3, U8); über den Testpfad nur das Laden einer Fixture. Das PDF wird mit pdf.js zurückgelesen, die Rücklaufdatei
// im Test aus der Fixture erzeugt (mit Schätzpreisen: die Bietersumme muss dem Sollwert des LV gleichen).

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { lvAlsExcel } from '../../../packages/ausgabe/src/index';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { lvZustandAusFixture } from '../../../packages/ausgabe/src/testhilfen';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';

const projektIdAusUrl = (page: Page): string =>
  decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');

async function typischOeffnen(page: Page, fixtureName: 'typisch' | 'gross' = 'typisch'): Promise<void> {
  const inhalt = fixtureInhalt(fixtureName);
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = projektIdAusUrl(page);
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
}

const sollwerte = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch.json', import.meta.url), 'utf8'),
) as { sollwerte: { summen: { netto: string } } };
const NETTO = betragDe(sollwerte.sollwerte.summen.netto);

test('Als PDF: Download <LV-Name>.pdf mit Netto-Summe im Textauszug, Worker, Hauptthread bleibt frei', async ({
  page,
}) => {
  await typischOeffnen(page);
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await expect(dialog.getByTestId('pdf-dateiname')).toHaveText('Typisch Musterhaus erfunden.pdf');
  // Das Datum ist mit „heute“ vorbelegt (Uhr der App) und im deutschen Format.
  await expect(dialog.getByLabel('Datum im Kopf')).toHaveValue(/^\d{2}\.\d{2}\.\d{4}$/);
  await dialog.getByLabel('Datum im Kopf').fill('11.11.2026');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'PDF erzeugen' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Typisch Musterhaus erfunden.pdf');
  const bytes = readFileSync(await download.path());
  expect(bytes.length).toBeGreaterThan(0);
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  const text = alsText(await liesPdf(new Uint8Array(bytes))).replace(/\s+/g, ' ');
  expect(text).toContain(NETTO);
  expect(text).toContain('11.11.2026');
  await expect(dialog).toBeHidden();
});

test('Als PDF ohne Preise: Blankett ohne Summen', async ({ page }) => {
  await typischOeffnen(page);
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await dialog.getByRole('combobox', { name: 'Inhalt' }).click();
  await page.getByRole('option', { name: /ohne Preise/ }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'PDF erzeugen' }).click(),
  ]);
  const bytes = readFileSync(await download.path());
  const text = alsText(await liesPdf(new Uint8Array(bytes))).replace(/\s+/g, ' ');
  expect(text).toContain('Typisch: Musterhaus (erfunden)');
  expect(text).not.toContain(NETTO);
});

test('Ein ungültiges Datum sperrt „PDF erzeugen“ und sagt es', async ({ page }) => {
  await typischOeffnen(page);
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await dialog.getByLabel('Datum im Kopf').fill('31.02.2026');
  await expect(dialog.getByText(/gültiges Datum/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'PDF erzeugen' })).toBeDisabled();
});

test('Excel für Bieter: Download <LV-Name>-Bieter.xlsx', async ({ page }) => {
  await typischOeffnen(page);
  await page.getByRole('button', { name: 'Excel für Bieter' }).click();
  const dialog = page.getByRole('dialog', { name: 'Excel für Bieter ausgeben' });
  await expect(dialog.getByTestId('excel-dateiname')).toHaveText('Typisch Musterhaus erfunden-Bieter.xlsx');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('Typisch Musterhaus erfunden-Bieter.xlsx');
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
});

test('Excel einlesen: Vorschau, Übernehmen legt Bieter und Angebot an (Bietersumme = Sollwert), ein Undo-Schritt', async ({
  page,
}) => {
  await typischOeffnen(page);
  const { zustand } = lvZustandAusFixture('typisch');
  const datei = lvAlsExcel(zustand, { mitPreisen: true });

  await page.getByLabel('Excel-Datei wählen').setInputFiles({
    name: 'Mustermann Bau GmbH.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(datei.bytes),
  });
  const dialog = page.getByRole('dialog', { name: 'Excel-Angebot einlesen' });
  await expect(dialog.getByLabel('Bieter')).toHaveValue('Mustermann Bau GmbH');
  await expect(dialog.getByTestId('anzahl-excel-angeboten')).not.toHaveText('0');
  await expect(dialog.getByRole('region', { name: 'Befunde der Excel-Datei' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();

  const liste = page.getByRole('dialog', { name: 'Angebote' });
  const zeile = liste
    .getByRole('table', { name: 'Angebote dieses Leistungsverzeichnisses' })
    .getByRole('row', { name: /Mustermann Bau GmbH/ });
  await expect(zeile.getByRole('cell').nth(1)).toHaveText(NETTO);
  await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Angebote (1)' })).toBeVisible();

  await page
    .getByRole('button', { name: /Rückgängig/ })
    .first()
    .click();
  await expect(page.getByRole('button', { name: 'Angebote (0)' })).toBeVisible();
});

test('Excel einlesen: keine Excel-Datei zeigt den Befund und bietet kein Übernehmen an', async ({ page }) => {
  await typischOeffnen(page);
  await page.getByLabel('Excel-Datei wählen').setInputFiles({
    name: 'kaputt.xlsx',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('das ist kein zip'),
  });
  const dialog = page.getByRole('dialog', { name: 'Excel-Angebot einlesen' });
  await expect(dialog.getByText(/nichts zu übernehmen/)).toBeVisible();
  await expect(
    dialog.getByRole('region', { name: 'Befunde der Excel-Datei' }).getByRole('listitem').first(),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Übernehmen' })).toHaveCount(0);
});

test('PDF eines großen LV: Fortschritt sichtbar, Abbrechen beendet den Lauf ohne Download, die Seite bleibt bedienbar', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await typischOeffnen(page, 'gross');
  let heruntergeladen = false;
  page.on('download', () => {
    heruntergeladen = true;
  });
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await dialog.getByRole('button', { name: 'PDF erzeugen' }).click();
  await expect(dialog.getByTestId('pdf-fortschritt')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'PDF erzeugen' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toBeHidden();
  // Der Hauptthread war frei: Der Dialog lässt sich sofort wieder öffnen, der Lauf von vorhin liefert nichts nach.
  await page.getByRole('button', { name: 'Als PDF' }).click();
  await expect(dialog.getByRole('button', { name: 'PDF erzeugen' })).toBeEnabled();
  await page.waitForTimeout(6000);
  expect(heruntergeladen).toBe(false);
});
