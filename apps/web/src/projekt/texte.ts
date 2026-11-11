// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Projektliste und der Projektseite (L1).

export const texte = {
  liste: {
    titel: 'Projekte',
    leer: 'Noch keine Projekte.',
    laden: 'Die Projekte werden geladen …',
    tabelle: 'Projekte',
    name: 'Name',
    oeffnen: 'Öffnen',
  },
  anlegen: {
    titel: 'Neues Projekt',
    name: 'Projektname',
    bauherr: 'Bauherr',
    knopf: 'Projekt anlegen',
    nameFehlt: 'Bitte einen Projektnamen eingeben.',
  },
  importieren: {
    knopf: 'Projektdatei importieren',
    erfolg: 'Projekt importiert',
    fehler: 'Import nicht möglich',
  },
  projekt: {
    laden: 'Das Projekt wird geladen …',
    nichtGefunden: 'Dieses Projekt gibt es nicht (mehr).',
    zurueck: 'Zur Projektliste',
    bauherr: 'Bauherr',
    stammdaten: 'Stammdaten',
    umbenennen: 'Projekt umbenennen',
    speichern: 'Speichern',
    abbrechen: 'Abbrechen',
    exportieren: 'Projektdatei exportieren',
    exportFehler: 'Export nicht möglich',
  },
  lvs: {
    titel: 'Leistungsverzeichnisse',
    leer: 'Noch keine Leistungsverzeichnisse.',
    tabelle: 'Leistungsverzeichnisse',
    name: 'Name',
    netto: 'Netto',
    umbenennen: 'Umbenennen',
    umbenennenTitel: 'Leistungsverzeichnis umbenennen',
    neuerName: 'Neuer Name',
  },
  lvAnlegen: {
    titel: 'Neues Leistungsverzeichnis',
    name: 'Name des LV',
    maske: 'OZ-Maske',
    maskeHinweis: 'N = Ziffer, A = Zeichen, . trennt die Stufen, [I] = Indexzeichen',
    mwst: 'MwSt-Satz',
    knopf: 'LV anlegen',
    nameFehlt: 'Bitte einen Namen eingeben.',
  },
} as const;
