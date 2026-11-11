// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  BEZEICHNUNGEN_SCHLUESSEL,
  bezeichnungenAusCsv,
  bezeichnungenGemerkt,
  bezeichnungenMerken,
} from './bezeichnungen';

function ablage() {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const kaputt = {
  getItem: () => {
    throw new Error('gesperrt');
  },
  setItem: () => {
    throw new Error('gesperrt');
  },
  removeItem: () => {
    throw new Error('gesperrt');
  },
};

describe('Bezeichnungen der Kostengruppen', () => {
  it('merkt den CSV-Text und vergisst ihn wieder', () => {
    const a = ablage();
    expect(bezeichnungenGemerkt(a)).toBeNull();
    expect(bezeichnungenMerken('330;Wände', a)).toBe(true);
    expect(a.m.get(BEZEICHNUNGEN_SCHLUESSEL)).toBe('330;Wände');
    expect(bezeichnungenGemerkt(a)).toBe('330;Wände');
    expect(bezeichnungenMerken(null, a)).toBe(true);
    expect(bezeichnungenGemerkt(a)).toBeNull();
  });

  it('ein gesperrter oder fehlender Browserspeicher bricht nichts ab', () => {
    expect(bezeichnungenGemerkt(kaputt)).toBeNull();
    expect(bezeichnungenMerken('x', kaputt)).toBe(false);
    expect(bezeichnungenGemerkt(null)).toBeNull();
    expect(bezeichnungenMerken('x', null)).toBe(false);
  });

  it('liest Nummer und Bezeichnung aus der CSV; ohne CSV bleibt die Zuordnung leer', () => {
    const m = bezeichnungenAusCsv('Nummer;Bezeichnung\n330;Außenwände\n340;Innenwände\nkaputt;x\n');
    expect([...m]).toEqual([
      ['330', 'Außenwände'],
      ['340', 'Innenwände'],
    ]);
    expect(bezeichnungenAusCsv(null).size).toBe(0);
  });
});
