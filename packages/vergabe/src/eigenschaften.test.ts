// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Test (Ticket 36, Q1): zufällige Folgen von Angebotsbefehlen. Nach jedem Befehl ist der Summenstand gleich der
// Neuberechnung; die Umkehrung des ChangeSets stellt den Vorzustand ohne dessen Kenntnis her; doppelte Umkehrung = ChangeSet.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { AngebotBefehl, AngebotZustand, Angebotsposition, Nachlass } from '@tethys/vertrag';
import {
  angebotBefehlAusfuehrer,
  angebotChangeSetAnwenden,
  angebotChangeSetUmkehren,
  angebotSummenBerechnen,
} from './index';
import {
  angebot,
  betrag,
  ep,
  erwarteOk,
  lv,
  nichtAngeboten,
  position,
  projekt,
  prozent,
  titel,
} from './testhilfen';

const z = lv('lv-e', [
  titel('t1', 'lv-e', 0),
  titel('t11', 't1', 0),
  position('p1', 't11', 0, '3.500'),
  position('p2', 't11', 1, '0.125', null, { bedarf: 'ohne-gesamtbetrag' }),
  position('p3', 't1', 1, '12.000'),
  titel('t2', 'lv-e', 1),
  position('p4', 't2', 0, '1.000', null, { wahl: { gruppe: 1, variante: 1, grundpositionId: null } }),
  position('p5', 't2', 1, null),
  position('p6', 't2', 2, '7.777', null, { bedarf: 'mit-gesamtbetrag' }),
  position('p7', 'lv-e', 2, '-2.500'),
]);
const POSITIONEN = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const ausfuehren = angebotBefehlAusfuehrer(projekt(['b']), z);

const epText = fc.bigInt({ min: -50_000n, max: 2_000_000n }).map((n) => {
  const neg = n < 0n;
  const s = (neg ? -n : n).toString().padStart(4, '0');
  return `${neg ? '-' : ''}${s.slice(0, -3)}.${s.slice(-3)}`;
});

const angebotsposition: fc.Arbitrary<Angebotsposition> = fc.oneof(
  fc.tuple(fc.constantFrom(...POSITIONEN), epText).map(([p, e]) => ep(p, e)),
  fc.constantFrom(...POSITIONEN).map((p) => nichtAngeboten(p)),
  fc.constantFrom(ep('p1', '0.000'), ep('p3', '1.000')),
);

const zahl2 = fc.bigInt({ min: 0n, max: 10_000n }).map((n) => {
  const s = n.toString().padStart(3, '0');
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
});
const nachlass: fc.Arbitrary<Nachlass> = fc.oneof(
  zahl2.filter((s) => Number(s) <= 100).map((s) => prozent(s)),
  zahl2.map((s) => betrag(s)),
);

const befehl: fc.Arbitrary<AngebotBefehl> = fc.oneof(
  {
    weight: 6,
    arbitrary: angebotsposition.map((position): AngebotBefehl => ({
      art: 'AngebotspositionSetzen',
      position,
    })),
  },
  {
    weight: 2,
    arbitrary: nachlass.map((n): AngebotBefehl => ({ art: 'AngebotsNachlassSetzen', nachlass: n })),
  },
  { weight: 1, arbitrary: fc.constant<AngebotBefehl>({ art: 'AngebotsNachlassEntfernen' }) },
);

const startpositionen = fc.uniqueArray(angebotsposition, { selector: (p) => p.positionId, maxLength: 7 });

describe('Eigenschaften der Angebotsbefehle', () => {
  it('Summenstand = Neuberechnung; Umkehrung stellt den Vorzustand her; doppelte Umkehrung = ChangeSet', () => {
    fc.assert(
      fc.property(
        startpositionen,
        fc.option(nachlass, { nil: null }),
        fc.array(befehl, { maxLength: 25 }),
        (start, n, befehle) => {
          const anlegen = erwarteOk(
            ausfuehren(null, { art: 'AngebotAnlegen', angebot: angebot('a', z, 'b', start, n) }),
          );
          let zustand = angebotChangeSetAnwenden(null, anlegen) as AngebotZustand;
          expect(angebotChangeSetAnwenden(zustand, angebotChangeSetUmkehren(anlegen))).toBeNull();
          for (const b of befehle) {
            const cs = erwarteOk(ausfuehren(zustand, b));
            const neu = angebotChangeSetAnwenden(zustand, cs) as AngebotZustand;
            expect(neu.summen).toEqual(angebotSummenBerechnen(z, neu.angebot));
            const umkehrung = angebotChangeSetUmkehren(cs);
            expect(angebotChangeSetAnwenden(neu, umkehrung)).toEqual(zustand);
            expect(angebotChangeSetUmkehren(umkehrung)).toEqual(cs);
            zustand = neu;
          }
          const loeschen = erwarteOk(ausfuehren(zustand, { art: 'AngebotLoeschen' }));
          expect(angebotChangeSetAnwenden(zustand, loeschen)).toBeNull();
          expect(angebotChangeSetAnwenden(null, angebotChangeSetUmkehren(loeschen))).toEqual(zustand);
          expect(angebotChangeSetUmkehren(angebotChangeSetUmkehren(loeschen))).toEqual(loeschen);
        },
      ),
      { numRuns: 300 },
    );
  });
});
