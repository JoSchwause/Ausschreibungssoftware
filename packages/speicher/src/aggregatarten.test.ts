// SPDX-License-Identifier: AGPL-3.0-or-later
// Die Tabelle der Aggregatarten (Ticket 135, SA6): genau ein Eintrag je `ChangeSet['art']`, in der Reihenfolge der Abhängigkeiten,
// und jede Tabelle eines Eintrags gibt es im aktuellen Schema mit Kennung und Projekt.

import type { AggregatBezug, ChangeSet } from '@tethys/vertrag';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { AGGREGATARTEN, AGGREGATART_NAMEN, aggregatDes, type AggregatChangeSet } from './aggregatarten';
import { neuerKern } from './testhilfe/node';

describe('AGGREGATARTEN', () => {
  it('hat genau einen Eintrag je ChangeSet-Art', () => {
    // Vertrag v1.7c (Ticket 160): `projektbestand` ist eine Art eines ChangeSets, aber kein Aggregat.
    expectTypeOf<keyof typeof AGGREGATARTEN>().toEqualTypeOf<Exclude<ChangeSet['art'], 'projektbestand'>>();
    expectTypeOf<(typeof AGGREGATART_NAMEN)[number]>().toEqualTypeOf<AggregatBezug['art']>();
    expect(new Set(AGGREGATART_NAMEN).size).toBe(AGGREGATART_NAMEN.length);
  });

  it('steht in der Reihenfolge der Abhängigkeiten (so schreibt der Import)', () => {
    expect(AGGREGATART_NAMEN).toEqual([
      'projekt',
      'leistungsverzeichnis',
      'angebot',
      'auftrags-leistungsverzeichnis',
      'aufmass',
      'rechnung',
      'kostenermittlung',
      'bauwerksmodell',
      'bauzeitenplan',
      'honorarberechnung',
      'mangel',
      'bautagebucheintrag',
    ]);
  });

  it('nennt Tabellen, die es im aktuellen Schema mit id und projekt_id gibt', async () => {
    const { db } = await neuerKern();
    for (const art of AGGREGATART_NAMEN) {
      const { tabelle } = AGGREGATARTEN[art];
      const spalten = db.zeilen(`SELECT name FROM pragma_table_info(?)`, [tabelle]).map((z) => z['name']);
      expect(spalten, tabelle).toContain('id');
      expect(spalten, tabelle).toContain(art === 'projekt' ? 'name' : 'projekt_id');
    }
  });

  it('aggregatDes liefert Art und Kennung wie AggregatBezug', () => {
    const cs = {
      art: 'mangel',
      mangelId: 'm-1',
      mangel: { vorher: null, nachher: null },
    } as unknown as AggregatChangeSet;
    expect(aggregatDes(cs)).toEqual({ art: 'mangel', id: 'm-1' });
  });
});
