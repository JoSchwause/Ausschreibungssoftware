// SPDX-License-Identifier: AGPL-3.0-or-later
// Alle Oberflächentexte der App-Hülle, der Navigation und der Katalogseite (L1, U8): deutsch, in einer Datei,
// keine Übersetzung in v1. Fachseiten haben eigene Textdateien.

export const texte = {
  produkt: 'Tethys AVA',
  huelle: {
    navigation: 'Hauptnavigation',
    arbeitsflaeche: 'Arbeitsfläche',
    /** Name der Brotkrumen-Navigation in der Kopfzeile. */
    pfad: 'Pfad',
    /** Trennzeichen im Fenstertitel: „Seite – Projekt – Tethys AVA“. */
    titelTrenner: ' – ',
    eintraege: {
      projekte: 'Projekte',
      hilfe: 'Hilfe',
      katalog: 'Katalog',
      uebersicht: 'Übersicht',
      leistungsverzeichnisse: 'Leistungsverzeichnisse',
      vergabe: 'Vergabe',
      auftraege: 'Auftrags-LV',
      nachtraege: 'Nachträge',
      aufmass: 'Aufmaß',
      rechnungen: 'Rechnungen',
      kosten: 'Kosten',
      modelle: 'Modelle',
      bauzeit: 'Bauzeitenpläne',
      honorar: 'Honorar',
      maengel: 'Mängel',
      bautagebuch: 'Bautagebuch',
    },
    gruppen: {
      projekt: 'Projekt',
      auftraege: 'Aufträge',
      vorschau: 'Vorschau',
    },
    katalogHinweis: 'Entwicklung',
    katalogTitel: 'Bausteinkatalog',
    modus: {
      zuDunkel: 'Zum dunklen Modus wechseln',
      zuHell: 'Zum hellen Modus wechseln',
    },
    status: {
      bereit: 'Bereit',
      modusHell: 'Hell',
      modusDunkel: 'Dunkel',
    },
    zuSchmal: {
      titel: 'Fenster zu schmal.',
      text: 'Tethys AVA ist für Bildschirme ab 1280 Pixel Breite ausgelegt. Bitte das Fenster vergrößern.',
    },
  },
  /** Kennzeichen der Module, die noch eine Vorschau sind (G-60). */
  vorschau: {
    kennzeichen: 'Vorschau',
    hinweis: 'Noch nicht für den Einsatz in Projekten geprüft.',
    honorar: 'Die Tafelwerte sind nicht gegen die amtliche Fassung der HOAI geprüft.',
  },
  /** Namen der Gegenstände in den Brotkrumen, solange der Name noch lädt oder fehlt. */
  gegenstand: {
    projekt: 'Projekt',
    lv: 'Leistungsverzeichnis',
    lvStand: 'LV-Stand',
    auftragsLv: 'Auftrags-LV',
    aufmass: 'Aufmaßblatt',
    aufmassNummer: (nummer: number, bezeichnung: string): string =>
      bezeichnung === '' ? `Aufmaßblatt ${String(nummer)}` : `Aufmaßblatt ${String(nummer)} – ${bezeichnung}`,
    rechnung: 'Rechnung',
    rechnungNummer: (nummer: number): string => `Rechnung ${String(nummer)}`,
    kostenermittlung: 'Kostenermittlung',
    modell: 'Modell',
    bauzeitenplan: 'Bauzeitenplan',
    honorarberechnung: 'Honorarberechnung',
  },
  /** Namen der Seiten unterhalb eines Gegenstands. */
  seite: {
    uebersicht: 'Übersicht',
    preisspiegel: 'Preisspiegel',
    sollIst: 'Soll/Ist',
    kostenkontrolle: 'Kostenkontrolle',
    vergleich: 'Vergleich',
  },
  seiten: {
    unbekannt: {
      titel: 'Seite nicht gefunden',
      text: 'Diese Adresse gibt es nicht.',
      zurueck: 'Zur Projektliste',
    },
  },
} as const;
