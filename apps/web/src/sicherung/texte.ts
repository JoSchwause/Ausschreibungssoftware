// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der Datensicherung und der PWA-Hinweise (L1).

export const texte = {
  aktualisierung: {
    titel: 'Neue Version verfügbar',
    text: 'Neu laden, um die neue Version zu verwenden. Bis dahin arbeiten Sie weiter mit der alten.',
    neuLaden: 'Neu laden',
    spaeter: 'Später',
  },
  erinnerung: {
    bereich: 'Datensicherung',
    text: (name: string, tage: number): string =>
      `Projekt „${name}“: Die letzte Sicherung ist ${String(tage)} Tage her, seitdem gab es Änderungen.`,
    jetztSichern: 'Jetzt sichern',
    jetztSichernFuer: (name: string): string => `Jetzt sichern: ${name}`,
  },
  dialog: {
    knopf: 'Datensicherung',
    titel: 'Datensicherung',
    beschreibung:
      'Die Projekte liegen nur in diesem Browser. Sichern Sie sie regelmäßig als Projektdatei, am besten in einen Ordner.',
    ordnerTitel: 'Sicherungsordner',
    keinOrdner: 'Kein Ordner gewählt. „Jetzt sichern“ lädt die Projektdatei herunter.',
    ordnerGewaehlt: (name: string): string => `Ordner: ${name}`,
    ordnerWaehlen: 'Ordner wählen …',
    ordnerAendern: 'Anderen Ordner wählen …',
    ordnerEntfernen: 'Ordner entfernen',
    automatisch: 'Automatisch sichern (nach jedem 20. Befehl und beim Verlassen der Seite)',
    automatischOhneOrdner: 'Zum automatischen Sichern zuerst einen Ordner wählen.',
    schliessen: 'Schließen',
  },
  meldung: {
    gesichert: 'Projekt gesichert',
    gesichertInOrdner: (datei: string, ordner: string): string => `${datei} in ${ordner}`,
    ordnerFehler: 'Sicherung in den Ordner nicht möglich',
    ordnerRecht: 'Der Browser hat den Zugriff auf den Sicherungsordner nicht erlaubt.',
    ordnerWeg: 'Als Datei herunterladen',
    exportFehler: 'Sicherung nicht möglich',
  },
} as const;
