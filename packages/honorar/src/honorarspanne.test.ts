// SPDX-License-Identifier: AGPL-3.0-or-later
// Honorarspanne nach § 13 HOAI (Ticket 101, D-56): lineare Interpolation zwischen zwei Tafelzeilen, „von“ und „bis“ je
// für sich, erst multiplizieren, dann teilen, kaufmännisch auf 2 Stellen. Die Sollwerte sind von Hand aus den Tafeln
// hergeleitet (C4); die Tafelwerte stehen jeweils im Kommentar mit Vorschrift.

import type { Betrag, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { Honorartafel } from './index';
import { LEISTUNGSBILDER, honorarInSpanne, honorarspanneBerechnen } from './index';

const b = (wert: string): Betrag => wert as Betrag;
const p = (wert: string): Prozent => wert as Prozent;
const TAFEL_35: Honorartafel = LEISTUNGSBILDER.gebaeude.honorartafel;
const TAFEL_56: Honorartafel = LEISTUNGSBILDER['technische-ausruestung'].honorartafel;

describe('honorarspanneBerechnen', () => {
  it('zwischen zwei Tafelzeilen: von und bis je für sich interpoliert (§ 35 Abs. 1, Zone III)', () => {
    // § 35 Abs. 1, Zone III: 750 000 → von 89 927, bis 112 156; 1 000 000 → von 115 675, bis 144 268.
    // aK = 819 756,16; aK − 750 000 = 69 756,16; Zeilenabstand 250 000.
    // von = 89 927 + 69 756,16 × (115 675 − 89 927) / 250 000 = 89 927 + 69 756,16 × 25 748 / 250 000
    //     = 89 927 + 1 796 081 607,68 / 250 000 = 89 927 + 7 184,32643072 = 97 111,32643072 → 97 111,33
    // bis = 112 156 + 69 756,16 × (144 268 − 112 156) / 250 000 = 112 156 + 69 756,16 × 32 112 / 250 000
    //     = 112 156 + 2 240 009 809,92 / 250 000 = 112 156 + 8 960,03923968 = 121 116,03923968 → 121 116,04
    const e = honorarspanneBerechnen(TAFEL_35, 'III', b('819756.16'));
    if (!e.ok) throw new Error(e.fehler);
    expect(e.wert.spanne).toEqual({ von: '97111.33', bis: '121116.04' });
    expect(e.wert.zeileUnten.anrechenbareKosten).toBe('750000.00');
    expect(e.wert.zeileOben.anrechenbareKosten).toBe('1000000.00');
  });

  it('rundet die halbe Einheit kaufmännisch auf', () => {
    // § 35 Abs. 1, Zone III wie oben; aK = 750 312,50, aK − 750 000 = 312,50.
    // von = 89 927 + 312,50 × 25 748 / 250 000 = 89 927 + 8 046 250 / 250 000 = 89 927 + 32,185 = 89 959,185 → 89 959,19
    // bis = 112 156 + 312,50 × 32 112 / 250 000 = 112 156 + 10 035 000 / 250 000 = 112 156 + 40,14 = 112 196,14
    const e = honorarspanneBerechnen(TAFEL_35, 'III', b('750312.50'));
    if (!e.ok) throw new Error(e.fehler);
    expect(e.wert.spanne).toEqual({ von: '89959.19', bis: '112196.14' });
  });

  it('genau auf einer Tafelzeile: deren Werte, unten und oben dieselbe Zeile', () => {
    // § 35 Abs. 1, Zeile 500 000, Zone III: von 62 900, bis 78 449.
    const e = honorarspanneBerechnen(TAFEL_35, 'III', b('500000.00'));
    if (!e.ok) throw new Error(e.fehler);
    expect(e.wert.spanne).toEqual({ von: '62900.00', bis: '78449.00' });
    expect(e.wert.zeileUnten).toBe(e.wert.zeileOben);
    expect(e.wert.zeileUnten.anrechenbareKosten).toBe('500000.00');
  });

  it('erste und letzte Tafelzeile gehören noch zur Tafel', () => {
    // § 35 Abs. 1: 25 000 → Zone I von 3 120, bis 3 657; 25 000 000 → Zone V von 2 806 395, bis 3 053 358.
    const erste = honorarspanneBerechnen(TAFEL_35, 'I', b('25000.00'));
    const letzte = honorarspanneBerechnen(TAFEL_35, 'V', b('25000000.00'));
    expect(erste.ok && erste.wert.spanne).toEqual({ von: '3120.00', bis: '3657.00' });
    expect(letzte.ok && letzte.wert.spanne).toEqual({ von: '2806395.00', bis: '3053358.00' });
  });

  it('außerhalb der Tafel: Fehler `ausserhalb-honorartafel`, keine Extrapolation', () => {
    expect(honorarspanneBerechnen(TAFEL_35, 'III', b('24999.99'))).toEqual({
      ok: false,
      fehler: 'ausserhalb-honorartafel',
    });
    expect(honorarspanneBerechnen(TAFEL_35, 'III', b('25000000.01'))).toEqual({
      ok: false,
      fehler: 'ausserhalb-honorartafel',
    });
    // § 56 Abs. 1 endet bei 4 000 000.
    expect(honorarspanneBerechnen(TAFEL_56, 'I', b('4000000.01'))).toEqual({
      ok: false,
      fehler: 'ausserhalb-honorartafel',
    });
  });

  it('eine Honorarzone, die die Tafel nicht hat, ist der Fehler `honorarzone-unbekannt` (§ 56: nur I bis III)', () => {
    expect(honorarspanneBerechnen(TAFEL_56, 'IV', b('100000.00'))).toEqual({
      ok: false,
      fehler: 'honorarzone-unbekannt',
    });
  });
});

describe('honorarInSpanne', () => {
  const spanne = { von: b('97111.33'), bis: b('121116.04') };

  it('Honorarsatz 50: von + (bis − von) × 50 / 100, die halbe Einheit kaufmännisch aufgerundet', () => {
    // bis − von = 121 116,04 − 97 111,33 = 24 004,71; × 50 / 100 = 12 002,355
    // 97 111,33 + 12 002,355 = 109 113,685 → 109 113,69
    expect(honorarInSpanne(spanne, p('50.00'))).toBe('109113.69');
  });

  it('Honorarsatz mit Nachkommastellen (37,50)', () => {
    // § 52 Abs. 1, Zone II bei 1 111 111,11: von 65 707,78, bis 83 542,22 (Herleitung im Golden-Test der Berechnung).
    // 83 542,22 − 65 707,78 = 17 834,44; × 37,5 / 100 = 6 687,915; 65 707,78 + 6 687,915 = 72 395,695 → 72 395,70
    expect(honorarInSpanne({ von: b('65707.78'), bis: b('83542.22') }, p('37.50'))).toBe('72395.70');
  });

  it('0 ist der Basishonorarsatz („von“), 100 der obere Honorarsatz („bis“)', () => {
    expect(honorarInSpanne(spanne, p('0.00'))).toBe('97111.33');
    expect(honorarInSpanne(spanne, p('100.00'))).toBe('121116.04');
  });

  it('rechnet einen Honorarsatz außerhalb von 0 bis 100 nach derselben Formel', () => {
    // 120: 97 111,33 + 24 004,71 × 1,2 = 97 111,33 + 28 805,652 = 125 916,982 → 125 916,98
    expect(honorarInSpanne(spanne, p('120.00'))).toBe('125916.98');
    // −10: 97 111,33 − 2 400,471 = 94 710,859 → 94 710,86
    expect(honorarInSpanne(spanne, p('-10.00'))).toBe('94710.86');
  });
});
