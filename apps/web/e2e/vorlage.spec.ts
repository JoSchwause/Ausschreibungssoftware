// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (C5, G-17): Muster-LV kennzeichnen, in ein anderes LV übernehmen, Textquelle sichtbar und änderbar, ein
// Rückgängig nimmt die Übernahme zurück. Nur Schaltflächen und Tastatur (U3, U8).

import { expect, test, type Page } from '@playwright/test';
import {
  fixture,
  leerlauf,
  lvAnlegen,
  neueZeile,
  positionTippen,
  projektAnlegen,
  type FxPosition,
} from './hilfen';
import { werkzeug } from './werkzeuge';

const typisch = fixture('typisch');
const p = (oz: string) => typisch.knoten.find((k) => k.ordnungszahl === oz) as FxPosition;

const zelle = (page: Page, zeile: number, spalte: string) =>
  page.locator(`[role="row"][data-i="${String(zeile)}"] [data-spalte="${spalte}"]`);

const zeilenZahl = (page: Page): Promise<number> =>
  page
    .getByRole('treegrid', { name: 'Positionen' })
    .evaluate((g) => Number(g.getAttribute('aria-rowcount')) - 1);

/** Muster-LV „Muster Rohbau“ mit Titel 01 und zwei Positionen, als Muster-LV gekennzeichnet. */
async function musterAnlegen(page: Page): Promise<void> {
  await projektAnlegen(page, 'Wohnhaus', 'Bauherr');
  await lvAnlegen(page, 'Muster Rohbau', 'NN.NNNN');
  await neueZeile(page, () => werkzeug(page, 'Einfügen', /^Titel anlegen/));
  await page.keyboard.type('Erdarbeiten');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await positionTippen(page, p('01.0010'));
  await positionTippen(page, p('01.0020'));
  await leerlauf(page);
  await werkzeug(page, 'LV', 'LV-Angaben');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Als Muster-LV (Vorlage) kennzeichnen' }).check();
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  await leerlauf(page);
}

test('Muster-LV kennzeichnen, in anderes LV übernehmen, Textquelle sichtbar, Rückgängig', async ({
  page,
}) => {
  await musterAnlegen(page);

  // Kennzeichen „Vorlage“ auf der Projektseite, bleibt nach dem Neuladen.
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  const liste = page.getByRole('list', { name: 'Leistungsverzeichnisse' });
  await expect(liste.getByTestId('kennzeichen-vorlage')).toHaveText('Vorlage');
  await page.reload();
  await expect(liste.getByTestId('kennzeichen-vorlage')).toHaveCount(1);

  // Ein zweites LV im selben Projekt: Es ist kein Muster-LV und hat kein Kennzeichen.
  await lvAnlegen(page, 'Neubau Süd', 'NN.NNNN');
  expect(await zeilenZahl(page)).toBe(0);

  await werkzeug(page, 'Einfügen', 'Aus Vorlage übernehmen …');
  const dialog = page.getByRole('dialog', { name: 'Aus Vorlage übernehmen' });
  await dialog.getByRole('combobox', { name: 'Muster-LV' }).click();
  await page.getByRole('option', { name: 'Wohnhaus: Muster Rohbau' }).click();
  // Die Gliederung zieht ihre Positionen mit.
  await dialog.getByRole('checkbox', { name: /Erdarbeiten/ }).check();
  await expect(dialog.getByRole('status').filter({ hasText: 'Zeilen gewählt' })).toHaveText(
    '3 Zeilen gewählt',
  );
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  await leerlauf(page);
  await expect.poll(() => zeilenZahl(page)).toBe(3);

  // Textquelle der übernommenen Position: der Name des Muster-LV.
  await zelle(page, 1, 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  const pos = page.getByRole('dialog');
  await expect(pos.getByRole('textbox', { name: 'Textquelle' })).toHaveValue('Muster Rohbau');

  await pos.getByRole('button', { name: 'Abbrechen' }).click();

  // Ein einziges Rückgängig nimmt die ganze Übernahme zurück (ein Undo-Schritt), Wiederholen bringt sie wieder.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await leerlauf(page);
  await expect.poll(() => zeilenZahl(page)).toBe(0);
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await leerlauf(page);
  await expect.poll(() => zeilenZahl(page)).toBe(3);

  // Die Textquelle ist frei änderbar und bleibt nach dem Neuladen.
  await zelle(page, 1, 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  await pos.getByRole('textbox', { name: 'Textquelle' }).fill('Muster-LV Hochbau 2026');
  await pos.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(pos).toHaveCount(0);
  await leerlauf(page);
  await page.reload();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  await zelle(page, 1, 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Textquelle' })).toHaveValue(
    'Muster-LV Hochbau 2026',
  );
});

test('Ohne Muster-LV sagt der Dialog es; die Kennzeichnung lässt sich zurücknehmen', async ({ page }) => {
  await musterAnlegen(page);
  await werkzeug(page, 'LV', 'LV-Angaben');
  const angaben = page.getByRole('dialog');
  await angaben.getByRole('checkbox', { name: 'Als Muster-LV (Vorlage) kennzeichnen' }).uncheck();
  await angaben.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(angaben).toHaveCount(0);
  await leerlauf(page);

  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await expect(page.getByTestId('kennzeichen-vorlage')).toHaveCount(0);
  await lvAnlegen(page, 'Neubau Nord', 'NN.NNNN');
  await werkzeug(page, 'Einfügen', 'Aus Vorlage übernehmen …');
  await expect(page.getByRole('dialog', { name: 'Aus Vorlage übernehmen' })).toContainText(
    'Es gibt noch kein Muster-LV',
  );
});

test('GAEB-Export eines Muster-LV warnt, dass das Kennzeichen verworfen wird (D-84.4)', async ({ page }) => {
  await musterAnlegen(page);
  await werkzeug(page, 'Ausgabe', 'GAEB ausgeben');
  await expect(page.getByRole('dialog')).toContainText('Kennzeichen Muster-LV');
});
