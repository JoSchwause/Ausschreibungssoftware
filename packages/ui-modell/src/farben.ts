// SPDX-License-Identifier: AGPL-3.0-or-later
// Farben der Leinwand aus den Design-Tokens (U4): `modellansicht.css` ordnet jeder Rolle ein Token von ui-basis zu; die
// Leinwand liest den berechneten Wert am eigenen Element, also im hellen oder dunklen Schema, das dort gilt.

import type { Bauteilkennzeichen } from './darstellung';

export type Farbrolle = 'hintergrund' | 'auswahl' | Bauteilkennzeichen;

export const FARBVARIABLEN: Readonly<Record<Farbrolle, string>> = {
  hintergrund: '--tx-modell-hintergrund',
  auswahl: '--tx-modell-auswahl',
  hinzugefuegt: '--tx-modell-hinzugefuegt',
  entfernt: '--tx-modell-entfernt',
  geaendert: '--tx-modell-geaendert',
  zugeordnet: '--tx-modell-zugeordnet',
  'ohne-zuordnung': '--tx-modell-ohne-zuordnung',
};

/** CSS-Farbwert je Rolle, z. B. `#1d5fd1`; leer, wenn `modellansicht.css` nicht eingebunden ist. */
export type Farbtafel = Readonly<Record<Farbrolle, string>>;

export function farbtafelLesen(element: Element): Farbtafel {
  const stil = getComputedStyle(element);
  const tafel = {} as Record<Farbrolle, string>;
  for (const [rolle, variable] of Object.entries(FARBVARIABLEN) as [Farbrolle, string][]) {
    tafel[rolle] = stil.getPropertyValue(variable).trim();
  }
  return tafel;
}
