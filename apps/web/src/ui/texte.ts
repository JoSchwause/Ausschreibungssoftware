// SPDX-License-Identifier: AGPL-3.0-or-later
// Alle Oberflächentexte der App-Hülle und der Katalogseite (L1, U8): deutsch, in einer Datei,
// keine Übersetzung in v1. Fachseiten bekommen später eigene Textdateien.

export const texte = {
  produkt: 'Tethys AVA',
  huelle: {
    navigation: 'Hauptnavigation',
    arbeitsflaeche: 'Arbeitsfläche',
    eintraege: {
      projekt: 'Projekt',
      lv: 'LV',
      vergabe: 'Vergabe',
      katalog: 'Katalog',
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
  seiten: {
    projekt: {
      titel: 'Projekt',
      leer: 'Noch keine Projekte.',
      hinweis: 'Hier entsteht die Projektübersicht mit Name und Bauherr.',
    },
    lv: {
      titel: 'Leistungsverzeichnis',
      leer: 'Noch kein Leistungsverzeichnis geöffnet.',
      hinweis: 'Hier entsteht die Tabelle mit Gliederung und Positionen.',
    },
    vergabe: {
      titel: 'Vergabe',
      leer: 'Noch keine Angebote erfasst.',
      hinweis: 'Hier entstehen Angebotserfassung und Preisspiegel.',
    },
    unbekannt: {
      titel: 'Seite nicht gefunden',
      text: 'Diese Adresse gibt es nicht.',
      zurueck: 'Zum Projekt',
    },
  },
} as const;
