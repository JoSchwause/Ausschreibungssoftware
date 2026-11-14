// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte von Drucken und Excel (Ticket 66, L1).

const zahl = (n: number, eins: string, viele: string): string => `${String(n)} ${n === 1 ? eins : viele}`;

export const texte = {
  pdf: {
    knopf: 'Als PDF',
    titel: 'LV als PDF ausgeben',
    preise: 'Inhalt',
    profil: {
      auswahl: 'Druckprofil',
      langtext: 'Langtext',
      langtextVoll: 'vollständig',
      langtextKein: 'nur Kurztext',
      langtextZeilen: 'gekürzt auf die ersten Zeilen',
      zeilen: 'Zeilen',
      zeilenFehler: 'Bitte eine ganze Zahl von 1 bis 999 angeben.',
      titelsummen: 'Titelsummen',
      schlussblock: 'Schlussblock (Netto bis Brutto, Bedarf und Wahl)',
      deckblatt: 'Kopfblock mit Projekt, Bauherr und Auftraggeber',
      seitenrand: 'Seitenrand',
      randNormal: 'normal',
      randEng: 'eng',
      kopfzeile: 'Kopfzeile',
      fusszeile: 'Fußzeile',
      platzhalter: 'Platzhalter: {seite}, {seiten}, {datum}, {lv}. Leer: Vorgabe.',
      name: 'Name des Profils',
      speichern: 'Profil speichern',
      speichernUnter: 'Als neues Profil speichern',
      loeschen: 'Profil löschen',
      exportieren: 'Profil sichern',
      importieren: 'Profil einlesen',
      importDatei: 'Profil-Datei wählen',
      standardHinweis:
        'Standardprofile bleiben unverändert; „Als neues Profil speichern“ legt eine Kopie an.',
      geaendert:
        'Die Einstellungen weichen vom gewählten Profil ab (gelten für diesen Druck, solange nicht gespeichert).',
      gespeichert: (n: string) => `Profil „${n}“ gespeichert`,
      geloescht: (n: string) => `Profil „${n}“ gelöscht`,
      importiert: (n: string) => `Profil „${n}“ eingelesen`,
      umbenannt: (n: string) => `Der Name war vergeben; das Profil heißt jetzt „${n}“.`,
      nichtLesbar: 'Die Datei konnte nicht gelesen werden.',
      befunde: 'Befunde beim Lesen des Profils',
      loeschenTitel: 'Profil löschen?',
      loeschenFrage: (n: string) =>
        `Das Profil „${n}“ wird aus den Einstellungen entfernt. „Einstellung rückgängig“ holt es in dieser Sitzung zurück.`,
      loeschenBestaetigen: 'Profil löschen',
      zurueckgehalten: 'Nicht verwendete gespeicherte Profile',
      zurueckHinweis:
        'Diese Einträge aus dem Browserspeicher einer früheren Fassung wurden nicht in die Einstellungen übernommen. Sie bleiben dort unverändert; nichts wird verworfen.',
      zurueckNichtLesbar: (n: number) =>
        n === 1
          ? '1 Eintrag konnte nicht gelesen werden.'
          : `${String(n)} Einträge konnten nicht gelesen werden.`,
      zurueckSichern: 'Einträge als Datei sichern',
      zurueckEntfernen: 'Einträge entfernen',
      zurueckEntfernenTitel: 'Nicht verwendete Einträge entfernen?',
      zurueckEntfernenFrage: (n: number) =>
        `${String(n)} gespeicherte ${n === 1 ? 'Eintrag wird' : 'Einträge werden'} endgültig entfernt. Wer sie behalten will, sichert sie vorher als Datei.`,
      zurueckEntfernenBestaetigen: 'Endgültig entfernen',
      zurueckEntfernt: 'Nicht verwendete Einträge entfernt',
      zurueckGrund: {
        unlesbar: 'Ein gespeicherter Eintrag lässt sich nicht als Druckprofil lesen.',
        standardname: (n: string) => `Ein gespeichertes Profil heißt wie das Standardprofil „${n}“.`,
        doppelt: (n: string) => `Ein weiteres gespeichertes Profil heißt „${n}“.`,
      },
      fehler: {
        'name-leer': 'Bitte einen Namen angeben.',
        'name-standard': 'Der Name gehört einem Standardprofil.',
        'name-vergeben': 'Dieser Name ist schon vergeben.',
      },
    },
    mitPreisen: 'mit Preisen',
    ohnePreisen: 'ohne Preise (Blankett für Bieter)',
    datum: 'Datum im Kopf',
    datumFehler: 'Bitte ein gültiges Datum im Format TT.MM.JJJJ angeben.',
    erzeugen: 'PDF erzeugen',
    abbrechen: 'Abbrechen',
    schliessen: 'Schließen',
    schritt: {
      schriften: 'Schriften werden geladen …',
      setzen: 'Seiten werden gesetzt …',
    },
    dateiname: 'Dateiname',
    fertig: 'PDF erzeugt',
    abgebrochen: 'Das Erzeugen wurde abgebrochen.',
    fehler: 'Das PDF konnte nicht erzeugt werden.',
  },
  excel: {
    knopf: 'Excel für Bieter',
    titel: 'Excel für Bieter ausgeben',
    beschreibung:
      'Das Blankett enthält Positionen, Mengen und Einheiten; der Bieter trägt EP (und bei Zuschlagspositionen den Satz) ein.',
    dateiname: 'Dateiname',
    herunterladen: 'Herunterladen',
    schliessen: 'Schließen',
    erzeugt: 'Excel-Datei ausgegeben',
    keineBefunde: 'Beim Erzeugen gab es keine Befunde.',
    befundeHinweis: (n: number) =>
      `${zahl(n, 'Befund', 'Befunde')} beim Erzeugen. Die Datei wird trotzdem ausgegeben; der Inhalt steht gekürzt bzw. gerundet darin.`,
  },
  einlesen: {
    knopf: 'Excel einlesen',
    titel: 'Excel-Angebot einlesen',
    datei: 'Excel-Datei wählen',
    liest: 'Die Datei wird gelesen …',
    nichtLesbar: 'Die Datei konnte nicht gelesen werden.',
    vorschau: 'Vorschau des Excel-Angebots',
    positionen: 'Angebotspositionen',
    angeboten: 'davon angeboten',
    bieter: 'Bieter',
    bieterHinweis: 'Name aus dem Dateinamen; ändern, wenn nötig. Ein neuer Name legt einen neuen Bieter an.',
    bieterFehlt: 'Bitte einen Bieternamen angeben.',
    leer: 'In dieser Datei steht kein angebotener Preis. Es gibt nichts zu übernehmen.',
    uebernehmen: 'Übernehmen',
    schliessen: 'Schließen',
    erfolg: 'Angebot angelegt',
    befunde: 'Befunde der Excel-Datei',
  },
} as const;
