// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/bim (Ticket 108, D-50): Fachlogik rund um das Bauwerksmodell. Rein (A2); importiert nur
// `vertrag` und `dezimal` (A3). Baut Befehle und Ansatzzeilen als Daten; die Mengen eines Ansatzes rechnet die App mit
// `mengen` (D-22, D-53).

export {
  bauwerksmodellBefehlAusfuehren,
  bauwerksmodellChangeSetAnwenden,
  bauwerksmodellChangeSetUmkehren,
} from './bauwerksmodell-befehle';
export type { Modellbefundcode } from './befunde';
export type { Einheitsregel } from './einheiten';
export { EINHEITSREGELN } from './einheiten';
export type { Mengenuebernahme, Positionsuebernahme } from './mengenuebernahme';
export { FORMEL_FREIER_ANSATZ, mengenuebernahmeBerechnen, positionUebernehmen } from './mengenuebernahme';
export type {
  AufmassAusAuswahl,
  Aufmasshinweis,
  Aufmassueberschneidung,
  Aufmassvorschlag,
} from './aufmass-auswahl';
export { aufmassAusAuswahl, aufmassUeberschneidungen, bauteileImStrukturknoten } from './aufmass-auswahl';
export type { Bezugsgroesse, Bezugsgroessenart, Din277Groessen } from './din277';
export { din277Berechnen } from './din277';
export type {
  Kennwertansatz,
  Kostenkennwertzeile,
  Kostenschaetzung,
  Kostenschaetzungsangaben,
} from './kennwerte';
export { kostenkennwerteBerechnen, kostenschaetzungBerechnen } from './kennwerte';
export type {
  Bauteilaenderung,
  Mengenaenderung,
  Modellvergleich,
  Vergleichsfeld,
  Vergleichsfolge,
  Vergleichsfolgen,
} from './vergleich';
export { modellVergleichen, vergleichsfolgenBerechnen } from './vergleich';
export type { Zuordnungspruefung } from './pruefung';
export { bauteileOhneGeometrie, zuordnungenPruefen } from './pruefung';
// Die Konstante liegt seit v1.7a im Vertrag; die App liest sie weiter hier (Ticket 140).
export { MENGENART_STUECK } from '@tethys/vertrag';
