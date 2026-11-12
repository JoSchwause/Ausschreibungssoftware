// SPDX-License-Identifier: AGPL-3.0-or-later
// Öffentliche Typen von @tethys/erechnung (Ticket 76). Felder heißen nach den Business Terms der EN 16931 (BT-…, BG-…);
// die Nummer steht jeweils im Kommentar. Alle Werte sind reine, serialisierbare Daten.

import type { Betrag, Dezimal, Pruefbefund } from '@tethys/vertrag';

/** Syntax der EN 16931, in der die XRechnung vorliegt: UBL 2.1 (`Invoice`, `CreditNote`) oder UN/CEFACT CII D16B. */
export type XRechnungSyntax = 'ubl' | 'cii';

/**
 * Codes der Befunde beim Lesen einer XRechnung. Die Befunde selbst sind `Pruefbefund` mit der Quelle `erechnung-lesen`
 * (Ticket 104, D-95.2); `code` ist dort ein `string`, diese Liste ist die Menge, die `erechnung` tatsächlich meldet.
 */
export type XRechnungBefundcode =
  // Die Datei wird nicht gelesen (`rechnung` ist `null`):
  | 'eingabe-zu-gross'
  | 'xml-doctype'
  | 'xml-entitaet'
  | 'xml-zu-tief'
  | 'xml-ungueltig'
  | 'keine-xrechnung'
  // Die Datei wird gelesen, der Befund steht daneben (U5):
  | 'spezifikation-unbekannt'
  | 'pflichtangabe-fehlt'
  | 'datum-ungueltig'
  | 'zahl-ungueltig'
  | 'betrag-nicht-kanonisch'
  | 'menge-zu-viele-stellen'
  | 'preis-zu-viele-stellen'
  | 'satz-zu-viele-stellen'
  | 'waehrung-nicht-eur'
  | 'unterposition-ohne-oberposition'
  // Rechenprüfung (Abschnitt 4 des Tickets):
  | 'summe-positionen-falsch'
  | 'netto-falsch'
  | 'brutto-falsch'
  | 'zahlbetrag-falsch'
  | 'umsatzsteuer-falsch';

/** Summen der Rechnung (BG-22). Fehlende Angaben sind `null`. */
export interface Rechnungssummen {
  /** BT-106 Summe der Nettobeträge der Rechnungspositionen. */
  readonly summePositionen: Betrag | null;
  /** BT-107 Summe der Abschläge auf Dokumentenebene (kein Abschlag im Sinne der Abschlagsrechnung). */
  readonly summeAbschlaege: Betrag | null;
  /** BT-108 Summe der Zuschläge auf Dokumentenebene (kein Zuschlag der Vergabe). */
  readonly summeZuschlaege: Betrag | null;
  /** BT-109 Rechnungsgesamtbetrag ohne Umsatzsteuer. */
  readonly netto: Betrag | null;
  /** BT-110 Summe der Umsatzsteuer in Rechnungswährung. */
  readonly umsatzsteuer: Betrag | null;
  /** BT-112 Rechnungsgesamtbetrag einschließlich Umsatzsteuer. */
  readonly brutto: Betrag | null;
  /** BT-113 Bereits gezahlter Betrag. */
  readonly bereitsGezahlt: Betrag | null;
  /** BT-114 Rundungsbetrag. */
  readonly rundungsbetrag: Betrag | null;
  /** BT-115 Fälliger Zahlbetrag. */
  readonly zahlbetrag: Betrag | null;
}

/** Eine Zeile der Umsatzsteueraufschlüsselung (BG-23). */
export interface Umsatzsteueraufschluesselung {
  /** BT-118 Code der Umsatzsteuerkategorie (z. B. `S`, `AE`, `E`). */
  readonly kategorie: string | null;
  /**
   * BT-119 Umsatzsteuersatz in Prozent. Kanonischer Dezimaltext; passt er verlustfrei in `Prozent` (2 Stellen), hat er
   * genau 2 Stellen, sonst bleibt er exakt mit Befund `satz-zu-viele-stellen`.
   */
  readonly satz: Dezimal | null;
  /** BT-116 Steuerbasis. */
  readonly basis: Betrag | null;
  /** BT-117 Steuerbetrag. */
  readonly betrag: Betrag | null;
}

/** Rechnungsposition (BG-25). */
export interface Rechnungsposition {
  /** BT-126 Kennung der Position. */
  readonly kennung: string | null;
  /**
   * BT-129 Menge. Kanonischer Dezimaltext; passt sie verlustfrei in `Menge` (3 Stellen), hat sie genau 3 Stellen und
   * ist damit eine gültige `Menge`, sonst bleibt sie exakt mit Befund `menge-zu-viele-stellen` (nie still gekürzt).
   */
  readonly menge: Dezimal | null;
  /** BT-130 Code der Mengeneinheit (UN/ECE Rec. 20, z. B. `MTK`, `H87`). */
  readonly einheit: string | null;
  /** BT-131 Nettobetrag der Position. */
  readonly nettobetrag: Betrag | null;
  /** BT-146 Nettopreis; wie `menge`, mit 3 Stellen (`Einheitspreis`) oder exakt mit Befund `preis-zu-viele-stellen`. */
  readonly nettopreis: Dezimal | null;
  /** BT-153 Bezeichnung des Artikels. */
  readonly bezeichnung: string | null;
  /** BT-155 Artikelnummer des Verkäufers. */
  readonly artikelnummerVerkaeufer: string | null;
  /** BT-156 Artikelnummer des Käufers. */
  readonly artikelnummerKaeufer: string | null;
  /**
   * Unterpositionen aus der XRechnung-Extension (UBL `SubInvoiceLine`, CII `ParentLineID`); leer bei einer Rechnung
   * ohne Extension. Sie zählen nicht zu BT-106.
   */
  readonly unterpositionen: readonly Rechnungsposition[];
}

/**
 * Eingangsrechnung (Glossar): eine eingegangene XRechnung, wie sie in der Datei steht. Nichts davon ist geprüft
 * übernommen; die Befunde stehen in `XRechnungLesung.befunde`.
 */
export interface Eingangsrechnung {
  /** BT-24 Spezifikationskennung (bei XRechnung 3.x `…#compliant#urn:xeinkauf.de:kosit:xrechnung_3.x…`). */
  readonly spezifikation: string | null;
  /** BT-1 Rechnungsnummer. */
  readonly rechnungsnummer: string | null;
  /** BT-2 Rechnungsdatum als `JJJJ-MM-TT`. */
  readonly rechnungsdatum: string | null;
  /** BT-3 Code der Rechnungsart (z. B. `380`, `381`, `875` Abschlagsrechnung Bau, `877` Schlussrechnung Bau). */
  readonly rechnungsart: string | null;
  /** BT-5 Code der Rechnungswährung (ISO 4217). */
  readonly waehrung: string | null;
  /** BT-10 Käuferreferenz (bei öffentlichen Auftraggebern die Leitweg-ID). */
  readonly kaeuferreferenz: string | null;
  /** BT-12 Vertragsnummer. */
  readonly vertragsnummer: string | null;
  /** BT-13 Bestellnummer. */
  readonly bestellnummer: string | null;
  readonly verkaeufer: {
    /** BT-27 Name des Verkäufers. */
    readonly name: string | null;
    /** BT-31 Umsatzsteuer-Identifikationsnummer des Verkäufers. */
    readonly umsatzsteuerId: string | null;
  };
  readonly kaeufer: {
    /** BT-44 Name des Käufers. */
    readonly name: string | null;
  };
  readonly summen: Rechnungssummen;
  /** BG-23 in Dokumentreihenfolge. */
  readonly umsatzsteueraufschluesselung: readonly Umsatzsteueraufschluesselung[];
  /** BG-25 in Dokumentreihenfolge (oberste Ebene). */
  readonly positionen: readonly Rechnungsposition[];
}

/** Ergebnis von `xrechnungLesen`. `rechnung` ist `null`, wenn die Datei nicht gelesen werden konnte. */
export interface XRechnungLesung {
  readonly syntax: XRechnungSyntax | null;
  readonly rechnung: Eingangsrechnung | null;
  readonly befunde: readonly Pruefbefund[];
}

export interface XRechnungOptionen {
  /** Größte Eingabe in Zeichen. Voreinstellung `STANDARD_MAX_ZEICHEN`. */
  readonly maxZeichen?: number;
  /** Größte Verschachtelungstiefe des XML. Voreinstellung `STANDARD_MAX_TIEFE`. */
  readonly maxTiefe?: number;
}
