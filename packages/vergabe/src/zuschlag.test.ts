// SPDX-License-Identifier: AGPL-3.0-or-later
// Zuschlagspositionen im Angebot (Ticket 44, Punkt 1 und 2): Der Bieter bepreist eine Zuschlagsposition mit seinem
// Zuschlagssatz; Basis, Betrag und Summen kommen aus dem Kern (gedachtes LV, R7), nicht aus einer eigenen Rechnung.

import { describe, expect, it } from 'vitest';
import type { AngebotZustand, PositionId } from '@tethys/vertrag';
import { angebotBefehlAusfuehrer, angebotSummenBerechnen, angebotZuschlaegeBerechnen } from './index';
import {
  angebot,
  ep,
  erwarteOk,
  liste,
  lv,
  nichtAngeboten,
  position,
  projekt,
  satz,
  titel,
  wende,
  zuschlagsposition,
} from './testhilfen';

// LV MwSt 19 %: Titel t1 mit p1 10,000 m und p2 20,000 m, dahinter z1 (Gliederung, Satz im LV 5,00 %);
// Titel t2 mit z2 (Liste auf p2, ohne Satz im LV).
const lvZ = lv('lv-z', [
  titel('t1', 'lv-z', 0),
  position('p1', 't1', 0, '10.000', '9.000'),
  position('p2', 't1', 1, '20.000', '19.000'),
  zuschlagsposition('z1', 't1', 2, { art: 'gliederung' }, '5.00'),
  titel('t2', 'lv-z', 1),
  zuschlagsposition('z2', 't2', 0, liste('p2'), null),
]);

describe('Bietersummen mit Zuschlagssatz des Bieters', () => {
  it('rechnet den Satz des Bieters auf die Basis aus seinen Preisen; der Platzhalter-EP zählt nie', () => {
    // p1 10 × 10,000 = 100,00; p2 20 × 20,000 = 400,00. z1: 10 % auf 500,00 = 50,00 (nicht der LV-Satz 5 %).
    // z2: 7,5 % auf 400,00 = 30,00. Der EP 999,000 an z1 ist Platzhalter und wird nicht gerechnet.
    const a = angebot('a', lvZ, 'b-a', [
      ep('p1', '10.000'),
      ep('p2', '20.000'),
      satz('z1', '10.00', '999.000'),
      satz('z2', '7.50'),
    ]);
    const s = angebotSummenBerechnen(lvZ, a);
    expect(s.positionen.find((p) => p.positionId === 'z1')?.gesamtpreis).toBe('50.00');
    expect(s.positionen.find((p) => p.positionId === 'z2')?.gesamtpreis).toBe('30.00');
    expect(s.gliederungen.map((g) => [g.gliederungId, g.summe])).toEqual([
      ['t1', '550.00'],
      ['t2', '30.00'],
    ]);
    // Netto 580,00; MwSt 110,20; Brutto 690,20.
    expect(s.gesamt.netto).toBe('580.00');
    expect(s.gesamt.brutto).toBe('690.20');
  });
});

describe('AngebotspositionSetzen an Zuschlagspositionen', () => {
  const ausfuehren = angebotBefehlAusfuehrer(projekt(['b-a']), lvZ);
  const start = wende(ausfuehren, null, {
    art: 'AngebotAnlegen',
    angebot: angebot('a', lvZ, 'b-a', [
      ep('p1', '10.000'),
      ep('p2', '20.000'),
      satz('z1', '10.00'),
      satz('z2', '7.50'),
    ]),
  }) as AngebotZustand;

  it('EP einer Bezugsposition ändern: die Beträge beider Zuschlagspositionen ziehen im ChangeSet nach', () => {
    // p2 20 × 21,000 = 420,00 (+20,00). z1: 10 % auf 520,00 = 52,00 (+2,00); z2 (in t2): 7,5 % auf 420,00 = 31,50.
    const cs = erwarteOk(ausfuehren(start, { art: 'AngebotspositionSetzen', position: ep('p2', '21.000') }));
    expect(cs.summen.positionen.map((p) => [p.positionId, p.gesamtpreis])).toEqual([
      ['p2', '420.00'],
      ['z1', '52.00'],
      ['z2', '31.50'],
    ]);
    expect(cs.summen.gliederungen.map((g) => [g.gliederungId, g.summe])).toEqual([
      ['t1', '572.00'],
      ['t2', '31.50'],
    ]);
    expect(cs.summen.gesamt?.netto).toBe('603.50');
  });

  it('Satz ändern: nur die Zuschlagsposition, ihre Gliederung und die Gesamtsummen', () => {
    const cs = erwarteOk(ausfuehren(start, { art: 'AngebotspositionSetzen', position: satz('z1', '12.00') }));
    expect(cs.summen.positionen).toEqual([{ positionId: 'z1', gesamtpreis: '60.00', gehtInSummeEin: true }]);
    expect(cs.summen.gliederungen.map((g) => g.gliederungId)).toEqual(['t1']);
  });

  it('Satz an einer Position ohne Zuschlag oder nicht kanonisch → ungueltige-eingabe, feld zuschlagssatz', () => {
    for (const position of [satz('p1', '10.00'), satz('z1', '10.0'), satz('z1', '10,00')]) {
      const e = ausfuehren(start, { art: 'AngebotspositionSetzen', position });
      expect(e.ok ? null : e.fehler).toMatchObject({ code: 'ungueltige-eingabe', feld: 'zuschlagssatz' });
    }
    const anlegen = ausfuehren(null, {
      art: 'AngebotAnlegen',
      angebot: angebot('b', lvZ, 'b-a', [satz('p2', '1.00')]),
    });
    expect(anlegen.ok ? null : anlegen.fehler).toMatchObject({ feld: 'zuschlagssatz', knotenId: 'p2' });
  });
});

describe('Altform (R8) im Angebot', () => {
  it('eine Zuschlagsposition mit Menge im LV und ohne Satz des Bieters rechnet Menge × EP des Bieters', () => {
    const alt = lv('lv-alt', [
      titel('t1', 'lv-alt', 0),
      position('p1', 't1', 0, '10.000', '9.000'),
      { ...position('za', 't1', 1, '1.000', '50.000'), zuschlag: { prozentsatz: null, bezug: liste('p1') } },
    ]);
    const s = angebotSummenBerechnen(alt, angebot('a', alt, 'b-a', [ep('p1', '10.000'), ep('za', '42.500')]));
    expect(s.positionen.map((p) => p.gesamtpreis)).toEqual(['100.00', '42.50']);
    expect(s.gesamt.netto).toBe('142.50');
  });
});

describe('angebotZuschlaegeBerechnen: Lücken des Bieters', () => {
  it('Satz fehlt: kein Betrag, Kennzeichen zuschlagssatz-fehlt; ohne Eintrag bleibt es nicht-angeboten', () => {
    const a = angebot('a', lvZ, 'b-a', [ep('p1', '10.000'), ep('p2', '20.000'), ep('z1', '50.000')]);
    const z = angebotZuschlaegeBerechnen(lvZ, a);
    expect(z.get('z1' as PositionId)).toEqual({
      positionId: 'z1',
      kennzeichen: 'zuschlagssatz-fehlt',
      satz: null,
      basis: '500.00',
      betrag: null,
      basisUnvollstaendig: false,
    });
    expect(z.get('z2' as PositionId)?.kennzeichen).toBe('nicht-angeboten');
    expect(angebotSummenBerechnen(lvZ, a).gesamt.netto).toBe('500.00');
  });

  it('Satz 0,00 ist angeboten: Betrag 0,00, Kennzeichen nullpreis (verschieden von „fehlt“)', () => {
    const a = angebot('a', lvZ, 'b-a', [ep('p1', '10.000'), ep('p2', '20.000'), satz('z1', '0.00')]);
    expect(angebotZuschlaegeBerechnen(lvZ, a).get('z1' as PositionId)).toEqual({
      positionId: 'z1',
      kennzeichen: 'nullpreis',
      satz: '0.00',
      basis: '500.00',
      betrag: '0.00',
      basisUnvollstaendig: false,
    });
  });

  it('nicht angebotene Bezugsposition trägt nichts zur Basis bei: basis-unvollstaendig', () => {
    // p1 nicht angeboten: Basis von z1 nur p2 = 400,00; 10 % = 40,00. z2 nennt nur p2: vollständig.
    const a = angebot('a', lvZ, 'b-a', [
      nichtAngeboten('p1'),
      ep('p2', '20.000'),
      satz('z1', '10.00'),
      satz('z2', '10.00'),
    ]);
    const z = angebotZuschlaegeBerechnen(lvZ, a);
    expect(z.get('z1' as PositionId)).toEqual({
      positionId: 'z1',
      kennzeichen: 'angeboten',
      satz: '10.00',
      basis: '400.00',
      betrag: '40.00',
      basisUnvollstaendig: true,
    });
    expect(z.get('z2' as PositionId)?.basisUnvollstaendig).toBe(false);
  });
});
