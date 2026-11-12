// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests (fast-check) für die Befehle aus Vertrag v1.4 (Ticket 71). Zuerst geschrieben (Q1).
//
// LV: beliebige Folgen aus KostengruppeSetzen, TextquelleSetzen, NachtragsangabenSetzen, VorlageSetzen, PositionAnlegen und
// KnotenEinfuegen (Kopie) mit gültigen und ungültigen Werten. Auftrags-LV: Folgen aus NachtragUebernehmen (zufällige
// Teilbäume, auch zu tief, mit Los an falscher Stelle oder mit vergebener Kennung) und KostengruppeSetzen. Nach jedem
// angenommenen Befehl gilt:
//  - anwenden ∘ umkehren = Identität (die Umkehrung stellt den Vorzustand exakt her), die Umkehrung der Umkehrung ist das
//    ChangeSet (Summenlisten als Mengen);
//  - Summen = Neuberechnung (`summenBerechnen`), Invarianten halten (`pruefeLvInvarianten`, am Auftrags-LV `baumfehler`);
//  - Normalform: nie `''` als Textquelle, nie `vorlage: false`, jede Kostengruppe in der Form 100 bis 999.
// Abgewiesene Befehle ändern nichts (es entsteht kein ChangeSet).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvBefehl,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  Einheitspreis,
  HinweistextId,
  Knoten,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  LosId,
  LvBefehl,
  LvZustand,
  Menge,
  Nachtragsangaben,
  Nachtragsstatus,
  PositionId,
  Prozent,
  TitelId,
} from '@tethys/vertrag';
import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  auftragsLvChangeSetUmkehren,
  changeSetUmkehren,
  baumfehler,
  kopieBauen,
  lvBefehlAusfuehren,
  pruefeLvInvarianten,
  summenBerechnen,
} from './index';
import type { KopieIdQuelle } from './index';
import {
  LV_ID,
  PROJEKT_ID,
  anwenden,
  id,
  lvMit,
  ohneReihenfolge,
  posKnoten,
  positionsdaten,
  standardMaske,
  titelKnoten,
  zuschlagAuf,
  zuschlagsliste,
} from './testhilfen';

const kgArb: fc.Arbitrary<string | null> = fc.oneof(
  { weight: 5, arbitrary: fc.integer({ min: 100, max: 999 }).map(String) },
  { weight: 2, arbitrary: fc.constant(null) },
  { weight: 1, arbitrary: fc.constantFrom('099', '1000', '33', 'abc', '', ' 330') },
);
const textquelleArb: fc.Arbitrary<string | null> = fc.oneof(
  { weight: 3, arbitrary: fc.string({ maxLength: 12 }) },
  { weight: 2, arbitrary: fc.constant('') },
  { weight: 1, arbitrary: fc.constant(null) },
);

/** Normalform des Zustands (Vertrag v1.4): Liste der Verstöße, leer heißt gültig. */
function normalformFehler(kopf: object, knoten: readonly Knoten[]): string[] {
  const fehler: string[] = [];
  if ('vorlage' in kopf && (kopf as { vorlage?: unknown }).vorlage !== true) fehler.push('vorlage ≠ true');
  for (const k of knoten) {
    if (k.art !== 'position') {
      if ('kostengruppe' in k || 'textquelle' in k) fehler.push(`Feld an ${k.art} ${k.id}`);
      continue;
    }
    if (k.textquelle === '') fehler.push(`textquelle '' an ${k.id}`);
    if (k.kostengruppe !== undefined && !/^[1-9][0-9]{2}$/.test(k.kostengruppe))
      fehler.push(`kostengruppe ${k.kostengruppe} an ${k.id}`);
  }
  return fehler;
}

// --- LV ------------------------------------------------------------------------------------------------------------

function lvStart(): LvZustand {
  return lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('P1', 'T1', 0, '2.000', '10.000'),
    posKnoten('P2', 'T1', 1, '3.000', '5.000', { kostengruppe: '330' as Kostengruppennummer }),
    posKnoten('Z', 'T1', 2, null, null, { zuschlag: zuschlagAuf('gliederung', '10.00') }),
    titelKnoten('T2', LV_ID, 1),
    posKnoten('P3', 'T2', 0, '1.000', '100.000', { textquelle: 'Muster-LV' }),
    posKnoten('ZL', 'T2', 1, null, null, { zuschlag: zuschlagsliste(['P1', 'P3'], '5.00') }),
    { art: 'hinweis', id: id.hinweis('H'), elternId: id.eltern('T2'), reihenfolge: 2, text: [] },
  ]);
}

interface LvWahl {
  readonly art: number;
  readonly knoten: number;
  readonly kg: string | null;
  readonly textquelle: string | null;
  readonly nummer: string;
  readonly status: string;
  readonly vorlage: boolean;
}
const lvWahl: fc.Arbitrary<LvWahl> = fc.record({
  art: fc.nat(5),
  knoten: fc.nat(50),
  kg: kgArb,
  textquelle: textquelleArb,
  nummer: fc.oneof(fc.constantFrom('N01', 'N02', '', '  '), fc.string({ maxLength: 4 })),
  status: fc.constantFrom('angemeldet', 'angeboten', 'beauftragt', 'abgelehnt', 'erledigt'),
  vorlage: fc.boolean(),
});

function kopieIds(): KopieIdQuelle {
  let n = 0;
  const neu = (art: string): string => `k${art}${String(++n)}`;
  return {
    los: () => neu('L') as LosId,
    titel: () => neu('T') as TitelId,
    position: () => neu('P') as PositionId,
    hinweistext: () => neu('H') as HinweistextId,
  };
}

function lvBefehl(z: LvZustand, w: LvWahl, nr: number, ids: KopieIdQuelle): LvBefehl {
  const knoten = z.leistungsverzeichnis.knoten;
  const k = knoten[w.knoten % knoten.length] ?? knoten[0];
  const kennung = k?.id ?? 'gibt-es-nicht';
  const kgWert = w.kg as Kostengruppennummer | null;
  switch (w.art) {
    case 0:
      return { art: 'KostengruppeSetzen', positionId: id.pos(kennung), kostengruppe: kgWert };
    case 1:
      return { art: 'TextquelleSetzen', positionId: id.pos(kennung), textquelle: w.textquelle };
    case 2: {
      const nachtrag = {
        auftragsLvId: 'auftrag-1' as AuftragsLeistungsverzeichnisId,
        nummer: w.nummer,
        status: w.status as Nachtragsstatus,
      } satisfies Nachtragsangaben;
      return { art: 'NachtragsangabenSetzen', nachtrag: w.knoten % 4 === 0 ? null : nachtrag };
    }
    case 3:
      return { art: 'VorlageSetzen', vorlage: w.vorlage };
    case 4:
      return {
        art: 'PositionAnlegen',
        id: id.pos(`n${String(nr)}`),
        ort: { art: 'ende', elternId: id.eltern(w.knoten % 2 === 0 ? 'T1' : LV_ID) },
        daten: positionsdaten('neu', {
          menge: '1.500' as Menge,
          einheitspreis: '2.000' as Einheitspreis,
          ...(kgWert === null ? {} : { kostengruppe: kgWert }),
          ...(w.textquelle === null ? {} : { textquelle: w.textquelle }),
        }),
      };
    default:
      return {
        art: 'KnotenEinfuegen',
        ort: { art: 'ende', elternId: id.eltern(LV_ID) },
        knoten: kopieBauen(z, [id.knoten(kennung)], ids),
      };
  }
}

describe('Vertrag v1.4 im LV: Folgen der neuen Befehle', () => {
  it('anwenden ∘ umkehren = Identität; Summen, Invarianten und Normalform halten', () => {
    const gesehen = new Map<string, number>();
    fc.assert(
      fc.property(fc.array(lvWahl, { minLength: 1, maxLength: 20 }), (folge) => {
        let z = lvStart();
        const ids = kopieIds();
        folge.forEach((w, nr) => {
          const b = lvBefehl(z, w, nr, ids);
          const e = lvBefehlAusfuehren(z, b);
          if (!e.ok) return;
          gesehen.set(b.art, (gesehen.get(b.art) ?? 0) + 1);
          const neu = anwenden(z, e.wert);
          expect(anwenden(neu, changeSetUmkehren(e.wert))).toEqual(z);
          expect(ohneReihenfolge(changeSetUmkehren(changeSetUmkehren(e.wert)))).toEqual(
            ohneReihenfolge(e.wert),
          );
          expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
          expect(pruefeLvInvarianten(neu.leistungsverzeichnis)).toEqual([]);
          expect(normalformFehler(neu.leistungsverzeichnis, neu.leistungsverzeichnis.knoten)).toEqual([]);
          z = neu;
        });
      }),
      { numRuns: 150 },
    );
    for (const art of [
      'KostengruppeSetzen',
      'TextquelleSetzen',
      'NachtragsangabenSetzen',
      'VorlageSetzen',
      'PositionAnlegen',
      'KnotenEinfuegen',
    ])
      expect(gesehen.get(art) ?? 0, art).toBeGreaterThan(20);
  });
});

// --- Auftrags-LV ----------------------------------------------------------------------------------------------------

const AID = 'auftrag-test' as AuftragsLeistungsverzeichnisId;

function auftragStart(): AuftragsLvZustand {
  const knoten: Knoten[] = [
    titelKnoten('A1', AID, 0),
    posKnoten('AP1', 'A1', 0, '2.000', '10.000'),
    posKnoten('AP2', 'A1', 1, '4.000', '7.500', {
      merkmale: { ...positionsdaten('').merkmale, bedarf: 'mit-gesamtbetrag' },
    }),
    titelKnoten('A2', AID, 1),
    posKnoten('AP3', 'A2', 0, '1.000', '250.000'),
    posKnoten('AZ', AID, 2, null, null, { zuschlag: zuschlagAuf('gliederung', '3.00') }),
    posKnoten('AZL', AID, 3, null, null, { zuschlag: zuschlagsliste(['AP1', 'AP3'], '2.00') }),
  ];
  const cs = auftragsLvBefehlAusfuehren(null, {
    art: 'AuftragsLeistungsverzeichnisAnlegen',
    auftragsLeistungsverzeichnis: {
      id: AID,
      projektId: PROJEKT_ID,
      leistungsverzeichnisId: 'lv-x' as LeistungsverzeichnisId,
      angebotId: 'angebot-x' as AngebotId,
      name: 'Auftrag',
      ozMaske: standardMaske,
      mwstSatz: '19.00' as Prozent,
      nachlass: {
        art: 'prozent',
        wert: '3.00' as Prozent,
      },
      knoten,
    },
  });
  if (!cs.ok) throw new Error(cs.fehler.meldung);
  const z = auftragsLvChangeSetAnwenden(null, cs.wert);
  if (z === null) throw new Error('kein Zustand');
  return z;
}

/** Ein Knoten des Teilbaums: Art, Elternwahl unter den früheren Gliederungen, Menge, EP, Kostengruppe, Textquelle. */
interface TeilbaumKnoten {
  readonly art: 'titel' | 'position' | 'hinweis';
  readonly eltern: number;
  readonly menge: number;
  readonly ep: number;
  readonly kg: string | null;
  readonly textquelle: string | null;
}
interface AuftragWahl {
  readonly art: number;
  readonly wurzelLos: boolean;
  readonly reihenfolgeFalsch: boolean;
  readonly vergeben: boolean;
  readonly teilbaum: readonly TeilbaumKnoten[];
  readonly knoten: number;
  readonly kg: string | null;
}
const selten = fc.integer({ min: 0, max: 14 }).map((n) => n === 0);
const auftragWahl: fc.Arbitrary<AuftragWahl> = fc.record({
  art: fc.nat(2),
  wurzelLos: selten,
  reihenfolgeFalsch: selten,
  vergeben: selten,
  teilbaum: fc.array(
    fc.record({
      art: fc.constantFrom('titel' as const, 'position' as const, 'position' as const, 'hinweis' as const),
      eltern: fc.nat(20),
      menge: fc.integer({ min: 0, max: 99_999 }),
      ep: fc.integer({ min: 0, max: 999_999 }),
      kg: kgArb,
      textquelle: textquelleArb,
    }),
    { maxLength: 8 },
  ),
  knoten: fc.nat(50),
  kg: kgArb,
});

/** Baut den Teilbaum des Nachtrags: Wurzel ans Ende der obersten Ebene, jeder Knoten unter einer früheren Gliederung. */
function nachtragAus(z: AuftragsLvZustand, w: AuftragWahl, nr: number): Knoten[] {
  const oben = z.auftragsLeistungsverzeichnis.knoten.filter((k) => k.elternId === AID).length;
  const wurzelId = w.vergeben ? 'A1' : `w${String(nr)}`;
  const wurzel: Knoten = w.wurzelLos
    ? {
        art: 'los',
        id: id.los(wurzelId),
        elternId: AID,
        reihenfolge: oben,
        ordnungszahl: null,
        kurztext: 'N',
      }
    : { ...titelKnoten(wurzelId, AID, w.reihenfolgeFalsch ? oben + 1 : oben), kurztext: 'Nachtrag' };
  const liste: Knoten[] = [wurzel];
  const gliederungen: string[] = [wurzelId];
  const anzahl = new Map<string, number>();
  w.teilbaum.forEach((t, i) => {
    const eltern = gliederungen[t.eltern % gliederungen.length] ?? wurzelId;
    const reihenfolge = anzahl.get(eltern) ?? 0;
    anzahl.set(eltern, reihenfolge + 1);
    const kennung = `w${String(nr)}-${String(i)}`;
    if (t.art === 'titel') {
      liste.push(titelKnoten(kennung, eltern, reihenfolge));
      gliederungen.push(kennung);
    } else if (t.art === 'hinweis') {
      liste.push({
        art: 'hinweis',
        id: id.hinweis(kennung),
        elternId: id.eltern(eltern),
        reihenfolge,
        text: [],
      });
    } else {
      liste.push(
        posKnoten(kennung, eltern, reihenfolge, (t.menge / 1000).toFixed(3), (t.ep / 1000).toFixed(3), {
          ...(t.kg === null ? {} : { kostengruppe: t.kg as Kostengruppennummer }),
          ...(t.textquelle === null ? {} : { textquelle: t.textquelle }),
        }),
      );
    }
  });
  return liste;
}

function auftragBefehl(z: AuftragsLvZustand, w: AuftragWahl, nr: number): AuftragsLvBefehl {
  if (w.art === 0) {
    const knoten = z.auftragsLeistungsverzeichnis.knoten;
    // Ticket 105 (D-71.3): eine Stelle mehr als Knoten, damit auch eine unbekannte Kennung vorkommt (`knoten-unbekannt`);
    // Gliederung und Hinweistext ergeben seither `knotenart-unzulaessig`.
    const k = knoten[w.knoten % (knoten.length + 1)];
    return {
      art: 'KostengruppeSetzen',
      positionId: id.pos(k?.id ?? 'gibt-es-nicht'),
      kostengruppe: w.kg as Kostengruppennummer | null,
    };
  }
  return {
    art: 'NachtragUebernehmen',
    nachtragLvId: 'lv-n' as LeistungsverzeichnisId,
    knoten: nachtragAus(z, w, nr),
  };
}

/** Das ChangeSet mit Summenlisten als Mengen und ohne Hinweise (wie `ohneReihenfolge` beim LV). */
function alsMengen(cs: AuftragsLvChangeSet): unknown {
  const nachKennung = <T>(l: readonly T[], f: (x: T) => string): T[] =>
    [...l].sort((a, b) => (f(a) < f(b) ? -1 : 1));
  const s = cs.summen;
  return {
    ...cs,
    hinweise: undefined,
    summen: {
      ...s,
      positionen: nachKennung(s.positionen, (p) => p.positionId),
      gliederungen: nachKennung(s.gliederungen, (g) => g.gliederungId),
      vorher: {
        ...s.vorher,
        positionen: nachKennung(s.vorher.positionen, (p) => p.positionId),
        gliederungen: nachKennung(s.vorher.gliederungen, (g) => g.gliederungId),
        entfernt: {
          positionen: nachKennung(s.vorher.entfernt.positionen, (p) => p.positionId),
          gliederungen: nachKennung(s.vorher.entfernt.gliederungen, (g) => g.gliederungId),
        },
      },
    },
  };
}

describe('Vertrag v1.4 im Auftrags-LV: Folgen aus NachtragUebernehmen und KostengruppeSetzen', () => {
  it('anwenden ∘ umkehren = Identität; Summen = Neuberechnung; Invarianten und Normalform halten', () => {
    const gesehen = new Map<string, number>();
    const abgewiesen = new Map<string, number>();
    fc.assert(
      fc.property(fc.array(auftragWahl, { minLength: 1, maxLength: 12 }), (folge) => {
        let z = auftragStart();
        folge.forEach((w, nr) => {
          const b = auftragBefehl(z, w, nr);
          const e = auftragsLvBefehlAusfuehren(z, b);
          if (!e.ok) {
            abgewiesen.set(e.fehler.code, (abgewiesen.get(e.fehler.code) ?? 0) + 1);
            return;
          }
          gesehen.set(b.art, (gesehen.get(b.art) ?? 0) + 1);
          const neu = auftragsLvChangeSetAnwenden(z, e.wert);
          if (neu === null) throw new Error('Auftrags-LV verschwunden');
          expect(auftragsLvChangeSetAnwenden(neu, auftragsLvChangeSetUmkehren(e.wert))).toEqual(z);
          expect(alsMengen(auftragsLvChangeSetUmkehren(auftragsLvChangeSetUmkehren(e.wert)))).toEqual(
            alsMengen(e.wert),
          );
          const a = neu.auftragsLeistungsverzeichnis;
          expect(neu.summen).toEqual(summenBerechnen(a));
          expect(baumfehler(AID, a.knoten)).toEqual([]);
          expect(normalformFehler(a, a.knoten)).toEqual([]);
          z = neu;
        });
      }),
      { numRuns: 150 },
    );
    expect(gesehen.get('NachtragUebernehmen') ?? 0).toBeGreaterThan(50);
    expect(gesehen.get('KostengruppeSetzen') ?? 0).toBeGreaterThan(20);
    for (const code of ['id-vergeben', 'knotenart-unzulaessig', 'ungueltige-eingabe', 'knoten-unbekannt'])
      expect(abgewiesen.get(code) ?? 0, code).toBeGreaterThan(0);
  });
});
