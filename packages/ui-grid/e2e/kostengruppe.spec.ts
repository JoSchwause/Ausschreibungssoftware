// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 93: die Spalte „KG“ im LV-Grid. Bearbeiten wie Menge und EP (U3), formwidrige Eingabe als Zellfehler (die Form
// prüft die Lesefunktion der App, hier die Attrappe), Einfügen einer Spalte setzt mehrere Kostengruppen als eine Folge,
// Tastaturnavigation über die Spalte, Prüfhinweis an der Zelle (U5) und die Ausnahme im schreibgeschützten Grid
// (Auftrags-LV). Die Testseite mit `kg=1` gibt den Positionen der Reihe nach 310, 320 und keine Kostengruppe.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const typisch = (
  JSON.parse(readFileSync(new URL('../../../fixtures/typisch.json', import.meta.url), 'utf8')) as {
    knoten: { id: string; art: string; kurztext?: string }[];
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
const kg = (page: Page, kurztext: string): Locator => zelle(page, kurztext, 'kostengruppe');
const befehle = (page: Page): Promise<unknown[]> => page.evaluate(() => window.__harness.befehle);
const folgen = (page: Page): Promise<unknown[][]> => page.evaluate(() => window.__harness.folgen);
const status = (page: Page): Locator => page.locator('.tx-grid__status');
const uebernehmen = (page: Page): Promise<void> =>
  page.evaluate(() => {
    window.__harness.uebernehmen();
  });
const setzen = (kurztext: string, kostengruppe: string | null): unknown => ({
  art: 'KostengruppeSetzen',
  positionId: idVon(kurztext),
  kostengruppe,
});
const FORMFEHLER = 'Keine Kostengruppennummer (drei Ziffern, die erste nicht 0).';

test.describe('Spalte „KG“ im bearbeitbaren Grid', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?fixture=typisch&kg=1&folge=1&modus=attrappe');
    await expect(grid(page)).toBeVisible();
  });

  test('steht am Ende; zeigt die Nummer der Position, an Gliederung und Hinweistext nichts und ist dort schreibgeschützt', async ({
    page,
  }) => {
    await expect(grid(page)).toHaveAttribute('aria-colcount', '8');
    const kopf = grid(page).getByRole('columnheader').last();
    await expect(kopf).toHaveText('KG');
    await expect(kopf).toHaveAttribute('aria-colindex', '8');
    await expect(kg(page, 'Baustelle einrichten')).toHaveText('310');
    await expect(kg(page, 'Bauzaun stellen')).toHaveText('320');
    await expect(kg(page, 'Baustrom und Bauwasser')).toHaveText('');
    await expect(kg(page, 'Bauzaun stellen')).not.toHaveAttribute('aria-readonly');
    const titel = kg(page, 'Baustelleneinrichtung und Vorarbeiten');
    await expect(titel).toHaveText('');
    await expect(titel).toHaveAttribute('aria-readonly', 'true');
    const hinweis = grid(page).locator('.tx-grid__zeile--hinweis [data-spalte="kostengruppe"]').first();
    await expect(hinweis).toHaveText('');
    await expect(hinweis).toHaveAttribute('aria-readonly', 'true');
    // F2 an der Gliederung: kein Editor, nur die Ansage
    await titel.click();
    await page.keyboard.press('F2');
    await expect(grid(page).getByRole('textbox')).toHaveCount(0);
    await expect(status(page)).toHaveText('Diese Zelle lässt sich nicht bearbeiten.');
  });

  test('Enter und F2 starten, Enter und Tab übernehmen; leer entfernt die Zuordnung, Entf leert, Tippen beginnt', async ({
    page,
  }) => {
    await kg(page, 'Baustrom und Bauwasser').click();
    await page.keyboard.press('Enter');
    const editor = kg(page, 'Baustrom und Bauwasser').getByRole('textbox', { name: 'KG' });
    await expect(editor).toBeFocused();
    await expect(editor).toHaveValue('');
    await page.keyboard.type('330');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toEqual([setzen('Baustrom und Bauwasser', '330')]);
    // Enter geht nach unten; angezeigt wird erst, was neu hereinkommt
    await expect(kg(page, 'Verkehrssicherung Zufahrt')).toBeFocused();
    await expect(kg(page, 'Baustrom und Bauwasser')).toHaveText('');

    await kg(page, 'Bauzaun stellen').click();
    await page.keyboard.press('F2');
    await expect(kg(page, 'Bauzaun stellen').getByRole('textbox')).toHaveValue('320');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Tab');
    expect((await befehle(page))[1]).toEqual(setzen('Bauzaun stellen', null));
    // Tab in der letzten Spalte geht an den Anfang der nächsten Zeile
    await expect(zelle(page, 'Baustrom und Bauwasser', 'ordnungszahl')).toBeFocused();

    await kg(page, 'Baustelle einrichten').click();
    await page.keyboard.press('Delete');
    expect((await befehle(page))[2]).toEqual(setzen('Baustelle einrichten', null));

    await kg(page, 'Verkehrssicherung Zufahrt').click();
    await page.keyboard.type('3');
    await expect(kg(page, 'Verkehrssicherung Zufahrt').getByRole('textbox')).toHaveValue('3');
    await page.keyboard.type('40');
    await page.keyboard.press('Enter');
    expect((await befehle(page))[3]).toEqual(setzen('Verkehrssicherung Zufahrt', '340'));
    // jede Eingabe ist genau ein Befehl, keine Folge
    expect(await folgen(page)).toEqual([]);

    await uebernehmen(page);
    await expect(kg(page, 'Baustrom und Bauwasser')).toHaveText('330');
    await expect(kg(page, 'Bauzaun stellen')).toHaveText('');
    await expect(kg(page, 'Baustelle einrichten')).toHaveText('');
    await expect(kg(page, 'Verkehrssicherung Zufahrt')).toHaveText('340');
  });

  test('formwidrige Eingabe ist ein Zellfehler statt eines Befehls; Escape bricht ab, die Korrektur übernimmt', async ({
    page,
  }) => {
    const zelleKg = kg(page, 'Baustrom und Bauwasser');
    await zelleKg.click();
    await page.keyboard.type('33');
    // der Hinweis erscheint schon am Feld und sperrt nichts
    await expect(zelleKg.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toEqual([]);
    await expect(zelleKg).toHaveAttribute('aria-invalid', 'true');
    await expect(zelleKg).toContainText('33');
    await expect(zelleKg).toHaveAccessibleDescription(`Eingabe nicht übernommen: ${FORMFEHLER}`);
    await expect(status(page)).toHaveText(`Eingabe nicht übernommen: ${FORMFEHLER}`);

    // Escape verwirft den Entwurf: kein Befehl, die Markierung bleibt, der Fokus kehrt in die Zelle zurück
    await zelleKg.click();
    await page.keyboard.press('F2');
    await expect(zelleKg.getByRole('textbox')).toHaveValue('33');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('390');
    await page.keyboard.press('Escape');
    expect(await befehle(page)).toEqual([]);
    await expect(zelleKg).toBeFocused();
    await expect(zelleKg).toContainText('33');

    // Escape an einer Zelle mit Nummer: Wert unverändert
    await kg(page, 'Bauzaun stellen').click();
    await page.keyboard.type('999');
    await page.keyboard.press('Escape');
    await expect(kg(page, 'Bauzaun stellen')).toHaveText('320');
    await expect(kg(page, 'Bauzaun stellen')).toBeFocused();

    await zelleKg.click();
    await page.keyboard.press('F2');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('390');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toEqual([setzen('Baustrom und Bauwasser', '390')]);
    await expect(zelleKg).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('eine Spalte aus der Zwischenablage setzt die KG der Zeilen ab der aktiven als eine Folge; ein Fehler verwirft nur seine Zelle', async ({
    page,
  }) => {
    await kg(page, 'Baustelle einrichten').click();
    await page.evaluate((text) => navigator.clipboard.writeText(text), '390\r\n3x\r\n330\r\n');
    await page.keyboard.press('Control+V');
    expect(await folgen(page)).toEqual([
      [setzen('Baustelle einrichten', '390'), setzen('Baustrom und Bauwasser', '330')],
    ]);
    await expect(status(page)).toHaveText('2 Kostengruppen geändert, 1 Zelle ungültig (markiert).');
    // keine neue Position
    expect((await befehle(page)).filter((b) => (b as { art: string }).art === 'PositionAnlegen')).toEqual([]);
    const fehler = kg(page, 'Bauzaun stellen');
    await expect(fehler).toHaveAttribute('aria-invalid', 'true');
    await expect(fehler).toContainText('3x');

    await uebernehmen(page);
    await expect(kg(page, 'Baustelle einrichten')).toHaveText('390');
    await expect(kg(page, 'Baustrom und Bauwasser')).toHaveText('330');
    // die Kostengruppe der Zeile mit dem Fehler bleibt, die Zelle bleibt markiert
    await expect(fehler).toContainText('3x');
    await expect(fehler).toHaveAttribute('aria-invalid', 'true');

    // ab einer Gliederung: deren Nummer wird übersprungen, eine gleiche Nummer ist keine Änderung
    await kg(page, 'Erd- und Betonarbeiten').click();
    await page.evaluate((text) => navigator.clipboard.writeText(text), '300\r\n310\r\n');
    await page.keyboard.press('Control+V');
    expect(await folgen(page)).toHaveLength(1);
    await expect(status(page)).toHaveText('Keine Kostengruppe geändert, 1 Zelle ohne Position übersprungen.');
  });

  test('Zeilen aus Excel mit der Spalte „KG“ legen Positionen mit Kostengruppe an', async ({ page }) => {
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.evaluate(
      (text) => navigator.clipboard.writeText(text),
      'Neu A\t1\tm\t2\t\t340\r\nNeu B\t2\tm\t3\t\t34\r\n',
    );
    await page.keyboard.press('Control+V');
    const [folge] = (await folgen(page)) as { art: string; daten: Record<string, unknown> }[][];
    expect(folge?.map((b) => b.art)).toEqual(['PositionAnlegen', 'PositionAnlegen']);
    expect(folge?.[0]?.daten).toMatchObject({ kurztext: 'Neu A', kostengruppe: '340' });
    expect(folge?.[1]?.daten).not.toHaveProperty('kostengruppe');
    await expect(status(page)).toHaveText(
      '2 Positionen eingefügt, 1 Zelle ungültig (markiert), 2 Zellen in schreibgeschützten Spalten übersprungen.',
    );
    await uebernehmen(page);
    await expect(kg(page, 'Neu A')).toHaveText('340');
    await expect(kg(page, 'Neu B')).toHaveAttribute('aria-invalid', 'true');
    await expect(kg(page, 'Neu B')).toContainText('34');
  });

  test('Tastatur: Ende, Tab und Pfeile erreichen die Spalte; im schmalen Fenster scrollt das Grid sie in den Blick', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 820, height: 800 });
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('End');
    await expect(kg(page, 'Bauzaun stellen')).toBeFocused();
    await expect(kg(page, 'Bauzaun stellen')).toBeInViewport({ ratio: 1 });
    expect(await grid(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await page.keyboard.press('ArrowDown');
    await expect(kg(page, 'Baustrom und Bauwasser')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(zelle(page, 'Baustrom und Bauwasser', 'gesamtpreis')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(kg(page, 'Baustrom und Bauwasser')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(zelle(page, 'Verkehrssicherung Zufahrt', 'ordnungszahl')).toBeFocused();
    await expect(zelle(page, 'Verkehrssicherung Zufahrt', 'ordnungszahl')).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Shift+Tab');
    await expect(kg(page, 'Baustrom und Bauwasser')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(zelle(page, 'Baustrom und Bauwasser', 'ordnungszahl')).toBeFocused();
    expect(await grid(page).evaluate((el) => el.scrollLeft)).toBe(0);
    await page.keyboard.press('Control+End');
    await expect(page.locator(':focus')).toHaveAttribute('data-spalte', 'kostengruppe');
    await expect(page.locator(':focus')).toBeInViewport({ ratio: 1 });
  });
});

test('ein Prüfhinweis zur Kostengruppe steht an der KG-Zelle und sperrt nichts (U5)', async ({ page }) => {
  await page.goto('/?fixture=typisch&kg=1&befunde=1&modus=attrappe');
  const zelleKg = kg(page, 'Baugrube verfüllen');
  await expect(zelleKg).toHaveClass(/tx-grid__zelle--warnung/);
  await expect(zelleKg).toHaveAccessibleDescription(
    'Warnung: Die Kostengruppe liegt in keiner Kostenermittlung.',
  );
  await zelleKg.click();
  await page.keyboard.type('350');
  await page.keyboard.press('Enter');
  expect(await befehle(page)).toEqual([setzen('Baugrube verfüllen', '350')]);
});

test.describe('schreibgeschütztes Grid mit bearbeitbarer Spalte „KG“ (Auftrags-LV)', () => {
  const ANSAGE = 'Schreibgeschützt: Nur die Spalte KG lässt sich ändern.';

  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?fixture=typisch&kg=1&nurlesen=1&modus=live');
    await expect(grid(page)).toBeVisible();
  });

  test('nur die KG-Zellen der Positionen sind bearbeitbar; alles andere bleibt schreibgeschützt und wird angesagt', async ({
    page,
  }) => {
    await expect(grid(page)).not.toHaveAttribute('aria-readonly');
    await expect(grid(page)).toHaveAccessibleDescription(ANSAGE);
    await expect(zelle(page, 'Bauzaun stellen', 'menge')).toHaveAttribute('aria-readonly', 'true');
    await expect(kg(page, 'Bauzaun stellen')).not.toHaveAttribute('aria-readonly');
    await expect(kg(page, 'Baustelleneinrichtung und Vorarbeiten')).toHaveAttribute('aria-readonly', 'true');

    await zelle(page, 'Bauzaun stellen', 'menge').click();
    await page.keyboard.press('F2');
    await expect(grid(page).getByRole('textbox')).toHaveCount(0);
    await expect(status(page)).toHaveText(ANSAGE);
    for (const taste of ['Control+x', 'Control+Delete', 'Alt+ArrowDown', 'Control+Shift+Equal']) {
      await page.keyboard.press('Control+c');
      await expect(status(page)).toHaveText('1 Zeile kopiert.');
      await page.keyboard.press(taste);
      await expect(status(page), taste).toHaveText(ANSAGE);
    }
    // Zeilen aus Excel legen nichts an
    await page.evaluate(() => navigator.clipboard.writeText('Neue Position\t1\tm\t2'));
    await page.keyboard.press('Control+v');
    await expect(status(page)).toHaveText(ANSAGE);
    expect(await befehle(page)).toEqual([]);
  });

  test('Eingabe, Entf und Einfügen einer Spalte gehen als Folgen von KostengruppeSetzen hinaus', async ({
    page,
  }) => {
    await kg(page, 'Baustrom und Bauwasser').click();
    await page.keyboard.press('Enter');
    await page.keyboard.type('330');
    await page.keyboard.press('Enter');
    expect(await folgen(page)).toEqual([[setzen('Baustrom und Bauwasser', '330')]]);
    await expect(kg(page, 'Baustrom und Bauwasser')).toHaveText('330');

    await kg(page, 'Bauzaun stellen').click();
    await page.keyboard.press('Delete');
    expect((await folgen(page))[1]).toEqual([setzen('Bauzaun stellen', null)]);
    await expect(kg(page, 'Bauzaun stellen')).toHaveText('');

    await kg(page, 'Baustelle einrichten').click();
    await page.evaluate(() => navigator.clipboard.writeText('390\r\n340\r\n'));
    await page.keyboard.press('Control+v');
    expect((await folgen(page))[2]).toEqual([
      setzen('Baustelle einrichten', '390'),
      setzen('Bauzaun stellen', '340'),
    ]);
    await expect(kg(page, 'Bauzaun stellen')).toHaveText('340');
    await expect(status(page)).toHaveText('2 Kostengruppen geändert.');
  });
});
