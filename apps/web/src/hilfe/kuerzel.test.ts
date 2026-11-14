// SPDX-License-Identifier: AGPL-3.0-or-later
import { GRID_KUERZEL } from '@tethys/ui-grid';
import { describe, expect, it } from 'vitest';
import { kuerzelGruppen } from './kuerzel';

describe('Tastenkürzel der Hilfeseite', () => {
  const gruppen = kuerzelGruppen();

  it('zeigt jedes Kürzel der Tabelle, die die Grids binden, genau einmal', () => {
    const gezeigt = gruppen.flatMap((g) => g.kuerzel.map((k) => k.aktion));
    expect([...gezeigt].sort()).toEqual(GRID_KUERZEL.map((k) => k.aktion).sort());
  });

  it('ordnet nach Bereichen, Navigation zuerst, ohne leere Gruppen', () => {
    expect(gruppen.map((g) => g.bereich)).toEqual([
      'Navigation',
      'Auswahl',
      'Bearbeiten',
      'Zeilen',
      'Zwischenablage',
      'Gliederung',
      'Spalten',
    ]);
    expect(gruppen.every((g) => g.kuerzel.length > 0)).toBe(true);
  });

  it('nennt die Kürzel, die bisher nirgends standen (Löschen, Position anlegen, Verschieben)', () => {
    const zeilen = gruppen.find((g) => g.bereich === 'Zeilen')?.kuerzel.map((k) => k.taste) ?? [];
    expect(zeilen).toEqual(
      expect.arrayContaining([
        'Strg+Entf oder Strg+Minus',
        'Strg+Plus',
        'Alt+Pfeil hoch',
        'Alt+Pfeil runter',
      ]),
    );
  });

  it('übernimmt neue Einträge der Tabelle ohne Änderung an der Hilfeseite', () => {
    const [erstes] = GRID_KUERZEL;
    if (erstes === undefined) throw new Error('Kürzeltabelle leer');
    const neu = { ...erstes, aktion: 'zelle-leeren' as const, bereich: 'Bearbeiten' as const };
    const g = kuerzelGruppen([neu]);
    expect(g).toEqual([{ bereich: 'Bearbeiten', kuerzel: [neu] }]);
  });
});
