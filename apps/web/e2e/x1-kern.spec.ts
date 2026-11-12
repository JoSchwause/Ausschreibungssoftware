// SPDX-License-Identifier: AGPL-3.0-or-later
// Tor X1-Kern (Ticket 117, D-58, `plan.md` §4) über die Oberfläche: neues Projekt → LV `typisch` über „GAEB einlesen“ (X86,
// D-117.1) → `fixtures/ifc/haus-v1.ifc` einlesen → der Baum zeigt Geschosse und Bauteile, die 3D-Ansicht zeichnet alle
// Bauteile → Auswahl im Baum hebt im 3D hervor, ein Klick im 3D wählt im Baum → Eigenschaften (Pset) der Auswahl sichtbar →
// die gemauerten Innenwände des EG der Position 03.0010 zuordnen (Torweg, D-99.2) → auf der LV-Seite „Mengen aus Modell …“:
// Vordersatz, GP und LV-Summen = Sollwerte → Neuladen behält LV, Modell, Zuordnung und 3D.
//
// Alle erwarteten Zahlen stehen in `fixtures/typisch-bim.json` und `typisch.json` (Ticket 99), nie aus einem Lauf der App.
// Die 3D-Ansicht prüft der Prüfzugang `window.tethysModell` (Test-Build), nie Pixel (D-58).

import { expect, test } from '@playwright/test';
import { betragDe, summen } from './hilfen';
import {
  BIM,
  TYPISCH,
  aktiveZelle,
  auswahl3d,
  baumzelle,
  darstellung,
  dreiDGeladen,
  lvGrid,
  mengeDe,
  mengenAusModell,
  modellEinlesen,
  nameIn,
  projektMitTypisch,
  summenDe,
  zelle,
  zugeordnet,
  zuordnen,
} from './x1-aufbau';

// WebGL 2 in Headless-Chromium ohne GPU: ANGLE auf SwiftShader, wie in `bim.spec.ts` (D-100.11).
const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
test.use({
  launchOptions: {
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(executablePath ? { executablePath } : {}),
  },
});

const ALLE = BIM.bauteile.v1.map((b) => b.globalId).sort();
const EG = BIM.bauteile.v1.filter((b) => b.geschoss === 'EG').map((b) => b.globalId);
const OG = BIM.bauteile.v1.filter((b) => b.geschoss === 'OG').map((b) => b.globalId);
const POS = BIM.kern.torweg.positionIds[0] ?? '';
const ZUORDNUNG = BIM.zuordnungen.find((z) => z.positionId === POS);
const VORDERSATZ = BIM.kern.vordersaetze.find((v) => v.positionId === POS);
const WAENDE = (ZUORDNUNG?.bauteile ?? []).map((b) => b.globalId);
const OZ = ZUORDNUNG?.oz ?? '';
/** Die erste Innenwand des Torwegs und ihre Menge laut Fixture (für die Eigenschaftsleiste). */
const WAND = WAENDE[0] ?? '';
const WAND_MENGE = BIM.bauteile.v1
  .find((b) => b.globalId === WAND)
  ?.mengen.find((q) => q.name === 'NetSideArea');

test('Tor X1-Kern: LV per GAEB, IFC einlesen, Baum ↔ 3D, Pset, Zuordnen, Mengen übernehmen = Soll, Neuladen', async ({
  page,
}) => {
  test.setTimeout(240_000);
  expect(WAENDE).toHaveLength(3);
  expect(EG).toHaveLength(17);

  // --- Projekt und LV `typisch` per GAEB: Summen wie die Fixture --------------------------------------------------
  const { lvPfad } = await projektMitTypisch(page, 'Musterhaus X1-Kern');
  await expect(zelle(lvGrid(page), 'ordnungszahl', OZ, 'menge')).toHaveText('212,400');
  await expect.poll(() => summen(page)).toMatchObject(summenDe(TYPISCH.sollwerte.summen));

  // --- haus-v1.ifc einlesen ------------------------------------------------------------------------------------------
  await page.getByRole('link', { name: 'Zum Projekt' }).click();
  await page.getByRole('link', { name: 'Modelle', exact: true }).click();
  await modellEinlesen(page, 'haus-v1');
  const modellPfad = new URL(page.url()).pathname;

  // Baum: Geschosse und Bauteile; 3D: alle 30 Bauteile gezeichnet und sichtbar.
  await expect(baumzelle(page, 'EG')).toBeVisible();
  await expect(baumzelle(page, 'OG')).toBeVisible();
  for (const g of EG) await expect(baumzelle(page, nameIn('v1', g))).toBeVisible();
  await dreiDGeladen(page);
  await expect.poll(async () => (await darstellung(page)).sichtbar).toEqual(ALLE);
  expect((await darstellung(page)).bauteile).toBe(ALLE.length);

  // --- Auswahl Baum → 3D: das Geschoss hebt genau seine Bauteile hervor, eine Wand nur sich -------------------------
  await baumzelle(page, 'EG').click();
  await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([...EG].sort());
  await baumzelle(page, nameIn('v1', WAND)).click();
  await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([WAND]);

  // --- Auswahl 3D → Baum: ein Klick auf ein sichtbares Bauteil des OG wählt es und macht seine Zeile aktiv ---------
  const ziel = await page.evaluate((kandidaten) => {
    for (const g of kandidaten) {
      const p = window.tethysModell?.punkt(g);
      if (p) return { g, p };
    }
    return null;
  }, OG);
  expect(ziel).not.toBeNull();
  if (ziel === null) return;
  await page.mouse.click(ziel.p.x, ziel.p.y);
  await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([ziel.g]);
  await expect(aktiveZelle(page)).toHaveText(nameIn('v1', ziel.g));
  expect(await auswahl3d(page)).toEqual([ziel.g]);

  // --- Eigenschaften der Innenwand: Pset aus den Bytes und die Menge aus dem Modell ----------------------------------
  await baumzelle(page, nameIn('v1', WAND)).click();
  await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([WAND]);
  const leiste = page.getByRole('region', { name: 'Eigenschaften' });
  const pset = leiste.getByRole('region', { name: 'Pset_WallCommon' });
  await expect(pset).toBeVisible();
  await expect(pset.getByText('IsExternal')).toBeVisible();
  await expect(
    leiste.locator('dt', { hasText: /· NetSideArea$/ }).locator('xpath=following-sibling::dd[1]'),
  ).toHaveText(mengeDe(WAND_MENGE?.wert ?? ''));

  // --- Zuordnen: die Innenwände des EG an 03.0010 (NetSideArea); 3D färbt sie „zugeordnet“ ---------------------------
  const zuordnung = page.getByRole('region', { name: 'Zuordnung zu Positionen' });
  await expect(zuordnung.getByRole('combobox', { name: 'LV für Zuordnung' })).toHaveText(`LV: ${BIM.lvName}`);
  await expect(
    zuordnung.getByText(`0 Bauteile zugeordnet, ${String(ALLE.length)} ohne Zuordnung`),
  ).toBeVisible();
  if (ZUORDNUNG === undefined) throw new Error('Fixture ohne Zuordnung des Torwegs');
  await zuordnen(page, ZUORDNUNG);
  await expect(
    zuordnung.getByText(
      `${String(WAENDE.length)} Bauteile zugeordnet, ${String(ALLE.length - WAENDE.length)} ohne Zuordnung`,
    ),
  ).toBeVisible();
  await expect.poll(() => zugeordnet(page)).toEqual([...WAENDE].sort());
  await expect(zuordnung.getByRole('list', { name: 'Zuordnungen' })).toContainText(
    `${OZ} ${ZUORDNUNG.kurztext}`,
  );

  // --- Mengen übernehmen auf der LV-Seite: Vordersatz, GP und Summen = Soll ----------------------------------------
  if (VORDERSATZ === undefined) throw new Error('Fixture ohne Vordersatz des Torwegs');
  await page.goto(lvPfad);
  const grid = lvGrid(page);
  await expect(zelle(grid, 'ordnungszahl', OZ, 'menge')).toHaveText('212,400');
  await mengenAusModell(page, [VORDERSATZ]);
  const soll = BIM.kern.torweg.sollwerte;
  const lvPruefen = async (): Promise<void> => {
    await expect(zelle(grid, 'ordnungszahl', OZ, 'menge')).toHaveText(mengeDe(VORDERSATZ.menge));
    await expect(zelle(grid, 'ordnungszahl', OZ, 'gesamtpreis')).toHaveText(
      betragDe(soll.positionen[POS]?.gp ?? ''),
    );
    await expect.poll(() => summen(page)).toMatchObject(summenDe(soll.summen));
  };
  await lvPruefen();

  // --- Neuladen: LV, Modell, Zuordnung und 3D kommen aus dem Speicher -----------------------------------------------
  await page.reload();
  await lvPruefen();
  await page.goto(modellPfad);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'haus-v1' })).toBeVisible();
  await expect(baumzelle(page, 'EG')).toBeVisible();
  await expect(baumzelle(page, 'OG')).toBeVisible();
  await dreiDGeladen(page);
  await expect.poll(async () => (await darstellung(page)).sichtbar).toEqual(ALLE);
  await expect(
    zuordnung.getByText(
      `${String(WAENDE.length)} Bauteile zugeordnet, ${String(ALLE.length - WAENDE.length)} ohne Zuordnung`,
    ),
  ).toBeVisible();
  await expect.poll(() => zugeordnet(page)).toEqual([...WAENDE].sort());
  await expect(zuordnung.getByRole('list', { name: 'Zuordnungen' })).toContainText(
    `${OZ} ${ZUORDNUNG.kurztext}`,
  );
});
