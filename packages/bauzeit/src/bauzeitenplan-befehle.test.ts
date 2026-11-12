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
