// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ui-grid: das eine gemeinsame Grid (U2). Das Styling steht in `grid.css`; die App
// bindet es zusammen mit den Tokens aus @tethys/ui-basis ein.

export { LvGrid } from './LvGrid';
export { STANDARDSPALTEN } from './tabelle';
export type {
  KostengruppeLesen,
  LvGridBearbeitbar,
  LvGridProps,
  LvGridSchreibgeschuetzt,
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
