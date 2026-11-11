// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/kosten (Ticket 55, D-24): Kostengliederung nur über Nummern, Bezeichnungen aus einer CSV
// des Nutzers, Kostenermittlung mit Summen je Kostengruppe; Einzelpreiskalkulation und Kalkulationsübersicht (Ticket 78,
// D-39). Rein (A2); importiert nur `vertrag` und `dezimal` (A3).

export type { Kostengruppenebene, Kostengruppenfehler, Kostengruppenfehlercode } from './kostengruppe';
export { kgEbene, kgElternteil, kgLesen, kgSortieren, kgVergleichen, kgVorfahren } from './kostengruppe';
export type {
  Kostenbefund,
  Kostenbefundcode,
  Kostenermittlungseingabe,
  Kostenermittlungsergebnis,
  Kostengruppensumme,
} from './kostenermittlung';
export { kostenermittlungBerechnen } from './kostenermittlung';
export type {
  Bezeichnungsbefund,
  Bezeichnungsbefundcode,
  Bezeichnungsergebnis,
  Trenner,
} from './bezeichnungen';
export { bezeichnungenLesen } from './bezeichnungen';
export type {
  Einzelpreiskalkulation,
  Kalkulationsansatz,
  Kalkulationsbefund,
  Kalkulationsbefundcode,
  Kalkulationsfeld,
  Kalkulationszuschlagssaetze,
  Kostenartnachweis,
} from './kalkulation';
export { einzelpreiskalkulationBerechnen } from './kalkulation';
export type {
  Kalkulationsposition,
  Kalkulationsuebersicht,
  KalkuliertePosition,
  Kostenartsumme,
} from './kalkulationsuebersicht';
export { kalkulationsuebersichtBerechnen } from './kalkulationsuebersicht';
