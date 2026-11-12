// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { auswahlBeiKlick, darstellungBerechnen } from './darstellung';
import type { Darstellungseingaben } from './darstellung';
import { Bauteilverzeichnis } from './zuordnung';

// Bauteilindex 0..4; „W“ ist doppelt (Index 1 und 4)
const verzeichnis = new Bauteilverzeichnis(['A', 'W', 'B', 'C', 'W']);
const leer: Darstellungseingaben = { auswahl: [], ausgeblendet: [], isoliert: null, faerbung: new Map() };

describe('darstellungBerechnen', () => {
  it('zeigt ohne Eingaben alle Bauteile in ihrer eigenen Farbe', () => {
    const d = darstellungBerechnen(verzeichnis, leer);
    expect(d.sichtbar).toEqual([true, true, true, true, true]);
    expect(d.farbe).toEqual(['eigen', 'eigen', 'eigen', 'eigen', 'eigen']);
  });

  it('blendet genau die genannten Bauteile aus, bei doppelter GlobalId beide', () => {
    const d = darstellungBerechnen(verzeichnis, { ...leer, ausgeblendet: ['W', 'C'] });
    expect(d.sichtbar).toEqual([true, false, true, false, false]);
  });

  it('isoliert: nur die genannten Bauteile bleiben sichtbar; eine leere Liste zeigt nichts', () => {
    expect(darstellungBerechnen(verzeichnis, { ...leer, isoliert: ['B'] }).sichtbar).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(darstellungBerechnen(verzeichnis, { ...leer, isoliert: [] }).sichtbar).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('ausgeblendet gilt auch innerhalb der Isolierung', () => {
    const d = darstellungBerechnen(verzeichnis, { ...leer, isoliert: ['A', 'B'], ausgeblendet: ['B'] });
    expect(d.sichtbar).toEqual([true, false, false, false, false]);
  });

  it('färbt nach Kennzeichen; die Auswahl geht der Färbung vor', () => {
    const d = darstellungBerechnen(verzeichnis, {
      ...leer,
      auswahl: ['B'],
      faerbung: new Map([
        ['A', 'hinzugefuegt'],
        ['B', 'entfernt'],
        ['W', 'ohne-zuordnung'],
      ]),
    });
    expect(d.farbe).toEqual(['hinzugefuegt', 'ohne-zuordnung', 'auswahl', 'eigen', 'ohne-zuordnung']);
  });

  it('übergeht GlobalIds, die das Modell nicht hat', () => {
    const d = darstellungBerechnen(verzeichnis, {
      auswahl: ['X'],
      ausgeblendet: ['Y'],
      isoliert: ['A', 'Z'],
      faerbung: new Map([['Q', 'geaendert']]),
    });
    expect(d.sichtbar).toEqual([true, false, false, false, false]);
    expect(d.farbe).toEqual(['eigen', 'eigen', 'eigen', 'eigen', 'eigen']);
  });
});

describe('auswahlBeiKlick', () => {
  it('Klick auf ein Bauteil wählt es allein aus', () => {
    expect(auswahlBeiKlick('A', false)).toEqual({ globalIds: ['A'], hinzufuegen: false });
  });

  it('Strg+Klick auf ein Bauteil ergänzt die Auswahl', () => {
    expect(auswahlBeiKlick('A', true)).toEqual({ globalIds: ['A'], hinzufuegen: true });
  });

  it('Klick ins Leere hebt die Auswahl auf, Strg+Klick ins Leere ändert nichts', () => {
    expect(auswahlBeiKlick(null, false)).toEqual({ globalIds: [], hinzufuegen: false });
    expect(auswahlBeiKlick(null, true)).toBeNull();
  });
});
