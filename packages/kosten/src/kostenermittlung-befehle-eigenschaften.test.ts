// SPDX-License-Identifier: AGPL-3.0-or-later
// Anwenden und Umkehren der Kostenermittlung (Ticket 82): Golden-Fälle und die Eigenschaft „anwenden ∘ umkehren =
// Identität“ für jeden Befehl (Q1). Zufällige Kostenermittlungen und Befehle; auch abgewiesene Befehle kommen vor.

import type {
  Betrag,
  Kostenermittlung,
  KostenermittlungBefehl,
  KostenermittlungId,
  Kostenermittlungseintrag,
  Kostenermittlungsstufe,
  KostenermittlungZustand,
  Kostengruppennummer,
  ProjektId,
} from '@tethys/vertrag';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  kostenermittlungBefehlAusfuehren,
  kostenermittlungChangeSetAnwenden,
  kostenermittlungChangeSetUmkehren,
} from './index';

const runs = { numRuns: 300 };

const kg = (n: string): Kostengruppennummer => n as Kostengruppennummer;
const ID = '019b76e9-0000-7000-8000-000000000130' as KostenermittlungId;
const KB: Kostenermittlung = {
  id: ID,
  projektId: '019b76e9-0000-7000-8000-000000000001' as ProjektId,
  stufe: 'kostenberechnung',
  name: 'Kostenberechnung',
  eintraege: [
    { nummer: kg('330'), betrag: '15.00' as Betrag },
    { nummer: kg('410'), betrag: '25.00' as Betrag },
  ],
};

describe('kostenermittlungChangeSetAnwenden und …Umkehren', () => {
  it('Anlegen auf null ergibt den neuen Stand; Löschen ergibt null; Umkehren tauscht vorher und nachher', () => {
    const anlegen = kostenermittlungBefehlAusfuehren(null, {
      art: 'KostenermittlungAnlegen',
      kostenermittlung: KB,
    });
    if (!anlegen.ok) throw new Error(anlegen.fehler.meldung);
    const z = kostenermittlungChangeSetAnwenden(null, anlegen.wert);
    expect(z).toEqual({ kostenermittlung: KB });

    const loeschen = kostenermittlungBefehlAusfuehren(z, { art: 'KostenermittlungLoeschen' });
    if (!loeschen.ok) throw new Error(loeschen.fehler.meldung);
    expect(kostenermittlungChangeSetAnwenden(z, loeschen.wert)).toBeNull();

    const zurueck = kostenermittlungChangeSetUmkehren(loeschen.wert);
    expect(zurueck).toEqual({
      art: 'kostenermittlung',
      kostenermittlungId: ID,
      kostenermittlung: { vorher: null, nachher: KB },
    });
    expect(kostenermittlungChangeSetAnwenden(null, zurueck)).toEqual({ kostenermittlung: KB });
  });
});

// --- Eigenschaft ---------------------------------------------------------------------------------------------------

const nummerGen = fc
  .tuple(fc.integer({ min: 1, max: 3 }), fc.integer({ min: 0, max: 3 }), fc.integer({ min: 0, max: 3 }))
  .map(([a, b, c]) => kg(`${String(a)}${String(b)}${String(c)}`));
const betragGen = fc
  .bigInt({ min: -100_000n, max: 10n ** 9n })
  .map(
    (c) =>
      `${c < 0n ? '-' : ''}${((c < 0n ? -c : c) / 100n).toString()}.${((c < 0n ? -c : c) % 100n).toString().padStart(2, '0')}` as Betrag,
  );
const eintragGen: fc.Arbitrary<Kostenermittlungseintrag> = fc
  .tuple(nummerGen, betragGen, fc.option(fc.constantFrom('', 'Notiz', 'Außenwände'), { nil: undefined }))
  .map(([nummer, betrag, bemerkung]) =>
    bemerkung === undefined ? { nummer, betrag } : { nummer, betrag, bemerkung },
  );
const stufeGen = fc.constantFrom<Kostenermittlungsstufe>(
  'kostenrahmen',
  'kostenschaetzung',
  'kostenberechnung',
  'kostenanschlag',
  'kostenfeststellung',
);
/** Gespeicherter Stand: eindeutige Nummern, geordnet, keine leere Bemerkung (wie nach einem Ausführer). */
const zustandGen: fc.Arbitrary<KostenermittlungZustand | null> = fc.option(
  fc
    .tuple(fc.uniqueArray(eintragGen, { selector: (e) => e.nummer, maxLength: 12 }), stufeGen, fc.string())
    .map(([eintraege, stufe, name]) => ({
      kostenermittlung: {
        ...KB,
        stufe,
        name,
        eintraege: eintraege
          .map((e) => (e.bemerkung === '' ? { nummer: e.nummer, betrag: e.betrag } : e))
          .sort((a, b) => (a.nummer < b.nummer ? -1 : 1)),
      },
    })),
  { nil: null },
);
const befehlGen: fc.Arbitrary<KostenermittlungBefehl> = fc.oneof(
  fc
    .tuple(fc.array(eintragGen, { maxLength: 12 }), stufeGen)
    .map(([eintraege, stufe]): KostenermittlungBefehl => ({
      art: 'KostenermittlungAnlegen',
      kostenermittlung: { ...KB, stufe, eintraege },
    })),
  fc
    .tuple(fc.string(), stufeGen)
    .map(([name, stufe]): KostenermittlungBefehl => ({ art: 'KostenermittlungskopfSetzen', name, stufe })),
  eintragGen.map((eintrag): KostenermittlungBefehl => ({ art: 'KostenermittlungseintragSetzen', eintrag })),
  nummerGen.map((nummer): KostenermittlungBefehl => ({ art: 'KostenermittlungseintragEntfernen', nummer })),
  fc.constant<KostenermittlungBefehl>({ art: 'KostenermittlungLoeschen' }),
);

describe('Eigenschaften der Kostenermittlungsbefehle', () => {
  it('anwenden ∘ umkehren = Identität für jeden angenommenen Befehl', () => {
    fc.assert(
      fc.property(zustandGen, befehlGen, (zustand, befehl) => {
        const r = kostenermittlungBefehlAusfuehren(zustand, befehl);
        if (!r.ok) return;
        const danach = kostenermittlungChangeSetAnwenden(zustand, r.wert);
        expect(danach?.kostenermittlung ?? null).toEqual(r.wert.kostenermittlung.nachher);
        expect(kostenermittlungChangeSetAnwenden(danach, kostenermittlungChangeSetUmkehren(r.wert))).toEqual(
          zustand,
        );
      }),
      runs,
    );
  });

  it('nach jedem angenommenen Befehl: Einträge nach Nummer geordnet, eindeutig, ohne leere Bemerkung', () => {
    fc.assert(
      fc.property(zustandGen, befehlGen, (zustand, befehl) => {
        const r = kostenermittlungBefehlAusfuehren(zustand, befehl);
        if (!r.ok || r.wert.kostenermittlung.nachher === null) return;
        const nummern = r.wert.kostenermittlung.nachher.eintraege.map((e) => e.nummer);
        expect(nummern).toEqual([...new Set(nummern)].sort());
        expect(r.wert.kostenermittlung.nachher.eintraege.some((e) => e.bemerkung === '')).toBe(false);
      }),
      runs,
    );
  });
});
