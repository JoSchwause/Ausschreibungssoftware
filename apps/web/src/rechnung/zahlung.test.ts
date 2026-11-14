// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 152 (A5): das Formular einer Zahlung (Datum, Betrag) und die Befehle daraus.

import type { Betrag, Kalenderdatum, Zahlung, ZahlungId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { zahlungBefehl, zahlungEntwurf, zahlungLesen } from './zahlung';

const z: Zahlung = {
  id: 'z1' as ZahlungId,
  datum: '2026-11-13' as Kalenderdatum,
  betrag: '7316.94' as Betrag,
};

describe('Zahlung im Formular', () => {
  it('liest Datum und Betrag (de-DE); neu wird ZahlungErfassen mit neuer Kennung, sonst ZahlungAendern', () => {
    const w = zahlungLesen({ datum: '13.11.2026', betrag: '7.316,94' });
    expect(w).toEqual({ ok: true, wert: { datum: '2026-11-13', betrag: '7316.94' } });
    if (!w.ok) return;
    expect(zahlungBefehl(null, () => 'z9' as ZahlungId, w.wert)).toEqual({
      art: 'ZahlungErfassen',
      zahlung: { id: 'z9', datum: '2026-11-13', betrag: '7316.94' },
    });
    expect(zahlungBefehl(z, () => 'z9' as ZahlungId, { ...w.wert, betrag: '5000.00' as Betrag })).toEqual({
      art: 'ZahlungAendern',
      zahlung: { id: 'z1', datum: '2026-11-13', betrag: '5000.00' },
    });
    expect(zahlungEntwurf(z)).toEqual({ datum: '13.11.2026', betrag: '7.316,94' });
  });

  it('meldet fehlendes oder unlesbares Datum und einen Betrag ≤ 0,00 am Feld', () => {
    const felder = (datum: string, betrag: string): string[] => {
      const r = zahlungLesen({ datum, betrag });
      return r.ok ? [] : r.fehler.map((f) => f.feld);
    };
    expect(felder('', '')).toEqual(['datum', 'betrag']);
    expect(felder('31.11.2026', '10')).toEqual(['datum']);
    expect(felder('30.11.2026', '0,00')).toEqual(['betrag']);
    expect(felder('30.11.2026', '-5')).toEqual(['betrag']);
  });
});
