// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: das Aufmaßblatt als Ansicht des Vergleichsgrids (U2) und die Befehle aus dem Panel. Das Auftrags-LV ist
// das aus `typisch` mit dem Angebot von Bieter A; Mengen der Fixture `typisch.json`.

import type { Aufmass, AufmassId, Menge, PositionId } from '@tethys/vertrag';
import { beforeAll, describe, expect, it } from 'vitest';
import { blattAnsicht, kumuliertBisHier, zeilenBefehl, zeilenZiel } from './blatt';
import { mitAuftrag, positionMitOz, type Aufbau } from './testhilfen';

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
    nummer: 1,
    bezeichnung: '',
    datum: null,
    positionen,
  };
}

describe('blattAnsicht', () => {
  it('Spalten OZ, Kurztext, Einheit, Auftragsmenge, Menge dieses Blatts, kumuliert bis hier', () => {
    const v = blattAnsicht({
      auftrag: auf.auftrag,
      blatt: blatt([]),
      kumuliert: new Map(),
      zugeklappt: new Set(),
    });
    expect(v.spalten.map((s) => s.kopf)).toEqual([
      'OZ',
      'Kurztext',
      'Einheit',
      'Auftragsmenge',
      'Menge dieses Blatts',
      'Kumuliert bis hier',
    ]);
  });

  it('zeigt den Baum des Auftrags-LV ohne Hinweistexte; Mengen in de-DE, Ansatz mit neutralem Kennzeichen', () => {
    const aushub = positionMitOz(auf.auftrag, '02.0020');
    const zaun = positionMitOz(auf.auftrag, '01.0020');
    const fehlt = positionMitOz(auf.auftrag, '01.0030');
    const b = blatt([
      {
        positionId: aushub,
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '12,5*8*3,5', variable: null }],
        menge: '350.000' as Menge,
      },
      { positionId: zaun, mengenansatz: null, menge: '-2.500' as Menge },
      {
        positionId: fehlt,
        mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '(1', variable: null }],
        menge: null,
      },
    ]);
    const kumuliert = new Map<string, Menge>([[aushub, '400.000' as Menge]]);
    const v = blattAnsicht({ auftrag: auf.auftrag, blatt: b, kumuliert, zugeklappt: new Set() });
    // 3 Titel und 24 Positionen (25 in `typisch`; die Alternative 02.0070 A entfällt ohne Wahl, D-21).
    expect(v.zeilen.filter((z) => z.art === 'gliederung').map((z) => z.zellen['oz']?.text)).toEqual([
      '01',
      '02',
      '03',
    ]);
    expect(v.zeilen.filter((z) => z.art === 'position')).toHaveLength(24);
    const zeile = (id: PositionId) => v.zeilen.find((z) => z.id === id);
    expect(zeile(aushub)?.zellen).toMatchObject({
      oz: { text: '02.0020' },
      kurztext: { text: 'Baugrube ausheben' },
      einheit: { text: 'm³' },
      auftragsmenge: { text: '318,200' },
      blattmenge: { text: '350,000', kennzeichen: ['mengenansatz'] },
      kumuliert: { text: '400,000' },
    });
    expect(zeile(zaun)?.zellen['blattmenge']).toEqual({ text: '-2,500' });
    expect(zeile(fehlt)?.zellen['blattmenge']).toEqual({
      text: '',
      kennzeichen: ['mengenansatz', 'menge-fehlt'],
    });
    // Ohne Zeile auf dem Blatt bleibt die Zelle leer.
    expect(zeile(positionMitOz(auf.auftrag, '03.0010'))?.zellen['blattmenge']).toEqual({ text: '' });
    expect(v.kennzeichenTexte['mengenansatz']?.symbol).toBe('Σ');
  });

  it('zugeklappte Gliederungen verbergen ihre Positionen', () => {
    const titel = auf.auftrag.auftragsLeistungsverzeichnis.knoten.find(
      (k) => k.art === 'titel' && k.ordnungszahl === '02',
    );
    const v = blattAnsicht({
      auftrag: auf.auftrag,
      blatt: blatt([]),
      kumuliert: new Map(),
      zugeklappt: new Set([titel?.id ?? '']),
    });
    expect(v.zeilen.some((z) => z.zellen['oz']?.text === '02.0010')).toBe(false);
    expect(v.zeilen.find((z) => z.id === titel?.id)?.aufgeklappt).toBe(false);
  });
});

describe('kumuliertBisHier (Soll/Ist aus `abrechnung` über die Blätter bis zu diesem)', () => {
  it('summiert die Blätter bis einschließlich der Nummer; nur aufgemessene Positionen; Zeilen ohne Menge zählen nicht', () => {
    const aushub = positionMitOz(auf.auftrag, '02.0020');
    const zaun = positionMitOz(auf.auftrag, '01.0020');
    const eins = {
      ...blatt([{ positionId: aushub, mengenansatz: null, menge: '100.000' as Menge }]),
      nummer: 1,
    };
    const zwei = {
      ...blatt([
        { positionId: aushub, mengenansatz: null, menge: '50.500' as Menge },
        {
          positionId: zaun,
          mengenansatz: [{ zeile: 1, formel: 91, ausdruck: '(1', variable: null }],
          menge: null,
        },
      ]),
      id: 'b2' as AufmassId,
      nummer: 2,
    };
    const drei = {
      ...blatt([{ positionId: aushub, mengenansatz: null, menge: '-10.000' as Menge }]),
      id: 'b3' as AufmassId,
      nummer: 3,
    };
    // Die Reihenfolge der Liste zählt nicht, nur die Nummer.
    const alle = [drei, eins, zwei];
    expect(Object.fromEntries(kumuliertBisHier(auf.auftrag, alle, 1))).toEqual({ [aushub]: '100.000' });
    expect(Object.fromEntries(kumuliertBisHier(auf.auftrag, alle, 2))).toEqual({
      [aushub]: '150.500',
      [zaun]: '0.000',
    });
    expect(kumuliertBisHier(auf.auftrag, alle, 3).get(aushub)).toBe('140.500');
  });
});

describe('Panel an einer Zeile des Blatts', () => {
  it('Ziel: Name, Einheit und der gespeicherte Stand der Zeile (ohne Zeile: nichts)', () => {
    const aushub = positionMitOz(auf.auftrag, '02.0020');
    const ansatz = [{ zeile: 1, formel: 91, ausdruck: '2*3', variable: null }];
    const b = blatt([{ positionId: aushub, mengenansatz: ansatz, menge: '6.000' as Menge }]);
    expect(zeilenZiel(auf.auftrag, b, aushub)).toEqual({
      art: 'ziel',
      ziel: {
        schluessel: aushub,
        name: '02.0020 Baugrube ausheben',
        einheit: 'm³',
        mengenansatz: ansatz,
        menge: '6.000',
      },
    });
    const leer = positionMitOz(auf.auftrag, '02.0030');
    expect(zeilenZiel(auf.auftrag, b, leer)).toMatchObject({
      art: 'ziel',
      ziel: { mengenansatz: null, menge: null },
    });
  });

  it('nur Positionen: eine Gliederung oder eine Zuschlagsposition wird nicht aufgemessen', () => {
    const knoten = auf.auftrag.auftragsLeistungsverzeichnis.knoten;
    const titel = knoten.find((k) => k.art === 'titel');
    const zuschlag = knoten.find((k) => k.art === 'position' && k.zuschlag !== null);
    expect(zeilenZiel(auf.auftrag, blatt([]), titel?.id ?? '')).toEqual({ art: 'keine-position' });
    expect(zeilenZiel(auf.auftrag, blatt([]), zuschlag?.id ?? '')).toEqual({ art: 'zuschlagsposition' });
  });

  it('Befehl: Setzen mit Ansatz oder Menge; ohne beides wird eine vorhandene Zeile entfernt', () => {
    const p = positionMitOz(auf.auftrag, '02.0020');
    const ansatz = [{ zeile: 1, formel: 91, ausdruck: '2*3', variable: null }];
    expect(zeilenBefehl(blatt([]), p, { mengenansatz: ansatz, menge: '6.000' as Menge })).toEqual({
      art: 'AufmasspositionSetzen',
      position: { positionId: p, mengenansatz: ansatz, menge: '6.000' },
    });
    expect(zeilenBefehl(blatt([]), p, { mengenansatz: null, menge: '4.000' as Menge })).toEqual({
      art: 'AufmasspositionSetzen',
      position: { positionId: p, mengenansatz: null, menge: '4.000' },
    });
    const mit = blatt([{ positionId: p, mengenansatz: null, menge: '4.000' as Menge }]);
    expect(zeilenBefehl(mit, p, { mengenansatz: null, menge: null })).toEqual({
      art: 'AufmasspositionEntfernen',
      positionId: p,
    });
    expect(zeilenBefehl(blatt([]), p, { mengenansatz: null, menge: null })).toBeNull();
  });
});
