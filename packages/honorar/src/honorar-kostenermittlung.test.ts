// SPDX-License-Identifier: AGPL-3.0-or-later
// Anrechenbare Kosten aus einer Kostenermittlung (Ticket 110, D-56, D-24): Gespeichert verweist ein Honorarobjekt auf eine
// Kostenermittlung des Projekts; `honorarBerechnen` nimmt KG 300 = Summe der Einträge 300 bis 399 und KG 400 = Summe der
// Einträge 400 bis 499 (eigener Betrag plus Kinder, D-24) und rechnet § 33 wie mit Beträgen nach DIN 276. Dazu die Stufe nach
// § 6 Abs. 1 Nr. 2: Grundlage ist die Kostenberechnung, ohne sie die Kostenschätzung; alles andere ist ein Befund.

import type {
  Betrag,
  Honorarberechnung,
  HonorarberechnungId,
  Honorarobjekt,
  Kostenermittlung,
  KostenermittlungId,
  Kostengruppennummer,
  Kostenermittlungsstufe,
  Leistungsphasennummer,
  ProjektId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { honorarBerechnen } from './index';

const b = (wert: string): Betrag => wert as Betrag;
const p = (wert: string): Prozent => wert as Prozent;
const kg = (nummer: string): Kostengruppennummer => nummer as Kostengruppennummer;
const PROJEKT = '019b7a12-a000-7000-8000-0000000000a1' as ProjektId;
const KB_ID = '019b7a12-c000-7000-8000-0000000000b1' as KostenermittlungId;

/**
 * Eine Kostenberechnung mit KG 300 = 612.345,67 und KG 400 = 201.234,56 (die Beträge von Fall 1 aus Ticket 101), verteilt
 * auf Einträge der zweiten und dritten Ebene; dazu Einträge, die nicht zählen (KG 200, 500, 600).
 */
const KOSTENBERECHNUNG: Kostenermittlung = {
  id: KB_ID,
  projektId: PROJEKT,
  stufe: 'kostenberechnung',
  name: 'Kostenberechnung (erfunden)',
  eintraege: [
    { nummer: kg('210'), betrag: b('9999.99') },
    { nummer: kg('299'), betrag: b('1.00') },
    // KG 300: 100.000,00 + 212.345,67 + 150.000,00 + 150.000,00 = 612.345,67
    { nummer: kg('310'), betrag: b('100000.00') },
    { nummer: kg('320'), betrag: b('212345.67') },
    { nummer: kg('331'), betrag: b('150000.00') },
    { nummer: kg('332'), betrag: b('150000.00') },
    // KG 400: 101.234,56 + 50.000,00 + 50.000,00 = 201.234,56
    { nummer: kg('410'), betrag: b('101234.56') },
    { nummer: kg('420'), betrag: b('50000.00') },
    { nummer: kg('444'), betrag: b('50000.00') },
    { nummer: kg('520'), betrag: b('24000.00') },
    { nummer: kg('610'), betrag: b('18000.00') },
  ],
};

const OBJEKT: Honorarobjekt = {
  bezeichnung: 'Gebäude A',
  leistungsbild: 'gebaeude',
  honorarzone: 'III',
  honorarsatz: p('50.00'),
  anrechenbareKosten: {
    art: 'kostenermittlung',
    kostenermittlungId: KB_ID,
    technischeAnlagenAnteilig: true,
    weitereKosten: b('18000.00'),
    mitzuverarbeitendeBausubstanz: b('10000.00'),
  },
  leistungsphasen: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((nummer) => ({ nummer: nummer as Leistungsphasennummer })),
  umbauzuschlagssatz: p('20.00'),
};

/** Die gespeicherte Form von Fall 1 aus Ticket 101: Verweis auf die Kostenberechnung. */
const BERECHNUNG: Honorarberechnung = {
  id: '019b7a12-c000-7000-8000-0000000000c1' as HonorarberechnungId,
  projektId: PROJEKT,
  name: 'Architekt (erfunden)',
  objekte: [OBJEKT],
  nebenkosten: { art: 'prozent', satz: p('5.00') },
  mwstSatz: p('19.00'),
};

describe('Golden-Fall 1 aus Ticket 101 über eine Kostenermittlung', () => {
  it('KG 300 und KG 400 aus den Einträgen, § 33 mit KG 400 über 25 %, Summen wie in Ticket 101', () => {
    const e = honorarBerechnen(BERECHNUNG, [KOSTENBERECHNUNG]);
    // § 33 wie Fall 1: sonstige 630.345,67; Grenze 157.586,42; Hälfte 21.824,07; aK 819.756,16
    expect(e.objekte[0]?.herleitung).toEqual({
      kg300: '612345.67',
      weitereKosten: '18000.00',
      sonstigeAnrechenbareKosten: '630345.67',
      kg400: '201234.56',
      grenzeTechnischeAnlagen: '157586.42',
      kg400Voll: '157586.42',
      kg400Haelfte: '21824.07',
      mitzuverarbeitendeBausubstanz: '10000.00',
      anrechenbareKosten: '819756.16',
    });
    expect(e.objekte[0]?.anrechenbareKosten).toBe('819756.16');
    expect([e.grundhonorar, e.umbauzuschlaege, e.nebenkosten, e.netto, e.mwst, e.brutto]).toEqual([
      '109113.68',
      '21822.74',
      '6546.82',
      '137483.24',
      '26121.82',
      '163605.06',
    ]);
    expect(e.befunde).toEqual([]);
  });
});

/** Eine weitere Kostenermittlung des Projekts in der Stufe `stufe` (ohne Einträge: nur die Stufe zählt). */
const weitere = (stufe: Kostenermittlungsstufe, nr: string): Kostenermittlung => ({
  id: `019b7a12-c000-7000-8000-0000000000${nr}` as KostenermittlungId,
  projektId: PROJEKT,
  stufe,
  name: `Weitere ${stufe}`,
  eintraege: [],
});

/** Befunde als Code, Schwere und Ort. */
const befunde = (kostenermittlungen: readonly Kostenermittlung[]): unknown[] =>
  honorarBerechnen(BERECHNUNG, kostenermittlungen).befunde.map((x) => [x.code, x.schwere, x.ort]);

describe('Stufe der Kostenermittlung nach § 6 Abs. 1 Nr. 2', () => {
  const ORT = { pfad: '/objekte[1]', feld: 'anrechenbareKosten' };

  it('Kostenberechnung als Grundlage: kein Befund, auch wenn es andere Stufen im Projekt gibt', () => {
    expect(
      befunde([weitere('kostenschaetzung', 'd1'), KOSTENBERECHNUNG, weitere('kostenanschlag', 'd2')]),
    ).toEqual([]);
  });

  it('Kostenschätzung ohne Kostenberechnung im Projekt: kein Befund', () => {
    const schaetzung = { ...KOSTENBERECHNUNG, stufe: 'kostenschaetzung' as const };
    expect(befunde([schaetzung, weitere('kostenrahmen', 'd1')])).toEqual([]);
  });

  it('Kostenschätzung, obwohl eine Kostenberechnung im Projekt existiert: Befund, gerechnet wird trotzdem', () => {
    const schaetzung = { ...KOSTENBERECHNUNG, stufe: 'kostenschaetzung' as const };
    const e = honorarBerechnen(BERECHNUNG, [schaetzung, weitere('kostenberechnung', 'd1')]);
    expect(e.befunde.map((x) => [x.code, x.schwere, x.ort])).toEqual([
      ['kostenberechnung-vorhanden', 'warnung', ORT],
    ]);
    expect(e.brutto).toBe('163605.06');
  });

  it.each<Kostenermittlungsstufe>(['kostenrahmen', 'kostenanschlag', 'kostenfeststellung'])(
    'eine andere Stufe (%s): Befund, gerechnet wird trotzdem',
    (stufe) => {
      const e = honorarBerechnen(BERECHNUNG, [{ ...KOSTENBERECHNUNG, stufe }]);
      expect(e.befunde.map((x) => [x.code, x.schwere, x.ort])).toEqual([
        ['kostenermittlungsstufe-abweichend', 'warnung', ORT],
      ]);
      expect(e.brutto).toBe('163605.06');
    },
  );
});

describe('Verweis, der sich nicht auflösen lässt', () => {
  it('die Kostenermittlung wurde nicht übergeben: Befund, kein Honorar für das Objekt', () => {
    const e = honorarBerechnen(BERECHNUNG, [weitere('kostenberechnung', 'd1')]);
    expect(e.befunde.map((x) => [x.code, x.schwere, x.ort])).toEqual([
      ['kostenermittlung-unbekannt', 'fehler', { pfad: '/objekte[1]', feld: 'anrechenbareKosten' }],
    ]);
    expect([e.objekte[0]?.anrechenbareKosten, e.objekte[0]?.honorar, e.brutto]).toEqual([null, null, '0.00']);
  });

  it('ein anderes Leistungsbild als Gebäude oder Innenräume: § 33 ist nicht anwendbar, keine Prüfung der Stufe', () => {
    const e = honorarBerechnen(
      {
        ...BERECHNUNG,
        objekte: [{ ...OBJEKT, leistungsbild: 'tragwerksplanung', leistungsphasen: [{ nummer: 1 }] }],
      },
      [{ ...KOSTENBERECHNUNG, stufe: 'kostenrahmen' }],
    );
    expect(e.befunde.map((x) => x.code)).toEqual(['herleitung-nicht-anwendbar']);
  });

  it('negative Summe einer Kostengruppe: Befund wie bei Beträgen nach DIN 276, gerechnet wie eingegeben', () => {
    const e = honorarBerechnen(BERECHNUNG, [
      {
        ...KOSTENBERECHNUNG,
        eintraege: [
          { nummer: kg('310'), betrag: b('900000.00') },
          { nummer: kg('410'), betrag: b('-1.00') },
        ],
      },
    ]);
    expect(e.befunde.map((x) => [x.code, x.meldung.split(' ')[0]])).toEqual([['wert-negativ', 'kg400']]);
    expect(e.objekte[0]?.herleitung?.kg400).toBe('-1.00');
  });
});
