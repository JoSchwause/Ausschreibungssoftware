// SPDX-License-Identifier: AGPL-3.0-or-later
// Rechnungsprüfung (Ticket 81, D-34, D-38, D-44): Golden-Tests gegen die Sollwerte des Tors M4 (Ticket 85) und ein
// Hand-Beispiel mit Rechenweg (absoluter Nachlass, Schlussrechnung mit Gewährleistungseinbehalt, Überzahlung), dazu jeder
// Befund und `freigabeMoeglich`.

import type {
  Aufmass,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  Betrag,
  Menge,
  PositionId,
  Prozent,
  Rechnung,
  RechnungId,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { freigabeMoeglich, rechnungPruefen } from './rechnung-pruefen';
import type { Abzugskette } from './rechnung-pruefen';
import type { FxPruefung } from './testhilfen';
import { PROJEKT, abrechnungsFixture, auftragsLv, m4Stand, position, titel } from './testhilfen';

const fx = abrechnungsFixture();
const m4 = m4Stand();

/** Die Kette in den Feldnamen der Fixture (Ticket 85). */
function wieFixture(k: Abzugskette): FxPruefung['kette'] {
  return {
    leistung: k.leistung,
    nachlass: k.nachlass,
    nettoNachNachlass: k.nettoNachNachlass,
    mwst: k.mwst,
    bruttoKumuliert: k.bruttoKumuliert,
    umlagen: k.umlagen.map((u) => ({ bezeichnung: u.bezeichnung, satz: u.satz, betrag: u.betrag })),
    einbehalt: k.einbehalt.betrag,
    fruehereZahlbetraege: k.fruehereZahlbetraege,
    zahlbetrag: k.zahlbetrag,
  };
}

describe('rechnungPruefen: Tor M4 (Sollwerte aus typisch-abrechnung)', () => {
  const alle = [m4.blatt1, m4.blatt2];
  const ar2Offen = m4.ar2;

  it('AR 1 (Blatt 1): Zahlbetrag 8.874,40 = eingefrorener Betrag, kein Befund', () => {
    const p = rechnungPruefen(m4.ar1, m4.auftrag, alle, [m4.ar1, ar2Offen]);
    expect(wieFixture(p.kette)).toEqual(fx.pruefungen.ar1.kette);
    expect(p.leistungsstand).toEqual(fx.pruefungen.ar1.leistungsstand);
    expect(p.kette.einbehalt).toEqual({ art: 'sicherheit', satz: '5.00', betrag: '469.54' });
    expect(p.forderung).toBeNull();
    expect(p.befunde).toEqual([]);
  });

  it('AR 2 vor der Korrektur: 10.100,84 = 20.079,62 − 100,40 − 1.003,98 − 8.874,40 (eingefroren)', () => {
    const p = rechnungPruefen(ar2Offen, m4.auftrag, alle, [m4.ar1, ar2Offen]);
    expect(wieFixture(p.kette)).toEqual(fx.pruefungen.ar2VorKorrektur.kette);
    expect(p.kette.fruehere).toEqual([{ rechnungId: m4.ar1.id, nummer: 1, zahlbetrag: '8874.40' }]);
    expect(p.befunde).toEqual([]);
  });

  it('nach der Korrektur von Blatt 1 ändert sich AR 2 (10.070,67), AR 1 bleibt eingefroren (D-38)', () => {
    const korrigiert = [m4.blatt1Korrigiert, m4.blatt2];
    const ar2 = rechnungPruefen(ar2Offen, m4.auftrag, korrigiert, [m4.ar1, ar2Offen]);
    expect(wieFixture(ar2.kette)).toEqual(fx.pruefungen.ar2NachKorrektur.kette);
    expect(ar2.leistungsstand).toEqual(fx.pruefungen.ar2NachKorrektur.leistungsstand);
    // AR 1 neu geprüft ergäbe 8.844,23 (Gegenprobe der Fixture); gilt bleibt der eingefrorene Betrag, mit Befund.
    const ar1 = rechnungPruefen(m4.ar1, m4.auftrag, korrigiert, [m4.ar1, ar2Offen]);
    expect(ar1.kette.zahlbetrag).toBe(fx.gegenprobeOhneEinfrieren.ar1Zahlbetrag);
    expect(ar1.befunde).toEqual([
      { code: 'freigabe-abweichend', eingefroren: '8874.40', geprueft: '8844.23', differenz: '30.17' },
    ]);
  });
});

// --- Hand-Beispiel ---------------------------------------------------------------------------------------------------
//
// Auftrags-LV: Titel t mit p1 (10,000 × 10,000 = 100,00) und p2 (5,000 × 20,000 = 100,00), Netto vor Nachlass 200,00,
// absoluter Nachlass 15,00, MwSt 19 %. Umlage 0,50 % (Bauwesenversicherung) in jeder Rechnung.

const AUFTRAG = 'auftrag';
const hand = auftragsLv(
  AUFTRAG,
  [
    titel('t', AUFTRAG, 0, '01'),
    position('p1', 't', 0, '01.0010', '10.000', '10.000'),
    position('p2', 't', 1, '01.0020', '5.000', '20.000'),
  ],
  { nachlass: { art: 'betrag', wert: '15.00' as Betrag } },
);

function blatt(id: string, nummer: number, zeilen: readonly [string, string][]): Aufmass {
  return {
    id: id as AufmassId,
    projektId: PROJEKT,
    auftragsLvId: AUFTRAG as AuftragsLeistungsverzeichnisId,
    nummer,
    bezeichnung: '',
    datum: null,
    positionen: zeilen.map(([p, m]) => ({
      positionId: p as PositionId,
      mengenansatz: null,
      menge: m as Menge,
    })),
  };
}

function rechnung(id: string, nummer: number, art: Rechnung['art'], aufmassIds: readonly string[]): Rechnung {
  return {
    id: id as RechnungId,
    projektId: PROJEKT,
    auftragsLvId: AUFTRAG as AuftragsLeistungsverzeichnisId,
    nummer,
    art,
    eingang: null,
    rechnungsnummerAuftragnehmer: null,
    gefordert: null,
    aufmassIds: aufmassIds as AufmassId[],
    umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: '0.50' as Prozent }],
    sicherheitSatz: '5.00' as Prozent,
    gewaehrleistungSatz: '3.00' as Prozent,
    freigabe: null,
  };
}

const freigegeben = (r: Rechnung, zahlbetrag: string): Rechnung => ({
  ...r,
  freigabe: { zahlbetrag: zahlbetrag as Betrag },
});

const b1 = blatt('b1', 1, [['p1', '4.000']]);
const b2 = blatt('b2', 2, [
  ['p1', '6.000'],
  ['p2', '5.000'],
]);

describe('rechnungPruefen: Hand-Beispiel (absoluter Nachlass, Schlussrechnung, Überzahlung)', () => {
  it('AR 1, Abschlag: anteiliger Nachlass, Sicherheitseinbehalt', () => {
    // Leistung 4,000 × 10,000 = 40,00; Nachlass round(15,00 × 40,00 / 200,00, 2) = 3,00 (D-34 (2)); Netto n. N. 37,00;
    // MwSt round(37,00 × 19 %, 2) = 7,03; Brutto 44,03; Umlage round(44,03 × 0,50 %, 2) = round(0,22015) = 0,22;
    // Sicherheitseinbehalt round(44,03 × 5 %, 2) = round(2,2015) = 2,20; Zahlbetrag 44,03 − 0,22 − 2,20 = 41,61.
    const p = rechnungPruefen(rechnung('ar1', 1, 'abschlag', ['b1']), hand, [b1, b2], []);
    expect(p.kette).toEqual({
      leistung: '40.00',
      nachlass: '3.00',
      nettoNachNachlass: '37.00',
      mwst: '7.03',
      bruttoKumuliert: '44.03',
      umlagen: [{ bezeichnung: 'Bauwesenversicherung', satz: '0.50', betrag: '0.22' }],
      vertragsstrafe: '0.00', // keine (v1.7b, D-72)
      einbehalt: { art: 'sicherheit', satz: '5.00', betrag: '2.20' },
      fruehere: [],
      fruehereZahlbetraege: '0.00',
      zahlbetrag: '41.61',
    });
  });

  it('Schlussrechnung: Nachlass voll, Gewährleistungs- statt Sicherheitseinbehalt, frühere eingefroren', () => {
    // Leistung p1 10,000 → 100,00, p2 5,000 → 100,00, zusammen 200,00; Nachlass voll 15,00; Netto n. N. 185,00;
    // MwSt round(185,00 × 19 %) = 35,15; Brutto 220,15; Umlage round(1,10075) = 1,10; Gewährleistung round(220,15 × 3 %)
    // = round(6,6045) = 6,60; frühere 41,61; Zahlbetrag 220,15 − 1,10 − 6,60 − 41,61 = 170,84.
    // Summe aller Zahlbeträge 41,61 + 170,84 = 212,45 = 220,15 − 1,10 − 6,60 (Brutto der Schlussrechnung − Abzüge).
    const ar1 = freigegeben(rechnung('ar1', 1, 'abschlag', ['b1']), '41.61');
    const sr = rechnung('sr2', 2, 'schluss', ['b1', 'b2']);
    const p = rechnungPruefen(sr, hand, [b2, b1], [ar1, sr]);
    expect(p.kette).toMatchObject({
      leistung: '200.00',
      nachlass: '15.00',
      nettoNachNachlass: '185.00',
      mwst: '35.15',
      bruttoKumuliert: '220.15',
      einbehalt: { art: 'gewaehrleistung', satz: '3.00', betrag: '6.60' },
      fruehereZahlbetraege: '41.61',
      zahlbetrag: '170.84',
    });
    expect(p.befunde).toEqual([]);
  });

  it('Überzahlung: Blatt 1 nach der Freigabe von AR 1 auf 1,000 korrigiert', () => {
    // Leistung 10,00; Nachlass round(15,00 × 10,00 / 200,00) = 0,75; Netto n. N. 9,25; MwSt round(1,7575) = 1,76; Brutto
    // 11,01; Umlage round(0,05505) = 0,06; Einbehalt round(0,5505) = 0,55; Zahlbetrag 11,01 − 0,06 − 0,55 − 41,61 = −31,21.
    const ar1 = freigegeben(rechnung('ar1', 1, 'abschlag', ['b1']), '41.61');
    const korrigiert = blatt('b1', 1, [['p1', '1.000']]);
    const p = rechnungPruefen(rechnung('ar2', 2, 'abschlag', ['b1']), hand, [korrigiert], [ar1]);
    expect(p.kette.zahlbetrag).toBe('-31.21');
    expect(p.befunde).toEqual([{ code: 'ueberzahlung', zahlbetrag: '-31.21' }]);
  });
});

describe('rechnungPruefen: Befunde', () => {
  const ar1 = rechnung('ar1', 1, 'abschlag', ['b1']);

  it('frühere Rechnung nicht freigegeben: ihr Zahlbetrag fehlt; Blatt einer früheren fehlt; Blatt unbekannt', () => {
    const ar2 = rechnung('ar2', 2, 'abschlag', ['b2', 'b9']);
    const p = rechnungPruefen(ar2, hand, [b1, b2], [ar1, ar2]);
    expect(p.befunde).toEqual([
      { code: 'aufmass-unbekannt', aufmassId: 'b9' },
      { code: 'aufmass-fehlt', aufmassId: 'b1', rechnungId: 'ar1', nummer: 1 },
      { code: 'fruehere-nicht-freigegeben', rechnungId: 'ar1', nummer: 1 },
    ]);
    expect(p.kette.fruehereZahlbetraege).toBe('0.00');
  });

  it('Freigabe-Invariante verletzt; Schlussrechnung nicht die letzte; Rechnungen anderer Auftrags-LV zählen nicht', () => {
    const sr1 = rechnung('sr1', 1, 'schluss', ['b1']);
    const ar2 = rechnung('ar2', 2, 'abschlag', ['b1']);
    const ar3 = freigegeben(rechnung('ar3', 3, 'abschlag', ['b1']), '1.00');
    const fremd = {
      ...freigegeben(rechnung('x', 1, 'abschlag', []), '5.00'),
      auftragsLvId: 'anderes' as never,
    };
    const p = rechnungPruefen(ar2, hand, [b1], [sr1, ar2, ar3, fremd]);
    expect(p.befunde).toEqual([
      { code: 'fruehere-nicht-freigegeben', rechnungId: 'sr1', nummer: 1 },
      { code: 'freigabe-reihenfolge', rechnungId: 'ar3', nummer: 3, offen: [1, 2] },
      { code: 'schlussrechnung-nicht-letzte', rechnungId: 'sr1', nummer: 1 },
    ]);
  });

  it('gefordert (D-44): Differenz je genanntem Wert, Befund für den Zahlbetrag, sonst Brutto, sonst Netto', () => {
    // Geprüft wie AR 1 oben: Netto n. N. 37,00, Brutto 44,03, Zahlbetrag 41,61.
    const mit = (g: Rechnung['gefordert']): Rechnung => ({ ...ar1, gefordert: g });
    const b = (x: string): Betrag => x as Betrag;
    const voll = rechnungPruefen(
      mit({ netto: b('37.00'), brutto: b('44.00'), zahlbetrag: b('41.71') }),
      hand,
      [b1],
      [],
    );
    expect(voll.forderung).toEqual({
      netto: { gefordert: '37.00', geprueft: '37.00', differenz: '0.00' },
      brutto: { gefordert: '44.00', geprueft: '44.03', differenz: '-0.03' },
      zahlbetrag: { gefordert: '41.71', geprueft: '41.61', differenz: '0.10' },
    });
    expect(voll.befunde).toEqual([
      {
        code: 'gefordert-abweichend',
        feld: 'zahlbetrag',
        gefordert: '41.71',
        geprueft: '41.61',
        differenz: '0.10',
      },
    ]);
    const ohneZahlbetrag = rechnungPruefen(
      mit({ netto: b('37.00'), brutto: b('44.00'), zahlbetrag: null }),
      hand,
      [b1],
      [],
    );
    expect(ohneZahlbetrag.forderung?.zahlbetrag).toBeNull();
    expect(ohneZahlbetrag.befunde).toEqual([
      {
        code: 'gefordert-abweichend',
        feld: 'brutto',
        gefordert: '44.00',
        geprueft: '44.03',
        differenz: '-0.03',
      },
    ]);
    const nurNetto = rechnungPruefen(
      mit({ netto: b('37.00'), brutto: null, zahlbetrag: null }),
      hand,
      [b1],
      [],
    );
    expect(nurNetto.befunde).toEqual([]);
  });
});

describe('freigabeMoeglich', () => {
  const ar1 = rechnung('ar1', 1, 'abschlag', ['b1']);
  const ar2 = rechnung('ar2', 2, 'abschlag', ['b1']);

  it('nur ohne Freigabe und wenn alle früheren freigegeben sind', () => {
    expect(freigabeMoeglich(ar1, [ar1, ar2])).toEqual({ moeglich: true, hindernisse: [] });
    expect(freigabeMoeglich(ar2, [ar1, ar2])).toEqual({
      moeglich: false,
      hindernisse: [{ code: 'fruehere-offen', nummern: [1] }],
    });
    expect(freigabeMoeglich(ar2, [freigegeben(ar1, '1.00'), ar2])).toEqual({
      moeglich: true,
      hindernisse: [],
    });
    expect(freigabeMoeglich(freigegeben(ar1, '1.00'), [])).toEqual({
      moeglich: false,
      hindernisse: [{ code: 'schon-freigegeben' }],
    });
  });
});
