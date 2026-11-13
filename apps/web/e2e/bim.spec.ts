// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 114 (X1a, X1b): `fixtures/ifc/haus-v1.ifc` einlesen → Baum zeigt EG/OG und Bauteile → Auswahl im Baum hebt im 3D
// hervor, Klick im 3D wählt im Baum → Pset sichtbar → Neuladen behält Modell und 3D → Undo des Einlesens. Die 3D-Ansicht wird
// über den Prüfzugang `window.tethysModell` (Test-Build) geprüft, nie über Pixel (D-58, D-100.3).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { projektAnlegen } from './hilfen';

// WebGL 2 in Headless-Chromium ohne GPU: ANGLE auf SwiftShader, wie im Prüfstand von ui-modell (D-100.11).
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

const HAUS = readFileSync(new URL('../../../fixtures/ifc/haus-v1.ifc', import.meta.url));
const SOLL = JSON.parse(
  readFileSync(new URL('../../../fixtures/typisch-bim.json', import.meta.url), 'utf8'),
) as {
  bauteile: { v1: { globalId: string; name: string; geschoss: string }[] };
};
const NAME = new Map(SOLL.bauteile.v1.map((b) => [b.globalId, b.name]));
const EG = SOLL.bauteile.v1.filter((b) => b.geschoss === 'EG').map((b) => b.globalId);
const WAND_SUED_EG = '1l3nLN5cFF3QXQ8i5cD4LA';

const baum = (page: Page): Locator => page.getByRole('treegrid', { name: 'Modellbaum' });
/** Zelle der Baumspalte; bei einem Knoten mit Unterknoten trägt sie den Namen des Auf-/Zuklappknopfs davor. */
const zelle = (page: Page, text: string): Locator =>
  baum(page).getByRole('gridcell', {
    name: new RegExp(`^((Auf|Zu)klappen )?${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  });
const aktiveZelle = (page: Page): Locator => baum(page).locator('[role="gridcell"][tabindex="0"]');

async function modellEinlesen(page: Page): Promise<void> {
  await projektAnlegen(page, 'Musterhaus BIM', 'Bauherr BIM');
  await page.getByRole('link', { name: 'Modelle', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Modelle: Musterhaus BIM' })).toBeVisible();
  await page.getByLabel('IFC-Datei wählen').setInputFiles({
    name: 'haus-v1.ifc',
    mimeType: 'application/octet-stream',
    buffer: HAUS,
  });
  const dialog = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(dialog.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
}

async function dreiDGeladen(page: Page): Promise<void> {
  await page.waitForFunction(() => window.tethysModell?.darstellung()?.geladen === true, undefined, {
    timeout: 45_000,
  });
}

const darstellung = (page: Page) =>
  page.evaluate(() => {
    const d = window.tethysModell?.darstellung();
    return { hervorgehoben: [...(d?.hervorgehoben ?? [])].sort(), bauteile: d?.bauteile ?? 0 };
  });

test('IFC einlesen, Baum und 3D synchron, Eigenschaften, Neuladen behält alles', async ({ page }) => {
  test.setTimeout(150_000);
  await modellEinlesen(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Modell öffnen' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();
  await expect(zelle(page, 'EG')).toBeVisible();
  await expect(zelle(page, 'OG')).toBeVisible();
  await expect(zelle(page, 'Außenwand Süd EG')).toBeVisible();
  await dreiDGeladen(page);
  expect((await darstellung(page)).bauteile).toBeGreaterThan(0);

  // Baum → 3D: das Geschoss wählt alle Bauteile darunter.
  await zelle(page, 'EG').click();
  await expect
    .poll(async () => (await darstellung(page)).hervorgehoben)
    .toEqual(
      // Bauteile ohne Geometrie hebt die Leinwand nicht hervor; alle des EG haben welche.
      [...EG].sort(),
    );

  // 3D → Baum: ein Klick auf ein sichtbares Bauteil wählt es und springt zu seiner Zeile.
  await page.getByRole('button', { name: 'Alles zeigen' }).click();
  const ziel = await page.evaluate(
    (kandidaten) => {
      for (const g of kandidaten) {
        const p = window.tethysModell?.punkt(g);
        if (p) return { g, p };
      }
      return null;
    },
    SOLL.bauteile.v1.filter((b) => b.geschoss === 'OG').map((b) => b.globalId),
  );
  expect(ziel).not.toBeNull();
  if (ziel === null) return;
  await page.mouse.click(ziel.p.x, ziel.p.y);
  await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([ziel.g]);
  await expect(aktiveZelle(page)).toHaveText(NAME.get(ziel.g) ?? '');
  expect(await page.evaluate(() => window.tethysModell?.auswahl())).toEqual([ziel.g]);

  // Eigenschaften der Auswahl aus den Bytes (Pset).
  await zelle(page, 'Außenwand Süd EG').click();
  await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([WAND_SUED_EG]);
  const leiste = page.getByRole('region', { name: 'Eigenschaften' });
  const pset = leiste.getByRole('region', { name: 'Pset_WallCommon' });
  await expect(pset).toBeVisible();
  await expect(pset.getByText('IsExternal')).toBeVisible();

  // Ausblenden und Isolieren ändern nur die Sichtbarkeit der Leinwand.
  await page.getByRole('button', { name: 'Auswahl isolieren' }).click();
  await expect
    .poll(() => page.evaluate(() => window.tethysModell?.darstellung()?.sichtbar))
    .toEqual([WAND_SUED_EG]);
  await page.getByRole('button', { name: 'Alles zeigen' }).click();

  // Neuladen: Modell, Baum und 3D kommen aus dem Speicher (Bytes aus der Ablage).
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();
  await expect(zelle(page, 'OG')).toBeVisible();
  await dreiDGeladen(page);
  expect((await darstellung(page)).bauteile).toBeGreaterThan(0);
});

test('Rückgängig nimmt das Einlesen zurück, Wiederholen bringt es wieder', async ({ page }) => {
  test.setTimeout(90_000);
  await modellEinlesen(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).last().click();
  const liste = page.getByRole('table', { name: 'Bauwerksmodelle' });
  // Name, Datei, Schema, Tag, Zahl der Bauteile, kein Vorgänger
  await expect(liste.getByRole('row', { name: /haus-v1/ })).toContainText(/haus-v1\.ifc\s*IFC 4.*30\s*–/);
  await page.getByRole('button', { name: /Rückgängig/ }).click();
  await expect(page.getByText('Noch kein Modell.')).toBeVisible();
  await page.getByRole('button', { name: /Wiederholen/ }).click();
  await expect(liste.getByRole('row', { name: /haus-v1/ })).toBeVisible();
});

test('Löschen fragt nach, Abbrechen hat den Anfangsfokus; Umbenennen', async ({ page }) => {
  test.setTimeout(90_000);
  await modellEinlesen(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen', exact: true }).last().click();
  await page.getByRole('button', { name: 'haus-v1 umbenennen' }).click();
  const umbenennen = page.getByRole('dialog', { name: 'Modell umbenennen' });
  await umbenennen.getByLabel('Name des Modells').fill('Haus Entwurf');
  await umbenennen.getByRole('button', { name: 'Speichern' }).click();
  const liste = page.getByRole('table', { name: 'Bauwerksmodelle' });
  await expect(liste.getByRole('link', { name: 'Haus Entwurf' })).toBeVisible();

  await page.getByRole('button', { name: 'Haus Entwurf löschen' }).click();
  const frage = page.getByRole('dialog', { name: 'Modell löschen?' });
  await expect(frage.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
  await frage.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByText('Noch kein Modell.')).toBeVisible();
  await page.getByRole('button', { name: /Rückgängig/ }).click();
  await expect(liste.getByRole('link', { name: 'Haus Entwurf' })).toBeVisible();
});
