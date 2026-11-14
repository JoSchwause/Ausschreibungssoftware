// SPDX-License-Identifier: AGPL-3.0-or-later
// Bedienung der LV-Seite (Welle 7, E8 und B-26): Hinweistext anlegen und ändern (Vor- und Nachtext), OZ-Maske ändern mit
// Vorschau und Liste der Konflikte (abgewiesen ohne Datenverlust), der richtige Text an einem Titel, der Hinweis „KG außerhalb
// der Gliederung“ an der Zelle und „Kalkulation entfernt“ mit Rückgängig (die Kalkulation über den echten Dialog, D-98).

import { expect, test, type Page } from '@playwright/test';
import type { LvInhalt } from '@tethys/vertrag';
import { fixtureInhalt } from './fixture-inhalt';
import { leerlauf, projektAnlegen, zeilen } from './hilfen';
import { pruefungEinblenden, werkzeug } from './werkzeuge';

const grid = (page: Page) => page.getByRole('treegrid', { name: 'Positionen' });

/** Die Zelle einer Zeile (nach Kurztext) und Spalte. */
const zelle = (page: Page, kurztext: string, spalte: string) =>
  grid(page)
    .locator('[role="row"]')
    .filter({ has: page.locator(`[data-spalte="kurztext"] .tx-grid__text`, { hasText: kurztext }) })
    .first()
    .locator(`[data-spalte="${spalte}"]`);

/** Projekt anlegen, ein LV (Fixture `typisch`, auf Wunsch verändert) über den Testpfad laden und öffnen. */
async function lvOeffnen(page: Page, inhalt: LvInhalt = fixtureInhalt('typisch')): Promise<string> {
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
  await expect(grid(page)).toBeVisible();
  return projektId;
}

/** Die Kurztexte der Zeilen (bei Hinweistexten der Text), in Reihenfolge. */
const kurztexte = async (page: Page): Promise<string[]> => (await zeilen(page)).map((z) => z[1] ?? '');

// Das Grid ist virtualisiert: Ein hohes Fenster hält alle Zeilen sichtbar.
test.use({ viewport: { width: 1440, height: 2000 } });

test('Hinweistext: Vortext und Nachtext anlegen, ändern, Rückgängig; ein Titel hat keinen Dialog', async ({
  page,
}) => {
  await lvOeffnen(page);
  const dialog = page.getByRole('dialog');
  const editor = dialog.getByRole('textbox', { name: 'Text', exact: true });

  // Vortext über die Tastatur (Strg+Alt+H) an einer Position: am Anfang ihrer Gliederung.
  await zelle(page, 'Baugrube ausheben', 'kurztext').focus();
  await page.keyboard.press('Control+Alt+KeyH');
  await expect(dialog).toHaveAccessibleName('Hinweistext anlegen');
  await expect(dialog.getByText('Gliederung: 02 Erd- und Betonarbeiten')).toBeVisible();
  await expect(dialog.getByRole('radio', { name: /^Vortext/ })).toBeChecked();
  await editor.focus();
  await page.keyboard.type('Boden nach Gutachten');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  let k = await kurztexte(page);
  expect(k[k.indexOf('Erd- und Betonarbeiten') + 1]).toBe('Boden nach Gutachten');

  // Ohne Text wird nichts angelegt; der Dialog sagt warum und bleibt offen.
  await werkzeug(page, 'Einfügen', /^Hinweistext anlegen/);
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog.getByText('Bitte einen Text eingeben.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toHaveCount(0);

  // Nachtext über das Menü: am Ende derselben Gliederung, hinter ihrer letzten Position.
  await zelle(page, 'Baugrube ausheben', 'kurztext').focus();
  await werkzeug(page, 'Einfügen', /^Hinweistext anlegen/);
  await dialog.getByRole('radio', { name: /^Nachtext/ }).check();
  await editor.focus();
  await page.keyboard.type('Aushub bleibt auf der Baustelle');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  k = await kurztexte(page);
  expect(k[k.indexOf('Ausbau und Oberflächen') - 1]).toBe('Aushub bleibt auf der Baustelle');

  // Ändern: Strg+Enter an der Zeile des Hinweistexts öffnet „Hinweistext ändern“ mit dem Text.
  await zelle(page, 'Boden nach Gutachten', 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  await expect(dialog).toHaveAccessibleName('Hinweistext ändern');
  await expect(editor).toHaveText('Boden nach Gutachten');
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type(', Klasse 3');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(zelle(page, 'Boden nach Gutachten, Klasse 3', 'kurztext')).toBeVisible();

  // Ein Rückgängig nimmt die Änderung zurück, nach dem Neuladen bleibt der Stand.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(zelle(page, 'Boden nach Gutachten', 'kurztext')).toHaveText('Boden nach Gutachten');
  await leerlauf(page);
  await page.reload();
  await expect(zelle(page, 'Aushub bleibt auf der Baustelle', 'kurztext')).toBeVisible();
  await expect(zelle(page, 'Boden nach Gutachten', 'kurztext')).toHaveText('Boden nach Gutachten');

  // „Hinweistext ändern“ aus dem Menü an einer Position: Hinweis statt Dialog.
  await zelle(page, 'Baugrube ausheben', 'kurztext').focus();
  await werkzeug(page, 'Bearbeiten', 'Hinweistext ändern');
  await expect(page.getByText('Kein Hinweistext gewählt', { exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);

  // B-26: „Position bearbeiten“ an einem Titel nennt keinen Merkmal-Text, sondern wo der Titel bearbeitet wird.
  await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.getByText('Titel werden im Grid bearbeitet', { exact: true })).toBeVisible();
  await expect(page.getByText(/Merkmale gibt es nur an Positionen/)).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
});

test('OZ-Maske ändern: Vorschau, Konflikte abgewiesen ohne Datenverlust, Übernehmen und Rückgängig', async ({
  page,
}) => {
  await lvOeffnen(page);
  const dialog = page.getByRole('dialog', { name: 'OZ-Maske ändern' });
  const feld = dialog.getByRole('textbox', { name: 'OZ-Maske' });
  const uebernehmen = dialog.getByRole('button', { name: 'Übernehmen' });
  const vorher = await zeilen(page);

  await werkzeug(page, 'LV', 'OZ-Maske ändern');
  await expect(feld).toHaveValue('NN.NN.NNNN[I]');
  await expect(dialog.getByText('Die Maske ist unverändert.')).toBeVisible();
  await expect(uebernehmen).toBeDisabled();

  // Ohne Gliederungsstufe haben die drei Titel keinen Platz: alle drei genannt, nichts übernommen.
  await feld.fill('NNNN[I]');
  await expect(
    dialog.getByText('So lässt sich die Maske nicht übernehmen. Das LV bleibt unverändert.'),
  ).toBeVisible();
  await expect(dialog.getByText('Für diese Zeilen hat die neue Maske keine Stufe:')).toBeVisible();
  await expect(dialog.getByRole('listitem')).toHaveText([
    '01 Baustelleneinrichtung und Vorarbeiten',
    '02 Erd- und Betonarbeiten',
    '03 Ausbau und Oberflächen',
  ]);
  await expect(uebernehmen).toBeDisabled();

  // Los-Stufe über Titeln: abgewiesen, die Titel der obersten Ebene genannt.
  await feld.fill('NN.NNNN[I]');
  await dialog.getByRole('checkbox', { name: 'Oberste Stufe ist das Los' }).check();
  await expect(dialog.getByText(/^Mit der Los-Stufe stehen auf der obersten Ebene nur Lose/)).toBeVisible();
  await expect(dialog.getByRole('listitem')).toHaveCount(3);
  await dialog.getByRole('checkbox', { name: 'Oberste Stufe ist das Los' }).uncheck();

  // Eine unlesbare Maske: Meldung am Feld, keine Vorschau.
  await feld.fill('NN-NNNN');
  await expect(dialog.getByText(/^Die Maske besteht aus Gruppen/)).toBeVisible();
  await expect(uebernehmen).toBeDisabled();
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await zeilen(page)).toEqual(vorher);

  // Eine passende Maske: Vorschau mit den neuen OZ, Übernehmen nummeriert neu.
  await werkzeug(page, 'LV', 'OZ-Maske ändern');
  await feld.fill('NNN.NNNN[I]');
  await expect(dialog.getByText(/^\d+ Ordnungszahlen ändern sich:$/)).toBeVisible();
  await expect(dialog.getByRole('listitem').first()).toHaveText(
    '01 → 001 Baustelleneinrichtung und Vorarbeiten',
  );
  await uebernehmen.click();
  await expect(dialog).toHaveCount(0);
  await expect(zelle(page, 'Baustelle einrichten', 'ordnungszahl').locator('.tx-grid__text')).toHaveText(
    '001.0010',
  );

  // Ein Rückgängig stellt Maske und OZ wieder her.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(zelle(page, 'Baustelle einrichten', 'ordnungszahl').locator('.tx-grid__text')).toHaveText(
    '01.0010',
  );
  expect(await zeilen(page)).toEqual(vorher);
  await werkzeug(page, 'LV', 'OZ-Maske ändern');
  await expect(feld).toHaveValue('NN.NN.NNNN[I]');
});

test('KG außerhalb der Gliederung: Hinweis an der Zelle und im Prüf-Panel, sobald eine Kostenermittlung besteht', async ({
  page,
}) => {
  const inhalt = fixtureInhalt('typisch');
  await lvOeffnen(page, inhalt);
  const lvPfad = `/lv/${inhalt.wurzelId}`;
  const kg = zelle(page, 'Baugrube ausheben', 'kostengruppe');
  await kg.focus();
  await page.keyboard.type('390');
  await page.keyboard.press('Enter');
  await expect(kg.locator('.tx-grid__text')).toHaveText('390');
  // Ohne Kostenermittlung im Projekt gibt es nichts, woran die Nummer zu messen wäre.
  await expect(kg).not.toHaveClass(/tx-grid__zelle--warnung/);

  // Kostenermittlung mit einem Eintrag 310 anlegen.
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Kosten', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Kostenberechnung');
  await page.getByRole('button', { name: 'Kostenermittlung anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kostenermittlung – Kostenberechnung' }),
  ).toBeVisible();
  await page.getByLabel('Kostengruppe (dreistellig)').fill('310');
  await page.getByLabel('Betrag (netto, €)').fill('1.000,00');
  await page.getByRole('button', { name: 'Eintrag setzen', exact: true }).last().click();
  await expect(page.getByLabel('Kostengruppe (dreistellig)')).toHaveValue('');
  await leerlauf(page);

  await page.goto(lvPfad);
  await expect(grid(page)).toBeVisible();
  await expect(kg).toHaveClass(/tx-grid__zelle--warnung/);
  await expect(kg).toHaveAccessibleDescription(
    /Kostengruppe 390 liegt in keiner Kostenermittlung des Projekts\./,
  );
  const panel = await pruefungEinblenden(page);
  await expect(panel.locator('[data-pruefeintrag][data-code="kg-ausserhalb-gliederung"]')).toHaveCount(1);

  // Eine Nummer in der Gliederung (310) nimmt den Hinweis weg.
  await kg.focus();
  await page.keyboard.press('F2');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('310');
  await page.keyboard.press('Enter');
  await expect(kg.locator('.tx-grid__text')).toHaveText('310');
  await expect(kg).not.toHaveClass(/tx-grid__zelle--warnung/);
  await expect(panel.locator('[data-pruefeintrag][data-code="kg-ausserhalb-gliederung"]')).toHaveCount(0);
});

test('Ein EP von Hand entfernt die Kalkulation: Band „Kalkulation entfernt“, Rückgängig stellt beides her', async ({
  page,
}) => {
  await lvOeffnen(page);
  const band = page.locator('.lv__band');
  const ep = zelle(page, 'Bauzaun stellen', 'einheitspreis');
  await expect(ep.locator('.tx-grid__text')).toHaveText('7,450');

  // Die Kalkulation entsteht über den echten Dialog (D-98), nicht über den Testpfad: Lohn 0,1 h × 50,00 € + 10 % = 5,500.
  await zelle(page, 'Bauzaun stellen', 'kurztext').click();
  await werkzeug(page, 'Bearbeiten', /^Kalkulieren/);
  const kalk = page.getByRole('dialog', { name: /^EP kalkulieren/ });
  await kalk.getByLabel('Ansatzmenge 1').fill('0,1');
  await kalk.getByLabel('Kostensatz 1 (€)').fill('50');
  await kalk.getByLabel('Zuschlagssatz Lohn (%)').fill('10');
  await expect(kalk.getByTestId('kalkulation-ep')).toHaveText('5,500');
  await kalk.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(kalk).toBeHidden();
  await expect(ep.locator('.tx-grid__text')).toHaveText('5,500');
  await expect(band).toHaveCount(0);

  await ep.focus();
  await page.keyboard.type('8');
  await page.keyboard.press('Enter');
  await expect(ep.locator('.tx-grid__text')).toHaveText('8,000');
  await expect(band).toHaveText(/Kalkulation entfernt/);

  await band.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(ep.locator('.tx-grid__text')).toHaveText('5,500');
  await expect(band).toHaveCount(0);
  // Wiederholen bringt den Preis zurück, das Band nicht (es gehört zur Antwort auf den Befehl).
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(ep.locator('.tx-grid__text')).toHaveText('8,000');
  await expect(band).toHaveCount(0);
});
