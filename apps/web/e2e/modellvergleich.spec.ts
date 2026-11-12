// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 116 (X1f): `haus-v1.ifc` und als neuer Stand `haus-v2.ifc` einlesen → Vergleich = Soll aus `typisch-bim.json` →
// 3D färbt hinzugefügt/geändert → Folgen für das LV `typisch` (nach der Übernahme mit v1) = betroffene Positionen laut Soll →
// „Mengen aktualisieren“ setzt die Vordersätze laut Soll als ein Undo-Schritt → Rückgängig. Die 3D-Ansicht wird über den
// Prüfzugang `window.tethysModell` geprüft, nie über Pixel (D-58, D-100.3).

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { betragDe, leerlauf, projektAnlegen, summen } from './hilfen';
import { BIM_SOLL, typischNachUebernahme } from './modellvergleich-inhalt';

// WebGL 2 in Headless-Chromium ohne GPU: ANGLE auf SwiftShader, wie in `bim.spec.ts` (D-100.11).
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

const datei = (name: string) => ({
  name: `${name}.ifc`,
  mimeType: 'application/octet-stream',
  buffer: readFileSync(new URL(`../../../fixtures/ifc/${name}.ifc`, import.meta.url)),
});
const SOLL = BIM_SOLL.erweitert;
const mengeDe = (wert: string): string => {
  const [ganz = '', nach = ''] = wert.replace('-', '').split('.');
  return `${wert.startsWith('-') ? '-' : ''}${Number(ganz).toLocaleString('de-DE')},${nach}`;
};

/** Texte der Zeilen eines Grids (nur die gerenderten; die Listen hier sind kurz). */
function gridZeilen(grid: Locator): Promise<string[][]> {
  return grid.evaluate((g) =>
    [...g.querySelectorAll('[role="row"]')]
      .map((r) => [...r.querySelectorAll('[role="gridcell"]')].map((c) => c.textContent.trim()))
      .filter((z) => z.length > 0),
  );
}

async function aufbau(page: Page): Promise<void> {
  await projektAnlegen(page, 'Musterhaus Vergleich', 'Bauherr BIM');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    typischNachUebernahme(),
  ] as const);
  expect(r?.ok).toBe(true);

  await page.getByRole('link', { name: 'Modelle', exact: true }).click();
  await page.getByLabel('IFC-Datei wählen').setInputFiles(datei('haus-v1'));
  let dialog = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(dialog.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Schließen', exact: true }).last().click();

  const wahl = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Neuer Stand von haus-v1' }).click();
  await (await wahl).setFiles(datei('haus-v2'));
  dialog = page.getByRole('dialog', { name: 'Modell eingelesen' });
  await expect(dialog.getByText('Keine Befunde.')).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Modell öffnen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v2' })).toBeVisible();
}

test('Vergleich v1 → v2, Folgen für das LV, Mengen aktualisieren als ein Undo-Schritt', async ({ page }) => {
  test.setTimeout(180_000);
  await aufbau(page);

  // Von der Modellseite des neuen Stands zum Vergleich mit dem Vorgänger.
  await page.getByRole('link', { name: 'Mit Vorgänger vergleichen' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vergleich: haus-v1 → haus-v2' })).toBeVisible();

  // Zusammenfassung und Befunde.
  const zusammenfassung = page.getByRole('region', { name: 'Zusammenfassung' });
  await expect(zusammenfassung).toContainText('Hinzugefügt1');
  await expect(zusammenfassung).toContainText('Entfernt1');
  await expect(zusammenfassung).toContainText('Geändert5');
  await expect(zusammenfassung).toContainText('Unverändert24');
  await expect(page.getByRole('region', { name: 'Befunde des Vergleichs' })).toContainText('Keine Befunde.');

  // Änderungsliste = Soll (D-99.8).
  const liste = page.getByRole('treegrid', { name: 'Änderungen' });
  await expect(liste.getByRole('gridcell', { name: 'Raumteiler Wohnen Nord' })).toBeVisible();
  const v2 = new Map(BIM_SOLL.bauteile.v2.map((b) => [b.globalId, b]));
  expect((await gridZeilen(liste)).map((z) => z.slice(0, 4))).toEqual([
    ...SOLL.vergleich.hinzugefuegt.map((b) => [
      expect.stringContaining('Hinzugefügt'),
      b.klasse,
      b.name,
      b.geschoss,
    ]),
    ...SOLL.vergleich.entfernt.map((b) => [
      expect.stringContaining('Entfernt'),
      b.klasse,
      b.name,
      b.geschoss,
    ]),
    ...SOLL.vergleich.geaendert.map((g) => {
      const b = v2.get(g.globalId);
      return [expect.stringContaining('Geändert'), b?.klasse, b?.name, b?.geschoss];
    }),
  ]);
  await expect(
    liste.getByRole('gridcell', { name: 'NetSideArea: 8,649 → 10,024', exact: false }),
  ).toBeVisible();

  // 3D: das neue Modell, hinzugefügt und geändert je in eigener Farbe, unverändert in der eigenen.
  await page.waitForFunction(() => window.tethysModell?.darstellung()?.geladen === true, undefined, {
    timeout: 45_000,
  });
  const farben = await page.evaluate(() => window.tethysModell?.darstellung()?.farben ?? {});
  const neu = SOLL.vergleich.hinzugefuegt[0]?.globalId ?? '';
  const geaendert = SOLL.vergleich.geaendert.map((g) => g.globalId);
  const unveraendert = BIM_SOLL.bauteile.v2.find(
    (b) => b.globalId !== neu && !geaendert.includes(b.globalId) && b.klasse === 'IfcWall',
  )?.globalId;
  expect(new Set(geaendert.map((g) => farben[g])).size).toBe(1);
  expect(farben[neu]).not.toBe(farben[geaendert[0] ?? '']);
  expect(farben[unveraendert ?? '']).not.toBe(farben[neu]);
  expect(farben[unveraendert ?? '']).not.toBe(farben[geaendert[0] ?? '']);
  expect(farben[SOLL.vergleich.entfernt[0]?.globalId ?? '']).toBeUndefined();

  // Folgen für das LV (das einzige im Projekt ist vorgewählt): betroffene Positionen mit Differenz = Soll.
  const folgen = page.getByRole('region', { name: 'Folgen für ein LV' });
  await expect(folgen).toContainText('2 von 7 Positionen mit Zuordnungen betroffen.');
  await expect(folgen.getByRole('group', { name: 'Netto des LV' })).toContainText(
    betragDe(BIM_SOLL.kern.sollwerte.summen['netto'] ?? ''),
  );
  const positionen = folgen.getByRole('treegrid', { name: 'Positionen mit Zuordnungen' });
  const betroffen = (await gridZeilen(positionen)).filter((z) => z.at(-1) === 'ja');
  expect(betroffen.map((z) => [z[0], z[3], z[4], z[5], z[6]])).toEqual(
    SOLL.betroffenePositionen.map((b) => [
      b.oz,
      mengeDe(b.vorher),
      mengeDe(b.nachher),
      mengeDe(b.differenz),
      mengeDe(b.vorher),
    ]),
  );

  // Mengen aktualisieren: Vorschau mit dem Befund für das entfernte Bauteil, dann ein Undo-Schritt.
  await folgen.getByRole('button', { name: 'Mengen aktualisieren …' }).click();
  const vorschau = page.getByRole('dialog', { name: 'Mengen aktualisieren' });
  await expect(vorschau).toContainText('Die Vordersätze von 2 Positionen werden aus dem neuen Stand gesetzt');
  await expect(vorschau).toContainText('Raumteiler Wohnen');
  const tiefe = await page.evaluate(() => window.tethysTest?.historie().rueck ?? 0);
  await vorschau.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(vorschau).toBeHidden();
  await leerlauf(page);
  expect(await page.evaluate(() => window.tethysTest?.historie().rueck)).toBe(tiefe + 1);

  const sollNeu = new Map(SOLL.mengenAktualisieren.vordersaetze.map((v) => [v.oz, v.menge]));
  await expect(folgen.getByRole('group', { name: 'Netto des LV' })).toContainText(
    betragDe(SOLL.mengenAktualisieren.sollwerte.summen['netto'] ?? ''),
  );
  const nachher = await gridZeilen(positionen);
  expect(nachher.map((z) => [z[0], z[6]])).toEqual(
    BIM_SOLL.zuordnungen.map((z) => [z.oz, mengeDe(sollNeu.get(z.oz) ?? '')]),
  );
  await expect(folgen.getByRole('button', { name: 'Mengen aktualisieren …' })).toBeDisabled();
  await expect(folgen).toContainText('Die Vordersätze des LV entsprechen dem neuen Stand.');

  // Rückgängig: die App zeigt das LV (Ziel einer LV-Änderung), dort wieder das Netto laut v1.
  await page.getByRole('button', { name: /Rückgängig/ }).click();
  await expect(page).toHaveURL(/\/lv\//);
  await leerlauf(page);
  await expect
    .poll(async () => (await summen(page))['Netto'])
    .toBe(betragDe(BIM_SOLL.kern.sollwerte.summen['netto'] ?? ''));
  await page.goBack();
  await expect(folgen.getByRole('group', { name: 'Netto des LV' })).toContainText(
    betragDe(BIM_SOLL.kern.sollwerte.summen['netto'] ?? ''),
  );
  await expect(folgen.getByRole('button', { name: 'Mengen aktualisieren …' })).toBeEnabled();
});
