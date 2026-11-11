// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type {
  Einheitspreis,
  ElternId,
  HinweistextId,
  Knoten,
  KnotenId,
  LvZeile,
  Menge,
  Ordnungszahl,
  PositionId,
  TitelId,
} from '@tethys/vertrag';
import { zahlenAttrappe } from '../e2e/harness/attrappen';
import { parseTsv } from './tsv';
import { liegtInMenge, loeschUmfang, obersteKnoten, planeVerschieben, zeilenAlsTsv } from './zeilenaktionen';

const LV = 'lv' as ElternId;

function titel(id: string, eltern: string, kurztext = id): Knoten {
  return {
    art: 'titel',
    id: id as TitelId,
    elternId: eltern as ElternId,
    reihenfolge: 0,
    ordnungszahl: null,
    kurztext,
  };
}

function position(id: string, eltern: string, kurztext = id, menge: string | null = null): Knoten {
  return {
    art: 'position',
    id: id as PositionId,
    elternId: eltern as ElternId,
    reihenfolge: 0,
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext,
    langtext: [],
    menge: menge as Menge | null,
    einheit: null,
    einheitspreis: null,
    epa: null,
  };
}

function hinweis(id: string, eltern: string): Knoten {
  return {
    art: 'hinweis',
    id: id as HinweistextId,
    elternId: eltern as ElternId,
    reihenfolge: 0,
    text: [{ art: 'text', text: 'Hinweis' }],
  };
}

function zeile(knoten: Knoten, tiefe: number, unter = false, auf = unter): LvZeile {
  return {
    knoten,
    tiefe,
    hatUnterknoten: unter,
    aufgeklappt: auf,
    summe: null,
    gehtInSummeEin: null,
    befunde: [],
  };
}

const ids = (...x: string[]): KnotenId[] => x as KnotenId[];

/**
 * LV
 * ├─ T1 (aufgeklappt)
 * │  ├─ p1
 * │  ├─ p2
 * │  └─ h1
 * ├─ T2 (zugeklappt, hat Unterknoten)
 * ├─ T3 (aufgeklappt)
 * │  └─ p3
 * └─ T4 (leer)
 */
const baum: readonly LvZeile[] = [
  zeile(titel('T1', LV), 0, true),
  zeile(position('p1', 'T1'), 1),
  zeile(position('p2', 'T1'), 1),
  zeile(hinweis('h1', 'T1'), 1),
  zeile(titel('T2', LV), 0, true, false),
  zeile(titel('T3', LV), 0, true),
  zeile(position('p3', 'T3'), 1),
  zeile(titel('T4', LV), 0),
];

describe('obersteKnoten', () => {
  it('lässt Knoten weg, deren Vorfahr ebenfalls ausgewählt ist; Anzeigereihenfolge', () => {
    expect(obersteKnoten(baum, new Set(['p3', 'p1', 'T1', 'T3']))).toEqual(ids('T1', 'T3'));
    expect(obersteKnoten(baum, new Set(['p2', 'p1']))).toEqual(ids('p1', 'p2'));
  });
});

describe('zeilenAlsTsv', () => {
  it('schreibt die ausgewählten Zeilen in den gegebenen Spalten, Zahlen de-DE, Texte in Excel-Anführung', () => {
    const zeilen = [
      zeile(position('a', LV, 'Bauzaun stellen', '1234.500'), 0),
      zeile(position('b', LV, 'Bewehrung,\nzweilagig', null), 0),
      zeile(position('c', LV, 'nicht ausgewählt', '1.000'), 0),
    ];
    const pa = zeilen[0]?.knoten;
    if (pa?.art !== 'position') throw new Error('Testdaten');
    zeilen[0] = { ...zeile({ ...pa, einheit: 'm', einheitspreis: '7.450' as Einheitspreis }, 0) };
    const tsv = zeilenAlsTsv(
      zeilen,
      new Set(['a', 'b']),
      ['kurztext', 'menge', 'einheit', 'einheitspreis'],
      zahlenAttrappe,
    );
    expect(tsv).toBe('Bauzaun stellen\t1.234,500\tm\t7,450\r\n"Bewehrung,\nzweilagig"\t\t\t\r\n');
    expect(parseTsv(tsv)).toEqual([
      ['Bauzaun stellen', '1.234,500', 'm', '7,450'],
      ['Bewehrung,\nzweilagig', '', '', ''],
    ]);
  });

  it('nimmt die Ordnungszahl mit, wenn sie sichtbar ist', () => {
    const p = position('a', LV, 'X');
    if (p.art !== 'position') throw new Error('Testdaten');
    const z = zeile({ ...p, ordnungszahl: '01.0010' as Ordnungszahl }, 0);
    expect(zeilenAlsTsv([z], new Set(['a']), ['ordnungszahl', 'kurztext'], zahlenAttrappe)).toBe(
      '01.0010\tX\r\n',
    );
  });
});

describe('liegtInMenge', () => {
  it('trifft die Zeile selbst und alle sichtbaren Nachfahren', () => {
    const menge = new Set(['T1']);
    expect(liegtInMenge(baum, 0, menge)).toBe(true);
    expect(liegtInMenge(baum, 3, menge)).toBe(true); // h1 unter T1
    expect(liegtInMenge(baum, 4, menge)).toBe(false); // T2
    expect(liegtInMenge(baum, 6, new Set(['p1']))).toBe(false);
  });
});

describe('loeschUmfang', () => {
  it('zählt Knoten, Gliederungen und alle Positionen samt sichtbarer Unterknoten', () => {
    expect(loeschUmfang(baum, ids('T1', 'T3'))).toEqual({
      knoten: 2,
      lose: 0,
      titel: 2,
      positionen: 3,
      mindestens: false,
    });
    expect(loeschUmfang(baum, ids('p1'))).toEqual({
      knoten: 1,
      lose: 0,
      titel: 0,
      positionen: 1,
      mindestens: false,
    });
  });

  it('ein zugeklappter Knoten mit Unterknoten macht die Zahl zur Mindestzahl', () => {
    expect(loeschUmfang(baum, ids('T2', 'p3'))).toEqual({
      knoten: 2,
      lose: 0,
      titel: 1,
      positionen: 1,
      mindestens: true,
    });
  });

  it('mit der Zahl der App (Ticket 54, Punkt 4): genau diese Zahl, nie „mindestens“; Knoten und Gliederungen wie sonst', () => {
    const gefragt: (readonly KnotenId[])[] = [];
    const zaehle = (knotenIds: readonly KnotenId[]): number => {
      gefragt.push(knotenIds);
      return 17;
    };
    expect(loeschUmfang(baum, ids('T2', 'p3'), zaehle)).toEqual({
      knoten: 2,
      lose: 0,
      titel: 1,
      positionen: 17,
      mindestens: false,
    });
    expect(gefragt).toEqual([ids('T2', 'p3')]);
  });
});

describe('planeVerschieben', () => {
  const positionen: readonly LvZeile[] = [
    zeile(position('a', LV), 0),
    zeile(position('b', LV), 0),
    zeile(position('c', LV), 0),
    zeile(position('d', LV), 0),
  ];

  it('eine Position eine Stelle nach unten: KnotenVerschieben hinter den nächsten Geschwisterknoten', () => {
    expect(planeVerschieben(positionen, ids('b'), 'runter')).toEqual({
      art: 'KnotenVerschieben',
      knotenId: 'b',
      ziel: { art: 'nach', knotenId: 'c' },
    });
  });

  it('eine Position nach oben: hinter den vorvorigen bzw. an den Anfang', () => {
    expect(planeVerschieben(positionen, ids('c'), 'hoch')).toEqual({
      art: 'KnotenVerschieben',
      knotenId: 'c',
      ziel: { art: 'nach', knotenId: 'a' },
    });
    expect(planeVerschieben(positionen, ids('b'), 'hoch')).toEqual({
      art: 'KnotenVerschieben',
      knotenId: 'b',
      ziel: { art: 'anfang', elternId: LV },
    });
  });

  it('mehrere zusammenhängende Zeilen: ein KnotenlisteVerschieben', () => {
    expect(planeVerschieben(positionen, ids('b', 'c'), 'runter')).toEqual({
      art: 'KnotenlisteVerschieben',
      knotenIds: ['b', 'c'],
      ziel: { art: 'nach', knotenId: 'd' },
    });
    expect(planeVerschieben(positionen, ids('c', 'b'), 'hoch')).toEqual({
      art: 'KnotenlisteVerschieben',
      knotenIds: ['b', 'c'],
      ziel: { art: 'anfang', elternId: LV },
    });
  });

  it('am Rand nichts', () => {
    expect(planeVerschieben(positionen, ids('a'), 'hoch')).toBeNull();
    expect(planeVerschieben(positionen, ids('c', 'd'), 'runter')).toBeNull();
    expect(planeVerschieben(baum, ids('p3'), 'runter')).toBeNull(); // einziges Kind von T3
  });

  it('nicht zusammenhängend oder unter verschiedenen Eltern: nichts', () => {
    expect(planeVerschieben(positionen, ids('a', 'c'), 'runter')).toBeNull();
    expect(planeVerschieben(baum, ids('p2', 'p3'), 'runter')).toBeNull();
  });

  it('Gliederungen: „hinter einem Titel“ hieße „in den Titel“, deshalb Ende, Anfang oder Umordnen über die Nachbarn', () => {
    // T3 nach unten hinter T4 (den letzten): ans Ende
    expect(planeVerschieben(baum, ids('T3'), 'runter')).toEqual({
      art: 'KnotenVerschieben',
      knotenId: 'T3',
      ziel: { art: 'ende', elternId: LV },
    });
    // T2 nach oben vor T1 (den ersten): an den Anfang
    expect(planeVerschieben(baum, ids('T2'), 'hoch')).toEqual({
      art: 'KnotenVerschieben',
      knotenId: 'T2',
      ziel: { art: 'anfang', elternId: LV },
    });
    // T2 nach unten: weder hinter T3 noch T3 vor T2 lässt sich ausdrücken; die Liste T1, T3, T2 an den Anfang
    expect(planeVerschieben(baum, ids('T2'), 'runter')).toEqual({
      art: 'KnotenlisteVerschieben',
      knotenIds: ['T1', 'T3', 'T2'],
      ziel: { art: 'anfang', elternId: LV },
    });
    // T3 nach oben: ebenso
    expect(planeVerschieben(baum, ids('T3'), 'hoch')).toEqual({
      art: 'KnotenlisteVerschieben',
      knotenIds: ['T1', 'T3', 'T2'],
      ziel: { art: 'anfang', elternId: LV },
    });
  });

  it('Position unter Titeln: der Nachbar wird verschoben, wenn das kürzer ist', () => {
    // LV: a (Position), T (Titel), b (Position). b nach oben: hinter a.
    const gemischt = [zeile(position('a', LV), 0), zeile(titel('T', LV), 0), zeile(position('b', LV), 0)];
    expect(planeVerschieben(gemischt, ids('b'), 'hoch')).toEqual({
      art: 'KnotenVerschieben',
      knotenId: 'b',
      ziel: { art: 'nach', knotenId: 'a' },
    });
    // a nach unten: hinter T hieße in T; stattdessen T an den Anfang
    expect(planeVerschieben(gemischt, ids('a'), 'runter')).toEqual({
      art: 'KnotenVerschieben',
      knotenId: 'T',
      ziel: { art: 'anfang', elternId: LV },
    });
  });
});
