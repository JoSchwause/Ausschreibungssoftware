// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ui-grid: das eine gemeinsame Grid (U2). Das Styling steht in `grid.css`; die App
// bindet es zusammen mit den Tokens aus @tethys/ui-basis ein.

export { LvGrid } from './LvGrid';
export { STANDARDSPALTEN } from './tabelle';
// Die Tastenkürzel der Grids (Ticket 130): Die Grids binden sie aus dieser Tabelle, die App erzeugt daraus die Hilfeseite.
export { GRID_KUERZEL } from './kuerzel';
export type { Gridart, Kuerzel, KuerzelAktion, Kuerzelbereich } from './kuerzel';
// Spaltenbreiten (Ticket 130): je Grid unter dem Schlüssel des Aufrufers gemerkt, Standard `localStorage`.
export { lokalerSpaltenbreitenSpeicher } from './useSpaltenbreiten';
export type { Spaltenbreiten, SpaltenbreitenSpeicher } from './useSpaltenbreiten';
export type {
  KostengruppeLesen,
  LvGridBearbeitbar,
  LvGridProps,
  LvGridSchreibgeschuetzt,
  LvGridSteuerung,
  Sprungziel,
} from './typen';

// Das schreibgeschützte Vergleichsgrid (Ticket 60), z. B. für den Preisspiegel; derselbe Kern wie `LvGrid`. Mit einer
// Balkenspalte (Ticket 96) zeigt es auch den Bauzeitenplan: `VergleichsSpalte.zeitleiste`, `VergleichsZelle.balken`.
export { VergleichsGrid } from './VergleichsGrid';
export type {
  Balken,
  Balkenart,
  Kennzeichen,
  KennzeichenText,
  VergleichsGridProps,
  VergleichsSpalte,
  VergleichsSpaltengruppe,
  VergleichsSprungziel,
  VergleichsSummenzeile,
  VergleichsZelle,
  VergleichsZellort,
  VergleichsZeile,
  Zeitabschnitt,
  Zeitleiste,
  Zeitmarkierung,
} from './vergleichTypen';
