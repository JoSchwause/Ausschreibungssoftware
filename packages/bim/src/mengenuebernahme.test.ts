// SPDX-License-Identifier: AGPL-3.0-or-later
// Mengenübernahme (Ticket 108 Punkt 2, D-53): Ansatzzeilen je Zuordnung in der Reihenfolge von `bauteile`, Befunde statt
// Zeile (nie 0), Einheiten exakt umgerechnet. Golden-Werte von Hand; die Haus-Fixture prüft `haus.test.ts`.

import { describe, expect, it } from 'vitest';
import type { Pruefbefund } from '@tethys/vertrag';
import { mengenuebernahmeBerechnen, positionUebernehmen } from './index';
import { bauteil, gid, lv, m, menge, modell, position, zeile, zuordnung } from './testhilfe/bauen';

const codes = (befunde: readonly Pruefbefund[]) => befunde.map((b) => b.code);

describe('positionUebernehmen', () => {
  it('baut je Zuordnung eine Zeile mit Formel 91 in der Reihenfolge von bauteile; Menge = Summe der Zeilen', () => {
    const p = position('p1', 'm²', [zuordnung('W2', 'NetSideArea'), zuordnung('W1', 'NetSideArea')]);
    const u = positionUebernehmen(p, modell());
    expect(u.positionId).toBe('p1');
    expect(u.zeilen).toEqual([zeile(1, '8,125'), zeile(2, '12,500')]);
    expect(u.menge).toBe('20.625');
    expect(u.befunde).toEqual([]);
  });

  it('zählt bei der Mengenart Stueck jedes Bauteil 1, auch wenn es eine Menge dieses Namens gäbe', () => {
    const bm = modell({ bauteile: [bauteil('T1', [menge('Stueck', '7.000', 'anzahl')]), bauteil('T2', [])] });
    const u = positionUebernehmen(
      position('p', 'St', [zuordnung('T1', 'Stueck'), zuordnung('T2', 'Stueck')]),
      bm,
    );
    expect(u.zeilen).toEqual([zeile(1, '1,000'), zeile(2, '1,000')]);
    expect(u.menge).toBe('2.000');
  });

  it('gibt für ein fehlendes Bauteil keine Zeile, sondern den Befund bauteil-fehlt; die Zeilen zählen weiter ab 1', () => {
    const p = position('p1', 'm', [zuordnung('X', 'Length'), zuordnung('W1', 'Length')]);
    const u = positionUebernehmen(p, modell());
    expect(u.zeilen).toEqual([zeile(1, '5,000')]);
    expect(u.menge).toBe('5.000');
    expect(u.befunde).toEqual([
      {
        schwere: 'warnung',
        quelle: 'modell-pruefung',
        code: 'bauteil-fehlt',
        meldung: expect.any(String) as string,
        ort: { knotenId: 'p1', globalId: gid('X'), feld: 'bauteile' },
      },
    ]);
  });

  it('meldet eine fehlende Menge als Fehler an der Mengenart, nie als 0', () => {
    const u = positionUebernehmen(position('p1', 'm³', [zuordnung('W1', 'NetVolume')]), modell());
    expect(u.zeilen).toEqual([]);
    expect(u.menge).toBeNull();
    expect(u.befunde).toEqual([
      {
        schwere: 'fehler',
        quelle: 'modell-pruefung',
        code: 'menge-fehlt',
        meldung: expect.any(String) as string,
        ort: { knotenId: 'p1', globalId: gid('W1'), feld: 'mengenart' },
      },
    ]);
  });

  it('meldet einen Namen in zwei Mengensätzen desselben Bauteils als mehrdeutig', () => {
    const bm = modell({
      bauteile: [
        bauteil('W1', [
          menge('Area', '1.000', 'flaeche', 'Qto_A'),
          menge('Area', '2.000', 'flaeche', 'Qto_B'),
        ]),
      ],
    });
    const u = positionUebernehmen(position('p1', 'm²', [zuordnung('W1', 'Area')]), bm);
    expect(u.zeilen).toEqual([]);
    expect(codes(u.befunde)).toEqual(['mengenart-mehrdeutig']);
    expect(u.befunde[0]?.schwere).toBe('fehler');
  });

  it.each([
    ['m²', 'Length'],
    ['m', 'NetSideArea'],
    ['St', 'Length'],
    ['m²', 'Stueck'],
    ['psch', 'Length'],
    ['h', 'Length'],
  ])('meldet die Einheit %s zur Mengenart %s als unpassend', (einheit, mengenart) => {
    const u = positionUebernehmen(position('p1', einheit, [zuordnung('W1', mengenart)]), modell());
    expect(u.zeilen).toEqual([]);
    expect(u.befunde).toEqual([
      {
        schwere: 'fehler',
        quelle: 'modell-pruefung',
        code: 'einheit-passt-nicht',
        meldung: expect.any(String) as string,
        ort: { knotenId: 'p1', globalId: gid('W1'), feld: 'mengenart' },
      },
    ]);
  });

  it('meldet eine Position ohne Einheit als unpassend', () => {
    const u = positionUebernehmen(position('p1', null, [zuordnung('W1', 'Length')]), modell());
    expect(codes(u.befunde)).toEqual(['einheit-passt-nicht']);
  });

  it.each([
    ['m', 'laenge', '2.500', '2,500'],
    ['m2', 'flaeche', '2.500', '2,500'],
    ['m³', 'volumen', '2.500', '2,500'],
    ['m3', 'volumen', '2.500', '2,500'],
    ['Stk', 'anzahl', '3.000', '3,000'],
    ['Stck', 'anzahl', '3.000', '3,000'],
    ['Stück', 'anzahl', '3.000', '3,000'],
    ['kg', 'gewicht', '1234.567', '1234,567'],
    ['t', 'gewicht', '1234.567', '1,235'],
    ['t', 'gewicht', '1234.499', '1,234'],
    ['t', 'gewicht', '0.500', '0,001'],
    [' m² ', 'flaeche', '-1.500', '-1,500'],
  ] as const)('rechnet zur Einheit %s die Art %s exakt um: %s → %s', (einheit, art, wert, ausdruck) => {
    const bm = modell({ bauteile: [bauteil('B', [menge('Q', wert, art)])] });
    const u = positionUebernehmen(position('p1', einheit, [zuordnung('B', 'Q')]), bm);
    expect(u.befunde).toEqual([]);
    expect(u.zeilen).toEqual([zeile(1, ausdruck)]);
  });

  it('nimmt bei einer doppelten GlobalId das erste Bauteil (D-66) und warnt an der Zuordnung', () => {
    const bm = modell({
      bauteile: [
        bauteil('W1', [menge('Length', '1.000', 'laenge')]),
        bauteil('W1', [menge('Length', '9.000', 'laenge')]),
      ],
    });
    const u = positionUebernehmen(position('p1', 'm', [zuordnung('W1', 'Length')]), bm);
    expect(u.zeilen).toEqual([zeile(1, '1,000')]);
    expect(u.befunde).toEqual([
      {
        schwere: 'warnung',
        quelle: 'modell-pruefung',
        code: 'globalid-doppelt',
        meldung: expect.any(String) as string,
        ort: { knotenId: 'p1', globalId: gid('W1'), feld: 'bauteile' },
      },
    ]);
  });

  it('nennt den bisherigen Ansatz und ob sich die Zeilen ändern', () => {
    const neu = positionUebernehmen(position('p1', 'm', [zuordnung('W1', 'Length')]), modell());
    expect(neu.vorher).toEqual({ mengenansatz: null, menge: null });
    expect(neu.geaendert).toBe(true);
    const gleich = positionUebernehmen(
      position('p1', 'm', [zuordnung('W1', 'Length')], {
        mengenansatz: [zeile(1, '5,000')],
        menge: m('5.000'),
      }),
      modell(),
    );
    expect(gleich.vorher).toEqual({ mengenansatz: [zeile(1, '5,000')], menge: '5.000' });
    expect(gleich.geaendert).toBe(false);
  });

  it('ändert nichts, wenn keine Zeile entsteht (die Menge bleibt, nie 0)', () => {
    const u = positionUebernehmen(
      position('p1', 'm', [zuordnung('X', 'Length')], { menge: m('4.000') }),
      modell(),
    );
    expect(u.zeilen).toEqual([]);
    expect(u.menge).toBeNull();
    expect(u.geaendert).toBe(false);
  });
});

describe('mengenuebernahmeBerechnen (ganzes LV)', () => {
  it('nimmt nur Positionen mit Zuordnungen, in der Reihenfolge des LV, und sammelt die Befunde', () => {
    const knoten = lv(
      position('a', 'm', [zuordnung('W1', 'Length')]),
      position('b', 'm²', undefined),
      position('c', 'm', [zuordnung('X', 'Length'), zuordnung('W2', 'Length')]),
    );
    const v = mengenuebernahmeBerechnen(knoten, modell());
    expect(v.positionen.map((p) => [p.positionId, p.menge])).toEqual([
      ['a', '5.000'],
      ['c', '3.250'],
    ]);
    expect(v.befunde.map((b) => [b.code, b.ort.knotenId])).toEqual([['bauteil-fehlt', 'c']]);
  });
});
