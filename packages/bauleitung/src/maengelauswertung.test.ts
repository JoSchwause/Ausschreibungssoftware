// SPDX-License-Identifier: AGPL-3.0-or-later
// Mängelauswertung (Ticket 111 Punkt 3; Glossar „Mängelauswertung“): Mängel je Auftrags-LV mit seinem Auftragnehmer und
// je Status, offene und überfällige Zahl zu einem Stichtag.

import type { AuftragsLeistungsverzeichnisId, Mangel } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { maengelAuswerten } from './index';
import { AUFTRAG_ROHBAU, mangel } from './testhilfen';

const AUFTRAG_TIEFBAU = '019b7a12-d000-7000-8000-000000000022' as AuftragsLeistungsverzeichnisId;
const AUFTRAG_FREMD = '019b7a12-d000-7000-8000-000000000029' as AuftragsLeistungsverzeichnisId;

const verlauf = (...status: Mangel['verlauf'][number]['status'][]): Mangel['verlauf'] =>
  status.map((s) => ({ status: s, datum: '2026-11-10', bemerkung: null }));

const AUFTRAEGE = [
  { auftragsLvId: AUFTRAG_ROHBAU, auftragnehmer: 'Rohbau GmbH' },
  { auftragsLvId: AUFTRAG_TIEFBAU, auftragnehmer: 'Tiefbau KG' },
];

describe('maengelAuswerten', () => {
  it('zählt je Auftrags-LV und gesamt: Anzahl, je Status, offen (offen oder angezeigt), überfällig', () => {
    const maengel = [
      mangel(1, { frist: '2026-11-20', verlauf: verlauf('offen', 'angezeigt', 'beseitigt', 'abgenommen') }),
      mangel(2, { frist: '2026-11-20', verlauf: verlauf('offen', 'angezeigt') }),
      mangel(3, { frist: '2026-11-30', verlauf: verlauf('offen') }),
      mangel(4, {
        auftragsLvId: AUFTRAG_TIEFBAU,
        frist: '2026-11-20',
        verlauf: verlauf('offen', 'angezeigt', 'beseitigt'),
      }),
    ];
    expect(maengelAuswerten(maengel, AUFTRAEGE, '2026-11-26')).toEqual({
      stichtag: '2026-11-26',
      jeAuftragnehmer: [
        {
          auftragsLvId: AUFTRAG_ROHBAU,
          auftragnehmer: 'Rohbau GmbH',
          anzahl: 3,
          jeStatus: { offen: 1, angezeigt: 1, beseitigt: 0, abgenommen: 1 },
          offen: 2,
          ueberfaellig: 1,
        },
        {
          auftragsLvId: AUFTRAG_TIEFBAU,
          auftragnehmer: 'Tiefbau KG',
          anzahl: 1,
          jeStatus: { offen: 0, angezeigt: 0, beseitigt: 1, abgenommen: 0 },
          offen: 0,
          ueberfaellig: 0,
        },
      ],
      gesamt: {
        anzahl: 4,
        jeStatus: { offen: 1, angezeigt: 1, beseitigt: 1, abgenommen: 1 },
        offen: 2,
        ueberfaellig: 1,
      },
    });
  });

  it('führt jedes übergebene Auftrags-LV, auch ohne Mangel, in der übergebenen Reihenfolge', () => {
    const a = maengelAuswerten([], [...AUFTRAEGE].reverse(), '2026-11-26');
    expect(a.jeAuftragnehmer.map((z) => [z.auftragnehmer, z.anzahl])).toEqual([
      ['Tiefbau KG', 0],
      ['Rohbau GmbH', 0],
    ]);
    expect(a.gesamt).toEqual({
      anzahl: 0,
      jeStatus: { offen: 0, angezeigt: 0, beseitigt: 0, abgenommen: 0 },
      offen: 0,
      ueberfaellig: 0,
    });
  });

  it('Mängel eines nicht übergebenen Auftrags-LV und Mängel ohne Auftrags-LV stehen in eigenen Zeilen dahinter', () => {
    const a = maengelAuswerten(
      [
        mangel(3, { auftragsLvId: null }),
        mangel(2, { auftragsLvId: AUFTRAG_FREMD }),
        mangel(1, { auftragsLvId: null }),
      ],
      AUFTRAEGE.slice(0, 1),
      '2026-11-26',
    );
    expect(a.jeAuftragnehmer.map((z) => [z.auftragsLvId, z.auftragnehmer, z.anzahl, z.ueberfaellig])).toEqual(
      [
        [AUFTRAG_ROHBAU, 'Rohbau GmbH', 0, 0],
        [AUFTRAG_FREMD, null, 1, 1],
        [null, null, 2, 2],
      ],
    );
    expect(a.gesamt.anzahl).toBe(3);
  });

  it('weist einen Stichtag ab, der kein Kalendertag ist', () => {
    expect(() => maengelAuswerten([], AUFTRAEGE, '26.11.2026')).toThrow(RangeError);
  });
});
