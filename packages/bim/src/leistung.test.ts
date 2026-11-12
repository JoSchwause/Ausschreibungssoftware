// SPDX-License-Identifier: AGPL-3.0-or-later
// Leistungsbudget als Test (Q4, D-54): Vergleich zweier Modelle mit je 10.000 Bauteilen höchstens 500 ms (Median, warm).
// Die Modelle entstehen hier deterministisch in der Form des Erzeugers aus Ticket 99 (D-99.3: 10 Geschosse, Bauteile mit
// 5 bis 7 Mengen); `bim` darf die IFC-Datei nicht lesen (A3, kein `ifc`), darum ohne den Umweg über den Text (D-108.1).
// Der zweite Stand ändert etwa 5 % der Bauteile und ist aus eigenen Objekten gebaut (wie zwei Lesevorgänge). Budgets werden
// nicht aufgeweicht.

import { describe, expect, it } from 'vitest';
import type { Bauteil, Bauteilmenge, Bauwerksmodell, Strukturknoten } from '@tethys/vertrag';
import { modellVergleichen } from './index';
import { gid, m, modell } from './testhilfe/bauen';

const BUDGET_MS = 500;
const ANZAHL = 10_000;
const GESCHOSSE = 10;
const LAEUFE = 5;

const mitte = (w: readonly number[]): number => [...w].sort((a, b) => a - b)[Math.floor(w.length / 2)] ?? 0;

/** Tausendstel als Menge mit 3 Stellen. */
const tausendstel = (t: number): Bauteilmenge['wert'] => {
  const s = String(t).padStart(4, '0');
  return m(`${s.slice(0, -3)}.${s.slice(-3)}`);
};

function mengen(i: number, aendern: boolean): Bauteilmenge[] {
  const zahl = 5 + (i % 3);
  const namen = ['Length', 'Width', 'Height', 'GrossSideArea', 'NetSideArea', 'GrossVolume', 'NetVolume'];
  return namen.slice(0, zahl).map((name, k) => ({
    satz: 'Qto_WallBaseQuantities',
    name,
    art: k < 3 ? 'laenge' : k < 5 ? 'flaeche' : 'volumen',
    wert: tausendstel(((i * 7919 + k * 104_729) % 900_000) + 100 + (aendern && k === 4 ? 125 : 0)),
  }));
}

/** Stand 1 oder 2 eines Modells mit 10.000 Bauteilen auf 10 Geschossen. */
function grossesModell(stand: 1 | 2): Bauwerksmodell {
  const struktur: Strukturknoten[] = [
    { globalId: gid('Projekt'), art: 'projekt', name: 'Projekt', elternGlobalId: null, mengen: [] },
    {
      globalId: gid('Gebaeude'),
      art: 'gebaeude',
      name: 'Gebäude',
      elternGlobalId: gid('Projekt'),
      mengen: [],
    },
    ...Array.from({ length: GESCHOSSE }, (_, g): Strukturknoten => ({
      globalId: gid(`Geschoss${String(g)}`),
      art: 'geschoss',
      name: `Geschoss ${String(g)}`,
      elternGlobalId: gid('Gebaeude'),
      mengen: [],
    })),
  ];
  const bauteile: Bauteil[] = [];
  for (let i = 0; i < ANZAHL; i++) {
    const entfernt = stand === 2 && i % 100 === 3;
    if (entfernt) continue;
    const geschoss = Math.floor((i * GESCHOSSE) / ANZAHL);
    const verschoben = stand === 2 && i % 100 === 7;
    bauteile.push({
      globalId: gid(`B${String(i)}`),
      ifcKlasse: i % 4 === 0 ? 'IfcWindow' : 'IfcWall',
      name: stand === 2 && i % 100 === 11 ? `Bauteil ${String(i)} neu` : `Bauteil ${String(i)}`,
      typ: null,
      strukturGlobalId: gid(`Geschoss${String(verschoben ? (geschoss + 1) % GESCHOSSE : geschoss)}`),
      mengen: mengen(i, stand === 2 && i % 50 === 5),
    });
  }
  if (stand === 2)
    for (let j = 0; j < ANZAHL / 100; j++)
      bauteile.push({
        globalId: gid(`N${String(j)}`),
        ifcKlasse: 'IfcWall',
        name: `Neu ${String(j)}`,
        typ: null,
        strukturGlobalId: gid('Geschoss0'),
        mengen: mengen(j, false),
      });
  return modell({ struktur, bauteile });
}

describe('Leistungsbudget (Q4, D-54)', () => {
  it(`Vergleich zweier Modelle mit je 10.000 Bauteilen: Median unter ${String(BUDGET_MS)} ms`, () => {
    const alt = grossesModell(1);
    const neu = grossesModell(2);
    expect(alt.bauteile).toHaveLength(ANZAHL);
    expect(neu.bauteile).toHaveLength(ANZAHL);
    const v = modellVergleichen(alt, neu); // Warmlauf und Prüfung des Ergebnisses
    expect(v.entfernt).toHaveLength(100);
    expect(v.hinzugefuegt).toHaveLength(100);
    // je 100 verschoben und umbenannt, 200 mit geänderter Menge (i % 50 === 5; davon keines entfernt)
    expect(v.geaendert).toHaveLength(400);
    const werte: number[] = [];
    for (let i = 0; i < LAEUFE; i++) {
      const t0 = performance.now();
      modellVergleichen(alt, neu);
      werte.push(performance.now() - t0);
    }
    console.info(`modellVergleichen (2 × 10.000 Bauteile): Median ${mitte(werte).toFixed(1)} ms`);
    expect(mitte(werte)).toBeLessThan(BUDGET_MS);
  });
});
