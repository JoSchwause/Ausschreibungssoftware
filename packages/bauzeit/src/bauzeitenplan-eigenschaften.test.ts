// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Terminrechnung (Ticket 102 Punkt 6, Q1). Die Pläne sind in sich stimmig (Vorgänger nur aus früheren
// Vorgängen, also ohne Zyklus; gültige Werte; Beziehungen nur zwischen Vorgängen ohne Kinder). Das Orakel rechnet Daten
// unabhängig über `Date.UTC` im Test (das Paket selbst nutzt nie `Date`, A2) und Arbeitstage aus Wochentag, freien Tagen und
// der öffentlichen Feiertagsliste; es prüft die Ergebnisse gegen die Lesarten aus `BAUZEIT_ANNAHMEN`.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Arbeitskalender,
  Bauzeitenplaneingabe,
  Bauzeitenplanergebnis,
  Anordnungsart,
  Bundesland,
  Vorgang,
  VorgangId,
  Vorgangstermine,
  Wochentag,
} from './index';
import { BUNDESLAENDER, bauzeitenplanBerechnen, feiertage } from './index';

const MS_JE_TAG = 86_400_000;
const tagnr = (text: string): number => {
  const [j = 0, m = 1, t = 1] = text.split('-').map(Number);
  return Date.UTC(j, m - 1, t) / MS_JE_TAG;
};
const text = (tag: number): string => new Date(tag * MS_JE_TAG).toISOString().slice(0, 10);
const ARTEN: readonly Anordnungsart[] = ['ende-anfang', 'anfang-anfang', 'ende-ende', 'anfang-ende'];
const vid = (id: string): VorgangId => id as VorgangId;
const vomEnde = (art: Anordnungsart): boolean => art === 'ende-anfang' || art === 'ende-ende';
const zumEnde = (art: Anordnungsart): boolean => art === 'ende-ende' || art === 'anfang-ende';

/** Arbeitstag-Prüfung des Orakels: Wochentag aus `Date`, freie Tage, Feiertage des Landes. */
function arbeitstagOrakel(k: Arbeitskalender): (tag: number) => boolean {
  const frei = new Set(k.freieTage.map(tagnr));
  const jeJahr = new Map<number, Set<number>>();
  return (tag) => {
    const d = new Date(tag * MS_JE_TAG);
    const wochentag = (((d.getUTCDay() + 6) % 7) + 1) as Wochentag;
    if (!k.arbeitstage.includes(wochentag) || frei.has(tag)) return false;
    const jahr = d.getUTCFullYear();
    let f = jeJahr.get(jahr);
    if (f === undefined) {
      f = new Set(feiertage(jahr, k.bundesland).map((x) => tagnr(x.datum)));
      jeJahr.set(jahr, f);
    }
    return !f.has(tag);
  };
}

/** Arbeitstage ab dem Projektbeginn bis `bis` (Tagnummer): Index je Arbeitstag. */
function arbeitstagIndex(
  plan: Bauzeitenplaneingabe,
  bis: number,
): { index: Map<number, number>; ab: (tag: number) => number } {
  const istArbeitstag = arbeitstagOrakel(plan.kalender);
  const tage: number[] = [];
  for (let t = tagnr(plan.projektbeginn); t <= bis; t++) if (istArbeitstag(t)) tage.push(t);
  const index = new Map(tage.map((t, i) => [t, i]));
  // Index des ersten Arbeitstags am oder nach `tag` (vor dem Projektbeginn: 0).
  const ab = (tag: number): number => {
    const i = tage.findIndex((t) => t >= tag);
    return i === -1 ? tage.length : i;
  };
  return { index, ab };
}

interface Entwurf {
  readonly dauer: number;
  readonly vorgaenger: readonly {
    readonly von: number;
    readonly art: Anordnungsart;
    readonly abstand: number;
  }[];
  readonly vorgabe: number | null; // Tage nach dem Projektbeginn
  readonly sammel: number | null; // Nummer des Sammelvorgangs
}

const entwurfArb = (mitVorgaben: boolean, mitSammel: boolean, groessteDauer: number) =>
  fc.record({
    dauer: fc.integer({ min: 0, max: groessteDauer }),
    vorgaenger: fc.array(
      fc.record({ von: fc.nat(), art: fc.constantFrom(...ARTEN), abstand: fc.integer({ min: -3, max: 4 }) }),
      { maxLength: 3 },
    ),
    vorgabe: mitVorgaben
      ? fc.option(fc.integer({ min: -10, max: 40 }), { nil: null, freq: 4 })
      : fc.constant(null),
    sammel: mitSammel ? fc.option(fc.integer({ min: 0, max: 2 }), { nil: null }) : fc.constant(null),
  });

function planAus(
  projektbeginn: string,
  kalender: Arbeitskalender,
  entwuerfe: readonly Entwurf[],
): Bauzeitenplaneingabe {
  const p0 = tagnr(projektbeginn);
  const vorgaenge: Vorgang[] = entwuerfe.map((x, i) => ({
    id: vid(`v${String(i)}`),
    nummer: null,
    bezeichnung: `Vorgang ${String(i)}`,
    elternId: x.sammel === null ? null : vid(`s${String(x.sammel)}`),
    dauer: x.dauer,
    // Vorgänger nur aus früheren Vorgängen: kein Zyklus.
    vorgaenger:
      i === 0
        ? []
        : x.vorgaenger.map((b) => ({
            art: b.art,
            abstand: b.abstand,
            vorgaengerId: vid(`v${String(b.von % i)}`),
          })),
    fruehesterBeginn: x.vorgabe === null ? null : text(p0 + x.vorgabe),
    bezug: null,
    ist: null,
  }));
  const sammel = [0, 1, 2]
    .filter((s) => entwuerfe.some((x) => x.sammel === s))
    .map((s): Vorgang => ({
      id: vid(`s${String(s)}`),
      nummer: null,
      bezeichnung: `Sammelvorgang ${String(s)}`,
      elternId: null,
      dauer: 1,
      vorgaenger: [],
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    }));
  return { projektbeginn, kalender, vorgaenge: [...sammel, ...vorgaenge] };
}

const kalenderArb: fc.Arbitrary<Arbeitskalender> = fc.record({
  arbeitstage: fc.oneof(
    fc.constant<readonly Wochentag[]>([1, 2, 3, 4, 5]),
    fc.subarray<Wochentag>([1, 2, 3, 4, 5, 6, 7], { minLength: 1 }),
  ),
  bundesland: fc.option(fc.constantFrom<Bundesland>(...BUNDESLAENDER), { nil: null }),
  freieTage: fc
    .array(fc.integer({ min: 0, max: 150 }), { maxLength: 6 })
    .map((xs) => xs.map((x) => text(tagnr('2027-01-01') + x))),
});

const stimmigerPlan: fc.Arbitrary<Bauzeitenplaneingabe> = fc
  .tuple(
    fc.integer({ min: tagnr('2026-11-01'), max: tagnr('2027-03-31') }).map(text),
    kalenderArb,
    fc.array(entwurfArb(true, true, 8), { minLength: 1, maxLength: 12 }),
  )
  .map(([beginn, kalender, entwuerfe]) => planAus(beginn, kalender, entwuerfe));

/** Anfang (Index des ersten Tages) und Ende (Index nach dem letzten Tag) einer Lage nach dem Orakel. */
function lageIm(index: Map<number, number>, beginn: string, ende: string, dauer: number): [number, number] {
  const a = index.get(tagnr(beginn));
  const e = index.get(tagnr(ende));
  if (a === undefined || e === undefined) throw new Error(`kein Arbeitstag: ${beginn} oder ${ende}`);
  return [a, dauer === 0 ? a : e + 1];
}

function pruefeStimmig(plan: Bauzeitenplaneingabe, ergebnis: Bauzeitenplanergebnis): void {
  expect(ergebnis.befunde).toEqual([]);
  const termine = new Map<string, Vorgangstermine>();
  for (const v of ergebnis.vorgaenge) {
    expect(v.termine).not.toBeNull();
    if (v.termine !== null) termine.set(v.vorgangId, v.termine);
  }
  const letztes = Math.max(...[...termine.values()].flatMap((t) => [tagnr(t.ende), tagnr(t.spaetestesEnde)]));
  const { index, ab } = arbeitstagIndex(plan, letztes + 7);
  const kinder = new Set(plan.vorgaenge.map((v) => v.elternId).filter((x) => x !== null));
  const blaetter = plan.vorgaenge.filter((v) => !kinder.has(v.id));

  // Frühe und späte Lage je Blatt nach dem Orakel; Projektende = größtes Ende.
  const frueh = new Map<string, [number, number]>();
  const spaet = new Map<string, [number, number]>();
  for (const v of blaetter) {
    const t = termine.get(v.id);
    if (t === undefined) throw new Error(v.id);
    if (v.dauer === 0) expect(t.ende).toBe(t.beginn);
    if (v.dauer === 0) expect(t.spaetestesEnde).toBe(t.spaetesterBeginn);
    const [a, e] = lageIm(index, t.beginn, t.ende, v.dauer);
    const [sa, se] = lageIm(index, t.spaetesterBeginn, t.spaetestesEnde, v.dauer);
    expect(e - a).toBe(v.dauer);
    expect(se - sa).toBe(v.dauer);
    // Puffer: nie negativ, freier Puffer höchstens der Gesamtpuffer, Gesamtpuffer = spätester − frühester Beginn.
    expect(t.gesamtpuffer).toBe(sa - a);
    expect(t.gesamtpuffer).toBeGreaterThanOrEqual(0);
    expect(t.freierPuffer).toBeGreaterThanOrEqual(0);
    expect(t.freierPuffer).toBeLessThanOrEqual(t.gesamtpuffer);
    expect(t.kritisch).toBe(t.gesamtpuffer <= 0);
    frueh.set(v.id, [a, e]);
    spaet.set(v.id, [sa, se]);
  }
  const projektende = Math.max(...[...frueh.values()].map(([, e]) => e));
  expect(ergebnis.projektende).toBe(
    [...termine.values()].map((t) => t.ende).reduce((x, y) => (x > y ? x : y)),
  );

  for (const v of blaetter) {
    const [a, e] = frueh.get(v.id) ?? [0, 0];
    const [sa, se] = spaet.get(v.id) ?? [0, 0];
    expect(se).toBeLessThanOrEqual(projektende);
    // Vorwärtsrechnung: jede Bedingung erfüllt, und der Beginn ist der früheste mögliche.
    let fruehester = v.fruehesterBeginn === null ? 0 : ab(tagnr(v.fruehesterBeginn));
    for (const b of v.vorgaenger) {
      const [va, ve] = frueh.get(b.vorgaengerId) ?? [0, 0];
      const [vsa, vse] = spaet.get(b.vorgaengerId) ?? [0, 0];
      const anker = vomEnde(b.art) ? ve : va;
      expect(zumEnde(b.art) ? e : a).toBeGreaterThanOrEqual(anker + b.abstand);
      expect(zumEnde(b.art) ? se : sa).toBeGreaterThanOrEqual((vomEnde(b.art) ? vse : vsa) + b.abstand);
      fruehester = Math.max(fruehester, anker + b.abstand - (zumEnde(b.art) ? v.dauer : 0));
    }
    expect(a).toBe(Math.max(0, fruehester));
  }

  // Sammelvorgang: Hülle seiner Kinder, kleinster Puffer.
  for (const s of plan.vorgaenge.filter((v) => kinder.has(v.id))) {
    const t = termine.get(s.id);
    const k = plan.vorgaenge.filter((v) => v.elternId === s.id).map((v) => termine.get(v.id));
    const min = (xs: string[]): string => xs.reduce((x, y) => (x < y ? x : y));
    const max = (xs: string[]): string => xs.reduce((x, y) => (x > y ? x : y));
    expect(t?.beginn).toBe(min(k.map((x) => x?.beginn ?? '')));
    expect(t?.ende).toBe(max(k.map((x) => x?.ende ?? '')));
    expect(t?.spaetesterBeginn).toBe(min(k.map((x) => x?.spaetesterBeginn ?? '')));
    expect(t?.spaetestesEnde).toBe(max(k.map((x) => x?.spaetestesEnde ?? '')));
    expect(t?.gesamtpuffer).toBe(Math.min(...k.map((x) => x?.gesamtpuffer ?? 0)));
  }
}

describe('Eigenschaften der Terminrechnung (stimmige Pläne)', () => {
  it('Puffer ≥ 0, freier Puffer ≤ Gesamtpuffer; jede Beziehung erfüllt, Beginn frühestmöglich; Sammelvorgang als Hülle', () => {
    fc.assert(
      fc.property(stimmigerPlan, (plan) => {
        pruefeStimmig(plan, bauzeitenplanBerechnen(plan));
      }),
      { numRuns: 200 },
    );
  });

  it('jeder kritische Weg ist zusammenhängend und besteht aus kritischen Vorgängen; jeder kritische Vorgang liegt auf einem', () => {
    fc.assert(
      fc.property(stimmigerPlan, (plan) => {
        const e = bauzeitenplanBerechnen(plan);
        const vorgang = new Map(plan.vorgaenge.map((v) => [v.id, v]));
        const termine = new Map(e.vorgaenge.map((v) => [v.vorgangId, v]));
        const aufWeg = new Set<string>();
        expect(e.kritischeWege.length).toBeGreaterThan(0);
        for (const weg of e.kritischeWege) {
          expect(new Set(weg).size).toBe(weg.length);
          weg.forEach((id, i) => {
            aufWeg.add(id);
            expect(termine.get(id)?.termine?.kritisch).toBe(true);
            expect(termine.get(id)?.art).not.toBe('sammelvorgang');
            const vorher = weg[i - 1];
            if (vorher !== undefined) {
              expect(vorgang.get(id)?.vorgaenger.some((b) => b.vorgaengerId === vorher)).toBe(true);
            }
          });
        }
        if (e.befunde.length === 0) {
          for (const v of e.vorgaenge) {
            if (v.art !== 'sammelvorgang' && v.termine?.kritisch === true)
              expect(aufWeg.has(v.vorgangId)).toBe(true);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('eine Arbeitswoche später begonnen, liegt ohne Feiertage im Weg alles eine Arbeitswoche später', () => {
    // Montag bis Freitag ohne Land und ohne freie Tage; Juni bis September 2027 ist feiertagsfrei (Pfingstmontag 17.05.,
    // 03.10.2027 ist ein Sonntag). Höchstens 10 Vorgänge mit Dauer ≤ 5 und Abstand ≤ 4: Ende vor Mitte September.
    const kalender: Arbeitskalender = { arbeitstage: [1, 2, 3, 4, 5], bundesland: null, freieTage: [] };
    const verschiebe = (d: string): string => text(tagnr(d) + 7);
    fc.assert(
      fc.property(fc.array(entwurfArb(false, true, 5), { minLength: 1, maxLength: 10 }), (entwuerfe) => {
        const vorher = bauzeitenplanBerechnen(planAus('2027-06-07', kalender, entwuerfe));
        const nachher = bauzeitenplanBerechnen(planAus('2027-06-14', kalender, entwuerfe));
        expect(nachher.vorgaenge).toEqual(
          vorher.vorgaenge.map((v) => ({
            ...v,
            termine:
              v.termine === null
                ? null
                : {
                    ...v.termine,
                    beginn: verschiebe(v.termine.beginn),
                    ende: verschiebe(v.termine.ende),
                    spaetesterBeginn: verschiebe(v.termine.spaetesterBeginn),
                    spaetestesEnde: verschiebe(v.termine.spaetestesEnde),
                  },
          })),
        );
        expect(nachher.kritischeWege).toEqual(vorher.kritischeWege);
        expect(nachher.projektende).toBe(vorher.projektende === null ? null : verschiebe(vorher.projektende));
      }),
      { numRuns: 200 },
    );
  });
});
