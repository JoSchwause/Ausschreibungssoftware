// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistung der Leinwand mit 10.000 Bauteilen (Q4, D-54) in Headless-Chromium (WebGL über SwiftShader, keine GPU):
// Laden bis zur ersten vollständigen Darstellung ≤ 20 s und Picken bis zur gezeichneten Hervorhebung ≤ 200 ms, je Median
// mehrerer Läufe; keine Bildraten-Schranke.
//
// - Laden: von der Übergabe der Bytes an die Komponente bis `onGeladen` (das erste Bild mit allen Bauteilen ist
//   gezeichnet), danach wartet der Prüfstand auf die GPU (ein Pixel lesen). Das Erzeugen der Datei zählt nicht.
// - Picken: Zeigerereignisse auf ein sichtbares Bauteil → Raycast → `onAuswahl` → die Testseite setzt die Auswahl →
//   die Leinwand zeichnet die Hervorhebung → GPU fertig.
//
// Das Modell kommt aus dem eigenen Erzeuger im Prüfstand (`testhilfe/ifc-erzeuger.ts`, `grossesModell`), solange
// `fixtures/ifc/erzeugen.mjs` (Ticket 99) nicht auf integration/welle-6 liegt.

import { expect, test } from '@playwright/test';
import { grossesModell } from '../src/testhilfe/ifc-erzeuger';

const ANZAHL = 10_000;
const LADEN_MS = 20_000;
const PICKEN_MS = 200;
const LADELAEUFE = 3;
const PICKS = 9;

const median = (werte: readonly number[]): number => {
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const gerundet = (werte: readonly number[]): number[] => werte.map((w) => Math.round(w));

test('10.000 Bauteile: Laden ≤ 20 s und Picken bis zur Hervorhebung ≤ 200 ms (Median)', async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  const modell = grossesModell(ANZAHL);
  // Kandidaten zum Picken: Decken und Fenster des obersten Geschosses (von der Startansicht aus zu sehen)
  const oben = modell.bauteile.filter((b) => b.geschoss === 9);
  const kandidaten = [
    ...oben.filter((b) => b.klasse === 'IFCSLAB').map((b) => b.globalId),
    ...oben.filter((b) => b.klasse === 'IFCWINDOW').map((b) => b.globalId),
  ];

  const laden: number[] = [];
  const ladenKomponente: number[] = [];
  for (let lauf = 0; lauf < LADELAEUFE; lauf++) {
    await page.goto(`/?modell=gross&anzahl=${String(ANZAHL)}`);
    await page.waitForFunction(() => window.__modell.ereignisse.geladen.length > 0, null, {
      timeout: 120_000,
    });
    const [bericht] = await page.evaluate(() => window.__modell.ereignisse.geladen);
    expect(bericht?.mitGeometrie).toHaveLength(ANZAHL);
    laden.push(bericht?.seitUebergabeMs ?? NaN);
    ladenKomponente.push(bericht?.dauerMs ?? NaN);
  }

  // jedes siebte Kandidatenbauteil (über die Fläche verteilt), bis PICKS sichtbare gemessen sind
  const picken: number[] = [];
  for (const id of kandidaten.filter((_, i) => i % 7 === 0)) {
    if (picken.length >= PICKS) break;
    const sichtbar = await page.evaluate((g) => window.__modell.punkt(g) !== null, id);
    if (!sichtbar) continue;
    picken.push(await page.evaluate((g) => window.__modell.messePicken(g), id));
    await expect.poll(() => page.evaluate(() => window.__modell.eingaben().auswahl)).toEqual([id]);
  }
  expect(picken).toHaveLength(PICKS);

  const umgebung = await page.evaluate(() => ({
    renderer: window.__modell.renderer(),
    kerne: navigator.hardwareConcurrency,
    userAgent: navigator.userAgent,
  }));
  const messung = {
    bauteile: ANZAHL,
    ladenMs: gerundet(laden),
    ladenMedianMs: Math.round(median(laden)),
    ladenKomponenteMs: gerundet(ladenKomponente),
    pickenMs: gerundet(picken),
    pickenMedianMs: Math.round(median(picken)),
    umgebung,
  };
  const zeile = `Laden Median ${String(messung.ladenMedianMs)} ms (${messung.ladenMs.join(', ')}), Picken Median ${String(messung.pickenMedianMs)} ms (${messung.pickenMs.join(', ')}) | ${umgebung.renderer} | ${String(umgebung.kerne)} Kerne`;
  console.log(`[Leistung] ${zeile}`);
  testInfo.annotations.push({ type: 'leistung', description: zeile });
  await testInfo.attach('leistung-modellansicht.json', {
    body: JSON.stringify(messung, null, 2),
    contentType: 'application/json',
  });

  expect(median(laden)).toBeLessThanOrEqual(LADEN_MS);
  expect(median(picken)).toBeLessThanOrEqual(PICKEN_MS);
});
