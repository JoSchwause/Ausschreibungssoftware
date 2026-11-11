// SPDX-License-Identifier: AGPL-3.0-or-later
// `Summenaenderung.vorher` wird in jedem ChangeSet gegen den gespeicherten Stand geprüft (Ticket 57, Review D-27), nicht
// nur beim Löschen eines Aggregats: Sonst schriebe die Umkehrung falsche Summen zurück oder ließe gespeicherte fallen
// (Q5). Passt `vorher` nicht, wird nichts geschrieben und nichts protokolliert.

import type { AngebotChangeSet, ChangeSet, LvChangeSet, Position } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { LEERES_SUMMENVORHER } from './summenvorher';
import { anlegenSchritte, eintrag, ladeFixture, lvAnlegenChangeSet } from './testhilfe/fixtures';
import { neuerKern, speichere, wert, zaehle } from './testhilfe/node';
import { ausBaumNehmen, feldAendern } from './testhilfe/umkehrung';

const typisch = ladeFixture('typisch');
const lv = typisch.lv;
const lvId = lv.leistungsverzeichnis.id;
const position = lv.leistungsverzeichnis.knoten.find((k): k is Position => k.art === 'position') as Position;
const summeVon = (id: string): (typeof lv.summen.positionen)[number] =>
  lv.summen.positionen.find((p) => p.positionId === id) as (typeof lv.summen.positionen)[number];

let nr = 700;
async function versuche(cs: ChangeSet): Promise<string> {
  const { kern, db } = await neuerKern();
  await speichere(kern, anlegenSchritte(typisch));
  const vorher = kern.projektdateiExportieren(typisch.projekt.id);
  const eintraege = zaehle(db, 'protokoll');
  const aggregat =
    cs.art === 'angebot'
      ? ({ art: 'angebot', id: cs.angebotId } as const)
      : ({ art: 'leistungsverzeichnis', id: lvId } as const);
  const r = await kern.anwenden(
    eintrag(nr++, typisch.projekt.id, aggregat, { art: 'NachlassEntfernen' }),
    cs,
  );
  if (r.ok) return 'ok';
  expect(kern.projektdateiExportieren(typisch.projekt.id)).toEqual(vorher);
  expect(zaehle(db, 'protokoll')).toBe(eintraege);
  return r.fehler.code;
}

const menge = feldAendern(lv, position.id, { ...position, menge: '7.000' as never }, '1.23');
const mitVorher = (cs: LvChangeSet, v: Partial<LvChangeSet['summen']['vorher']>): LvChangeSet => ({
  ...cs,
  summen: { ...cs.summen, vorher: { ...cs.summen.vorher, ...v } },
});

describe('summen.vorher in jedem ChangeSet', () => {
  it('ein passendes vorher wird angenommen', async () => {
    expect(await versuche(menge)).toBe('ok');
  });

  it('alter Wert einer Positionssumme weicht ab: konflikt', async () => {
    const falsch = { ...summeVon(position.id), gesamtpreis: '0.01' as never };
    expect(await versuche(mitVorher(menge, { positionen: [falsch] }))).toBe('konflikt');
  });

  it('gespeicherte Summe ohne alten Wert (die Umkehrung löschte sie): konflikt', async () => {
    expect(await versuche(mitVorher(menge, { positionen: [] }))).toBe('konflikt');
  });

  it('alte Gesamtsummen weichen ab oder fehlen: konflikt', async () => {
    const falsch = { ...lv.summen.gesamt, netto: '0.01' as never };
    expect(await versuche(mitVorher(menge, { gesamt: falsch }))).toBe('konflikt');
    expect(await versuche(mitVorher(menge, { gesamt: null }))).toBe('konflikt');
  });

  it('alte Gesamtsummen ohne neue, alter Wert ohne neuen: unbekannt (das ChangeSet widerspricht sich)', async () => {
    const ohneNeue: LvChangeSet = { ...menge, summen: { ...menge.summen, gesamt: null } };
    expect(await versuche(ohneNeue)).toBe('unbekannt');
    const ohneNeuenWert: LvChangeSet = { ...menge, summen: { ...menge.summen, positionen: [] } };
    expect(await versuche(ohneNeuenWert)).toBe('unbekannt');
  });

  it('entfernter Knoten: seine Summe fehlt in vorher.entfernt oder weicht ab: konflikt', async () => {
    const weg = ausBaumNehmen(lv, [position.id]);
    expect(await versuche(weg)).toBe('ok');
    const ohne = mitVorher(weg, { entfernt: { positionen: [], gliederungen: [] } });
    expect(await versuche(ohne)).toBe('konflikt');
    const falsch = { ...summeVon(position.id), gehtInSummeEin: !summeVon(position.id).gehtInSummeEin };
    expect(await versuche(mitVorher(weg, { entfernt: { positionen: [falsch], gliederungen: [] } }))).toBe(
      'konflikt',
    );
  });

  it('Summe in vorher.entfernt zu einem Knoten, der bleibt: unbekannt', async () => {
    const zuviel = mitVorher(menge, { entfernt: { positionen: [summeVon(position.id)], gliederungen: [] } });
    expect(await versuche(zuviel)).toBe('unbekannt');
  });

  it('neues Aggregat mit alten Summen: konflikt (es gab keine)', async () => {
    const neu = lvAnlegenChangeSet({
      ...lv,
      leistungsverzeichnis: { ...lv.leistungsverzeichnis, id: 'zweites-lv' as never },
    });
    const knoten = neu.knoten.hinzugefuegt.map((k) =>
      k.elternId === lvId ? { ...k, elternId: 'zweites-lv' as never } : k,
    );
    const sauber: LvChangeSet = { ...neu, knoten: { ...neu.knoten, hinzugefuegt: knoten } };
    const { kern } = await neuerKern();
    await speichere(kern, anlegenSchritte(typisch));
    const e = eintrag(
      nr++,
      typisch.projekt.id,
      { art: 'leistungsverzeichnis', id: 'zweites-lv' as never },
      {
        art: 'NachlassEntfernen',
      },
    );
    const mitAltem = mitVorher(sauber, { gesamt: lv.summen.gesamt });
    expect(await kern.anwenden(e, mitAltem)).toMatchObject({ ok: false, fehler: { code: 'konflikt' } });
    wert(await kern.anwenden(e, { ...sauber, summen: { ...sauber.summen, vorher: LEERES_SUMMENVORHER } }));
  });

  it('Angebot: alter Wert weicht ab: konflikt', async () => {
    const a = typisch.angebote[0];
    if (a === undefined) throw new Error('kein Angebot');
    const ap = a.angebot.positionen.find((p) => p.status === 'angeboten');
    const alt = a.summen.positionen.find((p) => p.positionId === ap?.positionId);
    if (ap === undefined || alt === undefined) throw new Error('keine angebotene Position');
    const cs = (vorherWert: typeof alt): AngebotChangeSet => ({
      art: 'angebot',
      angebotId: a.angebot.id,
      kopf: null,
      positionen: {
        hinzugefuegt: [],
        geaendert: [{ vorher: ap, nachher: { ...ap, einheitspreis: '1.000' as never } }],
        entfernt: [],
      },
      summen: {
        positionen: [{ ...alt, gesamtpreis: '1.00' as never }],
        gliederungen: [],
        gesamt: null,
        vorher: { ...LEERES_SUMMENVORHER, positionen: [vorherWert] },
      },
    });
    expect(await versuche(cs({ ...alt, gesamtpreis: '0.01' as never }))).toBe('konflikt');
    expect(await versuche(cs(alt))).toBe('ok');
  });
});
