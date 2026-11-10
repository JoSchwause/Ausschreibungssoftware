// SPDX-License-Identifier: AGPL-3.0-or-later
// Positionsmerkmale (K5, Ticket 37; F4, F5, E-04, E-05): wohin ein Betrag geht, die Ausweise für Bedarf und Wahl, die
// Formprüfungen und der Befehl `PositionsmerkmaleSetzen`.

import { describe, expect, it } from 'vitest';
import type {
  LeistungsverzeichnisId,
  LvBefehl,
  LvZustand,
  Positionsdaten,
  Positionsmerkmale,
  PositionsmerkmaleSetzen,
  Zuschlag,
} from '@tethys/vertrag';
import {
  SUMMEN_ANNAHMEN,
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  lvBefehlAusfuehren,
  summenBerechnen,
} from './index';
import {
  KEINE_SUMMEN,
  LV_ID,
  PROJEKT_ID,
  anwenden,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  id,
  lvMit,
  posKnoten,
  positionsdaten,
  sollwerteLesen,
  titelKnoten,
  wende,
} from './testhilfen';

const OHNE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};
const m = (ueber: Partial<Positionsmerkmale>): Partial<Positionsdaten> => ({
  merkmale: { ...OHNE, ...ueber },
});
const wahl = (variante: number | null, gruppe: number | null = 1) => ({
  gruppe,
  variante,
  grundpositionId: null,
});

const gs = (z: LvZustand, gliederungId: string) =>
  z.summen.gliederungen.find((g) => g.gliederungId === gliederungId);
const ps = (z: LvZustand, positionId: string) => z.summen.positionen.find((p) => p.positionId === positionId);

/** Eine Position (10,000 × 10,000 = 100,00) mit den Merkmalen unter einem Titel; dazu eine Normalposition mit 1,00. */
function mitMerkmalen(ueber: Partial<Positionsdaten>, menge: string | null = '10.000'): LvZustand {
  return lvMit([
    titelKnoten('T1', LV_ID, 0),
    posKnoten('N', 'T1', 0, '1.000', '1.000'),
    posKnoten('X', 'T1', 1, menge, '10.000', ueber),
  ]);
}

/** Wo der Betrag von X steht: Netto, Bedarfssumme, Wahlsumme oder nirgends (geprüft an Titel und Gesamt). */
function zielVon(z: LvZustand): 'netto' | 'bedarf' | 'wahl' | 'nirgends' {
  const t = gs(z, 'T1');
  const g = z.summen.gesamt;
  expect(t?.summeBedarfOhneGesamtbetrag).toBe(g.summeBedarfOhneGesamtbetrag);
  expect(t?.summeWahl).toBe(g.summeWahl);
  expect(t?.summe).toBe(g.netto);
  if (g.netto === '101.00') return 'netto';
  expect(g.netto).toBe('1.00');
  if (g.summeBedarfOhneGesamtbetrag !== '0.00') return 'bedarf';
  if (g.summeWahl !== '0.00') return 'wahl';
  return 'nirgends';
}

describe('Wohin ein Betrag geht (Teil 1, je Merkmalskombination)', () => {
  it.each([
    ['normal', {}, 'netto'],
    ['Bedarf mit Gesamtbetrag', m({ bedarf: 'mit-gesamtbetrag' }), 'netto'],
    ['Bedarf ohne Gesamtbetrag', m({ bedarf: 'ohne-gesamtbetrag' }), 'bedarf'],
    ['Bedarf im Stundenlohn', m({ bedarf: 'ohne-gesamtbetrag', stundenlohn: true }), 'bedarf'],
    ['Stundenlohn', m({ stundenlohn: true }), 'netto'],
    ['Pauschal mit Menge', m({ pauschal: true }), 'netto'],
    ['Wahl Variante 1', m({ wahl: wahl(1) }), 'wahl'],
    ['Wahl ohne Nummer (Daten vor v1.1b)', m({ wahl: wahl(null, null) }), 'wahl'],
    ['Wahl mit Bedarf: Wahl vor Bedarf', m({ wahl: wahl(2), bedarf: 'ohne-gesamtbetrag' }), 'wahl'],
    ['Grundausführung Variante 0', m({ wahl: wahl(0) }), 'netto'],
    [
      'Grundausführung Variante 0 mit Bedarf ohne Gesamtbetrag',
      m({ wahl: wahl(0), bedarf: 'ohne-gesamtbetrag' }),
      'bedarf',
    ],
    ['Zuschlagskennzeichen', m({ zuschlagskennzeichen: true }), 'netto'],
  ] as const)('%s → %s', (_name, ueber, ziel) => {
    const z = mitMerkmalen(ueber);
    expect(ps(z, 'X')?.gesamtpreis).toBe('100.00');
    expect(ps(z, 'X')?.gehtInSummeEin).toBe(ziel === 'netto');
    expect(zielVon(z)).toBe(ziel);
    if (ziel === 'bedarf') expect(z.summen.gesamt.summeBedarfOhneGesamtbetrag).toBe('100.00');
    if (ziel === 'wahl') expect(z.summen.gesamt.summeWahl).toBe('100.00');
  });

  it('ohne Betrag (Menge fehlt): nirgends, auch bei Bedarf und Wahl', () => {
    for (const ueber of [{}, m({ bedarf: 'ohne-gesamtbetrag' }), m({ wahl: wahl(1) })]) {
      const z = mitMerkmalen(ueber, null);
      expect(ps(z, 'X')).toEqual({ positionId: 'X', gesamtpreis: null, gehtInSummeEin: false });
      expect(zielVon(z)).toBe('nirgends');
    }
  });

  it('Pauschal ohne Menge: GP = EP auf 2 Stellen (Menge 1 angenommen), geht ins Netto', () => {
    const z = lvMit([posKnoten('X', LV_ID, 0, null, '1234.565', m({ pauschal: true }))]);
    expect(ps(z, 'X')).toEqual({ positionId: 'X', gesamtpreis: '1234.57', gehtInSummeEin: true });
    expect(z.summen.gesamt.netto).toBe('1234.57');
  });

  it('die Ausweise gehen nicht in Netto, Nachlass, MwSt oder Brutto ein (F4)', () => {
    const z = lvMit(
      [
        posKnoten('N', LV_ID, 0, '1.000', '100.000'),
        posKnoten('B', LV_ID, 1, '1.000', '50.000', m({ bedarf: 'ohne-gesamtbetrag' })),
        posKnoten('W', LV_ID, 2, '1.000', '70.000', m({ wahl: wahl(1) })),
      ],
      { nachlass: { art: 'prozent', wert: '10.00' as never } },
    );
    expect(z.summen.gesamt).toEqual({
      netto: '100.00',
      nachlass: '10.00',
      nettoNachNachlass: '90.00',
      mwst: '17.10',
      brutto: '107.10',
      summeBedarfOhneGesamtbetrag: '50.00',
      summeWahl: '70.00',
    });
  });

  it('Ausweise stehen an jeder Gliederung und summieren über Untergliederungen; 0,00 ohne solche Positionen', () => {
    const z = lvMit([
      titelKnoten('T1', LV_ID, 0),
      titelKnoten('T11', 'T1', 0),
      titelKnoten('T2', LV_ID, 1),
      posKnoten('B', 'T11', 0, '2.000', '5.000', m({ bedarf: 'ohne-gesamtbetrag' })),
      posKnoten('W', 'T1', 1, '3.000', '5.000', m({ wahl: wahl(3) })),
      posKnoten('N', 'T2', 0, '1.000', '5.000'),
    ]);
    expect(gs(z, 'T11')).toEqual({
      gliederungId: 'T11',
      summe: '0.00',
      summeBedarfOhneGesamtbetrag: '10.00',
      summeWahl: '0.00',
    });
    expect(gs(z, 'T1')).toEqual({
      gliederungId: 'T1',
      summe: '0.00',
      summeBedarfOhneGesamtbetrag: '10.00',
      summeWahl: '15.00',
    });
    expect(gs(z, 'T2')).toEqual({
      gliederungId: 'T2',
      summe: '5.00',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '0.00',
    });
  });

  it('Fixture typisch: Bedarf 586,80 (01.0040), Wahl 5.880,00 (02.0070 A), Netto unverändert 55.463,41', () => {
    const fx = fixtureLesen('typisch');
    const z = wende(null, {
      art: 'LeistungsverzeichnisAnlegen',
      id: fx.id as LeistungsverzeichnisId,
      projektId: PROJEKT_ID,
      inhalt: fixtureAlsInhalt(fx),
    });
    expect(z.summen.gesamt.netto).toBe('55463.41');
    expect(z.summen.gesamt).toMatchObject(sollwerteLesen('typisch').summen);
    expect(z.summen.gesamt.summeBedarfOhneGesamtbetrag).toBe('586.80');
    expect(z.summen.gesamt.summeWahl).toBe('5880.00');
  });

  it('die Regel steht an einer Stelle und ist als entschieden vermerkt', () => {
    expect(SUMMEN_ANNAHMEN.positionsarten).toMatch(/^ENTSCHIEDEN \(E-04, E-05, Demo D-37\.1\)/);
    expect(SUMMEN_ANNAHMEN.pauschal).toMatch(/Demo D-37\.1/);
  });
});

// --- Formprüfungen -----------------------------------------------------------------------------------------------

describe('Formprüfungen (Teil 1): ungueltige-eingabe mit feld', () => {
  const basis = (): LvZustand =>
    lvMit([
      titelKnoten('T1', LV_ID, 0),
      posKnoten('P1', 'T1', 0, '1.000', '10.000'),
      posKnoten('Z1', 'T1', 1, null, null, {
        zuschlag: { prozentsatz: '10.00' as never, bezug: { art: 'gliederung' } },
      }),
    ]);
  const zuschlag = (bezug: Zuschlag['bezug']): Zuschlag => ({ prozentsatz: '10.00' as never, bezug });
  const liste = (...ids: string[]): Zuschlag =>
    zuschlag({ art: 'positionen', positionen: ids.map((i) => ({ positionId: id.pos(i), teilmenge: null })) });

  const anlegen = (daten: Partial<Positionsdaten>): LvBefehl => ({
    art: 'PositionAnlegen',
    id: id.pos('X'),
    ort: { art: 'ende', elternId: id.eltern('T1') },
    daten: positionsdaten('x', daten),
  });
  const setzen = (merkmale: Positionsmerkmale, z: Zuschlag | null): LvBefehl => ({
    art: 'PositionsmerkmaleSetzen',
    positionId: id.pos('P1'),
    merkmale,
    zuschlag: z,
  });
  const lvAnlegen = (daten: Partial<Positionsdaten>): LvBefehl => ({
    art: 'LeistungsverzeichnisAnlegen',
    id: LV_ID,
    projektId: PROJEKT_ID,
    inhalt: {
      name: 'x',
      ozMaske: basis().leistungsverzeichnis.ozMaske,
      mwstSatz: '19.00' as never,
      nachlass: null,
      wurzelId: LV_ID,
      knoten: [posKnoten('P1', LV_ID, 0, '1.000', '1.000'), posKnoten('X', LV_ID, 1, null, null, daten)],
    },
  });

  /** Alle drei Befehle weisen gleich ab. */
  function fehlerfeld(
    daten: Partial<Positionsdaten> & { merkmale: Positionsmerkmale; zuschlag: Zuschlag | null },
  ) {
    const ergebnisse = [
      lvBefehlAusfuehren(basis(), anlegen(daten)),
      lvBefehlAusfuehren(basis(), setzen(daten.merkmale, daten.zuschlag)),
      lvBefehlAusfuehren(null, lvAnlegen(daten)),
    ];
    return ergebnisse.map((e) => (e.ok ? 'angenommen' : `${e.fehler.code}:${e.fehler.feld ?? ''}`));
  }
  const dreimal = (s: string) => [s, s, s];

  it('1. Zuschlagsposition mit pauschal oder stundenlohn → merkmale', () => {
    expect(
      fehlerfeld({ merkmale: { ...OHNE, pauschal: true }, zuschlag: zuschlag({ art: 'gliederung' }) }),
    ).toEqual(dreimal('ungueltige-eingabe:merkmale'));
    expect(
      fehlerfeld({ merkmale: { ...OHNE, stundenlohn: true }, zuschlag: zuschlag({ art: 'kennzeichnung' }) }),
    ).toEqual(dreimal('ungueltige-eingabe:merkmale'));
  });

  it('2. Zuschlagsposition mit zuschlagskennzeichen → merkmale.zuschlagskennzeichen', () => {
    expect(
      fehlerfeld({
        merkmale: { ...OHNE, zuschlagskennzeichen: true },
        zuschlag: zuschlag({ art: 'gliederung' }),
      }),
    ).toEqual(dreimal('ungueltige-eingabe:merkmale.zuschlagskennzeichen'));
  });

  it('3. Bezugsliste nennt eine Zuschlagsposition → zuschlag.bezug.positionen', () => {
    const z = basis();
    const e = lvBefehlAusfuehren(z, anlegen({ zuschlag: liste('Z1') }));
    expect(e.ok ? null : [e.fehler.code, e.fehler.feld]).toEqual([
      'ungueltige-eingabe',
      'zuschlag.bezug.positionen',
    ]);
    const s = lvBefehlAusfuehren(z, { ...setzen(OHNE, liste('Z1')) });
    expect(s.ok ? null : [s.fehler.code, s.fehler.feld]).toEqual([
      'ungueltige-eingabe',
      'zuschlag.bezug.positionen',
    ]);
  });

  it('4. wahl.variante außerhalb 0 bis 9 oder wahl.gruppe negativ → merkmale.wahl', () => {
    for (const w of [wahl(10), wahl(-1), wahl(1.5), wahl(1, -1)])
      expect(fehlerfeld({ merkmale: { ...OHNE, wahl: w }, zuschlag: null })).toEqual(
        dreimal('ungueltige-eingabe:merkmale.wahl'),
      );
    for (const w of [wahl(0), wahl(9), wahl(null, null), wahl(3, 0)])
      expect(fehlerfeld({ merkmale: { ...OHNE, wahl: w }, zuschlag: null })).toEqual(dreimal('angenommen'));
  });

  it('5. doppelte Bezugsposition in derselben Liste → zuschlag.bezug.positionen', () => {
    const e = lvBefehlAusfuehren(basis(), anlegen({ zuschlag: liste('P1', 'P1') }));
    expect(e.ok ? null : [e.fehler.code, e.fehler.feld]).toEqual([
      'ungueltige-eingabe',
      'zuschlag.bezug.positionen',
    ]);
    const l = lvBefehlAusfuehren(null, lvAnlegen({ zuschlag: liste('P1', 'P1') }));
    expect(l.ok ? null : [l.fehler.code, l.fehler.feld]).toEqual([
      'ungueltige-eingabe',
      'zuschlag.bezug.positionen',
    ]);
  });

  it('nicht abgewiesen (U5, Befunde von K8): leere Bezugsliste, fehlender Satz, Teilmenge größer als die Menge', () => {
    const z = basis();
    expect(lvBefehlAusfuehren(z, anlegen({ zuschlag: liste() })).ok).toBe(true);
    expect(
      lvBefehlAusfuehren(z, anlegen({ zuschlag: { prozentsatz: null, bezug: { art: 'gliederung' } } })).ok,
    ).toBe(true);
    const gross: Zuschlag = zuschlag({
      art: 'positionen',
      positionen: [{ positionId: id.pos('P1'), teilmenge: '999.000' as never }],
    });
    expect(lvBefehlAusfuehren(z, anlegen({ zuschlag: gross })).ok).toBe(true);
  });

  it('eine Bezugsposition kann keine Zuschlagsposition werden (sonst verletzte das LV Prüfung 3)', () => {
    const z = wende(basis(), anlegen({ zuschlag: liste('P1') }));
    const e = lvBefehlAusfuehren(z, setzen(OHNE, zuschlag({ art: 'gliederung' })));
    expect(e.ok ? null : [e.fehler.code, e.fehler.feld]).toEqual(['ungueltige-eingabe', 'zuschlag']);
  });
});

// --- PositionsmerkmaleSetzen -------------------------------------------------------------------------------------

describe('PositionsmerkmaleSetzen', () => {
  const basis = (): LvZustand =>
    lvMit([
      titelKnoten('T1', LV_ID, 0),
      titelKnoten('T11', 'T1', 0),
      titelKnoten('T2', LV_ID, 1),
      posKnoten('P1', 'T11', 0, '2.000', '10.000'),
      posKnoten('P2', 'T2', 0, '1.000', '5.000'),
    ]);
  const setzen = (
    merkmale: Positionsmerkmale,
    zuschlag: Zuschlag | null = null,
  ): PositionsmerkmaleSetzen => ({
    art: 'PositionsmerkmaleSetzen',
    positionId: id.pos('P1'),
    merkmale,
    zuschlag,
  });

  it('ist zuständig; ZUSTAENDIGES_TICKET nennt den Befehl nicht mehr', () => {
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('PositionsmerkmaleSetzen');
  });

  it('Bedarf setzen: ChangeSet nennt Position, Positionssumme, Gliederungen bis zur Wurzel und Gesamtsummen', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen({ ...OHNE, bedarf: 'ohne-gesamtbetrag' })));
    expect(cs.knoten.geaendert.map((g) => g.nachher.id)).toEqual(['P1']);
    expect(cs.knoten.geaendert[0]?.nachher).toMatchObject({ merkmale: { bedarf: 'ohne-gesamtbetrag' } });
    expect(cs.summen.positionen).toEqual([{ positionId: 'P1', gesamtpreis: '20.00', gehtInSummeEin: false }]);
    expect(cs.summen.gliederungen).toEqual([
      { gliederungId: 'T1', summe: '0.00', summeBedarfOhneGesamtbetrag: '20.00', summeWahl: '0.00' },
      { gliederungId: 'T11', summe: '0.00', summeBedarfOhneGesamtbetrag: '20.00', summeWahl: '0.00' },
    ]);
    expect(cs.summen.gesamt).toMatchObject({
      netto: '5.00',
      summeBedarfOhneGesamtbetrag: '20.00',
      summeWahl: '0.00',
    });
    expect(cs.summen.vorher?.gesamt?.netto).toBe('25.00');
    const neu = anwenden(z, cs);
    expect(neu.summen).toEqual(summenBerechnen(neu.leistungsverzeichnis));
    expect(anwenden(neu, changeSetUmkehren(cs))).toEqual(z);
  });

  it('von Bedarf zu Wahl: die Positionssumme bleibt gleich, nur die Ausweise wandern', () => {
    const z = wende(basis(), setzen({ ...OHNE, bedarf: 'ohne-gesamtbetrag' }));
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen({ ...OHNE, wahl: wahl(1) })));
    expect(cs.summen.positionen).toEqual([]);
    expect(
      cs.summen.gliederungen.map((g) => [g.gliederungId, g.summeBedarfOhneGesamtbetrag, g.summeWahl]),
    ).toEqual([
      ['T1', '0.00', '20.00'],
      ['T11', '0.00', '20.00'],
    ]);
    expect(cs.summen.gesamt).toMatchObject({
      netto: '5.00',
      summeBedarfOhneGesamtbetrag: '0.00',
      summeWahl: '20.00',
    });
  });

  it('derselbe Wert: leeres ChangeSet', () => {
    const z = basis();
    const cs = erwarteOk(lvBefehlAusfuehren(z, setzen({ ...OHNE })));
    expect(cs.knoten).toEqual({ hinzugefuegt: [], geaendert: [], entfernt: [] });
    expect(cs.summen).toEqual(KEINE_SUMMEN);
    expect(anwenden(z, cs)).toBe(z);
  });

  it('Stundenlohn setzen ändert keine Summe, nur die Position', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(basis(), setzen({ ...OHNE, stundenlohn: true })));
    expect(cs.knoten.geaendert).toHaveLength(1);
    expect(cs.summen).toEqual(KEINE_SUMMEN);
  });

  it('unbekannte Position und Gliederung: knoten-unbekannt bzw. knotenart-unzulaessig', () => {
    const z = basis();
    const e = lvBefehlAusfuehren(z, { ...setzen(OHNE), positionId: id.pos('fehlt') });
    expect(e.ok ? null : e.fehler.code).toBe('knoten-unbekannt');
    const g = lvBefehlAusfuehren(z, { ...setzen(OHNE), positionId: id.pos('T1') });
    expect(g.ok ? null : g.fehler.code).toBe('knotenart-unzulaessig');
  });
});
