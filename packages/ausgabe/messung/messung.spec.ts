// SPDX-License-Identifier: AGPL-3.0-or-later
// Messung (Tickets 28 und 58): Dauer und Dateigröße des LV-Drucks für `fixtures/gross.json` (5.000 Positionen),
// im Browser (Chromium) und unter Node. Lauf: `pnpm --dir packages/ausgabe messen`. Schreibt `messung/ergebnis.json`.
// Der Browserdruck (Weg B des Spikes) ist mit ADR 0012 entfallen.

import { writeFileSync } from 'node:fs';
import { cpus, loadavg, totalmem } from 'node:os';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';
import { formatiereBetragDe } from '@tethys/dezimal';
import type { Betrag } from '@tethys/vertrag';
import { baueAusgabemodell, erzeugePdf } from '../src/index';
import { liesPdf, alsText } from '../src/pdftext';
import { schriftenAusDateien } from '../src/schriften-node';
import { lvZustandAusFixture } from '../src/testhilfen';

const LAEUFE = Number(process.env['MESS_LAEUFE'] ?? 7);
const paket = fileURLToPath(new URL('..', import.meta.url));
const median = (a: number[]): number => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? NaN;
const rund = (x: number): number => Math.round(x * 10) / 10;
const stat = (a: number[]) => ({
  laeufe: a.length,
  medianMs: rund(median(a)),
  minMs: rund(Math.min(...a)),
  maxMs: rund(Math.max(...a)),
  alleMs: a.map(rund),
});
const b64 = (u: Uint8Array): string => Buffer.from(u).toString('base64');

async function buendel(eintrag: string): Promise<string> {
  const ausgabe = await build({
    configFile: false,
    logLevel: 'silent',
    root: paket,
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      write: false,
      minify: true,
      lib: { entry: eintrag, name: 'buendel', formats: ['iife'], fileName: 'buendel' },
    },
  });
  const liste = Array.isArray(ausgabe) ? ausgabe : [ausgabe];
  const chunk = (liste[0] as { output: { type: string; code?: string }[] }).output.find(
    (o) => o.type === 'chunk',
  );
  if (chunk?.code === undefined) throw new Error('Kein Bündel erzeugt');
  return chunk.code;
}

const normal = (t: string): string => t.replace(/\s+/g, ' ').trim(); // \s umfasst das geschützte Leerzeichen

const schriftEingebettet = (pdf: Uint8Array): string[] => [
  ...new Set(new TextDecoder('latin1').decode(pdf).match(/\/BaseFont\s*\/[^\s/\]>]+/g) ?? []),
];

interface StrukturKnoten {
  role?: string;
  children?: StrukturKnoten[];
}
/** Rollen im Strukturbaum (Tags) des gesamten Dokuments, gezählt über alle Seiten bis `maxSeiten`. */
async function strukturElemente(pdf: Uint8Array, maxSeiten = 5): Promise<Record<string, number>> {
  const aufgabe = getDocument({ data: new Uint8Array(pdf), verbosity: 0 });
  const dok = await aufgabe.promise;
  const rollen: Record<string, number> = {};
  const zaehle = (k: StrukturKnoten): void => {
    if (k.role) rollen[k.role] = (rollen[k.role] ?? 0) + 1;
    for (const c of k.children ?? []) zaehle(c);
  };
  for (let nr = 1; nr <= Math.min(maxSeiten, dok.numPages); nr++) {
    const baum = (await (await dok.getPage(nr)).getStructTree()) as StrukturKnoten | null;
    if (baum) zaehle(baum);
  }
  await aufgabe.destroy();
  return rollen;
}

/** Seiten, deren tiefste Inhaltszeile eine Titelzeile ist (Titel vom ersten Kind getrennt). */
async function verwaisteTitel(pdf: Uint8Array, titel: Set<string>) {
  const inhalt = await liesPdf(pdf);
  let verwaist = 0;
  for (const seite of inhalt.seiten) {
    const stuecke = seite
      .map((t) => ({ ...t, text: normal(t.text) }))
      .filter((t) => t.text !== '' && !t.text.startsWith('Seite '));
    if (stuecke.length === 0) continue;
    const tiefster = Math.min(...stuecke.map((t) => t.y));
    if (stuecke.some((t) => Math.abs(t.y - tiefster) < 0.5 && titel.has(t.text))) verwaist++;
  }
  const letzte = (inhalt.seiten.at(-1) ?? []).map((t) => normal(t.text)).find((t) => t.startsWith('Seite '));
  return { seiten: inhalt.seiten.length, verwaist, text: alsText(inhalt), letzteSeitenzahl: letzte };
}

describe('Messung gross', () => {
  it('misst den LV-Druck', async () => {
    const { fx, zustand } = lvZustandAusFixture('gross');
    const schriften = schriftenAusDateien();
    const modell = baueAusgabemodell(zustand);
    const titel = new Set(
      modell.zeilen.flatMap((z) => (z.art === 'titel' ? [normal(`${z.ordnungszahl} ${z.kurztext}`)] : [])),
    );
    const s = fx.sollwerte.summen;
    const sollSummen = [s.netto, s.nettoNachNachlass, s.mwst, s.brutto].map((w) =>
      formatiereBetragDe(w as Betrag),
    );
    const ergebnis: Record<string, unknown> = {
      umgebung: {
        cpus: cpus().length,
        cpuModell: cpus()[0]?.model,
        arbeitsspeicherMiB: Math.round(totalmem() / 2 ** 20),
        node: process.version,
        laeufeJeMessung: LAEUFE,
        lastVorMessung1Min: rund(loadavg()[0] ?? NaN),
        hinweis:
          'Container ohne GPU, Chromium headless (Playwright launch ohne Zusatzparameter). Lauf 1 ist ein Aufwärmlauf und zählt nicht mit.',
      },
      positionen: modell.zeilen.filter((z) => z.art === 'position').length,
    };

    // --- Weg A unter Node ---
    const nodeMs: number[] = [];
    let nodePdf: Uint8Array = new Uint8Array();
    await erzeugePdf(zustand, schriften); // Aufwärmen
    for (let i = 0; i < LAEUFE; i++) {
      const t0 = performance.now();
      nodePdf = await erzeugePdf(zustand, schriften);
      nodeMs.push(performance.now() - t0);
    }
    const aNode = await verwaisteTitel(nodePdf, titel);
    ergebnis['pdfmake_node'] = {
      ...stat(nodeMs),
      bytes: nodePdf.length,
      seiten: aNode.seiten,
      verwaisteTitelSeiten: aNode.verwaist,
      letzteSeitenzahl: aNode.letzteSeitenzahl,
      schriftEingebettet: schriftEingebettet(nodePdf),
      strukturElemente: await strukturElemente(nodePdf),
    };
    for (const w of sollSummen) expect(aNode.text).toContain(w);

    // --- Browser ---
    const browser = await chromium.launch({
      executablePath: process.env['PW_CHROMIUM_PATH'] ?? '/opt/pw-browsers/chromium',
    });
    try {
      ergebnis['chromium'] = browser.version();
      const seiteA = await browser.newPage();
      const code = await buendel(fileURLToPath(new URL('./seite-pdfmake.ts', import.meta.url)));
      await seiteA.addScriptTag({ content: code });
      const argumente = [zustand, b64(schriften.normal), b64(schriften.fett)] as const;
      type Messung = { ms: number; bytes: number };
      const messe = () =>
        seiteA.evaluate(
          ([z, n, f]) =>
            (
              globalThis as unknown as {
                ausgabe: { messe(z: unknown, n: string, f: string): Promise<Messung> };
              }
            ).ausgabe.messe(z, n, f),
          argumente,
        );
      await messe(); // Aufwärmen
      const browserMs: number[] = [];
      let browserBytes = 0;
      for (let i = 0; i < LAEUFE; i++) {
        const m = await messe();
        browserMs.push(m.ms);
        browserBytes = m.bytes;
      }
      const browserB64 = await seiteA.evaluate(
        ([z, n, f]) =>
          (
            globalThis as unknown as {
              ausgabe: { erzeuge(z: unknown, n: string, f: string): Promise<string> };
            }
          ).ausgabe.erzeuge(z, n, f),
        argumente,
      );
      const aBrowser = await verwaisteTitel(new Uint8Array(Buffer.from(browserB64, 'base64')), titel);
      ergebnis['pdfmake_chromium'] = {
        ...stat(browserMs),
        bytes: browserBytes,
        seiten: aBrowser.seiten,
        verwaisteTitelSeiten: aBrowser.verwaist,
      };
      for (const w of sollSummen) expect(aBrowser.text).toContain(w);
      await seiteA.close();

      ergebnis['buendel'] = {
        pdfmake_minifiziert: { bytes: Buffer.byteLength(code), gzipBytes: gzipSync(code).length },
        schriftdateien: { normal: schriften.normal.length, fett: schriften.fett.length },
      };
    } finally {
      await browser.close();
    }
    (ergebnis['umgebung'] as Record<string, unknown>)['lastNachMessung1Min'] = rund(loadavg()[0] ?? NaN);
    writeFileSync(new URL('./ergebnis.json', import.meta.url), `${JSON.stringify(ergebnis, null, 2)}\n`);
  });
});
