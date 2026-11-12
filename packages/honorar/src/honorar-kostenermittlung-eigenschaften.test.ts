// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der anrechenbaren Kosten aus einer Kostenermittlung (Ticket 110, Q1). Orakel: KG 300 und KG 400 in ganzen
// Cent (`bigint`) als Summe der Einträge 300 bis 399 bzw. 400 bis 499; der Verweis rechnet wie die Beträge nach DIN 276.

import type {
  Betrag,
  Honorarobjekt,
  Kostenermittlung,
  KostenermittlungId,
  Kostengruppennummer,
  Kostenermittlungsstufe,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Honorarberechnungseingabe } from './index';
import { honorarBerechnen } from './index';

const runs = { numRuns: 200 };

function text(cent: bigint): string {
  const neg = cent < 0n;
  const abs = neg ? -cent : cent;
  return `${neg ? '-' : ''}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`;
}
const b = (cent: bigint): Betrag => text(cent) as Betrag;
const p = (wert: string): Prozent => wert as Prozent;
const ID = '019b7a12-c000-7000-8000-0000000000e1' as KostenermittlungId;

/** Einträge mit eindeutigen Nummern 100 bis 999 und Beträgen bis 2 Mio. €, in beliebiger Reihenfolge. */
const eintraegeGen = fc
  .uniqueArray(fc.integer({ min: 100, max: 999 }), { maxLength: 25 })
  .chain((nummern) =>
    fc.tuple(
      fc.constant(nummern),
      fc.array(fc.bigInt({ min: 0n, max: 200_000_000n }), {
        minLength: nummern.length,
        maxLength: nummern.length,
      }),
    ),
  )
  .map(([nummern, cents]) => nummern.map((n, i) => ({ nummer: n, cent: cents[i] ?? 0n })));

const stufeGen = fc.constantFrom<Kostenermittlungsstufe>(
  'kostenrahmen',
  'kostenschaetzung',
  'kostenberechnung',
  'kostenanschlag',
  'kostenfeststellung',
);

function objekt(anrechenbareKosten: Honorarobjekt['anrechenbareKosten']): Honorarobjekt {
  return {
    bezeichnung: 'Gebäude',
    leistungsbild: 'gebaeude',
    honorarzone: 'III',
    honorarsatz: p('50.00'),
    anrechenbareKosten,
    leistungsphasen: [{ nummer: 1 }, { nummer: 5 }, { nummer: 8 }],
    umbauzuschlagssatz: p('20.00'),
  };
}

describe('Eigenschaften: anrechenbare Kosten aus einer Kostenermittlung', () => {
  it('rechnet wie die Beträge nach DIN 276 mit KG 300 = Σ 3xx und KG 400 = Σ 4xx (Befund zur Stufe ausgenommen)', () => {
    fc.assert(
      fc.property(
        eintraegeGen,
        stufeGen,
        fc.boolean(),
        fc.bigInt({ min: 0n, max: 10_000_000n }),
        fc.bigInt({ min: 0n, max: 10_000_000n }),
        (eintraege, stufe, anteilig, weitere, bausubstanz) => {
          const kostenermittlung: Kostenermittlung = {
            id: ID,
            projektId: '019b7a12-a000-7000-8000-0000000000e1' as ProjektId,
            stufe,
            name: 'Kostenermittlung',
            eintraege: eintraege.map((e) => ({
              nummer: String(e.nummer) as Kostengruppennummer,
              betrag: b(e.cent),
            })),
          };
          const summe = (von: number): bigint =>
            eintraege.filter((e) => e.nummer >= von && e.nummer < von + 100).reduce((s, e) => s + e.cent, 0n);
          const rest = { nebenkosten: { art: 'prozent' as const, satz: p('4.50') }, mwstSatz: p('19.00') };
          const verweis: Honorarberechnungseingabe = {
            objekte: [
              objekt({
                art: 'kostenermittlung',
                kostenermittlungId: ID,
                technischeAnlagenAnteilig: anteilig,
                weitereKosten: b(weitere),
                mitzuverarbeitendeBausubstanz: b(bausubstanz),
              }),
            ],
            ...rest,
          };
          const betraege: Honorarberechnungseingabe = {
            objekte: [
              {
                ...objekt({ art: 'betrag', betrag: b(0n) }),
                anrechenbareKosten: {
                  art: 'din-276',
                  kg300: b(summe(300)),
                  kg400: b(summe(400)),
                  technischeAnlagenAnteilig: anteilig,
                  weitereKosten: b(weitere),
                  mitzuverarbeitendeBausubstanz: b(bausubstanz),
                },
              },
            ],
            ...rest,
          };
          const aus = honorarBerechnen(verweis, [kostenermittlung]);
          const soll = honorarBerechnen(betraege);
          expect(aus.befunde.filter((x) => x.code !== 'kostenermittlungsstufe-abweichend')).toEqual(
            soll.befunde,
          );
          expect({ ...aus, befunde: [] }).toEqual({ ...soll, befunde: [] });
          expect(aus.befunde.some((x) => x.code === 'kostenermittlungsstufe-abweichend')).toBe(
            stufe !== 'kostenberechnung' && stufe !== 'kostenschaetzung',
          );
        },
      ),
      runs,
    );
  });
});
