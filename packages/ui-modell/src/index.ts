// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/ui-modell: die 3D-Leinwand (Modellansicht) mit web-ifc und three.js (D-50). Das Styling
// steht in `modellansicht.css`; die App bindet es zusammen mit den Tokens aus @tethys/ui-basis ein.

export { Modellansicht } from './Modellansicht';
export type {
  Bildschirmpunkt,
  Darstellungsstand,
  Ladebericht,
  Modellfehler,
  Modellfehlercode,
  ModellansichtProps,
  ModellansichtRef,
} from './typen';
export type { Bauteilkennzeichen } from './darstellung';
export { BAUTEILKENNZEICHEN } from './darstellung';
export type { Kamerastand } from './kamera';
