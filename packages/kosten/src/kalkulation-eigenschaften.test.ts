// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Einzelpreiskalkulation und der Kalkulationsübersicht (Ticket 78, Q1). Das Orakel rechnet unabhängig von der Implementierung:
// Werte entstehen als ganze Tausendstel bzw. Hundertstel (`bigint`) im Test; Text und Erwartungswert werden hier gebildet,
// die Rundung ist hier von Hand geschrieben (Betrag halb aufwärts, Vorzeichen davor, E-07).

import type { Einheitspreis, EpaArt, Menge, PositionId, Prozent } from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { einzelpreiskalkulationBerechnen, kalkulationsuebersichtBerechnen } from './index';
import type {
  Einzelpreiskalkulation,
  Kalkulationsansatz,
  Kalkulationsuebersicht,
  Kalkulationszuschlagssaetze,
} from './index';

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

/** Orakel: Einzelkosten je Kostenart in Millionsteln, aus den Zeilen mit beiden Werten. */
function erwarteteEinzelkosten(zeilen: readonly Zeile[]): Map<EpaArt, bigint> {
  const ek = new Map<EpaArt, bigint>();
  for (const { art, m, k } of zeilen) if (m !== null && k !== null) ek.set(art, (ek.get(art) ?? 0n) + m * k);
  return ek;
}

/** Orakel: Anteil je Kostenart in Tausendsteln. */
function erwarteteAnteile(
  zeilen: readonly Zeile[],
  saetze: Partial<Record<EpaArt, bigint>>,
): Map<EpaArt, bigint> {
  const aus = new Map<EpaArt, bigint>();
  for (const [art, e] of erwarteteEinzelkosten(zeilen)) {
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
        else
          expect(r.einheitspreis).toBe(
            text(
              gesetzt.reduce((s, a) => s + ganz(a, 3), 0n),
              3,
            ),
          );
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
        const fehlt = r.befunde
          .filter((b) => b.code === 'wert-fehlt')
          .map((b) => `${String(b.zeile)} ${b.feld}`);
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

interface Pos {
  /** Menge in Tausendsteln. */
  readonly menge: bigint;
  readonly zeilen: readonly Zeile[];
}
const positionenGen: fc.Arbitrary<Pos[]> = fc.array(
  fc.record({
    menge: fc.bigInt({ min: -1_000n, max: 10n ** 9n }),
    zeilen: fc.array(zeileGen, { maxLength: 8 }),
  }),
  { maxLength: 10 },
);
function eingabe(positionen: readonly Pos[]) {
  return positionen.map((p, i) => ({
    positionId: `p${String(i)}` as PositionId,
    menge: text(p.menge, 3) as Menge,
    ansaetze: ansaetze(p.zeilen),
  }));
}

describe('Eigenschaften der Kalkulationsübersicht', () => {
  it('GP je Position = kaufmännisch(Menge × EP, 2); Gesamtsumme = Σ GP; jede Position wie einzeln gerechnet', () => {
    fc.assert(
      fc.property(positionenGen, saetzeGen, (positionen, saetze) => {
        const r = kalkulationsuebersichtBerechnen(eingabe(positionen), saetzeAus(saetze));
        let summe = 0n;
        positionen.forEach((p, i) => {
          const x = r.positionen[i];
          expect(x?.kalkulation).toEqual(
            einzelpreiskalkulationBerechnen(ansaetze(p.zeilen), saetzeAus(saetze)),
          );
          const anteile = [...erwarteteAnteile(p.zeilen, saetze).values()];
          if (anteile.length === 0) {
            expect(x?.gesamtpreis).toBeNull();
            return;
          }
          // Menge (Tausendstel) × EP (Tausendstel) = Millionstel, auf Hundertstel
          const gp = rundeHalbAuf(p.menge * anteile.reduce((s, a) => s + a, 0n), 10_000n);
          expect(x?.gesamtpreis).toBe(text(gp, 2));
          summe += gp;
        });
        expect(r.positionen).toHaveLength(positionen.length);
        expect(r.gesamtsumme).toBe(text(summe, 2));
      }),
      runs,
    );
  });

  it('je Kostenart Σ kaufmännisch(Menge × Einzelkosten, 2) und Σ kaufmännisch(Menge × Anteil, 2); Herstellkosten = Σ', () => {
    fc.assert(
      fc.property(positionenGen, saetzeGen, (positionen, saetze) => {
        const r = kalkulationsuebersichtBerechnen(eingabe(positionen), saetzeAus(saetze));
        const ek = new Map<EpaArt, bigint>();
        const an = new Map<EpaArt, bigint>();
        for (const p of positionen) {
          // Menge (Tausendstel) × Einzelkosten (Millionstel) = 10^-9, auf Hundertstel
          for (const [art, e] of erwarteteEinzelkosten(p.zeilen))
            ek.set(art, (ek.get(art) ?? 0n) + rundeHalbAuf(p.menge * e, 10n ** 7n));
          for (const [art, a] of erwarteteAnteile(p.zeilen, saetze))
            an.set(art, (an.get(art) ?? 0n) + rundeHalbAuf(p.menge * a, 10_000n));
        }
        const erwartet = ARTEN.filter((a) => ek.has(a)).map((art) => ({
          art,
          einzelkosten: text(ek.get(art) ?? 0n, 2),
          anteilsumme: text(an.get(art) ?? 0n, 2),
        }));
        expect(r.kostenarten).toEqual(erwartet);
        expect(r.herstellkosten).toBe(
          text(
            [...ek.values()].reduce((s, e) => s + e, 0n),
            2,
          ),
        );
      }),
      runs,
    );
  });

  it('Lohnstunden und Mittellohn exakt summiert und einmal gerundet; ein einheitlicher Lohnsatz ist der Mittellohn', () => {
    fc.assert(
      fc.property(positionenGen, saetzeGen, (positionen, saetze) => {
        const r = kalkulationsuebersichtBerechnen(eingabe(positionen), saetzeAus(saetze));
        let stunden = 0n; // Menge × Ansatzmenge: Millionstel
        let kosten = 0n; // Menge × Ansatzmenge × Kostensatz: 10^-9
        let hatLohn = false;
        const saetzeLohn = new Set<bigint>();
        for (const p of positionen)
          for (const { art, m, k } of p.zeilen)
            if (art === 'lohn' && m !== null && k !== null) {
              stunden += p.menge * m;
              kosten += p.menge * m * k;
              hatLohn = true;
              saetzeLohn.add(k);
            }
        expect(r.lohnstunden).toBe(text(rundeHalbAuf(stunden, 1_000n), 3));
        // kosten · 10^-9 / (stunden · 10^-6) = (kosten / stunden) · 10^-3: in Tausendsteln genau kosten / stunden
        const mittellohn =
          !hatLohn || stunden === 0n
            ? null
            : text(stunden < 0n ? rundeHalbAuf(-kosten, -stunden) : rundeHalbAuf(kosten, stunden), 3);
        expect(r.mittellohn).toBe(mittellohn);
        const [einziger] = [...saetzeLohn];
        if (saetzeLohn.size === 1 && einziger !== undefined && stunden !== 0n)
          expect(r.mittellohn).toBe(text(einziger, 3));
      }),
      runs,
    );
  });

  it('Reihenfolge der Positionen ändert keine Summe', () => {
    fc.assert(
      fc.property(
        positionenGen.chain((p) => fc.tuple(fc.constant(p), fc.shuffledSubarray(p, { minLength: p.length }))),
        saetzeGen,
        ([positionen, gemischt], saetze) => {
          const summen = (r: Kalkulationsuebersicht): unknown[] => [
            r.kostenarten,
            r.herstellkosten,
            r.gesamtsumme,
            r.lohnstunden,
            r.mittellohn,
          ];
          const a = kalkulationsuebersichtBerechnen(eingabe(positionen), saetzeAus(saetze));
          const b = kalkulationsuebersichtBerechnen(eingabe(gemischt), saetzeAus(saetze));
          expect(summen(b)).toEqual(summen(a));
        },
      ),
      runs,
    );
  });
});
