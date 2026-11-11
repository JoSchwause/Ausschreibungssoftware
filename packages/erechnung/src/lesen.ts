// SPDX-License-Identifier: AGPL-3.0-or-later
// XRechnung lesen (Ticket 76): Syntax erkennen, Felder nach EN 16931 aus UBL oder CII holen, Zahlen und Daten
// lesen, Befunde sammeln, dann rechnen lassen (`pruefen.ts`). Rein (A2): Text rein, Werte und Befunde raus.

import { formatiereBetragDe } from '@tethys/dezimal';
import type { Befundort, Befundschwere, Betrag, Dezimal, Zahlenart } from '@tethys/vertrag';
import { rechnungPruefen } from './pruefen';
import type {
  Eingangsrechnung,
  Rechnungsposition,
  Umsatzsteueraufschluesselung,
  XRechnungBefund,
  XRechnungBefundcode,
  XRechnungLesung,
  XRechnungOptionen,
  XRechnungSyntax,
} from './typen';
import { kind, kinder, ortVon, pfadVon, xmlLesen } from './xml';
import type { XmlElement } from './xml';
import { betragLesen, datumCiiLesen, datumUblLesen, vertragszahlLesen } from './zahlen';

/** Größte Eingabe in Zeichen (20 Mi): reicht für XRechnungen mit eingebetteten Anlagen, schützt den Speicher. */
export const STANDARD_MAX_ZEICHEN = 20 * 1024 * 1024;
/** Größte Verschachtelungstiefe; UBL mit tief geschachtelten Unterpositionen bleibt weit darunter. */
export const STANDARD_MAX_TIEFE = 100;

const NS = {
  ublRechnung: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  ublGutschrift: 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  rsm: 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
  ram: 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
  udt: 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
} as const;

/** Kennzeichen einer XRechnung 3.x in BT-24. */
const XRECHNUNG_3 = 'urn:xeinkauf.de:kosit:xrechnung_3.';

/** Pflichtangaben laut Ticket 76 (Abschnitt 4) und BT-106, ohne den die Rechenprüfung nicht beginnen kann (D-76.6). */
type Pflichtfeld = 'BT-1' | 'BT-2' | 'BT-5' | 'BT-106' | 'BT-109' | 'BT-112' | 'BT-115';

type Roh = XmlElement | undefined;

interface RohePosition {
  readonly el: XmlElement;
  readonly kennung: Roh;
  readonly menge: Roh;
  readonly nettobetrag: Roh;
  readonly nettopreis: Roh;
  readonly bezeichnung: Roh;
  readonly artikelnummerVerkaeufer: Roh;
  readonly artikelnummerKaeufer: Roh;
  readonly unterpositionen: RohePosition[];
}

interface RoheSteuer {
  readonly kategorie: Roh;
  readonly satz: Roh;
  readonly basis: Roh;
  readonly betrag: Roh;
}

/** Was die Syntax liefert: die Elemente je Business Term, noch ungelesen. */
interface RoheRechnung {
  readonly spezifikation: Roh;
  readonly rechnungsnummer: Roh;
  readonly rechnungsdatum: Roh;
  readonly datumLesen: (el: XmlElement) => string | null;
  readonly rechnungsart: Roh;
  readonly waehrung: Roh;
  readonly kaeuferreferenz: Roh;
  readonly vertragsnummer: Roh;
  readonly bestellnummer: Roh;
  readonly verkaeuferName: Roh;
  readonly verkaeuferUmsatzsteuerId: Roh;
  readonly kaeuferName: Roh;
  readonly bt106: Roh;
  readonly bt107: Roh;
  readonly bt108: Roh;
  readonly bt109: Roh;
  readonly bt110: Roh;
  readonly bt112: Roh;
  readonly bt113: Roh;
  readonly bt114: Roh;
  readonly bt115: Roh;
  readonly steuer: readonly RoheSteuer[];
  readonly positionen: readonly RohePosition[];
  /** Nur CII: Unterpositionen, deren Oberposition nicht vor ihnen steht (D-76.7). */
  readonly verwaisteUnterpositionen: readonly XmlElement[];
}

/** Getrimmter Text eines Elements; leer oder fehlend ist `null`. */
const wert = (el: Roh): string | null => {
  const t = el?.text.trim() ?? '';
  return t === '' ? null : t;
};

/** Kurzform eines Dateiwerts für Meldungen (Dateien können beliebig lange Texte enthalten). */
const kurz = (t: string): string => (t.length > 40 ? `${t.slice(0, 40)}…` : t);

/**
 * Liest eine eingehende XRechnung (XRechnung 3.x, UBL 2.1 oder UN/CEFACT CII D16B). Die Rechnung kommt so zurück, wie
 * sie in der Datei steht; jede Auffälligkeit und jeder Rechenfehler ist ein Befund, keiner sperrt das Lesen (U5).
 * `rechnung` ist nur `null`, wenn die Datei kein lesbares XML, aus Sicherheitsgründen abgewiesen oder keine
 * XRechnung ist.
 */
export function xrechnungLesen(text: string, optionen: XRechnungOptionen = {}): XRechnungLesung {
  const xml = xmlLesen(text, {
    maxZeichen: optionen.maxZeichen ?? STANDARD_MAX_ZEICHEN,
    maxTiefe: optionen.maxTiefe ?? STANDARD_MAX_TIEFE,
  });
  if (!xml.ok) {
    const befund: XRechnungBefund = {
      schwere: 'fehler',
      code: xml.code,
      meldung: xml.meldung,
      ort: ortVon(text, xml.offset),
    };
    return { syntax: null, rechnung: null, befunde: [befund] };
  }
  const w = xml.wurzel;
  let syntax: XRechnungSyntax;
  let roh: RoheRechnung;
  if (w.ns === NS.ublRechnung && w.name === 'Invoice') {
    syntax = 'ubl';
    roh = ausUbl(w, false);
  } else if (w.ns === NS.ublGutschrift && w.name === 'CreditNote') {
    syntax = 'ubl';
    roh = ausUbl(w, true);
  } else if (w.ns === NS.rsm && w.name === 'CrossIndustryInvoice') {
    syntax = 'cii';
    roh = ausCii(w);
  } else {
    const befund: XRechnungBefund = {
      schwere: 'fehler',
      code: 'keine-xrechnung',
      meldung:
        `Das Wurzelelement „${w.name}“${w.ns === '' ? ' ohne Namensraum' : ` im Namensraum „${kurz(w.ns)}“`} ist ` +
        'weder eine UBL-Rechnung oder -Gutschrift noch eine CII-Rechnung.',
      ort: { pfad: `/${w.name}` },
    };
    return { syntax: null, rechnung: null, befunde: [befund] };
  }
  const { rechnung, befunde } = uebernehmen(roh);
  return { syntax, rechnung, befunde: [...befunde, ...rechnungPruefen(rechnung)] };
}

// --- UBL 2.1 -----------------------------------------------------------------------------------------------------

function ausUbl(w: XmlElement, gutschrift: boolean): RoheRechnung {
  const cbc = (e: Roh, name: string): Roh => kind(e, NS.cbc, name);
  const cac = (e: Roh, name: string): Roh => kind(e, NS.cac, name);
  const lieferant = cac(cac(w, 'AccountingSupplierParty'), 'Party');
  const kunde = cac(cac(w, 'AccountingCustomerParty'), 'Party');
  const ustSchema = kinder(lieferant, NS.cac, 'PartyTaxScheme').find(
    (s) => wert(cbc(cac(s, 'TaxScheme'), 'ID')) === 'VAT',
  );
  const summen = cac(w, 'LegalMonetaryTotal');
  const waehrung = wert(cbc(w, 'DocumentCurrencyCode'));
  // BT-110 steht in der Steuersumme in Rechnungswährung; eine zweite in Steuerwährung ist BT-111.
  const steuersummen = kinder(w, NS.cac, 'TaxTotal');
  const steuersumme =
    steuersummen.find((t) => cbc(t, 'TaxAmount')?.attrs.get('currencyID') === waehrung) ??
    steuersummen.find((t) => kind(t, NS.cac, 'TaxSubtotal') !== undefined) ??
    steuersummen[0];
  const zeile = gutschrift ? 'CreditNoteLine' : 'InvoiceLine';
  const unterzeile = gutschrift ? 'SubCreditNoteLine' : 'SubInvoiceLine';
  const position = (el: XmlElement): RohePosition => {
    const artikel = cac(el, 'Item');
    return {
      el,
      kennung: cbc(el, 'ID'),
      menge: cbc(el, gutschrift ? 'CreditedQuantity' : 'InvoicedQuantity'),
      nettobetrag: cbc(el, 'LineExtensionAmount'),
      nettopreis: cbc(cac(el, 'Price'), 'PriceAmount'),
      bezeichnung: cbc(artikel, 'Name'),
      artikelnummerVerkaeufer: cbc(cac(artikel, 'SellersItemIdentification'), 'ID'),
      artikelnummerKaeufer: cbc(cac(artikel, 'BuyersItemIdentification'), 'ID'),
      unterpositionen: kinder(el, NS.cac, unterzeile).map(position),
    };
  };
  return {
    spezifikation: cbc(w, 'CustomizationID'),
    rechnungsnummer: cbc(w, 'ID'),
    rechnungsdatum: cbc(w, 'IssueDate'),
    datumLesen: (el) => datumUblLesen(el.text),
    rechnungsart: cbc(w, gutschrift ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'),
    waehrung: cbc(w, 'DocumentCurrencyCode'),
    kaeuferreferenz: cbc(w, 'BuyerReference'),
    vertragsnummer: cbc(cac(w, 'ContractDocumentReference'), 'ID'),
    bestellnummer: cbc(cac(w, 'OrderReference'), 'ID'),
    verkaeuferName: cbc(cac(lieferant, 'PartyLegalEntity'), 'RegistrationName'),
    verkaeuferUmsatzsteuerId: cbc(ustSchema, 'CompanyID'),
    kaeuferName: cbc(cac(kunde, 'PartyLegalEntity'), 'RegistrationName'),
    bt106: cbc(summen, 'LineExtensionAmount'),
    bt107: cbc(summen, 'AllowanceTotalAmount'),
    bt108: cbc(summen, 'ChargeTotalAmount'),
    bt109: cbc(summen, 'TaxExclusiveAmount'),
    bt110: cbc(steuersumme, 'TaxAmount'),
    bt112: cbc(summen, 'TaxInclusiveAmount'),
    bt113: cbc(summen, 'PrepaidAmount'),
    bt114: cbc(summen, 'PayableRoundingAmount'),
    bt115: cbc(summen, 'PayableAmount'),
    steuer: kinder(steuersumme, NS.cac, 'TaxSubtotal').map((s) => {
      const kategorie = cac(s, 'TaxCategory');
      return {
        kategorie: cbc(kategorie, 'ID'),
        satz: cbc(kategorie, 'Percent'),
        basis: cbc(s, 'TaxableAmount'),
        betrag: cbc(s, 'TaxAmount'),
      };
    }),
    positionen: kinder(w, NS.cac, zeile).map(position),
    verwaisteUnterpositionen: [],
  };
}

// --- UN/CEFACT CII D16B ------------------------------------------------------------------------------------------

function ausCii(w: XmlElement): RoheRechnung {
  const ram = (e: Roh, name: string): Roh => kind(e, NS.ram, name);
  const kontext = kind(w, NS.rsm, 'ExchangedDocumentContext');
  const dokument = kind(w, NS.rsm, 'ExchangedDocument');
  const handel = kind(w, NS.rsm, 'SupplyChainTradeTransaction');
  const vereinbarung = ram(handel, 'ApplicableHeaderTradeAgreement');
  const abrechnung = ram(handel, 'ApplicableHeaderTradeSettlement');
  const summen = ram(abrechnung, 'SpecifiedTradeSettlementHeaderMonetarySummation');
  const verkaeufer = ram(vereinbarung, 'SellerTradeParty');
  const waehrung = wert(ram(abrechnung, 'InvoiceCurrencyCode'));
  const steuerbetraege = kinder(summen, NS.ram, 'TaxTotalAmount');
  const ustId = kinder(verkaeufer, NS.ram, 'SpecifiedTaxRegistration')
    .map((r) => ram(r, 'ID'))
    .find((id) => id?.attrs.get('schemeID') === 'VA');

  // Unterpositionen der Extension verweisen über ParentLineID auf eine frühere Position (D-76.7).
  const oberste: RohePosition[] = [];
  const nachKennung = new Map<string, RohePosition>();
  const verwaist: XmlElement[] = [];
  for (const el of kinder(handel, NS.ram, 'IncludedSupplyChainTradeLineItem')) {
    const zeilendokument = ram(el, 'AssociatedDocumentLineDocument');
    const produkt = ram(el, 'SpecifiedTradeProduct');
    const p: RohePosition = {
      el,
      kennung: ram(zeilendokument, 'LineID'),
      menge: ram(ram(el, 'SpecifiedLineTradeDelivery'), 'BilledQuantity'),
      nettobetrag: ram(
        ram(ram(el, 'SpecifiedLineTradeSettlement'), 'SpecifiedTradeSettlementLineMonetarySummation'),
        'LineTotalAmount',
      ),
      nettopreis: ram(ram(ram(el, 'SpecifiedLineTradeAgreement'), 'NetPriceProductTradePrice'), 'ChargeAmount'),
      bezeichnung: ram(produkt, 'Name'),
      artikelnummerVerkaeufer: ram(produkt, 'SellerAssignedID'),
      artikelnummerKaeufer: ram(produkt, 'BuyerAssignedID'),
      unterpositionen: [],
    };
    const elternKennung = wert(ram(zeilendokument, 'ParentLineID'));
    const eltern = elternKennung === null ? undefined : nachKennung.get(elternKennung);
    if (eltern) eltern.unterpositionen.push(p);
    else {
      if (elternKennung !== null) verwaist.push(el);
      oberste.push(p);
    }
    const kennung = wert(p.kennung);
    if (kennung !== null && !nachKennung.has(kennung)) nachKennung.set(kennung, p);
  }

  return {
    spezifikation: ram(ram(kontext, 'GuidelineSpecifiedDocumentContextParameter'), 'ID'),
    rechnungsnummer: ram(dokument, 'ID'),
    rechnungsdatum: kind(ram(dokument, 'IssueDateTime'), NS.udt, 'DateTimeString'),
    datumLesen: (el) => datumCiiLesen(el.text, el.attrs.get('format')),
    rechnungsart: ram(dokument, 'TypeCode'),
    waehrung: ram(abrechnung, 'InvoiceCurrencyCode'),
    kaeuferreferenz: ram(vereinbarung, 'BuyerReference'),
    vertragsnummer: ram(ram(vereinbarung, 'ContractReferencedDocument'), 'IssuerAssignedID'),
    bestellnummer: ram(ram(vereinbarung, 'BuyerOrderReferencedDocument'), 'IssuerAssignedID'),
    verkaeuferName: ram(verkaeufer, 'Name'),
    verkaeuferUmsatzsteuerId: ustId,
    kaeuferName: ram(ram(vereinbarung, 'BuyerTradeParty'), 'Name'),
    bt106: ram(summen, 'LineTotalAmount'),
    bt107: ram(summen, 'AllowanceTotalAmount'),
    bt108: ram(summen, 'ChargeTotalAmount'),
    bt109: ram(summen, 'TaxBasisTotalAmount'),
    bt110: steuerbetraege.find((b) => b.attrs.get('currencyID') === waehrung) ?? steuerbetraege[0],
    bt112: ram(summen, 'GrandTotalAmount'),
    bt113: ram(summen, 'TotalPrepaidAmount'),
    bt114: ram(summen, 'RoundingAmount'),
    bt115: ram(summen, 'DuePayableAmount'),
    steuer: kinder(abrechnung, NS.ram, 'ApplicableTradeTax').map((s) => ({
      kategorie: ram(s, 'CategoryCode'),
      satz: ram(s, 'RateApplicablePercent'),
      basis: ram(s, 'BasisAmount'),
      betrag: ram(s, 'CalculatedAmount'),
    })),
    positionen: oberste,
    verwaisteUnterpositionen: verwaist,
  };
}

// --- Übernehmen: Texte, Zahlen, Daten lesen; Befunde sammeln -----------------------------------------------------

function uebernehmen(roh: RoheRechnung): { rechnung: Eingangsrechnung; befunde: XRechnungBefund[] } {
  const befunde: XRechnungBefund[] = [];
  const melde = (schwere: Befundschwere, code: XRechnungBefundcode, meldung: string, ort: Befundort): void => {
    befunde.push({ schwere, code, meldung, ort });
  };
  const ort = (el: XmlElement, feld: string): Befundort => ({ feld, pfad: pfadVon(el) });

  const betrag = (el: Roh, feld: string): Betrag | null => {
    const t = wert(el);
    if (el === undefined || t === null) return null;
    const b = betragLesen(t);
    if (b === null) {
      melde('fehler', 'zahl-ungueltig', `${feld}: „${kurz(t)}“ ist keine Dezimalzahl.`, ort(el, feld));
      return null;
    }
    if (b.nichtKanonisch) {
      melde(
        'warnung',
        'betrag-nicht-kanonisch',
        `${feld}: „${kurz(t)}“ hat mehr als 2 Nachkommastellen; kaufmännisch gerundet auf ${formatiereBetragDe(b.wert)}.`,
        ort(el, feld),
      );
    }
    return b.wert;
  };

  const zahl = (
    el: Roh,
    feld: string,
    art: Zahlenart,
    code: 'menge-zu-viele-stellen' | 'preis-zu-viele-stellen' | 'satz-zu-viele-stellen',
  ): Dezimal | null => {
    const t = wert(el);
    if (el === undefined || t === null) return null;
    const z = vertragszahlLesen(art, t);
    if (z === null) {
      melde('fehler', 'zahl-ungueltig', `${feld}: „${kurz(t)}“ ist keine Dezimalzahl.`, ort(el, feld));
      return null;
    }
    if (!z.passt) {
      melde(
        'warnung',
        code,
        `${feld}: „${kurz(t)}“ hat mehr Nachkommastellen, als das Programm speichert; der Wert bleibt exakt erhalten.`,
        ort(el, feld),
      );
    }
    return z.wert;
  };

  const pflicht = (el: Roh, feld: Pflichtfeld, name: string, bezug?: XmlElement): void => {
    if (wert(el) !== null) return;
    melde(
      'fehler',
      'pflichtangabe-fehlt',
      `Pflichtangabe ${feld} (${name}) fehlt.`,
      bezug ? { feld, pfad: pfadVon(bezug) } : { feld },
    );
  };

  const spezifikation = wert(roh.spezifikation);
  if (spezifikation === null || !spezifikation.includes(XRECHNUNG_3)) {
    melde(
      'warnung',
      'spezifikation-unbekannt',
      spezifikation === null
        ? 'Die Spezifikationskennung (BT-24) fehlt; gelesen wird nach XRechnung 3.x.'
        : `Die Spezifikationskennung (BT-24) „${kurz(spezifikation)}“ nennt keine XRechnung 3.x; gelesen wird trotzdem.`,
      roh.spezifikation ? ort(roh.spezifikation, 'BT-24') : { feld: 'BT-24' },
    );
  }

  pflicht(roh.rechnungsnummer, 'BT-1', 'Rechnungsnummer');
  pflicht(roh.rechnungsdatum, 'BT-2', 'Rechnungsdatum');
  let rechnungsdatum: string | null = null;
  if (roh.rechnungsdatum !== undefined && wert(roh.rechnungsdatum) !== null) {
    rechnungsdatum = roh.datumLesen(roh.rechnungsdatum);
    if (rechnungsdatum === null) {
      melde(
        'fehler',
        'datum-ungueltig',
        `BT-2: „${kurz(roh.rechnungsdatum.text.trim())}“ ist kein gültiges Rechnungsdatum.`,
        ort(roh.rechnungsdatum, 'BT-2'),
      );
    }
  }
  pflicht(roh.waehrung, 'BT-5', 'Rechnungswährung');
  const waehrung = wert(roh.waehrung);
  if (roh.waehrung !== undefined && waehrung !== null && waehrung !== 'EUR') {
    melde(
      'warnung',
      'waehrung-nicht-eur',
      `Die Rechnungswährung (BT-5) ist „${kurz(waehrung)}“, nicht EUR; die Beträge sind nicht in Euro.`,
      ort(roh.waehrung, 'BT-5'),
    );
  }

  const summen = {
    summePositionen: betrag(roh.bt106, 'BT-106'),
    summeAbschlaege: betrag(roh.bt107, 'BT-107'),
    summeZuschlaege: betrag(roh.bt108, 'BT-108'),
    netto: betrag(roh.bt109, 'BT-109'),
    umsatzsteuer: betrag(roh.bt110, 'BT-110'),
    brutto: betrag(roh.bt112, 'BT-112'),
    bereitsGezahlt: betrag(roh.bt113, 'BT-113'),
    rundungsbetrag: betrag(roh.bt114, 'BT-114'),
    zahlbetrag: betrag(roh.bt115, 'BT-115'),
  };
  pflicht(roh.bt106, 'BT-106', 'Summe der Nettobeträge der Positionen');
  pflicht(roh.bt109, 'BT-109', 'Rechnungsgesamtbetrag ohne Umsatzsteuer');
  pflicht(roh.bt112, 'BT-112', 'Rechnungsgesamtbetrag einschließlich Umsatzsteuer');
  pflicht(roh.bt115, 'BT-115', 'Fälliger Zahlbetrag');

  const umsatzsteueraufschluesselung = roh.steuer.map((s): Umsatzsteueraufschluesselung => ({
    kategorie: wert(s.kategorie),
    satz: zahl(s.satz, 'BT-119', 'prozent', 'satz-zu-viele-stellen'),
    basis: betrag(s.basis, 'BT-116'),
    betrag: betrag(s.betrag, 'BT-117'),
  }));

  const position = (p: RohePosition): Rechnungsposition => ({
    kennung: wert(p.kennung),
    menge: zahl(p.menge, 'BT-129', 'menge', 'menge-zu-viele-stellen'),
    einheit: p.menge?.attrs.get('unitCode')?.trim() ?? null,
    nettobetrag: betrag(p.nettobetrag, 'BT-131'),
    nettopreis: zahl(p.nettopreis, 'BT-146', 'einheitspreis', 'preis-zu-viele-stellen'),
    bezeichnung: wert(p.bezeichnung),
    artikelnummerVerkaeufer: wert(p.artikelnummerVerkaeufer),
    artikelnummerKaeufer: wert(p.artikelnummerKaeufer),
    unterpositionen: p.unterpositionen.map(position),
  });
  const positionen = roh.positionen.map(position);
  for (const el of roh.verwaisteUnterpositionen) {
    melde(
      'warnung',
      'unterposition-ohne-oberposition',
      'Die Unterposition verweist auf eine Position, die nicht vor ihr steht; sie wird als eigene Position gelesen.',
      { pfad: pfadVon(el) },
    );
  }

  return {
    rechnung: {
      spezifikation,
      rechnungsnummer: wert(roh.rechnungsnummer),
      rechnungsdatum,
      rechnungsart: wert(roh.rechnungsart),
      waehrung,
      kaeuferreferenz: wert(roh.kaeuferreferenz),
      vertragsnummer: wert(roh.vertragsnummer),
      bestellnummer: wert(roh.bestellnummer),
      verkaeufer: { name: wert(roh.verkaeuferName), umsatzsteuerId: wert(roh.verkaeuferUmsatzsteuerId) },
      kaeufer: { name: wert(roh.kaeuferName) },
      summen,
      umsatzsteueraufschluesselung,
      positionen,
    },
    befunde,
  };
}
