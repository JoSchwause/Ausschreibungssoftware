// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { ozMaskeLesen, ozMaskeText } from './ozmaske';

describe('OZ-Maske als Text', () => {
  it('NN.NN.NNNN[I]: zwei Gliederungsstufen, Position vierstellig, ein Indexzeichen', () => {
    const r = ozMaskeLesen('NN.NN.NNNN[I]');
    expect(r).toEqual({
      ok: true,
      wert: {
        gliederung: [
          { laenge: 2, zeichen: 'numerisch' },
          { laenge: 2, zeichen: 'numerisch' },
        ],
        position: { laenge: 4, zeichen: 'numerisch' },
        index: { laenge: 1, zeichen: 'alphanumerisch' },
        trennzeichen: '.',
      },
    });
  });

  it('alphanumerische Stufe und Maske ohne Index', () => {
    const r = ozMaskeLesen(' aa.nnn ');
    expect(r.ok && r.wert.gliederung).toEqual([{ laenge: 2, zeichen: 'alphanumerisch' }]);
    expect(r.ok && r.wert.index).toBe(null);
  });

  it.each(['', 'NN..NNNN', 'NX.NNNN', 'NA.NNNN', 'NN.NNNN[I]x'])('%j ist keine Maske', (text) => {
    expect(ozMaskeLesen(text).ok).toBe(false);
  });

  it('Text → Maske → Text ist dasselbe', () => {
    for (const t of ['NN.NN.NNNN[I]', 'AA.NNN', 'NNNN']) {
      const r = ozMaskeLesen(t);
      expect(r.ok && ozMaskeText(r.wert)).toBe(t);
    }
  });
});
