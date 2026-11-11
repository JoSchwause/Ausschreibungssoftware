// SPDX-License-Identifier: AGPL-3.0-or-later
import type {
  Betrag,
  Einheitspreis,
  LvZustand,
  Menge,
  Position,
  Positionsdaten,
  Projekt,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { lvAnlegenBefehl, projektAnlegenBefehl } from '../projekt/befehle';
import { speicherImSpeicher, testUmgebung } from '../testhilfen';
import { lvSitzung, projektSitzung, type LvSitzung } from './befehlsweg';
import { merkmaleBefehl, merkmalwahlVon } from './merkmale';
import { ozMaskeLesen } from './ozmaske';
import { nachlassBefehl } from './summeneingabe';

const daten = (menge: string, ep: string): Positionsdaten => ({
  ordnungszahl: null,
  ozIndex: null,
  merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
  zuschlag: null,
  kurztext: 'P',
  langtext: [],
  menge: menge as Menge,
  einheit: 'St',
  einheitspreis: ep as Einheitspreis,
  epa: null,
});

const zustand = (s: LvSitzung): LvZustand => {
  if (s.zustand === null) throw new Error('kein LV');
  return s.zustand;
};
const position = (s: LvSitzung, i: number): Position => {
  const p = zustand(s).leistungsverzeichnis.knoten.filter((k) => k.art === 'position')[i];
  if (p?.art !== 'position') throw new Error('keine Position');
  return p;
};

async function lvMitPositionen(): Promise<LvSitzung> {
  const u = testUmgebung(await speicherImSpeicher());
  const p = await projektSitzung(u, null).befehl(projektAnlegenBefehl(u.ids, 'P', 'B'));
  const projekt = (p.ok ? p.zustand : null) as Projekt;
  const s = lvSitzung(u, projekt.id, null);
  const maske = ozMaskeLesen('NN.NNNN');
  if (!maske.ok) throw new Error(maske.fehler);
  await s.befehl(lvAnlegenBefehl(u.ids, projekt.id, 'LV', maske.wert));
  const wurzel = zustand(s).leistungsverzeichnis.id;
  // Ticket 39: 12,000 h × 48,900 = 586,80 und 96,000 m² × 61,250 = 5.880,00; dazu eine normale Position.
  for (const [m, ep] of [
    ['1.000', '1850.000'],
    ['12.000', '48.900'],
    ['96.000', '61.250'],
  ] as const) {
    await s.befehl({
      art: 'PositionAnlegen',
      id: u.ids.position(),
      ort: { art: 'ende', elternId: wurzel },
      daten: daten(m, ep),
    });
  }
  return s;
}

describe('Merkmale an der Position (F4, F5)', () => {
  it('Bedarf ohne Gesamtbetrag mit Stundenlohn und Wahl: nicht im Netto, getrennt ausgewiesen', async () => {
    const s = await lvMitPositionen();
    const b1 = merkmaleBefehl(position(s, 1), {
      bedarf: 'ohne-gesamtbetrag',
      wahl: false,
      stundenlohn: true,
      pauschal: false,
    });
    const b2 = merkmaleBefehl(position(s, 2), {
      bedarf: null,
      wahl: true,
      stundenlohn: false,
      pauschal: false,
    });
    const b0 = merkmaleBefehl(position(s, 0), {
      bedarf: null,
      wahl: false,
      stundenlohn: false,
      pauschal: true,
    });
    for (const b of [b0, b1, b2]) {
      if (b === null) throw new Error('kein Befehl');
      expect((await s.befehl(b)).ok).toBe(true);
    }
    const g = zustand(s).summen.gesamt;
    expect(g.netto).toBe('1850.00');
    expect(g.summeBedarfOhneGesamtbetrag).toBe('586.80');
    expect(g.summeWahl).toBe('5880.00');
    expect(merkmalwahlVon(position(s, 1))).toEqual({
      bedarf: 'ohne-gesamtbetrag',
      wahl: false,
      stundenlohn: true,
      pauschal: false,
    });
    expect(position(s, 2).merkmale.wahl).toEqual({ gruppe: null, variante: null, grundpositionId: null });
  });

  it('keine Änderung: kein Befehl; eine bestehende Wahlzuordnung bleibt erhalten', async () => {
    const s = await lvMitPositionen();
    const p = position(s, 0);
    expect(merkmaleBefehl(p, merkmalwahlVon(p))).toBe(null);
    const mitWahl: Position = {
      ...p,
      merkmale: { ...p.merkmale, wahl: { gruppe: 1, variante: 2, grundpositionId: null } },
    };
    const b = merkmaleBefehl(mitWahl, {
      bedarf: 'mit-gesamtbetrag',
      wahl: true,
      stundenlohn: false,
      pauschal: false,
    });
    expect(b?.merkmale.wahl).toEqual({ gruppe: 1, variante: 2, grundpositionId: null });
  });
});

describe('Nachlass an der Summenzeile', () => {
  it('Prozent oder Betrag, leeren entfernt, gleicher Wert ändert nichts, Fehler als Meldung', () => {
    const zwei = { art: 'prozent', wert: '2.00' as Prozent } as const;
    expect(nachlassBefehl(null, 'prozent', '2')).toEqual({ art: 'NachlassSetzen', nachlass: zwei });
    expect(nachlassBefehl(null, 'betrag', '1.250,5')).toEqual({
      art: 'NachlassSetzen',
      nachlass: { art: 'betrag', wert: '1250.50' as Betrag },
    });
    expect(nachlassBefehl(zwei, 'prozent', '2,00')).toBe(null);
    expect(nachlassBefehl(zwei, 'betrag', '2,00')).toEqual({
      art: 'NachlassSetzen',
      nachlass: { art: 'betrag', wert: '2.00' },
    });
    expect(nachlassBefehl(zwei, 'prozent', '  ')).toEqual({ art: 'NachlassEntfernen' });
    expect(nachlassBefehl(null, 'prozent', '')).toBe(null);
    expect(nachlassBefehl(null, 'prozent', '2,555')).toBe(
      'Ein Prozentsatz hat höchstens 2 Nachkommastellen.',
    );
  });
});
