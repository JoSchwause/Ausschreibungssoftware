// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlagsposition (K6, Ticket 37; F3, E-03, D-03). Die Goldens stammen aus den amtlichen Prüfdateien im Repo (D-03):
//  - fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X86, Bereich 1.30 „Bereich Zuschläge“
//    (dieselben Zahlen in fixtures/extern/gaeb/3.1-musterdateien/Musterdatei_3.1_2008-001.X84, Bereich 1.30);
//  - fixtures/extern/bvbs/3.3-bauausfuehrung/BVBS_Pruefdatei_3.3_Bauausfuehrung_V-11-06-2021.x84, Bereich 002.001.
// Die Kennungen der Knoten sind die `ID` der Elemente in der Datei. Einen Positionsnachlass (`DiscountPcnt`) gibt es in
// v1 nicht (G-23); 1.30.10.30 steht deshalb als 30,000 × 28,500 = 855,00 (`IT` der Datei).

import { describe, expect, it } from 'vitest';
import type {
  Einheitspreis,
  Knoten,
  LeistungsverzeichnisId,
  LvBefehl,
  LvZustand,
  Menge,
  Position,
  Prozent,
} from '@tethys/vertrag';
import {
  ZUSCHLAG_REGELN,
  changeSetUmkehren,
  lvBefehlAusfuehren,
  pruefeLvInvarianten,
  summenBerechnen,
  zuschlagsbasen,
} from './index';
import {
  LV_ID,
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  id,
  lvMit,
  merkmale,
  posKnoten,
  sollwerteLesen,
  titelKnoten,
  wende,
  zuschlagAuf,
  zuschlagsliste,
} from './testhilfen';

const gs = (z: LvZustand, gliederungId: string) =>
  z.summen.gliederungen.find((g) => g.gliederungId === gliederungId)?.summe;
const gp = (z: LvZustand, positionId: string) =>
  z.summen.positionen.find((p) => p.positionId === positionId)?.gesamtpreis;

const kennz = { merkmale: merkmale({ zuschlagskennzeichen: true }) };
const zuschlag = (eltern: string, r: number, kennung: string, z: Position['zuschlag']): Position =>
  posKnoten(kennung, eltern, r, null, null, { zuschlag: z });

/** BVBS 3.3 AVA X86: Bereich 1.10.30 (nur die Bezugsposition von 1.30.30.40) und Bereich 1.30. */
function x86Knoten(): Knoten[] {
  return [
    titelKnoten('T1.10', LV_ID, 0),
    titelKnoten('T1.10.30', 'T1.10', 0),
    posKnoten('CBNEBKMI', 'T1.10.30', 0, '100.000', '27.910'), // 1.10.30.20
    titelKnoten('T1.30', LV_ID, 1),
    titelKnoten('T1.30.10', 'T1.30', 0),
    posKnoten('CBNEFPDI', 'T1.30.10', 0, '10.000', '10.000', kennz), // 10, MarkupIt
    posKnoten('CBNEGEAI', 'T1.30.10', 1, '20.000', '20.000'), // 20
    posKnoten('CBNEGIGI', 'T1.30.10', 2, '30.000', '28.500', kennz), // 30, MarkupIt, IT 855.00
    zuschlag('T1.30.10', 3, 'CBNEGNDI', zuschlagAuf('kennzeichnung', '10.00')), // 40, IdentAsMark
    titelKnoten('T1.30.20', 'T1.30', 1),
    posKnoten('CBNEHEEA', 'T1.30.20', 0, '10.000', '10.000'), // 10
    posKnoten('CBNEHJCI', 'T1.30.20', 1, '20.000', '20.000'), // 20
    posKnoten('CBNEHNLA', 'T1.30.20', 2, '30.000', '30.000'), // 30
    zuschlag('T1.30.20', 3, 'CBNEICEA', zuschlagAuf('gliederung', '10.00')), // 40, AllInCat
    zuschlag('T1.30.20', 4, 'CBNEIFHI', zuschlagAuf('gliederung', '10.00')), // 50, AllInCat
    posKnoten('CBNEIJFI', 'T1.30.20', 5, '10.000', '10.000'), // 60
    zuschlag('T1.30.20', 6, 'CBNEIOCA', zuschlagAuf('gliederung', '10.00')), // 70, AllInCat
    titelKnoten('T1.30.30', 'T1.30', 2),
    posKnoten('CBNEJFBA', 'T1.30.30', 0, '10.000', '10.000'), // 10
    posKnoten('CBNEJJPI', 'T1.30.30', 1, '20.000', '20.000'), // 20
    zuschlag('T1.30.30', 2, 'CBNEJOII', zuschlagsliste(['CBNEJJPI'], '10.00')), // 30, ListInSubQty
    zuschlag('T1.30.30', 3, 'CBNEKBMA', zuschlagsliste(['CBNEBKMI'], '10.00')), // 40, ListInSubQty
  ];
}
const x86 = (): LvZustand => lvMit(x86Knoten());

/** BVBS 3.3 Bauausführung X84, Bereich 002.001; Mengen = IT / UP. */
const bauausfuehrung = (): LvZustand =>
  lvMit([
    titelKnoten('T002', LV_ID, 0),
    titelKnoten('T002.001', 'T002', 0),
    posKnoten('ID02BDF240', 'T002.001', 0, '450000.000', '1.000'), // 0010
    posKnoten('ID02BDF348', 'T002.001', 1, '200000.000', '2.000'), // 0020
    zuschlag('T002.001', 2, 'ID0ACC2708', zuschlagAuf('gliederung', '10.00')), // 0030, AllInCat in der X83
    posKnoten('ID02BDF450', 'T002.001', 3, '100.000', '1.110'), // 0040
  ]);

const menge = (positionId: string, m: string | null): LvBefehl => ({
  art: 'MengeAendern',
  positionId: id.pos(positionId),
  menge: m as Menge | null,
});
const ep = (positionId: string, e: string | null): LvBefehl => ({
  art: 'EinheitspreisAendern',
  positionId: id.pos(positionId),
  einheitspreis: e as Einheitspreis | null,
});

describe('Golden: BVBS 3.3 AVA X86, Bereich 1.30 (D-03)', () => {
  const z = x86();

  it('1.30.10.40 (ID CBNEGNDI, IdentAsMark): Basis 955,00 (nur MarkupIt), 10 % = 95,50; Titel 1.450,50', () => {
    expect(zuschlagsbasen(z.leistungsverzeichnis).get(id.pos('CBNEGNDI'))).toEqual({
      basis: '955.00',
      betrag: '95.50',
      bezugOhnePreis: false,
    });
    expect(gp(z, 'CBNEGIGI')).toBe('855.00');
    expect(gp(z, 'CBNEGNDI')).toBe('95.50');
    expect(gs(z, 'T1.30.10')).toBe('1450.50');
  });

  it('1.30.20.40/50/70 (ID CBNEICEA, CBNEIFHI, CBNEIOCA, AllInCat): 1.400,00 → 140,00 zweimal; 100,00 → 10,00; Titel 1.790,00', () => {
    const basen = zuschlagsbasen(z.leistungsverzeichnis);
    expect(basen.get(id.pos('CBNEICEA'))?.basis).toBe('1400.00');
    expect(basen.get(id.pos('CBNEIFHI'))?.basis).toBe('1400.00'); // direkt hinter 40: gleiche Basis
    expect(basen.get(id.pos('CBNEIOCA'))?.basis).toBe('100.00'); // nur 60; 50 beendet den Bereich
    expect(gp(z, 'CBNEICEA')).toBe('140.00');
    expect(gp(z, 'CBNEIFHI')).toBe('140.00');
    expect(gp(z, 'CBNEIOCA')).toBe('10.00');
    expect(gs(z, 'T1.30.20')).toBe('1790.00');
  });

  it('1.30.30.30/40 (ID CBNEJOII, CBNEKBMA, ListInSubQty): 400,00 → 40,00; 2.791,00 aus 1.10.30.20 → 279,10; Titel 819,10', () => {
    const basen = zuschlagsbasen(z.leistungsverzeichnis);
    expect(basen.get(id.pos('CBNEJOII'))?.basis).toBe('400.00');
    expect(basen.get(id.pos('CBNEKBMA'))?.basis).toBe('2791.00');
    expect(gp(z, 'CBNEJOII')).toBe('40.00');
    expect(gp(z, 'CBNEKBMA')).toBe('279.10');
    expect(gs(z, 'T1.30.30')).toBe('819.10');
  });

  it('Bereich 1.30: 4.059,60; alle Zuschlagsbeträge gehen ins Netto (R6)', () => {
    expect(gs(z, 'T1.30')).toBe('4059.60');
    expect(z.summen.gesamt.netto).toBe('6850.60'); // 2.791,00 + 4.059,60
    for (const k of ['CBNEGNDI', 'CBNEICEA', 'CBNEIFHI', 'CBNEIOCA', 'CBNEJOII', 'CBNEKBMA'])
      expect(z.summen.positionen.find((p) => p.positionId === k)?.gehtInSummeEin).toBe(true);
  });
});

describe('Golden: BVBS 3.3 Bauausführung X84, Bereich 002.001 (D-03)', () => {
  it('002.001.0030 (ID ID0ACC2708, AllInCat): 850.000,00 → 85.000,00; 0040 dahinter zählt nicht; Titel 935.111,00', () => {
    const z = bauausfuehrung();
    expect(zuschlagsbasen(z.leistungsverzeichnis).get(id.pos('ID0ACC2708'))?.basis).toBe('850000.00');
    expect(gp(z, 'ID0ACC2708')).toBe('85000.00');
    expect(gs(z, 'T002.001')).toBe('935111.00');
  });
});

describe('Rechenregeln im Einzelnen', () => {
  it('stehen an einer Stelle mit Status; die Teilmenge ist als Lücke vermerkt', () => {
    expect(ZUSCHLAG_REGELN.status).toMatch(/D-03/);
    expect(ZUSCHLAG_REGELN.teilmenge).toMatch(/LÜCKE/);
    expect(ZUSCHLAG_REGELN.altform).toMatch(/R8/);
  });

  it('R1: ohne Satz und ohne Menge/EP kein Betrag; R8 Altform: ohne Satz mit Menge und EP Menge × EP', () => {
    const z = lvMit([
      posKnoten('P', LV_ID, 0, '1.000', '100.000'),
      zuschlag(LV_ID, 1, 'Z0', zuschlagAuf('gliederung', null)),
      posKnoten('A', LV_ID, 2, '2.000', '7.500', { zuschlag: zuschlagsliste(['P']) }),
    ]);
    expect(gp(z, 'Z0')).toBeNull();
    expect(gp(z, 'A')).toBe('15.00');
    expect(z.summen.gesamt.netto).toBe('115.00');
  });

  it('R1: kaufmännisch gerundet (Basis 0,25, Satz 10 % → 0,03)', () => {
    const z = lvMit([
      posKnoten('P', LV_ID, 0, '1.000', '0.250'),
      zuschlag(LV_ID, 1, 'Z', zuschlagAuf('gliederung', '10.00')),
    ]);
    expect(gp(z, 'Z')).toBe('0.03');
  });

  it('R2: nur Bezugspositionen, deren Betrag ins Netto geht; R3: Hinweistexte und Untergliederungen werden übersprungen', () => {
    const z = lvMit([
      posKnoten('N', LV_ID, 0, '1.000', '100.000'),
      posKnoten('B', LV_ID, 1, '1.000', '1000.000', { merkmale: merkmale({ bedarf: 'ohne-gesamtbetrag' }) }),
      posKnoten('W', LV_ID, 2, '1.000', '2000.000', {
        merkmale: merkmale({ wahl: { gruppe: 1, variante: 1, grundpositionId: null } }),
      }),
      posKnoten('G', LV_ID, 3, '1.000', '10.000', {
        merkmale: merkmale({ wahl: { gruppe: 1, variante: 0, grundpositionId: null } }),
      }),
      titelKnoten('T', LV_ID, 4),
      posKnoten('TP', 'T', 0, '1.000', '5000.000'),
      { art: 'hinweis', id: id.hinweis('H'), elternId: id.eltern(LV_ID), reihenfolge: 5, text: [] },
      zuschlag(LV_ID, 6, 'Z', zuschlagAuf('gliederung', '10.00')),
    ]);
    expect(zuschlagsbasen(z.leistungsverzeichnis).get(id.pos('Z'))?.basis).toBe('110.00');
    expect(gp(z, 'Z')).toBe('11.00');
  });

  it('R5: Bezug hinter der Zuschlagsposition zählt; Teilmenge (Lücke, Annahme): gerundet(Teilmenge × EP, 2)', () => {
    const z = lvMit([
      posKnoten('Z', LV_ID, 0, null, null, {
        zuschlag: {
          prozentsatz: '10.00' as Prozent,
          bezug: {
            art: 'positionen',
            positionen: [
              { positionId: id.pos('P'), teilmenge: '0.333' as Menge },
              { positionId: id.pos('Q'), teilmenge: null },
            ],
          },
        },
      }),
      posKnoten('P', LV_ID, 1, '10.000', '10.000'),
      posKnoten('Q', LV_ID, 2, '1.000', '5.000'),
    ]);
    // 0,333 × 10,000 = 3,33; dazu Q 5,00 → Basis 8,33; 10 % = 0,833 → 0,83
    expect(zuschlagsbasen(z.leistungsverzeichnis).get(id.pos('Z'))).toEqual({
      basis: '8.33',
      betrag: '0.83',
      bezugOhnePreis: false,
    });
  });

  it('R6: der Betrag einer Zuschlagsposition mit Bedarf oder Wahl geht in die Bedarfs- bzw. Wahlsumme', () => {
    const z = lvMit([
      posKnoten('P', LV_ID, 0, '1.000', '100.000'),
      posKnoten('ZB', LV_ID, 1, null, null, {
        zuschlag: zuschlagAuf('gliederung', '10.00'),
        merkmale: merkmale({ bedarf: 'ohne-gesamtbetrag' }),
      }),
      posKnoten('ZW', LV_ID, 2, null, null, {
        zuschlag: zuschlagAuf('gliederung', '5.00'),
        merkmale: merkmale({ wahl: { gruppe: 1, variante: 1, grundpositionId: null } }),
      }),
    ]);
    expect(z.summen.gesamt).toMatchObject({
      netto: '100.00',
      summeBedarfOhneGesamtbetrag: '10.00',
      summeWahl: '5.00',
    });
  });
});

// --- Neuberechnung im Teilbaum ---------------------------------------------------------------------------------

describe('Änderung an einer Bezugsposition aktualisiert den Zuschlagsbetrag im ChangeSet', () => {
  it('Kennzeichnung: Menge von 1.30.10.10 auf 20,000 → Basis 1.055,00, Zuschlag 105,50', () => {
    const z = x86();
    const cs = erwarteOk(lvBefehlAusfuehren(z, menge('CBNEFPDI', '20.000')));
    expect(cs.summen.positionen).toEqual([
      { positionId: 'CBNEFPDI', gesamtpreis: '200.00', gehtInSummeEin: true },
      { positionId: 'CBNEGNDI', gesamtpreis: '105.50', gehtInSummeEin: true },
    ]);
    expect(cs.summen.gliederungen.map((g) => [g.gliederungId, g.summe])).toEqual([
      ['T1.30', '4169.60'],
      ['T1.30.10', '1560.50'],
    ]);
    const neu = anwenden(z, cs);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('Kennzeichnung: eine nicht gekennzeichnete Position ändert den Zuschlag nicht', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(x86(), menge('CBNEGEAI', '21.000')));
    expect(cs.summen.positionen.map((p) => p.positionId)).toEqual(['CBNEGEAI']);
  });

  it('Gliederung: EP von 1.30.20.20 auf 30,000 → beide Zuschläge des Blocks 160,00, 1.30.20.70 bleibt', () => {
    const z = x86();
    const cs = erwarteOk(lvBefehlAusfuehren(z, ep('CBNEHJCI', '30.000')));
    expect(cs.summen.positionen.map((p) => [p.positionId, p.gesamtpreis])).toEqual([
      ['CBNEHJCI', '600.00'],
      ['CBNEICEA', '160.00'],
      ['CBNEIFHI', '160.00'],
    ]);
    expect(cs.summen.gliederungen.map((g) => [g.gliederungId, g.summe])).toEqual([
      ['T1.30', '4299.60'],
      ['T1.30.20', '2030.00'],
    ]);
    const neu = anwenden(z, cs);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
  });

  it('Liste mit Bezug in anderer Gliederung: Menge von 1.10.30.20 auf 200,000 → 1.30.30.40 = 558,20', () => {
    const z = x86();
    const cs = erwarteOk(lvBefehlAusfuehren(z, menge('CBNEBKMI', '200.000')));
    expect(cs.summen.positionen.map((p) => [p.positionId, p.gesamtpreis])).toEqual([
      ['CBNEBKMI', '5582.00'],
      ['CBNEKBMA', '558.20'],
    ]);
    expect(cs.summen.gliederungen.map((g) => [g.gliederungId, g.summe])).toEqual([
      ['T1.10', '5582.00'],
      ['T1.10.30', '5582.00'],
      ['T1.30', '4338.70'],
      ['T1.30.30', '1098.20'],
    ]);
    const neu = anwenden(z, cs);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
  });

  it('Merkmal einer Bezugsposition: Bedarf an 1.30.20.30 nimmt sie aus der Basis (500,00 → 50,00 zweimal)', () => {
    const z = x86();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'PositionsmerkmaleSetzen',
        positionId: id.pos('CBNEHNLA'),
        merkmale: merkmale({ bedarf: 'ohne-gesamtbetrag' }),
        zuschlag: null,
      }),
    );
    expect(cs.summen.positionen.map((p) => [p.positionId, p.gesamtpreis, p.gehtInSummeEin])).toEqual([
      ['CBNEHNLA', '900.00', false],
      ['CBNEICEA', '50.00', true],
      ['CBNEIFHI', '50.00', true],
    ]);
    const t = cs.summen.gliederungen.find((g) => g.gliederungId === 'T1.30.20');
    expect(t).toEqual({
      gliederungId: 'T1.30.20',
      summe: '710.00', // 100 + 400 + 50 + 50 + 100 + 10
      summeBedarfOhneGesamtbetrag: '900.00',
      summeWahl: '0.00',
    });
  });

  it('Satz einer Zuschlagsposition ändern (PositionsmerkmaleSetzen) und Bezugsform wechseln', () => {
    const z = x86();
    const cs = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'PositionsmerkmaleSetzen',
        positionId: id.pos('CBNEGNDI'),
        merkmale: merkmale(),
        zuschlag: zuschlagAuf('gliederung', '5.00'),
      }),
    );
    // Bereich ganz: 100 + 400 + 855 = 1.355,00; 5 % = 67,75
    expect(cs.summen.positionen).toEqual([
      { positionId: 'CBNEGNDI', gesamtpreis: '67.75', gehtInSummeEin: true },
    ]);
    const neu = anwenden(z, cs);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
  });

  it('Anlegen, Verschieben und Löschen im Elternknoten berechnen dessen Zuschlagspositionen neu', () => {
    let z = x86();
    // Anlegen vor 1.30.20.40: neue Basis
    const anlegen = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'PositionAnlegen',
        id: id.pos('NEU'),
        ort: { art: 'nach', knotenId: id.knoten('CBNEHNLA') },
        daten: posKnoten('NEU', 'x', 0, '1.000', '100.000'),
      }),
    );
    expect(anlegen.summen.positionen.map((p) => [p.positionId, p.gesamtpreis])).toEqual([
      ['CBNEICEA', '150.00'],
      ['CBNEIFHI', '150.00'],
      ['NEU', '100.00'],
    ]);
    z = anwenden(z, anlegen);
    // Verschieben hinter 1.30.20.50: jetzt Basis von 1.30.20.70
    const schieben = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'KnotenVerschieben',
        knotenId: id.knoten('NEU'),
        ziel: { art: 'nach', knotenId: id.knoten('CBNEIFHI') },
      }),
    );
    expect(schieben.summen.positionen.map((p) => [p.positionId, p.gesamtpreis])).toEqual([
      ['CBNEICEA', '140.00'],
      ['CBNEIFHI', '140.00'],
      ['CBNEIOCA', '20.00'],
    ]);
    z = anwenden(z, schieben);
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
    // Löschen von 1.30.20.50: 40 bleibt allein, 70 sammelt bis 40
    const loeschen = erwarteOk(
      lvBefehlAusfuehren(z, { art: 'KnotenLoeschen', knotenId: id.knoten('CBNEIFHI') }),
    );
    z = anwenden(z, loeschen);
    expect(gp(z, 'CBNEIOCA')).toBe('20.00');
    expect(z.summen).toEqual(summenBerechnen(z.leistungsverzeichnis));
  });
});

describe('Löschen einer Bezugsposition', () => {
  it('entfernt den Verweis im selben ChangeSet (Zuschlagsposition unter geaendert); die Umkehrung bringt ihn zurück', () => {
    const z = x86();
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'KnotenLoeschen', knotenId: id.knoten('CBNEJJPI') }));
    const geaendert = cs.knoten.geaendert.find((g) => g.nachher.id === 'CBNEJOII');
    expect(geaendert?.vorher).toMatchObject({ zuschlag: zuschlagsliste(['CBNEJJPI'], '10.00') });
    expect(geaendert?.nachher).toMatchObject({ zuschlag: zuschlagsliste([], '10.00') });
    // dieselbe Zuschlagsposition rückt zugleich auf: ein Eintrag mit beiden Änderungen
    expect(geaendert?.nachher.reihenfolge).toBe(1);
    expect(cs.knoten.geaendert.filter((g) => g.nachher.id === 'CBNEJOII')).toHaveLength(1);
    expect(cs.summen.positionen).toEqual([
      { positionId: 'CBNEJOII', gesamtpreis: '0.00', gehtInSummeEin: true },
    ]);
    const neu = anwenden(z, cs);
    expect(pruefeLvInvarianten(neu.leistungsverzeichnis)).toEqual([]);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
    expect(gs(neu, 'T1.30.30')).toBe('379.10'); // 100 + 0 + 279,10
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('auch im Unterbaum und in einer anderen Gliederung (Titel 1.10 samt 1.10.30.20)', () => {
    const z = x86();
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'KnotenLoeschen', knotenId: id.knoten('T1.10') }));
    const kbma = cs.knoten.geaendert.find((g) => g.nachher.id === 'CBNEKBMA');
    expect(kbma?.nachher).toMatchObject({ zuschlag: zuschlagsliste([], '10.00'), reihenfolge: 3 });
    const neu = anwenden(z, cs);
    expect(gp(neu, 'CBNEKBMA')).toBe('0.00');
    expect(neu.summen.gesamt.netto).toBe('3780.50'); // 4.059,60 − 279,10
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('Löschen der Zuschlagsposition selbst lässt die Bezugsposition unberührt', () => {
    const z = x86();
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'KnotenLoeschen', knotenId: id.knoten('CBNEKBMA') }));
    expect(cs.knoten.geaendert).toEqual([]);
    expect(anwenden(z, cs).summen.gesamt.netto).toBe('6571.50');
  });
});

// --- Gedachtes LV (R7) ----------------------------------------------------------------------------------------------

describe('Gedachtes LV eines Bieters (R7)', () => {
  it('EP und Sätze eines Bieters eingesetzt: summenBerechnen rechnet die Bieterzahlen; zuschlagsbasen kennzeichnet Bezug ohne Preis', () => {
    const lv = x86().leistungsverzeichnis;
    // Bieter: jeder EP verdoppelt, 1.30.30.20 nicht angeboten (EP null), jeder Satz 5,00 %.
    const doppelt: Record<string, string | null> = {
      CBNEBKMI: '55.820',
      CBNEFPDI: '20.000',
      CBNEGEAI: '40.000',
      CBNEGIGI: '57.000',
      CBNEHEEA: '20.000',
      CBNEHJCI: '40.000',
      CBNEHNLA: '60.000',
      CBNEIJFI: '20.000',
      CBNEJFBA: '20.000',
      CBNEJJPI: null,
    };
    const gedacht = {
      ...lv,
      knoten: lv.knoten.map((k) => {
        if (k.art !== 'position') return k;
        if (k.zuschlag !== null) return { ...k, zuschlag: { ...k.zuschlag, prozentsatz: '5.00' as Prozent } };
        return { ...k, einheitspreis: (doppelt[k.id] ?? null) as Einheitspreis | null };
      }),
    };
    const s = summenBerechnen(gedacht);
    const t = (g: string) => s.gliederungen.find((x) => x.gliederungId === g)?.summe;
    // 1.30.10: 200 + 800 + 1.710 = 2.710; markiert 1.910 → 95,50; zusammen 2.805,50
    expect(t('T1.30.10')).toBe('2805.50');
    // 1.30.20: 200 + 800 + 1.800 = 2.800 → 140,00 zweimal; 60: 200 → 10,00; zusammen 3.290,00
    expect(t('T1.30.20')).toBe('3290.00');
    // 1.30.30: 200 + (nicht angeboten) + 0,00 + 5.582,00 × 5 % = 279,10 → 479,10
    expect(t('T1.30.30')).toBe('479.10');
    expect(t('T1.30')).toBe('6574.60');
    expect(s.gesamt.netto).toBe('12156.60');
    const basen = zuschlagsbasen(gedacht);
    expect(basen.get(id.pos('CBNEGNDI'))).toEqual({
      basis: '1910.00',
      betrag: '95.50',
      bezugOhnePreis: false,
    });
    expect(basen.get(id.pos('CBNEJOII'))).toEqual({ basis: '0.00', betrag: '0.00', bezugOhnePreis: true });
    expect(basen.get(id.pos('CBNEKBMA'))).toEqual({
      basis: '5582.00',
      betrag: '279.10',
      bezugOhnePreis: false,
    });
    // Das Ausschreibungs-LV bleibt unberührt (kein Zwischenspeicher an seiner Identität).
    expect(summenBerechnen(lv).gesamt.netto).toBe('6850.60');
    expect(wende(x86(), menge('CBNEFPDI', '10.000')).summen.gesamt.netto).toBe('6850.60');
  });
});

// --- Fixture zuschlag.json (Teil 4) -------------------------------------------------------------------------------

describe('Fixture zuschlag.json: Kern und Generator (rechnen.mjs, BigInt) sind zwei getrennte Zähler', () => {
  const fx = fixtureLesen('zuschlag');
  const soll = sollwerteLesen('zuschlag') as ReturnType<typeof sollwerteLesen> & {
    zuschlaege: Record<string, { basis: string; betrag: string }>;
  };
  const z = wende(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: fx.id as LeistungsverzeichnisId,
    projektId: PROJEKT_ID,
    inhalt: fixtureAlsInhalt(fx),
  });

  it('Gesamtsummen: Netto 6.850,60, MwSt 1.301,61, Brutto 8.152,21', () => {
    expect(z.summen.gesamt).toEqual({
      ...soll.summen,
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
    expect(z.summen.gesamt.brutto).toBe('8152.21');
  });

  it('jede Positions- und Titelsumme und jede Zuschlagsbasis gleich den Sollwerten', () => {
    for (const p of z.summen.positionen) {
      expect(p.gesamtpreis, p.positionId).toBe(soll.positionen[p.positionId]?.gp);
      expect(p.gehtInSummeEin, p.positionId).toBe(soll.positionen[p.positionId]?.inSumme);
    }
    for (const g of z.summen.gliederungen)
      expect(g.summe, g.gliederungId).toBe(soll.titel[g.gliederungId]?.summe);
    const basen = zuschlagsbasen(z.leistungsverzeichnis);
    expect(basen.size).toBe(Object.keys(soll.zuschlaege).length);
    for (const [zid, b] of basen) {
      expect({ basis: b.basis, betrag: b.betrag }, zid).toEqual(soll.zuschlaege[zid]);
      expect(b.bezugOhnePreis).toBe(false);
    }
    const titel = (oz: string) =>
      gs(z, fx.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === oz)?.id ?? 'x');
    expect(['01.01', '01.02', '01.03', '01', '02'].map(titel)).toEqual([
      '1450.50',
      '1790.00',
      '819.10',
      '4059.60',
      '2791.00',
    ]);
  });
});
