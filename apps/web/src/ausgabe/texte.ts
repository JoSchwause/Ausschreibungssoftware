// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte von Drucken und Excel (Ticket 66, L1).

const zahl = (n: number, eins: string, viele: string): string => `${String(n)} ${n === 1 ? eins : viele}`;

export const texte = {
  pdf: {
    knopf: 'Als PDF',
    titel: 'LV als PDF ausgeben',
    preise: 'Inhalt',
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
    befundeKeine: 'Keine Befunde.',
    gruppeFehler: 'Fehler',
    gruppeWarnungen: 'Warnungen',
    ort: (zeile: number) => `Zeile ${String(zeile)}`,
  },
} as const;
