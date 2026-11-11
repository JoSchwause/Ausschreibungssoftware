// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Rechnungen (Ticket 88, L1). Keine Übersetzung in v1.

import type { Rechnungsart } from '@tethys/vertrag';

const rechnungen = (n: number): string => (n === 1 ? '1 Rechnung' : `${String(n)} Rechnungen`);

export const texte = {
  art: {
    abschlag: 'Abschlagsrechnung',
    schluss: 'Schlussrechnung',
  } satisfies Record<Rechnungsart, string>,
  artKurz: {
    abschlag: 'AR',
    schluss: 'SR',
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
    umlageSatz: (i: number) => `Satz der Umlage ${String(i + 1)} in %`,
    sicherheitSatz: 'Sicherheitseinbehalt in %',
    gewaehrleistungSatz: 'Gewährleistungseinbehalt in %',
  },
  formular: {
    datumHinweis: 'TT.MM.JJJJ',
    satzFehlt: 'Bitte einen Satz angeben oder die Umlage entfernen.',
    umlageHinzufuegen: 'Umlage hinzufügen',
    umlageEntfernen: (i: number) => `Umlage ${String(i + 1)} entfernen`,
    keineBlaetter: 'Zu diesem Auftrags-LV gibt es noch kein Aufmaßblatt.',
    blatt: (nummer: number, bezeichnung: string) =>
      bezeichnung === '' ? `Blatt ${String(nummer)}` : `Blatt ${String(nummer)} – ${bezeichnung}`,
    hinweisKumuliert:
      'Eine Abschlagsrechnung rechnet die ganze bis dahin aufgemessene Leistung ab; früher gezahlte Beträge werden abgezogen.',
    hinweisEinbehalt:
      'Der Sicherheitseinbehalt gilt in Abschlagsrechnungen, der Gewährleistungseinbehalt in der Schlussrechnung.',
  },
  meldung: {
    unlesbar: 'Bitte die markierten Felder prüfen.',
    gespeichert: (nummer: number) => `Rechnung ${String(nummer)} gespeichert`,
    nichtGespeichert: 'Rechnung nicht gespeichert',
    anzahl: rechnungen,
  },
} as const;
