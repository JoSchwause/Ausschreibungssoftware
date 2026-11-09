// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser-Tests des Speichers: echter Worker, SQLite-WASM im OPFS (VFS opfs-sahpool), ohne COOP/COEP-Header.
// Jeder Test bekommt von Playwright einen frischen Browser-Kontext und damit ein leeres OPFS.

import { expect, test, type Page } from '@playwright/test';
import type { Pruefstand, PruefSchritt } from '../harness/main';
import { anlegenSchritte, eintrag, ladeFixture } from '../src/testhilfe/fixtures';

const DB = 'e2e';
const ms = (x: number): string => String(Math.round(x));

/** Ruft eine Methode des Prüfstands in der Seite auf. */
async function ps<K extends keyof Pruefstand>(
  page: Page,
  methode: K,
  ...args: Parameters<Pruefstand[K]>
): Promise<Awaited<ReturnType<Pruefstand[K]>>> {
  return (await page.evaluate(
    ([m, a]) => {
      const p = (window as unknown as { pruefstand: Record<string, (...x: unknown[]) => unknown> })
        .pruefstand;
      return (p[m as string] as (...x: unknown[]) => unknown)(...(a as unknown[]));
    },
    [methode, args] as const,
  )) as Awaited<ReturnType<Pruefstand[K]>>;
}

async function start(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#status')).toBeVisible();
}

const schritte = (name: 'winzig' | 'typisch' | 'gross'): PruefSchritt[] => anlegenSchritte(ladeFixture(name));

test.describe('ohne COOP/COEP', () => {
  test('der Prüfstand ist nicht cross-origin-isolated und hat kein SharedArrayBuffer; OPFS und Speicher laufen trotzdem', async ({
    page,
  }) => {
    await start(page);
    const u = await ps(page, 'umgebung');
    expect(u).toEqual({ crossOriginIsolated: false, sharedArrayBuffer: false, opfs: true });
    expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
    expect(await ps(page, 'anwenden', DB, schritte('winzig'))).toMatchObject({ ok: true });
    expect(await ps(page, 'projekte', DB)).toHaveLength(1);
  });
});

test.describe('Daten überleben ein Neuladen', () => {
  for (const name of ['typisch', 'gross'] as const) {
    test(`${name}: speichern, Seite neu laden, Speicher neu öffnen, Inhalt unverändert`, async ({ page }) => {
      const f = ladeFixture(name);
      const folge = anlegenSchritte(f);
      await start(page);
      expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
      expect(await ps(page, 'anwenden', DB, folge)).toMatchObject({ ok: true });
      await ps(page, 'schliessen', DB);

      await page.reload();
      await expect(page.locator('#status')).toBeVisible();
      expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
      expect(await ps(page, 'projekte', DB)).toEqual([{ id: f.projekt.id, name: f.projekt.name }]);
      const lv = await ps(page, 'lvPruefen', DB, f.lv.leistungsverzeichnis.id, f.lv);
      expect(lv.gleich).toBe(true);
      expect(lv.positionen).toBe(f.lv.leistungsverzeichnis.knoten.filter((k) => k.art === 'position').length);
      for (const a of f.angebote) expect(await ps(page, 'angebotPruefen', DB, a.angebot.id, a)).toBe(true);
      expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(folge.length);
    });
  }

  test('ohne sauberes Schließen (Tab-Absturz nachgestellt durch hartes Neuladen) bleibt der letzte Befehl erhalten', async ({
    page,
  }) => {
    const f = ladeFixture('typisch');
    const folge = anlegenSchritte(f);
    await start(page);
    await ps(page, 'oeffnen', DB);
    await ps(page, 'anwenden', DB, folge);
    await page.reload(); // kein `schliessen`: Worker und Handles werden mit der Seite verworfen
    await expect(page.locator('#status')).toBeVisible();
    await ps(page, 'oeffnen', DB);
    expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(folge.length);
  });
});

test.describe('Leistung', () => {
  test('Laden von gross (5.000 Positionen) aus OPFS unter 2 s', async ({ page }) => {
    const f = ladeFixture('gross');
    await start(page);
    await ps(page, 'oeffnen', DB);
    const speichern = await ps(page, 'anwenden', DB, anlegenSchritte(f));
    expect(speichern).toMatchObject({ ok: true });
    await ps(page, 'schliessen', DB);

    // Kaltstart wie in der Praxis: Seite neu laden, Worker neu starten, dann das LV laden.
    await page.reload();
    await ps(page, 'oeffnen', DB);
    const zeiten = await ps(page, 'lvLadezeit', DB, f.lv.leistungsverzeichnis.id, 5);
    const sortiert = [...zeiten].sort((a, b) => a - b);
    const erstes = zeiten[0] ?? Number.NaN;
    const median = sortiert[Math.floor(sortiert.length / 2)] ?? Number.NaN;
    const meldung = `[speicher/opfs] gross: speichern ${ms(speichern.ms)} ms; laden (5 Läufe, ms): ${zeiten
      .map((z) => ms(z))
      .join(', ')}; erstes ${ms(erstes)} ms, Median ${ms(median)} ms`;
    console.info(meldung);
    test.info().annotations.push({ type: 'messung', description: meldung });
    expect(erstes).toBeLessThan(2000);
    expect(median).toBeLessThan(2000);
  });
});

test.describe('Projektdatei im Browser', () => {
  for (const name of ['typisch', 'gross'] as const) {
    test(`${name}: Export aus OPFS, Import in eine zweite Datenbank, Export ist byte-identisch`, async ({
      page,
    }) => {
      const f = ladeFixture(name);
      await start(page);
      await ps(page, 'oeffnen', 'quelle');
      await ps(page, 'anwenden', 'quelle', anlegenSchritte(f));
      await ps(page, 'oeffnen', 'ziel');
      const r = await ps(page, 'exportImportRunde', 'quelle', 'ziel', f.projekt.id);
      console.info(
        `[speicher/opfs] ${name}: Export ${ms(r.exportMs)} ms, Import ${ms(r.importMs)} ms, ${String(r.bytes)} Bytes`,
      );
      expect(r.gleich).toBe(true);
      const lv = await ps(page, 'lvPruefen', 'ziel', f.lv.leistungsverzeichnis.id, f.lv);
      expect(lv.gleich).toBe(true);
    });
  }
});

test.describe('Fehlerwerte statt stillem Verlust (Q5)', () => {
  test('ein zweiter Worker auf derselben OPFS-Datenbank bekommt den Fehlercode gesperrt; nach dem Schließen geht es', async ({
    page,
  }) => {
    await start(page);
    expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
    const zweiter = await ps(page, 'zweitesMalOeffnen', DB);
    expect(zweiter).toMatchObject({ ok: false, code: 'gesperrt' });
    console.info(`[speicher/opfs] gesperrt: ${zweiter.ok ? '' : zweiter.meldung}`);
    expect(await ps(page, 'anwenden', DB, schritte('winzig').slice(0, 1))).toMatchObject({ ok: true });
    await ps(page, 'schliessen', DB);
    expect(await ps(page, 'zweitesMalOeffnen', DB)).toEqual({ ok: true });
  });

  test('ein ChangeSet, das nicht zum gespeicherten Stand passt, wird mit Fehlerwert abgewiesen; auch nach Neuladen steht nichts davon da', async ({
    page,
  }) => {
    const f = ladeFixture('typisch');
    const folge = anlegenSchritte(f);
    await start(page);
    await ps(page, 'oeffnen', DB);
    await ps(page, 'anwenden', DB, folge);

    const lv = folge[1];
    if (lv === undefined) throw new Error('kein LV-Schritt');
    // Dasselbe LV noch einmal anlegen: Konflikt, kein zweites Protokoll, nichts halb geschrieben.
    const doppelt = eintrag(
      500,
      f.projekt.id,
      { art: 'leistungsverzeichnis', id: f.lv.leistungsverzeichnis.id },
      lv.eintrag.befehl,
    );
    const r = await ps(page, 'anwendenEinzeln', DB, doppelt, lv.changeSet);
    expect(r).toMatchObject({ ok: false, code: 'unbekannt' });
    expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(folge.length);

    await ps(page, 'schliessen', DB);
    await page.reload();
    await ps(page, 'oeffnen', DB);
    const geladen: { gleich: boolean } = await ps(page, 'lvPruefen', DB, f.lv.leistungsverzeichnis.id, f.lv);
    expect(geladen.gleich).toBe(true);
    expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(folge.length);
  });
});

test.describe('Dauerhafter Speicher (Spec §9)', () => {
  test('navigator.storage.persist() wird angefragt, der Zustand ist abrufbar', async ({ page }) => {
    await start(page);
    await ps(page, 'oeffnen', DB);
    const status = await ps(page, 'persistenz', DB);
    console.info(`[speicher/opfs] persistenzstatus: ${JSON.stringify(status)}`);
    expect(status.angefragt).toBe(true);
    expect(typeof status.persistent).toBe('boolean'); // ob der Browser gewährt, ist Sache des Browsers
  });
});
