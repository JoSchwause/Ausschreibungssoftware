// SPDX-License-Identifier: AGPL-3.0-or-later
// Vertrag v1.4 in `speicher` (Ticket 79): Nachtragsangaben und Kennzeichen „Muster-LV“ am LV-Kopf, Kostengruppe und
// Textquelle an der Position (im LV und im Auftrags-LV). Was der Kern liefert, kommt verlustfrei zurück (Q5): Speichern →
// Laden, Undo, Papierkorb, LV-Stand, LV-Übersicht (D-43). Verweise auf ein Auftrags-LV prüft `speicher` (`konflikt`).

import type {
  AuftragsLvChangeSet,
  AuftragsLvZustand,
  ChangeSet,
  ElternId,
  Knoten,
  Kostengruppennummer,
  LeistungsverzeichnisId,
  LvZustand,
  Nachtragsangaben,
  Position,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { direktTransport, speicherUeberTransport } from './client';
import type { SpeicherKern } from './kern';
import {
  anlegenSchritte,
  auftragsLvAnlegenChangeSet,
  auftragsLvAus,
  eintrag,
  ladeFixture,
  lvAnlegenChangeSet,
} from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { ausBaumNehmen, feldAendern, kopfAendern, standAnlegen, umkehren } from './testhilfe/umkehrung';

const f = ladeFixture('typisch');
const lv = f.lv.leistungsverzeichnis;
const P = f.projekt.id;
const angebot = f.angebote[0]?.angebot.id;
if (angebot === undefined) throw new Error('typisch hat Angebote');

const positionen = (k: readonly Knoten[]): Position[] => k.filter((x): x is Position => x.art === 'position');
const erste = positionen(lv.knoten)[0] as Position;
const KG = '330' as Kostengruppennummer;

/** Das Auftrags-LV aus dem LV und dem ersten Angebot des Fixtures. */
const auftrag: AuftragsLvZustand = auftragsLvAus(f.lv, angebot);
const AUFTRAG = auftrag.auftragsLeistungsverzeichnis.id;

/** Ein zweites LV im selben Projekt (das LV aus `winzig` unter neuer Kennung): das Nachtrags-LV. */
function nachtragsLv(): LvZustand {
  const w = ladeFixture('winzig').lv;
  const id = 'nachtrags-lv' as LeistungsverzeichnisId;
  const alt = w.leistungsverzeichnis.id as string;
  return {
    ...w,
    leistungsverzeichnis: {
      ...w.leistungsverzeichnis,
      id,
      projektId: P,
      name: 'Nachtrag N01 (erfunden)',
      knoten: w.leistungsverzeichnis.knoten.map((k) =>
        k.elternId === alt ? { ...k, elternId: id as unknown as ElternId } : k,
      ),
    },
  };
}
const NACHTRAG: Nachtragsangaben = { auftragsLvId: AUFTRAG, nummer: 'N01', status: 'angeboten' };

let nr = 100;
async function versuche(kern: SpeicherKern, cs: ChangeSet) {
  nr += 1;
  const aggregat =
    cs.art === 'auftrags-leistungsverzeichnis'
      ? ({ art: cs.art, id: cs.auftragsLeistungsverzeichnisId } as const)
      : cs.art === 'leistungsverzeichnis'
        ? ({ art: cs.art, id: cs.leistungsverzeichnisId } as const)
        : ({ art: 'projekt', id: P } as const);
  return kern.anwenden(eintrag(nr, P, aggregat, { art: 'LeistungsverzeichnisUmbenennen', name: 'x' }), cs);
}
async function schreibe(kern: SpeicherKern, cs: ChangeSet): Promise<void> {
  wert(await versuche(kern, cs));
}

/** Projekt, LV, Angebote und das Auftrags-LV des Fixtures. */
async function mitAuftrag(): Promise<SpeicherKern> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte(f));
  await schreibe(kern, auftragsLvAnlegenChangeSet(auftrag));
  return kern;
}

describe('Vertrag v1.4: Felder am LV-Kopf', () => {
  it('Nachtragsangaben setzen, ändern und per Undo entfernen; die LV-Übersicht folgt dem Kopf (D-43)', async () => {
    const kern = await mitAuftrag();
    const n = nachtragsLv();
    await schreibe(kern, lvAnlegenChangeSet(n));
    const setzen = kopfAendern(n, { nachtrag: NACHTRAG }, n.summen.gesamt.netto);
    await schreibe(kern, setzen);
    const gesetzt = wert(kern.lvLaden(n.leistungsverzeichnis.id));
    expect(gesetzt.leistungsverzeichnis.nachtrag).toEqual(NACHTRAG);
    const uebersicht = () => wert(kern.lvAuflisten(P)).find((u) => u.id === n.leistungsverzeichnis.id);
    expect(uebersicht()).toEqual({
      id: n.leistungsverzeichnis.id,
      name: n.leistungsverzeichnis.name,
      nachtrag: NACHTRAG,
    });

    const beauftragt = kopfAendern(gesetzt, { nachtrag: { ...NACHTRAG, status: 'beauftragt' } }, '1.00');
    await schreibe(kern, beauftragt);
    expect(uebersicht()?.nachtrag?.status).toBe('beauftragt');
    await schreibe(kern, umkehren(beauftragt));
    await schreibe(kern, umkehren(setzen));
    expect(wert(kern.lvLaden(n.leistungsverzeichnis.id))).toEqual(n);
    expect(uebersicht()).toEqual({ id: n.leistungsverzeichnis.id, name: n.leistungsverzeichnis.name });
  });

  it('Muster-LV: vorlage setzen und per Undo entfernen; die LV-Übersicht trägt vorlage: true oder nichts (D-43)', async () => {
    const kern = await mitAuftrag();
    const setzen = kopfAendern(f.lv, { vorlage: true }, f.lv.summen.gesamt.netto);
    await schreibe(kern, setzen);
    expect(wert(kern.lvLaden(lv.id)).leistungsverzeichnis.vorlage).toBe(true);
    expect(wert(kern.lvAuflisten(P))).toEqual([{ id: lv.id, name: lv.name, vorlage: true }]);
    await schreibe(kern, umkehren(setzen));
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);
    expect(wert(kern.lvAuflisten(P))).toEqual([{ id: lv.id, name: lv.name }]);
  });

  it('ein LV mit Nachtragsangaben und Vorlage anlegen und über die Speicher-Schnittstelle laden', async () => {
    const kern = await mitAuftrag();
    const n = nachtragsLv();
    const mit: LvZustand = {
      ...n,
      leistungsverzeichnis: { ...n.leistungsverzeichnis, nachtrag: NACHTRAG, vorlage: true },
    };
    await schreibe(kern, lvAnlegenChangeSet(mit));
    const s = speicherUeberTransport(direktTransport(kern), null);
    expect(wert(await s.leistungsverzeichnisse.laden(n.leistungsverzeichnis.id))).toEqual(mit);
  });

  it('Nachtragsangaben auf ein Auftrags-LV, das es im Projekt nicht gibt: konflikt, nichts geschrieben', async () => {
    const kern = await mitAuftrag();
    const n = nachtragsLv();
    const fremd = { ...NACHTRAG, auftragsLvId: 'auftrags-lv-x' as never };
    const anlegen = lvAnlegenChangeSet({
      ...n,
      leistungsverzeichnis: { ...n.leistungsverzeichnis, nachtrag: fremd },
    });
    const r = await versuche(kern, anlegen);
    expect(!r.ok && r.fehler.code).toBe('konflikt');
    expect(kern.lvLaden(n.leistungsverzeichnis.id)).toMatchObject({ ok: false });
    const r2 = await versuche(kern, kopfAendern(f.lv, { nachtrag: fremd }, '1.00'));
    expect(!r2.ok && r2.fehler.code).toBe('konflikt');
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);
  });

  it('vorlage: false ist keine Schreibweise des Vertrags (nur true oder fehlt): unbekannt statt still verworfen', async () => {
    const kern = await mitAuftrag();
    const r = await versuche(kern, kopfAendern(f.lv, { vorlage: false as never }, '1.00'));
    expect(!r.ok && r.fehler.code).toBe('unbekannt');
  });

  it('am Kopf des Auftrags-LV gibt es weder nachtrag noch vorlage: unbekannt statt still verworfen (D-42)', async () => {
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(f));
    for (const feld of [{ vorlage: true }, { nachtrag: NACHTRAG }]) {
      const cs = auftragsLvAnlegenChangeSet({
        ...auftrag,
        auftragsLeistungsverzeichnis: { ...auftrag.auftragsLeistungsverzeichnis, ...(feld as object) },
      });
      const r = await versuche(kern, cs);
      expect(!r.ok && r.fehler.code).toBe('unbekannt');
    }
  });
});

describe('Vertrag v1.4: Kostengruppe und Textquelle an der Position', () => {
  it('im LV setzen und per Undo entfernen; im Papierkorb und im LV-Stand bleiben sie erhalten', async () => {
    const kern = await mitAuftrag();
    const mit = { ...erste, kostengruppe: KG, textquelle: 'Muster-LV Rohbau (erfunden)' };
    const setzen = feldAendern(f.lv, erste.id, mit, '9.99');
    await schreibe(kern, setzen);
    const gesetzt = wert(kern.lvLaden(lv.id));
    expect(positionen(gesetzt.leistungsverzeichnis.knoten)[0]).toEqual(mit);
    await schreibe(kern, umkehren(setzen));
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);

    await schreibe(kern, setzen);
    await schreibe(kern, standAnlegen(gesetzt, 'stand-v14', 'Mit Kostengruppe'));
    const korb = ausBaumNehmen(gesetzt, [erste.id], { id: 'eintrag-v14', nummer: 1 });
    await schreibe(kern, korb);
    const imKorb = wert(kern.lvLaden(lv.id)).papierkorb?.[0]?.knoten[0];
    expect(imKorb).toEqual(mit);
    const stand = wert(kern.lvStandLaden('stand-v14' as never)).zustand;
    expect(positionen(stand.leistungsverzeichnis.knoten)[0]).toEqual(mit);
    await schreibe(kern, umkehren(korb));
    expect(wert(kern.lvLaden(lv.id))).toEqual(gesetzt);
  });

  it('im Auftrags-LV setzen (KostengruppeSetzen) und per Undo entfernen; geladen über auftragsLeistungsverzeichnisse', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const vorher = positionen(auftrag.auftragsLeistungsverzeichnis.knoten)[0] as Position;
    const cs: AuftragsLvChangeSet = {
      art: 'auftrags-leistungsverzeichnis',
      auftragsLeistungsverzeichnisId: AUFTRAG,
      kopf: null,
      knoten: {
        hinzugefuegt: [],
        geaendert: [{ vorher, nachher: { ...vorher, kostengruppe: KG } }],
        entfernt: [],
      },
      summen: {
        positionen: [],
        gliederungen: [],
        gesamt: null,
        vorher: {
          positionen: [],
          gliederungen: [],
          gesamt: null,
          entfernt: { positionen: [], gliederungen: [] },
        },
      },
    };
    await schreibe(kern, cs);
    const geladen = wert(await s.auftragsLeistungsverzeichnisse.laden(AUFTRAG));
    expect(positionen(geladen.auftragsLeistungsverzeichnis.knoten)[0]?.kostengruppe).toBe(KG);
    await schreibe(kern, umkehren(cs));
    expect(wert(await s.auftragsLeistungsverzeichnisse.laden(AUFTRAG))).toEqual(auftrag);
  });
});

describe('AuftragsLvRepository (v1.4, D-64.2)', () => {
  it('auflisten: ohne Knoten, nach Name deutsch verglichen, gleiche Namen nach Kennung; unbekannt: nicht-gefunden', async () => {
    const kern = await mitAuftrag();
    const s = speicherUeberTransport(direktTransport(kern), null);
    const zwei = (id: string, name: string, angebotIndex: number): AuftragsLvZustand => {
      const a = auftragsLvAus(f.lv, f.angebote[angebotIndex]?.angebot.id ?? angebot, id);
      return { ...a, auftragsLeistungsverzeichnis: { ...a.auftragsLeistungsverzeichnis, name } };
    };
    // „Ärger“ steht deutsch bei A (Bytes würden es hinter „Zuschlag“ stellen); zweimal „Zuschlag“: nach Kennung.
    await schreibe(kern, auftragsLvAnlegenChangeSet(zwei('auftrag-c', 'Ärger', 1)));
    await schreibe(kern, auftragsLvAnlegenChangeSet(zwei('auftrag-b', 'Zuschlag', 2)));
    await schreibe(kern, auftragsLvAnlegenChangeSet(zwei('auftrag-a', 'Zuschlag', 2)));
    const liste = wert(await s.auftragsLeistungsverzeichnisse.auflisten(P));
    expect(liste.map((u) => [u.id, u.name])).toEqual([
      ['auftrag-c', 'Ärger'],
      [AUFTRAG, auftrag.auftragsLeistungsverzeichnis.name],
      ['auftrag-a', 'Zuschlag'],
      ['auftrag-b', 'Zuschlag'],
    ]);
    expect(liste[1]).toEqual({
      id: AUFTRAG,
      name: auftrag.auftragsLeistungsverzeichnis.name,
      leistungsverzeichnisId: lv.id,
      angebotId: angebot,
    });
    const nicht = await s.auftragsLeistungsverzeichnisse.auflisten('unbekannt' as never);
    expect(!nicht.ok && nicht.fehler.code).toBe('nicht-gefunden');
    const laden = await s.auftragsLeistungsverzeichnisse.laden('unbekannt' as never);
    expect(!laden.ok && laden.fehler.code).toBe('nicht-gefunden');
  });
});
