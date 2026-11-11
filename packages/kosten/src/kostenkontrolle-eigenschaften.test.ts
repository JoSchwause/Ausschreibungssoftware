// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Kostenkontrolle (Ticket 82, D-37, Q1). Die Eingaben sind in sich stimmig wie aus dem Kern:
// Netto nach Nachlass = Σ GP der zählenden Positionen − Nachlass, im Leistungsstand Σ `gp` − Nachlass. Beträge entstehen
// als ganze Cent (`bigint`) im Test; die Orakel rechnen ohne `dezimal` und ohne die Implementierung.

import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  Kostenermittlung,
  KostenermittlungId,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  Leistungsstand,
  Position,
  PositionId,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { kostenkontrolleBerechnen } from './index';
import type { Kostenkontrolle, Kostenkontrolleingabe, Kostenkontrollwerte } from './index';

const runs = { numRuns: 200 };
const PROJEKT = 'p' as ProjektId;

function centText(cent: bigint): string {
  const neg = cent < 0n;
  const abs = neg ? -cent : cent;
  return `${neg ? '-' : ''}${(abs / 100n).toString()}.${(abs % 100n).toString().padStart(2, '0')}`;
}
function centVon(text: string | null): bigint {
  if (text === null) return 0n;
  const neg = text.startsWith('-');
  const [ganz = '0', rest = '00'] = (neg ? text.slice(1) : text).split('.');
  const w = BigInt(ganz) * 100n + BigInt(rest);
  return neg ? -w : w;
}
const betrag = (cent: bigint): Betrag => centText(cent) as Betrag;
/** Liegt `n` in der Gruppe `g` (gleich oder Nachfahre)? Allein aus den Ziffern. */
function liegtIn(n: string, g: string): boolean {
  if (g.endsWith('00')) return n[0] === g[0];
  if (g.endsWith('0')) return n.slice(0, 2) === g.slice(0, 2);
  return n === g;
}

interface Pos {
  readonly id: string;
  readonly kg: string | null;
  readonly gp: bigint | null;
  readonly zaehlt: boolean;
  /** GP im Leistungsstand. */
  readonly abgerechnet: bigint;
}
interface Auftrag {
  readonly id: string;
  readonly positionen: readonly Pos[];
  readonly nachlass: bigint;
  readonly abrechnungsnachlass: bigint;
  readonly mitLeistungsstand: boolean;
}

const kgGen = fc.option(
  fc
    .tuple(fc.constantFrom(1, 2, 3), fc.constantFrom(0, 1, 2), fc.constantFrom(0, 1, 2))
    .map(([a, b, c]) => `${String(a)}${String(b)}${String(c)}`),
  { nil: null, freq: 4 },
);
const centGen = fc.bigInt({ min: -100_000n, max: 10n ** 9n });
const auftragGen = (id: string): fc.Arbitrary<Auftrag> =>
  fc.record({
    id: fc.constant(id),
    positionen: fc
      .array(
        fc.record({
          kg: kgGen,
          gp: fc.option(centGen, { nil: null, freq: 6 }),
          zaehlt: fc.boolean(),
          abgerechnet: centGen,
        }),
        { maxLength: 12 },
      )
      .map((ps) => ps.map((p, i) => ({ ...p, id: `${id}-${String(i)}` }))),
    nachlass: fc.bigInt({ min: 0n, max: 100_000n }),
    abrechnungsnachlass: fc.bigInt({ min: 0n, max: 100_000n }),
    mitLeistungsstand: fc.boolean(),
  });
const budgetGen: fc.Arbitrary<Kostenermittlung | null> = fc.option(
  fc
    .uniqueArray(
      fc.tuple(
        kgGen.filter((k): k is string => k !== null),
        centGen,
      ),
      {
        selector: ([n]) => n,
        maxLength: 8,
      },
    )
    .map((eintraege): Kostenermittlung => ({
      id: 'ke' as KostenermittlungId,
      projektId: PROJEKT,
      stufe: 'kostenberechnung',
      name: 'KB',
      eintraege: eintraege.map(([n, c]) => ({ nummer: n as Kostengruppennummer, betrag: betrag(c) })),
    })),
  { nil: null },
);
const auftraegeGen = fc.tuple(auftragGen('A'), auftragGen('B')).chain(([a, b]) => fc.subarray([a, b]));

const zaehlt = (p: Pos): p is Pos & { gp: bigint } => p.zaehlt && p.gp !== null;

function position(p: Pos, eltern: AuftragsLeistungsverzeichnisId, reihenfolge: number): Position {
  return {
    art: 'position',
    id: p.id as PositionId,
    elternId: eltern,
    reihenfolge,
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext: p.id,
    langtext: [],
    menge: null,
    einheit: null,
    einheitspreis: null,
    epa: null,
    ...(p.kg === null ? {} : { kostengruppe: p.kg as Kostengruppennummer }),
  };
}

function zustand(a: Auftrag, knotenfolge: readonly Pos[], summenfolge: readonly Pos[]): AuftragsLvZustand {
  const id = a.id as AuftragsLeistungsverzeichnisId;
  const netto = a.positionen.filter(zaehlt).reduce((s, p) => s + p.gp, 0n);
  return {
    auftragsLeistungsverzeichnis: {
      id,
      projektId: PROJEKT,
      leistungsverzeichnisId: 'lv' as LeistungsverzeichnisId,
      angebotId: 'an' as AngebotId,
      name: a.id,
      ozMaske: {
        gliederung: [],
        position: { laenge: 4, zeichen: 'numerisch' },
        index: null,
        trennzeichen: null,
      },
      mwstSatz: '19.00' as Prozent,
      nachlass: null,
      knoten: knotenfolge.map((p, i) => position(p, id, i)),
    },
    summen: {
      positionen: summenfolge.map((p) => ({
        positionId: p.id as PositionId,
        gesamtpreis: p.gp === null ? null : betrag(p.gp),
        gehtInSummeEin: zaehlt(p),
      })),
      gliederungen: [],
      gesamt: {
        netto: betrag(netto),
        nachlass: betrag(a.nachlass),
        nettoNachNachlass: betrag(netto - a.nachlass),
        mwst: betrag(0n),
        brutto: betrag(0n),
      },
    },
  };
}

function leistungsstand(a: Auftrag, folge: readonly Pos[]): Leistungsstand {
  const leistung = a.positionen.reduce((s, p) => s + p.abgerechnet, 0n);
  return {
    positionen: folge.map((p) => ({
      positionId: p.id as PositionId,
      menge: null,
      gp: betrag(p.abgerechnet),
    })),
    leistung: betrag(leistung),
    nachlass: betrag(a.abrechnungsnachlass),
    nettoNachNachlass: betrag(leistung - a.abrechnungsnachlass),
  };
}

function eingabe(
  budget: Kostenermittlung | null,
  auftraege: readonly Auftrag[],
  folge: (ps: readonly Pos[]) => readonly Pos[] = (ps) => ps,
): Kostenkontrolleingabe {
  return {
    budget,
    auftraege: auftraege.map((a) => zustand(a, folge(a.positionen), folge(a.positionen))),
    leistungsstaende: auftraege
      .filter((a) => a.mitLeistungsstand)
      .map((a) => ({
        auftragsLvId: a.id as AuftragsLeistungsverzeichnisId,
        leistungsstand: leistungsstand(a, folge(a.positionen)),
      })),
  };
}

const SPALTEN = ['budget', 'vergabe', 'abrechnung', 'abweichung'] as const;

describe('Eigenschaften der Kostenkontrolle', () => {
  it('je Spalte: Ebene 1 + ohne Kostengruppe + Nachlass = Gesamt, auf den Cent; kein Befund „summe-abweichend“', () => {
    fc.assert(
      fc.property(budgetGen, auftraegeGen, (budget, auftraege) => {
        const r = kostenkontrolleBerechnen(eingabe(budget, auftraege));
        const ebene1 = r.kostengruppen.filter((z) => z.ebene === 1);
        for (const s of SPALTEN) {
          const zeilen = [...ebene1, r.ohneKostengruppe, r.nachlass].reduce((x, z) => x + centVon(z[s]), 0n);
          expect(centText(zeilen)).toBe(centText(centVon(r.gesamt[s])));
        }
        expect(r.befunde.some((x) => x.code === 'summe-abweichend')).toBe(false);
      }),
      runs,
    );
  });

  it('Vergabe und Abrechnung je Kostengruppe = Σ der Positionen in ihrem Teilbaum; Gesamt = Σ Netto nach Nachlass', () => {
    fc.assert(
      fc.property(budgetGen, auftraegeGen, (budget, auftraege) => {
        const r = kostenkontrolleBerechnen(eingabe(budget, auftraege));
        const alle = auftraege.flatMap((a) => a.positionen);
        const abgerechnet = auftraege.filter((a) => a.mitLeistungsstand).flatMap((a) => a.positionen);
        for (const z of r.kostengruppen) {
          const drin = (p: Pos): boolean => p.kg !== null && liegtIn(p.kg, z.nummer);
          expect(z.vergabe).toBe(
            centText(
              alle
                .filter(zaehlt)
                .filter(drin)
                .reduce((s, p) => s + p.gp, 0n),
            ),
          );
          expect(z.abrechnung).toBe(
            centText(abgerechnet.filter(drin).reduce((s, p) => s + p.abgerechnet, 0n)),
          );
        }
        const ohne = alle.filter((p) => p.kg === null);
        expect(r.ohneKostengruppe.vergabe).toBe(centText(ohne.filter(zaehlt).reduce((s, p) => s + p.gp, 0n)));
        expect(r.nachlass.vergabe).toBe(centText(-auftraege.reduce((s, a) => s + a.nachlass, 0n)));
        const netto = alle.filter(zaehlt).reduce((s, p) => s + p.gp, 0n);
        expect(r.gesamt.vergabe).toBe(centText(netto - auftraege.reduce((s, a) => s + a.nachlass, 0n)));
        // Budget nur mit gewählter Kostenermittlung; Abweichung = Vergabe − Budget, wo beide stehen
        for (const z of [...r.kostengruppen, r.ohneKostengruppe, r.nachlass, r.gesamt]) {
          if (budget === null) expect([z.budget, z.abweichung]).toEqual([null, null]);
          else if (z.budget !== null && z.abweichung !== null)
            expect(z.abweichung).toBe(centText(centVon(z.vergabe) - centVon(z.budget)));
        }
      }),
      runs,
    );
  });

  it('Reihenfolge der Positionen und der Auftrags-LVs ändert keine Zeile und nicht die Art der Befunde', () => {
    fc.assert(
      fc.property(budgetGen, auftraegeGen, fc.integer(), (budget, auftraege, saat) => {
        const mischen = (ps: readonly Pos[]): readonly Pos[] =>
          [...ps].sort(
            (x, y) =>
              ((x.id.length * 31 + saat) % 7) - ((y.id.length * 31 + saat) % 7) || (x.id < y.id ? 1 : -1),
          );
        const a = kostenkontrolleBerechnen(eingabe(budget, auftraege));
        const b = kostenkontrolleBerechnen(eingabe(budget, [...auftraege].reverse(), mischen));
        const zeilen = (
          r: Kostenkontrolle,
        ): [unknown, Kostenkontrollwerte, Kostenkontrollwerte, Kostenkontrollwerte] => [
          r.kostengruppen,
          r.ohneKostengruppe,
          r.nachlass,
          r.gesamt,
        ];
        expect(zeilen(b)).toEqual(zeilen(a));
        const arten = (r: Kostenkontrolle): string[] =>
          r.befunde.map((x) => `${x.code} ${x.auftragsLvId ?? ''} ${x.positionId ?? ''}`).sort();
        expect(arten(b)).toEqual(arten(a));
      }),
      runs,
    );
  });
});
