// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der anrechenbaren Kosten nach § 33 (Ticket 101, Q1). Das Orakel rechnet in ganzen Cent (`bigint`), die
// kaufmännische Rundung hier von Hand (halbe Einheit vom Nullpunkt weg).

import type { Betrag } from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { KostenNachDin276 } from './index';
import { anrechenbareKostenHerleiten } from './index';

const runs = { numRuns: 300 };

function betrag(cent: bigint): Betrag {
  const neg = cent < 0n;
  const abs = neg ? -cent : cent;
  return `${neg ? '-' : ''}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}` as Betrag;
}
function cent(wert: string): bigint {
  const neg = wert.startsWith('-');
  const [vor = '0', nach = '00'] = (neg ? wert.slice(1) : wert).split('.');
  const c = BigInt(vor) * 100n + BigInt(nach);
  return neg ? -c : c;
}
function rundeHalbAuf(zaehler: bigint, nenner: bigint): bigint {
  const neg = zaehler < 0n;
  const abs = neg ? -zaehler : zaehler;
  const q = (2n * abs + nenner) / (2n * nenner);
  return neg ? -q : q;
}

interface Teile {
  readonly kg300: bigint;
  readonly kg400: bigint;
  readonly weitere: bigint;
  readonly bausubstanz: bigint;
  readonly selbst: boolean;
}
const cent0 = fc.oneof(fc.bigInt({ min: 0n, max: 10n ** 10n }), fc.bigInt({ min: 0n, max: 10_000n }));
const teileGen: fc.Arbitrary<Teile> = fc.record({
  kg300: cent0,
  kg400: cent0,
  weitere: fc.oneof(fc.constant(0n), cent0),
  bausubstanz: fc.oneof(fc.constant(0n), cent0),
  selbst: fc.boolean(),
});

function angabe(t: Teile): KostenNachDin276 {
  return {
    art: 'din-276',
    kg300: betrag(t.kg300),
    kg400: betrag(t.kg400),
    technischeAnlagenSelbstGeplant: t.selbst,
    weitereKosten: betrag(t.weitere),
    mitzuverarbeitendeBausubstanz: betrag(t.bausubstanz),
  };
}

describe('Eigenschaften der anrechenbaren Kosten (§ 33)', () => {
  it('folgt § 33 Abs. 1 und 2 mit Rundung jedes Teilbetrags', () => {
    fc.assert(
      fc.property(teileGen, (t) => {
        const sonstige = t.kg300 + t.weitere;
        const grenze = rundeHalbAuf(sonstige * 25n, 100n);
        const voll = t.selbst ? 0n : t.kg400 > grenze ? grenze : t.kg400;
        const haelfte = !t.selbst && t.kg400 > grenze ? rundeHalbAuf(t.kg400 - grenze, 2n) : 0n;
        const h = anrechenbareKostenHerleiten(angabe(t));
        expect(h).toEqual({
          kg300: betrag(t.kg300),
          weitereKosten: betrag(t.weitere),
          sonstigeAnrechenbareKosten: betrag(sonstige),
          kg400: betrag(t.kg400),
          grenzeTechnischeAnlagen: betrag(grenze),
          kg400Voll: betrag(voll),
          kg400Haelfte: betrag(haelfte),
          mitzuverarbeitendeBausubstanz: betrag(t.bausubstanz),
          anrechenbareKosten: betrag(sonstige + voll + haelfte + t.bausubstanz),
        });
      }),
      runs,
    );
  });

  it('mehr KG 400 ergibt nie weniger anrechenbare Kosten', () => {
    fc.assert(
      fc.property(teileGen, cent0, (t, mehr) => {
        const vorher = cent(anrechenbareKostenHerleiten(angabe(t)).anrechenbareKosten);
        const nachher = cent(
          anrechenbareKostenHerleiten(angabe({ ...t, kg400: t.kg400 + mehr })).anrechenbareKosten,
        );
        expect(nachher >= vorher).toBe(true);
      }),
      runs,
    );
  });

  it('von KG 400 zählt höchstens alles und mindestens der Teil bis zur Grenze', () => {
    fc.assert(
      fc.property(teileGen, (t) => {
        const h = anrechenbareKostenHerleiten(angabe({ ...t, selbst: false }));
        const gezaehlt = cent(h.kg400Voll) + cent(h.kg400Haelfte);
        const grenze = cent(h.grenzeTechnischeAnlagen);
        expect(gezaehlt <= t.kg400).toBe(true);
        expect(gezaehlt >= (t.kg400 < grenze ? t.kg400 : grenze)).toBe(true);
      }),
      runs,
    );
  });

  it('plant der Auftragnehmer die Technischen Anlagen selbst, hängen die anrechenbaren Kosten nicht von KG 400 ab', () => {
    fc.assert(
      fc.property(teileGen, cent0, (t, anderes) => {
        const a = anrechenbareKostenHerleiten(angabe({ ...t, selbst: true }));
        const c = anrechenbareKostenHerleiten(angabe({ ...t, selbst: true, kg400: anderes }));
        expect(a.anrechenbareKosten).toBe(c.anrechenbareKosten);
        expect(cent(a.anrechenbareKosten)).toBe(t.kg300 + t.weitere + t.bausubstanz);
      }),
      runs,
    );
  });
});
