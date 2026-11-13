// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 63: Preisspiegel-Seite. LV `typisch` über den Testpfad (mit EP, also mit Schätzpreis), die drei Angebote aus
// Ticket 69 als X84 über die Oberfläche. Alle erwarteten Zahlen stehen in der Fixture (`typisch-angebote.json`, Block
// `preisspiegel`), nicht aus einem Lauf des Kerns. Bedienung nur über Schaltflächen, Felder und Tastatur (U3, U8).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen } from './hilfen';

interface FxBieter {
  readonly angebotId: string;
  readonly name: string;
  readonly datei: string;
  readonly summen: Readonly<Record<'netto' | 'nettoNachNachlass' | 'brutto', string>>;
}
const fx = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-angebote.json', import.meta.url), 'utf8'),
) as {
  preisspiegel: {
    bieter: readonly FxBieter[];
    vergleiche: readonly { angebotIds: readonly string[]; rang: Readonly<Record<string, string>> }[];
  };
};
const BIETER = fx.preisspiegel.bieter;
const RANG = fx.preisspiegel.vergleiche[0]?.rang ?? {};
const datei = (rel: string): string => new URL(`../../../fixtures/${rel}`, import.meta.url).pathname;

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Preisspiegel' });
const detail = (page: Page): Locator => page.getByRole('region', { name: 'Zelle' });

/** Projekt, LV `typisch` und die drei X84-Angebote über „Angebot einlesen“; danach steht die LV-Seite. */
async function mitDreiAngeboten(page: Page): Promise<void> {
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
  for (const [i, b] of BIETER.entries()) {
    await page.getByLabel('Angebotsdatei wählen').setInputFiles(datei(b.datei));
    const dialog = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
    await expect(dialog.getByLabel('Bieter')).toHaveValue(b.name);
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    const liste = page.getByRole('dialog', { name: 'Angebote' });
    await expect(liste.getByRole('row', { name: new RegExp(b.name) })).toBeVisible();
    if (i < BIETER.length - 1) {
      await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
      await expect(liste).toBeHidden();
    }
  }
}

/** Fokussierte Zelle: OZ (Summenzeile: Kurztext) und Spalte. */
const fokus = (page: Page): Promise<{ zeile: string; spalte: string }> =>
  page.evaluate(() => {
    const el = document.activeElement;
    const z = el?.closest('[role="row"]');
    const oz = z?.querySelector('[data-spalte="oz"] .tx-grid__text')?.textContent ?? '';
    const name = z?.querySelector('[data-spalte="kurztext"] .tx-grid__text')?.textContent ?? '';
    return { zeile: oz === '' ? name : oz, spalte: el?.getAttribute('data-spalte') ?? '' };
  });

/** Kennung der Spalte `art` (EP/GP) unter dem Gruppenkopf des Bieters, aus den Spaltenköpfen des Grids. */
async function spalteVon(page: Page, bieter: string, art: 'ep' | 'gp'): Promise<string> {
  const c = Number(
    await grid(page).getByRole('columnheader', { name: bieter, exact: true }).getAttribute('aria-colindex'),
  );
  const koepfe = await grid(page)
    .locator('[data-spalte-kopf]')
    .evaluateAll((els) =>
      els.map((e) => [e.getAttribute('aria-colindex'), e.getAttribute('data-spalte-kopf')]),
    );
  const id = koepfe.find(([i, k]) => Number(i) >= c && Number(i) <= c + 1 && k?.endsWith(`:${art}`))?.[1];
  if (id === undefined || id === null) throw new Error(`Spalte ${bieter} / ${art} fehlt`);
  return id;
}

/** Per Tastatur zur Zelle: Strg+Pos1, Pfeil runter bis zur Zeile, Pfeil rechts bis zur Spalte `art` des Bieters. */
async function zurZelle(page: Page, zeile: string, bieter: string, art: 'ep' | 'gp'): Promise<void> {
  const spalte = await spalteVon(page, bieter, art);
  await grid(page).locator('[role="gridcell"]').first().click();
  await page.keyboard.press('Control+Home');
  for (let i = 0; i < 80 && (await fokus(page)).zeile !== zeile; i++) await page.keyboard.press('ArrowDown');
  expect((await fokus(page)).zeile).toBe(zeile);
  for (let i = 0; i < 40 && (await fokus(page)).spalte !== spalte; i++)
    await page.keyboard.press('ArrowRight');
  expect(await fokus(page)).toEqual({ zeile, spalte });
  await expect(detail(page).getByTestId('detail-bieter')).toHaveText(bieter);
}

test('Preisspiegel aus der Angebotsliste: Summen und Rang je Bieter wie die Fixture', async ({ page }) => {
  await mitDreiAngeboten(page);
  await page.getByRole('dialog', { name: 'Angebote' }).getByRole('link', { name: 'Preisspiegel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Preisspiegel/ })).toBeVisible();
  await expect(grid(page)).toBeVisible();

  const tabelle = page.getByRole('table', { name: 'Bieter des Preisspiegels' });
  for (const b of BIETER) {
    const zeile = tabelle.getByRole('row', { name: new RegExp(b.name) });
    await expect(zeile.getByTestId('rang')).toHaveText(RANG[b.angebotId] ?? '');
    await expect(zeile.getByTestId('netto')).toHaveText(betragDe(b.summen.netto));
    await expect(zeile.getByTestId('nettoNachNachlass')).toHaveText(betragDe(b.summen.nettoNachNachlass));
    await expect(zeile.getByTestId('brutto')).toHaveText(betragDe(b.summen.brutto));
  }

  // Dieselben Werte in den Summenzeilen des Grids, per Tastatur erreichbar. Der Summenblock ist eingeklappt, bis er
  // geöffnet wird (Ticket 142).
  const a = BIETER.find((b) => RANG[b.angebotId] === '1') as FxBieter;
  await expect(grid(page).getByRole('row', { name: /Netto nach Nachlass/ })).toHaveCount(0);
  const summenKnopf = page.getByRole('toolbar').getByRole('button', { name: 'Summen' });
  await expect(summenKnopf).toHaveAttribute('aria-expanded', 'false');
  await summenKnopf.click();
  await expect(summenKnopf).toHaveAttribute('aria-expanded', 'true');
  await zurZelle(page, 'Netto nach Nachlass', a.name, 'gp');
  await expect(detail(page).getByTestId('detail-wert')).toHaveText(
    `Netto nach Nachlass ${betragDe(a.summen.nettoNachNachlass)}`,
  );
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(detail(page).getByTestId('detail-wert')).toHaveText(`Brutto ${betragDe(a.summen.brutto)}`);
  await page.keyboard.press('Control+ArrowDown');
  await expect(detail(page).getByTestId('detail-wert')).toHaveText('Rang 1');
});

test('Ausreißer und „nicht angeboten“ sichtbar und per Tastatur erreichbar; die Schwelle ändert die Kennzeichen', async ({
  page,
}) => {
  await mitDreiAngeboten(page);
  await page
    .getByRole('dialog', { name: 'Angebote' })
    .getByRole('button', { name: 'Schließen', exact: true })
    .last()
    .click();
  await page.getByRole('toolbar').getByRole('link', { name: 'Preisspiegel' }).click();
  await expect(grid(page)).toBeVisible();

  // Fixture: Annahme A7 nennt Bieter C an 02.0050 als Ausreißer (EP 253,350); Bieter B hat 03.0070 nicht angeboten.
  await zurZelle(page, '02.0050', 'Bieter C', 'ep');
  const zelle = page.locator(':focus');
  await expect(zelle.locator('.tx-grid__text')).toHaveText('253,350');
  await expect(zelle.locator('[data-kennzeichen="hoch"]')).toBeVisible();
  await expect(zelle).toHaveAccessibleDescription(/Ausreißer nach oben/);
  await expect(detail(page)).toContainText('Ausreißer nach oben: mehr als 20,00 % über dem Mittel');

  await zurZelle(page, '03.0070', 'Bieter B', 'ep');
  await expect(page.locator(':focus')).toHaveAccessibleDescription(/nicht angeboten/);
  await expect(detail(page)).toContainText('Nicht angeboten');

  // Bei drei Bietern liegt kein Preis > 0 mehr als 200 % über oder 100 % unter dem Mittel: keine Ausreißer mehr.
  const schwelle = page.getByLabel('Ausreißer-Schwelle');
  await schwelle.fill('200');
  await schwelle.press('Enter');
  await expect(grid(page).locator('[data-kennzeichen="hoch"], [data-kennzeichen="niedrig"]')).toHaveCount(0);
  await zurZelle(page, '02.0050', 'Bieter C', 'ep');
  await expect(page.locator(':focus [data-kennzeichen="hoch"]')).toHaveCount(0);
  await expect(detail(page)).not.toContainText('Ausreißer');

  await schwelle.fill('20');
  await schwelle.press('Enter');
  await zurZelle(page, '02.0050', 'Bieter C', 'ep');
  await expect(page.locator(':focus [data-kennzeichen="hoch"]')).toBeVisible();

  // Eine unlesbare Eingabe meldet am Feld und lässt die geltende Schwelle stehen (U5).
  await schwelle.fill('viel');
  await schwelle.press('Enter');
  await expect(page.getByText('Bitte eine Zahl wie 20 oder 12,5 eingeben.')).toBeVisible();
  await zurZelle(page, '02.0050', 'Bieter C', 'ep');
  await expect(page.locator(':focus [data-kennzeichen="hoch"]')).toBeVisible();
});

test('Spalten ein- und ausblenden: ohne EP stehen die Kennzeichen am GP', async ({ page }) => {
  await mitDreiAngeboten(page);
  await page.getByRole('dialog', { name: 'Angebote' }).getByRole('link', { name: 'Preisspiegel' }).click();
  await expect(grid(page)).toBeVisible();
  await expect(grid(page).getByRole('columnheader', { name: 'Min', exact: true })).toHaveCount(1);
  await page.getByRole('checkbox', { name: /Virtuelle Bieter/ }).uncheck();
  await expect(grid(page).getByRole('columnheader', { name: 'Min', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'EP', exact: true }).uncheck();
  await expect(grid(page).locator('[data-spalte-kopf$=":ep"]')).toHaveCount(0);
  await zurZelle(page, '02.0050', 'Bieter C', 'gp');
  await expect(page.locator(':focus [data-kennzeichen="hoch"]')).toBeVisible();
});
