// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlag → Auftrags-LV (Ticket 59, D-21): `zuschlagErteilen` baut aus LV und Angebot den Befehl
// `AuftragsLeistungsverzeichnisAnlegen`. Der Kern muss ihn annehmen; die Summen rechnet der Kern, die Sollwerte kommen
// aus den Fixtures (`typisch-angebote.json`, `zuschlag.json`), nie aus der Ausgabe des Kerns.

import { auftragsLvBefehlAusfuehren } from '@tethys/kern';
import type {
  AuftragsLeistungsverzeichnisAnlegen,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvChangeSet,
  PositionId,
  Projekt,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { zuschlagErteilen } from './index';
import { angebotAusFixture, angebotsset, erwarteOk, lvAusFixture, PROJEKT_ID } from './testhilfen';

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
