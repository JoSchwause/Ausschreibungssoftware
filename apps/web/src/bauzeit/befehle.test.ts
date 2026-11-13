// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 118: Formularfelder → Befehle am Bauzeitenplan (N4: de-DE nur hier am Rand). Erwartete Werte aus den Eingaben.
import type {
  Bauzeitenplan,
  BauzeitenplanId,
  IdQuelle,
  ProjektId,
  Prozent,
  Vorgang,
  VorgangId,
} from '@tethys/vertrag';
import { bauzeitenplanBefehlAusfuehren, bauzeitenplanChangeSetAnwenden } from '@tethys/bauzeit';
import { describe, expect, it } from 'vitest';
import {
  kopfBefehl,
  leererVorgangsentwurf,
  planAnlegenBefehl,
  vorgangEntfernenFrage,
  vorgangSetzenBefehl,
  vorgangVerschiebenBefehl,
  vorgangsentwurf,
  type Kopfentwurf,
  type Vorgangsentwurf,
} from './befehle';

const p = 'p1' as ProjektId;
const id = (s: string): VorgangId => s as VorgangId;

const kopf: Kopfentwurf = {
  name: '  Rohbau ',
  projektbeginn: '01.11.2026',
  arbeitstage: [5, 1, 2, 3, 4],
  bundesland: 'SN',
  freieTage: '24.12.2026; 2026-12-23',
};

const v = (x: Partial<Vorgang> & { id: VorgangId }): Vorgang => ({
  nummer: null,
  bezeichnung: x.id,
  elternId: null,
  dauer: 1,
  vorgaenger: [],
  fruehesterBeginn: null,
  bezug: null,
  ist: null,
  ...x,
});

const plan = (vorgaenge: readonly Vorgang[]): Bauzeitenplan => ({
  id: 'b1' as BauzeitenplanId,
  projektId: p,
  name: 'Rohbau',
  projektbeginn: '2026-11-01',
  kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: 'SN', freieTage: [] },
  vorgaenge,
});

describe('Kopf eines Bauzeitenplans', () => {
  it('Anlegen liest Name, Datum (de-DE oder ISO) und Kalender; Listen geordnet', () => {
    const ids = { bauzeitenplan: () => 'neu' } as unknown as IdQuelle;
    const r = planAnlegenBefehl(ids, p, kopf);
    expect(r).toEqual({
      ok: true,
      wert: {
        art: 'BauzeitenplanAnlegen',
        bauzeitenplan: {
          id: 'neu',
          projektId: p,
          name: 'Rohbau',
          projektbeginn: '2026-11-01',
          kalender: {
            arbeitstage: [1, 2, 3, 4, 5],
            bundesland: 'SN',
            freieTage: ['2026-12-23', '2026-12-24'],
          },
          vorgaenge: [],
        },
      },
    });
  });

  it('Fehler je Feld: Name leer, Datum ungültig, kein Arbeitstag, freier Tag unlesbar', () => {
    const r = kopfBefehl({
      name: ' ',
      projektbeginn: '31.02.2026',
      arbeitstage: [],
      bundesland: null,
      freieTage: 'morgen',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fehler.map((f) => f.feld)).toEqual(['name', 'projektbeginn', 'arbeitstage', 'freieTage']);
  });

  it('KopfSetzen trägt dieselben Werte', () => {
    expect(kopfBefehl({ ...kopf, freieTage: '' })).toEqual({
      ok: true,
      wert: {
        art: 'BauzeitenplankopfSetzen',
        name: 'Rohbau',
        projektbeginn: '2026-11-01',
        kalender: { arbeitstage: [1, 2, 3, 4, 5], bundesland: 'SN', freieTage: [] },
      },
    });
  });
});

describe('Vorgang aus dem Formular', () => {
  const a = v({ id: id('a'), nummer: '1', bezeichnung: 'Gründung', dauer: 0 });
  const a1 = v({ id: id('a1'), nummer: '1.1', elternId: id('a') });
  const a2 = v({ id: id('a2'), nummer: '1.2', elternId: id('a') });
  const b = v({ id: id('b'), nummer: '2' });
  const p4 = plan([a, a1, a2, b]);

  it('neu: alle Felder gelesen, Lage hinter dem letzten Geschwister unter dem Elternteil', () => {
    const e = {
      ...leererVorgangsentwurf(),
      bezeichnung: ' Bodenplatte ',
      nummer: '1.3',
      elternId: id('a'),
      dauer: '5',
      fruehesterBeginn: '02.11.2026',
      beziehungen: [{ vorgaengerId: id('a2'), art: 'ende-anfang' as const, abstand: '-1' }],
      istBeginn: '09.11.2026',
      istEnde: '',
      fortschritt: '40',
    };
    const r = vorgangSetzenBefehl(p4, e, () => id('neu'));
    expect(r).toEqual({
      ok: true,
      wert: {
        art: 'VorgangSetzen',
        nach: 'a2',
        vorgang: {
          id: 'neu',
          nummer: '1.3',
          bezeichnung: 'Bodenplatte',
          elternId: 'a',
          dauer: 5,
          vorgaenger: [{ vorgaengerId: 'a2', art: 'ende-anfang', abstand: -1 }],
          fruehesterBeginn: '2026-11-02',
          bezug: null,
          ist: { beginn: '2026-11-09', ende: null, fortschritt: '40.00' },
        },
      },
    });
  });

  it('neu auf oberster Ebene ohne Nummer, Termin, Ist: hinter dem letzten Vorgang der Ebene', () => {
    const r = vorgangSetzenBefehl(p4, { ...leererVorgangsentwurf(), bezeichnung: 'X', dauer: '0' }, () =>
      id('n'),
    );
    expect(r.ok && r.wert.nach).toBe('b');
    expect(r.ok && r.wert.vorgang).toMatchObject({
      nummer: null,
      fruehesterBeginn: null,
      ist: null,
      dauer: 0,
    });
  });

  it('erster Vorgang eines leeren Plans und erstes Kind: nach = null', () => {
    expect(
      vorgangSetzenBefehl(plan([]), { ...leererVorgangsentwurf(), bezeichnung: 'X', dauer: '1' }, () =>
        id('n'),
      ),
    ).toMatchObject({
      ok: true,
      wert: { nach: null },
    });
    expect(
      vorgangSetzenBefehl(
        p4,
        { ...leererVorgangsentwurf(), bezeichnung: 'X', dauer: '1', elternId: id('b') },
        () => id('n'),
      ),
    ).toMatchObject({ ok: true, wert: { nach: null } });
  });

  it('bearbeiten behält Kennung und Lage; neuer Elternteil hängt hinten an', () => {
    const e = vorgangsentwurf(a2);
    expect(e.id).toBe('a2');
    expect(vorgangSetzenBefehl(p4, { ...e, bezeichnung: 'Neu' }, () => id('x'))).toMatchObject({
      ok: true,
      wert: { nach: 'a1', vorgang: { id: 'a2', bezeichnung: 'Neu' } },
    });
    expect(vorgangSetzenBefehl(p4, vorgangsentwurf(a1), () => id('x'))).toMatchObject({
      ok: true,
      wert: { nach: null },
    });
    expect(vorgangSetzenBefehl(p4, { ...e, elternId: null }, () => id('x'))).toMatchObject({
      ok: true,
      wert: { nach: 'b' },
    });
  });

  it('Entwurf zeigt gespeicherte Werte de-DE und liest sie unverändert zurück', () => {
    const voll = v({
      id: id('c'),
      nummer: '3',
      bezeichnung: 'Mauerwerk',
      dauer: 6,
      fruehesterBeginn: '2026-11-16',
      vorgaenger: [{ vorgaengerId: id('b'), art: 'anfang-ende', abstand: 0 }],
      ist: { beginn: null, ende: '2026-11-20', fortschritt: '12.50' as Prozent },
    });
    const e = vorgangsentwurf(voll);
    expect(e).toMatchObject({
      dauer: '6',
      fruehesterBeginn: '16.11.2026',
      istEnde: '20.11.2026',
      fortschritt: '12,50',
    });
    expect(e.beziehungen).toEqual([{ vorgaengerId: 'b', art: 'anfang-ende', abstand: '0' }]);
    const r = vorgangSetzenBefehl(plan([b, voll]), e, () => id('x'));
    expect(r.ok && r.wert.vorgang).toEqual(voll);
  });

  it('Fehler je Feld, nichts wird geraten (U5: der Nutzer korrigiert im Formular)', () => {
    const r = vorgangSetzenBefehl(
      p4,
      {
        ...leererVorgangsentwurf(),
        bezeichnung: '',
        dauer: '1,5',
        fruehesterBeginn: 'bald',
        beziehungen: [
          { vorgaengerId: null, art: 'ende-anfang', abstand: '0' },
          { vorgaengerId: id('b'), art: 'ende-ende', abstand: 'x' },
        ],
        istBeginn: '32.01.2026',
        fortschritt: '120',
      },
      () => id('n'),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fehler.map((f) => f.feld)).toEqual([
      'bezeichnung',
      'dauer',
      'fruehesterBeginn',
      'beziehung-0-vorgaenger',
      'beziehung-1-abstand',
      'istBeginn',
      'fortschritt',
    ]);
  });

  it('ein unbekannter Vorgänger kommt nie in einen Befehl (D-64)', () => {
    const r = vorgangSetzenBefehl(
      p4,
      {
        ...leererVorgangsentwurf(),
        bezeichnung: 'X',
        dauer: '1',
        beziehungen: [{ vorgaengerId: id('weg'), art: 'ende-anfang', abstand: '0' }],
      },
      () => id('n'),
    );
    expect(r.ok ? [] : r.fehler.map((f) => f.feld)).toEqual(['beziehung-0-vorgaenger']);
  });

  it('Elternteil darf weder der Vorgang selbst noch ein Nachkomme sein', () => {
    const r = vorgangSetzenBefehl(p4, { ...vorgangsentwurf(a), elternId: id('a1') }, () => id('x'));
    expect(r.ok ? [] : r.fehler.map((f) => f.feld)).toEqual(['elternId']);
  });
});

describe('Entfernen fragt nach, wenn Kinder oder Nachfolger mitgehen (Q5)', () => {
  it('nennt Kinder und Nachfolger, sonst null', () => {
    const a = v({ id: id('a') });
    const a1 = v({ id: id('a1'), elternId: id('a') });
    const b = v({ id: id('b'), vorgaenger: [{ vorgaengerId: id('a1'), art: 'ende-anfang', abstand: 0 }] });
    const p3 = plan([a, a1, b]);
    expect(vorgangEntfernenFrage(p3, id('a'))).toEqual({ kinder: 1, nachfolger: 1 });
    expect(vorgangEntfernenFrage(p3, id('a1'))).toEqual({ kinder: 0, nachfolger: 1 });
    expect(vorgangEntfernenFrage(p3, id('b'))).toBeNull();
  });
});

describe('Bezug auf einzelne Knoten (Ticket 155)', () => {
  const pl = plan([]);
  const entwurf = { ...leererVorgangsentwurf(), bezeichnung: 'Mauern', dauer: '5' };
  const bezug = (knotenIds: readonly string[] | null) =>
    ({ art: 'auftrags-leistungsverzeichnis', id: 'a1', knotenIds }) as Vorgangsentwurf['bezug'];

  it('nimmt die gewählten Knoten in den Befehl', () => {
    const r = vorgangSetzenBefehl(pl, { ...entwurf, bezug: bezug(['t1', 'p9']) }, () => id('neu'));
    expect(r.ok && r.wert.vorgang.bezug).toEqual({
      art: 'auftrags-leistungsverzeichnis',
      id: 'a1',
      knotenIds: ['t1', 'p9'],
    });
  });

  it('„ausgewählte Knoten“ ohne Knoten ist ein Feldfehler, kein Befehl', () => {
    const r = vorgangSetzenBefehl(pl, { ...entwurf, bezug: bezug([]) }, () => id('neu'));
    expect(r.ok ? null : r.fehler).toEqual([
      { feld: 'bezugKnoten', meldung: 'Bitte mindestens eine Gliederung oder Position wählen.' },
    ]);
  });
});

describe('Vorgang verschieben (Ticket 155, D-118.3)', () => {
  // Dokumentreihenfolge: A, A1, A2, B, C; A1 und A2 unter A.
  const a = v({ id: id('A') });
  const a1 = v({ id: id('A1'), elternId: id('A') });
  const a2 = v({ id: id('A2'), elternId: id('A') });
  const b = v({ id: id('B'), nummer: '2' });
  const c = v({ id: id('C') });
  const pl = plan([a, a1, a2, b, c]);

  it('nach unten: hinter das nächste Geschwister derselben Ebene, der Vorgang selbst unverändert', () => {
    expect(vorgangVerschiebenBefehl(pl, id('B'), 'runter')).toEqual({
      art: 'VorgangSetzen',
      vorgang: b,
      nach: 'C',
    });
    expect(vorgangVerschiebenBefehl(pl, id('A'), 'runter')).toEqual({
      art: 'VorgangSetzen',
      vorgang: a,
      nach: 'B',
    });
    expect(vorgangVerschiebenBefehl(pl, id('A1'), 'runter')).toEqual({
      art: 'VorgangSetzen',
      vorgang: a1,
      nach: 'A2',
    });
  });

  it('nach oben: hinter das Geschwister vor dem vorigen, als erstes ohne `nach`', () => {
    expect(vorgangVerschiebenBefehl(pl, id('C'), 'hoch')).toEqual({
      art: 'VorgangSetzen',
      vorgang: c,
      nach: 'A',
    });
    expect(vorgangVerschiebenBefehl(pl, id('B'), 'hoch')).toEqual({
      art: 'VorgangSetzen',
      vorgang: b,
      nach: null,
    });
    expect(vorgangVerschiebenBefehl(pl, id('A2'), 'hoch')).toEqual({
      art: 'VorgangSetzen',
      vorgang: a2,
      nach: null,
    });
  });

  it('der Ausführer stellt die Reihenfolge um, Untervorgänge ziehen mit', () => {
    const reihe = (richtung: 'hoch' | 'runter', vid: string): string[] => {
      const b = vorgangVerschiebenBefehl(pl, id(vid), richtung);
      if (b === null) throw new Error('kein Befehl');
      const cs = bauzeitenplanBefehlAusfuehren({ bauzeitenplan: pl }, b);
      if (!cs.ok) throw new Error(JSON.stringify(cs.fehler));
      return (
        bauzeitenplanChangeSetAnwenden({ bauzeitenplan: pl }, cs.wert)?.bauzeitenplan.vorgaenge ?? []
      ).map((x) => x.id);
    };
    expect(reihe('runter', 'A')).toEqual(['B', 'A', 'A1', 'A2', 'C']);
    expect(reihe('hoch', 'C')).toEqual(['A', 'A1', 'A2', 'C', 'B']);
    expect(reihe('runter', 'A1')).toEqual(['A', 'A2', 'A1', 'B', 'C']);
  });

  it('am Rand der Ebene und für einen unbekannten Vorgang kein Befehl', () => {
    expect(vorgangVerschiebenBefehl(pl, id('A'), 'hoch')).toBeNull();
    expect(vorgangVerschiebenBefehl(pl, id('C'), 'runter')).toBeNull();
    expect(vorgangVerschiebenBefehl(pl, id('A2'), 'runter')).toBeNull();
    expect(vorgangVerschiebenBefehl(pl, id('X'), 'hoch')).toBeNull();
  });
});
