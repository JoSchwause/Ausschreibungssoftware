// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests der Rechnungsprüfung und der Rechnungsbefehle (Ticket 81, Q1):
// - Kette bis zur Schlussrechnung: Jede Abschlagsrechnung wird geprüft und mit ihrem Zahlbetrag freigegeben, die letzte ist
//   die Schlussrechnung. Dann ist Σ aller Zahlbeträge = Brutto kumuliert der Schlussrechnung − Σ Umlagen −
//   Gewährleistungseinbehalt (D-34 (7): die eingefrorenen Beträge teleskopieren).
// - Die Reihenfolge der Aufmaßblätter ändert weder Leistungsstand noch Kette.
// - Leistungsstand: eine Zeile je Position, Σ gp = Leistung, Netto n. N. = Leistung − Nachlass.
// - Jeder angenommene Rechnungsbefehl ist umkehrbar (anwenden ∘ umkehren = Identität).

import fc from 'fast-check';
import { addiere, subtrahiere, summiereBetraege } from '@tethys/dezimal';
import type {
  Aufmass,
  AufmassId,
  Betrag,
  Menge,
  Nachlass,
  PositionId,
  Prozent,
  Rechnung,
  RechnungBefehl,
  RechnungId,
  RechnungZustand,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { leistungsstandBerechnen } from './leistungsstand';
import { rechnungBefehlAusfuehren } from './rechnung-befehle';
import { rechnungChangeSetAnwenden, rechnungChangeSetUmkehren } from './rechnung-changeset';
import { rechnungPruefen } from './rechnung-pruefen';
import { auftragsLvZustand, m4Stand } from './testhilfen';

const m4 = m4Stand();
const positionen = m4.auftrag.auftragsLeistungsverzeichnis.knoten
  .filter((k) => k.art === 'position')
  .map((k) => k.id);

const menge = fc
  .integer({ min: -20_000, max: 300_000 })
  .map(
    (n) =>
      `${n < 0 ? '-' : ''}${String(Math.trunc(Math.abs(n) / 1000))}.${String(Math.abs(n) % 1000).padStart(3, '0')}`,
  )
  .map((m) => (m === '-0.000' ? '0.000' : m) as Menge);

const zeilen = fc.uniqueArray(fc.record({ positionId: fc.constantFrom(...positionen), menge }), {
  selector: (z) => z.positionId,
  maxLength: 8,
});

const satz = fc
  .integer({ min: 0, max: 1000 })
  .map((n) => `${String(Math.trunc(n / 100))}.${String(n % 100).padStart(2, '0')}` as Prozent);

const nachlass: fc.Arbitrary<Nachlass | null> = fc.oneof(
  fc.constant(null),
  satz.map((wert): Nachlass => ({ art: 'prozent', wert })),
  fc.integer({ min: 0, max: 500_000 }).map((n): Nachlass => ({
    art: 'betrag',
    wert: `${String(Math.trunc(n / 100))}.${String(n % 100).padStart(2, '0')}` as Betrag,
  })),
);

function blatt(i: number, z: readonly { positionId: PositionId; menge: Menge }[]): Aufmass {
  return {
    ...m4.blatt1,
    id: `blatt-${String(i)}` as AufmassId,
    nummer: i,
    positionen: z.map((x) => ({ positionId: x.positionId, mengenansatz: null, menge: x.menge })),
  };
}

function rechnung(
  i: number,
  art: Rechnung['art'],
  blaetter: number,
  umlagen: readonly Prozent[],
  s: Prozent,
  g: Prozent,
): Rechnung {
  return {
    ...m4.ar2,
    id: `rechnung-${String(i)}` as RechnungId,
    nummer: i,
    art,
    aufmassIds: Array.from({ length: blaetter }, (_, j) => `blatt-${String(j + 1)}` as AufmassId),
    umlagen: umlagen.map((u, j) => ({ bezeichnung: `Umlage ${String(j + 1)}`, satz: u })),
    sicherheitSatz: s,
    gewaehrleistungSatz: g,
    freigabe: null,
  };
}

describe('Rechnungsprüfung: Eigenschaften', () => {
  it('Σ Zahlbeträge bis zur Schlussrechnung = Brutto kum. der Schlussrechnung − Umlagen − Gewährleistung', () => {
    fc.assert(
      fc.property(
        fc.array(zeilen, { minLength: 1, maxLength: 4 }),
        fc.array(satz, { maxLength: 2 }),
        satz,
        satz,
        nachlass,
        (plan, umlagen, s, g, n) => {
          const auftrag = auftragsLvZustand({ ...m4.auftrag.auftragsLeistungsverzeichnis, nachlass: n });
          const blaetter = plan.map((z, i) => blatt(i + 1, z));
          const rechnungen: Rechnung[] = [];
          let summe = '0.00' as Betrag;
          for (let i = 1; i <= blaetter.length; i++) {
            const r = rechnung(i, i === blaetter.length ? 'schluss' : 'abschlag', i, umlagen, s, g);
            const p = rechnungPruefen(r, auftrag, blaetter, rechnungen);
            expect(
              p.befunde.filter((b) => b.code === 'fruehere-nicht-freigegeben' || b.code === 'aufmass-fehlt'),
            ).toEqual([]);
            summe = addiere(summe, p.kette.zahlbetrag);
            rechnungen.push({ ...r, freigabe: { zahlbetrag: p.kette.zahlbetrag } });
            if (i === blaetter.length) {
              const k = p.kette;
              expect(k.einbehalt.art).toBe('gewaehrleistung');
              const rest = subtrahiere(
                k.bruttoKumuliert,
                summiereBetraege([...k.umlagen.map((u) => u.betrag), k.einbehalt.betrag]),
              );
              expect(summe).toBe(rest);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('die Reihenfolge der Blätter ändert nichts; Σ gp = Leistung; eine Zeile je Position', () => {
    fc.assert(
      fc.property(
        fc.array(zeilen, { minLength: 1, maxLength: 4 }),
        nachlass,
        fc.integer(),
        (plan, n, mischen) => {
          const auftrag = auftragsLvZustand({ ...m4.auftrag.auftragsLeistungsverzeichnis, nachlass: n });
          const blaetter = plan.map((z, i) => blatt(i + 1, z));
          const gemischt = [...blaetter].sort(
            (a, b) => ((a.nummer * 7919 + mischen) % 13) - ((b.nummer * 7919 + mischen) % 13),
          );
          const r = rechnung(1, 'abschlag', blaetter.length, [], '5.00' as Prozent, '3.00' as Prozent);
          expect(rechnungPruefen(r, auftrag, gemischt, [])).toEqual(
            rechnungPruefen(r, auftrag, blaetter, []),
          );
          const { leistungsstand: l } = leistungsstandBerechnen(auftrag, blaetter, 'abschlag');
          expect(l.positionen.map((p) => p.positionId)).toEqual(positionen);
          expect(summiereBetraege(l.positionen.map((p) => p.gp))).toBe(l.leistung);
          expect(subtrahiere(l.leistung, l.nachlass)).toBe(l.nettoNachNachlass);
        },
      ),
      { numRuns: 200 },
    );
  });
});

const befehl: fc.Arbitrary<RechnungBefehl> = fc.oneof(
  fc.constant<RechnungBefehl>({ art: 'RechnungAnlegen', rechnung: m4.ar2 }),
  fc
    .record({
      rechnungsart: fc.constantFrom('abschlag', 'schluss'),
      eingang: fc.constantFrom(null, '2026-11-30', '2026-02-30'),
      rechnungsnummerAuftragnehmer: fc.constantFrom(null, '', 'AN-1'),
      gefordert: fc.constantFrom(
        null,
        { netto: null, brutto: null, zahlbetrag: null },
        {
          netto: '1.00' as Betrag,
          brutto: null,
          zahlbetrag: null,
        },
      ),
    })
    .map((a): RechnungBefehl => ({ art: 'RechnungsangabenSetzen', ...a })),
  fc.constantFrom<RechnungBefehl>(
    { art: 'RechnungsaufmasseSetzen', aufmassIds: ['a' as AufmassId] },
    { art: 'RechnungsaufmasseSetzen', aufmassIds: ['a' as AufmassId, 'a' as AufmassId] },
    {
      art: 'RechnungsabzuegeSetzen',
      umlagen: [],
      sicherheitSatz: null,
      gewaehrleistungSatz: '3.00' as Prozent,
    },
    { art: 'RechnungFreigeben', zahlbetrag: '10.00' as Betrag },
    { art: 'RechnungFreigeben', zahlbetrag: '10.0' as Betrag },
    { art: 'RechnungsfreigabeAufheben' },
    { art: 'RechnungLoeschen' },
  ),
);

const zustand: fc.Arbitrary<RechnungZustand | null> = fc.constantFrom(
  null,
  { rechnung: m4.ar1 },
  { rechnung: { ...m4.ar1, freigabe: null } },
  { rechnung: m4.ar2 },
);

describe('Rechnungsbefehle: Eigenschaften', () => {
  it('anwenden ∘ umkehren = Identität für jeden angenommenen Befehl; vorher ist der Zustand', () => {
    fc.assert(
      fc.property(zustand, befehl, (z, b) => {
        const antwort = rechnungBefehlAusfuehren(z, b);
        if (!antwort.ok) return;
        const cs = antwort.wert;
        expect(cs.rechnung.vorher).toEqual(z?.rechnung ?? null);
        expect(rechnungChangeSetUmkehren(rechnungChangeSetUmkehren(cs))).toEqual(cs);
        const danach = rechnungChangeSetAnwenden(z, cs);
        expect(rechnungChangeSetAnwenden(danach, rechnungChangeSetUmkehren(cs))).toEqual(z);
        // Eine freigegebene Rechnung ändert sich nur durch das Aufheben der Freigabe.
        if (z?.rechnung.freigabe != null) expect(b.art).toBe('RechnungsfreigabeAufheben');
      }),
      { numRuns: 300 },
    );
  });
});
