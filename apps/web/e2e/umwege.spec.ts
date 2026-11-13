// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 67: Umwege aus Welle 3 sind durch die neuen Eigenschaften von `ui-grid`/`ui-basis` (Ticket 54) ersetzt.
// Je Punkt ein Test: aktive Zeile, Zeile öffnen, genaue Löschzahl, Anfangsfokus im Dialog. (Der schreibgeschützte
// LV-Stand ist in `undo.spec.ts` geprüft.) Nur Tastatur und Schaltflächen (U3, U8).

import { expect, test, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { erwarteMeldung, projektAnlegen } from './hilfen';

const grid = (page: Page) => page.getByRole('treegrid', { name: 'Positionen' });

/** Die Zelle einer Zeile (nach Kurztext) und Spalte. */
const zelle = (page: Page, kurztext: string, spalte: string) =>
  grid(page)
    .locator('[role="row"]')
    .filter({ has: page.locator(`[data-spalte="kurztext"] .tx-grid__text`, { hasText: kurztext }) })
    .first()
    .locator(`[data-spalte="${spalte}"]`);

/** Projekt anlegen, die Fixture `typisch` als LV laden (Testpfad) und öffnen. */
async function typischOeffnen(page: Page): Promise<void> {
  const inhalt = fixtureInhalt('typisch');
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
}

// Das Grid ist virtualisiert: Ein hohes Fenster hält alle Zeilen sichtbar.
test.use({ viewport: { width: 1440, height: 2000 } });

test('Aktive Zeile (Punkt 1): Fokus nur per Tab ins Grid genügt, „Position anlegen“ geht hinter diese Zeile', async ({
  page,
}) => {
  await typischOeffnen(page);
  // Nur Fokus, kein Klick, keine Auswahl: aktiv ist die erste Zeile (der Titel 01).
  await zelle(page, 'Baustelleneinrichtung', 'kurztext').focus();
  await page.keyboard.press('Control+Alt+KeyP');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const leer = [...document.querySelectorAll('[role="row"][data-i]')].find(
          (r) => (r.querySelector('[data-spalte="kurztext"] .tx-grid__text')?.textContent ?? 'x') === '',
        );
        const gp = [...document.querySelectorAll('[role="row"][data-i]')].find((r) =>
          r.textContent.includes('Baustelle einrichten'),
        );
        const i = (e: Element | undefined): number => Number(e?.getAttribute('data-i') ?? '-1');
        // Die neue Position steht vor der ersten alten Position, also direkt unter dem Titel, nicht am LV-Ende.
        return i(leer) >= 1 && i(leer) < i(gp);
      }),
    )
    .toBe(true);
});

test('Zeile öffnen (Punkt 2): Strg+Enter und Doppelklick auf OZ öffnen den Positionsdialog, Kurztext bearbeitet', async ({
  page,
}) => {
  await typischOeffnen(page);
  await zelle(page, 'Bauzaun stellen', 'ordnungszahl').dblclick();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  await zelle(page, 'Bauzaun stellen', 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // Doppelklick auf eine bearbeitbare Zelle bearbeitet weiter (U3).
  await zelle(page, 'Bauzaun stellen', 'kurztext').dblclick();
  await expect(page.locator('[data-editor]')).toHaveCount(1);
  await expect(dialog).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Eine Gliederung hat keinen Positionsdialog: Hinweis statt Dialog.
  await zelle(page, 'Baustelleneinrichtung', 'kurztext').focus();
  await page.keyboard.press('Control+Enter');
  await erwarteMeldung(page, 'Merkmale gibt es nur an Positionen');
  await expect(dialog).toHaveCount(0);
});

test('Löschdialog (Punkt 4): zugeklappter Titel nennt die genaue Zahl der Positionen, ohne „mindestens“', async ({
  page,
}) => {
  await typischOeffnen(page);
  const titel = zelle(page, 'Baustelleneinrichtung', 'kurztext');
  await titel.focus();
  await page.keyboard.press('ArrowLeft'); // zuklappen
  await expect(zelle(page, 'Baustelle einrichten', 'kurztext')).toHaveCount(0);
  await page.keyboard.press('Control+Delete');
  const dialog = page.getByRole('dialog', { name: 'In den Papierkorb legen' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('6 Positionen');
  await expect(dialog).not.toContainText('mindestens');
});

test('Dialog-Anfangsfokus (Punkt 5): „Merkmale“ startet auf „Übernehmen“, Enter übernimmt sofort', async ({
  page,
}) => {
  await typischOeffnen(page);
  await zelle(page, 'Bauzaun stellen', 'kurztext').focus();
  await page.keyboard.press('Control+Alt+KeyM');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Übernehmen' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
});
