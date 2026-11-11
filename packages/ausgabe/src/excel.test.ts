// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { excelRuecklaufLesen, lvAlsExcel } from './index';
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
