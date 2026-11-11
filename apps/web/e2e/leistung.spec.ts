// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistung der App-Schicht (Ticket 39, Punkt 5; Q4): Ein LV mit 5.000 Positionen (Fixture `gross`, über den Testpfad
// als `LeistungsverzeichnisAnlegen` durch Kern und Speicher geladen). Gemessen wird eine Mengenänderung im Grid von der
// Enter-Taste bis zur aktualisierten Summenzeile: Kern, Speicher im Worker (OPFS), Zustand, Ansicht, Zeichnen. Der
// Anteil des Speichers (`anwenden`) wird getrennt ausgewiesen.

import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fixtureInhalt } from './fixture-inhalt';
import { betragDe, projektAnlegen, summen } from './hilfen';

const BUDGET_MS = 100;
const GROBE_SCHRANKE_MS = 400;
const AUFWAERMEN = 2;
const MESSUNGEN = 9;

const median = (werte: readonly number[]): number =>
  [...werte].sort((a, b) => a - b)[Math.floor(werte.length / 2)] ?? Infinity;
const liste = (werte: readonly number[]): string => werte.map((z) => z.toFixed(0)).join(', ');

/** Eine Mengenänderung in der fokussierten Zelle: Zeit von Enter bis zur geänderten Netto-Summe. */
async function messe(page: Page, text: string): Promise<{ gesamt: number; speicher: number }> {
  await page.keyboard.type(text);
  await page.evaluate(() => {
    const w = window as unknown as { messung?: Promise<number> };
    w.messung = new Promise<number>((fertig) => {
      const summenzeile = document.querySelector('.tx-grid__summen');
      const netto = (): string => summenzeile?.querySelector('.tx-grid__summe-wert')?.textContent ?? '';
      const alt = netto();
      let t0 = 0;
      document.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Enter') t0 = performance.now();
        },
        { capture: true, once: true },
      );
      const beobachter = new MutationObserver(() => {
        if (netto() === alt) return;
        beobachter.disconnect();
        fertig(performance.now() - t0);
      });
      if (summenzeile)
        beobachter.observe(summenzeile, { subtree: true, childList: true, characterData: true });
    });
  });
  await page.keyboard.press('Enter');
  return page.evaluate(async () => ({
    gesamt: await (window as unknown as { messung: Promise<number> }).messung,
    speicher: window.tethysTest?.anwendenMs.at(-1) ?? Number.NaN,
  }));
}

test('Mengenänderung bei 5.000 Positionen: App-Schicht bis zur Summenzeile unter 100 ms', async ({
  page,
}) => {
  test.setTimeout(120_000);
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

  // Eine normale Position im sichtbaren Bereich; jede Messung tippt eine neue Menge und übernimmt mit Enter.
  const zeile = page.locator('[role="row"].tx-grid__zeile--position').filter({ hasText: 'Normal' }).first();
  const menge = zeile.locator('[data-spalte="menge"]');
  const gesamt: number[] = [];
  const speicher: number[] = [];
  for (let i = 0; i < AUFWAERMEN + MESSUNGEN; i++) {
    await menge.focus();
    const m = await messe(page, String(i + 2));
    if (i < AUFWAERMEN) continue;
    gesamt.push(m.gesamt);
    speicher.push(m.speicher);
  }
  const ohneSpeicher = gesamt.map((g, i) => g - (speicher[i] ?? 0));
  const meldung =
    `Mengenänderung → Summenzeile, ${String(MESSUNGEN)} Messungen nach ${String(AUFWAERMEN)} zum Aufwärmen (ms): ` +
    `${liste(gesamt)}; Median ${median(gesamt).toFixed(0)}, davon speicher.anwenden Median ${median(speicher).toFixed(0)}, ` +
    `App ohne Speicher Median ${median(ohneSpeicher).toFixed(0)}`;
  console.info(`[web] ${meldung}`);
  test.info().annotations.push({ type: 'Messwert', description: meldung });
  // Hart geprüft wird die App-Schicht (Ticket 39: „hier zählt die App-Schicht“): Kern, Zustand, Ansicht, Zeichnen.
  // Der Speicher im Worker ist in Ticket 10/31 gemessen und schwankt mit der Last der Maschine (Median 47 ms allein,
  // unter Last über 100 ms); die Gesamtzeit hat deshalb nur eine grobe Schranke gegen Rückschritte wie ein blockierendes
  // Neuzeichnen. Messwerte: Ticket 39, Comments.
  expect(median(ohneSpeicher)).toBeLessThan(BUDGET_MS);
  expect(median(gesamt)).toBeLessThan(GROBE_SCHRANKE_MS);
});
