// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der Honorarberechnung nach HOAI 2021 (Ticket 101, D-56, C4). Jede Zahl ist von Hand aus den Tafeln und
// Prozentsätzen der HOAI hergeleitet; die Herleitung steht im Kommentar. Rundungskette nach D-56: von und bis je auf 2
// Stellen (§ 13), Honorar = round(von + (bis − von) × Honorarsatz / 100, 2), je Leistungsphase round(Honorar × Anteil /
// 100, 2), Grundhonorar = Summe der Phasen, Umbauzuschlag round(Grundhonorar × Satz / 100, 2), Nebenkosten round((Σ
// Grundhonorar + Σ Umbauzuschläge) × Satz / 100, 2) oder Betrag, MwSt round(Netto × Satz / 100, 2) (§ 16 Abs. 1).

import type { Betrag, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type {
  BeauftragteLeistungsphase,
  Honorarberechnung,
  Honorarergebnis,
  Honorarobjekt,
  Leistungsphasennummer,
  Objektergebnis,
} from './index';
import { honorarBerechnen } from './index';

const b = (wert: string): Betrag => wert as Betrag;
const p = (wert: string): Prozent => wert as Prozent;

function phasen(...nummern: Leistungsphasennummer[]): BeauftragteLeistungsphase[] {
  return nummern.map((nummer) => ({ nummer }));
}
const LPH_1_BIS_9 = phasen(1, 2, 3, 4, 5, 6, 7, 8, 9);
const LPH_1_BIS_6 = phasen(1, 2, 3, 4, 5, 6);

function vonHand(betrag: string): Honorarobjekt['anrechenbareKosten'] {
  return { art: 'von-hand', betrag: b(betrag) };
}

function einObjekt(ergebnis: Honorarergebnis): Objektergebnis {
  const [objekt] = ergebnis.objekte;
  if (objekt === undefined || ergebnis.objekte.length !== 1) throw new Error('genau ein Objekt erwartet');
  return objekt;
}

/** Nummer, Anteil und Betrag je Phase. */
const phasenbetraege = (o: Objektergebnis): [number, string, string][] =>
  o.phasen.map((ph) => [ph.nummer, ph.anteil, ph.betrag]);

/** Die Summen der Berechnung in fester Reihenfolge. */
const summen = (e: Honorarergebnis): Record<string, string> => ({
  grundhonorar: e.grundhonorar,
  umbauzuschlaege: e.umbauzuschlaege,
  nebenkosten: e.nebenkosten,
  netto: e.netto,
  mwst: e.mwst,
  brutto: e.brutto,
});

// --- Fall 1: Gebäude, Zone III, § 33 mit beiden Zweigen, Honorarsatz 50, LPH 1–9, Umbau, Nebenkosten %, MwSt ---------

const GEBAEUDE: Honorarobjekt = {
  bezeichnung: 'Gebäude A',
  leistungsbild: 'gebaeude',
  honorarzone: 'III',
  honorarsatz: p('50.00'),
  anrechenbareKosten: {
    art: 'din-276',
    kg300: b('612345.67'),
    kg400: b('201234.56'),
    technischeAnlagenSelbstGeplant: false,
    weitereKosten: b('18000.00'),
    mitzuverarbeitendeBausubstanz: b('10000.00'),
  },
  leistungsphasen: LPH_1_BIS_9,
  umbauzuschlagssatz: p('20.00'),
};

describe('Fall 1: Gebäude, Honorarzone III, streng zwischen zwei Tafelzeilen', () => {
  const ergebnis = honorarBerechnen({
    objekte: [GEBAEUDE],
    nebenkosten: { art: 'prozent', satz: p('5.00') },
    mwstSatz: p('19.00'),
  });
  const objekt = einObjekt(ergebnis);

  it('anrechenbare Kosten nach § 33 mit Herleitung (KG 400 über 25 %: beide Zweige)', () => {
    // sonstige = 612 345,67 + 18 000,00 = 630 345,67; Grenze 25 % = 157 586,4175 → 157 586,42
    // KG 400 201 234,56: voll 157 586,42; darüber 43 648,14, zur Hälfte 21 824,07
    // anrechenbar = 630 345,67 + 157 586,42 + 21 824,07 + Bausubstanz 10 000,00 = 819 756,16
    expect(objekt.anrechenbareKosten).toBe('819756.16');
    expect(objekt.herleitung).toEqual({
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
  });

  it('Tafelzeilen, Honorarspanne und Honorar (§ 35 Abs. 1, § 13)', () => {
    // § 35 Abs. 1 Zone III: 750 000 → 89 927 / 112 156; 1 000 000 → 115 675 / 144 268
    // von = 89 927 + 69 756,16 × 25 748 / 250 000 = 97 111,32643072 → 97 111,33
    // bis = 112 156 + 69 756,16 × 32 112 / 250 000 = 121 116,03923968 → 121 116,04
    // Honorar = 97 111,33 + (121 116,04 − 97 111,33) × 50 / 100 = 97 111,33 + 12 002,355 = 109 113,685 → 109 113,69
    expect(objekt.tafel?.zeileUnten.anrechenbareKosten).toBe('750000.00');
    expect(objekt.tafel?.zeileOben.anrechenbareKosten).toBe('1000000.00');
    expect(objekt.tafel?.spanne).toEqual({ von: '97111.33', bis: '121116.04' });
    expect(objekt.honorar).toBe('109113.69');
  });

  it('Leistungsphasen 1 bis 9 nach § 34 Abs. 3 (Gebäude), Grundhonorar und Umbauzuschlag', () => {
    // je Phase round(109 113,69 × Anteil / 100, 2):
    //  1:  2 % =  2 182,2738 →  2 182,27     6: 10 % = 10 911,369  → 10 911,37
    //  2:  7 % =  7 637,9583 →  7 637,96     7:  4 % =  4 364,5476 →  4 364,55
    //  3: 15 % = 16 367,0535 → 16 367,05     8: 32 % = 34 916,3808 → 34 916,38
    //  4:  3 % =  3 273,4107 →  3 273,41     9:  2 % =  2 182,2738 →  2 182,27
    //  5: 25 % = 27 278,4225 → 27 278,42
    // Grundhonorar = Summe = 109 113,68 (1 Cent unter dem Honorar: Rundungsrest)
    // Umbauzuschlag 20 % = 109 113,68 × 0,20 = 21 822,736 → 21 822,74
    expect(phasenbetraege(objekt)).toEqual([
      [1, '2.00', '2182.27'],
      [2, '7.00', '7637.96'],
      [3, '15.00', '16367.05'],
      [4, '3.00', '3273.41'],
      [5, '25.00', '27278.42'],
      [6, '10.00', '10911.37'],
      [7, '4.00', '4364.55'],
      [8, '32.00', '34916.38'],
      [9, '2.00', '2182.27'],
    ]);
    expect(objekt.phasen.map((ph) => ph.name)).toEqual([
      'Grundlagenermittlung',
      'Vorplanung',
      'Entwurfsplanung',
      'Genehmigungsplanung',
      'Ausführungsplanung',
      'Vorbereitung der Vergabe',
      'Mitwirkung bei der Vergabe',
      'Objektüberwachung – Bauüberwachung und Dokumentation',
      'Objektbetreuung',
    ]);
    expect(objekt.grundhonorar).toBe('109113.68');
    expect(objekt.umbauzuschlag).toBe('21822.74');
  });

  it('Nebenkosten in Prozent, Netto, MwSt und Brutto; keine Befunde', () => {
    // Nebenkosten 5 % von (109 113,68 + 21 822,74 = 130 936,42) = 6 546,821 → 6 546,82
    // Netto = 109 113,68 + 21 822,74 + 6 546,82 = 137 483,24
    // MwSt 19 % = 26 121,8156 → 26 121,82; Brutto = 137 483,24 + 26 121,82 = 163 605,06
    expect(summen(ergebnis)).toEqual({
      grundhonorar: '109113.68',
      umbauzuschlaege: '21822.74',
      nebenkosten: '6546.82',
      netto: '137483.24',
      mwst: '26121.82',
      brutto: '163605.06',
    });
    expect(ergebnis.befunde).toEqual([]);
  });
});

// --- Fall 2: Innenräume genau auf einer Tafelzeile --------------------------------------------------------------------

describe('Fall 2: Innenräume, Honorarzone IV, anrechenbare Kosten genau auf einer Tafelzeile', () => {
  const ergebnis = honorarBerechnen({
    objekte: [
      {
        bezeichnung: 'Innenausbau B',
        leistungsbild: 'innenraeume',
        honorarzone: 'IV',
        honorarsatz: p('25.00'),
        anrechenbareKosten: vonHand('500000.00'),
        leistungsphasen: LPH_1_BIS_9,
        umbauzuschlagssatz: null,
      },
    ],
    nebenkosten: { art: 'betrag', betrag: b('1000.00') },
    mwstSatz: p('19.00'),
  });
  const objekt = einObjekt(ergebnis);

  it('nimmt die Werte der Tafelzeile, ohne Herleitung nach § 33', () => {
    // § 35 Abs. 1, Zeile 500 000, Zone IV: von 78 449, bis 88 343
    // Honorar = 78 449 + 9 894 × 25 / 100 = 78 449 + 2 473,5 = 80 922,50
    expect(objekt.anrechenbareKosten).toBe('500000.00');
    expect(objekt.herleitung).toBeNull();
    expect(objekt.tafel?.zeileUnten).toBe(objekt.tafel?.zeileOben);
    expect(objekt.tafel?.spanne).toEqual({ von: '78449.00', bis: '88343.00' });
    expect(objekt.honorar).toBe('80922.50');
  });

  it('Leistungsphasen mit den Sätzen für Innenräume (§ 34 Abs. 3)', () => {
    // je Phase round(80 922,50 × Anteil / 100, 2):
    //  1:  2 % =  1 618,45                  6:  7 % =  5 664,575 →  5 664,58
    //  2:  7 % =  5 664,575 →  5 664,58     7:  3 % =  2 427,675 →  2 427,68
    //  3: 15 % = 12 138,375 → 12 138,38     8: 32 % = 25 895,20
    //  4:  2 % =  1 618,45                  9:  2 % =  1 618,45
    //  5: 30 % = 24 276,75
    // Grundhonorar = 80 922,52 (2 Cent über dem Honorar: vier Phasen runden einen halben Cent auf)
    expect(phasenbetraege(objekt)).toEqual([
      [1, '2.00', '1618.45'],
      [2, '7.00', '5664.58'],
      [3, '15.00', '12138.38'],
      [4, '2.00', '1618.45'],
      [5, '30.00', '24276.75'],
      [6, '7.00', '5664.58'],
      [7, '3.00', '2427.68'],
      [8, '32.00', '25895.20'],
      [9, '2.00', '1618.45'],
    ]);
    expect(objekt.grundhonorar).toBe('80922.52');
    expect(objekt.umbauzuschlag).toBe('0.00');
  });

  it('Nebenkosten als Betrag', () => {
    // Netto = 80 922,52 + 0,00 + 1 000,00 = 81 922,52; MwSt 19 % = 15 565,2788 → 15 565,28; Brutto 97 487,80
    expect(summen(ergebnis)).toEqual({
      grundhonorar: '80922.52',
      umbauzuschlaege: '0.00',
      nebenkosten: '1000.00',
      netto: '81922.52',
      mwst: '15565.28',
      brutto: '97487.80',
    });
    expect(ergebnis.befunde).toEqual([]);
  });
});

// --- Fall 3 und 4: Tragwerksplanung und Technische Ausrüstung -----------------------------------------------------------

const TRAGWERK: Honorarobjekt = {
  bezeichnung: 'Tragwerk C',
  leistungsbild: 'tragwerksplanung',
  honorarzone: 'II',
  honorarsatz: p('37.50'),
  anrechenbareKosten: vonHand('1111111.11'),
  leistungsphasen: LPH_1_BIS_6,
  umbauzuschlagssatz: null,
};

const TECHNIK: Honorarobjekt = {
  bezeichnung: 'Technische Ausrüstung D',
  leistungsbild: 'technische-ausruestung',
  honorarzone: 'II',
  honorarsatz: p('50.00'),
  anrechenbareKosten: vonHand('312345.67'),
  leistungsphasen: LPH_1_BIS_9,
  umbauzuschlagssatz: p('50.00'),
};

describe('Fall 3: Tragwerksplanung, Honorarzone II, Honorarsatz 37,50, LPH 1 bis 6', () => {
  const ergebnis = honorarBerechnen({ objekte: [TRAGWERK], nebenkosten: null, mwstSatz: p('19.00') });
  const objekt = einObjekt(ergebnis);

  it('Spanne aus § 52 Abs. 1, Phasen nach § 51 Abs. 1, Summen', () => {
    // § 52 Abs. 1 Zone II: 1 000 000 → 60 550 / 76 984; 1 250 000 → 72 155 / 91 740; aK − 1 000 000 = 111 111,11
    // von = 60 550 + 111 111,11 × 11 605 / 250 000 = 60 550 + 5 157,7777262 = 65 707,7777262 → 65 707,78
    // bis = 76 984 + 111 111,11 × 14 756 / 250 000 = 76 984 + 6 558,22215664 = 83 542,22215664 → 83 542,22
    // Honorar = 65 707,78 + 17 834,44 × 37,5 / 100 = 65 707,78 + 6 687,915 = 72 395,695 → 72 395,70
    // Phasen: 3 % 2 171,871 → 2 171,87; 10 % 7 239,57; 15 % 10 859,355 → 10 859,36; 30 % 21 718,71;
    //         40 % 28 958,28; 2 % 1 447,914 → 1 447,91; Summe 72 395,70
    // MwSt 19 % = 13 755,183 → 13 755,18; Brutto 86 150,88
    expect(objekt.tafel?.spanne).toEqual({ von: '65707.78', bis: '83542.22' });
    expect(objekt.honorar).toBe('72395.70');
    expect(phasenbetraege(objekt)).toEqual([
      [1, '3.00', '2171.87'],
      [2, '10.00', '7239.57'],
      [3, '15.00', '10859.36'],
      [4, '30.00', '21718.71'],
      [5, '40.00', '28958.28'],
      [6, '2.00', '1447.91'],
    ]);
    expect(summen(ergebnis)).toEqual({
      grundhonorar: '72395.70',
      umbauzuschlaege: '0.00',
      nebenkosten: '0.00',
      netto: '72395.70',
      mwst: '13755.18',
      brutto: '86150.88',
    });
    expect(ergebnis.befunde).toEqual([]);
  });
});

describe('Fall 4: Technische Ausrüstung, Honorarzone II, Umbauzuschlag 50 % (an der Grenze des § 56 Abs. 5)', () => {
  const ergebnis = honorarBerechnen({
    objekte: [TECHNIK],
    nebenkosten: { art: 'prozent', satz: p('3.00') },
    mwstSatz: p('19.00'),
  });
  const objekt = einObjekt(ergebnis);

  it('Spanne aus § 56 Abs. 1, Phasen nach § 55 Abs. 1, Summen', () => {
    // § 56 Abs. 1 Zone II: 250 000 → 55 726 / 65 418; 500 000 → 96 402 / 113 168; aK − 250 000 = 62 345,67
    // von = 55 726 + 62 345,67 × 40 676 / 250 000 = 55 726 + 10 143,88989168 = 65 869,88989168 → 65 869,89
    // bis = 65 418 + 62 345,67 × 47 750 / 250 000 = 65 418 + 11 908,02297 = 77 326,02297 → 77 326,02
    // Honorar = 65 869,89 + 11 456,13 × 50 / 100 = 65 869,89 + 5 728,065 = 71 597,955 → 71 597,96
    // Phasen: 2 % 1 431,9592 → 1 431,96; 9 % 6 443,8164 → 6 443,82; 17 % 12 171,6532 → 12 171,65;
    //         2 % 1 431,96; 22 % 15 751,5512 → 15 751,55; 7 % 5 011,8572 → 5 011,86; 5 % 3 579,898 → 3 579,90;
    //         35 % 25 059,286 → 25 059,29; 1 % 715,9796 → 715,98; Summe 71 597,97
    // Umbauzuschlag 50 % = 35 798,985 → 35 798,99
    // Nebenkosten 3 % von (71 597,97 + 35 798,99 = 107 396,96) = 3 221,9088 → 3 221,91
    // Netto = 110 618,87; MwSt 19 % = 21 017,5853 → 21 017,59; Brutto 131 636,46
    expect(objekt.tafel?.spanne).toEqual({ von: '65869.89', bis: '77326.02' });
    expect(objekt.honorar).toBe('71597.96');
    expect(phasenbetraege(objekt)).toEqual([
      [1, '2.00', '1431.96'],
      [2, '9.00', '6443.82'],
      [3, '17.00', '12171.65'],
      [4, '2.00', '1431.96'],
      [5, '22.00', '15751.55'],
      [6, '7.00', '5011.86'],
      [7, '5.00', '3579.90'],
      [8, '35.00', '25059.29'],
      [9, '1.00', '715.98'],
    ]);
    expect(objekt.phasen[7]?.name).toBe('Objektüberwachung – Bauüberwachung');
    expect(summen(ergebnis)).toEqual({
      grundhonorar: '71597.97',
      umbauzuschlaege: '35798.99',
      nebenkosten: '3221.91',
      netto: '110618.87',
      mwst: '21017.59',
      brutto: '131636.46',
    });
    expect(ergebnis.befunde).toEqual([]);
  });
});

// --- Fall 5: außerhalb der Tafel -------------------------------------------------------------------------------------

describe('Fall 5: anrechenbare Kosten außerhalb der Honorartafel', () => {
  it.each([
    ['unter der ersten Zeile', '24999.99'],
    ['über der letzten Zeile', '25000000.01'],
  ])('%s: Befund, kein Honorar für das Objekt (keine Extrapolation)', (_, kosten) => {
    const ergebnis = honorarBerechnen({
      objekte: [{ ...GEBAEUDE, anrechenbareKosten: vonHand(kosten) }],
      nebenkosten: { art: 'prozent', satz: p('5.00') },
      mwstSatz: p('19.00'),
    });
    const objekt = einObjekt(ergebnis);
    expect(objekt.anrechenbareKosten).toBe(kosten);
    expect([objekt.tafel, objekt.honorar, objekt.phasen]).toEqual([null, null, []]);
    expect([objekt.grundhonorar, objekt.umbauzuschlag]).toEqual(['0.00', '0.00']);
    expect(summen(ergebnis)).toEqual({
      grundhonorar: '0.00',
      umbauzuschlaege: '0.00',
      nebenkosten: '0.00',
      netto: '0.00',
      mwst: '0.00',
      brutto: '0.00',
    });
    expect(ergebnis.befunde.map((x) => [x.code, x.schwere, x.objekt])).toEqual([
      ['ausserhalb-honorartafel', 'fehler', 0],
    ]);
  });
});

// --- Fall 6: Ingenieurbauwerke (§ 43, § 44) -------------------------------------------------------------------------

describe('Fall 6: Ingenieurbauwerke, Honorarzone III, Basishonorarsatz, genau auf einer Tafelzeile', () => {
  it('Werte der Zeile aus § 44 Abs. 1, Phasen nach § 43 Abs. 1', () => {
    // § 44 Abs. 1, Zeile 1 000 000, Zone III: von 81 924, bis 93 254; Honorarsatz 0 → Honorar 81 924,00
    // Phasen: 2 % 1 638,48; 20 % 16 384,80; 25 % 20 481,00; 5 % 4 096,20; 15 % 12 288,60; 13 % 10 650,12;
    //         4 % 3 276,96; 15 % 12 288,60; 1 % 819,24; Summe 81 924,00
    const ergebnis = honorarBerechnen({
      objekte: [
        {
          bezeichnung: 'Brücke E',
          leistungsbild: 'ingenieurbauwerke',
          honorarzone: 'III',
          honorarsatz: p('0.00'),
          anrechenbareKosten: vonHand('1000000.00'),
          leistungsphasen: LPH_1_BIS_9,
          umbauzuschlagssatz: null,
        },
      ],
      nebenkosten: null,
      mwstSatz: p('19.00'),
    });
    const objekt = einObjekt(ergebnis);
    expect(objekt.tafel?.spanne).toEqual({ von: '81924.00', bis: '93254.00' });
    expect(objekt.honorar).toBe('81924.00');
    expect(phasenbetraege(objekt)).toEqual([
      [1, '2.00', '1638.48'],
      [2, '20.00', '16384.80'],
      [3, '25.00', '20481.00'],
      [4, '5.00', '4096.20'],
      [5, '15.00', '12288.60'],
      [6, '13.00', '10650.12'],
      [7, '4.00', '3276.96'],
      [8, '15.00', '12288.60'],
      [9, '1.00', '819.24'],
    ]);
    expect(objekt.phasen[7]?.name).toBe('Bauoberleitung');
    expect(objekt.grundhonorar).toBe('81924.00');
    expect(ergebnis.befunde).toEqual([]);
  });
});

// --- Mehrere Objekte ----------------------------------------------------------------------------------------------

describe('mehrere Honorarobjekte', () => {
  it('rechnet je Objekt für sich, summiert und weist auf § 11 hin', () => {
    // Grundhonorar 72 395,70 (Fall 3) + 71 597,97 (Fall 4) = 143 993,67; Umbauzuschläge 0,00 + 35 798,99
    // Nebenkosten 3 % von (143 993,67 + 35 798,99 = 179 792,66) = 5 393,7798 → 5 393,78
    // Netto = 185 186,44; MwSt 19 % = 35 185,4236 → 35 185,42; Brutto 220 371,86
    const ergebnis: Honorarergebnis = honorarBerechnen({
      objekte: [TRAGWERK, TECHNIK],
      nebenkosten: { art: 'prozent', satz: p('3.00') },
      mwstSatz: p('19.00'),
    } satisfies Honorarberechnung);
    expect(ergebnis.objekte.map((o) => [o.bezeichnung, o.grundhonorar, o.umbauzuschlag])).toEqual([
      ['Tragwerk C', '72395.70', '0.00'],
      ['Technische Ausrüstung D', '71597.97', '35798.99'],
    ]);
    expect(summen(ergebnis)).toEqual({
      grundhonorar: '143993.67',
      umbauzuschlaege: '35798.99',
      nebenkosten: '5393.78',
      netto: '185186.44',
      mwst: '35185.42',
      brutto: '220371.86',
    });
    expect(ergebnis.befunde.map((x) => [x.code, x.schwere, x.objekt])).toEqual([
      ['mehrere-objekte', 'warnung', null],
    ]);
  });
});
