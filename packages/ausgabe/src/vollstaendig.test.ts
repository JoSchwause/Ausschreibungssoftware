// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type { ElternId, Knoten, LvZustand, Position } from '@tethys/vertrag';
import { erzeugePdf } from './index';
import { alsText, liesPdf } from './pdftext';
import { schriftenAusDateien } from './schriften-node';
import { fixtureAlsInhalt, lvZustandAusFixture, lvZustandAusInhalt } from './testhilfen';

const schriften = schriftenAusDateien();

describe('Nichts geht verloren (Q5)', () => {
  const zeilen400 = Array.from({ length: 400 }, (_, i) => `Langtextzeile ${String(i + 1)}`).join('\n');

  /** Winzig-LV, dessen einzige Position den langen Langtext trägt; mit oder ohne Titel darüber. */
  function mitLangtext(mitTitel: boolean): LvZustand {
    const { fx } = lvZustandAusFixture('winzig');
    const inhalt = fixtureAlsInhalt(fx);
    const titel = inhalt.knoten.find((k) => k.art === 'titel');
    const pos = inhalt.knoten.find((k) => k.art === 'position');
    if (titel?.art !== 'titel' || pos?.art !== 'position') throw new Error('Fixture ohne Titel/Position');
    const lang: Position = {
      ...pos,
      elternId: mitTitel ? titel.id : (fx.id as ElternId),
      reihenfolge: 0,
      langtext: [{ art: 'text', text: zeilen400 }],
    };
    const knoten: Knoten[] = mitTitel ? [titel, lang] : [lang];
    return lvZustandAusInhalt(fx.id, { ...inhalt, knoten });
  }

  it.each([true, false])('PDF: Langtext von 400 Zeilen vollständig (Titel darüber: %s)', async (mitTitel) => {
    const text = alsText(await liesPdf(await erzeugePdf(mitLangtext(mitTitel), schriften)));
    expect(new Set(text.match(/Langtextzeile \d+/g)).size).toBe(400);
  });
});

describe('Klammern um den GP', () => {
  it('druckt keine leeren Klammern, wenn eine Position keinen GP hat und nicht in die Summen eingeht', async () => {
    const { fx } = lvZustandAusFixture('winzig');
    const inhalt = fixtureAlsInhalt(fx);
    const knoten = inhalt.knoten.map((k): Knoten => (k.art === 'position' ? { ...k, menge: null } : k));
    const zustand = lvZustandAusInhalt(fx.id, { ...inhalt, knoten });
    expect(zustand.summen.positionen.some((p) => p.gesamtpreis === null && !p.gehtInSummeEin)).toBe(true);
    expect(alsText(await liesPdf(await erzeugePdf(zustand, schriften)))).not.toContain('()');
  });
});
