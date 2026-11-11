// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser-Tests des Speichers: echter Worker, SQLite-WASM im OPFS (VFS opfs-sahpool), ohne COOP/COEP-Header.
// Jeder Test bekommt von Playwright einen frischen Browser-Kontext und damit ein leeres OPFS.

import { expect, test, type Page } from '@playwright/test';
import type { Menge, Position } from '@tethys/vertrag';
import type { Pruefstand, PruefSchritt } from '../harness/main';
import { kanonischesJson } from '../src/kanonisch';
import { anlegenSchritte, eintrag, ladeFixture } from '../src/testhilfe/fixtures';
import { inhaltMitAllenAltenArten, mitKernSummen } from '../src/testhilfe/inhalt-v1';
import { SCHEMA_VERSION } from '../src/migrationen';
import { normalisiere } from '../src/testhilfe/normalisiere';
import { feldAendern, standAnlegen } from '../src/testhilfe/umkehrung';
import { LEERES_SUMMENVORHER } from '../src/vertrag-v13'; // v1.3: mechanisch angepasst, Folgeticket

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

test.describe('Speichern bei jedem Befehl (G-35)', () => {
  test('Einzelbefehl auf gross (5.000 Positionen): Zeit je anwenden im OPFS', async ({ page }) => {
    const f = ladeFixture('gross');
    await start(page);
    await ps(page, 'oeffnen', DB);
    await ps(page, 'anwenden', DB, anlegenSchritte(f));

    // 20 Mengenänderungen an verschiedenen Positionen, je ein ChangeSet mit genau einem geänderten Knoten.
    const positionen = f.lv.leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position');
    const schritteEinzeln: PruefSchritt[] = Array.from({ length: 20 }, (_, i) => {
      const vorher = positionen[i * 250];
      if (vorher === undefined) throw new Error('Position fehlt');
      const menge = '999.000' as Menge;
      const lvId = f.lv.leistungsverzeichnis.id;
      return {
        eintrag: eintrag(
          1000 + i,
          f.projekt.id,
          { art: 'leistungsverzeichnis', id: lvId },
          { art: 'MengeAendern', positionId: vorher.id, menge },
        ),
        changeSet: {
          art: 'leistungsverzeichnis',
          leistungsverzeichnisId: lvId,
          kopf: null,
          knoten: { hinzugefuegt: [], geaendert: [{ vorher, nachher: { ...vorher, menge } }], entfernt: [] },
          summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER }, // v1.3: mechanisch angepasst, Folgeticket (Summenaenderung.vorher Pflicht)
        },
      };
    });
    const r = await ps(page, 'anwendenGemessen', DB, schritteEinzeln);
    expect(r.ok).toBe(true);
    const sortiert = [...r.zeiten].sort((a, b) => a - b);
    const median = sortiert[Math.floor(sortiert.length / 2)] ?? Number.NaN;
    const maximum = sortiert[sortiert.length - 1] ?? Number.NaN;
    const meldung = `[speicher/opfs] gross: Einzelbefehl anwenden (20 Läufe): Median ${ms(median)} ms, Maximum ${ms(maximum)} ms`;
    console.info(meldung);
    test.info().annotations.push({ type: 'messung', description: meldung });
    expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(anlegenSchritte(f).length + 20);
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
    expect(r).toMatchObject({ ok: false, code: 'konflikt' });
    expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(folge.length);

    await ps(page, 'schliessen', DB);
    await page.reload();
    await ps(page, 'oeffnen', DB);
    const geladen: { gleich: boolean } = await ps(page, 'lvPruefen', DB, f.lv.leistungsverzeichnis.id, f.lv);
    expect(geladen.gleich).toBe(true);
    expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(folge.length);
  });
});

test.describe('Migration im OPFS (A8, Ticket 38)', () => {
  test('eine Datenbank der Version 1 wird beim Öffnen auf die aktuelle Version migriert; Export und erneutes Öffnen liefern dieselben Daten', async ({
    page,
  }) => {
    const inhalt = inhaltMitAllenAltenArten(2);
    // Nach Migration 2 stehen die Summen so, wie der Kern sie vollständig rechnet (D-17); die Daten bleiben.
    const soll = mitKernSummen(inhalt);
    const lv = soll.leistungsverzeichnisse[0];
    if (lv === undefined) throw new Error('kein LV');
    await start(page);
    expect(await ps(page, 'schema1Anlegen', DB, inhalt)).toEqual({ ok: true, version: 1 });

    expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true }); // migriert auf die aktuelle Version
    expect((await ps(page, 'lvPruefen', DB, lv.leistungsverzeichnis.id, lv)).gleich).toBe(true);
    for (const a of soll.angebote) expect(await ps(page, 'angebotPruefen', DB, a.angebot.id, a)).toBe(true);
    const erster = await ps(page, 'exportieren', DB, inhalt.projekt.id);
    if (erster.text === undefined) throw new Error(`Export fehlgeschlagen: ${JSON.stringify(erster)}`);
    expect((JSON.parse(erster.text) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);

    // Derselbe Inhalt, frisch in Version 2 importiert, ergibt dieselbe Datei: nichts ging bei der Migration verloren.
    await ps(page, 'oeffnen', 'vergleich');
    expect(await ps(page, 'importieren', 'vergleich', kanonischesJson(soll))).toEqual({ ok: true });
    expect((await ps(page, 'exportieren', 'vergleich', inhalt.projekt.id)).text === erster.text).toBe(true);
    await ps(page, 'schliessen', 'vergleich');

    await ps(page, 'schliessen', DB);
    await page.reload();
    await expect(page.locator('#status')).toBeVisible();
    expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
    expect((await ps(page, 'exportieren', DB, inhalt.projekt.id)).text === erster.text).toBe(true);
    expect((await ps(page, 'lvPruefen', DB, lv.leistungsverzeichnis.id, lv)).gleich).toBe(true);
  });
});

test.describe('LV-Stand im OPFS (Ticket 43, ADR 0006)', () => {
  test('Stand anlegen, LV weiter ändern, Seite neu laden, Stand laden: der eingefrorene Stand ist unverändert', async ({
    page,
  }) => {
    const f = ladeFixture('typisch');
    const lvId = f.lv.leistungsverzeichnis.id;
    const amLv = { art: 'leistungsverzeichnis', id: lvId } as const;
    const gespeichert = normalisiere(f.lv); // so liefert der Speicher das LV
    const stand: PruefSchritt = {
      eintrag: eintrag(100, f.projekt.id, amLv, {
        art: 'LvStandAnlegen',
        id: 'stand-1' as never,
        name: 'Versand',
      }),
      changeSet: standAnlegen(gespeichert, 'stand-1', 'Versand'),
    };
    const p = gespeichert.leistungsverzeichnis.knoten.find((k): k is Position => k.art === 'position');
    if (p === undefined) throw new Error('keine Position');
    const danach: PruefSchritt = {
      eintrag: eintrag(101, f.projekt.id, amLv, {
        art: 'MengeAendern',
        positionId: p.id,
        menge: '9.000' as Menge,
      }),
      changeSet: feldAendern(gespeichert, p.id, { ...p, menge: '9.000' as Menge }, '90.00'),
    };
    await start(page);
    await ps(page, 'oeffnen', DB);
    expect(await ps(page, 'anwenden', DB, [...anlegenSchritte(f), stand, danach])).toMatchObject({
      ok: true,
    });
    await ps(page, 'schliessen', DB);

    await page.reload();
    await expect(page.locator('#status')).toBeVisible();
    expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
    expect(await ps(page, 'lvStaende', DB, lvId)).toEqual([
      { id: 'stand-1', leistungsverzeichnisId: lvId, name: 'Versand', angelegt: stand.eintrag.wann },
    ]);
    expect(await ps(page, 'lvStandPruefen', DB, 'stand-1' as never, f.lv)).toEqual({
      ok: true,
      gleich: true,
    });
    // Das LV selbst trägt die spätere Änderung, der Stand nicht.
    expect((await ps(page, 'lvPruefen', DB, lvId, f.lv)).gleich).toBe(false);
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
