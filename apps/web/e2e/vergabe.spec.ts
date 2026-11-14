// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 149: Vergabe in der App. LV `typisch` über den Testpfad, die drei Angebote der Fixture als X84 über die Oberfläche.
// (1) Angebot bearbeiten (Preis berichtigen, Nachlass) und löschen mit Rückgängig; (2) Bieter verwalten: umbenennen,
// Anschrift, Löschen gesperrt und nach dem Löschen des Angebots möglich; (3) Zuschlag zurücknehmen mit Bestätigung und
// Sperre durch ein Aufmaßblatt; (4) Preisspiegel-Einstellungen am LV gespeichert (Neuladen); (5) Preisspiegel als PDF mit
// Vorschau und als Excel, Vergabevorschlag als PDF; (6) X84 eines vorhandenen Bieters bietet dessen Angaben an. Sollwerte:
// `typisch-angebote.json` und von Hand nach N2 daraus
// (01.0010: Menge 1,000, EP von Bieter A 1.814,850).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { alsText, liesPdf } from '../../../packages/ausgabe/src/pdftext';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';
import { erwartePunkt, werkzeug } from './werkzeuge';

interface FxBieter {
  readonly name: string;
  readonly datei: string;
  readonly summen: Readonly<Record<'netto' | 'nettoNachNachlass' | 'brutto', string>>;
}
const fx = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-angebote.json', import.meta.url), 'utf8'),
) as { preisspiegel: { bieter: readonly FxBieter[] } };
const BIETER = fx.preisspiegel.bieter;
const A = BIETER.find((b) => b.name === 'Bieter A') as FxBieter;
const datei = (rel: string): string => new URL(`../../../fixtures/${rel}`, import.meta.url).pathname;

const liste = (page: Page): Locator => page.getByRole('dialog', { name: 'Angebote' });
const angebotszeile = (page: Page, bieter: string): Locator =>
  page
    .getByRole('table', { name: 'Angebote dieses Leistungsverzeichnisses' })
    .getByRole('row', { name: new RegExp(bieter) });

/** Projekt, LV `typisch` und die drei Angebote; danach steht die LV-Seite mit offener Angebotsliste. */
async function mitDreiAngeboten(page: Page): Promise<string> {
  const inhalt = fixtureInhalt('typisch');
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
  for (const [i, b] of BIETER.entries()) {
    await page.getByLabel('Angebotsdatei wählen').setInputFiles(datei(b.datei));
    const dialog = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
    await expect(dialog.getByLabel('Bieter')).toHaveValue(b.name);
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(angebotszeile(page, b.name)).toBeVisible();
    if (i < BIETER.length - 1) {
      await liste(page).getByRole('button', { name: 'Schließen', exact: true }).last().click();
      await expect(liste(page)).toBeHidden();
    }
  }
  return inhalt.wurzelId;
}

async function listeSchliessen(page: Page): Promise<void> {
  await liste(page).getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(liste(page)).toBeHidden();
}

async function pdfAusDownload(page: Page, knopf: Locator): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent('download'), knopf.click()]);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 4).toString('latin1')).toBe('%PDF');
  return alsText(await liesPdf(new Uint8Array(bytes))).replace(/\s+/g, ' ');
}

test('Angebot bearbeiten: Preis berichtigen und Nachlass setzen; Angebot löschen mit Bestätigung und Rückgängig', async ({
  page,
}) => {
  await mitDreiAngeboten(page);
  await expect(angebotszeile(page, 'Bieter A').getByRole('cell').nth(2)).toHaveText(
    betragDe(A.summen.nettoNachNachlass),
  );

  await liste(page).getByRole('button', { name: 'Angebot bearbeiten: Bieter A' }).click();
  const bearbeiten = page.getByRole('dialog', { name: 'Angebot von „Bieter A“ bearbeiten' });
  await expect(bearbeiten.getByLabel('Preis 01.0010')).toHaveValue('1.814,850');
  await bearbeiten.getByLabel('Preis 01.0010').fill('1900');
  await bearbeiten.getByRole('combobox', { name: 'Nachlass' }).click();
  await page.getByRole('option', { name: 'in %' }).click();
  await bearbeiten.getByLabel('Wert des Nachlasses').fill('5');
  await bearbeiten.getByRole('button', { name: 'Änderungen speichern' }).click();
  // 55.481,84 + 85,15 = 55.566,99; 5 % = 2.778,35; nach Nachlass 52.788,64.
  await expect(angebotszeile(page, 'Bieter A').getByRole('cell').nth(1)).toHaveText('55.566,99');
  await expect(angebotszeile(page, 'Bieter A').getByRole('cell').nth(2)).toHaveText('52.788,64');

  // Eine unlesbare Eingabe wird am Feld gemeldet und nicht gesendet.
  await liste(page).getByRole('button', { name: 'Angebot bearbeiten: Bieter A' }).click();
  await bearbeiten.getByLabel('Preis 01.0010').fill('viel');
  await bearbeiten.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(bearbeiten.getByText('Bitte eine Zahl wie 12,50 eingeben.')).toBeVisible();
  // „nicht angeboten“: 55.481,84 − 1.814,85 = 53.666,99, Nachlass weg.
  await bearbeiten.getByLabel('nicht angeboten 01.0010').check();
  await bearbeiten.getByRole('combobox', { name: 'Nachlass' }).click();
  await page.getByRole('option', { name: 'kein Nachlass' }).click();
  await bearbeiten.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(angebotszeile(page, 'Bieter A').getByRole('cell').nth(2)).toHaveText('53.666,99');

  // Löschen fragt nach; danach fehlt das Angebot, Rückgängig holt es zurück.
  await liste(page).getByRole('button', { name: 'Angebot löschen: Bieter C' }).click();
  await expect(liste(page).getByRole('alert')).toContainText(
    'Das Angebot von „Bieter C“ mit allen Preisen löschen?',
  );
  await liste(page).getByRole('button', { name: 'Angebot löschen', exact: true }).click();
  await expect(angebotszeile(page, 'Bieter A')).toBeVisible();
  await expect(angebotszeile(page, 'Bieter C')).toHaveCount(0);
  await listeSchliessen(page);
  await erwartePunkt(page, 'Angebote', 'Angebote (2)');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await erwartePunkt(page, 'Angebote', 'Angebote (3)');
});

test('Bieter verwalten: Anschrift und Name ändern, Löschen gesperrt bis das Angebot gelöscht ist', async ({
  page,
}) => {
  await mitDreiAngeboten(page);
  await listeSchliessen(page);
  await werkzeug(page, 'Angebote', 'Bieter verwalten …');
  const dialog = page.getByRole('dialog', { name: 'Bieter des Projekts' });
  const zeileC = dialog.getByRole('row', { name: /Bieter C/ });
  await expect(zeileC.getByTestId('angebote')).toHaveText('1');

  // Mit Angebot: Löschen nennt den Grund und bietet nichts an.
  await dialog.getByRole('button', { name: 'Bieter löschen: Bieter C' }).click();
  await expect(dialog.getByRole('alert')).toContainText('hat noch 1 Angebot und lässt sich nicht löschen');
  await expect(dialog.getByRole('button', { name: 'Bieter löschen', exact: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).last().click();

  // Umbenennen und Anschrift in einem Schritt.
  await dialog.getByRole('button', { name: 'Bieter bearbeiten: Bieter C' }).click();
  const form = page.getByRole('dialog', { name: 'Bieter „Bieter C“ bearbeiten' });
  await form.getByLabel('Name').fill('Bieter C Bau');
  await form.getByLabel('Straße und Hausnummer').fill('Am Weg 3');
  await form.getByLabel('PLZ').fill('12345');
  await form.getByLabel('Ort').fill('Musterstadt');
  await form.getByRole('button', { name: 'Angaben speichern' }).click();
  const neu = dialog.getByRole('row', { name: /Bieter C Bau/ });
  await expect(neu.getByTestId('anschrift')).toHaveText('Am Weg 3, 12345 Musterstadt');
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).last().click();

  // Das Angebot trägt den neuen Namen; nach seinem Löschen lässt sich der Bieter löschen.
  await werkzeug(page, 'Angebote', 'Angebote (3)');
  await liste(page).getByRole('button', { name: 'Angebot löschen: Bieter C Bau' }).click();
  await liste(page).getByRole('button', { name: 'Angebot löschen', exact: true }).click();
  await expect(angebotszeile(page, 'Bieter C Bau')).toHaveCount(0);
  await listeSchliessen(page);
  await werkzeug(page, 'Angebote', 'Bieter verwalten …');
  await dialog.getByRole('button', { name: 'Bieter löschen: Bieter C Bau' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Den Bieter „Bieter C Bau“ löschen?');
  await dialog.getByRole('button', { name: 'Bieter löschen', exact: true }).click();
  await expect(dialog.getByRole('row', { name: /Bieter C/ })).toHaveCount(0);
  await expect(dialog.getByRole('row', { name: /Bieter A/ })).toBeVisible();
});

test('Zuschlag zurücknehmen: Bestätigung nennt die Kostenkontrolle; ein Aufmaßblatt sperrt und sagt, was zu tun ist', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const lvId = await mitDreiAngeboten(page);
  await listeSchliessen(page);
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  const bieter = page.getByRole('table', { name: 'Bieter des Preisspiegels' });
  await bieter.getByRole('button', { name: 'Zuschlag erteilen: Bieter A' }).click();
  await page
    .getByRole('dialog', { name: 'Zuschlag erteilen – Bieter A' })
    .getByRole('button', { name: 'Zuschlag erteilen', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  const auftragPfad = new URL(page.url()).pathname;

  await page.goto(`/lv/${lvId}/preisspiegel`);
  await expect(bieter.getByRole('button', { name: 'Zuschlag erteilen: Bieter A' })).toBeDisabled();
  await page.getByRole('button', { name: 'Zuschlag zurücknehmen …' }).click();
  const frage = page.getByRole('dialog', { name: 'Zuschlag zurücknehmen' });
  await expect(frage).toContainText('Der Zuschlag an „Bieter A“ wird zurückgenommen');
  await expect(frage).toContainText(
    `Der Auftragswert dieses Auftrags-LV von ${betragDe(A.summen.nettoNachNachlass)} € (netto nach Nachlass) entfällt dort.`,
  );
  await frage.getByRole('button', { name: 'Zuschlag zurücknehmen', exact: true }).click();
  await expect(frage).toBeHidden();
  await expect(bieter.getByRole('button', { name: 'Zuschlag erteilen: Bieter A' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Zuschlag zurücknehmen …' })).toHaveCount(0);

  // Rückgängig holt das Auftrags-LV zurück; mit einem Aufmaßblatt ist das Zurücknehmen gesperrt.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page).toHaveURL(new RegExp(`${auftragPfad}$`));
  await werkzeug(page, 'Abrechnung', 'Aufmaß');
  await page.getByRole('button', { name: 'Neues Aufmaßblatt' }).click();
  const neu = page.getByRole('dialog', { name: 'Neues Aufmaßblatt' });
  await neu.getByLabel('Bezeichnung').fill('Erdarbeiten');
  await neu.getByLabel('Bezeichnung').press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Erdarbeiten' })).toBeVisible();

  await page.goto(`/lv/${lvId}/preisspiegel`);
  await page.getByRole('button', { name: 'Zuschlag zurücknehmen …' }).click();
  await expect(frage.getByRole('alert')).toContainText('Der Zuschlag lässt sich nicht zurücknehmen');
  await expect(frage.getByRole('listitem')).toHaveText([
    '1 Aufmaßblatt: das Blatt auf der Seite „Abrechnung“ des Auftrags-LV löschen (vorher aus den Rechnungen nehmen).',
  ]);
  await expect(frage.getByRole('button', { name: 'Zuschlag zurücknehmen', exact: true })).toHaveCount(0);
});

test('Preisspiegel: Einstellungen am LV gespeichert; PDF mit Vorschau, Excel und Vergabevorschlag', async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Das Büro (Absender) gilt für alle Projekte und steht im Kopf der PDFs.
  await page.goto('/');
  await page.getByRole('button', { name: 'Büro (Absender) …' }).click();
  const buero = page.getByRole('dialog', { name: 'Büro (Absender)' });
  await buero.getByLabel('Name des Büros').fill('Planungsbüro Muster');
  await buero.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Büro gespeichert').first()).toBeVisible();
  await buero.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(buero).toBeHidden();

  const lvId = await mitDreiAngeboten(page);
  await listeSchliessen(page);
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  const schwelle = page.getByLabel('Ausreißer-Schwelle');
  await schwelle.fill('100');
  await schwelle.press('Enter');
  await expect(
    page.getByRole('treegrid', { name: 'Preisspiegel' }).locator('[data-kennzeichen="hoch"]'),
  ).toHaveCount(0);
  // A über B wird am Feld gemeldet und nicht gespeichert.
  const abcA = page.getByLabel('ABC-Schwelle A');
  await abcA.fill('99');
  await abcA.press('Enter');
  await expect(page.getByText('Die Schwelle A darf nicht über der Schwelle B liegen.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Ausreißer-Schwelle')).toHaveValue('100,00');
  await expect(page.getByLabel('ABC-Schwelle A')).toHaveValue('80,00');

  // Preisspiegel als PDF: erst die Vorschau, dann herunterladen; der Text nennt die Summen.
  await werkzeug(page, 'Ausgabe', 'Preisspiegel als PDF …');
  const pdf = page.getByRole('dialog', { name: 'Preisspiegel als PDF' });
  await expect(pdf.getByTestId('pdf-dateiname')).toHaveText('Preisspiegel Typisch Musterhaus erfunden.pdf');
  await expect(pdf.getByRole('button', { name: 'Herunterladen' })).toBeDisabled();
  await pdf.getByRole('button', { name: 'Vorschau erzeugen' }).click();
  await expect(pdf.locator('iframe[title="Vorschau des PDF"]')).toBeVisible({ timeout: 60_000 });
  const text = await pdfAusDownload(page, pdf.getByRole('button', { name: 'Herunterladen' }));
  expect(text).toContain('Planungsbüro Muster');
  expect(text).toContain('Musterhaus');
  for (const b of BIETER) {
    expect(text).toContain(b.name);
    expect(text).toContain(betragDe(b.summen.nettoNachNachlass));
    expect(text).toContain(betragDe(b.summen.brutto));
  }
  await expect(pdf).toBeHidden();

  // Excel: eine Arbeitsmappe (ZIP).
  await werkzeug(page, 'Ausgabe', 'Preisspiegel als Excel …');
  const excel = page.getByRole('dialog', { name: 'Preisspiegel als Excel' });
  await expect(excel.getByTestId('excel-dateiname')).toHaveText(
    'Preisspiegel Typisch Musterhaus erfunden.xlsx',
  );
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    excel.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  expect(
    readFileSync(await download.path())
      .subarray(0, 2)
      .toString('latin1'),
  ).toBe('PK');

  // Vergabevorschlag mit Begründung.
  await werkzeug(page, 'Ausgabe', 'Vergabevorschlag …');
  const vorschlag = page.getByRole('dialog', { name: 'Vergabevorschlag als PDF' });
  await vorschlag.getByLabel('Begründung').fill('Wirtschaftlichstes Angebot nach Prüfung.');
  await vorschlag.getByRole('button', { name: 'Vorschau erzeugen' }).click();
  await expect(vorschlag.locator('iframe[title="Vorschau des PDF"]')).toBeVisible({ timeout: 60_000 });
  const vtext = await pdfAusDownload(page, vorschlag.getByRole('button', { name: 'Herunterladen' }));
  expect(vtext).toContain('Wirtschaftlichstes Angebot nach Prüfung.');
  expect(vtext).toContain('Planungsbüro Muster');
  expect(vtext).toContain(betragDe(A.summen.brutto));
  expect(page.url()).toContain(lvId);
});

const AVA = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021';

test('X84 eines vorhandenen Bieters mit anderen Angaben: die App bietet an, sie zu übernehmen (ein Undo-Schritt)', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const pfad = (rel: string): string => new URL(`../../../${rel}`, import.meta.url).pathname;
  await projektAnlegen(page, 'Prüfdatei', 'BVBS');
  await page.getByLabel('GAEB-Datei wählen').setInputFiles(pfad(`${AVA}.X81`));
  const lvDialog = page.getByRole('dialog', { name: 'GAEB-Datei einlesen' });
  await lvDialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(lvDialog).toBeHidden();
  await page.getByRole('link', { name: 'BVBS GAEB AVA' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'BVBS GAEB AVA' })).toBeVisible();

  // Erstes Einlesen: neuer Bieter mit der Anschrift der Datei.
  const einlesen = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await page.getByLabel('Angebotsdatei wählen').setInputFiles(pfad(`${AVA}.X84`));
  await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
  await listeSchliessen(page);
  await werkzeug(page, 'Angebote', 'Bieter verwalten …');
  const bieter = page.getByRole('dialog', { name: 'Bieter des Projekts' });
  const zeile = bieter.getByRole('row', { name: /Pinsel und Co KG/ });
  await expect(zeile.getByTestId('anschrift')).toHaveText('Auswegstr. 33, 12345 Musterstadt');

  // Die Anschrift von Hand ändern; dann weicht die Datei ab.
  await bieter.getByRole('button', { name: /^Bieter bearbeiten: / }).click();
  const form = page.getByRole('dialog', { name: /bearbeiten$/ });
  await form.getByLabel('Straße und Hausnummer').fill('Neuer Weg 1');
  await form.getByRole('button', { name: 'Angaben speichern' }).click();
  await expect(zeile.getByTestId('anschrift')).toHaveText('Neuer Weg 1, 12345 Musterstadt');
  await bieter.getByRole('button', { name: 'Schließen', exact: true }).last().click();

  // Zweites Einlesen: Der vorhandene Bieter wird nicht still überschrieben; die App bietet die Angaben an.
  await page.getByLabel('Angebotsdatei wählen').setInputFiles(pfad(`${AVA}.X84`));
  await expect(einlesen).toContainText('seine gespeicherten Angaben weichen von denen der Datei ab');
  const uebernehmen = einlesen.getByLabel('Angaben der Datei für den vorhandenen Bieter übernehmen');
  await expect(uebernehmen).not.toBeChecked();
  await uebernehmen.check();
  await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(liste(page).getByRole('row', { name: /Pinsel und Co KG/ })).toHaveCount(2);
  await listeSchliessen(page);
  await werkzeug(page, 'Angebote', 'Bieter verwalten …');
  await expect(zeile.getByTestId('anschrift')).toHaveText('Auswegstr. 33, 12345 Musterstadt');
  await expect(zeile.getByTestId('angebote')).toHaveText('2');
  await bieter.getByRole('button', { name: 'Schließen', exact: true }).last().click();

  // Angaben und Angebot sind ein Schritt: ein Rückgängig nimmt beide zurück.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await erwartePunkt(page, 'Angebote', 'Angebote (1)');
  await werkzeug(page, 'Angebote', 'Bieter verwalten …');
  await expect(zeile.getByTestId('anschrift')).toHaveText('Neuer Weg 1, 12345 Musterstadt');
});
