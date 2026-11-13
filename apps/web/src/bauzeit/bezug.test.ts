// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 155 (Ticket 124 §2, §5): Bezug eines Vorgangs auf einzelne Knoten und der Vorschlag des Fortschritts aus dem
// Leistungsstand. Das Auftrags-LV ist `typisch` mit dem Angebot von Bieter A (wie in der Abrechnung); erwartet wird, was
// aus der Regel D-109.7 folgt: alles aufgemessen = 100 %, nichts = 0 %.

import type { Aufmass, AufmassId, Knoten, Menge, Vorgangsbezug } from '@tethys/vertrag';
import { beforeAll, describe, expect, it } from 'vitest';
import { mitAuftrag, type Aufbau } from '../abrechnung/testhilfen';
import { fortschrittAusAbrechnung, knotenFiltern, knotenwahl } from './bezug';

let auf: Aufbau;
beforeAll(async () => {
  auf = await mitAuftrag();
});

const knoten = (): readonly Knoten[] => auf.auftrag.auftragsLeistungsverzeichnis.knoten;

/** Ein Blatt, das die genannten Positionen mit ihrer vollen Auftragsmenge aufmisst. */
function blatt(positionen: readonly Knoten[]): Aufmass {
  const a = auf.auftrag.auftragsLeistungsverzeichnis;
  return {
    id: 'b1' as AufmassId,
    projektId: a.projektId,
    auftragsLvId: a.id,
    nummer: 1,
    bezeichnung: '',
    datum: null,
    positionen: positionen.flatMap((p) =>
      p.art === 'position' && p.menge !== null
        ? [{ positionId: p.id, mengenansatz: null, menge: p.menge as Menge }]
        : [],
    ),
  };
}

describe('Knoten zur Wahl', () => {
  it('Gliederungen und Positionen in der Reihenfolge des LV, mit OZ, Text und Tiefe; keine Hinweistexte', () => {
    const w = knotenwahl(knoten());
    // `typisch` als Auftrags-LV: 3 Titel und 24 Positionen (die Alternative entfällt ohne Wahl).
    expect(w.filter((k) => k.art === 'position')).toHaveLength(24);
    expect(w.filter((k) => k.art !== 'position').map((k) => [k.label.slice(0, 2), k.tiefe])).toEqual([
      ['01', 0],
      ['02', 0],
      ['03', 0],
    ]);
    const erste = w[1];
    expect(erste?.label.startsWith('01.0010 ')).toBe(true);
    expect(erste?.tiefe).toBe(1);
  });

  it('die Suche grenzt ein; gewählte Knoten bleiben sichtbar, höchstens die Grenze an Treffern', () => {
    const w = knotenwahl(knoten());
    const zweiter = w.find((k) => k.label.startsWith('02 '));
    if (zweiter === undefined) throw new Error('Titel 02');
    const r = knotenFiltern(w, '02.00', new Set([zweiter.id]), 3);
    expect(r.treffer).toBeGreaterThan(3);
    expect(r.zeilen.map((k) => k.id)).toContain(zweiter.id);
    expect(r.zeilen.filter((k) => k.label.includes('02.00'))).toHaveLength(3);
    expect(knotenFiltern(w, '', new Set(), 1000).zeilen).toHaveLength(w.length);
  });
});

describe('Fortschritt aus dem Leistungsstand', () => {
  const ganz = (): Vorgangsbezug => ({
    art: 'auftrags-leistungsverzeichnis',
    id: auf.auftrag.auftragsLeistungsverzeichnis.id,
    knotenIds: null,
  });

  it('ohne Aufmaß 0 %, mit allen Mengen 100 %', () => {
    expect(fortschrittAusAbrechnung(ganz(), { auftrag: auf.auftrag, blaetter: [] })).toBe('0.00');
    expect(fortschrittAusAbrechnung(ganz(), { auftrag: auf.auftrag, blaetter: [blatt(knoten())] })).toBe(
      '100.00',
    );
  });

  it('bei Bezug auf eine Gliederung zählen nur deren Positionen', () => {
    const w = knotenwahl(knoten());
    const titel = w.find((k) => k.label.startsWith('02 '));
    if (titel === undefined) throw new Error('Titel 02');
    const unter = knoten().filter((k) => k.elternId === titel.id);
    const nurTitel: Vorgangsbezug = { ...ganz(), knotenIds: [titel.id] as Vorgangsbezug['knotenIds'] };
    const stand = { auftrag: auf.auftrag, blaetter: [blatt(unter)] };
    expect(fortschrittAusAbrechnung(nurTitel, stand)).toBe('100.00');
    const gesamt = fortschrittAusAbrechnung(ganz(), stand);
    expect(gesamt).not.toBeNull();
    expect(Number(gesamt)).toBeGreaterThan(0);
    expect(Number(gesamt)).toBeLessThan(100);
  });

  it('kein Vorschlag ohne Bezug auf dieses Auftrags-LV', () => {
    const stand = { auftrag: auf.auftrag, blaetter: [] };
    expect(fortschrittAusAbrechnung(null, stand)).toBeNull();
    expect(
      fortschrittAusAbrechnung({ art: 'leistungsverzeichnis', id: 'x' as never, knotenIds: null }, stand),
    ).toBeNull();
  });
});
