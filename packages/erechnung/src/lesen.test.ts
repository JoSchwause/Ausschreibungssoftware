// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests je Testdatei (Ticket 76). Die Sollwerte stehen hier von Hand, abgelesen aus der XML-Datei bzw. aus der
// Herleitung in `testdaten/README.md`; sie werden nie aus dem Leser erzeugt.

import type { Pruefbefund } from '@tethys/vertrag';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { xrechnungLesen } from './index';
import type { Eingangsrechnung, Rechnungsposition } from './index';
import { kosit, testdatei } from './testhilfen';

/** Erwartete Position: Werte als einfache Texte; nicht genannte Felder sind leer. */
type Positionserwartung = { readonly [K in keyof Rechnungsposition]?: unknown };

/** Position mit allen Feldern; nicht genannte Felder sind leer. */
function position(p: Positionserwartung): Positionserwartung {
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
  };
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

describe('KoSIT 04.04a (UBL, Schlussrechnung Bau mit Unterpositionen der Extension)', () => {
  const lesung = xrechnungLesen(kosit('04.04a-INVOICE_ubl.xml'));
  /** Unterposition ohne Artikelnummern; Mengen und Preise auf die Skala des Vertrags aufgefüllt. */
  const unter = (
    kennung: string,
    menge: string,
    einheit: string,
    nettobetrag: string,
    nettopreis: string,
    bezeichnung: string,
  ) => position({ kennung, menge, einheit, nettobetrag, nettopreis, bezeichnung });

  it('liest Kopf und Summen; BT-106 zählt nur die oberste Ebene', () => {
    expect(lesung.syntax).toBe('ubl');
    expect(lesung.befunde).toEqual([]);
    expect({ ...lesung.rechnung, positionen: undefined }).toEqual({
      spezifikation:
        'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0#conformant#urn:xeinkauf.de:kosit:extension:xrechnung_3.0',
      rechnungsnummer: '17794',
      rechnungsdatum: '2021-07-14',
      rechnungsart: '877',
      waehrung: 'EUR',
      kaeuferreferenz: '992-90009-96',
      vertragsnummer: null,
      bestellnummer: null,
      verkaeufer: { name: 'Test Gerüstbau GmbH', umsatzsteuerId: 'DE814060619' },
      kaeufer: { name: 'Bau Auftraggeber' },
      summen: {
        summePositionen: '3508.77',
        summeAbschlaege: null,
        summeZuschlaege: null,
        netto: '3508.77',
        umsatzsteuer: '666.67',
        brutto: '4175.44',
        bereitsGezahlt: null,
        rundungsbetrag: null,
        zahlbetrag: '4175.44',
      },
      umsatzsteueraufschluesselung: [{ kategorie: 'S', satz: '19.00', basis: '3508.77', betrag: '666.67' }],
      positionen: undefined,
    });
  });

  it('liest die Unterpositionen als Baum, ohne Wert zu verlieren', () => {
    expect(lesung.rechnung?.positionen).toEqual([
      position({
        kennung: '1',
        menge: '1.000',
        einheit: 'EA',
        nettobetrag: '3508.77',
        nettopreis: '3508.770',
        bezeichnung: 'Arbeitsgerüst',
        unterpositionen: [
          position({
            kennung: '1.02',
            menge: '1.000',
            einheit: 'EA',
            nettobetrag: '3508.77',
            bezeichnung: 'Zwischensumme',
            unterpositionen: [
              unter('1.02.005', '277.290', 'MTK', '2024.22', '7.300', 'Fassadengerüst, Gr.3'),
              unter('1.02.006', '3882.083', 'MKW', '465.85', '0.120', 'Fassadengerüst, Gebrauchsüberlassung'),
              unter('1.02.007', '5.210', 'MTR', '119.57', '22.950', 'Gerüstträger für Durchfahrt einbauen'),
              unter(
                '1.02.008',
                '72.932',
                'MRW',
                '32.09',
                '0.440',
                'Gerüstträger für Durchf., Gebrauchsüberl.',
              ),
              unter('1.02.009', '1.000', 'EA', '216.00', '216.000', 'Treppenturm/Geschoss, Außengerüst'),
              unter('1.02.010', '18.000', 'HWE', '72.00', '4.000', 'Treppenturm Gebrauchsüberl.'),
              unter('1.02.011', '112.000', 'MTR', '453.60', '4.050', 'Systemkonsolbelag 0,30 m'),
              unter('1.02.012', '1568.000', 'MRW', '125.44', '0.080', 'Vorhaltung Konsolbelag 0,30'),
            ],
          }),
        ],
      }),
    ]);
  });
});

describe('KoSIT 01.01 comprehensive (CII)', () => {
  const lesung = xrechnungLesen(kosit('01.01_comprehensive_test_uncefact.xml'));

  it('liest alle Felder: Verträge, Abschläge/Zuschläge, BT-110 in Rechnungswährung, zwei Steuerkategorien', () => {
    expect(lesung.syntax).toBe('cii');
    expect(lesung.befunde).toEqual([]);
    expect(lesung.rechnung).toEqual({
      spezifikation: 'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0',
      rechnungsnummer: '1234567',
      rechnungsdatum: '2018-04-13',
      rechnungsart: '380',
      waehrung: 'EUR',
      kaeuferreferenz: '90000000-03083-72',
      vertragsnummer: '0000000752',
      bestellnummer: '65002278',
      verkaeufer: { name: '[Seller name]', umsatzsteuerId: 'ATU123456789' },
      kaeufer: { name: '[Buyer name]' },
      summen: {
        summePositionen: '10781.25',
        summeAbschlaege: '20.00',
        summeZuschlaege: '20.00',
        netto: '10781.25',
        umsatzsteuer: '2048.44',
        brutto: '12829.69',
        bereitsGezahlt: '0.00',
        rundungsbetrag: '0.00',
        zahlbetrag: '12829.69',
      },
      umsatzsteueraufschluesselung: [
        { kategorie: 'S', satz: '19.00', basis: '10781.25', betrag: '2048.44' },
        { kategorie: 'E', satz: '0.00', basis: '0.00', betrag: '0.00' },
      ],
      positionen: [
        // Datei: Menge `30.00000000000`, Preis `158.1250000000`: nur Nullen über die Skala hinaus, also verlustfrei.
        position({
          kennung: '1',
          menge: '30.000',
          einheit: 'XPP',
          nettobetrag: '4743.75',
          nettopreis: '158.125',
          bezeichnung: 'Beratung',
          artikelnummerVerkaeufer: '1034',
          artikelnummerKaeufer: '5034',
        }),
        position({
          kennung: '2',
          menge: '42.000',
          einheit: 'XPP',
          nettobetrag: '6037.50',
          nettopreis: '143.750',
          bezeichnung: 'Beratung',
        }),
      ],
    });
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

describe('Pflichtangaben (pflichtangaben-fehlen.xml)', () => {
  const lesung = xrechnungLesen(testdatei('pflichtangaben-fehlen.xml'));

  it('liest, was da ist, und meldet jede fehlende Pflichtangabe mit ihrem Business Term', () => {
    expect(lesung.syntax).toBe('cii');
    expect(lesung.rechnung?.rechnungsnummer).toBeNull();
    expect(lesung.rechnung?.rechnungsdatum).toBeNull();
    expect(lesung.rechnung?.waehrung).toBeNull();
    expect(lesung.rechnung?.summen.brutto).toBe('178.50');
    expect(lesung.rechnung?.positionen.map((p) => p.nettobetrag)).toEqual(['100.00', null]);
    expect(kern(lesung.befunde)).toEqual([
      { code: 'pflichtangabe-fehlt', feld: 'BT-1', schwere: 'fehler' },
      { code: 'pflichtangabe-fehlt', feld: 'BT-2', schwere: 'fehler' },
      { code: 'pflichtangabe-fehlt', feld: 'BT-5', schwere: 'fehler' },
      { code: 'pflichtangabe-fehlt', feld: 'BT-109', schwere: 'fehler' },
      { code: 'pflichtangabe-fehlt', feld: 'BT-115', schwere: 'fehler' },
      { code: 'pflichtangabe-fehlt', feld: 'BT-131', schwere: 'fehler' },
    ]);
  });

  it('verortet eine fehlende Positionsangabe an ihrer Position', () => {
    const b = lesung.befunde.find((x) => x.ort.feld === 'BT-131');
    expect(b?.ort.pfad).toBe(
      '/CrossIndustryInvoice/SupplyChainTradeTransaction/IncludedSupplyChainTradeLineItem[2]',
    );
  });
});

describe('Auffällige Werte (auffaellige-werte.xml)', () => {
  const lesung = xrechnungLesen(testdatei('auffaellige-werte.xml'));

  it('meldet Spezifikation, Datum, Währung, unlesbare Zahl und zu viele Stellen, ohne Rechenfehler', () => {
    expect(kern(lesung.befunde)).toEqual([
      { code: 'spezifikation-unbekannt', feld: 'BT-24', schwere: 'warnung' },
      { code: 'datum-ungueltig', feld: 'BT-2', schwere: 'fehler' },
      { code: 'waehrung-nicht-eur', feld: 'BT-5', schwere: 'warnung' },
      { code: 'zahl-ungueltig', feld: 'BT-113', schwere: 'fehler' },
      { code: 'betrag-nicht-kanonisch', feld: 'BT-131', schwere: 'warnung' },
      { code: 'preis-zu-viele-stellen', feld: 'BT-146', schwere: 'warnung' },
      { code: 'menge-zu-viele-stellen', feld: 'BT-129', schwere: 'warnung' },
    ]);
  });

  it('rundet Beträge kaufmännisch, lässt Mengen und Preise exakt (nie still gekürzt)', () => {
    const r = lesung.rechnung;
    expect(r?.rechnungsdatum).toBeNull();
    expect(r?.waehrung).toBe('USD');
    expect(r?.summen.bereitsGezahlt).toBeNull();
    expect(r?.positionen.map((p) => [p.menge, p.nettopreis, p.nettobetrag])).toEqual([
      ['10.000', '12.3456', '123.46'],
      ['0.1234', '100.000', '12.34'],
    ]);
  });
});

describe('Gutschrift und Namensräume', () => {
  it('liest eine UBL-Gutschrift (CreditNote, 381) mit Standard-Namensraum und fremdem Präfix', () => {
    const lesung = xrechnungLesen(testdatei('gutschrift-381.xml'));
    expect(lesung.syntax).toBe('ubl');
    expect(lesung.befunde).toEqual([]);
    expect(lesung.rechnung).toMatchObject({
      rechnungsnummer: 'GS-2026-001',
      rechnungsdatum: '2026-11-05',
      rechnungsart: '381',
      summen: {
        summePositionen: '50.00',
        netto: '50.00',
        umsatzsteuer: '9.50',
        brutto: '59.50',
        zahlbetrag: '59.50',
      },
      positionen: [
        position({
          kennung: '1',
          menge: '2.000',
          einheit: 'H87',
          nettobetrag: '50.00',
          nettopreis: '25.000',
          bezeichnung: 'Rücknahme Gerüstteile',
        }),
      ],
    });
  });

  it('erkennt CII über die Namensraum-URI, nicht über das Präfix', () => {
    const original = kosit('01.01a-INVOICE_uncefact.xml');
    const umbenannt = original
      .replaceAll('rsm:', 'r:')
      .replaceAll('ram:', 'a:')
      .replaceAll('udt:', 'u:')
      .replaceAll('xmlns:rsm=', 'xmlns:r=')
      .replaceAll('xmlns:ram=', 'xmlns:a=')
      .replaceAll('xmlns:udt=', 'xmlns:u=');
    expect(umbenannt).not.toContain('ram:');
    expect(xrechnungLesen(umbenannt)).toEqual(xrechnungLesen(original));
  });

  it('weist eine Wurzel mit UBL-Namen, aber fremdem Namensraum ab', () => {
    const fremd = kosit('01.01a-INVOICE_ubl.xml').replace(
      'xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
      'xmlns:ubl="urn:example:invoice"',
    );
    const lesung = xrechnungLesen(fremd);
    expect(lesung.syntax).toBeNull();
    expect(lesung.rechnung).toBeNull();
    expect(kern(lesung.befunde)).toEqual([{ code: 'keine-xrechnung', feld: undefined, schwere: 'fehler' }]);
  });
});

describe('Unterpositionen in CII (cii-unterpositionen.xml)', () => {
  const lesung = xrechnungLesen(testdatei('cii-unterpositionen.xml'));

  it('hängt Positionen mit ParentLineID unter ihre Oberposition; BT-106 zählt nur die oberste Ebene', () => {
    expect(lesung.rechnung?.rechnungsart).toBe('876');
    expect(lesung.rechnung?.positionen).toEqual([
      position({
        kennung: '1',
        nettobetrag: '100.00',
        bezeichnung: 'Titel 1 Erdarbeiten',
        unterpositionen: [
          position({
            kennung: '1.1',
            menge: '25.000',
            einheit: 'MTK',
            nettobetrag: '60.00',
            nettopreis: '2.400',
            bezeichnung: 'Oberboden abtragen',
          }),
          position({
            kennung: '1.2',
            menge: '5.000',
            einheit: 'MTQ',
            nettobetrag: '40.00',
            nettopreis: '8.000',
            bezeichnung: 'Boden lösen',
          }),
        ],
      }),
      position({
        kennung: '2.1',
        menge: '0.500',
        einheit: 'HUR',
        nettobetrag: '20.00',
        nettopreis: '40.000',
        bezeichnung: 'Stundenlohn',
      }),
    ]);
  });

  it('liest eine Unterposition ohne vorangehende Oberposition als eigene Position, mit Befund', () => {
    expect(lesung.befunde).toEqual([
      expect.objectContaining({
        code: 'unterposition-ohne-oberposition',
        schwere: 'warnung',
        ort: {
          pfad: '/CrossIndustryInvoice/SupplyChainTradeTransaction/IncludedSupplyChainTradeLineItem[4]',
        },
      }),
    ]);
  });
});

describe('Umsatzsteueraufschlüsselung', () => {
  const kopfsteuer =
    '<ram:RateApplicablePercent>19</ram:RateApplicablePercent>\n            </ram:ApplicableTradeTax>\n' +
    '            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>';

  it('meldet einen fehlenden Steuerbetrag (BT-117) statt einer Rechenabweichung', () => {
    const text = testdatei('bau-abschlag-875.xml').replace(
      '<ram:CalculatedAmount>1935.34</ram:CalculatedAmount>',
      '',
    );
    const lesung = xrechnungLesen(text);
    expect(lesung.rechnung?.umsatzsteueraufschluesselung[0]?.betrag).toBeNull();
    expect(kern(lesung.befunde)).toEqual([
      { code: 'pflichtangabe-fehlt', feld: 'BT-117', schwere: 'fehler' },
    ]);
  });

  it('lässt einen Satz mit mehr als 2 Stellen exakt stehen, mit Befund', () => {
    const original = testdatei('bau-abschlag-875.xml');
    expect(original).toContain(kopfsteuer);
    const lesung = xrechnungLesen(original.replace(kopfsteuer, kopfsteuer.replace('>19<', '>19.125<')));
    expect(lesung.rechnung?.umsatzsteueraufschluesselung[0]?.satz).toBe('19.125');
    expect(kern(lesung.befunde)).toEqual([
      { code: 'satz-zu-viele-stellen', feld: 'BT-119', schwere: 'warnung' },
    ]);
  });
});

describe('gemeinsame Befundliste (Ticket 104, D-95.2)', () => {
  it('jeder Befund ist ein Pruefbefund der Quelle erechnung-lesen, auch bei nicht gelesenen Dateien', () => {
    const dateien = [
      xrechnungLesen(testdatei('rechenfehler.xml')),
      xrechnungLesen(testdatei('pflichtangaben-fehlen.xml')),
      xrechnungLesen('<a><b></a>'),
      xrechnungLesen('<Fremd xmlns="urn:x"/>'),
    ];
    const alle = dateien.flatMap((l) => l.befunde);
    expect(alle.length).toBeGreaterThan(5);
    expectTypeOf(dateien[0]?.befunde).toEqualTypeOf<readonly Pruefbefund[] | undefined>();
    for (const b of alle) expect(b.quelle).toBe('erechnung-lesen');
  });

  it('Ort nach D-95.2: Summenregel nur feld, Datei als Ganzes nur pfad, unlesbares XML mit zeile', () => {
    const summe = xrechnungLesen(testdatei('rechenfehler.xml')).befunde[0];
    expect(summe?.ort).toEqual({ feld: 'BT-106' });
    const fremd = xrechnungLesen('<Fremd xmlns="urn:x"/>').befunde[0];
    expect(fremd?.ort).toEqual({ pfad: '/Fremd' });
    const kaputt = xrechnungLesen('<a><b></a>').befunde[0];
    expect(kaputt?.ort.zeile).toBe(1);
    expect(kaputt?.ort.knotenId).toBeUndefined();
  });
});
