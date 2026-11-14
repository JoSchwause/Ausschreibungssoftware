// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type {
  Einheitspreis,
  ElternId,
  HinweistextId,
  Knoten,
  Langtext,
  LvZeile,
  Ordnungszahl,
  PositionId,
  Positionsmerkmale,
  Prozent,
  TitelId,
} from '@tethys/vertrag';
import {
  KEIN_FILTER,
  filterAktiv,
  filterText,
  gefilterteZeilen,
  suchtreffer,
  vorfahrenZugeklappt,
} from './suche';
import type { Zeilenfilter } from './suche';

const LV = 'lv';
const OHNE: Positionsmerkmale = {
  bedarf: null,
  wahl: null,
  stundenlohn: false,
  pauschal: false,
  zuschlagskennzeichen: false,
};

function titel(id: string, eltern: string, oz: string, kurztext: string): Knoten {
  return {
    art: 'titel',
    id: id as TitelId,
    elternId: eltern as ElternId,
    reihenfolge: 0,
    ordnungszahl: oz as Ordnungszahl,
    kurztext,
  };
}

function position(
  id: string,
  eltern: string,
  oz: string,
  kurztext: string,
  mehr: {
    langtext?: Langtext;
    ep?: string;
    merkmale?: Partial<Positionsmerkmale>;
    zuschlagssatz?: string | null;
    index?: string;
  } = {},
): Knoten {
  return {
    art: 'position',
    id: id as PositionId,
    elternId: eltern as ElternId,
    reihenfolge: 0,
    ordnungszahl: oz as Ordnungszahl,
    ozIndex: mehr.index ?? null,
    merkmale: { ...OHNE, ...mehr.merkmale },
    zuschlag:
      mehr.zuschlagssatz === undefined
        ? null
        : { prozentsatz: mehr.zuschlagssatz as Prozent | null, bezug: { art: 'gliederung' } },
    kurztext,
    langtext: mehr.langtext ?? [],
    menge: null,
    einheit: null,
    einheitspreis: (mehr.ep ?? null) as Einheitspreis | null,
    epa: null,
  };
}

function hinweis(id: string, eltern: string, text: string): Knoten {
  return {
    art: 'hinweis',
    id: id as HinweistextId,
    elternId: eltern as ElternId,
    reihenfolge: 0,
    text: [{ art: 'absatz', inhalt: [{ art: 'text', text }] }],
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

// Ein kleines LV: zwei Titel, darin Positionen und ein Hinweistext; Titel 02 ist zugeklappt (in `alle` trotzdem enthalten).
const t1 = titel('t1', LV, '01', 'Erdarbeiten');
const h1 = hinweis('h1', 't1', 'Boden nach DIN prüfen');
const p1 = position('p1', 't1', '01.0010', 'Oberboden abtragen', {
  ep: '4.500',
  langtext: [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Oberboden 30 cm, seitlich lagern.' }] }],
});
const p2 = position('p2', 't1', '01.0020', 'Baugrube ausheben', {
  merkmale: { bedarf: 'ohne-gesamtbetrag' },
});
const t2 = titel('t2', LV, '02', 'Mauerarbeiten');
const p3 = position('p3', 't2', '02.0010', 'Mauerwerk KS', {
  ep: '80.000',
  merkmale: { wahl: { gruppe: 1, variante: 1, grundpositionId: null } },
});
const p4 = position('p4', 't2', '02.0020', 'Zuschlag Höhe', { zuschlagssatz: null });
const p5 = position('p5', 't2', '02.0030', 'Stundenlohn Maurer', {
  merkmale: { stundenlohn: true, pauschal: true },
  ep: '55.000',
  index: 'A',
});
const alle: readonly LvZeile[] = [
  zeile(t1, 0, true),
  zeile(h1, 1),
  zeile(p1, 1),
  zeile(p2, 1),
  zeile(t2, 0, true, false),
  zeile(p3, 1),
  zeile(p4, 1),
  zeile(p5, 1),
];
const ids = (zs: readonly { knoten: Knoten }[]): string[] => zs.map((z) => z.knoten.id);

describe('suchtreffer', () => {
  it('findet in OZ, Kurztext und Langtext, ohne Groß- und Kleinschreibung, in Anzeigereihenfolge', () => {
    expect(suchtreffer(alle, 'oberboden')).toEqual([{ knotenId: 'p1', feld: 'kurztext' }]);
    expect(suchtreffer(alle, 'SEITLICH')).toEqual([{ knotenId: 'p1', feld: 'langtext' }]);
    expect(suchtreffer(alle, '02.00')).toEqual([
      { knotenId: 'p3', feld: 'ordnungszahl' },
      { knotenId: 'p4', feld: 'ordnungszahl' },
      { knotenId: 'p5', feld: 'ordnungszahl' },
    ]);
  });

  it('sucht die OZ samt Index und den Text eines Hinweistexts', () => {
    expect(suchtreffer(alle, '0030a')).toEqual([{ knotenId: 'p5', feld: 'ordnungszahl' }]);
    expect(suchtreffer(alle, 'din')).toEqual([{ knotenId: 'h1', feld: 'kurztext' }]);
  });

  it('findet Gliederungen am Kurztext und liefert je Zeile höchstens einen Treffer', () => {
    expect(suchtreffer(alle, 'mauer')).toEqual([
      { knotenId: 't2', feld: 'kurztext' },
      { knotenId: 'p3', feld: 'kurztext' },
    ]);
    // „Oberboden“ steht in Kurztext und Langtext: ein Treffer, im Kurztext.
    expect(suchtreffer(alle, 'oberboden')).toHaveLength(1);
  });

  it('eine leere oder nur aus Leerzeichen bestehende Anfrage findet nichts', () => {
    expect(suchtreffer(alle, '')).toEqual([]);
    expect(suchtreffer(alle, '   ')).toEqual([]);
  });

  it('nimmt nach einer Änderung den neuen Text (der Zwischenspeicher hängt am Knoten)', () => {
    expect(suchtreffer(alle, 'abtragen')).toHaveLength(1);
    const geaendert = { ...p1, kurztext: 'Oberboden lösen' } as Knoten;
    const neu = alle.map((z) => (z.knoten.id === 'p1' ? { ...z, knoten: geaendert } : z));
    expect(suchtreffer(neu, 'abtragen')).toEqual([]);
    expect(suchtreffer(neu, 'lösen')).toEqual([{ knotenId: 'p1', feld: 'kurztext' }]);
  });
});

describe('gefilterteZeilen', () => {
  const mit = (f: Partial<Zeilenfilter>): Zeilenfilter => ({ ...KEIN_FILTER, ...f });

  it('ohne Filter: alle Zeilen unverändert', () => {
    expect(filterAktiv(KEIN_FILTER)).toBe(false);
    expect(gefilterteZeilen(alle, KEIN_FILTER)).toBe(alle);
  });

  it('nach Merkmal: die Treffer mit ihren Gliederungen, alles offen und ohne Klappknopf', () => {
    const r = gefilterteZeilen(alle, mit({ merkmal: 'wahl' }));
    expect(ids(r)).toEqual(['t2', 'p3']);
    expect(r.every((z) => !z.hatUnterknoten)).toBe(true);
    expect(r.map((z) => z.tiefe)).toEqual([0, 1]);
    expect(ids(gefilterteZeilen(alle, mit({ merkmal: 'bedarf' })))).toEqual(['t1', 'p2']);
    expect(ids(gefilterteZeilen(alle, mit({ merkmal: 'stundenlohn' })))).toEqual(['t2', 'p5']);
    expect(ids(gefilterteZeilen(alle, mit({ merkmal: 'pauschal' })))).toEqual(['t2', 'p5']);
  });

  it('ohne Preis: Positionen ohne EP; eine Zuschlagsposition zählt, solange ihr Satz fehlt', () => {
    expect(ids(gefilterteZeilen(alle, mit({ ohnePreis: true })))).toEqual(['t1', 'p2', 't2', 'p4']);
  });

  it('nach Art: Positionen, Zuschlagspositionen, Hinweistexte oder Titel und Lose', () => {
    expect(ids(gefilterteZeilen(alle, mit({ art: 'hinweis' })))).toEqual(['t1', 'h1']);
    expect(ids(gefilterteZeilen(alle, mit({ art: 'zuschlagsposition' })))).toEqual(['t2', 'p4']);
    expect(ids(gefilterteZeilen(alle, mit({ art: 'gliederung' })))).toEqual(['t1', 't2']);
    expect(ids(gefilterteZeilen(alle, mit({ art: 'position' })))).toEqual([
      't1',
      'p1',
      'p2',
      't2',
      'p3',
      'p4',
      'p5',
    ]);
  });

  it('mehrere Angaben gelten zugleich', () => {
    expect(ids(gefilterteZeilen(alle, mit({ art: 'position', ohnePreis: true, merkmal: 'bedarf' })))).toEqual(
      ['t1', 'p2'],
    );
    expect(gefilterteZeilen(alle, mit({ art: 'hinweis', ohnePreis: true }))).toEqual([]);
  });

  it('beschreibt den Filter in Worten', () => {
    expect(filterText(mit({ art: 'position', merkmal: 'bedarf', ohnePreis: true }))).toBe(
      'Positionen, Bedarf, ohne Preis',
    );
    expect(filterText(mit({ art: 'gliederung' }))).toBe('Titel und Lose');
  });
});

describe('vorfahrenZugeklappt', () => {
  it('nennt die zugeklappten Gliederungen über einem Knoten, von außen nach innen', () => {
    expect(vorfahrenZugeklappt(alle, 'p3')).toEqual(['t2']);
    expect(vorfahrenZugeklappt(alle, 'p1')).toEqual([]);
    expect(vorfahrenZugeklappt(alle, 't2')).toEqual([]);
  });
});
