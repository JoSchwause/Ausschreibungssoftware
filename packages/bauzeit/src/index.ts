// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/bauzeit (Ticket 102, D-57): Terminrechnung des Bauzeitenplans mit Arbeitskalender und
// Feiertagen nach Land, Zeitachse für die Balkenspalte. Rein (A2); importiert nur `vertrag` und `dezimal` (A3).

export type { Datum, Datumsfehler, Datumsfehlercode } from './datum';
export { datumPruefen } from './datum';
export type { Feiertag, Feiertagskennung, Landesfeiertag } from './feiertage';
export { BUNDESLAENDER, BUNDESWEITE_FEIERTAGE, LANDESFEIERTAGE, feiertage, ostersonntag } from './feiertage';
export { STANDARD_ARBEITSTAGE, istArbeitstag } from './kalender';
export { BAUZEIT_ANNAHMEN, HOECHSTWERT_ARBEITSTAGE, KRITISCHE_WEGE_HOECHSTENS } from './annahmen';
export type {
  Bauzeitbefundcode,
  Bauzeitenplaneingabe,
  Bauzeitenplanergebnis,
  Vorgangsergebnis,
  Vorgangstermine,
} from './bauzeitenplan';
export { BAUZEITBEFUNDE, bauzeitenplanBerechnen } from './bauzeitenplan';
// Aliase der Vertragstypen v1.6 (Ticket 109): Bis Ticket 102 führte das Paket eigene Typen dieser Namen; Nutzer importieren
// sie aus `@tethys/vertrag`, das Paket reicht sie für bestehende Importe weiter.
export type {
  Anordnungsart,
  Anordnungsbeziehung,
  Arbeitskalender,
  Bundesland,
  Isttermine,
  Vorgang,
  VorgangId,
  Vorgangsart,
  Wochentag,
} from '@tethys/vertrag';
export type { Monatsabschnitt, Wochenabschnitt, Zeitachse, Zeitachsenfehler } from './zeitachse';
export { balkenlage, tagesindex, zeitachseBerechnen } from './zeitachse';
