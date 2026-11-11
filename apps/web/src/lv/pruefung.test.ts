// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Knoten, KnotenId, Pruefbefund } from '@tethys/vertrag';
import { describe, expect, it, vi } from 'vitest';
import { befundeJeKnoten, pruefgruppen, sprungZu, imLeerlauf } from './pruefung';

const LV = 'lv';
const k = (id: string, art: Knoten['art'], elternId: string, oz: string | null, kurztext = ''): Knoten =>
  ({ id, art, elternId, reihenfolge: 0, ordnungszahl: oz, kurztext }) as unknown as Knoten;
const KNOTEN: readonly Knoten[] = [
  k('t1', 'titel', LV, '01', 'Rohbau'),
  k('t2', 'titel', 't1', '01.01', 'Erdarbeiten'),
  k('p1', 'position', 't2', '01.01.0010', 'Aushub'),
];
const b = (code: string, schwere: Pruefbefund['schwere'], ort: Pruefbefund['ort']): Pruefbefund => ({
  schwere,
  quelle: 'lv-pruefung',
  code,
  meldung: code,
  ort,
});

describe('Prüf-Panel', () => {
  it('gruppiert nach Schwere (Fehler zuerst) mit OZ und Kurztext je Eintrag', () => {
    const g = pruefgruppen(
      [
        b('einheit-fehlt', 'warnung', { knotenId: 'p1' as KnotenId, feld: 'einheit' }),
        b('lv-name-leer', 'warnung', { feld: 'name' }),
        b('oz-doppelt', 'fehler', { knotenId: 'p1' as KnotenId, feld: 'ordnungszahl' }),
      ],
      KNOTEN,
    );
    expect(g.map((x) => [x.schwere, x.eintraege.map((e) => [e.befund.code, e.oz, e.kurztext])])).toEqual([
      ['fehler', [['oz-doppelt', '01.01.0010', 'Aushub']]],
      [
        'warnung',
        [
          ['einheit-fehlt', '01.01.0010', 'Aushub'],
          ['lv-name-leer', null, null],
        ],
      ],
    ]);
  });

  it('leere Gruppen fallen weg', () => {
    expect(pruefgruppen([], KNOTEN)).toEqual([]);
  });

  it('verteilt die Befunde auf die Knoten (für die Zellen des Grids)', () => {
    const x = b('einheit-fehlt', 'warnung', { knotenId: 'p1' as KnotenId, feld: 'einheit' });
    const m = befundeJeKnoten([x, b('lv-name-leer', 'warnung', { feld: 'name' })]);
    expect([...m.entries()]).toEqual([['p1', [x]]]);
  });
});

describe('Sprunglink', () => {
  it('Zelle im Grid: klappt alle Vorfahren auf und nennt die Spalte', () => {
    expect(
      sprungZu(b('einheit-fehlt', 'warnung', { knotenId: 'p1' as KnotenId, feld: 'einheit' }), KNOTEN),
    ).toEqual({
      aufklappen: ['t2', 't1'],
      ziel: { art: 'zelle', knotenId: 'p1', spalte: 'einheit' },
    });
    expect(sprungZu(b('gliederung-leer', 'warnung', { knotenId: 't2' as KnotenId }), KNOTEN)).toEqual({
      aufklappen: ['t1'],
      ziel: { art: 'zelle', knotenId: 't2' },
    });
  });

  it('Feld ohne Spalte im Grid (oder ohne Feld) an einer Position: öffnet den Positionsdialog', () => {
    expect(
      sprungZu(b('langtext-leer', 'warnung', { knotenId: 'p1' as KnotenId, feld: 'langtext' }), KNOTEN),
    ).toEqual({
      aufklappen: ['t2', 't1'],
      ziel: { art: 'dialog', positionId: 'p1' },
    });
    expect(
      sprungZu(b('zuschlag-ohne-bezug', 'warnung', { knotenId: 'p1' as KnotenId }), KNOTEN).ziel,
    ).toEqual({
      art: 'dialog',
      positionId: 'p1',
    });
  });

  it('LV-weite Befunde nennen ihr Feld', () => {
    expect(sprungZu(b('netto-nach-nachlass-negativ', 'fehler', { feld: 'nachlass' }), KNOTEN)).toEqual({
      aufklappen: [],
      ziel: { art: 'lv', feld: 'nachlass' },
    });
  });
});

describe('Prüfung im Leerlauf', () => {
  it('läuft nicht sofort, sondern im nächsten Leerlauf; ein neuer Auftrag ersetzt den alten', () => {
    vi.useFakeTimers();
    const lauf = vi.fn<(wer: string) => void>();
    const abbrechen1 = imLeerlauf(() => {
      lauf('alt');
    });
    abbrechen1();
    imLeerlauf(() => {
      lauf('neu');
    });
    expect(lauf).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(lauf.mock.calls).toEqual([['neu']]);
    vi.useRealTimers();
  });
});
