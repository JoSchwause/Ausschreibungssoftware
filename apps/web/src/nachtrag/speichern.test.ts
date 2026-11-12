// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 86: Nachtrag anlegen und beauftragen über den Befehlsweg der App, gegen einen echten Speicher (In-Memory-SQLite).
// Wie Tor M4 (Ticket 85): `typisch`, Zuschlag an Bieter B aus seiner X84 ohne Wahl, Nachtrag N01 mit zwei Positionen und
// dem Nachtragsangebot des Auftragnehmers. Erwartete Summen aus `typisch-abrechnung.json`, nicht aus dem Kern.

import { readFileSync } from 'node:fs';
import type { Gesamtsummen, LeistungsverzeichnisId, LvZustand, PositionId, Projekt } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { nachtragsmaske } from '@tethys/abrechnung';
import { abrechnungsFixture, m4Nachtrag } from '../../../../packages/abrechnung/src/testhilfen';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { zuschlagserteilungSpeichern } from '../auftrag/auftrag';
import { zuschlagserteilungPlanen } from '../auftrag/zuschlagserteilung';
import { angebotAnlegenPlan, angebotLesen } from '../gaeb/gaeb';
import { befehlswegFuer } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { nachtraegeLaden as laden, nachtragAnlegen, nachtragBeauftragen } from './speichern';

const wurzel = new URL('../../../../', import.meta.url);
const fx = abrechnungsFixture() as unknown as {
  zuschlag: { sollwerte: { summen: Gesamtsummen } };
  nachtrag: { sollwerte: { summen: Gesamtsummen }; angebot: { sollwerte: { summen: Gesamtsummen } } };
};

async function nachtraegeLaden(...args: Parameters<typeof laden>) {
  const r = await laden(...args);
  if (!r.ok) throw new Error(r.fehler.meldung);
  return r.wert;
}

/** Projekt, LV `typisch`, Angebot von Bieter B (X84) und der Zuschlag an Bieter B ohne Wahl, alles über den Befehlsweg. */
async function mitAuftrag() {
  const u = testUmgebung(await speicherImSpeicher());
  const weg = befehlswegFuer(u);
  const p = await weg.projekt(null).befehl({
    art: 'ProjektAnlegen',
    id: u.ids.projekt(),
    name: 'Musterhaus',
    bauherr: { name: 'Bauherr', anschrift: null },
  });
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const inhalt = fixtureInhalt('typisch');
  const s = weg.lv(p.zustand.id, null);
  const l = await s.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: p.zustand.id,
    inhalt,
  });
  if (!l.ok || s.zustand === null) throw new Error('LV');
  const lv = s.zustand;
  const bytes = new Uint8Array(readFileSync(new URL('fixtures/angebote/typisch-bieter-b.x84', wurzel)));
  const v = angebotLesen(bytes, 'typisch-bieter-b.x84', lv, u.ids);
  const plan = angebotAnlegenPlan(v, v.bieterName, p.zustand, u.ids);
  if (plan === null) throw new Error('Angebot');
  const a = await weg.angebotAnlegen(p.zustand, lv, plan.neuerBieter, plan.angebot);
  if (!a.ok) throw new Error('Angebot');
  const projekt: Projekt = a.zustand;
  const z = zuschlagserteilungPlanen({
    lv,
    angebot: plan.angebot,
    projekt,
    gewaehlt: new Set<PositionId>(),
    neueId: u.ids.auftragsLeistungsverzeichnis(),
  });
  if (z.befehl === null) throw new Error(z.fehler ?? 'Zuschlag');
  const r = await zuschlagserteilungSpeichern(weg, z.befehl);
  if (!r.ok) throw new Error('Zuschlag');
  const auftrag = await u.speicher.auftragsLeistungsverzeichnisse.laden(r.id);
  if (!auftrag.ok) throw new Error('Auftrags-LV');
  return { u, weg, projekt, auftrag: auftrag.wert, bieterId: plan.angebot.bieterId };
}

/** Die zwei Positionen des Nachtrags N01 der Fixture (ein Titel) einfügen und das Angebot des Auftragnehmers anlegen. */
async function nachtragFuellen(
  k: Awaited<ReturnType<typeof mitAuftrag>>,
  lvId: LeistungsverzeichnisId,
): Promise<LvZustand> {
  const { u, weg, projekt } = k;
  const geladen = await u.speicher.leistungsverzeichnisse.laden(lvId);
  if (!geladen.ok) throw new Error('Nachtrags-LV');
  const fxN = m4Nachtrag();
  const s = weg.lv(projekt.id, geladen.wert);
  const e = await s.befehl({
    art: 'KnotenEinfuegen',
    ort: { art: 'ende', elternId: lvId },
    knoten: fxN.lv.leistungsverzeichnis.knoten,
  });
  if (!e.ok || s.zustand === null) throw new Error('Knoten');
  const angebot = {
    ...fxN.angebot,
    id: u.ids.angebot(),
    projektId: projekt.id,
    leistungsverzeichnisId: lvId,
    bieterId: k.bieterId,
  };
  const a = await weg.angebotAnlegen(projekt, s.zustand, null, angebot);
  if (!a.ok) throw new Error('Nachtragsangebot');
  return s.zustand;
}

describe('Nachtrag über den Befehlsweg', () => {
  it('„Nachtrag anlegen“: LV und Nachtragsangaben in einem Undo-Schritt, Nummern N01, N02', async () => {
    const k = await mitAuftrag();
    const { u, weg, auftrag } = k;
    const tiefe = weg.historie.tiefe.rueck;
    const a = auftrag.auftragsLeistungsverzeichnis;

    const r1 = await nachtragAnlegen(weg, a, 'Gründung');
    if (!r1.ok) throw new Error('anlegen');
    expect(r1.nummer).toBe('N01');
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
    const lv = await u.speicher.leistungsverzeichnisse.laden(r1.lvId);
    expect(lv.ok && lv.wert.leistungsverzeichnis).toMatchObject({
      name: 'Nachtrag N01 – Gründung',
      ozMaske: nachtragsmaske(a.ozMaske),
      mwstSatz: a.mwstSatz,
      nachtrag: { auftragsLvId: a.id, nummer: 'N01', status: 'angemeldet' },
    });
    const r2 = await nachtragAnlegen(weg, a, '');
    expect(r2).toMatchObject({ ok: true, nummer: 'N02' });

    // Ein Rückgängig nimmt N02 ganz zurück (LV samt Angaben), N01 bleibt.
    await weg.rueckgaengig();
    const liste = await u.speicher.leistungsverzeichnisse.auflisten(a.projektId);
    expect(
      liste.ok && liste.wert.filter((l) => l.nachtrag !== undefined).map((l) => l.nachtrag?.nummer),
    ).toEqual(['N01']);
  });

  it('„Beauftragen“: Übernahme ins Auftrags-LV und Status beauftragt in einem Undo-Schritt, Summen wie die Fixture', async () => {
    const k = await mitAuftrag();
    const { u, weg, auftrag } = k;
    const a = auftrag.auftragsLeistungsverzeichnis;
    expect(auftrag.summen.gesamt).toMatchObject(fx.zuschlag.sollwerte.summen);
    const r = await nachtragAnlegen(weg, a, 'Gründung');
    if (!r.ok) throw new Error('anlegen');
    await nachtragFuellen(k, r.lvId);

    const vorher = await nachtraegeLaden(u.speicher, auftrag);
    expect(vorher.nachtraege).toEqual([
      {
        lvId: r.lvId,
        nummer: 'N01',
        name: 'Nachtrag N01 – Gründung',
        status: 'angemeldet',
        angebotsnetto: fx.nachtrag.angebot.sollwerte.summen.netto,
      },
    ]);

    const tiefe = weg.historie.tiefe.rueck;
    const b = await nachtragBeauftragen(weg, { auftragsLvId: a.id, nachtragsLvId: r.lvId });
    expect(b).toMatchObject({ ok: true });
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
    const danach = await u.speicher.auftragsLeistungsverzeichnisse.laden(a.id);
    if (!danach.ok) throw new Error('Auftrags-LV');
    expect(danach.wert.summen.gesamt).toMatchObject(fx.nachtrag.sollwerte.summen);
    const gliederung = danach.wert.auftragsLeistungsverzeichnis.knoten.find(
      (x) => x.elternId === a.id && x.art === 'titel' && x.kurztext === 'Nachtrag N01',
    );
    expect(gliederung).toMatchObject({ ordnungszahl: '04' });
    const nachtrag = await nachtraegeLaden(u.speicher, danach.wert);
    expect(nachtrag.nachtraege.map((n) => n.status)).toEqual(['beauftragt']);
    expect(nachtrag.befunde).toEqual([]);

    // Rückgängig: beides zurück; Wiederholen: beides wieder.
    await weg.rueckgaengig();
    const zurueck = await u.speicher.auftragsLeistungsverzeichnisse.laden(a.id);
    expect(zurueck.ok && zurueck.wert.summen.gesamt).toMatchObject(fx.zuschlag.sollwerte.summen);
    expect((await nachtraegeLaden(u.speicher, auftrag)).nachtraege.map((n) => n.status)).toEqual([
      'angemeldet',
    ]);
    await weg.wiederholen();
    const wieder = await u.speicher.auftragsLeistungsverzeichnisse.laden(a.id);
    expect(wieder.ok && wieder.wert.summen.gesamt).toMatchObject(fx.nachtrag.sollwerte.summen);

    // Ein zweites Beauftragen geht nicht: nichts geschrieben, der Grund in Worten.
    const zweit = await nachtragBeauftragen(weg, { auftragsLvId: a.id, nachtragsLvId: r.lvId });
    expect(zweit).toMatchObject({ ok: false, art: 'plan' });
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
  });

  it('Status von Hand zurück auf „angeboten“: die Liste meldet den Befund (U5)', async () => {
    const k = await mitAuftrag();
    const { u, weg, auftrag } = k;
    const a = auftrag.auftragsLeistungsverzeichnis;
    const r = await nachtragAnlegen(weg, a, 'Gründung');
    if (!r.ok) throw new Error('anlegen');
    const lv = await nachtragFuellen(k, r.lvId);
    const b = await nachtragBeauftragen(weg, { auftragsLvId: a.id, nachtragsLvId: r.lvId });
    if (!b.ok) throw new Error('beauftragen');
    const aktuell = await u.speicher.leistungsverzeichnisse.laden(lv.leistungsverzeichnis.id);
    if (!aktuell.ok) throw new Error('LV');
    const s = weg.lv(a.projektId, aktuell.wert);
    await s.befehl({
      art: 'NachtragsangabenSetzen',
      nachtrag: { auftragsLvId: a.id, nummer: 'N01', status: 'angeboten' },
    });
    const danach = await u.speicher.auftragsLeistungsverzeichnisse.laden(a.id);
    if (!danach.ok) throw new Error('Auftrags-LV');
    const l = await nachtraegeLaden(u.speicher, danach.wert);
    expect(l.befunde).toHaveLength(1);
    expect(l.befunde[0]).toMatch(/^Nachtrag N01: .*angeboten/);
  });
});
