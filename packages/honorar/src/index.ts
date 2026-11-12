// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/honorar (Tickets 101, 110; D-56): Honorare nach der HOAI 2021 mit den Honorartafeln als Daten.
// Ein- und Ergebnistypen stehen im Vertrag (v1.6: `Honorarberechnung`, `Honorarergebnis` und ihre Teile). Rein (A2);
// importiert nur `vertrag` und `dezimal` (A3).

export type { Honorartafel, Quelle } from './honorartafeln';
export type { Leistungsbilddaten, Leistungsphase } from './leistungsbilder';
export { LEISTUNGSBILDER } from './leistungsbilder';
export type { Spannenfehler } from './honorarspanne';
export { honorarInSpanne, honorarspanneBerechnen } from './honorarspanne';
export type { KostenNachDin276 } from './anrechenbare-kosten';
export { anrechenbareKostenHerleiten } from './anrechenbare-kosten';
export type { Honorarbefundcode, Honorarberechnungseingabe, Honorarobjekteingabe } from './honorar-berechnen';
export { honorarBerechnen } from './honorar-berechnen';
