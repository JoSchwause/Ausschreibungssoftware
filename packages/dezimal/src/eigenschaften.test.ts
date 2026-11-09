// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests (fast-check) mit unabhängigem Orakel. Zuerst geschrieben (Q1).
// Das Orakel rechnet absichtlich anders als die Implementierung: es arbeitet auf Zeichenketten und
// entscheidet die Rundung an der ersten wegfallenden Ziffer (statt „Hälfte addieren und abschneiden“).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { NACHKOMMASTELLEN } from '@tethys/vertrag';
import type { Betrag, Einheitspreis, Menge, Prozent, Zahlenart } from '@tethys/vertrag';
import {
  addiere,
  alsBetrag,
  alsDezimal,
  alsEinheitspreis,
  alsMenge,
  alsProzent,
  alsZahl,
  formatiereDe,
  gesamtpreis,
  leseAustausch,
  multipliziere,
  negiere,
  parseDe,
  prozentVon,
  rundeAufStellen,
  runden,
  subtrahiere,
  summiereBetraege,
  vergleiche,
} from './index';

// --- Orakel -----------------------------------------------------------------------------------------------

/** Kanonische Zeichenkette aus ganzzahligem Wert und Skala, ohne die Implementierung zu benutzen. */
function text(ganzzahl: bigint, skala: number): string {
  const neg = ganzzahl < 0n;
  const ziffern = (neg ? -ganzzahl : ganzzahl).toString().padStart(skala + 1, '0');
  const k = `${ziffern.slice(0, ziffern.length - skala)}.${ziffern.slice(ziffern.length - skala)}`;
  return neg ? `-${k}` : k;
}
/** Ziffern ohne Punkt als BigInt. */
function ziffernwert(t: string): bigint {
  return BigInt(t.replace('.', ''));
}
/** Orakel-Rundung auf Zeichenkettenebene: die Ziffer hinter der Schnittstelle entscheidet. */
function orakelRunden(t: string, ziel: number): string {
  const neg = t.startsWith('-');
  const [ganz = '', nach = ''] = (neg ? t.slice(1) : t).split('.');
  const kopf = BigInt(ganz + nach.padEnd(ziel, '0').slice(0, ziel));
  const naechste = nach.length > ziel ? Number(nach[ziel]) : 0;
  const betrag = naechste >= 5 ? kopf + 1n : kopf;
  return text(neg ? -betrag : betrag, ziel);
}

const GROSS = 10n ** 15n;
const wertGen = (skala: number, schranke: bigint = GROSS) =>
  fc.bigInt({ min: -schranke, max: schranke }).map((u) => text(u, skala));
const mengeGen = wertGen(NACHKOMMASTELLEN.menge).map((t) => t as Menge);
const epGen = wertGen(NACHKOMMASTELLEN.einheitspreis).map((t) => t as Einheitspreis);
const betragGen = wertGen(NACHKOMMASTELLEN.betrag).map((t) => t as Betrag);
const prozentGen = wertGen(NACHKOMMASTELLEN.prozent, 1_000_000n).map((t) => t as Prozent);
const artGen = fc.constantFrom<Zahlenart>('menge', 'einheitspreis', 'prozent', 'betrag');
const beliebigGen = fc.integer({ min: 1, max: 12 }).chain((s) => wertGen(s, 10n ** 20n));
const runs = { numRuns: 500 };

function ok<T>(e: { ok: true; wert: T } | { ok: false; fehler: unknown }): T {
  if (!e.ok) throw new Error(`unerwarteter Fehler: ${JSON.stringify(e.fehler)}`);
  return e.wert;
}

describe('Eigenschaften der Rundung', () => {
  it('idempotent (Typskala)', () => {
    fc.assert(
      fc.property(beliebigGen, artGen, (w, art) => {
        const einmal = runden(ok(alsDezimal(w)), art);
        expect(runden(einmal, art)).toBe(einmal);
      }),
      runs,
    );
  });

  it('idempotent (beliebige Stellenzahl)', () => {
    fc.assert(
      fc.property(beliebigGen, fc.integer({ min: 1, max: 8 }), (w, n) => {
        const einmal = rundeAufStellen(ok(alsDezimal(w)), n);
        expect(rundeAufStellen(einmal, n)).toBe(einmal);
      }),
      runs,
    );
  });

  it('stimmt mit dem Orakel überein', () => {
    fc.assert(
      fc.property(beliebigGen, fc.integer({ min: 1, max: 10 }), (w, n) => {
        expect(rundeAufStellen(ok(alsDezimal(w)), n)).toBe(orakelRunden(w, n));
      }),
      { numRuns: 2000 },
    );
  });

  it('symmetrisch zu Null: runden(−x) = −runden(x)', () => {
    fc.assert(
      fc.property(beliebigGen, artGen, (w, art) => {
        const dez = ok(alsDezimal(w));
        expect(runden(negiere(dez), art)).toBe(negiere(runden(dez, art)));
      }),
      runs,
    );
  });
});

describe('Eigenschaften der Arithmetik', () => {
  it('a + b = b + a', () => {
    fc.assert(fc.property(betragGen, betragGen, (x, y) => expect(addiere(x, y)).toBe(addiere(y, x))), runs);
  });

  it('(a + b) + c = a + (b + c) und 0 ist neutral', () => {
    fc.assert(
      fc.property(betragGen, betragGen, betragGen, (x, y, z) => {
        expect(addiere(addiere(x, y), z)).toBe(addiere(x, addiere(y, z)));
        expect(addiere(x, '0.00' as Betrag)).toBe(x);
      }),
      runs,
    );
  });

  it('(a − b) + b = a; a − a = 0', () => {
    fc.assert(
      fc.property(betragGen, betragGen, (x, y) => {
        expect(addiere(subtrahiere(x, y), y)).toBe(x);
        expect(subtrahiere(x, x)).toBe('0.00');
      }),
      runs,
    );
  });

  it('Addition stimmt mit dem Orakel überein', () => {
    fc.assert(
      fc.property(betragGen, betragGen, (x, y) => {
        expect(addiere(x, y)).toBe(text(ziffernwert(x) + ziffernwert(y), 2));
      }),
      runs,
    );
  });

  it('vergleiche ist konsistent mit der Ganzzahlordnung und antisymmetrisch', () => {
    fc.assert(
      fc.property(betragGen, betragGen, (x, y) => {
        const erwartet = ziffernwert(x) < ziffernwert(y) ? -1 : ziffernwert(x) > ziffernwert(y) ? 1 : 0;
        expect(vergleiche(x, y)).toBe(erwartet);
        expect(vergleiche(y, x)).toBe(-erwartet);
      }),
      runs,
    );
  });

  it('Summe ist unabhängig von der Reihenfolge und gleich der Ganzzahlsumme', () => {
    fc.assert(
      fc.property(fc.array(betragGen, { maxLength: 30 }), (liste) => {
        const soll = text(
          liste.reduce((a, x) => a + ziffernwert(x), 0n),
          2,
        );
        expect(summiereBetraege(liste)).toBe(soll);
        expect(summiereBetraege([...liste].reverse())).toBe(soll);
      }),
      runs,
    );
  });

  it('Multiplikation ist exakt (Skalen addieren sich) und kommutativ', () => {
    fc.assert(
      fc.property(mengeGen, epGen, (mg, e) => {
        const prod = multipliziere(mg, e);
        expect(prod).toBe(text(ziffernwert(mg) * ziffernwert(e), 6));
        expect(multipliziere(e, mg)).toBe(prod);
      }),
      runs,
    );
  });
});

describe('Fachrechnung gegen das Orakel', () => {
  it('GP = round(Menge × EP, 2)', () => {
    fc.assert(
      fc.property(mengeGen, epGen, (mg, e) => {
        const exakt = text(ziffernwert(mg) * ziffernwert(e), 6);
        expect(gesamtpreis(mg, e)).toBe(orakelRunden(exakt, 2));
      }),
      { numRuns: 2000 },
    );
  });

  it('prozentVon = round(Betrag × Prozent / 100, 2)', () => {
    fc.assert(
      fc.property(betragGen, prozentGen, (bt, pz) => {
        // Betrag (2 Stellen) × Prozent (2 Stellen) hat 4 Stellen; durch 100 sind es 6 Stellen.
        const exakt = text(ziffernwert(bt) * ziffernwert(pz), 6);
        expect(prozentVon(bt, pz)).toBe(orakelRunden(exakt, 2));
      }),
      { numRuns: 2000 },
    );
  });

  it('Ergebnis hat immer die Skala des Typs', () => {
    fc.assert(
      fc.property(mengeGen, epGen, (mg, e) => {
        expect(gesamtpreis(mg, e)).toMatch(/^-?(0|[1-9]\d*)\.\d{2}$/);
      }),
      runs,
    );
  });
});

describe('Parsen und Formatieren', () => {
  it('Parsen ∘ Formatieren = Identität für alle zulässigen Werte', () => {
    fc.assert(
      fc.property(artGen, fc.bigInt({ min: -(10n ** 24n), max: 10n ** 24n }), (art, u) => {
        const wert = ok(alsZahl(art, text(u, NACHKOMMASTELLEN[art])));
        const de = formatiereDe(wert);
        expect(de).toMatch(/^-?(0|[1-9]\d{0,2}(\.\d{3})*),\d+$/);
        expect(parseDe(art, de)).toEqual({ ok: true, wert });
      }),
      { numRuns: 2000 },
    );
  });

  it('der Austauschleser ändert kanonische Werte nicht und meldet nichts', () => {
    fc.assert(
      fc.property(artGen, fc.bigInt({ min: -(10n ** 24n), max: 10n ** 24n }), (art, u) => {
        const kanon = text(u, NACHKOMMASTELLEN[art]);
        expect(leseAustausch(art, kanon)).toEqual({ ok: true, wert: kanon, hinweise: [] });
      }),
      runs,
    );
  });

  it('der Austauschleser rundet wie das Orakel', () => {
    fc.assert(
      fc.property(beliebigGen, (w) => {
        const r = leseAustausch('betrag', w);
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.wert).toBe(orakelRunden(w, 2));
      }),
      runs,
    );
  });

  it('beliebige Zeichenketten erzeugen nie eine Ausnahme', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), artGen, (s, art) => {
        for (const e of [alsDezimal(s), alsZahl(art, s), parseDe(art, s), leseAustausch(art, s)]) {
          expect(typeof e.ok).toBe('boolean');
        }
      }),
      { numRuns: 3000 },
    );
    fc.assert(
      fc.property(fc.stringMatching(/^[-+0-9.,\s]{0,16}$/), artGen, (s, art) => {
        for (const e of [alsZahl(art, s), parseDe(art, s), leseAustausch(art, s)]) {
          expect(typeof e.ok).toBe('boolean');
        }
      }),
      { numRuns: 3000 },
    );
  });

  it('typisierte Konstruktoren liefern dieselben Werte wie alsZahl', () => {
    expect(alsMenge('1.000')).toEqual(alsZahl('menge', '1.000'));
    expect(alsEinheitspreis('1.000')).toEqual(alsZahl('einheitspreis', '1.000'));
    expect(alsBetrag('1.00')).toEqual(alsZahl('betrag', '1.00'));
    expect(alsProzent('1.00')).toEqual(alsZahl('prozent', '1.00'));
  });
});
