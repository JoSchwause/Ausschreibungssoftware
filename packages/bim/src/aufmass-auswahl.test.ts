// SPDX-License-Identifier: AGPL-3.0-or-later
// Aufmaßblatt aus Auswahl (Ticket 108 Punkt 3, D-53): je zugeordneter Position die Zeilen nur der ausgewählten Bauteile, Regeln
// wie bei der Mengenübernahme; die Auswahl „Geschoss“ über `bauteileImStrukturknoten`.

import { describe, expect, it } from 'vitest';
import { aufmassAusAuswahl, bauteileImStrukturknoten } from './index';
import { bauteil, gid, lv, menge, modell, position, zeile, zuordnung } from './testhilfe/bauen';

const mitRaum = () =>
  modell({
    bauteile: [
      bauteil('W1', [menge('Length', '5.000', 'laenge')]),
      bauteil('W2', [menge('Length', '3.250', 'laenge')], { strukturGlobalId: gid('OG') }),
      bauteil('S1', [menge('Length', '1.500', 'laenge')], { strukturGlobalId: gid('R1') }),
      bauteil('W1', [], { strukturGlobalId: gid('OG') }),
    ],
  });

describe('bauteileImStrukturknoten', () => {
  it('nennt die Bauteile im Knoten und in allen Knoten darunter, in der Reihenfolge des Modells, jede GlobalId einmal', () => {
    expect(bauteileImStrukturknoten(mitRaum(), gid('EG'))).toEqual([gid('W1'), gid('S1')]);
    expect(bauteileImStrukturknoten(mitRaum(), gid('OG'))).toEqual([gid('W2')]);
    expect(bauteileImStrukturknoten(mitRaum(), gid('G'))).toEqual([gid('W1'), gid('W2'), gid('S1')]);
    expect(bauteileImStrukturknoten(mitRaum(), gid('UG'))).toEqual([]);
  });
});

describe('aufmassAusAuswahl', () => {
  it('nimmt je Position nur die ausgewählten Bauteile; Positionen ohne ausgewähltes Bauteil fehlen', () => {
    const knoten = lv(
      position('a', 'm', [zuordnung('W2', 'Length'), zuordnung('W1', 'Length'), zuordnung('S1', 'Length')]),
      position('b', 'm', [zuordnung('W2', 'Length')]),
      position('c', 'St', [zuordnung('S1', 'Stueck')]),
    );
    const a = aufmassAusAuswahl(knoten, mitRaum(), [gid('W1'), gid('S1')]);
    expect(a.positionen).toEqual([
      {
        positionId: 'a',
        bauteile: [gid('W1'), gid('S1')],
        zeilen: [zeile(1, '5,000'), zeile(2, '1,500')],
        menge: '6.500',
        befunde: [expect.objectContaining({ code: 'globalid-doppelt' })],
      },
      { positionId: 'c', bauteile: [gid('S1')], zeilen: [zeile(1, '1,000')], menge: '1.000', befunde: [] },
    ]);
    expect(a.befunde.map((b) => b.code)).toEqual(['globalid-doppelt']);
    expect(a.hinweise).toEqual(['bauteil-auf-mehreren-blaettern-nicht-erkennbar']);
  });

  it('meldet ausgewählte, zugeordnete Bauteile ohne Zeile wie die Mengenübernahme', () => {
    const knoten = lv(position('a', 'm²', [zuordnung('W1', 'Length'), zuordnung('X', 'Length')]));
    const a = aufmassAusAuswahl(knoten, modell(), [gid('W1'), gid('X')]);
    expect(a.positionen[0]?.zeilen).toEqual([]);
    expect(a.positionen[0]?.menge).toBeNull();
    expect(a.befunde.map((b) => b.code)).toEqual(['einheit-passt-nicht', 'bauteil-fehlt']);
  });
});
