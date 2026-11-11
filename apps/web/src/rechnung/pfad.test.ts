// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88: Adressen der Rechnungsliste und der Prüfansicht, und wohin die App nach Rückgängig oder Wiederholen an
// einer Rechnung wechselt.

import type { AuftragsLeistungsverzeichnisId, ProjektId, Rechnung, RechnungId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { rechnungenPfad, rechnungPfad, rechnungsadresse, rechnungZiel } from './pfad';

const P = 'p1' as ProjektId;
const A = 'a1' as AuftragsLeistungsverzeichnisId;
const R = 'r1' as RechnungId;
const rechnung = { id: R, auftragsLvId: A } as Rechnung;

describe('Adressen', () => {
  it('Liste je Auftrags-LV und Prüfansicht je Rechnung', () => {
    expect(rechnungenPfad(P, A)).toBe('/projekt/p1/auftrag/a1/rechnungen');
    expect(rechnungPfad(P, A, R)).toBe('/projekt/p1/auftrag/a1/rechnungen/r1');
  });
  it('liest beide Adressen zurück, andere nicht', () => {
    expect(rechnungsadresse('/projekt/p1/auftrag/a1/rechnungen')).toEqual({
      projektId: P,
      auftragsLvId: A,
      rechnungId: null,
    });
    expect(rechnungsadresse('/projekt/p1/auftrag/a1/rechnungen/r1')).toEqual({
      projektId: P,
      auftragsLvId: A,
      rechnungId: R,
    });
    expect(rechnungsadresse('/projekt/p1/auftrag/a1')).toBeNull();
    expect(rechnungsadresse('/projekt/p1/auftrag/a1/rechnungen/r1/x')).toBeNull();
  });
});

describe('rechnungZiel', () => {
  const anlegen = { rechnung: { vorher: null, nachher: rechnung } };
  const aendern = { rechnung: { vorher: rechnung, nachher: rechnung } };

  it('Anlegen wiederholt: zur Prüfansicht; zurückgenommen: zur Liste', () => {
    expect(rechnungZiel(P, anlegen, false, '/')).toBe('/projekt/p1/auftrag/a1/rechnungen/r1');
    expect(rechnungZiel(P, anlegen, true, '/projekt/p1/auftrag/a1/rechnungen/r1')).toBe(
      '/projekt/p1/auftrag/a1/rechnungen',
    );
  });
  it('eine Änderung bleibt auf der Liste oder der Prüfansicht derselben Rechnung, sonst zur Prüfansicht', () => {
    expect(rechnungZiel(P, aendern, true, '/projekt/p1/auftrag/a1/rechnungen')).toBeNull();
    expect(rechnungZiel(P, aendern, false, '/projekt/p1/auftrag/a1/rechnungen/r1')).toBeNull();
    expect(rechnungZiel(P, aendern, true, '/lv/x')).toBe('/projekt/p1/auftrag/a1/rechnungen/r1');
  });
});
