// SPDX-License-Identifier: AGPL-3.0-or-later
// Deutsche Texte der GAEB-Wege (Ticket 49, L1).

import type { GaebPhase, GaebVersion } from '@tethys/vertrag';

const zahl = (n: number, eins: string, viele: string): string =>
  `${n.toLocaleString('de-DE')} ${n === 1 ? eins : viele}`;

export const texte = {
  befunde: {
    keine: 'Keine Befunde.',
    gruppeFehler: 'Fehler',
    gruppeWarnungen: 'Warnungen',
    liste: 'Befunde der Datei',
    ort: (zeile: number) => `Zeile ${zeile.toLocaleString('de-DE')}`,
    // „Befunde beim Einlesen“: Zusammenfassung, Gruppen, Einzelheiten
    anzahl: (fehler: number, warnungen: number) =>
      [
        fehler > 0 ? zahl(fehler, 'Fehler', 'Fehler') : null,
        warnungen > 0 ? zahl(warnungen, 'Warnung', 'Warnungen') : null,
      ]
        .filter((t) => t !== null)
        .join(', '),
    nichtUebernommen: 'Nicht übernommen',
    fehler: 'Fehler',
    warnung: 'Warnung',
    vorkommen: (n: number) => `${n.toLocaleString('de-DE')} Vorkommen`,
    oz: (oz: readonly string[]) => `OZ ${oz.join(', ')}`,
    einzelheiten: (n: number) => `Einzelheiten (${n.toLocaleString('de-DE')})`,
    einzelheitenListe: 'Einzelheiten der Befunde',
    zusammenfassung: 'Weitere Befunde',
    /** Namen der Werte, wenn ein Befund mehrere Zahlen trägt. */
    wertnamen: {
      datei: 'Datei',
      gerechnet: 'gerechnet',
      satz: 'Satz',
      satzLv: 'Satz des Leistungsverzeichnisses',
      bietermenge: 'Bieter',
      lvMenge: 'Leistungsverzeichnis',
      nachlass: 'Nachlass',
      pauschalsumme: 'Pauschalsumme',
    } as Readonly<Record<string, string>>,
  },
  einlesen: {
    knopf: 'GAEB einlesen',
    knopfOhneProjekt: 'GAEB-Datei einlesen',
    titel: 'GAEB-Datei einlesen',
    neuesProjekt: 'Neues Projekt',
    projektname: 'Name des Projekts',
    bauherr: 'Bauherr',
    neuesProjektHinweis:
      'Übernehmen legt ein Projekt mit diesem Namen an und liest das Leistungsverzeichnis hinein.',
    bauherrHinweis: 'Vorschlag aus dem Auftraggeber der Datei; später änderbar.',
    erfolgProjekt: 'Projekt angelegt',
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
    bieterVorhanden:
      'Ein Bieter dieses Namens ist schon im Projekt; seine Angaben bleiben unverändert, die Angaben der Datei werden nicht übernommen.',
    angaben: 'Angaben zum Bieter aus der Datei',
    anschrift: 'Anschrift',
    ansprechperson: 'Ansprechperson',
    telefon: 'Telefon',
    email: 'E-Mail',
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
      `Erwartet wird eine Angebotsabgabe (X84) im Format GAEB DA XML 3.1, 3.2 oder 3.3; ${
        phase === null
          ? 'die Austauschphase der Datei ist nicht erkennbar'
          : `die Datei gehört zur Phase ${phase}${version === null ? '' : ` (Version ${version})`}`
      }.`,
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
