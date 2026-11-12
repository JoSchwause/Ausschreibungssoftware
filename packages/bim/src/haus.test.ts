// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests mit dem Haus aus Ticket 99 (`fixtures/typisch-bim.json`, Lesarten D-99.5 bis D-99.12; C4): Mengenübernahme,
// Aufmaßblatt aus Auswahl, DIN 277, Kostenschätzung über Kennwerte, Modellvergleich und seine Folgen. Kein Sollwert wird hier
// gerechnet; die Fixture rechnet ihn aus der Geometrie, unabhängig von diesem Paket.

import { describe, expect, it } from 'vitest';
import type { IfcGlobalId } from '@tethys/vertrag';
import { aufmassAusAuswahl, bauteileImStrukturknoten, mengenuebernahmeBerechnen } from './index';
import { BIM, KENNUNG, hausModell, nachUebernahme, typischKnoten, zeileAusFixture } from './testhilfe/haus';
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
