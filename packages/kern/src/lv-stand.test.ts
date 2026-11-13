// SPDX-License-Identifier: AGPL-3.0-or-later
// LvStandAnlegen (Ticket 42, Punkt 6): das ChangeSet trägt nur den Kopf des Stands; den Zustand friert `speicher` ein.
// Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type { LvStand, LvStandBefehl, LvStandId, Zeitstempel } from '@tethys/vertrag';
import {
  ZUSTAENDIGES_TICKET,
  changeSetUmkehren,
  lvBefehlAusfuehren,
  lvChangeSetAnwenden,
  lvStandBefehlAusfuehren,
} from './index';
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

// --- LvStandUmbenennen, LvStandLoeschen (Vertrag v1.7a, D-127.1; Ticket 137) ---------------------------------------------

describe('LV-Stand umbenennen und löschen', () => {
  const zustand = lvMit([posKnoten('P1', LV_ID, 0, '2.000', '10.000')]);
  const stand: LvStand = {
    id: STAND,
    leistungsverzeichnisId: LV_ID,
    name: 'Vor Versand',
    angelegt: '2026-11-01T10:00:00.000Z' as Zeitstempel,
    zustand,
  };
  const kopf = { id: STAND, leistungsverzeichnisId: LV_ID, name: 'Vor Versand' };
  const leer = {
    art: 'leistungsverzeichnis',
    leistungsverzeichnisId: LV_ID,
    kopf: null,
    knoten: { hinzugefuegt: [], geaendert: [], entfernt: [] },
    summen: KEINE_SUMMEN,
  };

  it('Umbenennen: lvStand mit beiden Köpfen, die sich nur im Namen unterscheiden; kein lvStandInhalt', () => {
    const cs = erwarteOk(
      lvStandBefehlAusfuehren(stand, { art: 'LvStandUmbenennen', lvStandId: STAND, name: 'Versand' }),
    );
    expect(cs).toEqual({ ...leer, lvStand: { vorher: kopf, nachher: { ...kopf, name: 'Versand' } } });
    expect(cs).not.toHaveProperty('lvStandInhalt');
  });

  it('Umbenennen auf denselben Namen: leeres ChangeSet ohne lvStand', () => {
    const cs = erwarteOk(
      lvStandBefehlAusfuehren(stand, { art: 'LvStandUmbenennen', lvStandId: STAND, name: 'Vor Versand' }),
    );
    expect(cs).toEqual(leer);
  });

  it('Umbenennen mit leerem Namen (auch nur Leerraum): ungueltige-eingabe, feld name, wie beim Anlegen', () => {
    for (const name of ['', '  ']) {
      const e = lvStandBefehlAusfuehren(stand, { art: 'LvStandUmbenennen', lvStandId: STAND, name });
      expect(e.ok ? null : [e.fehler.code, e.fehler.feld]).toEqual(['ungueltige-eingabe', 'name']);
    }
  });

  it('Löschen: lvStand nachher null und lvStandInhalt mit angelegt und Zustand', () => {
    const cs = erwarteOk(lvStandBefehlAusfuehren(stand, { art: 'LvStandLoeschen', lvStandId: STAND }));
    expect(cs).toEqual({
      ...leer,
      lvStand: { vorher: kopf, nachher: null },
      lvStandInhalt: { vorher: { angelegt: stand.angelegt, zustand }, nachher: null },
    });
  });

  it('Kopf und Inhalt tragen nur ihre Felder, auch wenn der Stand mehr mitbringt', () => {
    const mehr = { ...stand, extra: 1 } as LvStand;
    const cs = erwarteOk(lvStandBefehlAusfuehren(mehr, { art: 'LvStandLoeschen', lvStandId: STAND }));
    expect(cs.lvStand?.vorher).toEqual(kopf);
    expect(cs.lvStandInhalt?.vorher).toEqual({ angelegt: stand.angelegt, zustand });
  });

  it('die Umkehrung tauscht lvStand und lvStandInhalt; zweimal umgekehrt ist das ChangeSet selbst', () => {
    const cs = erwarteOk(lvStandBefehlAusfuehren(stand, { art: 'LvStandLoeschen', lvStandId: STAND }));
    const u = changeSetUmkehren(cs);
    expect(u.lvStand).toEqual({ vorher: null, nachher: kopf });
    expect(u.lvStandInhalt).toEqual({ vorher: null, nachher: { angelegt: stand.angelegt, zustand } });
    expect(changeSetUmkehren(u)).toEqual(cs);
  });

  it('der Zustand des LV bleibt beim Anwenden unverändert', () => {
    for (const befehl of [
      { art: 'LvStandUmbenennen', lvStandId: STAND, name: 'Neu' } as const,
      { art: 'LvStandLoeschen', lvStandId: STAND } as const,
    ]) {
      const cs = erwarteOk(lvStandBefehlAusfuehren(stand, befehl));
      expect(lvChangeSetAnwenden(zustand, cs)).toBe(zustand);
      expect(lvChangeSetAnwenden(zustand, changeSetUmkehren(cs))).toBe(zustand);
    }
  });

  it('eine fremde Kennung: befehl-nicht-zustaendig', () => {
    const fremd = 'stand-2' as LvStandId;
    for (const befehl of [
      { art: 'LvStandUmbenennen', lvStandId: fremd, name: 'X' } as const,
      { art: 'LvStandLoeschen', lvStandId: fremd } as const,
    ]) {
      const e = lvStandBefehlAusfuehren(stand, befehl);
      expect(e.ok ? null : e.fehler.code).toBe('befehl-nicht-zustaendig');
    }
  });

  it('eine unbekannte Befehlsart (Protokoll): befehl-nicht-zustaendig', () => {
    const e = lvStandBefehlAusfuehren(stand, {
      art: 'Unbekannt',
      lvStandId: STAND,
    } as unknown as LvStandBefehl);
    expect(e.ok ? null : e.fehler.code).toBe('befehl-nicht-zustaendig');
  });
});
