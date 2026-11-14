// SPDX-License-Identifier: AGPL-3.0-or-later
// Übernahme der Druckprofile und Kostengruppenbezeichnungen aus dem Browserspeicher (Ticket 150; D-73, D-82 S8): einmalig, nur
// solange das Einstellungsprotokoll leer ist, als protokollierte Befehle; die alten Schlüssel bleiben.
import * as ausgabe from '@tethys/ausgabe';
import { describe, expect, it } from 'vitest';
import { PROFILE_SCHLUESSEL } from '../ausgabe/profile';
import { EinstellungenSitzung } from '../historie/einstellungen';
import { BEZEICHNUNGEN_SCHLUESSEL } from '../kosten/bezeichnungen';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { browserablageUebernehmen } from './browserablage';

function ablage(eintraege: Record<string, string>) {
  const m = new Map(Object.entries(eintraege));
  return { m, getItem: (k: string) => m.get(k) ?? null };
}

const werkzeug = () => Promise.resolve(ausgabe);
const profil = (name: string) => ({ ...ausgabe.neuesDruckprofil(name), mitPreisen: false });

async function sitzung(): Promise<EinstellungenSitzung> {
  const s = new EinstellungenSitzung(testUmgebung(await speicherImSpeicher()));
  await s.laden();
  return s;
}

async function protokoll(s: EinstellungenSitzung): Promise<string[]> {
  const p = await s.umgebung.speicher.einstellungen?.protokoll();
  if (!p?.ok) throw new Error('kein Protokoll');
  return p.wert.map((e) => e.befehl.art);
}

describe('Übernahme aus dem Browserspeicher', () => {
  it('übernimmt eigene Druckprofile und die Bezeichnungen der CSV; die alten Schlüssel bleiben', async () => {
    const s = await sitzung();
    const standard = ausgabe.STANDARD_DRUCKPROFILE[0]?.name ?? '';
    const a = ablage({
      [PROFILE_SCHLUESSEL]: JSON.stringify([profil('Bieter eng'), 42, profil(standard), profil('Kurz')]),
      [BEZEICHNUNGEN_SCHLUESSEL]: 'Nummer;Bezeichnung\n340;Innenwände\n330;Außenwände\nkaputt;x\n',
    });
    const r = await browserablageUebernehmen(s, a, werkzeug);
    expect(r).toEqual({ druckprofile: 2, kostengruppenbezeichnungen: 2 });
    expect(s.zustand.druckprofile.map((p) => p.name)).toEqual(['Bieter eng', 'Kurz']);
    expect(s.zustand.kostengruppenbezeichnungen).toEqual([
      { nummer: '330', bezeichnung: 'Außenwände' },
      { nummer: '340', bezeichnung: 'Innenwände' },
    ]);
    expect(await protokoll(s)).toEqual(['DruckprofilSetzen', 'DruckprofilSetzen', 'KostengruppenbezeichnungenSetzen']);
    // Die Übernahme ist kein Schritt, den der Nutzer zurücknimmt.
    expect(s.kannRueckgaengig).toBe(false);
    expect(a.m.size).toBe(2);
  });

  it('nur solange das Einstellungsprotokoll leer ist: danach nie wieder, auch wenn die Einstellungen leer sind', async () => {
    const s = await sitzung();
    await s.befehl({ art: 'BueroSetzen', buero: { name: 'Büro', anschrift: null, telefon: null, email: null } });
    await s.rueckgaengig();
    const a = ablage({ [PROFILE_SCHLUESSEL]: JSON.stringify([profil('Bieter eng')]) });
    expect(await browserablageUebernehmen(s, a, werkzeug)).toEqual({ druckprofile: 0, kostengruppenbezeichnungen: 0 });
    expect(s.zustand.druckprofile).toEqual([]);
  });

  it('ohne alte Schlüssel oder ohne Browserspeicher geschieht nichts, und das Paket für den Druck wird nicht geladen', async () => {
    const s = await sitzung();
    let geladen = false;
    const w = () => {
      geladen = true;
      return Promise.resolve(ausgabe);
    };
    expect(await browserablageUebernehmen(s, ablage({}), w)).toEqual({ druckprofile: 0, kostengruppenbezeichnungen: 0 });
    expect(await browserablageUebernehmen(s, null, w)).toEqual({ druckprofile: 0, kostengruppenbezeichnungen: 0 });
    const gesperrt = {
      getItem: () => {
        throw new Error('gesperrt');
      },
    };
    expect(await browserablageUebernehmen(s, gesperrt, w)).toEqual({ druckprofile: 0, kostengruppenbezeichnungen: 0 });
    expect(geladen).toBe(false);
    expect(await protokoll(s)).toEqual([]);
  });
});
