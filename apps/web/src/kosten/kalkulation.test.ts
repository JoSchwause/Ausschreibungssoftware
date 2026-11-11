// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 89, C4: Formular → Kalkulation → Befehle. Erwartungen von Hand (D-39: Einzelkosten ungerundet, Anteil kaufmännisch
// auf 3 Stellen, EP = Σ der Anteile).
//   Lohn:   0,450 h × 48,500 €/h = 21,825; Zuschlag 10 %  → 24,0075 → 24,008
//   Stoffe: 2,000 × 6,250        = 12,500; Zuschlag 5 %   → 13,125
//   EP = 24,008 + 13,125 = 37,133

import type { PositionId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { LEERES_FORMULAR, kalkulationBefehle, kalkulationRechnen, type Kalkulationsformular } from './kalkulation';

const form: Kalkulationsformular = {
  zeilen: [
    { art: 'lohn', bezeichnung: 'Maurer', ansatzmenge: '0,450', kostensatz: '48,50' },
    { art: 'stoffe', bezeichnung: 'Stein', ansatzmenge: '2', kostensatz: '6,25' },
  ],
  saetze: { lohn: '10', stoffe: '5' },
  freiBezeichnung: '',
};

describe('kalkulationRechnen', () => {
  it('rechnet EP und Anteile nach D-39', () => {
    const l = kalkulationRechnen(form, false);
    expect(l.fehler).toEqual([]);
    expect(l.ergebnis.anteile.lohn).toBe('24.008');
    expect(l.ergebnis.anteile.stoffe).toBe('13.125');
    expect(l.ergebnis.anteile.geraete).toBeNull();
    expect(l.ergebnis.einheitspreis).toBe('37.133');
    expect(l.ergebnis.befunde).toEqual([]);
  });

  it('ein unlesbarer Wert ist ein Feldfehler am Feld, die Zeile zählt dann nicht', () => {
    const l = kalkulationRechnen(
      { ...form, zeilen: [{ art: 'lohn', bezeichnung: '', ansatzmenge: 'x', kostensatz: '48,50' }] },
      false,
    );
    expect(l.fehler).toEqual([
      { ort: 'zeile', zeile: 0, feld: 'ansatzmenge', meldung: expect.stringMatching(/Menge/) as string },
    ]);
    expect(l.ergebnis.einheitspreis).toBeNull();
    expect(l.ergebnis.befunde.map((b) => b.code)).toEqual(['wert-fehlt']);
  });

  it('ein unlesbarer Zuschlagssatz ist ein Feldfehler und zählt als 0 %', () => {
    const l = kalkulationRechnen({ ...form, saetze: { lohn: 'zehn' } }, false);
    expect(l.fehler).toMatchObject([{ ort: 'satz', art: 'lohn' }]);
    expect(l.ergebnis.anteile.lohn).toBe('21.825');
  });

  it('eine ganz leere Zeile zählt nicht und erzeugt keinen Befund', () => {
    const l = kalkulationRechnen(LEERES_FORMULAR, false);
    expect(l.fehler).toEqual([]);
    expect(l.ergebnis.befunde).toEqual([]);
    expect(l.ergebnis.einheitspreis).toBeNull();
  });

  it('die freie Bezeichnung geht in die Anteile; mit epaBezeichnungen am LV nicht (D-28)', () => {
    const f: Kalkulationsformular = {
      zeilen: [{ art: 'frei', bezeichnung: 'Sperrfrist', ansatzmenge: '1', kostensatz: '3' }],
      saetze: {},
      freiBezeichnung: ' Verschiedenes ',
    };
    expect(kalkulationRechnen(f, false).ergebnis.anteile.freiBezeichnung).toBe('Verschiedenes');
    expect(kalkulationRechnen(f, true).ergebnis.anteile.freiBezeichnung).toBeNull();
  });
});

describe('kalkulationBefehle', () => {
  const id = 'p1' as PositionId;

  it('Anteile und EP als zwei Befehle in dieser Reihenfolge', () => {
    const l = kalkulationRechnen(form, false);
    const b = kalkulationBefehle(id, l.ergebnis);
    expect(b?.map((x) => x.art)).toEqual(['EinheitspreisanteileSetzen', 'EinheitspreisAendern']);
    expect(b?.[0]).toMatchObject({ positionId: 'p1', epa: { lohn: '24.008', stoffe: '13.125' } });
    expect(b?.[1]).toEqual({ art: 'EinheitspreisAendern', positionId: 'p1', einheitspreis: '37.133' });
  });

  it('ohne EP gibt es nichts zu übernehmen', () => {
    expect(kalkulationBefehle(id, kalkulationRechnen(LEERES_FORMULAR, false).ergebnis)).toBeNull();
  });
});
