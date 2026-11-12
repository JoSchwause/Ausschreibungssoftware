// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { tabZiel, zielZelle } from './navigation';

const r = { zeilen: 10, spalten: 4, seite: 3 };

describe('zielZelle', () => {
  it('Pfeile bewegen um eine Zelle und bleiben am Rand stehen (null = keine Bewegung)', () => {
    expect(zielZelle('ArrowDown', false, { zeile: 0, spalte: 1 }, r)).toEqual({ zeile: 1, spalte: 1 });
    expect(zielZelle('ArrowUp', false, { zeile: 0, spalte: 1 }, r)).toBeNull();
    expect(zielZelle('ArrowRight', false, { zeile: 2, spalte: 3 }, r)).toBeNull();
    expect(zielZelle('ArrowLeft', false, { zeile: 2, spalte: 3 }, r)).toEqual({ zeile: 2, spalte: 2 });
  });

  it('Pos1 und Ende, mit Strg an Anfang und Ende des Rasters', () => {
    expect(zielZelle('Home', false, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 4, spalte: 0 });
    expect(zielZelle('End', false, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 4, spalte: 3 });
    expect(zielZelle('Home', true, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 0, spalte: 0 });
    expect(zielZelle('End', true, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 9, spalte: 3 });
  });

  it('Strg+Pfeil springt an den Rand des Rasters in dieser Richtung (wie Excel in einer vollen Tabelle)', () => {
    expect(zielZelle('ArrowDown', true, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 9, spalte: 2 });
    expect(zielZelle('ArrowUp', true, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 0, spalte: 2 });
    expect(zielZelle('ArrowRight', true, { zeile: 4, spalte: 1 }, r)).toEqual({ zeile: 4, spalte: 3 });
    expect(zielZelle('ArrowLeft', true, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 4, spalte: 0 });
    expect(zielZelle('ArrowDown', true, { zeile: 9, spalte: 2 }, r)).toBeNull();
  });

  it('Bild auf/ab springt eine Seite und klemmt an den Enden', () => {
    expect(zielZelle('PageDown', false, { zeile: 4, spalte: 2 }, r)).toEqual({ zeile: 7, spalte: 2 });
    expect(zielZelle('PageDown', false, { zeile: 8, spalte: 2 }, r)).toEqual({ zeile: 9, spalte: 2 });
    expect(zielZelle('PageUp', false, { zeile: 1, spalte: 2 }, r)).toEqual({ zeile: 0, spalte: 2 });
  });

  it('andere Tasten und leeres Raster liefern null', () => {
    expect(zielZelle('a', false, { zeile: 0, spalte: 0 }, r)).toBeNull();
    expect(
      zielZelle('ArrowDown', false, { zeile: 0, spalte: 0 }, { zeilen: 0, spalten: 4, seite: 3 }),
    ).toBeNull();
  });
});

describe('tabZiel', () => {
  it('läuft in Leserichtung, am Zeilenende in die nächste Zeile', () => {
    expect(tabZiel({ zeile: 0, spalte: 0 }, false, r)).toEqual({ zeile: 0, spalte: 1 });
    expect(tabZiel({ zeile: 0, spalte: 3 }, false, r)).toEqual({ zeile: 1, spalte: 0 });
    expect(tabZiel({ zeile: 1, spalte: 0 }, true, r)).toEqual({ zeile: 0, spalte: 3 });
  });

  it('am Anfang und Ende gibt es kein Ziel: der Fokus verlässt das Grid', () => {
    expect(tabZiel({ zeile: 9, spalte: 3 }, false, r)).toBeNull();
    expect(tabZiel({ zeile: 0, spalte: 0 }, true, r)).toBeNull();
  });
});
