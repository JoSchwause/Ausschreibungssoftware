// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { GRID_KUERZEL, NAVIGATIONSTASTEN, kuerzelAktion, suchleistenAktion } from './kuerzel';
import type { Tastendruck } from './kuerzel';

const taste = (key: string, mit: Partial<Omit<Tastendruck, 'key'>> = {}): Tastendruck => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mit,
});

describe('kuerzelAktion im LV-Grid', () => {
  it('erkennt die Zeilenaktionen mit Strg, auch mit Umschalt (Plus auf US-Tastaturen)', () => {
    expect(kuerzelAktion(taste('c', { ctrlKey: true }), 'lv')).toBe('kopieren');
    expect(kuerzelAktion(taste('C', { metaKey: true }), 'lv')).toBe('kopieren');
    expect(kuerzelAktion(taste('x', { ctrlKey: true }), 'lv')).toBe('ausschneiden');
    expect(kuerzelAktion(taste('+', { ctrlKey: true, shiftKey: true }), 'lv')).toBe('position-anlegen');
    expect(kuerzelAktion(taste('Delete', { ctrlKey: true }), 'lv')).toBe('loeschen');
    expect(kuerzelAktion(taste('-', { ctrlKey: true }), 'lv')).toBe('loeschen');
    expect(kuerzelAktion(taste('Enter', { ctrlKey: true }), 'lv')).toBe('zeile-oeffnen');
    expect(kuerzelAktion(taste('a', { ctrlKey: true }), 'lv')).toBe('alles-auswaehlen');
  });

  it('Alt+Pfeil klappt und verschiebt, Alt+Umschalt+Pfeil ändert die Spaltenbreite', () => {
    expect(kuerzelAktion(taste('ArrowRight', { altKey: true }), 'lv')).toBe('aufklappen');
    expect(kuerzelAktion(taste('ArrowLeft', { altKey: true }), 'lv')).toBe('zuklappen');
    expect(kuerzelAktion(taste('ArrowUp', { altKey: true }), 'lv')).toBe('nach-oben-verschieben');
    expect(kuerzelAktion(taste('ArrowDown', { altKey: true }), 'lv')).toBe('nach-unten-verschieben');
    expect(kuerzelAktion(taste('ArrowRight', { altKey: true, shiftKey: true }), 'lv')).toBe('spalte-breiter');
    expect(kuerzelAktion(taste('ArrowLeft', { altKey: true, shiftKey: true }), 'lv')).toBe('spalte-schmaler');
    expect(kuerzelAktion(taste('Home', { altKey: true, shiftKey: true }), 'lv')).toBe(
      'spalte-standardbreite',
    );
  });

  it('Navigation, Auswahl und Bearbeiten', () => {
    expect(kuerzelAktion(taste('ArrowDown'), 'lv')).toBe('zelle-wechseln');
    expect(kuerzelAktion(taste('ArrowDown', { shiftKey: true }), 'lv')).toBe('auswahl-erweitern');
    expect(kuerzelAktion(taste('End', { ctrlKey: true }), 'lv')).toBe('tabellenrand');
    expect(kuerzelAktion(taste('Tab', { shiftKey: true }), 'lv')).toBe('tab');
    expect(kuerzelAktion(taste('F2'), 'lv')).toBe('bearbeiten');
    expect(kuerzelAktion(taste(' '), 'lv')).toBe('zeile-auswaehlen');
    expect(kuerzelAktion(taste('Delete'), 'lv')).toBe('zelle-leeren');
    expect(kuerzelAktion(taste('7'), 'lv')).toBe('tippen');
    expect(kuerzelAktion(taste('ä', { shiftKey: true }), 'lv')).toBe('tippen');
    expect(kuerzelAktion(taste('7', { altKey: true }), 'lv')).toBeNull();
    expect(kuerzelAktion(taste('Shift', { shiftKey: true }), 'lv')).toBeNull();
  });
});

describe('Suchen und Kontextmenü (Ticket 156)', () => {
  it('Strg+F sucht, F3 und Umschalt+F3 springen zwischen den Treffern', () => {
    expect(kuerzelAktion(taste('f', { ctrlKey: true }), 'lv')).toBe('suchen');
    expect(kuerzelAktion(taste('F', { metaKey: true, shiftKey: true }), 'lv')).toBe('suchen');
    expect(kuerzelAktion(taste('F3'), 'lv')).toBe('treffer-weiter');
    expect(kuerzelAktion(taste('F3', { shiftKey: true }), 'lv')).toBe('treffer-zurueck');
    expect(kuerzelAktion(taste('f', { ctrlKey: true }), 'vergleich')).toBeNull();
  });

  it('Umschalt+F10 und die Menütaste öffnen das Kontextmenü', () => {
    expect(kuerzelAktion(taste('F10', { shiftKey: true }), 'lv')).toBe('kontextmenue');
    expect(kuerzelAktion(taste('ContextMenu'), 'lv')).toBe('kontextmenue');
    expect(kuerzelAktion(taste('F10'), 'lv')).toBeNull();
  });
});

describe('kuerzelAktion im Vergleichsgrid', () => {
  it('kennt nur die Kürzel, die dort gelten', () => {
    expect(kuerzelAktion(taste('c', { ctrlKey: true }), 'vergleich')).toBe('kopieren');
    expect(kuerzelAktion(taste('+', { ctrlKey: true }), 'vergleich')).toBeNull();
    // Ohne Spaltenbreite per Tastatur bleibt Alt+Umschalt+Pfeil ein Klappen.
    expect(kuerzelAktion(taste('ArrowRight', { altKey: true, shiftKey: true }), 'vergleich')).toBe(
      'aufklappen',
    );
  });
});

describe('GRID_KUERZEL', () => {
  it('jeder Eintrag hat Taste, Beschreibung und Bereich in Worten für die Hilfeseite', () => {
    for (const k of GRID_KUERZEL) {
      expect(k.taste.length).toBeGreaterThan(0);
      expect(k.beschreibung.length).toBeGreaterThan(0);
      expect(k.bereich.length).toBeGreaterThan(0);
      // Texte für Nutzer: keine Ticketnummern, keine Kennungen aus dem Code (L5).
      expect(`${k.taste} ${k.beschreibung}`).not.toMatch(/Ticket|`|\b[a-z]+-[a-z]+\b|Arrow|ctrl/);
    }
  });

  it('kein Eintrag verdeckt einen späteren mit denselben Tasten', () => {
    const gesehen = new Set<string>();
    for (const k of GRID_KUERZEL) {
      for (const m of k.muster) {
        for (const g of k.gilt === 'alle' ? ['lv', 'vergleich'] : [k.gilt]) {
          const s = JSON.stringify([g, m]);
          expect(gesehen.has(s), s).toBe(false);
          gesehen.add(s);
        }
      }
    }
  });

  it('die Navigationstasten kommen aus der Tabelle', () => {
    expect([...NAVIGATIONSTASTEN].sort()).toEqual(
      ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp'].sort(),
    );
  });
});

describe('suchleistenAktion: die Suchleiste bindet ihre Tasten aus GRID_KUERZEL', () => {
  it('Strg+F, F3, Umschalt+F3 und Esc wie in der Tabelle', () => {
    expect(suchleistenAktion(taste('f', { ctrlKey: true }), false)).toBe('suchen');
    expect(suchleistenAktion(taste('F', { metaKey: true }), true)).toBe('suchen');
    expect(suchleistenAktion(taste('F3'), false)).toBe('treffer-weiter');
    expect(suchleistenAktion(taste('F3', { shiftKey: true }), true)).toBe('treffer-zurueck');
    expect(suchleistenAktion(taste('Escape'), false)).toBe('abbrechen');
    expect(suchleistenAktion(taste('F3', { ctrlKey: true }), true)).toBeNull();
  });

  it('Enter und Umschalt+Enter nur im Suchfeld', () => {
    expect(suchleistenAktion(taste('Enter'), true)).toBe('treffer-weiter');
    expect(suchleistenAktion(taste('Enter', { shiftKey: true }), true)).toBe('treffer-zurueck');
    expect(suchleistenAktion(taste('Enter'), false)).toBeNull();
    expect(suchleistenAktion(taste('Enter', { ctrlKey: true }), true)).toBeNull();
  });

  it('jede Aktion der Leiste steht in der Tabelle', () => {
    const aktionen = new Set(GRID_KUERZEL.map((k) => k.aktion));
    for (const a of ['suchen', 'treffer-weiter', 'treffer-zurueck', 'abbrechen'] as const) {
      expect(aktionen.has(a)).toBe(true);
    }
  });
});
