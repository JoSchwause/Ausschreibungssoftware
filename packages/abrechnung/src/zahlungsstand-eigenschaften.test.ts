// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests des Zahlungsstands (Ticket 143, Q1; D-72, D-128.4, D-128.5, D-128.8, D-93):
// - Rundung: Skonto und Bauabzugsteuer sind kaufmännisch auf 2 Stellen gerundet, unabhängig in Cent (BigInt) nachgerechnet;
//   jeder Fall geht auf: Zahlbetrag = Skonto + Steuer + Auszahlung.
// - Nichtnegativität: Bei einem Zahlbetrag ≥ 0 sind Skonto, Steuer und beide Auszahlungen ≥ 0, und `offen` ist genau dann
//   negativ, wenn mehr gezahlt wurde als die geltende Auszahlung (dann und nur dann mit Befund); ohne Zahlungen ist
//   `offen` = geltende Auszahlung ≥ 0.
// - Offen = Auszahlung − Σ Zahlungen; verwirklicht nur mit möglichem Skonto > 0 und Zahlungen bis Fristende ≥ Auszahlung mit
//   Skonto.
// - Eine Zahlung nach dem Fristende verwirklicht nie den Skonto.

import fc from 'fast-check';
import type { Betrag, Kalenderdatum, Prozent, Rechnung, ZahlungId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { m4Stand } from './testhilfen';
import { plusKalendertage, zahlungsstandBerechnen } from './zahlungsstand';

const basis: Rechnung = { ...m4Stand().ar1 };

const alsText = (cent: bigint): string => {
  const b = cent < 0n ? -cent : cent;
  const s = b.toString().padStart(3, '0');
  return `${cent < 0n ? '-' : ''}${s.slice(0, -2)}.${s.slice(-2)}`;
};
const alsCent = (t: string): bigint => {
  const n = BigInt(t.replace('-', '').replace('.', ''));
  return t.startsWith('-') ? -n : n;
};
/** round(cent × satz / 100, 2) mit Satz in Hundertstel Prozent, kaufmännisch, Basis ≥ 0. */
const anteil = (cent: bigint, satzHundertstel: bigint): bigint => (cent * satzHundertstel + 5000n) / 10000n;

const tag = fc
  .tuple(fc.integer({ min: 2024, max: 2030 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
  .map(([j, m, t]) => `${String(j)}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`);

const eingabe = fc.record({
  zahlbetrag: fc.bigInt({ min: -100_000n, max: 5_000_000_00n }),
  skonto: fc.option(
    fc.record({ satz: fc.bigInt({ min: 1n, max: 9_999n }), fristTage: fc.integer({ min: 1, max: 365 }) }),
    { nil: undefined },
  ),
  eingang: fc.option(tag, { nil: null }),
  steuer: fc.boolean(),
  zahlungen: fc.array(fc.record({ datum: tag, cent: fc.bigInt({ min: 1n, max: 3_000_000_00n }) }), {
    maxLength: 4,
  }),
});

type Eingabe = typeof eingabe extends fc.Arbitrary<infer T> ? T : never;

function rechnungAus(e: Eingabe): Rechnung {
  return {
    ...basis,
    eingang: e.eingang,
    ...(e.skonto === undefined
      ? {}
      : { skonto: { satz: alsText(e.skonto.satz) as Prozent, fristTage: e.skonto.fristTage } }),
    ...(e.steuer ? { bauabzugsteuer: true as const } : {}),
    ...(e.zahlungen.length === 0
      ? {}
      : {
          zahlungen: e.zahlungen.map((z, i) => ({
            id: `z${String(i)}` as ZahlungId,
            datum: z.datum as Kalenderdatum,
            betrag: alsText(z.cent) as Betrag,
          })),
        }),
  };
}

describe('zahlungsstandBerechnen: Eigenschaften', () => {
  it('Rundung: Skonto und Steuer kaufmännisch in Cent nachgerechnet; jeder Fall geht auf den Cent auf', () => {
    fc.assert(
      fc.property(eingabe, (e) => {
        const z = e.zahlbetrag;
        const { zahlungsstand: s } = zahlungsstandBerechnen(rechnungAus(e), alsText(z) as Betrag);
        const mitFrist = e.skonto !== undefined && e.eingang !== null;
        const skonto = mitFrist && z > 0n && e.skonto ? anteil(z, e.skonto.satz) : 0n;
        const steuer = (b: bigint) => (e.steuer && b > 0n ? anteil(b, 1500n) : 0n);
        expect(s.mitSkonto).toEqual({
          skonto: alsText(skonto),
          bauabzugsteuer: alsText(steuer(z - skonto)),
          auszahlung: alsText(z - skonto - steuer(z - skonto)),
        });
        expect(s.ohneSkonto).toEqual({
          skonto: '0.00',
          bauabzugsteuer: alsText(steuer(z)),
          auszahlung: alsText(z - steuer(z)),
        });
        for (const f of [s.mitSkonto, s.ohneSkonto])
          expect(alsCent(f.skonto) + alsCent(f.bauabzugsteuer) + alsCent(f.auszahlung)).toBe(z);
        expect(s.fristende === null).toBe(!mitFrist);
      }),
      { numRuns: 400 },
    );
  });

  it('Nichtnegativität: offen < 0 genau bei Zahlungen über der geltenden Auszahlung (mit Befund); offen = Auszahlung − Σ', () => {
    fc.assert(
      fc.property(
        eingabe.filter((e) => e.zahlbetrag >= 0n),
        (e) => {
          const { zahlungsstand: s, befunde } = zahlungsstandBerechnen(
            rechnungAus(e),
            alsText(e.zahlbetrag) as Betrag,
          );
          for (const x of [
            s.mitSkonto.skonto,
            s.mitSkonto.bauabzugsteuer,
            s.mitSkonto.auszahlung,
            s.ohneSkonto.bauabzugsteuer,
            s.ohneSkonto.auszahlung,
          ])
            expect(alsCent(x) >= 0n).toBe(true);
          const summe = e.zahlungen.reduce((a, z) => a + z.cent, 0n);
          expect(alsCent(s.summeZahlungen)).toBe(summe);
          expect(alsCent(s.offen)).toBe(alsCent(s.auszahlung) - summe);
          const ueber = summe > alsCent(s.auszahlung);
          expect(alsCent(s.offen) < 0n).toBe(ueber);
          expect(befunde.some((b) => b.code === 'zahlungen-ueber-auszahlung')).toBe(ueber);
          if (e.zahlungen.length === 0) expect(s.offen).toBe(s.auszahlung);
          // Der geltende Fall ist einer der beiden.
          expect(s.auszahlung).toBe(s.skontoVerwirklicht ? s.mitSkonto.auszahlung : s.ohneSkonto.auszahlung);
          expect(s.verwirklichterSkonto).toBe(s.skontoVerwirklicht ? s.mitSkonto.skonto : '0.00');
        },
      ),
      { numRuns: 400 },
    );
  });

  it('verwirklicht genau dann, wenn möglicher Skonto > 0 und Zahlungen bis Fristende ≥ Auszahlung mit Skonto', () => {
    fc.assert(
      fc.property(eingabe, (e) => {
        const { zahlungsstand: s } = zahlungsstandBerechnen(rechnungAus(e), alsText(e.zahlbetrag) as Betrag);
        const ende = s.fristende;
        const bis = e.zahlungen.filter((z) => ende !== null && z.datum <= ende).reduce((a, z) => a + z.cent, 0n);
        expect(s.skontoVerwirklicht).toBe(
          alsCent(s.mitSkonto.skonto) > 0n && bis >= alsCent(s.mitSkonto.auszahlung),
        );
      }),
      { numRuns: 400 },
    );
  });

  it('Fristende: plusKalendertage ist additiv (a + b Tage = erst a, dann b) und streng wachsend', () => {
    fc.assert(
      fc.property(tag, fc.integer({ min: 0, max: 400 }), fc.integer({ min: 0, max: 400 }), (d, a, b) => {
        const ab = plusKalendertage(d, a + b);
        const nacheinander = plusKalendertage(plusKalendertage(d, a) ?? '', b);
        expect(ab).toBe(nacheinander);
        if (b > 0) expect((plusKalendertage(d, a) ?? '') < (ab ?? '')).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});
