// SPDX-License-Identifier: AGPL-3.0-or-later
// Feste Prozentsätze des Pakets, beim Laden geprüft (N1, N3): ein unlesbarer Wert ist ein Datenfehler und wirft.

import { alsProzent } from '@tethys/dezimal';
import type { Prozent } from '@tethys/vertrag';

/** Prozentsatz aus Daten des Pakets (kanonisch mit 2 Stellen, z. B. `25.00`). */
export function prozent(text: string): Prozent {
  const p = alsProzent(text);
  if (!p.ok) throw new Error(`Prozentsatz der Daten: ${p.fehler.meldung}`);
  return p.wert;
}

/** 100 %: Teiler für „× Satz / 100“. */
export const HUNDERT = prozent('100.00');
