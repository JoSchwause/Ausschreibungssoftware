// SPDX-License-Identifier: AGPL-3.0-or-later
// Projekt samt Inhalt löschen (E8, Q5): „Weitere Aktionen“ → „Projekt löschen“ nennt den Inhalt je Art und bietet „Projekt samt
// Inhalt löschen …“ an; der zweite Schritt zeigt zuerst „Projektdatei sichern“ und verlangt eine ausdrückliche Bestätigung.
// Danach die Projektliste; Rückgängig stellt alles her, Wiederholen löscht wieder; die Sicherung lässt sich einlesen. Nur
// Schaltflächen, Rollen und Tastatur, keine Testhaken.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const PROJEKT = 'Beispielprojekt Musterhaus';

async function beispielprojekt(page: Page): Promise<void> {
  await page.goto('/');
  await page
    .getByRole('region', { name: 'Willkommen bei Tethys AVA' })
    .getByRole('button', { name: 'Beispielprojekt laden' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: PROJEKT })).toBeVisible();
}

/** Lädt die Projektdatei über die Schaltfläche „Projektdatei sichern“ herunter und liefert ihren Text. */
async function sichern(page: Page, knopf: ReturnType<Page['getByRole']>): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent('download'), knopf.click()]);
  expect(download.suggestedFilename()).toBe(`${PROJEKT}.tethys.json`);
  return readFileSync(await download.path(), 'utf8');
}

/** Öffnet „Projekt löschen“, prüft den Inhalt je Art und geht zum zweiten Schritt. */
async function samtInhaltOeffnen(page: Page): Promise<ReturnType<Page['getByRole']>> {
  await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
  await page.getByRole('menuitem', { name: 'Projekt löschen' }).click();
  const frage = page.getByRole('dialog', { name: 'Projekt löschen' });
  const inhalt = frage.getByRole('list', { name: 'Inhalt des Projekts' });
  for (const art of ['1 LV', '3 Angebote', '1 Auftrags-LV', '1 Aufmaßblatt', '1 Rechnung', '1 Modell'])
    await expect(inhalt.getByRole('listitem').filter({ hasText: new RegExp(`^${art}$`) })).toHaveCount(1);
  await expect(frage.getByRole('button', { name: 'Endgültig löschen' })).toHaveCount(0);
  await frage.getByRole('button', { name: 'Projekt samt Inhalt löschen …' }).click();
  const dialog = page.getByRole('dialog', { name: 'Projekt samt Inhalt löschen' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('Projekt samt Inhalt löschen: Sicherung zuerst, Bestätigung, Liste; Rückgängig stellt alles her, Wiederholen löscht wieder', async ({
  page,
}) => {
  await beispielprojekt(page);
  const dialog = await samtInhaltOeffnen(page);

  // Zuerst die Sicherung: Sie hat den Fokus und lädt die Projektdatei herunter.
  const sichernKnopf = dialog.getByRole('button', { name: 'Projektdatei sichern' });
  await expect(sichernKnopf).toBeFocused();
  const sicherung = await sichern(page, sichernKnopf);
  await expect(dialog.getByRole('list', { name: 'Inhalt des Projekts' })).toContainText('3 Angebote');

  // Ohne ausdrückliche Bestätigung kein Löschen; die Bestätigung geht mit der Tastatur.
  const loeschen = dialog.getByRole('button', { name: 'Projekt samt Inhalt löschen', exact: true });
  await expect(loeschen).toBeDisabled();
  const bestaetigung = dialog.getByRole('checkbox', {
    name: `Ja, das Projekt „${PROJEKT}“ mit allem Inhalt löschen`,
  });
  await bestaetigung.focus();
  await page.keyboard.press('Space');
  await expect(bestaetigung).toBeChecked();
  await loeschen.focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/$/);
  const projektVerweis = page.getByRole('link', { name: PROJEKT, exact: true });
  await expect(projektVerweis).toHaveCount(0);

  // Rückgängig: alles wieder da, mit derselben Projektdatei bis auf den Eintrag des Rückgängig am Ende des Protokolls.
  await page.keyboard.press('Control+Z');
  await expect(projektVerweis).toBeVisible();
  await projektVerweis.click();
  await expect(page.getByRole('heading', { level: 1, name: PROJEKT })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Rechnungen \(1\)/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modelle (1)' })).toBeVisible();
  const nachher = JSON.parse(
    await sichern(page, page.getByRole('button', { name: 'Projektdatei sichern' })),
  ) as { protokoll: { befehl: { art: string } }[] };
  expect(nachher.protokoll.at(-1)?.befehl.art).toBe('Rueckgaengig');
  expect({ ...nachher, protokoll: nachher.protokoll.slice(0, -1) }).toEqual(JSON.parse(sicherung));

  // Wiederholen löscht wieder (zurück zur Liste); ein weiteres Rückgängig holt es erneut.
  await page.keyboard.press('Control+Y');
  await expect(page).toHaveURL(/\/$/);
  await expect(projektVerweis).toHaveCount(0);
  await page.keyboard.press('Control+Z');
  await expect(projektVerweis).toBeVisible();
});

test('Projekt samt Inhalt löschen, dann die Sicherung einlesen: das Projekt ist wieder da', async ({
  page,
}) => {
  await beispielprojekt(page);
  const dialog = await samtInhaltOeffnen(page);
  const sicherung = await sichern(page, dialog.getByRole('button', { name: 'Projektdatei sichern' }));
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Projekt samt Inhalt löschen', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: PROJEKT, exact: true })).toHaveCount(0);

  await page.getByLabel('Projektdatei einlesen').setInputFiles({
    name: `${PROJEKT}.tethys.json`,
    mimeType: 'application/json',
    buffer: Buffer.from(sicherung),
  });
  await page.getByRole('link', { name: PROJEKT, exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: PROJEKT })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Rechnungen \(1\)/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Modelle (1)' })).toBeVisible();
});
