// SPDX-License-Identifier: AGPL-3.0-or-later
// Einstiegsfunktion des Kerns für LV-Befehle: `lvBefehlAusfuehren` verteilt nach `befehl.art`.
//
// HIER stecken spätere Tickets ihre Befehle ein:
//  1. Handler in `BEFEHLS_HANDLER` eintragen (Schlüssel = `befehl.art`).
//  2. Denselben Schlüssel aus `ZUSTAENDIGES_TICKET` löschen (der Typ erzwingt es: `Record` über die noch nicht
//     umgesetzten Arten).
// Befehle ohne Handler liefern den Fehlerwert `befehl-nicht-zustaendig`, der das zuständige Ticket nennt.

import type {
  Befehlsfehler,
  Ergebnis,
  LvBefehl,
  LvBefehlAusfuehren,
  LvChangeSet,
  LvZustand,
} from '@tethys/vertrag';
import { nein } from './fehler';
import {
  gliederungAnlegen,
  hinweistextAnlegen,
  knotenLoeschen,
  knotenVerschieben,
  positionAnlegen,
} from './knoten-befehle';
import {
  einheitAendern,
  hinweistextAendern,
  kurztextAendern,
  langtextAendern,
  leistungsverzeichnisUmbenennen,
  textquelleSetzen,
} from './feld-befehle';
import { einheitspreisanteileSetzen } from './epa';
import { kalkulationSetzen } from './kalkulation-befehle';
import {
  auftraggeberSetzen,
  leitbeschreibungSetzen,
  nachtragsangabenSetzen,
  preisspiegeleinstellungenSetzen,
  vergabeinformationenSetzen,
  vorlageSetzen,
} from './kopfdaten-befehle';
import { bauteileZuordnen } from './bauteile';
import { kostengruppeSetzen } from './kostengruppe';
import { positionsmerkmaleSetzen } from './merkmal-befehle';
import { leistungsverzeichnisAnlegen, leistungsverzeichnisLoeschen } from './lv-anlegen';
import { knotenEinfuegen, knotenlisteVerschieben } from './einfuegen-befehle';
import { lvStandAnlegen } from './lv-stand';
import { mengenansatzSetzen } from './mengenansatz-befehle';
import {
  knotenInPapierkorbLegen,
  papierkorbLeeren,
  papierkorbeintragEntfernen,
  papierkorbeintragWiederherstellen,
} from './papierkorb-befehle';
import { ordnungszahlSetzen, ozMaskeSetzen, umnummerieren } from './oz-befehle';
import {
  einheitspreisAendern,
  mengeAendern,
  mwstSatzSetzen,
  nachlassEntfernen,
  nachlassSetzen,
} from './summen-befehle';

type Art = LvBefehl['art'];
type BefehlVon<A extends Art> = Extract<LvBefehl, { art: A }>;
type Antwort = Ergebnis<LvChangeSet, Befehlsfehler>;

/** Handler eines Befehls: `LeistungsverzeichnisAnlegen` erhält keinen Zustand, alle anderen einen. */
type Handler<A extends Art> = A extends 'LeistungsverzeichnisAnlegen'
  ? (zustand: null, befehl: BefehlVon<A>) => Antwort
  : (zustand: LvZustand, befehl: BefehlVon<A>) => Antwort;

/** Die umgesetzten Befehle (Ticket 05: Baum, Ticket 06: OZ, Ticket 07: Summen, Nachlass, MwSt; Ticket 27: Felder; Ticket 37: Merkmale, EPA; Ticket 41: Kopfdaten; Ticket 56: Mengenansatz; Ticket 71: Kostengruppe, Textquelle, Nachtragsangaben, Vorlage; Ticket 105: Bauteilzuordnungen; Ticket 137: Preisspiegel-Einstellungen, Kalkulation). Spätere Tickets tragen ihre Handler hier ein. */
export const BEFEHLS_HANDLER = {
  LeistungsverzeichnisAnlegen: (_zustand: null, befehl) => leistungsverzeichnisAnlegen(befehl),
  LeistungsverzeichnisUmbenennen: leistungsverzeichnisUmbenennen,
  LeistungsverzeichnisLoeschen: leistungsverzeichnisLoeschen,
  GliederungAnlegen: gliederungAnlegen,
  PositionAnlegen: positionAnlegen,
  HinweistextAnlegen: hinweistextAnlegen,
  KnotenLoeschen: knotenLoeschen,
  KnotenVerschieben: knotenVerschieben,
  KurztextAendern: kurztextAendern,
  LangtextAendern: langtextAendern,
  HinweistextAendern: hinweistextAendern,
  MengeAendern: mengeAendern,
  EinheitAendern: einheitAendern,
  EinheitspreisAendern: einheitspreisAendern,
  NachlassSetzen: nachlassSetzen,
  NachlassEntfernen: nachlassEntfernen,
  MwstSatzSetzen: mwstSatzSetzen,
  OzMaskeSetzen: ozMaskeSetzen,
  OrdnungszahlSetzen: ordnungszahlSetzen,
  Umnummerieren: umnummerieren,
  PositionsmerkmaleSetzen: positionsmerkmaleSetzen,
  EinheitspreisanteileSetzen: einheitspreisanteileSetzen,
  AuftraggeberSetzen: auftraggeberSetzen,
  VergabeinformationenSetzen: vergabeinformationenSetzen,
  LeitbeschreibungSetzen: leitbeschreibungSetzen,
  LvStandAnlegen: lvStandAnlegen,
  KnotenInPapierkorbLegen: knotenInPapierkorbLegen,
  PapierkorbeintragWiederherstellen: papierkorbeintragWiederherstellen,
  PapierkorbeintragEntfernen: papierkorbeintragEntfernen,
  PapierkorbLeeren: papierkorbLeeren,
  KnotenEinfuegen: knotenEinfuegen,
  KnotenlisteVerschieben: knotenlisteVerschieben,
  MengenansatzSetzen: mengenansatzSetzen,
  KostengruppeSetzen: kostengruppeSetzen,
  TextquelleSetzen: textquelleSetzen,
  NachtragsangabenSetzen: nachtragsangabenSetzen,
  VorlageSetzen: vorlageSetzen,
  BauteileZuordnen: bauteileZuordnen,
  PreisspiegeleinstellungenSetzen: preisspiegeleinstellungenSetzen,
  KalkulationSetzen: kalkulationSetzen,
} satisfies { [A in Art]?: Handler<A> };

type Umgesetzt = keyof typeof BEFEHLS_HANDLER;

/**
 * Noch nicht umgesetzte Befehle und das Ticket, das sie umsetzt. Ein Eintrag fällt weg, sobald ein Handler existiert. Seit
 * Ticket 42 (K9) leer, nach Vertrag v1.4 wieder seit Ticket 71, nach Vertrag v1.6 wieder seit Ticket 105, nach Vertrag v1.7a
 * wieder seit Ticket 137: jeder LV-Befehl hat einen Handler. Bringt der Vertrag einen neuen Befehl, verlangt der Typ hier einen Eintrag (`Offen`), bis sein Ticket den
 * Handler liefert.
 */
type Offen = Exclude<Art, Umgesetzt>;
export const ZUSTAENDIGES_TICKET: { readonly [A in Offen]: string } & Readonly<Partial<Record<Art, string>>> =
  {};

const istUmgesetzt = (art: Art): art is Umgesetzt => Object.hasOwn(BEFEHLS_HANDLER, art);

/**
 * Führt einen LV-Befehl aus: `(Zustand, Befehl) → ChangeSet` oder Fehlerwert (A5). Rein und deterministisch (A2).
 * `LeistungsverzeichnisAnlegen` braucht `zustand === null`, jeder andere Befehl einen Zustand; sonst
 * `befehl-nicht-zustaendig` („Befehl passt nicht zum übergebenen Zustand“).
 */
export const lvBefehlAusfuehren: LvBefehlAusfuehren = (zustand, befehl) => {
  const art = befehl.art;
  if (!istUmgesetzt(art)) {
    return nein(
      'befehl-nicht-zustaendig',
      `Befehl ${befehl.art} ist im Kern noch nicht umgesetzt; zuständig: ${ZUSTAENDIGES_TICKET[befehl.art] ?? 'unbekannt'}.`,
    );
  }
  if (art === 'LeistungsverzeichnisAnlegen') {
    if (zustand !== null)
      return nein('befehl-nicht-zustaendig', 'LeistungsverzeichnisAnlegen: das LV existiert schon.');
    return BEFEHLS_HANDLER.LeistungsverzeichnisAnlegen(zustand, befehl);
  }
  if (zustand === null) return nein('befehl-nicht-zustaendig', `${art}: kein LV als Zustand übergeben.`);
  // Die Zuordnung `art → Handler` ist je Schlüssel typsicher; die Korrelation geht beim Nachschlagen über die
  // Vereinigung verloren, daher eine Zusicherung an genau dieser Stelle.
  const handler = BEFEHLS_HANDLER[art] as (z: LvZustand, b: LvBefehl) => Antwort;
  return handler(zustand, befehl);
};
