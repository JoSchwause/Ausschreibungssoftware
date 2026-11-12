// SPDX-License-Identifier: AGPL-3.0-or-later
// Fortschritt aus dem Leistungsstand (Ticket 109 Punkt 3, Glossar „Vorgangsbezug“): zu einem Vorgang mit Bezug auf ein
// Auftrags-LV der Anteil Σ GP des Leistungsstands / Σ GP der bezogenen Positionen in Prozent, 2 Stellen, kaufmännisch
// gerundet (N2, N3), als Vorschlag für `ist.fortschritt`. Sollwerte von Hand gerechnet (Kommentare).

import type {
  AuftragsLeistungsverzeichnisId,
  AuftragsLvZustand,
  Betrag,
  GliederungId,
  Knoten,
  Leistungsstand,
  Menge,
  Position,
  PositionId,
  Summenstand,
  Vorgangsbezug,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { beispielAuftragsLv } from '../../vertrag/src/beispiele';
import { fortschrittVorschlagen } from './index';

const LV_ID = beispielAuftragsLv.id;
const VORLAGE = beispielAuftragsLv.knoten.find((k): k is Position => k.art === 'position');
if (VORLAGE === undefined) throw new Error('Beispiel ohne Position');

const gid = (id: string): GliederungId => id as GliederungId;
const pid = (id: string): PositionId => id as PositionId;
const titel = (id: string, elternId: string, reihenfolge: number): Knoten => ({
  art: 'titel',
  id: gid(id) as Extract<Knoten, { art: 'titel' }>['id'],
  elternId: elternId === 'lv' ? LV_ID : gid(elternId),
  reihenfolge,
  ordnungszahl: null,
  kurztext: id,
});
const position = (id: string, elternId: string, reihenfolge: number): Knoten => ({
  ...VORLAGE,
  id: pid(id),
  elternId: gid(elternId),
  reihenfolge,
});

/**
 * Auftrags-LV: T1 mit P1 (GP 1.000,00) und P2 (500,00); T2 mit T21 (darin P3, 300,00) und der Wahlposition P4 (200,00, geht
 * nicht in die Summe ein, F4).
 */
const AUFTRAGS_LV: AuftragsLvZustand = {
  auftragsLeistungsverzeichnis: {
    ...beispielAuftragsLv,
    knoten: [
      titel('T1', 'lv', 0),
      position('P1', 'T1', 0),
      position('P2', 'T1', 1),
      titel('T2', 'lv', 1),
      titel('T21', 'T2', 0),
      position('P3', 'T21', 0),
      position('P4', 'T2', 1),
    ],
  },
  summen: {
    positionen: [
      { positionId: pid('P1'), gesamtpreis: '1000.00' as Betrag, gehtInSummeEin: true },
      { positionId: pid('P2'), gesamtpreis: '500.00' as Betrag, gehtInSummeEin: true },
      { positionId: pid('P3'), gesamtpreis: '300.00' as Betrag, gehtInSummeEin: true },
      { positionId: pid('P4'), gesamtpreis: '200.00' as Betrag, gehtInSummeEin: false },
    ],
    gliederungen: [],
    gesamt: {} as Summenstand['gesamt'], // liest die Funktion nicht
  },
};

/** Leistungsstand: P1 250,00, P2 500,00 (fertig), P3 nicht aufgemessen, P4 80,00. */
function leistung(gp: Record<string, string>): Leistungsstand {
  const positionen = Object.entries(gp).map(([id, wert]) => ({
    positionId: pid(id),
    menge: '1.000' as Menge,
    gp: wert as Betrag,
  }));
  return {
    positionen,
    leistung: '0.00' as Betrag,
    nachlass: '0.00' as Betrag,
    nettoNachNachlass: '0.00' as Betrag,
  };
}
const STAND = leistung({ P1: '250.00', P2: '500.00', P3: '0.00', P4: '80.00' });

const bezug = (knotenIds: readonly string[] | null): Vorgangsbezug => ({
  art: 'auftrags-leistungsverzeichnis',
  id: LV_ID,
  knotenIds: knotenIds === null ? null : knotenIds.map((k) => (k.startsWith('P') ? pid(k) : gid(k))),
});

describe('fortschrittVorschlagen', () => {
  it.each<[string, readonly string[] | null, string | null]>([
    ['eine Position: 250 / 1.000', ['P1'], '25.00'],
    ['eine Gliederung steht für alle Positionen darunter: 750 / 1.500', ['T1'], '50.00'],
    ['eine Position unter einer genannten Gliederung zählt einmal', ['P2', 'T1'], '50.00'],
    ['verschachtelt, nur Positionen in der Summe (die Wahlposition zählt nicht): 0 / 300', ['T2'], '0.00'],
    ['das ganze LV: 750 / 1.800 = 41,666… → 41,67', null, '41.67'],
    ['nur eine Wahlposition: keine Soll-Summe, kein Vorschlag', ['P4'], null],
    ['ein Knoten, den es im LV nicht gibt, zählt nicht (schwacher Verweis)', ['P9'], null],
  ])('%s', (_, knotenIds, erwartet) => {
    expect(fortschrittVorschlagen(bezug(knotenIds), AUFTRAGS_LV, STAND)).toBe(erwartet);
  });

  it('kaufmännisch gerundet: 1 / 3 → 33,33, 2 / 3 → 66,67', () => {
    const lv: AuftragsLvZustand = {
      ...AUFTRAGS_LV,
      summen: {
        ...AUFTRAGS_LV.summen,
        positionen: [{ positionId: pid('P1'), gesamtpreis: '3.00' as Betrag, gehtInSummeEin: true }],
      },
    };
    expect(fortschrittVorschlagen(bezug(['P1']), lv, leistung({ P1: '1.00' }))).toBe('33.33');
    expect(fortschrittVorschlagen(bezug(['P1']), lv, leistung({ P1: '2.00' }))).toBe('66.67');
  });

  it('Mehrleistung über dem Soll wird auf 100,00 begrenzt, eine negative Leistung auf 0,00', () => {
    expect(fortschrittVorschlagen(bezug(['P1']), AUFTRAGS_LV, leistung({ P1: '1200.00' }))).toBe('100.00');
    expect(fortschrittVorschlagen(bezug(['P1']), AUFTRAGS_LV, leistung({ P1: '-10.00' }))).toBe('0.00');
  });

  it('eine Position ohne Zeile im Leistungsstand zählt mit 0,00', () => {
    expect(fortschrittVorschlagen(bezug(['T1']), AUFTRAGS_LV, leistung({ P2: '500.00' }))).toBe('33.33');
  });

  it('kein Vorschlag ohne Bezug, mit Bezug auf ein Ausschreibungs-LV oder auf ein anderes Auftrags-LV', () => {
    expect(fortschrittVorschlagen(null, AUFTRAGS_LV, STAND)).toBeNull();
    const ausschreibung: Vorgangsbezug = {
      art: 'leistungsverzeichnis',
      id: beispielAuftragsLv.leistungsverzeichnisId,
      knotenIds: null,
    };
    expect(fortschrittVorschlagen(ausschreibung, AUFTRAGS_LV, STAND)).toBeNull();
    const anderes: Vorgangsbezug = {
      art: 'auftrags-leistungsverzeichnis',
      id: 'anderes' as AuftragsLeistungsverzeichnisId,
      knotenIds: null,
    };
    expect(fortschrittVorschlagen(anderes, AUFTRAGS_LV, STAND)).toBeNull();
  });
});
