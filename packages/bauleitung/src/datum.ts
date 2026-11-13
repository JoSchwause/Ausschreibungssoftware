// SPDX-License-Identifier: AGPL-3.0-or-later
// Kalendertage als Text `JJJJ-MM-TT` (wie im Vertrag). Nur die Formprüfung; verglichen wird als Text, was für geprüfte
// Tage dieselbe Reihenfolge ergibt wie der Kalender. Nie `Date`, keine Uhr, keine Zeitzone (A2). Typ und Form kommen aus
// `vertrag` (`Kalenderdatum`, `KALENDERDATUM_MUSTER`, v1.7a); `bauzeit` hat eine eigene Kalenderrechnung, Fachpakete
// importieren einander nicht (A3).

import { KALENDERDATUM_MUSTER } from '@tethys/vertrag';
import type { Kalenderdatum } from '@tethys/vertrag';

function tageImMonat(jahr: number, monat: number): number {
  if (monat === 2) return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0 ? 29 : 28;
  return monat === 4 || monat === 6 || monat === 9 || monat === 11 ? 30 : 31;
}

/** Ist `text` ein Kalendertag `JJJJ-MM-TT` (Jahr 0001–9999, proleptisch gregorianisch), ohne Leerraum und Uhrzeit? */
export function istKalendertag(text: unknown): text is Kalenderdatum {
  if (typeof text !== 'string' || !KALENDERDATUM_MUSTER.test(text)) return false;
  const [jahr = 0, monat = 0, tag = 0] = text.split('-').map(Number);
  return jahr >= 1 && monat >= 1 && monat <= 12 && tag >= 1 && tag <= tageImMonat(jahr, monat);
}
