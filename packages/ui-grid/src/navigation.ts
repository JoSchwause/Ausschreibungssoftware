// SPDX-License-Identifier: AGPL-3.0-or-later
// Zellnavigation wie in einer Tabellenkalkulation: reine Funktionen auf Indizes. Kein DOM.

export interface Zelle {
  readonly zeile: number;
  readonly spalte: number;
}

export interface Raster {
  readonly zeilen: number;
  readonly spalten: number;
  /** Zeilen je Seite für Bild auf/ab (mindestens 1). */
  readonly seite: number;
}

const grenze = (wert: number, max: number): number => Math.max(0, Math.min(wert, max));

/**
 * Ziel einer Navigationstaste oder `null`, wenn die Taste keine Navigation ist oder sich nichts bewegt.
 * Pfeile bewegen um eine Zelle und bleiben am Rand stehen; mit Strg springen sie an den Rand des Rasters (wie Excel in
 * einer lückenlos gefüllten Tabelle). Pos1/Ende springen in die erste/letzte Spalte der Zeile,
 * mit Strg an den Anfang/das Ende des ganzen Rasters. Bild auf/ab bewegt um eine Seite in derselben Spalte.
 */
export function zielZelle(taste: string, mitStrg: boolean, von: Zelle, r: Raster): Zelle | null {
  if (r.zeilen === 0 || r.spalten === 0) return null;
  const letzteZeile = r.zeilen - 1;
  const letzteSpalte = r.spalten - 1;
  let z: Zelle;
  switch (taste) {
    case 'ArrowUp':
      z = { zeile: mitStrg ? 0 : von.zeile - 1, spalte: von.spalte };
      break;
    case 'ArrowDown':
      z = { zeile: mitStrg ? letzteZeile : von.zeile + 1, spalte: von.spalte };
      break;
    case 'ArrowLeft':
      z = { zeile: von.zeile, spalte: mitStrg ? 0 : von.spalte - 1 };
      break;
    case 'ArrowRight':
      z = { zeile: von.zeile, spalte: mitStrg ? letzteSpalte : von.spalte + 1 };
      break;
    case 'Home':
      z = mitStrg ? { zeile: 0, spalte: 0 } : { zeile: von.zeile, spalte: 0 };
      break;
    case 'End':
      z = mitStrg ? { zeile: letzteZeile, spalte: letzteSpalte } : { zeile: von.zeile, spalte: letzteSpalte };
      break;
    case 'PageUp':
      z = { zeile: von.zeile - Math.max(1, r.seite), spalte: von.spalte };
      break;
    case 'PageDown':
      z = { zeile: von.zeile + Math.max(1, r.seite), spalte: von.spalte };
      break;
    default:
      return null;
  }
  const ziel = { zeile: grenze(z.zeile, letzteZeile), spalte: grenze(z.spalte, letzteSpalte) };
  return ziel.zeile === von.zeile && ziel.spalte === von.spalte ? null : ziel;
}

/**
 * Tab / Umschalt+Tab: nächste bzw. vorherige Zelle in Leserichtung, am Zeilenende in die nächste Zeile.
 * `null` am Anfang und Ende des Grids: Dort verlässt der Fokus das Grid (kein Tastaturfang, WCAG 2.1.2).
 */
export function tabZiel(von: Zelle, rueckwaerts: boolean, r: Raster): Zelle | null {
  if (r.zeilen === 0 || r.spalten === 0) return null;
  if (!rueckwaerts) {
    if (von.spalte < r.spalten - 1) return { zeile: von.zeile, spalte: von.spalte + 1 };
    return von.zeile < r.zeilen - 1 ? { zeile: von.zeile + 1, spalte: 0 } : null;
  }
  if (von.spalte > 0) return { zeile: von.zeile, spalte: von.spalte - 1 };
  return von.zeile > 0 ? { zeile: von.zeile - 1, spalte: r.spalten - 1 } : null;
}
