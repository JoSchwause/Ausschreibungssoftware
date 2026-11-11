// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 71 (Vertrag v1.4): Befehle am Auftrags-LV, Anwenden und Umkehren seiner ChangeSets. Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  LeistungsverzeichnisId,
} from '@tethys/vertrag';
import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  auftragsLvChangeSetUmkehren,
  summenBerechnen,
} from './index';
import { PROJEKT_ID, erwarteOk, fixtureAlsInhalt, fixtureLesen } from './testhilfen';

const fx = fixtureLesen('typisch');
const AID = fx.id as AuftragsLeistungsverzeichnisId;

function auftragsLv(ueber: Partial<AuftragsLeistungsverzeichnis> = {}): AuftragsLeistungsverzeichnis {
  const inh = fixtureAlsInhalt(fx);
  return {
    name: inh.name,
    ozMaske: inh.ozMaske,
    mwstSatz: inh.mwstSatz,
    nachlass: inh.nachlass,
    id: AID,
    projektId: PROJEKT_ID,
    leistungsverzeichnisId: 'lv-ausschreibung' as LeistungsverzeichnisId,
    angebotId: 'angebot-1' as AngebotId,
    knoten: inh.knoten,
    ...ueber,
  };
}

function anlegeCs(a: AuftragsLeistungsverzeichnis = auftragsLv()): AuftragsLvChangeSet {
  return erwarteOk(
    auftragsLvBefehlAusfuehren(null, {
      art: 'AuftragsLeistungsverzeichnisAnlegen',
      auftragsLeistungsverzeichnis: a,
    }),
  );
}

/** Auftrags-LV als Zustand (über den Kern angelegt). */
function zustand(a: AuftragsLeistungsverzeichnis = auftragsLv()): AuftragsLvZustand {
  const z = auftragsLvChangeSetAnwenden(null, anlegeCs(a));
  if (z === null) throw new Error('kein Zustand');
  return z;
}

describe('auftragsLvChangeSetAnwenden und auftragsLvChangeSetUmkehren (Ticket 71, D-64.4)', () => {
  it('Anlegen anwenden ergibt das Auftrags-LV samt Summen = Neuberechnung; die Umkehrung entfernt es wieder', () => {
    const cs = anlegeCs();
    const z = zustand();
    expect(z.auftragsLeistungsverzeichnis.id).toBe(AID);
    expect(z.auftragsLeistungsverzeichnis.knoten).toHaveLength(fx.knoten.length);
    expect(z.summen).toEqual(summenBerechnen(z.auftragsLeistungsverzeichnis));
    const u = auftragsLvChangeSetUmkehren(cs);
    expect(u.art).toBe('auftrags-leistungsverzeichnis');
    expect(u.auftragsLeistungsverzeichnisId).toBe(AID);
    expect(u.kopf).toEqual({ vorher: cs.kopf?.nachher, nachher: null });
    expect(u.knoten.entfernt).toEqual(cs.knoten.hinzugefuegt);
    expect(auftragsLvChangeSetAnwenden(z, u)).toBeNull();
    // Die Umkehrung des Löschens legt es wieder an.
    expect(auftragsLvChangeSetAnwenden(null, auftragsLvChangeSetUmkehren(u))).toEqual(z);
  });

  it('ein ChangeSet ohne Kopf auf „kein Auftrags-LV“ ist ein Programmfehler', () => {
    const cs = anlegeCs();
    expect(() => auftragsLvChangeSetAnwenden(null, { ...cs, kopf: null })).toThrow();
  });
});

describe('AuftragsLeistungsverzeichnisAnlegen: nur Felder von AuftragsLvKopf im Kopf (D-42)', () => {
  it('nachtrag und vorlage eines LV (zur Laufzeit mitgebracht) landen nicht im Kopf des Auftrags-LV', () => {
    const mitLvKennzeichen = {
      ...auftragsLv(),
      nachtrag: { auftragsLvId: AID, nummer: 'N01', status: 'beauftragt' },
      vorlage: true,
      wurzelId: AID,
    } as AuftragsLeistungsverzeichnis;
    const kopf = anlegeCs(mitLvKennzeichen).kopf?.nachher;
    expect(Object.keys(kopf ?? {}).sort()).toEqual(
      [
        'angebotId',
        'id',
        'leistungsverzeichnisId',
        'mwstSatz',
        'nachlass',
        'name',
        'ozMaske',
        'projektId',
      ].sort(),
    );
  });

  it('die optionalen Felder des Kopfs (Auftraggeber, Vergabeinformationen, Auftragnehmer, EPA-Bezeichnungen) bleiben', () => {
    const a = auftragsLv({
      auftraggeber: { name: 'AG', strasse: null, plz: null, ort: null, vergabenummer: null },
      auftragnehmer: { name: 'AN', strasse: null, plz: null, ort: null },
      epaBezeichnungen: [{ nummer: 1, anteil: 'lohn', bezeichnung: 'Lohn' }],
    });
    const kopf = anlegeCs(a).kopf?.nachher;
    expect(kopf?.auftraggeber).toEqual(a.auftraggeber);
    expect(kopf?.auftragnehmer).toEqual(a.auftragnehmer);
    expect(kopf?.epaBezeichnungen).toEqual(a.epaBezeichnungen);
    expect(kopf).not.toHaveProperty('vergabeinformationen');
  });
});
