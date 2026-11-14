// SPDX-License-Identifier: AGPL-3.0-or-later
// LV-Stand umbenennen und löschen mit Rückgängig (Ticket 150; E8, D-127.1) und „Als neues LV übernehmen“ samt den
// Preisspiegel-Einstellungen des Stands (D-82 S6).
import type {
  LeistungsverzeichnisId,
  LvStandId,
  LvZustand,
  PreisspiegelEinstellungenSetzen,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { befehlswegFuer, type Umgebung } from '../lv/befehlsweg';
import { STANDARD_MASKE_TEXT, ozMaskeLesen } from '../lv/ozmaske';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { lvStandBefehlAnwenden, standAlsNeuesLv } from './staende';

const beispielPreisspiegelEinstellungenSetzen: PreisspiegelEinstellungenSetzen = {
  art: 'PreisspiegelEinstellungenSetzen',
  einstellungen: {
    ausreisserSchwelle: '15.00' as Prozent,
    abcSchwelleA: '80.00' as Prozent,
    abcSchwelleB: '95.00' as Prozent,
    abcBezug: 'schaetzpreis',
  },
};
const m = ozMaskeLesen(STANDARD_MASKE_TEXT);
if (!m.ok) throw new Error(m.fehler);
const MASKE = m.wert;

async function lvMitStand(
  preisspiegel: boolean,
): Promise<{ u: Umgebung; lvId: LeistungsverzeichnisId; standId: LvStandId; projektId: ProjektId }> {
  const u = testUmgebung(await speicherImSpeicher());
  const weg = befehlswegFuer(u);
  const p = await weg.projekt(null).befehl(projektAnlegenBefehl(u.ids, 'Schule', 'Stadt'));
  if (!p.ok || p.zustand === null) throw new Error('kein Projekt');
  const befehl = lvAnlegenBefehl(u.ids, p.zustand.id, 'Rohbau', MASKE);
  const lv = weg.lv(p.zustand.id, null);
  await lv.befehl(befehl);
  if (preisspiegel) await lv.befehl(beispielPreisspiegelEinstellungenSetzen);
  const standId = u.ids.lvStand();
  const a = await lv.befehl({ art: 'LvStandAnlegen', id: standId, name: 'Versand' });
  if (!a.ok) throw new Error('kein Stand');
  return { u, lvId: befehl.id, standId, projektId: p.zustand.id };
}

async function staende(u: Umgebung, lvId: LeistungsverzeichnisId): Promise<string[]> {
  const r = await u.speicher.lvStaende.auflisten(lvId);
  if (!r.ok) throw new Error(r.fehler.meldung);
  return r.wert.map((s) => s.name);
}

describe('LV-Stände', () => {
  it('umbenennen; Rückgängig gibt den alten Namen zurück', async () => {
    const { u, lvId, standId } = await lvMitStand(false);
    const a = await lvStandBefehlAnwenden(u, {
      art: 'LvStandUmbenennen',
      lvStandId: standId,
      name: 'Vergabe',
    });
    expect(a.ok).toBe(true);
    expect(await staende(u, lvId)).toEqual(['Vergabe']);
    await befehlswegFuer(u).rueckgaengig();
    expect(await staende(u, lvId)).toEqual(['Versand']);
  });

  it('ein leerer Name wird abgewiesen, nichts geschrieben', async () => {
    const { u, lvId, standId } = await lvMitStand(false);
    const a = await lvStandBefehlAnwenden(u, { art: 'LvStandUmbenennen', lvStandId: standId, name: ' ' });
    expect(a.ok || a.abweisung.art).toBe('befehl');
    expect(await staende(u, lvId)).toEqual(['Versand']);
  });

  it('löschen; Rückgängig legt denselben Stand wieder ab, Wiederholen löscht ihn erneut', async () => {
    const { u, lvId, standId } = await lvMitStand(false);
    const vorher = await u.speicher.lvStaende.laden(standId);
    const a = await lvStandBefehlAnwenden(u, { art: 'LvStandLoeschen', lvStandId: standId });
    expect(a.ok).toBe(true);
    expect(await staende(u, lvId)).toEqual([]);
    expect((await befehlswegFuer(u).rueckgaengig()).ok).toBe(true);
    expect(await u.speicher.lvStaende.laden(standId)).toEqual(vorher);
    expect((await befehlswegFuer(u).wiederholen()).ok).toBe(true);
    expect(await staende(u, lvId)).toEqual([]);
  });

  it('ein unbekannter Stand: Speicherfehler, nichts im Verlauf', async () => {
    const { u } = await lvMitStand(false);
    const vorher = befehlswegFuer(u).historie.tiefe.rueck;
    const a = await lvStandBefehlAnwenden(u, { art: 'LvStandLoeschen', lvStandId: u.ids.lvStand() });
    expect(a.ok || a.abweisung.art).toBe('speicher');
    expect(befehlswegFuer(u).historie.tiefe.rueck).toBe(vorher);
  });
});

describe('Als neues LV übernehmen', () => {
  async function uebernehmen(preisspiegel: boolean): Promise<{ befehle: string[]; lv: LvZustand | null }> {
    const { u, standId, projektId } = await lvMitStand(preisspiegel);
    const stand = await u.speicher.lvStaende.laden(standId);
    if (!stand.ok) throw new Error('kein Stand');
    const befehle = standAlsNeuesLv(stand.wert, u.ids);
    const a = await befehlswegFuer(u).lv(projektId, null).folge(befehle);
    const letzter = a.at(-1);
    return { befehle: befehle.map((b) => b.art), lv: letzter?.ok ? letzter.zustand : null };
  }

  it('trägt der Stand Preisspiegel-Einstellungen, bekommt das neue LV sie über einen eigenen Befehl', async () => {
    const r = await uebernehmen(true);
    expect(r.befehle).toEqual(['LeistungsverzeichnisAnlegen', 'PreisspiegelEinstellungenSetzen']);
    expect(r.lv?.leistungsverzeichnis.preisspiegel).toEqual(
      beispielPreisspiegelEinstellungenSetzen.einstellungen,
    );
    expect(r.lv?.leistungsverzeichnis.name).toBe('Rohbau (Stand Versand)');
  });

  it('ohne Einstellungen nur das Anlegen', async () => {
    const r = await uebernehmen(false);
    expect(r.befehle).toEqual(['LeistungsverzeichnisAnlegen']);
    expect(r.lv?.leistungsverzeichnis.preisspiegel).toBeUndefined();
  });
});
