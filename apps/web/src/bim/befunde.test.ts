// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Pruefbefund } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befundliste, befundzusammenfassung, geometriebefunde } from './befunde';
import { bauteil, gid, knoten, modell } from './testhilfen';

const b = (code: string, schwere: Pruefbefund['schwere'], globalId?: string): Pruefbefund => ({
  code,
  schwere,
  quelle: 'ifc-lesen',
  meldung: `${code} ${globalId ?? ''}`,
  ort: globalId === undefined ? {} : { globalId: gid(globalId) },
});

describe('Befunde des Einlesens und der 3D-Ansicht', () => {
  it('Bauteile ohne Geometrie aus dem Ladebericht der 3D-Ansicht; ein Ganzes mit Teilen zählt nicht', () => {
    const m = modell(
      [knoten('P', 'projekt', null)],
      [
        bauteil('A', 'P'),
        bauteil('B', 'P'),
        bauteil('Treppe', 'P'),
        bauteil('Lauf', 'P', { teilVon: 'Treppe' }),
      ],
    );
    const f = geometriebefunde(m, {
      mitGeometrie: [gid('A'), gid('Lauf')],
      ohneGeometrie: [gid('B')],
      dauerMs: 1,
    });
    expect(f.map((x) => [x.code, x.ort.globalId])).toEqual([['bauteil-ohne-geometrie', gid('B')]]);
  });

  it('Liste: Fehler vor Warnungen, sonst in der gemeldeten Reihenfolge; mit Sprungziel, wenn eine GlobalId genannt ist', () => {
    const l = befundliste([
      b('globalid-doppelt', 'warnung', 'X'),
      b('menge-ohne-wert', 'fehler', 'Y'),
      b('w', 'warnung'),
    ]);
    expect(l.map((x) => [x.befund.code, x.globalId])).toEqual([
      ['menge-ohne-wert', gid('Y')],
      ['globalid-doppelt', gid('X')],
      ['w', null],
    ]);
  });

  it('Zusammenfassung in Worten', () => {
    expect(befundzusammenfassung([])).toBe('Keine Befunde.');
    expect(befundzusammenfassung([b('a', 'fehler'), b('b', 'warnung'), b('c', 'warnung')])).toBe(
      '1 Fehler, 2 Warnungen',
    );
    expect(befundzusammenfassung([b('b', 'warnung')])).toBe('1 Warnung');
  });
});
