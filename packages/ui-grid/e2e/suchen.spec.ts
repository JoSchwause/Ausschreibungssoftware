// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 156: Suchen (Strg+F) über OZ, Kurztext und Langtext mit Sprung zum Treffer, Filter nach Art, Merkmal und „ohne
// Preis“ (sichtbar, ein Klick hebt auf) und das Kontextmenü an Zeile und Zelle mit denselben Aktionen wie die Tasten.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Leistungsverzeichnis' });
const zeilen = (page: Page): Locator => grid(page).locator('.tx-grid__koerper [role="row"]');
const zeile = (page: Page, kurztext: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({ has: page.getByText(kurztext, { exact: true }) });
const zelle = (page: Page, kurztext: string, spalte: string): Locator =>
  zeile(page, kurztext).locator(`[data-spalte="${spalte}"]`);
const status = (page: Page): Locator => page.locator('.tx-grid__status');
const leiste = (page: Page): Locator => page.getByRole('search', { name: 'Suchen und filtern' });
const suchfeld = (page: Page): Locator =>
  page.getByRole('searchbox', { name: 'Suchen in Ordnungszahl, Kurztext und Langtext' });
const menue = (page: Page): Locator => page.getByRole('menu', { name: 'Aktionen der Zelle' });
const punkt = (page: Page, name: string): Locator => menue(page).getByRole('menuitem', { name });
/** Kurztexte der gezeigten Zeilen (Hinweistexte gekürzt auf ihren Anfang). */
const kurztexte = async (page: Page): Promise<string[]> =>
  (await zeilen(page).locator('[data-spalte="kurztext"]').allInnerTexts()).map((t) => t.trim().slice(0, 20));

test.describe('Suchen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?fixture=typisch&alle=1&langtext=1');
    await expect(grid(page)).toBeVisible();
  });

  test('Strg+F, Tippen springt ohne Fokusverlust, Enter und Umschalt+Enter wandern, Esc kehrt ins Grid zurück', async ({
    page,
  }) => {
    await zelle(page, 'Baustelle einrichten', 'kurztext').click();
    await page.keyboard.press('Control+f');
    await expect(suchfeld(page)).toBeFocused();
    await page.keyboard.type('baugrube');
    await expect(suchfeld(page)).toBeFocused();
    await expect(zelle(page, 'Baugrube ausheben', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);
    await expect(leiste(page)).toContainText('1 von 2');
    await expect(status(page)).toHaveText('Treffer 1 von 2 im Kurztext.');

    await page.keyboard.press('Enter');
    await expect(zelle(page, 'Baugrube verfüllen', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);
    await expect(leiste(page)).toContainText('2 von 2');
    await page.keyboard.press('Enter');
    await expect(zelle(page, 'Baugrube ausheben', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);
    await page.keyboard.press('Shift+Enter');
    await expect(zelle(page, 'Baugrube verfüllen', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);

    await page.keyboard.press('Escape');
    await expect(leiste(page)).toHaveCount(0);
    await expect(zelle(page, 'Baugrube verfüllen', 'kurztext')).toBeFocused();
    // F3 im Grid: weiter mit derselben Anfrage, der Fokus bleibt im Grid.
    await page.keyboard.press('F3');
    await expect(zelle(page, 'Baugrube ausheben', 'kurztext')).toBeFocused();
    await page.keyboard.press('Shift+F3');
    await expect(zelle(page, 'Baugrube verfüllen', 'kurztext')).toBeFocused();
  });

  test('findet im Langtext und in der OZ samt Index; ohne Treffer eine Ansage', async ({ page }) => {
    await zelle(page, 'Baustelle einrichten', 'kurztext').click();
    await page.keyboard.press('Control+f');
    await page.keyboard.type('betonfüßen');
    await expect(zelle(page, 'Bauzaun stellen', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);
    await expect(status(page)).toHaveText('Treffer 1 von 1 im Langtext.');

    await suchfeld(page).fill('02.0050a');
    await expect(zelle(page, 'Zuschlag Frosteinbau', 'ordnungszahl')).toHaveClass(/tx-grid__zelle--aktiv/);
    await expect(status(page)).toHaveText('Treffer 1 von 1 in der Ordnungszahl.');

    await suchfeld(page).fill('gibt es nicht');
    await expect(leiste(page)).toContainText('Keine Treffer.');
  });

  test('ein Treffer unter zugeklappten Gliederungen klappt sie auf', async ({ page }) => {
    await page.goto('/?fixture=typisch&alle=1&auf=keine');
    await expect(zeile(page, 'Drainage verlegen')).toHaveCount(0);
    await zelle(page, 'Baustelleneinrichtung und Vorarbeiten', 'kurztext').click();
    await page.keyboard.press('Control+f');
    await page.keyboard.type('drainage');
    await expect(zelle(page, 'Drainage verlegen', 'kurztext')).toHaveClass(/tx-grid__zelle--aktiv/);
    await expect(zeile(page, 'Erd- und Betonarbeiten')).toHaveAttribute('aria-expanded', 'true');
    await expect(suchfeld(page)).toBeFocused();
  });

  test('ohne alle Zeilen sucht das Grid nur in den sichtbaren', async ({ page }) => {
    await page.goto('/?fixture=typisch&auf=keine');
    await zelle(page, 'Baustelleneinrichtung und Vorarbeiten', 'kurztext').click();
    await page.keyboard.press('Control+f');
    await page.keyboard.type('drainage');
    await expect(leiste(page)).toContainText('Keine Treffer.');
  });
});

test.describe('Filtern', () => {
  test('nach Merkmal: Treffer mit Gliederung, Filter bleibt sichtbar und ein Klick hebt ihn auf', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&alle=1');
    const vorher = await zeilen(page).count();
    await zelle(page, 'Baustelle einrichten', 'kurztext').click();
    await page.keyboard.press('Control+f');
    await leiste(page).getByLabel('Merkmal').selectOption({ label: 'Bedarf' });
    await expect.poll(() => kurztexte(page)).toEqual(['Baustelleneinrichtun', 'Verkehrssicherung Zu']);
    await expect(leiste(page)).toContainText(`Gefiltert: Bedarf · 2 von ${String(vorher)} Zeilen`);
    // Im Filter ist alles offen, nichts lässt sich klappen; Verschieben wäre über verborgene Zeilen hinweg und ist gesperrt.
    await expect(zeile(page, 'Baustelleneinrichtung und Vorarbeiten')).not.toHaveAttribute(
      'aria-expanded',
      /.*/,
    );
    await zelle(page, 'Verkehrssicherung Zufahrt', 'kurztext').click();
    await page.keyboard.press('Alt+ArrowUp');
    await expect(status(page)).toContainText(
      'Im gefilterten Leistungsverzeichnis lässt sich nicht verschieben',
    );

    // Suche zu: Der Filter bleibt als Zeile über dem Grid stehen.
    await page.keyboard.press('Control+f');
    await page.keyboard.press('Escape');
    await expect(suchfeld(page)).toHaveCount(0);
    await expect(leiste(page)).toContainText('Gefiltert: Bedarf');
    await leiste(page).getByRole('button', { name: 'Filter aufheben' }).click();
    await expect(leiste(page)).toHaveCount(0);
    await expect(zeilen(page)).toHaveCount(vorher);
    await expect(zelle(page, 'Verkehrssicherung Zufahrt', 'kurztext')).toBeFocused();
  });

  test('nach Art und „ohne Preis“; der Filter folgt geänderten Daten', async ({ page }) => {
    await page.goto('/?fixture=typisch&alle=1&modus=live');
    await zelle(page, 'Baustelle einrichten', 'kurztext').click();
    await page.keyboard.press('Control+f');
    await leiste(page).getByLabel('Art').selectOption({ label: 'Hinweistexte' });
    await expect
      .poll(() => kurztexte(page))
      .toEqual([
        'Baustelleneinrichtun',
        'Vorbemerkung (erfund',
        'Ausbau und Oberfläch',
        'Vorbemerkung (erfund',
      ]);
    await leiste(page).getByLabel('Art').selectOption({ label: 'Alle Arten' });
    await leiste(page).getByLabel('ohne Preis').check();
    await expect(grid(page)).toContainText('Keine Zeile passt zum Filter.');
    await leiste(page).getByLabel('ohne Preis').uncheck();
    // EP leeren: Danach steht die Position im Filter „ohne Preis“.
    await zelle(page, 'Bauzaun stellen', 'einheitspreis').click();
    await page.keyboard.press('Delete');
    await leiste(page).getByLabel('ohne Preis').check();
    await expect.poll(() => kurztexte(page)).toEqual(['Baustelleneinrichtun', 'Bauzaun stellen']);
  });
});

test.describe('Kontextmenü', () => {
  test('rechte Maustaste an einer Zelle: Aktionen mit ihren Tasten, gewählt wie per Tastatur', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&hilfe=1');
    await zelle(page, 'Bauzaun stellen', 'menge').click({ button: 'right' });
    await expect(menue(page)).toBeVisible();
    await expect(zelle(page, 'Bauzaun stellen', 'menge')).toHaveClass(/tx-grid__zelle--aktiv/);
    await expect(punkt(page, 'Zelle bearbeiten')).toContainText('F2');
    await expect(punkt(page, 'In den Papierkorb legen')).toContainText('StrgEntf');
    await expect(punkt(page, 'Gliederung aufklappen')).toHaveCount(0);

    await punkt(page, 'Zelle bearbeiten').click();
    await expect(menue(page)).toHaveCount(0);
    await expect(zelle(page, 'Bauzaun stellen', 'menge').locator('input')).toBeFocused();
    await page.keyboard.press('Escape');

    await zelle(page, 'Bauzaun stellen', 'kurztext').click({ button: 'right' });
    await punkt(page, 'In den Papierkorb legen').click();
    await expect(page.getByRole('dialog', { name: 'In den Papierkorb legen' })).toBeVisible();
    await page.getByRole('button', { name: 'Abbrechen' }).click();

    await zelle(page, 'Bauzaun stellen', 'kurztext').click({ button: 'right' });
    await punkt(page, 'Tastenkürzel anzeigen').click();
    // Das Menü führt den Punkt erst aus, wenn es zu ist und der Fokus zurück im Grid steht (`onCloseAutoFocus`).
    await expect.poll(() => page.evaluate(() => window.__harness.kuerzelhilfe)).toBe(1);
  });

  test('Umschalt+F10 und Menütaste öffnen es an der aktiven Zelle; Esc gibt den Fokus zurück', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch');
    await zelle(page, 'Baustelleneinrichtung und Vorarbeiten', 'kurztext').click();
    await page.keyboard.press('Shift+F10');
    await expect(menue(page)).toBeVisible();
    await expect(punkt(page, 'Gliederung zuklappen')).toBeVisible();
    await expect(punkt(page, 'Zelle bearbeiten')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menue(page)).toHaveCount(0);
    await expect(zelle(page, 'Baustelleneinrichtung und Vorarbeiten', 'kurztext')).toBeFocused();

    await page.keyboard.press('ContextMenu');
    await expect(menue(page)).toBeVisible();
    await punkt(page, 'Gliederung zuklappen').click();
    await expect(zeile(page, 'Baustelleneinrichtung und Vorarbeiten')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(zelle(page, 'Baustelleneinrichtung und Vorarbeiten', 'kurztext')).toBeFocused();
  });

  test('Position anlegen und Suchen aus dem Menü; im schreibgeschützten Grid gesperrt', async ({ page }) => {
    await page.goto('/?fixture=typisch');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click({ button: 'right' });
    await punkt(page, 'Position anlegen').click();
    await expect
      .poll(() => page.evaluate(() => window.__harness.befehle.map((b) => b.art)))
      .toEqual(['PositionAnlegen']);
    await zelle(page, 'Bauzaun stellen', 'kurztext').click({ button: 'right' });
    await punkt(page, 'Suchen und filtern').click();
    await expect(suchfeld(page)).toBeFocused();

    await page.goto('/?fixture=typisch&nurlesen=1');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click({ button: 'right' });
    await expect(punkt(page, 'Position anlegen')).toBeDisabled();
    await expect(punkt(page, 'Zeilen kopieren')).toBeEnabled();
  });

  test('Kopieren und Einfügen aus dem Menü gehen denselben Weg wie Strg+C und Strg+V', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?fixture=typisch&kopie=1');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click({ button: 'right' });
    await punkt(page, 'Zeilen kopieren').click();
    await expect(status(page)).toHaveText('1 Zeile kopiert.');
    await zelle(page, 'Bauschutt entsorgen', 'kurztext').click({ button: 'right' });
    await punkt(page, 'Einfügen').click();
    await expect.poll(() => page.evaluate(() => window.__harness.kopien.length)).toBe(1);
  });
});
