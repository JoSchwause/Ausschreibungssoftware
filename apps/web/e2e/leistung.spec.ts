// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistung der App-Schicht (Ticket 39, Punkt 5; Q4): Ein LV mit 5.000 Positionen (Fixture `gross`, über den Testpfad
// als `LeistungsverzeichnisAnlegen` durch Kern und Speicher geladen). Gemessen wird eine Mengenänderung im Grid von der
// Enter-Taste bis zur aktualisierten Summenzeile: Kern, Speicher im Worker (OPFS), Zustand, Ansicht, Zeichnen. Der
// Anteil des Speichers (`anwenden`) wird getrennt ausgewiesen. Seit Ticket 47 läuft die formale LV-Prüfung nach jedem
// Befehl im Leerlauf mit (nie im Tastendruck); die Messung schließt sie also ein.
//
// Browser-Profil (Ticket 52, D-52.2): Playwright gibt jedem Test einen flüchtigen Kontext wie ein Inkognito-Fenster.
// Dort liegt das OPFS im Speicher des Browser-Prozesses, und jeder Schreibzugriff des Speichers ist ein eigener Aufruf
// über Prozessgrenzen (unter Last 1–2 ms je Zugriff, rund 20 je Einzeländerung). Beim Nutzer (installierte App oder
// normales Fenster) liegt das OPFS in einem dauerhaften Profil und wird direkt beschrieben. Hart geprüft wird deshalb
// die Gesamtzeit im dauerhaften Profil; der flüchtige Kontext wird gemessen und grob begrenzt.

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect, test, type Page, type TestInfo } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen, summen } from './hilfen';

const BUDGET_MS = 100;
/** Schranke gegen Ausreißer (jede einzelne Messung) und für die Gesamtzeit im flüchtigen Kontext. */
const GROBE_SCHRANKE_MS = 400;
const AUFWAERMEN = 2;
const MESSUNGEN = 9;

const median = (werte: readonly number[]): number =>
  [...werte].sort((a, b) => a - b)[Math.floor(werte.length / 2)] ?? Infinity;
const liste = (werte: readonly number[]): string => werte.map((z) => z.toFixed(0)).join(', ');

/** Eine Mengenänderung in der fokussierten Zelle: Zeit von Enter bis zur geänderten Netto-Summe. */
async function messe(page: Page, text: string): Promise<{ gesamt: number; speicher: number }> {
  await page.keyboard.type(text);
  return messeTaste(page, 'Enter', 'Enter');
}

/** Zeit vom Drücken von `taste` (Ereignis `key`) bis zur geänderten Netto-Summe, dazu der Anteil von `anwenden`. */
async function messeTaste(
  page: Page,
  taste: string,
  key: string,
): Promise<{ gesamt: number; speicher: number }> {
  await page.evaluate((k) => {
    const w = window as unknown as { messung?: Promise<number> };
    w.messung = new Promise<number>((fertig) => {
      const summenzeile = document.querySelector('.tx-grid__summen');
      const netto = (): string => summenzeile?.querySelector('.tx-grid__summe-wert')?.textContent ?? '';
      const alt = netto();
      let t0 = 0;
      // Nicht `once`: Bei Strg+Z kommt zuerst das Ereignis der Strg-Taste.
      const start = (e: KeyboardEvent): void => {
        if (e.key.toLowerCase() !== k.toLowerCase()) return;
        t0 = performance.now();
        document.removeEventListener('keydown', start, { capture: true });
      };
      document.addEventListener('keydown', start, { capture: true });
      const beobachter = new MutationObserver(() => {
        if (netto() === alt) return;
        beobachter.disconnect();
        fertig(performance.now() - t0);
      });
      if (summenzeile)
        beobachter.observe(summenzeile, { subtree: true, childList: true, characterData: true });
    });
  }, key);
  await page.keyboard.press(taste);
  return page.evaluate(async () => ({
    gesamt: await (window as unknown as { messung: Promise<number> }).messung,
    speicher: window.tethysTest?.anwendenMs.at(-1) ?? Number.NaN,
  }));
}

/**
 * Führt `f` in einem dauerhaften Browser-Profil aus (neues, leeres Verzeichnis je Test), mit denselben Einstellungen wie
 * die übrigen Tests (Basis-URL, Fenstergröße, Chromium-Pfad).
 */
async function imDauerhaftenProfil(info: TestInfo, f: (page: Page) => Promise<void>): Promise<void> {
  const verzeichnis = mkdtempSync(join(tmpdir(), 'tethys-profil-'));
  const use = info.project.use;
  const kontext = await chromium.launchPersistentContext(verzeichnis, {
    ...(use.baseURL !== undefined ? { baseURL: use.baseURL } : {}),
    ...(use.viewport ? { viewport: use.viewport } : {}),
    ...(use.launchOptions?.executablePath !== undefined
      ? { executablePath: use.launchOptions.executablePath }
      : {}),
  });
  try {
    await f(kontext.pages()[0] ?? (await kontext.newPage()));
  } finally {
    await kontext.close();
    rmSync(verzeichnis, { recursive: true, force: true });
  }
}

/** Legt das Projekt mit `gross` über den Testpfad an und öffnet das LV; wartet auf die erste Prüfung. */
async function grossOeffnen(page: Page): Promise<void> {
  const inhalt = fixtureInhalt('gross');
  const fx = JSON.parse(readFileSync(new URL('../../../fixtures/gross.json', import.meta.url), 'utf8')) as {
    sollwerte: { summen: { netto: string } };
  };
  expect(inhalt.knoten.filter((k) => k.art === 'position')).toHaveLength(5000);

  await projektAnlegen(page, 'Großprojekt', 'Bund');
  const projektId = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1) ?? '');
  const r = await page.evaluate(([id, lv]) => window.tethysTest?.lvAnlegen(id as never, lv as never), [
    projektId,
    inhalt,
  ] as const);
  expect(r?.ok).toBe(true);
  await page.goto(`/lv/${inhalt.wurzelId}`);
  await expect(page.getByRole('heading', { level: 1, name: inhalt.name })).toBeVisible({ timeout: 30_000 });
  // Die Summen kommen aus dem Kern und stimmen mit den Sollwerten der Fixture.
  await expect.poll(async () => (await summen(page))['Netto']).toBe(betragDe(fx.sollwerte.summen.netto));
  // Die formale LV-Prüfung (Ticket 47) läuft nach jedem Befehl im Leerlauf mit; gemessen wird also mit ihr.
  await expect(page.locator('.lv-pruefung__zahl')).not.toHaveText('…', { timeout: 30_000 });
}

interface Messreihe {
  readonly gesamt: readonly number[];
  readonly speicher: readonly number[];
  readonly ohneSpeicher: readonly number[];
}

/**
 * Misst `MESSUNGEN` Mengenänderungen (nach `AUFWAERMEN`) an einer normalen Position im sichtbaren Bereich, bei `undo`
 * jeweils das Strg+Z nach der Änderung.
 */
async function messreihe(page: Page, undo: boolean): Promise<Messreihe> {
  const zeile = page.locator('[role="row"].tx-grid__zeile--position').filter({ hasText: 'Normal' }).first();
  const menge = zeile.locator('[data-spalte="menge"]');
  const gesamt: number[] = [];
  const speicher: number[] = [];
  for (let i = 0; i < AUFWAERMEN + MESSUNGEN; i++) {
    await menge.focus();
    let m = await messe(page, String(i + 2));
    if (undo) {
      await menge.focus();
      m = await messeTaste(page, 'Control+Z', 'z');
    }
    if (i < AUFWAERMEN) continue;
    gesamt.push(m.gesamt);
    speicher.push(m.speicher);
  }
  // Die Prüfung ist nach den Messungen nachgelaufen (Zahl im Kopf des Panels steht wieder).
  await expect(page.locator('.lv-pruefung__zahl')).toHaveAttribute('data-anzahl', /\d+/);
  return { gesamt, speicher, ohneSpeicher: gesamt.map((g, i) => g - (speicher[i] ?? 0)) };
}

function melde(was: string, wo: string, m: Messreihe): void {
  const meldung =
    `${was} → Summenzeile (${wo}), ${String(MESSUNGEN)} Messungen nach ${String(AUFWAERMEN)} zum Aufwärmen (ms): ` +
    `${liste(m.gesamt)}; Median ${median(m.gesamt).toFixed(0)}, davon speicher.anwenden Median ` +
    `${median(m.speicher).toFixed(0)}, App ohne Speicher Median ${median(m.ohneSpeicher).toFixed(0)}`;
  console.info(`[web] ${meldung}`);
  test.info().annotations.push({ type: 'Messwert', description: meldung });
}

/** Q4 hart (Ticket 52): Gesamtzeit Median < 100 ms, keine einzelne Messung über der groben Schranke. */
function pruefeHart(m: Messreihe): void {
  expect(median(m.gesamt)).toBeLessThan(BUDGET_MS);
  expect(median(m.ohneSpeicher)).toBeLessThan(BUDGET_MS);
  expect(Math.max(...m.gesamt)).toBeLessThan(GROBE_SCHRANKE_MS);
}

test('Mengenänderung bei 5.000 Positionen: Enter bis zur Summenzeile unter 100 ms (dauerhaftes Profil)', async ({
  browserName,
}, info) => {
  test.setTimeout(120_000);
  expect(browserName).toBe('chromium'); // das dauerhafte Profil startet Chromium selbst
  await imDauerhaftenProfil(info, async (page) => {
    await grossOeffnen(page);
    const m = await messreihe(page, false);
    melde('Mengenänderung', 'dauerhaftes Profil', m);
    pruefeHart(m);
  });
});

test('Undo eines Befehls bei 5.000 Positionen: bis zur Summenzeile unter 100 ms (dauerhaftes Profil)', async ({
  browserName,
}, info) => {
  test.setTimeout(120_000);
  expect(browserName).toBe('chromium'); // das dauerhafte Profil startet Chromium selbst
  await imDauerhaftenProfil(info, async (page) => {
    await grossOeffnen(page);
    const m = await messreihe(page, true);
    melde('Undo einer Mengenänderung', 'dauerhaftes Profil', m);
    pruefeHart(m);
  });
});

test('Mengenänderung bei 5.000 Positionen im flüchtigen Testkontext: App-Schicht unter 100 ms, gesamt grob', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await grossOeffnen(page);
  const m = await messreihe(page, false);
  melde('Mengenänderung', 'flüchtiger Kontext', m);
  // Hier hängt der Speicheranteil an den Aufrufen über Prozessgrenzen (siehe oben): hart nur die App-Schicht.
  expect(median(m.ohneSpeicher)).toBeLessThan(BUDGET_MS);
  expect(median(m.gesamt)).toBeLessThan(GROBE_SCHRANKE_MS);
});
