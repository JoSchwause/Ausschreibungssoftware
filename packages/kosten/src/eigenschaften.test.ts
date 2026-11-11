// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Kostengliederung und Kostenermittlung (Ticket 55, Q1). Die Orakel rechnen unabhängig von der
// Implementierung: Beträge entstehen als ganze Cent (`bigint`) im Test, Text und Erwartungswert werden hier gebildet.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bezeichnungenLesen,
  kgEbene,
  kgElternteil,
  kgLesen,
  kgVergleichen,
  kgVorfahren,
  kostenermittlungBerechnen,
} from './index';
import type { Kostenermittlungseintrag, Kostengruppennummer } from './index';

const runs = { numRuns: 300 };

/** Beliebige gültige Nummer: erste Ziffer 1–9, dann zwei Ziffern 0–9. Kleiner Ziffernvorrat für viele Treffer. */
const nummerGen = fc
  .tuple(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 0, max: 9 }), fc.integer({ min: 0, max: 9 }))
  .map(([a, b, c]) => `${String(a)}${String(b)}${String(c)}` as Kostengruppennummer);
const engeNummerGen = fc
  .tuple(fc.constantFrom(1, 2), fc.constantFrom(0, 1, 2), fc.constantFrom(0, 1, 2))
  .map(([a, b, c]) => `${String(a)}${String(b)}${String(c)}` as Kostengruppennummer);

/** Kanonischer Betragstext aus ganzen Cent, ohne `dezimal`. */
function centText(cent: bigint): string {
  const neg = cent < 0n;
  const abs = neg ? -cent : cent;
  const ganz = abs / 100n;
  const rest = (abs % 100n).toString().padStart(2, '0');
  return `${neg ? '-' : ''}${ganz.toString()}.${rest}`;
}
function centVon(text: string): bigint {
  const neg = text.startsWith('-');
  const [ganz = '0', rest = '00'] = (neg ? text.slice(1) : text).split('.');
  const wert = BigInt(ganz) * 100n + BigInt(rest);
  return neg ? -wert : wert;
}

const GRENZE = 10n ** 13n;
const centGen = fc.bigInt({ min: -GRENZE, max: GRENZE });
const eintragGen = fc
  .tuple(fc.oneof(nummerGen, engeNummerGen), centGen)
  .map(([nummer, cent]): { nummer: Kostengruppennummer; cent: bigint } => ({ nummer, cent }));
const eintraegeGen = fc.array(eintragGen, { maxLength: 40 });

function alsEintraege(
  liste: readonly { nummer: Kostengruppennummer; cent: bigint }[],
): Kostenermittlungseintrag[] {
  return liste.map(({ nummer, cent }) => ({ nummer, betrag: centText(cent) }));
}

/** Liegt `n` in der Gruppe `g` (gleich oder Nachfahre)? Allein aus den Ziffern, ohne `kgVorfahren`. */
function liegtIn(n: string, g: string): boolean {
  if (g.endsWith('00')) return n[0] === g[0];
  if (g.endsWith('0')) return n.slice(0, 2) === g.slice(0, 2);
  return n === g;
}

describe('Eigenschaften der Kostengruppennummer', () => {
  it('jede dreistellige Zahl 100–999 wird gelesen und bleibt gleich', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 999 }), (z) => {
        const r = kgLesen(String(z));
        expect(r).toEqual({ ok: true, wert: String(z) });
      }),
      runs,
    );
  });

  it('Elternteil hat genau eine Ebene weniger oder ist Ebene 1, sortiert davor und enthält das Kind', () => {
    fc.assert(
      fc.property(nummerGen, (n) => {
        const vorfahren = kgVorfahren(n);
        expect(vorfahren.length).toBeLessThan(kgEbene(n));
        let kind = n;
        for (const v of vorfahren) {
          expect(kgEbene(v)).toBeLessThan(kgEbene(kind));
          expect(kgVergleichen(v, kind)).toBe(-1);
          expect(liegtIn(kind, v)).toBe(true);
          kind = v;
        }
        expect(kgEbene(kind)).toBe(1);
        expect(kgElternteil(kind)).toBeNull();
      }),
      runs,
    );
  });
});

describe('Eigenschaften der Kostenermittlung', () => {
  it('Gesamtsumme = Summe der Ebene-1-Gruppen = Summe aller eigenen Beträge', () => {
    fc.assert(
      fc.property(eintraegeGen, (liste) => {
        const r = kostenermittlungBerechnen(alsEintraege(liste));
        const erwartet = liste.reduce((s, x) => s + x.cent, 0n);
        expect(r.gesamtsumme).toBe(centText(erwartet));
        const ebene1 = r.gruppen.filter((g) => g.ebene === 1).reduce((s, g) => s + centVon(g.summe), 0n);
        expect(ebene1).toBe(erwartet);
        const eigene = r.gruppen.reduce(
          (s, g) => s + (g.eigenerBetrag === null ? 0n : centVon(g.eigenerBetrag)),
          0n,
        );
        expect(eigene).toBe(erwartet);
      }),
      runs,
    );
  });

  it('Summe jeder Gruppe = Summe der Einträge in ihr = eigener Betrag + Summen der Kinder', () => {
    fc.assert(
      fc.property(eintraegeGen, (liste) => {
        const r = kostenermittlungBerechnen(alsEintraege(liste));
        for (const g of r.gruppen) {
          const drin = liste.filter((x) => liegtIn(x.nummer, g.nummer));
          expect(drin.length).toBeGreaterThan(0);
          expect(g.summe).toBe(centText(drin.reduce((s, x) => s + x.cent, 0n)));
          const kinder = r.gruppen.filter((k) => kgElternteil(k.nummer) === g.nummer);
          const eigen = g.eigenerBetrag === null ? 0n : centVon(g.eigenerBetrag);
          expect(centVon(g.summe)).toBe(kinder.reduce((s, k) => s + centVon(k.summe), eigen));
          // Befund genau dann, wenn die Gruppe selbst Einträge hat und auch Einträge darunter.
          const selbst = drin.some((x) => x.nummer === g.nummer);
          const darunter = drin.some((x) => x.nummer !== g.nummer);
          const befund = r.befunde.some(
            (b) => b.code === 'eigener-betrag-und-kinder' && b.nummer === g.nummer,
          );
          expect(befund).toBe(selbst && darunter);
        }
      }),
      runs,
    );
  });

  it('Reihenfolge der Einträge ändert weder Gruppen noch Gesamtsumme noch die Art der Befunde', () => {
    fc.assert(
      fc.property(
        eintraegeGen.chain((liste) =>
          fc.tuple(fc.constant(liste), fc.shuffledSubarray(liste, { minLength: liste.length })),
        ),
        ([liste, gemischt]) => {
          const a = kostenermittlungBerechnen(alsEintraege(liste));
          const b = kostenermittlungBerechnen(alsEintraege(gemischt));
          expect(b.gruppen).toEqual(a.gruppen);
          expect(b.gesamtsumme).toBe(a.gesamtsumme);
          const arten = (r: typeof a): string[] => r.befunde.map((x) => `${x.code} ${x.nummer ?? ''}`).sort();
          expect(arten(b)).toEqual(arten(a));
        },
      ),
      runs,
    );
  });

  it('Gruppen sind nach Nummer sortiert und eindeutig', () => {
    fc.assert(
      fc.property(eintraegeGen, (liste) => {
        const nummern = kostenermittlungBerechnen(alsEintraege(liste)).gruppen.map((g) => g.nummer);
        expect(nummern).toEqual([...new Set(nummern)].sort());
      }),
      runs,
    );
  });
});

describe('Eigenschaften des CSV-Lesers', () => {
  /** Bezeichnung ohne Leerraum am Rand, mit Trennern, `"` und Zeilenumbrüchen im Text. */
  const bezeichnungGen = fc
    .string({
      unit: fc.constantFrom('a', 'Z', 'ä', 'ß', ' ', ';', ',', '"', '\n', '\r\n', '-', '1'),
      minLength: 1,
    })
    .map((s) => s.trim())
    .filter((s) => s !== '');
  const tabelleGen = fc.uniqueArray(fc.tuple(nummerGen, bezeichnungGen), {
    selector: ([n]) => n,
    maxLength: 30,
  });

  const zelle = (s: string): string => `"${s.replaceAll('"', '""')}"`;

  it('eine nach RFC 4180 geschriebene Tabelle kommt unverändert zurück', () => {
    fc.assert(
      fc.property(
        tabelleGen,
        fc.constantFrom(';' as const, ',' as const),
        fc.constantFrom('\r\n', '\n'),
        fc.boolean(),
        fc.boolean(),
        (tabelle, trenner, ende, bom, kopf) => {
          const zeilen = tabelle.map(([n, b]) => `${n}${trenner}${zelle(b)}`);
          if (kopf) zeilen.unshift(`Nummer${trenner}Bezeichnung`);
          const text = `${bom ? '﻿' : ''}${zeilen.join(ende)}${ende}`;
          const r = bezeichnungenLesen(text);
          expect([...r.bezeichnungen]).toEqual(tabelle);
          expect(r.befunde).toEqual([]);
          if (zeilen.length > 0) expect(r.trenner).toBe(trenner);
          expect(r.kopfzeile).toBe(kopf);
        },
      ),
      runs,
    );
  });
});
