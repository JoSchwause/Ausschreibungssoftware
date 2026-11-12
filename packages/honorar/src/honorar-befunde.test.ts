// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde der Honorarberechnung (Ticket 101, U5): Sie sperren nie; `fehler` heißt, ein Teil der Eingabe geht nicht in die
// Rechnung ein, `warnung`, die Rechnung ist vollständig, aber auffällig.

import type { Betrag, Prozent } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import type { Honorarberechnung, Honorarergebnis, Honorarobjekt, Leistungsbild } from './index';
import { honorarBerechnen } from './index';

const b = (wert: string): Betrag => wert as Betrag;
const p = (wert: string): Prozent => wert as Prozent;

/** Gebäude, Zone III, 819 756,16 von Hand, Honorarsatz 50, LPH 1–9 (Werte wie Fall 1 der Golden-Tests). */
const GEBAEUDE: Honorarobjekt = {
  bezeichnung: 'Gebäude',
  leistungsbild: 'gebaeude',
  honorarzone: 'III',
  honorarsatz: p('50.00'),
  anrechenbareKosten: { art: 'von-hand', betrag: b('819756.16') },
  leistungsphasen: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ nummer: n as 1 })),
  umbauzuschlagssatz: null,
};

/** Tragwerksplanung, Zone II, 1 111 111,11 von Hand, Honorarsatz 37,50 (Honorar 72 395,70 wie Fall 3). */
const TRAGWERK: Honorarobjekt = {
  bezeichnung: 'Tragwerk',
  leistungsbild: 'tragwerksplanung',
  honorarzone: 'II',
  honorarsatz: p('37.50'),
  anrechenbareKosten: { art: 'von-hand', betrag: b('1111111.11') },
  leistungsphasen: [1, 2, 3, 4, 5, 6].map((n) => ({ nummer: n as 1 })),
  umbauzuschlagssatz: null,
};

function rechne(...objekte: Honorarobjekt[]): Honorarergebnis {
  const berechnung: Honorarberechnung = { objekte, nebenkosten: null, mwstSatz: p('19.00') };
  return honorarBerechnen(berechnung);
}
const befunde = (e: Honorarergebnis): [string, string, number | null][] =>
  e.befunde.map((x) => [x.code, x.schwere, x.objekt]);

describe('Umbauzuschlag über der Grenze des Leistungsbilds: Hinweis, kein Fehler', () => {
  it.each<[Leistungsbild, string, boolean]>([
    ['gebaeude', '33.00', false],
    ['gebaeude', '33.01', true],
    ['innenraeume', '40.00', false],
    ['innenraeume', '50.00', false],
    ['innenraeume', '50.01', true],
    ['tragwerksplanung', '50.00', false],
    ['tragwerksplanung', '50.01', true],
    ['technische-ausruestung', '50.00', false],
    ['technische-ausruestung', '50.01', true],
  ])('%s mit %s %%: Befund %s', (leistungsbild, satz, befund) => {
    const objekt: Honorarobjekt = {
      ...(leistungsbild === 'tragwerksplanung' ? TRAGWERK : GEBAEUDE),
      leistungsbild,
      honorarzone: 'II',
      anrechenbareKosten: { art: 'von-hand', betrag: b('500000.00') },
      umbauzuschlagssatz: p(satz),
    };
    const e = rechne(objekt);
    expect(befunde(e)).toEqual(befund ? [['umbauzuschlag-ueber-grenze', 'warnung', 0]] : []);
    // Gerechnet wird der Zuschlag trotzdem: round(Grundhonorar × Satz / 100, 2) ist nie 0 bei Grundhonorar > 0.
    expect(e.objekte[0]?.umbauzuschlag).not.toBe('0.00');
  });

  it('ohne Satz kein Zuschlag und kein Befund', () => {
    const e = rechne(GEBAEUDE);
    expect(e.objekte[0]?.umbauzuschlag).toBe('0.00');
    expect(e.umbauzuschlaege).toBe('0.00');
    expect(e.befunde).toEqual([]);
  });
});

describe('Befunde, nach denen ein Objekt kein Honorar hat', () => {
  it('eine Honorarzone, die die Tafel nicht hat (§ 56: I bis III)', () => {
    const e = rechne({ ...GEBAEUDE, leistungsbild: 'technische-ausruestung', honorarzone: 'IV' });
    expect(befunde(e)).toEqual([['honorarzone-unbekannt', 'fehler', 0]]);
    expect([e.objekte[0]?.honorar, e.grundhonorar]).toEqual([null, '0.00']);
  });

  it('Herleitung nach § 33 bei einem anderen Leistungsbild als Gebäude oder Innenräume', () => {
    const e = rechne({
      ...TRAGWERK,
      anrechenbareKosten: {
        art: 'din-276',
        kg300: b('900000.00'),
        kg400: b('300000.00'),
        technischeAnlagenSelbstGeplant: false,
        weitereKosten: b('0.00'),
        mitzuverarbeitendeBausubstanz: b('0.00'),
      },
    });
    expect(befunde(e)).toEqual([['herleitung-nicht-anwendbar', 'fehler', 0]]);
    expect([e.objekte[0]?.anrechenbareKosten, e.objekte[0]?.herleitung, e.objekte[0]?.honorar]).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('ein Leistungsbild ohne Honorartafel (ungeprüfte Eingabe)', () => {
    const e = rechne({ ...GEBAEUDE, leistungsbild: 'flaechenplanung' as Leistungsbild });
    expect(befunde(e)).toEqual([['keine-honorartafel', 'fehler', 0]]);
    expect(e.objekte[0]?.grundhonorar).toBe('0.00');
  });

  it('meldet auch ohne Honorar die übrigen Befunde des Objekts, in der Folge der Rechnung', () => {
    const e = rechne({
      ...GEBAEUDE,
      anrechenbareKosten: { art: 'von-hand', betrag: b('26000000.00') },
      leistungsphasen: [{ nummer: 1 }, { nummer: 1 }],
      honorarsatz: p('110.00'),
      umbauzuschlagssatz: p('40.00'),
    });
    // Folge der Rechnung: anrechenbare Kosten und Tafel, Honorarsatz, Leistungsphasen, Umbauzuschlag.
    expect(befunde(e)).toEqual([
      ['ausserhalb-honorartafel', 'fehler', 0],
      ['honorarsatz-ausserhalb-spanne', 'warnung', 0],
      ['leistungsphase-doppelt', 'fehler', 0],
      ['umbauzuschlag-ueber-grenze', 'warnung', 0],
    ]);
    expect(e.objekte[0]?.phasen).toEqual([]);
  });
});

describe('Leistungsphasen', () => {
  it('eine Leistungsphase, die das Leistungsbild nicht hat, zählt nicht (Tragwerksplanung: nur 1 bis 6)', () => {
    const e = rechne({ ...TRAGWERK, leistungsphasen: [{ nummer: 4 }, { nummer: 7 }] });
    expect(befunde(e)).toEqual([['leistungsphase-unbekannt', 'fehler', 0]]);
    // LPH 4: 30 % von 72 395,70 = 21 718,71
    expect(e.objekte[0]?.phasen.map((ph) => [ph.nummer, ph.betrag])).toEqual([[4, '21718.71']]);
    expect(e.grundhonorar).toBe('21718.71');
  });

  it('eine doppelt beauftragte Leistungsphase zählt einmal', () => {
    const e = rechne({ ...TRAGWERK, leistungsphasen: [{ nummer: 2 }, { nummer: 2 }] });
    expect(befunde(e)).toEqual([['leistungsphase-doppelt', 'fehler', 0]]);
    // LPH 2: 10 % von 72 395,70 = 7 239,57
    expect(e.grundhonorar).toBe('7239.57');
  });

  it('ein abweichender Anteil ersetzt den Prozentsatz der HOAI und ist ein Hinweis (§ 51 Abs. 2: LPH 5 mit 30 %)', () => {
    const e = rechne({ ...TRAGWERK, leistungsphasen: [{ nummer: 5, anteil: p('30.00') }] });
    expect(befunde(e)).toEqual([['anteil-abweichend', 'warnung', 0]]);
    // 30 % statt 40 % von 72 395,70 = 21 718,71
    expect(e.objekte[0]?.phasen).toEqual([
      { nummer: 5, name: 'Ausführungsplanung', anteil: '30.00', betrag: '21718.71' },
    ]);
  });

  it('ein Anteil gleich dem Prozentsatz der HOAI ist kein Befund', () => {
    const e = rechne({ ...TRAGWERK, leistungsphasen: [{ nummer: 5, anteil: p('40.00') }] });
    expect(e.befunde).toEqual([]);
  });

  it('ordnet die Phasen nach Nummer, gleich in welcher Folge sie beauftragt sind', () => {
    const e = rechne({ ...TRAGWERK, leistungsphasen: [{ nummer: 3 }, { nummer: 1 }, { nummer: 2 }] });
    expect(e.objekte[0]?.phasen.map((ph) => ph.nummer)).toEqual([1, 2, 3]);
  });

  it('ohne beauftragte Leistungsphase ist das Grundhonorar 0,00', () => {
    const e = rechne({ ...TRAGWERK, leistungsphasen: [], umbauzuschlagssatz: p('20.00') });
    expect([e.objekte[0]?.honorar, e.objekte[0]?.grundhonorar, e.objekte[0]?.umbauzuschlag]).toEqual([
      '72395.70',
      '0.00',
      '0.00',
    ]);
  });
});

describe('Honorarsatz und negative Werte', () => {
  it('ein Honorarsatz über 100 wird gerechnet und ist ein Hinweis', () => {
    // Fall 1: von 97 111,33, bis 121 116,04; 120 %: 97 111,33 + 24 004,71 × 1,2 = 125 916,982 → 125 916,98
    const e = rechne({ ...GEBAEUDE, honorarsatz: p('120.00') });
    expect(befunde(e)).toEqual([['honorarsatz-ausserhalb-spanne', 'warnung', 0]]);
    expect(e.objekte[0]?.honorar).toBe('125916.98');
  });

  it('negative Beträge und Sätze sind Hinweise, je Feld einer', () => {
    const e = honorarBerechnen({
      objekte: [
        {
          ...GEBAEUDE,
          anrechenbareKosten: {
            art: 'din-276',
            kg300: b('900000.00'),
            kg400: b('-1.00'),
            technischeAnlagenSelbstGeplant: false,
            weitereKosten: b('0.00'),
            mitzuverarbeitendeBausubstanz: b('-2.00'),
          },
        },
      ],
      nebenkosten: { art: 'prozent', satz: p('-1.00') },
      mwstSatz: p('-19.00'),
    });
    expect(befunde(e)).toEqual([
      ['wert-negativ', 'warnung', 0],
      ['wert-negativ', 'warnung', 0],
      ['wert-negativ', 'warnung', null],
      ['wert-negativ', 'warnung', null],
    ]);
    expect(e.befunde.map((x) => x.meldung.split(' ')[0])).toEqual([
      'kg400',
      'mitzuverarbeitendeBausubstanz',
      'nebenkostensatz',
      'mwstSatz',
    ]);
  });
});

describe('ohne Honorarobjekt', () => {
  it('nur die Nebenkosten als Betrag und ihre MwSt', () => {
    // Netto 500,00; MwSt 19 % = 95,00; Brutto 595,00
    const e = honorarBerechnen({
      objekte: [],
      nebenkosten: { art: 'betrag', betrag: b('500.00') },
      mwstSatz: p('19.00'),
    });
    expect([e.grundhonorar, e.nebenkosten, e.netto, e.mwst, e.brutto]).toEqual([
      '0.00',
      '500.00',
      '500.00',
      '95.00',
      '595.00',
    ]);
    expect(e.befunde).toEqual([]);
  });
});
