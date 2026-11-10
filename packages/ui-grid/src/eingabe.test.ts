// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type {
  Betrag,
  Einheitspreis,
  ElternId,
  LvSpalte,
  LvZeile,
  Menge,
  Ordnungszahl,
  Position,
  PositionId,
  Positionsmerkmale,
  Zuschlag,
  TitelId,
} from '@tethys/vertrag';
import { idQuelleAttrappe, zahlenAttrappe } from '../e2e/harness/attrappen';
import { anzeigeText, befehlAusEingabe, istBearbeitbar } from './eingabe';
import { planeEinfuegen } from './einfuegen';
import { parseTsv } from './tsv';

const position: LvZeile = {
  knoten: {
    art: 'position',
    id: 'p1' as PositionId,
    elternId: 't1' as ElternId,
    reihenfolge: 0,
    ordnungszahl: '01.0010' as Ordnungszahl,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext: 'Bauzaun stellen',
    langtext: [],
    menge: '86.500' as Menge,
    einheit: 'm',
    einheitspreis: '7.450' as Einheitspreis,
    epa: null,
  },
  tiefe: 1,
  hatUnterknoten: false,
  aufgeklappt: false,
  summe: '644.43' as Betrag,
  gehtInSummeEin: true,
  befunde: [],
};

const titel: LvZeile = {
  knoten: {
    art: 'titel',
    id: 't1' as TitelId,
    elternId: 'lv' as ElternId,
    reihenfolge: 0,
    ordnungszahl: '01' as Ordnungszahl,
    kurztext: 'Vorarbeiten',
  },
  tiefe: 0,
  hatUnterknoten: true,
  aufgeklappt: true,
  summe: '1000.00' as Betrag,
  gehtInSummeEin: null,
  befunde: [],
};

describe('anzeigeText', () => {
  it('formatiert über die eingesteckten Funktionen, nicht selbst', () => {
    expect(anzeigeText(position, 'menge', zahlenAttrappe)).toBe('86,500');
    expect(anzeigeText(position, 'einheitspreis', zahlenAttrappe)).toBe('7,450');
    expect(anzeigeText(position, 'gesamtpreis', zahlenAttrappe)).toBe('644,43');
    expect(anzeigeText(titel, 'gesamtpreis', zahlenAttrappe)).toBe('1.000,00');
    expect(anzeigeText(titel, 'menge', zahlenAttrappe)).toBe('');
  });
});

describe('Spalte „Art“', () => {
  const ohne: Positionsmerkmale = {
    bedarf: null,
    wahl: null,
    stundenlohn: false,
    pauschal: false,
    zuschlagskennzeichen: false,
  };
  const art = (merkmale: Partial<Positionsmerkmale>, zuschlag: Zuschlag | null = null): string => {
    const knoten = position.knoten as Position;
    const zeile: LvZeile = { ...position, knoten: { ...knoten, merkmale: { ...ohne, ...merkmale }, zuschlag } };
    return anzeigeText(zeile, 'positionsart', zahlenAttrappe);
  };

  it('ohne Merkmal: Normal', () => {
    expect(art({})).toBe('Normal');
  });

  it('Bedarf im Stundenlohn nennt beide Merkmale', () => {
    expect(art({ bedarf: 'ohne-gesamtbetrag', stundenlohn: true })).toBe('Bedarf, Stundenlohn');
  });

  it('Bedarf mit Gesamtbetrag', () => {
    expect(art({ bedarf: 'mit-gesamtbetrag' })).toBe('Bedarf m. GB');
  });

  it('Wahl mit Gruppe und Variante, nur Gruppe, ohne Nummern', () => {
    expect(art({ wahl: { gruppe: 1, variante: 2, grundpositionId: null } })).toBe('Wahl 1.2');
    expect(art({ wahl: { gruppe: 3, variante: null, grundpositionId: null } })).toBe('Wahl 3');
    expect(art({ wahl: { gruppe: null, variante: null, grundpositionId: null } })).toBe('Wahl');
  });

  it('Zuschlag steht vorn; alle Merkmale in fester Reihenfolge, pauschal zuletzt', () => {
    const zuschlag: Zuschlag = { prozentsatz: null, bezug: { art: 'gliederung' } };
    expect(art({}, zuschlag)).toBe('Zuschlag');
    expect(
      art(
        {
          pauschal: true,
          stundenlohn: true,
          bedarf: 'mit-gesamtbetrag',
          wahl: { gruppe: 2, variante: 0, grundpositionId: null },
        },
        zuschlag,
      ),
    ).toBe('Zuschlag, Wahl 2.0, Bedarf m. GB, Stundenlohn, pauschal');
  });
});

describe('befehlAusEingabe', () => {
  const z = zahlenAttrappe;

  it('Menge: de-DE-Text wird zu MengeAendern mit dem geparsten Wert', () => {
    expect(befehlAusEingabe(position, 'menge', '1.234,5', z)).toEqual({
      art: 'befehl',
      befehl: { art: 'MengeAendern', positionId: 'p1', menge: '1234.500' },
    });
  });

  it('unveränderter Text und gleicher Wert ergeben keinen Befehl', () => {
    expect(befehlAusEingabe(position, 'menge', '86,500', z)).toEqual({ art: 'keine-aenderung' });
    expect(befehlAusEingabe(position, 'menge', '86,5', z)).toEqual({ art: 'keine-aenderung' });
  });

  it('leerer Text leert Menge, Einheit und Einheitspreis', () => {
    expect(befehlAusEingabe(position, 'menge', '', z)).toMatchObject({ befehl: { menge: null } });
    expect(befehlAusEingabe(position, 'einheit', ' ', z)).toMatchObject({ befehl: { einheit: null } });
    expect(befehlAusEingabe(position, 'einheitspreis', '', z)).toMatchObject({
      befehl: { einheitspreis: null },
    });
  });

  it('unlesbare Zahl ist ein Hinweis, kein Befehl', () => {
    const r = befehlAusEingabe(position, 'einheitspreis', 'zwölf', z);
    expect(r.art).toBe('ungueltig');
  });

  it('Kurztext einer Gliederung und einer Position; Menge einer Gliederung ist schreibgeschützt', () => {
    expect(befehlAusEingabe(titel, 'kurztext', 'Neu', z)).toEqual({
      art: 'befehl',
      befehl: { art: 'KurztextAendern', knotenId: 't1', kurztext: 'Neu' },
    });
    expect(befehlAusEingabe(titel, 'menge', '1', z)).toEqual({ art: 'schreibgeschuetzt' });
    expect(istBearbeitbar(position, 'ordnungszahl')).toBe(false);
    expect(istBearbeitbar(position, 'gesamtpreis')).toBe(false);
  });
});

describe('planeEinfuegen', () => {
  const spalten: readonly LvSpalte[] = [
    'ordnungszahl',
    'positionsart',
    'kurztext',
    'menge',
    'einheit',
    'einheitspreis',
    'gesamtpreis',
  ];
  const kurztextSpalte = spalten.indexOf('kurztext');
  const anker = { art: 'nach', knotenId: 'p1' as PositionId } as const;

  it('5 Zeilen aus Excel ergeben 5 PositionAnlegen in Reihenfolge, nacheinander eingehängt', () => {
    const tsv = [
      'Fundament\t12,5\tm³\t95,50',
      '"Bewehrung,\nzweilagig"\t1.250,000\tkg\t1,85',
      'Schalung\t40\tm²\t28',
      'Entwässerung\t3\tSt\t210,5',
      'Abdichtung\t60,25\tm²\t17,9',
      '',
    ].join('\n');
    const plan = planeEinfuegen(
      parseTsv(tsv),
      kurztextSpalte,
      spalten,
      anker,
      zahlenAttrappe,
      idQuelleAttrappe(),
    );
    expect(plan.befehle).toHaveLength(5);
    expect(plan.befehle.every((b) => b.art === 'PositionAnlegen')).toBe(true);
    expect(plan.ungueltig).toEqual([]);
    const [erste, zweite] = plan.befehle;
    expect(erste).toMatchObject({
      id: 'neu-1',
      ort: { art: 'nach', knotenId: 'p1' },
      daten: { kurztext: 'Fundament', menge: '12.500', einheit: 'm³', einheitspreis: '95.500' },
    });
    expect(zweite).toMatchObject({
      ort: { art: 'nach', knotenId: 'neu-1' },
      daten: { kurztext: 'Bewehrung,\nzweilagig', menge: '1250.000', einheitspreis: '1.850' },
    });
  });

  it('ungültige Zellen werden gemeldet, die Position entsteht trotzdem', () => {
    const plan = planeEinfuegen(
      parseTsv('A\tviel\tm\t3,5\nB\t2\tm\tgratis'),
      kurztextSpalte,
      spalten,
      anker,
      zahlenAttrappe,
      idQuelleAttrappe(),
    );
    expect(plan.befehle).toHaveLength(2);
    expect(plan.befehle[0]).toMatchObject({ daten: { menge: null, einheitspreis: '3.500' } });
    expect(plan.ungueltig.map((u) => [u.knotenId, u.spalte, u.text])).toEqual([
      ['neu-1', 'menge', 'viel'],
      ['neu-2', 'einheitspreis', 'gratis'],
    ]);
  });

  it('der Block liegt ab der aktiven Spalte; Zellen in schreibgeschützten Spalten werden gezählt und übersprungen', () => {
    const plan = planeEinfuegen(
      parseTsv('01.0010\tNormal\tTitelText\t5\tm\t2\t10,00\textra'),
      0,
      spalten,
      anker,
      zahlenAttrappe,
      idQuelleAttrappe(),
    );
    expect(plan.befehle[0]).toMatchObject({ daten: { kurztext: 'TitelText', menge: '5.000' } });
    // Ordnungszahl, Art, Gesamtpreis und die Zelle rechts der letzten Spalte
    expect(plan.uebersprungen).toBe(4);
  });

  it('in ein leeres LV: erster Befehl hängt am Ende der Wurzel ein', () => {
    const plan = planeEinfuegen(
      parseTsv('A\nB'),
      kurztextSpalte,
      spalten,
      { art: 'ende', elternId: 'lv' as ElternId },
      zahlenAttrappe,
      idQuelleAttrappe(),
    );
    expect(plan.befehle[0]).toMatchObject({ ort: { art: 'ende', elternId: 'lv' } });
    expect(plan.befehle[1]).toMatchObject({ ort: { art: 'nach', knotenId: 'neu-1' } });
  });
});
