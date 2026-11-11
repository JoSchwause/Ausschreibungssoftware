// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  bereichAlsTsv,
  fixierteVersaetze,
  kennzeichenText,
  normiereBereich,
  zellbeschreibung,
} from './vergleich';
import type { VergleichsSpalte } from './vergleichTypen';

const spalten: VergleichsSpalte[] = [
  { id: 'oz', kopf: 'OZ', breite: 80 },
  { id: 'kurztext', kopf: 'Kurztext', breite: 300 },
  { id: 'a-ep', kopf: 'EP', gruppe: { id: 'a', kopf: 'Bieter A' } },
  { id: 'a-gp', kopf: 'GP', gruppe: { id: 'a', kopf: 'Bieter A' } },
];

describe('normiereBereich', () => {
  it('ordnet Anker und Ende zu einem Rechteck, gleich in welcher Richtung gezogen wurde', () => {
    expect(normiereBereich({ zeile: 5, spalte: 3 }, { zeile: 2, spalte: 1 })).toEqual({
      zeilen: [2, 5],
      spalten: [1, 3],
    });
  });
});

describe('bereichAlsTsv', () => {
  const zeilen = [
    { zellen: { oz: { text: '01' }, kurztext: { text: 'Erdarbeiten' } } },
    {
      zellen: {
        oz: { text: '01.0010' },
        kurztext: { text: 'Boden lösen, "Klasse 3"' },
        'a-ep': { text: '12,50', kennzeichen: ['hoch'] },
        'a-gp': { text: '1.250,00' },
      },
    },
    { zellen: { oz: { text: '01.0020' }, kurztext: { text: 'Boden laden' }, 'a-ep': { text: '' } } },
  ];

  it('schreibt die Texte des Rechtecks wie Excel (Tab, CRLF), fehlende Zellen leer, Kennzeichen nicht', () => {
    const tsv = bereichAlsTsv(zeilen, spalten, { zeilen: [0, 2], spalten: [0, 3] });
    expect(tsv).toBe(
      '01\tErdarbeiten\t\t\r\n' +
        '01.0010\t"Boden lösen, ""Klasse 3"""\t12,50\t1.250,00\r\n' +
        '01.0020\tBoden laden\t\t\r\n',
    );
  });

  it('eine Zelle allein ergibt genau ihren Text', () => {
    expect(bereichAlsTsv(zeilen, spalten, { zeilen: [1, 1], spalten: [3, 3] })).toBe('1.250,00\r\n');
  });
});

describe('fixierteVersaetze', () => {
  it('die fixierten linken Spalten kleben nebeneinander am linken Rand; die übrigen kleben nicht', () => {
    expect(fixierteVersaetze(spalten, 2)).toEqual([0, 80, null, null]);
  });

  it('ohne Breite gilt die Standardbreite 120', () => {
    expect(fixierteVersaetze(spalten, 3)).toEqual([0, 80, 380, null]);
  });
});

describe('kennzeichenText', () => {
  it('jedes bekannte Kennzeichen hat ein Symbol und eine Beschreibung in Worten (nicht nur Farbe, U8)', () => {
    expect(kennzeichenText('hoch')).toEqual({ symbol: '▲', beschreibung: 'Ausreißer nach oben' });
    expect(kennzeichenText('niedrig')).toEqual({ symbol: '▼', beschreibung: 'Ausreißer nach unten' });
    expect(kennzeichenText('nicht-angeboten').beschreibung).toBe('nicht angeboten');
    for (const k of ['min', 'max', 'nullpreis', 'hinweis'] as const) {
      expect(kennzeichenText(k).symbol).not.toBe('');
      expect(kennzeichenText(k).beschreibung).not.toBe('');
    }
  });

  it('die App kann Texte ersetzen und eigene Kennzeichen beschreiben; ein unbekanntes nennt sich selbst', () => {
    const eigene = { 'abc-a': { symbol: 'A', beschreibung: 'ABC-Klasse A' } };
    expect(kennzeichenText('abc-a', eigene)).toEqual({ symbol: 'A', beschreibung: 'ABC-Klasse A' });
    expect(kennzeichenText('neu')).toEqual({ symbol: '•', beschreibung: 'neu' });
    expect(kennzeichenText('constructor')).toEqual({ symbol: '•', beschreibung: 'constructor' });
  });
});

describe('zellbeschreibung', () => {
  it('nennt die Kennzeichen in Worten und den Tooltip, getrennt durch Punkt', () => {
    expect(zellbeschreibung({ text: '0,00', kennzeichen: ['nullpreis', 'min'], tooltip: 'EP 0,00 €' })).toBe(
      'Nullpreis. niedrigster Preis. EP 0,00 €',
    );
    expect(zellbeschreibung({ text: '1,00' })).toBe('');
  });
});
