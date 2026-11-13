// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 65 (M2): Mengenermittlung einer Position. Nur Tastatur und Schaltflächen (U3, U8). Ansatz mit drei Zeilen
// (eine mit Variable, eine fehlerhaft, dann korrigiert) → Menge und GP in der Zeile, Neuladen, Undo, Rückfrage bei
// direkter Mengenänderung (D-22 (a)), im Grid wie im Positionsdialog.

import { expect, test, type Page } from '@playwright/test';
import {
  eingabeDe,
  leerlauf,
  lvAnlegen,
  neueZeile,
  projektAnlegen,
  summen,
  tippe,
  type FxPosition,
} from './hilfen';
import { werkzeug } from './werkzeuge';

const wand: FxPosition = {
  id: 'x',
  art: 'position',
  ordnungszahl: '',
  kurztext: 'Wand mauern',
  menge: '4.000',
  einheit: 'm²',
  einheitspreis: '10.000',
};

const zelle = (page: Page, spalte: string) =>
  page.locator(`[role="row"][data-i="0"] [data-spalte="${spalte}"]`);
const text = (page: Page, spalte: string) => zelle(page, spalte).locator('.tx-grid__text');

const panel = (page: Page) => page.getByRole('dialog', { name: /^Mengenermittlung/ });
const frage = (page: Page) => page.getByRole('dialog', { name: 'Mengenansatz wird entfernt' });

/** Projekt, LV, eine Position „Wand mauern“ mit Menge 4 m², EP 10,00; die Zeile ist aktiv. */
async function positionAnlegen(page: Page): Promise<void> {
  await projektAnlegen(page, 'Rathaus', 'Stadt');
  await lvAnlegen(page, 'Rohbau', 'NN.NNNN');
  await neueZeile(page, () => werkzeug(page, 'Einfügen', /^Position anlegen/));
  await tippe(page, wand.kurztext);
  await tippe(page, eingabeDe(wand.menge));
  await tippe(page, wand.einheit);
  await tippe(page, eingabeDe(wand.einheitspreis));
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('4,000');
  await expect(text(page, 'gesamtpreis')).toHaveText('40,00');
}

async function panelOeffnen(page: Page) {
  await zelle(page, 'kurztext').focus();
  await page.keyboard.press('Control+Alt+KeyE');
  await expect(panel(page)).toBeVisible();
  return panel(page);
}

/** Tippt die drei Zeilen: Z1 `2*3` (Variable a), Z2 erst `(1+2` (Fehler), dann `(1+2)*2`, Z3 `Z1/4`. Summe 13,500. */
async function ansatzTippen(page: Page): Promise<void> {
  const p = panel(page);
  await expect(p.getByLabel('Ausdruck Zeile 1')).toBeFocused();
  await page.keyboard.type('2*3');
  await page.keyboard.press('Tab'); // von Ausdruck zu Variable
  await expect(p.getByLabel('Variable Zeile 1')).toBeFocused();
  await page.keyboard.type('a');
  await page.keyboard.press('Enter'); // neue Zeile, Fokus im Ausdruck
  await expect(p.getByLabel('Ausdruck Zeile 2')).toBeFocused();
  await page.keyboard.type('(1+2');
  // Der Fehler steht an der Zeile, mit Spalte; die Summe fehlt.
  await expect(p.locator('tr[data-zeile="2"] .mengen__fehler')).toHaveText(
    'Klammer wird nicht geschlossen (Spalte 1)',
  );
  await expect(p.locator('[data-wert="summe"]')).toHaveText('–');
  // Korrigieren.
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('(1+2)*2');
  await expect(p.locator('tr[data-zeile="2"] [data-wert="zeilenergebnis"]')).toHaveText('6,000');
  await page.keyboard.press('Enter');
  await expect(p.getByLabel('Ausdruck Zeile 3')).toBeFocused();
  await page.keyboard.type('Z1/4');
  await expect(p.locator('tr[data-zeile="3"] [data-wert="zeilenergebnis"]')).toHaveText('1,500');
  await expect(p.locator('tr[data-zeile="1"] [data-wert="zeilenergebnis"]')).toHaveText('6,000');
  await expect(p.locator('[data-wert="summe"]')).toHaveText('13,500');
  await expect(p.locator('.mengen__einheit')).toHaveText('m²');
}

test('Ansatz mit drei Zeilen: Menge und GP, Neuladen, Undo, Rückfrage bei direkter Änderung', async ({
  page,
}) => {
  await positionAnlegen(page);
  await panelOeffnen(page);
  await ansatzTippen(page);
  await page.keyboard.press('Control+Enter'); // Übernehmen
  await expect(panel(page)).toHaveCount(0);
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('13,500');
  await expect(text(page, 'gesamtpreis')).toHaveText('135,00');
  await expect.poll(async () => (await summen(page))['Netto']).toBe('135,00');
  // Die Position trägt ein neutrales Kennzeichen des Grids, keinen Warnstil (Ticket 74, D-65.2).
  await expect(zelle(page, 'menge')).toHaveClass(/tx-grid__zelle--mengenansatz/);
  await expect(zelle(page, 'menge')).not.toHaveClass(/tx-grid__zelle--warnung/);
  await expect(zelle(page, 'menge')).toHaveAttribute('title', /Mengenansatz/);

  // Neuladen: der Ansatz ist noch da, samt Variable und Ergebnissen.
  await page.reload();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  await expect(text(page, 'menge')).toHaveText('13,500');
  await panelOeffnen(page);
  const p = panel(page);
  await expect(p.getByLabel('Ausdruck Zeile 1')).toHaveValue('2*3');
  await expect(p.getByLabel('Variable Zeile 1')).toHaveValue('a');
  await expect(p.getByLabel('Ausdruck Zeile 2')).toHaveValue('(1+2)*2');
  await expect(p.getByLabel('Ausdruck Zeile 3')).toHaveValue('Z1/4');
  await expect(p.locator('[data-wert="summe"]')).toHaveText('13,500');
  await p.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(panel(page)).toHaveCount(0);

  // Direkte Mengenänderung im Grid: die App fragt. Abbrechen lässt alles unverändert.
  await zelle(page, 'menge').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(frage(page)).toBeVisible();
  await frage(page).getByRole('button', { name: 'Abbrechen' }).click();
  await expect(frage(page)).toHaveCount(0);
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('13,500');
  await expect(text(page, 'gesamtpreis')).toHaveText('135,00');
  await panelOeffnen(page);
  await expect(panel(page).getByLabel('Ausdruck Zeile 3')).toHaveValue('Z1/4');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);

  // Bestätigen entfernt den Ansatz; die Menge ist die eingegebene.
  await zelle(page, 'menge').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(frage(page)).toBeVisible();
  await frage(page).getByRole('button', { name: 'Mengenansatz entfernen' }).click();
  await expect(frage(page)).toHaveCount(0);
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('5,000');
  await expect(text(page, 'gesamtpreis')).toHaveText('50,00');
  await expect(zelle(page, 'menge')).not.toHaveClass(/tx-grid__zelle--mengenansatz/);
  // Ohne Ansatz fragt die App nicht mehr.
  await zelle(page, 'menge').click();
  await page.keyboard.type('6');
  await page.keyboard.press('Enter');
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('6,000');
  await expect(frage(page)).toHaveCount(0);
  // Zwei Undo-Schritte zurück: die Menge 5 und der Ansatz (13,500) kommen wieder.
  await zelle(page, 'menge').focus();
  await page.keyboard.press('Control+Z');
  await expect(text(page, 'menge')).toHaveText('5,000');
  await page.keyboard.press('Control+Z');
  await expect(text(page, 'menge')).toHaveText('13,500');
  await expect(zelle(page, 'menge')).toHaveClass(/tx-grid__zelle--mengenansatz/);
});

test('Undo nimmt den Ansatz in einem Schritt zurück; ein Ansatz mit Fehler lässt die Menge leer', async ({
  page,
}) => {
  await positionAnlegen(page);
  await panelOeffnen(page);
  await ansatzTippen(page);
  await page.keyboard.press('Control+Enter');
  await expect(panel(page)).toHaveCount(0);
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('13,500');

  // Ein Schritt zurück: alte Menge, kein Ansatz.
  await zelle(page, 'kurztext').focus();
  await page.keyboard.press('Control+Z');
  await expect(text(page, 'menge')).toHaveText('4,000');
  await expect(text(page, 'gesamtpreis')).toHaveText('40,00');
  await expect(zelle(page, 'menge')).not.toHaveClass(/tx-grid__zelle--mengenansatz/);
  await page.keyboard.press('Control+Y');
  await expect(text(page, 'menge')).toHaveText('13,500');

  // Zeile 3 absichtlich fehlerhaft übernehmen (U5: der Fehler sperrt nicht): Ansatz gespeichert, Menge leer (D-22 b).
  await panelOeffnen(page);
  const p = panel(page);
  await p.getByLabel('Ausdruck Zeile 3').fill('Z1/0');
  await expect(p.locator('tr[data-zeile="3"] .mengen__fehler')).toHaveText('Division durch null (Spalte 3)');
  await expect(p.locator('[data-wert="summe"]')).toHaveText('–');
  await p.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(panel(page)).toHaveCount(0);
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('');
  await expect(zelle(page, 'menge')).toHaveClass(/tx-grid__zelle--mengenansatz/);
  await page.reload();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  await expect(text(page, 'menge')).toHaveText('');
  await panelOeffnen(page);
  await expect(panel(page).getByLabel('Ausdruck Zeile 3')).toHaveValue('Z1/0');
  await expect(panel(page).getByLabel('Ausdruck Zeile 2')).toHaveValue('(1+2)*2');
});

test('Zeilen per Tastatur löschen und verschieben; Positionsdialog: Panel und Rückfrage', async ({
  page,
}) => {
  await positionAnlegen(page);
  await panelOeffnen(page);
  await ansatzTippen(page);
  const p = panel(page);
  // Strg+Entf löscht Zeile 3; Alt+Pfeil hoch und runter verschieben Zeile 2 (Zeile 2 bezieht sich auf nichts).
  await page.keyboard.press('Control+Delete');
  await expect(p.locator('tr[data-zeile]')).toHaveCount(2);
  await expect(p.getByLabel('Ausdruck Zeile 2')).toBeFocused();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(p.locator('tr[data-zeile]').first()).toHaveAttribute('data-zeile', '2');
  await expect(p.getByLabel('Ausdruck Zeile 2')).toBeFocused();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(p.locator('tr[data-zeile]').first()).toHaveAttribute('data-zeile', '1');
  await expect(p.locator('[data-wert="summe"]')).toHaveText('12,000');
  await page.keyboard.press('Control+Enter');
  await expect(panel(page)).toHaveCount(0);
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('12,000');
  await expect(text(page, 'gesamtpreis')).toHaveText('120,00');

  // Positionsdialog: das Panel ist von dort erreichbar; die Menge von Hand zu ändern fragt vorher.
  await zelle(page, 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  const dialog = page.getByRole('dialog', { name: /^Position:/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Menge aus Mengenansatz')).toBeVisible();
  await dialog.getByRole('button', { name: 'Mengenermittlung …' }).click();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByRole('button', { name: 'Zeile 2 löschen' }).click();
  await panel(page).getByRole('button', { name: 'Übernehmen' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(dialog.getByLabel('Menge', { exact: true })).toHaveValue('6,000');
  await dialog.getByLabel('Menge', { exact: true }).fill('7');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(frage(page)).toBeVisible();
  await frage(page).getByRole('button', { name: 'Abbrechen' }).click();
  await expect(frage(page)).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('6,000');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(frage(page)).toBeVisible();
  await frage(page).getByRole('button', { name: 'Mengenansatz entfernen' }).click();
  await expect(dialog).toHaveCount(0);
  await leerlauf(page);
  await expect(text(page, 'menge')).toHaveText('7,000');
  await expect(text(page, 'gesamtpreis')).toHaveText('70,00');
  await expect(zelle(page, 'menge')).not.toHaveClass(/tx-grid__zelle--mengenansatz/);
});
