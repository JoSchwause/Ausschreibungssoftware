// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 151 (B-17): Angaben des Positionsdialogs „nur lesen“ auf der Seite des Auftrags-LV. Erwartete Texte von Hand.

import type {
  AuftragsLvZustand,
  Betrag,
  Einheit,
  Einheitspreis,
  Knoten,
  Langtext,
  Menge,
  Ordnungszahl,
  Position,
  PositionId,
  Prozent,
} from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import { positionsangaben } from './position';

const LANGTEXT = [{ art: 'absatz', inhalt: [{ art: 'text', text: 'Beton C25/30 liefern.' }] }] as unknown as Langtext;

function position(id: string, p: Partial<Position>): Position {
  return {
    art: 'position',
    id: id as PositionId,
    elternId: 'lv' as Position['elternId'],
    reihenfolge: 0,
    ordnungszahl: null,
    ozIndex: null,
    merkmale: { bedarf: null, wahl: null, stundenlohn: false, pauschal: false, zuschlagskennzeichen: false },
    zuschlag: null,
    kurztext: '',
    langtext: [],
    menge: null,
    einheit: null,
    einheitspreis: null,
    epa: null,
    ...p,
  } as Position;
}

function auftrag(knoten: readonly Knoten[], gp: Record<string, string | null>): AuftragsLvZustand {
  return {
    auftragsLeistungsverzeichnis: { knoten },
    summen: {
      positionen: Object.entries(gp).map(([positionId, g]) => ({
        positionId: positionId as PositionId,
        gesamtpreis: g as Betrag | null,
        gehtInSummeEin: true,
      })),
    },
  } as unknown as AuftragsLvZustand;
}

describe('positionsangaben', () => {
  it('OZ, Kurztext, Menge, Einheit, EP und GP in de-DE, Merkmale in Worten, dazu der Langtext', () => {
    const p = position('p1', {
      ordnungszahl: '01.0010' as Ordnungszahl,
      kurztext: 'Fundamentbeton',
      langtext: LANGTEXT,
      menge: '12.500' as Menge,
      einheit: 'm3' as Einheit,
      einheitspreis: '1234.500' as Einheitspreis,
      merkmale: {
        bedarf: 'ohne-gesamtbetrag',
        wahl: null,
        stundenlohn: false,
        pauschal: true,
        zuschlagskennzeichen: false,
      } as Position['merkmale'],
    });
    const a = positionsangaben(auftrag([p], { p1: '15431.25' }), 'p1' as PositionId);
    expect(a?.titel).toBe('01.0010 Fundamentbeton');
    expect(a?.langtext).toBe(LANGTEXT);
    expect(a?.zeilen).toEqual([
      { label: 'OZ', wert: '01.0010' },
      { label: 'Kurztext', wert: 'Fundamentbeton' },
      { label: 'Menge', wert: '12,500' },
      { label: 'Einheit', wert: 'm3' },
      { label: 'Einheitspreis', wert: '1.234,500 €' },
      { label: 'Gesamtpreis', wert: '15.431,25 €' },
      { label: 'Merkmale', wert: 'Bedarf ohne Gesamtbetrag, Pauschal' },
    ]);
  });

  it('ohne Werte steht „–“; eine Zuschlagsposition nennt den Satz statt des EP', () => {
    const p = position('z', {
      kurztext: 'Zuschlag Baustelleneinrichtung',
      zuschlag: { prozentsatz: '5.00' as Prozent, bezug: { art: 'gliederung', gliederungIds: [] } },
    } as Partial<Position>);
    const a = positionsangaben(auftrag([p], { z: null }), 'z' as PositionId);
    expect(a?.titel).toBe('Zuschlag Baustelleneinrichtung');
    expect(a?.zeilen).toEqual([
      { label: 'OZ', wert: '–' },
      { label: 'Kurztext', wert: 'Zuschlag Baustelleneinrichtung' },
      { label: 'Menge', wert: '–' },
      { label: 'Einheit', wert: '–' },
      { label: 'Zuschlagssatz', wert: '5,00 %' },
      { label: 'Gesamtpreis', wert: '–' },
      { label: 'Merkmale', wert: 'Zuschlagsposition' },
    ]);
  });

  it('nennt die Kostengruppe, wenn die Position eine trägt; eine unbekannte Kennung ergibt null', () => {
    const p = position('k', { kurztext: 'Mauerwerk', kostengruppe: '331' as Position['kostengruppe'] });
    const a = positionsangaben(auftrag([p], {}), 'k' as PositionId);
    expect(a?.zeilen.at(-1)).toEqual({ label: 'Kostengruppe', wert: '331' });
    expect(positionsangaben(auftrag([p], {}), 'x' as PositionId)).toBeNull();
  });
});
