// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Honorarberechnung (Ticket 101, Q1). Das Orakel rechnet in ganzen Cent bzw. Hundertsteln (`bigint`),
// die kaufmännische Rundung hier von Hand (halbe Einheit vom Nullpunkt weg).

import type { Betrag, Prozent } from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Honorarberechnung, Honorarobjekt, Leistungsbild, Leistungsphasennummer } from './index';
import { LEISTUNGSBILDER, honorarBerechnen } from './index';

const runs = { numRuns: 200 };

function text(wert: bigint): string {
  const neg = wert < 0n;
  const abs = neg ? -wert : wert;
  return `${neg ? '-' : ''}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`;
}
const betrag = (cent: bigint): Betrag => text(cent) as Betrag;
const prozent = (hundertstel: bigint): Prozent => text(hundertstel) as Prozent;
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
/** round(wert × satz / 100, 2) mit wert in Cent und satz in Hundertsteln. */
const anteilVon = (wert: bigint, satz: bigint): bigint => rundeHalbAuf(wert * satz, 10_000n);

const LEISTUNGSBILD_LISTE = Object.keys(LEISTUNGSBILDER) as Leistungsbild[];

/** Ein Honorarobjekt mit anrechenbaren Kosten von Hand innerhalb der Tafel und allen Phasen mit den Sätzen der HOAI. */
const vollesObjektGen: fc.Arbitrary<Honorarobjekt> = fc
  .constantFrom(...LEISTUNGSBILD_LISTE)
  .chain((leistungsbild) => {
    const daten = LEISTUNGSBILDER[leistungsbild];
    const zeilen = daten.honorartafel.zeilen;
    const min = cent(zeilen[0]?.anrechenbareKosten ?? '0.00');
    const max = cent(zeilen[zeilen.length - 1]?.anrechenbareKosten ?? '0.00');
    return fc.record({
      bezeichnung: fc.constant(`Objekt ${leistungsbild}`),
      leistungsbild: fc.constant(leistungsbild),
      honorarzone: fc.constantFrom(...daten.honorartafel.honorarzonen),
      honorarsatz: fc.bigInt({ min: 0n, max: 10_000n }).map(prozent),
      anrechenbareKosten: fc
        .bigInt({ min, max })
        .map((c) => ({ art: 'von-hand' as const, betrag: betrag(c) })),
      leistungsphasen: fc.constant(daten.leistungsphasen.map((ph) => ({ nummer: ph.nummer }))),
      umbauzuschlagssatz: fc.option(fc.bigInt({ min: 0n, max: 5_000n }).map(prozent), { nil: null }),
    });
  });

/** Ein beliebiges Objekt: auch außerhalb der Tafel, mit Teilen der Phasen und abweichenden Anteilen. */
const objektGen: fc.Arbitrary<Honorarobjekt> = fc
  .tuple(
    vollesObjektGen,
    fc.option(fc.bigInt({ min: 0n, max: 10n ** 11n }), { freq: 4 }),
    fc.subarray([1, 2, 3, 4, 5, 6, 7, 8, 9] as Leistungsphasennummer[]),
    fc.option(fc.bigInt({ min: 0n, max: 5_000n }), { freq: 3 }),
  )
  .map(([objekt, kosten, nummern, anteil]) => ({
    ...objekt,
    ...(kosten === null ? {} : { anrechenbareKosten: { art: 'von-hand' as const, betrag: betrag(kosten) } }),
    leistungsphasen: nummern.map((nummer) =>
      anteil === null ? { nummer } : { nummer, anteil: prozent(anteil) },
    ),
  }));

const berechnungGen: fc.Arbitrary<Honorarberechnung> = fc.record({
  objekte: fc.array(objektGen, { maxLength: 4 }),
  nebenkosten: fc.oneof(
    fc.constant(null),
    fc.bigInt({ min: 0n, max: 1_500n }).map((s) => ({ art: 'prozent' as const, satz: prozent(s) })),
    fc.bigInt({ min: 0n, max: 10n ** 8n }).map((c) => ({ art: 'betrag' as const, betrag: betrag(c) })),
  ),
  mwstSatz: fc.constantFrom(0n, 700n, 1_900n).map(prozent),
});

describe('Eigenschaften der Honorarberechnung', () => {
  it('Summe der Phasen bei 100 % Anteil = Honorar bis auf Rundungsreste (höchstens 1 Cent je Phase)', () => {
    fc.assert(
      fc.property(vollesObjektGen, (objekt) => {
        const [o] = honorarBerechnen({ objekte: [objekt], nebenkosten: null, mwstSatz: prozent(0n) }).objekte;
        if (o?.honorar === null || o === undefined) throw new Error('kein Honorar');
        const rest = cent(o.grundhonorar) - cent(o.honorar);
        const phasen = BigInt(o.phasen.length);
        expect(rest <= phasen && rest >= -phasen).toBe(true);
        expect(o.phasen.map((ph) => ph.anteil)).toEqual(
          LEISTUNGSBILDER[objekt.leistungsbild].leistungsphasen.map((ph) => ph.anteil),
        );
      }),
      runs,
    );
  });

  it('jeder Phasenbetrag ist round(Honorar × Anteil / 100, 2), das Grundhonorar ihre Summe', () => {
    fc.assert(
      fc.property(objektGen, (objekt) => {
        const [o] = honorarBerechnen({ objekte: [objekt], nebenkosten: null, mwstSatz: prozent(0n) }).objekte;
        if (o === undefined) throw new Error('kein Ergebnis');
        if (o.honorar === null) {
          expect([o.phasen, o.grundhonorar, o.umbauzuschlag]).toEqual([[], '0.00', '0.00']);
          return;
        }
        const h = cent(o.honorar);
        for (const ph of o.phasen) expect(ph.betrag).toBe(text(anteilVon(h, cent(ph.anteil))));
        expect(o.grundhonorar).toBe(text(o.phasen.reduce((s, ph) => s + cent(ph.betrag), 0n)));
        const satz = objekt.umbauzuschlagssatz;
        expect(o.umbauzuschlag).toBe(text(satz === null ? 0n : anteilVon(cent(o.grundhonorar), cent(satz))));
      }),
      runs,
    );
  });

  it('die Summen folgen der Kette: Σ Objekte, Nebenkosten, Netto, MwSt, Brutto', () => {
    fc.assert(
      fc.property(berechnungGen, (berechnung) => {
        const e = honorarBerechnen(berechnung);
        const grund = e.objekte.reduce((s, o) => s + cent(o.grundhonorar), 0n);
        const umbau = e.objekte.reduce((s, o) => s + cent(o.umbauzuschlag), 0n);
        const nk = berechnung.nebenkosten;
        const nebenkosten =
          nk === null ? 0n : nk.art === 'betrag' ? cent(nk.betrag) : anteilVon(grund + umbau, cent(nk.satz));
        const netto = grund + umbau + nebenkosten;
        const mwst = anteilVon(netto, cent(berechnung.mwstSatz));
        expect([e.grundhonorar, e.umbauzuschlaege, e.nebenkosten, e.netto, e.mwst, e.brutto]).toEqual(
          [grund, umbau, nebenkosten, netto, mwst, netto + mwst].map(text),
        );
        expect(e.objekte).toHaveLength(berechnung.objekte.length);
        expect(e.befunde.some((x) => x.code === 'mehrere-objekte')).toBe(berechnung.objekte.length > 1);
      }),
      runs,
    );
  });

  it('ist deterministisch: gleiche Eingabe, gleiches Ergebnis', () => {
    fc.assert(
      fc.property(berechnungGen, (berechnung) => {
        expect(honorarBerechnen(berechnung)).toEqual(honorarBerechnen(berechnung));
      }),
      { numRuns: 50 },
    );
  });
});
