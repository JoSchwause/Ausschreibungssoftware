// SPDX-License-Identifier: AGPL-3.0-or-later
// Massenbefehle im Befehlsprotokoll (E-13, ADR 0009; Ticket 38, Punkt 4): Kopf und SHA-256-Prüfsumme statt des ganzen
// Befehls, alle anderen Befehle vollständig, genau ein Eintrag je Befehl; der Dekoder liest die Kurzfassung.

import { createHash } from 'node:crypto';
import type { Befehl, Befehlskurzfassung, Menge, Position, Protokolleintrag } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { kanonischesJson } from './kanonisch';
import { befehlskurzfassung, pruefsummeBilden } from './kurzfassung';
import {
  anlegenSchritte,
  auftragsLvAnlegenChangeSet,
  auftragsLvAus,
  eintrag,
  ladeFixture,
} from './testhilfe/fixtures';
import { neuerKern, wert, zaehle } from './testhilfe/node';

const typisch = ladeFixture('typisch');
const projektId = typisch.projekt.id;
const sha256 = (b: Befehl): string => createHash('sha256').update(kanonischesJson(b), 'utf8').digest('hex');

/** Typisch anlegen (Projekt, LV, drei Angebote) und dazu ein Auftrags-LV: alle drei Massenbefehlsarten. */
async function allesAngelegt(): Promise<{
  kern: Awaited<ReturnType<typeof neuerKern>>['kern'];
  db: Awaited<ReturnType<typeof neuerKern>>['db'];
  befehle: Befehl[];
}> {
  const { kern, db } = await neuerKern();
  const schritte = anlegenSchritte(typisch);
  const angebot = typisch.angebote[0];
  if (angebot === undefined) throw new Error('kein Angebot');
  const auftrag = auftragsLvAus(typisch.lv, angebot.angebot.id);
  schritte.push({
    eintrag: eintrag(
      schritte.length + 1,
      projektId,
      { art: 'auftrags-leistungsverzeichnis', id: auftrag.auftragsLeistungsverzeichnis.id },
      {
        art: 'AuftragsLeistungsverzeichnisAnlegen',
        auftragsLeistungsverzeichnis: auftrag.auftragsLeistungsverzeichnis,
      },
    ),
    changeSet: auftragsLvAnlegenChangeSet(auftrag),
  });
  for (const [i, s] of schritte.entries()) {
    wert(await kern.anwenden(s.eintrag, s.changeSet));
    expect(zaehle(db, 'protokoll')).toBe(i + 1); // genau ein Eintrag je Befehl
  }
  return { kern, db, befehle: schritte.map((s) => s.eintrag.befehl as Befehl) };
}

const kurz = (e: Protokolleintrag | undefined): Befehlskurzfassung => {
  if (e?.befehl.art !== 'Befehlskurzfassung')
    throw new Error(`Kurzfassung erwartet, nicht ${String(e?.befehl.art)}`);
  return e.befehl;
};

describe('Massenbefehle im Protokoll', () => {
  it('jede der drei Massenbefehlsarten steht als Kurzfassung mit SHA-256 da; alle anderen vollständig', async () => {
    const { kern, befehle } = await allesAngelegt();
    const protokoll = wert(kern.protokoll(projektId));
    expect(protokoll).toHaveLength(befehle.length);
    const arten = protokoll.map((e) =>
      e.befehl.art === 'Befehlskurzfassung' ? `kurz:${e.befehl.kopf.art}` : e.befehl.art,
    );
    expect(arten).toEqual([
      'ProjektAnlegen',
      'kurz:LeistungsverzeichnisAnlegen',
      'kurz:AngebotAnlegen',
      'kurz:AngebotAnlegen',
      'kurz:AngebotAnlegen',
      'kurz:AuftragsLeistungsverzeichnisAnlegen',
    ]);
    expect(protokoll[0]?.befehl).toEqual(befehle[0]); // kein Massenbefehl: vollständig
    for (const [i, e] of protokoll.entries()) {
      const b = befehle[i];
      if (b === undefined || e.befehl.art !== 'Befehlskurzfassung') continue;
      expect(e.befehl.pruefsumme).toEqual({ algorithmus: 'sha-256', wert: sha256(b) });
      expect(e.befehl.pruefsumme.wert).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('der Kopf ist der Befehl ohne seine lange Liste', async () => {
    const { kern, befehle } = await allesAngelegt();
    const protokoll = wert(kern.protokoll(projektId));
    const lv = befehle[1];
    if (lv?.art !== 'LeistungsverzeichnisAnlegen') throw new Error('LV erwartet');
    const { knoten, ...inhalt } = lv.inhalt;
    expect(knoten.length).toBeGreaterThan(0); // die Liste, die im Kopf fehlt
    expect(kurz(protokoll[1]).kopf).toEqual({ art: lv.art, id: lv.id, projektId: lv.projektId, inhalt });
    const angebot = befehle[2];
    if (angebot?.art !== 'AngebotAnlegen') throw new Error('Angebot erwartet');
    const { positionen, ...angebotKopf } = angebot.angebot;
    expect(positionen.length).toBeGreaterThan(0);
    expect(kurz(protokoll[2]).kopf).toEqual({ art: angebot.art, angebot: angebotKopf });
    const auftrag = befehle[5];
    if (auftrag?.art !== 'AuftragsLeistungsverzeichnisAnlegen') throw new Error('Auftrags-LV erwartet');
    const { knoten: auftragKnoten, ...auftragKopf } = auftrag.auftragsLeistungsverzeichnis;
    expect(auftragKnoten.length).toBeGreaterThan(0);
    expect(kurz(protokoll[5]).kopf).toEqual({ art: auftrag.art, auftragsLeistungsverzeichnis: auftragKopf });
    // Nichts im Protokoll wächst mit der Zahl der Positionen.
    expect(JSON.stringify(protokoll)).not.toContain('"knoten"');
    expect(JSON.stringify(protokoll)).not.toContain('"positionen"');
  });

  it('wer einen Massenbefehl ausführt, kann prüfen, dass seine Summe zum Protokoll passt', async () => {
    const { kern, befehle } = await allesAngelegt();
    const protokoll = wert(kern.protokoll(projektId));
    for (const i of [1, 2, 5]) {
      const b = befehle[i];
      if (b === undefined) throw new Error('Befehl fehlt');
      expect(await pruefsummeBilden(b)).toEqual(kurz(protokoll[i]).pruefsumme);
      if (b.art === 'LeistungsverzeichnisAnlegen' || b.art === 'AngebotAnlegen')
        expect(await befehlskurzfassung(b)).toEqual(protokoll[i]?.befehl);
    }
    // Ein anderer Befehl ergibt eine andere Summe.
    const lv = befehle[1];
    if (lv?.art !== 'LeistungsverzeichnisAnlegen') throw new Error('LV erwartet');
    const anders = { ...lv, inhalt: { ...lv.inhalt, knoten: lv.inhalt.knoten.slice(1) } };
    expect((await pruefsummeBilden(anders)).wert).not.toBe(kurz(protokoll[1]).pruefsumme.wert);
  });

  it('Aufrufe ohne Warten laufen in ihrer Reihenfolge: das Ändern nach dem Anlegen findet das LV', async () => {
    const { kern } = await neuerKern();
    const [projekt, lv] = anlegenSchritte(typisch);
    if (projekt === undefined || lv === undefined) throw new Error('Schritte fehlen');
    const vorher = typisch.lv.leistungsverzeichnis.knoten.find((k): k is Position => k.art === 'position');
    if (vorher === undefined) throw new Error('keine Position');
    const menge = '7.000' as Menge;
    const lvId = typisch.lv.leistungsverzeichnis.id;
    const aendern = kern.anwenden(
      eintrag(
        90,
        projektId,
        { art: 'leistungsverzeichnis', id: lvId },
        { art: 'MengeAendern', positionId: vorher.id, menge },
      ),
      {
        art: 'leistungsverzeichnis',
        leistungsverzeichnisId: lvId,
        kopf: null,
        knoten: { hinzugefuegt: [], geaendert: [{ vorher, nachher: { ...vorher, menge } }], entfernt: [] },
        summen: { positionen: [], gliederungen: [], gesamt: null },
      },
    );
    const ergebnisse = await Promise.all([
      kern.anwenden(projekt.eintrag, projekt.changeSet),
      kern.anwenden(lv.eintrag, lv.changeSet),
    ]);
    // `aendern` kam zuerst und scheitert (noch kein LV); die beiden danach gehen in Reihenfolge durch.
    expect(await aendern).toMatchObject({ ok: false });
    expect(ergebnisse.map((r) => r.ok)).toEqual([true, true]);
    expect(wert(kern.protokoll(projektId)).map((e) => e.id)).toEqual([projekt.eintrag.id, lv.eintrag.id]);
  });

  it('eine schon gekürzte Fassung geht unverändert ins Protokoll', async () => {
    const { kern } = await neuerKern();
    const [projekt, lv] = anlegenSchritte(typisch);
    if (projekt === undefined || lv === undefined) throw new Error('Schritte fehlen');
    wert(await kern.anwenden(projekt.eintrag, projekt.changeSet));
    const b = lv.eintrag.befehl;
    if (b.art !== 'LeistungsverzeichnisAnlegen') throw new Error('LV erwartet');
    const schonKurz = { ...lv.eintrag, befehl: await befehlskurzfassung(b) };
    wert(await kern.anwenden(schonKurz, lv.changeSet));
    expect(wert(kern.protokoll(projektId))[1]).toEqual(schonKurz);
  });
});

describe('Projektdatei: Kurzfassung im Protokoll', () => {
  async function exportText(): Promise<string> {
    const { kern } = await allesAngelegt();
    return wert(kern.projektdateiExportieren(projektId));
  }

  it('Export → Import → Export ist byte-gleich, die Kurzfassungen kommen unverändert zurück', async () => {
    const text = await exportText();
    const b = await neuerKern();
    wert(b.kern.projektdateiImportieren(text));
    expect(wert(b.kern.projektdateiExportieren(projektId)) === text).toBe(true);
    expect(
      wert(b.kern.protokoll(projektId)).filter((e) => e.befehl.art === 'Befehlskurzfassung'),
    ).toHaveLength(5);
  });

  type Aenderung = (kurzfassung: Record<string, unknown>) => void;
  const pruefsumme = (k: Record<string, unknown>): Record<string, unknown> =>
    k['pruefsumme'] as Record<string, unknown>;
  const kopf = (k: Record<string, unknown>): Record<string, unknown> => k['kopf'] as Record<string, unknown>;
  const faelle: [string, Aenderung][] = [
    ['Prüfsumme nicht hexadezimal', (k) => (pruefsumme(k)['wert'] = 'z'.repeat(64))],
    ['Prüfsumme mit Großbuchstaben', (k) => (pruefsumme(k)['wert'] = 'A'.repeat(64))],
    ['Prüfsumme zu kurz', (k) => (pruefsumme(k)['wert'] = 'a'.repeat(63))],
    ['Prüfsumme zu lang für sha-256', (k) => (pruefsumme(k)['wert'] = 'a'.repeat(128))],
    ['Prüfsumme als Zahl', (k) => (pruefsumme(k)['wert'] = 12)],
    ['unbekannter Algorithmus', (k) => (pruefsumme(k)['algorithmus'] = 'sha-1')],
    ['fremdes Feld in der Prüfsumme', (k) => (pruefsumme(k)['salz'] = 'x')],
    ['ohne Prüfsumme', (k) => Reflect.deleteProperty(k, 'pruefsumme')],
    ['Kopf ohne Massenbefehlsart', (k) => (kopf(k)['art'] = 'MengeAendern')],
    ['Kopf mit der langen Liste', (k) => ((kopf(k)['inhalt'] as Record<string, unknown>)['knoten'] = [])],
    ['fremdes Feld in der Kurzfassung', (k) => (k['befehl'] = {})],
  ];

  it.each(faelle)('%s: datei-ungueltig, nichts übernommen', async (_name, aendere) => {
    const d = JSON.parse(await exportText()) as { protokoll: { befehl: Record<string, unknown> }[] };
    const k = d.protokoll[1]?.befehl;
    if (k?.['art'] !== 'Befehlskurzfassung') throw new Error('Kurzfassung erwartet');
    aendere(k);
    const { kern, db } = await neuerKern();
    expect(kern.projektdateiImportieren(JSON.stringify(d))).toMatchObject({
      ok: false,
      fehler: { code: 'datei-ungueltig' },
    });
    expect(zaehle(db, 'projekt')).toBe(0);
  });

  it('eine Prüfsumme sha-512 mit 128 Stellen ist gültig', async () => {
    const d = JSON.parse(await exportText()) as { protokoll: { befehl: Record<string, unknown> }[] };
    const k = d.protokoll[1]?.befehl;
    if (k === undefined) throw new Error('Eintrag fehlt');
    k['pruefsumme'] = { algorithmus: 'sha-512', wert: 'f'.repeat(128) };
    const { kern } = await neuerKern();
    expect(kern.projektdateiImportieren(JSON.stringify(d)).ok).toBe(true);
  });
});
