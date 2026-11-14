// SPDX-License-Identifier: AGPL-3.0-or-later
import type { IfcGlobalId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { auswahlBeiKlick, darstellungBerechnen } from './darstellung';
import type { Darstellungseingaben } from './darstellung';
import { Bauteilverzeichnis } from './zuordnung';

/** Kurze Kennungen statt echter GlobalIds; die Leinwand vergleicht nur auf Gleichheit. */
const g = (id: string): IfcGlobalId => id as IfcGlobalId;

// Bauteilindex 0..4; „W“ ist doppelt (Index 1 und 4)
const verzeichnis = new Bauteilverzeichnis([g('A'), g('W'), g('B'), g('C'), g('W')]);
const leer: Darstellungseingaben = { auswahl: [], ausgeblendet: [], isoliert: null, faerbung: new Map() };

describe('darstellungBerechnen', () => {
  it('zeigt ohne Eingaben alle Bauteile in ihrer eigenen Farbe', () => {
    const d = darstellungBerechnen(verzeichnis, leer);
    expect(d.sichtbar).toEqual([true, true, true, true, true]);
    expect(d.farbe).toEqual(['eigen', 'eigen', 'eigen', 'eigen', 'eigen']);
  });

  it('blendet genau die genannten Bauteile aus, bei doppelter GlobalId beide', () => {
    const d = darstellungBerechnen(verzeichnis, { ...leer, ausgeblendet: [g('W'), g('C')] });
    expect(d.sichtbar).toEqual([true, false, true, false, false]);
  });

  it('isoliert: nur die genannten Bauteile bleiben sichtbar; eine leere Liste zeigt nichts', () => {
    expect(darstellungBerechnen(verzeichnis, { ...leer, isoliert: [g('B')] }).sichtbar).toEqual([
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
    const d = darstellungBerechnen(verzeichnis, {
      ...leer,
      isoliert: [g('A'), g('B')],
      ausgeblendet: [g('B')],
    });
    expect(d.sichtbar).toEqual([true, false, false, false, false]);
  });

  it('färbt nach Kennzeichen; die Auswahl geht der Färbung vor', () => {
    const d = darstellungBerechnen(verzeichnis, {
      ...leer,
      auswahl: [g('B')],
      faerbung: new Map([
        [g('A'), 'hinzugefuegt'],
        [g('B'), 'entfernt'],
        [g('W'), 'ohne-zuordnung'],
      ]),
    });
    expect(d.farbe).toEqual(['hinzugefuegt', 'ohne-zuordnung', 'auswahl', 'eigen', 'ohne-zuordnung']);
  });

  it('übergeht GlobalIds, die das Modell nicht hat', () => {
    const d = darstellungBerechnen(verzeichnis, {
      auswahl: [g('X')],
      ausgeblendet: [g('Y')],
      isoliert: [g('A'), g('Z')],
      faerbung: new Map([[g('Q'), 'geaendert']]),
    });
    expect(d.sichtbar).toEqual([true, false, false, false, false]);
    expect(d.farbe).toEqual(['eigen', 'eigen', 'eigen', 'eigen', 'eigen']);
  });
});

describe('auswahlBeiKlick', () => {
  it('Klick auf ein Bauteil wählt es allein aus', () => {
    expect(auswahlBeiKlick(g('A'), false)).toEqual({ globalIds: [g('A')], hinzufuegen: false });
  });

  it('Strg+Klick auf ein Bauteil ergänzt die Auswahl', () => {
    expect(auswahlBeiKlick(g('A'), true)).toEqual({ globalIds: [g('A')], hinzufuegen: true });
  });

  it('Klick ins Leere hebt die Auswahl auf, Strg+Klick ins Leere ändert nichts', () => {
    expect(auswahlBeiKlick(null, false)).toEqual({ globalIds: [], hinzufuegen: false });
    expect(auswahlBeiKlick(null, true)).toBeNull();
  });
});
