// SPDX-License-Identifier: AGPL-3.0-or-later
// Kalendertage als Text `JJJJ-MM-TT` (wie im Vertrag). Nur die Formprüfung; verglichen wird als Text, was für geprüfte
// Tage dieselbe Reihenfolge ergibt wie der Kalender. Nie `Date`, keine Uhr, keine Zeitzone (A2). `bauzeit` hat eine eigene
// Kalenderrechnung; Fachpakete importieren einander nicht (A3).

const FORM = /^(\d{4})-(\d{2})-(\d{2})$/;

function tageImMonat(jahr: number, monat: number): number {
  if (monat === 2) return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0 ? 29 : 28;
  return monat === 4 || monat === 6 || monat === 9 || monat === 11 ? 30 : 31;
}

/** Ist `text` ein Kalendertag `JJJJ-MM-TT` (Jahr 0001–9999, proleptisch gregorianisch), ohne Leerraum und Uhrzeit? */
export function istKalendertag(text: unknown): text is string {
  if (typeof text !== 'string') return false;
  const m = FORM.exec(text);
  if (m === null) return false;
  const jahr = Number(m[1]);
  const monat = Number(m[2]);
  const tag = Number(m[3]);
  return jahr >= 1 && monat >= 1 && monat <= 12 && tag >= 1 && tag <= tageImMonat(jahr, monat);
}
