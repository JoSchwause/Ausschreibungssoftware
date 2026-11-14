// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type {
  Betrag,
  Einheitspreis,
  BildId,
  ElternId,
  HinweistextId,
  Kostengruppennummer,
  Langtext,
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
import { idQuelleAttrappe, kostengruppeAttrappe, zahlenAttrappe } from '../e2e/harness/attrappen';
import { anzeigeText, befehlAusEingabe, hinweisKlartext, istBearbeitbar } from './eingabe';
import { planeEinfuegen, planeEinheitspreise, planeKostengruppen } from './einfuegen';
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
    const zeile: LvZeile = {
      ...position,
      knoten: { ...knoten, merkmale: { ...ohne, ...merkmale }, zuschlag },
    };
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

describe('hinweisKlartext', () => {
  const bild = { art: 'bild', bild: { id: 'b1' as BildId, medientyp: 'image/png', daten: '' } } as const;

  it('Absatz, Liste, Tabelle, Textergänzung und Bild werden einzeilig, Auszeichnung entfällt', () => {
    const text: Langtext = [
      {
        art: 'absatz',
        inhalt: [
          { art: 'text', text: 'Vorbemerkung' },
          { art: 'text', text: ' zur', fett: true },
          { art: 'umbruch' },
          { art: 'text', text: 'Baustelle' },
        ],
      },
      {
        art: 'liste',
        geordnet: false,
        punkte: [
          [{ art: 'text', text: 'Zufahrt' }],
          [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Lager' }] }],
        ],
      },
      {
        art: 'tabelle',
        zeilen: [
          {
            zellen: [
              { spalten: 1, inhalt: [{ art: 'text', text: 'Stoff' }] },
              { spalten: 1, inhalt: [{ art: 'text', text: 'Menge' }] },
            ],
          },
          {
            zellen: [
              { spalten: 1, inhalt: [{ art: 'text', text: 'Kies' }] },
              { spalten: 1, inhalt: [{ art: 'text', text: '3 t' }] },
            ],
          },
        ],
      },
      {
        art: 'ergaenzung',
        herkunft: 'bieter',
        kennung: '1',
        leer: true,
        davor: [{ art: 'text', text: 'Fabrikat:' }],
        inhalt: [],
        danach: [{ art: 'text', text: 'oder gleichwertig' }],
      },
      {
        art: 'ergaenzung',
        herkunft: 'ausschreibender',
        kennung: '2',
        leer: false,
        davor: [{ art: 'text', text: 'Farbe' }],
        inhalt: [{ art: 'text', text: 'RAL 7016', kursiv: true }],
        danach: [],
      },
      bild,
      { art: 'text', text: 'Ende' },
    ];
    expect(hinweisKlartext(text)).toBe(
      'Vorbemerkung zur Baustelle • Zufahrt • Lager Stoff · Menge Kies · 3 t ' +
        'Fabrikat: … oder gleichwertig Farbe RAL 7016 [Bild] Ende',
    );
  });

  it('die Formen vor v1.1b: Textläufe und Bilder direkt, Zeilenumbruch im Text als Leerzeichen', () => {
    expect(
      hinweisKlartext([{ art: 'text', text: 'Zeile 1\nZeile 2' }, bild, { art: 'text', text: 'Schluss' }]),
    ).toBe('Zeile 1 Zeile 2 [Bild] Schluss');
    expect(hinweisKlartext([])).toBe('');
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

describe('Spalte „KG“ (Ticket 93): Eingabe', () => {
  const z = zahlenAttrappe;
  const lesen = kostengruppeAttrappe;
  const mitKg: LvZeile = {
    ...position,
    knoten: { ...(position.knoten as Position), kostengruppe: '330' as Kostengruppennummer },
  };

  it('zeigt die Nummer der Position, an der Gliederung nichts; bearbeitbar nur an Positionen', () => {
    expect(anzeigeText(mitKg, 'kostengruppe', z)).toBe('330');
    expect(anzeigeText(position, 'kostengruppe', z)).toBe('');
    expect(anzeigeText(titel, 'kostengruppe', z)).toBe('');
    expect(istBearbeitbar(position, 'kostengruppe')).toBe(true);
    expect(istBearbeitbar(titel, 'kostengruppe')).toBe(false);
  });

  it('eine lesbare Nummer wird KostengruppeSetzen; Leerraum zählt nicht', () => {
    expect(befehlAusEingabe(position, 'kostengruppe', ' 330 ', z, lesen)).toEqual({
      art: 'befehl',
      befehl: { art: 'KostengruppeSetzen', positionId: 'p1', kostengruppe: '330' },
    });
    expect(befehlAusEingabe(mitKg, 'kostengruppe', '340', z, lesen)).toMatchObject({
      befehl: { kostengruppe: '340' },
    });
  });

  it('leere Eingabe entfernt die Zuordnung (null); ohne Zuordnung und bei gleicher Nummer keine Änderung', () => {
    expect(befehlAusEingabe(mitKg, 'kostengruppe', '', z, lesen)).toEqual({
      art: 'befehl',
      befehl: { art: 'KostengruppeSetzen', positionId: 'p1', kostengruppe: null },
    });
    expect(befehlAusEingabe(position, 'kostengruppe', '  ', z, lesen)).toEqual({ art: 'keine-aenderung' });
    expect(befehlAusEingabe(mitKg, 'kostengruppe', ' 330', z, lesen)).toEqual({ art: 'keine-aenderung' });
  });

  it('formwidrige Eingabe ist ein Zellfehler mit der Meldung der Lesefunktion, kein Befehl', () => {
    expect(befehlAusEingabe(position, 'kostengruppe', '33', z, lesen)).toEqual({
      art: 'ungueltig',
      meldung: 'Keine Kostengruppennummer (drei Ziffern, die erste nicht 0).',
    });
    expect(befehlAusEingabe(position, 'kostengruppe', '033', z, lesen).art).toBe('ungueltig');
  });

  it('an einer Gliederung und ohne Lesefunktion schreibgeschützt', () => {
    expect(befehlAusEingabe(titel, 'kostengruppe', '330', z, lesen)).toEqual({ art: 'schreibgeschuetzt' });
    expect(befehlAusEingabe(position, 'kostengruppe', '330', z)).toEqual({ art: 'schreibgeschuetzt' });
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

  it('Spalte „KG“: neue Positionen bringen die Kostengruppe mit; eine formwidrige nur in ihrer Zelle verworfen', () => {
    const mitKg: readonly LvSpalte[] = [...spalten, 'kostengruppe'];
    const plan = planeEinfuegen(
      parseTsv('A\t1\tm\t2\t\t330\nB\t2\tm\t3\t\t33\nC\t3\tm\t4\t\t'),
      kurztextSpalte,
      mitKg,
      anker,
      zahlenAttrappe,
      idQuelleAttrappe(),
      kostengruppeAttrappe,
    );
    expect(plan.befehle).toHaveLength(3);
    expect(plan.befehle[0]).toMatchObject({ daten: { kurztext: 'A', kostengruppe: '330' } });
    // die formwidrige Nummer: Position entsteht ohne Kostengruppe, die Zelle wird markiert
    expect(plan.befehle[1]).toMatchObject({ daten: { kurztext: 'B', menge: '2.000' } });
    expect(plan.befehle[1]).not.toHaveProperty('daten.kostengruppe');
    expect(plan.befehle[2]).not.toHaveProperty('daten.kostengruppe');
    expect(plan.ungueltig.map((u) => [u.knotenId, u.spalte, u.text])).toEqual([
      ['neu-2', 'kostengruppe', '33'],
    ]);
    // je Zeile die Gesamtpreis-Zelle
    expect(plan.uebersprungen).toBe(3);
  });

  it('Spalte „KG“ ohne Lesefunktion: Zellen werden übersprungen, nichts gesetzt', () => {
    const plan = planeEinfuegen(
      parseTsv('330'),
      7,
      [...spalten, 'kostengruppe'],
      anker,
      zahlenAttrappe,
      idQuelleAttrappe(),
    );
    expect(plan.befehle[0]).not.toHaveProperty('daten.kostengruppe');
    expect(plan.uebersprungen).toBe(1);
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

describe('planeKostengruppen (Ticket 93): eine Spalte in die Spalte „KG“ der vorhandenen Zeilen', () => {
  const pos = (id: string, kostengruppe?: string): LvZeile => ({
    ...position,
    knoten: {
      ...(position.knoten as Position),
      id: id as PositionId,
      ...(kostengruppe === undefined ? {} : { kostengruppe: kostengruppe as Kostengruppennummer }),
    },
  });
  const hinweis: LvZeile = {
    ...titel,
    knoten: {
      art: 'hinweis',
      id: 'h1' as HinweistextId,
      elternId: 't1' as ElternId,
      reihenfolge: 3,
      text: [],
    },
    hatUnterknoten: false,
    summe: null,
  };
  // Titel, p1 ohne KG, p2 mit 330, Hinweistext, p3 mit 310
  const zeilen: readonly LvZeile[] = [titel, pos('p1'), pos('p2', '330'), hinweis, pos('p3', '310')];

  it('Zeile für Zeile ab der aktiven: ein Befehl je geänderter Position, gleiche Nummer ohne Befehl', () => {
    const plan = planeKostengruppen(parseTsv('340\r\n330\r\n\r\n320\r\n'), 1, zeilen, kostengruppeAttrappe);
    expect(plan.befehle).toEqual([
      { art: 'KostengruppeSetzen', positionId: 'p1', kostengruppe: '340' },
      { art: 'KostengruppeSetzen', positionId: 'p3', kostengruppe: '320' },
    ]);
    expect(plan.ungueltig).toEqual([]);
    expect(plan.uebersprungen).toBe(0);
  });

  it('leer entfernt die Zuordnung; eine formwidrige Nummer verwirft nur ihre Zelle', () => {
    const plan = planeKostengruppen(parseTsv('3x0\n\n\n33'), 1, zeilen, kostengruppeAttrappe);
    expect(plan.befehle).toEqual([{ art: 'KostengruppeSetzen', positionId: 'p2', kostengruppe: null }]);
    expect(plan.ungueltig).toEqual([
      { knotenId: 'p1', spalte: 'kostengruppe', text: '3x0', meldung: expect.any(String) as string },
      { knotenId: 'p3', spalte: 'kostengruppe', text: '33', meldung: expect.any(String) as string },
    ]);
  });

  it('eine Nummer auf einer Gliederung, einem Hinweistext oder hinter der letzten Zeile wird übersprungen und gezählt', () => {
    const plan = planeKostengruppen(
      parseTsv('300\n340\n330\n350\n310\n360\n'),
      0,
      zeilen,
      kostengruppeAttrappe,
    );
    expect(plan.befehle).toEqual([{ art: 'KostengruppeSetzen', positionId: 'p1', kostengruppe: '340' }]);
    // Titel (300), Hinweistext (350), hinter dem Ende (360)
    expect(plan.uebersprungen).toBe(3);
  });
});

describe('Ausnahme „Preise“ im Schreibschutz (SB3): die Spalte „EP“ der vorhandenen Zeilen', () => {
  const pos = (id: string, ep: string | null, zuschlag = false): LvZeile => ({
    ...position,
    knoten: {
      ...(position.knoten as Position),
      id: id as PositionId,
      einheitspreis: ep as Einheitspreis | null,
      zuschlag: zuschlag ? { prozentsatz: null, bezug: { art: 'positionen', positionen: [] } } : null,
    },
  });
  // Titel, p1 mit 7,450, p2 ohne EP, z1 Zuschlagsposition, p3 mit 1,000
  const zeilen: readonly LvZeile[] = [
    titel,
    pos('p1', '7.450'),
    pos('p2', null),
    pos('z1', null, true),
    pos('p3', '1.000'),
  ];

  it('istBearbeitbar: mit der Ausnahme ist der EP einer Zuschlagsposition gesperrt, sonst wie bisher', () => {
    expect(istBearbeitbar(pos('z', null, true), 'einheitspreis', true)).toBe(false);
    expect(istBearbeitbar(pos('z', null, true), 'einheitspreis')).toBe(true);
    expect(istBearbeitbar(pos('p', '1.000'), 'einheitspreis', true)).toBe(true);
    expect(istBearbeitbar(pos('z', null, true), 'kurztext', true)).toBe(true);
  });

  it('Zeile für Zeile ab der aktiven: ein Befehl je geändertem EP, leer ist null, gleicher Wert ohne Befehl', () => {
    const plan = planeEinheitspreise(parseTsv('8,5\n12\n\n'), 1, zeilen, zahlenAttrappe);
    expect(plan.befehle).toEqual([
      { art: 'EinheitspreisAendern', positionId: 'p1', einheitspreis: '8.500' },
      { art: 'EinheitspreisAendern', positionId: 'p2', einheitspreis: '12.000' },
    ]);
    expect(plan.uebersprungen).toBe(0);
    const leeren = planeEinheitspreise([[''], ['x']].slice(0, 1), 1, zeilen, zahlenAttrappe);
    expect(leeren.befehle).toEqual([{ art: 'EinheitspreisAendern', positionId: 'p1', einheitspreis: null }]);
  });

  it('Gliederung, Zuschlagsposition und Zeilen hinter der letzten überspringen; ein unlesbarer Preis nur seine Zelle', () => {
    const plan = planeEinheitspreise(parseTsv('5\nviel\n3\n4\n1\n9\n'), 0, zeilen, zahlenAttrappe);
    expect(plan.befehle).toEqual([{ art: 'EinheitspreisAendern', positionId: 'p2', einheitspreis: '3.000' }]);
    expect(plan.ungueltig).toEqual([
      { knotenId: 'p1', spalte: 'einheitspreis', text: 'viel', meldung: expect.any(String) as string },
    ]);
    // Titel (5), Zuschlagsposition (4), hinter der letzten Zeile (9); p3 bleibt 1,000 ohne Befehl.
    expect(plan.uebersprungen).toBe(3);
  });
});
