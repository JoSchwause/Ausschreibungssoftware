// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Rechnungen (Ticket 88, L1). Keine Übersetzung in v1.

import type { XRechnungBefundcode } from '@tethys/erechnung';
import type { Rechnungsart } from '@tethys/vertrag';

const nummern = (xs: readonly number[]): string => xs.map(String).join(', ');

export const texte = {
  art: {
    abschlag: 'Abschlagsrechnung',
    schluss: 'Schlussrechnung',
  } satisfies Record<Rechnungsart, string>,
  feld: {
    art: 'Rechnungsart',
    eingang: 'Eingangsdatum',
    rechnungsnummerAuftragnehmer: 'Rechnungsnummer des Auftragnehmers',
    gefordertNetto: 'Gefordert netto',
    gefordertBrutto: 'Gefordert brutto',
    gefordertZahlbetrag: 'Geforderter Zahlbetrag',
    aufmasse: 'Abgerechnete Aufmaßblätter (kumuliert)',
    umlagen: 'Umlagen',
    umlageBezeichnung: (i: number) => `Bezeichnung der Umlage ${String(i + 1)}`,
    umlageSatz: (i: number) => `Satz der Umlage ${String(i + 1)}`,
    sicherheitSatz: 'Sicherheitseinbehalt',
    gewaehrleistungSatz: 'Gewährleistungseinbehalt',
  },
  formular: {
    titelNeu: (nummer: number) => `Rechnung ${String(nummer)} anlegen`,
    titelBearbeiten: (nummer: number) => `Rechnung ${String(nummer)} bearbeiten`,
    angaben: 'Angaben des Auftragnehmers',
    gefordert: 'Gefordert (nur zum Vergleich, nicht geprüft)',
    abzuege: 'Abzüge',
    datumHinweis: 'TT.MM.JJJJ',
    satzFehlt: 'Bitte einen Satz angeben oder die Umlage entfernen.',
    umlageHinzufuegen: 'Umlage hinzufügen',
    umlageEntfernen: (i: number) => `Umlage ${String(i + 1)} entfernen`,
    keineUmlagen: 'Keine Umlagen.',
    keineBlaetter: 'Zu diesem Auftrags-LV gibt es noch kein Aufmaßblatt.',
    blatt: (nummer: number, bezeichnung: string) =>
      bezeichnung === '' ? `Blatt ${String(nummer)}` : `Blatt ${String(nummer)} – ${bezeichnung}`,
    hinweisKumuliert:
      'Eine Abschlagsrechnung rechnet die ganze bis dahin aufgemessene Leistung ab; frühere Zahlbeträge werden abgezogen.',
    hinweisEinbehalt:
      'Der Sicherheitseinbehalt gilt in Abschlagsrechnungen, der Gewährleistungseinbehalt in der Schlussrechnung.',
    unlesbar: 'Bitte die markierten Felder prüfen; es wurde nichts gespeichert.',
    abbrechen: 'Abbrechen',
    speichern: 'Speichern',
  },
  liste: {
    link: 'Rechnungen',
    titel: (auftrag: string) => `Rechnungen – ${auftrag}`,
    beschriftung: 'Rechnungen des Auftrags-LV',
    leer: 'Noch keine Rechnung erfasst.',
    nummer: 'Nr.',
    art: 'Art',
    eingang: 'Eingang',
    rechnungsnummer: 'Rechnungsnr. AN',
    gefordertBrutto: 'Gefordert brutto',
    zahlbetrag: 'Geprüfter Zahlbetrag',
    status: 'Status',
    offen: 'offen',
    freigegeben: 'freigegeben',
    oeffnen: (nummer: number) => `Rechnung ${String(nummer)} öffnen`,
    neu: 'Rechnung anlegen',
    zumAuftrag: 'Zum Auftrags-LV',
    zurListe: 'Zur Rechnungsliste',
    werkzeuge: 'Werkzeuge der Rechnungen',
    laden: 'Die Rechnungen werden geladen …',
    nichtGefunden: 'Dieses Auftrags-LV gibt es nicht (mehr).',
    rechnungFehlt: 'Diese Rechnung gibt es nicht (mehr).',
  },
  pruefung: {
    titel: (art: Rechnungsart, nummer: number) =>
      `${art === 'schluss' ? 'Schlussrechnung' : 'Abschlagsrechnung'} ${String(nummer)}`,
    angaben: 'Angaben der Rechnung',
    kette: 'Prüfung: Abzugskette',
    posten: 'Posten',
    betrag: 'Betrag',
    leistung: 'Leistung (kumuliert)',
    nachlass: 'Nachlass',
    nettoNachNachlass: 'Netto nach Nachlass',
    mwst: 'MwSt',
    bruttoKumuliert: 'Brutto kumuliert',
    umlage: (bezeichnung: string, satz: string) => `Umlage ${bezeichnung} (${satz} %)`,
    sicherheit: (satz: string | null) =>
      satz === null ? 'Sicherheitseinbehalt (kein Satz)' : `Sicherheitseinbehalt (${satz} %)`,
    gewaehrleistung: (satz: string | null) =>
      satz === null ? 'Gewährleistungseinbehalt (kein Satz)' : `Gewährleistungseinbehalt (${satz} %)`,
    frueher: (nummer: number) => `Zahlbetrag Rechnung ${String(nummer)} (freigegeben)`,
    keineFrueheren: 'Frühere Zahlbeträge',
    zahlbetrag: 'Zahlbetrag',
    eingefroren: 'Freigegebener Zahlbetrag (eingefroren)',
    vergleich: 'Gefordert und geprüft',
    gefordert: 'Gefordert',
    geprueft: 'Geprüft',
    differenz: 'Differenz',
    fehlt: '–',
    vergleichZeile: {
      netto: 'Netto',
      brutto: 'Brutto',
      zahlbetrag: 'Zahlbetrag',
    },
    vergleichsgrundlage: 'Verglichen wird bevorzugt der Zahlbetrag.',
    befunde: 'Befunde',
    keineBefunde: 'Keine Befunde.',
    leistungsstand: 'Leistungsstand je Position',
    nachtraege: 'Nicht beauftragte Nachträge',
    nachtraegeHinweis:
      'Nur zur Information: Ein Nachtrag geht erst in die Rechnung, wenn er beauftragt und ins Auftrags-LV übernommen ist.',
    nachtragZeile: (nummer: string, status: string, netto: string) =>
      `Nachtrag ${nummer} (${status}): Angebot ${netto} € netto, nicht in dieser Rechnung.`,
  },
  befund: {
    'aufmass-unbekannt': 'Ein abgerechnetes Aufmaßblatt gibt es nicht (mehr); es zählt nichts.',
    'aufmass-fehlt': (blatt: string, nummer: number) =>
      `${blatt} ist in Rechnung ${String(nummer)} abgerechnet, fehlt aber hier. Abschlagsrechnungen sind kumuliert.`,
    'fruehere-nicht-freigegeben': (nummer: number) =>
      `Rechnung ${String(nummer)} ist nicht freigegeben; ihr Zahlbetrag fehlt in der Kette.`,
    'freigabe-reihenfolge': (nummer: number, offen: readonly number[]) =>
      `Rechnung ${String(nummer)} ist freigegeben, obwohl Rechnung ${nummern(offen)} offen ist.`,
    'schlussrechnung-nicht-letzte': (nummer: number) =>
      `Schlussrechnung ${String(nummer)} ist nicht die letzte Rechnung.`,
    'gefordert-abweichend': (feld: string, differenz: string) =>
      `${feld}: Gefordert weicht um ${differenz} € vom geprüften Betrag ab.`,
    ueberzahlung: (betrag: string) => `Überzahlung: Der Zahlbetrag ist negativ (${betrag} €).`,
    'freigabe-abweichend': (eingefroren: string, geprueft: string) =>
      `Freigegeben wurden ${eingefroren} €; heute ergibt die Prüfung ${geprueft} € (z. B. nach einer Aufmaßkorrektur). Es gilt der freigegebene Betrag.`,
    'zeile-zaehlt-nicht': (oz: string) =>
      `Aufmaßzeile zu ${oz} zählt nicht (keine abrechenbare Position oder keine Menge).`,
    'ohne-einheitspreis': (oz: string) => `${oz}: Position ohne Einheitspreis; sie zählt 0,00.`,
    'ohne-zuschlagssatz': (oz: string) => `${oz}: Zuschlagsposition ohne Satz; sie zählt 0,00.`,
    'nachlass-ohne-basis': 'Der absolute Nachlass hat keine Basis (Auftrags-LV netto 0,00); er zählt 0,00.',
    'netto-nach-nachlass-negativ': 'Das Netto nach Nachlass ist negativ.',
  },
  freigabe: {
    knopf: 'Freigeben',
    titel: (nummer: number) => `Rechnung ${String(nummer)} freigeben`,
    frage: (betrag: string) =>
      `Der Zahlbetrag von ${betrag} € wird eingefroren: Spätere Rechnungen ziehen genau diesen Betrag ab, auch wenn sich danach ein Aufmaß ändert. Ändern lässt sich die Rechnung erst wieder nach „Freigabe aufheben“.`,
    bestaetigen: 'Freigeben',
    abbrechen: 'Abbrechen',
    gesperrt: (offen: readonly number[]) =>
      `Erst Rechnung ${nummern(offen)} freigeben: Freigegeben wird in der Reihenfolge der Nummern.`,
    erfolgt: (nummer: number) => `Rechnung ${String(nummer)} freigegeben`,
    aufheben: 'Freigabe aufheben',
    aufhebenTitel: (nummer: number) => `Freigabe von Rechnung ${String(nummer)} aufheben`,
    aufhebenFrage:
      'Der eingefrorene Zahlbetrag wird verworfen; die Rechnung ist danach wieder offen und änderbar. Rückgängig stellt die Freigabe wieder her.',
    aufhebenBestaetigen: 'Freigabe aufheben',
    aufhebenGesperrt: (spaeter: readonly number[]) =>
      `Rechnung ${nummern(spaeter)} ist schon freigegeben und zieht diesen Zahlbetrag ab. Zuerst deren Freigabe aufheben.`,
    status: (betrag: string) => `Freigegeben mit ${betrag} €`,
    offen: 'Offen (nicht freigegeben)',
    konflikt:
      'Der Speicher hat die Änderung abgewiesen: Freigaben gehen nur in der Reihenfolge der Rechnungsnummern. Es wurde nichts geändert.',
  },
  aktionen: {
    bearbeiten: 'Angaben bearbeiten',
    loeschen: 'Rechnung löschen',
    loeschenTitel: (nummer: number) => `Rechnung ${String(nummer)} löschen`,
    loeschenFrage: 'Die Rechnung wird gelöscht. In dieser Sitzung holt „Rückgängig“ sie zurück.',
    loeschenBestaetigen: 'Endgültig löschen',
    gesperrtFreigegeben: 'Eine freigegebene Rechnung ändert sich erst nach „Freigabe aufheben“.',
  },
  xrechnung: {
    knopf: 'XRechnung einlesen',
    datei: 'XRechnung wählen',
    titel: 'XRechnung einlesen',
    nichtLesbar: 'XRechnung nicht lesbar',
    keineRechnung: 'Die Datei ließ sich nicht als XRechnung lesen.',
    vorschau: 'Vorschau der XRechnung',
    rechnungsnummer: 'Rechnungsnummer (BT-1)',
    datum: 'Rechnungsdatum (BT-2)',
    art: 'Rechnungsart (BT-3)',
    artUnbekannt: (code: string | null) => (code === null ? 'nicht angegeben' : `Code ${code}`),
    netto: 'Netto (BT-109)',
    umsatzsteuer: 'Umsatzsteuer (BT-110)',
    brutto: 'Brutto (BT-112)',
    zahlbetrag: 'Zahlbetrag (BT-115)',
    befunde: 'Befunde der Datei',
    artWaehlen: 'Als welche Rechnungsart übernehmen?',
    artFehlt: 'Bitte die Rechnungsart wählen.',
    ziel: 'Übernehmen in',
    neueRechnung: (nummer: number) => `Rechnung ${String(nummer)} anlegen`,
    vorhandene: (nummer: number) => `Rechnung ${String(nummer)} (offen)`,
    uebernimmt:
      'Übernommen werden Rechnungsnummer, Rechnungsdatum als Eingangsdatum, Art und die geforderten Beträge – ungeprüft, nur zum Vergleich.',
    schliessen: 'Schließen',
    uebernehmen: 'Übernehmen',
    erfolg: 'XRechnung übernommen',
    /** Kurztext je Befund beim Einlesen (ohne Codes, L5); die ausführliche Meldung steht in den Einzelheiten. */
    kurztexte: {
      'eingabe-zu-gross': 'Datei zu groß',
      'xml-doctype': 'Dokumenttyp-Angabe abgewiesen',
      'xml-entitaet': 'Unbekanntes Sonderzeichen',
      'xml-zu-tief': 'Zu tief verschachtelt',
      'xml-ungueltig': 'Kein lesbares XML',
      'keine-xrechnung': 'Keine XRechnung',
      'spezifikation-unbekannt': 'Spezifikation nicht erkannt',
      'pflichtangabe-fehlt': 'Pflichtangabe fehlt',
      'datum-ungueltig': 'Datum ungültig',
      'zahl-ungueltig': 'Zahl nicht lesbar',
      'betrag-nicht-kanonisch': 'Betrag gerundet',
      'menge-zu-viele-stellen': 'Menge mit mehr Nachkommastellen',
      'preis-zu-viele-stellen': 'Preis mit mehr Nachkommastellen',
      'satz-zu-viele-stellen': 'Steuersatz mit mehr Nachkommastellen',
      'waehrung-nicht-eur': 'Andere Währung als €',
      'unterposition-ohne-oberposition': 'Unterposition ohne Oberposition',
      'summe-positionen-falsch': 'Summe der Positionen stimmt nicht',
      'netto-falsch': 'Netto stimmt nicht',
      'brutto-falsch': 'Brutto stimmt nicht',
      'zahlbetrag-falsch': 'Zahlbetrag stimmt nicht',
      'umsatzsteuer-falsch': 'MwSt stimmt nicht',
    } satisfies Record<XRechnungBefundcode, string>,
  },
  meldung: {
    gespeichert: (nummer: number) => `Rechnung ${String(nummer)} gespeichert`,
    nichtGespeichert: 'Rechnung nicht gespeichert',
  },
} as const;
