// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type {
  Betrag,
  ElternId,
  LvSpalte,
  LvZeile,
  Menge,
  Ordnungszahl,
  OzMaske,
  PositionId,
} from '@tethys/vertrag';
import { zahlenAttrappe } from '../e2e/harness/attrappen';
import {
  STANDARDBREITE,
  gemerkteBreitenLesen,
  geaenderteBreite,
  mindestbreiten,
  wirksameBreiten,
} from './spaltenbreiten';

function position(oz: string, index: string | null, menge: string | null = null): LvZeile {
  return {
    knoten: {
      art: 'position',
      id: `p-${oz}${index ?? ''}` as PositionId,
      elternId: 't' as ElternId,
      reihenfolge: 0,
      ordnungszahl: oz as Ordnungszahl,
      ozIndex: index,
      merkmale: {
        bedarf: null,
        wahl: null,
        stundenlohn: false,
        pauschal: false,
        zuschlagskennzeichen: false,
      },
      zuschlag: null,
      kurztext: 'Bauzaun',
      langtext: [],
      menge: menge as Menge | null,
      einheit: 'm',
      einheitspreis: null,
      epa: null,
    },
    tiefe: 1,
    hatUnterknoten: false,
    aufgeklappt: false,
    summe: '1.00' as Betrag,
    gehtInSummeEin: true,
    befunde: [],
  };
}

const maske = (stufen: readonly number[], position: number, index: boolean): OzMaske => ({
  gliederung: stufen.map((laenge) => ({ laenge, zeichen: 'numerisch' as const })),
  position: { laenge: position, zeichen: 'numerisch' },
  index: index ? { laenge: 1, zeichen: 'alphanumerisch' } : null,
  trennzeichen: '.',
});

describe('Mindestbreite der OZ-Spalte', () => {
  it('wächst mit der Maske samt Index', () => {
    const kurz = mindestbreiten([], zahlenAttrappe, maske([2], 4, false)).ordnungszahl ?? 0;
    const mitIndex = mindestbreiten([], zahlenAttrappe, maske([2], 4, true)).ordnungszahl ?? 0;
    const lang = mindestbreiten([], zahlenAttrappe, maske([3, 3], 5, true)).ordnungszahl ?? 0;
    expect(kurz).toBeGreaterThan(0);
    expect(mitIndex).toBeGreaterThan(kurz);
    expect(lang).toBeGreaterThan(mitIndex);
  });

  it('ohne Maske zählt die längste OZ der Zeilen samt Index', () => {
    const ohneIndex = mindestbreiten([position('001.001.0010', null)], zahlenAttrappe).ordnungszahl ?? 0;
    const mitIndex = mindestbreiten(
      [position('001.001.0010', null), position('001.001.0010', 'A')],
      zahlenAttrappe,
    ).ordnungszahl;
    expect(mitIndex).toBeGreaterThan(ohneIndex);
  });

  it('eine OZ, die länger ist als die Maske, verbreitert die Spalte', () => {
    const nurMaske = mindestbreiten([], zahlenAttrappe, maske([2], 4, true)).ordnungszahl ?? 0;
    const mitHandOz = mindestbreiten(
      [position('001.001.00101', null)],
      zahlenAttrappe,
      maske([2], 4, true),
    ).ordnungszahl;
    expect(mitHandOz).toBeGreaterThan(nurMaske);
  });
});

describe('Mindestbreite der Zahlenspalten', () => {
  it('kommt aus dem längsten formatierten Wert', () => {
    const klein = mindestbreiten([position('01.0010', null, '1.500')], zahlenAttrappe).menge ?? 0;
    const gross = mindestbreiten(
      [position('01.0010', null, '1.500'), position('01.0020', null, '12345678.012')],
      zahlenAttrappe,
    ).menge;
    expect(gross).toBeGreaterThan(klein);
    // „12.345.678,012“ passt nicht in die Standardbreite der Menge (108 px).
    expect(gross).toBeGreaterThan(STANDARDBREITE.menge);
  });

  it('Textspalten haben keine Mindestbreite aus dem Inhalt', () => {
    const m = mindestbreiten([position('01.0010', null, '1.500')], zahlenAttrappe);
    expect(m.kurztext).toBeUndefined();
    expect(m.einheit).toBeUndefined();
  });
});

describe('wirksameBreiten', () => {
  const spalten: readonly LvSpalte[] = ['ordnungszahl', 'kurztext', 'menge'];

  it('ohne gemerkte Breite gilt die Standardbreite, die OZ-Spalte so breit wie ihr Inhalt', () => {
    const b = wirksameBreiten(spalten, {}, { ordnungszahl: 90, menge: 60 });
    expect(b).toEqual({ ordnungszahl: 90, kurztext: STANDARDBREITE.kurztext, menge: STANDARDBREITE.menge });
  });

  it('eine gemerkte Breite gilt, aber nie unter der Mindestbreite', () => {
    const b = wirksameBreiten(spalten, { kurztext: 200, menge: 50, ordnungszahl: 150 }, { menge: 120 });
    expect(b.kurztext).toBe(200);
    expect(b.menge).toBe(120);
    expect(b.ordnungszahl).toBe(150);
  });
});

describe('geaenderteBreite', () => {
  it('ändert in Schritten und bleibt zwischen Mindest- und Höchstbreite', () => {
    expect(geaenderteBreite(100, 16, 40)).toBe(116);
    expect(geaenderteBreite(100, -80, 40)).toBe(40);
    expect(geaenderteBreite(100, 5000, 40)).toBe(800);
  });
});

describe('gemerkteBreitenLesen', () => {
  it('übernimmt nur bekannte Spalten mit ganzen Pixeln im erlaubten Bereich', () => {
    expect(
      gemerkteBreitenLesen({ menge: 140, kurztext: '300', unbekannt: 90, einheit: 5, gesamtpreis: 160.6 }),
    ).toEqual({ menge: 140, gesamtpreis: 161 });
  });

  it('liest Unbrauchbares als leer', () => {
    expect(gemerkteBreitenLesen(null)).toEqual({});
    expect(gemerkteBreitenLesen('x')).toEqual({});
    expect(gemerkteBreitenLesen([1, 2])).toEqual({});
  });
});
