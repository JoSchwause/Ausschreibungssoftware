// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Test zum Mengenansatz (Ticket 56, Punkt 1; D-22): beliebige Folgen aus `MengenansatzSetzen` und allen Befehlen,
// die eine Position anfassen (Menge, Preis, Einheit, Texte, Merkmale, OZ, Einfügen einer Kopie, Verschieben, Papierkorb,
// Löschen). Nach jedem angenommenen Befehl gilt:
//  - Lesart (a): Ändert ein anderer Befehl als `MengenansatzSetzen` die Menge einer Position, trägt sie danach keinen
//    Ansatz; sonst ändert kein anderer Befehl den Ansatz einer bestehenden Position;
//  - im Zustand steht nie `mengenansatz: []`;
//  - der inkrementelle Summenstand ist gleich der Neuberechnung, die Invarianten halten;
//  - die Umkehrung des ChangeSets allein stellt den Vorzustand exakt her (anwenden ∘ umkehren = Identität).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Ansatzzeile,
  Einheitspreis,
  HinweistextId,
  Knoten,
  LosId,
  LvBefehl,
  LvZustand,
  Menge,
  Ordnungszahl,
  PapierkorbeintragId,
  Position,
  PositionId,
  TitelId,
} from '@tethys/vertrag';
import {
  changeSetUmkehren,
  kopieBauen,
  lvBefehlAusfuehren,
  pruefeLvInvarianten,
  summenBerechnen,
} from './index';
import type { KopieIdQuelle } from './index';
import { LV_ID, anwenden, lvMit, merkmale, posKnoten, titelKnoten } from './testhilfen';

const ansatzzeile: fc.Arbitrary<Ansatzzeile> = fc.record({
  zeile: fc.integer({ min: 1, max: 9 }),
  formel: fc.constantFrom(91, 1, 12),
  ausdruck: fc.constantFrom('1', '2,5*3', 'Z1+1', 'a/0', ''),
  variable: fc.constantFrom(null, 'a', 'b'),
});
const ansatz = fc.oneof(
  { weight: 1, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constant([] as Ansatzzeile[]) },
  { weight: 4, arbitrary: fc.array(ansatzzeile, { minLength: 1, maxLength: 3 }) },
);
const menge = fc.option(
  fc
    .integer({ min: 0, max: 20_000 })
    .map((n) => `${String(Math.floor(n / 1000))}.${String(n % 1000).padStart(3, '0')}` as Menge),
  { nil: null },
);

/** Ein Schritt: Befehlsart und Zahlen, die der Zustand deutet (welche Position, welcher Ort). */
const schritt = fc.record({
  art: fc.nat(13),
  a: fc.nat(50),
  b: fc.nat(50),
  ansatz,
  menge,
});
type Schritt = typeof schritt extends fc.Arbitrary<infer T> ? T : never;

function start(): LvZustand {
  const ansatzP1: readonly Ansatzzeile[] = [{ zeile: 1, formel: 91, ausdruck: '2', variable: null }];
  return lvMit([
    { ...titelKnoten('T1', LV_ID, 0), ordnungszahl: '01' as Ordnungszahl },
    { ...posKnoten('P1', 'T1', 0, '2.000', '10.000'), mengenansatz: ansatzP1 },
    posKnoten('P2', 'T1', 1, '3.000', '5.000'),
    { ...titelKnoten('T2', LV_ID, 1), ordnungszahl: '02' as Ordnungszahl },
    { ...posKnoten('P3', 'T2', 0, '1.000', '100.000'), mengenansatz: ansatzP1 },
    posKnoten('P4', 'T2', 1, '1.000', '7.000', { merkmale: merkmale({ bedarf: 'ohne-gesamtbetrag' }) }),
  ]);
}

const waehle = <T>(liste: readonly T[], i: number): T | undefined =>
  liste.length === 0 ? undefined : liste[i % liste.length];

function zaehler(): KopieIdQuelle & { eintrag(): PapierkorbeintragId } {
  let n = 0;
  const neu = (art: string): string => `neu-${art}${String(++n)}`;
  return {
    los: () => neu('L') as LosId,
    titel: () => neu('T') as TitelId,
    position: () => neu('P') as PositionId,
    hinweistext: () => neu('H') as HinweistextId,
    eintrag: () => neu('E') as PapierkorbeintragId,
  };
}

function befehl(z: LvZustand, s: Schritt, ids: ReturnType<typeof zaehler>): LvBefehl | null {
  const knoten = z.leistungsverzeichnis.knoten;
  const positionen = knoten.filter((k): k is Position => k.art === 'position');
  const p = waehle(positionen, s.a);
  const k = waehle(knoten, s.b);
  const korb = z.papierkorb ?? [];
  if (p === undefined) return null;
  switch (s.art) {
    case 0:
    case 1:
    case 2:
      return { art: 'MengenansatzSetzen', positionId: p.id, mengenansatz: s.ansatz, menge: s.menge };
    case 3:
    case 4:
      return { art: 'MengeAendern', positionId: p.id, menge: s.menge };
    case 5:
      return { art: 'EinheitspreisAendern', positionId: p.id, einheitspreis: '3.500' as Einheitspreis };
    case 6:
      return { art: 'EinheitAendern', positionId: p.id, einheit: s.b % 2 === 0 ? 'm' : '' };
    case 7:
      return { art: 'KurztextAendern', knotenId: p.id, kurztext: `K${String(s.b)}` };
    case 8:
      return {
        art: 'PositionsmerkmaleSetzen',
        positionId: p.id,
        merkmale: merkmale({ bedarf: s.b % 2 === 0 ? null : 'mit-gesamtbetrag' }),
        zuschlag: p.zuschlag,
      };
    case 9:
      return {
        art: 'KnotenEinfuegen',
        ort: { art: 'nach', knotenId: k?.id ?? p.id },
        knoten: kopieBauen(z, [p.id], ids),
      };
    case 10:
      return k === undefined
        ? null
        : { art: 'KnotenlisteVerschieben', knotenIds: [p.id], ziel: { art: 'nach', knotenId: k.id } };
    case 11:
      return { art: 'KnotenInPapierkorbLegen', eintragId: ids.eintrag(), knotenIds: [p.id] };
    case 12: {
      const e = waehle(korb, s.b);
      return e === undefined
        ? null
        : { art: 'PapierkorbeintragWiederherstellen', eintragId: e.id, ort: null };
    }
    default:
      return { art: 'OrdnungszahlSetzen', knotenId: p.id, ordnungszahl: null, ozIndex: null };
  }
}

const positionenVon = (z: LvZustand): Map<string, Position> =>
  new Map(
    z.leistungsverzeichnis.knoten
      .filter((k): k is Position => k.art === 'position')
      .map((k) => [k.id as string, k]),
  );

const leererAnsatz = (k: Knoten): boolean => k.art === 'position' && k.mengenansatz?.length === 0;

describe('Mengenansatz: Folgen aus MengenansatzSetzen und allen Befehlen an Positionen', () => {
  it('Lesart (a) gilt für jeden Mengenbefehl, nie [] im Zustand, Summen stimmen, jedes ChangeSet ist umkehrbar', () => {
    const gesehen = new Map<string, number>();
    let ansatzEntfernt = 0;
    fc.assert(
      fc.property(fc.array(schritt, { minLength: 1, maxLength: 25 }), (folge) => {
        const ids = zaehler();
        let z = start();
        for (const s of folge) {
          const b = befehl(z, s, ids);
          if (b === null) continue;
          const e = lvBefehlAusfuehren(z, b);
          if (!e.ok) continue;
          gesehen.set(b.art, (gesehen.get(b.art) ?? 0) + 1);
          const neu = anwenden(z, e.wert);
          const vorher = positionenVon(z);
          for (const [kennung, nachher] of positionenVon(neu)) {
            const alt = vorher.get(kennung);
            if (alt === undefined || b.art === 'MengenansatzSetzen') continue;
            if (alt.menge !== nachher.menge) {
              expect(nachher.mengenansatz, `${b.art} an ${kennung}`).toBeUndefined();
              if (alt.mengenansatz !== undefined) ansatzEntfernt++;
            } else expect(nachher.mengenansatz, `${b.art} an ${kennung}`).toEqual(alt.mengenansatz);
          }
          expect(neu.leistungsverzeichnis.knoten.some(leererAnsatz)).toBe(false);
          expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
          expect(pruefeLvInvarianten(neu.leistungsverzeichnis, neu.papierkorb)).toEqual([]);
          expect(anwenden(neu, changeSetUmkehren(e.wert))).toEqual(z);
          z = neu;
        }
      }),
      { numRuns: 200 },
    );
    expect(ansatzEntfernt).toBeGreaterThan(20);
    for (const art of [
      'MengenansatzSetzen',
      'MengeAendern',
      'KnotenEinfuegen',
      'PapierkorbeintragWiederherstellen',
    ])
      expect(gesehen.get(art) ?? 0, art).toBeGreaterThan(5);
  });
});
