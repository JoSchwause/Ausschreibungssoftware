// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 30, Punkt 11: Projektbefehle (ADR 0011). Zuerst geschrieben (Q1).

import { describe, expect, it } from 'vitest';
import type { Bauherr, Bieter, BieterId, Projekt, ProjektBefehl, ProjektId } from '@tethys/vertrag';
import { projektBefehlAusfuehren, projektChangeSetAnwenden, projektChangeSetUmkehren } from './index';
import { erwarteOk } from './testhilfen';

const PID = 'projekt-1' as ProjektId;
const bauherr: Bauherr = { name: 'Gemeinde', anschrift: 'Hauptstraße 1' };
const bieter = (i: string, name = `Bieter ${i}`): Bieter => ({ id: i as BieterId, name });

const anlegen: ProjektBefehl = { art: 'ProjektAnlegen', id: PID, name: 'Schule', bauherr };

/** Führt aus, wendet an und prüft, dass die Umkehrung den Vorzustand herstellt. */
function wende(z: Projekt | null, b: ProjektBefehl): Projekt | null {
  const cs = erwarteOk(projektBefehlAusfuehren(z, b));
  expect(cs.art).toBe('projekt');
  const neu = projektChangeSetAnwenden(z, cs);
  expect(projektChangeSetAnwenden(neu, projektChangeSetUmkehren(cs))).toEqual(z);
  expect(projektChangeSetUmkehren(projektChangeSetUmkehren(cs))).toEqual(cs);
  return neu;
}

function projekt(): Projekt {
  const p = wende(null, anlegen);
  if (p === null) throw new Error('Projekt fehlt');
  return p;
}

const fehlercode = (z: Projekt | null, b: ProjektBefehl): string | undefined => {
  const e = projektBefehlAusfuehren(z, b);
  return e.ok ? undefined : e.fehler.code;
};

describe('ProjektAnlegen', () => {
  it('legt das Projekt ohne Bieter an; ChangeSet vorher null', () => {
    const cs = erwarteOk(projektBefehlAusfuehren(null, anlegen));
    expect(cs).toEqual({
      art: 'projekt',
      projektId: PID,
      projekt: { vorher: null, nachher: { id: PID, name: 'Schule', bauherr, bieter: [] } },
    });
    expect(projekt()).toEqual({ id: PID, name: 'Schule', bauherr, bieter: [] });
  });

  it('leerer Name ist erlaubt (wie FELD_ANNAHMEN)', () => {
    expect(wende(null, { ...anlegen, name: '' })?.name).toBe('');
  });

  it('mit Zustand: befehl-nicht-zustaendig', () => {
    expect(fehlercode(projekt(), anlegen)).toBe('befehl-nicht-zustaendig');
  });

  it('Form: ungueltige-eingabe', () => {
    expect(fehlercode(null, { ...anlegen, id: '' as ProjektId })).toBe('ungueltige-eingabe');
    expect(fehlercode(null, { ...anlegen, name: 3 as unknown as string })).toBe('ungueltige-eingabe');
    expect(fehlercode(null, { ...anlegen, bauherr: null as unknown as Bauherr })).toBe('ungueltige-eingabe');
    expect(fehlercode(null, { ...anlegen, bauherr: { name: 'x', anschrift: 1 } as unknown as Bauherr })).toBe(
      'ungueltige-eingabe',
    );
  });
});

describe('ProjektStammdatenSetzen', () => {
  it('setzt Name und Bauherr, Bieter bleiben', () => {
    const p0 = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    const neuerBauherr: Bauherr = { name: 'Landkreis', anschrift: null };
    const p1 = wende(p0, { art: 'ProjektStammdatenSetzen', name: 'Turnhalle', bauherr: neuerBauherr });
    expect(p1).toEqual({ id: PID, name: 'Turnhalle', bauherr: neuerBauherr, bieter: [bieter('b1')] });
  });

  it('dieselben Werte: vorher gleich nachher (keine Änderung)', () => {
    const p = projekt();
    const cs = erwarteOk(
      projektBefehlAusfuehren(p, { art: 'ProjektStammdatenSetzen', name: 'Schule', bauherr }),
    );
    expect(cs.projekt.vorher).toEqual(cs.projekt.nachher);
  });

  it('ohne Zustand: befehl-nicht-zustaendig; Form: ungueltige-eingabe', () => {
    const b: ProjektBefehl = { art: 'ProjektStammdatenSetzen', name: 'x', bauherr };
    expect(fehlercode(null, b)).toBe('befehl-nicht-zustaendig');
    expect(fehlercode(projekt(), { ...b, bauherr: { anschrift: null } as unknown as Bauherr })).toBe(
      'ungueltige-eingabe',
    );
  });
});

describe('BieterAnlegen', () => {
  it('hängt den Bieter hinten an', () => {
    const p1 = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    const p2 = wende(p1, { art: 'BieterAnlegen', bieter: bieter('b2', '') });
    expect(p2?.bieter).toEqual([bieter('b1'), bieter('b2', '')]);
  });

  it('doppelte Bieter-ID: id-vergeben; ohne Zustand: befehl-nicht-zustaendig; Form: ungueltige-eingabe', () => {
    const p1 = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    expect(fehlercode(p1, { art: 'BieterAnlegen', bieter: bieter('b1', 'anders') })).toBe('id-vergeben');
    expect(fehlercode(null, { art: 'BieterAnlegen', bieter: bieter('b2') })).toBe('befehl-nicht-zustaendig');
    expect(fehlercode(p1, { art: 'BieterAnlegen', bieter: bieter('') })).toBe('ungueltige-eingabe');
    expect(
      fehlercode(p1, { art: 'BieterAnlegen', bieter: { id: 'b3', name: null } as unknown as Bieter }),
    ).toBe('ungueltige-eingabe');
  });
});

describe('ProjektLoeschen', () => {
  it('nachher null, vorher der volle Stand samt Bietern; die Umkehrung legt es wieder an', () => {
    const p = wende(projekt(), { art: 'BieterAnlegen', bieter: bieter('b1') });
    const cs = erwarteOk(projektBefehlAusfuehren(p, { art: 'ProjektLoeschen' }));
    expect(cs.projekt).toEqual({ vorher: p, nachher: null });
    expect(projektChangeSetAnwenden(p, cs)).toBeNull();
    expect(projektChangeSetAnwenden(null, projektChangeSetUmkehren(cs))).toEqual(p);
    expect(wende(p, { art: 'ProjektLoeschen' })).toBeNull();
  });

  it('ohne Zustand: befehl-nicht-zustaendig', () => {
    expect(fehlercode(null, { art: 'ProjektLoeschen' })).toBe('befehl-nicht-zustaendig');
  });
});
