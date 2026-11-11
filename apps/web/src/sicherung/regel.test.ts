// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { ERINNERUNG_SCHWELLE_TAGE, erinnerungPruefen } from './regel';

const TAG = 24 * 60 * 60 * 1000;
const JETZT = Date.UTC(2026, 10, 20, 12);

describe('Export-Erinnerung (G-03)', () => {
  it('erinnert, wenn der letzte Export länger als die Schwelle zurückliegt und es seitdem Befehle gab', () => {
    const letzter = JETZT - (ERINNERUNG_SCHWELLE_TAGE + 1) * TAG;
    const r = erinnerungPruefen({ jetzt: JETZT, letzterExport: letzter, befehlszeiten: [letzter + TAG] });
    expect(r).toEqual({ faellig: true, tage: ERINNERUNG_SCHWELLE_TAGE + 1 });
  });

  it('erinnert nicht, solange die Schwelle nicht überschritten ist (genau die Schwelle zählt noch nicht)', () => {
    const letzter = JETZT - ERINNERUNG_SCHWELLE_TAGE * TAG;
    expect(erinnerungPruefen({ jetzt: JETZT, letzterExport: letzter, befehlszeiten: [JETZT] }).faellig).toBe(
      false,
    );
  });

  it('erinnert nicht, wenn es seit dem Export keinen Befehl gab', () => {
    const letzter = JETZT - 30 * TAG;
    const r = erinnerungPruefen({
      jetzt: JETZT,
      letzterExport: letzter,
      befehlszeiten: [letzter - TAG, letzter],
    });
    expect(r.faellig).toBe(false);
  });

  it('ohne bisherigen Export zählt der erste Befehl als Bezugspunkt', () => {
    const erster = JETZT - 10 * TAG;
    expect(
      erinnerungPruefen({ jetzt: JETZT, letzterExport: null, befehlszeiten: [JETZT - TAG, erster] }),
    ).toEqual({ faellig: true, tage: 10 });
    expect(
      erinnerungPruefen({ jetzt: JETZT, letzterExport: null, befehlszeiten: [JETZT - 2 * TAG] }).faellig,
    ).toBe(false);
  });

  it('ohne Befehle und ohne Export gibt es nichts zu sichern', () => {
    expect(erinnerungPruefen({ jetzt: JETZT, letzterExport: null, befehlszeiten: [] }).faellig).toBe(false);
  });
});
