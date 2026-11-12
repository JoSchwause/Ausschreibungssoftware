// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: die Soll/Ist-Ansicht im Vergleichsgrid (U2). Gerechnet wird in `abrechnung` (Ticket 81); geprüft wird hier
// die Abbildung. Erwartete Zahlen aus den Fixtures (`typisch.json`: Menge, `typisch-angebote.json`: EP und GP von
// Bieter A, Titelsumme, Netto) und von Hand nach N2 hergeleitet, nie aus einem Lauf.

import type { Aufmass, AufmassId, Menge, Prozent } from '@tethys/vertrag';
import { beforeAll, describe, expect, it } from 'vitest';
import { sollIstAnsicht, sollIstRechnen } from './sollist';
import { mitAuftrag, positionMitOz, type Aufbau } from './testhilfen';

let auf: Aufbau;
beforeAll(async () => {
  auf = await mitAuftrag();
});

function blatt(nummer: number, positionen: Aufmass['positionen']): Aufmass {
  const a = auf.auftrag.auftragsLeistungsverzeichnis;
  return {
    id: `b${String(nummer)}` as AufmassId,
    projektId: a.projektId,
    auftragsLvId: a.id,
    nummer,
    bezeichnung: '',
    datum: null,
    positionen,
  };
}

describe('Soll/Ist-Ansicht', () => {
  it('Soll, Ist, Differenz, %, GP Soll/Ist und der Befund über 110 % (VOB/B § 2 Abs. 3)', () => {
    const aushub = positionMitOz(auf.auftrag, '02.0020');
    const zaun = positionMitOz(auf.auftrag, '01.0020');
    // 02.0020: Soll 318,200 m³ (Fixture), Ist 300 + 60 = 360,000 über zwei Blätter.
    // Differenz 41,800; Anteil 360 / 318,2 × 100 = 113,136… → 113,14 %; GP Ist = 360 × 9,825 (EP Bieter A) = 3.537,00.
    // 01.0020: Soll 86,500 m, Ist 80,000 → 92,49 %; ohne Schlussrechnung kein Befund unter 90 % (D-35), ohnehin darüber.
    // GP Ist = round(80 × 7,227, 2) = 578,16.
    const blaetter = [
      blatt(1, [{ positionId: aushub, mengenansatz: null, menge: '300.000' as Menge }]),
      blatt(2, [
        { positionId: aushub, mengenansatz: null, menge: '60.000' as Menge },
        { positionId: zaun, mengenansatz: null, menge: '80.000' as Menge },
      ]),
    ];
    const s = sollIstRechnen(auf.auftrag, blaetter, {});
    const v = sollIstAnsicht({ auftrag: auf.auftrag, sollIst: s, zugeklappt: new Set() });
    expect(v.spalten.map((x) => x.kopf)).toEqual([
      'OZ',
      'Kurztext',
      'Einheit',
      'Soll',
      'Ist',
      'Differenz',
      '%',
      'GP Soll',
      'GP Ist',
      'Befund',
    ]);
    const zeile = (id: string) => v.zeilen.find((z) => z.id === id)?.zellen;
    expect(zeile(aushub)).toMatchObject({
      oz: { text: '02.0020' },
      soll: { text: '318,200' },
      ist: { text: '360,000' },
      differenz: { text: '41,800' },
      anteil: { text: '113,14 %' },
      gpSoll: { text: '3.126,32' },
      gpIst: { text: '3.537,00' },
      befund: { text: 'über 110,00 %', kennzeichen: ['ueber-schwelle'] },
    });
    expect(zeile(zaun)).toMatchObject({
      ist: { text: '80,000' },
      differenz: { text: '-6,500' },
      anteil: { text: '92,49 %' },
      gpIst: { text: '578,16' },
      befund: { text: '' },
    });
    // Ohne Aufmaß: Ist 0,000, GP Ist 0,00.
    expect(zeile(positionMitOz(auf.auftrag, '03.0010'))).toMatchObject({
      ist: { text: '0,000' },
      gpIst: { text: '0,00' },
    });
    // Titel 02: GP Soll 25.066,17 (Fixture), GP Ist 3.537,00; Titel 01: 5.423,41 / 578,16.
    const titel = (oz: string) =>
      v.zeilen.find((z) => z.art === 'gliederung' && z.zellen['oz']?.text === oz)?.zellen;
    expect(titel('02')).toMatchObject({ gpSoll: { text: '25.066,17' }, gpIst: { text: '3.537,00' } });
    expect(titel('01')).toMatchObject({ gpSoll: { text: '5.423,41' }, gpIst: { text: '578,16' } });
    // Gesamt: GP Soll = Netto des Auftrags-LV vor Nachlass (55.481,84), GP Ist = 3.537,00 + 578,16 = 4.115,16.
    expect(v.summen).toEqual([
      {
        id: 'summe:gesamt',
        zellen: {
          kurztext: { text: 'Gesamt (netto vor Nachlass)' },
          gpSoll: { text: '55.481,84' },
          gpIst: { text: '4.115,16' },
        },
      },
    ]);
    expect(v.befunde).toEqual([
      {
        positionId: aushub,
        text: '02.0020 Baugrube ausheben: Ist 113,14 % der Auftragsmenge (über 110,00 %)',
      },
    ]);
  });

  it('Schwellen einstellbar; unter der unteren Schwelle nur mit Schlussrechnung (abgeschlossen)', () => {
    const zaun = positionMitOz(auf.auftrag, '01.0020');
    const blaetter = [blatt(1, [{ positionId: zaun, mengenansatz: null, menge: '80.000' as Menge }])];
    const offen = sollIstRechnen(auf.auftrag, blaetter, { unterSchwelle: '95.00' as Prozent });
    expect(offen.befunde).toEqual([]);
    const ab = sollIstRechnen(auf.auftrag, blaetter, {
      abgeschlossen: true,
      unterSchwelle: '95.00' as Prozent,
    });
    const v = sollIstAnsicht({ auftrag: auf.auftrag, sollIst: ab, zugeklappt: new Set() });
    expect(v.zeilen.find((z) => z.id === zaun)?.zellen['befund']).toEqual({
      text: 'unter 95,00 %',
      kennzeichen: ['unter-schwelle'],
    });
    const streng = sollIstRechnen(auf.auftrag, blaetter, { oberSchwelle: '92.00' as Prozent });
    expect(streng.befunde.map((b) => b.code)).toEqual(['ueber-schwelle']);
  });
});
