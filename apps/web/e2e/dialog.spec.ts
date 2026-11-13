// SPDX-License-Identifier: AGPL-3.0-or-later
// Positionsdialog, LV-Angaben und Prüf-Panel (Ticket 47, Punkte 5 und 6): Langtext mit Auszeichnung, Liste und Tabelle
// bleibt nach dem Neuladen gleich; Auftraggeber und Eröffnungstermin ebenso; Befunde der LV-Prüfung im Panel, mit
// Sprung zur Zelle bzw. in den Dialog, und sie verschwinden, sobald der Mangel behoben ist.

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
import { pruefungEinblenden, werkzeug } from './werkzeuge';

const typisch = fixture('typisch');
const p = (oz: string) => typisch.knoten.find((k) => k.ordnungszahl === oz) as FxPosition;

const zelle = (page: Page, zeile: number, spalte: string) =>
  page.locator(`[role="row"][data-i="${String(zeile)}"] [data-spalte="${spalte}"]`);

/** Angezeigter Text einer Zelle (ohne die Beschreibung der Befunde). */
const text = (page: Page, zeile: number, spalte: string) =>
  zelle(page, zeile, spalte).locator('.tx-grid__text');

/** Titel 01 mit zwei Positionen, umnummeriert: 01.0010 und 01.0020. */
async function lvMitZweiPositionen(page: Page): Promise<void> {
  await projektAnlegen(page, 'Rathaus', 'Stadt');
  await lvAnlegen(page, 'Innenausbau', 'NN.NNNN');
  await neueZeile(page, () => werkzeug(page, 'Einfügen', /^Titel anlegen/));
  await page.keyboard.type('Trockenbau');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await positionTippen(page, p('01.0010'));
  await positionTippen(page, p('01.0020'));
  await werkzeug(page, 'LV', 'Umnummerieren');
  // Neue Positionen haben ihre OZ schon aus dem Vorschlag (Ticket 48); erst nach allen Befehlen ist der Stand ruhig.
  await leerlauf(page);
  await expect(text(page, 2, 'ordnungszahl')).toHaveText('01.0020');
}

/** Öffnet den Positionsdialog der Zeile mit Strg+Enter. */
async function dialogAuf(page: Page, zeile: number) {
  await zelle(page, zeile, 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

/** HTML des Langtext-Editors im Dialog (zum Vergleich vor und nach dem Neuladen). */
const langtextHtml = (page: Page): Promise<string> =>
  page.getByRole('dialog').getByRole('textbox', { name: 'Langtext', exact: true }).innerHTML();

/** Tippt Text mit Fett, Kursiv und Unterstrichen in einen Absatz (Tastenkürzel des Editors, Ticket 34). */
async function auszeichnungTippen(page: Page): Promise<void> {
  await page.keyboard.type('Wand aus ');
  await page.keyboard.press('ControlOrMeta+B');
  await page.keyboard.type('Gipskarton');
  await page.keyboard.press('ControlOrMeta+B');
  await page.keyboard.type(', ');
  await page.keyboard.press('ControlOrMeta+I');
  await page.keyboard.type('doppelt');
  await page.keyboard.press('ControlOrMeta+I');
  await page.keyboard.type(' ');
  await page.keyboard.press('ControlOrMeta+U');
  await page.keyboard.type('beplankt');
  await page.keyboard.press('ControlOrMeta+U');
}

test('Langtext mit Auszeichnung und die LV-Angaben bleiben nach dem Neuladen gleich', async ({ page }) => {
  await lvMitZweiPositionen(page);
  let dialog = await dialogAuf(page, 1);
  await dialog.getByRole('textbox', { name: 'Langtext', exact: true }).focus();
  await auszeichnungTippen(page);
  const vorher = await langtextHtml(page);
  expect(vorher).toContain('<strong>Gipskarton</strong>');
  expect(vorher).toContain('<em>doppelt</em>');
  expect(vorher).toContain('<u>beplankt</u>');
  // Übernehmen per Maus: der Editor meldet beim Verlassen, dann geht der Befehl hinaus.
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  // Der Langtext-Befund der Position ist weg.
  // Das Prüf-Panel ist zu, bis es eingeblendet wird (Ticket 142).
  const panel = await pruefungEinblenden(page);
  await expect(panel.locator('[data-pruefeintrag][data-code="langtext-leer"]')).toHaveCount(1);

  // LV-Angaben: Auftraggeber und Eröffnungstermin (Eingabe de-DE), Enter übernimmt.
  await werkzeug(page, 'LV', 'LV-Angaben');
  dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Auftraggeber: Name' }).fill('Stadt Musterstadt');
  await dialog.getByRole('textbox', { name: 'Auftraggeber: Ort' }).fill('Musterstadt');
  await dialog.getByRole('textbox', { name: 'Eröffnungsdatum' }).fill('15.01.2027');
  await dialog.getByRole('textbox', { name: 'Eröffnungszeit' }).fill('10:30');
  await dialog.getByRole('textbox', { name: 'Eröffnungszeit' }).press('Enter');
  await expect(dialog).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  dialog = await dialogAuf(page, 1);
  await expect.poll(() => langtextHtml(page)).toBe(vorher);
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toHaveCount(0);
  await werkzeug(page, 'LV', 'LV-Angaben');
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('textbox', { name: 'Auftraggeber: Name' })).toHaveValue('Stadt Musterstadt');
  await expect(dialog.getByRole('textbox', { name: 'Auftraggeber: Ort' })).toHaveValue('Musterstadt');
  await expect(dialog.getByRole('textbox', { name: 'Auftraggeber: Straße' })).toHaveValue('');
  await expect(dialog.getByRole('textbox', { name: 'Eröffnungsdatum' })).toHaveValue('15.01.2027');
  await expect(dialog.getByRole('textbox', { name: 'Eröffnungszeit' })).toHaveValue('10:30');
});

// Seit Ticket 50 nimmt der Kern den vollen Langtext (v1.1b) an: Absatz, Liste, Tabelle (D-15).
test('Langtext mit Liste und Tabelle bleibt nach dem Neuladen gleich', async ({ page }) => {
  await lvMitZweiPositionen(page);
  const dialog = await dialogAuf(page, 1);
  const editor = dialog.getByRole('textbox', { name: 'Langtext', exact: true });
  await editor.focus();
  await auszeichnungTippen(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ControlOrMeta+Shift+Digit8');
  await page.keyboard.type('Ständerwerk');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beplankung');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  // Eine Tabelle legt der Editor nicht selbst an (Ticket 34); sie kommt über die Zwischenablage.
  await editor.evaluate((el) => {
    const daten = new DataTransfer();
    daten.setData(
      'text/html',
      '<table><tr><td>Höhe</td><td>3,00 m</td></tr><tr><td>Dicke</td><td>12,5 cm</td></tr></table>',
    );
    daten.setData('text/plain', 'Höhe\t3,00 m\nDicke\t12,5 cm');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: daten, bubbles: true, cancelable: true }));
  });
  const vorher = await langtextHtml(page);
  expect(vorher).toMatch(/<ul>.*Ständerwerk.*Beplankung.*<\/ul>/s);
  expect(vorher).toMatch(/<table[^>]*>.*Höhe.*12,5 cm.*<\/table>/s);
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  await dialogAuf(page, 1);
  await expect.poll(() => langtextHtml(page)).toBe(vorher);
});

test('Dialog: Abbrechen schickt nichts; eine ungültige Zahl bleibt markiert, die übrigen Felder gehen hinaus', async ({
  page,
}) => {
  await lvMitZweiPositionen(page);
  const anzahl = () => page.evaluate(() => window.tethysTest?.anwendenMs.length ?? -1);
  const vorher = await anzahl();
  let dialog = await dialogAuf(page, 1);
  await dialog.getByRole('textbox', { name: 'Kurztext' }).fill('Geändert');
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dialog).toHaveCount(0);
  expect(await anzahl()).toBe(vorher);
  await expect(text(page, 1, 'kurztext')).toHaveText(p('01.0010').kurztext);

  dialog = await dialogAuf(page, 1);
  await dialog.getByRole('textbox', { name: 'Kurztext' }).fill('Geändert');
  await dialog.getByRole('textbox', { name: 'Menge' }).fill('12,x');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  // Der Dialog bleibt offen und zeigt die Meldung am Feld; der Kurztext ist übernommen.
  await expect(dialog.getByRole('textbox', { name: 'Menge' })).toHaveAttribute('aria-invalid', 'true');
  await expect(text(page, 1, 'kurztext')).toHaveText('Geändert');
  expect(await anzahl()).toBe(vorher + 1);
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
});

test('Prüf-Panel: Befunde gruppiert, Sprung zur Zelle und in den Dialog; behobener Mangel verschwindet', async ({
  page,
}) => {
  await lvMitZweiPositionen(page);
  // Das Prüf-Panel ist zu, bis es eingeblendet wird (Ticket 142).
  const panel = await pruefungEinblenden(page);
  const eintraege = (code: string) => panel.locator(`[data-pruefeintrag][data-code="${code}"]`);
  await expect(eintraege('langtext-leer')).toHaveCount(2);
  await expect(eintraege('einheit-fehlt')).toHaveCount(0);

  // Zweite Position: OZ von Hand auf die der ersten, Einheit leeren (beides im Dialog).
  const dialog = await dialogAuf(page, 2);
  await dialog.getByRole('textbox', { name: 'OZ' }).fill('01.0010');
  await dialog.getByRole('textbox', { name: 'Einheit', exact: true }).fill('');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);

  // Ein Eintrag „Einheit fehlt“ und die doppelte OZ (an beiden Positionen gemeldet, Fehler zuerst).
  await expect(eintraege('einheit-fehlt')).toHaveCount(1);
  await expect(eintraege('oz-doppelt')).toHaveCount(2);
  await expect(panel.getByRole('heading', { name: 'Fehler (2)' })).toBeVisible();
  // Die Zahl steht auf der Schaltfläche „Prüfung“ der Werkzeugleiste.
  await expect(page.locator('.lv-pruefung__zahl')).toHaveText('5');
  // Dieselben Befunde an den Zellen des Grids.
  await expect(zelle(page, 2, 'einheit')).toHaveClass(/tx-grid__zelle--warnung/);
  await expect(zelle(page, 2, 'ordnungszahl')).toHaveClass(/tx-grid__zelle--fehler/);

  // Titel zuklappen: Der Sprung klappt ihn wieder auf.
  await zelle(page, 0, 'kurztext').focus();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(zelle(page, 1, 'kurztext')).toHaveCount(0);

  // F8 ins Panel, Pfeile zum Eintrag „Einheit fehlt“, Enter springt zur Zelle.
  await page.keyboard.press('F8');
  await expect(panel.locator('[data-pruefeintrag]').first()).toBeFocused();
  for (let i = 0; i < 10; i++) {
    if (await eintraege('einheit-fehlt').evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(eintraege('einheit-fehlt')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(zelle(page, 2, 'einheit')).toBeFocused();

  // „Langtext fehlt“ öffnet den Positionsdialog.
  await page.keyboard.press('F8');
  await eintraege('langtext-leer').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();

  // Einheit in der Zelle nachtragen: der Eintrag verschwindet.
  await zelle(page, 2, 'einheit').focus();
  await page.keyboard.type('m');
  await page.keyboard.press('Enter');
  await expect(eintraege('einheit-fehlt')).toHaveCount(0);
  await expect(zelle(page, 2, 'einheit')).not.toHaveClass(/tx-grid__zelle--warnung/);
});

test('F8 setzt den Fokus sofort ins Prüf-Panel; ein Wechsel gleich danach bleibt bestehen', async ({
  page,
}) => {
  await lvMitZweiPositionen(page);
  // Das Prüf-Panel ist zu, bis es eingeblendet wird (Ticket 142).
  const panel = await pruefungEinblenden(page);
  // Die Prüfung läuft im Leerlauf nach; erst wenn das Panel ihren Endstand zeigt (nur die zwei fehlenden Langtexte,
  // kein Befund mehr aus dem Tippen), baut sie die Liste nicht mehr um.
  await expect(panel.locator('[data-pruefeintrag]')).toHaveText([/keinen Langtext/, /keinen Langtext/]);
  await zelle(page, 1, 'kurztext').focus();
  // F8 und der Wechsel zum zweiten Eintrag in derselben Aufgabe, also schneller als ein Bild: Der Fokus muss mit F8
  // selbst im Panel stehen (nicht im Meldungsbereich, der ebenfalls auf F8 hört) und darf danach nicht zurückspringen.
  const fokus = await page.evaluate(async () => {
    const eintraege = () => [...document.querySelectorAll<HTMLElement>('[data-pruefeintrag]')];
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F8', bubbles: true, cancelable: true }),
    );
    const nachF8 = eintraege().indexOf(document.activeElement as HTMLElement);
    eintraege()[1]?.focus();
    await new Promise((fertig) => requestAnimationFrame(() => requestAnimationFrame(fertig)));
    return { nachF8, danach: eintraege().indexOf(document.activeElement as HTMLElement) };
  });
  expect(fokus).toEqual({ nachF8: 0, danach: 1 });
});

test('Zuschlagsposition mit Bezugsliste: Bezugsposition über die Suche, Betrag aus dem Kern', async ({
  page,
}) => {
  await lvMitZweiPositionen(page);
  const dialog = await dialogAuf(page, 2);
  await dialog.getByLabel('Zuschlagsposition').check();
  await dialog.getByRole('textbox', { name: 'Zuschlagssatz' }).fill('10');
  await dialog.getByRole('radio', { name: 'Liste von Positionen' }).check();
  await dialog.getByRole('textbox', { name: 'Bezugsposition suchen (OZ oder Kurztext)' }).fill('01.0010');
  await dialog.getByRole('button', { name: /^Hinzufügen: 01\.0010/ }).click();
  await dialog.getByRole('textbox', { name: 'Menge', exact: true }).fill('');
  await dialog.getByRole('textbox', { name: 'Einheitspreis' }).fill('');
  // Basis: GP von 01.0010 (1.850,00), Betrag 10 %.
  await expect(dialog.locator('[data-wert="basis"]')).toHaveText('1.850,00');
  await expect(dialog.locator('[data-wert="betrag"]')).toHaveText('185,00');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(text(page, 2, 'gesamtpreis')).toHaveText('185,00');
  await expect(text(page, 2, 'positionsart')).toHaveText('Zuschlag');
});
