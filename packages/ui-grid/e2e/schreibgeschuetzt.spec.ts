// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 54, Punkt 3: schreibgeschütztes Grid (z. B. LV-Stand, Auftrags-LV). Kein Editor, keine Zeilenaktion außer
// Kopieren, kein Befehl; Fokus, Navigation, Auswahl, Aufklappen und Zeile öffnen bleiben; Ansage für Screenreader.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

interface FxKnoten {
  id: string;
  art: string;
  kurztext?: string;
}
const typisch = (
  JSON.parse(readFileSync(new URL('../../../fixtures/typisch.json', import.meta.url), 'utf8')) as {
    knoten: FxKnoten[];
  }
).knoten;
const idVon = (kurztext: string): string => {
  const k = typisch.find((x) => x.kurztext === kurztext);
  if (!k) throw new Error(`nicht in typisch: ${kurztext}`);
  return k.id;
};

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Leistungsverzeichnis' });
const zeile = (page: Page, kurztext: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({ has: page.getByText(kurztext, { exact: true }) });
const zelle = (page: Page, kurztext: string, spalte: string): Locator =>
  zeile(page, kurztext).locator(`[data-spalte="${spalte}"]`);
const status = (page: Page): Locator => page.locator('.tx-grid__status');
const ANSAGE = 'Schreibgeschützt: Hier lässt sich nichts ändern.';

test.describe('schreibgeschütztes Grid', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?fixture=typisch&nurlesen=1&oeffnen=1&modus=live');
    await expect(grid(page)).toBeVisible();
  });

  test('Screenreader: Grid und alle Zellen sind als schreibgeschützt ausgezeichnet und beschrieben', async ({
    page,
  }) => {
    await expect(grid(page)).toHaveAttribute('aria-readonly', 'true');
    await expect(grid(page)).toHaveAccessibleDescription(ANSAGE);
    const zellen = grid(page).getByRole('gridcell');
    await expect(zellen.first()).toBeVisible();
    await expect(grid(page).locator('[role="gridcell"]:not([aria-readonly="true"])')).toHaveCount(0);
  });

  test('kein Editor: F2, Enter, Tippen, Entf und Doppelklick öffnen keinen; der Versuch wird angesagt', async ({
    page,
  }) => {
    const menge = zelle(page, 'Bauzaun stellen', 'menge');
    await menge.click();
    await page.keyboard.press('F2');
    await expect(grid(page).getByRole('textbox')).toHaveCount(0);
    await expect(status(page)).toHaveText(ANSAGE);
    await page.keyboard.type('5');
    await page.keyboard.press('Delete');
    await expect(grid(page).getByRole('textbox')).toHaveCount(0);
    await expect(menge).toHaveText('86,500');
    // Enter bewegt nach unten wie in einer Zelle ohne Eingabe.
    await page.keyboard.press('Enter');
    await expect(zelle(page, 'Baustrom und Bauwasser', 'menge')).toBeFocused();
    // Doppelklick öffnet die Zeile, auch auf einer sonst bearbeitbaren Zelle.
    await menge.dblclick();
    await expect(grid(page).getByRole('textbox')).toHaveCount(0);
    expect(await page.evaluate(() => window.__harness.geoeffnet)).toEqual([
      { knotenId: idVon('Bauzaun stellen'), spalte: 'menge' },
    ]);
    await page.keyboard.press('Control+Enter');
    expect(await page.evaluate(() => window.__harness.geoeffnet)).toHaveLength(2);
  });

  test('keine Zeilenaktionen außer Kopieren: kein Befehl, kein Löschdialog, die Zeilen bleiben', async ({
    page,
  }) => {
    const vorher = await grid(page).getByRole('row').count();
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    for (const taste of [
      'Control+x',
      'Control+Delete',
      'Control+Minus',
      'Alt+ArrowDown',
      'Control+Shift+Equal',
    ]) {
      // Kopieren setzt eine andere Ansage; so zeigt jede Taste ihre eigene.
      await page.keyboard.press('Control+c');
      await expect(status(page)).toHaveText('1 Zeile kopiert.');
      await page.keyboard.press(taste);
      await expect(status(page), taste).toHaveText(ANSAGE);
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(zeile(page, 'Bauzaun stellen')).toHaveClass(/tx-grid__zeile--ausgewaehlt/);
    await expect(zeile(page, 'Bauzaun stellen')).not.toHaveClass(/ausgeschnitten/);

    // Einfügen (fremder Text) legt nichts an.
    await page.evaluate(() => navigator.clipboard.writeText('Neue Position\t1\tm\t2'));
    await page.keyboard.press('Control+v');
    await expect(status(page)).toHaveText(ANSAGE);

    // Kopieren ändert nichts und bleibt erlaubt.
    await page.keyboard.press('Control+c');
    await expect(status(page)).toHaveText('1 Zeile kopiert.');
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Bauzaun stellen');

    expect(await page.evaluate(() => window.__harness.befehle)).toEqual([]);
    await expect(grid(page).getByRole('row')).toHaveCount(vorher);
  });

  test('Fokus, Navigation, Auswahl und Aufklappen funktionieren', async ({ page }) => {
    await page.getByRole('button', { name: 'Davor' }).focus();
    await page.keyboard.press('Tab');
    await expect(grid(page).locator('[data-i="0"] [data-spalte="ordnungszahl"]')).toBeFocused();
    await page.keyboard.press('Control+End');
    await expect(page.locator(':focus')).toHaveAttribute('data-spalte', 'gesamtpreis');
    await page.keyboard.press('Control+Home');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator(':focus')).toHaveAttribute('data-spalte', 'kurztext');

    // Zuklappen per Tastatur (Baumspalte)
    const titel = zeile(page, 'Baustelleneinrichtung und Vorarbeiten');
    await expect(titel).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(titel).toHaveAttribute('aria-expanded', 'false');
    await expect(zeile(page, 'Bauzaun stellen')).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    await expect(zeile(page, 'Bauzaun stellen')).toHaveCount(1);

    // Auswahl
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Shift+ArrowDown');
    await expect
      .poll(() => page.evaluate(() => window.__harness.auswahl))
      .toEqual([idVon('Bauzaun stellen'), idVon('Baustrom und Bauwasser')]);
    await page.keyboard.press(' ');
    await expect
      .poll(() => page.evaluate(() => window.__harness.auswahl))
      .toEqual([idVon('Bauzaun stellen')]);
    await expect(page.locator(':focus')).toHaveAttribute('data-spalte', 'kurztext');
  });
});
