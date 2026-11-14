// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 150: Projektdatei einlesen mit Übernahme der Einstellungen (D-84) und als Kopie, wenn das Projekt schon da ist (E8).
import { describe, expect, it } from 'vitest';
import { EinstellungenSitzung } from '../historie/einstellungen';
import { befehlswegFuer, type Umgebung } from '../lv/befehlsweg';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { projektAnlegenBefehl } from './befehle';
import { berichtZeilen, projektdateiEinlesen, projektnameDerDatei } from './einlesen';

const BUERO = { name: 'Planungsbüro Muster', anschrift: null, telefon: null, email: null };

async function geraet(): Promise<{ u: Umgebung; s: EinstellungenSitzung }> {
  const u = testUmgebung(await speicherImSpeicher());
  const s = new EinstellungenSitzung(u);
  await s.laden();
  return { u, s };
}

/** Ein Gerät mit Büro, einem eigenen Profil und einem Projekt; dessen gesicherte Projektdatei. */
async function sicherung(): Promise<{ u: Umgebung; s: EinstellungenSitzung; datei: string }> {
  const { u, s } = await geraet();
  await s.befehl({ art: 'BueroSetzen', buero: BUERO });
  await s.befehl({
    art: 'KostengruppenbezeichnungenSetzen',
    bezeichnungen: [{ nummer: '330' as never, bezeichnung: 'Außenwände' }],
  });
  const a = await befehlswegFuer(u).projekt(null).befehl(projektAnlegenBefehl(u.ids, 'Schule', 'Stadt'));
  if (!a.ok || a.zustand === null) throw new Error('Projekt nicht angelegt');
  const r = await u.speicher.projektdateiExportieren(a.zustand.id);
  if (!r.ok) throw new Error(r.fehler.meldung);
  return { u, s, datei: r.wert };
}

describe('Projektdatei einlesen', () => {
  it('auf einem anderen Gerät: übernimmt die Einstellungen der Datei und protokolliert das', async () => {
    const { datei } = await sicherung();
    const { u, s } = await geraet();
    await s.befehl({ art: 'BueroSetzen', buero: { ...BUERO, name: 'Eigenes Büro' } });
    const r = await projektdateiEinlesen(u, datei);
    if (!r.ok) throw new Error(r.fehler.meldung);
    expect(r.wert.einstellungen).toEqual({
      uebernommen: [{ art: 'kostengruppenbezeichnung', nummer: '330' }],
      belassen: [{ art: 'buero' }],
    });
    expect(berichtZeilen(r.wert.einstellungen)).toEqual({
      uebernommen: ['Bezeichnung der Kostengruppe 330'],
      belassen: ['Büro (Absender)'],
    });
    const p = await u.speicher.einstellungen?.protokoll();
    expect(p?.ok && p.wert.map((e) => e.befehl.art)).toEqual(['BueroSetzen', 'EinstellungenUebernehmen']);
  });

  it('ein vorhandenes Projekt: abgewiesen, als Kopie mit neuem Namen eingelesen; das Original bleibt', async () => {
    const { u, datei } = await sicherung();
    expect(projektnameDerDatei(datei)).toBe('Schule');
    const r = await projektdateiEinlesen(u, datei);
    expect(r.ok || r.fehler.code).toBe('existiert-bereits');
    const k = await projektdateiEinlesen(u, datei, 'Schule (Kopie)');
    if (!k.ok) throw new Error(k.fehler.meldung);
    // Alles war schon da: nichts übernommen, alles belassen.
    expect(k.wert.einstellungen?.uebernommen).toEqual([]);
    const liste = await u.speicher.projekte.auflisten();
    expect(liste.ok && liste.wert.map((p) => p.name).sort()).toEqual(['Schule', 'Schule (Kopie)']);
  });

  it('eine Datei, die sich nicht lesen lässt, hat keinen Namen', () => {
    expect(projektnameDerDatei('kein json')).toBeNull();
    expect(projektnameDerDatei('{"projekt":{}}')).toBeNull();
    expect(berichtZeilen(null)).toBeNull();
  });
});
