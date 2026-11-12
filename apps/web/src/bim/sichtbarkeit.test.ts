// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { modellbaumBauen } from './baum';
import { ALLES_SICHTBAR, ausblenden, bauteileDerKlasse, geschosse, isolieren, klassen } from './sichtbarkeit';
import { bauteil, gid, hausModell, knoten, modell } from './testhilfen';

const m = modell(
  [
    knoten('P', 'projekt', null),
    knoten('EG', 'geschoss', 'P'),
    knoten('OG', 'geschoss', 'P'),
    knoten('R', 'raum', 'EG'),
  ],
  [bauteil('W1', 'EG'), bauteil('F1', 'R', { ifcKlasse: 'IfcWindow' }), bauteil('W2', 'OG')],
);
const baum = modellbaumBauen(m);

describe('Sichtbarkeit', () => {
  it('Ausblenden sammelt, Isolieren zeigt nur die Gewählten und hebt das Ausblenden auf, alles zeigen setzt zurück', () => {
    const a = ausblenden(ALLES_SICHTBAR, [gid('W1')]);
    const b = ausblenden(a, [gid('W2'), gid('W1')]);
    expect(b.ausgeblendet).toEqual([gid('W1'), gid('W2')]);
    expect(b.isoliert).toBeNull();
    const c = isolieren(b, [gid('F1')]);
    expect(c).toEqual({ ausgeblendet: [], isoliert: [gid('F1')] });
    expect(ausblenden(c, [gid('F1')]).ausgeblendet).toEqual([gid('F1')]);
  });

  it('Isolieren ohne Bauteile ändert nichts (sonst wäre die Leinwand leer)', () => {
    expect(isolieren(ALLES_SICHTBAR, [])).toBe(ALLES_SICHTBAR);
  });

  it('je Geschoss: die Bauteile des Geschosses samt seiner Räume', () => {
    const g = geschosse(baum);
    expect(g.map((x) => x.name)).toEqual(['EG', 'OG']);
    expect(g[0]?.bauteile).toEqual([gid('F1'), gid('W1')]); // Baumreihenfolge: Räume vor Bauteilen
  });

  it('je Klasse: Klassen alphabetisch mit Zahl, Bauteile in Modellreihenfolge', () => {
    expect(klassen(m)).toEqual([
      { klasse: 'IfcWall', anzahl: 2 },
      { klasse: 'IfcWindow', anzahl: 1 },
    ]);
    expect(bauteileDerKlasse(m, 'IfcWall')).toEqual([gid('W1'), gid('W2')]);
  });

  it('haus-v1 hat die Geschosse EG und OG', () => {
    expect(geschosse(modellbaumBauen(hausModell())).map((x) => x.name)).toEqual(['EG', 'OG']);
  });
});
