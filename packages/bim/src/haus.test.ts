// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests mit dem Haus aus Ticket 99 (`fixtures/typisch-bim.json`, Lesarten D-99.5 bis D-99.12; C4): Mengenübernahme,
// Aufmaßblatt aus Auswahl, DIN 277, Kostenschätzung über Kennwerte, Modellvergleich und seine Folgen. Kein Sollwert wird hier
// gerechnet; die Fixture rechnet ihn aus der Geometrie, unabhängig von diesem Paket.

import { describe, expect, it } from 'vitest';
import type { Bauteil, Bauwerksmodell, IfcGlobalId, KostenermittlungId, ProjektId } from '@tethys/vertrag';
import {
  aufmassAusAuswahl,
  bauteileImStrukturknoten,
  din277Berechnen,
  kostenschaetzungBerechnen,
  mengenuebernahmeBerechnen,
  modellVergleichen,
  vergleichsfolgenBerechnen,
  zuordnungenPruefen,
} from './index';
import {
  BIM,
  KENNUNG,
  betrag,
  hausModell,
  kg,
  nachUebernahme,
  typischKnoten,
  zeileAusFixture,
} from './testhilfe/haus';
import type { FxVordersatz } from './testhilfe/haus';

const v1 = hausModell('v1');
const v2 = hausModell('v2');
const typisch = typischKnoten();

const sollVordersatz = (v: FxVordersatz) => ({
  positionId: v.positionId,
  zeilen: v.mengenansatz.map(zeileAusFixture),
  menge: v.menge,
});

describe('Mengenübernahme (Tor X1-Kern, D-99.5)', () => {
  it('ergibt mit v1 die Vordersätze der Fixture, ohne Befund', () => {
    const u = mengenuebernahmeBerechnen(typisch, v1);
    expect(u.positionen.map((p) => ({ positionId: p.positionId, zeilen: p.zeilen, menge: p.menge }))).toEqual(
      BIM.kern.vordersaetze.map(sollVordersatz),
    );
    expect(u.befunde).toEqual([]);
    expect(u.positionen.every((p) => p.geaendert)).toBe(true);
  });

  it('„Mengen aktualisieren“ mit v2 nach der Übernahme mit v1 (D-99.12): Vordersätze und Befund der Fixture', () => {
    const lv = nachUebernahme(typisch, BIM.kern.vordersaetze);
    const u = mengenuebernahmeBerechnen(lv, v2);
    const soll = BIM.erweitert.mengenAktualisieren;
    expect(u.positionen.map((p) => ({ positionId: p.positionId, zeilen: p.zeilen, menge: p.menge }))).toEqual(
      soll.vordersaetze.map(sollVordersatz),
    );
    expect(
      u.befunde.map((b) => ({
        positionId: b.ort.knotenId,
        art: b.code,
        globalId: b.ort.globalId,
        kennung: KENNUNG.get(b.ort.globalId ?? ''),
      })),
    ).toEqual(
      soll.befunde.map(({ positionId, art, globalId, kennung }) => ({ positionId, art, globalId, kennung })),
    );
    expect(u.positionen.filter((p) => p.geaendert).map((p) => p.positionId)).toEqual(
      BIM.erweitert.betroffenePositionen.map((p) => p.positionId),
    );
  });
});

describe('Aufmaßblatt aus Auswahl (D-99.9)', () => {
  it('Auswahl „Geschoss EG“ auf v1 ergibt die Aufmaßpositionen der Fixture', () => {
    const soll = BIM.erweitert.aufmassAusAuswahl;
    const auswahl = bauteileImStrukturknoten(v1, soll.auswahl.globalId as IfcGlobalId);
    expect(auswahl).toHaveLength(17);
    const a = aufmassAusAuswahl(typisch, v1, auswahl);
    expect(
      a.positionen.map((p) => ({
        positionId: p.positionId,
        bauteile: p.bauteile,
        zeilen: p.zeilen,
        menge: p.menge,
      })),
    ).toEqual(soll.positionen.map((p) => ({ ...sollVordersatz(p), bauteile: p.bauteile })));
    expect(a.befunde).toEqual([]);
  });
});

describe('DIN 277 (D-99.7)', () => {
  it('ergibt aus v1 BGF, BRI und NRF der Fixture, Quelle Modell, ohne Befund', () => {
    const d = din277Berechnen(v1);
    const soll = BIM.erweitert.din277.summen;
    expect([d.bgf, d.bri, d.nrf]).toEqual([
      { art: 'BGF', wert: soll.bgf, quelle: 'modell' },
      { art: 'BRI', wert: soll.bri, quelle: 'modell' },
      { art: 'NRF', wert: soll.nrf, quelle: 'modell' },
    ]);
    expect(d.befunde).toEqual([]);
  });
});

describe('Kostenschätzung über Kennwerte (D-99.10)', () => {
  it('ergibt aus BGF von v1 und den Kennwerten der Fixture deren Einträge und Gesamtbetrag', () => {
    const soll = BIM.erweitert.kostenschaetzung;
    const groessen = din277Berechnen(v1);
    expect(groessen.bgf.wert).toBe(soll.bezugsgroesse.wert);
    const s = kostenschaetzungBerechnen({
      id: 'ke-haus' as KostenermittlungId,
      projektId: 'projekt-1' as ProjektId,
      name: 'Kostenschätzung aus dem Modell',
      groessen,
      kennwerte: soll.kennwerte.map((k) => ({
        kostengruppe: kg(k.nummer),
        bezug: 'BGF' as const,
        kennwert: betrag(k.kennwert),
      })),
    });
    expect(s.befehl.kostenermittlung.stufe).toBe(soll.stufe);
    expect(
      s.befehl.kostenermittlung.eintraege.map(({ nummer, betrag: b }) => ({ nummer, betrag: b })),
    ).toEqual(soll.eintraege.map(({ nummer, betrag: b }) => ({ nummer, betrag: b })));
    expect(s.gesamt).toBe(soll.gesamt);
    expect(s.befunde).toEqual([]);
  });
});

/** Name des Strukturknotens (Geschoss) zu einer GlobalId, wie die Fixture ihn nennt (D-99.8). */
const knotenname = (bm: Bauwerksmodell, id: IfcGlobalId | null): string | null =>
  bm.struktur.find((k) => k.globalId === id)?.name ?? null;
const listeneintrag = (bm: Bauwerksmodell) => (b: Bauteil) => ({
  globalId: b.globalId,
  kennung: KENNUNG.get(b.globalId),
  klasse: b.ifcKlasse,
  name: b.name,
  geschoss: knotenname(bm, b.strukturGlobalId),
});

describe('Modellvergleich v1 → v2 (D-99.8)', () => {
  it('ergibt hinzugefügt, entfernt und geändert wie die Fixture, ohne Befund', () => {
    const v = modellVergleichen(v1, v2);
    const soll = BIM.erweitert.vergleich;
    expect(v.hinzugefuegt.map(listeneintrag(v2))).toEqual(soll.hinzugefuegt);
    expect(v.entfernt.map(listeneintrag(v1))).toEqual(soll.entfernt);
    expect(
      v.geaendert.map((a) => ({
        globalId: a.globalId,
        kennung: KENNUNG.get(a.globalId),
        felder: a.felder,
        ...(a.felder.includes('name') ? { name: { vorher: a.vorher.name, nachher: a.nachher.name } } : {}),
        ...(a.felder.includes('strukturknoten')
          ? {
              strukturknoten: {
                vorher: knotenname(v1, a.vorher.strukturGlobalId),
                nachher: knotenname(v2, a.nachher.strukturGlobalId),
              },
            }
          : {}),
        ...(a.felder.includes('mengen')
          ? {
              mengen: a.mengen.map((q) => ({
                name: q.name,
                vorher: q.vorher?.wert,
                nachher: q.nachher?.wert,
              })),
            }
          : {}),
      })),
    ).toEqual(soll.geaendert);
    expect(v.anzahlUnveraendert).toBe(v1.bauteile.length - soll.entfernt.length - soll.geaendert.length);
    expect(v.befunde).toEqual([]);
  });

  it('betroffene Positionen: Menge laut v1 und v2 und Differenz wie die Fixture', () => {
    const f = vergleichsfolgenBerechnen(typisch, v1, v2);
    expect(
      f.positionen
        .filter((p) => p.betroffen)
        .map(({ positionId, vorher, nachher, differenz }) => ({ positionId, vorher, nachher, differenz })),
    ).toEqual(
      BIM.erweitert.betroffenePositionen.map(({ positionId, vorher, nachher, differenz }) => ({
        positionId,
        vorher,
        nachher,
        differenz,
      })),
    );
    expect(f.positionen).toHaveLength(BIM.zuordnungen.length);
  });
});

describe('Modellprüfung (D-99.13)', () => {
  it('v1: keine Befunde; ohne Zuordnung bleiben 15 Bauteile (Fenster, Trockenbau, Außenwände OG, Decken, Haustür)', () => {
    const p = zuordnungenPruefen(typisch, v1);
    expect(p.befunde).toEqual([]);
    // D-99.13: sechs Fenster, Haustür, Geschoss- und Dachdecke, Außenwände des OG, Trockenbauwände des OG.
    expect(p.ohneZuordnung.map((id) => KENNUNG.get(id)).sort()).toEqual(
      [
        ...['F-EG-S', 'F-EG-N', 'F-EG-W', 'F-OG-S', 'F-OG-F', 'F-OG-N'],
        'T-EG-H',
        ...['DE-OG', 'DA-OG'],
        ...['AW-OG-S', 'AW-OG-N', 'AW-OG-W', 'AW-OG-O'],
        ...['IW-OG-1', 'IW-OG-2'],
      ].sort(),
    );
    const stelle = p.ohneZuordnung.map((id) => v1.bauteile.findIndex((b) => b.globalId === id));
    expect(stelle).toEqual([...stelle].sort((a, b) => a - b));
  });

  it('v2: die hängende Zuordnung IW-EG-3 an 03.0010; das neue IW-EG-4 bleibt ohne Zuordnung (D-99.12)', () => {
    const p = zuordnungenPruefen(typisch, v2);
    expect(p.befunde.map((b) => [b.code, KENNUNG.get(b.ort.globalId ?? '')])).toEqual([
      ['bauteil-fehlt', 'IW-EG-3'],
    ]);
    expect(p.ohneZuordnung.map((id) => KENNUNG.get(id))).toContain('IW-EG-4');
  });
});
