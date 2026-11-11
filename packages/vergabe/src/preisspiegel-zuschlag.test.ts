// SPDX-License-Identifier: AGPL-3.0-or-later
// Preisspiegel mit Zuschlagspositionen (Ticket 44, Punkt 3). Golden mit Herleitung (C4: aus D-03, D-05, G-26, N2).
// Für eine Zuschlagsposition zeigt jede Bieterspalte Satz, Basis und Betrag; Min, Mittel, Max und Ausreißer rechnen
// über die Beträge (nur Beträge > 0, D-05).

import { describe, expect, it } from 'vitest';
import type { Angebot, AngebotZustand, LvZustand } from '@tethys/vertrag';
import { angebotBefehlAusfuehrer, angebotChangeSetAnwenden, preisspiegelBerechnen } from './index';
import {
  angebot,
  ep,
  erwarteOk,
  liste,
  lv,
  nichtAngeboten,
  position,
  projekt,
  satz,
  titel,
  zuschlagsposition,
} from './testhilfen';

function zustand(z: LvZustand, a: Angebot): AngebotZustand {
  const ausfuehren = angebotBefehlAusfuehrer(projekt([a.bieterId]), z);
  return angebotChangeSetAnwenden(
    null,
    erwarteOk(ausfuehren(null, { art: 'AngebotAnlegen', angebot: a })),
  ) as AngebotZustand;
}

// LV MwSt 19 %: t1 mit p1 10,000 (Schätz-EP 9,000) und p2 20,000 (19,000), dahinter z1 (Gliederung, Satz im LV 5,00 %);
// t2 mit z2 (Liste auf p2, ohne Satz im LV). Schätzpreis z1: Basis 90,00 + 380,00 = 470,00, 5 % = 23,50; z2: kein Satz.
const lvZ = lv('lv-ps', [
  titel('t1', 'lv-ps', 0),
  position('p1', 't1', 0, '10.000', '9.000'),
  position('p2', 't1', 1, '20.000', '19.000'),
  zuschlagsposition('z1', 't1', 2, { art: 'gliederung' }, '5.00'),
  titel('t2', 'lv-ps', 1),
  zuschlagsposition('z2', 't2', 0, liste('p2')),
]);

// A: z1 10 % auf 500,00 = 50,00; z2 7,5 % auf 400,00 = 30,00. Netto 580,00.
// B: z1 Satz 0,00 → Betrag 0,00 (Nullpreis); z2 30,00. Netto 530,00.
// C: z1 15 % = 75,00; z2 angeboten ohne Satz (EP 5,000 ist kein Satz) → zuschlagssatz-fehlt. Netto 575,00.
// D: p1 nicht angeboten → Basis z1 nur 400,00, 10 % = 40,00 (basis-unvollstaendig); z2 10 % auf 400,00 = 40,00. Netto 480,00.
const preise = { p1: ep('p1', '10.000'), p2: ep('p2', '20.000') };
const A = zustand(
  lvZ,
  angebot('a', lvZ, 'b-a', [preise.p1, preise.p2, satz('z1', '10.00'), satz('z2', '7.50')]),
);
const B = zustand(
  lvZ,
  angebot('b', lvZ, 'b-b', [preise.p1, preise.p2, satz('z1', '0.00'), satz('z2', '7.50')]),
);
const C = zustand(
  lvZ,
  angebot('c', lvZ, 'b-c', [preise.p1, preise.p2, satz('z1', '15.00'), ep('z2', '5.000')]),
);
const D = zustand(
  lvZ,
  angebot('d', lvZ, 'b-d', [nichtAngeboten('p1'), preise.p2, satz('z1', '10.00'), satz('z2', '10.00')]),
);

describe('Preisspiegel: Zuschlagszeilen', () => {
  const ps = preisspiegelBerechnen(lvZ, [A, B, C, D]);
  const zeile = (id: string) => ps.zeilen.find((z) => z.positionId === id);

  it('jede Bieterspalte zeigt Satz, Basis und Betrag; Kennzeichen nullpreis, zuschlagssatz-fehlt, basis-unvollstaendig', () => {
    const z1 = zeile('z1');
    expect(z1?.zuschlagsposition).toBe(true);
    expect(
      z1?.bieter.map((b) => [b.kennzeichen, b.zuschlag?.satz, b.zuschlag?.basis, b.gesamtpreis]),
    ).toEqual([
      ['angeboten', '10.00', '500.00', '50.00'],
      ['nullpreis', '0.00', '500.00', '0.00'],
      ['angeboten', '15.00', '500.00', '75.00'],
      ['angeboten', '10.00', '400.00', '40.00'],
    ]);
    expect(z1?.bieter.map((b) => b.zuschlag?.basisUnvollstaendig)).toEqual([false, false, false, true]);
    expect(z1?.bieter.every((b) => b.einheitspreis === null)).toBe(true);
    expect(zeile('z2')?.bieter[2]).toMatchObject({
      kennzeichen: 'zuschlagssatz-fehlt',
      einheitspreis: null,
      gesamtpreis: null,
      ausreisser: null,
      zuschlag: { satz: null, basis: '400.00', basisUnvollstaendig: false },
    });
    expect(zeile('p1')?.zuschlagsposition).toBe(false);
    expect(zeile('p1')?.bieter[0]?.zuschlag).toBeNull();
  });

  it('Min, Mittel, Max über die Beträge > 0 (D-05): z1 ohne den Nullpreis von B', () => {
    // z1: bepreist A 50,00, C 75,00, D 40,00; n = 3, Σ = 165,00, Mittel 55,00.
    const z1 = zeile('z1');
    expect(z1?.min).toEqual({ einheitspreis: null, gesamtpreis: '40.00', angebotIds: ['d'] });
    expect(z1?.mittel).toEqual({ einheitspreis: null, gesamtpreis: '55.00', angebotIds: ['a', 'c', 'd'] });
    expect(z1?.max).toEqual({ einheitspreis: null, gesamtpreis: '75.00', angebotIds: ['c'] });
    // z2: A 30,00, B 30,00, D 40,00 (C fehlt); Σ = 100,00, Mittel 100 / 3 = 33,333… → 33,33.
    expect(zeile('z2')?.mittel.gesamtpreis).toBe('33.33');
    expect(zeile('z2')?.min).toEqual({ einheitspreis: null, gesamtpreis: '30.00', angebotIds: ['a', 'b'] });
  });

  it('Ausreißer über die Beträge, Schwelle 20 %; Nullpreis und fehlender Satz nie', () => {
    // z1: C (3 · 75 − 165) · 100 = 6.000 > 20 · 165 = 3.300 → hoch; D (165 − 120) · 100 = 4.500 > 3.300 → niedrig;
    // A (165 − 150) · 100 = 1.500 → nein. z2: D (120 − 100) · 100 = 2.000, nicht größer als 20 · 100 = 2.000 → nein.
    expect(zeile('z1')?.bieter.map((b) => b.ausreisser)).toEqual([null, null, 'hoch', 'niedrig']);
    expect(zeile('z2')?.bieter.map((b) => b.ausreisser)).toEqual([null, null, null, null]);
    // Schwelle 40 %: 6.000 > 6.600? nein; 4.500 > 6.600? nein.
    const weit = preisspiegelBerechnen(lvZ, [A, B, C, D], { ausreisserSchwelle: '40.00' as never });
    expect(weit.zeilen.find((z) => z.positionId === 'z1')?.bieter.map((b) => b.ausreisser)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });

  it('unter zwei bepreisten Bietern keine Markierung', () => {
    const ps2 = preisspiegelBerechnen(lvZ, [A, B]);
    expect(ps2.zeilen.find((z) => z.positionId === 'z1')?.bieter.map((b) => b.ausreisser)).toEqual([
      null,
      null,
    ]);
  });

  it('Schätzpreis rechnet mit dem Satz des LV, sonst „kein Satz“', () => {
    expect(zeile('z1')?.schaetzpreis).toEqual({
      einheitspreis: null,
      gesamtpreis: '23.50',
      zuschlag: { satz: '5.00', basis: '470.00', basisUnvollstaendig: false },
    });
    expect(zeile('z2')?.schaetzpreis).toEqual({
      einheitspreis: null,
      gesamtpreis: null,
      zuschlag: { satz: null, basis: '380.00', basisUnvollstaendig: false },
    });
  });

  it('Rang über das Netto nach Nachlass einschließlich der Zuschlagsbeträge; fehlender Satz zählt als nicht angeboten', () => {
    expect(ps.bietersummen.map((s) => [s.angebotId, s.gesamt.netto, s.rang, s.nichtAngeboten])).toEqual([
      ['a', '580.00', 4, 0],
      ['b', '530.00', 2, 0],
      ['c', '575.00', 3, 1],
      ['d', '480.00', 1, 1],
    ]);
    // Virtuelle Netto (ohne Nachlass): Mittel p1 10 × 10,000 = 100,00 + p2 400,00 + z1 55,00 + z2 33,33 = 588,33.
    expect(ps.virtuelleSummen.mittel).toBe('588.33');
    // Schätzpreis: 90,00 + 380,00 + 23,50 = 493,50 (z2 ohne Satz trägt nichts bei).
    expect(ps.virtuelleSummen.schaetzpreis).toBe('493.50');
  });
});
