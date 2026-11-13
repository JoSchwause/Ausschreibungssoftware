// SPDX-License-Identifier: AGPL-3.0-or-later
// Vertrag v1.7a in `speicher` (Ticket 139, Schema 7): Projekt- und Bieterangaben, Preisspiegel-Einstellungen am LV-Kopf,
// Kalkulationsangaben an der Position. Was der Kern liefert, kommt verlustfrei zurück (Q5): Speichern → Laden, Undo,
// Papierkorb, LV-Stand. Die neuen Projektbefehle (Bieter umbenennen, Angaben setzen, löschen) gehen als ganzes Projekt über den
// bestehenden Weg; einen Bieter mit Angebot entfernt kein ChangeSet (`konflikt`, D-127.2), auch nicht als Undo.

import type {
  Bieter,
  BieterId,
  Bieterangaben,
  ChangeSet,
  Einheitspreis,
  Kalkulationsangaben,
  Knoten,
  Menge,
  Position,
  PreisspiegelEinstellungen,
  Projekt,
  Projektangaben,
  Prozent,
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
} from './testhilfe/fixtures';
import { neuerKern, speichere, wert } from './testhilfe/node';
import { ausBaumNehmen, feldAendern, kopfAendern, standAnlegen, umkehren } from './testhilfe/umkehrung';

const f = ladeFixture('typisch');
const lv = f.lv.leistungsverzeichnis;
const P = f.projekt.id;
const angebot = f.angebote[0]?.angebot;
if (angebot === undefined) throw new Error('typisch hat Angebote');

const positionen = (k: readonly Knoten[]): Position[] => k.filter((x): x is Position => x.art === 'position');
const erste = positionen(lv.knoten)[0] as Position;

export const PROJEKTANGABEN: Projektangaben = {
  nummer: 'P-2026-017',
  ort: 'Musterstadt',
  baustelle: { strasse: 'Am Bauplatz 3', plz: '12345', ort: 'Musterstadt' },
};
export const BIETERANGABEN: Bieterangaben = {
  anschrift: { strasse: 'Werkstraße 7', plz: '54321', ort: null },
  ansprechperson: 'Frau Beispiel (erfunden)',
  email: 'angebot@example.org',
  telefon: null,
};
export const PREISSPIEGEL: PreisspiegelEinstellungen = {
  ausreisserSchwelle: '15.00' as Prozent,
  abcSchwelleA: '70.00' as Prozent,
  abcSchwelleB: '90.00' as Prozent,
  abcBezug: 'schaetzpreis',
};
export const KALKULATION: Kalkulationsangaben = {
  ansaetze: [
    {
      art: 'lohn',
      bezeichnung: 'Facharbeiter',
      ansatzmenge: '0.450' as Menge,
      kostensatz: '48.500' as Einheitspreis,
    },
    { art: 'stoffe', bezeichnung: 'Mörtel', ansatzmenge: null, kostensatz: '3.200' as Einheitspreis },
  ],
  zuschlagssaetze: { lohn: '12.50' as Prozent, stoffe: '8.00' as Prozent },
};

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

async function mitFixture(): Promise<SpeicherKern> {
  const { kern } = await neuerKern();
  await speichere(kern, anlegenSchritte(f));
  return kern;
}

const projektAendern = (vorher: Projekt, nachher: Projekt): ChangeSet => ({
  art: 'projekt',
  projektId: P,
  projekt: { vorher, nachher },
});

describe('Vertrag v1.7a: Projekt- und Bieterangaben', () => {
  it('Projektangaben setzen, laden und per Undo entfernen (das Feld fehlt dann wieder)', async () => {
    const kern = await mitFixture();
    const setzen = projektAendern(f.projekt, {
      ...f.projekt,
      name: 'Neubau (erfunden)',
      angaben: PROJEKTANGABEN,
    });
    await schreibe(kern, setzen);
    const s = speicherUeberTransport(direktTransport(kern), null);
    expect(wert(await s.projekte.laden(P))).toEqual({
      ...f.projekt,
      name: 'Neubau (erfunden)',
      angaben: PROJEKTANGABEN,
    });
    await schreibe(kern, umkehren(setzen));
    const zurueck = wert(kern.projektLaden(P));
    expect(zurueck).toEqual(f.projekt);
    expect(Object.hasOwn(zurueck, 'angaben')).toBe(false);
  });

  it('Bieterangaben setzen, Bieter umbenennen und einen Bieter ohne Angebot löschen; Undo stellt ihn an seiner Stelle her', async () => {
    const kern = await mitFixture();
    const neu: Bieter = {
      id: 'bieter-neu' as BieterId,
      name: 'Neubau GmbH (erfunden)',
      angaben: BIETERANGABEN,
    };
    const p1: Projekt = { ...f.projekt, bieter: [neu, ...f.projekt.bieter] };
    await schreibe(kern, projektAendern(f.projekt, p1));
    expect(wert(kern.projektLaden(P))).toEqual(p1);
    const p2: Projekt = { ...p1, bieter: [{ ...neu, name: 'Neubau AG (erfunden)' }, ...f.projekt.bieter] };
    await schreibe(kern, projektAendern(p1, p2));
    const ohneAngaben: Projekt = {
      ...p2,
      bieter: [{ id: neu.id, name: 'Neubau AG (erfunden)' }, ...f.projekt.bieter],
    };
    await schreibe(kern, projektAendern(p2, ohneAngaben));
    const gelesen = wert(kern.projektLaden(P));
    expect(gelesen).toEqual(ohneAngaben);
    expect(Object.hasOwn(gelesen.bieter[0] as Bieter, 'angaben')).toBe(false);
    const loeschen = projektAendern(ohneAngaben, f.projekt);
    await schreibe(kern, loeschen);
    expect(wert(kern.projektLaden(P))).toEqual(f.projekt);
    await schreibe(kern, umkehren(loeschen));
    expect(wert(kern.projektLaden(P))).toEqual(ohneAngaben);
  });

  it('einen Bieter mit Angebot entfernt kein ChangeSet (auch kein Undo): konflikt, nichts geschrieben (D-127.2)', async () => {
    const kern = await mitFixture();
    const ohne: Projekt = { ...f.projekt, bieter: f.projekt.bieter.filter((b) => b.id !== angebot.bieterId) };
    const r = await versuche(kern, projektAendern(f.projekt, ohne));
    expect(r).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    expect(r.ok ? '' : r.fehler.meldung).toContain(angebot.bieterId);
    expect(r.ok ? '' : r.fehler.meldung).toContain(angebot.id);
    expect(wert(kern.projektLaden(P))).toEqual(f.projekt);
  });

  it('Angaben, die ganz null sind, kennt der Vertrag nicht (das Feld fehlt dann): unbekannt, nichts geschrieben', async () => {
    const kern = await mitFixture();
    const leer = { nummer: null, ort: null, baustelle: null };
    const r1 = await versuche(kern, projektAendern(f.projekt, { ...f.projekt, angaben: leer }));
    expect(r1).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    const bieterLeer = { anschrift: null, ansprechperson: null, email: null, telefon: null };
    const [b0, ...rest] = f.projekt.bieter;
    if (b0 === undefined) throw new Error('typisch hat Bieter');
    const r2 = await versuche(
      kern,
      projektAendern(f.projekt, { ...f.projekt, bieter: [{ ...b0, angaben: bieterLeer }, ...rest] }),
    );
    expect(r2).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    expect(wert(kern.projektLaden(P))).toEqual(f.projekt);
  });
});

describe('Vertrag v1.7a: Preisspiegel-Einstellungen am LV-Kopf', () => {
  it('setzen, laden und per Undo entfernen; die LV-Übersicht trägt sie nicht; ein LV-Stand friert sie ein', async () => {
    const kern = await mitFixture();
    const setzen = kopfAendern(f.lv, { preisspiegel: PREISSPIEGEL }, f.lv.summen.gesamt.netto);
    await schreibe(kern, setzen);
    const gesetzt = wert(kern.lvLaden(lv.id));
    expect(gesetzt.leistungsverzeichnis.preisspiegel).toEqual(PREISSPIEGEL);
    expect(wert(kern.lvAuflisten(P))).toEqual([
      { id: lv.id, name: lv.name, nettoNachNachlass: f.lv.summen.gesamt.nettoNachNachlass },
    ]);
    await schreibe(kern, standAnlegen(gesetzt, 'stand-ps', 'mit Preisspiegel'));
    await schreibe(kern, umkehren(setzen));
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);
    expect(wert(kern.lvStandLaden('stand-ps' as never)).zustand).toEqual(gesetzt);
  });

  it('am Auftrags-LV gibt es sie nicht (D-127.7): unbekannt, nichts geschrieben', async () => {
    const kern = await mitFixture();
    const a = auftragsLvAus(f.lv, angebot.id);
    const mit = {
      ...a,
      auftragsLeistungsverzeichnis: { ...a.auftragsLeistungsverzeichnis, preisspiegel: PREISSPIEGEL },
    };
    const r = await versuche(kern, auftragsLvAnlegenChangeSet(mit));
    expect(r).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    expect(wert(kern.auftragsLvAuflisten(P))).toEqual([]);
  });
});

describe('Vertrag v1.7a: Kalkulationsangaben an der Position', () => {
  it('setzen, laden, Undo; Papierkorb und LV-Stand tragen sie', async () => {
    const kern = await mitFixture();
    const mit: Position = { ...erste, kalkulation: KALKULATION };
    const setzen = feldAendern(f.lv, erste.id, mit, '9.99');
    await schreibe(kern, setzen);
    const gesetzt = wert(kern.lvLaden(lv.id));
    expect(positionen(gesetzt.leistungsverzeichnis.knoten)[0]).toEqual(mit);
    await schreibe(kern, standAnlegen(gesetzt, 'stand-kalk', 'mit Kalkulation'));
    const stand = wert(kern.lvStandLaden('stand-kalk' as never));
    expect(positionen(stand.zustand.leistungsverzeichnis.knoten)[0]?.kalkulation).toEqual(KALKULATION);
    // In den Papierkorb und zurück (Undo): die Kalkulation bleibt an der Position.
    const korb = ausBaumNehmen(gesetzt, [erste.id], { id: 'korb-kalk', nummer: 1 });
    await schreibe(kern, korb);
    const imKorb = wert(kern.lvLaden(lv.id)).papierkorb?.[0]?.knoten[0];
    expect(imKorb).toEqual(mit);
    await schreibe(kern, umkehren(korb));
    expect(wert(kern.lvLaden(lv.id))).toEqual(gesetzt);
    await schreibe(kern, umkehren(setzen));
    const zurueck = positionen(wert(kern.lvLaden(lv.id)).leistungsverzeichnis.knoten)[0];
    expect(zurueck).toEqual(erste);
    expect(Object.hasOwn(zurueck as Position, 'kalkulation')).toBe(false);
  });

  it('im Auftrags-LV: eine Position mit Kalkulation kommt verlustfrei zurück', async () => {
    const kern = await mitFixture();
    const a = auftragsLvAus(f.lv, angebot.id);
    const knoten = a.auftragsLeistungsverzeichnis.knoten.map((k) =>
      k.id === erste.id && k.art === 'position' ? { ...k, kalkulation: KALKULATION } : k,
    );
    const mit = { ...a, auftragsLeistungsverzeichnis: { ...a.auftragsLeistungsverzeichnis, knoten } };
    await schreibe(kern, auftragsLvAnlegenChangeSet(mit));
    expect(wert(kern.auftragsLvLaden(a.auftragsLeistungsverzeichnis.id))).toEqual(mit);
  });

  it('eine leere Kalkulation (kein Ansatz, kein Satz) kennt der Vertrag nicht: unbekannt, nichts geschrieben', async () => {
    const kern = await mitFixture();
    const leer: Position = { ...erste, kalkulation: { ansaetze: [], zuschlagssaetze: {} } };
    const r = await versuche(kern, feldAendern(f.lv, erste.id, leer, '9.99'));
    expect(r).toMatchObject({ ok: false, fehler: { code: 'unbekannt' } });
    expect(wert(kern.lvLaden(lv.id))).toEqual(f.lv);
  });
});
