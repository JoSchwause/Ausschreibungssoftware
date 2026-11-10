// SPDX-License-Identifier: AGPL-3.0-or-later
// Bietersummen (Ticket 36, Punkt 2): Golden-Beispiel aus dem Ticket und Sollwerte von `fixtures/typisch-angebote.json`.

import { describe, expect, it } from 'vitest';
import { angebotSummenBerechnen } from './index';
import {
  angebot,
  angebotAusFixture,
  angebotsset,
  betrag,
  ep,
  lv,
  lvAusFixture,
  nichtAngeboten,
  position,
  prozent,
  titel,
} from './testhilfen';

// LV MwSt 19 %, ein Titel, P1 10,000 / P2 5,000 / P3 2,000 (Golden-Beispiel des Tickets).
const golden = lv('lv-g', [
  titel('t1', 'lv-g', 0),
  position('p1', 't1', 0, '10.000', '11.000'),
  position('p2', 't1', 1, '5.000', '9.000'),
  position('p3', 't1', 2, '2.000', '55.000'),
]);

describe('angebotSummenBerechnen', () => {
  it('Golden A: GP 100,00 / 0,00 / 100,00; Netto 200,00; 5 % Nachlass = 10,00; MwSt 36,10; Brutto 226,10', () => {
    const a = angebot(
      'a',
      golden,
      'b-a',
      [ep('p1', '10.000'), ep('p2', '0.000'), ep('p3', '50.000')],
      prozent('5.00'),
    );
    const s = angebotSummenBerechnen(golden, a);
    expect(s.positionen.map((p) => p.gesamtpreis)).toEqual(['100.00', '0.00', '100.00']);
    expect(s.gesamt).toEqual({
      netto: '200.00',
      nachlass: '10.00',
      nettoNachNachlass: '190.00',
      mwst: '36.10',
      brutto: '226.10',
    });
    expect(s.gliederungen).toEqual([{ gliederungId: 't1', summe: '200.00' }]);
  });

  it('Golden B: nicht angeboten ist kein Preis 0,00 (kein GP, geht nicht ein); Brutto 190,40', () => {
    const b = angebot('b', golden, 'b-b', [ep('p1', '12.000'), ep('p2', '8.000'), nichtAngeboten('p3')]);
    const s = angebotSummenBerechnen(golden, b);
    expect(s.positionen[2]).toEqual({ positionId: 'p3', gesamtpreis: null, gehtInSummeEin: false });
    expect(s.gesamt.netto).toBe('160.00');
    expect(s.gesamt.mwst).toBe('30.40');
    expect(s.gesamt.brutto).toBe('190.40');
  });

  it('Golden C: Nachlass als Betrag 40,00; Netto 340,00 → 300,00; Brutto 357,00', () => {
    const c = angebot(
      'c',
      golden,
      'b-c',
      [ep('p1', '15.000'), ep('p2', '10.000'), ep('p3', '70.000')],
      betrag('40.00'),
    );
    const s = angebotSummenBerechnen(golden, c);
    expect(s.gesamt).toEqual({
      netto: '340.00',
      nachlass: '40.00',
      nettoNachNachlass: '300.00',
      mwst: '57.00',
      brutto: '357.00',
    });
  });

  it('kein Eintrag im Angebot gilt wie nicht angeboten; der Nachlass des LV wird nicht geerbt', () => {
    const mitNachlass = lv('lv-n', [position('p1', 'lv-n', 0, '1.000', '5.000')], '19.00', prozent('10.00'));
    const s = angebotSummenBerechnen(mitNachlass, angebot('a', mitNachlass, 'b', []));
    expect(s.positionen).toEqual([{ positionId: 'p1', gesamtpreis: null, gehtInSummeEin: false }]);
    expect(s.gesamt.nachlass).toBe('0.00');
  });

  it('Wahl- und Bedarfspositionen ohne Gesamtbetrag gehen wie im Kern nicht ein', () => {
    const z = lv('lv-w', [
      position('p1', 'lv-w', 0, '1.000', null),
      position('p2', 'lv-w', 1, '1.000', null, {
        wahl: { gruppe: null, variante: null, grundpositionId: null },
      }),
      position('p3', 'lv-w', 2, '1.000', null, { bedarf: 'ohne-gesamtbetrag' }),
    ]);
    const s = angebotSummenBerechnen(
      z,
      angebot('a', z, 'b', [ep('p1', '1.000'), ep('p2', '2.000'), ep('p3', '4.000')]),
    );
    expect(s.positionen.map((p) => [p.gesamtpreis, p.gehtInSummeEin])).toEqual([
      ['1.00', true],
      ['2.00', false],
      ['4.00', false],
    ]);
    expect(s.gesamt.netto).toBe('1.00');
  });
});

describe('Bietersummen von fixtures/typisch-angebote.json', () => {
  const { zustand } = lvAusFixture('typisch');
  const set = angebotsset();

  for (const fx of set.angebote) {
    it(`Angebot ${fx.id}: GP, Titel, Netto bis Brutto wie in der Datei`, () => {
      const s = angebotSummenBerechnen(zustand, angebotAusFixture(fx, zustand));
      for (const p of s.positionen) {
        const soll = fx.sollwerte.positionen[p.positionId];
        expect({ gp: p.gesamtpreis, inSumme: p.gehtInSummeEin }).toEqual(
          soll ?? { gp: null, inSumme: false },
        );
      }
      for (const g of s.gliederungen) {
        expect(g.summe).toBe(fx.sollwerte.titel[g.gliederungId]?.summe);
      }
      expect({
        netto: s.gesamt.netto,
        nachlass: s.gesamt.nachlass,
        nettoNachNachlass: s.gesamt.nettoNachNachlass,
        mwst: s.gesamt.mwst,
        brutto: s.gesamt.brutto,
      }).toEqual(fx.sollwerte.summen);
      const nichtAngebotenIds = s.positionen.filter((p) => p.gesamtpreis === null).map((p) => p.positionId);
      expect(nichtAngebotenIds.sort()).toEqual([...fx.sollwerte.nichtAngeboten].sort());
    });
  }
});
