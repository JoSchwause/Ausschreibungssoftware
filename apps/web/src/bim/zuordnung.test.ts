// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 115 (X1c, D-52): Befehlsbildung der Zuordnung an der öffentlichen Fläche von `zuordnung.ts`. Werte von Hand und aus
// `fixtures/typisch-bim.json` (Ticket 99), nie aus einem Lauf dieses Codes.

import type { Bauteilzuordnung, IfcGlobalId, Knoten, Position, PositionId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { bauteil, gid, hausModell, knoten, menge, modell } from './testhilfen';
import {
  mengenartenDerAuswahl,
  positionenSuchen,
  zuordnenBefehl,
  zuordnungEntfernenBefehl,
  zuordnungsfaerbung,
  zuordnungenDerPositionen,
} from './zuordnung';

const IW_EG = ['31nogOTPLaujT$VUogaKgY', '0hF$HlLZy4_kLE0v2Nc5nl', '0pvziGfz13dL7P$C5SooCO'] as IfcGlobalId[];
const POS_03_0010 = '019b76e9-ea55-79cd-926f-7a3b3917032e' as PositionId;

const typischKnoten = (): readonly Knoten[] => fixtureInhalt('typisch').knoten;
const position = (ks: readonly Knoten[], id: PositionId): Position => {
  const p = ks.find((k) => k.id === id);
  if (p?.art !== 'position') throw new Error('Position fehlt');
  return p;
};
const z = (g: string, mengenart: string): Bauteilzuordnung => ({ globalId: g as IfcGlobalId, mengenart });

describe('zuordnenBefehl: bisherige Liste plus neue Paare, ein Befehl', () => {
  it('setzt die drei Innenwände des EG an 03.0010 mit NetSideArea (D-99.2)', () => {
    const p = position(typischKnoten(), POS_03_0010);
    expect(zuordnenBefehl(p, IW_EG, 'NetSideArea')).toEqual({
      art: 'BauteileZuordnen',
      positionId: POS_03_0010,
      bauteile: IW_EG.map((g) => z(g, 'NetSideArea')),
    });
  });

  it('hängt an die bisherige Liste an und setzt dasselbe Paar nicht doppelt', () => {
    const p: Position = { ...position(typischKnoten(), POS_03_0010), bauteile: [z('A', 'NetSideArea')] };
    expect(zuordnenBefehl(p, ['B', 'A'] as IfcGlobalId[], 'NetSideArea')?.bauteile).toEqual([
      z('A', 'NetSideArea'),
      z('B', 'NetSideArea'),
    ]);
    // Dieselbe GlobalId mit anderer Mengenart ist ein neues Paar (D-105.5).
    expect(zuordnenBefehl(p, ['A'] as IfcGlobalId[], 'Stueck')?.bauteile).toEqual([
      z('A', 'NetSideArea'),
      z('A', 'Stueck'),
    ]);
  });

  it('ändert sich nichts, gibt es keinen Befehl (kein leerer Undo-Schritt)', () => {
    const p: Position = { ...position(typischKnoten(), POS_03_0010), bauteile: [z('A', 'Length')] };
    expect(zuordnenBefehl(p, ['A'] as IfcGlobalId[], 'Length')).toBeNull();
    expect(zuordnenBefehl(p, [], 'Length')).toBeNull();
  });
});

describe('zuordnungEntfernenBefehl', () => {
  it('nimmt genau ein Paar heraus; das letzte entfernt die Liste (null)', () => {
    const p: Position = {
      ...position(typischKnoten(), POS_03_0010),
      bauteile: [z('A', 'Length'), z('B', 'Length')],
    };
    expect(zuordnungEntfernenBefehl(p, z('A', 'Length'))).toEqual({
      art: 'BauteileZuordnen',
      positionId: POS_03_0010,
      bauteile: [z('B', 'Length')],
    });
    const q: Position = { ...p, bauteile: [z('B', 'Length')] };
    expect(zuordnungEntfernenBefehl(q, z('B', 'Length'))?.bauteile).toBeNull();
    expect(zuordnungEntfernenBefehl(q, z('X', 'Length'))).toBeNull();
  });
});

describe('mengenartenDerAuswahl', () => {
  it('die Mengennamen der Auswahl mit Art und Einheit in der Reihenfolge des ersten Vorkommens, dazu Stück', () => {
    const m = modell(
      [knoten('EG', 'geschoss', null)],
      [
        bauteil('W1', 'EG', {
          mengen: [menge('Length', 'laenge', '3'), menge('NetSideArea', 'flaeche', '8')],
        }),
        bauteil('W2', 'EG', {
          mengen: [menge('NetSideArea', 'flaeche', '9'), menge('NetVolume', 'volumen', '1')],
        }),
        bauteil('W3', 'EG', { mengen: [menge('Gewicht', 'gewicht', '1')] }),
      ],
    );
    expect(mengenartenDerAuswahl(m, [gid('W1'), gid('W2')])).toEqual([
      { name: 'Length', einheit: 'm', anzahl: 1 },
      { name: 'NetSideArea', einheit: 'm²', anzahl: 2 },
      { name: 'NetVolume', einheit: 'm³', anzahl: 1 },
      { name: 'Stueck', einheit: 'St', anzahl: 2 },
    ]);
  });

  it('am Haus: die Innenwände des EG haben NetSideArea, alle drei', () => {
    const arten = mengenartenDerAuswahl(hausModell(), IW_EG);
    expect(arten.find((a) => a.name === 'NetSideArea')).toEqual({
      name: 'NetSideArea',
      einheit: 'm²',
      anzahl: 3,
    });
    expect(arten.at(-1)).toEqual({ name: 'Stueck', einheit: 'St', anzahl: 3 });
  });
});

describe('positionenSuchen', () => {
  it('nach OZ (Anfang) und Kurztext (enthalten, ohne Groß/Klein), nur Positionen', () => {
    const ks = typischKnoten();
    expect(positionenSuchen(ks, '03.0010').map((p) => p.id)).toEqual([POS_03_0010]);
    expect(positionenSuchen(ks, 'innenwände').map((p) => p.id)).toEqual([POS_03_0010]);
    expect(positionenSuchen(ks, '').length).toBe(ks.filter((k) => k.art === 'position').length);
  });
});

describe('zuordnungsfaerbung und Liste der Zuordnungen', () => {
  it('ohne Zuordnung sind alle 30 Bauteile „ohne Zuordnung“; danach die drei Wände „zugeordnet“', () => {
    const ks = typischKnoten();
    const vorher = zuordnungsfaerbung(hausModell(), ks);
    expect(vorher.size).toBe(30);
    expect(new Set(vorher.values())).toEqual(new Set(['ohne-zuordnung']));
    const nachher = zuordnungsfaerbung(
      hausModell(),
      ks.map((k) => (k.id === POS_03_0010 ? { ...k, bauteile: IW_EG.map((g) => z(g, 'NetSideArea')) } : k)),
    );
    expect([...nachher].filter(([, f]) => f === 'zugeordnet').map(([g]) => g)).toEqual(IW_EG);
    expect(nachher.size).toBe(30);
  });

  it('zuordnungenDerPositionen: nur Positionen mit Zuordnungen, in LV-Reihenfolge', () => {
    const ks = typischKnoten().map((k) =>
      k.id === POS_03_0010 ? { ...k, bauteile: [z(IW_EG[0] ?? '', 'NetSideArea')] } : k,
    );
    expect(zuordnungenDerPositionen(ks).map((p) => p.id)).toEqual([POS_03_0010]);
  });
});
