// SPDX-License-Identifier: AGPL-3.0-or-later
// Typtests und Beispiele zu `vertrag` v1.1b „Inhaltsmodell“ (Ticket 26). Die Typtests laufen im Typprüfer
// (`pnpm typecheck`); zur Laufzeit prüft vitest die Beispielwerte (JSON-tauglich, Struktur wie beschrieben).

import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  MASSENBEFEHLSARTEN,
  type Befehl,
  type Befehlskurzfassung,
  type Gesamtsummen,
  type Langtext,
  type LangtextInline,
  type LangtextInnen,
  type Textergaenzung,
  type LangtextBaustein,
  type Massenbefehlsart,
  type Position,
  type Positionsdaten,
  type Positionsmerkmale,
  type Protokolleintrag,
  type Zuschlag,
  type Zuschlagsbezug,
} from './index';
import {
  beispielBedarfImStundenlohn,
  beispielKopfdaten,
  beispielLangtext,
  beispielMassenprotokoll,
  beispielSummenMitBedarfUndWahl,
  beispielWahlposition,
  beispielZuschlagsbezuege,
} from './beispiele';

/** Reine Daten: übersteht `JSON.stringify` → `JSON.parse` unverändert (kein `undefined`, kein `Date`, keine Funktion). */
function jsonRund<T>(wert: T): T {
  return JSON.parse(JSON.stringify(wert)) as T;
}

describe('Punkt 1: Positionsmerkmale (F5, E-05)', () => {
  it('eine Position kann zugleich Bedarf und Stundenlohn sein', () => {
    expect(beispielBedarfImStundenlohn.merkmale.bedarf).toBe('ohne-gesamtbetrag');
    expect(beispielBedarfImStundenlohn.merkmale.stundenlohn).toBe(true);
    expect(jsonRund(beispielBedarfImStundenlohn)).toEqual(beispielBedarfImStundenlohn);
  });

  it('der Typ erlaubt jede Kombination; welche gültig sind, entscheidet der Kern', () => {
    expectTypeOf<Positionsmerkmale['bedarf']>().toEqualTypeOf<
      'ohne-gesamtbetrag' | 'mit-gesamtbetrag' | null
    >();
    expectTypeOf<Positionsmerkmale['stundenlohn']>().toEqualTypeOf<boolean>();
    expectTypeOf<Positionsmerkmale['pauschal']>().toEqualTypeOf<boolean>();
    // Es gibt keinen einzelnen Wert `positionsart` mehr.
    expectTypeOf<Positionsdaten>().not.toHaveProperty('positionsart');
  });

  it('der Befehl ersetzt PositionsartAendern', () => {
    expectTypeOf<Extract<Befehl, { art: 'PositionsmerkmaleSetzen' }>>().not.toBeNever();
    expectTypeOf<Extract<Befehl, { art: 'PositionsartAendern' }>>().toBeNever();
  });
});

describe('Punkt 2: Zuschlagsposition (F3, E-03)', () => {
  it('hat keinen EP-Zwang: Menge, Einheit und Einheitspreis dürfen fehlen', () => {
    expectTypeOf<Position['menge']>().toEqualTypeOf<Positionsdaten['menge']>();
    const ohnePreis: Pick<Position, 'menge' | 'einheit' | 'einheitspreis'> = {
      menge: null,
      einheit: null,
      einheitspreis: null,
    };
    expect(ohnePreis.einheitspreis).toBeNull();
    expect(beispielZuschlagsbezuege.every((p) => p.menge === null && p.einheitspreis === null)).toBe(true);
  });

  it('hält je Bezugsform die Bezüge und den Prozentsatz', () => {
    const arten = beispielZuschlagsbezuege.map((p) => p.zuschlag?.bezug.art);
    expect(arten).toEqual(['positionen', 'gliederung', 'kennzeichnung']);
    const [erste] = beispielZuschlagsbezuege;
    const liste = erste.zuschlag?.bezug;
    expect(liste?.art === 'positionen' ? liste.positionen.length : -1).toBe(2);
    expect(erste.zuschlag?.prozentsatz).toBe('10.00');
    for (const p of beispielZuschlagsbezuege) expect(jsonRund(p)).toEqual(p);
  });

  it('Zuschlagsbezug ist eine Vereinigung genau der drei Formen aus den amtlichen Dateien', () => {
    expectTypeOf<Zuschlagsbezug['art']>().toEqualTypeOf<'positionen' | 'gliederung' | 'kennzeichnung'>();
    expectTypeOf<Zuschlag['prozentsatz']>().toEqualTypeOf<import('./zahlen').Prozent | null>();
  });
});

describe('Punkt 3: Wahlposition (F4, E-04)', () => {
  it('behält Gruppen- und Variantennummer; es gibt keinen Zustand „gewählt“', () => {
    expect(beispielWahlposition.merkmale.wahl).toEqual({
      gruppe: 1,
      variante: 1,
      grundpositionId: beispielWahlposition.merkmale.wahl?.grundpositionId,
    });
    expectTypeOf<NonNullable<Positionsmerkmale['wahl']>>().not.toHaveProperty('gewaehlt');
    expectTypeOf<NonNullable<Positionsmerkmale['wahl']>['gruppe']>().toEqualTypeOf<number | null>();
    expectTypeOf<NonNullable<Positionsmerkmale['wahl']>['variante']>().toEqualTypeOf<number | null>();
  });
});

describe('Punkt 4: Summen (F4)', () => {
  it('weist Bedarf ohne Gesamtbetrag und Wahl getrennt aus', () => {
    const g: Gesamtsummen = beispielSummenMitBedarfUndWahl;
    expect(g.summeBedarfOhneGesamtbetrag).toBe('48.90');
    expect(g.summeWahl).toBe('61.25');
    expect(g.netto).toBe('12.35');
  });
});

describe('Punkt 5: Langtext (F6, E-10)', () => {
  it('trägt Liste, Tabelle, Textergänzung und Auszeichnung als reine Daten', () => {
    const arten = (t: Langtext): string[] => t.map((b: LangtextBaustein) => b.art);
    expect(arten(beispielLangtext)).toEqual(['absatz', 'liste', 'tabelle', 'ergaenzung', 'bild']);
    expect(jsonRund(beispielLangtext)).toEqual(beispielLangtext);
  });

  it('die Textergänzung steht nur auf oberster Ebene, nicht in Absatz, Listenpunkt oder Zelle', () => {
    expectTypeOf<Textergaenzung>().not.toExtend<LangtextInline>();
    expectTypeOf<Textergaenzung>().not.toExtend<LangtextInnen[number]>();
    expectTypeOf<Textergaenzung>().toExtend<LangtextBaustein>();
  });

  it('ein leerer Text ist []; ein alter Wert mit nur Text und Bild bleibt gültig', () => {
    const leer: Langtext = [];
    const alt: Langtext = [{ art: 'text', text: 'wie bisher' }];
    expect(leer).toEqual([]);
    expect(alt).toHaveLength(1);
  });
});

describe('Punkt 6: Kopfdaten (F6, E-11)', () => {
  it('Auftraggeber und Vergabeinformationen am LV, Leit- und Unterbeschreibung an der Position', () => {
    expect(beispielKopfdaten.auftraggeber?.name).toBe('Beispiel-Auftraggeber');
    expect(beispielKopfdaten.vergabeinformationen?.auftragsnummer).toBe('A-0001');
    expect(jsonRund(beispielKopfdaten)).toEqual(beispielKopfdaten);
  });
});

describe('Punkt 7: Protokoll für Massenbefehle (A5, E-13)', () => {
  it('der Eintrag trägt statt des Befehls Kopf und Prüfsumme (Algorithmus als Feld)', () => {
    const b = beispielMassenprotokoll.befehl;
    expect(b.art).toBe('Befehlskurzfassung');
    if (b.art !== 'Befehlskurzfassung') throw new Error('Kurzfassung erwartet');
    expect(b.pruefsumme.algorithmus).toBe('sha-256');
    expect(b.kopf.art).toBe('LeistungsverzeichnisAnlegen');
    expect(jsonRund(beispielMassenprotokoll)).toEqual(beispielMassenprotokoll);
  });

  it('die Massenbefehle stehen in einer Konstante; der Kopf gehört genau zu ihnen', () => {
    expect(MASSENBEFEHLSARTEN).toEqual([
      'LeistungsverzeichnisAnlegen',
      'AngebotAnlegen',
      'AuftragsLeistungsverzeichnisAnlegen',
      'AufmassAnlegen', // v1.4 (Ticket 70 Punkt 10, D-70.5)
      'BauwerksmodellAnlegen', // v1.6 (Ticket 97 Punkt 1, D-54)
      'ProjektSamtInhaltLoeschen', // v1.7c (Ticket 160, D-96)
    ]);
    expectTypeOf<Massenbefehlsart>().toEqualTypeOf<(typeof MASSENBEFEHLSARTEN)[number]>();
    expectTypeOf<Massenbefehlsart>().toExtend<Befehl['art']>();
    expectTypeOf<Befehlskurzfassung['kopf']['art']>().toEqualTypeOf<Massenbefehlsart>();
    expectTypeOf<Protokolleintrag['befehl']>().toEqualTypeOf<Befehl | Befehlskurzfassung>();
  });
});
