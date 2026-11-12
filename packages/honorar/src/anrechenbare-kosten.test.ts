// SPDX-License-Identifier: AGPL-3.0-or-later
// Anrechenbare Kosten für Gebäude und Innenräume nach § 33 HOAI (Ticket 101, D-56). Die Sollwerte sind von Hand
// hergeleitet (C4): KG 300 voll (Abs. 1); KG 400, wenn der Auftragnehmer die Technischen Anlagen nicht selbst plant und
// überwacht, voll bis 25 % der sonstigen anrechenbaren Kosten (KG 300 plus Kosten nach Abs. 3) und zur Hälfte für den
// Teil darüber (Abs. 2); die mitzuverarbeitende Bausubstanz (§ 4 Abs. 3) kommt dazu. Jeder Teilbetrag auf 2 Stellen.

import type { Betrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { KostenNachDin276 } from './index';
import { anrechenbareKostenHerleiten } from './index';

const b = (wert: string): Betrag => wert as Betrag;

function angabe(teile: {
  kg300: string;
  kg400: string;
  weitereKosten?: string;
  mitzuverarbeitendeBausubstanz?: string;
  technischeAnlagenSelbstGeplant?: boolean;
}): KostenNachDin276 {
  return {
    art: 'din-276',
    kg300: b(teile.kg300),
    kg400: b(teile.kg400),
    technischeAnlagenSelbstGeplant: teile.technischeAnlagenSelbstGeplant ?? false,
    weitereKosten: b(teile.weitereKosten ?? '0.00'),
    mitzuverarbeitendeBausubstanz: b(teile.mitzuverarbeitendeBausubstanz ?? '0.00'),
  };
}

describe('anrechenbareKostenHerleiten (§ 33)', () => {
  it('KG 400 über 25 % der sonstigen anrechenbaren Kosten: beide Zweige des Abs. 2', () => {
    // sonstige = KG 300 612 345,67 + Abs. 3 18 000,00 = 630 345,67
    // Grenze = 25 % von 630 345,67 = 157 586,4175 → 157 586,42
    // KG 400 201 234,56: voll 157 586,42; darüber 201 234,56 − 157 586,42 = 43 648,14, zur Hälfte 21 824,07
    // anrechenbar = 630 345,67 + 157 586,42 + 21 824,07 + Bausubstanz 10 000,00 = 819 756,16
    expect(
      anrechenbareKostenHerleiten(
        angabe({
          kg300: '612345.67',
          kg400: '201234.56',
          weitereKosten: '18000.00',
          mitzuverarbeitendeBausubstanz: '10000.00',
        }),
      ),
    ).toEqual({
      kg300: '612345.67',
      weitereKosten: '18000.00',
      sonstigeAnrechenbareKosten: '630345.67',
      kg400: '201234.56',
      grenzeTechnischeAnlagen: '157586.42',
      kg400Voll: '157586.42',
      kg400Haelfte: '21824.07',
      mitzuverarbeitendeBausubstanz: '10000.00',
      anrechenbareKosten: '819756.16',
    });
  });

  it('KG 400 bis 25 %: voll anrechenbar, keine Hälfte', () => {
    // sonstige = 400 000,00; Grenze 100 000,00; KG 400 80 000,00 voll; anrechenbar 480 000,00
    const h = anrechenbareKostenHerleiten(angabe({ kg300: '400000.00', kg400: '80000.00' }));
    expect([h.grenzeTechnischeAnlagen, h.kg400Voll, h.kg400Haelfte, h.anrechenbareKosten]).toEqual([
      '100000.00',
      '80000.00',
      '0.00',
      '480000.00',
    ]);
  });

  it('KG 400 genau auf der Grenze: voll, keine Hälfte', () => {
    const h = anrechenbareKostenHerleiten(angabe({ kg300: '400000.00', kg400: '100000.00' }));
    expect([h.kg400Voll, h.kg400Haelfte, h.anrechenbareKosten]).toEqual(['100000.00', '0.00', '500000.00']);
  });

  it('rundet Grenze und Hälfte je für sich kaufmännisch auf 2 Stellen', () => {
    // KG 300 1 000,02: Grenze 250,005 → 250,01. KG 400 300,00: voll 250,01; darüber 49,99, zur Hälfte 24,995 → 25,00.
    // anrechenbar = 1 000,02 + 250,01 + 25,00 = 1 275,03
    const h = anrechenbareKostenHerleiten(angabe({ kg300: '1000.02', kg400: '300.00' }));
    expect([h.grenzeTechnischeAnlagen, h.kg400Voll, h.kg400Haelfte, h.anrechenbareKosten]).toEqual([
      '250.01',
      '250.01',
      '25.00',
      '1275.03',
    ]);
    // KG 300 100 000,00: Grenze 25 000,00; KG 400 25 000,01: darüber 0,01, zur Hälfte 0,005 → 0,01
    const k = anrechenbareKostenHerleiten(angabe({ kg300: '100000.00', kg400: '25000.01' }));
    expect([k.kg400Haelfte, k.anrechenbareKosten]).toEqual(['0.01', '125000.01']);
  });

  it('plant und überwacht der Auftragnehmer die Technischen Anlagen selbst, zählt KG 400 hier nicht', () => {
    const h = anrechenbareKostenHerleiten(
      angabe({ kg300: '500000.00', kg400: '200000.00', technischeAnlagenSelbstGeplant: true }),
    );
    expect([h.kg400Voll, h.kg400Haelfte, h.anrechenbareKosten]).toEqual(['0.00', '0.00', '500000.00']);
  });
});
