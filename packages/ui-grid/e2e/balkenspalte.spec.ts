// SPDX-License-Identifier: AGPL-3.0-or-later
// Balkenspalte im Vergleichsgrid (Ticket 96) auf der Testseite `bauzeit.html` mit einem erfundenen Bauzeitenplan.
// Achse: 120 Tage ab Fr 01.01.2027 (Tag 0) zu 16 px, bis 30.04.2027. Die erwarteten Lagen stehen als Literale da
// (Tag × 16; Herleitung der Zeilen in `harness/bauzeit-daten.ts`):
//   1.2 Erdarbeiten   Tag 10–22 (11.01.–22.01.), kritisch, 40 %  → links 160, breit 192
//   1    Rohbau        Tag 3–59, Sammelvorgang                   → links 48, breit 896
//   1.4 Rohbau fertig Tag 59, Meilenstein, kritisch             → Mitte bei 944
//   0.1 Planung       Tag −20–6, vorn abgeschnitten              → links 0, breit 96
//   2.3 Fliesen       Tag 108–130, hinten abgeschnitten          → links 1728, breit 192
//   2.4 Abnahme       Tag 140, Meilenstein ganz hinter der Achse

import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const grid = (page: Page): Locator => page.getByRole('treegrid', { name: 'Bauzeitenplan' });
const zeile = (page: Page, nr: string): Locator =>
  grid(page)
    .getByRole('row')
    .filter({
      has: page.locator('[data-spalte="nr"] .tx-grid__text', {
        hasText: new RegExp(`^${nr.replaceAll('.', '\\.')}$`),
      }),
    });
const balkenzelle = (page: Page, nr: string): Locator => zeile(page, nr).locator('[data-spalte="balken"]');
const achsenkopf = (page: Page): Locator => grid(page).getByRole('columnheader', { name: 'Zeitplan' });

async function box(l: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await l.boundingBox();
  if (!b) throw new Error('kein Rahmen');
  return b;
}

test.describe('Balkenspalte: Kopf und Lage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bauzeit.html');
    await expect(grid(page)).toBeVisible();
  });

  test('zweizeiliger Kopf: Monate oben, Kalenderwochen unten, an der Lage ihrer Tage', async ({ page }) => {
    const kopf = achsenkopf(page);
    const oben = kopf.locator('[data-zeitabschnitt="kopf"]');
    const unten = kopf.locator('[data-zeitabschnitt="unterkopf"]');
    await expect(oben).toHaveText(['Januar 2027', 'Februar 2027', 'März 2027', 'April 2027']);
    // KW 53 (ab Mo 28.12.2026, auf Fr–So geschnitten) und KW 1 bis KW 17
    await expect(unten).toHaveCount(18);
    await expect(unten.first()).toHaveText('KW 53');
    await expect(unten.nth(1)).toHaveText('KW 1');
    const k = await box(kopf);
    const februar = await box(oben.nth(1));
    expect(februar.x - k.x).toBeCloseTo(31 * 16, 0);
    expect(februar.width).toBeCloseTo(28 * 16, 0);
    const kw53 = await box(unten.first());
    expect(kw53.x - k.x).toBeCloseTo(0, 0);
    expect(kw53.width).toBeCloseTo(3 * 16, 0);
    const kw1 = await box(unten.nth(1));
    expect(kw1.x - k.x).toBeCloseTo(48, 0);
    expect(kw1.width).toBeCloseTo(7 * 16, 0);
    expect(kw1.y).toBeGreaterThan(februar.y);
    // Die Achse reicht über beide Kopfzeilen, wie die Spalten ohne Gruppe; die Gruppe „Termine“ steht über Anfang/Ende.
    const nr = await box(grid(page).getByRole('columnheader', { name: 'Nr.' }));
    expect(k.height).toBeCloseTo(56, 0);
    expect(nr.height).toBeCloseTo(56, 0);
    const termine = await box(grid(page).getByRole('columnheader', { name: 'Termine' }));
    const anfang = await box(grid(page).getByRole('columnheader', { name: 'Anfang' }));
    expect(anfang.y).toBeGreaterThan(termine.y);
    expect(k.y).toBeCloseTo(termine.y, 0);
  });

  test('ohne untere Kopfzeile füllen die Monate die volle Höhe; ohne Gruppen bleibt der Kopf zweizeilig', async ({
    page,
  }) => {
    await page.goto('/bauzeit.html?unterkopf=0&gruppen=0');
    const kopf = achsenkopf(page);
    await expect(kopf.locator('[data-zeitabschnitt="unterkopf"]')).toHaveCount(0);
    const januar = await box(kopf.locator('[data-zeitabschnitt="kopf"]').first());
    const k = await box(kopf);
    expect(k.height).toBeCloseTo(56, 0);
    expect(januar.height).toBeGreaterThan(50);
    // Die übrigen Kopfzellen reichen über die volle Höhe; für den Screenreader ist es eine Kopfzeile.
    expect((await box(grid(page).getByRole('columnheader', { name: 'Anfang' }))).height).toBeCloseTo(56, 0);
    await expect(grid(page)).toHaveAttribute('aria-rowcount', String(1 + 12));
    await expect(zeile(page, '0')).toHaveAttribute('aria-rowindex', '2');
  });

  test('Balken an der Lage und in der Breite ihrer Tage, bündig mit dem Kopf', async ({ page }) => {
    const zelle = balkenzelle(page, '1.2');
    const z = await box(zelle);
    const erdarbeiten = await box(zelle.locator('[data-balken="vorgang"]'));
    expect(erdarbeiten.x - z.x).toBeCloseTo(160, 0);
    expect(erdarbeiten.width).toBeCloseTo(192, 0);
    // beginnt mit KW 2 (Mo 11.01.2027)
    const kw2 = await box(achsenkopf(page).locator('[data-zeitabschnitt="unterkopf"]').nth(2));
    expect(erdarbeiten.x).toBeCloseTo(kw2.x, 0);

    const rohbau = await box(balkenzelle(page, '1').locator('[data-balken="sammelvorgang"]'));
    expect(rohbau.x - z.x).toBeCloseTo(48, 0);
    expect(rohbau.width).toBeCloseTo(896, 0);

    const fertig = await box(balkenzelle(page, '1.4').locator('[data-balken="meilenstein"]'));
    expect(fertig.x + fertig.width / 2 - z.x).toBeCloseTo(944, 0);
    // eine Raute: so hoch wie breit
    expect(fertig.height).toBeCloseTo(fertig.width, 0);
  });
});

/** Farbe eines Tokens auf der Seite, so wie der Browser sie für `color` rechnet (z. B. „rgb(11, 102, 112)“). */
const tokenfarbe = (page: Page, token: string): Promise<string> =>
  page.evaluate((t) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${t})`;
    document.body.append(probe);
    const farbe = getComputedStyle(probe).color;
    probe.remove();
    return farbe;
  }, token);
const stil = (l: Locator) =>
  l.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bild: s.backgroundImage, rand: s.borderTopColor, umriss: s.outlineStyle, groesse: s.backgroundSize };
  });

test.describe('Balkenspalte: Darstellung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bauzeit.html');
    await expect(grid(page)).toBeVisible();
  });

  test('kritisch ist nicht nur an der Farbe erkennbar: Vorgang schraffiert, Meilenstein gerahmt', async ({
    page,
  }) => {
    const kritisch = await stil(balkenzelle(page, '1.2').locator('[data-balken="vorgang"]'));
    const normal = await stil(balkenzelle(page, '1.3').locator('[data-balken="vorgang"]'));
    expect(kritisch.bild).toContain('repeating-linear-gradient');
    expect(normal.bild).toBe('none');
    expect(kritisch.rand).toBe(await tokenfarbe(page, '--tx-color-danger'));
    expect(normal.rand).toBe(await tokenfarbe(page, '--tx-color-accent'));
    expect((await stil(balkenzelle(page, '1.4').locator('[data-balken="meilenstein"]'))).umriss).toBe('solid');
  });

  test('Fortschritt füllt den Balken von links; Ist-Termine als schmaler Balken darunter', async ({ page }) => {
    // 40 % von 12 Tagen = 4,8 Tage = 76,8 px
    const erdarbeiten = await stil(balkenzelle(page, '1.2').locator('[data-balken="vorgang"]'));
    expect(erdarbeiten.groesse).toMatch(/^76\.8px 100%/);
    const zelle = balkenzelle(page, '1.3');
    const z = await box(zelle);
    const soll = await box(zelle.locator('[data-balken="vorgang"]'));
    const ist = await box(zelle.locator('[data-balken="ist"]'));
    expect(ist.x - z.x).toBeCloseTo(26 * 16, 0);
    expect(ist.width).toBeCloseTo(12 * 16, 0);
    expect(ist.height).toBeLessThan(soll.height);
    expect(ist.y).toBeGreaterThanOrEqual(soll.y + soll.height);
  });

  test('freie Tage sind schattiert; die Markierung steht an ihrem Tag und hat eine Beschreibung', async ({
    page,
  }) => {
    const raster = balkenzelle(page, '1.1').locator('.tx-grid__freie-tage');
    const frei = (tag: number): Promise<boolean> =>
      raster.evaluate(
        (el, x) => (el as SVGGeometryElement).isPointInFill(new DOMPoint(x, 0.5)),
        tag * 16 + 8,
      );
    expect(await frei(0)).toBe(true); // Neujahr
    expect(await frei(1)).toBe(true); // Sa 02.01.
    expect(await frei(3)).toBe(false); // Mo 04.01.
    expect(await frei(83)).toBe(false); // Do 25.03.
    expect(await frei(84)).toBe(true); // Karfreitag 26.03.
    const kopf = achsenkopf(page);
    await expect(kopf).toHaveAccessibleDescription('Markierungen: Stichtag 01.04.2027');
    const marke = kopf.locator('[data-markierung="stichtag"]');
    await expect(marke).toHaveAttribute('title', 'Stichtag 01.04.2027');
    const k = await box(kopf);
    const m = await box(marke);
    expect(m.x + m.width / 2 - k.x).toBeCloseTo(90 * 16, 0);
  });

  test('abgeschnittene Balken: Kennzeichen am Rand mit Beschreibung, im Namen genannt', async ({ page }) => {
    const planung = balkenzelle(page, '0.1');
    const z = await box(planung);
    const vorn = await box(planung.locator('[data-balken="vorgang"]'));
    expect(vorn.x - z.x).toBeCloseTo(0, 0);
    expect(vorn.width).toBeCloseTo(96, 0);
    const anfang = planung.locator('[data-balkenrand="anfang"]');
    await expect(anfang).toHaveText('◀');
    await expect(anfang).toHaveAttribute(
      'title',
      '12.12.2026 bis 06.01.2027, 16 Arbeitstage, beginnt vor dem dargestellten Zeitraum',
    );
    expect((await box(anfang)).x - z.x).toBeLessThan(2);
    await expect(planung).toHaveAccessibleName(
      '12.12.2026 bis 06.01.2027, 16 Arbeitstage, beginnt vor dem dargestellten Zeitraum',
    );

    const fliesen = balkenzelle(page, '2.3');
    const fz = await box(fliesen);
    const hinten = await box(fliesen.locator('[data-balken="vorgang"]'));
    expect(hinten.x - fz.x).toBeCloseTo(1728, 0);
    expect(hinten.width).toBeCloseTo(192, 0);
    const ende = fliesen.locator('[data-balkenrand="ende"]');
    await expect(ende).toHaveText('▶');
    const e = await box(ende);
    expect(fz.x + 1920 - (e.x + e.width)).toBeLessThan(3);
    await expect(fliesen).toHaveAccessibleName(/, kritisch, endet nach dem dargestellten Zeitraum$/);

    // ganz hinter der Achse: kein Balken, nur das Kennzeichen am Ende
    const abnahme = balkenzelle(page, '2.4');
    await expect(abnahme.locator('[data-balken]')).toHaveCount(0);
    await expect(abnahme.locator('[data-balkenrand="ende"]')).toHaveAttribute(
      'title',
      'Meilenstein 21.05.2027, liegt nach dem dargestellten Zeitraum',
    );
    await expect(abnahme).toHaveAccessibleName('Meilenstein 21.05.2027, liegt nach dem dargestellten Zeitraum');
  });

  test('dunkles Schema: Balken in den dunklen Tokens, kritisch weiterhin anders', async ({ page }) => {
    const hell = await stil(balkenzelle(page, '1.3').locator('[data-balken="vorgang"]'));
    await page.goto('/bauzeit.html?thema=dark');
    await expect(grid(page)).toBeVisible();
    const normal = await stil(balkenzelle(page, '1.3').locator('[data-balken="vorgang"]'));
    const kritisch = await stil(balkenzelle(page, '1.2').locator('[data-balken="vorgang"]'));
    expect(normal.rand).toBe(await tokenfarbe(page, '--tx-color-accent'));
    expect(normal.rand).not.toBe(hell.rand);
    expect(kritisch.rand).toBe(await tokenfarbe(page, '--tx-color-danger'));
    expect(kritisch.bild).toContain('repeating-linear-gradient');
    const ist = balkenzelle(page, '1.3').locator('[data-balken="ist"]');
    expect(await ist.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      await tokenfarbe(page, '--tx-color-text-muted'),
    );
  });
});

test.describe('Balkenspalte: Bedienung', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bauzeit.html');
    await expect(grid(page)).toBeVisible();
  });

  test('Tastatur in die Balkenzelle: Name für den Screenreader, Meldung, der Balken kommt in Sicht', async ({
    page,
  }) => {
    const fixiertBis = async (): Promise<number> => {
      const b = await box(grid(page).getByRole('columnheader', { name: 'Vorgang' }));
      return b.x + b.width;
    };
    await page.getByRole('button', { name: 'Davor' }).focus();
    await page.keyboard.press('Tab');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    const erdarbeiten = balkenzelle(page, '1.2');
    await expect(erdarbeiten).toBeFocused();
    await expect(erdarbeiten).toHaveAccessibleName(
      'Fa. Muster Bau, 11.01.2027 bis 22.01.2027, 10 Arbeitstage, kritisch',
    );
    await expect(erdarbeiten.locator('[data-balken="vorgang"]')).toBeInViewport({ ratio: 1 });
    expect((await page.evaluate(() => window.__bauzeit.aktiveZellen)).at(-1)).toEqual({
      zeilenId: 'p2',
      spalte: 'balken',
    });

    // weiter nach unten bis 2.3 Fliesen (hinten abgeschnitten): Das Grid scrollt zum Balken
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown');
    const fliesen = balkenzelle(page, '2.3');
    await expect(fliesen).toBeFocused();
    await expect(fliesen.locator('[data-balken="vorgang"]')).toBeInViewport({ ratio: 1 });
    // 2.4 Abnahme liegt ganz hinter der Achse: Das Kennzeichen am Ende kommt in Sicht
    await page.keyboard.press('ArrowDown');
    await expect(balkenzelle(page, '2.4').locator('[data-balkenrand="ende"]')).toBeInViewport({ ratio: 1 });
    // zurück nach oben zu 0.1 Planung (vorn abgeschnitten): Der Balken steht rechts der fixierten Spalten
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowUp');
    const planung = balkenzelle(page, '0.1');
    await expect(planung).toBeFocused();
    const balken = planung.locator('[data-balken="vorgang"]');
    await expect(balken).toBeInViewport({ ratio: 1 });
    expect((await box(balken)).x).toBeGreaterThanOrEqual((await fixiertBis()) - 1);
  });

  test('eine Zeile ohne Balken: die Ansicht bleibt stehen, solange die Achse zu sehen ist', async ({ page }) => {
    const scrollLeft = (): Promise<number> => grid(page).evaluate((el) => el.scrollLeft);
    const planung = balkenzelle(page, '0.1');
    const vorlauf = balkenzelle(page, '0');
    await planung.locator('[data-balken="vorgang"]').click();
    await expect(planung).toBeFocused();
    expect(await scrollLeft()).toBe(0);
    // Die Achse beginnt sichtbar und reicht weit nach rechts: kein Sprung zu ihrem Anfang oder Ende
    await page.keyboard.press('ArrowUp');
    await expect(vorlauf).toBeFocused();
    await expect(vorlauf).not.toHaveAttribute('aria-label');
    expect(await scrollLeft()).toBe(0);
    // weit gescrollt ebenso; zurück auf der Planung kommt deren Balken rechts der fixierten Spalten in Sicht
    await page.keyboard.press('ArrowDown');
    await grid(page).evaluate((el) => {
      el.scrollLeft = 300;
    });
    await page.keyboard.press('ArrowUp');
    await expect(vorlauf).toBeFocused();
    expect(await scrollLeft()).toBe(300);
    await page.keyboard.press('ArrowDown');
    await expect(planung.locator('[data-balken="vorgang"]')).toBeInViewport({ ratio: 1 });
    expect(await scrollLeft()).toBeLessThan(300);
  });

  test('Strg+C kopiert den Text der Balkenzelle', async ({ context, page }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await balkenzelle(page, '1.2').locator('[data-balken="vorgang"]').click();
    await page.keyboard.press('Control+c');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Fa. Muster Bau\r\n');
  });
});
