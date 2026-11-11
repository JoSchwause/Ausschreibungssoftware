// SPDX-License-Identifier: AGPL-3.0-or-later
// Kleine Konstruktoren für Ergebniswerte und Befehlsfehler. Erwartbare Fehler sind Werte, keine Ausnahmen.

import type { Befehlsfehler, Befehlsfehlercode, Ergebnis } from '@tethys/vertrag';

export const ok = <T>(wert: T): Ergebnis<T, never> => ({ ok: true, wert });

export function befehlsfehler(
  code: Befehlsfehlercode,
  meldung: string,
  knotenId?: string,
  feld?: string,
): Befehlsfehler {
  return {
    code,
    meldung,
    ...(knotenId === undefined ? {} : { knotenId: knotenId as Befehlsfehler['knotenId'] }),
    ...(feld === undefined ? {} : { feld }),
  } as Befehlsfehler;
}

export const nein = (
  code: Befehlsfehlercode,
  meldung: string,
  knotenId?: string,
  feld?: string,
): Ergebnis<never, Befehlsfehler> => ({ ok: false, fehler: befehlsfehler(code, meldung, knotenId, feld) });
