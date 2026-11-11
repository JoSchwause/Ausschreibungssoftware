// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests je Testdatei (Ticket 76). Die Sollwerte stehen hier von Hand, abgelesen aus der XML-Datei bzw. aus der
// Herleitung in `testdaten/README.md`; sie werden nie aus dem Leser erzeugt.

import { describe, expect, it } from 'vitest';
import { xrechnungLesen } from './index';
import type { Eingangsrechnung, Rechnungsposition } from './index';
import { kosit } from './testhilfen';

/** Position mit allen Feldern; nicht genannte Felder sind leer. */
function position(p: Partial<Rechnungsposition>): Rechnungsposition {
  return {
    kennung: null,
    menge: null,
    einheit: null,
    nettobetrag: null,
    nettopreis: null,
    bezeichnung: null,
    artikelnummerVerkaeufer: null,
    artikelnummerKaeufer: null,
    unterpositionen: [],
    ...p,
  } as Rechnungsposition;
}

/**
 * Geschäftsfall 01.01a der KoSIT, in UBL und CII gleich: zwei Positionen zu 7 %. Rechnung: 288,79 + 26,07 = 314,86;
 * 7 % von 314,86 = 22,0402 → 22,04; 314,86 + 22,04 = 336,90. Die Datei schreibt `336.9` (eine Stelle), das ist
 * kanonisch genug und kein Befund.
 */
const FALL_0101A = {
  spezifikation: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
  rechnungsnummer: '123456XX',
  rechnungsdatum: '2016-04-04',
  rechnungsart: '380',
  waehrung: 'EUR',
  kaeuferreferenz: '04011000-12345-03',
  vertragsnummer: null,
  bestellnummer: null,
  verkaeufer: { name: '[Seller name]', umsatzsteuerId: 'DE 123456789' },
  kaeufer: { name: '[Buyer name]' },
  summen: {
    summePositionen: '314.86',
    summeAbschlaege: null,
    summeZuschlaege: null,
    netto: '314.86',
    umsatzsteuer: '22.04',
    brutto: '336.90',
    bereitsGezahlt: null,
    rundungsbetrag: null,
    zahlbetrag: '336.90',
  },
  umsatzsteueraufschluesselung: [{ kategorie: 'S', satz: '7.00', basis: '314.86', betrag: '22.04' }],
  positionen: [
    position({
      kennung: 'Zeitschrift [...]',
      menge: '1.000',
      einheit: 'XPP',
      nettobetrag: '288.79',
      nettopreis: '288.790',
      bezeichnung: 'Zeitschrift [...]',
      artikelnummerVerkaeufer: '246',
    }),
    position({
      kennung: 'Porto + Versandkosten',
      menge: '1.000',
      einheit: 'XPP',
      nettobetrag: '26.07',
      nettopreis: '26.070',
      bezeichnung: 'Porto + Versandkosten',
    }),
  ],
} as unknown as Eingangsrechnung;

describe('KoSIT 01.01a', () => {
  it('UBL: alle Felder, keine Befunde', () => {
    const lesung = xrechnungLesen(kosit('01.01a-INVOICE_ubl.xml'));
    expect(lesung.syntax).toBe('ubl');
    expect(lesung.rechnung).toEqual(FALL_0101A);
    expect(lesung.befunde).toEqual([]);
  });

  it('CII: dieselbe Rechnung wie in UBL, keine Befunde', () => {
    const lesung = xrechnungLesen(kosit('01.01a-INVOICE_uncefact.xml'));
    expect(lesung.syntax).toBe('cii');
    expect(lesung.rechnung).toEqual(FALL_0101A);
    expect(lesung.befunde).toEqual([]);
  });
});
