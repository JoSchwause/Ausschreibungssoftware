// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/kern. Ticket 05: LV-Baum als Befehle; Ticket 07: Summen, Nachlass, MwSt. Weitere
// Fachtickets (06 OZ, …) ergänzen ihre Handler in `ausfuehren.ts`.

export { BEFEHLS_HANDLER, ZUSTAENDIGES_TICKET, lvBefehlAusfuehren } from './ausfuehren';
export { auftragsLvBefehlAusfuehren } from './auftrags-lv';
export { lvStandBefehlAusfuehren } from './lv-stand';
export {
  LEERE_SUMMENAENDERUNG,
  LEERER_SUMMENSTAND,
  auftragsLvChangeSetAnwenden,
  auftragsLvChangeSetUmkehren,
  changeSetUmkehren,
  lvChangeSetAnwenden,
} from './changeset';
export {
  GLIEDERUNG_SCHRITT,
  OZ_ANNAHMEN,
  OZ_INDEX_LAENGE,
  OZ_MAX_LAENGE,
  OZ_RUECKFALL_SCHRITTE,
  POSITION_SCHRITT,
  doppelteOrdnungszahlen,
  maskeFehler as ozMaskeFehler,
  maskePruefen as ozMaskePruefen,
  ozFehler,
  zaehlerSchritt,
} from './ozregeln';
export type { DoppelteOrdnungszahl } from './ozregeln';
export { LOS_ANNAHME, MAX_GLIEDERUNGSEBENEN, ebenenbeitrag, losErlaubtUnter } from './regeln';
export { FELD_ANNAHMEN } from './feld-befehle';
export { langtextFormFehler, langtextGleich } from './langtext';
export { HINWEIS_ANNAHMEN } from './hinweise';
export { ANTEILE, EPA_ANNAHMEN, anteilsumme, epaSummen } from './epa';
export type { Anteil, Anteilsummen, EpaSummen } from './epa';
export {
  projektBefehlAusfuehren,
  projektChangeSetAnwenden,
  projektChangeSetUmkehren,
} from './projekt-befehle';
// Vertrag v1.7a (Ticket 137): Form und Normalform der Bieterangaben für die Bieterbefehle der Vergabe (D-127.4, D-82 S9).
export { bieterMitAngaben, bieterangabenFehler, bieterangabenNormal } from './angaben';
// Vertrag v1.7a (Ticket 137, D-127.8): Befehle an den Einstellungen; die Umkehrung für das Sitzungs-Undo (D-82 M1).
export {
  einstellungenBefehlAusfuehren,
  einstellungenChangeSetAnwenden,
  einstellungenChangeSetUmkehren,
} from './einstellungen';
export type { Formfehler } from './positionsfelder';
export { baumfehler, mengenansatzFehler, pruefeLvInvarianten } from './pruefung';
// Baumhilfen für Fachpakete und App (Review Welle 5, S9): Kinder je Elternknoten nach `reihenfolge`, Dokumentreihenfolge.
export { gruppiere as kinderJeEltern, praeorder as dokumentreihenfolge } from './struktur';
export type { KinderMap } from './struktur';
export { KOSTENGRUPPE_FORM, kostengruppeFehler } from './positionsfelder';
export { lvPruefen } from './lv-pruefung';
export { KNOTEN_REGELN, LV_REGELN, PRUEF_ANNAHMEN, PRUEF_GRENZEN, vorkommastellen } from './pruefregeln';
export type { Knotenregel, LvRegel } from './pruefregeln';
export { gesamtsummen, positionsSumme, summenBerechnen, zuschlagsbasen } from './summen';
export type { Ausweise } from './summen';
export { ZUSCHLAG_REGELN } from './zuschlag';
export { kopieBauen } from './kopie';
export { ozVorschlag } from './oz-vorschlag';
// Ticket 105 (Vertrag v1.5, D-95.3): der Ergebnistyp des OZ-Vorschlags ist der des Vertrags.
export type { OzVorschlag } from '@tethys/vertrag';
export type { KopieIdQuelle, KopieOptionen } from './kopie';
export type { Zuschlagsbasis } from './zuschlag';
export {
  SUMMEN_ANNAHMEN,
  betragsziel,
  eigenerGesamtpreis,
  mwstSatzFehler,
  nachlassBetrag,
  nachlassFehler,
  nettoNachNachlass,
  positionGehtInSumme,
} from './summenregeln';
export type { Betragsziel } from './summenregeln';
