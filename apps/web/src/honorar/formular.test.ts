// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Honorarobjekt, KostenermittlungId, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  HONORARSATZ_VORGABEN,
  formularAus,
  kopfAus,
  kopfFormularAus,
  leistungsbildWechseln,
  neuesObjekt,
  objektAus,
  vorgabeZu,
} from './formular';

const verweis: Honorarobjekt = {
  bezeichnung: 'Bürogebäude',
  leistungsbild: 'gebaeude',
  honorarzone: 'III',
  honorarsatz: '50.00' as Prozent,
  anrechenbareKosten: {
    art: 'kostenermittlung',
    kostenermittlungId: 'k1' as KostenermittlungId,
    technischeAnlagenAnteilig: true,
    weitereKosten: '12345.68' as never,
    mitzuverarbeitendeBausubstanz: '49390.00' as never,
  },
  leistungsphasen: [{ nummer: 1 }, { nummer: 2, anteil: '9.00' as Prozent }, { nummer: 5 }],
  umbauzuschlagssatz: '25.00' as Prozent,
};

describe('Honorarobjekt und Formular', () => {
  it('Hin und zurück ergibt dasselbe Objekt (Verweis auf eine Kostenermittlung, Anteil, Umbau)', () => {
    const f = formularAus(verweis);
    expect(f.honorarsatz).toBe('50,00');
    expect(f.weitereKosten).toBe('12.345,68');
    expect(f.phasen.find((p) => p.nummer === 2)).toEqual({ nummer: 2, beauftragt: true, anteil: '9,00' });
    expect(f.phasen.find((p) => p.nummer === 3)?.beauftragt).toBe(false);
    const r = objektAus(f);
    expect(r.ok && r.wert).toEqual(verweis);
  });

  it('Betrag von Hand: de-DE gelesen, Standard-Honorarsatz 0, alle Phasen beauftragt', () => {
    const n = neuesObjekt('Neu');
    expect(n.honorarsatz).toBe('0.00');
    expect(n.leistungsphasen).toHaveLength(9);
    const f = { ...formularAus(n), betrag: '1.234.567,89', honorarsatz: '37,5' };
    const r = objektAus(f);
    expect(r.ok && r.wert.anrechenbareKosten).toEqual({ art: 'betrag', betrag: '1234567.89' });
    expect(r.ok && r.wert.honorarsatz).toBe('37.50');
  });

  it('ein unlesbares Feld ist ein Feldfehler mit dem Namen des Feldes; kein Objekt', () => {
    const f = formularAus(neuesObjekt('Neu'));
    const a = objektAus({ ...f, betrag: 'abc' });
    expect(a.ok ? null : a.fehler.feld).toBe('betrag');
    const b = objektAus({ ...f, honorarsatz: '1,234' });
    expect(b.ok ? null : b.fehler.feld).toBe('honorarsatz');
    const c = objektAus({ ...f, bezeichnung: '  ' });
    expect(c.ok ? null : c.fehler.feld).toBe('bezeichnung');
    const d = objektAus({ ...formularAus(verweis), kostenermittlungId: '' });
    expect(d.ok ? null : d.fehler.feld).toBe('kostenermittlung');
    const e = objektAus({
      ...f,
      phasen: f.phasen.map((p) => (p.nummer === 3 ? { ...p, anteil: 'x' } : p)),
    });
    expect(e.ok ? null : e.fehler.feld).toBe('anteil3');
  });

  it('Honorarsatz außerhalb 0 bis 100 und Umbau ohne Vorschlag bleiben Eingabe (Befund der Rechnung, U5)', () => {
    const r = objektAus({ ...formularAus(neuesObjekt('N')), honorarsatz: '120,00', umbau: true });
    expect(r.ok && r.wert.honorarsatz).toBe('120.00');
    expect(r.ok && r.wert.umbauzuschlagssatz).toBe('20.00');
  });

  it('Leistungsbildwechsel: Tragwerksplanung hat nur LPH 1–6, die Zone bleibt in der Tafel, § 33 fällt weg', () => {
    const f = formularAus(verweis);
    const t = leistungsbildWechseln(f, 'tragwerksplanung');
    expect(t.phasen.map((p) => p.nummer)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(t.phasen.find((p) => p.nummer === 2)?.anteil).toBe('9,00');
    expect(t.kostenart).toBe('betrag');
    const ta = leistungsbildWechseln({ ...f, honorarzone: 'V' }, 'technische-ausruestung');
    expect(ta.honorarzone).toBe('III');
    expect(leistungsbildWechseln(f, 'gebaeude')).toBe(f);
  });

  it('Vorgaben: Basis 0, Viertel 25, Mittel 50, Dreiviertel 75, oberer 100; sonst frei', () => {
    expect(HONORARSATZ_VORGABEN.map((v) => [v.satz, v.name])).toEqual([
      ['0.00', 'Basishonorarsatz'],
      ['25.00', 'Viertelsatz'],
      ['50.00', 'Mittelsatz'],
      ['75.00', 'Dreiviertelsatz'],
      ['100.00', 'Oberer Honorarsatz'],
    ]);
    expect(vorgabeZu('50,00')).toBe('50.00');
    expect(vorgabeZu('50')).toBe('50.00');
    expect(vorgabeZu('37,5')).toBe('frei');
    expect(vorgabeZu('abc')).toBe('frei');
  });
});

describe('Nebenkosten und MwSt', () => {
  it('Prozent, Betrag, keine; MwSt gelesen', () => {
    const p = kopfAus(kopfFormularAus('A', { art: 'prozent', satz: '4.50' as Prozent }, '19.00' as Prozent));
    expect(p.ok && p.wert).toEqual({
      name: 'A',
      nebenkosten: { art: 'prozent', satz: '4.50' },
      mwstSatz: '19.00',
    });
    const b = kopfAus({ name: 'A', nebenArt: 'betrag', nebenWert: '1.000,00', mwstSatz: '7' });
    expect(b.ok && b.wert.nebenkosten).toEqual({ art: 'betrag', betrag: '1000.00' });
    const k = kopfAus({ name: 'A', nebenArt: 'keine', nebenWert: 'egal', mwstSatz: '19' });
    expect(k.ok && k.wert.nebenkosten).toBeNull();
    const f = kopfAus({ name: 'A', nebenArt: 'prozent', nebenWert: 'x', mwstSatz: '19' });
    expect(f.ok ? null : f.fehler.feld).toBe('nebenkosten');
    const n = kopfAus({ name: ' ', nebenArt: 'keine', nebenWert: '', mwstSatz: '19' });
    expect(n.ok ? null : n.fehler.feld).toBe('name');
  });
});
