// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests (Q1, Ticket 108 Punkt 8): Die Reihenfolge der Bauteile und Strukturknoten im Modell ändert weder Ansatzzeilen
// noch Summen; jede Zuordnung ergibt genau eine Zeile oder einen Befund (nie 0); der Vergleich eines Modells mit sich selbst
// ist leer und der Vergleich in Gegenrichtung spiegelt hinzugefügt und entfernt.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Bauteil, Bauteilmenge, Bauwerksmodell, Knoten } from '@tethys/vertrag';
import {
  din277Berechnen,
  mengenuebernahmeBerechnen,
  modellVergleichen,
  vergleichsfolgenBerechnen,
} from './index';
import { bauteil, gid, m, modell, position, struktur, zuordnung } from './testhilfe/bauen';

const NAMEN = [
  ['Length', 'laenge'],
  ['Area', 'flaeche'],
  ['Volume', 'volumen'],
  ['Count', 'anzahl'],
  ['Weight', 'gewicht'],
] as const;

/** Eine Menge mit 3 Stellen aus einer ganzen Zahl von Tausendsteln (auch negativ). */
const wert = fc.bigInt({ min: -1_000_000n, max: 1_000_000_000n }).map((t) => {
  const betrag = (t < 0n ? -t : t).toString().padStart(4, '0');
  return m(`${t < 0n ? '-' : ''}${betrag.slice(0, -3)}.${betrag.slice(-3)}`);
});

const bauteilmenge: fc.Arbitrary<Bauteilmenge> = fc
  .tuple(fc.constantFrom(...NAMEN), fc.constantFrom('S1', 'S2', null), wert)
  .map(([[name, art], satz, w]) => ({ satz, name, art, wert: w }));

const ORTE = ['EG', 'OG', 'R1'] as const;

/** Ein Modell mit eindeutigen GlobalIds B0, B1, … (bei Doppelten gilt das erste Objekt, D-66: dann hängt es an der Reihenfolge). */
const modellArb: fc.Arbitrary<Bauwerksmodell> = fc
  .array(
    fc.tuple(
      fc.array(bauteilmenge, { maxLength: 4 }),
      fc.constantFrom(...ORTE),
      fc.constantFrom('IfcWall', 'IfcSlab'),
    ),
    {
      maxLength: 25,
    },
  )
  .map((teile) =>
    modell({
      bauteile: teile.map(([mengen, ort, klasse], i): Bauteil =>
        bauteil(`B${String(i)}`, mengen, { strukturGlobalId: gid(ort), ifcKlasse: klasse }),
      ),
    }),
  );

const EINHEITEN = ['m', 'm²', 'm³', 'St', 'kg', 't', 'psch', null] as const;
const MENGENARTEN = [...NAMEN.map(([n]) => n), 'Stueck', 'Fehlt'];

/** Positionen mit Zuordnungen zu B0 … B29 (auch zu Bauteilen, die es nicht gibt). */
const knotenArb: fc.Arbitrary<Knoten[]> = fc
  .array(
    fc.tuple(
      fc.constantFrom(...EINHEITEN),
      fc.array(fc.tuple(fc.nat({ max: 29 }), fc.constantFrom(...MENGENARTEN)), {
        minLength: 1,
        maxLength: 6,
      }),
    ),
    { maxLength: 5 },
  )
  .map((ps) =>
    ps.map(([einheit, z], i) =>
      position(
        `p${String(i)}`,
        einheit,
        z.map(([n, art]) => zuordnung(`B${String(n)}`, art)),
      ),
    ),
  );

const umgeordnet = (bm: Bauwerksmodell) =>
  fc
    .tuple(
      fc.shuffledSubarray([...bm.bauteile], { minLength: bm.bauteile.length }),
      fc.shuffledSubarray([...bm.struktur], { minLength: bm.struktur.length }),
    )
    .map(([bauteile, s]): Bauwerksmodell => ({ ...bm, bauteile, struktur: s }));

describe('Eigenschaften', () => {
  it('die Reihenfolge der Bauteile im Modell ändert weder Ansatzzeilen noch Mengen noch Befunde', () => {
    fc.assert(
      fc.property(
        modellArb.chain((bm) => fc.tuple(fc.constant(bm), umgeordnet(bm))),
        knotenArb,
        ([bm, anders], knoten) => {
          expect(mengenuebernahmeBerechnen(knoten, anders)).toEqual(mengenuebernahmeBerechnen(knoten, bm));
        },
      ),
    );
  });

  it('die Reihenfolge der Strukturknoten ändert BGF, BRI und NRF nicht', () => {
    fc.assert(
      fc.property(fc.shuffledSubarray(struktur(), { minLength: struktur().length }), (s) => {
        const d = din277Berechnen(modell({ struktur: s }));
        expect([d.bgf.wert, d.bri.wert, d.nrf.wert]).toEqual(['190.500', '550.250', '80.125']);
      }),
    );
  });

  it('jede Zuordnung ergibt genau eine Zeile oder einen Befund, nie eine Zeile 0 für Fehlendes', () => {
    fc.assert(
      fc.property(modellArb, knotenArb, (bm, knoten) => {
        const u = mengenuebernahmeBerechnen(knoten, bm);
        for (const p of u.positionen) {
          const zugeordnet = knoten.find((k) => k.id === p.positionId);
          const anzahl = zugeordnet?.art === 'position' ? (zugeordnet.bauteile?.length ?? 0) : 0;
          expect(p.zeilen.length + p.befunde.length).toBe(anzahl);
          expect(p.zeilen.map((z) => z.zeile)).toEqual(p.zeilen.map((_, i) => i + 1));
          expect(p.menge === null).toBe(p.zeilen.length === 0);
        }
      }),
    );
  });

  it('der Vergleich eines Modells mit sich selbst ist leer, ebenso seine Folgen', () => {
    fc.assert(
      fc.property(modellArb, knotenArb, (bm, knoten) => {
        const v = modellVergleichen(bm, bm);
        expect([v.hinzugefuegt, v.entfernt, v.geaendert, v.befunde]).toEqual([[], [], [], []]);
        expect(v.anzahlUnveraendert).toBe(bm.bauteile.length);
        for (const f of vergleichsfolgenBerechnen(knoten, bm, bm).positionen) {
          expect(f.betroffen).toBe(false);
          expect(f.differenz === null || f.differenz === '0.000').toBe(true);
        }
      }),
    );
  });

  it('der Vergleich in Gegenrichtung tauscht hinzugefügt und entfernt und nennt dieselben geänderten Bauteile', () => {
    fc.assert(
      fc.property(modellArb, modellArb, (a, b) => {
        const hin = modellVergleichen(a, b);
        const her = modellVergleichen(b, a);
        expect(her.entfernt).toEqual(hin.hinzugefuegt);
        expect(her.hinzugefuegt).toEqual(hin.entfernt);
        expect(her.geaendert.map((x) => x.globalId).sort()).toEqual(
          hin.geaendert.map((x) => x.globalId).sort(),
        );
        expect(her.anzahlUnveraendert).toBe(hin.anzahlUnveraendert);
      }),
    );
  });
});
