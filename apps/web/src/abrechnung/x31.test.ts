// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87 (M3): X31 in der App. Einlesen legt ein neues Blatt an, die Menge je Position rechnet `mengen`; Ausgeben
// schreibt ein Blatt über `gaeb` (Ticket 83). Rundweg mit einem eigenen Blatt; die BVBS-Prüfdatei passt nicht zu
// `typisch` und ergibt nur Befunde.

import { readFileSync } from 'node:fs';
import type { Aufmass, AufmassId, Menge } from '@tethys/vertrag';
import { beforeAll, describe, expect, it } from 'vitest';
import { mitAuftrag, positionMitOz, type Aufbau } from './testaufbau';
import { blattAlsX31, x31Vorschau } from './x31';

const wurzel = new URL('../../../../', import.meta.url);
let auf: Aufbau;
beforeAll(async () => {
  auf = await mitAuftrag();
});

function blatt(positionen: Aufmass['positionen']): Aufmass {
  const a = auf.auftrag.auftragsLeistungsverzeichnis;
  return {
    id: 'b1' as AufmassId,
    projektId: a.projektId,
    auftragsLvId: a.id,
    nummer: 3,
    bezeichnung: 'Erdarbeiten',
    datum: '2026-11-02',
    positionen,
  };
}

describe('X31 ausgeben und wieder einlesen', () => {
  it('ein eigenes Blatt kommt mit Ansatz und gerechneter Menge zurück; Dateiname nach Auftrags-LV und Blatt', () => {
    const aushub = positionMitOz(auf.auftrag, '02.0020');
    const zaun = positionMitOz(auf.auftrag, '01.0020');
    const b = blatt([
      {
        positionId: aushub,
        mengenansatz: [
          { zeile: 1, formel: 91, ausdruck: '12,5*8*3,5', variable: 'grube' },
          { zeile: 2, formel: 91, ausdruck: 'Z1/10', variable: null },
        ],
        menge: '385.000' as Menge,
      },
      { positionId: zaun, mengenansatz: null, menge: '42.500' as Menge },
    ]);
    const aus = blattAlsX31(b, auf.auftrag, '3.3', new Date(Date.UTC(2026, 10, 11, 9, 30, 0)));
    expect(aus.dateiname).toBe('Typisch Musterhaus erfunden Aufmass 3.x31');
    expect(aus.xml).toContain('<Date>2026-11-11</Date>');
    expect(aus.entwurf).toBe(false);

    const v = x31Vorschau(aus.xml, auf.auftrag);
    expect(v.uebernehmbar).toBe(true);
    expect(v.ungerechnet).toBe(0);
    // Reihenfolge des Auftrags-LV; der Variablenname wird zum Zeilenbezug (D-83.9), die Menge rechnet `mengen`.
    expect(v.positionen).toEqual([
      { positionId: zaun, mengenansatz: null, menge: '42.500' },
      {
        positionId: aushub,
        mengenansatz: [
          { zeile: 1, formel: 91, ausdruck: '12,5*8*3,5', variable: null },
          { zeile: 2, formel: 91, ausdruck: 'Z1/10', variable: null },
        ],
        menge: '385.000',
      },
    ]);
  });

  it('BVBS-Prüfdatei gegen ein fremdes Auftrags-LV: kein Blatt, nur Befunde', () => {
    const bytes = new Uint8Array(
      readFileSync(
        new URL(
          'fixtures/extern/bvbs/3.3-mengenermittlung/Pruefdatei_3.3_Mengenermittlung_V-11-06-2021.x31',
          wurzel,
        ),
      ),
    );
    const v = x31Vorschau(bytes, auf.auftrag);
    expect(v.uebernehmbar).toBe(false);
    expect(v.positionen).toEqual([]);
    expect(v.befunde.some((b) => b.code === 'position-unbekannt' && b.schwere === 'fehler')).toBe(true);
  });

  it('ein Ansatz mit Fehler oder in der Textform kommt ohne Menge (nie geraten, Q5) und wird gezählt', () => {
    const aushub = positionMitOz(auf.auftrag, '02.0020');
    const b = blatt([
      {
        positionId: aushub,
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '2*3', variable: null }],
        menge: '6.000' as Menge,
      },
    ]);
    const xml = blattAlsX31(b, auf.auftrag, '3.2', new Date(Date.UTC(2026, 10, 11))).xml.replace(
      '2*3',
      '2*(3',
    );
    const v = x31Vorschau(xml, auf.auftrag);
    expect(v.positionen).toEqual([
      {
        positionId: aushub,
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '2*(3', variable: null }],
        menge: null,
      },
    ]);
    expect(v.ungerechnet).toBe(1);
    expect(v.uebernehmbar).toBe(true);
  });
});
