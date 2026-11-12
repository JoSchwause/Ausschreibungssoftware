// SPDX-License-Identifier: AGPL-3.0-or-later
// Statustabelle der Mängel (Ticket 111 Punkt 1, D-57, Glossar „Mangelstatus“): Golden-Test über alle Paare von Status.

import type { Mangelstatus } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { MANGELSTATUSWECHSEL, mangelstatus, statuswechselZulaessig } from './index';

const ALLE: readonly Mangelstatus[] = ['offen', 'angezeigt', 'beseitigt', 'abgenommen'];

describe('Statustabelle der Mängel', () => {
  it('lässt genau offen → angezeigt → beseitigt → abgenommen und beseitigt → offen zu', () => {
    const zulaessig = ALLE.flatMap((von) =>
      ALLE.filter((nach) => statuswechselZulaessig(von, nach)).map((nach) => `${von} → ${nach}`),
    );
    expect(zulaessig).toEqual([
      'offen → angezeigt',
      'angezeigt → beseitigt',
      'beseitigt → offen',
      'beseitigt → abgenommen',
    ]);
  });

  it('der erste Eintrag eines Verlaufs ist offen, nichts anderes', () => {
    expect(ALLE.filter((nach) => statuswechselZulaessig(null, nach))).toEqual(['offen']);
  });

  it('die Tabelle nennt je Status die zulässigen Ziele; abgenommen ist endgültig', () => {
    expect(MANGELSTATUSWECHSEL).toEqual({
      offen: ['angezeigt'],
      angezeigt: ['beseitigt'],
      beseitigt: ['offen', 'abgenommen'],
      abgenommen: [],
    });
  });

  it('der Status eines Mangels ist der seines letzten Verlaufseintrags', () => {
    expect(
      mangelstatus({
        verlauf: [
          { status: 'offen', datum: '2026-11-12', bemerkung: null },
          { status: 'angezeigt', datum: '2026-11-12', bemerkung: null },
          { status: 'beseitigt', datum: '2026-11-19', bemerkung: null },
          { status: 'offen', datum: '2026-11-23', bemerkung: 'Nachbesserung abgelehnt' },
        ],
      }),
    ).toBe('offen');
    expect(mangelstatus({ verlauf: [{ status: 'offen', datum: '2026-11-10', bemerkung: null }] })).toBe(
      'offen',
    );
  });
});
