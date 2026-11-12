// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Aufmaß-Befehle (Ticket 80, Q1): Für jeden Befehl an jedem Blatt (oder ohne Blatt), gültig oder nicht,
// gilt: Ein angenommener Befehl ist umkehrbar (anwenden ∘ umkehren = Identität, doppelte Umkehrung = ChangeSet), sein
// `vorher` ist der Zustand, und das Blatt danach hält die Form des Vertrags (eine Zeile je Position, kein leerer Ansatz,
// Nummer fest). Ein abgewiesener Befehl liefert einen Fehlerwert, nie eine Ausnahme.

import fc from 'fast-check';
import type {
  Ansatzzeile,
  Aufmass,
  AufmassBefehl,
  AufmassId,
  AufmassZustand,
  Aufmassposition,
  AuftragsLeistungsverzeichnisId,
  Menge,
  PositionId,
  ProjektId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { aufmassBefehlAusfuehren } from './aufmass-befehle';
import { aufmassChangeSetAnwenden, aufmassChangeSetUmkehren } from './aufmass-changeset';

const menge: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.integer({ min: -99_999, max: 999_999 }).map((n) => {
    const betrag = Math.abs(n);
    const text = `${String(Math.trunc(betrag / 1000))}.${String(betrag % 1000).padStart(3, '0')}`;
    return n < 0 ? `-${text}` : text;
  }),
  fc.constantFrom('1.00', '1,000', '', 'x'),
);

const ansatzzeile: fc.Arbitrary<Ansatzzeile> = fc.record({
  zeile: fc.integer({ min: 1, max: 20 }),
  formel: fc.constantFrom(91, 1, 2),
  ausdruck: fc.constantFrom('1', '2*3', '0,5*(2+1)', '2*('),
  variable: fc.option(fc.constantFrom('a', 'b'), { nil: null }),
});

const ansatz: fc.Arbitrary<readonly Ansatzzeile[] | null> = fc.oneof(
  fc.constant(null),
  fc.constant([]),
  fc.array(ansatzzeile, { minLength: 1, maxLength: 3 }),
  fc.constant([{ zeile: 1.5, formel: 91, ausdruck: '1', variable: null }]),
);

const zeile: fc.Arbitrary<Aufmassposition> = fc.record({
  positionId: fc.constantFrom('p1', 'p2', 'p3', 'p4', '').map((p) => p as PositionId),
  mengenansatz: ansatz,
  menge: menge.map((m) => m as Menge | null),
});

const datum = fc.constantFrom(null, '2026-11-02', '2028-02-29', '2026-02-30', '2.11.2026');

const blatt: fc.Arbitrary<Aufmass> = fc.record({
  id: fc.constantFrom('blatt-1', '').map((i) => i as AufmassId),
  projektId: fc.constant('projekt' as ProjektId),
  auftragsLvId: fc.constant('auftrag' as AuftragsLeistungsverzeichnisId),
  nummer: fc.oneof(fc.integer({ min: 1, max: 30 }), fc.constantFrom(0, -2, 1.5)),
  bezeichnung: fc.string({ maxLength: 8 }),
  datum,
  positionen: fc.array(zeile, { maxLength: 6 }),
});

const befehl: fc.Arbitrary<AufmassBefehl> = fc.oneof(
  blatt.map((aufmass): AufmassBefehl => ({ art: 'AufmassAnlegen', aufmass })),
  fc
    .record({ bezeichnung: fc.string({ maxLength: 8 }), datum })
    .map((k): AufmassBefehl => ({ art: 'AufmasskopfSetzen', ...k })),
  zeile.map((position): AufmassBefehl => ({ art: 'AufmasspositionSetzen', position })),
  fc.constantFrom('p1', 'p2', 'p5').map((p): AufmassBefehl => ({
    art: 'AufmasspositionEntfernen',
    positionId: p as PositionId,
  })),
  fc.constant<AufmassBefehl>({ art: 'AufmassLoeschen' }),
);

/** Ein gültiger Zustand: das Blatt, wie der Ausführer es angelegt hat, oder kein Blatt. */
const zustand: fc.Arbitrary<AufmassZustand | null> = fc.option(blatt, { nil: null }).map((b) => {
  if (b === null) return null;
  const cs = aufmassBefehlAusfuehren(null, { art: 'AufmassAnlegen', aufmass: b });
  return cs.ok ? aufmassChangeSetAnwenden(null, cs.wert) : null;
});

describe('Aufmaß-Befehle: Eigenschaften', () => {
  it('anwenden ∘ umkehren = Identität für jeden angenommenen Befehl; das Blatt danach hält die Form', () => {
    fc.assert(
      fc.property(zustand, befehl, (z, b) => {
        const antwort = aufmassBefehlAusfuehren(z, b);
        if (!antwort.ok) {
          expect(antwort.fehler.code).toMatch(/^(ungueltige-eingabe|befehl-nicht-zustaendig)$/);
          return;
        }
        const cs = antwort.wert;
        expect(cs.aufmass.vorher).toEqual(z?.aufmass ?? null);
        expect(aufmassChangeSetUmkehren(aufmassChangeSetUmkehren(cs))).toEqual(cs);
        const danach = aufmassChangeSetAnwenden(z, cs);
        expect(aufmassChangeSetAnwenden(danach, aufmassChangeSetUmkehren(cs))).toEqual(z);
        if (danach === null) return;
        const ids = danach.aufmass.positionen.map((p) => p.positionId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const p of danach.aufmass.positionen) expect(p.mengenansatz).not.toEqual([]);
        if (z !== null) expect(danach.aufmass.nummer).toBe(z.aufmass.nummer);
      }),
      { numRuns: 500 },
    );
  });
});
