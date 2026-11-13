// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 122 (SC1/PC-c1, U3: jede Grid-Aktion per Tastatur): die drei gemauerten Innenwände des EG im Modellbaum wählen und
// 03.0010 zuordnen, nur mit Tasten. Pfeiltasten und Tab bewegen nur den Fokus, die Leertaste wählt die aktive Zeile,
// Strg+Leertaste nimmt sie dazu oder wieder heraus (D-122.2); so verlässt man den Baum, ohne die Auswahl zu verlieren. Projekt,
// LV und Modell legt der Test wie `bim-mengen.spec.ts` an; ab dem Baum drückt er nur Tasten. Die erwarteten GlobalIds stehen in
// `fixtures/typisch-bim.json` (Ticket 99).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { projektAnlegen } from './hilfen';

const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

const wurzel = new URL('../../../', import.meta.url);
const HAUS = readFileSync(new URL('fixtures/ifc/haus-v1.ifc', wurzel));
const FX = JSON.parse(readFileSync(new URL('fixtures/typisch-bim.json', wurzel), 'utf8')) as {
  bauteile: { v1: { globalId: string; name: string }[] };
  zuordnungen: { positionId: string; oz: string; kurztext: string; bauteile: { globalId: string }[] }[];
  kern: { torweg: { positionIds: string[] } };
};
const POS = FX.kern.torweg.positionIds[0] ?? '';
const ZUORDNUNG = FX.zuordnungen.find((z) => z.positionId === POS);
const OZ = ZUORDNUNG?.oz ?? '';
const WAENDE = (ZUORDNUNG?.bauteile ?? []).map((b) => b.globalId);
const NAME = new Map(FX.bauteile.v1.map((b) => [b.globalId, b.name]));

const baum = (page: Page): Locator => page.getByRole('treegrid', { name: 'Modellbaum' });
const aktiveZelle = (page: Page): Locator => baum(page).locator('[role="gridcell"]:focus');
const auswahl = (page: Page): Promise<string[]> =>
  page.evaluate(() => [...(window.tethysModell?.auswahl() ?? [])].sort());

/** Tab, bis `ziel` den Fokus hat (höchstens `hoechstens`-mal); nur Tasten. */
async function tabBis(page: Page, ziel: Locator, hoechstens = 60): Promise<void> {
  for (let i = 0; i < hoechstens; i++) {
    if (await ziel.evaluate((e) => e === document.activeElement || e.contains(document.activeElement)))
      return;
    await page.keyboard.press('Tab');
  }
  await expect(ziel).toBeFocused();
}

/** Pfeil ab, bis die aktive Zelle des Baums `text` zeigt; die Auswahl ändert sich dabei nicht. */
async function pfeilAbBis(page: Page, text: string, hoechstens = 80): Promise<void> {
  for (let i = 0; i < hoechstens; i++) {
    if ((await aktiveZelle(page).textContent())?.trim() === text) return;
    await page.keyboard.press('ArrowDown');
  }
  await expect(aktiveZelle(page)).toHaveText(text);
}

test('U3: drei Wände nur mit Tasten wählen und zuordnen (Leertaste, Strg+Leertaste)', async ({ page }) => {
  test.setTimeout(180_000);
  expect(WAENDE).toHaveLength(3);
  const [w1 = '', w2 = '', w3 = ''] = WAENDE.map((g) => NAME.get(g) ?? '');

  // --- Aufbau wie in bim-mengen.spec.ts: Projekt, LV `typisch` (Testpfad), Modell einlesen ----------------------------
  await projektAnlegen(page, 'Musterhaus Tastatur', 'Bauherr Tastatur');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const inhalt = fixtureInhalt('typisch');
  const lv = await page.evaluate(([id, i]) => window.tethysTest?.lvAnlegen(id as never, i as never), [
    projektId,
    inhalt,
  ] as const);
  expect(lv?.ok).toBe(true);
  await page.goto(`/projekt/${projektId}/modelle`);
  await page.getByLabel('IFC-Datei wählen').setInputFiles({
    name: 'haus-v1.ifc',
    mimeType: 'application/octet-stream',
    buffer: HAUS,
  });
  const eingelesen = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(eingelesen.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
  await eingelesen.getByRole('button', { name: 'Modell öffnen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();
  await page.waitForFunction(() => window.tethysModell?.darstellung()?.geladen === true, undefined, {
    timeout: 45_000,
  });
  const zuordnung = page.getByRole('region', { name: 'Zuordnung zu Positionen' });
  await expect(zuordnung.getByText('0 Bauteile zugeordnet, 30 ohne Zuordnung')).toBeVisible();
  await expect(page.getByText(/Strg\+Leertaste nimmt sie dazu oder wieder heraus/)).toBeVisible();

  // --- Ab hier nur Tasten: in den Baum, zur ersten Wand; der Fokus allein wählt nichts --------------------------------
  await tabBis(page, baum(page));
  await pfeilAbBis(page, w1);
  expect(await auswahl(page)).toEqual([]);
  await page.keyboard.press('Space');
  await expect.poll(() => auswahl(page)).toEqual([WAENDE[0]]);

  // Strg+Leertaste nimmt eine Zeile dazu (die Tür) und wieder heraus; die Pfeiltasten ändern die Auswahl nicht.
  await page.keyboard.press('ArrowDown');
  await expect(aktiveZelle(page)).toHaveText('Tür Wohnen');
  await page.keyboard.press('Control+Space');
  await expect.poll(() => auswahl(page)).toHaveLength(2);
  await page.keyboard.press('Control+Space');
  await expect.poll(() => auswahl(page)).toEqual([WAENDE[0]]);
  await page.keyboard.press('ArrowDown');
  await expect(aktiveZelle(page)).toHaveText(w2);
  await page.keyboard.press('Control+Space');
  await page.keyboard.press('ArrowDown');
  await expect(aktiveZelle(page)).toHaveText(w3);
  await page.keyboard.press('Control+Space');
  await expect.poll(() => auswahl(page)).toEqual([...WAENDE].sort());
  await expect(page.getByText('3 Bauteile ausgewählt')).toBeVisible();

  // Den Baum per Tastatur verlassen (Strg+Ende, Tab) behält die Auswahl.
  await page.keyboard.press('Control+End');
  expect(await auswahl(page)).toEqual([...WAENDE].sort());

  // --- Zuordnen nur mit Tasten ---------------------------------------------------------------------------------------
  const zuordnen = zuordnung.getByRole('button', { name: 'Bauteile zuordnen …' });
  await tabBis(page, zuordnen);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: '3 Bauteile zuordnen' });
  await expect(dialog).toBeVisible();
  const suche = dialog.getByLabel('Position suchen (OZ oder Kurztext)');
  await tabBis(page, suche);
  await page.keyboard.type(OZ);
  const radio = dialog.getByRole('radio', { name: `${OZ} ${ZUORDNUNG?.kurztext ?? ''} (m²)` });
  await tabBis(page, radio);
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
  const mengenart = dialog.getByRole('combobox', { name: 'Mengenart', exact: true });
  await tabBis(page, mengenart);
  await page.keyboard.press('Enter');
  const option = page.getByRole('option', { name: 'NetSideArea (m², 3 von 3)' });
  for (let i = 0; i < 20 && !(await option.evaluate((e) => e === document.activeElement)); i++)
    await page.keyboard.press('ArrowDown');
  await expect(option).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(mengenart).toHaveText('NetSideArea (m², 3 von 3)');
  await expect(dialog.getByRole('region', { name: 'Befunde nach dem Zuordnen' })).toContainText(
    'Keine Befunde',
  );
  await tabBis(page, dialog.getByRole('button', { name: 'Zuordnen', exact: true }));
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(zuordnung.getByText('3 Bauteile zugeordnet, 27 ohne Zuordnung')).toBeVisible();
  await expect(zuordnung.getByRole('list', { name: 'Zuordnungen' })).toContainText(
    `${OZ} ${ZUORDNUNG?.kurztext ?? ''}`,
  );
});
