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
import { leistungsverzeichnisAnlegen } from './lv-anlegen';
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

/** Die umgesetzten Befehle (Ticket 05: Baum, Ticket 06: OZ, Ticket 07: Summen, Nachlass, MwSt). Spätere Tickets tragen ihre Handler hier ein. */
export const BEFEHLS_HANDLER = {
  LeistungsverzeichnisAnlegen: (_zustand: null, befehl) => leistungsverzeichnisAnlegen(befehl),
  GliederungAnlegen: gliederungAnlegen,
  PositionAnlegen: positionAnlegen,
  HinweistextAnlegen: hinweistextAnlegen,
  KnotenLoeschen: knotenLoeschen,
  KnotenVerschieben: knotenVerschieben,
  MengeAendern: mengeAendern,
  EinheitspreisAendern: einheitspreisAendern,
  NachlassSetzen: nachlassSetzen,
  NachlassEntfernen: nachlassEntfernen,
  MwstSatzSetzen: mwstSatzSetzen,
  OzMaskeSetzen: ozMaskeSetzen,
  OrdnungszahlSetzen: ordnungszahlSetzen,
  Umnummerieren: umnummerieren,
} satisfies { [A in Art]?: Handler<A> };

type Umgesetzt = keyof typeof BEFEHLS_HANDLER;

/** Noch nicht umgesetzte Befehle und das Ticket, das sie umsetzt. Ein Eintrag fällt weg, sobald ein Handler existiert. */
export const ZUSTAENDIGES_TICKET: Record<Exclude<Art, Umgesetzt>, string> = {
  LeistungsverzeichnisUmbenennen: 'kein Ticket zugeordnet (Stammdaten des LV; der Vertrag nennt keines)',
  KurztextAendern: 'kein Ticket zugeordnet (Felder ändern; Vertragskommentar nennt „Tickets 07, 21“)',
  LangtextAendern: 'kein Ticket zugeordnet (Felder ändern; Vertragskommentar nennt „Tickets 07, 21“)',
  HinweistextAendern: 'kein Ticket zugeordnet (Felder ändern; Vertragskommentar nennt „Tickets 07, 21“)',
  EinheitAendern: 'kein Ticket zugeordnet (Felder ändern; Vertragskommentar nennt „Tickets 07, 21“)',
  EinheitspreisanteileSetzen: 'kein Ticket zugeordnet (Einheitspreisanteile)',
  PositionsartAendern: 'K5 (Ticket 08, Positionsarten)',
  // v1.1a: mechanisch angepasst, Folgeticket
  LeistungsverzeichnisLoeschen: 'Folgeticket kern (Löschen, Vertrag v1.1a)',
};

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
      `Befehl ${art} ist im Kern noch nicht umgesetzt; zuständig: ${ZUSTAENDIGES_TICKET[art]}.`,
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
