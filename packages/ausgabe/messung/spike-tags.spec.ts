// SPDX-License-Identifier: AGPL-3.0-or-later
// Spike „getaggtes PDF“ (Ticket 77, ADR 0012, Zeitbox 1 h). Frage: Schreibt eine Bibliothek mit AGPL-verträglicher Lizenz
// einen echten Strukturbaum (Überschrift, Tabelle, Zeile, Zelle, Absatz)? Kandidat: pdfkit 0.20.2 (MIT), die Bibliothek
// unter pdfmake, mit ihrer eigenen Struktur-API (`tagged`, `struct`, `text(..., { structParent })`). Keine neue
// Abhängigkeit: pdfkit wird über pdfmake aufgelöst. Nicht Teil von `pnpm test`; Lauf: `pnpm --dir packages/ausgabe messen`.
// Der Spike zeichnet nur ein Gerüst (OZ, Kurztext, Menge, Einheit, EP, GP; ohne Langtext, Summen und Zeilenumbruch), um
// Struktur, Größe und Laufzeit zu messen. Er ist kein Renderer.

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { baueAusgabemodell } from '../src/index';
import { lvZustandAusFixture } from '../src/testhilfen';

const ausPdfmake = createRequire(createRequire(import.meta.url).resolve('pdfmake'));
const PDFDocument = ausPdfmake('pdfkit') as new (o: object) => PdfKit;
const pdfkitPfad = ausPdfmake.resolve('pdfkit');

interface Struct {
  add(kind: Struct): Struct;
  end(): void;
}
interface PdfKit {
  struct(typ: string, opt?: object, kinder?: unknown): Struct;
  addStructure(s: Struct): void;
  registerFont(name: string, daten: Buffer): void;
  font(name: string): PdfKit;
  fontSize(n: number): PdfKit;
  text(t: string, x: number, y: number, o?: object): PdfKit;
  addPage(): PdfKit;
  on(e: string, f: (d: Buffer) => void): void;
  on(e: 'end', f: () => void): void;
  end(): void;
  page: { height: number };
}

const schrift = (d: string): Buffer => readFileSync(new URL(`../schriften/${d}`, import.meta.url));
const SPALTEN = [40, 100, 400, 440, 480, 530];

async function getaggt(name: 'typisch' | 'gross'): Promise<{ bytes: Buffer; ms: number }> {
  const { zustand } = lvZustandAusFixture(name);
  const modell = baueAusgabemodell(zustand);
  const t0 = performance.now();
  const doc = new PDFDocument({
    tagged: true,
    lang: 'de-DE',
    displayTitle: true,
    info: { Title: modell.name },
    margin: 40,
    size: 'A4',
  });
  const teile: Buffer[] = [];
  const fertig = new Promise<void>((ok) => {
    doc.on('end', () => {
      ok();
    });
  });
  doc.on('data', (d) => teile.push(d));
  doc.registerFont('N', schrift('noto-sans-latin-400-normal.woff'));
  doc.registerFont('B', schrift('noto-sans-latin-700-normal.woff'));
  const wurzel = doc.struct('Document');
  doc.addStructure(wurzel);
  let y = 40;
  const unten = doc.page.height - 50;
  let tabelle: Struct | null = null;
  const umbruch = (): void => {
    if (y > unten) {
      doc.addPage();
      y = 40;
    }
  };
  const zeile = (zellen: readonly string[]): void => {
    umbruch();
    if (tabelle === null) {
      tabelle = doc.struct('Table');
      wurzel.add(tabelle);
    }
    const tr = doc.struct('TR');
    tabelle.add(tr);
    zellen.forEach((z, i) => {
      const zelle = doc.struct('TD');
      tr.add(zelle);
      doc.text(z, SPALTEN[i] ?? 40, y, { lineBreak: false, structParent: zelle, structType: 'P' });
      zelle.end();
    });
    tr.end();
    y += 11;
  };
  doc.font('N').fontSize(8);
  for (const z of modell.zeilen) {
    if (z.art === 'titel') {
      (tabelle as Struct | null)?.end();
      tabelle = null;
      umbruch();
      const h = doc.struct(z.ebene === 1 ? 'H1' : 'H2');
      wurzel.add(h);
      doc.font('B');
      doc.text(`${z.ordnungszahl} ${z.kurztext}`, 40, y, {
        lineBreak: false,
        structParent: h,
        structType: 'P',
      });
      doc.font('N');
      h.end();
      y += 14;
    } else if (z.art === 'position') {
      zeile([z.ordnungszahl, z.kurztext.slice(0, 60), z.menge, z.einheit, z.einheitspreis, z.gesamtpreis]);
    }
  }
  (tabelle as Struct | null)?.end();
  wurzel.end();
  doc.end();
  await fertig;
  return { bytes: Buffer.concat(teile), ms: performance.now() - t0 };
}

const zaehle = (bytes: Buffer, typ: string): number =>
  (bytes.toString('latin1').match(new RegExp(`/S /${typ}\\b`, 'g')) ?? []).length;

describe('Spike getaggtes PDF mit pdfkit (MIT)', () => {
  it('typisch: Strukturbaum mit Überschrift, Tabelle, Zeile, Zelle, Absatz', async () => {
    const { bytes } = await getaggt('typisch');
    const s = bytes.toString('latin1');
    expect(s).toContain('/StructTreeRoot');
    expect(s).toContain('/Marked true');
    for (const typ of ['Document', 'H1', 'Table', 'TR', 'TD', 'P'])
      expect(zaehle(bytes, typ), typ).toBeGreaterThan(0);
  });

  it('gross: Größe, Laufzeit, Bündel', async () => {
    const laeufe = [await getaggt('gross'), await getaggt('gross'), await getaggt('gross')];
    const ms = laeufe.map((l) => Math.round(l.ms)).sort((a, b) => a - b);
    const bytes = (laeufe[0] as { bytes: Buffer }).bytes;
    const buendel = readFileSync(pdfkitPfad.replace(/pdfkit\.js$/, 'pdfkit.browser.js'));
    console.log(
      JSON.stringify({
        medianMs: ms[1],
        alleMs: ms,
        bytes: bytes.length,
        strukturElemente: Object.fromEntries(
          ['Document', 'H1', 'H2', 'Table', 'TR', 'TD', 'P'].map((t) => [t, zaehle(bytes, t)]),
        ),
        pdfkitBrowserBuendelKiB: Math.round(buendel.length / 1024),
        pdfkitBrowserBuendelGzipKiB: Math.round(gzipSync(buendel).length / 1024),
      }),
    );
    expect(zaehle(bytes, 'TR')).toBeGreaterThan(4000);
  });
});
