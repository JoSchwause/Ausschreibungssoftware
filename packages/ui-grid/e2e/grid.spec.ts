// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { zahlenAttrappe } from './harness/attrappen';

interface FxLv {
  knoten: {
    id: string;
    art: string;
    kurztext?: string;
    menge?: string;
    einheit?: string;
    einheitspreis?: string;
  }[];
  sollwerte: {
    positionen: Record<string, { gp: string | null; inSumme: boolean }>;
    titel: Record<string, { summe: string }>;
    summen: { netto: string; nachlass: string; nettoNachNachlass: string; mwst: string; brutto: string };
  };
}
const typisch = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch.json', import.meta.url), 'utf8'),
) as FxLv;
const betrag = (s: string): string => zahlenAttrappe.formatBetrag(s as never);

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Leistungsverzeichnis' });
const zeile = (page: Page, kurztext: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({ has: page.getByText(kurztext, { exact: true }) });
const zelle = (page: Page, kurztext: string, spalte: string): Locator =>
  zeile(page, kurztext).locator(`[data-spalte="${spalte}"]`);
const befehle = (page: Page): Promise<unknown[]> => page.evaluate(() => window.__harness.befehle);

test.describe('typisch als Baum', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?fixture=typisch');
    await expect(grid(page)).toBeVisible();
  });

  test('zeigt Titel, Positionen und Hinweistexte als Baum mit den Sollsummen aus der Fixture', async ({
    page,
  }) => {
    const anzahl = typisch.knoten.length;
    await expect(grid(page)).toHaveAttribute('aria-rowcount', String(anzahl + 1));
    await expect(grid(page).getByRole('row')).toHaveCount(anzahl + 1); // alle 30 Zeilen plus Kopfzeile

    // Summenzeile: die Sollwerte, formatiert, nichts berechnet
    const s = typisch.sollwerte.summen;
    const summen = page.getByRole('group', { name: 'Summen' });
    for (const [name, wert] of [
      ['Netto', s.netto],
      ['Nachlass', s.nachlass],
      ['Netto nach Nachlass', s.nettoNachNachlass],
      ['MwSt', s.mwst],
      ['Brutto', s.brutto],
    ] as const) {
      await expect(
        summen.locator('.tx-grid__summe').filter({ has: page.getByText(name, { exact: true }) }),
      ).toContainText(betrag(wert));
    }

    // Titelsumme in der Gesamtpreis-Spalte
    const titel = typisch.knoten.find((k) => k.art === 'titel');
    if (!titel?.kurztext) throw new Error('Fixture ohne Titel');
    const titelSumme = typisch.sollwerte.titel[titel.id]?.summe ?? '';
    await expect(zelle(page, titel.kurztext, 'gesamtpreis')).toHaveText(betrag(titelSumme));
  });

  test('ARIA: treegrid mit Ebenen, Aufklappzustand und Zeilenindex', async ({ page }) => {
    const titel = typisch.knoten.find((k) => k.art === 'titel');
    const position = typisch.knoten.find((k) => k.art === 'position');
    if (!titel?.kurztext || !position?.kurztext) throw new Error('Fixture unvollständig');
    const titelZeile = zeile(page, titel.kurztext);
    await expect(titelZeile).toHaveAttribute('aria-level', '1');
    await expect(titelZeile).toHaveAttribute('aria-expanded', 'true');
    await expect(titelZeile).toHaveAttribute('aria-rowindex', '2'); // Kopfzeile ist 1
    await expect(zeile(page, position.kurztext)).toHaveAttribute('aria-level', '2');
    await expect(zeile(page, position.kurztext)).not.toHaveAttribute('aria-expanded');
    await expect(grid(page).getByRole('columnheader')).toHaveCount(7);
    await expect(grid(page)).toHaveAttribute('aria-colcount', '7');
    // genau eine Zelle ist per Tab erreichbar (roving tabindex)
    await expect(grid(page).locator('[role="gridcell"][tabindex="0"]')).toHaveCount(1);
  });

  test('Auf- und Zuklappen mit der Maus und der Tastatur; das Grid meldet nur, der Aufrufer entscheidet', async ({
    page,
  }) => {
    const anzahl = typisch.knoten.length;
    const titel = typisch.knoten.find((k) => k.art === 'titel');
    if (!titel?.kurztext) throw new Error('Fixture ohne Titel');
    const kinder = typisch.knoten.filter(
      (k) => (k as unknown as { parentId: string }).parentId === titel.id,
    ).length;

    await zeile(page, titel.kurztext).getByRole('button', { name: 'Zuklappen' }).click();
    await expect(zeile(page, titel.kurztext)).toHaveAttribute('aria-expanded', 'false');
    await expect(grid(page).getByRole('row')).toHaveCount(anzahl + 1 - kinder);

    // Tastatur: Pfeil rechts klappt auf, Pfeil links klappt zu (Baumspalte), Alt+Pfeil überall
    await zelle(page, titel.kurztext, 'kurztext').click();
    await page.keyboard.press('ArrowRight');
    await expect(zeile(page, titel.kurztext)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(zeile(page, titel.kurztext)).toHaveAttribute('aria-expanded', 'false');
    await zelle(page, titel.kurztext, 'menge').click();
    await page.keyboard.press('Alt+ArrowRight');
    await expect(zeile(page, titel.kurztext)).toHaveAttribute('aria-expanded', 'true');
  });

  test('Tastaturnavigation: Pfeile, Pos1/Ende, Tab und Umschalt+Tab', async ({ page }) => {
    const erste = typisch.knoten.find((k) => k.art === 'position');
    if (!erste?.kurztext) throw new Error('Fixture ohne Position');
    await zelle(page, erste.kurztext, 'kurztext').click();
    const aktiv = (): Promise<string | null> =>
      page.evaluate(() => {
        const el = document.activeElement;
        const zeile = el?.closest<HTMLElement>('[data-i]');
        return `${zeile?.dataset['i'] ?? '?'}:${el?.getAttribute('data-spalte') ?? '?'}`;
      });
    const start = await aktiv();
    const [i0] = (start ?? '').split(':').map(Number) as [number];
    await page.keyboard.press('ArrowDown');
    expect(await aktiv()).toBe(`${String(i0 + 1)}:kurztext`);
    await page.keyboard.press('ArrowRight');
    expect(await aktiv()).toBe(`${String(i0 + 1)}:menge`);
    await page.keyboard.press('End');
    expect(await aktiv()).toBe(`${String(i0 + 1)}:gesamtpreis`);
    await page.keyboard.press('Home');
    expect(await aktiv()).toBe(`${String(i0 + 1)}:ordnungszahl`);
    await page.keyboard.press('Tab');
    expect(await aktiv()).toBe(`${String(i0 + 1)}:positionsart`);
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    // am Zeilenanfang geht Umschalt+Tab in die letzte Zelle der Vorzeile
    expect(await aktiv()).toBe(`${String(i0)}:gesamtpreis`);
    await page.keyboard.press('Control+Home');
    expect(await aktiv()).toBe('0:ordnungszahl');
    await page.keyboard.press('Control+End');
    expect(await aktiv()).toBe(`${String(typisch.knoten.length - 1)}:gesamtpreis`);
  });

  test('Mehrfachauswahl: Umschalt+Pfeil, Strg+Klick, Strg+A', async ({ page }) => {
    const positionen = typisch.knoten.filter((k) => k.art === 'position');
    const [a, b, c] = [positionen[0]?.kurztext, positionen[1]?.kurztext, positionen[3]?.kurztext];
    if (!a || !b || !c) throw new Error('Fixture zu klein');
    await zelle(page, a, 'kurztext').click();
    await page.keyboard.press('Shift+ArrowDown');
    await expect(grid(page).locator('[role="row"][aria-selected="true"]')).toHaveCount(2);
    await zelle(page, c, 'kurztext').click({ modifiers: ['ControlOrMeta'] });
    await expect(grid(page).locator('[role="row"][aria-selected="true"]')).toHaveCount(3);
    expect(await page.evaluate(() => window.__harness.auswahl.length)).toBe(3);
    await page.keyboard.press('Control+a');
    await expect(grid(page).locator('[role="row"][aria-selected="true"]')).toHaveCount(typisch.knoten.length);
  });
});

test.describe('Bearbeiten (Attrappen-Handler: die Eigenschaften ändern sich nicht von selbst)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?fixture=typisch&modus=attrappe');
    await expect(grid(page)).toBeVisible();
  });

  test('F2, Tab, Enter und Escape; jede Eingabe ist genau ein Befehl, angezeigt wird nur, was neu hereinkommt', async ({
    page,
  }) => {
    const kurz = 'Bauzaun stellen';
    const menge = zelle(page, kurz, 'menge');
    await expect(menge).toHaveText('86,500');

    // F2 + Eingabe + Tab: bestätigt und geht in die nächste Zelle (Einheit)
    await menge.click();
    await page.keyboard.press('F2');
    const editor = menge.getByRole('textbox', { name: 'Menge' });
    await expect(editor).toBeFocused();
    await expect(editor).toHaveValue('86,500');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('1.234,5');
    await page.keyboard.press('Tab');
    expect(await befehle(page)).toEqual([
      expect.objectContaining({ art: 'MengeAendern', menge: '1234.500' }),
    ]);
    // Kein zweiter Wahrheitszustand: Die Zelle zeigt weiter den Wert aus den Eigenschaften.
    await expect(menge).toHaveText('86,500');
    await expect(menge.getByRole('textbox')).toHaveCount(0);
    await expect(zelle(page, kurz, 'einheit')).toBeFocused();

    // Enter bearbeitet, Enter bestätigt und geht nach unten
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('lfm');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toHaveLength(2);
    expect((await befehle(page))[1]).toMatchObject({ art: 'EinheitAendern', einheit: 'lfm' });
    await expect(zelle(page, kurz, 'einheit')).toHaveText('m');
    const naechste = typisch.knoten.filter((k) => k.art !== 'hinweis');
    const nach = naechste[naechste.findIndex((k) => k.kurztext === kurz) + 1]?.kurztext;
    if (!nach) throw new Error('keine Folgezeile');
    await expect(zelle(page, nach, 'einheit')).toBeFocused();

    // Tippen beginnt die Eingabe, Escape verwirft: kein Befehl, Wert unverändert, Fokus zurück in der Zelle
    const vorher = await zelle(page, nach, 'einheit').innerText();
    await page.keyboard.type('xyz');
    await expect(zelle(page, nach, 'einheit').getByRole('textbox')).toHaveValue('xyz');
    await page.keyboard.press('Escape');
    expect(await befehle(page)).toHaveLength(2);
    await expect(zelle(page, nach, 'einheit')).toHaveText(vorher);
    await expect(zelle(page, nach, 'einheit')).toBeFocused();

    // Erst wenn neue Eigenschaften ankommen, ändert sich die Anzeige
    await page.evaluate(() => {
      window.__harness.uebernehmen();
    });
    await expect(menge).toHaveText('1.234,500');
    await expect(zelle(page, kurz, 'einheit')).toHaveText('lfm');
  });

  test('Eingabe unverändert bestätigt erzeugt keinen Befehl; Entf leert eine Zelle als Befehl', async ({
    page,
  }) => {
    const kurz = 'Bauzaun stellen';
    await zelle(page, kurz, 'menge').click();
    await page.keyboard.press('F2');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toHaveLength(0);
    await zelle(page, kurz, 'einheitspreis').click();
    await page.keyboard.press('Delete');
    expect(await befehle(page)).toEqual([
      expect.objectContaining({ art: 'EinheitspreisAendern', einheitspreis: null }),
    ]);
  });

  test('Mausklick auf eine andere Zelle bestätigt die Eingabe; Doppelklick beginnt sie', async ({ page }) => {
    const kurz = 'Bauzaun stellen';
    await zelle(page, kurz, 'einheit').dblclick();
    await expect(zelle(page, kurz, 'einheit').getByRole('textbox')).toBeFocused();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('lfm');
    await zelle(page, kurz, 'kurztext').click();
    expect(await befehle(page)).toEqual([expect.objectContaining({ art: 'EinheitAendern', einheit: 'lfm' })]);
    await expect(zelle(page, kurz, 'einheit').getByRole('textbox')).toHaveCount(0);
  });

  test('Tab am Anfang und Ende des Grids verlässt das Grid (kein Tastaturfang)', async ({ page }) => {
    const erste = grid(page).locator('[data-i="0"] [data-spalte="ordnungszahl"]');
    await erste.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Davor' })).toBeFocused();
    await erste.focus();
    await page.keyboard.press('Control+End');
    await expect(page.locator(':focus')).toHaveAttribute('data-spalte', 'gesamtpreis');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Danach' })).toBeFocused();
    // zurück in das Grid: Umschalt+Tab landet auf der zuletzt aktiven Zelle (roving tabindex)
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-spalte', 'gesamtpreis');
  });

  test('ungültige Zahl sperrt nichts: kein Befehl, Eingabe bleibt sichtbar markiert, Korrektur ersetzt die Markierung', async ({
    page,
  }) => {
    const kurz = 'Bauzaun stellen';
    const ep = zelle(page, kurz, 'einheitspreis');
    await ep.click();
    await page.keyboard.type('zwölf');
    // der Hinweis zum Format erscheint am Feld, das Feld nimmt alles an
    await expect(ep.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toHaveLength(0);
    await expect(ep).toHaveAttribute('aria-invalid', 'true');
    await expect(ep).toContainText('zwölf');
    await expect(page.getByRole('status')).toContainText('Eingabe nicht übernommen');

    // Korrektur: erneut bearbeiten startet mit dem abgelehnten Text
    await ep.click();
    await page.keyboard.press('F2');
    await expect(ep.getByRole('textbox')).toHaveValue('zwölf');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('8,25');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toEqual([
      expect.objectContaining({ art: 'EinheitspreisAendern', einheitspreis: '8.250' }),
    ]);
    await expect(ep).not.toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('Einfügen aus der Zwischenablage', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/?fixture=typisch&modus=attrappe');
    await expect(grid(page)).toBeVisible();
  });

  const excel = [
    'Fundament herstellen\t12,5\tm³\t95,50',
    '"Bewehrung,\nzweilagig"\t1.250,000\tkg\t1,85',
    'Schalung\tviel\tm²\t28',
    'Entwässerung\t3\tSt\t210,5',
    'Abdichtung\t60,25\tm²\t17,9',
    '',
  ].join('\r\n');

  test('5 Zeilen mit deutschen Zahlen erzeugen 5 Befehle; ungültige Zellen werden markiert, nicht verworfen', async ({
    page,
  }) => {
    const anker = 'Bauzaun stellen';
    await zelle(page, anker, 'kurztext').click();
    await page.evaluate((text) => navigator.clipboard.writeText(text), excel);
    await page.keyboard.press('Control+V');

    const ausgabe = (await befehle(page)) as {
      art: string;
      id: string;
      ort: unknown;
      daten: Record<string, unknown>;
    }[];
    expect(ausgabe).toHaveLength(5);
    expect(ausgabe.map((b) => b.art)).toEqual(Array<string>(5).fill('PositionAnlegen'));
    expect(ausgabe[0]?.ort).toMatchObject({ art: 'nach' });
    expect(ausgabe[1]?.ort).toEqual({ art: 'nach', knotenId: ausgabe[0]?.id });
    expect(ausgabe[0]?.daten).toMatchObject({
      kurztext: 'Fundament herstellen',
      menge: '12.500',
      einheit: 'm³',
      einheitspreis: '95.500',
    });
    expect(ausgabe[1]?.daten).toMatchObject({
      kurztext: 'Bewehrung,\nzweilagig',
      menge: '1250.000',
      einheitspreis: '1.850',
    });
    // der ungültige Mengentext erzeugt die Position trotzdem, mit leerer Menge
    expect(ausgabe[2]?.daten).toMatchObject({ kurztext: 'Schalung', menge: null, einheit: 'm²' });
    await expect(page.getByRole('status')).toHaveText('5 Positionen eingefügt, 1 Zelle ungültig (markiert).');

    // erst jetzt kommen die neuen Zeilen als Eigenschaften an; die ungültige Zelle zeigt den Originaltext markiert
    await page.evaluate(() => {
      window.__harness.uebernehmen();
    });
    const menge = zelle(page, 'Schalung', 'menge');
    await expect(menge).toHaveAttribute('aria-invalid', 'true');
    await expect(menge).toContainText('viel');
    await expect(zelle(page, 'Fundament herstellen', 'menge')).toHaveText('12,500');
    await expect(zelle(page, 'Abdichtung', 'einheitspreis')).toHaveText('17,900');
  });

  test('eine einzelne Zelle ersetzt die aktive Zelle wie eine Eingabe', async ({ page }) => {
    await zelle(page, 'Bauzaun stellen', 'menge').click();
    await page.evaluate((text) => navigator.clipboard.writeText(text), '99,5\n');
    await page.keyboard.press('Control+V');
    expect(await befehle(page)).toEqual([expect.objectContaining({ art: 'MengeAendern', menge: '99.500' })]);
  });
});

test.describe('Prüfhinweise (sperren nie)', () => {
  test('Hinweis und Fehler stehen an der Zelle, die Zelle bleibt bearbeitbar', async ({ page }) => {
    await page.goto('/?fixture=typisch&befunde=1&modus=attrappe');
    const fehler = grid(page).locator('[role="gridcell"][aria-invalid="true"]');
    await expect(fehler).toHaveCount(1);
    await expect(fehler).toHaveAttribute('data-spalte', 'einheit');
    await expect(fehler).toHaveAccessibleDescription('Fehler: Die Einheit fehlt.');
    await fehler.click();
    await page.keyboard.type('Stk');
    await page.keyboard.press('Enter');
    expect(await befehle(page)).toEqual([expect.objectContaining({ art: 'EinheitAendern', einheit: 'Stk' })]);
    await expect(grid(page).locator('.tx-grid__zelle--warnung')).toHaveCount(2);
  });
});

test.describe('gross: Virtualisierung', () => {
  test('die aktive Zeile bleibt beim Scrollen im DOM, der Fokus überlebt, Navigation scrollt nach', async ({
    page,
  }) => {
    await page.goto('/?fixture=gross');
    await expect(grid(page)).toBeVisible();
    const gesamt = Number(await grid(page).getAttribute('aria-rowcount')) - 1;
    expect(gesamt).toBeGreaterThanOrEqual(5000);
    // virtualisiert: nur ein kleiner Teil der Zeilen steht im DOM
    expect(await grid(page).locator('[role="row"][data-i]').count()).toBeLessThan(80);

    await grid(page).locator('[data-i="3"] [data-spalte="kurztext"]').click();
    await expect(grid(page).locator('[data-i="3"] [data-spalte="kurztext"]')).toBeFocused();
    await grid(page).evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(grid(page).locator('[data-i]').last()).toHaveAttribute('data-i', String(gesamt - 1));
    // Zeile 3 steht außerhalb des Sichtbereichs, aber weiter im DOM und hat den Fokus
    await expect(grid(page).locator('[data-i="3"] [data-spalte="kurztext"]')).toBeFocused();

    // Pfeil nach unten geht von der aktiven Zeile aus und scrollt sie zurück ins Bild
    await page.keyboard.press('ArrowDown');
    await expect(grid(page).locator('[data-i="4"] [data-spalte="kurztext"]')).toBeFocused();
    await expect(grid(page).locator('[data-i="4"] [data-spalte="kurztext"]')).toBeInViewport();
    const sichtbar = await grid(page).evaluate((el) => {
      const kopf = el.querySelector('.tx-grid__kopf')?.getBoundingClientRect().bottom ?? 0;
      const z = el.querySelector('[data-i="4"]')?.getBoundingClientRect().top ?? -1;
      return z >= kopf - 1;
    });
    expect(sichtbar).toBe(true);

    // Strg+Ende: letzte Zeile, sichtbar
    await page.keyboard.press('Control+End');
    await expect(
      grid(page).locator(`[data-i="${String(gesamt - 1)}"] [data-spalte="gesamtpreis"]`),
    ).toBeFocused();
    await expect(
      grid(page).locator(`[data-i="${String(gesamt - 1)}"] [data-spalte="gesamtpreis"]`),
    ).toBeInViewport();
    // Bild auf: eine Seite zurück
    await page.keyboard.press('PageUp');
    const nach = await page.evaluate(
      () => document.activeElement?.closest<HTMLElement>('[data-i]')?.dataset['i'],
    );
    expect(Number(nach)).toBeLessThan(gesamt - 5);
    await expect(page.locator(':focus')).toBeInViewport();
  });
});
