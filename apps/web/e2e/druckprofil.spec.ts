// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 90 (O3): Druckprofile im Druckdialog. Profil wählen → der Text des PDF enthält oder enthält nicht die Preise;
// eigenes Profil anlegen (bleibt nach dem Neuladen), exportieren, löschen, importieren (Befunde sichtbar).

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';
import { werkzeug } from './werkzeuge';

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

/** Öffnet die Auswahl der Druckprofile, prüft, ob `name` darin steht, und schließt sie wieder. */
async function profilInAuswahl(page: Page, name: string, vorhanden: boolean): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await dialog.getByRole('combobox', { name: 'Druckprofil' }).click();
  const liste = page.getByRole('listbox');
  await expect(liste.getByRole('option', { name, exact: true })).toHaveCount(vorhanden ? 1 : 0);
  // Radix setzt den Fokus in die Liste über einen Zeitgeber; erst danach schließt Escape die Liste (nicht den Dialog).
  await expect(liste.locator(':focus')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(liste).toHaveCount(0);
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
  await werkzeug(page, 'Ausgabe', 'Als PDF');
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });

  await profilWaehlen(page, 'Ausschreibung mit Langtext ohne Preise');
  await expect(dialog.getByRole('combobox', { name: 'Inhalt' })).toContainText('ohne Preise');
  const ohne = await pdfText(page);
  expect(ohne).toContain('Typisch: Musterhaus (erfunden)');
  expect(ohne).not.toContain(NETTO);

  await werkzeug(page, 'Ausgabe', 'Als PDF');
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('ohne Preise'); // zuletzt gewählt
  await profilWaehlen(page, 'Kostenanschlag mit Preisen, nur Kurztext');
  expect(await pdfText(page)).toContain(NETTO);

  await werkzeug(page, 'Ausgabe', 'Als PDF');
  await profilWaehlen(page, 'Auftrags-LV mit Preisen');
  expect(await pdfText(page)).toContain(NETTO);
});

test('Eigenes Profil: anlegen, bleibt nach dem Neuladen, exportieren, löschen, wieder importieren', async ({
  page,
}) => {
  await typischOeffnen(page);
  await werkzeug(page, 'Ausgabe', 'Als PDF');
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
  await werkzeug(page, 'Ausgabe', 'Als PDF');
  await dialog.getByLabel('Name des Profils').fill('Bieter ohne Preise');
  await dialog.getByRole('button', { name: 'Als neues Profil speichern' }).click();
  await expect(dialog.getByRole('alert')).toContainText('schon vergeben');

  // Als Einstellung des Nutzers: nach dem Neuladen noch da und gewählt.
  await page.reload();
  await werkzeug(page, 'Ausgabe', 'Als PDF');
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Bieter ohne Preise');

  const [export_] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Profil sichern' }).click(),
  ]);
  expect(export_.suggestedFilename()).toBe('Bieter ohne Preise.druckprofil.json');
  const json = readFileSync(await export_.path(), 'utf8');
  expect((JSON.parse(json) as { mitPreisen: boolean }).mitPreisen).toBe(false);

  // Ticket 150: Löschen fragt vorher; „Einstellung rückgängig“ holt das Profil zurück (eigenes Rückgängig der Einstellungen).
  const frage = page.getByRole('dialog', { name: 'Profil löschen?' });
  await dialog.getByRole('button', { name: 'Profil löschen' }).click();
  await frage.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Bieter ohne Preise');
  await dialog.getByRole('button', { name: 'Profil löschen' }).click();
  await frage.getByRole('button', { name: 'Profil löschen' }).click();
  await profilInAuswahl(page, 'Bieter ohne Preise', false);
  await dialog.getByRole('button', { name: 'Einstellung rückgängig' }).click();
  await profilInAuswahl(page, 'Bieter ohne Preise', true);
  await dialog.getByRole('button', { name: 'Einstellung wiederholen' }).click();
  await profilInAuswahl(page, 'Bieter ohne Preise', false);

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

// Q5 (Review Welle 5, P7): Unlesbare und doppelte gespeicherte Profile fallen nicht still weg. Ticket 150: Die eigenen Profile
// stehen in den Einstellungen; aus dem alten Browserspeicher kommt einmalig, was als Profil gilt, der Rest bleibt dort und
// erscheint im Dialog.
test('Unlesbare und doppelte Profile im alten Browserspeicher: Hinweis im Dialog, sie bleiben dort erhalten', async ({
  page,
}) => {
  const mein = {
    name: 'Mein Profil',
    mitPreisen: false,
    langtext: { art: 'voll' },
    titelsummen: true,
    schlussblock: true,
    deckblatt: true,
    kopfzeile: null,
    fusszeile: null,
    seitenrand: 'normal',
  };
  const ablage = (): Promise<unknown[]> =>
    page.evaluate(() => JSON.parse(window.localStorage.getItem('tethys-druckprofile') ?? '[]') as unknown[]);
  await page.goto('/');
  await page.evaluate(
    (text) => {
      window.localStorage.setItem('tethys-druckprofile', text);
    },
    JSON.stringify([mein, { ...mein, titelsummen: false }, 42]),
  );
  // Das Öffnen lädt die App neu: Die Übernahme läuft, solange das Einstellungsprotokoll leer ist.
  await typischOeffnen(page);
  await werkzeug(page, 'Ausgabe', 'Als PDF');
  const dialog = page.getByRole('dialog', { name: 'LV als PDF ausgeben' });
  await dialog.getByRole('combobox', { name: 'Druckprofil' }).click();
  await expect(page.getByRole('option', { name: 'Mein Profil', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  const hinweis = dialog.getByRole('region', { name: 'Nicht verwendete gespeicherte Profile' });
  await expect(hinweis).toContainText('Ein weiteres gespeichertes Profil heißt „Mein Profil“.');
  await expect(hinweis).toContainText('lässt sich nicht als Druckprofil lesen');

  // Ein weiteres Profil kommt in die Einstellungen; der alte Browserspeicher bleibt unverändert.
  await dialog.getByLabel('Name des Profils').fill('Noch eins');
  await dialog.getByRole('button', { name: 'Als neues Profil speichern' }).click();
  await expect(dialog.getByRole('combobox', { name: 'Druckprofil' })).toContainText('Noch eins');
  expect(await ablage()).toHaveLength(3);

  // Ticket 121 (D-92.6): Zahl der nicht lesbaren Einträge, Sicherung als Datei, Entfernen erst nach Bestätigung.
  await expect(hinweis).toContainText('1 Eintrag konnte nicht gelesen werden.');
  const [datei] = await Promise.all([
    page.waitForEvent('download'),
    hinweis.getByRole('button', { name: 'Einträge als Datei sichern' }).click(),
  ]);
  const gesichert = JSON.parse(readFileSync(await datei.path(), 'utf8')) as unknown[];
  expect(gesichert).toHaveLength(2);
  expect(gesichert).toContain(42);

  await hinweis.getByRole('button', { name: 'Einträge entfernen' }).click();
  const frage = page.getByRole('dialog', { name: 'Nicht verwendete Einträge entfernen?' });
  await frage.getByRole('button', { name: 'Abbrechen' }).click();
  expect(await ablage()).toHaveLength(3);
  await hinweis.getByRole('button', { name: 'Einträge entfernen' }).click();
  await frage.getByRole('button', { name: 'Endgültig entfernen' }).click();
  await expect(hinweis).toHaveCount(0);
  expect((await ablage()).map((p) => (p as { name: string }).name)).toEqual(['Mein Profil']);
});
