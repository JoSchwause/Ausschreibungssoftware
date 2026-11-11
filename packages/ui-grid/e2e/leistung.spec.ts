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
            el.scrollTop = (vergangen / 1000) * geschwindigkeit;
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

const FALLE = [
  { name: 'gross, 5.000 Zeilen', url: '/?fixture=gross' },
  { name: 'gross x2, 10.000 Zeilen', url: '/?fixture=gross&kopien=2' },
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
