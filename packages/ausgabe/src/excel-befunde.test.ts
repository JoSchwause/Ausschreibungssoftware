// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde des Excel-Rücklaufs (Ticket 61): Jeder Fehlerfall wird gemeldet, nichts wird still gerundet oder verworfen.
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import type { Menge } from '@tethys/vertrag';
import { excelRuecklaufLesen, lvAlsExcel } from './index';
import type { ExcelRuecklauf } from './index';
import { mitInhalt, positionenAendern } from './testhilfe/bau';
import { SPALTENBUCHSTABE, teilErsetzen, text, zahl, zeileVon, zellenSetzen } from './testhilfe/excel';
import type { Eintrag } from './testhilfe/excel';
import { lvZustandAusFixture } from './testhilfen';

const { zustand } = lvZustandAusFixture('typisch');
const blankett = lvAlsExcel(zustand).bytes;

const ID = {
  titel01: '019b76e9-ea41-7576-8947-bf4601b85123',
  hinweis01: '019b76e9-ea5d-71d0-a8ee-b0ce854744c0',
  p0010: '019b76e9-ea42-7a6c-9180-36c38b8c3b9e',
  p0020: '019b76e9-ea43-79e5-a71b-20f7abf907b0',
  zuschlag: '019b76e9-ea4e-72e6-aa2e-a1ad93edf894',
};
const zeile = (id: string): number => zeileVon(blankett, id);
const ref = (spalte: keyof typeof SPALTENBUCHSTABE, id: string): string =>
  `${SPALTENBUCHSTABE[spalte]}${String(zeile(id))}`;
const lesen = (eintraege: readonly Eintrag[], bytes = blankett): ExcelRuecklauf =>
  excelRuecklaufLesen(zellenSetzen(bytes, eintraege), zustand);
const codes = (r: ExcelRuecklauf): string[] => r.befunde.map((b) => b.code);
const hat = (r: ExcelRuecklauf, id: string): boolean => r.positionen.some((p) => p.positionId === id);

describe('Excel-Rücklauf: Datei und Kopf', () => {
  it('keine ZIP-Datei → datei-unlesbar, keine Positionen', () => {
    const r = excelRuecklaufLesen(strToU8('kein Excel'), zustand);
    expect(codes(r)).toEqual(['datei-unlesbar']);
    expect(r.positionen).toEqual([]);
  });

  it('ZIP ohne Arbeitsblatt → datei-unlesbar', () => {
    const r = excelRuecklaufLesen(zipSync({ 'a.txt': strToU8('x') }), zustand);
    expect(codes(r)).toEqual(['datei-unlesbar']);
  });

  it('kaputtes XML im Arbeitsblatt → datei-unlesbar', () => {
    const bytes = teilErsetzen(blankett, 'xl/worksheets/sheet1.xml', (x) => x.replace('</sheetData>', ''));
    expect(codes(excelRuecklaufLesen(bytes, zustand))).toEqual(['datei-unlesbar']);
  });

  it('ohne Spaltenüberschrift „Positions-ID“ → kopf-fehlt, keine Positionen', () => {
    const bytes = teilErsetzen(blankett, 'xl/worksheets/sheet1.xml', (x) =>
      x.replace('<t>Positions-ID</t>', '<t>Kennung</t>'),
    );
    const r = excelRuecklaufLesen(bytes, zustand);
    expect(codes(r)).toEqual(['kopf-fehlt']);
    expect(r.positionen).toEqual([]);
  });

  it('ohne LV-ID im Kopf → kopf-fehlt (Fehler), die Preise werden trotzdem zugeordnet', () => {
    const r = lesen([
      { ref: 'A2', xml: null },
      { ref: ref('ep', ID.p0010), xml: zahl('1') },
    ]);
    expect(r.befunde).toMatchObject([{ code: 'kopf-fehlt', schwere: 'fehler' }]);
    expect(hat(r, ID.p0010)).toBe(true);
  });

  it('LV-ID eines anderen LV → falsches-lv, nichts übernommen', () => {
    const r = lesen([
      { ref: 'B2', xml: text('019b0000-0000-7000-8000-000000000000') },
      { ref: ref('ep', ID.p0010), xml: zahl('1') },
    ]);
    expect(r.befunde).toMatchObject([{ code: 'falsches-lv', schwere: 'fehler' }]);
    expect(r.positionen).toEqual([]);
  });

  it('LV nach dem Export geändert (Menge) → struktur-geaendert (Warnung), Preise über die ID zugeordnet', () => {
    const geaendert = mitInhalt(zustand, (inhalt) =>
      positionenAendern(
        inhalt,
        (p) => p.id === ID.p0020,
        (p) => ({ ...p, menge: '90.000' as Menge }),
      ),
    );
    const bytes = zellenSetzen(blankett, [{ ref: ref('ep', ID.p0020), xml: zahl('7.5') }]);
    const r = excelRuecklaufLesen(bytes, geaendert);
    expect(r.befunde).toMatchObject([{ code: 'struktur-geaendert', schwere: 'warnung' }]);
    expect(r.positionen.find((p) => p.positionId === ID.p0020)).toMatchObject({ einheitspreis: '7.500' });
  });

  it('geänderte Prüfsumme in der Datei → struktur-geaendert', () => {
    expect(codes(lesen([{ ref: 'D2', xml: text('0000') }]))).toEqual(['struktur-geaendert']);
  });
});

describe('Excel-Rücklauf: Zuordnung der Zeilen', () => {
  it('Preis ohne Positions-ID → positions-id-fehlt; die Position fehlt in der Datei → position-fehlt', () => {
    const r = lesen([
      { ref: ref('id', ID.p0010), xml: null },
      { ref: ref('ep', ID.p0010), xml: zahl('5') },
    ]);
    expect(r.befunde).toMatchObject([
      { code: 'positions-id-fehlt', schwere: 'fehler', ort: { zeile: zeile(ID.p0010), spalte: 9 } },
      { code: 'position-fehlt', schwere: 'warnung', ort: { knotenId: ID.p0010 } },
    ]);
    expect(hat(r, ID.p0010)).toBe(false);
  });

  it('Zeile ohne ID und ohne Preis (Notiz des Bieters) bleibt ohne Befund', () => {
    const bytes = teilErsetzen(blankett, 'xl/worksheets/sheet1.xml', (x) =>
      x.replace(
        '</sheetData>',
        '<row r="200"><c r="B200" t="inlineStr"><is><t>Notiz</t></is></c></row></sheetData>',
      ),
    );
    expect(excelRuecklaufLesen(bytes, zustand).befunde).toEqual([]);
  });

  it('unbekannte Positions-ID mit Preis → positions-id-unbekannt (Fehler)', () => {
    const r = lesen([
      { ref: ref('id', ID.p0010), xml: text('019b0000-0000-7000-8000-000000000001') },
      { ref: ref('ep', ID.p0010), xml: zahl('5') },
    ]);
    expect(r.befunde).toMatchObject([
      { code: 'positions-id-unbekannt', schwere: 'fehler', ort: { zeile: zeile(ID.p0010) } },
      { code: 'position-fehlt' },
    ]);
  });

  it('unbekannte Positions-ID ohne Preis → positions-id-unbekannt (Warnung)', () => {
    const r = lesen([{ ref: ref('id', ID.p0010), xml: text('fremd') }]);
    expect(r.befunde).toMatchObject([
      { code: 'positions-id-unbekannt', schwere: 'warnung' },
      { code: 'position-fehlt' },
    ]);
  });

  it('doppelte Positions-ID → positions-id-doppelt; nur die erste Zeile zählt', () => {
    const r = lesen([
      { ref: ref('ep', ID.p0010), xml: zahl('1') },
      { ref: ref('id', ID.p0020), xml: text(ID.p0010) },
      { ref: ref('ep', ID.p0020), xml: zahl('2') },
    ]);
    expect(r.befunde).toMatchObject([
      {
        code: 'positions-id-doppelt',
        schwere: 'fehler',
        ort: { zeile: zeile(ID.p0020), knotenId: ID.p0010 },
      },
      { code: 'position-fehlt', ort: { knotenId: ID.p0020 } },
    ]);
    expect(r.positionen.find((p) => p.positionId === ID.p0010)).toMatchObject({ einheitspreis: '1.000' });
  });

  it.each([
    ['Titel', ID.titel01, 'ep'],
    ['Hinweistext', ID.hinweis01, 'satz'],
  ] as const)('Preis an %s → preis-an-gliederung', (_, id, spalte) => {
    const r = lesen([{ ref: ref(spalte, id), xml: zahl('3') }]);
    expect(r.befunde).toMatchObject([
      { code: 'preis-an-gliederung', schwere: 'fehler', ort: { zeile: zeile(id), knotenId: id } },
    ]);
  });

  it('Satz an einer Position ohne Zuschlag → satz-ohne-zuschlagsposition; der EP gilt, der Satz nicht', () => {
    const r = lesen([
      { ref: ref('ep', ID.p0010), xml: zahl('3') },
      { ref: ref('satz', ID.p0010), xml: zahl('5') },
    ]);
    expect(r.befunde).toMatchObject([
      { code: 'satz-ohne-zuschlagsposition', schwere: 'fehler', ort: { feld: 'zuschlagssatz' } },
    ]);
    expect(r.positionen.find((p) => p.positionId === ID.p0010)).toEqual({
      positionId: ID.p0010,
      status: 'angeboten',
      einheitspreis: '3.000',
      epa: null,
    });
  });

  it('EP an einer Zuschlagsposition ohne Satz bleibt erhalten (D-29.1: EP aus der Datei)', () => {
    const r = lesen([{ ref: ref('ep', ID.zuschlag), xml: zahl('12') }]);
    expect(r.befunde).toEqual([]);
    expect(r.positionen.find((p) => p.positionId === ID.zuschlag)).toEqual({
      positionId: ID.zuschlag,
      status: 'angeboten',
      einheitspreis: '12.000',
      epa: null,
    });
  });
});

describe('Excel-Rücklauf: Zahlzellen', () => {
  it.each([
    ['Text', text('zwölf')],
    ['Punkt als Dezimaltrenner im Text', text('12.34')],
    ['Wahrheitswert', '<c t="b"><v>1</v></c>'],
    ['Fehlerwert', '<c t="e"><v>#N/A</v></c>'],
  ])('%s im EP → text-in-zahlzelle, keine Angebotsposition', (_, xml) => {
    const r = lesen([{ ref: ref('ep', ID.p0010), xml }]);
    expect(r.befunde).toMatchObject([
      {
        code: 'text-in-zahlzelle',
        schwere: 'fehler',
        ort: { zeile: zeile(ID.p0010), spalte: 6, knotenId: ID.p0010, feld: 'einheitspreis' },
      },
    ]);
    expect(hat(r, ID.p0010)).toBe(false);
  });

  it('Formel ohne gespeichertes Ergebnis im EP → formel-ohne-ergebnis, keine Angebotsposition', () => {
    const r = lesen([{ ref: ref('ep', ID.p0010), xml: '<c><f>A1*2</f></c>' }]);
    expect(r.befunde).toMatchObject([
      { code: 'formel-ohne-ergebnis', schwere: 'fehler', ort: { knotenId: ID.p0010 } },
    ]);
    expect(hat(r, ID.p0010)).toBe(false);
  });

  it.each([
    ['EP als Zahl', 'ep', ID.p0010, zahl('7.2275')],
    ['EP als Text', 'ep', ID.p0010, text('7,2275')],
    ['Satz als Zahl', 'satz', ID.zuschlag, zahl('8.515')],
    ['Satz als Text', 'satz', ID.zuschlag, text('8,515 %')],
  ] as const)('%s mit zu vielen Nachkommastellen → Befund, nicht gerundet', (_, spalte, id, xml) => {
    const r = lesen([{ ref: ref(spalte, id), xml }]);
    expect(r.befunde).toMatchObject([
      { code: 'zu-viele-nachkommastellen', schwere: 'fehler', ort: { knotenId: id } },
    ]);
    expect(hat(r, id)).toBe(false);
  });
});
