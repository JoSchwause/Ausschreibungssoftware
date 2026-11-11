// SPDX-License-Identifier: AGPL-3.0-or-later
// Ticket 88, Punkt 4: Was die App aus einer eingelesenen XRechnung (`erechnung`, Ticket 76) übernimmt: Rechnungsnummer
// (BT-1), Rechnungsdatum (BT-2) als Vorschlag für das Eingangsdatum, die Art (BT-3: 875 Abschlagsrechnung Bau, 877
// Schlussrechnung Bau; sonst fragt die App) und die geforderten Beträge netto (BT-109), brutto (BT-112) und Zahlbetrag
// (BT-115), je wie vorhanden (D-44). Ungeprüft: Die Prüfung rechnet aus den Aufmaßblättern, nie aus der Forderung.

import type { Eingangsrechnung } from '@tethys/erechnung';
import type { Betrag, Rechnung, Rechnungsart } from '@tethys/vertrag';
import { datumDe } from '../lv/kopfdaten';
import { formatiereBetragDe } from '../lv/zahlen';
import type { Rechnungsentwurf } from './entwurf';

export interface XRechnungsuebernahme {
  /** BT-1. */
  readonly rechnungsnummer: string | null;
  /** BT-2 (`JJJJ-MM-TT`), Vorschlag für das Eingangsdatum. */
  readonly datum: string | null;
  /** BT-3, wie in der Datei. */
  readonly artCode: string | null;
  /** Aus BT-3; `null`: Die Datei sagt es nicht, der Nutzer wählt. */
  readonly art: Rechnungsart | null;
  readonly gefordert: Rechnung['gefordert'];
}

/** Die Codes der UNTDID 1001, die die App einer Rechnungsart zuordnet (Bau: Abschlags- und Schlussrechnung). */
const ARTEN: Readonly<Record<string, Rechnungsart>> = { '875': 'abschlag', '877': 'schluss' };

export function xrechnungUebernahme(r: Eingangsrechnung): XRechnungsuebernahme {
  const { netto, brutto, zahlbetrag } = r.summen;
  return {
    rechnungsnummer: r.rechnungsnummer,
    datum: r.rechnungsdatum,
    artCode: r.rechnungsart,
    art: r.rechnungsart === null ? null : (ARTEN[r.rechnungsart] ?? null),
    gefordert:
      netto === null && brutto === null && zahlbetrag === null ? null : { netto, brutto, zahlbetrag },
  };
}

/** Trägt die Übernahme ins Formular ein; Aufmaßblätter und Abzüge bleiben, Nummer und Datum nur, wenn die Datei sie nennt. */
export function entwurfMitXRechnung(
  e: Rechnungsentwurf,
  u: XRechnungsuebernahme,
  art: Rechnungsart,
): Rechnungsentwurf {
  const betrag = (b: Betrag | null | undefined): string =>
    b === null || b === undefined ? '' : formatiereBetragDe(b);
  return {
    ...e,
    art,
    eingang: u.datum === null ? e.eingang : datumDe(u.datum),
    rechnungsnummerAuftragnehmer: u.rechnungsnummer ?? e.rechnungsnummerAuftragnehmer,
    gefordertNetto: betrag(u.gefordert?.netto),
    gefordertBrutto: betrag(u.gefordert?.brutto),
    gefordertZahlbetrag: betrag(u.gefordert?.zahlbetrag),
  };
}
