// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Honorarberechnung, HonorarberechnungId, ProjektId, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { honorarPfad, honorarRoute, honorarZiel, honorarberechnungPfad } from './pfad';

const projektId = 'p1' as ProjektId;
const id = 'h1' as HonorarberechnungId;
const h: Honorarberechnung = {
  id,
  projektId,
  name: 'A',
  objekte: [],
  nebenkosten: null,
  mwstSatz: '19.00' as Prozent,
};

describe('Adressen der Honorarseiten', () => {
  it('erkennt Liste und Berechnung und lässt fremde Pfade aus', () => {
    expect(honorarRoute(honorarPfad(projektId))).toEqual({ art: 'liste', projektId });
    expect(honorarRoute(honorarberechnungPfad(projektId, id))).toEqual({ art: 'berechnung', projektId, id });
    expect(honorarRoute('/projekt/p1/kosten')).toBeNull();
    expect(honorarRoute('/projekt/p1/honorar/h1/x')).toBeNull();
  });
});

describe('Ziel nach Rückgängig und Wiederholen', () => {
  const anlegen = { honorarberechnung: { vorher: null, nachher: h } };
  const loeschen = { honorarberechnung: { vorher: h, nachher: null } };
  const aendern = { honorarberechnung: { vorher: h, nachher: { ...h, name: 'B' } } };
  const seite = honorarberechnungPfad(projektId, id);
  const liste = honorarPfad(projektId);

  it('Anlegen: Wiederholen zeigt die Berechnung, Rückgängig die Liste', () => {
    expect(honorarZiel(projektId, anlegen, false, liste)).toBe(seite);
    expect(honorarZiel(projektId, anlegen, true, seite)).toBe(liste);
    expect(honorarZiel(projektId, anlegen, true, liste)).toBeNull();
  });
  it('Löschen: Rückgängig zeigt die Berechnung, Wiederholen die Liste', () => {
    expect(honorarZiel(projektId, loeschen, true, liste)).toBe(seite);
    expect(honorarZiel(projektId, loeschen, false, seite)).toBe(liste);
  });
  it('Ändern: die Berechnung; auf ihr bleibt man', () => {
    expect(honorarZiel(projektId, aendern, true, liste)).toBe(seite);
    expect(honorarZiel(projektId, aendern, false, seite)).toBeNull();
  });
});
