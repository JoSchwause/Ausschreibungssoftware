// SPDX-License-Identifier: AGPL-3.0-or-later
// Preisspiegel-Rechnung (Ticket 36, Punkt 5). Golden-Beispiel aus dem Ticket mit Herleitung (C4: aus G-26, D-05, N2,
// N3, N5 hergeleitet, nicht beobachtet).

import { describe, expect, it } from 'vitest';
import type { AngebotZustand, Prozent } from '@tethys/vertrag';
import {
  PREISSPIEGEL_ANNAHMEN,
  angebotBefehlAusfuehrer,
  angebotChangeSetAnwenden,
  preisspiegelBerechnen,
} from './index';
import type { Angebot, LvZustand } from '@tethys/vertrag';
import {
  angebot,
  betrag,
  ep,
  erwarteOk,
  hinweis,
  lv,
  nichtAngeboten,
  position,
  projekt,
  prozent,
  titel,
} from './testhilfen';

function zustand(z: LvZustand, a: Angebot): AngebotZustand {
  const ausfuehren = angebotBefehlAusfuehrer(projekt([a.bieterId]), z);
  return angebotChangeSetAnwenden(
    null,
    erwarteOk(ausfuehren(null, { art: 'AngebotAnlegen', angebot: a })),
  ) as AngebotZustand;
}

// LV, MwSt 19,00 %, eine Gliederung, drei Normalpositionen: P1 10,000, P2 5,000, P3 2,000. Schätzpreise (EP im LV):
// 11,000 / 9,000 / 55,000 → GP 110,00 / 45,00 / 110,00 (N2), Netto 265,00.
const golden = lv('lv-g', [
  titel('t1', 'lv-g', 0),
  position('p1', 't1', 0, '10.000', '11.000'),
  hinweis('h1', 't1', 1),
  position('p2', 't1', 2, '5.000', '9.000'),
  position('p3', 't1', 3, '2.000', '55.000'),
]);
// A mit Nachlass 5,00 %, B ohne, C mit Nachlass 40,00 (Betrag).
const A = zustand(
  golden,
  angebot('a', golden, 'b-a', [ep('p1', '10.000'), ep('p2', '0.000'), ep('p3', '50.000')], prozent('5.00')),
);
const B = zustand(
  golden,
  angebot('b', golden, 'b-b', [ep('p1', '12.000'), ep('p2', '8.000'), nichtAngeboten('p3')]),
);
const C = zustand(
  golden,
  angebot('c', golden, 'b-c', [ep('p1', '15.000'), ep('p2', '10.000'), ep('p3', '70.000')], betrag('40.00')),
);

describe('preisspiegelBerechnen: Golden-Beispiel', () => {
  const ps = preisspiegelBerechnen(golden, [A, B, C]);

  it('Zeilen: nur Positionen, in Dokumentreihenfolge, mit Menge, Summenzugehörigkeit und Schätzpreis', () => {
    expect(ps.zeilen.map((z) => z.positionId)).toEqual(['p1', 'p2', 'p3']);
    expect(ps.zeilen.map((z) => [z.menge, z.gehtInSummeEin])).toEqual([
      ['10.000', true],
      ['5.000', true],
      ['2.000', true],
    ]);
    expect(ps.zeilen.map((z) => z.schaetzpreis)).toEqual([
      { einheitspreis: '11.000', gesamtpreis: '110.00', zuschlag: null },
      { einheitspreis: '9.000', gesamtpreis: '45.00', zuschlag: null },
      { einheitspreis: '55.000', gesamtpreis: '110.00', zuschlag: null },
    ]);
  });

  it('P1: n = 3, Σ = 37, Mittel 37/3 = 12,333… → 12,333, GP 123,33; C Ausreißer hoch ((45 − 37)·100 = 800 > 740), A nicht (700 ≤ 740)', () => {
    const [p1] = ps.zeilen;
    expect(p1?.bieter).toEqual([
      {
        angebotId: 'a',
        kennzeichen: 'angeboten',
        einheitspreis: '10.000',
        gesamtpreis: '100.00',
        ausreisser: null,
        zuschlag: null,
      },
      {
        angebotId: 'b',
        kennzeichen: 'angeboten',
        einheitspreis: '12.000',
        gesamtpreis: '120.00',
        ausreisser: null,
        zuschlag: null,
      },
      {
        angebotId: 'c',
        kennzeichen: 'angeboten',
        einheitspreis: '15.000',
        gesamtpreis: '150.00',
        ausreisser: 'hoch',
        zuschlag: null,
      },
    ]);
    expect(p1?.min).toEqual({ einheitspreis: '10.000', gesamtpreis: '100.00', angebotIds: ['a'] });
    expect(p1?.mittel).toEqual({
      einheitspreis: '12.333',
      gesamtpreis: '123.33',
      angebotIds: ['a', 'b', 'c'],
    });
    expect(p1?.max).toEqual({ einheitspreis: '15.000', gesamtpreis: '150.00', angebotIds: ['c'] });
  });

  it('P2: A Nullpreis (eigenes Kennzeichen, nie Ausreißer, nicht im Mittel); n = 2, Σ = 18, Mittel 9,000; |2·8 − 18|·100 = 200 ≤ 360', () => {
    const p2 = ps.zeilen[1];
    expect(p2?.bieter.map((b) => [b.kennzeichen, b.gesamtpreis, b.ausreisser])).toEqual([
      ['nullpreis', '0.00', null],
      ['angeboten', '40.00', null],
      ['angeboten', '50.00', null],
    ]);
    expect(p2?.min).toEqual({ einheitspreis: '8.000', gesamtpreis: '40.00', angebotIds: ['b'] });
    expect(p2?.mittel).toEqual({ einheitspreis: '9.000', gesamtpreis: '45.00', angebotIds: ['b', 'c'] });
    expect(p2?.max).toEqual({ einheitspreis: '10.000', gesamtpreis: '50.00', angebotIds: ['c'] });
  });

  it('P3: B nicht angeboten (kein EP, kein GP); n = 2, Σ = 120, Mittel 60,000, GP 120,00; A: 2.000 ≤ 2.400', () => {
    const p3 = ps.zeilen[2];
    expect(p3?.bieter[1]).toEqual({
      angebotId: 'b',
      kennzeichen: 'nicht-angeboten',
      einheitspreis: null,
      gesamtpreis: null,
      ausreisser: null,
      zuschlag: null,
    });
    expect(p3?.bieter.map((b) => b.ausreisser)).toEqual([null, null, null]);
    expect(p3?.min).toEqual({ einheitspreis: '50.000', gesamtpreis: '100.00', angebotIds: ['a'] });
    expect(p3?.mittel).toEqual({ einheitspreis: '60.000', gesamtpreis: '120.00', angebotIds: ['a', 'c'] });
    expect(p3?.max).toEqual({ einheitspreis: '70.000', gesamtpreis: '140.00', angebotIds: ['c'] });
  });

  it('Bietersummen (N2, N5) und Rang: B 1 (160,00), A 2 (190,00), C 3 (300,00); B hat eine nicht angebotene Position', () => {
    expect(ps.bietersummen).toEqual([
      {
        angebotId: 'a',
        bieterId: 'b-a',
        gesamt: {
          netto: '200.00',
          nachlass: '10.00',
          nettoNachNachlass: '190.00',
          mwst: '36.10',
          brutto: '226.10',
          summeBedarfOhneGesamtbetrag: '0.00',
          summeWahl: '0.00',
        },
        nichtAngeboten: 0,
        rang: 2,
      },
      {
        angebotId: 'b',
        bieterId: 'b-b',
        gesamt: {
          netto: '160.00',
          nachlass: '0.00',
          nettoNachNachlass: '160.00',
          mwst: '30.40',
          brutto: '190.40',
          summeBedarfOhneGesamtbetrag: '0.00',
          summeWahl: '0.00',
        },
        nichtAngeboten: 1,
        rang: 1,
      },
      {
        angebotId: 'c',
        bieterId: 'b-c',
        gesamt: {
          netto: '340.00',
          nachlass: '40.00',
          nettoNachNachlass: '300.00',
          mwst: '57.00',
          brutto: '357.00',
          summeBedarfOhneGesamtbetrag: '0.00',
          summeWahl: '0.00',
        },
        nichtAngeboten: 0,
        rang: 3,
      },
    ]);
  });

  it('Gliederungen: Summe je Angebot', () => {
    expect(ps.gliederungen).toEqual([
      {
        gliederungId: 't1',
        summen: [
          { angebotId: 'a', summe: '200.00' },
          { angebotId: 'b', summe: '160.00' },
          { angebotId: 'c', summe: '340.00' },
        ],
      },
    ]);
  });

  it('virtuelle Netto: Mittel 123,33 + 45,00 + 120,00 = 288,33; Min 240,00; Max 340,00; Schätzpreis 265,00', () => {
    expect(ps.virtuelleSummen).toEqual({
      min: '240.00',
      mittel: '288.33',
      max: '340.00',
      schaetzpreis: '265.00',
    });
  });

  it('ABC (Bezug Mittel, gesamt 288,33): P1 A (davor 0); P3 A (12.333 < 23.066,4); P2 B (24.333 ≥ 23.066,4, < 27.391,35)', () => {
    expect(ps.zeilen.map((z) => z.abcKlasse)).toEqual(['A', 'B', 'A']);
  });
});

describe('preisspiegelBerechnen: Einstellungen und Grenzfälle', () => {
  it('Schwelle 25 %: P1/C ist kein Ausreißer mehr (800 ≤ 25 · 37 = 925)', () => {
    const ps = preisspiegelBerechnen(golden, [A, B, C], { ausreisserSchwelle: '25.00' as Prozent });
    expect(ps.zeilen[0]?.bieter.map((b) => b.ausreisser)).toEqual([null, null, null]);
  });

  it('Ausreißer niedrig: (Σ − n·EP)·100 > Schwelle·Σ', () => {
    const z = lv('lv-n', [position('p1', 'lv-n', 0, '1.000')]);
    const ps = preisspiegelBerechnen(z, [
      zustand(z, angebot('a', z, 'x', [ep('p1', '7.000')])),
      zustand(z, angebot('b', z, 'y', [ep('p1', '10.000')])),
      zustand(z, angebot('c', z, 'w', [ep('p1', '10.000')])),
    ]);
    // n = 3, Σ = 27: a (27 − 21)·100 = 600 > 540 → niedrig; b (30 − 27)·100 = 300 ≤ 540.
    expect(ps.zeilen[0]?.bieter.map((b) => b.ausreisser)).toEqual(['niedrig', null, null]);
    expect(ps.zeilen[0]?.max.angebotIds).toEqual(['b', 'c']);
  });

  it('nur ein Bieter mit EP > 0 → keine Ausreißer; Min = Mittel = Max', () => {
    const z = lv('lv-1', [position('p1', 'lv-1', 0, '1.000')]);
    const ps = preisspiegelBerechnen(z, [
      zustand(z, angebot('a', z, 'x', [ep('p1', '100.000')])),
      zustand(z, angebot('b', z, 'y', [ep('p1', '0.000')])),
      zustand(z, angebot('c', z, 'w', [ep('p1', '-5.000')])),
    ]);
    const [zeile] = ps.zeilen;
    expect(zeile?.bieter.map((b) => [b.kennzeichen, b.ausreisser])).toEqual([
      ['angeboten', null],
      ['nullpreis', null],
      ['angeboten', null],
    ]);
    expect(zeile?.mittel).toEqual({ einheitspreis: '100.000', gesamtpreis: '100.00', angebotIds: ['a'] });
    expect(zeile?.min).toEqual(zeile?.mittel);
  });

  it('alle 0,00 → Min, Mittel, Max null; keine ABC-Klasse ohne GP > 0', () => {
    const z = lv('lv-0', [position('p1', 'lv-0', 0, '1.000')]);
    const ps = preisspiegelBerechnen(z, [
      zustand(z, angebot('a', z, 'x', [ep('p1', '0.000')])),
      zustand(z, angebot('b', z, 'y', [ep('p1', '0.000')])),
    ]);
    const leer = { einheitspreis: null, gesamtpreis: null, angebotIds: [] };
    expect(ps.zeilen[0]).toMatchObject({ min: leer, mittel: leer, max: leer, abcKlasse: null });
    expect(ps.virtuelleSummen.mittel).toBe('0.00');
  });

  it('ohne Menge: GP der virtuellen Bieter null; Wahlposition geht nicht ein und hat keine ABC-Klasse', () => {
    const z = lv('lv-m', [
      position('p1', 'lv-m', 0, null, '1.000'),
      position('p2', 'lv-m', 1, '1.000', '1.000', {
        wahl: { gruppe: null, variante: null, grundpositionId: null },
      }),
      position('p3', 'lv-m', 2, '1.000', '1.000'),
    ]);
    const ps = preisspiegelBerechnen(z, [
      zustand(z, angebot('a', z, 'x', [ep('p1', '2.000'), ep('p2', '2.000'), ep('p3', '2.000')])),
    ]);
    expect(ps.zeilen[0]?.mittel).toEqual({ einheitspreis: '2.000', gesamtpreis: null, angebotIds: ['a'] });
    expect(ps.zeilen[1]?.gehtInSummeEin).toBe(false);
    expect(ps.zeilen.map((r) => r.abcKlasse)).toEqual([null, null, 'A']);
    expect(ps.virtuelleSummen.mittel).toBe('2.00');
  });

  it('gleiche Netto nach Nachlass → gleicher Rang (1, 1, 3)', () => {
    const z = lv('lv-r', [position('p1', 'lv-r', 0, '1.000')]);
    const ps = preisspiegelBerechnen(z, [
      zustand(z, angebot('a', z, 'x', [ep('p1', '5.000')])),
      zustand(z, angebot('b', z, 'y', [ep('p1', '9.000')])),
      zustand(z, angebot('c', z, 'w', [ep('p1', '10.000')], betrag('5.00'))),
    ]);
    expect(ps.bietersummen.map((s) => s.rang)).toEqual([1, 3, 1]);
  });

  it('ABC mit Bezug Schätzpreis', () => {
    const ps = preisspiegelBerechnen(golden, [A, B, C], { abcBezug: 'schaetzpreis' });
    // Schätzpreis-GP 110 / 45 / 110, gesamt 265: P1 davor 0 → A; P3 davor 110 (11.000 < 21.200) → A;
    // P2 davor 220 (22.000 ≥ 21.200, < 95 · 265 = 25.175) → B.
    expect(ps.zeilen.map((r) => r.abcKlasse)).toEqual(['A', 'B', 'A']);
  });

  it('Annahmen stehen benannt an einer Stelle', () => {
    expect(Object.keys(PREISSPIEGEL_ANNAHMEN).length).toBeGreaterThan(5);
    expect(ps0().einstellungen).toEqual({
      ausreisserSchwelle: '20.00',
      abcSchwelleA: '80.00',
      abcSchwelleB: '95.00',
      abcBezug: 'mittel',
    });
  });
});

const ps0 = () => preisspiegelBerechnen(golden, []);
