// SPDX-License-Identifier: AGPL-3.0-or-later
// Integrationstest ohne Oberfläche (Ticket 49, Punkte 4 und 5): GAEB-Wege der App mit echtem Kern, Speicher und
// vergabe. Alle Pakete dürfen hier eingebunden werden.

import { readFileSync } from 'node:fs';
import { lvBefehlAusfuehren, lvChangeSetAnwenden } from '@tethys/kern';
import { angebotSummenBerechnen } from '@tethys/vergabe';
import type { LvInhalt, LvZustand, Projekt, ProjektId, Summenstand } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { fixtureInhalt } from '../../e2e/fixture-inhalt';
import { befehlswegFuer } from '../lv/befehlsweg';
import { appIdQuelle } from '../lv/ids';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import {
  angebotAnlegenPlan,
  type Ausgabe,
  angebotLesen,
  befundeNachSchwere,
  bietersummen,
  dateinameAusgabe,
  lvAusgeben,
  lvLesen,
} from './gaeb';
import { texte } from './texte';

const wurzel = new URL('../../../../', import.meta.url);
const datei = (pfad: string): Uint8Array => new Uint8Array(readFileSync(new URL(pfad, wurzel)));
const AVA = 'fixtures/extern/bvbs/3.3-ava/BVBS_Pruefdatei_3.3_AVA_V-11-06-2021';
const jetzt = new Date(Date.UTC(2026, 10, 11, 9, 30, 15));

async function projektUndLv(inhalt: LvInhalt) {
  const u = testUmgebung(await speicherImSpeicher());
  const weg = befehlswegFuer(u);
  const p = await weg.projekt(null).befehl({
    art: 'ProjektAnlegen',
    id: u.ids.projekt(),
    name: 'Test',
    bauherr: { name: 'Kreis', anschrift: null },
  });
  if (!p.ok || p.zustand === null) throw new Error('Projekt');
  const projekt: Projekt = p.zustand;
  const s = weg.lv(projekt.id, null);
  const a = await s.befehl({
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: projekt.id,
    inhalt,
  });
  if (!a.ok || s.zustand === null) throw new Error('LV');
  return { u, weg, projekt, lv: s.zustand };
}

function lvZustand(inhalt: LvInhalt): LvZustand {
  const r = lvBefehlAusfuehren(null, {
    art: 'LeistungsverzeichnisAnlegen',
    id: inhalt.wurzelId,
    projektId: 'p' as ProjektId,
    inhalt,
  });
  if (!r.ok) throw new Error(r.fehler.meldung);
  const z = lvChangeSetAnwenden(null, r.wert);
  if (z === null) throw new Error('LV');
  return z;
}

const gliederungSumme = (s: Summenstand, id: string): string | undefined =>
  s.gliederungen.find((g) => g.gliederungId === id)?.summe;

describe('LV einlesen (X81)', () => {
  const v = lvLesen(datei(`${AVA}.X81`), 'BVBS_Pruefdatei_3.3_AVA_V-11-06-2021.X81', appIdQuelle());

  it('zählt Gliederungen, Positionen und Hinweistexte (Ticket 22) und liefert Befunde', () => {
    expect(v.phase).toBe('X81');
    expect(v.version).toBe('3.3');
    expect(v.anzahl).toEqual({ gliederungen: 22, positionen: 74, hinweistexte: 14 });
    expect(v.uebernehmbar).toBe(true);
    expect(v.befunde.length).toBeGreaterThan(0);
  });

  it('gruppiert die Befunde nach Schwere, nichts geht verloren (Q5)', () => {
    const g = befundeNachSchwere(v.befunde);
    expect(g.fehler.length + g.warnungen.length).toBe(v.befunde.length);
  });

  it('eine Datei ohne Inhalt zeigt Befunde und ist nicht übernehmbar', () => {
    const leer = lvLesen(new TextEncoder().encode('kein xml'), 'x.x83', appIdQuelle());
    expect(leer.uebernehmbar).toBe(false);
    expect(leer.befunde.length).toBeGreaterThan(0);
  });
});

describe('BVBS AVA: X81 und X84 einlesen, Bietersummen mit vergabe', () => {
  it('1.30.20 = 1.790,00, 1.30.30 = 819,10, 1.30.10 = 1.500,00, Hauptgruppe 3 = 12.000,00', async () => {
    const gelesen = lvLesen(datei(`${AVA}.X81`), 'ava.X81', appIdQuelle());
    if (gelesen.inhalt === null) throw new Error('Inhalt');
    const { u, projekt, lv } = await projektUndLv(gelesen.inhalt);
    const x84 = angebotLesen(datei(`${AVA}.X84`), 'ava.X84', lv, u.ids);
    expect(x84.uebernehmbar).toBe(true);
    expect(x84.bieterName).toBe('Maler + Lackierer Pinsel und Co KG');
    const plan = angebotAnlegenPlan(x84, x84.bieterName, projekt, u.ids);
    if (plan === null) throw new Error('Plan');
    expect(plan.neuerBieter).not.toBeNull();
    const s = angebotSummenBerechnen(lv, plan.angebot);
    const id = (oz: string): string => {
      const k = lv.leistungsverzeichnis.knoten.find((n) => 'ordnungszahl' in n && n.ordnungszahl === oz);
      if (k === undefined) throw new Error(`OZ ${oz}`);
      return k.id;
    };
    expect(gliederungSumme(s, id('1.30.20'))).toBe('1790.00');
    expect(gliederungSumme(s, id('1.30.30'))).toBe('819.10');
    expect(gliederungSumme(s, id('1.30.10'))).toBe('1500.00');
    expect(gliederungSumme(s, id('3'))).toBe('12000.00');
    const b = bietersummen(lv, plan.angebot);
    expect(b.netto).toBe(s.gesamt.netto);
    // Gesamtsumme der amtlichen Prüfdatei mit den Preisen des Bieters (Messwert, siehe Comments von Ticket 49).
    expect({ netto: b.netto, nettoNachNachlass: b.nettoNachNachlass, brutto: b.brutto }).toEqual({
      netto: '1421024428.85',
      nettoNachNachlass: '1421024428.85',
      brutto: '1691019070.33',
    });
  });

  it('eine X81 statt eines Angebots: die Abweisung nennt alle lesbaren Formate der X84 (PB2)', async () => {
    const gelesen = lvLesen(datei(`${AVA}.X81`), 'ava.X81', appIdQuelle());
    if (gelesen.inhalt === null) throw new Error('Inhalt');
    const { u, lv } = await projektUndLv(gelesen.inhalt);
    const falsch = angebotLesen(datei(`${AVA}.X81`), 'ava.X81', lv, u.ids);
    expect(falsch.uebernehmbar).toBe(false);
    expect(texte.angebot.keinX84(falsch.phase, falsch.version)).toBe(
      'Erwartet wird eine Angebotsabgabe (X84) als GAEB DA XML 3.1, 3.2 oder 3.3, GAEB 90 oder GAEB 2000; die Datei gehört zur Phase X81 (Version 3.3).',
    );
  });

  it('ein vorhandener Bieter gleichen Namens wird wiederverwendet, kein neuer angelegt', async () => {
    const gelesen = lvLesen(datei(`${AVA}.X81`), 'ava.X81', appIdQuelle());
    if (gelesen.inhalt === null) throw new Error('Inhalt');
    const { u, projekt, lv } = await projektUndLv(gelesen.inhalt);
    const x84 = angebotLesen(datei(`${AVA}.X84`), 'ava.X84', lv, u.ids);
    const mit: Projekt = {
      ...projekt,
      bieter: [{ id: u.ids.bieter(), name: ' maler + lackierer pinsel und co kg ' }],
    };
    const plan = angebotAnlegenPlan(x84, 'Maler + Lackierer Pinsel und Co KG', mit, u.ids);
    expect(plan?.neuerBieter).toBeNull();
    expect(plan?.angebot.bieterId).toBe(mit.bieter[0]?.id);
  });

  it('ein neuer Bieter bringt die Angaben aus der X84 mit; gespeichert und wieder geladen', async () => {
    const gelesen = lvLesen(datei(`${AVA}.X81`), 'ava.X81', appIdQuelle());
    if (gelesen.inhalt === null) throw new Error('Inhalt');
    const { u, weg, projekt, lv } = await projektUndLv(gelesen.inhalt);
    const x84 = angebotLesen(datei(`${AVA}.X84`), 'ava.X84', lv, u.ids);
    // Abgeschrieben aus `CTR/Address` der Prüfdatei.
    const angaben = {
      anschrift: { strasse: 'Auswegstr. 33', plz: '12345', ort: 'Musterstadt' },
      ansprechperson: 'Klecks',
      email: 'pinsel@ildfh.de',
      telefon: '1234 / 11223',
    };
    expect(x84.bieterAngaben).toEqual(angaben);
    // Auch unter einem geänderten Namen gehören die Angaben zum Bieter der Datei.
    const plan = angebotAnlegenPlan(x84, 'Pinsel und Co KG', projekt, u.ids);
    expect(plan?.neuerBieter).toEqual({
      id: expect.any(String) as string,
      name: 'Pinsel und Co KG',
      angaben,
    });
    if (plan === null) throw new Error('Plan');
    expect((await weg.angebotAnlegen(projekt, lv, plan.neuerBieter, plan.angebot)).ok).toBe(true);
    const p = await u.speicher.projekte.laden(projekt.id);
    expect(p.ok && p.wert.bieter).toEqual([{ id: plan.neuerBieter?.id, name: 'Pinsel und Co KG', angaben }]);
  });

  it('ein vorhandener Bieter behält seine Angaben (kein Überschreiben)', async () => {
    const gelesen = lvLesen(datei(`${AVA}.X81`), 'ava.X81', appIdQuelle());
    if (gelesen.inhalt === null) throw new Error('Inhalt');
    const { u, projekt, lv } = await projektUndLv(gelesen.inhalt);
    const x84 = angebotLesen(datei(`${AVA}.X84`), 'ava.X84', lv, u.ids);
    const vorhanden = { id: u.ids.bieter(), name: 'Maler + Lackierer Pinsel und Co KG' };
    const plan = angebotAnlegenPlan(x84, vorhanden.name, { ...projekt, bieter: [vorhanden] }, u.ids);
    expect(plan?.neuerBieter).toBeNull();
    expect(plan?.angebot.bieterId).toBe(vorhanden.id);
  });

  it('Angebot anlegen: Bieter und Angebot sind ein Undo-Schritt', async () => {
    const gelesen = lvLesen(datei(`${AVA}.X81`), 'ava.X81', appIdQuelle());
    if (gelesen.inhalt === null) throw new Error('Inhalt');
    const { u, weg, projekt, lv } = await projektUndLv(gelesen.inhalt);
    const x84 = angebotLesen(datei(`${AVA}.X84`), 'ava.X84', lv, u.ids);
    const plan = angebotAnlegenPlan(x84, x84.bieterName, projekt, u.ids);
    if (plan === null) throw new Error('Plan');
    const tiefe = weg.historie.tiefe.rueck;
    const a = await weg.angebotAnlegen(projekt, lv, plan.neuerBieter, plan.angebot);
    expect(a.ok).toBe(true);
    expect(weg.historie.tiefe.rueck).toBe(tiefe + 1);
    expect((await u.speicher.angebote.auflisten(lv.leistungsverzeichnis.id)).ok).toBe(true);
    const liste = await u.speicher.angebote.auflisten(lv.leistungsverzeichnis.id);
    expect(liste.ok && liste.wert.length).toBe(1);
    expect((await weg.rueckgaengig()).ok).toBe(true);
    const leer = await u.speicher.angebote.auflisten(lv.leistungsverzeichnis.id);
    expect(leer.ok && leer.wert.length).toBe(0);
    const p = await u.speicher.projekte.laden(projekt.id);
    expect(p.ok && p.wert.bieter.length).toBe(0);
  });
});

describe('Ausgabe', () => {
  it('Dateiname trägt _Entwurf nur bei Entwurf', () => {
    expect(dateinameAusgabe('Rohbau / 1', 'X83', false)).toBe('Rohbau 1.x83');
    expect(dateinameAusgabe('Rohbau', 'X86', true)).toBe('Rohbau_Entwurf.x86');
  });

  /**
   * `typisch` ohne die Wahlkennzeichnung ohne Gruppe und Variante, die der Writer nicht schreiben kann (Warnung
   * `export-verworfen`, E-11; erwarteter Unterschied aus Ticket 40). Die Zuschlagsposition 02.0050 A steht seit
   * Ticket 51 in GAEB-Form (Satz 8,50 %, Liste) und läuft mit durch den Rundweg (Fixture-Format, mechanisch).
   */
  function typischOhneWahlnummer(): LvInhalt {
    const inhalt = fixtureInhalt('typisch');
    const knoten = inhalt.knoten.map((k) =>
      k.art === 'position' && k.merkmale.wahl !== null
        ? { ...k, merkmale: { ...k.merkmale, wahl: null } }
        : k,
    );
    return { ...inhalt, knoten };
  }

  /** Schreiben, lesen, wieder anlegen: der Kern rechnet die Summen des gelesenen LV neu. */
  function rundweg(zustand: LvZustand, phase: 'X83' | 'X86'): { aus: Ausgabe; z2: LvZustand } {
    const aus = lvAusgeben(zustand, phase, '3.3', jetzt);
    expect(aus.entwurf).toBe(false);
    expect(aus.befunde.filter((b) => b.schwere === 'fehler')).toEqual([]);
    const zurueck = lvLesen(new TextEncoder().encode(aus.xml), aus.dateiname, appIdQuelle());
    if (zurueck.inhalt === null) throw new Error('Inhalt');
    return { aus, z2: lvZustand(zurueck.inhalt) };
  }

  it('Roundtrip: typisch als X83 3.3 ausgeben, wieder einlesen, gleiche Struktur, Mengen und Texte', () => {
    const zustand = lvZustand(typischOhneWahlnummer());
    const { aus, z2 } = rundweg(zustand, 'X83');
    expect(aus.dateiname).toBe('Typisch Musterhaus erfunden.x83');
    const form = (z: LvZustand) =>
      z.leistungsverzeichnis.knoten.map((k) =>
        k.art === 'position'
          ? [k.ordnungszahl, k.kurztext, k.menge, k.einheit]
          : [k.art, 'ordnungszahl' in k ? k.ordnungszahl : null],
      );
    expect(form(z2)).toEqual(form(zustand));
    // X83 trägt keine Preise: die Summen des gelesenen LV sind null.
    expect(z2.summen.gesamt.netto).toBe('0.00');
  });

  it('Roundtrip: typisch als X86 3.3 ausgeben (mit Preisen), wieder einlesen, gleiche Summen', () => {
    const zustand = lvZustand(typischOhneWahlnummer());
    const { z2 } = rundweg(zustand, 'X86');
    expect(z2.summen.gesamt.netto).toBe(zustand.summen.gesamt.netto);
    expect(z2.summen.gesamt.brutto).toBe(zustand.summen.gesamt.brutto);
    expect(z2.summen.gliederungen.map((g) => g.summe)).toEqual(
      zustand.summen.gliederungen.map((g) => g.summe),
    );
    // Ticket 51: 02.0050 A kommt mit Satz 8,50 % zurück, Betrag 6.544,88 × 8,50 % = 556,31 (fixtures/typisch.json)
    const zuschlag = z2.leistungsverzeichnis.knoten.find((k) => k.art === 'position' && k.zuschlag !== null);
    expect(zuschlag?.art === 'position' && zuschlag.zuschlag?.prozentsatz).toBe('8.50');
    expect(z2.summen.positionen.find((p) => p.positionId === zuschlag?.id)?.gesamtpreis).toBe('556.31');
  });

  it('eine Einheit über 4 Zeichen macht den Export zum Entwurf, er geschieht trotzdem (G-13)', () => {
    const inhalt = fixtureInhalt('typisch');
    const knoten = inhalt.knoten.map((k) => (k.art === 'position' ? { ...k, einheit: 'Stunden' } : k));
    const aus = lvAusgeben(lvZustand({ ...inhalt, knoten }), 'X83', '3.3', jetzt);
    expect(aus.entwurf).toBe(true);
    expect(aus.dateiname).toMatch(/_Entwurf\.x83$/);
    expect(aus.xml.length).toBeGreaterThan(100);
  });

  it('X86 trägt Datum, Uhrzeit der App, Summenstand und Zuschlagsbasen des Kerns', () => {
    const v = lvLesen(datei(`${AVA}.X81`), 'ava.X81', appIdQuelle());
    if (v.inhalt === null) throw new Error('Inhalt');
    const aus = lvAusgeben(lvZustand(v.inhalt), 'X86', '3.3', jetzt);
    expect(aus.xml).toContain('<Date>2026-11-11</Date>');
    expect(aus.xml).toContain('<Time>09:30:15</Time>');
    expect(aus.xml).toContain('ITMarkup');
  });

  it('X86 behält EPA-Bezeichnungen und Auftragnehmer des LV (Q5, S5): lesen, ausgeben, wieder lesen', () => {
    const v = lvLesen(datei(`${AVA}.X86`), 'ava.X86', appIdQuelle());
    if (v.inhalt === null) throw new Error('Inhalt');
    // Vorbedingung: die Prüfdatei trägt beides, sonst prüfte der Test nichts.
    expect(v.inhalt.epaBezeichnungen?.length ?? 0).toBeGreaterThan(0);
    expect(v.inhalt.auftragnehmer?.name ?? '').not.toBe('');
    const zustand = lvZustand(v.inhalt);
    const aus = lvAusgeben(zustand, 'X86', '3.3', jetzt);
    const zurueck = lvLesen(new TextEncoder().encode(aus.xml), aus.dateiname, appIdQuelle());
    expect(zurueck.inhalt?.epaBezeichnungen).toEqual(v.inhalt.epaBezeichnungen);
    expect(zurueck.inhalt?.auftragnehmer).toEqual(v.inhalt.auftragnehmer);
  });
});
