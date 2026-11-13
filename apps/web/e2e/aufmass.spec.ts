// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87 (A2, M3): Aufmaßblätter, Soll/Ist und X31 in der App. Auftrags-LV aus `typisch` mit dem Angebot von Bieter A
// (X84, Zuschlag über die Oberfläche, wie Tor M3) → Blatt 1 mit zwei Ansätzen (Mengenermittlung, nur Tastatur) →
// Soll/Ist zeigt Ist und einen Befund über 110 % → Rückgängig/Wiederholen → Neuladen; X31 des Blatts ausgeben und als
// Blatt 2 wieder einlesen (die BVBS-Prüfdatei passt nicht zu `typisch`: nur Befunde, kein Blatt).
//
// Erwartete Zahlen aus den Fixtures (`typisch.json`: Mengen; `typisch-angebote.json`: EP, GP, Titelsummen, Netto von
// Bieter A) und von Hand nach N2 hergeleitet:
// - 02.0020 Baugrube ausheben, Soll 318,200 m³, EP 9,825: Ist 12,5 × 8 × 3 + 2 × 30 = 300 + 60 = 360,000;
//   Differenz 41,800; 360 / 318,2 × 100 = 113,136… → 113,14 % > 110 % (Befund, VOB/B § 2 Abs. 3, D-35);
//   GP Ist = 360 × 9,825 = 3.537,00.
// - 01.0020 Bauzaun stellen, Soll 86,500 m, EP 7,227: Ist 40 + 40 = 80,000 → 92,49 %, kein Befund (ohne
//   Schlussrechnung keiner unter 90 %); GP Ist = round(80 × 7,227, 2) = round(578,16) = 578,16.
// - Gesamt GP Ist = 3.537,00 + 578,16 = 4.115,16; GP Soll = Netto von Bieter A = 55.481,84.

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { erwarteMeldung, projektAnlegen } from './hilfen';
import { werkzeug } from './werkzeuge';

const wurzel = new URL('../../../fixtures/', import.meta.url);
const datei = (rel: string): string => new URL(rel, wurzel).pathname;

const blattGrid = (page: Page): Locator =>
  page.getByRole('treegrid', { name: 'Positionen des Aufmaßblatts' });
const sollIstGrid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Soll/Ist je Position' });
const zeile = (grid: Locator, oz: string): Locator =>
  grid.locator('[role="row"]', {
    has: grid.page().locator(`[data-spalte="oz"] .tx-grid__text`, { hasText: new RegExp(`^${oz}$`) }),
  });
const wert = (grid: Locator, oz: string, spalte: string): Locator =>
  zeile(grid, oz).locator(`[data-spalte="${spalte}"] .tx-grid__text`);
const panel = (page: Page): Locator => page.getByRole('dialog', { name: /^Mengenermittlung/ });

/** Projekt, LV `typisch`, Angebot von Bieter A, Zuschlag: endet auf der Seite des Auftrags-LV. */
async function auftragAnlegen(page: Page): Promise<void> {
  const inhalt = fixtureInhalt('typisch');
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await page.getByLabel('Angebotsdatei wählen').setInputFiles(datei('angebote/typisch-bieter-a.x84'));
  await page
    .getByRole('dialog', { name: 'Angebot (X84) einlesen' })
    .getByRole('button', { name: 'Übernehmen' })
    .click();
  const liste = page.getByRole('dialog', { name: 'Angebote' });
  await expect(liste.getByRole('row', { name: /Bieter A/ })).toBeVisible();
  await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await werkzeug(page, 'Angebote', 'Preisspiegel');
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: 'Zuschlag erteilen: Bieter A' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Zuschlag erteilen – Bieter A' });
  await dialog.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
}

/** Öffnet die Mengenermittlung an der Zeile (Klick, dann Enter) und tippt die Ausdrücke, je Zeile einer. */
async function ansatzTippen(
  page: Page,
  oz: string,
  ausdruecke: readonly string[],
  summe: string,
): Promise<void> {
  await zeile(blattGrid(page), oz).locator('[data-spalte="kurztext"]').click();
  await page.keyboard.press('Enter');
  const p = panel(page);
  await expect(p).toBeVisible();
  await expect(p.getByLabel('Ausdruck Zeile 1')).toBeFocused();
  for (const [i, a] of ausdruecke.entries()) {
    if (i > 0) await page.keyboard.press('Enter'); // neue Zeile
    await page.keyboard.type(a);
  }
  await expect(p.locator('[data-wert="summe"]')).toHaveText(summe);
  await page.keyboard.press('Control+Enter');
  await expect(p).toHaveCount(0);
}

async function sollIstPruefen(page: Page, mitZaun: boolean): Promise<void> {
  const g = sollIstGrid(page);
  await expect(wert(g, '02.0020', 'soll')).toHaveText('318,200');
  await expect(wert(g, '02.0020', 'ist')).toHaveText('360,000');
  await expect(wert(g, '02.0020', 'differenz')).toHaveText('41,800');
  await expect(wert(g, '02.0020', 'anteil')).toHaveText('113,14 %');
  await expect(wert(g, '02.0020', 'gpSoll')).toHaveText('3.126,32');
  await expect(wert(g, '02.0020', 'gpIst')).toHaveText('3.537,00');
  await expect(wert(g, '02.0020', 'befund')).toHaveText('über 110,00 %');
  await expect(zeile(g, '02.0020').locator('[data-kennzeichen="ueber-schwelle"]')).toBeVisible();
  await expect(wert(g, '01.0020', 'ist')).toHaveText(mitZaun ? '80,000' : '0,000');
  await expect(wert(g, '01.0020', 'befund')).toHaveText('');
  const gesamt = g.locator('.tx-grid__zeile--summe');
  await expect(gesamt.locator('[data-spalte="gpSoll"] .tx-grid__text')).toHaveText('55.481,84');
  await expect(gesamt.locator('[data-spalte="gpIst"] .tx-grid__text')).toHaveText(
    mitZaun ? '4.115,16' : '3.537,00',
  );
  const befunde = page.getByRole('region', { name: 'Befunde', exact: true });
  await expect(befunde.getByRole('button')).toHaveText([
    '02.0020 Baugrube ausheben: Ist 113,14 % der Auftragsmenge (über 110,00 %)',
  ]);
}

test('Aufmaßblatt mit zwei Ansätzen → Soll/Ist mit Befund → Undo/Redo → Neuladen → X31 aus und wieder ein', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await auftragAnlegen(page);

  // Aufmaß: noch kein Blatt; „Neues Aufmaßblatt“ fragt Bezeichnung und Datum und öffnet Blatt 1.
  await werkzeug(page, 'Abrechnung', 'Aufmaß');
  await expect(page.getByRole('heading', { level: 1, name: /^Aufmaß – / })).toBeVisible();
  await expect(page.getByText('Noch kein Aufmaßblatt.')).toBeVisible();
  await page.getByRole('button', { name: 'Neues Aufmaßblatt' }).click();
  const neu = page.getByRole('dialog', { name: 'Neues Aufmaßblatt' });
  await expect(neu.getByLabel('Bezeichnung')).toBeFocused();
  await page.keyboard.type('Erdarbeiten');
  await neu.getByLabel('Datum (TT.MM.JJJJ)').fill('2.11.2026');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Erdarbeiten' })).toBeVisible();
  await expect(page.getByTestId('blatt-datum')).toHaveText('Datum 02.11.2026');
  const blattPfad = new URL(page.url()).pathname;

  // Zwei Ansätze über die Mengenermittlung (Enter auf der Zeile, Strg+Enter übernimmt).
  const g = blattGrid(page);
  await expect(wert(g, '02.0020', 'auftragsmenge')).toHaveText('318,200');
  await ansatzTippen(page, '02.0020', ['12,5*8*3', '2*30'], '360,000');
  await expect(wert(g, '02.0020', 'blattmenge')).toHaveText('360,000');
  await expect(zeile(g, '02.0020').locator('[data-kennzeichen="mengenansatz"]')).toBeVisible();
  await expect(wert(g, '02.0020', 'kumuliert')).toHaveText('360,000');
  await ansatzTippen(page, '01.0020', ['40', '40'], '80,000');
  await expect(wert(g, '01.0020', 'blattmenge')).toHaveText('80,000');
  // Eine Zuschlagsposition wird nicht aufgemessen.
  await zeile(g, '02.0050A').locator('[data-spalte="kurztext"]').click();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toHaveCount(0);
  await erwarteMeldung(page, 'Zuschlagspositionen werden nicht aufgemessen');
  // Rückgängig/Wiederholen auf dem Blatt per Tastatur: Strg+Z nimmt die Zeile zurück, Strg+Y bringt sie wieder.
  await zeile(g, '01.0020').locator('[data-spalte="kurztext"]').click();
  await page.keyboard.press('Control+z');
  await expect(wert(g, '01.0020', 'blattmenge')).toHaveText('');
  await expect(wert(g, '02.0020', 'blattmenge')).toHaveText('360,000');
  await page.keyboard.press('Control+y');
  await expect(wert(g, '01.0020', 'blattmenge')).toHaveText('80,000');
  await expect(page).toHaveURL(new RegExp(`${blattPfad}$`));

  // Soll/Ist: Ist, Differenz, %, GP und der Befund über 110 %, per Tastatur erreichbar.
  await page.getByRole('toolbar').getByRole('link', { name: 'Soll/Ist' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Soll\/Ist – / })).toBeVisible();
  await sollIstPruefen(page, true);
  await page.getByRole('region', { name: 'Befunde', exact: true }).getByRole('button').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toHaveAttribute('data-spalte', 'befund');
  await expect(page.locator(':focus')).toHaveAccessibleDescription(/über der oberen Schwelle/);

  // Rückgängig nimmt die zweite Zeile zurück (Soll/Ist bleibt offen), Wiederholen bringt sie wieder.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await sollIstPruefen(page, false);
  await expect(page).toHaveURL(/\/soll-ist$/);
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await sollIstPruefen(page, true);

  // Neuladen: alles gespeichert (U7), auch das Blatt mit seinen Ansätzen.
  await page.reload();
  await sollIstPruefen(page, true);
  await page.goto(blattPfad);
  await expect(wert(blattGrid(page), '01.0020', 'blattmenge')).toHaveText('80,000');
  await zeile(blattGrid(page), '02.0020').locator('[data-spalte="kurztext"]').click();
  await page.keyboard.press('F2');
  await expect(panel(page).getByLabel('Ausdruck Zeile 2')).toHaveValue('2*30');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);

  // Als X31 ausgeben (Download) …
  await page.getByRole('button', { name: 'Als X31 ausgeben' }).click();
  const aus = page.getByRole('dialog', { name: 'Aufmaßblatt als GAEB X31 ausgeben' });
  await expect(aus.getByTestId('ausgabe-dateiname')).toHaveText('Typisch Musterhaus erfunden Aufmass 1.x31');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    aus.getByRole('button', { name: 'Herunterladen' }).click(),
  ]);
  const x31 = join(mkdtempSync(join(tmpdir(), 'tethys-x31-')), download.suggestedFilename());
  await download.saveAs(x31);
  await aus.getByRole('button', { name: 'Schließen', exact: true }).last().click();

  // … und als Blatt 2 wieder einlesen: dieselben Mengen, kumuliert verdoppelt.
  await page.getByRole('link', { name: 'Zu den Aufmaßblättern' }).click();
  await page.getByLabel('X31-Datei wählen').setInputFiles(x31);
  const ein = page.getByRole('dialog', { name: 'Mengenermittlung (X31) einlesen' });
  await expect(ein.getByTestId('x31-zusammenfassung')).toHaveText(
    '2 Positionen mit Menge oder Mengenansatz; es entsteht Aufmaßblatt 2.',
  );
  await expect(ein.getByLabel('Bezeichnung')).toHaveValue('Typisch Musterhaus erfunden Aufmass 1');
  await ein.getByLabel('Bezeichnung').fill('Rücklauf X31');
  await ein.getByRole('button', { name: 'Blatt anlegen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 2 – Rücklauf X31' })).toBeVisible();
  await expect(wert(blattGrid(page), '02.0020', 'blattmenge')).toHaveText('360,000');
  await expect(wert(blattGrid(page), '02.0020', 'kumuliert')).toHaveText('720,000');
  await expect(wert(blattGrid(page), '01.0020', 'kumuliert')).toHaveText('160,000');

  // Die Liste zeigt beide Blätter mit Nummer, Bezeichnung, Datum und Zahl der Positionen.
  await page.getByRole('link', { name: 'Zu den Aufmaßblättern' }).click();
  const tabelle = page.getByRole('table', { name: 'Aufmaßblätter' });
  await expect(tabelle.locator('tbody tr')).toHaveText([
    /^1\s*Erdarbeiten\s*02\.11\.2026\s*2$/,
    /^2\s*Rücklauf X31\s*2$/,
  ]);

  // Die BVBS-Prüfdatei passt nicht zu `typisch`: Befunde, kein Blatt (U5: nichts gesperrt, nur nichts zu übernehmen).
  await page
    .getByLabel('X31-Datei wählen')
    .setInputFiles(
      datei('extern/bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x31'),
    );
  await expect(ein.getByTestId('x31-zusammenfassung')).toHaveText(
    'Die Datei enthält keine Zeile zu einer Position dieses Auftrags-LV; es entsteht kein Blatt.',
  );
  await expect(ein.getByRole('region', { name: 'Befunde der Datei' })).toContainText('position-unbekannt');
  await expect(ein.getByRole('button', { name: 'Blatt anlegen' })).toBeDisabled();
  await ein.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(tabelle.locator('tbody tr')).toHaveCount(2);
});

test('Menge ohne Ansatz, Blattkopf ändern, Zeile entfernen und Blatt löschen, jeweils mit Rückgängig', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await auftragAnlegen(page);
  await werkzeug(page, 'Abrechnung', 'Aufmaß');
  await page.getByRole('button', { name: 'Neues Aufmaßblatt' }).click();
  await page.keyboard.press('Enter'); // ohne Bezeichnung und Datum
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1' })).toBeVisible();
  const g = blattGrid(page);

  // Menge ohne Ansatz: Strg+Alt+E öffnet das Panel an der aktiven Zeile; das Feld nimmt eine Zahl (auch negativ).
  await zeile(g, '03.0010').locator('[data-spalte="kurztext"]').click();
  await page.keyboard.press('Control+Alt+KeyE');
  const p = panel(page);
  await expect(p).toBeVisible();
  await p.getByLabel('Menge ohne Ansatz').fill('12,5');
  await p.getByLabel('Menge ohne Ansatz').press('Enter');
  await expect(p).toHaveCount(0);
  await expect(wert(g, '03.0010', 'blattmenge')).toHaveText('12,500');
  await expect(zeile(g, '03.0010').locator('[data-kennzeichen="mengenansatz"]')).toHaveCount(0);

  // Wiederöffnen: Fokus im Feld der Menge; eine ungültige Zahl bleibt am Feld, leer entfernt die Zeile.
  await zeile(g, '03.0010').locator('[data-spalte="kurztext"]').dblclick();
  await expect(p.getByLabel('Menge ohne Ansatz')).toBeFocused();
  await expect(p.getByLabel('Menge ohne Ansatz')).toHaveValue('12,500');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('1.5');
  await page.keyboard.press('Enter');
  await expect(p.getByLabel('Menge ohne Ansatz')).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.press('Enter');
  await expect(p).toHaveCount(0);
  await expect(wert(g, '03.0010', 'blattmenge')).toHaveText('');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(wert(g, '03.0010', 'blattmenge')).toHaveText('12,500');

  // Blattkopf: Bezeichnung und Datum, ein Undo-Schritt.
  await page.getByRole('button', { name: 'Blattkopf' }).click();
  const kopf = page.getByRole('dialog', { name: 'Blattkopf' });
  await kopf.getByLabel('Bezeichnung').fill('Innenwände');
  await kopf.getByLabel('Datum (TT.MM.JJJJ)').fill('31.02.2026');
  await kopf.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(kopf.getByLabel('Datum (TT.MM.JJJJ)')).toHaveAttribute('aria-invalid', 'true');
  await kopf.getByLabel('Datum (TT.MM.JJJJ)').fill('03.11.2026');
  await kopf.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Innenwände' })).toBeVisible();
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1' })).toBeVisible();
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Innenwände' })).toBeVisible();

  // Blatt löschen fragt (Q5); Rückgängig holt es zurück und zeigt es wieder.
  await page.getByRole('button', { name: 'Blatt löschen' }).click();
  const frage = page.getByRole('dialog', { name: 'Blatt löschen' });
  await expect(frage.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
  await frage.getByRole('button', { name: 'Blatt löschen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Aufmaß – / })).toBeVisible();
  await expect(page.getByText('Noch kein Aufmaßblatt.')).toBeVisible();
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Aufmaßblatt 1 – Innenwände' })).toBeVisible();
  await expect(wert(blattGrid(page), '03.0010', 'blattmenge')).toHaveText('12,500');
});
