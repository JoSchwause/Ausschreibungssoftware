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
  lvZustandAusInhalt,
  position,
  projekt,
  prozent,
  PROJEKT_ID,
  titel,
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
      expect({
        netto: g.netto,
        nachlass: g.nachlass,
        nettoNachNachlass: g.nettoNachNachlass,
        mwst: g.mwst,
        brutto: g.brutto,
      }).toEqual(fx.sollwerte.summen);
      const titel = Object.fromEntries(cs.summen.gliederungen.map((t) => [t.gliederungId, { summe: t.summe }]));
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
  const a = angebot('a-k', z, 'b1', [{ ...ep('p1', '6.000'), epa: anteile }], prozent('2.00'));

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
