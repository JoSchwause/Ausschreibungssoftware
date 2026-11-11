// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type { LvZustand } from '@tethys/vertrag';
import { excelRuecklaufLesen, lvAlsExcel } from './index';
import type { ExcelRuecklauf } from './index';
import {
  SPALTENBUCHSTABE,
  ausfuellen,
  deText,
  excelText,
  text,
  typischAngebote,
  zahl,
  zeileVon,
  zellenSetzen,
} from './testhilfe/excel';
import { lvZustandAusFixture } from './testhilfen';

describe('Excel-Rundlauf: Blankett ohne Eingaben', () => {
  it('winzig: ein unberührtes Blankett liefert jede Position als „nicht angeboten“, ohne Befund', () => {
    const { fx, zustand } = lvZustandAusFixture('winzig');
    const { bytes, befunde: exportBefunde } = lvAlsExcel(zustand);
    expect(exportBefunde).toEqual([]);
    const r = excelRuecklaufLesen(bytes, zustand);
    expect(r.befunde).toEqual([]);
    expect(r.nachlass).toBeNull();
    expect(r.positionen).toEqual(
      fx.knoten
        .filter((k) => k.art === 'position')
        .map((k) => ({ positionId: k.id, status: 'nicht-angeboten' })),
    );
  });
});

describe('Excel-Rundlauf: typisch mit den Preisen der drei Bieter', () => {
  const { zustand } = lvZustandAusFixture('typisch');
  const blankett = lvAlsExcel(zustand).bytes;

  describe.each(typischAngebote().map((a) => [a.bieter, a] as const))('%s', (_, angebot) => {
    it('Zahlzellen: die Angebotspositionen sind gleich der Fixture', () => {
      const r = excelRuecklaufLesen(
        ausfuellen(blankett, angebot, (d) => zahl(excelText(d))),
        zustand,
      );
      expect(r.befunde).toEqual([]);
      expect(r.positionen).toEqual(angebot.positionen);
    });

    it('Textzellen in de-DE-Schreibweise: gleiches Ergebnis', () => {
      const r = excelRuecklaufLesen(
        ausfuellen(blankett, angebot, (d) => text(deText(d))),
        zustand,
      );
      expect(r.befunde).toEqual([]);
      expect(r.positionen).toEqual(angebot.positionen);
    });
  });
});

/** Ein Eintrag in das Blankett von `typisch`, zurückgelesen. */
function mitEintrag(
  zustand: LvZustand,
  knotenId: string,
  spalte: 'ep' | 'satz' | 'id' | 'oz',
  xml: string | null,
): ExcelRuecklauf {
  const bytes = lvAlsExcel(zustand).bytes;
  const ref = `${SPALTENBUCHSTABE[spalte]}${String(zeileVon(bytes, knotenId))}`;
  return excelRuecklaufLesen(zellenSetzen(bytes, [{ ref, xml }]), zustand);
}

describe('Excel-Rundlauf: Zahlen aus der Zelle', () => {
  const { zustand } = lvZustandAusFixture('typisch');
  const position = '019b76e9-ea43-79e5-a71b-20f7abf907b0'; // 01.0020
  const zuschlag = '019b76e9-ea4e-72e6-aa2e-a1ad93edf894'; // 02.0050A
  const epVon = (r: ExcelRuecklauf, id: string): unknown => r.positionen.find((p) => p.positionId === id);

  it.each([
    ['18.440999999999999', '18.441'], // Gleitkomma-Abbild mit 17 Ziffern, wie Excel es schreibt
    ['1E-3', '0.001'],
    ['1.2345E3', '1234.500'],
    ['7', '7.000'],
    ['-12.5', '-12.500'],
  ])('Zahlzelle %s → EP %s', (v, ep) => {
    const r = mitEintrag(zustand, position, 'ep', zahl(v));
    expect(r.befunde).toEqual([]);
    expect(epVon(r, position)).toEqual({
      positionId: position,
      status: 'angeboten',
      einheitspreis: ep,
      epa: null,
    });
  });

  it('0 ist ein angebotener Preis von 0,000, nicht „nicht angeboten“', () => {
    const r = mitEintrag(zustand, position, 'ep', zahl('0'));
    expect(epVon(r, position)).toEqual({
      positionId: position,
      status: 'angeboten',
      einheitspreis: '0.000',
      epa: null,
    });
  });

  it('eine leere Textzelle (nur Leerraum) ist „nicht angeboten“', () => {
    const r = mitEintrag(zustand, position, 'ep', text('  '));
    expect(r.befunde).toEqual([]);
    expect(epVon(r, position)).toEqual({ positionId: position, status: 'nicht-angeboten' });
  });

  it.each([['8,51'], ['8,51 %'], ['8,51%']])('Satz als Text „%s“ → 8.51', (t) => {
    const r = mitEintrag(zustand, zuschlag, 'satz', text(t));
    expect(r.befunde).toEqual([]);
    expect(epVon(r, zuschlag)).toEqual({
      positionId: zuschlag,
      status: 'angeboten',
      einheitspreis: '0.000',
      epa: null,
      zuschlagssatz: '8.51',
    });
  });

  it('Satz als Gleitkommazahl 8.5099999999999998 → 8.51', () => {
    const r = mitEintrag(zustand, zuschlag, 'satz', zahl('8.5099999999999998'));
    expect(r.befunde).toEqual([]);
    expect(epVon(r, zuschlag)).toMatchObject({ zuschlagssatz: '8.51' });
  });

  it('eine Formel zählt mit ihrem gespeicherten Ergebnis', () => {
    const r = mitEintrag(zustand, position, 'ep', '<c><f>7+0.5</f><v>7.5</v></c>');
    expect(r.befunde).toEqual([]);
    expect(epVon(r, position)).toMatchObject({ einheitspreis: '7.500' });
  });
});
