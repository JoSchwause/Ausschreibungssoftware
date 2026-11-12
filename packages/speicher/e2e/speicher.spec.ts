// SPDX-License-Identifier: AGPL-3.0-or-later
// Browser-Tests des Speichers: echter Worker, SQLite-WASM im OPFS (VFS opfs-sahpool), ohne COOP/COEP-Header.
// Jeder Test bekommt von Playwright einen frischen Browser-Kontext und damit ein leeres OPFS.

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, devices, expect, test, type Page } from '@playwright/test';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import type { Aufmass, Menge, Position, Projektdatei } from '@tethys/vertrag';
import type { Phasenmessung, Pruefstand, PruefSchritt } from '../harness/main';
import { kanonischesJson } from '../src/kanonisch';
import { anlegenSchritte, eintrag, ladeFixture } from '../src/testhilfe/fixtures';
import { inhaltMitAllenAltenArten, mitKernSummen } from '../src/testhilfe/inhalt-v1';
import { SCHEMA_VERSION } from '../src/migrationen';
import { normalisiere } from '../src/testhilfe/normalisiere';
import { feldAendern, standAnlegen } from '../src/testhilfe/umkehrung';
import { LEERES_SUMMENVORHER } from '../src/summenvorher';

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

test.describe('Neuladen während des Schließens (Ticket 52)', () => {
  // Wie die App bei `pagehide`: `schliessen` anstoßen, nicht abwarten, sofort neu laden. Der alte Worker schließt
  // (im WAL mit Checkpoint) und gibt die Dateien frei, während der neue sie schon öffnen will und `gesperrt` bekommt.
  // Vor `preserveOnInitFailure` löschte der gescheiterte Versuch das Verzeichnis des Pools; gab der alte Worker die
  // Dateien in diesem Moment frei, war das ganze Projekt weg. Das hängt am Zeitpunkt und an der Last: Unter hoher Last
  // fiel ein Lauf von drei, auf ruhiger Maschine keiner von acht. Der Test ist eine Wache, kein sicherer Nachweis.
  test('25 Runden schreiben, Schließen anstoßen, neu laden: jeder Befehl ist noch da', async ({ page }) => {
    test.setTimeout(240_000);
    const f = ladeFixture('typisch');
    const folge = anlegenSchritte(f);
    const lvId = f.lv.leistungsverzeichnis.id;
    const positionen = f.lv.leistungsverzeichnis.knoten
      .filter((k): k is Position => k.art === 'position')
      .slice(0, 30);
    await start(page);
    await ps(page, 'oeffnen', DB);
    expect((await ps(page, 'anwenden', DB, folge)).ok).toBe(true);
    let erwartet = folge.length;
    const menge = (runde: number): Menge => `${String(runde)}.000` as Menge;
    for (let runde = 1; runde <= 25; runde++) {
      // 30 Einzeländerungen, damit das WAL beim Schließen etwas zu übertragen hat.
      const schritte = positionen.map((p, j): PruefSchritt => ({
        eintrag: eintrag(
          10_000 + runde * 100 + j,
          f.projekt.id,
          { art: 'leistungsverzeichnis', id: lvId },
          {
            art: 'MengeAendern',
            positionId: p.id,
            menge: menge(runde),
          },
        ),
        changeSet: {
          art: 'leistungsverzeichnis',
          leistungsverzeichnisId: lvId,
          kopf: null,
          knoten: {
            hinzugefuegt: [],
            geaendert: [
              {
                vorher: runde === 1 ? p : { ...p, menge: menge(runde - 1) },
                nachher: { ...p, menge: menge(runde) },
              },
            ],
            entfernt: [],
          },
          summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
        },
      }));
      expect(await ps(page, 'anwenden', DB, schritte)).toMatchObject({ ok: true });
      erwartet += schritte.length;
      await page.evaluate((name) => {
        void (window as unknown as { pruefstand: Pruefstand }).pruefstand.schliessen(name);
      }, DB);
      await page.reload();
      await expect(page.locator('#status')).toBeVisible();
      // Wie die App (E-14): bei `gesperrt` erneut versuchen, jedes Mal mit einem neuen Worker; in kurzem Abstand, damit
      // ein Versuch in die Freigabe durch den alten Worker fällt.
      let offen = await ps(page, 'oeffnen', DB);
      for (let versuch = 0; !offen.ok && versuch < 200; versuch++) {
        expect(offen).toMatchObject({ code: 'gesperrt' });
        await page.waitForTimeout(20);
        offen = await ps(page, 'oeffnen', DB);
      }
      expect(offen).toEqual({ ok: true });
      expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(erwartet);
    }
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

    // LV-Übersicht (Ticket 57): eine Abfrage ohne Knoten, über den Worker, Median unter 20 ms.
    const liste = [...(await ps(page, 'lvListezeit', DB, f.projekt.id, 9))].sort((a, b) => a - b);
    const listeMedian = liste[Math.floor(liste.length / 2)] ?? Number.NaN;
    const listeMeldung = `[speicher/opfs] gross: LV-Übersicht (9 Läufe) Median ${ms(listeMedian)} ms, max ${ms(liste.at(-1) ?? Number.NaN)} ms`;
    console.info(listeMeldung);
    test.info().annotations.push({ type: 'messung', description: listeMeldung });
    expect(listeMedian).toBeLessThan(20);
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
          summen: { positionen: [], gliederungen: [], gesamt: null, vorher: LEERES_SUMMENVORHER },
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

/** Phasen eines `anwenden` aus der Messung des Mess-Workers (Ticket 52). */
function phasen(m: Phasenmessung): Record<string, number> {
  const p = { transaktion: 0, baumpruefung: 0, vorherstand: 0, schreiben: 0, js: 0, antwort: 0 };
  let sql = 0;
  for (const [anweisung, t] of Object.entries(m.sql)) {
    sql += t;
    if (anweisung.startsWith('BEGIN') || anweisung.startsWith('COMMIT')) p.transaktion += t;
    else if (/^SELECT (k\.id|k\.eltern_id|eltern_id) FROM knoten/.test(anweisung)) p.baumpruefung += t;
    else if (anweisung.startsWith('SELECT')) p.vorherstand += t;
    else p.schreiben += t;
  }
  p.js = m.workerMs - sql;
  p.antwort = m.gesamtMs - m.workerMs;
  return { gesamt: m.gesamtMs, worker: m.workerMs, ...p };
}

const medianVon = (werte: readonly number[]): number =>
  [...werte].sort((a, b) => a - b)[Math.floor(werte.length / 2)] ?? Number.NaN;

/**
 * Misst `MengeAendern` auf `gross` mit den ChangeSets des Kerns in Phasen (Ticket 52) und gibt die Mediane aus.
 * `wo` nennt den Browser-Kontext in der Meldung.
 */
async function phasenMessen(page: Page, wo: string): Promise<Record<string, number>> {
  const f = ladeFixture('gross');
  await start(page);
  await ps(page, 'oeffnenMessend', DB);
  // Schreibmodus (D-52.1): WAL mit exklusiver Sperre, Haltbarkeit unverändert (synchronous = FULL).
  expect(await ps(page, 'schreibmodus', DB)).toEqual({
    journalMode: 'wal',
    lockingMode: 'exclusive',
    synchronous: 2,
    journalSizeLimit: 4 * 1024 * 1024,
  });
  await ps(page, 'anwenden', DB, anlegenSchritte(f));

  // Wie in der App: Der Kern bildet das ChangeSet (ein geänderter Knoten, Summen der Position, ihrer Gliederungen
  // und des LV) auf dem Stand nach der vorigen Änderung (dessen alte Summen prüft `speicher`, Ticket 57). Jede Änderung
  // trifft eine andere Position.
  const lvId = f.lv.leistungsverzeichnis.id;
  const positionen = f.lv.leistungsverzeichnis.knoten.filter((k): k is Position => k.art === 'position');
  const AUFWAERMEN = 5;
  const MESSUNGEN = 21;
  let stand = f.lv;
  const folge: PruefSchritt[] = Array.from({ length: AUFWAERMEN + MESSUNGEN }, (_, i) => {
    const p = positionen[i * 190];
    if (p === undefined) throw new Error('Position fehlt');
    const befehl = { art: 'MengeAendern', positionId: p.id, menge: '7.000' as Menge } as const;
    const cs = lvBefehlAusfuehren(stand, befehl);
    if (!cs.ok) throw new Error(cs.fehler.meldung);
    stand = lvChangeSetAnwenden(stand, cs.wert) ?? stand;
    return {
      eintrag: eintrag(2000 + i, f.projekt.id, { art: 'leistungsverzeichnis', id: lvId }, befehl),
      changeSet: cs.wert,
    };
  });
  const r = await ps(page, 'anwendenPhasen', DB, folge);
  expect(r.ok).toBe(true);
  const gemessen = r.messungen.slice(AUFWAERMEN).map(phasen);
  const median: Record<string, number> = {};
  for (const k of Object.keys(gemessen[0] ?? {})) median[k] = medianVon(gemessen.map((g) => g[k] ?? 0));
  const meldung =
    `[speicher/opfs] gross, ${wo}: MengeAendern anwenden in Phasen (${String(MESSUNGEN)} Läufe, Median ms): ` +
    Object.entries(median)
      .map(([k, v]) => `${k} ${v.toFixed(1)}`)
      .join(', ');
  console.info(meldung);
  test.info().annotations.push({ type: 'messung', description: meldung });
  // Je Anweisung (Median ms), die teuersten zuerst: zeigt, wo in einer Phase die Zeit steht.
  const anweisungen = Object.keys(r.messungen[0]?.sql ?? {})
    .map((a): [string, number] => [a, medianVon(r.messungen.slice(AUFWAERMEN).map((m) => m.sql[a] ?? 0))])
    .sort((a, b) => b[1] - a[1]);
  console.info(anweisungen.map(([a, t]) => `  ${t.toFixed(1).padStart(6)}  ${a}`).join('\n'));
  // Dateizugriffe im OPFS je Aufruf (Median Anzahl und ms je Methode des Zugriffshandles).
  const gemesseneLaeufe = r.messungen.slice(AUFWAERMEN);
  const opfs = [...new Set(gemesseneLaeufe.flatMap((m) => Object.keys(m.opfs)))].map((k) => {
    const anzahl = medianVon(gemesseneLaeufe.map((m) => m.opfs[k]?.anzahl ?? 0));
    const zeit = medianVon(gemesseneLaeufe.map((m) => m.opfs[k]?.ms ?? 0));
    return `${k} ${String(anzahl)}× ${zeit.toFixed(1)} ms`;
  });
  console.info(`[speicher/opfs] Zugriffshandle je anwenden (Median): ${opfs.join(', ')}`);
  expect(await ps(page, 'protokollAnzahl', DB, f.projekt.id)).toBe(
    anlegenSchritte(f).length + AUFWAERMEN + MESSUNGEN,
  );
  return median;
}

test.describe('Einzeländerung in Phasen (Ticket 52)', () => {
  test('MengeAendern auf gross (5.000 Positionen) mit den ChangeSets des Kerns: Phasen von anwenden im OPFS', async ({
    page,
  }) => {
    await phasenMessen(page, 'Testkontext');
  });

  // Playwright gibt jedem Test einen flüchtigen Kontext wie ein Inkognito-Fenster; dort liegt das OPFS im Speicher des
  // Browser-Prozesses, und jeder Zugriff des Zugriffshandles ist ein eigener Aufruf über Prozessgrenzen. Ein echtes
  // Profil (installierte App, normales Fenster) schreibt direkt in die Datei. Zum Vergleich dieselbe Messung dort.
  test('dieselbe Messung in einem dauerhaften Browser-Profil (wie beim Nutzer)', async ({
    browserName,
  }, info) => {
    const verzeichnis = mkdtempSync(join(tmpdir(), 'tethys-profil-'));
    const executablePath = process.env['PW_CHROMIUM_PATH'] || undefined;
    const kontext = await chromium.launchPersistentContext(verzeichnis, {
      ...devices['Desktop Chrome'],
      baseURL: String(info.project.use.baseURL),
      ...(executablePath ? { executablePath } : {}),
    });
    try {
      expect(browserName).toBe('chromium');
      await phasenMessen(kontext.pages()[0] ?? (await kontext.newPage()), 'dauerhaftes Profil');
    } finally {
      await kontext.close();
      rmSync(verzeichnis, { recursive: true, force: true });
    }
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

test.describe('Vertrag v1.4 im OPFS (Ticket 79)', () => {
  test('Projektdatei der Version 5 importieren, Aufmaßblatt ändern, neu laden: Stand und Regeln bleiben', async ({
    page,
  }) => {
    const v5 = readFileSync(new URL('../fixtures/projektdatei-v5.json', import.meta.url), 'utf8');
    const d = JSON.parse(v5) as Projektdatei;
    const blatt = d.aufmasse?.[1]?.aufmass as Aufmass; // Blatt 2, in der Schlussrechnung
    const projekt = d.projekt.id;
    const aufBlatt = { art: 'aufmass', id: blatt.id } as const;
    const geaendert: Aufmass = { ...blatt, bezeichnung: 'Blatt 2, Erdarbeiten (erfunden)' };
    await start(page);
    await ps(page, 'oeffnen', DB);
    expect(await ps(page, 'importieren', DB, v5)).toEqual({ ok: true });
    // Seit Version 6 exportiert der Speicher in der aktuellen Version; ohne das Neue ist die Datei sonst gleich (Ticket 106).
    const v5Aktuell = v5.replace('"schemaVersion": 5', `"schemaVersion": ${String(SCHEMA_VERSION)}`);
    expect((await ps(page, 'exportieren', DB, projekt)).text === v5Aktuell).toBe(true);
    // Ein Blatt in einer Rechnung lässt sich nicht löschen (Q5), ändern schon.
    const loeschen = await ps(
      page,
      'anwendenEinzeln',
      DB,
      eintrag(900, projekt, aufBlatt, { art: 'AufmassLoeschen' }),
      { art: 'aufmass', aufmassId: blatt.id, aufmass: { vorher: blatt, nachher: null } },
    );
    expect(loeschen).toMatchObject({ ok: false, code: 'konflikt' });
    expect(
      await ps(
        page,
        'anwendenEinzeln',
        DB,
        eintrag(901, projekt, aufBlatt, {
          art: 'AufmasskopfSetzen',
          bezeichnung: geaendert.bezeichnung,
          datum: null,
        }),
        { art: 'aufmass', aufmassId: blatt.id, aufmass: { vorher: blatt, nachher: geaendert } },
      ),
    ).toEqual({ ok: true });
    await ps(page, 'schliessen', DB);

    await page.reload();
    await expect(page.locator('#status')).toBeVisible();
    expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
    const nachher = await ps(page, 'exportieren', DB, projekt);
    if (nachher.text === undefined) throw new Error(`Export fehlgeschlagen: ${JSON.stringify(nachher)}`);
    const e = JSON.parse(nachher.text) as Projektdatei;
    expect(e.aufmasse?.map((z) => z.aufmass)).toEqual([d.aufmasse?.[0]?.aufmass, geaendert]);
    expect(e.rechnungen).toEqual(d.rechnungen);
    expect(e.kostenermittlungen).toEqual(d.kostenermittlungen);
    expect(e.protokoll.map((x) => x.befehl.art).slice(-2)).toEqual([
      'KostenermittlungseintragSetzen',
      'AufmasskopfSetzen',
    ]);
  });
});

test.describe('Vertrag v1.6 im OPFS (Ticket 106)', () => {
  test('Projektdatei der Version 6 importieren, Bytes ablegen, Modell löschen, neu laden: Bytes werden erst beim Öffnen frei', async ({
    page,
  }) => {
    const v6 = readFileSync(new URL('../fixtures/projektdatei-v6.json', import.meta.url), 'utf8');
    const d = JSON.parse(v6) as Projektdatei;
    const projekt = d.projekt.id;
    const [m1, m2] = (d.bauwerksmodelle ?? []).map((z) => z.bauwerksmodell);
    if (m1 === undefined || m2 === undefined) throw new Error('Modelle fehlen');
    const extraText = "ISO-10303-21;\nHEADER;\nFILE_NAME('e2e (erfunden)');\nENDSEC;\nEND-ISO-10303-21;\n";
    const extra = createHash('sha256').update(extraText).digest('hex');

    await start(page);
    await ps(page, 'oeffnen', DB);
    expect(await ps(page, 'importieren', DB, v6)).toEqual({ ok: true });
    // Die Bytes liegen als BLOB im OPFS, so wie die Datei sie bringt: der Export ist byte-gleich.
    expect((await ps(page, 'exportieren', DB, projekt)).text === v6).toBe(true);
    expect(await ps(page, 'modelldateiAblegen', DB, extraText)).toEqual({ ok: true, hash: extra });
    const { struktur, bauteile, ...kopf } = m2;
    const loeschen = await ps(
      page,
      'anwendenEinzeln',
      DB,
      eintrag(900, projekt, { art: 'bauwerksmodell', id: m2.id }, { art: 'BauwerksmodellLoeschen' }),
      {
        art: 'bauwerksmodell',
        bauwerksmodellId: m2.id,
        kopf: { vorher: kopf, nachher: null },
        inhalt: { vorher: { struktur, bauteile }, nachher: null },
      },
    );
    expect(loeschen).toEqual({ ok: true });
    // In derselben Sitzung bleiben die Bytes (ein Undo fände sie noch, D-97.5).
    expect(await ps(page, 'modelldateiPruefen', DB, m2.datei.hash)).toEqual({
      vorhanden: true,
      sha: m2.datei.hash,
    });
    await ps(page, 'schliessen', DB);

    await page.reload();
    await expect(page.locator('#status')).toBeVisible();
    expect(await ps(page, 'oeffnen', DB)).toEqual({ ok: true });
    expect(await ps(page, 'bauwerksmodelle', DB, projekt)).toEqual([
      { id: m1.id, anzahlBauteile: m1.bauteile.length },
    ]);
    expect(await ps(page, 'modelldateiPruefen', DB, m1.datei.hash)).toEqual({
      vorhanden: true,
      sha: m1.datei.hash,
    });
    expect(await ps(page, 'modelldateiPruefen', DB, m2.datei.hash)).toEqual({ vorhanden: false, sha: null });
    expect(await ps(page, 'modelldateiPruefen', DB, extra)).toEqual({ vorhanden: false, sha: null });
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
