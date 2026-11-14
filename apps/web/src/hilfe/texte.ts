// SPDX-License-Identifier: AGPL-3.0-or-later
// Texte der Hilfe, des ersten Starts und des Beispielprojekts (Ticket 147; L1, L4, L5): unpersönlich, ohne Ticketnummern,
// ohne Kennungen aus dem Code und ohne Paketnamen. Die Hilfe beschreibt die App in eigenen Worten, ohne Namen oder Abläufe
// eines anderen AVA-Programms (L3, C1). Die Seite „Annahmen“ gibt die Annahmen der Entwicklung für diese Version in
// einfachen Sätzen wieder (G-62, `umfang-welle-7.md` §5); ändert sich eine Annahme, ändert sich dieser Text mit.

import type { Gridart } from '@tethys/ui-grid';

/** Ein Abschnitt der Seite „Annahmen“. */
export interface Annahmenabschnitt {
  readonly titel: string;
  readonly saetze: readonly string[];
  /** Eine Reihenfolge, als nummerierte Liste gezeigt (die Abzugskette der Rechnungsprüfung). */
  readonly kette?: readonly string[];
}

const ANNAHMEN: readonly Annahmenabschnitt[] = [
  {
    titel: 'Preisspiegel',
    saetze: [
      'Min, Mittel und Max je Position bilden nur Bieter mit einem Einheitspreis über 0,00. Ein Preis von 0,00 und „nicht angeboten“ bekommen je ein eigenes Kennzeichen und gelten nie als Ausreißer; ein negativer Preis zählt dort ebenfalls nicht.',
      'Ausreißer vergleichen den Einheitspreis (EP), nicht den Gesamtpreis: Ein Ausreißer weicht um mehr als 20 % vom Mittel der Einheitspreise ab; die Schwelle lässt sich einstellen. Haben weniger als zwei Bieter einen Preis über 0,00, wird nichts markiert. Bei einer Zuschlagsposition werden die Beträge verglichen.',
      'ABC-Klassen: Die Positionen werden absteigend nach Gesamtpreis sortiert. Bis 80 % der Summe gehören zur Klasse A, bis 95 % zur Klasse B, der Rest zur Klasse C; die Position, mit der die Summe eine Schwelle überschreitet, zählt noch zur Klasse davor. Bezug der ABC-Klasse ist das Mittel der Bieter; in den Einstellungen des Preisspiegels lässt er sich auf den Schätzpreis umschalten.',
      'Jedes Angebot hat höchstens einen Nachlass, prozentual oder als Betrag, auf das ganze Angebot; den Nachlass des LV erbt es nicht. Der Rang folgt dem Netto nach Nachlass; gleiche Beträge haben gleichen Rang.',
    ],
  },
  {
    titel: 'Zuschlag',
    saetze: [
      'Das Auftrags-LV enthält nur das Beauftragte. Eine gewählte Wahlposition wird zur normalen Position; ihre Grundposition und die übrigen Alternativen entfallen. Ohne Wahl bleibt die Grundposition, und die Alternativen entfallen.',
      'Bedarfspositionen bleiben Bedarfspositionen. Positionen, die der Bieter nicht angeboten hat, stehen ohne Einheitspreis im Auftrags-LV; der Dialog nennt sie vor dem Bestätigen.',
      'Es gelten die Preise, die Zuschlagssätze und der Nachlass des Angebots sowie der MwSt-Satz des LV. Name und Anschrift des Bieters werden als Auftragnehmer übernommen.',
      'Je LV gibt es höchstens einen Zuschlag. Das Ausschreibungs-LV bleibt dabei unverändert.',
    ],
  },
  {
    titel: 'Nachtrag',
    saetze: [
      'Ein Nachtrag ist ein eigenes LV mit Nummer und Status: angemeldet, angeboten, beauftragt oder abgelehnt. Das Nachtragsangebot ist ein Angebot des Auftragnehmers zu diesem LV.',
      'Mit dem Beauftragen hängt die App den Nachtrag als eigene Gliederung an das Auftrags-LV an (zum Beispiel „Nachtrag N01“); die Positionen tragen die Preise aus dem Nachtragsangebot.',
      'Es gilt der Nachlass des Hauptauftrags; ein Nachlass im Nachtragsangebot wird nicht übernommen. Ein anderer MwSt-Satz als im Auftrags-LV ist nicht möglich.',
      'Ein Nachtrag, der nicht beauftragt ist, geht in keine Rechnung ein.',
    ],
  },
  {
    titel: 'Soll/Ist',
    saetze: [
      'Soll/Ist vergleicht die aufgemessene Menge mit der Menge im LV nach VOB/B § 2 Abs. 3. Ein Befund erscheint, wenn die Menge 110 % übersteigt; unter 90 % erst, wenn eine Schlussrechnung vorliegt, weil vorher noch Mengen fehlen können.',
      'Beide Schwellen lassen sich einstellen. Positionen ohne Menge, mit der Menge 0 oder pauschal werden nicht verglichen.',
    ],
  },
  {
    titel: 'Rechnungsprüfung',
    saetze: [
      'Abschlagsrechnungen sind kumuliert: Jede Rechnung rechnet alle Aufmaßblätter bis dahin ab und zieht die Zahlbeträge der früheren Rechnungen ab. Jeder Schritt der Abzugskette wird auf 2 Nachkommastellen gerundet, in dieser Reihenfolge:',
      'Mit der Freigabe wird der Zahlbetrag eingefroren: Spätere Rechnungen ziehen ihn ab, auch wenn sich danach ein Aufmaß ändert. Freigegeben wird der Reihe nach.',
      'Die Vertragsstrafe wird wie die Leistung kumuliert eingetragen: An jeder Rechnung steht die Summe aller Vertragsstrafen bis dahin, nicht nur die neue. Eine neue Rechnung bekommt die Vertragsstrafe der vorigen Rechnung vorgeschlagen; kommt eine Strafe hinzu, wird sie zu diesem Betrag addiert. Wer nur die neue Strafe einträgt, zieht zu wenig ab: Die früheren Strafen würden mit dieser Rechnung wieder ausgezahlt.',
      'Skonto: Satz und Frist in Kalendertagen stehen an der Rechnung. Die Frist beginnt mit dem Eingang der Rechnung; der Eingangstag zählt nicht mit, ein Wochenende verschiebt das Fristende nicht. Ohne Eingangsdatum gibt es kein Skonto.',
      'Skonto gilt, wenn bis zum Fristende mindestens die Auszahlung im Skontofall gezahlt ist. Die Prüfung zeigt beide Fälle: bei Zahlung in der Frist und danach.',
      'Bauabzugsteuer nach § 48 EStG: an der Rechnung einzuschalten, sonst aus. Die App rechnet 15 % auf den Zahlbetrag nach Skonto, weist den Betrag als „an das Finanzamt“ aus und mindert damit nur die Auszahlung.',
      'Unsicher: Nach § 48 EStG zählen auch Aufrechnungen zur Gegenleistung. Die App lässt Umlagen und Vertragsstrafe aus der Bemessung heraus; die Steuer kann deshalb zu niedrig ausfallen. Im Zweifel mit der Steuerberatung klären.',
      'Zahlungen gibt es nur auf freigegebene Rechnungen. Offen ist der Zahlbetrag abzüglich Skonto, Bauabzugsteuer und der Zahlungen. Solange Zahlungen bestehen, lässt sich die Freigabe nicht aufheben.',
    ],
    kette: [
      'Leistung: die Mengen aller Aufmaßblätter bis zu dieser Rechnung mal den Einheitspreisen des Auftrags-LV',
      'Nachlass des Auftrags: prozentual auf die Leistung; ein Betrag in Abschlagsrechnungen anteilig, in der Schlussrechnung ganz',
      'Netto nach Nachlass',
      'MwSt auf das Netto nach Nachlass',
      'Brutto kumuliert',
      'Umlagen: jede mit ihrem Satz auf das Brutto kumuliert, nicht aufeinander gerechnet',
      'Vertragsstrafe: ein fester Bruttobetrag mit Grund, kumuliert bis zu dieser Rechnung, ohne Wirkung auf die MwSt',
      'Einbehalt: Sicherheit in Abschlagsrechnungen, Gewährleistung in der Schlussrechnung, auf das Brutto kumuliert',
      'Frühere Zahlbeträge: die eingefrorenen Zahlbeträge der früheren Rechnungen',
      'Zahlbetrag: was die Rechnung jetzt fordern darf',
      'Skonto auf den Zahlbetrag, wenn in der Frist gezahlt wird',
      'Bauabzugsteuer: 15 % an das Finanzamt, wenn an der Rechnung eingeschaltet',
      'Auszahlung an den Auftragnehmer',
    ],
  },
  {
    titel: 'Kostenkontrolle',
    saetze: [
      'Die Kostenkontrolle rechnet netto. Je Kostengruppe stehen Budget (aus einer Kostenermittlung), Vergabe (aus dem Auftrags-LV) und Abrechnung (aus der Rechnung mit der höchsten Nummer) nebeneinander.',
      'Der Nachlass steht als eigene Zeile und wird nicht auf die Kostengruppen verteilt; so gehen die Zeilen auf den Cent auf. Positionen ohne Kostengruppe stehen in der Zeile „ohne Kostengruppe“.',
      'Jede Position trägt höchstens eine Kostengruppe. Umlagen, Einbehalte und MwSt gehören nicht zur Kostenkontrolle.',
      'Die Bezeichnungen der Kostengruppen liegen der App nicht bei; sie werden als CSV-Datei eingelesen.',
    ],
  },
  {
    titel: 'Rundung',
    saetze: [
      'Gerundet wird kaufmännisch: ab der Ziffer 5 auf, sonst ab. Negative Werte werden nach ihrem Betrag gerundet, das Vorzeichen bleibt: −2,5 wird −3.',
      'Nachkommastellen: Einheitspreis 3, Menge 3, Prozent 2, Betrag 2.',
      'Der Gesamtpreis ist Menge mal Einheitspreis, auf 2 Stellen gerundet; Summen sind Summen der gerundeten Gesamtpreise.',
      'Der Nachlass gilt für das ganze LV, prozentual oder als Betrag. Er wird auf 2 Stellen gerundet, abgezogen und nicht auf die Einheitspreise umgelegt.',
      'Die MwSt wird auf das Netto nach Nachlass gerechnet, nicht je Position; jedes LV hat einen MwSt-Satz.',
    ],
  },
  {
    titel: 'Mengenermittlung',
    saetze: [
      'Gerechnet wird der freie Rechenansatz (Formel 91): ein Ausdruck mit den Grundrechenarten und Klammern, Punkt vor Strich. Andere Formelnummern rechnet die App nicht; solche Zeilen zeigen einen Fehler und zählen nicht.',
      'Zahlen stehen mit Dezimalkomma und ohne Tausenderpunkt. Ein Punkt in einer Zahl ist ein Fehler, denn die App rät nicht, was gemeint ist.',
      '„Z3“ steht für das Ergebnis der Zeile 3. Eine Zeile kann einen Namen tragen, mit dem spätere Zeilen rechnen.',
      'Jedes Zeilenergebnis wird auf 3 Nachkommastellen gerundet; die Menge ist die Summe der gerundeten Zeilen. Eine fehlerhafte Zeile macht die Summe ungültig, keine Zeile wird still übergangen. Eine Division rechnet mit 10 Nachkommastellen weiter.',
    ],
  },
  {
    titel: 'Honorar (Vorschau)',
    saetze: [
      'Grundlage ist die HOAI 2021 mit den Honorartafeln für Gebäude und Innenräume, Freianlagen, Ingenieurbauwerke, Verkehrsanlagen, Tragwerksplanung und Technische Ausrüstung. Zwischen zwei Tafelzeilen wird linear interpoliert; außerhalb der Tafel rechnet die App nicht, sondern zeigt einen Befund.',
      'Die HOAI regelt keine Rundung. Die App rundet die Tafelwerte, das Honorar, jede Leistungsphase, den Umbauzuschlag, die Nebenkosten und die MwSt je auf 2 Nachkommastellen.',
      'Der Honorarsatz steht in Prozent der Spanne zwischen Basishonorarsatz und oberem Honorarsatz; 0 ist der Basishonorarsatz.',
      'Anrechenbare Kosten bei Gebäuden nach § 33: die Kostengruppe 300 voll; die Kostengruppe 400, wenn der Auftragnehmer sie nicht plant oder überwacht, bis 25 % der sonstigen anrechenbaren Kosten voll und darüber zur Hälfte. Grundlage ist die Kostenberechnung, ohne sie die Kostenschätzung.',
      'Die Tafelwerte sind nicht gegen die amtliche Fassung geprüft. Ergebnisse vor der Verwendung mit der HOAI vergleichen.',
    ],
  },
  {
    titel: 'Was nicht übernommen wird',
    saetze: [
      'Beim Einlesen von GAEB-Dateien haben Nachlässe an einzelnen Positionen oder Titeln, Pauschalen an Titeln oder am LV, als „entfällt“ gekennzeichnete Positionen, Wahl-Titel und abweichende MwSt-Sätze keinen Platz im Datenmodell. Die App meldet sie beim Einlesen als Befund; die Summen weichen dann von der Datei ab, und der Befund sagt das.',
      'Aus Angeboten (X84) werden der Nachlass je Position oder Titel und die Textergänzungen der Bieter gemeldet, aber nicht übernommen. Nebenangebote (X85) liest die App nicht.',
      'Eine Vergabe nach Losen oder an mehrere Bieter gibt es nicht: Je LV geht der Zuschlag an einen Bieter. Ebenso fehlen mehrere Kostengruppen je Position und eine Prognose in der Kostenkontrolle.',
      'Nicht in dieser Version: Leistungsverzeichnisse aus beliebigen Tabellen einlesen, Anschreiben und Auftragsschreiben, ZUGFeRD lesen sowie XRechnung und ZUGFeRD erzeugen (XRechnung wird gelesen), Abschlagszahlungen auf noch nicht beauftragte Nachträge nach § 650c Abs. 3 BGB, Mengenermittlung im Format DA11 und barrierefreie PDF-Dateien.',
      'In den Vorschau-Modulen fehlen Fotos an Mängeln, BCF, IFC 4.3, der Austausch von Terminplänen mit anderen Programmen und die besonderen Leistungen der HOAI.',
      'Ebenso fehlen Textkataloge mit Standardtexten, mehrere Nutzer an einem Projekt mit Abgleich über einen Server, die Bedienung auf dem Tablet und das Ziehen mit der Maus in den Tabellen.',
    ],
  },
];

/** Wo ein Tastenkürzel gilt, in Worten (Spalte „Gilt in“). */
const GILT: Readonly<Record<Gridart | 'alle', string>> = {
  alle: 'allen Tabellen',
  lv: 'Leistungsverzeichnis',
  vergleich: 'Vergleichstabellen',
};

export const texte = {
  titel: 'Hilfe',
  /** Die Reiter der Hilfeseite (Reihenfolge und Anker in `pfad.ts`). */
  reiter: {
    name: 'Teile der Hilfe',
    'erste-schritte': 'Erste Schritte',
    daten: 'Daten und Sicherung',
    tastenkuerzel: 'Tastenkürzel',
    annahmen: 'Annahmen',
    ueber: 'Über',
  },
  ersteSchritte: {
    einleitung:
      'Der Weg eines Projekts von der GAEB-Datei bis zur geprüften Rechnung. Jeder Schritt wird sofort gespeichert; „Rückgängig“ nimmt den letzten Schritt der Sitzung zurück.',
    schritte: [
      {
        titel: 'Projekt anlegen',
        text: 'Auf der Seite „Projekte“ ein Projekt mit Name und Bauherr anlegen, mit einer GAEB-Datei beginnen oder das Beispielprojekt laden.',
      },
      {
        titel: 'Leistungsverzeichnis einlesen oder erfassen',
        text: 'Auf der Projektseite „GAEB einlesen“ wählen: Die Vorschau zeigt Gliederungen, Positionen und alles, was nicht übernommen wird. Oder ein leeres LV anlegen und die Positionen im Grid erfassen; Zeilen aus einer Tabellenkalkulation lassen sich einfügen.',
      },
      {
        titel: 'Prüfen und ausgeben',
        text: 'Die Prüfung des LV zeigt fehlende Angaben mit einem Sprung an die Stelle; sie sperrt nie die Eingabe. „GAEB ausgeben“ schreibt die Datei für die Bieter, „Als PDF“ druckt das LV.',
      },
      {
        titel: 'Angebote einlesen',
        text: 'Die Angebote der Bieter als X84 über „Angebot einlesen“ auf der Seite des LV übernehmen.',
      },
      {
        titel: 'Preisspiegel',
        text: 'Der Preisspiegel stellt die Angebote nebeneinander: Rang, Min, Mittel und Max je Position, Ausreißer und ABC-Klassen.',
      },
      {
        titel: 'Zuschlag erteilen',
        text: 'In der Bieterübersicht des Preisspiegels den Zuschlag erteilen. Daraus entsteht das Auftrags-LV mit den Preisen des Bieters.',
      },
      {
        titel: 'Nachträge',
        text: 'Auf der Seite des Auftrags-LV einen Nachtrag anlegen, sein Angebot einlesen und ihn beauftragen.',
      },
      {
        titel: 'Aufmaß',
        text: 'Unter „Aufmaß“ Aufmaßblätter zum Auftrags-LV anlegen und die Mengen eintragen, direkt oder als Rechenansatz. Soll/Ist vergleicht sie mit den Mengen des LV.',
      },
      {
        titel: 'Rechnung prüfen',
        text: 'Unter „Rechnungen“ eine Rechnung anlegen, ihre Aufmaßblätter wählen, die Abzugskette prüfen und den Zahlbetrag freigeben.',
      },
      {
        titel: 'Kosten',
        text: 'Unter „Kosten“ Kostenermittlungen anlegen; die Kostenkontrolle stellt Budget, Vergabe und Abrechnung je Kostengruppe gegenüber.',
      },
      {
        titel: 'Sichern',
        text: 'Regelmäßig „Projektdatei sichern“ auf der Projektseite wählen. Mehr dazu unter „Daten und Sicherung“.',
      },
    ],
  },
  daten: {
    abschnitte: [
      {
        titel: 'Wo die Daten liegen',
        saetze: [
          'Tethys AVA läuft ganz im Browser. Die Projekte liegen in einer Datenbank des Browsers auf diesem Gerät, nicht auf einem Server; ausgetauscht wird nur über Dateien.',
          'Ein anderer Browser, ein anderes Gerät oder ein privates Fenster sieht die Projekte nicht. Wer im Browser die Daten der Website löscht, löscht auch die Projekte.',
          'Jede Änderung wird sofort gespeichert. „Rückgängig“ und „Wiederholen“ gelten für die laufende Sitzung.',
        ],
      },
      {
        titel: 'Dauerhafter Speicher',
        saetze: [
          'Die Statuszeile unten zeigt, ob der Browser die Daten dauerhaft hält. „Nicht dauerhaft“ heißt: Bei knappem Speicherplatz darf der Browser die Daten von sich aus löschen.',
          'Die App bittet den Browser um dauerhaften Speicher. Ob er zustimmt, entscheidet der Browser; eine installierte App oder ein Lesezeichen machen es wahrscheinlicher.',
          'In beiden Fällen gilt: Nur eine Sicherung als Datei schützt vor dem Verlust des Geräts oder des Browsers.',
        ],
      },
      {
        titel: 'Sichern',
        saetze: [
          '„Projektdatei sichern“ auf der Projektseite legt das ganze Projekt als eine Datei ab: Leistungsverzeichnisse, Angebote, Aufträge, Aufmaß, Rechnungen, Kosten, Modelle und das Befehlsprotokoll.',
          '„Sicherung“ auf der Projektliste wählt einen Ordner auf dem Gerät. Dorthin sichert „Jetzt sichern“, und auf Wunsch sichert die App selbst nach jedem 20. Befehl und beim Verlassen der Seite.',
          'Die Projektliste erinnert an Projekte, die länger nicht gesichert wurden. Die Statuszeile zeigt die letzte Sicherung.',
        ],
      },
      {
        titel: 'Wiederherstellen',
        saetze: [
          '„Projektdatei einlesen“ auf der Projektliste holt ein gesichertes Projekt zurück, auch in einem anderen Browser oder auf einem anderen Gerät. Ältere Projektdateien lassen sich weiter einlesen.',
        ],
      },
    ],
  },
  kuerzel: {
    einleitung:
      'Die Tabellen lassen sich ganz mit der Tastatur bedienen. Die Kürzel gelten, sobald eine Zelle der Tabelle den Fokus hat. Auf dem Mac gilt die Befehlstaste statt Strg.',
    tabelle: (bereich: string): string => `Tastenkürzel: ${bereich}`,
    taste: 'Taste',
    wirkung: 'Wirkung',
    gilt: 'Gilt in',
    giltIn: (g: Gridart | 'alle'): string => GILT[g],
  },
  annahmen: {
    einleitung:
      'Wo Regeln, Normen oder Dateien eine Frage offen lassen, hat die Entwicklung eine Annahme getroffen. Die Annahmen gelten für diese Version und werden im Probebetrieb mit einem Planungsbüro geprüft. Die wichtigsten in einfachen Sätzen:',
    abschnitte: ANNAHMEN,
  },
  ueber: {
    produkt: 'Tethys AVA',
    beschreibung:
      'Freie Software für Ausschreibung, Vergabe und Abrechnung im Bauwesen. Sie läuft im Browser; die Daten bleiben auf dem Gerät.',
    version: 'Version',
    stand: 'Stand',
    standUnbekannt: 'unbekannt',
    standVom: (commit: string, datum: string): string => `${commit} vom ${datum}`,
    lizenz: 'Lizenz',
    lizenzName: 'GNU Affero General Public License, Version 3 oder später (AGPL-3.0-or-later)',
    lizenzText:
      'Tethys AVA darf genutzt, untersucht, geändert und weitergegeben werden. Wer eine geänderte Fassung anderen über ein Netz zur Nutzung anbietet, muss ihnen deren Quelltext zugänglich machen.',
    quelltext: 'Quelltext',
    quelltextAdresse: 'https://github.com/JoSchwause/Ausschreibungssoftware',
    browser: 'Geprüft in aktuellen Chromium-Browsern (Chrome, Edge); Firefox und Safari sind nicht geprüft.',
    gewaehr:
      'Ohne Gewähr: Die Berechnungen folgen den Annahmen der Entwicklung (siehe „Annahmen“) und sind fachlich noch nicht von einem Büro geprüft.',
  },
  start: {
    titel: 'Willkommen bei Tethys AVA',
    text: 'Tethys AVA erstellt Leistungsverzeichnisse, vergleicht Angebote und rechnet Aufträge ab: vom GAEB-LV über Preisspiegel und Zuschlag bis zur geprüften Rechnung.',
    wege: 'Drei Wege für den Anfang',
    beispiel: {
      titel: 'Beispielprojekt ansehen',
      text: 'Ein fertiges Projekt zum Ausprobieren: ein LV mit drei Angeboten, der Zuschlag, ein Aufmaßblatt, eine Rechnung und ein Gebäudemodell. Alle Angaben sind erfunden.',
      knopf: 'Beispielprojekt laden',
      laedt: 'Das Beispielprojekt wird angelegt …',
      erfolg: 'Beispielprojekt angelegt',
      erfolgText: '„Rückgängig“ nimmt es in dieser Sitzung wieder ganz zurück.',
      fehler: 'Beispielprojekt nicht vollständig angelegt',
      nichtLesbar: 'Die Daten des Beispielprojekts ließen sich nicht laden. Bitte die Seite neu laden.',
    },
    gaeb: {
      titel: 'Mit einer GAEB-Datei beginnen',
      text: 'Ein Leistungsverzeichnis als GAEB-Datei einlesen, etwa X81 oder X83. Dafür legt die App ein neues Projekt an.',
    },
    leer: {
      titel: 'Leeres Projekt anlegen',
      text: 'Mit Name und Bauherr beginnen und das Leistungsverzeichnis selbst erfassen.',
    },
  },
  datenhinweis: {
    titel: 'Wo die Daten liegen',
    text: 'Die Projekte liegen nur in diesem Browser auf diesem Gerät, nicht auf einem Server. Wer die Daten der Website im Browser löscht, löscht auch die Projekte.',
    sichern:
      'Gesichert wird mit „Projektdatei sichern“ auf der Projektseite oder über „Sicherung“ hier mit einem Ordner, in den die App selbst sichert. „Projektdatei einlesen“ holt ein Projekt zurück.',
    mehr: 'Mehr zu Daten und Sicherung',
    ausblenden: 'Hinweis ausblenden',
  },
  beispiel: {
    projektname: 'Beispielprojekt Musterhaus',
    bauherr: 'Bauherr (erfunden)',
  },
} as const;
