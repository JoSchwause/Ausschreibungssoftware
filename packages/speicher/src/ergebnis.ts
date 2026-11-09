// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleine Hilfen für Ergebniswerte und den internen Abbruch einer Transaktion.

import type { Ergebnis, Speicherfehler, Speicherfehlercode } from '@tethys/vertrag';

export const ok = <T>(wert: T): Ergebnis<T, never> => ({ ok: true, wert });

export const fehler = (code: Speicherfehlercode, meldung: string): Ergebnis<never, Speicherfehler> => ({
  ok: false,
  fehler: { code, meldung },
});

/**
 * Bricht eine laufende Transaktion ab. Wird nur innerhalb von `speicher` geworfen und an der Paketgrenze
 * (`fange`) in einen Fehlerwert umgewandelt; nach außen gelangt nie eine Ausnahme (Q5).
 */
export class SpeicherAbbruch extends Error {
  readonly fehler: Speicherfehler;
  constructor(code: Speicherfehlercode, meldung: string) {
    super(meldung);
    this.name = 'SpeicherAbbruch';
    this.fehler = { code, meldung };
  }
}

export function abbruch(code: Speicherfehlercode, meldung: string): never {
  throw new SpeicherAbbruch(code, meldung);
}
