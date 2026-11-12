// SPDX-License-Identifier: AGPL-3.0-or-later
// Datentests der Leistungsbilder (Ticket 101, D-56): Namen und Prozentsätze der Leistungsphasen, Grenze des
// Umbauzuschlags und die Herleitung nach § 33 je Leistungsbild, hier ein zweites Mal aus der Quelle abgeschrieben
// (https://www.gesetze-im-internet.de/hoai_2013/, abgerufen am 2026-11-12).

import { NULL_PROZENT, addiere } from '@tethys/dezimal';
import { describe, expect, it } from 'vitest';
import type { Leistungsbild } from './index';
import { LEISTUNGSBILDER } from './index';

const LPH_1_BIS_7 = [
  'Grundlagenermittlung',
  'Vorplanung',
  'Entwurfsplanung',
  'Genehmigungsplanung',
  'Ausführungsplanung',
  'Vorbereitung der Vergabe',
  'Mitwirkung bei der Vergabe',
];

interface Erwartung {
  readonly leistungsbild: Leistungsbild;
  readonly vorschrift: string;
  readonly url: string;
  readonly namen: readonly string[];
  readonly anteile: readonly string[];
}

const ERWARTET: readonly Erwartung[] = [
  {
    // § 34 Abs. 3 Nr. 1 bis 9, jeweils der Satz „für Gebäude“.
    leistungsbild: 'gebaeude',
    vorschrift: '§ 34 Abs. 3',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__34.html',
    namen: [...LPH_1_BIS_7, 'Objektüberwachung – Bauüberwachung und Dokumentation', 'Objektbetreuung'],
    anteile: ['2.00', '7.00', '15.00', '3.00', '25.00', '10.00', '4.00', '32.00', '2.00'],
  },
  {
    // § 34 Abs. 3 Nr. 1 bis 9, jeweils der Satz „für Innenräume“ (abweichend in LPH 4 bis 7).
    leistungsbild: 'innenraeume',
    vorschrift: '§ 34 Abs. 3',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__34.html',
    namen: [...LPH_1_BIS_7, 'Objektüberwachung – Bauüberwachung und Dokumentation', 'Objektbetreuung'],
    anteile: ['2.00', '7.00', '15.00', '2.00', '30.00', '7.00', '3.00', '32.00', '2.00'],
  },
  {
    // § 51 Abs. 1 Nr. 1 bis 6: die Tragwerksplanung hat nur die Leistungsphasen 1 bis 6.
    leistungsbild: 'tragwerksplanung',
    vorschrift: '§ 51 Abs. 1',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__51.html',
    namen: LPH_1_BIS_7.slice(0, 6),
    anteile: ['3.00', '10.00', '15.00', '30.00', '40.00', '2.00'],
  },
  {
    // § 55 Abs. 1 Satz 2 Nr. 1 bis 9.
    leistungsbild: 'technische-ausruestung',
    vorschrift: '§ 55 Abs. 1',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__55.html',
    namen: [...LPH_1_BIS_7, 'Objektüberwachung – Bauüberwachung', 'Objektbetreuung'],
    anteile: ['2.00', '9.00', '17.00', '2.00', '22.00', '7.00', '5.00', '35.00', '1.00'],
  },
  {
    // § 39 Abs. 3 Nr. 1 bis 9.
    leistungsbild: 'freianlagen',
    vorschrift: '§ 39 Abs. 3',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__39.html',
    namen: [...LPH_1_BIS_7, 'Objektüberwachung – Bauüberwachung und Dokumentation', 'Objektbetreuung'],
    anteile: ['3.00', '10.00', '16.00', '4.00', '25.00', '7.00', '3.00', '30.00', '2.00'],
  },
  {
    // § 43 Abs. 1 Satz 2 Nr. 1 bis 9 (die Abweichungen nach Abs. 2 und 3 sind ein abweichender Anteil der Eingabe).
    leistungsbild: 'ingenieurbauwerke',
    vorschrift: '§ 43 Abs. 1',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__43.html',
    namen: [...LPH_1_BIS_7, 'Bauoberleitung', 'Objektbetreuung'],
    anteile: ['2.00', '20.00', '25.00', '5.00', '15.00', '13.00', '4.00', '15.00', '1.00'],
  },
  {
    // § 47 Abs. 1 Satz 2 Nr. 1 bis 9.
    leistungsbild: 'verkehrsanlagen',
    vorschrift: '§ 47 Abs. 1',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__47.html',
    namen: [...LPH_1_BIS_7, 'Bauoberleitung', 'Objektbetreuung'],
    anteile: ['2.00', '20.00', '25.00', '8.00', '15.00', '10.00', '4.00', '15.00', '1.00'],
  },
];

describe.each(ERWARTET)('Leistungsphasen $leistungsbild ($vorschrift HOAI)', (e) => {
  const daten = LEISTUNGSBILDER[e.leistungsbild];

  it('nennt ihre Quelle mit Vorschrift, Adresse und Abrufdatum', () => {
    expect(daten.quelleLeistungsphasen).toEqual({
      vorschrift: e.vorschrift,
      url: e.url,
      abgerufen: '2026-11-12',
    });
  });

  it('Nummern, Namen und Prozentsätze wie in der Quelle', () => {
    expect(daten.leistungsphasen.map((p) => p.nummer)).toEqual(e.namen.map((_, i) => i + 1));
    expect(daten.leistungsphasen.map((p) => p.name)).toEqual(e.namen);
    expect(daten.leistungsphasen.map((p) => p.anteil)).toEqual(e.anteile);
  });

  it('die Prozentsätze ergeben zusammen 100', () => {
    const summe = daten.leistungsphasen.map((p) => p.anteil).reduce((a, b) => addiere(a, b), NULL_PROZENT);
    expect(summe).toBe('100.00');
  });
});

describe('Umbauzuschlag und Herleitung nach § 33 je Leistungsbild', () => {
  it.each<[Leistungsbild, string, string, boolean]>([
    // § 36 Abs. 1: Gebäude „bis 33 Prozent“; § 36 Abs. 2: Innenräume „bis 50 Prozent“;
    // § 52 Abs. 4 und § 56 Abs. 5: „bis 50 Prozent“; § 40 Abs. 6: § 36 Abs. 1 entsprechend, also „bis 33 Prozent“;
    // § 44 Abs. 6 und § 48 Abs. 6: „bis 33 Prozent“. § 33 gilt für Gebäude und Innenräume.
    ['gebaeude', '33.00', '§ 36 Abs. 1', true],
    ['innenraeume', '50.00', '§ 36 Abs. 2', true],
    ['tragwerksplanung', '50.00', '§ 52 Abs. 4', false],
    ['technische-ausruestung', '50.00', '§ 56 Abs. 5', false],
    ['freianlagen', '33.00', '§ 40 Abs. 6', false],
    ['ingenieurbauwerke', '33.00', '§ 44 Abs. 6', false],
    ['verkehrsanlagen', '33.00', '§ 48 Abs. 6', false],
  ])('%s: Umbauzuschlag bis %s nach %s, § 33: %s', (leistungsbild, bis, vorschrift, din276) => {
    const daten = LEISTUNGSBILDER[leistungsbild];
    expect(daten.umbauzuschlagBis).toBe(bis);
    expect(daten.quelleUmbauzuschlag.vorschrift).toBe(vorschrift);
    expect(daten.kostenNachDin276).toBe(din276);
  });
});
