// SPDX-License-Identifier: AGPL-3.0-or-later
// Property-Tests (fast-check) für Summen, Nachlass und MwSt (Ticket 07), Merkmale, Ausweise und Zuschlagspositionen
// (Ticket 37). Zuerst geschrieben (Q1).
//
// Zufällige Befehlsfolgen aus Baum-, Preis-, Merkmal- und Anteilsbefehlen. Nach jedem angenommenen Befehl gilt:
//  - `LvZustand.summen` (inkrementell gepflegt) ist gleich der vollständigen Neuberechnung `summenBerechnen`;
//  - ein unabhängiges Orakel (rekursive Summe, nur über `dezimal`) stimmt mit dem Zustand überein;
//  - Summe über alle eingehenden Positionen = LV-Summe;
//  - das ChangeSet nennt genau die Summen, die sich gegenüber dem Altzustand geändert haben (A6, minimal);
//  - Anwenden und Umkehrung anwenden stellt den Altzustand einschließlich der Summen exakt her.
// Abgewiesene Befehle ändern nichts.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Befehlsfehlercode,
  Betrag,
  Einfuegeort,
  Einheitspreis,
  Einheitspreisanteile,
  Knoten,
  LvBefehl,
  LvZustand,
  Menge,
  Nachlass,
  Position,
  Positionsmerkmale,
  Prozent,
  Wahlzuordnung,
  Zuschlag,
} from '@tethys/vertrag';
import {
  NULL_BETRAG,
  addiere,
  gesamtpreis,
  prozentVon,
  subtrahiere,
  summiereBetraege,
} from '@tethys/dezimal';
import {
  changeSetUmkehren,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  pruefeLvInvarianten,
  summenBerechnen,
} from './index';
import { ohneReihenfolge, anwenden, LV_ID, id, lvMit, positionsdaten } from './testhilfen';

// --- Wertevorrat: klein, damit Gleichstände, Nullen und negative Werte oft vorkommen -----------------------------------

const MENGEN: readonly (string | null)[] = [
  '0.000',
  '0.500',
  '1.000',
  '2.500',
  '-2.500',
  '3.333',
  '10.000',
  '1000.000',
  null,
];
const EPS: readonly (string | null)[] = [
  '0.000',
  '0.010',
  '0.015',
  '-0.015',
  '4.560',
  '507.490',
  '1.235',
  null,
];
const OHNE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};
const wahl = (variante: number | null, gruppe: number | null = 1): Wahlzuordnung => ({
  gruppe,
  variante,
  grundpositionId: null,
});
/** Merkmalskombinationen (F5), darunter ungültige (Variante 12, Gruppe −1), die abgewiesen werden. */
const MERKMALE: readonly Positionsmerkmale[] = [
  OHNE,
  OHNE,
  OHNE,
  { ...OHNE, bedarf: 'ohne-gesamtbetrag' },
  { ...OHNE, bedarf: 'mit-gesamtbetrag' },
  { ...OHNE, wahl: wahl(null, null) },
  { ...OHNE, wahl: wahl(0) },
  { ...OHNE, wahl: wahl(2), bedarf: 'ohne-gesamtbetrag' },
  { ...OHNE, stundenlohn: true, bedarf: 'ohne-gesamtbetrag' },
  { ...OHNE, pauschal: true },
  { ...OHNE, zuschlagskennzeichen: true },
  { ...OHNE, zuschlagskennzeichen: true, bedarf: 'mit-gesamtbetrag' },
  { ...OHNE, wahl: wahl(12) },
  { ...OHNE, wahl: wahl(1, -1) },
];
/** Zuschlagsangaben; die Bezugsposition einer Liste wählt `ref` beim Bau unter den vorhandenen Positionen. */
type ZuschlagWahl =
  | null
  | { readonly satz: string | null; readonly form: 'gliederung' | 'kennzeichnung' }
  | {
      readonly satz: string | null;
      readonly form: 'liste';
      readonly teilmenge: string | null;
      readonly doppelt?: true;
    };
const ZUSCHLAEGE: readonly ZuschlagWahl[] = [
  null,
  null,
  null,
  { satz: '10.00', form: 'gliederung' },
  { satz: '10.00', form: 'gliederung' },
  { satz: '5.00', form: 'kennzeichnung' },
  { satz: '10.00', form: 'liste', teilmenge: null },
  { satz: '3.00', form: 'liste', teilmenge: '0.500' },
  { satz: null, form: 'gliederung' }, // Altform
  { satz: '-2.50', form: 'gliederung' },
  { satz: '10.00', form: 'liste', teilmenge: null, doppelt: true }, // abgewiesen
];
const epa = (lohn: string | null, stoffe: string | null): Einheitspreisanteile => ({
  lohn: lohn as Einheitspreis | null,
  stoffe: stoffe as Einheitspreis | null,
  geraete: null,
  nachunternehmer: null,
  sonstiges: null,
  frei: null,
  freiBezeichnung: null,
});
/** Einheitspreisanteile (K7); `1.5` ist keine kanonische Schreibweise und wird abgewiesen. */
const EPAS: readonly (Einheitspreisanteile | null)[] = [
  null,
  epa('1.000', '0.235'),
  epa('-0.500', '2.000'),
  epa(null, '507.490'),
  epa(null, null),
  epa('1.5', null),
];
const NACHLAESSE: readonly Nachlass[] = [
  { art: 'prozent', wert: '0.00' as Prozent },
  { art: 'prozent', wert: '3.00' as Prozent },
  { art: 'prozent', wert: '10.00' as Prozent },
  { art: 'prozent', wert: '100.00' as Prozent },
  { art: 'prozent', wert: '100.01' as Prozent }, // abgewiesen
  { art: 'prozent', wert: '-1.00' as Prozent }, // abgewiesen
  { art: 'betrag', wert: '0.00' as Betrag },
  { art: 'betrag', wert: '5.00' as Betrag },
  { art: 'betrag', wert: '1000000.00' as Betrag }, // fast immer abgewiesen
  { art: 'betrag', wert: '3' as Betrag }, // abgewiesen (Form)
];
const SAETZE: readonly string[] = ['19.00', '7.00', '0.00', '100.00', '101.00', '-1.00', '19'];

interface OrtWahl {
  readonly art: 'nach' | 'anfang' | 'ende';
  readonly ziel: number;
}
type Aktion =
  | { readonly art: 'titel' | 'hinweis'; readonly ort: OrtWahl }
  | {
      readonly art: 'position';
      readonly ort: OrtWahl;
      readonly menge: number;
      readonly ep: number;
      readonly merkmale: number;
      readonly zuschlag: number;
      readonly ref: number;
    }
  | {
      readonly art: 'merkmale';
      readonly knoten: number;
      readonly merkmale: number;
      readonly zuschlag: number;
      readonly ref: number;
    }
  | { readonly art: 'loeschen'; readonly knoten: number }
  | { readonly art: 'verschieben'; readonly knoten: number; readonly ort: OrtWahl }
  | { readonly art: 'menge' | 'ep'; readonly knoten: number; readonly wert: number }
  | { readonly art: 'epa'; readonly knoten: number; readonly wert: number }
  | { readonly art: 'nachlass'; readonly wert: number }
  | { readonly art: 'nachlassWeg' }
  | { readonly art: 'mwst'; readonly wert: number };

const ortArb: fc.Arbitrary<OrtWahl> = fc.record({
  art: fc.constantFrom('nach', 'anfang', 'ende'),
  ziel: fc.nat(10_000),
});
const aktionArb: fc.Arbitrary<Aktion> = fc.oneof(
  { weight: 4, arbitrary: fc.record({ art: fc.constant('titel' as const), ort: ortArb }) },
  { weight: 1, arbitrary: fc.record({ art: fc.constant('hinweis' as const), ort: ortArb }) },
  {
    weight: 10,
    arbitrary: fc.record({
      art: fc.constant('position' as const),
      ort: ortArb,
      menge: fc.nat(MENGEN.length - 1),
      ep: fc.nat(EPS.length - 1),
      merkmale: fc.nat(MERKMALE.length - 1),
      zuschlag: fc.nat(ZUSCHLAEGE.length - 1),
      ref: fc.nat(10_000),
    }),
  },
  {
    weight: 4,
    arbitrary: fc.record({
      art: fc.constant('merkmale' as const),
      knoten: fc.nat(10_000),
      merkmale: fc.nat(MERKMALE.length - 1),
      zuschlag: fc.nat(ZUSCHLAEGE.length - 1),
      ref: fc.nat(10_000),
    }),
  },
  { weight: 2, arbitrary: fc.record({ art: fc.constant('loeschen' as const), knoten: fc.nat(10_000) }) },
  {
    weight: 3,
    arbitrary: fc.record({ art: fc.constant('verschieben' as const), knoten: fc.nat(10_000), ort: ortArb }),
  },
  {
    weight: 6,
    arbitrary: fc.record({
      art: fc.constant('menge' as const),
      knoten: fc.nat(10_000),
      wert: fc.nat(MENGEN.length - 1),
    }),
  },
  {
    weight: 6,
    arbitrary: fc.record({
      art: fc.constant('ep' as const),
      knoten: fc.nat(10_000),
      wert: fc.nat(EPS.length - 1),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      art: fc.constant('epa' as const),
      knoten: fc.nat(10_000),
      wert: fc.nat(EPAS.length - 1),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({ art: fc.constant('nachlass' as const), wert: fc.nat(NACHLAESSE.length - 1) }),
  },
  { weight: 1, arbitrary: fc.constant({ art: 'nachlassWeg' as const }) },
  { weight: 1, arbitrary: fc.record({ art: fc.constant('mwst' as const), wert: fc.nat(SAETZE.length - 1) }) },
);

function befehlAus(z: LvZustand, a: Aktion, nr: number): LvBefehl {
  const knoten = z.leistungsverzeichnis.knoten;
  const alle = [LV_ID as string, ...knoten.map((k) => k.id as string)];
  const knotenId = (n: number): string =>
    knoten.length === 0 ? 'gibt-es-nicht' : (knoten[n % knoten.length]?.id ?? 'x');
  const ort = (o: OrtWahl): Einfuegeort =>
    o.art === 'nach'
      ? { art: 'nach', knotenId: id.knoten(knotenId(o.ziel)) }
      : { art: o.art, elternId: id.eltern(alle[o.ziel % alle.length] ?? LV_ID) };
  const neu = `n${String(nr)}`;
  const positionen = knoten.filter((k) => k.art === 'position');
  const zuschlag = (i: number, ref: number): Zuschlag | null => {
    const w = ZUSCHLAEGE[i] ?? null;
    if (w === null) return null;
    const prozentsatz = w.satz as Prozent | null;
    if (w.form !== 'liste') return { prozentsatz, bezug: { art: w.form } };
    const ziel = positionen.length === 0 ? 'gibt-es-nicht' : (positionen[ref % positionen.length]?.id ?? 'x');
    const b = { positionId: id.pos(ziel), teilmenge: w.teilmenge as Menge | null };
    return { prozentsatz, bezug: { art: 'positionen', positionen: w.doppelt ? [b, b] : [b] } };
  };
  switch (a.art) {
    case 'titel':
      return {
        art: 'GliederungAnlegen',
        id: id.titel(neu),
        gliederungsart: 'titel',
        ort: ort(a.ort),
        kurztext: 'T',
      };
    case 'hinweis':
      return { art: 'HinweistextAnlegen', id: id.hinweis(neu), ort: ort(a.ort), text: [] };
    case 'position':
      return {
        art: 'PositionAnlegen',
        id: id.pos(neu),
        ort: ort(a.ort),
        daten: positionsdaten('P', {
          menge: (MENGEN[a.menge] ?? null) as Menge | null,
          einheitspreis: (EPS[a.ep] ?? null) as Einheitspreis | null,
          merkmale: MERKMALE[a.merkmale] ?? OHNE,
          zuschlag: zuschlag(a.zuschlag, a.ref),
        }),
      };
    case 'merkmale':
      return {
        art: 'PositionsmerkmaleSetzen',
        positionId: id.pos(knotenId(a.knoten)),
        merkmale: MERKMALE[a.merkmale] ?? OHNE,
        zuschlag: zuschlag(a.zuschlag, a.ref),
      };
    case 'loeschen':
      return { art: 'KnotenLoeschen', knotenId: id.knoten(knotenId(a.knoten)) };
    case 'verschieben':
      return { art: 'KnotenVerschieben', knotenId: id.knoten(knotenId(a.knoten)), ziel: ort(a.ort) };
    case 'menge':
      return {
        art: 'MengeAendern',
        positionId: id.pos(knotenId(a.knoten)),
        menge: (MENGEN[a.wert] ?? null) as Menge | null,
      };
    case 'ep':
      return {
        art: 'EinheitspreisAendern',
        positionId: id.pos(knotenId(a.knoten)),
        einheitspreis: (EPS[a.wert] ?? null) as Einheitspreis | null,
      };
    case 'epa':
      return {
        art: 'EinheitspreisanteileSetzen',
        positionId: id.pos(knotenId(a.knoten)),
        epa: EPAS[a.wert] ?? null,
      };
    case 'nachlass':
      return {
        art: 'NachlassSetzen',
        nachlass: NACHLAESSE[a.wert] ?? { art: 'prozent', wert: '0.00' as Prozent },
      };
    case 'nachlassWeg':
      return { art: 'NachlassEntfernen' };
    case 'mwst':
      return { art: 'MwstSatzSetzen', mwstSatz: (SAETZE[a.wert] ?? '19.00') as Prozent };
  }
}

// --- Unabhängiges Orakel -----------------------------------------------------------------------------------------

/**
 * Unabhängig vom Kern geschrieben, nur über `dezimal`: Ziel eines Betrags (Ticket 37, Teil 1) und die Zuschlagsregeln
 * R1 bis R5, R8, hier als Rückwärtssuche formuliert (der Kern läuft vorwärts über die Geschwister).
 */
function orakel(z: LvZustand) {
  const knoten = z.leistungsverzeichnis.knoten;
  const byId = new Map(knoten.map((k) => [k.id as string, k]));
  const kinder = new Map<string, Knoten[]>();
  for (const k of knoten) kinder.set(k.elternId, [...(kinder.get(k.elternId) ?? []), k]);
  for (const liste of kinder.values()) liste.sort((a, b) => a.reihenfolge - b.reihenfolge);
  const ziel = (p: Position): 'netto' | 'bedarf' | 'wahl' =>
    p.merkmale.wahl !== null && p.merkmale.wahl.variante !== 0
      ? 'wahl'
      : p.merkmale.bedarf === 'ohne-gesamtbetrag'
        ? 'bedarf'
        : 'netto';
  const eigenerGp = (p: Position): Betrag | null => {
    const menge = p.menge ?? (p.merkmale.pauschal ? ('1.000' as Menge) : null);
    return menge === null || p.einheitspreis === null ? null : gesamtpreis(menge, p.einheitspreis);
  };
  const basis = (p: Position): boolean => p.zuschlag === null && ziel(p) === 'netto';
  const istZuschlag = (k: Knoten | undefined): boolean => k?.art === 'position' && k.zuschlag !== null;
  const gpVon = (p: Position): Betrag | null => {
    const zu = p.zuschlag;
    if (zu === null || zu.prozentsatz === null) return eigenerGp(p);
    const teile: Betrag[] = [];
    if (zu.bezug.art === 'positionen') {
      for (const b of zu.bezug.positionen) {
        const r = byId.get(b.positionId);
        if (r?.art !== 'position' || !basis(r)) continue;
        const g =
          b.teilmenge === null
            ? eigenerGp(r)
            : r.einheitspreis === null
              ? null
              : gesamtpreis(b.teilmenge, r.einheitspreis);
        if (g !== null) teile.push(g);
      }
    } else {
      const geschwister = kinder.get(p.elternId) ?? [];
      let i = geschwister.findIndex((k) => k.id === p.id) - 1;
      while (i >= 0 && (geschwister[i]?.art !== 'position' || istZuschlag(geschwister[i]))) i--;
      for (; i >= 0; i--) {
        const k = geschwister[i];
        if (k?.art !== 'position') continue;
        if (k.zuschlag !== null) break;
        if (!basis(k) || (zu.bezug.art === 'kennzeichnung' && !k.merkmale.zuschlagskennzeichen)) continue;
        const g = eigenerGp(k);
        if (g !== null) teile.push(g);
      }
    }
    return prozentVon(summiereBetraege(teile), zu.prozentsatz);
  };
  const positionen = new Map<string, { gp: Betrag | null; inSumme: boolean }>();
  const gliederungen = new Map<string, { summe: Betrag; bedarf: Betrag; wahl: Betrag }>();
  const summe = (eltern: string): { summe: Betrag; bedarf: Betrag; wahl: Betrag } => {
    const s = { summe: NULL_BETRAG, bedarf: NULL_BETRAG, wahl: NULL_BETRAG };
    for (const k of kinder.get(eltern) ?? []) {
      if (k.art === 'hinweis') continue;
      if (k.art === 'position') {
        const g = gpVon(k);
        const zk = ziel(k);
        positionen.set(k.id, { gp: g, inSumme: g !== null && zk === 'netto' });
        if (g === null) continue;
        if (zk === 'netto') s.summe = addiere(s.summe, g);
        else if (zk === 'bedarf') s.bedarf = addiere(s.bedarf, g);
        else s.wahl = addiere(s.wahl, g);
      } else {
        const u = summe(k.id);
        s.summe = addiere(s.summe, u.summe);
        s.bedarf = addiere(s.bedarf, u.bedarf);
        s.wahl = addiere(s.wahl, u.wahl);
      }
    }
    if (eltern !== LV_ID) gliederungen.set(eltern, s);
    return s;
  };
  const lv = summe(LV_ID);
  const netto = lv.summe;
  const nl = z.leistungsverzeichnis.nachlass;
  const nachlass = nl === null ? NULL_BETRAG : nl.art === 'prozent' ? prozentVon(netto, nl.wert) : nl.wert;
  const nettoNachNachlass = subtrahiere(netto, nachlass);
  const mwst = prozentVon(nettoNachNachlass, z.leistungsverzeichnis.mwstSatz);
  return {
    positionen,
    gliederungen,
    gesamt: {
      netto,
      nachlass,
      nettoNachNachlass,
      mwst,
      brutto: addiere(nettoNachNachlass, mwst),
      summeBedarfOhneGesamtbetrag: lv.bedarf,
      summeWahl: lv.wahl,
    },
  };
}

const ERLAUBTE_FEHLER: readonly Befehlsfehlercode[] = [
  'knoten-unbekannt',
  'eltern-unbekannt',
  'id-vergeben',
  'zyklus',
  'ebene-ueberschritten',
  'knotenart-unzulaessig',
  'ungueltige-eingabe',
  'bezug-unbekannt', // Liste nennt keinen Positionsknoten (Ticket 37)
];

function pruefeSchritt(z: LvZustand, befehl: LvBefehl, statistik: Record<string, number>): LvZustand | null {
  const vorher = structuredClone(z);
  const e = lvBefehlAusfuehren(z, befehl);
  expect(z).toEqual(vorher); // reine Funktion
  expect(lvBefehlAusfuehren(z, befehl)).toEqual(e); // deterministisch
  if (!e.ok) {
    statistik['abgewiesen'] = (statistik['abgewiesen'] ?? 0) + 1;
    expect(ERLAUBTE_FEHLER).toContain(e.fehler.code);
    return null;
  }
  const cs = e.wert;
  statistik[befehl.art] = (statistik[befehl.art] ?? 0) + 1;
  const neu = anwenden(z, cs);

  // 1. inkrementell gepflegte Summen = vollständige Neuberechnung (einschließlich Reihenfolge der Einträge)
  expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
  expect(pruefeLvInvarianten(neu.leistungsverzeichnis)).toEqual([]);

  // 2. unabhängiges Orakel
  const o = orakel(neu);
  expect(neu.summen.gesamt).toEqual(o.gesamt);
  expect(neu.summen.gliederungen.length).toBe(o.gliederungen.size);
  for (const g of neu.summen.gliederungen) {
    const og = o.gliederungen.get(g.gliederungId);
    expect(g.summe, g.gliederungId).toBe(og?.summe);
    expect(g.summeBedarfOhneGesamtbetrag, g.gliederungId).toBe(og?.bedarf);
    expect(g.summeWahl, g.gliederungId).toBe(og?.wahl);
  }
  for (const p of neu.summen.positionen) {
    const op = o.positionen.get(p.positionId);
    expect(p.gesamtpreis, p.positionId).toBe(op?.gp);
    expect(p.gehtInSummeEin, p.positionId).toBe(op?.inSumme);
  }

  const mitBetrag = neu.leistungsverzeichnis.knoten.some(
    (k) =>
      k.art === 'position' &&
      k.zuschlag?.prozentsatz != null &&
      (o.positionen.get(k.id)?.gp ?? '0.00') !== '0.00',
  );
  if (mitBetrag) statistik['zuschlagMitBetrag'] = (statistik['zuschlagMitBetrag'] ?? 0) + 1;

  // 3. Summe über alle eingehenden Positionen = LV-Summe
  const eingehend = neu.summen.positionen.flatMap((p) =>
    p.gehtInSummeEin && p.gesamtpreis !== null ? [p.gesamtpreis] : [],
  );
  expect(summiereBetraege(eingehend)).toBe(neu.summen.gesamt.netto);

  // 4. ChangeSet minimal: genau die Einträge, die neu sind oder sich geändert haben
  const altP = new Map(z.summen.positionen.map((p) => [p.positionId as string, p]));
  const altG = new Map(z.summen.gliederungen.map((g) => [g.gliederungId as string, g]));
  const erwartetP = neu.summen.positionen.filter(
    (p) => JSON.stringify(altP.get(p.positionId)) !== JSON.stringify(p),
  );
  const erwartetG = neu.summen.gliederungen.filter(
    (g) => JSON.stringify(altG.get(g.gliederungId)) !== JSON.stringify(g),
  );
  const nachId = <T extends object>(liste: readonly T[], schluessel: keyof T): T[] =>
    [...liste].sort((a, b) => (String(a[schluessel]) < String(b[schluessel]) ? -1 : 1));
  expect(nachId(cs.summen.positionen, 'positionId')).toEqual(nachId(erwartetP, 'positionId'));
  expect(nachId(cs.summen.gliederungen, 'gliederungId')).toEqual(nachId(erwartetG, 'gliederungId'));
  if (JSON.stringify(z.summen.gesamt) === JSON.stringify(neu.summen.gesamt))
    expect(cs.summen.gesamt).toBeNull();
  else expect(cs.summen.gesamt).toEqual(neu.summen.gesamt);

  // 5. Undo stellt Zustand und Summen exakt her; die Umkehrung der Umkehrung ist das ChangeSet
  expect(cs.summen.vorher).toBeDefined(); // v1.1a: jedes ChangeSet trägt die alten Summen
  const rueck = changeSetUmkehren(cs);
  expect(anwenden(neu, rueck)).toEqual(z);
  expect(ohneReihenfolge(changeSetUmkehren(rueck))).toEqual(ohneReihenfolge(cs));
  return neu;
}

const folgeArb = fc.array(aktionArb, { minLength: 10, maxLength: 70 });

describe('Befehlsfolgen mit Preisen, Nachlass und MwSt', () => {
  it('inkrementelle Summen = vollständige Neuberechnung = Orakel; ChangeSet minimal; Undo exakt', () => {
    const statistik: Record<string, number> = {};
    fc.assert(
      fc.property(folgeArb, (folge) => {
        let z = lvMit([]);
        folge.forEach((aktion, nr) => {
          z = pruefeSchritt(z, befehlAus(z, aktion, nr), statistik) ?? z;
        });
      }),
      { numRuns: 300 },
    );
    // Der Test ist nicht leer.
    expect(statistik['MengeAendern']).toBeGreaterThan(200);
    expect(statistik['EinheitspreisAendern']).toBeGreaterThan(200);
    expect(statistik['PositionAnlegen']).toBeGreaterThan(400); // ungültige Merkmale werden abgewiesen (Ticket 37)
    expect(statistik['KnotenLoeschen']).toBeGreaterThan(50);
    expect(statistik['KnotenVerschieben']).toBeGreaterThan(100);
    expect(statistik['NachlassSetzen']).toBeGreaterThan(50);
    expect(statistik['MwstSatzSetzen']).toBeGreaterThan(20);
    expect(statistik['abgewiesen']).toBeGreaterThan(100);
    expect(statistik['PositionsmerkmaleSetzen']).toBeGreaterThan(50);
    expect(statistik['EinheitspreisanteileSetzen']).toBeGreaterThan(50);
    expect(statistik['zuschlagMitBetrag']).toBeGreaterThan(10); // streut stark je Lauf
    console.info('[kern/07] Property-Statistik', JSON.stringify(statistik));
  });

  it('die gesamte Folge lässt sich zurückspielen (Undo über viele Schritte, mit Summen)', () => {
    fc.assert(
      fc.property(folgeArb, (folge) => {
        const start = lvMit([]);
        let z = start;
        const verlauf: ReturnType<typeof changeSetUmkehren>[] = [];
        folge.forEach((aktion, nr) => {
          const e = lvBefehlAusfuehren(z, befehlAus(z, aktion, nr));
          if (!e.ok) return;
          verlauf.push(e.wert);
          z = anwenden(z, e.wert);
        });
        // Löschen des ganzen LV (v1.1a): Anwenden ergibt null, die Umkehrung auf null das LV samt Summen.
        const loeschen = lvBefehlAusfuehren(z, { art: 'LeistungsverzeichnisLoeschen' });
        if (!loeschen.ok) throw new Error('LeistungsverzeichnisLoeschen abgewiesen');
        expect(lvChangeSetAnwenden(z, loeschen.wert)).toBeNull();
        expect(lvChangeSetAnwenden(null, changeSetUmkehren(loeschen.wert))).toEqual(z);
        for (const cs of verlauf.reverse()) z = anwenden(z, changeSetUmkehren(cs));
        expect(z).toEqual(start);
      }),
      { numRuns: 150 },
    );
  });

  it('ein LV, das von außen vollständig angeliefert wird, bekommt dieselben Summen wie das inkrementell gepflegte', () => {
    fc.assert(
      fc.property(folgeArb, (folge) => {
        let z = lvMit([]);
        folge.forEach((aktion, nr) => {
          const e = lvBefehlAusfuehren(z, befehlAus(z, aktion, nr));
          if (e.ok) z = anwenden(z, e.wert);
        });
        const lv = z.leistungsverzeichnis;
        const neu = lvBefehlAusfuehren(null, {
          art: 'LeistungsverzeichnisAnlegen',
          id: lv.id,
          projektId: lv.projektId,
          inhalt: {
            name: lv.name,
            ozMaske: lv.ozMaske,
            mwstSatz: lv.mwstSatz,
            nachlass: lv.nachlass,
            knoten: lv.knoten,
            wurzelId: lv.id,
          },
        });
        expect(neu.ok).toBe(true);
        if (neu.ok) expect(anwenden(null, neu.wert)).toEqual(z);
      }),
      { numRuns: 100 },
    );
  });
});
