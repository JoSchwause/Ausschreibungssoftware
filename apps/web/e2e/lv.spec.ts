// SPDX-License-Identifier: AGPL-3.0-or-later
// LV-Seite (Ticket 39, Punkte 1, 2, 4): Titel und Position über die Schaltflächen, Nachlass und MwSt an der
// Summenzeile, Speicherfehler (Anzeige bleibt beim alten Stand, Q5), zweiter Tab (E-14).

import { expect, test, type Page } from '@playwright/test';
import {
  fixture,
  lvAnlegen,
  neueZeile,
  positionTippen,
  projektAnlegen,
  summen,
  type FxPosition,
} from './hilfen';

const typisch = fixture('typisch');
const p = (oz: string) => typisch.knoten.find((k) => k.ordnungszahl === oz) as FxPosition;

async function lvMitZweiPositionen(page: Page): Promise<void> {
  await projektAnlegen(page, 'Schule', 'Kreis');
  await lvAnlegen(page, 'Außenanlagen');
  await neueZeile(page, () => page.getByRole('button', { name: /^Titel anlegen/ }).click());
  await page.keyboard.type('Wege');
  await page.keyboard.press('Enter');
  // Position über die Schaltfläche (nicht das Tastenkürzel).
  await neueZeile(page, () => page.getByRole('button', { name: /^Position anlegen/ }).click());
  await page.keyboard.type(p('01.0050').kurztext);
  await page.keyboard.press('Tab');
  await positionTippen(page, p('01.0060'));
  // Die erste Position hat noch keine Menge: GP leer, Netto nur die zweite.
  await expect.poll(async () => (await summen(page))['Netto']).toBe('977,59');
}

test('Position und Titel über die Schaltflächen; Nachlass als Betrag, entfernen; MwSt ändern', async ({
  page,
}) => {
  await lvMitZweiPositionen(page);
  const nachlass = page.getByRole('textbox', { name: 'Nachlass', exact: true });
  const mwst = page.getByRole('textbox', { name: 'MwSt-Satz' });

  // Nachlass als Betrag: zuerst die Art wählen (per Tastatur), dann den Betrag eintragen.
  await page.getByRole('combobox', { name: 'Nachlass als' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('option', { name: 'Betrag' }).press('Enter');
  await nachlass.fill('77,59');
  await nachlass.press('Enter');
  await expect.poll(() => summen(page)).toMatchObject({ Nachlass: '77,59', 'Netto nach Nachlass': '900,00' });
  await expect.poll(async () => (await summen(page))['MwSt']).toBe('171,00');

  await mwst.fill('7');
  await mwst.press('Enter');
  await expect.poll(() => summen(page)).toMatchObject({ MwSt: '63,00', Brutto: '963,00' });

  // Leeren entfernt den Nachlass.
  await nachlass.fill('');
  await nachlass.press('Enter');
  await expect.poll(() => summen(page)).toMatchObject({ Nachlass: '0,00', 'Netto nach Nachlass': '977,59' });

  // Ungültige Eingabe: Meldung, nichts gesperrt, nichts geändert.
  await mwst.fill('7,123');
  await mwst.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'höchstens 2 Nachkommastellen' })).toBeVisible();
  await expect(mwst).toHaveValue('7,123');

  await page.reload();
  await expect.poll(() => summen(page)).toMatchObject({ Netto: '977,59', Nachlass: '0,00', MwSt: '68,43' });
  await expect(mwst).toHaveValue('7,00');
});

test('Speicher voll: die Anzeige bleibt beim alten Stand und eine Meldung nennt den Grund', async ({
  page,
}) => {
  await lvMitZweiPositionen(page);
  const vorher = await summen(page);
  await page.evaluate(() => {
    window.tethysTest?.speicherFehler('speicher-voll');
  });

  const mwst = page.getByRole('textbox', { name: 'MwSt-Satz' });
  await mwst.fill('7');
  await mwst.press('Enter');
  await expect(
    page.getByText('Der Speicher des Browsers ist voll. Die Änderung wurde nicht gespeichert.', {
      exact: true,
    }),
  ).toBeVisible();
  expect(await summen(page)).toEqual(vorher);

  // Auch eine Änderung im Grid bleibt beim alten Stand.
  const menge = page.locator('[role="row"][data-i="1"] [data-spalte="menge"]');
  await menge.focus();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Nicht gespeichert', { exact: true }).first()).toBeVisible();
  // Nur der angezeigte Wert; die Zelle trägt dazu die Beschreibung ihres Prüfbefunds (Menge fehlt).
  await expect(menge.locator('.tx-grid__text')).toHaveText('');
  expect(await summen(page)).toEqual(vorher);

  // Nach dem Neuladen steht der gespeicherte Stand da.
  await page.reload();
  await expect.poll(() => summen(page)).toEqual(vorher);
});

test('Zweiter Tab: verständliche Meldung statt einer leeren Fläche (E-14)', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Projekte' })).toBeVisible();
  await expect(page.getByLabel('Projektname')).toBeVisible();

  const zweiter = await context.newPage();
  await zweiter.goto('/');
  const meldung = zweiter.getByRole('alert');
  await expect(meldung).toContainText('schon in einem anderen Tab geöffnet', { timeout: 15_000 });
  await expect(zweiter.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();

  // Wird der erste Tab geschlossen, öffnet „Erneut versuchen“ den Speicher.
  await page.close();
  await zweiter.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(zweiter.getByLabel('Projektname')).toBeVisible({ timeout: 15_000 });
});
