// SPDX-License-Identifier: AGPL-3.0-or-later
// Datentests der Honorartafeln (Ticket 101, D-56, C4). Die erste und die letzte Zeile jeder Tafel sind hier ein zweites
// Mal unabhängig aus der Quelle abgeschrieben: https://www.gesetze-im-internet.de/hoai_2013/, abgerufen am 2026-11-12.
// Spalten wie in der Quelle: anrechenbare Kosten, dann je Honorarzone „von“ und „bis“, ganze Euro.

import { vergleiche } from '@tethys/dezimal';
import { describe, expect, it } from 'vitest';
import type { Honorartafel, Honorarzone, Leistungsbild, Tafelzeile } from './index';
import { LEISTUNGSBILDER } from './index';

interface Erwartung {
  readonly leistungsbild: Leistungsbild;
  readonly vorschrift: string;
  readonly url: string;
  readonly honorarzonen: readonly Honorarzone[];
  readonly zeilen: number;
  readonly erste: readonly string[];
  readonly letzte: readonly string[];
}

const ALLE_ZONEN: readonly Honorarzone[] = ['I', 'II', 'III', 'IV', 'V'];

const ERWARTET: readonly Erwartung[] = [
  {
    // § 35 Abs. 1 HOAI: Honorartafel für Grundleistungen bei Gebäuden und Innenräumen.
    leistungsbild: 'gebaeude',
    vorschrift: '§ 35 Abs. 1',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__35.html',
    honorarzonen: ALLE_ZONEN,
    zeilen: 20,
    erste: ['25000', '3120', '3657', '3657', '4339', '4339', '5412', '5412', '6094', '6094', '6631'],
    letzte: [
      '25000000',
      '1436874',
      '1683837',
      '1683837',
      '1998153',
      '1998153',
      '2492079',
      '2492079',
      '2806395',
      '2806395',
      '3053358',
    ],
  },
  {
    // § 52 Abs. 1 HOAI: Honorartafel für Grundleistungen bei Tragwerksplanungen.
    leistungsbild: 'tragwerksplanung',
    vorschrift: '§ 52 Abs. 1',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__52.html',
    honorarzonen: ALLE_ZONEN,
    zeilen: 20,
    erste: ['10000', '1461', '1624', '1624', '2064', '2064', '2575', '2575', '3015', '3015', '3178'],
    letzte: [
      '15000000',
      '455117',
      '505686',
      '505686',
      '642943',
      '642943',
      '801873',
      '801873',
      '939131',
      '939131',
      '989699',
    ],
  },
  {
    // § 56 Abs. 1 HOAI: Honorartafel für Grundleistungen der Technischen Ausrüstung, nur Honorarzonen I bis III.
    leistungsbild: 'technische-ausruestung',
    vorschrift: '§ 56 Abs. 1',
    url: 'https://www.gesetze-im-internet.de/hoai_2013/__56.html',
    honorarzonen: ['I', 'II', 'III'],
    zeilen: 20,
    erste: ['5000', '2132', '2547', '2547', '2990', '2990', '3405'],
    letzte: ['4000000', '412126', '492410', '492410', '578046', '578046', '658331'],
  },
];

/** Die Zeile in der Form der Abschrift: anrechenbare Kosten, dann je Zone „von“ und „bis“, ganze Euro ohne „.00“. */
function alsAbschrift(zeile: Tafelzeile, zonen: readonly Honorarzone[]): string[] {
  const euro = (wert: string): string => {
    expect(wert).toMatch(/^[1-9][0-9]*\.00$/);
    return wert.slice(0, -3);
  };
  const werte = [euro(zeile.anrechenbareKosten)];
  for (const zone of zonen) {
    const spanne = zeile.spannen[zone];
    if (spanne === undefined) throw new Error(`Zone ${zone} fehlt`);
    werte.push(euro(spanne.von), euro(spanne.bis));
  }
  return werte;
}

function tafelVon(leistungsbild: Leistungsbild): Honorartafel {
  return LEISTUNGSBILDER[leistungsbild].honorartafel;
}

describe.each(ERWARTET)('Honorartafel $vorschrift HOAI', (e) => {
  const tafel = tafelVon(e.leistungsbild);

  it('nennt ihre Quelle mit Vorschrift, Adresse und Abrufdatum', () => {
    expect(tafel.quelle).toEqual({ vorschrift: e.vorschrift, url: e.url, abgerufen: '2026-11-12' });
  });

  it('hat die Honorarzonen und die Zahl der Zeilen der Quelle', () => {
    expect(tafel.honorarzonen).toEqual(e.honorarzonen);
    expect(tafel.zeilen).toHaveLength(e.zeilen);
    for (const zeile of tafel.zeilen) expect(Object.keys(zeile.spannen)).toEqual([...e.honorarzonen]);
  });

  it('erste und letzte Zeile wie in der Quelle', () => {
    const erste = tafel.zeilen[0];
    const letzte = tafel.zeilen[tafel.zeilen.length - 1];
    if (erste === undefined || letzte === undefined) throw new Error('Tafel ist leer');
    expect(alsAbschrift(erste, e.honorarzonen)).toEqual(e.erste);
    expect(alsAbschrift(letzte, e.honorarzonen)).toEqual(e.letzte);
  });

  it('anrechenbare Kosten steigen streng von Zeile zu Zeile', () => {
    tafel.zeilen.slice(1).forEach((zeile, i) => {
      const vorige = tafel.zeilen[i];
      if (vorige === undefined) throw new Error('unerreichbar');
      expect(vergleiche(vorige.anrechenbareKosten, zeile.anrechenbareKosten)).toBe(-1);
    });
  });

  it('„bis“ der Zone n ist „von“ der Zone n+1, und „von“ liegt unter „bis“', () => {
    for (const zeile of tafel.zeilen) {
      e.honorarzonen.forEach((zone, n) => {
        const spanne = zeile.spannen[zone];
        if (spanne === undefined) throw new Error(`Zone ${zone} fehlt`);
        expect(vergleiche(spanne.von, spanne.bis)).toBe(-1);
        const naechste = e.honorarzonen[n + 1];
        if (naechste !== undefined) expect(zeile.spannen[naechste]?.von).toBe(spanne.bis);
      });
    }
  });

  it('„von“ und „bis“ jeder Zone steigen mit den anrechenbaren Kosten (Voraussetzung der Monotonie)', () => {
    tafel.zeilen.slice(1).forEach((zeile, i) => {
      const vorige = tafel.zeilen[i];
      if (vorige === undefined) throw new Error('unerreichbar');
      for (const zone of e.honorarzonen) {
        const oben = zeile.spannen[zone];
        const unten = vorige.spannen[zone];
        if (oben === undefined || unten === undefined) throw new Error(`Zone ${zone} fehlt`);
        expect(vergleiche(unten.von, oben.von)).toBe(-1);
        expect(vergleiche(unten.bis, oben.bis)).toBe(-1);
      }
    });
  });
});

describe('Zuordnung der Tafeln', () => {
  it('Gebäude und Innenräume teilen die Tafel des § 35 Abs. 1', () => {
    expect(tafelVon('innenraeume')).toBe(tafelVon('gebaeude'));
  });
});
