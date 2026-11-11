// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Menge, Position, PositionId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  ansatzBefehl,
  ansatzBerechnen,
  entwurfAusPosition,
  zeileAnlegen,
  zeileLoeschen,
  zeileVerschieben,
  type Ansatzentwurf,
} from './ansatz';

const z = (zeile: number, ausdruck: string, variable = ''): Ansatzentwurf => ({
  schluessel: zeile,
  zeile,
  formel: 91,
  ausdruck,
  variable,
});

const position = (extra: Partial<Position> = {}): Position =>
  ({
    art: 'position',
    id: 'p1' as PositionId,
    menge: '4.000' as Menge,
    einheit: 'm',
    ...extra,
  }) as unknown as Position;

describe('entwurfAusPosition', () => {
  it('ohne Ansatz: leer', () => {
    expect(entwurfAusPosition(position())).toEqual([]);
  });
  it('mit Ansatz: Zeilen in Reihenfolge, Variable null wird leerer Text', () => {
    const p = position({
      mengenansatz: [
        { zeile: 1, formel: 91, ausdruck: '2*3', variable: 'a' },
        { zeile: 2, formel: 91, ausdruck: 'a+1', variable: null },
      ],
    });
    const e = entwurfAusPosition(p);
    expect(e.map((x) => [x.zeile, x.ausdruck, x.variable])).toEqual([
      [1, '2*3', 'a'],
      [2, 'a+1', ''],
    ]);
    expect(new Set(e.map((x) => x.schluessel)).size).toBe(2);
  });
});

describe('Zeilen bearbeiten', () => {
  it('anlegen: neue Nummer ist größte + 1, Einfügeort hinter dem Index, eindeutiger Schlüssel', () => {
    const r = zeileAnlegen([z(1, 'a'), z(5, 'b')], 0);
    expect(r.map((x) => x.zeile)).toEqual([1, 6, 5]);
    expect(new Set(r.map((x) => x.schluessel)).size).toBe(3);
  });
  it('anlegen in leerer Folge: Zeile 1', () => {
    expect(zeileAnlegen([], -1).map((x) => x.zeile)).toEqual([1]);
  });
  it('löschen: Nummern der übrigen bleiben', () => {
    expect(zeileLoeschen([z(1, 'a'), z(2, 'b'), z(3, 'c')], 1).map((x) => x.zeile)).toEqual([1, 3]);
  });
  it('verschieben: tauscht mit dem Nachbarn, am Rand keine Wirkung', () => {
    const l = [z(1, 'a'), z(2, 'b'), z(3, 'c')];
    expect(zeileVerschieben(l, 1, -1).map((x) => x.zeile)).toEqual([2, 1, 3]);
    expect(zeileVerschieben(l, 1, 1).map((x) => x.zeile)).toEqual([1, 3, 2]);
    expect(zeileVerschieben(l, 0, -1)).toBe(l);
    expect(zeileVerschieben(l, 2, 1)).toBe(l);
  });
});

describe('ansatzBerechnen (rechnet nur das Paket mengen)', () => {
  it('leere Zeilen zählen nicht; Zeilenergebnisse und Summe kommen aus mengen', () => {
    const r = ansatzBerechnen([z(1, '2*3', 'a'), z(2, ''), z(3, 'a+0,5')]);
    expect(r.summe).toBe('12.500');
    expect(r.zeilen.map((x) => x.zeile)).toEqual([1, 3]);
    expect(r.zeilen.every((x) => x.fehler === null)).toBe(true);
  });
  it('ein Fehler hat Spalte und macht die Summe null', () => {
    const r = ansatzBerechnen([z(1, '2*3'), z(2, '(1+2')]);
    expect(r.summe).toBeNull();
    expect(r.zeilen[1]?.fehler).toMatchObject({ code: 'klammer-fehlt', spalte: 0 });
  });
});

describe('ansatzBefehl', () => {
  it('ein Befehl mit Ansatz und Summe', () => {
    const b = ansatzBefehl(position(), [z(1, '2*3', 'a'), z(2, 'a+1')]);
    expect(b).toEqual({
      art: 'MengenansatzSetzen',
      positionId: 'p1',
      mengenansatz: [
        { zeile: 1, formel: 91, ausdruck: '2*3', variable: 'a' },
        { zeile: 2, formel: 91, ausdruck: 'a+1', variable: null },
      ],
      menge: '13.000',
    });
  });
  it('Fehler im Ansatz: menge null (D-22 b), Ansatz wird trotzdem gesetzt', () => {
    const b = ansatzBefehl(position(), [z(1, '2*3'), z(2, '1/0')]);
    expect(b?.menge).toBeNull();
    expect(b?.mengenansatz).toHaveLength(2);
  });
  it('unverändert gegenüber dem gespeicherten Ansatz: kein Befehl', () => {
    const p = position({ mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '2*3', variable: null }] });
    expect(ansatzBefehl(p, entwurfAusPosition(p))).toBeNull();
  });
  it('alle Zeilen entfernt: Ansatz entfernen, Menge bleibt wie gespeichert', () => {
    const p = position({ mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '2*3', variable: null }] });
    expect(ansatzBefehl(p, [])).toEqual({
      art: 'MengenansatzSetzen',
      positionId: 'p1',
      mengenansatz: null,
      menge: '4.000',
    });
  });
  it('ohne Ansatz und ohne Zeilen: nichts zu tun', () => {
    expect(ansatzBefehl(position(), [z(1, '')])).toBeNull();
  });
});
