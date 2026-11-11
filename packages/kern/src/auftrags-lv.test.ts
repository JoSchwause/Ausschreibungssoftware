// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 30, Punkt 12: Auftrags-LV anlegen (ADR 0011). Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnis,
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  LeistungsverzeichnisId,
} from '@tethys/vertrag';
import { auftragsLvBefehlAusfuehren } from './index';
import {
  PROJEKT_ID,
  erwarteOk,
  fixtureAlsInhalt,
  fixtureLesen,
  posKnoten,
  sollwerteLesen,
} from './testhilfen';

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

const anlegen = (a: AuftragsLeistungsverzeichnis, z: AuftragsLvZustand | null = null) =>
  auftragsLvBefehlAusfuehren(z, {
    art: 'AuftragsLeistungsverzeichnisAnlegen',
    auftragsLeistungsverzeichnis: a,
  });

describe('AuftragsLeistungsverzeichnisAnlegen', () => {
  it('mit den Knoten von typisch: vollständige Summen gleich den Sollwerten der Fixture', () => {
    const soll = sollwerteLesen('typisch');
    const cs = erwarteOk(anlegen(auftragsLv()));
    expect(cs.art).toBe('auftrags-leistungsverzeichnis');
    expect(cs.auftragsLeistungsverzeichnisId).toBe(AID);
    expect(cs.kopf?.vorher).toBeNull();
    expect(cs.kopf?.nachher).toMatchObject({ id: AID, angebotId: 'angebot-1', projektId: PROJEKT_ID });
    expect(cs.kopf?.nachher).not.toHaveProperty('knoten');
    expect(cs.knoten.hinzugefuegt).toHaveLength(fx.knoten.length);
    expect(cs.summen.gesamt).toMatchObject(soll.summen);
    expect(cs.summen.positionen).toHaveLength(Object.keys(soll.positionen).length);
    for (const p of cs.summen.positionen)
      expect(p.gesamtpreis, p.positionId).toBe(soll.positionen[p.positionId]?.gp);
    for (const g of cs.summen.gliederungen) expect(g.summe).toBe(soll.titel[g.gliederungId]?.summe);
    expect(cs.summen.vorher).toEqual({
      positionen: [],
      gliederungen: [],
      gesamt: null,
      entfernt: { positionen: [], gliederungen: [] },
    });
  });

  it('Baumregeln wie beim LV: die Wurzel ist die Kennung des Auftrags-LV', () => {
    const e = anlegen(auftragsLv({ knoten: [posKnoten('P1', 'lv-ausschreibung', 0, null, null)] }));
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler.code).toBe('eltern-unbekannt');
  });

  it("'' als Einheit wird null; Form der Stammdaten geprüft", () => {
    const cs = erwarteOk(
      anlegen(auftragsLv({ knoten: [posKnoten('P1', AID, 0, null, null, { einheit: '' })] })),
    );
    const [p] = cs.knoten.hinzugefuegt;
    expect(p?.art === 'position' && p.einheit).toBeNull();
    const e = anlegen(auftragsLv({ mwstSatz: '19' as never }));
    expect(!e.ok && e.fehler.code).toBe('ungueltige-eingabe');
  });

  it('mit Zustand: befehl-nicht-zustaendig', () => {
    const cs = erwarteOk(anlegen(auftragsLv({ knoten: [] })));
    const kopf = cs.kopf?.nachher;
    if (!kopf) throw new Error('kein Kopf');
    const z: AuftragsLvZustand = {
      auftragsLeistungsverzeichnis: { ...kopf, knoten: [] },
      summen: { positionen: [], gliederungen: [], gesamt: cs.summen.gesamt ?? fehlt() },
    };
    const e = anlegen(auftragsLv(), z);
    expect(!e.ok && e.fehler.code).toBe('befehl-nicht-zustaendig');
  });
});

// v1.4: mechanisch angepasst, Folgeticket (Ticket 71 ersetzt diese Abweisung durch die Handler)
describe('Vertrag v1.4: neue Befehle am Auftrags-LV bis Ticket 71', () => {
  it('NachtragUebernehmen wird mit befehl-nicht-zustaendig abgewiesen', () => {
    const e = auftragsLvBefehlAusfuehren(null, {
      art: 'NachtragUebernehmen',
      nachtragLvId: 'lv-nachtrag' as LeistungsverzeichnisId,
      knoten: [],
    });
    expect(!e.ok && e.fehler.code).toBe('befehl-nicht-zustaendig');
    expect(!e.ok && e.fehler.meldung).toContain('Ticket 71');
  });
});

function fehlt(): never {
  throw new Error('fehlt');
}
