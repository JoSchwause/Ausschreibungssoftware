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
  LeistungsverzeichnisId,
  PositionId,
  Projekt,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { angebotSummenBerechnen, zuschlagErteilen } from './index';
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
