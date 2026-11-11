// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { kopfEingabe, kopfEntwurf } from './kopf';

describe('Blattkopf (Bezeichnung und Datum, D-83.6: die App fragt beides)', () => {
  it('Datum am Rand: TT.MM.JJJJ ↔ JJJJ-MM-TT; leer heißt keine Angabe; Bezeichnung ohne Ränder', () => {
    expect(kopfEingabe({ bezeichnung: ' Erdarbeiten ', datum: '2.11.2026' })).toEqual({
      ok: true,
      wert: { bezeichnung: 'Erdarbeiten', datum: '2026-11-02' },
    });
    expect(kopfEingabe({ bezeichnung: '', datum: ' ' })).toEqual({
      ok: true,
      wert: { bezeichnung: '', datum: null },
    });
    expect(kopfEntwurf({ bezeichnung: 'x', datum: '2026-11-02' })).toEqual({
      bezeichnung: 'x',
      datum: '02.11.2026',
    });
    expect(kopfEntwurf({ bezeichnung: '', datum: null })).toEqual({ bezeichnung: '', datum: '' });
  });

  it('ein Tag, den es nicht gibt, ist eine Meldung am Feld', () => {
    const r = kopfEingabe({ bezeichnung: 'x', datum: '31.02.2026' });
    expect(r.ok).toBe(false);
  });
});
