// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 89 (C2–C4): Kostenermittlung anlegen, Kostengruppen an LV-Positionen (mehrere in einem Undo-Schritt), Zuschlag,
// Kostengruppen am Auftrags-LV, Kostenkontrolle mit Budget und Vergabe, EP-Kalkulation als ein Undo-Schritt. Bedienung nur
// über Schaltflächen, Felder und Tastatur (U3, U8). Ticket 93: die Spalte „KG“ im Grid von LV und Auftrags-LV (Eingabe,
// Zellfehler, Einfügen einer Spalte als ein Undo-Schritt); was der Test dort setzt, nimmt er zurück, damit die Zahlen der
// Kostenkontrolle unten gelten.
//
// Alle erwarteten Zahlen folgen aus der Fixture oder aus den Eingaben des Tests, nicht aus einem Lauf der App:
//  - Vergabe je Titel: die Titelsummen von Bieter A in `typisch-angebote.json` (`preisspiegel.bieter[].titel`); ohne Wahl
//    bleibt die Grundposition 02.0070 im Auftrags-LV, die Titelsummen der Fixture gelten also unverändert (Bedarf ohne
//    Gesamtbetrag zählt nicht, F4). Titel 01 trägt die Kostengruppe 390 (am LV gesetzt, der Zuschlag übernimmt sie), Titel
//    03 die Kostengruppe 340 (am Auftrags-LV gesetzt), Titel 02 keine („ohne Kostengruppe“, D-37).
//  - Budget: 390 = 6.000,00, 340 = 24.000,00, 310 = 26.000,00 (Eingaben); Ebene 2 liegt unter 300, also 300 = 56.000,00.
//  - Abweichung = Vergabe − Budget (D-82.5); die Zeilen unter einer Budgetgruppe haben ihre eigene Abweichung.
//  - EP-Kalkulation (D-39): Lohn 0,450 × 48,50 = 21,825, +10 % = 24,0075 → 24,008; Stoffe 2,000 × 6,25 = 12,500, +5 % =
//    13,125; EP = 37,133; GP der Position 01.0020 (Menge 86,500) = 3.212,0045 → 3.212,00 (vorher 644,43).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';

const wurzel = new URL('../../../fixtures/', import.meta.url);
const fx = JSON.parse(readFileSync(new URL('typisch-angebote.json', wurzel), 'utf8')) as {
  preisspiegel: {
    bieter: readonly {
      readonly name: string;
      readonly datei: string;
      readonly summen: Readonly<Record<'netto' | 'nachlass' | 'nettoNachNachlass', string>>;
      readonly titel: Readonly<Record<string, string>>;
    }[];
  };
};
const BIETER_A = fx.preisspiegel.bieter.find((b) => b.name === 'Bieter A');
if (BIETER_A === undefined) throw new Error('Fixture ohne Bieter A');
const datei = (rel: string): string => new URL(rel, wurzel).pathname;

/** Beträge der Fixture (`1234.56`) in Cent; nur zur Herleitung der Erwartungen. */
const cent = (b: string): bigint => BigInt(b.replace('.', ''));
const text = (c: bigint): string => {
  const neg = c < 0n;
  const a = neg ? -c : c;
  return `${neg ? '-' : ''}${(a / 100n).toString()}.${(a % 100n).toString().padStart(2, '0')}`;
};
const de = (c: bigint): string => betragDe(text(c));

const VERGABE_390 = cent(BIETER_A.titel['01'] ?? '0');
const VERGABE_340 = cent(BIETER_A.titel['03'] ?? '0');
const VERGABE_OHNE = cent(BIETER_A.titel['02'] ?? '0');
const NACHLASS = cent(BIETER_A.summen.nachlass);
const GESAMT = cent(BIETER_A.summen.nettoNachNachlass);
const BUDGET_390 = 600000n;
const BUDGET_340 = 2400000n;
const BUDGET_310 = 2600000n;
const BUDGET_300 = BUDGET_390 + BUDGET_340 + BUDGET_310;

const kontrolle = (page: Page): Locator => page.getByRole('treegrid', { name: 'Kostenkontrolle' });
const ermittlung = (page: Page): Locator =>
  page.getByRole('treegrid', { name: 'Kostengruppen der Kostenermittlung' });

/** Die Zelle `spalte` der Zeile, deren erste Zelle `nummer` zeigt (Kostengruppe oder Name einer Summenzeile). */
function zelle(grid: Locator, nummer: string, spalte: string): Locator {
  return grid
    .locator('[role="row"]')
    .filter({
      has: grid
        .page()
        .locator('[data-spalte="nummer"] .tx-grid__text', { hasText: new RegExp(`^${nummer}$`) }),
    })
    .locator(`[data-spalte="${spalte}"] .tx-grid__text`);
}

async function kgDialogOeffnen(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: /^Kostengruppen/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Kostengruppen zuordnen' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Positionen mit dem Filter wählen, die Kostengruppe eintippen und setzen. */
async function kgSetzen(dialog: Locator, filter: string, kg: string): Promise<void> {
  await dialog.getByLabel('Filter (OZ oder Kurztext)').fill(filter);
  await dialog.getByRole('button', { name: 'Alle sichtbaren wählen' }).click();
  await dialog.getByLabel('Kostengruppe (dreistellig)').fill(kg);
  await dialog.getByRole('button', { name: 'Setzen', exact: true }).click();
}

async function dialogSchliessen(dialog: Locator): Promise<void> {
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(dialog).toBeHidden();
}

/** Zelle der Spalte „KG“ der Zeile mit dem Kurztext im Grid (Ticket 93). */
const kgZelle = (grid: Locator, kurztext: string): Locator =>
  grid
    .locator('[role="row"]', { has: grid.page().getByText(kurztext, { exact: true }) })
    .locator('[data-spalte="kostengruppe"]');
const rueckTiefe = (page: Page): Promise<number | undefined> =>
  page.evaluate(() => window.tethysTest?.historie().rueck);

/** Kostengruppe der Position mit der OZ in der Liste des Dialogs. */
const kgDerPosition = (dialog: Locator, oz: string): Locator =>
  dialog
    .getByRole('row', { name: new RegExp(`^\\s*${oz.replace('.', '\\.')}\\b`) })
    .locator('.zuordnung__kg');

test('C2–C4: Kostenermittlung, Kostengruppen, Zuschlag, Kostenkontrolle, EP-Kalkulation', async ({
  page,
}) => {
  const inhalt = fixtureInhalt('typisch');
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektPfad = new URL(page.url()).pathname;
  const projektId = decodeURIComponent(projektPfad.split('/').at(-1) ?? '');
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);

  // --- C2 im LV: Titel 01 bekommt die Kostengruppe 390, alle sechs Positionen in einem Schritt -------------------
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
  let dialog = await kgDialogOeffnen(page);
  // Eine formwidrige Nummer ist ein Feldfehler und ändert nichts.
  await dialog.getByLabel('Kostengruppe (dreistellig)').fill('39');
  await dialog.getByRole('button', { name: 'Setzen', exact: true }).click();
  await expect(dialog.getByText('Keine Kostengruppennummer.')).toBeVisible();
  // Eine Nummer, die in keiner Kostenermittlung liegt, ist nur ein Hinweis (U5): Es gibt noch keine.
  await dialog.getByLabel('Kostengruppe (dreistellig)').fill('390');
  await expect(
    dialog.getByText(/Kostengruppe 390 liegt in keiner Kostenermittlung des Projekts/),
  ).toBeVisible();
  await kgSetzen(dialog, '01.', '390');
  await expect(dialog.getByTestId('zuordnung-status')).toHaveText('Kostengruppe an 6 Positionen gesetzt');
  await expect(kgDerPosition(dialog, '01.0010')).toHaveText('390');
  await expect(kgDerPosition(dialog, '01.0060')).toHaveText('390');
  await dialog.getByLabel('Filter (OZ oder Kurztext)').fill('');
  await expect(kgDerPosition(dialog, '02.0010')).toHaveText('–');
  await dialogSchliessen(dialog);

  // Ein Rückgängig nimmt alle sechs zurück (ein Undo-Schritt), Wiederholen setzt sie wieder.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect.poll(() => page.evaluate(() => window.tethysTest?.historie().vor)).toBe(1);
  dialog = await kgDialogOeffnen(page);
  await expect(kgDerPosition(dialog, '01.0010')).toHaveText('–');
  await expect(kgDerPosition(dialog, '01.0060')).toHaveText('–');
  await dialogSchliessen(dialog);
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect.poll(() => page.evaluate(() => window.tethysTest?.historie().vor)).toBe(0);
  dialog = await kgDialogOeffnen(page);
  await expect(kgDerPosition(dialog, '01.0010')).toHaveText('390');
  await expect(kgDerPosition(dialog, '01.0060')).toHaveText('390');
  await dialogSchliessen(dialog);

  // --- Ticket 93: Spalte „KG“ im LV-Grid --------------------------------------------------------------------------
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const lvGrid = page.getByRole('treegrid', { name: 'Positionen' });
  await expect(lvGrid.getByRole('columnheader').last()).toHaveText('KG');
  await expect(kgZelle(lvGrid, 'Bauzaun stellen')).toHaveText('390'); // aus dem Dialog
  await expect(kgZelle(lvGrid, 'Erd- und Betonarbeiten')).toHaveAttribute('aria-readonly', 'true');
  // Eine formwidrige Nummer ist ein Zellfehler; gespeichert wird nichts.
  const rueck = (await rueckTiefe(page)) ?? 0;
  const oberboden = kgZelle(lvGrid, 'Oberboden abtragen');
  await oberboden.click();
  await page.keyboard.type('31');
  await page.keyboard.press('Enter');
  await expect(oberboden).toHaveAttribute('aria-invalid', 'true');
  await expect(oberboden).toContainText('31');
  await expect(oberboden).toHaveAccessibleDescription(/Keine Kostengruppennummer/);
  expect(await rueckTiefe(page)).toBe(rueck);
  // Die Korrektur ist ein Befehl und ein Undo-Schritt.
  await oberboden.click();
  await page.keyboard.press('F2');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('310');
  await page.keyboard.press('Enter');
  await expect(oberboden).toHaveText('310');
  await expect(oberboden).not.toHaveAttribute('aria-invalid', 'true');
  await expect.poll(() => rueckTiefe(page)).toBe(rueck + 1);
  // Drei Kostengruppen aus Excel (eine Spalte) setzen drei Positionen in einem Undo-Schritt.
  await kgZelle(lvGrid, 'Baugrube ausheben').click();
  await page.evaluate((t) => navigator.clipboard.writeText(t), '320\r\n320\r\n320\r\n');
  await page.keyboard.press('Control+V');
  for (const k of ['Baugrube ausheben', 'Baugrube verfüllen', 'Sauberkeitsschicht'])
    await expect(kgZelle(lvGrid, k)).toHaveText('320');
  await expect.poll(() => rueckTiefe(page)).toBe(rueck + 2);
  // Ein Rückgängig nimmt alle drei zurück, ein zweites die Eingabe: Titel 02 bleibt ohne Kostengruppe.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  for (const k of ['Baugrube ausheben', 'Baugrube verfüllen', 'Sauberkeitsschicht'])
    await expect(kgZelle(lvGrid, k)).toHaveText('');
  await expect(oberboden).toHaveText('310');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(oberboden).toHaveText('');
  await expect.poll(() => rueckTiefe(page)).toBe(rueck);

  // --- C3: Kostenermittlung „Kostenberechnung“ mit drei Einträgen -------------------------------------------------
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Kosten', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kosten – Musterhaus' })).toBeVisible();
  // Ticket 122 (PC-a5): Verweis auf die Kennwerte der Modellseite (nur Verweis, Ticket 115)
  await expect(page.getByRole('link', { name: 'Kennwerte aus dem Modell' })).toHaveAttribute(
    'href',
    /\/projekt\/[^/]+\/modelle$/,
  );
  await page.getByLabel('Name', { exact: true }).fill('Kostenberechnung');
  await page.getByRole('button', { name: 'Kostenermittlung anlegen', exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Kostenermittlung – Kostenberechnung' }),
  ).toBeVisible();

  const eintrag = async (nummer: string, betrag: string, bemerkung = ''): Promise<void> => {
    await page.getByLabel('Kostengruppe (dreistellig)').fill(nummer);
    await page.getByLabel('Betrag (netto, €)').fill(betrag);
    await page.getByLabel('Bemerkung', { exact: true }).fill(bemerkung);
    await page.getByRole('button', { name: 'Eintrag setzen', exact: true }).last().click();
  };
  // Formfehler: keine Nummer, kein Betrag; es wird nichts geschrieben.
  await eintrag('39', '1,00');
  await expect(page.getByText('Keine Kostengruppennummer.')).toBeVisible();
  await page.getByLabel('Kostengruppe (dreistellig)').fill('390');
  await page.getByLabel('Betrag (netto, €)').fill('1,234');
  await page.getByRole('button', { name: 'Eintrag setzen', exact: true }).last().click();
  await expect(page.getByText('Ein Betrag hat höchstens 2 Nachkommastellen.')).toBeVisible();
  await expect(zelle(ermittlung(page), 'Gesamt', 'summe')).toHaveText('0,00');

  await eintrag('390', '6.000,00');
  await expect(zelle(ermittlung(page), '390', 'summe')).toHaveText('6.000,00');
  await expect(page.getByLabel('Kostengruppe (dreistellig)')).toHaveValue('');
  await eintrag('340', '24.000,00');
  await expect(zelle(ermittlung(page), '340', 'summe')).toHaveText('24.000,00'); // erst danach leert das Formular sich
  await expect(page.getByLabel('Kostengruppe (dreistellig)')).toHaveValue('');
  await eintrag('310', '26.000,00', 'Reserve');
  const g = ermittlung(page);
  await expect(zelle(g, '300', 'summe')).toHaveText(de(BUDGET_300));
  await expect(zelle(g, 'Gesamt', 'summe')).toHaveText(de(BUDGET_300));
  await expect(zelle(g, '310', 'bemerkung')).toHaveText('Reserve');

  // Rückgängig nimmt den letzten Eintrag zurück, Wiederholen bringt ihn wieder.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(zelle(g, 'Gesamt', 'summe')).toHaveText(de(BUDGET_300 - BUDGET_310));
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(zelle(g, 'Gesamt', 'summe')).toHaveText(de(BUDGET_300));

  // Bezeichnungen aus einer CSV des Nutzers: nur eine Einstellung dieses Geräts, nach dem Neuladen noch da.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'bezeichnungen.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Nummer;Bezeichnung\n390;Sonstige Maßnahmen\n340;Innenwände\n', 'utf8'),
  });
  await expect(page.getByRole('status').filter({ hasText: '2 Bezeichnungen gelesen' })).toBeVisible();
  await expect(zelle(g, '390', 'bezeichnung')).toHaveText('Sonstige Maßnahmen');
  await page.reload();
  await expect(zelle(ermittlung(page), '300', 'summe')).toHaveText(de(BUDGET_300));
  await expect(zelle(ermittlung(page), '340', 'bezeichnung')).toHaveText('Innenwände');

  // --- Zuschlag: Bieter A, ohne Wahl ----------------------------------------------------------------------------
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
  await page.getByLabel('Angebotsdatei wählen').setInputFiles(datei(BIETER_A.datei));
  const einlesen = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
  await expect(einlesen.getByLabel('Bieter')).toHaveValue(BIETER_A.name);
  await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
  const liste = page.getByRole('dialog', { name: 'Angebote' });
  await expect(liste.getByRole('row', { name: new RegExp(BIETER_A.name) })).toBeVisible();
  await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await expect(liste).toBeHidden();
  await page.getByRole('toolbar').getByRole('link', { name: 'Preisspiegel' }).click();
  await page
    .getByRole('table', { name: 'Bieter des Preisspiegels' })
    .getByRole('button', { name: `Zuschlag erteilen: ${BIETER_A.name}` })
    .click();
  const zuschlag = page.getByRole('dialog', { name: `Zuschlag erteilen – ${BIETER_A.name}` });
  await zuschlag.getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();

  // --- C2 am Auftrags-LV: die Kostengruppe 390 kam mit dem Zuschlag, Titel 03 bekommt 340 ----------------------
  dialog = await kgDialogOeffnen(page);
  await expect(kgDerPosition(dialog, '01.0010')).toHaveText('390');
  await expect(kgDerPosition(dialog, '03.0010')).toHaveText('–');
  await dialog.getByLabel('Kostengruppe (dreistellig)').fill('340');
  // 340 liegt in der Kostenermittlung: kein Hinweis.
  await expect(dialog.getByText('liegt in keiner Kostenermittlung')).toHaveCount(0);
  await kgSetzen(dialog, '03.', '340');
  await expect(dialog.getByTestId('zuordnung-status')).toHaveText('Kostengruppe an 8 Positionen gesetzt');
  await expect(kgDerPosition(dialog, '03.0080')).toHaveText('340');
  await dialogSchliessen(dialog);

  // --- Ticket 93: Spalte „KG“ im Auftrags-LV: schreibgeschützt bis auf die Kostengruppe --------------------------
  const auftragGrid = page.getByRole('treegrid', { name: 'Positionen des Auftrags-LV' });
  await expect(auftragGrid.getByRole('columnheader').last()).toHaveText('KG');
  await expect(kgZelle(auftragGrid, 'Baustelle einrichten')).toHaveText('390');
  await auftragGrid
    .locator('[role="row"]', { has: page.getByText('Oberboden abtragen', { exact: true }) })
    .locator('[data-spalte="menge"]')
    .click();
  await page.keyboard.press('F2');
  await expect(auftragGrid.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('.tx-grid__status')).toHaveText(
    'Schreibgeschützt: Nur die Spalte KG lässt sich ändern.',
  );
  const rueckAuftrag = (await rueckTiefe(page)) ?? 0;
  await kgZelle(auftragGrid, 'Oberboden abtragen').click();
  await page.keyboard.type('350');
  await page.keyboard.press('Enter');
  await expect(kgZelle(auftragGrid, 'Oberboden abtragen')).toHaveText('350');
  await kgZelle(auftragGrid, 'Baugrube ausheben').click();
  await page.evaluate((t) => navigator.clipboard.writeText(t), '350\r\n350\r\n');
  await page.keyboard.press('Control+V');
  await expect(kgZelle(auftragGrid, 'Baugrube ausheben')).toHaveText('350');
  await expect(kgZelle(auftragGrid, 'Baugrube verfüllen')).toHaveText('350');
  await expect.poll(() => rueckTiefe(page)).toBe(rueckAuftrag + 2);
  // Rückgängig: erst beide eingefügten (ein Schritt), dann die Eingabe; Titel 02 ist wieder ohne Kostengruppe.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(kgZelle(auftragGrid, 'Baugrube ausheben')).toHaveText('');
  await expect(kgZelle(auftragGrid, 'Baugrube verfüllen')).toHaveText('');
  await expect(kgZelle(auftragGrid, 'Oberboden abtragen')).toHaveText('350');
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(kgZelle(auftragGrid, 'Oberboden abtragen')).toHaveText('');
  await expect.poll(() => rueckTiefe(page)).toBe(rueckAuftrag);

  // --- C3: Kostenkontrolle ------------------------------------------------------------------------------------
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Kosten', exact: true }).click();
  await page.getByRole('link', { name: 'Kostenkontrolle' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kostenkontrolle – Musterhaus' })).toBeVisible();
  const k = kontrolle(page);
  await expect(zelle(k, '300', 'budget')).toHaveText(de(BUDGET_300));
  await expect(zelle(k, '390', 'budget')).toHaveText(de(BUDGET_390));
  await expect(zelle(k, '390', 'vergabe')).toHaveText(de(VERGABE_390));
  await expect(zelle(k, '390', 'abweichung')).toHaveText(de(VERGABE_390 - BUDGET_390));
  await expect(zelle(k, '340', 'vergabe')).toHaveText(de(VERGABE_340));
  await expect(zelle(k, '340', 'abweichung')).toHaveText(de(VERGABE_340 - BUDGET_340));
  await expect(zelle(k, '310', 'vergabe')).toHaveText('0,00');
  await expect(zelle(k, '300', 'vergabe')).toHaveText(de(VERGABE_390 + VERGABE_340));
  await expect(zelle(k, '300', 'abweichung')).toHaveText(de(VERGABE_390 + VERGABE_340 - BUDGET_300));
  // Titel 02 ohne Kostengruppe, der Nachlass des Bieters (null) und das Gesamt gehen auf den Cent auf.
  await expect(zelle(k, 'Ohne Kostengruppe', 'budget')).toHaveText('–');
  await expect(zelle(k, 'Ohne Kostengruppe', 'vergabe')).toHaveText(de(VERGABE_OHNE));
  await expect(zelle(k, 'Nachlass', 'vergabe')).toHaveText(de(-NACHLASS));
  await expect(zelle(k, 'Gesamt', 'budget')).toHaveText(de(BUDGET_300));
  await expect(zelle(k, 'Gesamt', 'vergabe')).toHaveText(de(GESAMT));
  expect(VERGABE_390 + VERGABE_340 + VERGABE_OHNE - NACHLASS).toBe(GESAMT);
  await expect(zelle(k, 'Gesamt', 'abweichung')).toHaveText(de(GESAMT - BUDGET_300));
  // Noch keine Rechnung: die Spalte Abrechnung bleibt leer.
  await expect(zelle(k, 'Gesamt', 'abrechnung')).toHaveText('–');
  await expect(page.getByText('Noch keine Rechnung: Die Spalte Abrechnung bleibt leer.')).toBeVisible();
  await expect(page.getByText('Keine Hinweise.')).toBeVisible();

  // Ohne Budget bleiben Budget und Abweichung leer, die Vergabe bleibt.
  await page.getByRole('combobox', { name: 'Budget (Kostenermittlung)' }).click();
  await page.getByRole('option', { name: 'Kein Budget' }).click();
  await expect(zelle(k, '340', 'budget')).toHaveText('–');
  await expect(zelle(k, '340', 'abweichung')).toHaveText('–');
  await expect(zelle(k, 'Gesamt', 'vergabe')).toHaveText(de(GESAMT));

  // --- C4: EP kalkulieren an 01.0020 im LV, ein Undo-Schritt ----------------------------------------------------
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
  const zeile = page.getByRole('treegrid', { name: 'Positionen' }).locator('[role="row"]', {
    hasText: 'Bauzaun stellen',
  });
  const gp = zeile.locator('[data-spalte="gesamtpreis"] .tx-grid__text');
  const ep = zeile.locator('[data-spalte="einheitspreis"] .tx-grid__text');
  await expect(gp).toHaveText(betragDe('644.43')); // 86,500 × 7,450 = 644,425
  await zeile.locator('[data-spalte="kurztext"]').click();
  await page.getByRole('button', { name: /^Kalkulieren/ }).click();
  const kalk = page.getByRole('dialog', { name: /^EP kalkulieren: 01\.0020/ });
  await expect(kalk.getByTestId('kalkulation-nicht-gespeichert')).toContainText('nicht gespeichert');
  await kalk.getByLabel('Ansatzmenge 1').fill('0,450');
  await kalk.getByLabel('Kostensatz 1 (€)').fill('48,50');
  await kalk.getByRole('button', { name: 'Ansatz hinzufügen' }).click();
  await kalk.getByRole('combobox', { name: 'Kostenart Ansatz 2' }).click();
  await page.getByRole('option', { name: 'Stoffe' }).click();
  await kalk.getByLabel('Ansatzmenge 2').fill('2');
  await kalk.getByLabel('Kostensatz 2 (€)').fill('6,25');
  await kalk.getByLabel('Zuschlagssatz Lohn (%)').fill('10');
  await kalk.getByLabel('Zuschlagssatz Stoffe (%)').fill('5');
  await expect(kalk.getByTestId('kalkulation-ep')).toHaveText('37,133');
  await expect(kalk.getByTestId('kalkulation-lohnstunden')).toHaveText('0,450');
  await kalk.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(kalk).toBeHidden();
  await expect(ep).toHaveText('37,133');
  await expect(gp).toHaveText(betragDe('3212.00'));

  // EP und Anteile sind ein Undo-Schritt: ein Rückgängig stellt beides her, Wiederholen setzt beides.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(gp).toHaveText(betragDe('644.43'));
  await expect(ep).toHaveText('7,450');
  await page.getByRole('button', { name: /^Wiederholen/ }).click();
  await expect(gp).toHaveText(betragDe('3212.00'));
  // Die Ansätze wurden nicht gespeichert: Der Dialog beginnt leer.
  await zeile.locator('[data-spalte="kurztext"]').click();
  await page.getByRole('button', { name: /^Kalkulieren/ }).click();
  await expect(page.getByRole('dialog', { name: /^EP kalkulieren/ }).getByLabel('Ansatzmenge 1')).toHaveValue(
    '',
  );
});
