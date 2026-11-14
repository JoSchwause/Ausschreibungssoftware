// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { BAUM_SPALTEN, modellbaumBauen, sichtbareZeilen } from './baum';
import { bauteil, gid, hausModell, knoten, menge, modell } from './testhilfen';

const texte = (
  z: { zellen: Readonly<Record<string, { text: string } | undefined>> },
  spalte: string,
): string => z.zellen[spalte]?.text ?? '';

describe('Modellbaum aus haus-v1', () => {
  const m = hausModell();
  const baum = modellbaumBauen(m);
  const zeilen = sichtbareZeilen(baum, new Set());

  it('Struktur Projekt → Grundstück → Gebäude → Geschoss, Geschosse EG und OG mit Bauteilen und Räumen darunter', () => {
    const namen = zeilen.filter((z) => z.art === 'gliederung').map((z) => [z.tiefe, texte(z, 'name')]);
    expect(namen.slice(0, 4)).toEqual([
      [0, 'Musterhaus (erfunden)'],
      [1, 'Grundstück (erfunden)'],
      [2, 'Haus (erfunden)'],
      [3, 'EG'],
    ]);
    expect(namen.map(([, n]) => n)).toContain('OG');
    expect(namen.map(([, n]) => n)).toContain('E.01');
  });

  it('jedes Bauteil steht genau einmal im Baum, unter seinem Geschoss', () => {
    const bauteilZeilen = zeilen.filter((z) => z.art === 'position');
    expect(bauteilZeilen).toHaveLength(m.bauteile.length);
    const eg = zeilen.find((z) => texte(z, 'name') === 'EG');
    const sued = zeilen.find((z) => texte(z, 'name') === 'Streifenfundament Süd');
    expect(sued?.tiefe).toBe((eg?.tiefe ?? 0) + 1);
  });

  it('Spalten Klasse, Typ und je eine Spalte für Länge, Fläche und Volumen (deutsches Zahlformat)', () => {
    expect(BAUM_SPALTEN.map((s) => s.kopf)).toEqual(['Name', 'Klasse', 'Typ', 'Länge', 'Fläche', 'Volumen']);
    const sued = zeilen.find((z) => texte(z, 'name') === 'Streifenfundament Süd');
    if (sued === undefined) throw new Error('fehlt');
    expect(texte(sued, 'klasse')).toBe('Fundament (IfcFooting)');
    expect(texte(sued, 'laenge')).toBe('12,225');
    expect(texte(sued, 'volumen')).toBe('5,868');
    expect(sued.zellen['volumen']?.tooltip).toBe('NetVolume');
    const wand = zeilen.find((z) => texte(z, 'name') === 'Außenwand Süd EG');
    expect(texte(wand ?? sued, 'typ')).toBe('Außenwand Ziegel 36,5');
    const eg = zeilen.find((z) => texte(z, 'name') === 'EG');
    expect(texte(eg ?? sued, 'klasse')).toBe('Geschoss');
  });

  it('zugeklappte Knoten verbergen alles darunter', () => {
    const eg = zeilen.find((z) => texte(z, 'name') === 'EG');
    if (eg === undefined) throw new Error('fehlt');
    const zu = sichtbareZeilen(baum, new Set([eg.id]));
    expect(zu.find((z) => z.id === eg.id)?.aufgeklappt).toBe(false);
    expect(zu.some((z) => texte(z, 'name') === 'Streifenfundament Süd')).toBe(false);
    expect(zu.some((z) => texte(z, 'name') === 'OG')).toBe(true);
  });
});

describe('Modellbaum: Sonderfälle', () => {
  it('Teile stehen unter ihrem Ganzen, ohne Strukturknoten unter einer eigenen Gruppe', () => {
    const m = modell(
      [knoten('P', 'projekt', null), knoten('G', 'geschoss', 'P', null)],
      [
        bauteil('Treppe', 'G', { ifcKlasse: 'IfcStair' }),
        bauteil('Lauf', 'G', { teilVon: 'Treppe', ifcKlasse: 'IfcStairFlight' }),
        bauteil('Lose', null),
      ],
    );
    const z = sichtbareZeilen(modellbaumBauen(m), new Set());
    expect(z.map((r) => [r.tiefe, texte(r, 'name')])).toEqual([
      [0, 'P'],
      [1, 'Geschoss ohne Namen'],
      [2, 'Treppe'],
      [3, 'Lauf'],
      [0, 'Ohne Strukturknoten'],
      [1, 'Lose'],
    ]);
    expect(z[2]?.hatUnterknoten).toBe(true);
    expect(z[2]?.art).toBe('position');
  });

  it('doppelte GlobalIds: beide Bauteile bleiben, ein Verweis meint das erste (D-66)', () => {
    const m = modell(
      [knoten('P', 'projekt', null)],
      [bauteil('W', 'P', { name: 'erste' }), bauteil('W', 'P', { name: 'zweite' })],
    );
    const baum = modellbaumBauen(m);
    const z = sichtbareZeilen(baum, new Set());
    expect(z.map((r) => texte(r, 'name'))).toEqual(['P', 'erste', 'zweite']);
    expect(new Set(z.map((r) => r.id)).size).toBe(3);
    expect(baum.zeileVon(gid('W'))).toBe(z[1]?.id);
  });

  it('Länge heißt bevorzugt „Length“, Fläche und Volumen bevorzugt netto; ohne Menge bleibt die Zelle leer', () => {
    const m = modell(
      [knoten('P', 'projekt', null)],
      [
        bauteil('A', 'P', {
          mengen: [
            menge('Width', 'laenge', '0.240'),
            menge('Length', 'laenge', '5.000'),
            menge('GrossSideArea', 'flaeche', '15.000'),
            menge('NetSideArea', 'flaeche', '12.500'),
          ],
        }),
      ],
    );
    const a = sichtbareZeilen(modellbaumBauen(m), new Set())[1];
    if (a === undefined) throw new Error('fehlt');
    expect(texte(a, 'laenge')).toBe('5,000');
    expect(texte(a, 'flaeche')).toBe('12,500');
    expect(texte(a, 'volumen')).toBe('');
  });

  it('ein Ring in der Struktur (gegen die Zusage von ifc) verliert keinen Knoten', () => {
    const m = modell([knoten('A', 'gebaeude', 'B'), knoten('B', 'geschoss', 'A')], []);
    const z = sichtbareZeilen(modellbaumBauen(m), new Set());
    expect(z.map((r) => texte(r, 'name')).sort()).toEqual(['A', 'B']);
  });
});
