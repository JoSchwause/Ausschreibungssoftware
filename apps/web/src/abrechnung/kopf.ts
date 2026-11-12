// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 87: Bezeichnung und Datum eines Aufmaßblatts als Eingabe. Das Datum wird am Rand umgewandelt (N4):
// `TT.MM.JJJJ` ↔ `JJJJ-MM-TT` wie die Kopfdaten des LV; leer heißt keine Angabe.

import type { AufmassKopf, Ergebnis } from '@tethys/vertrag';
import { datumDe, datumLesen } from '../lv/kopfdaten';

export interface Kopfentwurf {
  readonly bezeichnung: string;
  /** Wie eingegeben (`TT.MM.JJJJ`). */
  readonly datum: string;
}

export type Kopfangaben = Pick<AufmassKopf, 'bezeichnung' | 'datum'>;

export function kopfEntwurf(k: Kopfangaben): Kopfentwurf {
  return { bezeichnung: k.bezeichnung, datum: k.datum === null ? '' : datumDe(k.datum) };
}

/** Die Angaben für den Befehl, oder die Meldung zum Datum. */
export function kopfEingabe(e: Kopfentwurf): Ergebnis<Kopfangaben, string> {
  const bezeichnung = e.bezeichnung.trim();
  if (e.datum.trim() === '') return { ok: true, wert: { bezeichnung, datum: null } };
  const d = datumLesen(e.datum);
  return d.ok ? { ok: true, wert: { bezeichnung, datum: d.wert } } : d;
}
