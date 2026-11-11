// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der GAEB-Wege (Ticket 49, L1).

import type { GaebPhase, GaebVersion } from '@tethys/vertrag';

const zahl = (n: number, eins: string, viele: string): string => `${String(n)} ${n === 1 ? eins : viele}`;

export const texte = {
  befunde: {
    keine: 'Keine Befunde.',
    gruppeFehler: 'Fehler',
    gruppeWarnungen: 'Warnungen',
    liste: 'Befunde der Datei',
    ort: (zeile: number) => `Zeile ${String(zeile)}`,
  },
  einlesen: {
    knopf: 'GAEB einlesen',
    titel: 'GAEB-Datei einlesen',
    datei: 'GAEB-Datei wählen',
    liest: 'Die Datei wird gelesen …',
    uebernehmen: 'Übernehmen',
    schliessen: 'Schließen',
    phase: 'Phase',
    version: 'Version',
    gliederungen: 'Gliederungen',
    positionen: 'Positionen',
    hinweistexte: 'Hinweistexte',
    unbekannt: 'unbekannt',
    leer: 'In dieser Datei war kein Leistungsverzeichnis zu lesen. Es gibt nichts zu übernehmen.',
    erfolg: 'Leistungsverzeichnis angelegt',
    nichtLesbar: 'Die Datei konnte nicht gelesen werden.',
    vorschau: 'Vorschau der Datei',
  },
  ausgabe: {
    knopf: 'GAEB ausgeben',
    titel: 'GAEB-Datei ausgeben',
    phase: 'Phase',
    version: 'Version',
    herunterladen: 'Herunterladen',
    schliessen: 'Schließen',
    entwurfTitel: 'Entwurf',
    entwurfText: (n: number) =>
      `Die eigene Prüfung fand ${zahl(n, 'Fehler', 'Fehler')}. Die Datei wird trotzdem ausgegeben, ist aber ein Entwurf und trägt „_Entwurf“ im Namen.`,
    ohneFehler: 'Die eigene Prüfung fand keine Fehler.',
    dateiname: 'Dateiname',
    phasen: {
      X81: 'X81 Leistungsbeschreibung',
      X83: 'X83 Angebotsaufforderung',
      X86: 'X86 Auftragserteilung',
    },
    versionen: { '3.3': 'GAEB DA XML 3.3', '3.2': 'GAEB DA XML 3.2' },
    ausgegeben: 'Datei ausgegeben',
  },
  angebot: {
    knopf: 'Angebot einlesen',
    titel: 'Angebot (X84) einlesen',
    datei: 'Angebotsdatei wählen',
    bieter: 'Bieter',
    bieterHinweis: 'Name aus der Datei; ein Bieter dieses Namens im Projekt wird wiederverwendet.',
    bieterFehlt: 'Bitte einen Bieternamen eingeben.',
    uebernehmen: 'Übernehmen',
    schliessen: 'Schließen',
    leer: 'In dieser Datei war kein Angebot zu lesen. Es gibt nichts zu übernehmen.',
    positionen: 'Positionen im Angebot',
    phase: 'Phase',
    version: 'Version',
    erfolg: 'Angebot angelegt',
    liest: 'Die Datei wird gelesen …',
    keinX84: (phase: GaebPhase | null, version: GaebVersion | null) =>
      `Erwartet wird eine X84 in GAEB 3.3 oder 3.2; die Datei ist ${phase ?? 'unbekannt'} ${version ?? ''}.`.trim(),
  },
  liste: {
    knopf: (n: number) => `Angebote (${String(n)})`,
    titel: 'Angebote',
    tabelle: 'Angebote dieses Leistungsverzeichnisses',
    leer: 'Noch keine Angebote.',
    bieter: 'Bieter',
    netto: 'Netto',
    nettoNachNachlass: 'Netto nach Nachlass',
    brutto: 'Brutto',
    schliessen: 'Schließen',
  },
} as const;
