// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlag → Auftrags-LV (Ticket 59, D-21): `zuschlagErteilen` baut aus LV und Angebot den Befehl
// `AuftragsLeistungsverzeichnisAnlegen`. Der Kern muss ihn annehmen; die Summen rechnet der Kern, die Sollwerte kommen
// aus den Fixtures (`typisch-angebote.json`, `zuschlag.json`), nie aus der Ausgabe des Kerns.

import { auftragsLvBefehlAusfuehren } from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisAnlegen,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvChangeSet,
  Einheitspreis,
  Einheitspreisanteile,
  Knoten,
  LeistungsverzeichnisId,
  LvZustand,
  PapierkorbeintragId,
  PositionId,
  ProjektId,
  Projekt,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { angebotSummenBerechnen, zuschlagErteilen, zuschlagsvorschau } from './index';
import {
  angebot,
  angebotAusFixture,
  angebotsset,
  ep,
  erwarteOk,
  lvAusFixture,
  liste,
  lv,
  lvZustandAusInhalt,
  nichtAngeboten,
  position,
  projekt,
  prozent,
  PROJEKT_ID,
  satz,
  titel,
  zuschlagsposition,
} from './testhilfen';

const NEUE_ID = 'auftrags-lv-1' as AuftragsLeistungsverzeichnisId;

/** Der Kern führt den Befehl aus; wirft, wenn er ihn abweist. */
function imKern(befehl: AuftragsLeistungsverzeichnisAnlegen): AuftragsLvChangeSet {
  return erwarteOk(auftragsLvBefehlAusfuehren(null, befehl));
}

const set = angebotsset();
const { zustand: typisch } = lvAusFixture('typisch');
const fxProjekt: Projekt = {
  id: PROJEKT_ID,
  name: 'Projekt',
  bauherr: { name: 'Bauherr', anschrift: null },
  bieter: set.bieter.map((b) => ({ id: b.id as Projekt['bieter'][number]['id'], name: b.name })),
};
const OHNE_WAHL: ReadonlySet<PositionId> = new Set();

describe('zuschlagErteilen: typisch-angebote ohne Wahl', () => {
  for (const fx of set.angebote) {
    const name = set.bieter.find((b) => b.id === fx.bieterId)?.name ?? '';
    it(`${name}: der Kern nimmt den Befehl an, Summen und Titelsummen wie die Sollwerte der Fixture`, () => {
      const a = angebotAusFixture(fx, typisch);
      const { befehl } = erwarteOk(zuschlagErteilen(typisch, a, fxProjekt, OHNE_WAHL, NEUE_ID));
      const cs = imKern(befehl);
      const g = cs.summen.gesamt;
      if (g === null) throw new Error('Das ChangeSet trägt keine Gesamtsummen.');
      expect({
        netto: g.netto,
        nachlass: g.nachlass,
        nettoNachNachlass: g.nettoNachNachlass,
        mwst: g.mwst,
        brutto: g.brutto,
      }).toEqual(fx.sollwerte.summen);
      const titel = Object.fromEntries(
        cs.summen.gliederungen.map((t) => [t.gliederungId, { summe: t.summe }]),
      );
      expect(titel).toEqual(fx.sollwerte.titel);
    });
  }
});

describe('zuschlagErteilen: Kopf des Auftrags-LV', () => {
  const inhaltKopf = {
    name: 'LV Kopf',
    ozMaske: lvAusFixture('typisch').zustand.leistungsverzeichnis.ozMaske,
    mwstSatz: '7.00' as Prozent,
    nachlass: prozent('10.00'),
    auftraggeber: { name: 'Stadt', strasse: null, plz: null, ort: 'Ort', vergabenummer: 'V-1' },
    vergabeinformationen: {
      eroeffnungsdatum: '2026-01-02',
      eroeffnungszeit: null,
      abgabeort: null,
      ausfuehrungsbeginn: null,
      ausfuehrungsende: null,
      auftragsnummer: null,
      auftragsdatum: null,
      abnahmeart: null,
      gewaehrleistung: null,
    },
    epaBezeichnungen: [{ nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' }] as const,
  };
  const z = lvZustandAusInhalt('lv-k', {
    ...inhaltKopf,
    wurzelId: 'lv-k' as LeistungsverzeichnisId,
    knoten: [titel('t1', 'lv-k', 0), position('p1', 't1', 0, '2.000', '5.000')],
  });
  const anteile: Einheitspreisanteile = {
    lohn: '4.000' as Einheitspreis,
    stoffe: '2.000' as Einheitspreis,
    geraete: null,
    nachunternehmer: null,
    sonstiges: null,
    frei: null,
    freiBezeichnung: null,
  };
  const a = angebot(
    'a-k',
    z,
    'b1',
    [
      {
        positionId: 'p1' as PositionId,
        status: 'angeboten',
        einheitspreis: '6.000' as Einheitspreis,
        epa: anteile,
      },
    ],
    prozent('2.00'),
  );

  it('übernimmt Kopfdaten des LV, Nachlass des Angebots und den Bieter als Auftragnehmer', () => {
    const { befehl } = erwarteOk(zuschlagErteilen(z, a, projekt(['b1']), OHNE_WAHL, NEUE_ID));
    const { knoten, ...kopf } = befehl.auftragsLeistungsverzeichnis;
    expect(kopf).toEqual({
      ...inhaltKopf,
      id: NEUE_ID,
      projektId: PROJEKT_ID,
      leistungsverzeichnisId: 'lv-k',
      angebotId: 'a-k',
      nachlass: prozent('2.00'),
      auftragnehmer: { name: 'Bieter b1', strasse: null, plz: null, ort: null },
    });
    // Der Titel hängt an der neuen Wurzel; die Position trägt EP und Anteile des Bieters.
    expect(knoten.map((k) => [k.id, k.elternId])).toEqual([
      ['t1', NEUE_ID],
      ['p1', 't1'],
    ]);
    expect(knoten[1]).toMatchObject({ einheitspreis: '6.000', epa: anteile });
    // 2 × 6,000 = 12,00; 2 % Nachlass 0,24; 11,76; MwSt 7 % 0,82; Brutto 12,58.
    expect(imKern(befehl).summen.gesamt).toMatchObject({ nettoNachNachlass: '11.76', brutto: '12.58' });
  });

  // v1.4: D-42
  it('trägt das Kennzeichen „Muster-LV“ nicht in den Kopf des Auftrags-LV (Vertrag v1.4: nur am LvKopf)', () => {
    const vorlage: LvZustand = { ...z, leistungsverzeichnis: { ...z.leistungsverzeichnis, vorlage: true } };
    const { befehl } = erwarteOk(zuschlagErteilen(vorlage, a, projekt(['b1']), OHNE_WAHL, NEUE_ID));
    expect(befehl.auftragsLeistungsverzeichnis).not.toHaveProperty('vorlage');
    expect(befehl).toEqual(erwarteOk(zuschlagErteilen(z, a, projekt(['b1']), OHNE_WAHL, NEUE_ID)).befehl);
  });

  it('nimmt auch den Angebotszustand an', () => {
    const zustand = { angebot: a, summen: angebotSummenBerechnen(z, a) };
    expect(zuschlagErteilen(z, zustand, projekt(['b1']), OHNE_WAHL, NEUE_ID)).toEqual(
      zuschlagErteilen(z, a, projekt(['b1']), OHNE_WAHL, NEUE_ID),
    );
  });
});

// --- Ein LV mit Wahlgruppen in beiden Formen ------------------------------------------------------------------------

const wahl = (gruppe: number | null, variante: number | null, grundpositionId: string | null) => ({
  wahl: { gruppe, variante, grundpositionId: grundpositionId as PositionId | null },
});

// LV MwSt 19 %. Titel t1:
//   g1 10 m (Grundposition über Verweis), a1 und a2 Alternativen zu g1 (v1-Form, Gruppe/Variante `null`);
//   g2 5 m Variante 0 der Gruppe 1, b1 Variante 1 mit Verweis auf g2, b2 Variante 2 ohne Verweis (GAEB-Form);
//   n1 1 m normal; z1 Zuschlagsposition, Liste auf g1 und n1; c1 Bedarf ohne Gesamtbetrag.
// Titel t2: nur d1, Alternative zu n1.
const lvW = lv('lv-w', [
  titel('t1', 'lv-w', 0),
  position('g1', 't1', 0, '10.000', '10.000'),
  position('a1', 't1', 1, '10.000', '12.000', wahl(null, null, 'g1')),
  position('a2', 't1', 2, '10.000', '11.000', wahl(null, null, 'g1')),
  position('g2', 't1', 3, '5.000', '20.000', wahl(1, 0, null)),
  position('b1', 't1', 4, '5.000', '22.000', wahl(1, 1, 'g2')),
  position('b2', 't1', 5, '5.000', '21.000', wahl(1, 2, null)),
  position('n1', 't1', 6, '1.000', '100.000'),
  zuschlagsposition('z1', 't1', 7, liste('g1', 'n1'), '10.00'),
  position('c1', 't1', 8, '2.000', '50.000', { bedarf: 'ohne-gesamtbetrag' }),
  titel('t2', 'lv-w', 1),
  position('d1', 't2', 0, '1.000', '90.000', wahl(null, null, 'n1')),
]);
// Bieter w1: alle Preise; g1 10, a1 12, a2 11, g2 20, b1 22, b2 21, n1 100, z1 10 %, c1 50, d1 90.
const angebotW = angebot('a-w', lvW, 'w1', [
  ep('g1', '10.000'),
  ep('a1', '12.000'),
  ep('a2', '11.000'),
  ep('g2', '20.000'),
  ep('b1', '22.000'),
  ep('b2', '21.000'),
  ep('n1', '100.000'),
  satz('z1', '10.00'),
  ep('c1', '50.000'),
  ep('d1', '90.000'),
]);
const projektW = projekt(['w1']);
const gewaehlt = (...ids: string[]): ReadonlySet<PositionId> => new Set(ids as PositionId[]);

describe('zuschlagErteilen: Fehler', () => {
  it('weist ein Angebot zu einem anderen LV ab', () => {
    const fremd = { ...angebotW, leistungsverzeichnisId: 'lv-x' as LeistungsverzeichnisId };
    const e = zuschlagErteilen(lvW, fremd, projektW, OHNE_WAHL, NEUE_ID);
    expect(e).toMatchObject({
      ok: false,
      fehler: { code: 'ungueltige-eingabe', feld: 'angebot.leistungsverzeichnisId' },
    });
  });

  // v1.4: D-42
  it('weist ein Nachtrags-LV ab: ein Nachtrag kommt über NachtragUebernehmen ins Auftrags-LV', () => {
    const nachtrag: LvZustand = {
      ...lvW,
      leistungsverzeichnis: {
        ...lvW.leistungsverzeichnis,
        nachtrag: {
          auftragsLvId: 'auftrag-1' as AuftragsLeistungsverzeichnisId,
          nummer: 'N01',
          status: 'angeboten',
        },
      },
    };
    const e = zuschlagErteilen(nachtrag, angebotW, projektW, OHNE_WAHL, NEUE_ID);
    expect(e).toMatchObject({
      ok: false,
      fehler: { code: 'ungueltige-eingabe', feld: 'leistungsverzeichnis.nachtrag' },
    });
  });

  it('weist einen Bieter ab, den das Projekt nicht kennt', () => {
    const e = zuschlagErteilen(lvW, angebotW, projekt(['andere']), OHNE_WAHL, NEUE_ID);
    expect(e).toMatchObject({ ok: false, fehler: { code: 'ungueltige-eingabe', feld: 'angebot.bieterId' } });
  });

  it('weist eine gewählte Kennung ab, die keine Alternative des LV ist', () => {
    for (const id of ['g1', 'g2', 'n1', 't1', 'unbekannt']) {
      const e = zuschlagErteilen(lvW, angebotW, projektW, gewaehlt(id), NEUE_ID);
      expect(e, id).toMatchObject({
        ok: false,
        fehler: { code: 'ungueltige-eingabe', feld: 'gewaehlt', knotenId: id },
      });
    }
  });

  it('weist zwei gewählte Alternativen derselben Gruppe ab', () => {
    for (const paar of [
      ['a1', 'a2'],
      ['b1', 'b2'],
    ]) {
      const e = zuschlagErteilen(lvW, angebotW, projektW, gewaehlt(...paar), NEUE_ID);
      expect(e, paar.join('+')).toMatchObject({
        ok: false,
        fehler: { code: 'ungueltige-eingabe', feld: 'gewaehlt', knotenId: paar[1] },
      });
    }
  });
});

/** Kennung, Elternknoten, Reihenfolge und Wahl je Knoten des Befehls. */
function lage(befehl: AuftragsLeistungsverzeichnisAnlegen): [string, string, number, unknown][] {
  return befehl.auftragsLeistungsverzeichnis.knoten.map((k) => [
    k.id,
    k.elternId,
    k.reihenfolge,
    k.art === 'position' ? k.merkmale.wahl : undefined,
  ]);
}

function titelsummen(cs: AuftragsLvChangeSet): Record<string, string> {
  return Object.fromEntries(cs.summen.gliederungen.map((t) => [t.gliederungId, t.summe]));
}

describe('zuschlagErteilen: Wahl', () => {
  it('ohne Wahl: alle Alternativen entfallen, Grundpositionen bleiben, geleerte Titel bleiben', () => {
    const { befehl, warnungen } = erwarteOk(zuschlagErteilen(lvW, angebotW, projektW, OHNE_WAHL, NEUE_ID));
    expect(lage(befehl)).toEqual([
      ['t1', NEUE_ID, 0, undefined],
      ['g1', 't1', 0, null],
      ['g2', 't1', 1, { gruppe: 1, variante: 0, grundpositionId: null }],
      ['n1', 't1', 2, null],
      ['z1', 't1', 3, null],
      ['c1', 't1', 4, null],
      ['t2', NEUE_ID, 1, undefined],
    ]);
    expect(warnungen).toEqual([
      { code: 'positionen-entfallen', anzahl: 5, positionIds: ['a1', 'a2', 'b1', 'b2', 'd1'] },
    ]);
    // g1 100,00 + g2 100,00 + n1 100,00 + z1 10 % von 200,00 = 20,00 → Netto 320,00; c1 Bedarf 100,00 getrennt.
    const cs = imKern(befehl);
    expect(cs.summen.gesamt).toMatchObject({
      netto: '320.00',
      mwst: '60.80',
      brutto: '380.80',
      summeBedarfOhneGesamtbetrag: '100.00',
      summeWahl: '0.00',
    });
    expect(titelsummen(cs)).toEqual({ t1: '320.00', t2: '0.00' });
  });

  it('gewählte Alternativen werden normal, ihre Grundpositionen und die übrigen Alternativen entfallen', () => {
    const { befehl, warnungen } = erwarteOk(
      zuschlagErteilen(lvW, angebotW, projektW, gewaehlt('a2', 'b1'), NEUE_ID),
    );
    expect(lage(befehl)).toEqual([
      ['t1', NEUE_ID, 0, undefined],
      ['a2', 't1', 0, null],
      ['b1', 't1', 1, null],
      ['n1', 't1', 2, null],
      ['z1', 't1', 3, null],
      ['c1', 't1', 4, null],
      ['t2', NEUE_ID, 1, undefined],
    ]);
    // Der Listenbezug von z1 auf g1 wird entfernt, nicht umgelenkt.
    const z1 = befehl.auftragsLeistungsverzeichnis.knoten.find((k) => k.id === 'z1');
    expect(z1).toMatchObject({ zuschlag: { prozentsatz: '10.00', bezug: liste('n1') } });
    expect(warnungen).toEqual([
      { code: 'positionen-entfallen', anzahl: 5, positionIds: ['g1', 'a1', 'g2', 'b2', 'd1'] },
      { code: 'bezug-entfernt', positionId: 'z1', feld: 'zuschlag.bezug.positionen', zielId: 'g1' },
    ]);
    // a2 110,00 + b1 110,00 + n1 100,00 + z1 10 % von 100,00 = 10,00 → Netto 330,00.
    const cs = imKern(befehl);
    expect(cs.summen.gesamt).toMatchObject({ netto: '330.00', summeWahl: '0.00' });
    expect(titelsummen(cs)).toEqual({ t1: '330.00', t2: '0.00' });
  });

  it('eine gewählte Alternative in einem sonst leeren Titel', () => {
    // d1 ersetzt n1; z1 verliert den Bezug auf n1 und rechnet nur noch g1: 10 % von 100,00 = 10,00.
    const { befehl, warnungen } = erwarteOk(
      zuschlagErteilen(lvW, angebotW, projektW, gewaehlt('d1'), NEUE_ID),
    );
    expect(warnungen).toContainEqual({
      code: 'bezug-entfernt',
      positionId: 'z1',
      feld: 'zuschlag.bezug.positionen',
      zielId: 'n1',
    });
    const cs = imKern(befehl);
    // t1: g1 100,00 + g2 100,00 + z1 10,00 = 210,00; t2: d1 90,00.
    expect(titelsummen(cs)).toEqual({ t1: '210.00', t2: '90.00' });
    expect(cs.summen.gesamt?.netto).toBe('300.00');
  });
});

describe('zuschlagErteilen: Lücken des Bieters und Merkmale', () => {
  it('nicht angebotene Positionen (auch gewählte) und fehlende Sätze: Preis `null`, je eine Warnung', () => {
    // g1 nicht angeboten (entfällt, keine Warnung), a2 ohne Eintrag (gewählt), z1 angeboten ohne Satz.
    const a = angebot('a-l', lvW, 'w1', [
      nichtAngeboten('g1'),
      ep('a1', '12.000'),
      ep('g2', '20.000'),
      ep('b1', '22.000'),
      ep('b2', '21.000'),
      ep('n1', '100.000'),
      ep('z1', '5.000'),
      ep('c1', '50.000'),
      ep('d1', '90.000'),
    ]);
    const { befehl, warnungen } = erwarteOk(zuschlagErteilen(lvW, a, projektW, gewaehlt('a2'), NEUE_ID));
    expect(warnungen).toEqual([
      { code: 'positionen-entfallen', anzahl: 5, positionIds: ['g1', 'a1', 'b1', 'b2', 'd1'] },
      { code: 'nicht-angeboten', positionId: 'a2' },
      { code: 'zuschlagssatz-fehlt', positionId: 'z1' },
      { code: 'bezug-entfernt', positionId: 'z1', feld: 'zuschlag.bezug.positionen', zielId: 'g1' },
    ]);
    const nachId = new Map<string, Knoten>(befehl.auftragsLeistungsverzeichnis.knoten.map((k) => [k.id, k]));
    expect(nachId.get('a2')).toMatchObject({ einheitspreis: null, epa: null, merkmale: { wahl: null } });
    expect(nachId.get('z1')).toMatchObject({ zuschlag: { prozentsatz: null } });
    // Bedarf bleibt Bedarf.
    expect(nachId.get('c1')).toMatchObject({ merkmale: { bedarf: 'ohne-gesamtbetrag' } });
    // g2 100,00 + n1 100,00; a2 ohne GP, z1 ohne Satz ohne Betrag; c1 100,00 getrennt ausgewiesen.
    expect(imKern(befehl).summen.gesamt).toMatchObject({
      netto: '200.00',
      summeBedarfOhneGesamtbetrag: '100.00',
    });
  });

  it('eine gewählte Alternative bleibt Bedarf mit Gesamtbetrag und zählt ins Netto', () => {
    const z = lv('lv-b', [
      titel('t1', 'lv-b', 0),
      position('g1', 't1', 0, '1.000', '10.000'),
      position('a1', 't1', 1, '2.000', '30.000', {
        bedarf: 'mit-gesamtbetrag',
        ...wahl(null, null, 'g1'),
      }),
    ]);
    const a = angebot('a-b', z, 'w1', [ep('g1', '10.000'), ep('a1', '30.000')]);
    const { befehl } = erwarteOk(zuschlagErteilen(z, a, projektW, gewaehlt('a1'), NEUE_ID));
    expect(befehl.auftragsLeistungsverzeichnis.knoten[1]).toMatchObject({
      id: 'a1',
      merkmale: { bedarf: 'mit-gesamtbetrag', wahl: null },
    });
    expect(imKern(befehl).summen.gesamt?.netto).toBe('60.00');
  });

  it('eine gewählte Alternative ohne Grundposition (etwa nach einem X83-Rundweg) ersetzt nichts, mit Warnung', () => {
    const z = lv('lv-o', [
      titel('t1', 'lv-o', 0),
      position('n0', 't1', 0, '1.000', '10.000'),
      position('e1', 't1', 1, '1.000', '12.000', wahl(7, 1, null)),
    ]);
    const a = angebot('a-o', z, 'w1', [ep('n0', '10.000'), ep('e1', '12.000')]);
    const { befehl, warnungen } = erwarteOk(zuschlagErteilen(z, a, projektW, gewaehlt('e1'), NEUE_ID));
    expect(warnungen).toEqual([{ code: 'wahl-ohne-grundposition', positionId: 'e1' }]);
    expect(imKern(befehl).summen.gesamt?.netto).toBe('22.00');
  });
});

describe('zuschlagErteilen: Goldens aus den Fixtures', () => {
  const { fx: fxTypisch } = lvAusFixture('typisch');
  const wahlIds = fxTypisch.knoten.filter((k) => k.positionsart === 'wahl').map((k) => k.id);

  it('typisch-angebote: Warnungen nennen die entfallene Alternative und die Lücken des Bieters', () => {
    for (const fx of set.angebote) {
      const { warnungen } = erwarteOk(
        zuschlagErteilen(typisch, angebotAusFixture(fx, typisch), fxProjekt, OHNE_WAHL, NEUE_ID),
      );
      expect(warnungen, fx.id).toEqual([
        { code: 'positionen-entfallen', anzahl: wahlIds.length, positionIds: wahlIds },
        ...fx.sollwerte.nichtAngeboten.map((positionId) => ({ code: 'nicht-angeboten', positionId })),
      ]);
    }
  });

  it('typisch-angebote, Bieter A, 02.0070 A gewählt: ersetzt 02.0070', () => {
    const [fxA] = set.angebote;
    if (fxA === undefined) throw new Error('Fixture ohne Angebote.');
    const [alternative] = wahlIds;
    const grund = fxTypisch.knoten.find((k) => k.id === alternative)?.grundpositionId;
    const { befehl, warnungen } = erwarteOk(
      zuschlagErteilen(
        typisch,
        angebotAusFixture(fxA, typisch),
        fxProjekt,
        gewaehlt(alternative ?? ''),
        NEUE_ID,
      ),
    );
    expect(warnungen).toEqual([{ code: 'positionen-entfallen', anzahl: 1, positionIds: [grund] }]);
    // Sollwerte Bieter A: Netto 55.481,84, Titel 02 25.066,17; GP 02.0070 = 5.155,30, GP 02.0070 A = 5.774,21.
    // Netto 55.481,84 − 5.155,30 + 5.774,21 = 56.100,75; MwSt 19 % = 10.659,14; Brutto 66.759,89.
    // Titel 02: 25.066,17 − 5.155,30 + 5.774,21 = 25.685,08.
    expect(fxA.sollwerte.positionen[grund ?? '']?.gp).toBe('5155.30');
    expect(fxA.sollwerte.positionen[alternative ?? '']?.gp).toBe('5774.21');
    const cs = imKern(befehl);
    expect(cs.summen.gesamt).toMatchObject({
      netto: '56100.75',
      nettoNachNachlass: '56100.75',
      mwst: '10659.14',
      brutto: '66759.89',
      summeWahl: '0.00',
    });
    const titel02 = fxTypisch.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === '02')?.id ?? '';
    expect(titelsummen(cs)[titel02]).toBe('25685.08');
  });

  describe('zuschlag.json: ein Angebot mit den Preisen des LV', () => {
    const { fx, zustand } = lvAusFixture('zuschlag');
    const soll = (
      fx as typeof fx & {
        sollwerte: { summen: Record<string, string>; titel: Record<string, { summe: string }> };
      }
    ).sollwerte;
    const positionen = zustand.leistungsverzeichnis.knoten.filter((k) => k.art === 'position');
    const a = angebot(
      'a-z',
      zustand,
      'w1',
      positionen.map((p) =>
        p.zuschlag === null ? ep(p.id, p.einheitspreis ?? '') : satz(p.id, p.zuschlag.prozentsatz ?? ''),
      ),
    );

    it('alle drei Bezugsformen: Summen und Titelsummen wie die Sollwerte', () => {
      const { befehl, warnungen } = erwarteOk(zuschlagErteilen(zustand, a, projektW, OHNE_WAHL, NEUE_ID));
      expect(warnungen).toEqual([]);
      const cs = imKern(befehl);
      expect(cs.summen.gesamt).toMatchObject(soll.summen);
      expect(titelsummen(cs)).toEqual(
        Object.fromEntries(Object.entries(soll.titel).map(([id, t]) => [id, t.summe])),
      );
    });

    it('eine Liste verliert den Bezug auf eine entfallene Grundposition: Basis leer, Betrag 0,00', () => {
      // 02.0010 (100 m × 27,910 = 2.791,00) bekommt eine Alternative 02.0010 A (100 m × 25,000 = 2.500,00), gewählt.
      // 01.03.0040 nennt nur 02.0010: Bezug entfernt, Betrag 0,00 statt 279,10.
      // Netto 6.850,60 − 2.791,00 − 279,10 + 2.500,00 = 6.280,50; Titel 01 4.059,60 − 279,10 = 3.780,50; Titel 02 2.500,00.
      const grund = positionen.find((p) => p.ordnungszahl === '02.0010');
      const zu = positionen.find((p) => p.ordnungszahl === '01.03.0040');
      if (grund === undefined || zu === undefined) throw new Error('zuschlag.json hat sich geändert.');
      const alt = {
        ...position('alt', grund.elternId, 1, '100.000', '25.000', wahl(null, null, grund.id)),
        ordnungszahl: grund.ordnungszahl,
        ozIndex: 'A',
      };
      const mitAlt = lvZustandAusInhalt(fx.id, {
        ...zustand.leistungsverzeichnis,
        wurzelId: zustand.leistungsverzeichnis.id,
        knoten: [...zustand.leistungsverzeichnis.knoten, alt],
      });
      const aMitAlt = { ...a, positionen: [...a.positionen, ep('alt', '25.000')] };
      const { befehl, warnungen } = erwarteOk(
        zuschlagErteilen(mitAlt, aMitAlt, projektW, gewaehlt('alt'), NEUE_ID),
      );
      expect(warnungen).toEqual([
        { code: 'positionen-entfallen', anzahl: 1, positionIds: [grund.id] },
        { code: 'bezug-entfernt', positionId: zu.id, feld: 'zuschlag.bezug.positionen', zielId: grund.id },
      ]);
      const cs = imKern(befehl);
      expect(cs.summen.positionen.find((p) => p.positionId === zu.id)?.gesamtpreis).toBe('0.00');
      expect(cs.summen.gesamt?.netto).toBe('6280.50');
      const titel = titelsummen(cs);
      expect(titel[grund.elternId]).toBe('2500.00');
      const titel01 = fx.knoten.find((k) => k.art === 'titel' && k.ordnungszahl === '01')?.id ?? '';
      expect(titel[titel01]).toBe('3780.50');
    });
  });
});

describe('zuschlagErteilen: Bezüge und Zugehörigkeit', () => {
  it('entfernt Bezüge auf Positionen im Papierkorb des LV und auf entfallene Positionen an Grundpositionen', () => {
    // x1 liegt im Papierkorb; z1 nennt x1, die Grundposition g2 (Variante 0) verweist auf die Alternative a1.
    const z = lv('lv-p', [
      titel('t1', 'lv-p', 0),
      position('g1', 't1', 0, '1.000', '10.000'),
      position('a1', 't1', 1, '1.000', '11.000', wahl(null, null, 'g1')),
      position('g2', 't1', 2, '1.000', '20.000', wahl(3, 0, 'a1')),
      position('b1', 't1', 3, '1.000', '21.000', wahl(3, 1, 'g2')),
      zuschlagsposition('z1', 't1', 4, liste('g1', 'x1'), '10.00'),
      position('x1', 't1', 5, '1.000', '30.000'),
    ]);
    const l = z.leistungsverzeichnis;
    const x1 = l.knoten.find((k) => k.id === 'x1');
    if (x1 === undefined) throw new Error('x1 fehlt');
    const mitKorb: LvZustand = {
      ...z,
      leistungsverzeichnis: { ...l, knoten: l.knoten.filter((k) => k.id !== 'x1') },
      papierkorb: [{ id: 'korb-1' as PapierkorbeintragId, nummer: 1, knoten: [x1] }],
    };
    const a = angebot('a-p', z, 'w1', [
      ep('g1', '10.000'),
      ep('a1', '11.000'),
      ep('g2', '20.000'),
      ep('b1', '21.000'),
      satz('z1', '10.00'),
      ep('x1', '30.000'),
    ]);
    const { befehl, warnungen } = erwarteOk(zuschlagErteilen(mitKorb, a, projektW, OHNE_WAHL, NEUE_ID));
    expect(warnungen).toEqual([
      { code: 'positionen-entfallen', anzahl: 2, positionIds: ['a1', 'b1'] },
      { code: 'bezug-entfernt', positionId: 'g2', feld: 'merkmale.wahl.grundpositionId', zielId: 'a1' },
      { code: 'bezug-entfernt', positionId: 'z1', feld: 'zuschlag.bezug.positionen', zielId: 'x1' },
    ]);
    // g1 10,00 + g2 20,00 + z1 10 % von 10,00 = 1,00 → 31,00.
    expect(imKern(befehl).summen.gesamt?.netto).toBe('31.00');
  });

  it('weist ein Angebot oder ein Projekt eines anderen Projekts ab', () => {
    const fremdesAngebot = { ...angebotW, projektId: 'anderes' as ProjektId };
    expect(zuschlagErteilen(lvW, fremdesAngebot, projektW, OHNE_WAHL, NEUE_ID)).toMatchObject({
      ok: false,
      fehler: { code: 'ungueltige-eingabe', feld: 'angebot.projektId' },
    });
    expect(
      zuschlagErteilen(lvW, angebotW, projekt(['w1'], 'anderes' as ProjektId), OHNE_WAHL, NEUE_ID),
    ).toMatchObject({ ok: false, fehler: { code: 'ungueltige-eingabe', feld: 'projekt.id' } });
  });

  it('preisspiegel-Block von typisch-angebote: Bietersummen und Titel je OZ wie das Auftrags-LV', () => {
    const ozVon = new Map(
      typisch.leistungsverzeichnis.knoten.map((k) => [
        k.id as string,
        k.art === 'titel' ? k.ordnungszahl : null,
      ]),
    );
    for (const b of set.preisspiegel.bieter) {
      const fx = set.angebote.find((x) => x.id === b.angebotId);
      if (fx === undefined) throw new Error(`Angebot fehlt: ${b.angebotId}`);
      const { befehl } = erwarteOk(
        zuschlagErteilen(typisch, angebotAusFixture(fx, typisch), fxProjekt, OHNE_WAHL, NEUE_ID),
      );
      expect(befehl.auftragsLeistungsverzeichnis.auftragnehmer?.name).toBe(b.name);
      const cs = imKern(befehl);
      expect(cs.summen.gesamt, b.name).toMatchObject(b.summen);
      expect(
        Object.fromEntries(cs.summen.gliederungen.map((t) => [ozVon.get(t.gliederungId), t.summe])),
        b.name,
      ).toEqual(b.titel);
    }
  });
});

describe('zuschlagsvorschau', () => {
  it('nennt Wahlgruppen mit Varianten und zählt entfallende und unbepreiste Positionen', () => {
    // Angebot wie im Lückentest: a2 ohne Eintrag, z1 ohne Satz, g1 nicht angeboten.
    const a = angebot('a-v', lvW, 'w1', [
      nichtAngeboten('g1'),
      ep('a1', '12.000'),
      ep('g2', '20.000'),
      ep('b1', '22.000'),
      ep('b2', '21.000'),
      ep('n1', '100.000'),
      ep('z1', '5.000'),
      ep('c1', '50.000'),
      ep('d1', '90.000'),
    ]);
    const gruppen = [
      {
        gruppe: null,
        grundpositionen: ['g1'],
        alternativen: [
          { positionId: 'a1', variante: null },
          { positionId: 'a2', variante: null },
        ],
        gewaehlt: 'a2',
      },
      {
        gruppe: 1,
        grundpositionen: ['g2'],
        alternativen: [
          { positionId: 'b1', variante: 1 },
          { positionId: 'b2', variante: 2 },
        ],
        gewaehlt: null,
      },
      {
        gruppe: null,
        grundpositionen: ['n1'],
        alternativen: [{ positionId: 'd1', variante: null }],
        gewaehlt: null,
      },
    ];
    // Entfallen: g1, a1, b1, b2, d1. Unbepreist im Auftrags-LV: a2 (kein Eintrag), z1 (kein Satz).
    expect(zuschlagsvorschau(lvW, a, gewaehlt('a2'))).toEqual({
      entfallend: 5,
      unbepreist: 2,
      wahlgruppen: gruppen,
      fehler: null,
    });
    // Ohne Wahl: a1, a2, b1, b2, d1 entfallen; g1 ist jetzt unbepreist, a2 entfällt.
    expect(zuschlagsvorschau(lvW, a, OHNE_WAHL)).toMatchObject({
      entfallend: 5,
      unbepreist: 2,
      fehler: null,
    });
  });

  it('meldet eine ungültige Wahl, ohne Zahlen', () => {
    const v = zuschlagsvorschau(lvW, angebotW, gewaehlt('b1', 'b2'));
    expect(v).toMatchObject({
      entfallend: null,
      unbepreist: null,
      fehler: { code: 'ungueltige-eingabe', feld: 'gewaehlt', knotenId: 'b2' },
    });
    expect(v.wahlgruppen.map((g) => g.gewaehlt)).toEqual([null, 'b1', null]);
  });
});
