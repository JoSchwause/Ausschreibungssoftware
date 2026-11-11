// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests je Testdatei (Ticket 76). Die Sollwerte stehen hier von Hand, abgelesen aus der XML-Datei bzw. aus der
// Herleitung in `testdaten/README.md`; sie werden nie aus dem Leser erzeugt.

import { describe, expect, it } from 'vitest';
import { xrechnungLesen } from './index';
import type { Eingangsrechnung, Rechnungsposition } from './index';
import { kosit, testdatei } from './testhilfen';

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

/** Kopf der beiden Bau-Rechnungen (selbst verfasst). */
const BAU_KOPF = {
  spezifikation: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
  waehrung: 'EUR',
  kaeuferreferenz: '991-01234-56',
  vertragsnummer: 'V-2026-014',
  bestellnummer: 'BEST-2026-0815',
  verkaeufer: { name: 'Beispielbau GmbH', umsatzsteuerId: 'DE000000000' },
  kaeufer: { name: 'Gemeinde Beispielstadt' },
};

describe('Bau (selbst verfasst, Herleitung in testdaten/README.md)', () => {
  it('1. Abschlagsrechnung 875 in CII: Felder, Summen, keine Befunde', () => {
    const lesung = xrechnungLesen(testdatei('bau-abschlag-875.xml'));
    expect(lesung.syntax).toBe('cii');
    expect(lesung.befunde).toEqual([]);
    expect(lesung.rechnung).toEqual({
      ...BAU_KOPF,
      rechnungsnummer: 'AR-2026-001',
      rechnungsdatum: '2026-09-15',
      rechnungsart: '875',
      summen: {
        summePositionen: '10185.99',
        summeAbschlaege: null,
        summeZuschlaege: null,
        netto: '10185.99',
        umsatzsteuer: '1935.34',
        brutto: '12121.33',
        bereitsGezahlt: null,
        rundungsbetrag: null,
        zahlbetrag: '12121.33',
      },
      umsatzsteueraufschluesselung: [{ kategorie: 'S', satz: '19.00', basis: '10185.99', betrag: '1935.34' }],
      positionen: [
        position({
          kennung: '01.0010',
          menge: '1.000',
          einheit: 'LS',
          nettobetrag: '2500.00',
          nettopreis: '2500.000',
          bezeichnung: 'Baustelleneinrichtung',
          artikelnummerVerkaeufer: 'BE-100',
          artikelnummerKaeufer: 'LV-01.0010',
        }),
        position({
          kennung: '02.0010',
          menge: '120.500',
          einheit: 'MTQ',
          nettobetrag: '2217.20',
          nettopreis: '18.400',
          bezeichnung: 'Bodenaushub',
          artikelnummerKaeufer: 'LV-02.0010',
        }),
        position({
          kennung: '02.0020',
          menge: '85.250',
          einheit: 'MTK',
          nettobetrag: '5468.79',
          nettopreis: '64.150',
          bezeichnung: 'Mauerwerk',
          artikelnummerKaeufer: 'LV-02.0020',
        }),
      ],
    });
  });

  it('Schlussrechnung 877 in UBL: Nachlass, angerechnete Abschlagszahlung, keine Befunde', () => {
    const lesung = xrechnungLesen(testdatei('bau-schluss-877.xml'));
    expect(lesung.syntax).toBe('ubl');
    expect(lesung.befunde).toEqual([]);
    expect(lesung.rechnung).toEqual({
      ...BAU_KOPF,
      rechnungsnummer: 'SR-2026-001',
      rechnungsdatum: '2026-11-02',
      rechnungsart: '877',
      summen: {
        summePositionen: '10842.46',
        summeAbschlaege: '325.27',
        summeZuschlaege: null,
        netto: '10517.19',
        umsatzsteuer: '1998.27',
        brutto: '12515.46',
        bereitsGezahlt: '12121.33',
        rundungsbetrag: null,
        zahlbetrag: '394.13',
      },
      umsatzsteueraufschluesselung: [{ kategorie: 'S', satz: '19.00', basis: '10517.19', betrag: '1998.27' }],
      positionen: [
        position({
          kennung: '01.0010',
          menge: '1.000',
          einheit: 'LS',
          nettobetrag: '2500.00',
          nettopreis: '2500.000',
          bezeichnung: 'Baustelleneinrichtung',
          artikelnummerVerkaeufer: 'BE-100',
          artikelnummerKaeufer: 'LV-01.0010',
        }),
        position({
          kennung: '02.0010',
          menge: '131.250',
          einheit: 'MTQ',
          nettobetrag: '2415.00',
          nettopreis: '18.400',
          bezeichnung: 'Bodenaushub',
          artikelnummerKaeufer: 'LV-02.0010',
        }),
        position({
          kennung: '02.0020',
          menge: '92.400',
          einheit: 'MTK',
          nettobetrag: '5927.46',
          nettopreis: '64.150',
          bezeichnung: 'Mauerwerk',
          artikelnummerKaeufer: 'LV-02.0020',
        }),
      ],
    });
  });
});

/** Code, Feld und Schwere je Befund: der stabile Teil für Golden-Vergleiche (die Meldung ist Text für Menschen). */
const kern = (befunde: readonly { code: string; schwere: string; ort: { feld?: string } }[]) =>
  befunde.map((b) => ({ code: b.code, feld: b.ort.feld, schwere: b.schwere }));

describe('Rechenprüfung (rechenfehler.xml)', () => {
  const lesung = xrechnungLesen(testdatei('rechenfehler.xml'));

  it('liest die Rechnung trotz Rechenfehlern (U5)', () => {
    expect(lesung.rechnung?.summen).toEqual({
      summePositionen: '10185.90',
      summeAbschlaege: null,
      summeZuschlaege: null,
      netto: '10185.99',
      umsatzsteuer: '1935.43',
      brutto: '12121.33',
      bereitsGezahlt: '5000.00',
      rundungsbetrag: null,
      zahlbetrag: '7121.42',
    });
  });

  it('meldet jede der fünf Rechenregeln genau einmal', () => {
    expect(kern(lesung.befunde)).toEqual([
      { code: 'summe-positionen-falsch', feld: 'BT-106', schwere: 'fehler' },
      { code: 'netto-falsch', feld: 'BT-109', schwere: 'fehler' },
      { code: 'umsatzsteuer-falsch', feld: 'BT-110', schwere: 'fehler' },
      { code: 'brutto-falsch', feld: 'BT-112', schwere: 'fehler' },
      { code: 'zahlbetrag-falsch', feld: 'BT-115', schwere: 'fehler' },
    ]);
  });

  it('nennt Dateiwert und Sollwert in der Meldung', () => {
    const b = lesung.befunde.find((x) => x.code === 'summe-positionen-falsch');
    expect(b?.meldung).toContain('10.185,90');
    expect(b?.meldung).toContain('10.185,99');
  });
});
