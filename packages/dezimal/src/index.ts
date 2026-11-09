// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/dezimal (Ticket 04): Dezimalarithmetik, kaufmännische Rundung, de-DE-Rand.
// Kein anderes Paket rechnet oder behandelt Skalen auf den Zeichenketten selbst.

export type { Dezimalfehler, Dezimalfehlercode, Zahl, ZahlenTypen } from './kern';
export {
  NULL_BETRAG,
  NULL_EINHEITSPREIS,
  NULL_MENGE,
  NULL_PROZENT,
  addiere,
  alsBetrag,
  alsDezimal,
  alsEinheitspreis,
  alsMenge,
  alsProzent,
  alsZahl,
  gesamtpreis,
  multipliziere,
  negiere,
  prozentVon,
  rundeAufGanzzahl,
  rundeAufStellen,
  runden,
  subtrahiere,
  summiereBetraege,
  vergleiche,
  vorzeichen,
} from './kern';

export {
  formatiereBetragDe,
  formatiereDe,
  formatiereEinheitspreisDe,
  formatiereMengeDe,
  formatiereProzentDe,
  parseBetragDe,
  parseDe,
  parseEinheitspreisDe,
  parseMengeDe,
  parseProzentDe,
} from './de';

export type { Austauschergebnis, Austauschhinweis, Austauschhinweiscode } from './austausch';
export { leseAustausch } from './austausch';
