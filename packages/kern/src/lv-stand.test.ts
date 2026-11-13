// SPDX-License-Identifier: AGPL-3.0-or-later
// LvStandAnlegen (Ticket 42, Punkt 6): das ChangeSet trägt nur den Kopf des Stands; den Zustand friert `speicher` ein.
// Zuerst geschrieben (Q1).

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { LvChangeSet, LvStand, LvStandBefehl, LvStandId, Zeitstempel } from '@tethys/vertrag';
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

// Eigenschaft (Review D-82, M2): Löschen und Undo ergeben einen Stand, der dem ursprünglichen gleicht, `angelegt`
// eingeschlossen; Umbenennen und Undo den ursprünglichen Kopf. Der Stand wird hier so aus der Umkehrung gebaut, wie `speicher`
// ihn ablegt: Kopf aus `lvStand.nachher`, Zeitpunkt und Zustand aus `lvStandInhalt.nachher`.
describe('Eigenschaft: Undo eines Stand-Befehls stellt den Stand her', () => {
  const zustandArb = fc
    .array(fc.tuple(fc.integer({ min: 0, max: 999_999 }), fc.integer({ min: 0, max: 99_999_999 })), {
      maxLength: 6,
    })
    .map((zeilen) =>
      lvMit(
        zeilen.map(([m, e], i) =>
          posKnoten(`P${String(i)}`, LV_ID, i, (m / 1000).toFixed(3), (e / 1000).toFixed(3)),
        ),
      ),
    );
  const standArb = fc
    .record({
      name: fc.string({ minLength: 1 }).filter((n) => n.trim() !== ''),
      angelegt: fc
        .date({
          min: new Date('2000-01-01T00:00:00Z'),
          max: new Date('2099-12-31T23:59:59Z'),
          noInvalidDate: true,
        })
        .map((d) => d.toISOString() as Zeitstempel),
      zustand: zustandArb,
    })
    .map((r): LvStand => ({ id: STAND, leistungsverzeichnisId: LV_ID, ...r }));

  /** Der Stand, den `speicher` aus einem ChangeSet mit `lvStand.nachher` und `lvStandInhalt.nachher` ablegt. */
  const abgelegt = (cs: LvChangeSet): LvStand | null => {
    const kopf = cs.lvStand?.nachher;
    const inhalt = cs.lvStandInhalt?.nachher;
    return kopf && inhalt ? { ...kopf, ...inhalt } : null;
  };

  it('LvStandLoeschen, dann die Umkehrung: derselbe Stand (tief gleich, mit angelegt)', () => {
    fc.assert(
      fc.property(standArb, (stand) => {
        const cs = erwarteOk(lvStandBefehlAusfuehren(stand, { art: 'LvStandLoeschen', lvStandId: STAND }));
        expect(abgelegt(cs)).toBeNull();
        expect(abgelegt(changeSetUmkehren(cs))).toEqual(stand);
        expect(changeSetUmkehren(changeSetUmkehren(cs))).toEqual(cs);
      }),
      { numRuns: 100 },
    );
  });

  it('LvStandUmbenennen, dann die Umkehrung: der ursprüngliche Kopf, kein Inhalt', () => {
    fc.assert(
      fc.property(standArb, fc.string({ minLength: 1 }), (stand, name) => {
        fc.pre(name.trim() !== '' && name !== stand.name);
        const cs = erwarteOk(
          lvStandBefehlAusfuehren(stand, { art: 'LvStandUmbenennen', lvStandId: STAND, name }),
        );
        const u = changeSetUmkehren(cs);
        expect(u.lvStand).toEqual({
          vorher: { id: STAND, leistungsverzeichnisId: LV_ID, name },
          nachher: { id: STAND, leistungsverzeichnisId: LV_ID, name: stand.name },
        });
        expect(u).not.toHaveProperty('lvStandInhalt');
      }),
      { numRuns: 100 },
    );
  });
});
