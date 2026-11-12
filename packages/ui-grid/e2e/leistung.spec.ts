// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistung des Grids beim Scrollen (Regel Q4, G-33). Gemessen wird die echte Bildzeit: Während das Skript den
// Scrollbereich mit gleichbleibender Geschwindigkeit verschiebt, hält ein requestAnimationFrame-Zähler den Abstand
// aufeinanderfolgender Bilder fest. Kein künstliches Warten, keine Mittelung über Pausen.
//
// Die Messwerte hängen an der Maschine (hier: Headless-Chromium ohne GPU, Software-Rasterung). Sie werden
// ausgegeben und an den Test angehängt. Eine Mindest-Bildrate prüft der Test nur, wenn GRID_MIN_FPS gesetzt ist.

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface Messung {
  zeilen: number;
  pixelProSekunde: number;
  dauerMs: number;
  bilder: number;
  mittlereFps: number;
  schlechtestesBildMs: number;
  p95BildMs: number;
  bilderUeber33Ms: number;
  bilderUeber50Ms: number;
  /** Bilder, in denen sich die letzte gerenderte Zeile gegenüber dem Vorbild geändert hat (das Grid arbeitet wirklich). */
  bilderMitNeuenZeilen: number;
  /** Index der letzten gerenderten Zeile am Ende und der aus der Scrollposition erwartete Wert (Sichtbereich + Überhang). */
  ersteZeileAmEnde: number;
  erwarteteZeileAmEnde: number;
}

async function messeScrollen(page: Page, pixelProSekunde: number, dauerMs: number): Promise<Messung> {
  return page.evaluate(
    ({ geschwindigkeit, dauer }) =>
      new Promise<Messung>((fertig) => {
        const el = document.querySelector<HTMLElement>('[role="treegrid"]');
        if (!el) throw new Error('kein Grid');
        el.scrollTop = 0;
        const zeilen = Number(el.getAttribute('aria-rowcount')) - 1;
        // Am Ende kehrt der Wisch mit gleicher Geschwindigkeit um (hin und her): So misst auch ein kürzeres Grid
        // (1.000 Zeilen, Ticket 96) die ganze Dauer, statt am Ende stillzustehen. Die Grids mit 5.000 und mehr Zeilen
        // erreichen das Ende höchstens in den letzten Bildern; für sie bleibt die Messung, wie sie war.
        const ende = Math.max(0, el.scrollHeight - el.clientHeight);
        const lage = (weg: number): number => {
          if (ende === 0) return 0;
          const p = weg % (2 * ende);
          return p <= ende ? p : 2 * ende - p;
        };
        const abstaende: number[] = [];
        let start = 0;
        let letztes = 0;
        let vorherigeErste = -1;
        let bilderMitNeuenZeilen = 0;
        // Die aktive Zeile steht immer im DOM (Fokus), daher zählt die letzte gerenderte Zeile.
        const ersteZeile = (): number =>
          Number(el.querySelector<HTMLElement>('[role="row"][data-i]:last-child')?.dataset['i'] ?? '-1');
        const bild = (t: number): void => {
          if (start === 0) {
            start = t;
            letztes = t;
          } else {
            abstaende.push(t - letztes);
            letztes = t;
          }
          const erste = ersteZeile();
          if (erste !== vorherigeErste) bilderMitNeuenZeilen++;
          vorherigeErste = erste;
          const vergangen = t - start;
          if (vergangen < dauer) {
            el.scrollTop = lage((vergangen / 1000) * geschwindigkeit);
            requestAnimationFrame(bild);
            return;
          }
          // Im letzten Bild wird nicht mehr gescrollt: Die gerenderten Zeilen werden mit der Scrollposition verglichen,
          // die das Grid schon gesehen hat (ihr Scroll-Ereignis kommt vor diesem Bild). Eine eben erst gesetzte Position
          // könnte es noch gar nicht zeigen; der Abstand hinge dann an der Länge des letzten Bildes.
          const sortiert = [...abstaende].sort((a, b) => a - b);
          const summe = abstaende.reduce((s, x) => s + x, 0);
          fertig({
            zeilen,
            pixelProSekunde: geschwindigkeit,
            dauerMs: Math.round(summe),
            bilder: abstaende.length,
            mittlereFps: Math.round((abstaende.length / summe) * 10000) / 10,
            schlechtestesBildMs: Math.round((sortiert.at(-1) ?? 0) * 10) / 10,
            p95BildMs: Math.round((sortiert[Math.floor(sortiert.length * 0.95)] ?? 0) * 10) / 10,
            bilderUeber33Ms: abstaende.filter((x) => x > 33.4).length,
            bilderUeber50Ms: abstaende.filter((x) => x > 50).length,
            bilderMitNeuenZeilen,
            ersteZeileAmEnde: ersteZeile(),
            erwarteteZeileAmEnde: Math.floor(el.scrollTop / 28) + 30,
          });
        };
        requestAnimationFrame(bild);
      }),
    { geschwindigkeit: pixelProSekunde, dauer: dauerMs },
  );
}

// Ticket 74: Die Kosten des schnellen Wischens im Vergleichsgrid wachsen mit den Elementen je Zelle (D-60.10). Diese
// Zählung hängt nicht an der Maschine: je Zelle nur die Zelle, ihr Text und je Kennzeichen eine Marke; in der Baumspalte
// einer Position dazu genau ein Element für den Einzug. Die Beschreibung der Kennzeichen steht im `title`.
test('Vergleich 5.000 Zeilen x 5 Bieter: je Zelle nur Zelle, Text und Marken', async ({ page }) => {
  await page.goto('/vergleich.html?zeilen=5000&bieter=5');
  await expect(page.getByRole('treegrid')).toBeVisible();
  await page.getByRole('treegrid').evaluate((el) => {
    el.scrollTop = 2000 * 28;
  });
  await expect(page.locator('.tx-grid__koerper [role="row"][data-i="2010"]')).toBeAttached();
  const zellen = await page.locator('.tx-grid__koerper [role="gridcell"]').evaluateAll((els) =>
    els.map((el) => ({
      spalte: el.getAttribute('data-spalte') ?? '',
      position: el.closest('.tx-grid__zeile--position') !== null,
      elemente: el.querySelectorAll('*').length + 1,
      marken: el.querySelectorAll('[data-kennzeichen]').length,
    })),
  );
  const ohneBaum = zellen.filter((z) => z.spalte !== 'kurztext');
  expect(ohneBaum.filter((z) => z.marken > 0).length).toBeGreaterThan(20);
  expect(ohneBaum.filter((z) => z.elemente !== 2 + z.marken)).toEqual([]);
  const blaetter = zellen.filter((z) => z.spalte === 'kurztext' && z.position);
  expect(blaetter.length).toBeGreaterThan(20);
  expect(blaetter.filter((z) => z.elemente !== 3)).toEqual([]);
});

// Ticket 96: Eine Balkenzelle hat eine feste Zahl Elemente, gleich wie lang die Achse ist und wie viele freie Tage sie
// hat: Zelle, Text, das Raster (ein SVG mit einem Pfad für alle freien Tage und einem je Art der Markierungen), dazu
// Balken, Ist-Balken und Randkennzeichen, soweit vorhanden. Die Zählung hängt nicht an der Maschine.
test('Bauzeitenplan 1.000 Zeilen, 730 Tage: je Balkenzelle eine feste Zahl Elemente', async ({ page }) => {
  await page.goto('/bauzeit.html?zeilen=1000&tage=730');
  await expect(page.getByRole('treegrid')).toBeVisible();
  await page.getByRole('treegrid').evaluate((el) => {
    el.scrollTop = 500 * 28;
  });
  await expect(page.locator('.tx-grid__koerper [role="row"][data-i="510"]')).toBeAttached();
  const zellen = await page.locator('.tx-grid__koerper [data-spalte="balken"]').evaluateAll((els) =>
    els.map((el) => ({
      elemente: el.querySelectorAll('*').length + 1,
      teile: el.querySelectorAll('[data-balken], [data-balkenrand], [data-kennzeichen]').length,
      pfade: el.querySelectorAll('svg path').length,
    })),
  );
  expect(zellen.length).toBeGreaterThan(20);
  // 730 Tage mit gut 200 freien Tagen: trotzdem zwei Pfade (freie Tage, Stichtag) je Zelle
  expect(zellen.filter((z) => z.pfade !== 2)).toEqual([]);
  // Zelle, Text, SVG und zwei Pfade, dazu je Balken, Ist-Balken und Kennzeichen ein Element
  expect(zellen.filter((z) => z.elemente !== 5 + z.teile)).toEqual([]);
  expect(zellen.filter((z) => z.teile > 0).length).toBeGreaterThan(20);
});

const FALLE = [
  { name: 'gross, 5.000 Zeilen', url: '/?fixture=gross' },
  { name: 'gross x2, 10.000 Zeilen', url: '/?fixture=gross&kopien=2' },
  // Vergleichsgrid (Ticket 60): erfundener Preisspiegel, 5 Bieter und Min/Mittel/Max je EP und GP (20 Spalten)
  { name: 'Vergleich 5.000 Zeilen x 5 Bieter', url: '/vergleich.html?zeilen=5000&bieter=5' },
  // Balkenspalte (Ticket 96): erfundener Bauzeitenplan, Achse 730 Tage zu 16 px (11.680 px breit), 6 Spalten
  { name: 'Bauzeitenplan 1.000 Zeilen, 730 Tage', url: '/bauzeit.html?zeilen=1000&tage=730' },
] as const;

// zwei Geschwindigkeiten: zügiges Lesen (200 Zeilen/s) und ein schneller Wisch (1.000 Zeilen/s)
const GESCHWINDIGKEITEN = [5600, 28000] as const;

for (const fall of FALLE) {
  test(`Scrollen: ${fall.name}`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.goto(fall.url);
    await expect(page.getByRole('treegrid')).toBeVisible();
    const umgebung = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      kerne: navigator.hardwareConcurrency,
    }));
    // Aufwärmen: erst einmal durchscrollen, damit JIT und Layout nicht in die Messung fallen
    await messeScrollen(page, 28000, 1500);

    const melde = async (titel: string, m: Messung): Promise<void> => {
      const zeile = `${titel}: ${String(m.mittlereFps)} fps im Mittel, schlechtestes Bild ${String(m.schlechtestesBildMs)} ms, p95 ${String(m.p95BildMs)} ms, ${String(m.bilderUeber33Ms)} Bilder > 33 ms (${String(m.bilder)} Bilder, ${String(m.zeilen)} Zeilen; Zeilenwechsel in ${String(m.bilderMitNeuenZeilen)} Bildern)`;
      console.log(`[Leistung] ${zeile} | ${umgebung.userAgent} | ${String(umgebung.kerne)} Kerne`);
      testInfo.annotations.push({ type: 'leistung', description: zeile });
      await testInfo.attach(`leistung-${titel}.json`, {
        body: JSON.stringify({ ...m, umgebung }, null, 2),
        contentType: 'application/json',
      });
    };

    for (const v of GESCHWINDIGKEITEN) {
      const m = await messeScrollen(page, v, 5000);
      await melde(`${fall.name} @ ${String(v)} px/s`, m);
      expect(m.bilder).toBeGreaterThan(20);
      // das Grid arbeitet wirklich: die gerenderten Zeilen wandern mit der Scrollposition
      expect(m.bilderMitNeuenZeilen).toBeGreaterThan(m.bilder / 2);
      expect(Math.abs(m.ersteZeileAmEnde - m.erwarteteZeileAmEnde)).toBeLessThan(60);
      const minimum = Number(process.env['GRID_MIN_FPS'] ?? '0');
      if (minimum > 0) expect(m.mittlereFps).toBeGreaterThanOrEqual(minimum);
    }

    // Kontrolle (nur zur Information): dieselbe Messung mit gedrosselter CPU. Sie zeigt, dass die Messung
    // Rechenlast tatsächlich abbildet und die 60 fps oben nicht nur ein Zählartefakt sind.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    for (const v of GESCHWINDIGKEITEN) {
      await melde(
        `${fall.name} @ ${String(v)} px/s, CPU 6-fach gedrosselt (Kontrolle)`,
        await messeScrollen(page, v, 5000),
      );
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });
}
