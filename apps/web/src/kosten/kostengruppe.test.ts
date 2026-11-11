// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Betrag, Kostengruppennummer, PositionId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { Knoten } from '@tethys/vertrag';
import { inGliederung, kgEingabe, kostengruppenBefehle, positionenInReihenfolge } from './kostengruppe';

const kg = (s: string): Kostengruppennummer => s as Kostengruppennummer;
const pid = (s: string): PositionId => s as PositionId;
const eintrag = (n: string) => ({ nummer: kg(n), betrag: '1.00' as Betrag });

describe('kgEingabe', () => {
  it('leer entfernt die Zuordnung', () => {
    expect(kgEingabe('')).toEqual({ ok: true, wert: null });
    expect(kgEingabe('   ')).toEqual({ ok: true, wert: null });
  });

  it('drei Ziffern gelten, Leerraum am Rand fällt weg', () => {
    expect(kgEingabe(' 331 ')).toEqual({ ok: true, wert: '331' });
  });

  it('eine formwidrige Nummer ist ein Zellfehler mit deutscher Meldung', () => {
    for (const s of ['33', '3311', 'abc', '033', '3,1']) {
      const r = kgEingabe(s);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.fehler).toMatch(/drei Ziffern/);
    }
  });
});

describe('kostengruppenBefehle', () => {
  const ps = [
    { id: pid('a'), kostengruppe: kg('330') },
    { id: pid('b') },
    { id: pid('c'), kostengruppe: kg('331') },
  ];

  it('ein Befehl je gewählter Position mit anderem Wert', () => {
    expect(kostengruppenBefehle(ps, [pid('a'), pid('b'), pid('c')], kg('331'))).toEqual([
      { art: 'KostengruppeSetzen', positionId: 'a', kostengruppe: '331' },
      { art: 'KostengruppeSetzen', positionId: 'b', kostengruppe: '331' },
    ]);
  });

  it('nicht gewählte Positionen bleiben unberührt', () => {
    expect(kostengruppenBefehle(ps, [pid('b')], kg('400'))).toHaveLength(1);
  });

  it('null entfernt; eine Position ohne KG ist schon leer', () => {
    expect(kostengruppenBefehle(ps, [pid('a'), pid('b')], null)).toEqual([
      { art: 'KostengruppeSetzen', positionId: 'a', kostengruppe: null },
    ]);
  });
});

describe('inGliederung', () => {
  const e = [{ eintraege: [eintrag('320'), eintrag('330')] }];

  it('Eintrag, Vorfahre und Nachfahre eines Eintrags liegen in der Gliederung', () => {
    expect(inGliederung(kg('330'), e)).toBe(true);
    expect(inGliederung(kg('331'), e)).toBe(true); // unter 330
    expect(inGliederung(kg('300'), e)).toBe(true); // Vorfahre von 320 und 330
  });

  it('eine fremde Gruppe liegt außerhalb; ohne Ermittlung ebenso', () => {
    expect(inGliederung(kg('400'), e)).toBe(false);
    expect(inGliederung(kg('330'), [])).toBe(false);
  });
});

describe('positionenInReihenfolge', () => {
  const k = (id: string, art: 'titel' | 'position', elternId: string, reihenfolge: number) =>
    ({ id, art, elternId, reihenfolge }) as unknown as Knoten;

  it('Tiefensuche nach Reihenfolge, nur Positionen', () => {
    const knoten = [
      k('p3', 'position', 'w', 1),
      k('t1', 'titel', 'w', 0),
      k('p2', 'position', 't1', 1),
      k('p1', 'position', 't1', 0),
    ];
    expect(positionenInReihenfolge('w', knoten).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
  });
});
