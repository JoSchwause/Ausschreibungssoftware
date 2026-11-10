// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.1b: Langtext mit neuen Bausteinen wird beim Schreiben laut abgewiesen, nicht ungeprüft abgelegt (Q5).

import { describe, expect, it } from 'vitest';
import type { ElternId, HinweistextId, Hinweistext, Langtext } from '@tethys/vertrag';
import { knotenZuBindung } from './zeilen';

const hinweis = (text: Langtext): Hinweistext => ({
  art: 'hinweis',
  id: 'h1' as HinweistextId,
  elternId: 'lv' as ElternId,
  reihenfolge: 0,
  text,
});

describe('Langtext beim Schreiben (v1.1b)', () => {
  it('Text und Bild wie vor v1.1b werden geschrieben', () => {
    const lt: Langtext = [
      { art: 'text', text: 'a' },
      { art: 'bild', bild: { id: 'b' as never, medientyp: 'image/png', daten: 'AA==' } },
    ];
    expect(() => knotenZuBindung('lv', hinweis(lt))).not.toThrow();
  });

  it.each<[string, Langtext]>([
    ['Auszeichnung', [{ art: 'text', text: 'a', fett: true }]],
    ['Zeilenumbruch', [{ art: 'umbruch' }]],
    ['Absatz', [{ art: 'absatz', inhalt: [] }]],
    ['Liste', [{ art: 'liste', geordnet: false, punkte: [] }]],
    ['Tabelle', [{ art: 'tabelle', zeilen: [] }]],
    [
      'Textergänzung',
      [
        {
          art: 'ergaenzung',
          herkunft: 'bieter',
          kennung: '1',
          leer: true,
          davor: [],
          inhalt: [],
          danach: [],
        },
      ],
    ],
  ])('%s wird abgewiesen', (_n, lt) => {
    expect(() => knotenZuBindung('lv', hinweis(lt))).toThrow(/Langtext/);
  });
});
