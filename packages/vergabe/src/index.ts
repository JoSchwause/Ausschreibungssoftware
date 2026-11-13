// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegspunkt von @tethys/vergabe (Ticket 36): Angebotsbefehle, Bietersummen, Preisspiegel-Rechnung.
// Ticket 138 (Vertrag v1.7a, D-127.17): `projektBefehlAusfuehren` und `auftragsLvBefehlAusfuehren` führen die Bieterbefehle
// und `ZuschlagZuruecknehmen` selbst aus und reichen alle übrigen Befehle an den Kern weiter; die App nimmt für Projekt- und
// Auftrags-LV-Befehle diese beiden Funktionen statt der gleichnamigen des Kerns. Für die beiden löschenden Befehle ruft sie die
// schmalen Funktionen `bieterLoeschen` und `zuschlagZuruecknehmen`, deren Typ die Verweise verlangt (Review D-82, S9).

export { angebotSummenBerechnen, angebotZuschlaegeBerechnen } from './summen';
export type { Bieterzuschlag } from './summen';
export { angebotBefehlAusfuehrer } from './befehle';
export { angebotChangeSetAnwenden, angebotChangeSetUmkehren } from './changeset';
export { bieterLoeschen, projektBefehlAusfuehren } from './projekt-befehle';
export { auftragsLvBefehlAusfuehren, zuschlagZuruecknehmen } from './zuschlag-zuruecknehmen';
export { PREISSPIEGEL_ANNAHMEN, PREISSPIEGEL_STANDARD, preisspiegelBerechnen } from './preisspiegel';
export type {
  AbcBezug,
  AbcKlasse,
  Ausreisser,
  Bieterpreis,
  Bietersumme,
  Preiskennzeichen,
  Preisspiegel,
  PreisspiegelEinstellungen,
  Preisspiegelgliederung,
  Preisspiegelzeile,
  VirtuellerPreis,
  Zuschlagsangabe,
} from './preisspiegel';
export { zuschlagErteilen, zuschlagsvorschau } from './zuschlag-erteilen';
export type {
  Vorschaugruppe,
  Vorschauvariante,
  Zuschlagsergebnis,
  Zuschlagsvorschau,
  Zuschlagswarnung,
} from './zuschlag-erteilen';
