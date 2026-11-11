// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Einzelpreiskalkulation (Ticket 78, Q1). Das Orakel rechnet unabhängig von der Implementierung:
// Werte entstehen als ganze Tausendstel bzw. Hundertstel (`bigint`) im Test; Text und Erwartungswert werden hier gebildet,
// die Rundung ist hier von Hand geschrieben (Betrag halb aufwärts, Vorzeichen davor, E-07).

import type { Einheitspreis, EpaArt, Menge, Prozent } from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { einzelpreiskalkulationBerechnen } from './index';
import type { Einzelpreiskalkulation, Kalkulationsansatz, Kalkulationszuschlagssaetze } from './index';

const runs = { numRuns: 300 };

const ARTEN: readonly EpaArt[] = ['lohn', 'stoffe', 'geraete', 'nachunternehmer', 'sonstiges', 'frei'];

/** Kanonischer Text aus einer ganzen Zahl von 10^-stellen, ohne `dezimal`. */
function text(wert: bigint, stellen: number): string {
  const neg = wert < 0n;
  const abs = neg ? -wert : wert;
  const teiler = 10n ** BigInt(stellen);
  const rest = (abs % teiler).toString().padStart(stellen, '0');
  return `${neg ? '-' : ''}${(abs / teiler).toString()}.${rest}`;
}
/** Ganze Zahl von 10^-stellen aus kanonischem Text; Stellen darüber hinaus müssen Nullen sein. */
function ganz(t: string, stellen: number): bigint {
  const neg = t.startsWith('-');
  const [vor = '0', nach = ''] = (neg ? t.slice(1) : t).split('.');
  if (/[^0]/.test(nach.slice(stellen))) throw new Error(`Mehr als ${String(stellen)} Stellen: ${t}`);
  const w = BigInt(vor) * 10n ** BigInt(stellen) + BigInt(nach.slice(0, stellen).padEnd(stellen, '0'));
  return neg ? -w : w;
}
/** `zaehler / nenner` kaufmännisch auf eine ganze Zahl (halbe Einheit vom Nullpunkt weg). */
function rundeHalbAuf(zaehler: bigint, nenner: bigint): bigint {
  const neg = zaehler < 0n;
  const abs = neg ? -zaehler : zaehler;
  const q = (2n * abs + nenner) / (2n * nenner);
  return neg ? -q : q;
}

interface Zeile {
  readonly art: EpaArt;
  /** Ansatzmenge in Tausendsteln; `null` fehlt. */
  readonly m: bigint | null;
  /** Kostensatz in Tausendsteln; `null` fehlt. */
  readonly k: bigint | null;
}

const tausendstel = fc.oneof(
  fc.bigInt({ min: -2_000n, max: 20_000n }),
  fc.bigInt({ min: -(10n ** 9n), max: 10n ** 12n }),
);
const zeileGen: fc.Arbitrary<Zeile> = fc.record({
  art: fc.constantFrom(...ARTEN),
  m: fc.option(tausendstel, { freq: 8 }),
  k: fc.option(tausendstel, { freq: 8 }),
});
const zeilenGen = fc.array(zeileGen, { maxLength: 20 });
/** Satz je Kostenart in Hundertstel-Prozent; fehlende Art: 0 %. */
const saetzeGen = fc.dictionary(fc.constantFrom(...ARTEN), fc.bigInt({ min: -30_000n, max: 30_000n }));

function ansaetze(zeilen: readonly Zeile[]): Kalkulationsansatz[] {
  return zeilen.map(({ art, m, k }, i) => ({
    art,
    bezeichnung: `Zeile ${String(i)}`,
    ansatzmenge: m === null ? null : (text(m, 3) as Menge),
    kostensatz: k === null ? null : (text(k, 3) as Einheitspreis),
  }));
}
function saetzeAus(saetze: Partial<Record<EpaArt, bigint>>): Kalkulationszuschlagssaetze {
  const aus: Partial<Record<EpaArt, Prozent>> = {};
  for (const art of ARTEN) {
    const s = saetze[art];
    if (s !== undefined) aus[art] = text(s, 2) as Prozent;
  }
  return aus;
}

/** Orakel: Anteil je Kostenart in Tausendsteln, aus den Zeilen mit beiden Werten. */
function erwarteteAnteile(zeilen: readonly Zeile[], saetze: Partial<Record<EpaArt, bigint>>): Map<EpaArt, bigint> {
  const ek = new Map<EpaArt, bigint>(); // Millionstel
  for (const { art, m, k } of zeilen) if (m !== null && k !== null) ek.set(art, (ek.get(art) ?? 0n) + m * k);
  const aus = new Map<EpaArt, bigint>();
  for (const [art, e] of ek) {
    // e / 10^6 × (10000 + s) / 10^4 auf Tausendstel: e × (10000 + s) / 10^7
    aus.set(art, rundeHalbAuf(e * (10_000n + (saetze[art] ?? 0n)), 10n ** 7n));
  }
  return aus;
}

const anteilVon = (r: Einzelpreiskalkulation, art: EpaArt): string | null => r.anteile[art];

describe('Eigenschaften der Einzelpreiskalkulation', () => {
  it('jeder Anteil folgt der Regel (Σ Einzelkosten) × (1 + Satz/100), kaufmännisch auf 3 Stellen', () => {
    fc.assert(
      fc.property(zeilenGen, saetzeGen, (zeilen, saetze) => {
        const r = einzelpreiskalkulationBerechnen(ansaetze(zeilen), saetzeAus(saetze));
        const erwartet = erwarteteAnteile(zeilen, saetze);
        for (const art of ARTEN) {
          const e = erwartet.get(art);
          expect(anteilVon(r, art)).toBe(e === undefined ? null : text(e, 3));
        }
      }),
      runs,
    );
  });

  it('Summe der Anteile = EP; ohne Anteil kein EP', () => {
    fc.assert(
      fc.property(zeilenGen, saetzeGen, (zeilen, saetze) => {
        const r = einzelpreiskalkulationBerechnen(ansaetze(zeilen), saetzeAus(saetze));
        const gesetzt = ARTEN.map((a) => anteilVon(r, a)).filter((a): a is string => a !== null);
        if (gesetzt.length === 0) expect(r.einheitspreis).toBeNull();
        else expect(r.einheitspreis).toBe(text(gesetzt.reduce((s, a) => s + ganz(a, 3), 0n), 3));
      }),
      runs,
    );
  });

  it('Satz 0 % (oder kein Satz) → Anteil = kaufmännisch gerundete Einzelkosten', () => {
    fc.assert(
      fc.property(zeilenGen, fc.boolean(), (zeilen, ausdruecklich) => {
        const saetze = ausdruecklich ? Object.fromEntries(ARTEN.map((a) => [a, '0.00' as Prozent])) : {};
        const r = einzelpreiskalkulationBerechnen(ansaetze(zeilen), saetze);
        for (const k of r.kostenarten) {
          // Einzelkosten exakt in Millionstel, auf Tausendstel kaufmännisch
          expect(k.anteil).toBe(text(rundeHalbAuf(ganz(k.einzelkosten, 6), 1_000n), 3));
          expect(ganz(k.kalkulationszuschlag, 10)).toBe(0n);
        }
      }),
      runs,
    );
  });

  it('Reihenfolge der Zeilen ändert weder Anteile noch EP noch Nachweis noch die Art der Befunde', () => {
    fc.assert(
      fc.property(
        zeilenGen.chain((z) => fc.tuple(fc.constant(z), fc.shuffledSubarray(z, { minLength: z.length }))),
        saetzeGen,
        ([zeilen, gemischt], saetze) => {
          const a = einzelpreiskalkulationBerechnen(ansaetze(zeilen), saetzeAus(saetze));
          const b = einzelpreiskalkulationBerechnen(ansaetze(gemischt), saetzeAus(saetze));
          expect(b.anteile).toEqual(a.anteile);
          expect(b.einheitspreis).toBe(a.einheitspreis);
          const nachweis = (r: Einzelpreiskalkulation): string[][] =>
            r.kostenarten.map((k) => [
              k.art,
              String(ganz(k.einzelkosten, 6)),
              String(ganz(k.kalkulationszuschlag, 10)),
              k.anteil,
            ]);
          expect(nachweis(b)).toEqual(nachweis(a));
          const arten = (r: Einzelpreiskalkulation): string[] =>
            r.befunde.map((x) => `${x.code} ${x.feld} ${x.art ?? ''}`).sort();
          expect(arten(b)).toEqual(arten(a));
        },
      ),
      runs,
    );
  });

  it('Befund „wert-fehlt“ genau an den Zeilen mit fehlendem Wert; eine Kostenart nur aus solchen Zeilen bleibt leer', () => {
    fc.assert(
      fc.property(zeilenGen, (zeilen) => {
        const r = einzelpreiskalkulationBerechnen(ansaetze(zeilen), {});
        const fehlt = r.befunde.filter((b) => b.code === 'wert-fehlt').map((b) => `${String(b.zeile)} ${b.feld}`);
        const erwartet = zeilen.flatMap((z, i) => [
          ...(z.m === null ? [`${String(i)} ansatzmenge`] : []),
          ...(z.k === null ? [`${String(i)} kostensatz`] : []),
        ]);
        expect(fehlt).toEqual(erwartet);
        for (const art of ARTEN) {
          const zaehlt = zeilen.some((z) => z.art === art && z.m !== null && z.k !== null);
          expect(anteilVon(r, art) !== null).toBe(zaehlt);
        }
      }),
      runs,
    );
  });
});
