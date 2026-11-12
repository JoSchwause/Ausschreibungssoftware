// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Modellansicht im Prüfstand. Die Tests lesen den Zustand der Leinwand über den Prüfzugang (`window.__modell`), nie
// Pixel (D-58).

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { globalId } from '../src/testhilfe/ifc-erzeuger';
import type { Pruefeingaben } from './harness/global';

const WAND_SUED = globalId('Wand', 1);
const WAND_NORD = globalId('Wand', 2);
const WAND_WEST = globalId('Wand', 3);
const WAND_OST = globalId('Wand', 4);
const PLATTE = globalId('Platte', 1);
const STUETZE = globalId('Stuetze', 1);
const FENSTER = globalId('Fenster', 1);
const ALLE = [WAND_SUED, WAND_NORD, WAND_WEST, WAND_OST, PLATTE, STUETZE, FENSTER].sort();
const GRAD = Math.PI / 180;

const leinwand = (page: Page) => page.getByRole('application', { name: /3D-Ansicht des Modells/ });

async function laden(page: Page, url = '/?modell=klein'): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => window.__modell.ereignisse.geladen.length > 0);
}

const darstellung = (page: Page) => page.evaluate(() => window.__modell.darstellung());
const kamera = async (page: Page) => (await darstellung(page)).kamera;
const setzen = (page: Page, teil: Partial<Pruefeingaben>) =>
  page.evaluate((t) => window.__modell.setzen(t), teil);
const auswahlEreignisse = (page: Page) => page.evaluate(() => window.__modell.ereignisse.auswahl);

async function punkt(page: Page, id: string): Promise<{ x: number; y: number }> {
  const p = await page.evaluate((g) => window.__modell.punkt(g), id);
  if (!p) throw new Error(`Bauteil nicht sichtbar: ${id}`);
  return p;
}

/** Werte der Design-Tokens im Schema, das gerade gilt (Quelle der Farben, U4). */
async function tokens(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const stil = getComputedStyle(document.documentElement);
    const namen = ['focus', 'success', 'danger', 'warning', 'accent', 'surface-sunken'];
    return Object.fromEntries(
      namen.map((n) => [n, stil.getPropertyValue(`--tx-color-${n}`).trim().toLowerCase()]),
    );
  });
}

test.describe('kleines Modell', () => {
  test.beforeEach(async ({ page }) => {
    await laden(page);
  });

  test('lädt das Modell und meldet Bauteile mit und ohne Geometrie', async ({ page }) => {
    const [bericht] = await page.evaluate(() => window.__modell.ereignisse.geladen);
    expect([...(bericht?.mitGeometrie ?? [])].sort()).toEqual(ALLE);
    expect(bericht?.ohneGeometrie).toEqual([globalId('Platzhalter', 1)]);
    expect(bericht?.dauerMs).toBeGreaterThan(0);

    const d = await darstellung(page);
    expect(d.geladen).toBe(true);
    expect(d.bauteile).toBe(7);
    expect([...d.sichtbar].sort()).toEqual(ALLE);
    expect(d.hervorgehoben).toEqual([]);
    expect(d.bilder).toBeGreaterThan(0);
    await expect(leinwand(page)).toHaveAccessibleName('3D-Ansicht des Modells: 7 Bauteile, keine Auswahl');
    expect(await page.evaluate(() => window.__modell.ereignisse.fehler)).toEqual([]);
  });

  test('Auswahl über die Eingabe hebt die Bauteile in der Farbe der Auswahl hervor', async ({ page }) => {
    await setzen(page, { auswahl: [WAND_SUED, STUETZE, '0Unbekannt000000000001'] });
    const d = await darstellung(page);
    const t = await tokens(page);
    expect([...d.hervorgehoben].sort()).toEqual([WAND_SUED, STUETZE].sort());
    expect(d.farben[WAND_SUED]).toBe(t['focus']);
    expect(d.farben[STUETZE]).toBe(t['focus']);
    expect(d.farben[WAND_NORD]).not.toBe(t['focus']);
    await expect(leinwand(page)).toHaveAccessibleName('3D-Ansicht des Modells: 7 Bauteile, 2 ausgewählt');
    await setzen(page, { auswahl: [] });
    expect((await darstellung(page)).hervorgehoben).toEqual([]);
  });

  test('Klick auf ein Bauteil meldet seine GlobalId, Strg+Klick ergänzt, ein Klick ins Leere hebt auf', async ({
    page,
  }) => {
    const ost = await punkt(page, WAND_OST);
    await page.mouse.click(ost.x, ost.y);
    await expect.poll(() => auswahlEreignisse(page)).toEqual([{ globalIds: [WAND_OST], hinzufuegen: false }]);
    await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([WAND_OST]);

    const stuetze = await punkt(page, STUETZE);
    await page.keyboard.down('Control');
    await page.mouse.click(stuetze.x, stuetze.y);
    await page.keyboard.up('Control');
    await expect
      .poll(async () => (await auswahlEreignisse(page)).at(-1))
      .toEqual({ globalIds: [STUETZE], hinzufuegen: true });
    await expect
      .poll(async () => [...(await darstellung(page)).hervorgehoben].sort())
      .toEqual([WAND_OST, STUETZE].sort());
    await expect(leinwand(page)).toHaveAccessibleName('3D-Ansicht des Modells: 7 Bauteile, 2 ausgewählt');

    // Strg+Klick ins Leere ändert nichts, ein Klick ins Leere hebt die Auswahl auf
    await page.keyboard.down('Control');
    await page.mouse.click(8, 8);
    await page.keyboard.up('Control');
    expect(await auswahlEreignisse(page)).toHaveLength(2);
    await page.mouse.click(8, 8);
    await expect
      .poll(async () => (await auswahlEreignisse(page)).at(-1))
      .toEqual({ globalIds: [], hinzufuegen: false });
    await expect.poll(async () => (await darstellung(page)).hervorgehoben).toEqual([]);
  });

  test('ein Klick auf das Glas trifft das Fenster vor der Wand', async ({ page }) => {
    const glas = await punkt(page, FENSTER);
    await page.mouse.click(glas.x, glas.y);
    await expect.poll(() => auswahlEreignisse(page)).toEqual([{ globalIds: [FENSTER], hinzufuegen: false }]);
  });

  test('Ausblenden und Isolieren je Bauteil ohne neues Laden; Ausgeblendetes lässt sich nicht anklicken', async ({
    page,
  }) => {
    const sued = await punkt(page, WAND_SUED);
    await setzen(page, { ausgeblendet: [WAND_SUED, FENSTER] });
    expect([...(await darstellung(page)).sichtbar].sort()).toEqual(
      ALLE.filter((id) => id !== WAND_SUED && id !== FENSTER),
    );
    expect(await page.evaluate((id) => window.__modell.punkt(id), WAND_SUED)).toBeNull();
    await page.mouse.click(sued.x, sued.y);
    await expect.poll(async () => (await auswahlEreignisse(page)).length).toBe(1);
    expect((await auswahlEreignisse(page))[0]?.globalIds).not.toContain(WAND_SUED);

    await setzen(page, { ausgeblendet: [], isoliert: [STUETZE, PLATTE] });
    expect([...(await darstellung(page)).sichtbar].sort()).toEqual([STUETZE, PLATTE].sort());
    await setzen(page, { isoliert: [STUETZE], ausgeblendet: [STUETZE] });
    expect((await darstellung(page)).sichtbar).toEqual([]);
    await setzen(page, { isoliert: null, ausgeblendet: [] });
    expect([...(await darstellung(page)).sichtbar].sort()).toEqual(ALLE);
    expect(await page.evaluate(() => window.__modell.ereignisse.geladen.length)).toBe(1);
  });

  test('Färbung nach Kennzeichen in den Farben der Design-Tokens, auch nach dem Umschalten auf dunkel', async ({
    page,
  }) => {
    await setzen(page, {
      auswahl: [WAND_OST],
      faerbung: {
        [WAND_SUED]: 'hinzugefuegt',
        [WAND_NORD]: 'entfernt',
        [WAND_WEST]: 'geaendert',
        [PLATTE]: 'zugeordnet',
        [STUETZE]: 'ohne-zuordnung',
        [WAND_OST]: 'geaendert',
      },
    });
    const pruefen = async (): Promise<void> => {
      const t = await tokens(page);
      const d = await darstellung(page);
      expect(d.hintergrund).toBe(t['surface-sunken']);
      expect(d.farben[WAND_SUED]).toBe(t['success']);
      expect(d.farben[WAND_NORD]).toBe(t['danger']);
      expect(d.farben[WAND_WEST]).toBe(t['warning']);
      expect(d.farben[PLATTE]).toBe(t['accent']);
      expect(d.farben[STUETZE]).toBe(t['warning']);
      // die Auswahl geht der Färbung vor; ungefärbte Bauteile behalten die Farbe aus der Datei
      expect(d.farben[WAND_OST]).toBe(t['focus']);
      expect(Object.values(t)).not.toContain(d.farben[FENSTER]);
    };
    await pruefen();
    const hell = (await darstellung(page)).farben[WAND_SUED];
    await page.evaluate(() => {
      document.documentElement.dataset['theme'] = 'dark';
    });
    await expect.poll(async () => (await darstellung(page)).farben[WAND_SUED]).not.toBe(hell);
    await pruefen();
  });

  test('Tastatur: sichtbarer Fokus, Pfeile drehen, Umschalt+Pfeile verschieben, Plus und Minus zoomen, Pos1 setzt zurück', async ({
    page,
  }) => {
    await page.keyboard.press('Tab');
    await expect(leinwand(page)).toBeFocused();
    expect(await leinwand(page).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    await expect(leinwand(page)).toHaveAccessibleDescription(/Pfeiltasten drehen die Ansicht/);

    const k0 = await kamera(page);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    let k = await kamera(page);
    expect(k.azimut).toBeCloseTo(k0.azimut - 15 * GRAD, 9);
    expect(k.hoehe).toBeCloseTo(k0.hoehe + 15 * GRAD, 9);

    await page.keyboard.press('Home');
    expect(await kamera(page)).toEqual(k0);

    await page.keyboard.press('Shift+ArrowRight');
    k = await kamera(page);
    expect(k.abstand).toBe(k0.abstand);
    expect(k.azimut).toBe(k0.azimut);
    const weg = Math.hypot(...k.ziel.map((x, i) => x - (k0.ziel[i] ?? 0)));
    expect(weg).toBeCloseTo(0.1 * k0.abstand, 6);

    await page.keyboard.press('+');
    expect((await kamera(page)).abstand).toBeCloseTo(0.8 * k0.abstand, 6);
    await page.keyboard.press('-');
    expect((await kamera(page)).abstand).toBeCloseTo(k0.abstand, 6);
    await page.keyboard.press('Home');
    expect(await kamera(page)).toEqual(k0);
  });

  test('F zeigt die Auswahl: Ziel in der Mitte der Leinwand, Abstand passend zum Bauteil', async ({
    page,
  }) => {
    await page.keyboard.press('Tab');
    const k0 = await kamera(page);
    await page.keyboard.press('f');
    expect(await kamera(page)).toEqual(k0); // ohne Auswahl geschieht nichts

    await setzen(page, { auswahl: [STUETZE] });
    await page.keyboard.press('f');
    const k = await kamera(page);
    expect(k.azimut).toBe(k0.azimut);
    // Stütze 0,4 m × 3 m × 0,4 m: halbe Raumdiagonale 1,5264 m, senkrechter Sichtwinkel 45° → 1,5264 / sin 22,5°
    expect(k.abstand).toBeCloseTo(3.989, 2);
    const mitte = await punkt(page, STUETZE);
    const box = await leinwand(page).boundingBox();
    expect(Math.abs(mitte.x - ((box?.x ?? 0) + (box?.width ?? 0) / 2))).toBeLessThan(3);
    expect(Math.abs(mitte.y - ((box?.y ?? 0) + (box?.height ?? 0) / 2))).toBeLessThan(3);
  });

  test('Befehle über die Ref: Auswahl zeigen und Ansicht zurücksetzen', async ({ page }) => {
    const k0 = await kamera(page);
    await setzen(page, { auswahl: [WAND_OST] });
    await page.evaluate(() => window.__modell.auswahlZeigen());
    // Ostwand 0,3 m × 3 m × 8 m: halbe Raumdiagonale 4,2747 m → 4,2747 / sin 22,5°
    expect((await kamera(page)).abstand).toBeCloseTo(11.17, 1);
    await page.evaluate(() => window.__modell.ansichtZuruecksetzen());
    expect(await kamera(page)).toEqual(k0);
  });

  test('Maus: Ziehen dreht, rechts Ziehen verschiebt, das Rad zoomt; nichts davon wählt aus', async ({
    page,
  }) => {
    const k0 = await kamera(page);
    await page.mouse.move(700, 450);
    await page.mouse.down();
    await page.mouse.move(800, 450, { steps: 5 });
    await page.mouse.up();
    let k = await kamera(page);
    expect(k.azimut).toBeLessThan(k0.azimut);
    expect(k.ziel).toEqual(k0.ziel);

    await page.mouse.down({ button: 'right' });
    await page.mouse.move(700, 500, { steps: 5 });
    await page.mouse.up({ button: 'right' });
    k = await kamera(page);
    expect(k.ziel).not.toEqual(k0.ziel);

    const vorher = k.abstand;
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await kamera(page)).abstand).toBeLessThan(vorher);
    expect(await auswahlEreignisse(page)).toEqual([]);
  });
});

test('dunkles Schema von Anfang an: Hintergrund und Auswahl aus den dunklen Tokens', async ({ page }) => {
  await laden(page, '/?modell=klein&thema=dark');
  await setzen(page, { auswahl: [STUETZE] });
  const d = await darstellung(page);
  expect(d.hintergrund).toBe('#0d1215');
  expect(d.farben[STUETZE]).toBe('#7fb0ff');
});

test('eine Datei, die kein IFC ist, meldet onFehler und zeigt den Grund', async ({ page }) => {
  await page.goto('/?modell=kaputt');
  await page.waitForFunction(() => window.__modell.ereignisse.fehler.length > 0);
  expect(await page.evaluate(() => window.__modell.ereignisse.fehler.map((f) => f.code))).toEqual([
    'datei-nicht-lesbar',
  ]);
  await expect(page.getByRole('alert')).toHaveText('Die Datei lässt sich nicht als IFC-Modell lesen.');
  expect(await page.evaluate(() => window.__modell.ereignisse.geladen.length)).toBe(0);
  await expect(leinwand(page)).toHaveAccessibleName('3D-Ansicht des Modells: wird geladen');
});
