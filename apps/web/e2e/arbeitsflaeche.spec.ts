// SPDX-License-Identifier: AGPL-3.0-or-later
// Arbeitsfläche bei 1280×800 (Ticket 142, U6, B-05 bis B-08): Die LV-Seite zeigt mit `typisch` und mit der amtlichen
// BVBS-Prüfdatei (X83) mindestens 15 Zeilen und die Spalten EP und GP ohne waagerechtes Rollen; die Werkzeugleiste steht
// in einer Zeile; Summenfuß und Werkzeugleiste liegen nicht unter einer Meldung. Auftrags-LV und Preisspiegel laufen nicht
// waagerecht über, das Auftrags-LV zeigt den Gesamtpreis bei 1280 und 1440 px. Die Werkzeugleiste ist per Tastatur
// bedienbar.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixtureAlsX83 } from './fixture-inhalt';
import { gaebEinlesen, neueZeile, projektAnlegen } from './hilfen';
import { werkzeug, werkzeugleiste } from './werkzeuge';

test.use({ viewport: { width: 1280, height: 800 } });

const wurzel = new URL('../../../fixtures/', import.meta.url);
const datei = (rel: string): string => new URL(rel, wurzel).pathname;
const BVBS_X83 = 'extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83';
const TYPISCH = 'Typisch: Musterhaus (erfunden)';

type Rechteck = {
  readonly links: number;
  readonly rechts: number;
  readonly oben: number;
  readonly unten: number;
};

async function rechteck(l: Locator): Promise<Rechteck> {
  const b = await l.boundingBox();
  expect(b).not.toBeNull();
  const r = b ?? { x: 0, y: 0, width: 0, height: 0 };
  return { links: r.x, rechts: r.x + r.width, oben: r.y, unten: r.y + r.height };
}

const ueberlappen = (a: Rechteck, b: Rechteck): boolean =>
  a.links < b.rechts && b.links < a.rechts && a.oben < b.unten && b.oben < a.unten;

/** Läuft der Arbeitsbereich (oder die Seite) waagerecht über? */
function waagerechterUeberlauf(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    return (
      document.documentElement.scrollWidth > window.innerWidth ||
      (main !== null && main.scrollWidth > main.clientWidth)
    );
  });
}

/**
 * Sichtbarkeit im Grid ohne Rollen: Zahl der Zeilen, die ganz im sichtbaren Bereich unter dem Kopf stehen, und ob die
 * Spaltenköpfe ganz im sichtbaren Bereich liegen (waagerecht nicht gerollt).
 */
function gridSicht(
  page: Page,
  name: string,
  spalten: readonly string[],
): Promise<{ zeilen: number; gerollt: number; sichtbar: Record<string, boolean> }> {
  return page.evaluate(
    ([gridName, koepfe]) => {
      const grid = [...document.querySelectorAll<HTMLElement>('[role="treegrid"]')].find(
        (g) => g.getAttribute('aria-label') === gridName,
      );
      if (grid === undefined) throw new Error(`Grid ${gridName} fehlt`);
      const g = grid.getBoundingClientRect();
      const kopf = grid.querySelector('[role="rowgroup"], .tx-grid__kopf')?.getBoundingClientRect();
      const oben = kopf?.bottom ?? g.top;
      const unten = g.top + grid.clientTop + grid.clientHeight;
      const rechts = g.left + grid.clientLeft + grid.clientWidth;
      const zeilen = [...grid.querySelectorAll('[role="row"][data-i]')].filter((r) => {
        const b = r.getBoundingClientRect();
        return b.top >= oben - 0.5 && b.bottom <= unten + 0.5;
      }).length;
      const sichtbar: Record<string, boolean> = {};
      for (const k of koepfe) {
        const zelle = [...grid.querySelectorAll('[role="columnheader"]')].find(
          (z) => z.textContent.trim() === k,
        );
        const b = zelle?.getBoundingClientRect();
        sichtbar[k] = b !== undefined && b.left >= g.left && b.right <= rechts + 0.5;
      }
      return { zeilen, gerollt: grid.scrollLeft, sichtbar };
    },
    [name, spalten] as const,
  );
}

async function lvSeitePruefen(page: Page): Promise<void> {
  // Die Werkzeugleiste steht in einer Zeile (Höhe einer Schaltfläche).
  const leiste = await rechteck(werkzeugleiste(page));
  expect(leiste.unten - leiste.oben).toBeLessThanOrEqual(36);
  // Mindestens 15 Zeilen; EP und GP ganz zu sehen, ohne waagerecht zu rollen.
  const sicht = await gridSicht(page, 'Positionen', ['Einheitspreis', 'Gesamtpreis']);
  expect(sicht.zeilen).toBeGreaterThanOrEqual(15);
  expect(sicht.gerollt).toBe(0);
  expect(sicht.sichtbar).toEqual({ Einheitspreis: true, Gesamtpreis: true });
  expect(await waagerechterUeberlauf(page)).toBe(false);
  // Summenfuß, Nachlass und MwSt im Bild; die Seite selbst rollt nicht.
  const summen = await rechteck(page.locator('.tx-grid__summen'));
  const felder = await rechteck(page.getByRole('group', { name: 'Nachlass und MwSt' }));
  expect(felder.unten).toBeLessThanOrEqual(800 - 24);
  // Die Meldung zum Einlesen steht noch: Sie überdeckt weder Summenfuß noch Werkzeugleiste noch Nachlass und MwSt.
  const meldungen = page.locator('.tx-toast');
  await expect(meldungen.first()).toBeVisible();
  for (const m of await meldungen.all()) {
    const r = await rechteck(m);
    expect(ueberlappen(r, summen)).toBe(false);
    expect(ueberlappen(r, leiste)).toBe(false);
    expect(ueberlappen(r, felder)).toBe(false);
  }
}

test('LV-Seite mit `typisch` (X83): eine Zeile Werkzeuge, mindestens 15 Zeilen, EP und GP ohne Rollen', async ({
  page,
}) => {
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  await gaebEinlesen(page, fixtureAlsX83('typisch'), TYPISCH);
  await lvSeitePruefen(page);
  // Das Prüf-Panel ist zu; die Schaltfläche nennt die Zahl der Befunde.
  await expect(page.getByRole('complementary', { name: 'Prüfung des LV' })).toHaveCount(0);
  await expect(werkzeugleiste(page).locator('.lv-pruefung__zahl')).toHaveText(/^\d+$/);
});

test('LV-Seite mit der amtlichen BVBS-Prüfdatei (X83): mindestens 15 Zeilen, EP und GP ohne Rollen', async ({
  page,
}) => {
  await projektAnlegen(page, 'Prüfdatei', 'BVBS');
  await page.getByLabel('GAEB-Datei wählen').setInputFiles(datei(BVBS_X83));
  const dialog = page.getByRole('dialog', { name: 'GAEB-Datei einlesen' });
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole('list', { name: 'Leistungsverzeichnisse', exact: true })
    .getByRole('link')
    .first()
    .click();
  await expect(page.getByRole('treegrid', { name: 'Positionen' })).toBeVisible();
  await lvSeitePruefen(page);
});

test('Werkzeugleiste per Tastatur: Pfeile zwischen den Gruppen, Enter öffnet, Enter führt aus; F8 und Escape am Panel', async ({
  page,
}) => {
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  await gaebEinlesen(page, fixtureAlsX83('typisch'), TYPISCH);
  const leiste = werkzeugleiste(page);
  const einfuegen = leiste.getByRole('button', { name: 'Einfügen', exact: true });
  await einfuegen.focus();
  await page.keyboard.press('ArrowRight');
  await expect(leiste.getByRole('button', { name: 'Bearbeiten', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(einfuegen).toBeFocused();

  // Enter öffnet das Menü auf dem ersten Punkt; Escape schließt es, der Fokus steht wieder auf dem Auslöser.
  await page.keyboard.press('Enter');
  const menue = page.getByRole('menu');
  await expect(menue.getByRole('menuitem', { name: 'Titel anlegen', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menue).toHaveCount(0);
  await expect(einfuegen).toBeFocused();

  // Pfeil ab öffnet ebenfalls; „Position anlegen“ mit Enter legt die Zeile an, der Fokus steht in ihrem Kurztext. Radix
  // setzt den Fokus im Menü erst nach dem Tastendruck (Zeitgeber): Jeder Schritt wartet, bis er angekommen ist.
  await page.keyboard.press('ArrowDown');
  for (const punkt of ['Titel anlegen', 'Untertitel anlegen', 'Position anlegen']) {
    if (punkt !== 'Titel anlegen') await page.keyboard.press('ArrowDown');
    await expect(menue.getByRole('menuitem', { name: punkt, exact: true })).toBeFocused();
  }
  await neueZeile(page, () => page.keyboard.press('Enter'));
  await expect(menue).toHaveCount(0);

  // F8 blendet das Prüf-Panel ein und setzt den Fokus auf den ersten Befund; Escape blendet es aus, der Fokus geht an
  // die Schaltfläche „Prüfung“.
  await page.keyboard.press('F8');
  const panel = page.getByRole('complementary', { name: 'Prüfung des LV' });
  await expect(panel.locator('[data-pruefeintrag]').first()).toBeFocused();
  const pruefung = leiste.getByRole('button', { name: /^Prüfung/ });
  await expect(pruefung).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(pruefung).toBeFocused();
  await expect(pruefung).toHaveAttribute('aria-expanded', 'false');
});

test('Preisspiegel und Auftrags-LV ohne waagerechten Überlauf; der Gesamtpreis steht bei 1280 und 1440 px im Bild', async ({
  page,
}) => {
  await projektAnlegen(page, 'Musterhaus', 'Bauherr');
  await gaebEinlesen(page, fixtureAlsX83('typisch'), TYPISCH);
  // Wie ein Nutzer: „Angebot einlesen“ aus dem Menü öffnet die Dateiauswahl (die Aktion läuft nach dem Schließen).
  for (const b of ['angebote/typisch-bieter-a.x84', 'angebote/typisch-bieter-b.x84']) {
    const wahl = page.waitForEvent('filechooser');
    await werkzeug(page, 'Angebote', 'Angebot einlesen');
    await (await wahl).setFiles(datei(b));
    const einlesen = page.getByRole('dialog', { name: 'Angebot (X84) einlesen' });
    await einlesen.getByRole('button', { name: 'Übernehmen' }).click();
    const liste = page.getByRole('dialog', { name: 'Angebote' });
    await liste.getByRole('button', { name: 'Schließen', exact: true }).last().click();
    await expect(liste).toBeHidden();
  }

  // Preisspiegel: Summenblock zu, Bieterübersicht ganz im Bild; aufgeklappt stehen die Summenzeilen im Grid.
  await werkzeugleiste(page).getByRole('button', { name: 'Angebote', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Preisspiegel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Preisspiegel/ })).toBeVisible();
  const bieter = page.getByRole('table', { name: 'Bieter des Preisspiegels' });
  await expect(bieter).toBeVisible();
  expect(await waagerechterUeberlauf(page)).toBe(false);
  const arbeit = await rechteck(page.getByRole('main'));
  const tabelle = await rechteck(bieter);
  expect(tabelle.rechts).toBeLessThanOrEqual(arbeit.rechts);
  expect(tabelle.unten).toBeLessThanOrEqual(800 - 24);
  for (const m of await page.locator('.tx-toast').all())
    expect(ueberlappen(await rechteck(m), tabelle)).toBe(false);
  const grid = page.getByRole('treegrid', { name: 'Preisspiegel' });
  await expect(grid.getByRole('row', { name: /Netto nach Nachlass/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Summen', exact: true }).click();
  await expect(grid.getByRole('row', { name: /Netto nach Nachlass/ })).toHaveCount(1);
  expect(await waagerechterUeberlauf(page)).toBe(false);

  // Zuschlag: das Auftrags-LV zeigt den Gesamtpreis ohne Rollen, bei 1280 und bei 1440 px.
  await bieter
    .getByRole('button', { name: /^Zuschlag erteilen: / })
    .first()
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Zuschlag erteilen', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Auftrags-LV – / })).toBeVisible();
  for (const breite of [1280, 1440]) {
    await page.setViewportSize({ width: breite, height: breite === 1280 ? 800 : 900 });
    const sicht = await gridSicht(page, 'Positionen des Auftrags-LV', ['Einheitspreis', 'Gesamtpreis']);
    expect(sicht.sichtbar, `bei ${String(breite)} px`).toEqual({ Einheitspreis: true, Gesamtpreis: true });
    expect(await waagerechterUeberlauf(page)).toBe(false);
  }
  // Die Verweise der Abrechnung stehen einheitlich im Menü „Abrechnung“.
  await werkzeugleiste(page).getByRole('button', { name: 'Abrechnung', exact: true }).click();
  await expect(page.getByRole('menu').getByRole('menuitem')).toHaveText([
    'Aufmaß',
    'Soll/Ist',
    'Rechnungen',
    'Aufmaß aus Modell',
  ]);
});
