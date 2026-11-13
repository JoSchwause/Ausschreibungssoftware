// SPDX-License-Identifier: AGPL-3.0-or-later
// Kosten aus dem Modell (Ticket 108 Punkt 5, X1e, D-52): Kostenschätzung über Kennwerte (Betrag = round(Größe × Kennwert, 2),
// N2) als `KostenermittlungAnlegen`, und Kostenkennwerte einer bestehenden Kostenermittlung. Werte von Hand.

import { describe, expect, it } from 'vitest';
import type { Betrag, KostenermittlungId, Kostengruppennummer, ProjektId } from '@tethys/vertrag';
import type { Bezugsgroesse, Din277Groessen } from './index';
import { kostenkennwerteBerechnen, kostenschaetzungBerechnen } from './index';
import { m } from './testhilfe/bauen';

const b = (w: string): Betrag => w as Betrag;
const kg = (w: string): Kostengruppennummer => w as Kostengruppennummer;
const groessen = (
  bgf: string | null,
  bri: string | null,
  nrf: string | null = null,
  quelle: Bezugsgroesse['quelle'] = 'modell',
): Din277Groessen => ({
  bgf: { art: 'BGF', wert: bgf === null ? null : m(bgf), quelle },
  bri: { art: 'BRI', wert: bri === null ? null : m(bri), quelle },
  nrf: { art: 'NRF', wert: nrf === null ? null : m(nrf), quelle },
  befunde: [],
});
/**
 * Die Herleitung setzt der Aufrufer (der Rand formatiert, N4, Ticket 122): Hier steht sie in kanonischer Form, damit der Test
 * sieht, dass `bim` nichts formatiert und genau diesen Text in die Bemerkung schreibt.
 */
const herleitung = (g: Bezugsgroesse, kennwert: Betrag): string =>
  `${g.art}=${g.wert ?? '-'}(${g.quelle})*${kennwert}`;
const angaben = {
  id: 'ke-1' as KostenermittlungId,
  projektId: 'projekt-1' as ProjektId,
  name: 'Kostenschätzung aus dem Modell',
  herleitung,
};

describe('kostenschaetzungBerechnen', () => {
  it('baut KostenermittlungAnlegen (Stufe Kostenschätzung) mit Betrag = round(Größe × Kennwert, 2) und Herleitung', () => {
    const s = kostenschaetzungBerechnen({
      ...angaben,
      groessen: groessen('245.300', '780.125'),
      kennwerte: [
        { kostengruppe: kg('330'), bezug: 'BGF', kennwert: b('1250.00') },
        { kostengruppe: kg('310'), bezug: 'BRI', kennwert: b('12.35') },
      ],
    });
    expect(s.befehl).toEqual({
      art: 'KostenermittlungAnlegen',
      kostenermittlung: {
        id: 'ke-1',
        projektId: 'projekt-1',
        stufe: 'kostenschaetzung',
        name: 'Kostenschätzung aus dem Modell',
        eintraege: [
          // 780,125 × 12,35 = 9.634,54375 → 9.634,54
          { nummer: '310', betrag: '9634.54', bemerkung: 'BRI=780.125(modell)*12.35' },
          // 245,3 × 1.250 = 306.625,00
          { nummer: '330', betrag: '306625.00', bemerkung: 'BGF=245.300(modell)*1250.00' },
        ],
      },
    });
    expect(s.gesamt).toBe('316259.54');
    expect(s.befunde).toEqual([]);
  });

  it('gibt der Herleitung die Quelle der Größe mit (Eingabe des Nutzers) und rundet kaufmännisch', () => {
    const s = kostenschaetzungBerechnen({
      ...angaben,
      groessen: groessen(null, null, '100.005', 'eingabe'),
      kennwerte: [{ kostengruppe: kg('400'), bezug: 'NRF', kennwert: b('0.50') }],
    });
    // 100,005 × 0,5 = 50,0025 → 50,00
    expect(s.befehl.kostenermittlung.eintraege).toEqual([
      { nummer: '400', betrag: '50.00', bemerkung: 'NRF=100.005(eingabe)*0.50' },
    ]);
  });

  it('lässt eine Zeile ohne Bezugsgröße weg (Befund) und addiert doppelte Kostengruppen (Befund)', () => {
    const s = kostenschaetzungBerechnen({
      ...angaben,
      groessen: groessen('100.000', null),
      kennwerte: [
        { kostengruppe: kg('330'), bezug: 'BGF', kennwert: b('10.00') },
        { kostengruppe: kg('340'), bezug: 'BRI', kennwert: b('5.00') },
        { kostengruppe: kg('330'), bezug: 'BGF', kennwert: b('2.50') },
      ],
    });
    expect(s.befehl.kostenermittlung.eintraege).toEqual([
      {
        nummer: '330',
        betrag: '1250.00',
        bemerkung: 'BGF=100.000(modell)*10.00; BGF=100.000(modell)*2.50',
      },
    ]);
    expect(s.gesamt).toBe('1250.00');
    expect(s.befunde.map((x) => [x.code, x.schwere, x.ort.feld])).toEqual([
      ['bezugsgroesse-fehlt', 'fehler', 'BRI'],
      ['kostengruppe-doppelt', 'warnung', 'kostengruppe'],
    ]);
    expect(s.befunde.every((x) => x.quelle === 'modell-pruefung')).toBe(true);
  });
});

describe('kostenkennwerteBerechnen', () => {
  it('teilt je Kostengruppe die Summe durch BGF, BRI und NRF, kaufmännisch auf 2 Stellen; ohne Größe oder bei 0 null', () => {
    const k = kostenkennwerteBerechnen(
      [
        { nummer: kg('300'), summe: b('1000.00') },
        { nummer: kg('330'), summe: b('-0.01') },
      ],
      groessen('3.000', '0.000', null),
    );
    expect(k).toEqual([
      { nummer: '300', summe: '1000.00', jeBgf: '333.33', jeBri: null, jeNrf: null },
      { nummer: '330', summe: '-0.01', jeBgf: '0.00', jeBri: null, jeNrf: null },
    ]);
  });
});
