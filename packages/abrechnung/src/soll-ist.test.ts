// SPDX-License-Identifier: AGPL-3.0-or-later
// Soll/Ist (Ticket 81, D-35, VOB/B § 2 Abs. 3): Golden-Tests gegen die Sollwerte des Tors M4 (Ticket 85; D-85.5: die Fixture
// listet nur Positionen mit Aufmaß) und Hand-Beispiele für Schwellen, Pauschal, Soll 0 und Summen.

import type {
  Aufmass,
  AufmassId,
  AuftragsLeistungsverzeichnisId,
  Menge,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { sollIstBerechnen } from './soll-ist';
import {
  PROJEKT,
  abrechnungsFixture,
  auftragsLv,
  m4Stand,
  position,
  titel,
  zuschlagsposition,
} from './testhilfen';

const fx = abrechnungsFixture();
const m4 = m4Stand();

describe('sollIstBerechnen: Tor M4 (Sollwerte aus typisch-abrechnung)', () => {
  const staende = {
    nachBlatt1: [m4.blatt1],
    nachBlatt2: [m4.blatt1, m4.blatt2],
    nachKorrektur: [m4.blatt2, m4.blatt1Korrigiert],
  } as const;

  for (const [name, blaetter] of Object.entries(staende)) {
    it(`${name}: Soll, Ist und Anteil je aufgemessener Position; genau ein ueber-schwelle (02.0040, 112,50 %)`, () => {
      const soll = fx.sollIst[name as keyof typeof staende];
      const s = sollIstBerechnen(m4.auftrag, blaetter);
      const aufgemessen = new Set(soll.zeilen.map((z) => z.positionId));
      expect(
        s.zeilen
          .filter((z) => aufgemessen.has(z.positionId))
          .map((z) => ({ positionId: z.positionId, soll: z.soll, ist: z.ist, anteil: z.anteil })),
      ).toEqual(soll.zeilen);
      // Ohne Aufmaß: Ist 0 (Zuschlagsposition: keine Menge).
      for (const z of s.zeilen.filter((z) => !aufgemessen.has(z.positionId)))
        expect(z.ist === null || z.ist === '0.000').toBe(true);
      expect(s.befunde.map((b) => ({ positionId: b.positionId, art: b.code, anteil: b.anteil }))).toEqual(
        soll.befunde,
      );
    });
  }

  it('Summen: Soll = Netto des Auftrags-LV (Kern), Ist = Leistung; je Gliederung', () => {
    const s = sollIstBerechnen(m4.auftrag, [m4.blatt1, m4.blatt2]);
    // Netto 59.803,77 (Auftrags-LV nach N01, Fixture); Leistung AR 2 vor der Korrektur 17.395,50.
    expect(s.gesamt).toEqual({ gpSoll: '59803.77', gpIst: '17395.50' });
    // Nachtrag N01: Soll 922,49 + 522,75 = 1.445,24; Ist 26,400 × 38,437 = 1.014,74 und 4,000 × 87,125 = 348,50, 1.363,24.
    const nachtrag = s.gliederungen.find((g) => g.gliederungId === fx.nachtrag.uebernahme.knoten[0]?.id);
    expect(nachtrag).toMatchObject({ gpSoll: '1445.24', gpIst: '1363.24' });
    expect(s.gliederungen).toHaveLength(5);
  });

  it('mit Schlussrechnung (abgeschlossen) auch unter-schwelle, auch ohne Aufmaß (Ist 0)', () => {
    const s = sollIstBerechnen(m4.auftrag, [m4.blatt1, m4.blatt2], { abgeschlossen: true });
    expect(s.befunde.filter((b) => b.code === 'ueber-schwelle')).toHaveLength(1);
    // 01.0010: 0,500 von 1,000 = 50,00 %; 01.0030 ohne Aufmaß: 0,00 %.
    expect(s.befunde).toContainEqual({
      code: 'unter-schwelle',
      positionId: '019b76e9-ea42-7a6c-9180-36c38b8c3b9e',
      anteil: '50.00',
    });
    expect(s.befunde).toContainEqual({
      code: 'unter-schwelle',
      positionId: '019b76e9-ea44-7a84-a6a6-36868f616703',
      anteil: '0.00',
    });
  });
});

describe('sollIstBerechnen: Hand-Beispiele', () => {
  const AUFTRAG = 'auftrag';
  const al = auftragsLv(AUFTRAG, [
    titel('t', AUFTRAG, 0, '01'),
    position('a', 't', 0, '01.0010', '20.000', '2.500'),
    position('pa', 't', 1, '01.0020', '1.000', '100.000', { pauschal: true }),
    position('null', 't', 2, '01.0030', '0.000', '1.000'),
    position('ohne', 't', 3, '01.0040', null, '1.000'),
    position('kein-ep', 't', 4, '01.0050', '3.000', null),
    zuschlagsposition('z', 't', 5, '01.0060', ['a'], '10.00'),
  ]);
  const blatt: Aufmass = {
    id: 'b1' as AufmassId,
    projektId: PROJEKT,
    auftragsLvId: AUFTRAG as AuftragsLeistungsverzeichnisId,
    nummer: 1,
    bezeichnung: '',
    datum: null,
    positionen: (
      [
        ['a', '22.001'],
        ['pa', '2.000'],
        ['null', '5.000'],
        ['ohne', '1.000'],
        ['kein-ep', '1.000'],
      ] as const
    ).map(([p, m]) => ({ positionId: p as PositionId, mengenansatz: null, menge: m as Menge })),
  };

  it('Zeilen: Differenz, Anteil kaufmännisch, GP Soll aus dem Kern, GP Ist geprüft; Zuschlagsposition ohne Menge', () => {
    const s = sollIstBerechnen(al, [blatt]);
    expect(s.zeilen).toEqual([
      // 22,001 / 20,000 = 110,005 % → 110,01 %; GP Soll 20,000 × 2,500 = 50,00; Ist 22,001 × 2,500 = 55,0025 → 55,00.
      {
        positionId: 'a',
        soll: '20.000',
        ist: '22.001',
        differenz: '2.001',
        anteil: '110.01',
        gpSoll: '50.00',
        gpIst: '55.00',
      },
      {
        positionId: 'pa',
        soll: '1.000',
        ist: '2.000',
        differenz: '1.000',
        anteil: '200.00',
        gpSoll: '100.00',
        gpIst: '200.00',
      },
      {
        positionId: 'null',
        soll: '0.000',
        ist: '5.000',
        differenz: '5.000',
        anteil: null,
        gpSoll: '0.00',
        gpIst: '5.00',
      },
      {
        positionId: 'ohne',
        soll: null,
        ist: '1.000',
        differenz: null,
        anteil: null,
        gpSoll: null,
        gpIst: '1.00',
      },
      {
        positionId: 'kein-ep',
        soll: '3.000',
        ist: '1.000',
        differenz: '-2.000',
        anteil: '33.33',
        gpSoll: null,
        gpIst: '0.00',
      },
      // Zuschlag 10 % auf a: Soll round(50,00 × 10 %) = 5,00; Ist round(55,00 × 10 %) = 5,50.
      {
        positionId: 'z',
        soll: null,
        ist: null,
        differenz: null,
        anteil: null,
        gpSoll: '5.00',
        gpIst: '5.50',
      },
    ]);
    // Nur a überschreitet streng; Pauschal, Soll 0 und ohne Soll haben keinen Befund.
    expect(s.befunde).toEqual([{ code: 'ueber-schwelle', positionId: 'a', anteil: '110.01' }]);
  });

  it('streng verglichen mit der exakten Menge: genau 110 % ist kein Befund, auch wenn der Anteil gerundet 110,00 zeigt', () => {
    const genau = {
      ...blatt,
      positionen: [{ positionId: 'a' as PositionId, mengenansatz: null, menge: '22.000' as Menge }],
    };
    expect(sollIstBerechnen(al, [genau]).befunde).toEqual([]);
    // 22,0009 gibt es als Menge nicht; 22,001 ist der kleinste Wert darüber (Test oben).
  });

  it('Schwellen einstellbar', () => {
    const s = sollIstBerechnen(al, [blatt], {
      oberSchwelle: '120.00' as Prozent,
      unterSchwelle: '50.00' as Prozent,
      abgeschlossen: true,
    });
    expect(s.befunde).toEqual([{ code: 'unter-schwelle', positionId: 'kein-ep', anteil: '33.33' }]);
  });
});
