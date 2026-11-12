// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Honorarspanne nach § 13 und des Honorars im Honorarsatz (Ticket 101, Q1). Das Orakel rechnet
// unabhängig von der Implementierung: Beträge als ganze Cent, Prozentsätze als ganze Hundertstel (`bigint`), jede
// Formel als ein Bruch, die kaufmännische Rundung hier von Hand (halbe Einheit vom Nullpunkt weg).

import { vergleiche } from '@tethys/dezimal';
import type { Betrag, Prozent } from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Honorartafel, Honorarzone, Leistungsbild } from './index';
import { LEISTUNGSBILDER, honorarInSpanne, honorarspanneBerechnen } from './index';

const runs = { numRuns: 300 };

/** Kanonischer Betrag aus ganzen Cent, ohne `dezimal`. */
function betrag(cent: bigint): Betrag {
  const neg = cent < 0n;
  const abs = neg ? -cent : cent;
  return `${neg ? '-' : ''}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}` as Betrag;
}
/** Ganze Cent aus einem kanonischen Betrag. */
function cent(wert: string): bigint {
  const neg = wert.startsWith('-');
  const [vor = '0', nach = '00'] = (neg ? wert.slice(1) : wert).split('.');
  const c = BigInt(vor) * 100n + BigInt(nach);
  return neg ? -c : c;
}
/** `zaehler / nenner` kaufmännisch auf eine ganze Zahl (halbe Einheit vom Nullpunkt weg), `nenner` > 0. */
function rundeHalbAuf(zaehler: bigint, nenner: bigint): bigint {
  const neg = zaehler < 0n;
  const abs = neg ? -zaehler : zaehler;
  const q = (2n * abs + nenner) / (2n * nenner);
  return neg ? -q : q;
}

/** Die verschiedenen Tafeln (Gebäude und Innenräume teilen eine). */
const TAFELN: readonly Honorartafel[] = [
  ...new Set(Object.values(LEISTUNGSBILDER).map((d) => d.honorartafel)),
];

/** Ein Fall nennt seine Tafel über die Vorschrift, damit ein Gegenbeispiel lesbar bleibt. */
interface Fall {
  readonly vorschrift: string;
  readonly zone: Honorarzone;
}
const NACH_VORSCHRIFT = new Map(TAFELN.map((t) => [t.quelle.vorschrift, t]));
function tafelVon(fall: Fall): Honorartafel {
  const tafel = NACH_VORSCHRIFT.get(fall.vorschrift);
  if (tafel === undefined) throw new Error(fall.vorschrift);
  return tafel;
}
const fallGen: fc.Arbitrary<Fall> = fc.constantFrom(...TAFELN).chain((tafel) =>
  fc.record({
    vorschrift: fc.constant(tafel.quelle.vorschrift),
    zone: fc.constantFrom(...tafel.honorarzonen),
  }),
);

function grenzen(tafel: Honorartafel): [bigint, bigint] {
  const erste = tafel.zeilen[0];
  const letzte = tafel.zeilen[tafel.zeilen.length - 1];
  if (erste === undefined || letzte === undefined) throw new Error('leere Tafel');
  return [cent(erste.anrechenbareKosten), cent(letzte.anrechenbareKosten)];
}

/** Anrechenbare Kosten in Cent innerhalb der Tafel, gehäuft an den Tafelzeilen (± 1 Cent). */
function kostenIn(tafel: Honorartafel): fc.Arbitrary<bigint> {
  const [min, max] = grenzen(tafel);
  const anZeilen = fc
    .tuple(fc.constantFrom(...tafel.zeilen), fc.constantFrom(-1n, 0n, 1n))
    .map(([z, d]) => cent(z.anrechenbareKosten) + d)
    .filter((c) => c >= min && c <= max);
  return fc.oneof(fc.bigInt({ min, max }), anZeilen);
}

/** Orakel: „von“ und „bis“ in Cent nach § 13, aus den Tafelzeilen um aK. */
function erwartet(tafel: Honorartafel, zone: Honorarzone, ak: bigint): { von: bigint; bis: bigint } {
  const zeilen = tafel.zeilen.map((z) => {
    const s = z.spannen[zone];
    if (s === undefined) throw new Error('Zone fehlt');
    return { k: cent(z.anrechenbareKosten), von: cent(s.von), bis: cent(s.bis) };
  });
  const treffer = zeilen.find((z) => z.k === ak);
  if (treffer !== undefined) return { von: treffer.von, bis: treffer.bis };
  const o = zeilen.findIndex((z) => z.k > ak);
  const unten = zeilen[o - 1];
  const oben = zeilen[o];
  if (unten === undefined || oben === undefined) throw new Error('außerhalb');
  const d = oben.k - unten.k;
  const w = (u: bigint, ob: bigint): bigint => rundeHalbAuf(u * d + (ak - unten.k) * (ob - u), d);
  return { von: w(unten.von, oben.von), bis: w(unten.bis, oben.bis) };
}

describe('Eigenschaften der Honorarspanne (§ 13)', () => {
  it('folgt der linearen Interpolation, erst multiplizieren, dann teilen, kaufmännisch auf 2 Stellen', () => {
    fc.assert(
      fc.property(
        fallGen.chain((f) => fc.tuple(fc.constant(f), kostenIn(tafelVon(f)))),
        ([fall, ak]) => {
          const tafel = tafelVon(fall);
          const zone = fall.zone;
          const e = honorarspanneBerechnen(tafel, zone, betrag(ak));
          if (!e.ok) throw new Error(e.fehler);
          const soll = erwartet(tafel, zone, ak);
          expect(e.wert.spanne).toEqual({ von: betrag(soll.von), bis: betrag(soll.bis) });
          expect(cent(e.wert.zeileUnten.anrechenbareKosten) <= ak).toBe(true);
          expect(cent(e.wert.zeileOben.anrechenbareKosten) >= ak).toBe(true);
        },
      ),
      runs,
    );
  });

  it('innerhalb einer Zone monoton in den anrechenbaren Kosten', () => {
    fc.assert(
      fc.property(
        fallGen.chain((f) => fc.tuple(fc.constant(f), kostenIn(tafelVon(f)), kostenIn(tafelVon(f)))),
        ([fall, a, c]) => {
          const tafel = tafelVon(fall);
          const zone = fall.zone;
          const [klein, gross] = a <= c ? [a, c] : [c, a];
          const k = honorarspanneBerechnen(tafel, zone, betrag(klein));
          const g = honorarspanneBerechnen(tafel, zone, betrag(gross));
          if (!k.ok || !g.ok) throw new Error('außerhalb');
          expect(vergleiche(k.wert.spanne.von, g.wert.spanne.von)).toBeLessThanOrEqual(0);
          expect(vergleiche(k.wert.spanne.bis, g.wert.spanne.bis)).toBeLessThanOrEqual(0);
        },
      ),
      runs,
    );
  });

  it('auf jeder Tafelzeile genau deren Werte, in jeder Zone', () => {
    for (const tafel of TAFELN)
      for (const zeile of tafel.zeilen)
        for (const zone of tafel.honorarzonen) {
          const e = honorarspanneBerechnen(tafel, zone, zeile.anrechenbareKosten);
          expect(e.ok && e.wert.spanne).toEqual(zeile.spannen[zone]);
        }
  });

  it('außerhalb der Tafel keine Spanne', () => {
    fc.assert(
      fc.property(
        fallGen.chain((f) => {
          const [min, max] = grenzen(tafelVon(f));
          return fc.tuple(
            fc.constant(f),
            fc.oneof(
              fc.bigInt({ min: -(10n ** 12n), max: min - 1n }),
              fc.bigInt({ min: max + 1n, max: 10n ** 12n }),
            ),
          );
        }),
        ([fall, ak]) => {
          expect(honorarspanneBerechnen(tafelVon(fall), fall.zone, betrag(ak))).toEqual({
            ok: false,
            fehler: 'ausserhalb-honorartafel',
          });
        },
      ),
      runs,
    );
  });

  it('jedes Leistungsbild hat eine Tafel mit Zonen ab I', () => {
    for (const lb of Object.keys(LEISTUNGSBILDER) as Leistungsbild[])
      expect(LEISTUNGSBILDER[lb].honorartafel.honorarzonen[0]).toBe('I');
  });
});

/** Kanonischer Prozentsatz aus ganzen Hundertsteln, ohne `dezimal`. */
const prozent = (hundertstel: bigint): Prozent => betrag(hundertstel) as string as Prozent;

/** Eine Spanne in Cent mit von ≤ bis, wie in den Tafeln; schmale Spannen treffen die halben Cent häufig. */
const spanneGen = fc
  .tuple(
    fc.bigInt({ min: 0n, max: 10n ** 11n }),
    fc.oneof(fc.bigInt({ min: 0n, max: 10n ** 10n }), fc.bigInt({ min: 0n, max: 99n })),
  )
  .map(([von, breite]) => ({ von, bis: von + breite }));
/**
 * Honorarsatz in Hundertsteln, meist in 0 bis 100, auch darüber hinaus und negativ. Die Sätze ±50 und ±150 ergeben bei
 * einer ungeraden Breite in Cent genau einen halben Cent; dort zeigt sich, ob die Summe einmal gerundet wird.
 */
const satzGen = fc.oneof(
  fc.bigInt({ min: 0n, max: 10_000n }),
  fc.constantFrom(0n, 2_500n, 5_000n, 7_500n, 10_000n),
  fc.constantFrom(-15_000n, -5_000n, 5_000n, 15_000n),
  fc.bigInt({ min: -10_000n, max: 30_000n }),
);

describe('Eigenschaften des Honorars im Honorarsatz', () => {
  it('folgt round(von + (bis − von) × Honorarsatz / 100, 2)', () => {
    fc.assert(
      fc.property(spanneGen, satzGen, ({ von, bis }, s) => {
        const ist = honorarInSpanne({ von: betrag(von), bis: betrag(bis) }, prozent(s));
        // von + (bis − von) × s / 10 000 in Cent, als ein Bruch über 10 000
        expect(ist).toBe(betrag(rundeHalbAuf(von * 10_000n + (bis - von) * s, 10_000n)));
      }),
      runs,
    );
  });

  it('Honorarsatz 0 ergibt „von“, Honorarsatz 100 ergibt „bis“', () => {
    fc.assert(
      fc.property(spanneGen, ({ von, bis }) => {
        const spanne = { von: betrag(von), bis: betrag(bis) };
        expect(honorarInSpanne(spanne, prozent(0n))).toBe(spanne.von);
        expect(honorarInSpanne(spanne, prozent(10_000n))).toBe(spanne.bis);
      }),
      runs,
    );
  });

  it('bei einem Honorarsatz von 0 bis 100 liegt das Honorar in der Spanne', () => {
    fc.assert(
      fc.property(spanneGen, fc.bigInt({ min: 0n, max: 10_000n }), ({ von, bis }, s) => {
        const h = cent(honorarInSpanne({ von: betrag(von), bis: betrag(bis) }, prozent(s)));
        expect(von <= h && h <= bis).toBe(true);
      }),
      runs,
    );
  });

  it('innerhalb einer Zone ist das Honorar bei festem Honorarsatz von 0 bis 100 monoton in den anrechenbaren Kosten', () => {
    fc.assert(
      fc.property(
        fallGen.chain((f) =>
          fc.tuple(
            fc.constant(f),
            kostenIn(tafelVon(f)),
            kostenIn(tafelVon(f)),
            fc.bigInt({ min: 0n, max: 10_000n }),
          ),
        ),
        ([fall, a, c, s]) => {
          const [klein, gross] = a <= c ? [a, c] : [c, a];
          const honorar = (ak: bigint): Betrag => {
            const e = honorarspanneBerechnen(tafelVon(fall), fall.zone, betrag(ak));
            if (!e.ok) throw new Error(e.fehler);
            return honorarInSpanne(e.wert.spanne, prozent(s));
          };
          expect(vergleiche(honorar(klein), honorar(gross))).toBeLessThanOrEqual(0);
        },
      ),
      runs,
    );
  });
});
