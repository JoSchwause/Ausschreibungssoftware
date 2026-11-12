// SPDX-License-Identifier: AGPL-3.0-or-later
// v1.6: mechanisch angepasst, Folgeticket 105 (vertrag v1.6, Ticket 97 Punkt 3). Bis Ticket 105 weist der Kern
// Bauteilzuordnungen ab (`befehl-nicht-zustaendig`), statt sie still zu verwerfen (Q5). Ticket 105 ersetzt diese Tests durch
// die des Handlers.

import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  Bauteilzuordnung,
  IfcGlobalId,
  LeistungsverzeichnisId,
} from '@tethys/vertrag';
import { auftragsLvBefehlAusfuehren, auftragsLvChangeSetAnwenden, lvBefehlAusfuehren } from './index';
import { LV_ID, PROJEKT_ID, erwarteOk, id, inhalt, neuesLv, positionsdaten } from './testhilfen';

const ZUORDNUNG: Bauteilzuordnung = {
  globalId: '1Wand$Aussen_EG_000001' as IfcGlobalId,
  mengenart: 'NetVolume',
};
const ende = { art: 'ende', elternId: id.eltern(LV_ID) } as const;

describe('vertrag v1.6 im Kern bis Ticket 105: Bauteilzuordnungen abweisen', () => {
  it('BauteileZuordnen im LV: befehl-nicht-zustaendig mit dem zuständigen Ticket', () => {
    const z = neuesLv();
    const mitPosition = erwarteOk(
      lvBefehlAusfuehren(z, {
        art: 'PositionAnlegen',
        id: id.pos('P1'),
        ort: ende,
        daten: positionsdaten('P1'),
      }),
    );
    expect(mitPosition.knoten.hinzugefuegt).toHaveLength(1);
    const e = lvBefehlAusfuehren(z, {
      art: 'BauteileZuordnen',
      positionId: id.pos('P1'),
      bauteile: [ZUORDNUNG],
    });
    expect(!e.ok && e.fehler.code).toBe('befehl-nicht-zustaendig');
    expect(!e.ok && e.fehler.meldung).toContain('Ticket 105');
  });

  it('PositionAnlegen mit Bauteilzuordnungen: befehl-nicht-zustaendig (nicht still verworfen)', () => {
    const e = lvBefehlAusfuehren(neuesLv(), {
      art: 'PositionAnlegen',
      id: id.pos('P1'),
      ort: ende,
      daten: positionsdaten('P1', { bauteile: [ZUORDNUNG] }),
    });
    expect(!e.ok && e.fehler.code).toBe('befehl-nicht-zustaendig');
    expect(!e.ok && e.fehler.feld).toBe('bauteile');
  });

  it('BauteileZuordnen am Auftrags-LV: befehl-nicht-zustaendig', () => {
    const aid = 'auftrags-lv-1' as AuftragsLeistungsverzeichnisId;
    const lvInhalt = inhalt();
    const anlegen = erwarteOk(
      auftragsLvBefehlAusfuehren(null, {
        art: 'AuftragsLeistungsverzeichnisAnlegen',
        auftragsLeistungsverzeichnis: {
          name: lvInhalt.name,
          ozMaske: lvInhalt.ozMaske,
          mwstSatz: lvInhalt.mwstSatz,
          nachlass: null,
          id: aid,
          projektId: PROJEKT_ID,
          leistungsverzeichnisId: 'lv-1' as LeistungsverzeichnisId,
          angebotId: 'angebot-1' as AngebotId,
          knoten: [],
        },
      }),
    );
    const z = auftragsLvChangeSetAnwenden(null, anlegen);
    if (z === null) throw new Error('Anlegen ohne Zustand');
    const e = auftragsLvBefehlAusfuehren(z, {
      art: 'BauteileZuordnen',
      positionId: id.pos('P1'),
      bauteile: null,
    });
    expect(!e.ok && e.fehler.code).toBe('befehl-nicht-zustaendig');
  });
});
