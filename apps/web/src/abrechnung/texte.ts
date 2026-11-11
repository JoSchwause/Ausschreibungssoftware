// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Abrechnung: Aufmaßblätter, Soll/Ist, X31 (Ticket 87, L1).

import type { Aufmassbefund } from '@tethys/abrechnung';

const positionen = (n: number): string => (n === 1 ? '1 Position' : `${String(n)} Positionen`);

export const texte = {
  seitentitel: 'Abrechnung',
  laden: 'Aufmaß wird geladen …',
  nichtGefunden: 'Auftrags-LV nicht gefunden',
  blattFehlt: 'Aufmaßblatt nicht gefunden',
  blattFehltText:
    'Das Blatt gibt es nicht (mehr). Rückgängig oder Wiederholen kann es zurückholen; die Liste zeigt alle Blätter.',
  zumAuftrag: 'Zum Auftrags-LV',
  zurListe: 'Zu den Aufmaßblättern',
  werkzeuge: 'Werkzeuge des Aufmaßes',
  liste: {
    titel: (name: string) => `Aufmaß – ${name}`,
    tabelle: 'Aufmaßblätter',
    nummer: 'Nr.',
    bezeichnung: 'Bezeichnung',
    datum: 'Datum',
    positionen: 'Positionen',
    leer: 'Noch kein Aufmaßblatt. Mit „Neues Aufmaßblatt“ oder „X31 einlesen“ beginnen.',
    oeffnen: (nr: number) => `Blatt ${String(nr)} öffnen`,
    ohneBezeichnung: 'ohne Bezeichnung',
    neu: 'Neues Aufmaßblatt',
    sollIst: 'Soll/Ist',
  },
  kopf: {
    titelNeu: 'Neues Aufmaßblatt',
    titelAendern: 'Blattkopf',
    beschreibungNeu: (nr: number) =>
      `Das Blatt bekommt die Nummer ${String(nr)}. Bezeichnung und Datum lassen sich später ändern.`,
    nummer: 'Nummer',
    bezeichnung: 'Bezeichnung',
    datum: 'Datum (TT.MM.JJJJ)',
    datumHinweis: 'Tag des Aufmaßes; leer: keine Angabe.',
    anlegen: 'Blatt anlegen',
    uebernehmen: 'Übernehmen',
    abbrechen: 'Abbrechen',
    knopf: 'Blattkopf',
  },
  blatt: {
    titel: (nr: number, bezeichnung: string) =>
      bezeichnung === '' ? `Aufmaßblatt ${String(nr)}` : `Aufmaßblatt ${String(nr)} – ${bezeichnung}`,
    grid: 'Positionen des Aufmaßblatts',
    datum: (d: string) => `Datum ${d}`,
    ohneDatum: 'ohne Datum',
    mengenermittlung: 'Mengenermittlung',
    tasten: ['Strg', 'Alt', 'E'],
    tastenHinweis:
      'Enter, F2 oder Strg+Alt+E öffnen die Mengenermittlung der Zeile; dort auch eine Menge ohne Ansatz. Doppelklick ebenso.',
    keinePosition: 'Aufgemessen werden nur Positionen',
    keinePositionText: 'Bitte eine Position im Grid wählen.',
    zuschlagsposition: 'Zuschlagspositionen werden nicht aufgemessen',
    zuschlagspositionText: 'Ihr Betrag folgt aus den Bezugspositionen.',
    loeschen: 'Blatt löschen',
    loeschenFrage: (nr: number) =>
      `Aufmaßblatt ${String(nr)} mit allen Zeilen löschen? Rückgängig holt es in dieser Sitzung zurück.`,
    loeschenBestaetigen: 'Blatt löschen',
    abbrechen: 'Abbrechen',
    konflikt:
      'Der Speicher hat die Änderung abgewiesen. Steht das Blatt in einer Rechnung, lässt es sich nicht löschen; sonst bitte die Seite neu laden.',
    befunde: 'Befunde zum Blatt',
  },
  spalten: {
    oz: 'OZ',
    kurztext: 'Kurztext',
    einheit: 'Einheit',
    auftragsmenge: 'Auftragsmenge',
    blattmenge: 'Menge dieses Blatts',
    kumuliert: 'Kumuliert bis hier',
  },
  kennzeichen: {
    mengenansatz: { symbol: 'Σ', beschreibung: 'Menge aus Mengenansatz' },
    mengeFehlt: {
      symbol: '–',
      beschreibung: 'Keine Menge: Der Mengenansatz hat einen Fehler oder eine Zeile in der Textform aus X31',
    },
  },
  befund: (b: Aufmassbefund, oz: (id: string) => string): string => {
    switch (b.code) {
      case 'auftrags-lv-abweichend':
        return 'Das Blatt gehört zu einem anderen Auftrags-LV.';
      case 'position-unbekannt':
        return `Eine Zeile (${b.positionId}) nennt keine Position dieses Auftrags-LV; sie zählt nicht.`;
      case 'keine-position':
        return `${oz(b.positionId)}: keine Position; die Zeile zählt nicht.`;
      case 'zuschlagsposition':
        return `${oz(b.positionId)}: Zuschlagsposition, wird nicht aufgemessen; die Zeile zählt nicht.`;
      case 'ohne-einheitspreis':
        return `${oz(b.positionId)}: Die Position hat im Auftrags-LV keinen Einheitspreis.`;
      case 'menge-fehlt':
        return `${oz(b.positionId)}: keine Menge (Fehler im Mengenansatz); die Zeile zählt nicht.`;
    }
  },
  meldungen: {
    angelegt: (nr: number) => `Aufmaßblatt ${String(nr)} angelegt`,
    geloescht: (nr: number) => `Aufmaßblatt ${String(nr)} gelöscht`,
  },
  x31: {
    einlesen: 'X31 einlesen',
    dateiWaehlen: 'X31-Datei wählen',
    titel: 'Mengenermittlung (X31) einlesen',
    liest: 'Datei wird gelesen …',
    nichtLesbar: (datei: string) => `Die Datei ${datei} ließ sich nicht lesen.`,
    zusammenfassung: (n: number, nr: number) =>
      `${positionen(n)} mit Menge oder Mengenansatz; es entsteht Aufmaßblatt ${String(nr)}.`,
    ohneMenge: (n: number) =>
      n === 0 ? '' : `${positionen(n)} ohne Menge: Der Ansatz hat einen Fehler oder Zeilen in der Textform.`,
    nichtsZuUebernehmen:
      'Die Datei enthält keine Zeile zu einer Position dieses Auftrags-LV; es entsteht kein Blatt.',
    uebernehmen: 'Blatt anlegen',
    abbrechen: 'Abbrechen',
    ausgeben: 'Als X31 ausgeben',
    ausgabeTitel: 'Aufmaßblatt als GAEB X31 ausgeben',
    version: 'GAEB-Version',
    herunterladen: 'Herunterladen',
    schliessen: 'Schließen',
    ausgegeben: 'X31 ausgegeben',
  },
} as const;
