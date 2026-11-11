// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 46: Zeilen kopieren, ausschneiden, einfügen, löschen, verschieben, neue Position, Sprungziel.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { parseTsv } from '../src/tsv';

interface FxKnoten {
  id: string;
  parentId: string;
  art: string;
  kurztext?: string;
}
const lade = (name: string): FxKnoten[] =>
  (
    JSON.parse(readFileSync(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8')) as {
      knoten: FxKnoten[];
    }
  ).knoten;
const typisch = lade('typisch');
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
const befehle = (page: Page): Promise<unknown[]> => page.evaluate(() => window.__harness.befehle);
const status = (page: Page): Locator => page.locator('.tx-grid__status');
/** Kurztexte der sichtbaren Zeilen in Anzeigereihenfolge. */
const kurztexte = (page: Page): Promise<string[]> =>
  grid(page)
    .locator('[role="row"][data-i] [data-spalte="kurztext"]')
    .evaluateAll((els) =>
      els
        .map((el) => ({
          i: Number(el.closest<HTMLElement>('[data-i]')?.dataset['i']),
          t: el.textContent,
        }))
        .sort((a, b) => a.i - b.i)
        .map((x) => x.t),
    );
const fokusZeile = (page: Page): Promise<string | null | undefined> =>
  page.evaluate(
    () =>
      document.activeElement?.closest('[role="row"]')?.querySelector('[data-spalte="kurztext"]')?.textContent,
  );

test.describe('Kopieren, Ausschneiden, Einfügen', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('Strg+C schreibt die ausgewählten Zeilen als TSV in de-DE; Strg+V mit eigenem Text ruft onKopieEinfuegen', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&kopie=1');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Control+c');
    await expect(status(page)).toHaveText('2 Zeilen kopiert.');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    const matrix = parseTsv(text);
    expect(matrix).toHaveLength(2);
    expect(matrix[0]).toEqual(['01.0020', 'Normal', 'Bauzaun stellen', '86,500', 'm', '7,450', '644,43']);
    expect(matrix[1]?.[2]).toBe('Baustrom und Bauwasser');

    await zelle(page, 'Sauberkeitsschicht', 'menge').click();
    await page.keyboard.press('Control+v');
    expect(await page.evaluate(() => window.__harness.kopien)).toEqual([
      {
        knotenIds: [idVon('Bauzaun stellen'), idVon('Baustrom und Bauwasser')],
        ort: { art: 'nach', knotenId: idVon('Sauberkeitsschicht') },
      },
    ]);
    expect(await befehle(page)).toEqual([]);
    await expect(status(page)).toHaveText('2 Zeilen eingefügt.');
  });

  test('ohne onKopieEinfuegen: eigener Text legt neue Positionen an, spaltengenau und als eine Befehlsfolge', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&folge=1');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Control+c');
    await zelle(page, 'Sauberkeitsschicht', 'menge').click();
    await page.keyboard.press('Control+v');
    const folgen = (await page.evaluate(() => window.__harness.folgen)) as {
      art: string;
      daten: Record<string, unknown>;
    }[][];
    expect(folgen).toHaveLength(1);
    expect(folgen[0]?.map((b) => b.art)).toEqual(['PositionAnlegen', 'PositionAnlegen']);
    expect(folgen[0]?.[0]?.daten).toMatchObject({
      kurztext: 'Bauzaun stellen',
      menge: '86.500',
      einheit: 'm',
      einheitspreis: '7.450',
    });
  });

  test('fremder Text aus Excel: eine Position je Zeile, als eine Folge über onBefehlsfolge', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&folge=1');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    const excel = '"Fundament,\nzweilagig"\t1.250,5\tm³\t95,50\r\nSchalung\tviel\tm²\t28\r\n';
    await page.evaluate((t) => navigator.clipboard.writeText(t), excel);
    await page.keyboard.press('Control+v');
    const folgen = (await page.evaluate(() => window.__harness.folgen)) as {
      art: string;
      daten: Record<string, unknown>;
    }[][];
    expect(folgen).toHaveLength(1);
    expect(folgen[0]?.map((b) => b.art)).toEqual(['PositionAnlegen', 'PositionAnlegen']);
    expect(folgen[0]?.[0]?.daten).toMatchObject({ kurztext: 'Fundament,\nzweilagig', menge: '1250.500' });
    expect(folgen[0]?.[1]?.daten).toMatchObject({ kurztext: 'Schalung', menge: null });
    await expect(status(page)).toHaveText('2 Positionen eingefügt, 1 Zelle ungültig (markiert).');
  });

  test('Strg+X markiert die Zeilen, Strg+V verschiebt sie mit einem KnotenlisteVerschieben; Escape bricht ab', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&kopie=1');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Control+x');
    await expect(status(page)).toHaveText('2 Zeilen ausgeschnitten.');
    await expect(grid(page).locator('.tx-grid__zeile--ausgeschnitten')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(grid(page).locator('.tx-grid__zeile--ausgeschnitten')).toHaveCount(0);

    await page.keyboard.press('Control+x');
    await expect(grid(page).locator('.tx-grid__zeile--ausgeschnitten')).toHaveCount(2);
    // Das Ziel darf nicht in den ausgeschnittenen Zeilen liegen
    await page.keyboard.press('Control+v');
    expect(await befehle(page)).toEqual([]);
    await expect(status(page)).toHaveText('Das Ziel liegt in den ausgeschnittenen Zeilen.');

    await zelle(page, 'Sauberkeitsschicht', 'menge').click();
    await page.keyboard.press('Control+v');
    expect(await befehle(page)).toEqual([
      {
        art: 'KnotenlisteVerschieben',
        knotenIds: [idVon('Bauzaun stellen'), idVon('Baustrom und Bauwasser')],
        ziel: { art: 'nach', knotenId: idVon('Sauberkeitsschicht') },
      },
    ]);
    expect(await page.evaluate(() => window.__harness.kopien)).toEqual([]);
    await expect(grid(page).locator('.tx-grid__zeile--ausgeschnitten')).toHaveCount(0);
  });

  test('Strg+V gleich nach Strg+X verschiebt, auch solange die Zwischenablage noch den alten Text hat', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&kopie=1');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Shift+ArrowDown');
    // Strg+X, Klick aufs Ziel und Strg+V in einer Aufgabe, also bevor der Browser das Schreiben in die Zwischenablage
    // abschließt (Chrome: nach dem nächsten Bild). Das Einfügen sieht darum noch den alten Inhalt der Zwischenablage.
    await page.evaluate(async () => {
      const reactFertig = async (): Promise<void> => {
        for (let i = 0; i < 3; i++) await Promise.resolve();
      };
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'x',
          code: 'KeyX',
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      await reactFertig();
      const ziel = [...document.querySelectorAll('[role="row"][data-i]')]
        .find((r) => r.querySelector('[data-spalte="kurztext"]')?.textContent === 'Sauberkeitsschicht')
        ?.querySelector('[data-spalte="menge"]');
      ziel?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      await reactFertig();
      const alt = new DataTransfer();
      alt.setData('text/plain', 'Alter Inhalt\t1,000\tStk');
      ziel?.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: alt, bubbles: true, cancelable: true }),
      );
    });
    expect(await befehle(page)).toEqual([
      {
        art: 'KnotenlisteVerschieben',
        knotenIds: [idVon('Bauzaun stellen'), idVon('Baustrom und Bauwasser')],
        ziel: { art: 'nach', knotenId: idVon('Sauberkeitsschicht') },
      },
    ]);
    expect(await page.evaluate(() => window.__harness.kopien)).toEqual([]);
  });
});

test.describe('Löschen mit Rückfrage', () => {
  test('Escape bricht ohne Befehl ab, Enter legt alles mit einem KnotenInPapierkorbLegen in den Papierkorb', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&modus=live');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('Control+Delete');
    const dialog = page.getByRole('dialog', { name: 'In den Papierkorb legen' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('2 Zeilen in den Papierkorb legen?');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await befehle(page)).toEqual([]);
    // Der Dialog gibt den Fokus erst nach seinem Abbau zurück (Radix, eigene Aufgabe nach dem nächsten Bild); bis dahin
    // steht er auf <body>. Deshalb warten, bis er wieder auf der Zeile steht, statt einmal nachzusehen.
    await expect.poll(() => fokusZeile(page)).toBe('Baustrom und Bauwasser');

    await page.keyboard.press('Control+Minus');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    const b = (await befehle(page)) as { art: string; eintragId: string; knotenIds: string[] }[];
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({
      art: 'KnotenInPapierkorbLegen',
      knotenIds: [idVon('Bauzaun stellen'), idVon('Baustrom und Bauwasser')],
    });
    expect(b[0]?.eintragId).toMatch(/^papierkorb-/);
    await expect(zeile(page, 'Bauzaun stellen')).toHaveCount(0);
    // Der Fokus bleibt im Grid
    await expect(grid(page).locator(':focus')).toHaveCount(1);
  });

  test('ein Titel nennt die Zahl der Positionen darunter', async ({ page }) => {
    await page.goto('/?fixture=typisch&modus=attrappe');
    await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').click();
    await page.keyboard.press('Control+Delete');
    await expect(page.getByRole('dialog')).toContainText(
      '1 Zeile in den Papierkorb legen, darunter 1 Titel mit 11 Positionen?',
    );
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    expect(await befehle(page)).toEqual([]);
    await expect(zelle(page, 'Erd- und Betonarbeiten', 'kurztext')).toBeFocused();
  });

  test('zugeklappt: ohne Zahl der App „mindestens“, mit positionenZaehlen die genaue Zahl (Ticket 54, Punkt 4)', async ({
    page,
  }) => {
    const titelId = idVon('Erd- und Betonarbeiten');
    const unter = (id: string): FxKnoten[] =>
      typisch.filter((k) => k.parentId === id).flatMap((k) => [k, ...unter(k.id)]);
    const genau = unter(titelId).filter((k) => k.art === 'position').length;
    const frage = (n: string): string =>
      `1 Zeile in den Papierkorb legen, darunter 1 Titel mit ${n} ${n === '1' ? 'Position' : 'Positionen'}?`;

    await page.goto('/?fixture=typisch&auf=keine');
    await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').click();
    await page.keyboard.press('Control+Delete');
    await expect(page.getByRole('dialog')).toContainText(frage('mindestens 0'));
    await page.keyboard.press('Escape');

    await page.goto('/?fixture=typisch&auf=keine&zaehlen=1');
    await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').click();
    await page.keyboard.press('Control+Delete');
    await expect(page.getByRole('dialog')).toContainText(frage(String(genau)));
    expect(genau).toBeGreaterThan(1);
  });
});

test.describe('Verschieben per Tastatur', () => {
  test('Alt+Pfeil verschiebt unter den Geschwistern, Fokus wandert mit; am Rand nichts', async ({ page }) => {
    await page.goto('/?fixture=typisch&modus=live');
    await zelle(page, 'Bauzaun stellen', 'kurztext').click();
    await page.keyboard.press('Alt+ArrowDown');
    expect(await befehle(page)).toEqual([
      {
        art: 'KnotenVerschieben',
        knotenId: idVon('Bauzaun stellen'),
        ziel: { art: 'nach', knotenId: idVon('Baustrom und Bauwasser') },
      },
    ]);
    const reihe = await kurztexte(page);
    expect(reihe.indexOf('Bauzaun stellen')).toBe(reihe.indexOf('Baustrom und Bauwasser') + 1);
    await expect(zelle(page, 'Bauzaun stellen', 'kurztext')).toBeFocused();
    await expect(zeile(page, 'Bauzaun stellen')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Alt+ArrowUp');
    await expect(zelle(page, 'Bauzaun stellen', 'kurztext')).toBeFocused();
    expect(await befehle(page)).toHaveLength(4);
    // jetzt erstes Kind des Titels (vor dem Hinweistext): am Rand geschieht nichts
    await page.keyboard.press('Alt+ArrowUp');
    expect(await befehle(page)).toHaveLength(4);
    const nachher = await kurztexte(page);
    expect(nachher.indexOf('Bauzaun stellen')).toBe(
      nachher.indexOf('Baustelleneinrichtung und Vorarbeiten') + 1,
    );

    // Titel untereinander: der letzte Titel geht nicht weiter nach unten
    await zelle(page, 'Ausbau und Oberflächen', 'kurztext').click();
    await page.keyboard.press('Alt+ArrowDown');
    expect(await befehle(page)).toHaveLength(4);
    await page.keyboard.press('Alt+ArrowUp');
    expect(await befehle(page)).toHaveLength(5);
    const titel = (await kurztexte(page)).filter((t) =>
      ['Baustelleneinrichtung und Vorarbeiten', 'Erd- und Betonarbeiten', 'Ausbau und Oberflächen'].includes(
        t,
      ),
    );
    expect(titel).toEqual([
      'Baustelleneinrichtung und Vorarbeiten',
      'Ausbau und Oberflächen',
      'Erd- und Betonarbeiten',
    ]);
    await expect(zelle(page, 'Ausbau und Oberflächen', 'kurztext')).toBeFocused();
  });
});

test.describe('Neue Position mit Strg+Plus', () => {
  test('legt hinter der aktiven Zeile eine leere Position an und fokussiert ihren Kurztext', async ({
    page,
  }) => {
    await page.goto('/?fixture=typisch&modus=live&oz=1');
    await zelle(page, 'Bauzaun stellen', 'menge').click();
    await page.keyboard.press('Control+Shift+Equal');
    const b = (await befehle(page)) as {
      art: string;
      id: string;
      ort: unknown;
      daten: Record<string, unknown>;
    }[];
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({
      art: 'PositionAnlegen',
      ort: { art: 'nach', knotenId: idVon('Bauzaun stellen') },
      daten: { kurztext: '', ordnungszahl: 'NEU', menge: null },
    });
    const neu = grid(page)
      .locator('[role="row"]')
      .filter({ has: page.getByText('NEU', { exact: true }) });
    await expect(neu.locator('[data-spalte="kurztext"]')).toBeFocused();
    await page.keyboard.type('Neue Leistung');
    await page.keyboard.press('Enter');
    expect((await befehle(page))[1]).toEqual({
      art: 'KurztextAendern',
      knotenId: b[0]?.id,
      kurztext: 'Neue Leistung',
    });
  });

  test('auf einem Titel als erstes Kind', async ({ page }) => {
    await page.goto('/?fixture=typisch&modus=live');
    await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').click();
    await page.keyboard.press('Control+Shift+Equal');
    const reihe = await kurztexte(page);
    const t = reihe.indexOf('Erd- und Betonarbeiten');
    expect(reihe[t + 1]).toBe('');
    expect(await fokusZeile(page)).toBe('');
  });
});

test.describe('Sprungziel', () => {
  test('scrollt bei 5.000 Zeilen zur Zeile und fokussiert die Zelle; zugeklappt tut das Grid nichts', async ({
    page,
  }) => {
    const gross = lade('gross');
    const ziel = gross.filter((k) => k.art === 'position').at(-3);
    if (!ziel) throw new Error('gross ohne Positionen');
    await page.goto('/?fixture=gross');
    await expect(grid(page)).toBeVisible();
    expect(Number(await grid(page).getAttribute('aria-rowcount'))).toBeGreaterThan(5000);
    await page.evaluate((id) => {
      window.__harness.springe(id, 'menge');
    }, ziel.id);
    const fokus = page.locator(':focus');
    await expect(fokus).toHaveAttribute('data-spalte', 'menge');
    await expect(fokus).toBeInViewport();
    expect(Number(await fokus.locator('xpath=..').getAttribute('data-i'))).toBeGreaterThan(4000);
    expect(await fokusZeile(page)).toBe(ziel.kurztext);

    await page.goto('/?fixture=gross&auf=keine');
    await grid(page).locator('[data-i="0"] [data-spalte="kurztext"]').click();
    await page.evaluate((id) => {
      window.__harness.springe(id, 'menge');
    }, ziel.id);
    await expect(grid(page).locator('[data-i="0"] [data-spalte="kurztext"]')).toBeFocused();
  });
});
