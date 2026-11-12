// SPDX-License-Identifier: AGPL-3.0-or-later
// Golden-Tests der GlobalId-Prüfung (Ticket 98, Punkt 5): doppelt → Befund, beide bleiben; nicht wohlgeformt (22 Zeichen
// aus dem IFC-Base64-Alphabet `0-9A-Za-z_$`) → Befund, der Wert bleibt, wie er in der Datei steht.

import { describe, expect, it } from 'vitest';
import { ifcLesen } from './index';
import type { IfcLesung } from './index';
import { bytes, codes, gid, grundgeruest, ifcText } from './testhilfen';

/** Wände im EG mit den gegebenen GlobalIds (als STEP-Parameter), je mit einer Menge. */
function waende(...globalIds: string[]): IfcLesung {
  const zeilen = globalIds.flatMap((g, k) => {
    const n = 100 + k * 10;
    return [
      `#${String(n)}=IFCWALL(${g},$,'Wand ${String(k + 1)}',$,$,$,$,$,$);`,
      `#${String(n + 1)}=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid(`r${String(n)}`)}',$,$,$,(#${String(n)}),#12);`,
      `#${String(n + 2)}=IFCELEMENTQUANTITY('${gid(`q${String(n)}`)}',$,'Qto',$,$,(#${String(n + 3)}));`,
      `#${String(n + 3)}=IFCQUANTITYLENGTH('Length',$,$,1.,$);`,
      `#${String(n + 4)}=IFCRELDEFINESBYPROPERTIES('${gid(`d${String(n)}`)}',$,$,$,(#${String(n)}),#${String(n + 2)});`,
    ];
  });
  return ifcLesen(bytes(ifcText([...grundgeruest(), ...zeilen])));
}

describe('GlobalId', () => {
  it('akzeptiert 22 Zeichen aus 0-9, A-Z, a-z, _ und $', () => {
    const lesung = waende("'0aZ9_$bY8xW7vU6tS5rQ4p'", "'3vB2YO$MX4xv5uCqZZG05x'");
    expect(lesung.befunde).toEqual([]);
    expect(lesung.modell?.bauteile.map((b) => b.globalId)).toEqual([
      '0aZ9_$bY8xW7vU6tS5rQ4p',
      '3vB2YO$MX4xv5uCqZZG05x',
    ]);
  });

  it('meldet eine doppelte GlobalId an der zweiten Stelle und behält beide Bauteile', () => {
    const lesung = waende(`'${gid('gleich')}'`, `'${gid('anders')}'`, `'${gid('gleich')}'`);
    expect(lesung.modell?.bauteile.map((b) => [b.name, b.globalId])).toEqual([
      ['Wand 1', gid('gleich')],
      ['Wand 2', gid('anders')],
      ['Wand 3', gid('gleich')],
    ]);
    expect(codes(lesung)).toEqual(['globalid-doppelt']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'fehler', ort: { pfad: '#120', feld: 'GlobalId' } });
    expect(lesung.befunde[0]?.meldung).toContain('#100');
  });

  it('meldet dieselbe GlobalId an einem Strukturknoten und einem Bauteil', () => {
    const lesung = waende(`'${gid('eg')}'`);
    expect(codes(lesung)).toEqual(['globalid-doppelt']);
    expect(lesung.befunde[0]?.ort.pfad).toBe('#100');
  });

  it.each([
    ['21 Zeichen', "'0123456789abcdefghijk'"],
    ['23 Zeichen', "'0123456789abcdefghijklm'"],
    ['Zeichen außerhalb des Alphabets', "'0123456789-bcdefghijkl'"],
    ['leer', "''"],
    ['fehlt', '$'],
  ])('meldet eine GlobalId, die nicht wohlgeformt ist (%s), und behält den Wert der Datei', (_fall, g) => {
    const lesung = waende(g);
    expect(lesung.modell?.bauteile.map((b) => b.globalId)).toEqual([g === '$' ? '' : g.slice(1, -1)]);
    expect(codes(lesung)).toEqual(['globalid-ungueltig']);
    expect(lesung.befunde[0]).toMatchObject({ schwere: 'fehler', ort: { pfad: '#100', feld: 'GlobalId' } });
  });
});
