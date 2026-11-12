// SPDX-License-Identifier: AGPL-3.0-or-later
// Befehle am Bauzeitenplan (Ticket 109 Punkt 2; `vertrag` v1.6 Punkt 4, D-57, D-97.9): Ausführen, Anwenden, Umkehren. Der
// Ausführer prüft die Form (Fehler); fachlich Auffälliges bleibt ein Befund der Terminrechnung (U5). Sollwerte aus den
// Lesarten an den Vertragstypen und den Beispielen des Vertrags (Ticket 97).

import type {
  Anordnungsbeziehung,
  Bauzeitenplan,
  BauzeitenplanBefehl,
  BauzeitenplanChangeSet,
  BauzeitenplanId,
  BauzeitenplanZustand,
  Befehlsfehler,
  Ergebnis,
  ProjektId,
  Prozent,
  Vorgang,
  VorgangId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  beispielBauzeitenplan,
  beispielBauzeitenplanbefehle,
  beispielChangeSetVorgangEntfernen,
  beispielVorgangEntfernen,
  beispielVorgangSetzen,
} from '../../vertrag/src/beispiele';
import {
  bauzeitenplanBefehlAusfuehren,
  bauzeitenplanChangeSetAnwenden,
  bauzeitenplanChangeSetUmkehren,
} from './index';

/** Führt aus und erwartet ein ChangeSet. */
function ok(zustand: BauzeitenplanZustand | null, befehl: BauzeitenplanBefehl): BauzeitenplanChangeSet {
  const e: Ergebnis<BauzeitenplanChangeSet, Befehlsfehler> = bauzeitenplanBefehlAusfuehren(zustand, befehl);
  if (!e.ok) throw new Error(`${e.fehler.code}: ${e.fehler.meldung}`);
  return e.wert;
}
const zustand = (bauzeitenplan: Bauzeitenplan): BauzeitenplanZustand => ({ bauzeitenplan });

const vid = (id: string): VorgangId => id as VorgangId;
const ea = (vorgaengerId: string, abstand = 0): Anordnungsbeziehung => ({
  vorgaengerId: vid(vorgaengerId),
  art: 'ende-anfang',
  abstand,
});
/** Weitere Felder eines Vorgangs; der Sammelvorgang als Text. */
type Weiteres = Partial<Omit<Vorgang, 'elternId'>> & { readonly elternId?: string };
function vorgang(id: string, weiteres: Weiteres = {}): Vorgang {
  const { elternId, ...rest } = weiteres;
  return {
    id: vid(id),
    nummer: null,
    bezeichnung: `Vorgang ${id}`,
    elternId: elternId === undefined ? null : vid(elternId),
    dauer: 1,
    vorgaenger: [],
    fruehesterBeginn: null,
    bezug: null,
    ist: null,
    ...rest,
  };
}
function planMit(vorgaenge: readonly Vorgang[]): Bauzeitenplan {
  return {
    id: '019b7a12-c000-7000-8000-000000000001' as BauzeitenplanId,
    projektId: '019b7a12-c000-7000-8000-000000000002' as ProjektId,
    name: 'Testplan',
    projektbeginn: '2027-01-04',
    kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: null, freieTage: [] },
    vorgaenge,
  };
}
/**
 * Baum T in Dokumentreihenfolge: A (Sammelvorgang) mit A1, A2 (Sammelvorgang mit A21) und A3; B; C nach A21 und B.
 */
const T = planMit([
  vorgang('A'),
  vorgang('A1', { elternId: 'A' }),
  vorgang('A2', { elternId: 'A' }),
  vorgang('A21', { elternId: 'A2' }),
  vorgang('A3', { elternId: 'A' }),
  vorgang('B'),
  vorgang('C', { vorgaenger: [ea('A21'), ea('B')] }),
]);
const reihe = (p: Bauzeitenplan | null): string[] => (p?.vorgaenge ?? []).map((v) => v.id);
const nachher = (cs: BauzeitenplanChangeSet): Bauzeitenplan => {
  if (cs.bauzeitenplan.nachher === null) throw new Error('gelöscht');
  return cs.bauzeitenplan.nachher;
};
const v = (p: Bauzeitenplan, id: string): Vorgang | undefined => p.vorgaenge.find((x) => x.id === id);

describe('BauzeitenplanAnlegen', () => {
  it('legt den Plan an; Anwenden ergibt ihn, die Umkehrung löscht ihn wieder', () => {
    const cs = ok(null, { art: 'BauzeitenplanAnlegen', bauzeitenplan: beispielBauzeitenplan });
    expect(cs).toEqual({
      art: 'bauzeitenplan',
      bauzeitenplanId: beispielBauzeitenplan.id,
      bauzeitenplan: { vorher: null, nachher: beispielBauzeitenplan },
    });
    expect(bauzeitenplanChangeSetAnwenden(null, cs)).toEqual(zustand(beispielBauzeitenplan));
    const zurueck = bauzeitenplanChangeSetUmkehren(cs);
    expect(zurueck.bauzeitenplan).toEqual({ vorher: beispielBauzeitenplan, nachher: null });
    expect(bauzeitenplanChangeSetAnwenden(zustand(beispielBauzeitenplan), zurueck)).toBeNull();
  });
});

describe('Beispiele des Vertrags (Ticket 97)', () => {
  const plan = zustand(beispielBauzeitenplan);
  const ids = (p: Bauzeitenplan | null): string[] => (p?.vorgaenge ?? []).map((v) => v.bezeichnung);

  it('VorgangSetzen legt „Dach“ im Rohbau hinter dem Mauerwerk an', () => {
    const cs = ok(plan, beispielVorgangSetzen);
    expect(cs.bauzeitenplan.vorher).toBe(beispielBauzeitenplan);
    expect(ids(cs.bauzeitenplan.nachher)).toEqual([
      'Rohbau',
      'Erdarbeiten',
      'Mauerwerk EG',
      'Dach',
      'Rohbau fertig',
    ]);
    expect(cs.bauzeitenplan.nachher?.vorgaenge[3]).toBe(beispielVorgangSetzen.vorgang);
  });

  it('VorgangEntfernen nimmt das Mauerwerk und die Beziehung des Meilensteins darauf mit', () => {
    expect(ok(plan, beispielVorgangEntfernen)).toEqual(beispielChangeSetVorgangEntfernen);
  });

  it('BauzeitenplankopfSetzen setzt Name, Projektbeginn und Kalender; die Vorgänge bleiben', () => {
    const [, kopf] = beispielBauzeitenplanbefehle;
    const cs = ok(plan, kopf);
    expect(cs.bauzeitenplan.nachher).toEqual({
      ...beispielBauzeitenplan,
      name: kopf.name,
      projektbeginn: '2026-11-23',
      kalender: { ...beispielBauzeitenplan.kalender, arbeitstage: [1, 2, 3, 4, 5, 6] },
    });
  });

  it('BauzeitenplanLoeschen: nachher null, die Umkehrung bringt den vollen Stand zurück', () => {
    const [, , loeschen] = beispielBauzeitenplanbefehle;
    const cs = ok(plan, loeschen);
    expect(cs.bauzeitenplan).toEqual({ vorher: beispielBauzeitenplan, nachher: null });
    expect(bauzeitenplanChangeSetAnwenden(null, bauzeitenplanChangeSetUmkehren(cs))).toEqual(plan);
  });

  it('der leere Plan aus dem Anlegebeispiel', () => {
    const [anlegen] = beispielBauzeitenplanbefehle;
    expect(ok(null, anlegen).bauzeitenplan.nachher).toEqual({ ...beispielBauzeitenplan, vorgaenge: [] });
  });
});

describe('VorgangSetzen: Lage in Dokumentreihenfolge (D-97.9)', () => {
  const setzen = (neu: Vorgang, nach: string | null): Bauzeitenplan =>
    nachher(ok(zustand(T), { art: 'VorgangSetzen', vorgang: neu, nach: nach === null ? null : vid(nach) }));

  it('ein neuer Vorgang mit nach: null steht als erstes Kind bzw. als erster der obersten Ebene', () => {
    expect(reihe(setzen(vorgang('X', { elternId: 'A' }), null))).toEqual([
      'A',
      'X',
      'A1',
      'A2',
      'A21',
      'A3',
      'B',
      'C',
    ]);
    expect(reihe(setzen(vorgang('X'), null))).toEqual(['X', 'A', 'A1', 'A2', 'A21', 'A3', 'B', 'C']);
  });

  it('hinter einem Geschwister mit Teilbaum steht er hinter dessen ganzem Teilbaum', () => {
    expect(reihe(setzen(vorgang('X', { elternId: 'A' }), 'A2'))).toEqual([
      'A',
      'A1',
      'A2',
      'A21',
      'X',
      'A3',
      'B',
      'C',
    ]);
    expect(reihe(setzen(vorgang('X'), 'A'))).toEqual(['A', 'A1', 'A2', 'A21', 'A3', 'X', 'B', 'C']);
  });

  it('beim Ersetzen zieht der Teilbaum mit; seine Kinder bleiben seine Kinder', () => {
    const p = setzen(vorgang('A2', { bezeichnung: 'Rohbau West' }), 'B');
    expect(reihe(p)).toEqual(['A', 'A1', 'A3', 'B', 'A2', 'A21', 'C']);
    expect(v(p, 'A2')?.bezeichnung).toBe('Rohbau West');
    expect(v(p, 'A21')?.elternId).toBe('A2');
  });

  it('wer nicht verschieben will, nennt das Geschwister, hinter dem er schon steht', () => {
    const p = setzen(vorgang('A2', { elternId: 'A', dauer: 7 }), 'A1');
    expect(reihe(p)).toEqual(reihe(T));
    expect(v(p, 'A2')?.dauer).toBe(7);
    expect(p.vorgaenge.filter((x) => x.id !== 'A2')).toEqual(T.vorgaenge.filter((x) => x.id !== 'A2'));
  });
});

describe('VorgangEntfernen: Teilbaum und Beziehungen darauf (D-97.9, D-64)', () => {
  const entfernen = (id: string): Bauzeitenplan =>
    nachher(ok(zustand(T), { art: 'VorgangEntfernen', vorgangId: vid(id) }));

  it('ein Sammelvorgang geht mit seinem Teilbaum; Beziehungen auf entfernte Vorgänge fallen weg', () => {
    const p = entfernen('A2');
    expect(reihe(p)).toEqual(['A', 'A1', 'A3', 'B', 'C']);
    expect(v(p, 'C')?.vorgaenger).toEqual([ea('B')]);
  });

  it('der oberste Sammelvorgang nimmt alle Nachfahren mit', () => {
    const p = entfernen('A');
    expect(reihe(p)).toEqual(['B', 'C']);
    expect(v(p, 'C')?.vorgaenger).toEqual([ea('B')]);
  });

  it('übrige Vorgänge bleiben dieselben Werte (kein Umbau ohne Not)', () => {
    const p = entfernen('A1');
    expect(v(p, 'C')).toBe(v(T, 'C'));
  });
});

/** Führt aus und erwartet einen Fehler; liefert Code und Feld. */
function fehler(vorher: BauzeitenplanZustand | null, befehl: BauzeitenplanBefehl): [string, string | null] {
  const e = bauzeitenplanBefehlAusfuehren(vorher, befehl);
  if (e.ok) throw new Error(`angenommen: ${befehl.art}`);
  expect(e.fehler.meldung.length).toBeGreaterThan(0);
  return [e.fehler.code, e.fehler.feld ?? null];
}

describe('Zuständigkeit', () => {
  it('Anlegen nur ohne Zustand, alles andere nur mit', () => {
    expect(fehler(zustand(T), { art: 'BauzeitenplanAnlegen', bauzeitenplan: T })).toEqual([
      'befehl-nicht-zustaendig',
      null,
    ]);
    expect(fehler(null, { art: 'BauzeitenplanLoeschen' })).toEqual(['befehl-nicht-zustaendig', null]);
    expect(fehler(null, { art: 'VorgangEntfernen', vorgangId: vid('A') })).toEqual([
      'befehl-nicht-zustaendig',
      null,
    ]);
  });
});

const setzenFehler = (neu: Vorgang, nach: string | null = null): [string, string | null] =>
  fehler(zustand(T), { art: 'VorgangSetzen', vorgang: neu, nach: nach === null ? null : vid(nach) });
const angenommen = (neu: Vorgang, nach: string | null = null): boolean =>
  bauzeitenplanBefehlAusfuehren(zustand(T), {
    art: 'VorgangSetzen',
    vorgang: neu,
    nach: nach === null ? null : vid(nach),
  }).ok;
/** Vorgang X mit einem Feld, das der Typ nicht zulässt (wie aus einer Datei). */
const kaputt = (feld: string, wert: unknown): Vorgang => ({ ...vorgang('X'), [feld]: wert });

describe('VorgangSetzen: Fehler der Form (ungueltige-eingabe mit Feld)', () => {
  it.each([
    ['id', ''],
    ['nummer', ''],
    ['bezeichnung', ''],
    ['bezeichnung', '   '],
    ['dauer', -1],
    ['dauer', 2.5],
    ['dauer', Number.NaN],
    ['dauer', 1_000_001],
    ['fruehesterBeginn', '2027-02-30'],
    ['fruehesterBeginn', '04.01.2027'],
  ])('%s = %j', (feld, wert) => {
    expect(setzenFehler(kaputt(feld, wert))).toEqual(['ungueltige-eingabe', feld]);
  });

  it.each<[string, Anordnungsbeziehung]>([
    ['unbekannter Vorgänger (D-97.9: Fehler, kein Befund)', ea('fehlt')],
    ['Bezug auf sich selbst', ea('X')],
    ['unbekannte Art', { ...ea('B'), art: 'ende-mitte' } as unknown as Anordnungsbeziehung],
    ['Abstand nicht ganzzahlig', ea('B', 1.5)],
    ['Abstand über der Grenze', ea('B', -1_000_001)],
  ])('Anordnungsbeziehung: %s', (_, b) => {
    expect(setzenFehler(vorgang('X', { vorgaenger: [b] }))).toEqual(['ungueltige-eingabe', 'vorgaenger']);
  });

  it('dasselbe Paar aus Vorgänger und Art zweimal ist ein Fehler, zwei Arten zum selben Vorgänger nicht', () => {
    expect(setzenFehler(vorgang('X', { vorgaenger: [ea('B'), ea('B', 2)] }))).toEqual([
      'ungueltige-eingabe',
      'vorgaenger',
    ]);
    const zweiArten: Anordnungsbeziehung[] = [
      { vorgaengerId: vid('B'), art: 'anfang-anfang', abstand: 0 },
      { vorgaengerId: vid('B'), art: 'ende-ende', abstand: 0 },
    ];
    expect(angenommen(vorgang('X', { vorgaenger: zweiArten }))).toBe(true);
  });

  it.each<[string, Vorgang['ist']]>([
    ['nichts erfasst hat nur die Schreibweise null', { beginn: null, ende: null, fortschritt: null }],
    ['Ist-Beginn kein Datum', { beginn: '2027-01-32', ende: null, fortschritt: null }],
    ['Ist-Ende kein Datum', { beginn: '2027-01-04', ende: 'gestern', fortschritt: null }],
    ['Fortschritt über 100', { beginn: null, ende: null, fortschritt: '100.01' as Prozent }],
    ['Fortschritt negativ', { beginn: null, ende: null, fortschritt: '-1.00' as Prozent }],
    ['Fortschritt nicht mit zwei Stellen (N3)', { beginn: null, ende: null, fortschritt: '50' as Prozent }],
  ])('Ist-Termine: %s', (_, ist) => {
    expect(setzenFehler(vorgang('X', { ist }))).toEqual(['ungueltige-eingabe', 'ist']);
  });

  it.each<[string, unknown]>([
    ['unbekannte Art', { art: 'angebot', id: 'lv-1', knotenIds: null }],
    ['ohne Kennung', { art: 'leistungsverzeichnis', id: '', knotenIds: null }],
    [
      'leere Knotenliste (das ganze LV heißt null)',
      { art: 'leistungsverzeichnis', id: 'lv-1', knotenIds: [] },
    ],
    ['doppelter Knoten', { art: 'auftrags-leistungsverzeichnis', id: 'alv-1', knotenIds: ['p1', 'p1'] }],
  ])('Vorgangsbezug: %s', (_, bezug) => {
    expect(setzenFehler(kaputt('bezug', bezug))).toEqual(['ungueltige-eingabe', 'bezug']);
  });
});

describe('VorgangSetzen: Fehler der Gliederung und der Lage', () => {
  it('ein unbekannter Sammelvorgang', () => {
    expect(setzenFehler(vorgang('X', { elternId: 'fehlt' }))).toEqual(['eltern-unbekannt', 'elternId']);
  });

  it('unter sich selbst oder einem eigenen Nachfahren: zyklus', () => {
    expect(setzenFehler(vorgang('A2', { elternId: 'A2' }))).toEqual(['zyklus', 'elternId']);
    expect(setzenFehler(vorgang('A', { elternId: 'A21' }))).toEqual(['zyklus', 'elternId']);
  });

  it('nach: unbekannt, ein anderer Elternteil oder der Vorgang selbst', () => {
    expect(setzenFehler(vorgang('X'), 'fehlt')).toEqual(['ungueltige-eingabe', 'nach']);
    expect(setzenFehler(vorgang('X'), 'A1')).toEqual(['ungueltige-eingabe', 'nach']);
    expect(setzenFehler(vorgang('X', { elternId: 'A' }), 'B')).toEqual(['ungueltige-eingabe', 'nach']);
    expect(setzenFehler(vorgang('B'), 'B')).toEqual(['ungueltige-eingabe', 'nach']);
  });
});

describe('Fachliches bleibt ein Befund der Terminrechnung, kein Fehler (U5)', () => {
  it('ein Zyklus über Anordnungsbeziehungen', () => {
    expect(angenommen(vorgang('B', { vorgaenger: [ea('C')] }), 'A')).toBe(true);
  });

  it('Beziehung auf einen Sammelvorgang, Terminvorgabe an einem Sammelvorgang', () => {
    expect(angenommen(vorgang('X', { vorgaenger: [ea('A')] }))).toBe(true);
    expect(angenommen(vorgang('A2', { elternId: 'A', fruehesterBeginn: '2027-02-01' }), 'A1')).toBe(true);
  });

  it('Ist-Ende vor Ist-Beginn und Ist-Ende ohne Ist-Beginn', () => {
    const ist = (beginn: string | null): Vorgang['ist'] => ({
      beginn,
      ende: '2027-01-05',
      fortschritt: null,
    });
    expect(angenommen(vorgang('X', { ist: ist('2027-01-08') }))).toBe(true);
    expect(angenommen(vorgang('X', { ist: ist(null) }))).toBe(true);
  });
});

describe('VorgangEntfernen: Fehler', () => {
  it('eine Kennung ohne Vorgang im Plan: knoten-unbekannt', () => {
    expect(fehler(zustand(T), { art: 'VorgangEntfernen', vorgangId: vid('fehlt') })).toEqual([
      'knoten-unbekannt',
      'vorgangId',
    ]);
  });
});
