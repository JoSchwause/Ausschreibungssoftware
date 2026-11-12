// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Befehle am Bauzeitenplan (Ticket 109, Q1, Q5): Zufällige Folgen von `VorgangSetzen` und
// `VorgangEntfernen`. Jeder Schritt wählt Sammelvorgang, Geschwister (`nach`) und Vorgänger aus dem jeweils aktuellen Plan,
// damit die meisten Befehle angenommen werden; einige laufen auf `zyklus` (Sammelvorgang im eigenen Teilbaum). Für jede Folge
// gilt: Jedes angenommene ChangeSet lässt sich anwenden und umkehren (Undo stellt den Stand genau her); der Plan danach geht
// durch die Formprüfung des Anlegens (Dokumentreihenfolge, kein hängender Verweis), und die Terminrechnung findet nichts,
// was der Ausführer hätte abweisen müssen.

import fc from 'fast-check';
import type {
  Anordnungsart,
  Anordnungsbeziehung,
  Bauzeitenplan,
  BauzeitenplanBefehl,
  BauzeitenplanChangeSet,
  BauzeitenplanId,
  ProjektId,
  VorgangId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { Bauzeitbefundcode } from './index';
import {
  bauzeitenplanBefehlAusfuehren,
  bauzeitenplanBerechnen,
  bauzeitenplanChangeSetAnwenden,
  bauzeitenplanChangeSetUmkehren,
} from './index';

const VORRAT = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x) => x as VorgangId);
const ARTEN: readonly Anordnungsart[] = ['ende-anfang', 'anfang-anfang', 'ende-ende', 'anfang-ende'];
/** Befunde, die nur ein Plan haben kann, den der Ausführer nicht angenommen hätte. */
const NUR_OHNE_AUSFUEHRER: readonly Bauzeitbefundcode[] = [
  'id-doppelt',
  'eltern-unbekannt',
  'eltern-zyklus',
  'vorgaenger-unbekannt',
  'dauer-ungueltig',
  'abstand-ungueltig',
  'anordnungsart-unbekannt',
  'terminvorgabe-ungueltig',
];

const LEER: Bauzeitenplan = {
  id: '019b7a12-d000-7000-8000-000000000001' as BauzeitenplanId,
  projektId: '019b7a12-d000-7000-8000-000000000002' as ProjektId,
  name: 'Eigenschaften',
  projektbeginn: '2027-01-04',
  kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: 'BY', freieTage: [] },
  vorgaenge: [],
};

/** Absicht eines Schritts; Indizes wählen erst beim Ausführen aus dem aktuellen Plan. */
type Absicht =
  | {
      readonly art: 'setzen';
      readonly id: VorgangId;
      readonly eltern: number;
      readonly nach: number;
      readonly dauer: number;
      readonly vorgaenger: readonly {
        readonly index: number;
        readonly art: Anordnungsart;
        readonly abstand: number;
      }[];
    }
  | { readonly art: 'entfernen'; readonly index: number };

const absichtArb: fc.Arbitrary<Absicht> = fc.oneof(
  {
    weight: 4,
    arbitrary: fc.record({
      art: fc.constant('setzen' as const),
      id: fc.constantFrom(...VORRAT),
      eltern: fc.nat(),
      nach: fc.nat(),
      dauer: fc.integer({ min: 0, max: 6 }),
      vorgaenger: fc.array(
        fc.record({
          index: fc.nat(),
          art: fc.constantFrom(...ARTEN),
          abstand: fc.integer({ min: -2, max: 3 }),
        }),
        { maxLength: 3 },
      ),
    }),
  },
  { weight: 1, arbitrary: fc.record({ art: fc.constant('entfernen' as const), index: fc.nat() }) },
);

/** Macht aus der Absicht einen Befehl am aktuellen Plan. */
function befehlAus(plan: Bauzeitenplan, x: Absicht): BauzeitenplanBefehl | null {
  const ids = plan.vorgaenge.map((v) => v.id);
  if (x.art === 'entfernen') {
    const vorgangId = ids[x.index % Math.max(ids.length, 1)];
    return vorgangId === undefined ? null : { art: 'VorgangEntfernen', vorgangId };
  }
  const elternId = ids[x.eltern % (ids.length + 1)] ?? null;
  const geschwister = plan.vorgaenge.filter((v) => v.elternId === elternId && v.id !== x.id).map((v) => v.id);
  const nach = geschwister[x.nach % (geschwister.length + 1)] ?? null;
  const andere = ids.filter((id) => id !== x.id);
  const vorgaenger: Anordnungsbeziehung[] = [];
  for (const b of x.vorgaenger) {
    const vorgaengerId = andere[b.index % Math.max(andere.length, 1)];
    if (vorgaengerId === undefined) continue;
    if (vorgaenger.some((w) => w.vorgaengerId === vorgaengerId && w.art === b.art)) continue;
    vorgaenger.push({ vorgaengerId, art: b.art, abstand: b.abstand });
  }
  return {
    art: 'VorgangSetzen',
    vorgang: {
      id: x.id,
      nummer: null,
      bezeichnung: `Vorgang ${x.id}`,
      elternId,
      dauer: x.dauer,
      vorgaenger,
      fruehesterBeginn: null,
      bezug: null,
      ist: null,
    },
    nach,
  };
}

describe('Eigenschaften der Befehle (Ticket 109)', () => {
  it('Undo stellt jeden Stand genau her; jeder Stand ist ein gültiger Plan in Dokumentreihenfolge', () => {
    let angenommen = 0;
    let abgewiesen = 0;
    let entfernt = 0;
    fc.assert(
      fc.property(fc.array(absichtArb, { minLength: 1, maxLength: 30 }), (absichten) => {
        let plan = LEER;
        const verlauf: { vorher: Bauzeitenplan; cs: BauzeitenplanChangeSet }[] = [];
        for (const absicht of absichten) {
          const befehl = befehlAus(plan, absicht);
          if (befehl === null) continue;
          const e = bauzeitenplanBefehlAusfuehren({ bauzeitenplan: plan }, befehl);
          if (!e.ok) {
            // Abgewiesen wird hier nur ein Sammelvorgang im eigenen Teilbaum.
            expect([e.fehler.code, e.fehler.feld]).toEqual(['zyklus', 'elternId']);
            abgewiesen++;
            continue;
          }
          angenommen++;
          if (befehl.art === 'VorgangEntfernen') entfernt++;
          const cs = e.wert;
          expect(cs.bauzeitenplan.vorher).toBe(plan);
          const neu = bauzeitenplanChangeSetAnwenden({ bauzeitenplan: plan }, cs);
          if (neu === null) throw new Error('Plan unerwartet gelöscht');
          expect(bauzeitenplanChangeSetUmkehren(bauzeitenplanChangeSetUmkehren(cs))).toEqual(cs);
          expect(bauzeitenplanChangeSetAnwenden(neu, bauzeitenplanChangeSetUmkehren(cs))).toEqual({
            bauzeitenplan: plan,
          });
          verlauf.push({ vorher: plan, cs });
          plan = neu.bauzeitenplan;

          // Der neue Stand ginge als ganzer Plan durch die Formprüfung (kein hängender Verweis, D-97.9).
          const alsGanzes = bauzeitenplanBefehlAusfuehren(null, {
            art: 'BauzeitenplanAnlegen',
            bauzeitenplan: plan,
          });
          expect(alsGanzes.ok ? null : alsGanzes.fehler).toBeNull();
          const codes = bauzeitenplanBerechnen(plan).befunde.map((b) => b.code);
          expect(codes.filter((c) => (NUR_OHNE_AUSFUEHRER as readonly string[]).includes(c))).toEqual([]);
        }
        // Rückwärts rückgängig gemacht: zurück zum leeren Plan.
        for (const { vorher, cs } of [...verlauf].reverse()) {
          const zurueck = bauzeitenplanChangeSetAnwenden(
            { bauzeitenplan: plan },
            bauzeitenplanChangeSetUmkehren(cs),
          );
          expect(zurueck).toEqual({ bauzeitenplan: vorher });
          plan = vorher;
        }
        expect(plan).toBe(LEER);
      }),
      { numRuns: 300 },
    );
    // Die Folgen prüfen wirklich etwas: die meisten Befehle werden angenommen, darunter viele Entfernungen.
    expect(angenommen).toBeGreaterThan(4 * abgewiesen);
    expect(entfernt).toBeGreaterThan(100);
  });
});
