// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 48: Undo/Redo je Sitzung, Zeilenaktionen des Grids an Kern und Speicher, Papierkorb, LV-Stände, Löschen von
// Projekt und LV. Nur Tastatur und Schaltflächen (U3, U8); über den Testpfad nur das Laden einer Fixture, der Export
// der Projektdatei zum Vergleich und die Tiefe des Undo-Stapels zum Warten.

import { expect, test, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { lvAnlegen, neueZeile, projektAnlegen, summen, zeilen } from './hilfen';

const grid = (page: Page) => page.getByRole('treegrid', { name: 'Positionen' });

/** Die Zelle einer Zeile (nach Kurztext) und Spalte. */
const zelle = (page: Page, kurztext: string, spalte: string) =>
  grid(page)
    .locator('[role="row"]')
    .filter({ has: page.locator(`[data-spalte="kurztext"] .tx-grid__text`, { hasText: kurztext }) })
    .first()
    .locator(`[data-spalte="${spalte}"]`);

const tiefe = (page: Page): Promise<{ rueck: number; vor: number }> =>
  page.evaluate(() => window.tethysTest?.historie() ?? { rueck: -1, vor: -1 });

const projektIdAusUrl = (page: Page): string =>
  decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');

/** Projekt anlegen, die Fixture `typisch` als LV laden (Testpfad) und öffnen. */
async function typischOeffnen(page: Page): Promise<{ projektId: string; lvId: string }> {
  const inhalt = fixtureInhalt('typisch');
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  const projektId = projektIdAusUrl(page);
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible();
  return { projektId, lvId: inhalt.wurzelId };
}

const projektdatei = (page: Page, projektId: string): Promise<string | null> =>
  page.evaluate((id) => window.tethysTest?.projektdatei(id as never) ?? Promise.resolve(null), projektId);

// Das Grid ist virtualisiert: Nur sichtbare Zeilen stehen im DOM. Ein hohes Fenster hält alle Zeilen der Tests sichtbar.
test.use({ viewport: { width: 1440, height: 2000 } });

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('Eine Mehrzeilen-Aktion ist ein Undo-Schritt; Strg+Z im Zelleditor wirkt auf das Feld', async ({
  page,
}) => {
  await projektAnlegen(page, 'Schule', 'Kreis');
  await lvAnlegen(page, 'Rohbau');
  await neueZeile(page, () => page.getByRole('button', { name: /^Position anlegen/ }).click());
  await page.keyboard.type('Erste');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await zeilen(page)).length).toBe(1);
  // Die neue Position hat ihre OZ aus dem Vorschlag des Kerns.
  await expect.poll(async () => (await zeilen(page))[0]?.[0]).not.toBe('');
  await zelle(page, 'Erste', 'kurztext').click();

  // Drei Zeilen aus Excel einfügen: eine Befehlsfolge, ein Undo-Schritt.
  const vorher = await tiefe(page);
  await page.evaluate(
    (t) => navigator.clipboard.writeText(t),
    'Eins\t1\tm\t10\nZwei\t2\tm\t10\nDrei\t3\tm\t10\n',
  );
  await page.keyboard.press('Control+V');
  await expect.poll(async () => (await zeilen(page)).length).toBe(4);
  await expect.poll(async () => (await summen(page))['Netto']).toBe('60,00');
  expect((await tiefe(page)).rueck).toBe(vorher.rueck + 1);

  await page.keyboard.press('Control+Z');
  await expect.poll(async () => (await zeilen(page)).map((z) => z[1])).toEqual(['Erste']);
  await expect.poll(async () => (await summen(page))['Netto']).toBe('0,00');
  await page.keyboard.press('Control+Y');
  await expect.poll(async () => (await zeilen(page)).length).toBe(4);
  await page.keyboard.press('Control+Shift+Z');
  await expect.poll(async () => (await zeilen(page)).length).toBe(4); // nichts mehr zu wiederholen

  // Im Zelleditor gehört Strg+Z dem Eingabefeld.
  const stand = await tiefe(page);
  await zelle(page, 'Erste', 'kurztext').click();
  await page.keyboard.press('Enter');
  const editor = grid(page).locator('[data-editor]');
  await expect(editor).toBeVisible();
  await page.keyboard.press('End');
  await page.keyboard.type('xyz');
  await page.keyboard.press('Control+Z');
  await expect(editor).not.toHaveValue(/xyz/);
  await page.keyboard.press('Escape');
  expect(await tiefe(page)).toEqual(stand);
  expect((await zeilen(page)).length).toBe(4);
});

test('Kopieren einer Gliederung mit Unterknoten: neue OZ, Summen stimmen; Ausschneiden/Einfügen verschiebt', async ({
  page,
}) => {
  await typischOeffnen(page);
  const netto = '55.463,41';
  await expect.poll(async () => (await summen(page))['Netto']).toBe(netto);
  const titel3 = (await zeilen(page)).find((z) => z[1] === 'Ausbau und Oberflächen');
  const summe3 = titel3?.[2] ?? '';
  expect(summe3).not.toBe('');

  // Titel 03 samt Unterknoten kopieren und auf Titel 02 einfügen. „Hinter“ einer Gliederung heißt im Grid „als erstes
  // Kind“ (D-46.1): Die Kopie wird der erste Untertitel von Titel 02.
  await zelle(page, 'Ausbau und Oberflächen', 'kurztext').click();
  await page.keyboard.press('Control+C');
  await zelle(page, 'Erd- und Betonarbeiten', 'kurztext').click();
  await page.keyboard.press('Control+V');
  await expect
    .poll(async () => (await zeilen(page)).filter((z) => z[1] === 'Ausbau und Oberflächen').length)
    .toBe(2);
  // Die erste Fundstelle ist die Kopie (sie steht in Titel 02, vor dem ursprünglichen Titel 03).
  const kopie = (await zeilen(page)).find((z) => z[1] === 'Ausbau und Oberflächen');
  // Die Kopie hat eine neue OZ nach dem Vorschlag (unter Titel 02), nicht die alte „03“.
  expect(kopie?.[0]).not.toBe('03');
  expect(kopie?.[0]).toMatch(/^02\.\d\d$/);
  expect(kopie?.[2]).toBe(summe3);
  // Netto wächst genau um die Summe des kopierten Titels (gerechnet mit den Zahlen der Anzeige).
  const zahl = (s: string): number => Number(s.replace(/\./g, '').replace(',', '.'));
  await expect
    .poll(async () => zahl((await summen(page))['Netto'] ?? ''))
    .toBeCloseTo(zahl(netto) + zahl(summe3), 2);

  // Rückgängig nimmt die Kopie als einen Schritt zurück.
  await page.keyboard.press('Control+Z');
  await expect.poll(async () => (await summen(page))['Netto']).toBe(netto);

  // Ausschneiden und Einfügen verschiebt: „Endreinigung“ hinter „Baustelle einrichten“.
  await zelle(page, 'Endreinigung', 'kurztext').click();
  await page.keyboard.press('Control+X');
  await zelle(page, 'Baustelle einrichten', 'kurztext').click();
  await page.keyboard.press('Control+V');
  await expect
    .poll(async () => {
      const k = (await zeilen(page)).map((z) => z[1]);
      return k.indexOf('Endreinigung') === k.indexOf('Baustelle einrichten') + 1;
    })
    .toBe(true);
  expect((await zeilen(page)).filter((z) => z[1] === 'Endreinigung')).toHaveLength(1);
  await expect.poll(async () => (await summen(page))['Netto']).toBe(netto);
});

test('Gelöschte Zeilen liegen im Papierkorb und lassen sich wiederherstellen; Leeren nur nach Bestätigung', async ({
  page,
}) => {
  await typischOeffnen(page);
  const netto = '55.463,41';
  await zelle(page, 'Bauzaun stellen', 'kurztext').click();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Control+Delete');
  await page
    .getByRole('dialog', { name: 'In den Papierkorb legen' })
    .getByRole('button', { name: /legen/i })
    .last()
    .click();
  await expect.poll(async () => (await zeilen(page)).some((z) => z[1] === 'Bauzaun stellen')).toBe(false);
  await expect.poll(async () => (await summen(page))['Netto']).not.toBe(netto);

  await page.getByRole('button', { name: 'Papierkorb (1)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Papierkorb' });
  const liste = dialog.getByRole('table', { name: 'Einträge im Papierkorb' });
  await expect(liste.getByRole('row')).toHaveCount(2); // Kopf + ein Eintrag
  await expect(liste).toContainText('01.0020');
  await expect(liste).toContainText('Bauzaun stellen (+1)');
  await dialog.getByRole('button', { name: 'Wiederherstellen: Bauzaun stellen (+1)' }).click();
  await expect(dialog.getByText('Der Papierkorb ist leer.')).toBeVisible();
  await expect.poll(async () => (await summen(page))['Netto']).toBe(netto);
  const k = (await zeilen(page)).map((z) => z[1]);
  expect(k.indexOf('Bauzaun stellen')).toBe(k.indexOf('Baustelle einrichten') + 1);
  await dialog.getByRole('button', { name: 'Schließen' }).last().click();

  // Wieder löschen, dann leeren: erst nach Bestätigung.
  await zelle(page, 'Endreinigung', 'kurztext').click();
  await page.keyboard.press('Control+Delete');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await zeilen(page)).some((z) => z[1] === 'Endreinigung')).toBe(false);
  await page.getByRole('button', { name: 'Papierkorb (1)' }).click();
  await dialog.getByRole('button', { name: 'Papierkorb leeren' }).click();
  await expect(dialog).toContainText('Alle 1 Einträge endgültig entfernen?');
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(liste).toContainText('Endreinigung');
  await dialog.getByRole('button', { name: 'Papierkorb leeren' }).click();
  await dialog.getByRole('button', { name: 'Endgültig entfernen' }).click();
  await expect(dialog.getByText('Der Papierkorb ist leer.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Schließen' }).last().click();
  await expect(page.getByRole('button', { name: 'Papierkorb (0)' })).toBeVisible();
  // In der Sitzung holt Rückgängig den Eintrag zurück.
  await page.getByRole('button', { name: /^Rückgängig/ }).click();
  await expect(page.getByRole('button', { name: 'Papierkorb (1)' })).toBeVisible();
});

test('LV-Stand anlegen, neu laden, schreibgeschützt öffnen; Änderungen am LV ändern den Stand nicht', async ({
  page,
}) => {
  const { lvId } = await typischOeffnen(page);
  await page.getByRole('button', { name: 'LV-Stände' }).click();
  const dialog = page.getByRole('dialog', { name: 'LV-Stände' });
  await dialog.getByLabel('Name des Stands').fill('Versand');
  await dialog.getByLabel('Name des Stands').press('Enter');
  await expect(dialog.getByRole('list', { name: 'LV-Stände' })).toContainText('Versand');
  await dialog.getByRole('button', { name: 'Schließen' }).last().click();

  // Das LV ändern: Menge von „Baustelle einrichten“ 1 → 2.
  await zelle(page, 'Baustelle einrichten', 'menge').click();
  await page.keyboard.type('2');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await summen(page))['Netto']).not.toBe('55.463,41');

  await page.reload();
  await expect(grid(page)).toBeVisible();
  await page.getByRole('button', { name: 'LV-Stände' }).click();
  await expect(dialog.getByRole('list', { name: 'LV-Stände' })).toContainText(/Versand.*angelegt/);
  await dialog.getByRole('link', { name: 'Öffnen: Versand' }).click();
  await expect(page).toHaveURL(new RegExp(`/lv/${lvId}/stand/`));
  await expect(page.getByText('schreibgeschützt', { exact: true })).toBeVisible();
  // Der Stand hat die alten Werte.
  await expect.poll(async () => (await summen(page))['Netto']).toBe('55.463,41');
  // Das Grid ist schreibgeschützt (Ticket 67, Punkt 3): kein Zelleditor, kein Toast, die Ansage kommt vom Grid.
  await expect(page.getByRole('treegrid')).toHaveAttribute('aria-readonly', 'true');
  await zelle(page, 'Baustelle einrichten', 'menge').click();
  await page.keyboard.type('5');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-editor]')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: 'Schreibgeschützt: Hier lässt sich nichts ändern.' }),
  ).toHaveCount(1);
  await expect(page.getByText('Stand ist schreibgeschützt')).toHaveCount(0);
  await expect.poll(async () => (await summen(page))['Netto']).toBe('55.463,41');

  // Stand als neues LV übernehmen.
  await page.getByRole('button', { name: 'Als neues LV übernehmen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /\(Stand Versand\)$/ })).toBeVisible();
  await expect.poll(async () => (await summen(page))['Netto']).toBe('55.463,41');
});

test('Projekt und LV löschen nur nach Bestätigung; Undo holt sie zurück', async ({ page }) => {
  await projektAnlegen(page, 'Turnhalle', 'Gemeinde');
  await lvAnlegen(page, 'Dach');
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  const lvListe = page.getByRole('list', { name: 'Leistungsverzeichnisse' });
  await expect(lvListe).toContainText('Dach');

  // Abbrechen: nichts passiert.
  await page.getByRole('button', { name: 'LV löschen: Dach' }).click();
  const frage = page.getByRole('dialog', { name: 'LV löschen' });
  await expect(frage).toContainText('„Dach“ mit 0 Positionen');
  await frage.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(lvListe).toContainText('Dach');

  // Projekt löschen, solange es ein LV hat: verständliche Meldung, nichts gelöscht.
  await page.getByRole('button', { name: 'Projekt löschen' }).click();
  await page
    .getByRole('dialog', { name: 'Projekt löschen' })
    .getByRole('button', { name: 'Endgültig löschen' })
    .click();
  await expect(page.getByText('Das Projekt hat noch LVs').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Turnhalle' })).toBeVisible();

  await page.getByRole('button', { name: 'LV löschen: Dach' }).click();
  await frage.getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(page.getByText('Noch keine Leistungsverzeichnisse.')).toBeVisible();
  await page.keyboard.press('Control+Z');
  await expect(lvListe).toContainText('Dach');
  await page.keyboard.press('Control+Y');
  await expect(lvListe).toHaveCount(0);

  // Ein leeres Projekt löschen und zurückholen.
  await page.getByRole('button', { name: 'Projekt löschen' }).click();
  await page
    .getByRole('dialog', { name: 'Projekt löschen' })
    .getByRole('button', { name: 'Endgültig löschen' })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Turnhalle' })).toHaveCount(0);
  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('link', { name: 'Turnhalle' })).toBeVisible();
});

test('50 gemischte Änderungen, 50× Undo gleich dem Anfang, 50× Redo gleich dem Ende', async ({ page }) => {
  test.setTimeout(180_000);
  const { projektId } = await typischOeffnen(page);
  const anfangDatei = await projektdatei(page, projektId);
  const anfangSummen = await summen(page);
  const start = (await tiefe(page)).rueck;
  let n = 0;
  /** Wartet, bis die Aktion als ein Undo-Schritt angekommen ist. */
  const schritt = async (aktion: () => Promise<void>): Promise<void> => {
    await aktion();
    n += 1;
    await expect.poll(async () => (await tiefe(page)).rueck).toBe(start + n);
  };
  const nachlass = page.getByRole('textbox', { name: 'Nachlass', exact: true });
  const positionen = [
    'Baustelle einrichten',
    'Bauzaun stellen',
    'Oberboden abtragen',
    'Innenputz',
    'Estrich einbringen',
    'Wandanstrich',
    'Silikonfuge',
    'Sockelleiste',
    'Drainage verlegen',
    'Sockel abdichten',
  ];
  for (let runde = 0; runde < 10; runde++) {
    const p = positionen[runde] ?? 'Innenputz';
    // 1. Feld ändern (Menge).
    await schritt(async () => {
      await zelle(page, p, 'menge').click();
      await page.keyboard.type(String(runde + 3));
      await page.keyboard.press('Enter');
    });
    // 2. Einfügen aus Excel (TSV, eine Zeile).
    await schritt(async () => {
      await zelle(page, p, 'kurztext').click();
      await page.evaluate(
        (t) => navigator.clipboard.writeText(t),
        `Excel ${String(runde)}\t${String(runde + 1)}\tStk\t12,5\n`,
      );
      await page.keyboard.press('Control+V');
    });
    // 3. Kopieren und Einfügen.
    await schritt(async () => {
      await zelle(page, `Excel ${String(runde)}`, 'kurztext').click();
      await page.keyboard.press('Control+C');
      await page.keyboard.press('Control+V');
    });
    // 4. Verschieben (Alt+Pfeil runter).
    await schritt(async () => {
      await zelle(page, p, 'kurztext').click();
      await page.keyboard.press('Alt+ArrowDown');
    });
    // 5. Löschen (Papierkorb) oder Nachlass.
    if (runde % 2 === 0) {
      await schritt(async () => {
        await zelle(page, `Excel ${String(runde)}`, 'kurztext').click();
        await page.keyboard.press('Control+Delete');
        await page.keyboard.press('Enter');
      });
    } else {
      await schritt(async () => {
        await nachlass.fill(`${String(runde)},5`);
        await nachlass.press('Enter');
      });
    }
  }
  expect(n).toBe(50);
  const endeDatei = await projektdatei(page, projektId);
  const endeSummen = await summen(page);
  expect(endeDatei).not.toBe(anfangDatei);

  await grid(page).locator('[role="row"][data-i] [data-spalte="kurztext"]').first().click();
  for (let i = 0; i < 50; i++) await page.keyboard.press('Control+Z');
  await expect.poll(async () => (await tiefe(page)).rueck, { timeout: 60_000 }).toBe(start);
  await expect.poll(() => summen(page)).toEqual(anfangSummen);
  expect(await projektdatei(page, projektId)).toBe(anfangDatei);

  for (let i = 0; i < 50; i++) await page.keyboard.press('Control+Y');
  await expect.poll(async () => (await tiefe(page)).vor, { timeout: 60_000 }).toBe(0);
  await expect.poll(() => summen(page)).toEqual(endeSummen);
  expect(await projektdatei(page, projektId)).toBe(endeDatei);
});
