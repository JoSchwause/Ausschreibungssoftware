// SPDX-License-Identifier: AGPL-3.0-or-later
// Modellprüfung (Ticket 108 Punkt 7): hängende Zuordnungen, Mengen und Einheiten wie bei der Mengenübernahme, doppelte
// GlobalIds des Modells, Bauteile ohne Zuordnung (gezählt); dazu Bauteile ohne Geometrie aus der Modellansicht (D-66).

import { describe, expect, it } from 'vitest';
import { bauteileOhneGeometrie, zuordnungenPruefen } from './index';
import { bauteil, gid, knoten, lv, menge, modell, position, struktur, zuordnung } from './testhilfe/bauen';

describe('zuordnungenPruefen', () => {
  it('meldet erst doppelte GlobalIds des Modells, dann je Position die Befunde der Zuordnungen; zählt Bauteile ohne Zuordnung', () => {
    const bm = modell({
      struktur: [...struktur(), knoten('EG', 'geschoss', 'G')],
      bauteile: [
        bauteil('W1', [menge('Length', '1.000', 'laenge')]),
        bauteil('W2', []),
        bauteil('S1', []),
        bauteil('W1', []),
      ],
    });
    const knotenliste = lv(
      position('a', 'm', [zuordnung('W1', 'Length'), zuordnung('X', 'Length')]),
      position('b', 'm²', [zuordnung('W1', 'Length')]),
    );
    const p = zuordnungenPruefen(knotenliste, bm);
    expect(p.befunde.map((b) => [b.code, b.ort.knotenId ?? null, b.ort.globalId ?? null])).toEqual([
      ['globalid-doppelt', null, gid('EG')],
      ['globalid-doppelt', null, gid('W1')],
      ['globalid-doppelt', 'a', gid('W1')],
      ['bauteil-fehlt', 'a', gid('X')],
      ['globalid-doppelt', 'b', gid('W1')],
      ['einheit-passt-nicht', 'b', gid('W1')],
    ]);
    expect(p.befunde.every((b) => b.quelle === 'modell-pruefung')).toBe(true);
    expect(p.ohneZuordnung).toEqual([gid('W2'), gid('S1')]);
  });

  it('meldet eine GlobalId, die ein Strukturknoten und ein Bauteil tragen, als doppelt', () => {
    const bm = modell({ bauteile: [bauteil('R1', [])] });
    expect(zuordnungenPruefen([], bm).befunde.map((b) => [b.code, b.ort.globalId])).toEqual([
      ['globalid-doppelt', gid('R1')],
    ]);
  });
});

describe('bauteileOhneGeometrie', () => {
  it('meldet je Bauteil des Modells, das die Modellansicht nicht gezeichnet hat, eine Warnung; ein Ganzes mit Teilen nicht', () => {
    const bm = modell({
      bauteile: [
        bauteil('W1', []),
        bauteil('D1', [], { ifcKlasse: 'IfcRoof' }),
        bauteil('D1a', [], { teilVonGlobalId: gid('D1') }),
        bauteil('W2', []),
        bauteil('W2', []),
      ],
    });
    const befunde = bauteileOhneGeometrie(bm, [gid('D1a'), 'fremd']);
    expect(befunde).toEqual([
      {
        schwere: 'warnung',
        quelle: 'modell-pruefung',
        code: 'bauteil-ohne-geometrie',
        meldung: expect.any(String) as string,
        ort: { globalId: gid('W1') },
      },
      {
        schwere: 'warnung',
        quelle: 'modell-pruefung',
        code: 'bauteil-ohne-geometrie',
        meldung: expect.any(String) as string,
        ort: { globalId: gid('W2') },
      },
    ]);
  });
});
