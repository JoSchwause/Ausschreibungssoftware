// SPDX-License-Identifier: AGPL-3.0-or-later
// Die erzeugte .xlsx-Datei (Ticket 61): Golden für `winzig`, deterministische Bytes, OOXML-Grundform, Zellschutz,
// Variante „mit Preisen“ und Befunde des Exports. Golden aktualisieren: GOLDEN_UPDATE=1 pnpm vitest run packages/ausgabe
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NACHKOMMASTELLEN, type Knoten, type Menge } from '@tethys/vertrag';
import { lvAlsExcel } from './index';
import { mitInhalt, positionenAendern } from './testhilfe/bau';
import { teile, teilLesen, zeileVon } from './testhilfe/excel';
import { lvZustandAusFixture } from './testhilfen';
import { STIL, leseXlsx } from './xlsx';

const GOLDEN = new URL('../testdaten/excel-winzig.golden.xml', import.meta.url);
const AKTUALISIEREN = process.env['GOLDEN_UPDATE'] === '1';

/** Alle Teile der Arbeitsmappe, je Element eine Zeile: lesbar im Diff. */
function kanonisch(bytes: Uint8Array): string {
  return teile(bytes)
    .map((pfad) => `=== ${pfad}\n${teilLesen(bytes, pfad).replace(/></g, '>\n<')}\n`)
    .join('');
}

describe('Excel-Datei: winzig', () => {
  const { zustand } = lvZustandAusFixture('winzig');

  it('stimmt mit dem Golden testdaten/excel-winzig.golden.xml überein', () => {
    const ist = kanonisch(lvAlsExcel(zustand).bytes);
    if (AKTUALISIEREN) writeFileSync(GOLDEN, ist);
    expect(existsSync(GOLDEN), 'Golden fehlt (GOLDEN_UPDATE=1 setzen)').toBe(true);
    expect(ist).toBe(readFileSync(GOLDEN, 'utf8'));
  });

  it('gleiche Eingabe, gleiche Bytes; ein anderes Datum ändert die Bytes', () => {
    const a = lvAlsExcel(zustand).bytes;
    expect(lvAlsExcel(zustand).bytes).toEqual(a);
    expect(lvAlsExcel(zustand, { datum: '2026-11-11' }).bytes).not.toEqual(a);
    expect(teilLesen(lvAlsExcel(zustand, { datum: '2026-11-11' }).bytes, 'docProps/core.xml')).toContain(
      '2026-11-11T00:00:00Z',
    );
  });
});

describe('Excel-Datei: OOXML-Grundform', () => {
  const { zustand } = lvZustandAusFixture('typisch');
  const bytes = lvAlsExcel(zustand).bytes;

  it('jeder Teil ist wohlgeformtes XML mit Deklaration', () => {
    for (const pfad of teile(bytes)) {
      const xml = teilLesen(bytes, pfad);
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'), pfad).toBe(true);
      // Wohlgeformt: Jedes geöffnete Element wird in richtiger Reihenfolge geschlossen.
      const stapel: string[] = [];
      for (const m of xml.replace(/<\?[^>]*\?>/g, '').matchAll(/<(\/?)([^\s/>]+)[^>]*?(\/?)>/g)) {
        if (m[1] === '/') expect(stapel.pop(), pfad).toBe(m[2]);
        else if (m[3] !== '/') stapel.push(m[2] ?? '');
      }
      expect(stapel, pfad).toEqual([]);
    }
  });

  it('[Content_Types].xml nennt jeden Teil; alle Beziehungsziele existieren', () => {
    const typen = teilLesen(bytes, '[Content_Types].xml');
    for (const pfad of teile(bytes)) {
      if (pfad.endsWith('.rels') || pfad === '[Content_Types].xml') continue;
      expect(typen, pfad).toContain(`PartName="/${pfad}"`);
    }
    expect(typen).toContain('spreadsheetml.sheet.main+xml');
    const ziele = [
      ...[...teilLesen(bytes, '_rels/.rels').matchAll(/Target="([^"]+)"/g)].map((m) => m[1] ?? ''),
      ...[...teilLesen(bytes, 'xl/_rels/workbook.xml.rels').matchAll(/Target="([^"]+)"/g)].map(
        (m) => `xl/${m[1] ?? ''}`,
      ),
    ];
    expect(ziele.length).toBeGreaterThan(0);
    for (const z of ziele) expect(teile(bytes), z).toContain(z);
  });

  it('Blatt geschützt, Kopfzeilen fixiert, ID-Spalte versteckt, Formeln neu berechnen beim Öffnen', () => {
    const blatt = teilLesen(bytes, 'xl/worksheets/sheet1.xml');
    expect(blatt).toMatch(/<sheetProtection sheet="1"/);
    expect(blatt).toMatch(/<pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"\/>/);
    expect(blatt).toMatch(/<col min="9" max="9" width="38" hidden="1" customWidth="1"\/>/);
    expect(teilLesen(bytes, 'xl/workbook.xml')).toContain('fullCalcOnLoad="1"');
  });

  it('entsperrt sind nur EP an Positionen (ohne Zuschlag) und Satz an Zuschlagspositionen', () => {
    const styles = teilLesen(bytes, 'xl/styles.xml');
    const xfs = [
      ...(/<cellXfs[^>]*>(.*)<\/cellXfs>/.exec(styles)?.[1] ?? '').matchAll(/<xf [^>]*?(?:\/>|>.*?<\/xf>)/g),
    ];
    const entsperrt = new Set(xfs.flatMap((m, i) => (m[0].includes('locked="0"') ? [String(i)] : [])));
    expect(entsperrt.size).toBe(2);
    const blatt = teilLesen(bytes, 'xl/worksheets/sheet1.xml');
    const offen = [...blatt.matchAll(/<c r="([A-Z]+)([0-9]+)" s="([0-9]+)"/g)]
      .filter((m) => entsperrt.has(m[3] ?? ''))
      .map((m) => `${m[1] ?? ''}${m[2] ?? ''}`);
    const positionen = zustand.leistungsverzeichnis.knoten.filter((k) => k.art === 'position');
    const erwartet = positionen.map(
      (p) => `${p.zuschlag === null ? 'F' : 'H'}${String(zeileVon(bytes, p.id))}`,
    );
    expect(offen.sort()).toEqual(erwartet.sort());
  });

  it('Zahlformate tragen die Nachkommastellen aus NACHKOMMASTELLEN (N3, S2)', () => {
    const styles = teilLesen(bytes, 'xl/styles.xml');
    const formate = new Map(
      [...styles.matchAll(/<numFmt numFmtId="([0-9]+)" formatCode="([^"]*)"\/>/g)].map((m) => [m[1], m[2]]),
    );
    const xfs = [
      ...(/<cellXfs[^>]*>(.*)<\/cellXfs>/.exec(styles)?.[1] ?? '').matchAll(/<xf [^>]*?(?:\/>|>.*?<\/xf>)/g),
    ];
    const stellen = (stil: number): number | undefined => {
      const id = /numFmtId="([0-9]+)"/.exec(xfs[stil]?.[0] ?? '')?.[1];
      return /\.(0+)$/.exec(formate.get(id) ?? '')?.[1]?.length ?? 0;
    };
    expect(stellen(STIL.menge)).toBe(NACHKOMMASTELLEN.menge);
    expect(stellen(STIL.eingabePreis)).toBe(NACHKOMMASTELLEN.einheitspreis);
    expect(stellen(STIL.betrag)).toBe(NACHKOMMASTELLEN.betrag);
    expect(stellen(STIL.eingabeSatz)).toBe(NACHKOMMASTELLEN.prozent);
  });
});

describe('Excel-Datei: Inhalt', () => {
  const { fx, zustand } = lvZustandAusFixture('typisch');
  const zellen = (bytes: Uint8Array): Map<string, string> => {
    const l = leseXlsx(bytes);
    if (!l.ok) throw new Error(l.meldung);
    const m = new Map<string, string>();
    for (const [n, z] of l.zeilen)
      for (const [s, c] of z)
        m.set(`${String.fromCharCode(65 + s)}${String(n)}`, c.wert.art === 'leer' ? '' : c.wert.text);
    return m;
  };

  it('Blankett: Kopf mit LV-ID, eine Zeile je Knoten in Dokumentreihenfolge, keine Preise', () => {
    const bytes = lvAlsExcel(zustand).bytes;
    const z = zellen(bytes);
    expect(z.get('B1')).toBe(fx.name);
    expect(z.get('A2')).toBe('LV-ID');
    expect(z.get('B2')).toBe(fx.id);
    expect(z.get('C2')).toBe('Prüfsumme');
    expect(z.get('D2')).toMatch(/^[0-9a-f]{64}$/);
    expect(['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3', 'H3', 'I3'].map((r) => z.get(r))).toEqual([
      'OZ',
      'Kurztext',
      'Merkmale',
      'Menge',
      'Einheit',
      'EP',
      'GP',
      'Zuschlagssatz in %',
      'Positions-ID',
    ]);
    // Fixture-Reihenfolge ist Dokumentreihenfolge (Eltern vor Kindern, Geschwister in Reihenfolge).
    const ids = [...z].filter(([r]) => r.startsWith('I') && Number(r.slice(1)) > 3).map(([, v]) => v);
    expect(ids).toEqual(fx.knoten.map((k) => k.id));
    for (const [r, v] of z) if (/^[FH]/.test(r) && Number(r.slice(1)) > 3) expect(v, r).toBe('');
    const pos = fx.knoten.find((k) => k.ordnungszahl === '02.0020');
    const n = String(zeileVon(bytes, pos?.id ?? ''));
    expect([z.get(`A${n}`), z.get(`B${n}`), z.get(`D${n}`), z.get(`E${n}`)]).toEqual([
      '02.0020',
      'Baugrube ausheben',
      '318.2',
      'm³',
    ]);
    const bedarf = String(zeileVon(bytes, '019b76e9-ea45-74f6-8e75-27856918c88c'));
    expect(z.get(`C${bedarf}`)).toBe('Bedarfsposition ohne Gesamtbetrag');
    const zuschlag = String(zeileVon(bytes, '019b76e9-ea4e-72e6-aa2e-a1ad93edf894'));
    expect(z.get(`A${zuschlag}`)).toBe('02.0050A');
    expect(z.get(`C${zuschlag}`)).toBe('Zuschlagsposition auf Position 02.0050');
    expect(teilLesen(bytes, 'xl/worksheets/sheet1.xml')).toContain(
      `<c r="G${n}" s="6"><f>IF(F${n}=&quot;&quot;,&quot;&quot;,ROUND(D${n}*F${n},2))</f></c>`,
    );
  });

  it('mit Preisen: Schätzpreise, Satz und Zuschlagsbetrag des LV als Werte', () => {
    const bytes = lvAlsExcel(zustand, { mitPreisen: true }).bytes;
    const z = zellen(bytes);
    const p = fx.knoten.find((k) => k.ordnungszahl === '01.0010');
    expect(z.get(`F${String(zeileVon(bytes, p?.id ?? ''))}`)).toBe('1850');
    const zuschlag = String(zeileVon(bytes, '019b76e9-ea4e-72e6-aa2e-a1ad93edf894'));
    expect(z.get(`H${zuschlag}`)).toBe('8.5');
    // Betrag aus den Sollwerten der Fixture: 8,50 % auf 6.544,88 (02.0050) = 556,31.
    expect(z.get(`G${zuschlag}`)).toBe('556.31');
  });

  it('Export-Befund: Zahl mit mehr als 15 geltenden Ziffern → zahl-zu-genau (Warnung)', () => {
    const gross = mitInhalt(zustand, (inhalt) =>
      positionenAendern(
        inhalt,
        (p) => p.ordnungszahl === '01.0010',
        (p) => ({ ...p, menge: '1234567890123.456' as Menge }),
      ),
    );
    expect(lvAlsExcel(gross).befunde).toMatchObject([
      { code: 'zahl-zu-genau', schwere: 'warnung', ort: { feld: 'menge' } },
    ]);
  });

  it('Export-Befund: Hinweistext über 32.767 Zeichen → text-gekuerzt (Warnung)', () => {
    const lang = mitInhalt(zustand, (inhalt) => ({
      ...inhalt,
      knoten: inhalt.knoten.map((k): Knoten =>
        k.art === 'hinweis' ? { ...k, text: [{ art: 'text', text: 'x'.repeat(40000) }] } : k,
      ),
    }));
    const { befunde } = lvAlsExcel(lang);
    expect(befunde.map((b) => b.code)).toEqual(['text-gekuerzt', 'text-gekuerzt']);
  });

  it('Steuerzeichen und das Muster _x0041_ im Text überstehen den Rundweg', () => {
    const sonder = mitInhalt(zustand, (inhalt) =>
      positionenAendern(
        inhalt,
        (p) => p.ordnungszahl === '01.0010',
        (p) => ({ ...p, kurztext: 'A\u0001B _x0041_ <&> "q"' }),
      ),
    );
    const bytes = lvAlsExcel(sonder).bytes;
    const p = fx.knoten.find((k) => k.ordnungszahl === '01.0010');
    expect(zellen(bytes).get(`B${String(zeileVon(bytes, p?.id ?? ''))}`)).toBe('A\u0001B _x0041_ <&> "q"');
  });
});
