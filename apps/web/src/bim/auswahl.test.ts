// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { AUSWAHL_START, auswahlDerZeile, beiKlick3d, beiZeileAktiv } from './auswahl';
import { modellbaumBauen } from './baum';
import { bauteil, gid, knoten, modell } from './testhilfen';

const m = modell(
  [knoten('P', 'projekt', null), knoten('EG', 'geschoss', 'P'), knoten('OG', 'geschoss', 'P')],
  [
    bauteil('W1', 'EG'),
    bauteil('Treppe', 'EG', { ifcKlasse: 'IfcStair' }),
    bauteil('Lauf', 'EG', { teilVon: 'Treppe' }),
    bauteil('W2', 'OG'),
  ],
);
const baum = modellbaumBauen(m);
const zeile = (kurz: string): string => baum.zeileVon(gid(kurz)) ?? '';

describe('Auswahl aus dem Baum', () => {
  it('ein Bauteil wählt sich und seine Teile, ein Strukturknoten alle Bauteile darunter', () => {
    expect(auswahlDerZeile(baum, zeile('W1'))).toEqual([gid('W1')]);
    expect(auswahlDerZeile(baum, zeile('Treppe'))).toEqual([gid('Treppe'), gid('Lauf')]);
    expect(auswahlDerZeile(baum, zeile('EG'))).toEqual([gid('W1'), gid('Treppe'), gid('Lauf')]);
    expect(auswahlDerZeile(baum, zeile('P'))).toHaveLength(4);
  });

  it('die erste aktive Zeile nach dem Laden wählt nichts; jede weitere wählt ihre Bauteile', () => {
    const s1 = beiZeileAktiv(AUSWAHL_START, baum, zeile('P'));
    expect(s1.auswahl).toEqual([]);
    const s2 = beiZeileAktiv(s1, baum, zeile('OG'));
    expect(s2.auswahl).toEqual([gid('W2')]);
    expect(s2.aktiveZeile).toBe(zeile('OG'));
  });

  it('Strg+Klick im Baum ergänzt die Auswahl um die Bauteile der Zeile (Ticket 115)', () => {
    const s1 = beiZeileAktiv(beiZeileAktiv(AUSWAHL_START, baum, zeile('P')), baum, zeile('W1'));
    const s2 = beiZeileAktiv(s1, baum, zeile('OG'), true);
    expect(s2.auswahl).toEqual([gid('W1'), gid('W2')]);
    expect(beiZeileAktiv(s2, baum, zeile('W1'), true).auswahl).toEqual([gid('W1'), gid('W2')]);
  });
});

describe('Auswahl aus der 3D-Ansicht', () => {
  const geladen = beiZeileAktiv(AUSWAHL_START, baum, zeile('P'));

  it('Klick wählt das Bauteil und springt zu seiner Zeile; das Melden dieser Zeile ändert die Auswahl nicht', () => {
    const s = beiKlick3d(geladen, baum, [gid('Lauf')], false);
    expect(s.auswahl).toEqual([gid('Lauf')]);
    expect(s.sprungziel).toEqual({ zeilenId: zeile('Lauf'), nr: 1 });
    const nach = beiZeileAktiv(s, baum, zeile('Lauf'));
    expect(nach.auswahl).toEqual([gid('Lauf')]);
    expect(nach.aktiveZeile).toBe(zeile('Lauf'));
    // danach wählt dieselbe Zeile wieder wie gewohnt
    expect(beiZeileAktiv(beiZeileAktiv(nach, baum, zeile('W1')), baum, zeile('Lauf')).auswahl).toEqual([
      gid('Lauf'),
    ]);
  });

  it('der Sprung klappt die Zeilen über dem Ziel auf', () => {
    const zu = { ...geladen, zugeklappt: new Set([zeile('EG'), zeile('Treppe'), zeile('OG')]) };
    const s = beiKlick3d(zu, baum, [gid('Lauf')], false);
    expect([...s.zugeklappt]).toEqual([zeile('OG')]);
  });

  it('Strg+Klick ergänzt die Auswahl ohne Doppelte', () => {
    const s1 = beiKlick3d(geladen, baum, [gid('W1')], false);
    const s2 = beiKlick3d(beiZeileAktiv(s1, baum, zeile('W1')), baum, [gid('W2')], true);
    expect(s2.auswahl).toEqual([gid('W1'), gid('W2')]);
    expect(beiKlick3d(s2, baum, [gid('W1')], true).auswahl).toEqual([gid('W1'), gid('W2')]);
  });

  it('Klick ins Leere hebt die Auswahl auf, ohne zu springen', () => {
    const s1 = beiKlick3d(geladen, baum, [gid('W1')], false);
    const s2 = beiKlick3d(s1, baum, [], false);
    expect(s2.auswahl).toEqual([]);
    expect(s2.sprungziel).toEqual(s1.sprungziel);
  });

  it('Klick auf das Bauteil der schon aktiven Zeile springt nicht und erwartet keine Meldung', () => {
    const aktiv = beiZeileAktiv(geladen, baum, zeile('W1'));
    const s = beiKlick3d(beiKlick3d(aktiv, baum, [], false), baum, [gid('W1')], false);
    expect(s.auswahl).toEqual([gid('W1')]);
    expect(s.erwartet).toBeNull();
    expect(beiZeileAktiv(s, baum, zeile('W2')).auswahl).toEqual([gid('W2')]);
  });

  it('eine GlobalId, die der Baum nicht kennt, wird gewählt, aber nicht angesprungen', () => {
    const s = beiKlick3d(geladen, baum, [gid('Fremd')], false);
    expect(s.auswahl).toEqual([gid('Fremd')]);
    expect(s.sprungziel).toBeNull();
  });
});
