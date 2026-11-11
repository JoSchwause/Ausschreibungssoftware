// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Test für K9 (Ticket 42): beliebige Folgen aus Einfügen (Kopie), Verschieben, Papierkorb, Wiederherstellen,
// Entfernen und Leeren. Nach jedem angenommenen Befehl gilt:
//  - der inkrementell gepflegte Summenstand ist gleich der Neuberechnung `summenBerechnen` (Positionen im Papierkorb
//    haben also keine Summe und zählen nirgends);
//  - `pruefeLvInvarianten` hält, mit dem Papierkorb (Bezüge in den Papierkorb sind gültig);
//  - die Umkehrung (`changeSetUmkehren`) stellt den Vorzustand exakt her.
// Abgewiesene Befehle sind erlaubt (z. B. Zyklus, F1); sie ändern nichts.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Einfuegeort,
  HinweistextId,
  Knoten,
  LosId,
  LvBefehl,
  LvZustand,
  Ordnungszahl,
  PapierkorbeintragId,
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
import {
  LV_ID,
  anwenden,
  id,
  lvMit,
  merkmale,
  posKnoten,
  titelKnoten,
  wahlzuordnung,
  zuschlagAuf,
  zuschlagsliste,
} from './testhilfen';

const oz = (s: string) => s as Ordnungszahl;

function start(): LvZustand {
  return lvMit([
    { ...titelKnoten('T1', LV_ID, 0), ordnungszahl: oz('01') },
    {
      art: 'hinweis',
      id: id.hinweis('H'),
      elternId: id.eltern('T1'),
      reihenfolge: 0,
      text: [{ art: 'text', text: 'Vorbemerkung' }],
    },
    posKnoten('P1', 'T1', 1, '2.000', '10.000', { ordnungszahl: oz('01.0010') }),
    posKnoten('P2', 'T1', 2, '3.000', '5.000', { ordnungszahl: oz('01.0020') }),
    posKnoten('Z', 'T1', 3, null, null, { zuschlag: zuschlagAuf('gliederung', '10.00') }),
    { ...titelKnoten('T2', LV_ID, 1), ordnungszahl: oz('02') },
    posKnoten('P3', 'T2', 0, '1.000', '100.000', { ordnungszahl: oz('02.0010') }),
    { ...titelKnoten('T21', 'T2', 1), ordnungszahl: oz('02.01') },
    posKnoten('P4', 'T21', 0, '1.000', '7.000', { merkmale: merkmale({ bedarf: 'ohne-gesamtbetrag' }) }),
    posKnoten('ZL', 'T21', 1, null, null, { zuschlag: zuschlagsliste(['P1', 'P3'], '5.00') }),
    posKnoten('W', 'T2', 2, '1.000', '90.000', { merkmale: merkmale({ wahl: wahlzuordnung(1, 1, 'P3') }) }),
    posKnoten('P5', LV_ID, 2, '4.000', '2.500'),
  ]);
}

/** Ein Schritt als Zahlen; welcher Knoten oder Eintrag gemeint ist, entscheidet der Zustand (modulo). */
interface Wahl {
  readonly art: number;
  readonly a: number;
  readonly b: number;
  readonly c: number;
}
const wahl = fc.record({ art: fc.nat(6), a: fc.nat(50), b: fc.nat(50), c: fc.nat(50) });

const waehle = <T>(liste: readonly T[], i: number): T | undefined =>
  liste.length === 0 ? undefined : liste[i % liste.length];

function ort(z: LvZustand, b: number): Einfuegeort {
  const knoten = z.leistungsverzeichnis.knoten;
  const gliederungen = knoten.filter((k) => k.art === 'los' || k.art === 'titel');
  const k = waehle(knoten, b >> 2);
  const g = waehle(gliederungen, b >> 2);
  switch (b % 4) {
    case 0:
      return { art: 'ende', elternId: id.eltern(LV_ID) };
    case 1:
      return g === undefined
        ? { art: 'anfang', elternId: id.eltern(LV_ID) }
        : { art: 'anfang', elternId: g.id };
    case 2:
      return g === undefined ? { art: 'ende', elternId: id.eltern(LV_ID) } : { art: 'ende', elternId: g.id };
    default:
      return k === undefined ? { art: 'ende', elternId: id.eltern(LV_ID) } : { art: 'nach', knotenId: k.id };
  }
}

function zaehler(): KopieIdQuelle & { eintrag(): PapierkorbeintragId } {
  let n = 0;
  const neu = (art: string): string => `${art}${String(++n)}`;
  return {
    los: () => neu('L') as LosId,
    titel: () => neu('T') as TitelId,
    position: () => neu('P') as PositionId,
    hinweistext: () => neu('H') as HinweistextId,
    eintrag: () => neu('E') as PapierkorbeintragId,
  };
}

function befehl(z: LvZustand, w: Wahl, ids: ReturnType<typeof zaehler>): LvBefehl | null {
  const knoten = z.leistungsverzeichnis.knoten;
  const korb = z.papierkorb ?? [];
  const k1 = waehle(knoten, w.a);
  const k2 = waehle(knoten, w.c);
  const auswahl = [k1, ...(w.c % 3 === 0 ? [k2] : [])]
    .filter((k): k is Knoten => k !== undefined)
    .map((k) => k.id);
  switch (w.art) {
    case 0:
      return auswahl.length === 0
        ? null
        : { art: 'KnotenEinfuegen', ort: ort(z, w.b), knoten: kopieBauen(z, auswahl, ids) };
    case 1:
      return auswahl.length === 0
        ? null
        : { art: 'KnotenlisteVerschieben', knotenIds: auswahl, ziel: ort(z, w.b) };
    case 2:
      return auswahl.length === 0
        ? null
        : { art: 'KnotenInPapierkorbLegen', eintragId: ids.eintrag(), knotenIds: auswahl };
    case 3:
    case 4: {
      const e = waehle(korb, w.a);
      if (e === undefined) return null;
      return {
        art: 'PapierkorbeintragWiederherstellen',
        eintragId: e.id,
        ort: w.c % 2 === 0 ? null : ort(z, w.b),
      };
    }
    case 5: {
      const e = waehle(korb, w.a);
      return e === undefined ? null : { art: 'PapierkorbeintragEntfernen', eintragId: e.id };
    }
    default:
      return { art: 'PapierkorbLeeren' };
  }
}

describe('K9: Folgen aus Einfügen, Verschieben und Papierkorb', () => {
  it('Summen = Neuberechnung, Invarianten halten, Umkehrung stellt jeden Zustand her', () => {
    const gesehen = new Map<string, number>();
    fc.assert(
      fc.property(fc.array(wahl, { minLength: 1, maxLength: 20 }), (folge) => {
        const ids = zaehler();
        let z = start();
        let angenommen = 0;
        for (const w of folge) {
          const b = befehl(z, w, ids);
          if (b === null) continue;
          const e = lvBefehlAusfuehren(z, b);
          if (!e.ok) continue;
          angenommen++;
          gesehen.set(b.art, (gesehen.get(b.art) ?? 0) + 1);
          const neu = anwenden(z, e.wert);
          expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
          expect(pruefeLvInvarianten(neu.leistungsverzeichnis, neu.papierkorb)).toEqual([]);
          expect(anwenden(neu, changeSetUmkehren(e.wert))).toEqual(z);
          z = neu;
        }
        return angenommen >= 0;
      }),
      { numRuns: 150 },
    );
    // Jede Befehlsart wurde tatsächlich angenommen (der Test prüft nicht nur Abweisungen).
    for (const art of [
      'KnotenEinfuegen',
      'KnotenlisteVerschieben',
      'KnotenInPapierkorbLegen',
      'PapierkorbeintragWiederherstellen',
      'PapierkorbeintragEntfernen',
      'PapierkorbLeeren',
    ])
      expect(gesehen.get(art) ?? 0, art).toBeGreaterThan(5);
  });
});
