// SPDX-License-Identifier: AGPL-3.0-or-later
// DIN 277 aus dem Modell (Ticket 108 Punkt 4, X1e; D-99.7): BGF = Σ GrossFloorArea und BRI = Σ GrossVolume der Geschosse,
// NRF = Σ NetFloorArea der Räume; fehlt eine Menge, kein Wert, sondern ein Befund (kein Ersatz). Werte von Hand.

import { describe, expect, it } from 'vitest';
import type { Pruefbefund } from '@tethys/vertrag';
import { din277Berechnen } from './index';
import { gid, knoten, m, menge, modell, struktur } from './testhilfe/bauen';

const ohne = (befunde: readonly Pruefbefund[]) =>
  befunde.map((b) => [b.code, b.ort.globalId ?? null, b.ort.feld]);

describe('din277Berechnen', () => {
  it('summiert die Mengen der Geschosse und Räume; Quelle Modell', () => {
    const d = din277Berechnen(modell());
    expect(d.bgf).toEqual({ art: 'BGF', wert: '190.500', quelle: 'modell' });
    expect(d.bri).toEqual({ art: 'BRI', wert: '550.250', quelle: 'modell' });
    expect(d.nrf).toEqual({ art: 'NRF', wert: '80.125', quelle: 'modell' });
    expect(d.befunde).toEqual([]);
  });

  it('gibt ohne die Menge eines Geschosses keinen Wert, sondern einen Befund am Geschoss (kein Ersatz aus Räumen)', () => {
    const s = struktur().map((k) =>
      k.globalId === gid('OG') ? { ...k, mengen: k.mengen.filter((q) => q.name !== 'GrossVolume') } : k,
    );
    const d = din277Berechnen(modell({ struktur: s }));
    expect(d.bgf.wert).toBe('190.500');
    expect(d.bri).toEqual({ art: 'BRI', wert: null, quelle: 'modell' });
    expect(ohne(d.befunde)).toEqual([['menge-fehlt', gid('OG'), 'GrossVolume']]);
    expect(d.befunde[0]?.schwere).toBe('fehler');
  });

  it('meldet fehlende Geschosse und Räume je Bezugsgröße', () => {
    const d = din277Berechnen(modell({ struktur: [knoten('P', 'projekt', null)] }));
    expect([d.bgf.wert, d.bri.wert, d.nrf.wert]).toEqual([null, null, null]);
    expect(ohne(d.befunde)).toEqual([
      ['geschosse-fehlen', null, 'BGF'],
      ['geschosse-fehlen', null, 'BRI'],
      ['raeume-fehlen', null, 'NRF'],
    ]);
  });

  it('meldet einen Namen in zwei Mengensätzen und eine Menge der falschen Art', () => {
    const s = struktur().map((k) =>
      k.globalId === gid('EG')
        ? { ...k, mengen: [...k.mengen, menge('GrossFloorArea', '1.000', 'flaeche', 'Eigen')] }
        : k.globalId === gid('R1')
          ? { ...k, mengen: [menge('NetFloorArea', '80.125', 'volumen')] }
          : k,
    );
    const d = din277Berechnen(modell({ struktur: s }));
    expect([d.bgf.wert, d.bri.wert, d.nrf.wert]).toEqual([null, '550.250', null]);
    expect(ohne(d.befunde)).toEqual([
      ['mengenart-mehrdeutig', gid('EG'), 'GrossFloorArea'],
      ['einheit-passt-nicht', gid('R1'), 'NetFloorArea'],
    ]);
  });

  it('zählt einen Strukturknoten mit doppelter GlobalId einmal (das erste Objekt, D-66)', () => {
    const [eg] = struktur().filter((k) => k.globalId === gid('EG'));
    if (eg === undefined) throw new Error('EG fehlt');
    const d = din277Berechnen(modell({ struktur: [...struktur(), { ...eg, mengen: [] }] }));
    expect(d.bgf.wert).toBe('190.500');
    expect(d.befunde).toEqual([]);
  });

  it('nimmt eine Eingabe des Nutzers vor dem Modell; Befunde nur zu Größen aus dem Modell', () => {
    const d = din277Berechnen(modell({ struktur: [knoten('P', 'projekt', null)] }), { BGF: m('245.300') });
    expect(d.bgf).toEqual({ art: 'BGF', wert: '245.300', quelle: 'eingabe' });
    expect(ohne(d.befunde)).toEqual([
      ['geschosse-fehlen', null, 'BRI'],
      ['raeume-fehlen', null, 'NRF'],
    ]);
  });
});
