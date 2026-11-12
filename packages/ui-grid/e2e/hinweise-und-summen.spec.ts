// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 33 (v1.1a): Einfügen in ein leeres LV an der Wurzel aus der Ansicht, Befehlshinweise mit Sprungknopf,
// Bedarfs- und Wahlsumme in der Summenzeile.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { zahlenAttrappe } from './harness/attrappen';

interface FxLv {
  id: string;
  knoten: { id: string; art: string; kurztext?: string }[];
}
const typisch = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch.json', import.meta.url), 'utf8'),
) as FxLv;
const betrag = (s: string): string => zahlenAttrappe.formatBetrag(s as never);

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Leistungsverzeichnis' });
const hinweise = (page: Page): Locator => page.getByRole('region', { name: 'Hinweise' });
const summen = (page: Page): Locator => page.getByRole('group', { name: 'Summen' });

test('in ein leeres LV wird am Ende der Wurzel aus der Ansicht eingefügt', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?fixture=typisch&leer=1&modus=attrappe');
  await expect(grid(page)).toContainText('Das Leistungsverzeichnis enthält noch keine Einträge.');
  await grid(page).focus();
  await page.evaluate((text) => navigator.clipboard.writeText(text), 'Baustelle einrichten\t1\tpsch\t500\n');
  await page.keyboard.press('Control+V');

  const ausgabe = (await page.evaluate(() => window.__harness.befehle)) as { art: string; ort: unknown }[];
  expect(ausgabe).toHaveLength(1);
  expect(ausgabe[0]).toMatchObject({ art: 'PositionAnlegen', ort: { art: 'ende', elternId: typisch.id } });
});

test.describe('Befehlshinweise (sperren nie)', () => {
  // Die Testseite setzt bei `hinweise=1` drei Hinweise; der erste nennt die letzte Position der Fixture.
  const letzte = typisch.knoten.filter((k) => k.art === 'position').at(-1);
  const ziel = letzte?.kurztext ?? '';

  test.beforeEach(async ({ page }) => {
    await page.goto('/?fixture=typisch&hinweise=1&modus=attrappe');
    await expect(grid(page)).toBeVisible();
  });

  test('zeigt den Text je Code in einer höflichen Live-Region, unbekannte Codes allgemein', async ({
    page,
  }) => {
    const leiste = hinweise(page);
    await expect(leiste).toHaveAttribute('aria-live', 'polite');
    await expect(leiste.getByRole('listitem')).toHaveText([
      /Die Ordnungszahlen wurden mit kleinerem Schritt vergeben\./,
      'Das Netto nach Nachlass ist negativ.',
      'Der Befehl wurde mit einem Hinweis ausgeführt.',
    ]);
    // nur der Hinweis mit Knoten hat einen Sprungknopf
    await expect(leiste.getByRole('button')).toHaveCount(1);
  });

  test('der Sprungknopf ist per Tastatur erreichbar und setzt den Fokus auf die genannte Zeile', async ({
    page,
  }) => {
    // Der Knopf steht in der Tab-Reihenfolge direkt vor dem Knopf „Danach“ der Testseite.
    await page.getByRole('button', { name: 'Danach' }).focus();
    await page.keyboard.press('Shift+Tab');
    const knopf = hinweise(page).getByRole('button', { name: 'Zur Zeile springen' });
    await expect(knopf).toBeFocused();
    await page.keyboard.press('Enter');
    const zeile = grid(page)
      .getByRole('row')
      .filter({ has: page.getByText(ziel, { exact: true }) });
    await expect(zeile.locator('[role="gridcell"]:focus')).toHaveCount(1);
    // im Grid geht es mit der Tastatur weiter
    await page.keyboard.press('ArrowUp');
    await expect(zeile.locator('[role="gridcell"]:focus')).toHaveCount(0);
  });

  test('der Sprungknopf funktioniert auch mit der Maus; das Grid bleibt bearbeitbar', async ({ page }) => {
    await hinweise(page).getByRole('button', { name: 'Zur Zeile springen' }).click();
    const zeile = grid(page)
      .getByRole('row')
      .filter({ has: page.getByText(ziel, { exact: true }) });
    await expect(zeile.locator('[role="gridcell"]:focus')).toHaveCount(1);
    // Der Sprung behält die aktive Spalte (hier die Ordnungszahl); im Kurztext lässt sich bearbeiten.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F2');
    await expect(grid(page).locator('[data-editor]')).toBeVisible();
  });
});

test.describe('Mengenansatz (Ticket 74, D-65.2): neutrales Kennzeichen an der Mengenzelle', () => {
  // Die Testseite gibt bei `ansatz=1` der 4. und 5. Position einen Mengenansatz; bei `befunde=1` hat die 4. dazu eine
  // Warnung an der Menge.
  const positionen = typisch.knoten.filter((k) => k.art === 'position').map((k) => k.kurztext ?? '');
  const [ohne, mitWarnung, nurAnsatz] = [positionen[0] ?? '', positionen[3] ?? '', positionen[4] ?? ''];
  const zelle = (page: Page, kurztext: string, spalte: string): Locator =>
    grid(page)
      .getByRole('row')
      .filter({ has: page.getByText(kurztext, { exact: true }) })
      .locator(`[data-spalte="${spalte}"]`);
  const marke = (z: Locator): Locator => z.locator('[data-kennzeichen="mengenansatz"]');

  for (const nurlesen of [false, true]) {
    test(`Position mit Ansatz: Marke ohne Warnstil, Beschreibung in Worten${nurlesen ? ' (schreibgeschützt)' : ''}`, async ({
      page,
    }) => {
      await page.goto(`/?fixture=typisch&ansatz=1&befunde=1${nurlesen ? '&nurlesen=1' : ''}`);
      const menge = zelle(page, nurAnsatz, 'menge');
      await expect(marke(menge)).toHaveText('Σ');
      await expect(marke(menge)).toHaveAttribute('aria-hidden', 'true');
      await expect(menge).toHaveClass(/tx-grid__zelle--mengenansatz/);
      await expect(menge).not.toHaveClass(/tx-grid__zelle--warnung|tx-grid__zelle--fehler/);
      await expect(menge).not.toHaveAttribute('aria-invalid');
      await expect(menge.locator('.tx-grid__marke')).toHaveCount(0);
      await expect(menge).toHaveAccessibleDescription(/^Menge aus Mengenansatz/);
      await expect(menge).toHaveAttribute('title', /^Menge aus Mengenansatz/);
      // Neutral: Die Zelle sieht aus wie eine Mengenzelle ohne Ansatz, die Marke hat die neutrale Kennzeichenfläche.
      const flaeche = (z: Locator): Promise<string> =>
        z.evaluate((el) => {
          const s = getComputedStyle(el);
          return `${s.backgroundColor} ${s.boxShadow}`;
        });
      expect(await flaeche(menge)).toBe(await flaeche(zelle(page, ohne, 'menge')));
      const farben = await marke(menge).evaluate((el) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--tx-color-text-muted)';
        probe.style.backgroundColor = 'var(--tx-color-surface-sunken)';
        el.parentElement?.append(probe);
        const soll = getComputedStyle(probe);
        const ist = getComputedStyle(el);
        const ergebnis = {
          ist: [ist.color, ist.backgroundColor],
          soll: [soll.color, soll.backgroundColor],
        };
        probe.remove();
        return ergebnis;
      });
      expect(farben.ist).toEqual(farben.soll);
      // Nur an der Mengenzelle und nur an Positionen mit Ansatz.
      await expect(marke(zelle(page, nurAnsatz, 'kurztext'))).toHaveCount(0);
      await expect(marke(zelle(page, ohne, 'menge'))).toHaveCount(0);
      await expect(zelle(page, ohne, 'menge')).not.toHaveClass(/tx-grid__zelle--mengenansatz/);
    });
  }

  test('neben einer Warnung: beide Kennzeichen, beide Beschreibungen', async ({ page }) => {
    await page.goto('/?fixture=typisch&ansatz=1&befunde=1');
    const menge = zelle(page, mitWarnung, 'menge');
    await expect(marke(menge)).toHaveText('Σ');
    await expect(menge).toHaveClass(/tx-grid__zelle--warnung/);
    await expect(menge).toHaveClass(/tx-grid__zelle--mengenansatz/);
    await expect(menge.locator('.tx-grid__marke')).toHaveCount(1);
    await expect(menge).toHaveAccessibleDescription(
      /^Menge aus Mengenansatz.*Warnung: Die Menge weicht stark von vergleichbaren Positionen ab\./,
    );
  });
});

test.describe('Bedarfs- und Wahlsumme', () => {
  test('ohne Werte erscheinen sie nicht', async ({ page }) => {
    await page.goto('/?fixture=typisch');
    await expect(summen(page)).toContainText('Brutto');
    await expect(summen(page)).not.toContainText('Bedarfssumme');
    await expect(summen(page)).not.toContainText('Wahlsumme');
  });

  test('gesetzt: nach dem Brutto, getrennt und als „nicht im Netto“ gekennzeichnet', async ({ page }) => {
    await page.goto('/?fixture=typisch&ausweis=1');
    const posten = summen(page).locator('.tx-grid__summe');
    // erst warten, bis die Testseite die Fixture geladen hat; allTextContents wartet nicht
    await expect(posten.last()).toContainText('Wahlsumme');
    const namen = await posten.locator('.tx-grid__summe-name').allTextContents();
    expect(namen.slice(-3)).toEqual(['Brutto', 'Bedarfssumme', 'Wahlsumme']);
    const bedarf = posten.filter({ hasText: 'Bedarfssumme' });
    const wahl = posten.filter({ hasText: 'Wahlsumme' });
    await expect(bedarf).toContainText(betrag('48.90'));
    await expect(wahl).toContainText(betrag('61.25'));
    await expect(bedarf).toContainText('nicht im Netto');
    await expect(wahl).toContainText('nicht im Netto');
  });
});
