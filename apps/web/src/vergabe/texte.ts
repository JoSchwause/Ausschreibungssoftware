// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Preisspiegel-Seite (Ticket 63, L1); Ticket 149: Bieter, Zuschlag zurücknehmen, Ausgaben.

import type { Verweisart } from '@tethys/vertrag';

/** „1 Rechnung“, „2 Rechnungen“ */
const anzahl = (n: number, eins: string, viele: string): string =>
  `${n.toLocaleString('de-DE')} ${n === 1 ? eins : viele}`;

/** Einzahl und Mehrzahl je Verweisart. */
const VERWEISWORT: { readonly [A in Verweisart]: readonly [string, string] } = {
  angebot: ['Angebot', 'Angebote'],
  nachtrag: ['Nachtrag', 'Nachträge'],
  aufmass: ['Aufmaßblatt', 'Aufmaßblätter'],
  rechnung: ['Rechnung', 'Rechnungen'],
  mangel: ['Mangel', 'Mängel'],
};

/** Wie sich ein Verweis lösen lässt, der das Zurücknehmen des Zuschlags sperrt. */
const LOESUNG: { readonly [A in Verweisart]: string } = {
  angebot: 'die Angebote in der Angebotsliste des LV löschen',
  nachtrag: 'das Nachtrags-LV auf der Projektseite löschen',
  aufmass: 'das Blatt auf der Seite „Abrechnung“ des Auftrags-LV löschen (vorher aus den Rechnungen nehmen)',
  rechnung: 'die Rechnung auf der Seite „Rechnungen“ löschen (eine freigegebene vorher wieder öffnen)',
  mangel: 'den Mangel in der Mängelliste löschen oder dort den Bezug zum Auftrags-LV entfernen',
};

export const texte = {
  seite: {
    titel: 'Preisspiegel',
    laden: 'Preisspiegel wird geladen …',
    nichtGefunden: 'Leistungsverzeichnis nicht gefunden',
    zumLv: 'Zum Leistungsverzeichnis',
    grid: 'Preisspiegel',
    keineAngebote:
      'Zu diesem Leistungsverzeichnis gibt es noch keine Angebote. Angebote lassen sich auf der LV-Seite einlesen (X84).',
    oeffnen: 'Preisspiegel',
    werkzeuge: 'Werkzeuge des Preisspiegels',
    summen: 'Summen',
  },
  spalten: {
    oz: 'OZ',
    kurztext: 'Kurztext',
    menge: 'Menge',
    einheit: 'Einheit',
    abc: 'ABC',
    ep: 'EP',
    gp: 'GP',
    schaetzpreis: 'Schätzpreis',
    min: 'Min',
    mittel: 'Mittel',
    max: 'Max',
  },
  summen: {
    netto: 'Netto',
    nachlass: 'Nachlass',
    nettoNachNachlass: 'Netto nach Nachlass',
    mwst: 'MwSt',
    brutto: 'Brutto',
    bedarf: 'Bedarfssumme (ohne Gesamtbetrag)',
    wahl: 'Wahlsumme',
    nichtAngeboten: 'Nicht angebotene Positionen',
    rang: 'Rang',
    virtuellNetto: 'Netto ohne Nachlass',
  },
  kennzeichen: {
    zuschlagssatzFehlt: { symbol: '%', beschreibung: 'Zuschlagssatz fehlt (zählt wie nicht angeboten)' },
    basisUnvollstaendig: 'Basis unvollständig: eine Bezugsposition hat keinen Preis des Bieters',
    nichtInSumme: {
      symbol: '( )',
      beschreibung: 'geht nicht in die Summe ein (Bedarf ohne Gesamtbetrag oder Wahl)',
    },
    abc: (k: string) => `ABC-Klasse ${k}`,
  },
  tooltip: {
    mittel: (wert: string) => `Mittel ${wert}`,
    satz: (satz: string, basis: string) => `Zuschlagssatz ${satz} % auf die Basis ${basis}`,
    keinSatz: 'kein Satz',
  },
  detail: {
    leiste: 'Zelle',
    bieter: 'Bieter',
    position: 'Position',
    wert: 'Wert',
    keine: 'Keine Zelle gewählt.',
    ohneKennzeichen: 'ohne Kennzeichen',
    hoch: (schwelle: string, mittel: string) =>
      `Ausreißer nach oben: mehr als ${schwelle} % über dem Mittel ${mittel}.`,
    niedrig: (schwelle: string, mittel: string) =>
      `Ausreißer nach unten: mehr als ${schwelle} % unter dem Mittel ${mittel}.`,
    nichtAngeboten: 'Nicht angeboten: Der Bieter hat zu dieser Position keinen Preis abgegeben.',
    nullpreis:
      'Nullpreis: angebotener Preis 0,00; zählt nicht für Min, Mittel und Max und ist nie Ausreißer.',
    zuschlagssatzFehlt:
      'Zuschlagssatz fehlt: Der Bieter hat die Zuschlagsposition ohne Satz angeboten; sie zählt wie nicht angeboten.',
    basisUnvollstaendig:
      'Basis unvollständig: Eine Bezugsposition hat keinen Preis des Bieters und trägt nichts zur Basis bei.',
    min: 'Niedrigster Preis dieser Position.',
    max: 'Höchster Preis dieser Position.',
    abc: (klasse: string, bezug: string) => `ABC-Klasse ${klasse} (Bezug ${bezug}).`,
    nichtInSumme: 'Die Position geht laut LV nicht in die Summe ein (Bedarf ohne Gesamtbetrag oder Wahl).',
    virtuell: (name: string) => `Virtueller Bieter ${name}: rechnerischer Vergleichswert, kein Angebot.`,
  },
  einstellungen: {
    gruppe: 'Einstellungen des Preisspiegels',
    hinweis:
      'Schwellen und Bezug gelten für dieses LV und werden mit ihm gespeichert; die Spaltenwahl gilt nur für diese Sitzung.',
    ausreisser: 'Ausreißer-Schwelle in %',
    abcA: 'ABC-Schwelle A in %',
    abcB: 'ABC-Schwelle B in %',
    standard: 'Standardwerte herstellen',
    aUeberB: 'Die Schwelle A darf nicht über der Schwelle B liegen.',
    abcBezug: 'Bezug der ABC-Klasse',
    bezugMittel: 'Mittel',
    bezugSchaetzpreis: 'Schätzpreis',
    spalten: 'Spalten',
    ep: 'EP',
    gp: 'GP',
    virtuell: 'Virtuelle Bieter (Min, Mittel, Max)',
    schaetzpreis: 'Schätzpreis',
    ungueltig: 'Bitte eine Zahl wie 20 oder 12,5 eingeben.',
    negativ: 'Der Wert darf nicht negativ sein.',
    ueber100: 'Der Wert darf höchstens 100 sein.',
    zuVieleStellen: 'Höchstens zwei Nachkommastellen.',
  },
  bieter: {
    liste: 'Bieter des Preisspiegels',
    bieter: 'Bieter',
    aktion: 'Aktion',
    rang: (r: number) => `Rang ${String(r)}`,
  },
  /** Bieter des Projekts verwalten (umbenennen, Angaben, löschen). */
  verwalten: {
    knopf: 'Bieter verwalten …',
    titel: 'Bieter des Projekts',
    tabelle: 'Bieter des Projekts',
    laden: 'Bieter werden geladen …',
    leer: 'Das Projekt hat noch keine Bieter.',
    name: 'Name',
    anschrift: 'Anschrift',
    kontakt: 'Kontakt',
    angebote: 'Angebote',
    aktionen: 'Aktionen',
    bearbeiten: 'Bearbeiten',
    bearbeitenFuer: (name: string) => `Bieter bearbeiten: ${name}`,
    loeschen: 'Löschen',
    loeschenFuer: (name: string) => `Bieter löschen: ${name}`,
    bearbeitenTitel: (name: string) => `Bieter „${name}“ bearbeiten`,
    strasse: 'Straße und Hausnummer',
    plz: 'PLZ',
    ort: 'Ort',
    ansprechperson: 'Ansprechperson',
    email: 'E-Mail',
    telefon: 'Telefon',
    speichern: 'Angaben speichern',
    abbrechen: 'Abbrechen',
    schliessen: 'Schließen',
    gespeichert: 'Angaben des Bieters gespeichert',
    loeschenFrage: (name: string) =>
      `Den Bieter „${name}“ löschen? In dieser Sitzung holt „Rückgängig“ ihn zurück.`,
    loeschenBestaetigen: 'Bieter löschen',
    geloescht: 'Bieter gelöscht',
    gesperrt: (name: string, n: number) =>
      `Der Bieter „${name}“ hat noch ${anzahl(n, 'Angebot', 'Angebote')} und lässt sich nicht löschen. Zuerst ${LOESUNG.angebot}.`,
  },
  /** Zuschlag zurücknehmen (Bestätigung und Sperre). */
  ruecknahme: {
    knopf: 'Zuschlag zurücknehmen …',
    titel: 'Zuschlag zurücknehmen',
    laden: 'Was am Auftrags-LV hängt, wird geprüft …',
    frage: (name: string) =>
      `Der Zuschlag an „${name}“ wird zurückgenommen: Das Auftrags-LV wird gelöscht. Angebot und LV bleiben unverändert, und das Projekt lässt sich danach wieder löschen. In dieser Sitzung holt „Rückgängig“ das Auftrags-LV zurück.`,
    vorgaenge: (n: number) =>
      `Bauzeitenplan: ${anzahl(n, 'Vorgang bezieht', 'Vorgänge beziehen')} sich auf das Auftrags-LV. Der Bezug bleibt stehen; der Plan meldet ihn danach als fehlend.`,
    vorgang: (plan: string, vorgang: string) => `${plan}: ${vorgang}`,
    vorgangsliste: 'Vorgänge mit Bezug auf das Auftrags-LV',
    kosten: (betrag: string) =>
      `Kostenkontrolle: Der Auftragswert dieses Auftrags-LV von ${betrag} € (netto nach Nachlass) entfällt dort.`,
    gesperrt: 'Der Zuschlag lässt sich nicht zurücknehmen. Am Auftrags-LV hängen noch:',
    sperre: (art: Verweisart, n: number) => {
      const [eins, viele] = VERWEISWORT[art];
      return `${anzahl(n, eins, viele)}: ${LOESUNG[art]}.`;
    },
    sperrliste: 'Was das Zurücknehmen sperrt',
    bestaetigen: 'Zuschlag zurücknehmen',
    abbrechen: 'Abbrechen',
    schliessen: 'Schließen',
    erfolg: 'Zuschlag zurückgenommen',
  },
  /** Ausgaben des Preisspiegels: PDF, Excel, Vergabevorschlag. */
  ausgabe: {
    gruppe: 'Ausgabe',
    pdfKnopf: 'Preisspiegel als PDF …',
    excelKnopf: 'Preisspiegel als Excel …',
    vorschlagKnopf: 'Vergabevorschlag …',
    pdfTitel: 'Preisspiegel als PDF',
    excelTitel: 'Preisspiegel als Excel',
    vorschlagTitel: 'Vergabevorschlag als PDF',
    spalten: 'Spalten wie am Bildschirm: Schätzpreis und virtuelle Bieter nach der Spaltenwahl.',
    vorgeschlagen: 'Vorgeschlagener Bieter',
    keiner: 'noch keiner',
    begruendung: 'Begründung',
    begruendungHinweis: 'Eine Leerzeile trennt Absätze.',
    excelFehler: 'Die Excel-Datei konnte nicht erzeugt werden.',
    dateiname: 'Dateiname',
    herunterladen: 'Herunterladen',
    schliessen: 'Schließen',
    gespeichert: 'Datei gespeichert',
    excelHinweis: 'Alle Bieter nebeneinander, EP und GP je in einer eigenen Spalte.',
  },
} as const;
