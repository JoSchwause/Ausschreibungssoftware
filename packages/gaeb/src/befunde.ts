// SPDX-License-Identifier: AGPL-3.0-or-later
// Befunde der Leser in strukturierter Form (Ticket 136, E7, B-12): Code, Schwere und Ort wie jeder Prüfbefund, dazu die Werte
// als Daten (Dezimalwerte in gespeicherter Form, nie als „450000.00“ im Lesetext), die OZ des betroffenen Knotens und für
// alles, was nicht übernommen wird, eine Bezeichnung in Nutzersprache (Gruppierung „Nicht übernommen: Währung, …“). Den Text
// für Nutzer setzt der Rand (App) aus Code, Werten und Kurztext zusammen; `meldung` bleibt die ausführliche Fassung in
// derselben Sprache (de-DE-Zahlen, kein Paketname, keine Codes). Rein (A2).

import { formatiereDe, leseAustausch } from '@tethys/dezimal';
import type { Betrag, Einheitspreis, Menge, Prozent, Pruefbefund, Zahlenart } from '@tethys/vertrag';

/** Ein Wert eines Befunds als Datum: Text, Anzahl oder Dezimalwert in gespeicherter Form (N4: formatiert wird am Rand). */
export type Befundwert =
  | { readonly art: 'text'; readonly wert: string }
  | { readonly art: 'anzahl'; readonly wert: number }
  | { readonly art: 'menge'; readonly wert: Menge }
  | { readonly art: 'einheitspreis'; readonly wert: Einheitspreis }
  | { readonly art: 'betrag'; readonly wert: Betrag }
  | { readonly art: 'prozent'; readonly wert: Prozent };

/** Die Werte eines Befunds nach Namen; welche Namen ein Code trägt, steht an `BEFUNDTEXTE`. */
export type Befundwerte = Readonly<Record<string, Befundwert>>;

/**
 * Kurztext je Code für die Oberfläche: deutsch, unpersönlich, ohne Codes, Element- oder Paketnamen (L4, L5). Jeder Code, den
 * die Leser melden, steht hier (der Typ `GaebBefundcode` erzwingt das beim Melden). Werte, die ein Code trägt (Name: Art):
 *
 * - alle Abweisungen (`dateiart-unbekannt`, `format-nicht-unterstuetzt`, `phase-nicht-unterstuetzt`,
 *   `version-nicht-unterstuetzt`, `wurzel-unerwartet`): `format` (Text, z. B. „GAEB 90“), `phase`, `version` (Text), soweit
 *   bekannt;
 * - `nicht-abgebildet` und die übrigen Befunde mit `nichtUebernommen`: `element` (Text: Pfad in der Datei), `anzahl`;
 * - `nachlass-nicht-abgebildet`: `nachlass` (Prozent oder Betrag); `pauschalsumme-nicht-abgebildet`: `pauschalsumme`
 *   (Betrag); `mwst-satz-abweichend`: `satz`, `satzLv` (Prozent); `mwst-standardsatz`, `mwst-ersatzwert`: `satz` (Prozent);
 * - `gesamtpreis-abweichend`, `gp-abweichend`: `datei`, `gerechnet` (Betrag); `bietermenge-nicht-abgebildet`: `bietermenge`,
 *   `lvMenge` (Menge);
 * - Zahlen der Datei (`dezimal-ungueltig`, `dezimalkomma`, `gerundet` …): `wert` (Text: der Wert, wie er in der Datei steht);
 * - zusammengefasste Befunde (`formatierung-verworfen`, `epa-nicht-abgebildet`, `zeile-laenge` …): `anzahl`.
 *
 * Ein Wert, der sich nicht als Zahl lesen lässt, steht als Text da.
 */
export const BEFUNDTEXTE = {
  // Datei, Format, Version, Phase
  'datei-zu-gross': 'Datei zu groß',
  'dateiart-unbekannt': 'Keine GAEB-Datei',
  'format-nicht-unterstuetzt': 'Dateiformat wird nicht gelesen',
  'wurzel-unerwartet': 'Keine GAEB-Datei',
  'kodierung-ungueltig': 'Zeichenkodierung fehlerhaft',
  'kodierung-unbekannt': 'Zeichenkodierung unbekannt',
  'version-nicht-unterstuetzt': 'Version wird nicht gelesen',
  'version-unbekannt': 'Version unbekannt',
  'version-widerspruch': 'Versionsangaben widersprechen sich',
  'namespace-fehlt': 'Kennzeichnung des Formats fehlt',
  'namespace-unbekannt': 'Kennzeichnung des Formats unbekannt',
  'phase-nicht-unterstuetzt': 'Austauschphase wird hier nicht gelesen',
  'phase-ungueltig': 'Austauschphase ungültig',
  'phase-unbekannt': 'Austauschphase nicht erkennbar',
  'phase-widerspruch': 'Angaben zur Austauschphase widersprechen sich',
  'phase-endung-widerspruch': 'Dateiendung passt nicht zur Austauschphase',
  'befunde-begrenzt': 'Weitere Befunde ausgelassen',
  // Aufbau der Datei
  'xml-keine-wurzel': 'Kein lesbarer Inhalt',
  'xml-tag-nicht-geschlossen': 'Abschnitt nicht geschlossen',
  'xml-schliessendes-tag-unerwartet': 'Unerwartetes Abschnittsende',
  'xml-abschnitt-offen': 'Abschnitt ohne Ende',
  'xml-attribut-fehlerhaft': 'Fehlerhafte Angabe in der Datei',
  'xml-zeichen-unerwartet': 'Unerwartetes Zeichen',
  'xml-entitaet-unbekannt': 'Unbekanntes Sonderzeichen',
  'xml-zeichenreferenz-ungueltig': 'Ungültiges Sonderzeichen',
  'xml-tiefe-ueberschritten': 'Zu tief verschachtelt',
  'xml-text-ausserhalb': 'Text außerhalb des Inhalts',
  'xml-mehrere-wurzeln': 'Zweiter Inhalt nicht gelesen',
  'xml-doctype-ungueltig': 'Fehlerhafte Dokumenttyp-Angabe',
  'xml-doctype-ignoriert': 'Dokumenttyp-Angabe nicht beachtet',
  'xml-doctype-entitaeten': 'Datei mit eingebetteten Definitionen abgewiesen',
  'doppelte-id': 'Kennung in der Datei doppelt',
  // Leistungsverzeichnis
  'lv-fehlt': 'Kein Leistungsverzeichnis in der Datei',
  'lv-leer': 'Leistungsverzeichnis ohne Inhalt',
  'nicht-abgebildet': 'Nicht übernommen',
  'formatierung-verworfen': 'Textformatierung nicht übernommen',
  'oz-maske-ungueltig': 'OZ-Maske fehlerhaft',
  'oz-maske-reihenfolge': 'OZ-Maske in falscher Reihenfolge',
  'oz-maske-ueberlauf': 'OZ-Maske zu lang',
  'oz-maske-ohne-position': 'OZ-Maske ohne Stelle für die Position',
  'oz-index-laenge': 'Indexstelle nicht einstellig',
  'oz-index-ohne-maske': 'Index ohne Indexstelle',
  'oz-teil-fehlt': 'Teil der OZ fehlt',
  'oz-teil-ueberlauf': 'Teil der OZ zu lang',
  'oz-teil-zeichen': 'Unzulässige Zeichen in der OZ',
  'oz-ueberlauf': 'OZ zu lang',
  'doppelte-ordnungszahl': 'OZ doppelt',
  'gliederung-zu-tief': 'Zu viele Gliederungsstufen',
  'gliederung-ueberzaehlig': 'Gliederungsebene ohne Stufe in der OZ-Maske',
  'gliederung-ebene-entfallen': 'Gliederungsebene zusammengefasst',
  'los-zu-titel': 'Los als Titel übernommen',
  'gliederungswahl-nicht-abgebildet': 'Wahl einer ganzen Gliederung nicht übernommen',
  'nachlass-nicht-abgebildet': 'Nachlass nicht übernommen',
  'pauschalsumme-nicht-abgebildet': 'Pauschalsumme nicht übernommen',
  'mwst-satz-abweichend': 'Abweichender Steuersatz nicht übernommen',
  'mwst-standardsatz': 'Steuersatz ergänzt',
  'mwst-ersatzwert': 'Steuersatz ergänzt',
  'wahl-angabe-unvollstaendig': 'Angabe zur Wahl unvollständig',
  'wahl-ohne-grundposition': 'Wahlposition ohne Grundposition',
  'menge-fehlt': 'Menge fehlt',
  'einheit-fehlt': 'Einheit fehlt',
  'beschreibung-fehlt': 'Text der Position fehlt',
  'leitbeschreibung-ohne-kennzeichen': 'Leitbeschreibung ohne Kennzeichen',
  'unterbeschreibung-ohne-nummer': 'Unterbeschreibung ohne Nummer',
  'zuschlag-bezug-nicht-abbildbar': 'Bezug der Zuschlagsposition nicht übernommen',
  'gesamtpreis-abweichend': 'Gesamtpreis der Datei weicht ab',
  'verweis-auf-sich': 'Zuschlagsposition bezieht sich auf sich selbst',
  'verweis-unbekannt': 'Bezugsposition nicht gefunden',
  'wert-ungueltig': 'Angabe ungültig',
  'enum-ungueltig': 'Ungültiger Wert',
  'epa-beschriftung-abweichend': 'Einheitspreisanteil anders beschriftet',
  'katalog-nicht-abgebildet': 'Katalog nicht übernommen',
  'kostengruppe-ungueltig': 'Kostengruppe ungültig',
  'kostengruppe-mehrfach': 'Mehrere Kostengruppen',
  'kostengruppe-anteil': 'Anteil einer Kostengruppe nicht übernommen',
  // Zahlen der Datei
  'dezimal-ungueltig': 'Zahl nicht lesbar',
  'leerraum-entfernt': 'Leerzeichen in einer Zahl',
  dezimalkomma: 'Dezimalkomma statt Dezimalpunkt',
  'plus-entfernt': 'Pluszeichen vor einer Zahl',
  'fuehrende-nullen-entfernt': 'Führende Nullen',
  'vorzeichen-null-entfernt': 'Negative Null',
  'nachkommastellen-aufgefuellt': 'Nachkommastellen ergänzt',
  'nullen-abgeschnitten': 'Überzählige Nullen gekürzt',
  gerundet: 'Wert gerundet',
  // Texte
  'bild-ungueltig': 'Bild nicht lesbar',
  'bild-medientyp-fehlt': 'Bildformat fehlt',
  'bild-in-kurztext-verworfen': 'Bild im Kurztext nicht übernommen',
  'ergaenzung-nicht-oben': 'Verschachtelte Textergänzung',
  'ergaenzung-ungueltig': 'Textergänzung fehlerhaft',
  // Angebot
  'bieter-name-fehlt': 'Bietername fehlt',
  'bieterergaenzung-nicht-abgebildet': 'Textergänzung des Bieters nicht übernommen',
  'bietermenge-nicht-abgebildet': 'Menge des Bieters nicht übernommen',
  'epa-nicht-abgebildet': 'Einheitspreisanteile nicht übernommen',
  'gp-abweichend': 'Gesamtpreis der Datei weicht ab',
  'maske-abweichend': 'OZ-Maske weicht vom Leistungsverzeichnis ab',
  'position-fehlt-im-angebot': 'Position nicht angeboten',
  'position-unbekannt': 'Position nicht im Leistungsverzeichnis',
  'zuschlag-art-abweichend': 'Art der Position weicht vom Leistungsverzeichnis ab',
  // Mengenermittlung
  'bemerkung-nicht-abgebildet': 'Bemerkung nicht übernommen',
  'formel-nicht-unterstuetzt': 'Formel nicht umgesetzt',
  'formel-ohne-abschluss': 'Rechenausdruck ohne Abschluss',
  'menge-mehrfach': 'Menge mehrfach angegeben',
  'menge-nicht-uebernommen': 'Menge nicht übernommen',
  'verfahren-abweichend': 'Anderes Aufmaßverfahren genannt',
  'zeile-fehlt': 'Aufmaßzeile fehlt',
  'zeile-laenge': 'Aufmaßzeile mit falscher Länge',
  'zeile-nicht-abbildbar': 'Aufmaßzeile als Text übernommen',
  'zeile-ohne-formel': 'Aufmaßzeile ohne Formel',
} as const satisfies Readonly<Record<string, string>>;

/** Jeder Code, den die Leser des Pakets melden. */
export type GaebBefundcode = keyof typeof BEFUNDTEXTE;

/**
 * Befund eines Lesers (X81/X83/X86, X84, X31): ein `Pruefbefund` der Quelle `gaeb-lesen` mit Daten für den Text am Rand.
 * Additiv: Wer nur `Pruefbefund` kennt, liest ihn wie bisher.
 */
export interface GaebBefund extends Pruefbefund {
  readonly quelle: 'gaeb-lesen';
  readonly code: GaebBefundcode;
  /** Werte als Daten (siehe `BEFUNDTEXTE`); fehlt, wenn der Code keine trägt. */
  readonly werte?: Befundwerte;
  /** OZ des betroffenen Knotens (mit Index), wie sie in der Datei oder im LV steht; fehlt ohne Knoten oder ohne OZ. */
  readonly oz?: string;
  /**
   * Was nicht übernommen wird, als Bezeichnung für Nutzer („Währung“, „Projektbezeichnung“); gesetzt nur an Befunden der
   * Gruppe „Nicht übernommen“ (siehe `nichtUebernommeneAngaben`). Eine Angabe ohne eigene Bezeichnung trägt ihren Pfad in
   * der Datei.
   */
  readonly nichtUebernommen?: string;
}

/** Die Bezeichnungen der Gruppe „Nicht übernommen“ in der Reihenfolge der Befunde, jede einmal. */
export function nichtUebernommeneAngaben(befunde: readonly GaebBefund[]): readonly string[] {
  const gesehen = new Set<string>();
  for (const b of befunde) if (b.nichtUebernommen !== undefined) gesehen.add(b.nichtUebernommen);
  return [...gesehen];
}

/**
 * Ob die Zeile der Datei dem Nutzer hilft: nur, wenn der Befund weder an einem Knoten (OZ, Sprunglink) noch in der Gruppe
 * „Nicht übernommen“ steht, also bei Fehlern im Aufbau der Datei, in den Kopfdaten und bei Zahlen ohne Position.
 */
export function zeileHilft(befund: GaebBefund): boolean {
  return (
    befund.ort.zeile !== undefined &&
    befund.oz === undefined &&
    befund.ort.knotenId === undefined &&
    befund.nichtUebernommen === undefined
  );
}

// --- Werte bauen und für die Meldung schreiben ---------------------------------------------------------------

export const text = (wert: string): Befundwert => ({ art: 'text', wert });
export const anzahl = (wert: number): Befundwert => ({ art: 'anzahl', wert });

/** Ein Wert der Datei als Dezimalwert der Art, wenn er sich lesen lässt, sonst als Text. */
export function zahlwert(art: Zahlenart, roh: string): Befundwert {
  const r = leseAustausch(art, roh.trim());
  if (!r.ok) return text(roh.trim());
  switch (art) {
    case 'menge':
      return { art, wert: r.wert as Menge };
    case 'einheitspreis':
      return { art, wert: r.wert as Einheitspreis };
    case 'betrag':
      return { art, wert: r.wert as Betrag };
    case 'prozent':
      return { art, wert: r.wert as Prozent };
  }
}

/** Ein Wert in der Schreibweise der Meldung: Dezimalwerte deutsch (N4: die Meldung ist ein Rand), mit € bzw. %. */
export function deutsch(w: Befundwert): string {
  switch (w.art) {
    case 'text':
      return w.wert;
    case 'anzahl':
      return String(w.wert);
    case 'betrag':
      return `${formatiereDe(w.wert)} €`;
    case 'prozent':
      return `${formatiereDe(w.wert)} %`;
    case 'menge':
    case 'einheitspreis':
      return formatiereDe(w.wert);
  }
}

// --- Bezeichnungen für „Nicht übernommen“ ---------------------------------------------------------------------

/**
 * Bezeichnungen der Angaben, die der Leser nicht übernimmt, in eigenen Worten (Ticket 136). Schlüssel ist der Pfad, wie der
 * Leser ihn meldet, oder dessen letzter Teil. Was hier fehlt, trägt seinen Pfad.
 */
const ANGABEN: ReadonlyMap<string, string> = new Map([
  // Projekt und Vergabe
  ['LblPrj', 'Projektbezeichnung'],
  ['Cur', 'Währung'],
  ['CurLbl', 'Bezeichnung der Währung'],
  ['BidCommPerm', 'Zulassung von Bieterkommentaren'],
  ['AlterBidPerm', 'Zulassung von Nebenangeboten'],
  ['Cat', 'Vergabeart'],
  ['EvalEnd', 'Ende der Zuschlagsfrist'],
  ['CashDiscount', 'Skonto'],
  ['AddText', 'Zusatztext'],
  ['DPNo', 'Vorgangsnummer'],
  ['AwardNo', 'Vergabenummer'],
  ['AcctsPayNo', 'Kreditorennummer'],
  ['BidderNo', 'Bieternummer'],
  // Anschriften
  ['Name2', 'weiterer Name'],
  ['Name3', 'weiterer Name'],
  ['Name4', 'weiterer Name'],
  ['Country', 'Land'],
  ['Contact', 'Ansprechperson'],
  ['Phone', 'Telefon'],
  ['Fax', 'Fax'],
  ['Email', 'E-Mail'],
  // Leistungsverzeichnis
  ['LblBoQ', 'Bezeichnung des Leistungsverzeichnisses'],
  ['Date', 'Datum des Leistungsverzeichnisses'],
  ['LblTime', 'Zeitangabe des Leistungsverzeichnisses'],
  ['Ctlg', 'Katalog'],
  ['CtlgAssign', 'Zuordnung zu einem Katalog'],
  ['LotGrp', 'Losgruppe'],
  ['PerfDescr', 'Ausführungsbeschreibung'],
  ['OutlineText', 'Kurztext eines Hinweistexts'],
  ['Award/BoQ', 'weiteres Leistungsverzeichnis'],
  // Positionen
  ['PredQty', 'Vordersatz'],
  ['QtySplit', 'Mengenaufteilung'],
  ['QtyTBD', 'Menge noch festzulegen'],
  ['NotAppl', 'Kennzeichen „entfällt“'],
  ['DiscountPcnt', 'Nachlass an der Position'],
  ['DiscountAmt', 'Nachlass an der Position'],
  ['RefDescr', 'Verweis auf eine Beschreibung'],
  ['RefPerfNo', 'Verweis auf eine Ausführungsbeschreibung'],
  ['RefRNo', 'Verweis auf eine Position'],
  ['UPBkdn', 'Aufgliederung des Einheitspreises'],
  ['UPFrom', 'Preisspanne'],
  ['UPTo', 'Preisspanne'],
  ['BidComm', 'Bieterkommentar'],
  ['StLNo', 'Nummer aus dem Standardleistungsbuch'],
  ['ComplTSA', 'Zusatz zum Text'],
  ['ComplTSB', 'Zusatz zum Text'],
  ['SubQty', 'Teilmenge einer Zuschlagsposition'],
  ['SubDescr/Qty', 'Menge einer Unterbeschreibung'],
  ['QtyDetermInfo', 'Angaben zur Mengenermittlung'],
  ['OWN', 'Angaben zum Auftraggeber'],
]);

/** Wessen Angabe: `OWN` ist der Auftraggeber, `CTR` in einem LV der Auftragnehmer, in einem Angebot der Bieter. */
export interface Rollen {
  readonly ctr: string;
}
const LV_ROLLEN: Rollen = { ctr: 'des Auftragnehmers' };

/**
 * Bezeichnung einer nicht übernommenen Angabe (`PrjInfo/LblPrj` → „Projektbezeichnung“, `CTR/Address/Fax` → „Fax des
 * Auftragnehmers“); ohne Eintrag ihr Pfad.
 */
export function angabeZu(pfad: string, rollen: Rollen = LV_ROLLEN): string {
  const ohneZusatz = pfad.replace(/\s*\(.*\)$/, '');
  const letzter = ohneZusatz.split('/').at(-1) ?? ohneZusatz;
  const name = /^UPComp[1-6]$/.test(letzter)
    ? 'Einheitspreisanteil'
    : /^LblUPComp[1-6]$/.test(letzter)
      ? 'Bezeichnung eines Einheitspreisanteils'
      : (ANGABEN.get(ohneZusatz) ?? ANGABEN.get(letzter));
  if (name === undefined) return pfad;
  if (letzter !== 'OWN' && ohneZusatz.startsWith('OWN/')) return `${name} des Auftraggebers`;
  if (letzter !== 'CTR' && letzter !== 'BidderNo' && ohneZusatz.startsWith('CTR/'))
    return `${name} ${rollen.ctr}`;
  return name;
}
