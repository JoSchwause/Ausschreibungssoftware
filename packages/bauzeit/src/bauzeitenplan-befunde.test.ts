// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde der Terminrechnung (Ticket 102 Punkt 4, U5): Ungültiges sperrt nie die Rechnung des Übrigen. Jeder Fall nennt,
// was entfällt und was weiter gerechnet wird. Kalender wie in `bauzeitenplan.test.ts` (Mo 04.01.2027 = Projektbeginn).

import type { Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { Anordnungsbeziehung, Bauzeitenplaneingabe, Bauzeitenplanergebnis, Vorgang } from './index';
import { KRITISCHE_WEGE_HOECHSTENS, STANDARD_ARBEITSTAGE, bauzeitenplanBerechnen } from './index';

function vorgang(
  id: string,
  dauer: number,
  vorgaenger: readonly Anordnungsbeziehung[] = [],
  weiteres: Partial<Vorgang> = {},
): Vorgang {
  return {
    id,
    bezeichnung: id,
    elternId: null,
    dauer,
    vorgaenger,
    fruehesterBeginn: null,
    ist: null,
    ...weiteres,
  };
}
const ea = (vorgaengerId: string, abstand = 0): Anordnungsbeziehung => ({
  vorgaengerId,
  art: 'ende-anfang',
  abstand,
});
function plan(
  vorgaenge: readonly Vorgang[],
  weiteres: Partial<Bauzeitenplaneingabe> = {},
): Bauzeitenplaneingabe {
  return {
    projektbeginn: '2027-01-04',
    kalender: { arbeitstage: STANDARD_ARBEITSTAGE, bundesland: null, freieTage: [] },
    vorgaenge,
    ...weiteres,
  };
}
const codes = (e: Bauzeitenplanergebnis): [string, string | null, string | null][] =>
  e.befunde.map((b) => [b.code, b.vorgangId, b.vorgaengerId]);
const beginn = (e: Bauzeitenplanergebnis, id: string): string | null =>
  e.vorgaenge.find((v) => v.id === id)?.termine?.beginn ?? null;

describe('Plan und Kalender', () => {
  it('ungültiger Projektbeginn: nichts wird gerechnet, die übrigen Befunde erscheinen trotzdem', () => {
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 1, [ea('fehlt')])], { projektbeginn: '2027-02-30' }));
    expect(e.projektbeginn).toBeNull();
    expect(e.projektende).toBeNull();
    expect(e.vorgaenge).toEqual([{ id: 'a', art: 'vorgang', termine: null }]);
    expect(codes(e)).toEqual([
      ['projektbeginn-ungueltig', null, null],
      ['vorgaenger-unbekannt', 'a', 'fehlt'],
    ]);
  });

  it('ein Kalender ohne Arbeitstag rechnet nichts', () => {
    const e = bauzeitenplanBerechnen(
      plan([vorgang('a', 1)], { kalender: { arbeitstage: [], bundesland: null, freieTage: [] } }),
    );
    expect(e.vorgaenge[0]?.termine).toBeNull();
    expect(codes(e)).toEqual([['kalender-ohne-arbeitstage', null, null]]);
  });

  it('unbekannte Wochentage, ein unbekanntes Land und unlesbare freie Tage werden übergangen', () => {
    const kalender = { arbeitstage: [1, 2, 3, 4, 5, 8], bundesland: 'XX', freieTage: ['2027-13-01'] };
    const e = bauzeitenplanBerechnen(
      plan([vorgang('a', 1)], { kalender } as unknown as Bauzeitenplaneingabe),
    );
    expect(beginn(e, 'a')).toBe('2027-01-04');
    expect(codes(e)).toEqual([
      ['arbeitstag-ungueltig', null, null],
      ['bundesland-unbekannt', null, null],
      ['freier-tag-ungueltig', null, null],
    ]);
  });
});

describe('Gliederung', () => {
  it('eine doppelte Kennung: der spätere Vorgang bleibt ohne Termine, Verweise gelten dem ersten', () => {
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 2), vorgang('a', 5), vorgang('b', 1, [ea('a')])]));
    expect(e.vorgaenge.map((v) => v.termine?.beginn ?? null)).toEqual(['2027-01-04', null, '2027-01-06']);
    expect(codes(e)).toEqual([['id-doppelt', 'a', null]]);
  });

  it('ein unbekannter Sammelvorgang: der Vorgang steht auf der obersten Ebene', () => {
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 2, [], { elternId: 'fehlt' })]));
    expect(beginn(e, 'a')).toBe('2027-01-04');
    expect(codes(e)).toEqual([['eltern-unbekannt', 'a', null]]);
  });

  it('ein Kreis in der Gliederung: die Beteiligten stehen auf der obersten Ebene', () => {
    // x unter y, y unter x, z unter x: der Kreis wird aufgelöst, x bleibt Sammelvorgang über z.
    const e = bauzeitenplanBerechnen(
      plan([
        vorgang('x', 1, [], { elternId: 'y' }),
        vorgang('y', 3, [], { elternId: 'x' }),
        vorgang('z', 2, [], { elternId: 'x' }),
      ]),
    );
    expect(e.vorgaenge.map((v) => [v.id, v.art, v.termine?.ende ?? null])).toEqual([
      ['x', 'sammelvorgang', '2027-01-05'],
      ['y', 'vorgang', '2027-01-06'],
      ['z', 'vorgang', '2027-01-05'],
    ]);
    expect(e.befunde.map((b) => [b.code, b.beteiligte])).toEqual([['eltern-zyklus', ['x', 'y']]]);
  });
});

describe('Werte eines Vorgangs', () => {
  it.each([-1, 2.5, Number.NaN, 1_000_001])(
    'Dauer %s: ohne Termine; Nachfolger rechnen ohne die Beziehung',
    (d) => {
      const e = bauzeitenplanBerechnen(plan([vorgang('a', d), vorgang('b', 1, [ea('a')])]));
      expect(e.vorgaenge.map((v) => [v.art, v.termine?.beginn ?? null])).toEqual([
        ['vorgang', null],
        ['vorgang', '2027-01-04'],
      ]);
      expect(codes(e)).toEqual([
        ['dauer-ungueltig', 'a', null],
        ['vorgaenger-ohne-termine', 'b', 'a'],
      ]);
    },
  );

  it('ein ungültiger Abstand oder eine unbekannte Art: die Beziehung entfällt', () => {
    const e = bauzeitenplanBerechnen(
      plan([
        vorgang('a', 2),
        vorgang('b', 1, [ea('a', 1.5)]),
        vorgang('c', 1, [
          { vorgaengerId: 'a', art: 'ende-mitte', abstand: 0 } as unknown as Anordnungsbeziehung,
        ]),
      ]),
    );
    expect([beginn(e, 'b'), beginn(e, 'c')]).toEqual(['2027-01-04', '2027-01-04']);
    expect(codes(e)).toEqual([
      ['abstand-ungueltig', 'b', 'a'],
      ['anordnungsart-unbekannt', 'c', 'a'],
    ]);
  });

  it('eine unlesbare Terminvorgabe wird übergangen', () => {
    const e = bauzeitenplanBerechnen(plan([vorgang('a', 1, [], { fruehesterBeginn: '11.01.2027' })]));
    expect(beginn(e, 'a')).toBe('2027-01-04');
    expect(codes(e)).toEqual([['terminvorgabe-ungueltig', 'a', null]]);
  });

  it('Ist-Termine verschieben nichts; Unstimmiges ist ein Befund', () => {
    const ist = (
      beginnText: string | null,
      ende: string | null,
      fortschritt: string | null,
    ): Partial<Vorgang> => ({
      ist: { beginn: beginnText, ende, fortschritt: fortschritt as Prozent | null },
    });
    const e = bauzeitenplanBerechnen(
      plan([
        vorgang('a', 2, [], ist('2027-01-11', null, '40.00')),
        vorgang('g', 2, [], ist('2027-01-04', null, null)), // begonnen, Fortschritt nicht erfasst: stimmig
        vorgang('b', 2, [], ist('2027-01-32', null, '0.00')),
        vorgang('c', 2, [], ist('2027-01-08', '2027-01-05', '100.00')),
        vorgang('d', 2, [], ist(null, null, '100.01')),
        vorgang('e', 2, [], ist(null, null, '50')),
        vorgang('f', 2, [], ist(null, '2027-01-05', '100.00')),
      ]),
    );
    expect(beginn(e, 'a')).toBe('2027-01-04');
    expect(codes(e)).toEqual([
      ['ist-ungueltig', 'b', null], // kein Datum
      ['ist-ungueltig', 'c', null], // Ende vor Beginn
      ['ist-ungueltig', 'd', null], // über 100 %
      ['ist-ungueltig', 'e', null], // nicht zwei Nachkommastellen (N3)
      ['ist-ungueltig', 'f', null], // Ende ohne Beginn
    ]);
  });
});

describe('Grenzen der Rechnung', () => {
  it('Termine nach dem 31.12.9999: ohne Termine, mit Befund', () => {
    // Im Dezember 9999 gibt es keine 100 Arbeitstage mehr. a passt früh hinein, seine späte Lage (vom Projektende
    // zurückgerechnet) aber nicht; beide bleiben ohne Termine.
    const e = bauzeitenplanBerechnen(
      plan([vorgang('a', 1), vorgang('b', 100)], { projektbeginn: '9999-12-01' }),
    );
    expect(e.vorgaenge.map((v) => v.termine)).toEqual([null, null]);
    expect(e.projektende).toBeNull();
    expect(codes(e)).toEqual([
      ['termin-ausserhalb-kalender', 'a', null],
      ['termin-ausserhalb-kalender', 'b', null],
    ]);
  });

  it('eine Terminvorgabe ohne Arbeitstag bis zum 31.12.9999: ohne Termine, mit Befund', () => {
    // 31.12.9999 ist ein Freitag (wie 31.12.1999, 400-Jahre-Zyklus); als freier Tag folgt kein Arbeitstag mehr.
    const e = bauzeitenplanBerechnen(
      plan([vorgang('a', 1, [], { fruehesterBeginn: '9999-12-31' }), vorgang('b', 1, [ea('a')])], {
        kalender: { arbeitstage: STANDARD_ARBEITSTAGE, bundesland: null, freieTage: ['9999-12-31'] },
      }),
    );
    expect(e.vorgaenge.map((v) => v.termine?.beginn ?? null)).toEqual([null, '2027-01-04']);
    expect(codes(e)).toEqual([
      ['termin-ausserhalb-kalender', 'a', null],
      ['vorgaenger-ohne-termine', 'b', 'a'],
    ]);
  });

  it(`mehr als ${String(KRITISCHE_WEGE_HOECHSTENS)} kritische Wege: die ersten in fester Reihenfolge, dazu ein Befund`, () => {
    // Fünf Stufen mit je zwei gleich langen Vorgängen, jede Stufe nach beiden der vorigen: 2^5 = 32 kritische Wege.
    const stufen = [1, 2, 3, 4, 5];
    const vorgaenge = stufen.flatMap((s) =>
      ['a', 'b'].map((x) =>
        vorgang(`${String(s)}${x}`, 1, s === 1 ? [] : [ea(`${String(s - 1)}a`), ea(`${String(s - 1)}b`)]),
      ),
    );
    const e = bauzeitenplanBerechnen(plan(vorgaenge));
    expect(e.kritischeWege).toHaveLength(KRITISCHE_WEGE_HOECHSTENS);
    expect(e.kritischeWege[0]).toEqual(['1a', '2a', '3a', '4a', '5a']);
    // Weg 20 (Nummer 19, binär 10011 von der ersten Stufe an): b, a, a, b, b.
    expect(e.kritischeWege[19]).toEqual(['1b', '2a', '3a', '4b', '5b']);
    expect(codes(e)).toEqual([['kritische-wege-gekuerzt', null, null]]);
  });
});
