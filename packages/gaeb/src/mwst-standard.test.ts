// SPDX-License-Identifier: AGPL-3.0-or-later
// MwSt-Standard beim Lesen (Ticket 25, Punkt 4, E-19): X81/X83 tragen keinen Satz. Ohne Satz des Aufrufers setzt der
// Leser 19,00 % und meldet das als Warnung; mit Satz bleibt es bei dessen Wert.

import { describe, expect, it } from 'vitest';
import type { Prozent } from '@tethys/vertrag';
import { leseGaeb } from './index';
import { TEST_MWST, lesePfad, testIds } from './testhilfen';

const BAU_X83 = 'fixtures/extern/bvbs/3.3-bauausfuehrung/Pruefdatei_3.3_Bauausfuehrung_V-04-04-2024.x83';
const mwstBefunde = (l: ReturnType<typeof leseGaeb>) => l.befunde.filter((b) => b.ort.feld === 'mwstSatz');

describe('MwSt-Standard des Lesers', () => {
  it('ohne Satz: 19,00 % und genau ein Befund (Warnung, stabiler Code)', () => {
    const l = leseGaeb(lesePfad(BAU_X83), { ids: testIds(), dateiname: 'x.x83' });
    expect(l.inhalt?.mwstSatz).toBe('19.00');
    const b = mwstBefunde(l);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ schwere: 'warnung', quelle: 'gaeb-lesen', code: 'mwst-standardsatz' });
    expect(b[0]?.meldung).toContain('19,00 %');
    expect(b[0]?.werte).toEqual({ satz: { art: 'prozent', wert: '19.00' } });
  });

  it('mit Satz: dessen Wert, kein Befund zum Standardsatz', () => {
    const l = leseGaeb(lesePfad(BAU_X83), {
      ids: testIds(),
      dateiname: 'x.x83',
      standardMwstSatz: '7.00' as Prozent,
    });
    expect(l.inhalt?.mwstSatz).toBe('7.00');
    expect(l.befunde.map((b) => b.code)).not.toContain('mwst-standardsatz');
  });

  it('mit Satz bleibt der Befund mwst-ersatzwert wie bisher', () => {
    const l = leseGaeb(lesePfad(BAU_X83), {
      ids: testIds(),
      dateiname: 'x.x83',
      standardMwstSatz: TEST_MWST,
    });
    expect(mwstBefunde(l).map((b) => b.code)).toEqual(['mwst-ersatzwert']);
  });
});
