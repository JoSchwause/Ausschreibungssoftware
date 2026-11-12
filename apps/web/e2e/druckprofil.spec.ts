// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (O3): Druckprofile im Druckdialog. Profil wählen → der Text des PDF enthält oder enthält nicht die Preise;
// eigenes Profil anlegen (bleibt nach dem Neuladen), exportieren, löschen, importieren (Befunde sichtbar).

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';

const projektIdAusUrl = (page: Page): string =>
  decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');

async function typischOeffnen(page: Page): Promise<void> {
  const inhalt = fixtureInhalt('typisch');
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

async function pdfText(page: Page): Promise<string> {
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'PDF erzeugen' }).click(),
  ]);
  const bytes = readFileSync(await download.path());
  return alsText(await liesPdf(new Uint8Array(bytes))).replace(/\s+/g, ' ');
}

async function profilWaehlen(page: Page, name: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await dialog.getByRole('combobox', { name: 'Druckprofil' }).click();
  await page.getByRole('option', { name, exact: true }).click();
}

test('Druckprofil wählen: Ausschreibung ohne Preise, Kostenanschlag und Auftrags-LV mit Preisen', async ({
  page,
}) => {
  await typischOeffnen(page);
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });

  await profilWaehlen(page, 'Ausschreibung mit Langtext ohne Preise');
  await expect(dialog.getByRole('combobox', { name: 'Inhalt' })).toContainText('ohne Preise');
  const ohne = await pdfText(page);
  expect(ohne).toContain('Typisch: Musterhaus (erfunden)');
  expect(ohne).not.toContain(NETTO);

  await page.getByRole('button', { name: 'Als PDF' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('ohne Preise'); // zuletzt gewählt
  await profilWaehlen(page, 'Kostenanschlag mit Preisen, nur Kurztext');
  expect(await pdfText(page)).toContain(NETTO);

  await page.getByRole('button', { name: 'Als PDF' }).click();
  await profilWaehlen(page, 'Auftrags-LV mit Preisen');
  expect(await pdfText(page)).toContain(NETTO);
});

test('Eigenes Profil: anlegen, bleibt nach dem Neuladen, exportieren, löschen, wieder importieren', async ({
  page,
}) => {
  await typischOeffnen(page);
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });

  // Ein Standardprofil lässt sich nicht löschen; die Kopie unter eigenem Namen schon.
  await profilWaehlen(page, 'Auftrags-LV mit Preisen');
  await expect(dialog.getByRole('button', { name: 'Profil löschen' })).toBeDisabled();
  await dialog.getByRole('combobox', { name: 'Inhalt' }).click();
  await page.getByRole('option', { name: /ohne Preise/ }).click();
  await dialog.getByLabel('Name des Profils').fill('Bieter ohne Preise');
  await dialog.getByRole('button', { name: 'Als neues Profil speichern' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Bieter ohne Preise');
  expect(await pdfText(page)).not.toContain(NETTO);

  // Ein vergebener Name wird abgewiesen, nichts wird überschrieben.
  await page.getByRole('button', { name: 'Als PDF' }).click();
  await dialog.getByLabel('Name des Profils').fill('Bieter ohne Preise');
  await dialog.getByRole('button', { name: 'Als neues Profil speichern' }).click();
  await expect(dialog.getByRole('alert')).toContainText('schon vergeben');

  // Als Einstellung des Nutzers: nach dem Neuladen noch da und gewählt.
  await page.reload();
  await page.getByRole('button', { name: 'Als PDF' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Bieter ohne Preise');

  const [export_] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Profil exportieren' }).click(),
  ]);
  expect(export_.suggestedFilename()).toBe('Bieter ohne Preise.druckprofil.json');
  const json = readFileSync(await export_.path(), 'utf8');
  expect((JSON.parse(json) as { mitPreisen: boolean }).mitPreisen).toBe(false);

  await dialog.getByRole('button', { name: 'Profil löschen' }).click();
  await dialog.getByRole('combobox', { name: 'Druckprofil' }).click();
  await expect(page.getByRole('option', { name: 'Bieter ohne Preise' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await dialog.getByLabel('Profil-Datei wählen').setInputFiles({
    name: 'bieter.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json.replace('}\n', ',"blub":1}\n')),
  });
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Bieter ohne Preise');
  await expect(dialog.getByRole('region', { name: 'Befunde beim Lesen des Profils' })).toContainText('blub');
  await expect(dialog.getByRole('combobox', { name: 'Inhalt' })).toContainText('ohne Preise');

  // Eine fremde Datei meldet den Befund und ändert nichts.
  await dialog.getByLabel('Profil-Datei wählen').setInputFiles({
    name: 'x.json',
    mimeType: 'application/json',
    buffer: Buffer.from('kein json'),
  });
  await expect(dialog.getByRole('region', { name: 'Befunde beim Lesen des Profils' })).toContainText(
    'kein Druckprofil',
  );
});

// Q5 (Review Welle 5, P7): Unlesbare und doppelte gespeicherte Profile fallen nicht still weg.
test('Unlesbare und doppelte gespeicherte Profile: Hinweis im Dialog, beim Speichern bleiben sie erhalten', async ({
  page,
}) => {
  await typischOeffnen(page);
  const ablage = (): Promise<unknown[]> =>
    page.evaluate(() => JSON.parse(window.localStorage.getItem('tethys-druckprofile') ?? '[]') as unknown[]);
  await page.evaluate(() => {
    window.localStorage.setItem('tethys-druckprofile', '[42]');
  });

  // Ein gültiges eigenes Profil über die Oberfläche; der unlesbare Eintrag 42 bleibt dahinter stehen.
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await dialog.getByLabel('Name des Profils').fill('Mein Profil');
  await dialog.getByRole('button', { name: 'Als neues Profil speichern' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Mein Profil');
  const liste = await ablage();
  expect(liste.slice(1)).toEqual([42]);
  // Dasselbe Profil noch einmal unter demselben Namen ablegen (wie aus einer älteren Fassung der App).
  await page.evaluate(
    (text) => {
      window.localStorage.setItem('tethys-druckprofile', text);
    },
    JSON.stringify([liste[0], { ...(liste[0] as object), titelsummen: false }, 42]),
  );

  await page.reload();
  await page.getByRole('button', { name: 'Als PDF' }).click();
  const hinweis = dialog.getByRole('region', { name: 'Nicht verwendete gespeicherte Profile' });
  await expect(hinweis).toContainText('Ein weiteres gespeichertes Profil heißt „Mein Profil“.');
  await expect(hinweis).toContainText('lässt sich nicht als Druckprofil lesen');

  // Ein weiteres Profil speichern: Die zurückgehaltenen Einträge stehen danach unverändert in der Ablage.
  await dialog.getByLabel('Name des Profils').fill('Noch eins');
  await dialog.getByRole('button', { name: 'Als neues Profil speichern' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Noch eins');
  const danach = (await ablage()) as ({ name: string; titelsummen: boolean } | number)[];
  expect(danach.map((p) => (typeof p === 'number' ? p : p.name))).toEqual([
    'Mein Profil',
    'Noch eins',
    'Mein Profil',
    42,
  ]);
  expect(danach[2]).toMatchObject({ titelsummen: false });
});
