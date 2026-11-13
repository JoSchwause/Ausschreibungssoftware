// SPDX-License-Identifier: AGPL-3.0-or-later
// Modellvergleich (Ticket 108 Punkt 6, X1f, D-53): zwei Stände über die GlobalId, hinzugefügt, entfernt, geändert (Klasse,
// Name, Strukturknoten, Mengen alt/neu); Befunde für doppelte GlobalIds und geringe Überdeckung. Folgen für ein LV.

import { describe, expect, it } from 'vitest';
import { modellVergleichen, vergleichsfolgenBerechnen } from './index';
import { bauteil, gid, lv, m, menge, modell, position, zeile, zuordnung } from './testhilfe/bauen';

const W = (schluessel: string, wert = '1.000') => bauteil(schluessel, [menge('Length', wert, 'laenge')]);

describe('modellVergleichen', () => {
  it('teilt in hinzugefügt (Reihenfolge neu), entfernt und geändert (Reihenfolge alt) und zählt die unveränderten', () => {
    const alt = modell({ bauteile: [W('A'), W('B'), W('C'), W('D')] });
    const neu = modell({ bauteile: [W('E'), W('D', '2.000'), W('A'), W('F'), W('B', '9.000')] });
    const v = modellVergleichen(alt, neu);
    expect(v.hinzugefuegt.map((b) => b.globalId)).toEqual([gid('E'), gid('F')]);
    expect(v.entfernt.map((b) => b.globalId)).toEqual([gid('C')]);
    expect(v.geaendert.map((a) => a.globalId)).toEqual([gid('B'), gid('D')]);
    expect(v.anzahlUnveraendert).toBe(1);
    expect(v.befunde).toEqual([]);
  });

  it('nennt die geänderten Felder in fester Reihenfolge und die Mengen mit altem und neuem Stand', () => {
    const alt = modell({
      bauteile: [
        bauteil('A', [
          menge('Length', '1.000', 'laenge'),
          menge('Width', '0.200', 'laenge'),
          menge('Area', '3.000'),
        ]),
      ],
    });
    const neu = modell({
      bauteile: [
        bauteil(
          'A',
          [menge('Area', '3.000'), menge('Length', '1.500', 'laenge'), menge('Height', '2.750', 'laenge')],
          {
            ifcKlasse: 'IfcWallStandardCase',
            name: 'Wand neu',
            strukturGlobalId: gid('OG'),
          },
        ),
      ],
    });
    const [a] = modellVergleichen(alt, neu).geaendert;
    expect(a?.felder).toEqual(['klasse', 'name', 'strukturknoten', 'mengen']);
    expect(a?.vorher.name).toBe('A');
    expect(a?.nachher.name).toBe('Wand neu');
    expect(a?.mengen).toEqual([
      {
        satz: 'Qto_Test',
        name: 'Length',
        vorher: menge('Length', '1.000', 'laenge'),
        nachher: menge('Length', '1.500', 'laenge'),
      },
      { satz: 'Qto_Test', name: 'Width', vorher: menge('Width', '0.200', 'laenge'), nachher: null },
      { satz: 'Qto_Test', name: 'Height', vorher: null, nachher: menge('Height', '2.750', 'laenge') },
    ]);
  });

  it('unterscheidet Mengen nach Satz und Name; eine andere Art ist eine Änderung, eine andere Reihenfolge nicht', () => {
    const alt = modell({
      bauteile: [bauteil('A', [menge('Q', '1.000', 'flaeche', 'S1'), menge('Q', '2.000', 'flaeche', 'S2')])],
    });
    const gleich = modell({
      bauteile: [bauteil('A', [menge('Q', '2.000', 'flaeche', 'S2'), menge('Q', '1.000', 'flaeche', 'S1')])],
    });
    expect(modellVergleichen(alt, gleich).geaendert).toEqual([]);
    const andereArt = modell({
      bauteile: [bauteil('A', [menge('Q', '1.000', 'volumen', 'S1'), menge('Q', '2.000', 'flaeche', 'S2')])],
    });
    expect(modellVergleichen(alt, andereArt).geaendert[0]?.mengen.map((q) => [q.satz, q.name])).toEqual([
      ['S1', 'Q'],
    ]);
  });

  it('vergleicht bei doppelten GlobalIds das erste Bauteil (D-66) und meldet die Doppelten je Stand', () => {
    const alt = modell({ bauteile: [W('A'), W('A', '5.000')] });
    const neu = modell({ bauteile: [W('A'), W('B'), W('B')] });
    const v = modellVergleichen(alt, neu);
    expect(v.geaendert).toEqual([]);
    expect(v.hinzugefuegt.map((b) => b.globalId)).toEqual([gid('B')]);
    expect(v.befunde.map((b) => [b.code, b.ort.globalId])).toEqual([
      ['globalid-doppelt', gid('A')],
      ['globalid-doppelt', gid('B')],
    ]);
    expect(v.befunde[0]?.meldung).toMatch(/alt/);
    expect(v.befunde[1]?.meldung).toMatch(/neu/);
  });

  it('meldet eine geringe Überdeckung (weniger als die Hälfte der GlobalIds des kleineren Stands) ohne Ort', () => {
    const alt = modell({ bauteile: [W('A'), W('B'), W('C'), W('D')] });
    const knapp = modell({ bauteile: [W('A'), W('B'), W('X'), W('Y'), W('Z')] });
    expect(modellVergleichen(alt, knapp).befunde).toEqual([]);
    const gering = modell({ bauteile: [W('A'), W('X'), W('Y'), W('Z')] });
    const v = modellVergleichen(alt, gering);
    expect(v.befunde).toEqual([
      {
        schwere: 'warnung',
        quelle: 'modell-pruefung',
        code: 'ueberdeckung-gering',
        meldung: expect.stringContaining('1 von 4') as string,
        ort: {},
      },
    ]);
    expect(modellVergleichen(modell({ bauteile: [] }), alt).befunde).toEqual([]);
  });
});

describe('vergleichsfolgenBerechnen', () => {
  it('nennt je Position mit Zuordnungen die Menge laut altem und neuem Stand, die Differenz und ob sie betroffen ist', () => {
    const alt = modell({ bauteile: [W('A', '2.000'), W('B', '3.000'), bauteil('R', [], { name: 'alt' })] });
    const neu = modell({ bauteile: [W('A', '2.500'), bauteil('R', [], { name: 'neu' })] });
    const knoten = lv(
      position('p1', 'm', [zuordnung('A', 'Length'), zuordnung('B', 'Length')]),
      position('p2', 'St', [zuordnung('R', 'Stueck')]),
      position('p3', 'm', undefined),
    );
    const f = vergleichsfolgenBerechnen(knoten, alt, neu);
    expect(f.positionen).toEqual([
      {
        positionId: 'p1',
        vorher: m('5.000'),
        nachher: m('2.500'),
        differenz: m('-2.500'),
        betroffen: true,
        zeilen: [zeile(1, '2,500')],
        befunde: [
          expect.objectContaining({
            code: 'bauteil-fehlt',
            ort: expect.objectContaining({ globalId: gid('B') }) as unknown,
          }),
        ],
      },
      {
        positionId: 'p2',
        vorher: m('1.000'),
        nachher: m('1.000'),
        differenz: m('0.000'),
        betroffen: false,
        zeilen: [zeile(1, '1,000')],
        befunde: [],
      },
    ]);
  });

  it('gibt ohne Zeile in einem Stand keine Menge und keine Differenz', () => {
    const alt = modell({ bauteile: [] });
    const neu = modell({ bauteile: [W('A', '2.000')] });
    const f = vergleichsfolgenBerechnen(lv(position('p1', 'm', [zuordnung('A', 'Length')])), alt, neu);
    expect(f.positionen[0]).toMatchObject({
      vorher: null,
      nachher: '2.000',
      differenz: null,
      betroffen: true,
    });
  });
});
