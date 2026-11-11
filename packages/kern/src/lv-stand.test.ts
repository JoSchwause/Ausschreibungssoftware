// SPDX-License-Identifier: AGPL-3.0-or-later
// LvStandAnlegen (Ticket 42, Punkt 6): das ChangeSet trägt nur den Kopf des Stands; den Zustand friert `speicher` ein.
// Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type { LvStandId } from '@tethys/vertrag';
import { ZUSTAENDIGES_TICKET, changeSetUmkehren, lvBefehlAusfuehren, lvChangeSetAnwenden } from './index';
import { KEINE_SUMMEN, LV_ID, erwarteOk, lvMit, posKnoten } from './testhilfen';

const STAND = 'stand-1' as LvStandId;

describe('LvStandAnlegen', () => {
  const z = lvMit([posKnoten('P1', LV_ID, 0, '2.000', '10.000')]);

  it('ist zuständig; ZUSTAENDIGES_TICKET nennt den Befehl nicht mehr', () => {
    expect(Object.keys(ZUSTAENDIGES_TICKET)).not.toContain('LvStandAnlegen');
  });

  it('ChangeSet: nur lvStand mit vorher null, sonst leer', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'LvStandAnlegen', id: STAND, name: 'Vor Versand' }));
    expect(cs).toEqual({
      art: 'leistungsverzeichnis',
      leistungsverzeichnisId: LV_ID,
      kopf: null,
      knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
      summen: KEINE_SUMMEN,
      lvStand: { vorher: null, nachher: { id: STAND, leistungsverzeichnisId: LV_ID, name: 'Vor Versand' } },
    });
  });

  it('ein Stand verändert den LV-Zustand nicht; die Umkehrung trägt nachher null', () => {
    const cs = erwarteOk(lvBefehlAusfuehren(z, { art: 'LvStandAnlegen', id: STAND, name: 'Stand' }));
    expect(lvChangeSetAnwenden(z, cs)).toBe(z);
    const u = changeSetUmkehren(cs);
    expect(u.lvStand).toEqual({ vorher: cs.lvStand?.nachher, nachher: null });
    expect(lvChangeSetAnwenden(z, u)).toBe(z);
  });

  it('leerer Name (auch nur Leerraum): ungueltige-eingabe, feld name', () => {
    for (const name of ['', '   ']) {
      const e = lvBefehlAusfuehren(z, { art: 'LvStandAnlegen', id: STAND, name });
      expect(e.ok ? null : [e.fehler.code, e.fehler.feld]).toEqual(['ungueltige-eingabe', 'name']);
    }
  });

  it('Kennung des LV oder eines Knotens: id-vergeben', () => {
    for (const kennung of [LV_ID, 'P1']) {
      const e = lvBefehlAusfuehren(z, { art: 'LvStandAnlegen', id: kennung as LvStandId, name: 'Stand' });
      expect(e.ok ? null : e.fehler.code).toBe('id-vergeben');
    }
  });
});
