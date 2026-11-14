// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: die reine Logik der Nachträge in der App (Nummernvergabe, Befehlsfolgen, Vorschau der Beauftragung).

import {
  auftragsLvBefehlAusfuehren,
  auftragsLvChangeSetAnwenden,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
} from '@tethys/kern';
import type {
  AngebotId,
  AuftragsLeistungsverzeichnisId,
  BieterId,
  Gesamtsummen,
  LeistungsverzeichnisId,
  LvBefehl,
  LvUebersicht,
  LvZustand,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { abrechnungsFixture, m4AuftragsLv, m4Nachtrag } from '../../../../packages/abrechnung/src/testhilfen';
import { appIdQuelle } from '../lv/ids';
import { ozMaskeLesen } from '../lv/ozmaske';
import {
  nachtragAnlegenPlanen,
  nachtragBeauftragenPlanen,
  nachtragsfuehrung,
  naechsteNachtragsnummer,
} from './nachtrag';

const A = 'auftrag-a' as AuftragsLeistungsverzeichnisId;
const B = 'auftrag-b' as AuftragsLeistungsverzeichnisId;

function uebersicht(
  id: string,
  nachtrag?: { auftragsLvId: AuftragsLeistungsverzeichnisId; nummer: string },
): LvUebersicht {
  return {
    id: id as LeistungsverzeichnisId,
    name: id,
    ...(nachtrag === undefined ? {} : { nachtrag: { ...nachtrag, status: 'angemeldet' as const } }),
  };
}

describe('naechsteNachtragsnummer', () => {
  it('beginnt mit N01, wenn das Auftrags-LV noch keinen Nachtrag hat', () => {
    expect(naechsteNachtragsnummer([], A)).toBe('N01');
    expect(
      naechsteNachtragsnummer([uebersicht('lv'), uebersicht('n', { auftragsLvId: B, nummer: 'N01' })], A),
    ).toBe('N01');
  });

  it('nimmt die höchste Nummer des Auftrags-LV plus 1, zweistellig, ab 100 dreistellig', () => {
    const lvs = [
      uebersicht('n1', { auftragsLvId: A, nummer: 'N01' }),
      uebersicht('n3', { auftragsLvId: A, nummer: 'N03' }),
      uebersicht('fremd', { auftragsLvId: B, nummer: 'N07' }),
    ];
    expect(naechsteNachtragsnummer(lvs, A)).toBe('N04');
    expect(naechsteNachtragsnummer([uebersicht('n', { auftragsLvId: A, nummer: 'N09' })], A)).toBe('N10');
    expect(naechsteNachtragsnummer([uebersicht('n', { auftragsLvId: A, nummer: 'N99' })], A)).toBe('N100');
  });

  it('übergeht frei vergebene Nummern, die nicht die Form N<Ziffern> haben', () => {
    const lvs = [
      uebersicht('x', { auftragsLvId: A, nummer: 'NT-5' }),
      uebersicht('y', { auftragsLvId: A, nummer: ' n02 ' }),
    ];
    expect(naechsteNachtragsnummer(lvs, A)).toBe('N03');
  });
});

describe('nachtragAnlegenPlanen', () => {
  const maske = ozMaskeLesen('NN.NN.NNNN[I]');
  if (!maske.ok) throw new Error(maske.fehler);
  const auftrag = {
    id: A,
    projektId: 'projekt' as ProjektId,
    name: 'Rohbau',
    ozMaske: maske.wert,
    mwstSatz: '7.00' as Prozent,
  };

  // D-48: Die oberste Stufe belegt bei der Übernahme die Gliederung „Nachtrag <Nummer>“.
  const ohneOberste = ozMaskeLesen('NN.NNNN[I]');
  if (!ohneOberste.ok) throw new Error(ohneOberste.fehler);

  it('legt ein leeres LV mit der Maske des Auftrags-LV ohne oberste Stufe und dessen MwSt an, Nachtragsangaben angemeldet', () => {
    const lvs = [uebersicht('n1', { auftragsLvId: A, nummer: 'N01' })];
    const plan = nachtragAnlegenPlanen(auftrag, lvs, '  Kernbohrungen ', appIdQuelle());
    expect(plan.nummer).toBe('N02');
    const [anlegen, setzen] = plan.befehle;
    expect(anlegen.inhalt.ozMaske).toEqual(ohneOberste.wert);
    expect(anlegen).toMatchObject({
      art: 'LeistungsverzeichnisAnlegen',
      projektId: 'projekt',
      inhalt: {
        name: 'Nachtrag N02 – Kernbohrungen',
        mwstSatz: '7.00',
        nachlass: null,
        knoten: [],
      },
    });
    expect(anlegen.inhalt.wurzelId).toBe(plan.lvId);
    expect(setzen).toEqual({
      art: 'NachtragsangabenSetzen',
      nachtrag: { auftragsLvId: A, nummer: 'N02', status: 'angemeldet' },
    });
  });

  it('hat die Maske keine Gliederungsstufe, bleibt sie gleich (D-48)', () => {
    const flach = ozMaskeLesen('NNNN');
    if (!flach.ok) throw new Error(flach.fehler);
    const plan = nachtragAnlegenPlanen({ ...auftrag, ozMaske: flach.wert }, [], '', appIdQuelle());
    expect(plan.befehle[0].inhalt.ozMaske).toEqual(flach.wert);
  });

  it('ohne Bezeichnung heißt das LV nur „Nachtrag N01“', () => {
    const plan = nachtragAnlegenPlanen(auftrag, [], '   ', appIdQuelle());
    expect(plan.befehle[0]).toMatchObject({ inhalt: { name: 'Nachtrag N01' } });
  });

  it('der Kern nimmt die Befehlsfolge an: danach ist das LV ein Nachtrags-LV', () => {
    const plan = nachtragAnlegenPlanen(auftrag, [], 'Mehrleistung', appIdQuelle());
    let z: LvZustand | null = null;
    for (const b of plan.befehle as readonly LvBefehl[]) {
      const r = lvBefehlAusfuehren(z, b);
      if (!r.ok) throw new Error(r.fehler.meldung);
      z = lvChangeSetAnwenden(z, r.wert);
    }
    expect(z?.leistungsverzeichnis.id).toBe(plan.lvId);
    expect(z?.leistungsverzeichnis.nachtrag).toEqual({
      auftragsLvId: A,
      nummer: 'N01',
      status: 'angemeldet',
    });
    expect(z?.summen.gesamt.netto).toBe('0.00');
  });
});

// Tor M4 (Ticket 85): Auftrags-LV `typisch` mit Bieter B, Nachtrag N01 mit zwei Positionen und dem Nachtragsangebot des
// Auftragnehmers. Erwartete Summen aus der Fixture `typisch-abrechnung.json`, nicht aus dem Kern.
describe('nachtragBeauftragenPlanen', () => {
  const fx = abrechnungsFixture() as unknown as {
    zuschlag: { angebotId: AngebotId; bieterId: BieterId; sollwerte: { summen: Gesamtsummen } };
    nachtrag: { sollwerte: { summen: Gesamtsummen }; angebot: { sollwerte: { summen: Gesamtsummen } } };
  };
  const auftragsangebot = { id: fx.zuschlag.angebotId, bieterId: fx.zuschlag.bieterId };

  it('nimmt das Angebot des Auftragnehmers, zeigt Zahl der Positionen, Summe des Angebots und die neue Auftragssumme', () => {
    const auftrag = m4AuftragsLv();
    const { lv, angebot } = m4Nachtrag();
    const fremd = { ...angebot, id: 'fremd' as AngebotId, bieterId: 'anderer' as BieterId };
    const plan = nachtragBeauftragenPlanen({
      auftrag,
      auftragsangebot,
      nachtragsLv: lv,
      angebote: [fremd, angebot],
      ids: appIdQuelle(),
    });
    expect(plan.fehler).toBeNull();
    expect(plan.angebotId).toBe(angebot.id);
    expect(plan.befehl?.nachtragLvId).toBe(lv.leistungsverzeichnis.id);
    expect(plan.positionen).toBe(2);
    expect(plan.angebotsnetto).toBe(fx.nachtrag.angebot.sollwerte.summen.netto);
    expect(plan.auftrag?.vorher.nettoNachNachlass).toBe(fx.zuschlag.sollwerte.summen.nettoNachNachlass);
    expect(plan.auftrag?.nachher).toMatchObject(fx.nachtrag.sollwerte.summen);
    expect(plan.warnungen).toEqual([]);
  });

  it('ohne Angebot des Auftragnehmers gibt es keinen Befehl, sondern den Grund', () => {
    const { lv, angebot } = m4Nachtrag();
    const fremd = { ...angebot, bieterId: 'anderer' as BieterId };
    const plan = nachtragBeauftragenPlanen({
      auftrag: m4AuftragsLv(),
      auftragsangebot,
      nachtragsLv: lv,
      angebote: [fremd],
      ids: appIdQuelle(),
    });
    expect(plan.befehl).toBeNull();
    expect(plan.fehler).toMatch(/kein Angebot des Auftragnehmers/);
  });

  it('ein zweites Beauftragen desselben Nachtrags weist die Übernahme ab (Kennungen schon im Auftrags-LV)', () => {
    const { lv, angebot } = m4Nachtrag();
    const eingang = { auftragsangebot, nachtragsLv: lv, angebote: [angebot], ids: appIdQuelle() };
    const erst = nachtragBeauftragenPlanen({ ...eingang, auftrag: m4AuftragsLv() });
    if (erst.befehl === null) throw new Error(erst.fehler ?? 'kein Befehl');
    const cs = auftragsLvBefehlAusfuehren(m4AuftragsLv(), erst.befehl);
    if (!cs.ok) throw new Error(cs.fehler.meldung);
    const danach = auftragsLvChangeSetAnwenden(m4AuftragsLv(), cs.wert);
    if (danach === null) throw new Error('Auftrags-LV fehlt');
    const zweit = nachtragBeauftragenPlanen({ ...eingang, auftrag: danach });
    expect(zweit.befehl).toBeNull();
    expect(zweit.fehler).toMatch(/schon übernommen/);
  });
});

describe('nachtragsfuehrung (Ticket 151: geführter Nachtrag)', () => {
  const erledigt = (f: ReturnType<typeof nachtragsfuehrung>) =>
    f.schritte.filter((s) => s.erledigt).map((s) => s.schritt);

  it('ohne Positionen ist „Leistungen erfassen“ dran, nichts erledigt', () => {
    const f = nachtragsfuehrung({ status: 'angemeldet', positionen: 0, angebotDesAuftragnehmers: false });
    expect(f.schritte.map((s) => s.schritt)).toEqual(['erfassen', 'angebot', 'status', 'beauftragen']);
    expect(f.aktuell).toBe('erfassen');
    expect(erledigt(f)).toEqual([]);
  });

  it('mit Positionen und ohne Angebot ist das Angebot des Auftragnehmers dran', () => {
    const f = nachtragsfuehrung({ status: 'angemeldet', positionen: 2, angebotDesAuftragnehmers: false });
    expect(f.aktuell).toBe('angebot');
    expect(erledigt(f)).toEqual(['erfassen']);
  });

  it('nach dem Einlesen des Angebots schlägt die App den Status „angeboten“ vor', () => {
    const f = nachtragsfuehrung({ status: 'angemeldet', positionen: 2, angebotDesAuftragnehmers: true });
    expect(f.aktuell).toBe('status');
    expect(erledigt(f)).toEqual(['erfassen', 'angebot']);
  });

  it('mit Status „angeboten“ und Angebot ist „Beauftragen“ der nächste Schritt', () => {
    const f = nachtragsfuehrung({ status: 'angeboten', positionen: 2, angebotDesAuftragnehmers: true });
    expect(f.aktuell).toBe('beauftragen');
    expect(erledigt(f)).toEqual(['erfassen', 'angebot', 'status']);
  });

  it('„angeboten“ ohne Angebot des Auftragnehmers: erst das Angebot', () => {
    const f = nachtragsfuehrung({ status: 'angeboten', positionen: 2, angebotDesAuftragnehmers: false });
    expect(f.aktuell).toBe('angebot');
    expect(erledigt(f)).toEqual(['erfassen', 'status']);
  });

  it('beauftragt: alles erledigt, kein Schritt mehr offen', () => {
    const f = nachtragsfuehrung({ status: 'beauftragt', positionen: 2, angebotDesAuftragnehmers: true });
    expect(f.aktuell).toBeNull();
    expect(erledigt(f)).toEqual(['erfassen', 'angebot', 'status', 'beauftragen']);
  });

  it('abgelehnt: kein Schritt offen', () => {
    const f = nachtragsfuehrung({ status: 'abgelehnt', positionen: 2, angebotDesAuftragnehmers: true });
    expect(f.aktuell).toBeNull();
    expect(erledigt(f)).toEqual(['erfassen', 'angebot']);
  });
});
