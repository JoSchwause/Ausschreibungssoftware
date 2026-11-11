// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsstand (Ticket 81, D-34 (1)–(3)): Golden-Tests gegen die Sollwerte des Tors M4 (Ticket 85, unabhängig
// hergeleitet) und Hand-Beispiele mit Rechenweg für Bedarf, Zuschlagsposition, EP `null` und den absoluten Nachlass.

import type { Aufmass, AufmassId, Betrag, Menge, PositionId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { leistungsstandBerechnen } from './leistungsstand';
import { abrechnungsFixture, auftragsLv, m4Stand, position, titel, zuschlagsposition } from './testhilfen';

const fx = abrechnungsFixture();
const m4 = m4Stand();

function blatt(id: string, nummer: number, zeilen: readonly [string, string | null][]): Aufmass {
  return {
    id: id as AufmassId,
    projektId: m4.blatt1.projektId,
    auftragsLvId: 'auftrag' as Aufmass['auftragsLvId'],
    nummer,
    bezeichnung: '',
    datum: null,
    positionen: zeilen.map(([positionId, menge]) => ({
      positionId: positionId as PositionId,
      mengenansatz: null,
      menge: menge as Menge | null,
    })),
  };
}

describe('leistungsstandBerechnen: Tor M4 (Sollwerte aus typisch-abrechnung)', () => {
  it('AR 1 (Blatt 1): Leistung 8.135,57, Nachlass 3 % 244,07, Netto n. N. 7.891,50', () => {
    const { leistungsstand, befunde } = leistungsstandBerechnen(m4.auftrag, [m4.blatt1], 'abschlag');
    expect(leistungsstand).toEqual(fx.pruefungen.ar1.leistungsstand);
    expect(befunde).toEqual([]);
  });

  it('AR 2 vor der Korrektur (Blatt 1 + 2): Leistung 17.395,50; Bedarf 01.0040 zählt, weil aufgemessen', () => {
    const { leistungsstand } = leistungsstandBerechnen(m4.auftrag, [m4.blatt1, m4.blatt2], 'abschlag');
    expect(leistungsstand).toEqual(fx.pruefungen.ar2VorKorrektur.leistungsstand);
  });

  it('AR 2 nach der Korrektur von Blatt 1: Leistung 17.367,85; die Reihenfolge der Blätter ändert nichts', () => {
    const { leistungsstand } = leistungsstandBerechnen(
      m4.auftrag,
      [m4.blatt2, m4.blatt1Korrigiert],
      'abschlag',
    );
    expect(leistungsstand).toEqual(fx.pruefungen.ar2NachKorrektur.leistungsstand);
  });
});

describe('leistungsstandBerechnen: Hand-Beispiele', () => {
  // Titel t mit p1 (EP 10,000), p2 (Bedarf ohne Gesamtbetrag, EP 4,000), p3 (ohne EP), z (Zuschlag 5,00 % auf p1 und p2).
  const knoten = [
    titel('t', 'auftrag', 0, '01'),
    position('p1', 't', 0, '01.0010', '10.000', '10.000'),
    position('p2', 't', 1, '01.0020', '5.000', '4.000', { bedarf: 'ohne-gesamtbetrag' }),
    position('p3', 't', 2, '01.0030', '1.000', null),
    zuschlagsposition('z', 't', 3, '01.0040', ['p1', 'p2'], '5.00'),
  ];

  it('Bedarf zählt aufgemessen, Zuschlag auf die geprüften GP, EP null zählt 0 mit Befund', () => {
    // p1: 1,234 + 2,000 = 3,234 × 10,000 = 32,34; p2: 2,500 × 4,000 = 10,00 (Bedarf, aufgemessen: zählt, D-34 (1));
    // p3: 1,000 ohne EP → 0,00 mit Befund; z: round(5,00 × (32,34 + 10,00) / 100, 2) = round(2,117, 2) = 2,12.
    // Leistung 32,34 + 10,00 + 0,00 + 2,12 = 44,46; kein Nachlass.
    const al = auftragsLv('auftrag', knoten);
    const b1 = blatt('b1', 1, [
      ['p1', '1.234'],
      ['p3', '1.000'],
      ['z', '1.000'],
      ['t', '1.000'],
      ['fremd', '1.000'],
    ]);
    const b2 = blatt('b2', 2, [
      ['p1', '2.000'],
      ['p2', '2.500'],
      ['p3', null],
    ]);
    const e = leistungsstandBerechnen(al, [b2, b1], 'abschlag');
    expect(e.leistungsstand).toEqual({
      positionen: [
        { positionId: 'p1', menge: '3.234', gp: '32.34' },
        { positionId: 'p2', menge: '2.500', gp: '10.00' },
        { positionId: 'p3', menge: '1.000', gp: '0.00' },
        { positionId: 'z', menge: null, gp: '2.12' },
      ],
      leistung: '44.46' as Betrag,
      nachlass: '0.00' as Betrag,
      nettoNachNachlass: '44.46' as Betrag,
    });
    expect(e.befunde).toEqual([
      { code: 'zeile-zaehlt-nicht', aufmassId: 'b1', positionId: 'z', grund: 'zuschlagsposition' },
      { code: 'zeile-zaehlt-nicht', aufmassId: 'b1', positionId: 't', grund: 'keine-position' },
      { code: 'zeile-zaehlt-nicht', aufmassId: 'b1', positionId: 'fremd', grund: 'position-unbekannt' },
      { code: 'zeile-zaehlt-nicht', aufmassId: 'b2', positionId: 'p3', grund: 'menge-fehlt' },
      { code: 'ohne-einheitspreis', positionId: 'p3' },
    ]);
  });

  it('Zuschlagsposition ohne Satz: GP 0,00 mit Befund, solange ihre Basis nicht 0,00 ist (Review D-42)', () => {
    const ohneSatz = knoten.map((k) =>
      k.id === 'z' ? zuschlagsposition('z', 't', 3, '01.0040', ['p1', 'p2'], null) : k,
    );
    const al = auftragsLv('auftrag', ohneSatz);
    const e = leistungsstandBerechnen(al, [blatt('b1', 1, [['p1', '1.000']])], 'abschlag');
    expect(e.leistungsstand.positionen.at(-1)).toEqual({ positionId: 'z', menge: null, gp: '0.00' });
    expect(e.befunde).toEqual([{ code: 'ohne-zuschlagssatz', positionId: 'z' }]);
    expect(leistungsstandBerechnen(al, [], 'abschlag').befunde).toEqual([]);
  });

  it('Prozent-Nachlass: round(Leistung × Satz / 100, 2) (N5, D-34 (2))', () => {
    // p1 3,234 × 10,000 = 32,34; z round(5,00 × 32,34 / 100, 2) = round(1,617, 2) = 1,62; Leistung 33,96.
    // Nachlass round(33,96 × 3,00 / 100, 2) = round(1,0188, 2) = 1,02; Netto n. N. 32,94.
    const al = auftragsLv('auftrag', knoten, { nachlass: { art: 'prozent', wert: '3.00' as never } });
    const { leistungsstand } = leistungsstandBerechnen(al, [blatt('b1', 1, [['p1', '3.234']])], 'abschlag');
    expect(leistungsstand).toMatchObject({ leistung: '33.96', nachlass: '1.02', nettoNachNachlass: '32.94' });
  });

  it('absoluter Nachlass: in Abschlag anteilig mit min(…, abs), in Schluss voll; Basis 0 → 0 mit Befund', () => {
    // Auftrags-LV netto: p1 10 × 10 = 100,00 + z round(5 % × 100,00) = 5,00 → 105,00 (p2 Bedarf ohne GB zählt nicht).
    // Nachlass absolut 21,00. Abschlag mit p1 3,234: Leistung 32,34 + z 1,62 = 33,96 (wie oben);
    // round(21,00 × 33,96 / 105,00, 2) = round(6,792, 2) = 6,79; Netto n. N. 27,17. Schluss: 21,00 voll; Netto n. N. 12,96.
    const nachlass = { art: 'betrag', wert: '21.00' as Betrag } as const;
    const al = auftragsLv('auftrag', knoten, { nachlass });
    expect(al.summen.gesamt.netto).toBe('105.00');
    const b = [blatt('b1', 1, [['p1', '3.234']])];
    expect(leistungsstandBerechnen(al, b, 'abschlag').leistungsstand).toMatchObject({
      leistung: '33.96',
      nachlass: '6.79',
      nettoNachNachlass: '27.17',
    });
    expect(leistungsstandBerechnen(al, b, 'schluss').leistungsstand).toMatchObject({
      nachlass: '21.00',
      nettoNachNachlass: '12.96',
    });
    // Mehr Leistung als das Auftrags-LV: p1 21,000 → 210,00, z 10,50, Leistung 220,50; anteilig wäre
    // round(21,00 × 220,50 / 105,00, 2) = 44,10, höchstens 21,00.
    const viel = [blatt('b1', 1, [['p1', '21.000']])];
    expect(leistungsstandBerechnen(al, viel, 'abschlag').leistungsstand).toMatchObject({
      leistung: '220.50',
      nachlass: '21.00',
    });
    // Auftrags-LV mit Netto 0,00 (keine EP): Nachlass 0,00 mit Befund.
    const ohneEp = auftragsLv(
      'auftrag',
      [titel('t', 'auftrag', 0, '01'), position('q', 't', 0, '01.0010', '1.000')],
      {
        nachlass,
      },
    );
    const e = leistungsstandBerechnen(ohneEp, [blatt('b1', 1, [['q', '1.000']])], 'abschlag');
    expect(e.leistungsstand.nachlass).toBe('0.00');
    expect(e.befunde).toContainEqual({ code: 'nachlass-ohne-basis' });
    // Schluss: voller Betrag, Netto n. N. negativ (E-06) als Befund.
    const s = leistungsstandBerechnen(ohneEp, [blatt('b1', 1, [['q', '1.000']])], 'schluss');
    expect(s.leistungsstand).toMatchObject({ nachlass: '21.00', nettoNachNachlass: '-21.00' });
    expect(s.befunde).toContainEqual({ code: 'netto-nach-nachlass-negativ' });
  });
});
