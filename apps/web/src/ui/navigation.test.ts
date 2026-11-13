// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LeistungsverzeichnisId, ProjektId } from '@tethys/vertrag';
import { describe, expect, it } from 'vitest';
import {
  KEINE_NAMEN,
  bereichsPfad,
  festerOrt,
  gegenstandSchluessel,
  navigationsstand,
  projektlistenRoute,
  type Ort,
} from './navigation';

const p = 'p1' as ProjektId;
const lv = 'lv1' as LeistungsverzeichnisId;
const namen = { projekt: { id: p, name: 'Turnhalle' }, gegenstaende: new Map([['lv:lv1', 'Rohbau']]) };

describe('Navigation', () => {
  it('Preisspiegel: Projekte › Projekt › Vergabe › LV › Preisspiegel; Titel mit einem Trennzeichen', () => {
    const ort: Ort = {
      bereich: 'vergabe',
      projekt: { art: 'lv', lvId: lv },
      krumen: [
        { teil: { art: 'lv', id: lv }, pfad: '/lv/lv1' },
        { teil: { art: 'text', text: 'Preisspiegel' }, pfad: '/lv/lv1/preisspiegel' },
      ],
    };
    const s = navigationsstand(ort, namen);
    expect(s.krumen).toEqual([
      { text: 'Projekte', pfad: '/' },
      { text: 'Turnhalle', pfad: '/projekt/p1' },
      { text: 'Vergabe', pfad: '/projekt/p1/vergabe' },
      { text: 'Rohbau', pfad: '/lv/lv1' },
      { text: 'Preisspiegel', pfad: null },
    ]);
    expect(s.titel).toBe('Preisspiegel – Turnhalle – Tethys AVA');
    expect(s.bereich).toBe('vergabe');
    expect(s.projekt).toEqual({ id: p, name: 'Turnhalle' });
  });

  it('Übersicht: das Projekt ist die letzte Krume, der Titel nennt „Übersicht“', () => {
    const s = navigationsstand(
      { bereich: 'uebersicht', projekt: { art: 'id', id: p }, krumen: [], seite: 'Übersicht' },
      namen,
    );
    expect(s.krumen.map((k) => k.text)).toEqual(['Projekte', 'Turnhalle']);
    expect(s.krumen.at(-1)?.pfad).toBeNull();
    expect(s.titel).toBe('Übersicht – Turnhalle – Tethys AVA');
  });

  it('ohne Projekt und ohne Namen: feste Seite, Ersatzname für Gegenstände', () => {
    expect(navigationsstand(festerOrt('projekte', 'Projekte', '/'), KEINE_NAMEN)).toEqual({
      bereich: 'projekte',
      projekt: null,
      krumen: [{ text: 'Projekte', pfad: null }],
      titel: 'Projekte – Tethys AVA',
    });
    const s = navigationsstand(
      {
        bereich: 'leistungsverzeichnisse',
        projekt: { art: 'lv', lvId: lv },
        krumen: [{ teil: { art: 'lv', id: lv }, pfad: '/lv/lv1' }],
      },
      KEINE_NAMEN,
    );
    expect(s.krumen).toEqual([{ text: 'Leistungsverzeichnis', pfad: null }]);
  });

  it('ein Nachtrags-LV gehört zu „Nachträge“', () => {
    const s = navigationsstand(
      {
        bereich: 'leistungsverzeichnisse',
        projekt: { art: 'lv', lvId: lv },
        krumen: [{ teil: { art: 'lv', id: lv }, pfad: '/lv/lv1' }],
      },
      { ...namen, bereich: 'nachtraege' },
    );
    expect(s.bereich).toBe('nachtraege');
    expect(s.krumen[2]).toEqual({ text: 'Nachträge', pfad: '/projekt/p1/nachtraege' });
  });

  it('Listen je Projekt: Adresse und Erkennung passen zueinander, andere Pfade nicht', () => {
    for (const art of [
      'leistungsverzeichnisse',
      'vergabe',
      'auftraege',
      'nachtraege',
      'aufmass',
      'rechnungen',
    ] as const) {
      expect(projektlistenRoute(bereichsPfad(art, p))).toEqual({ art, projektId: p });
    }
    expect(projektlistenRoute('/projekt/p1/kosten')).toBeNull();
    expect(projektlistenRoute('/projekt/p1/auftrag/a1')).toBeNull();
    expect(bereichsPfad('kosten', p)).toBe('/projekt/p1/kosten');
    expect(bereichsPfad('uebersicht', p)).toBe('/projekt/p1');
    expect(gegenstandSchluessel({ art: 'lv', id: lv })).toBe('lv:lv1');
  });
});
