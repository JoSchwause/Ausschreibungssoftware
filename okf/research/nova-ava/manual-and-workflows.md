---
type: Research Note
title: "NOVA AVA: Funktionsweise laut Handbuch, Tutorials und Webinaren"
description: Rekonstruiert aus dem öffentlichen Handbuch, den Release Notes sowie den Tutorial- und Webinar-Seiten, wie NOVA AVA den AVA-Ablauf (Kostenplanung bis Kostenkontrolle) abbildet – als Referenzmodell, Anforderungsquelle und Lückenanalyse für unser Open-Source-Projekt.
resource: https://manual.avanova.io/
tags: [research, nova-ava, ava-workflow, preisspiegel, rechnungspruefung, gaeb, kostenkontrolle]
timestamp: 2026-11-09T17:16:17Z
sources: 118
confidence: hoch
---

# NOVA AVA: Funktionsweise laut Handbuch, Tutorials und Webinaren

## Kurzfassung

- **Handbuch-Stand:** `handbuch.avanova.de` leitet per 301 auf `manual.avanova.io` weiter – eine neue Web-App („Novadex") mit 245 Artikeln in 21 Kategorien, 5 Leitfäden und 61 Glossarbegriffen. Alle Artikel wurden zwischen 26.08. und 31.10.2026 angelegt, letzte Änderung 02.11.2026 [1]. Der Inhalt ist also aktuell, aber jung; an einigen Stellen widerspricht er den Release Notes (siehe Offene Fragen).
- **Objektmodell:** Account → Abteilung → Projekt → Kostenplanungen, Leistungsverzeichnisse (LV), 3D-Modelle, Terminpläne, Kostenanalysen, Baudokumentation, HOAI-Dokumente. Das **LV ist die Vergabeeinheit** und trägt seinen ganzen Lebenszyklus in acht „Programmkomponenten" – von der LV-Erstellung bis zur Abrechnung [10][12][57][1].
- **Ablauf:** Kostenplanung nach DIN 276 (Formeln, Kennwerte, Vergleichsprojekte) → LVs generieren → LV-Erstellung (Textquellen, Mengen nach REB, Prüfung) → Ausschreibung über das eigene Bieterportal „Angebotscockpit" → Angebote (Portal, GAEB X84, Excel, manuell) → Preisspiegel → Vergabevorschlag/Beauftragung → Nachträge → Aufmaß (Auftragnehmer-Portal, App) → Prüfrechnung → Kostenanalyse [76][8][22][26][33][37][42][47][51].
- **Preisspiegel** (tabellarischer Angebotsvergleich): virtuelle Bieter (Ideal-, Mittel-, Medianbieter), frei wählbares Bezugsangebot, ABC-Analyse, Ausreißererkennung, Variantenrechnung, Verhandlungsrunden mit Versionen, Rückwärtsauktion als Add-on [29][30][31][32].
- **Kostenkontrolle:** Die Kostenanalyse stellt feste Spalten von der Kostenplanung bis zur Rechnungsfreigabe gegenüber und bildet eine Prognose nach dem Prinzip, dass jeweils der höhere von zwei Vergleichswerten zählt. Sie aktualisiert sich **nicht automatisch** [51][52].
- **Rechnungsprüfung:** kumulierte Prüfrechnung aus freigegebenen Aufmaßen, Abzüge (Sicherheits- und Gewährleistungseinbehalt, Baustrom usw.), Skonto, 15 % Bauabzugsteuer. Export als XRechnung/ZUGFeRD gibt es erst seit August 2026 [47][49][107].
- **GAEB:** Import von GAEB 90/2000 und GAEB DA XML 3.1–3.3; Export der Phasen 81–86 sowie X31/DA11 und X50/X51. Nachtragsangebote per X83/X84 erst seit Februar 2026; kein X89 (Rechnung) dokumentiert [14][21][39][104].
- **Öffentliche Vergabe:** 4-Augen-Angebotseröffnung, geschütztes Submissionsdatum, Submissionsprotokoll, Formblätter EFB 221–223, Auf-/Abgebotsverfahren. **Nicht dokumentiert** (Einschätzung): Anbindung an e-Vergabe-Plattformen, ein Vergabevermerk, Verfahrensarten- oder Schwellenwertlogik [25][27][53][34][86].
- **Ausdrückliche Grenzen:** kein Excel-Copy-&-Paste in Tabellen; Rechnungen und Kostenanalysen aktualisieren sich nicht von selbst; viele Aktionen sind irreversibel; Floating-Lizenz mit fest eingestelltem 2-Stunden-Logout; nach Abo-Ende kein Datenzugriff (Aufbewahrung bis 12 Monate) [63][45][51][60][62].
- **Release-Takt:** kontinuierliche Auslieferung ohne Versionsnummern, etwa 8–10 dokumentierte Updates pro Jahr. Im Oktober 2026 kam das bisher größte Update (neue BIM-Technik, HOAI-Beta, neues Dashboard). Die KI „NEO" ist in Beta; Beta-Add-ons werden ab 01.02.2027 kostenpflichtig [96][109][93][113].

## Quellenlage und Methode

| Quelle | Umfang | Zugriff | Bemerkung |
|---|---|---|---|
| Handbuch (manual.avanova.io) | 245 Artikel, 21 Kategorien, 5 Leitfäden, 61 Glossarbegriffe | Die Single-Page-App lädt ihre Inhalte über öffentliche JSON-Endpunkte (`/api/articles`, `/api/categories`, `/api/guides`, `/api/glossary`, `/api/menu-paths`). Diese wurden einmalig lesend abgerufen [1]. | Etwa 70 Kernartikel vollständig gelesen; alle 245 per Stichwortsuche auf Hinweise und Einschränkungen geprüft |
| Funktions-, NEO-, Know-How-Seiten auf nova-ava.de | 14 Seiten, Einstieg über die Funktionsübersicht [85] | WebFetch | Herstellerangaben (Marketing) |
| Video-Tutorial-Seiten | 4 Kategorien, 47 Videos | WebFetch, nur Titel und Beschreibungen | Videos stehen hinter einem Consent-Blocker; der YouTube-Kanal selbst wurde nicht durchsucht (Suchbudget erschöpft) |
| Webinar-Seite | 5 Termine Nov./Dez. 2026 | WebFetch | Inhalt nur über die Titel |
| News/Release Notes | 83 Beiträge 2014–2026 | öffentlicher RSS-Feed mit Seitenparameter [94] | Jahresrückblicke 2014–2024, Monats-Updates 2025–2026 |
| Gesetze/Regelwerke | BGB, EStG, VOB/A 2019 | gesetze-im-internet.de, dejure.org | zur Prüfung handbuchseitiger Rechtsbezüge |

Nicht gemacht (laut Auftrag ausgeschlossen): kein Testkonto, kein Login, keine Bedienung der Software. Alle Aussagen zum Verhalten stammen aus der Dokumentation des Herstellers.

## Begriffe kurz erklärt (für Nicht-Architekten)

| Begriff | Kurz erklärt |
|---|---|
| AVA | Ausschreibung, Vergabe, Abrechnung von Bauleistungen (engl. tendering, award, billing) |
| Leistungsverzeichnis (LV) | strukturierte Liste der auszuführenden Bauleistungen mit Positionen, Mengen, Einheiten und Texten (engl. bill of quantities) |
| Position / OZ | kleinste ausgeschriebene Teilleistung; die Ordnungszahl (OZ) ist ihre hierarchische Nummer, z. B. 01.02.0030 |
| Vergabeeinheit / Los | Paket, das an einen Auftragnehmer vergeben wird; ein Los ist ein separat vergebbarer Teil eines LV |
| Preisspiegel | Gegenüberstellung der Angebotspreise aller Bieter, Position für Position |
| Submission | Ablauf der Angebotsfrist mit anschließender Öffnung der Angebote |
| Zuschlag / Auftrag | Annahme eines Angebots; in NOVA entsteht dabei ein „Auftrags-LV" |
| Nachtrag | Änderung oder Ergänzung der beauftragten Leistung nach Vertragsschluss (engl. change order) |
| Aufmaß | Messung der tatsächlich ausgeführten Mengen als Abrechnungsgrundlage |
| Abschlags-/Schlussrechnung | Zwischenrechnung während des Baus bzw. Endabrechnung |
| Sicherheits-/Gewährleistungseinbehalt | Teil der Vergütung, der als Sicherheit für Vertragserfüllung bzw. Mängelansprüche zurückbehalten wird |
| Kostenanschlag / Kostenfeststellung | Kostenermittlungsstufen nach DIN 276 auf Basis von Angeboten bzw. der abgerechneten Ist-Kosten, siehe [DIN 276](/okf/research/standards/din-276-cost-planning.md) |
| REB 23.003 | standardisierte Formelsammlung für nachvollziehbare elektronische Mengenermittlungen |
| Stamm-LV | wiederverwendbares Muster-LV, das zugleich als Preisspeicher dient |

## Navigation und Objekthierarchie

### Oberfläche

- **Linke Leiste:** Projekte, Kostenanalyse (projektübergreifend), Adressbuch, Lieferanten, Kalender, Aktivitäten (Änderungsprotokoll), Mein Profil, Messenger, Notizen [2].
- **Oben rechts:** Hilfe (Handbuch, Videos, „Baufrage an Experten stellen"), eine globale Suche über Projekte, LVs, Modelle, Kostenplanungen, Terminpläne und Dokumente, Account sowie die Ansicht-Konfiguration des Dashboards [2].
- **Dashboard:** frei anordenbare Widgets. Seit Oktober 2026 gibt es Infopanels zu laufenden Vergaben, Fristen (Submission, Zuschlagsfrist, Baubeginn, Gewährleistung), offenen Prüfaufgaben (Nachträge, Leistungsmeldungen, Rechnungen, Tickets) und zum Projektstatus [2][109].

Menüstruktur, rekonstruiert aus den „Wo finde ich das?"-Pfaden des Handbuchs [1][3][57]:

```
Projekte
└─ Projekt
   ├─ Eigenschaften (Stammdaten, Adressen, Benutzer/Rollen, Kataloge, Region/Währung/MwSt, Merkmale, Projektfarben)
   ├─ Kontextdaten (Projektbeteiligte, Kalender, Aktivitäten, Dokumente)
   ├─ Kostenplanung(en) → „nach DIN 276" | „nach BIM"
   ├─ Leistungsverzeichnisse → LV → LV-Erstellung | Ausschreibung | Angebote/Vergabe | Auktion/E-Bidding
   │                                | Auftrag/Nachträge | Leistung/Aufmaß | Soll-Ist-Vergleich | Abrechnung
   ├─ Kostenanalyse (Projekt) → Kostentabelle
   ├─ 3D-Modelle (Add-on BIM) · Terminpläne (Add-on)
   ├─ Baudokumentation (Pläne, Tickets, Besprechungen/Protokolle, Bautagebuch)
   └─ HOAI (Rechner, Angebote, Varianten, Controlling, Zeiterfassung)
Account → Administration (Benutzer, Admin-Rollen, Abteilungen → Rollen, LV-Typen, Kataloge, Textspeicher,
          Textblöcke, Workflows; Druckdesigner, Excel-Vorlagen, E-Mail-Vorlagen, Schnittstellen, Protokolle)
```

### Objekthierarchie

| Ebene | Objekt | Inhalt und Zweck | Besonderheiten |
|---|---|---|---|
| Mandant | Account (eigene Subdomain) | Lizenzen, Administration | Floating-Lizenzen; Benutzerzahl unbegrenzt [61] |
| Organisation | Abteilung | Rollen, LV-Typen, Kataloge, Textspeicher, Druckvorlagen, Adressbuch | Benutzer bekommen pro Abteilung eine Standardrolle [58] |
| Projekt | Projekt | Kopfdaten, Adressen, Benutzer, aktive Kataloge, Baupreisindex/Regionalfaktor, MwSt, Norm (GAEB oder ÖNORM) | Vorlage, Kopie, Archiv; Kopfdaten und Adressen werden an LVs vererbt [3][4] |
| Kostenplanung | beliebig viele je Projekt | Struktur aus 3D-Modell, Katalog (z. B. DIN 276) oder LVs | Workflow „Einreichen/Freigeben"; Archive [5][8][64] |
| LV (= Vergabeeinheit) | Typ: Standard, Direktauftrag, Stamm-LV, Rahmenvertrag | OZ-Gliederung, Positionen, Termine, Adressen, Benutzer, verknüpftes Modell | Typ nach Anlage unveränderlich [11] |
| LV-Elemente | Vorbemerkung, Bereich/Abschnitt (Titel), Los, Position, Leit-/Unterbeschreibung, Ausführungsbeschreibung, Hinweis, Nachspann | Struktur und Vertragstext | Lose nur, wenn die Gliederung eine Losebene hat [12] |
| Angebot | je Bieter, zusätzlich virtuelle Bieter | Preise, Nachlässe, Skonto, Bieterangaben, Dokumente | Archiv und Versionen pro Verhandlungsrunde [26][31] |
| Auftrag | Auftrags-LV | Grundlage der Abrechnung | bei Losvergabe eigene Los-Auftrags-LVs [33] |
| Nachtrag | NA-Nr. mit Nachtragsleistungen | Änderungen nach Auftrag | Status von „zur Freigabe" bis „zurückgezogen" [37][51] |
| Erfassungsblatt | Aufmaß je Zeitraum oder Ort | Ist-Mengen | Freigabe-Workflow; externe Erfassung möglich [42] |
| Rechnung/Zahlung | Abschlag, Teilschluss, Schluss, Vorauszahlung, Einbehaltsablösung | Prüfrechnung, Zahlungsanweisung | kumuliert oder als Zuwachs darstellbar [46][45] |
| Kostenanalyse | projektbezogen und projektübergreifend | Soll-/Ist-/Prognose-Tabelle | manueller Datenabruf [50][51] |

### LV-Lebenszyklus, Phasen und Programmkomponenten

1. **Status in der LV-Liste** (vom System gesetzt): LV-Erstellung → Ausschreibung (Teilnehmer eingeladen oder Angebot angelegt) → Angebotswertung (Submission abgelaufen) → Vergabevorschlag → Auftrag → Schlussgerechnet [10].
2. **Programmkomponenten pro LV:** LV-Erstellung, Ausschreibung, Angebote/Vergabe, Auktion/E-Bidding, Auftrag/Nachträge, Leistung/Aufmaß, Soll-Ist-Vergleich, Abrechnung [1][57].
3. **Workflow über den LV-Typ:** Ein LV-Typ legt eine Folge von Phasen fest, z. B. „Erstellung" → „Ausschreibung + Vergabe" → „Vertrag + Abrechnung". Je Phase sind bestimmte Komponenten aktiv, und eine Rechte-Matrix (Rolle × Phase) regelt den Zugriff. Bearbeiten lässt sich nur die aktive Phase; Anwender schalten mit „Fortschreiben" weiter und mit „Zurückstufen" zurück [57].

## Der AVA-Ablauf in NOVA Schritt für Schritt

Der offizielle Leitfaden „Vom Projekt zum beauftragten LV" führt in zehn Artikeln von Schritt 1 bis 7 [76]. Die Schritte 8 bis 11 sind aus den Kategorien „Auftrag & Nachträge", „Aufmaß & Abrechnung" und „Kostenanalyse" rekonstruiert.

### 1. Projekt anlegen

- Ein Projekt entsteht leer oder aus einem Vorlagenprojekt. Dabei lassen sich LVs, Kostenplanungen und Dokumente mitkopieren. Pflichtfelder sind Name und Bezeichnung [4][3].
- Region, Sprache, Währung und MwSt gelten als Vorgabe für neu angelegte Kostenplanungen und LVs. Spätere Änderungen wirken nicht auf bereits vorhandene Elemente [3].
- Für den Vergleich mit früheren Projekten werden eine Baupreisindex-Gruppe und ein Regionalfaktor hinterlegt [3].
- Die Projektnorm (GAEB oder ÖNORM) bestimmt, welche Dateien importiert werden können [14].
- Benutzer und Gruppen bekommen projektbezogene Rollen; eine Einzelzuweisung schlägt die Gruppenrolle. Zuweisungen lassen sich an LVs, Kostenplanungen und Modelle vererben [3].

### 2. Kostenplanung

- **Kataloge:** Im Projekt aktiviert man Kostengliederungen wie DIN 276, Leistungsbereiche oder Kostenträger. Eigene Kataloge entstehen mit Ebenen, als Kopie oder per Import im GAEB-Format X50 [5][101].
- **Grundlage:** eine Vorlage oder eine Kostenstruktur – 3D-Modell, Katalog oder vorhandene LVs [5].
- **Mehrere Kostenplanungen je Projekt,** z. B. für Kostenrahmen, -schätzung und -berechnung. Feste Stufentypen gibt es nicht; der Anwender benennt sie [9].
- **Rechnen:** Die Tabelle ist geteilt – oben die Kostengruppen, unten die Berechnungszeilen. Jede Zeile ist Menge × Einheitspreis (EP). Felder akzeptieren Formeln und Variablen („Kenndaten", z. B. Flächen nach DIN 277, mit Bedingungen), Bezüge auf andere Zeilen (`$114`) und Prozentzeilen (Einheit `%`) [6].
- **Ansicht:** Netto oder Brutto als Preisbasis; zuschaltbare Spalten für Faktor, Min/Max, Prozentanteile, Original-EP und Preisauswahl. Der „Berechnungsstatus" nimmt Zeilen aus der Summe, etwa für Eventualpositionen [7].
- **Vergleichsprojekte:** Der Kostenkennwert ergibt sich aus Gesamtbetrag/Menge, korrigiert um das Verhältnis der Regionalfaktoren und der Baupreisindizes. Übernommen wird wahlweise Minimum, Mittel, Median oder Maximum, für eine Kostengruppe oder für alle derselben Ebene [8].
- **Generieren:** Eine Kostenplanung lässt sich in eine andere Struktur überführen (z. B. von BIM nach DIN 276) oder in Vergabeeinheiten (LVs) aufteilen, indem man Leistungsbereiche zuordnet; die Zuordnung vererbt sich nach unten. Eine „KP-Prüfung" meldet fehlende Zuordnungen. Die erzeugten Positionen werden alphabetisch sortiert [8].
- **Workflow:** „Einreichen" benachrichtigt den Besitzer; „Freigeben" sperrt die Kostenplanung [8].
- **Neu seit August 2026:** Kostenplanungen lassen sich automatisch aus LV-Positionen befüllen und per X51 importieren. Der eigene BKI-XML-Import entfiel; BKI-Daten kommen nun über X51 [107].

### 3. LV-Erstellung

- **Anlage:** Norm GAEB oder ÖNORM; den LV-Typ wählt man einmalig. Eine Option legt fest, dass die LV-Summe in der Kostenprognose Vorrang vor der Kostenplanung hat. Verknüpfbar sind Adressen, Benutzer, IFC-Modellversion, Terminplan, Freigabe-Workflow und Erinnerungen [11].
- **Elemente einfügen:** Neue Elemente landen unter der markierten Zeile. Zuerst wählt man die Textquelle, dann den Elementtyp; es gibt Tastenkürzel (F9, Strg+D). Positionen lassen sich aus anderen LVs per Dialog oder Drag & Drop kopieren – samt Preisquelle wie LV-Preis, Auftragspreis oder Bieterpreis [12][15].
- **Gliederung:** Eine OZ-Maske wie „123PP" bedeutet drei Gliederungsebenen plus zweistellige Positionsnummer. Bei GAEB-LVs bleibt sie jederzeit änderbar, bei ÖNORM-LVs ist sie nach der Anlage fest [57][11]. Laut Website sind bis zu fünf Gliederungsebenen möglich [91].
- **Positionsarten** (Kürzel in der Spalte „Typ") [13]:

| Kürzel | Bedeutung |
|---|---|
| G / A + Zuordnungszahl | Grundposition und Alternative (Wahlposition), z. B. G001 ↔ A001.1 |
| E / M | Eventual- bzw. Bedarfsposition ohne bzw. mit Gesamtbetrag |
| P | Pauschalposition (Menge = 1, Bieter gibt Pauschalbetrag an) |
| F | Freie Menge (Bieter bietet die Menge selbst an) |
| R | Position entfällt (wird in X83 nicht exportiert) |
| K / S | Schwerpunktposition; Stundenlohnarbeiten |
| Zuschlag / zu bezuschlagen | prozentuale Zuschlagsposition |
| EPA | Position mit Einheitspreisanteilen (z. B. Lohn und Material) |
| Bezug / „wie vor OZ" | Bezugs- und Wiederholungsbeschreibung (Text verkürzt) |
| L / UB | Leit- und Unterbeschreibung |

- **Text:** Langtext-Editor mit Bildern und Tabellen. Eingebaut sind Bieter- und Ausschreiber-Textergänzungen, also auszufüllende Lücken im Text; der Editor speichert automatisch alle 30 Sekunden bzw. nach 100 Zeichen [13][15][100].
- **Mengenvorermittlung:** Eine „einfache Ansicht" nimmt freie Formeln an und legt sie intern als Formelnummer 91 ab. Die erweiterte Ansicht arbeitet nach REB 23.003 (Ausgabe 2009) mit Formelnummern, Wertespalten W1–W5 und Kennzeichen; einstellbar sind die Rundung und die Zuordnung zu Kostenträgern je Zeile [18].
- **Kalkulation (Add-on):** Der EP wird aus Kostenansätzen, Kostenarten und Zuschlagsgruppen gebildet; EP-Anteile ermittelt das System automatisch. Eine Warnung erscheint bei veraltetem Preisdatum [19].
- **LV-Prüfung:** Prüfregeln nach GAEB XML, GAEB 90, HVA StB, STLB-Bau oder REB. Die Prüfung läuft automatisch vor jeder Ausgabe; ein Klick auf die Meldung springt zur Fehlerstelle; der Prüfbericht lässt sich als PDF ausgeben [20][25].
- **Import** von GAEB, ÖNORM, Excel und Datanorm läuft als Hintergrund-„Job" [14]. Beim Excel-Import ordnet man die Spalten manuell zu und kennzeichnet die Zeilentypen; seit Oktober 2025 erkennt der Import G/A/E aus einer Spalte „Typ" [14][102].

### 4. Ausschreibung

1. **Termine:** Das Submissionsdatum mit Uhrzeit bestimmt Bieterzugang, Abgabefrist und Öffnungszeitpunkt [23].
2. **Teilnehmer auswählen:** aus dem Lieferantenstamm oder Adressbuch (nur Adressen mit E-Mail), filterbar nach Gewerk, Bewertung und Umkreis [22].
3. **Einladen:** E-Mail-Vorlage mit Variablen wie `ADDRESS.CONTACT`; der Zugang ist befristet. Danach ist das LV standardmäßig gesperrt; Änderungen sind erst möglich, wenn man die Zugänge sperrt oder entfernt, und die Bieter sollen dann über den Fragenkatalog informiert werden [22][82].
4. **Unterlagen:** Dokumente stehen allen Bietern zur Verfügung. Optional müssen Bieter sie bestätigen, bevor sie freigeben können; Dokumente lassen sich auch als LV-Anlage mitdrucken [24].
5. **Fragenkatalog:** Bieterfragen werden anonymisiert beantwortet und veröffentlicht. Der Status ist farbcodiert: offen (rot), beantwortet (gelb), veröffentlicht (grün) [24].
6. **„Veröffentlichung":** Das System erzeugt einen Registrierungslink, über den sich Firmen selbst anmelden können; der Zugang endet mit der Submissionsfrist [23]. Das ist **keine** Bekanntmachung auf einer Vergabeplattform (siehe Lücken).
7. **LV-spezifische Regeln:** Einladung erst nach fehlerfreier LV-Prüfung; Archivierung vorhandener Angebote bei erneuter Einladung; Zugangsende an die Submission gekoppelt; Erinnerung n Tage vor Fristende; Rückzug der Bieterfreigabe erlauben oder verbieten; Modell oder Zielpreise für Bieter sichtbar machen; „nicht angeboten" zulassen; Öffnung erst nach Submission; 4-Augen-Prinzip; geschütztes Submissionsdatum; automatische LV- und Angebotsprüfung [25].
8. **Bieterseite („Angebotscockpit"):** Der Bieter meldet sich passwortlos an – über einen Link in der Einladung und einen per E-Mail angeforderten Zugangslink mit 10 Minuten Gültigkeit [27][95]. Er bepreist online an den vorgesehenen Stellen oder lädt GAEB- bzw. Excel-Dateien herunter und wieder hoch, stellt Rückfragen, prüft Vollständigkeit und gibt frei. Die Freigabe bestätigt das System per E-Mail mit PDF [27].
9. **E-Signaturen** über Adobe Sign oder DocuSign (Add-on) für Angebote und Aufträge [67][81].

### 5. Angebote erfassen

- **Wege:** Portalangebote erscheinen automatisch. Dazu kommen der Import von GAEB-Angeboten (X84) und Excel-Angeboten, die manuelle Anlage als zusätzliche Spalte sowie Kopien, etwa von Kostenanschlag oder Mittelbieter, mit Auffüllen leerer Preise [26].
- **Erfassung:** EP, Positionsnachlass und Skonto; die Spalte „NA" markiert nicht angebotene Positionen. Angebotsdetails enthalten Summennachlass (pauschal oder prozentual), MwSt und Skonto. Als Tippfehlerkontrolle dienen die Spalten „GB erfasst" und „GB Differenz"; Textergänzungen und EP-Anteile stehen in Zusatzzeilen [26].
- Nach jedem Import entsteht ein Importbericht. Ein Import der Phase 86 (Auftrag) legt direkt einen Auftrag an. Gelöschte Angebote lassen sich nicht wiederherstellen [26].
- **Öffnung nach 4-Augen-Prinzip:** Zwei dem LV zugeordnete Benutzer melden sich mit Passwort an. Das Submissionsprotokoll dokumentiert ihre Anwesenheit [27][53].

### 6. Preisspiegel und Wertung

Details im Abschnitt [Preisspiegel im Detail](#preisspiegel-im-detail).

### 7. Verhandlung, Vergabevorschlag, Beauftragung

- **Verhandlungsrunden:** „Archiv erstellen" friert die aktuelle Angebotsversion ein und dupliziert sie. Optional lassen sich einzelne Positionen als „verhandelt" (gesperrt) oder „unverhandelt" (Bieter darf ändern) markieren; das muss am LV-Typ eingeschaltet sein [31][57].
- **Nachlässe auf EP umlegen:** rechnet Summennachlässe in die Einzelpreise ein – **nicht umkehrbar** [31].
- **Rückwärtsauktion (Add-on für Easy/Business):** mindestens 2 Teilnehmer, Startgebot, Mindest- und Maximalgebotsschritt, Laufzeit, automatische Verlängerung bei späten Geboten, Live-Protokoll [32].
- **Vergabevorschlag:** Der Wunschbieter wird markiert. Er erscheint dann in einer eigenen Spalte der Kostenanalyse und in einer frei gestaltbaren Druckliste (seit März 2026). Vorher half man sich mit einer „Vorab-Beauftragung" [33][105].
- **Absagen** gehen per E-Mail an die übrigen Bieter, solange noch nicht beauftragt ist [33].
- **Beauftragen:** optional mit Zuschlags-E-Mail samt Anlagen. Danach ist die LV-Erstellung nur noch lesbar. „Auftrag aufheben" erlaubt Korrekturen, aber bei der Neubeauftragung werden bestehende Nachträge ignoriert [34].
- **Losweise Vergabe:** Jeder beauftragte Bieter bekommt ein eigenes Los-Auftrags-LV; das Haupt-LV endet mit der Vergabe [33].
- **Vertragsinformationen:** Vergabeverfahren, Rahmenvertragstyp, Auftragsnummer, Abnahmeverfahren sowie Abzüge – Nachlass, Skonto, Sicherheits- und Gewährleistungseinbehalt (netto oder brutto) und eigene Abzüge wie Baustrom. Diese Abzüge fließen später automatisch in die Rechnungen [34][101].
- **Sonderwege:** Der Direktauftrag überspringt Ausschreibung und Vergabe [36]. Ein Rahmenvertrag entsteht aus einem Stamm-LV-Angebot; Einzelabrufe erfolgen über eine Spalte „Bestellmenge" oder per Excel-Rücklauf [35][106].

### 8. Nachträge

- **Struktur:** Eine Nachtragsnummer (NA-Nr.) bündelt mehrere Nachtragsleistungen. Neue Leistungen dürfen nur Bereiche, Positionen oder Hinweise sein; bestehende Struktur und Nummerierung sind fixiert [37][38].
- **Änderungsnachtrag** zu beauftragten Positionen: Menge oder Preis ändern, Position entfallen lassen, Eventualposition beauftragen, Alternative statt Grundposition wählen. Das System legt eine Historie samt Kopie der Original-Auftragszeile an [37].
- **Status:** Neue Leistungen starten mit „zur Freigabe"; ihr Soll-Betrag steht in Klammern. Die Kostenanalyse kennt zusätzlich „angemeldet", „angeboten", „sachlich anerkannt", „abgelehnt mit Widerspruch", „abgelehnt" und „zurückgezogen" [37][51].
- **Freigabe** einzeln oder für eine ganze NA-Nr. Voraussetzung sind das entsprechende Recht und eine fehlerfreie LV-Prüfung, etwa eine vorhandene Soll-Menge [37].
- **Strittige Nachträge:** Die Option „VOB 80-Prozent-Regelung" (seit Juni 2025) erlaubt die Abrechnung zu 80 % ohne Freigabe [37][97]. *Einschätzung:* Die Rechtsgrundlage dafür ist § 650c Abs. 3 BGB (80 % der angebotenen Mehrvergütung bei Abschlagszahlungen), nicht die VOB/B [114].
- **Stundenlohnarbeiten** (Attribut S) erhöhen die Auftragssumme nicht, lassen sich aber abrechnen [37].
- Die Zeile **„Auftragsprognose"** zeigt den Auftragswert einschließlich aller Nachträge. Mehr- und Minderkosten einzelner Nachträge sind **nur im Ausdruck** ausgewiesen [37].
- **Austausch:** Nachtragsanfragen als X83 und Rücklauf als X84 gibt es erst seit Februar 2026. Genehmigte Nachträge kommen per X86, Mengen per DA11/X31 [39][104].

### 9. Aufmaß und Leistungserfassung

- **Erfassungsblätter** haben Kopfdaten (Sachbearbeiter, Leistungszeitraum, Nummer) und pro Position die Spalten Zuwachs, Kumuliert und %. Der Status je Position ist ungeprüft, abgelehnt oder freigegeben. Höchstens 15 Blätter lassen sich gleichzeitig einblenden [40][42].
- **Eingabe:** wahlweise Zuwachs oder kumulierte Menge; prozentual (das System erzeugt dann einen Differenzansatz mit Formelnummer 91, **nicht umkehrbar**); Mengenermittlung einfach oder nach REB; Import von DA11/X31 (mit Optionen für Kostenstellen) oder einer Excel-Vorlage. Achtung: Der DA11/X31-Import übernimmt auch syntaktisch falsche Ansätze [41].
- **Auftragnehmer-Zugang:** Einladung per E-Mail, befristet oder unbefristet, mit QR-Code für die kostenlose „NOVA Aufmaß App" (iOS/Android). Der Auftragnehmer legt eigene Blätter an und reicht sie ein; als Bestätigung bekommt er eine X31-Datei. Der Auftraggeber prüft je Position, kann zur Korrektur zurückschicken und gibt „für Abrechnung frei" [43][42][81][87].
- **Freigabe-Workflows** können mehrstufig sein, mit Rollen, Benachrichtigungen und Kommentaren [42].
- **Automatische Prüfungen** seit Oktober 2025: Warnung, wenn eine Pauschalposition die Menge 1 übersteigt oder Leistung an nicht beauftragten Positionen gemeldet wird [102].
- **Soll-Ist-Vergleich** als einfachere Alternative: Hier trägt man nur die Ist-Gesamtmenge ein (keine Zuwächse), dazu kommen Prognosespalten und farbige Balken. Pro Position gilt **entweder** Soll-Ist **oder** Aufmaß – nicht beides [44][40].

### 10. Rechnungsprüfung

Details im Abschnitt [Rechnungsprüfung](#rechnungsprüfung-rechenweg-einer-prüfrechnung).

### 11. Kostenkontrolle

Details im Abschnitt [Kostenkontrolle](#kostenkontrolle-was-wird-womit-verglichen).

## GAEB- und Datenaustausch je Phase

(GAEB = Gemeinsamer Ausschuss Elektronik im Bauwesen, Austauschstandard für LVs. Hintergrund in [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) und [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md).)

| Modul | Import | Export | Quelle |
|---|---|---|---|
| Kostenplanung | X50 (Kataloge); X51 (Kostenplanungen, seit Aug. 2026; BKI-Daten über X51) | X51 (Stufe der Kostenermittlung nur als Info, optional mit Berechnungszeilen); X50 | [5][21][107] |
| LV-Erstellung/Ausschreibung | GAEB 90, GAEB 2000, GAEB DA XML 3.1/3.2/3.3; ÖNORM A 2063 (ONLV/ONLB, nicht B 2063); Excel .xlsx; Datanorm 4.0 | Phasen 81 (LV), 82 (Kostenanschlag), 83 (Angebotsaufforderung) als GAEB 90, GAEB 90 HVA StB oder XML 3.1–3.3; Optionen: Kurztext-LV, Mengenermittlung, EP-Anteile, IFC-Bauteilbezüge, MwSt, Kostenanschlagspreise | [14][21] |
| Angebote/Vergabe | X84 (Angebot), Excel-Angebot, X86 (erzeugt Auftrag) | 84–86 (z. B. X84, wenn NOVA beim Bieter läuft) | [26][21] |
| Auftrag/Nachträge | X84 (Nachtragsangebot), X86 (Nachträge in den Hauptauftrag), DA11/X31 | X83 (Nachtragsanfrage), X86 (Gesamtauftrag, ohne Nachträge, nur Nachträge, einzelne NA-Nr.) | [39][21][104] |
| Leistung/Aufmaß | DA11/X31, Excel-Aufmaß | DA11/X31 (bei Fehlern gesperrt), Excel | [41][43] |
| Abrechnung | – (kein X89 und kein Import von E-Rechnungen dokumentiert) | XRechnung (XML), ZUGFeRD (PDF mit eingebettetem XML) | [49][1] |
| BIM | IFC2x3, IFC4, IFC4x3; BIM-LV-Container; Catenda Hub | BIM-LV-Container; BCF-Tickets | [68][69] |

Weitere Hinweise:

- GAEB XML 3.2 erlaubt in Phase 83 keine Kostenberechnungspreise [21].
- Ist das LV formal fehlerhaft, lässt sich der Export trotzdem mit „Fortsetzen" erzwingen; die Datei ist dann formal falsch [21].
- ÖNORM-LVs lassen sich nicht als GAEB exportieren [14][53].

## Preisspiegel im Detail

| Funktion | Beschreibung | Quelle |
|---|---|---|
| Bezugsgröße 100 % | Standard ist der günstigste Preis je Position. Alternativ dient ein fest gewählter Bieter als Bezug – real oder virtuell, z. B. „LV-Kostenanschlag" oder „Mittelpreis" | [30][29] |
| Virtuelle Bieter | Idealbieter (günstigster Preis je Position), Mittelbieter (arithmetisches Mittel), Medianbieter; als „ungültig" markierte Bieter fließen nicht ein | [29][30] |
| Klassischer Vergleich | Prozent relativ (−10 / +20) oder absolut (90 / 120); günstigstes und teuerstes Angebot farbig hervorgehoben; Berechnung über alle oder nur sichtbare Bieter; Bezugsgröße EP oder Gesamtbetrag | [29] |
| ABC-Analyse | teilt die Positionen nach ihrem Anteil an der Angebotssumme in drei Klassen; Grenzen einstellbar; farbige Darstellung je Bieter | [29] |
| Ausreißer | prozentuale Grenzen (z. B. 80/115) und/oder absolute Differenzen; Mindest-Gesamtbetrag oder Mindestanteil, damit Kleinstbeträge nicht markiert werden | [29] |
| Varianten | Spalte „V" schaltet Positionen aus der Summe; damit lassen sich Grund-, Alternativ- und Eventualpositionen gegeneinander rechnen und Rangfolgen vergleichen; deaktivierte Positionen gelten bei Beauftragung als „entfällt" | [30] |
| Ansicht und Filter | Darstellung Standard oder kompakt; gespeicherte Spaltensets; Zeilenfilter nach Positionsarten; Text- und Farbfilter; Diagramme; 3D-Modell bei BIM-LVs | [28] |
| Eingaben im Preisspiegel | Nachlässe, MwSt und Skonti direkt editierbar; Angebotsdatum am Bieternamen; Symbol für hochgeladene Bieterdokumente (2025) | [102][100] |
| Notizen | pro Bieter und Position, optional im Ausdruck | [26][53] |
| Zielpreis | ein beliebiges Angebot wird Zielpreisangebot; der Bieter sieht im Cockpit nur rot/schwarz, außer die Administration gibt den Wert frei | [27] |
| Historische Preise | „Preisverzeichnis": Grund-, Auftrags-, Mittel- und Medianpreise sowie ABM-Preis (ausreißerbereinigter Mittelwert) aus früheren Vergaben und Rahmenverträgen; Excel-Export | [30] |
| Ausgabe | PDF mit farbiger Bieterwertung, Bieternotizen, anonymisierten Bieternamen und Summen bis zu wählbarer Gliederungsebene; Excel mit Formeln (nur sichtbare Bieter); Drucklisten zur Nachverhandlung mit Ausreißern | [53][55] |

*Einschätzung:* Gewertet wird rein über den Preis. Eine Bewertungsmatrix für Nicht-Preis-Kriterien (Punkte, Gewichtung), wie sie öffentliche Auftraggeber bei mehreren Zuschlagskriterien brauchen, findet sich im Handbuch nicht.

## Kostenkontrolle: Was wird womit verglichen?

Die Kostenanalyse ist eine Tabelle: Zeilen sind Kosteneinheiten (Kostengruppen eines Katalogs oder die LVs), Spalten sind Kostenstände. Es gibt sie je Projekt, bis zu zweidimensional (zwei Kataloge gleichzeitig), und projektübergreifend [50][51][52][97].

| Spalte | Inhalt |
|---|---|
| Kostenplanung(en) | aktivierte Kostenplanungen (frühe Kostenermittlungen); je Katalog darf nur eine für die Analyse aktiv sein [9] |
| LV-Herstellkosten / LV-Kostenanschlag | Summen aus der LV-Erstellung |
| Vergabevorschlag | Werte des markierten Wunschbieters (Name in eckigen Klammern) |
| Vergabe-LV | Auftragssumme |
| Nachträge (NA) / Auftrag inkl. NA | freigegebene Nachträge |
| Risiko (NA) / Auftrag inkl. Risiko | nicht freigegebene Nachträge (zur Freigabe, angemeldet, angeboten, sachlich anerkannt, abgelehnt mit Widerspruch) |
| Leistungsstand (Ist) | aus Soll-Ist bzw. Aufmaß |
| Rechnungsfreigabe | freigegebene Rechnungen; nur in LV-basierten Analysen; bei Netto-Ansicht aus Brutto zurückgerechnet |
| Zuwachs / Ist + Zuwachs | erwartete Mengen- und Kostenentwicklung |
| Prognose / Prognose inkl. Risiko | erwartete Gesamtkosten, auch als Grafik |
| Auswertung, prozentuale Bezüge | bis zu zwei frei definierbare Differenzspalten sowie Prozent gegenüber einer Referenzspalte |
| Kommentar, eigene Buchungszeilen | Kosten ohne LV-Bezug, z. B. Gebühren, mit Freigabesperre |

Quellen der Tabelle: [51][52].

**Prognose-Regeln** (projektbezogene Analyse [51]):

1. Noch nicht beauftragt, keine LV-Daten → Wert aus der aktivierten Kostenplanung.
2. LV-Daten vorhanden, kein Vergabevorschlag → höherer Wert aus Kostenplanung und Kostenanschlag.
3. Mit Vergabevorschlag → höherer Wert aus Kostenplanung und Vergabevorschlag.
4. Ist am LV „LV-Summe priorisieren" gesetzt → LV-Wert bzw. Vergabevorschlag, auch wenn er niedriger ist. Diesen Schalter gibt es seit Juni 2025 [98].
5. Beauftragt → höherer Wert aus Auftragswert und erbrachtem Leistungswert; bei „schlussgerechnet" immer der Leistungswert.
6. Nicht beauftragte Positionen und nicht freigegebene Nachträge zählen nicht zur Prognose; nicht freigegebene Nachträge erscheinen unter „Risiko".

Wichtig für die Bedienung: Die Analyse wird nur über „Aktuelle Daten abrufen" aktualisiert, und dieser Abruf ist nicht umkehrbar (vorher kann man den alten Stand archivieren). Spaltenwahl und Klappzustand gelten für alle Benutzer des Projekts. Eigene Gruppierungen werden erst nach einem neuen Abruf sichtbar [51]. Daneben zeigt das Terminplan-Add-on seit Oktober 2026 Kostenganglinien (Soll, geprüft, abgerechnet, Prognose) über die Zeit; eine Mittelabflussplanung ist für 01.02.2027 angekündigt [109][113]. Laut Website reicht die Kostenanalyse von Leistungsphase 2 bis 8 und lässt sich als PDF, als Excel-Datei und über die REST-API (etwa für Power BI) ausgeben [88].

## Rechnungsprüfung: Rechenweg einer Prüfrechnung

**Rechnungstypen** [46]:

- Abschlags-, Teilschluss- und Schlussrechnung beruhen auf freigegebenen Erfassungsblättern.
- Bei der Vorauszahlung gibt man den Betrag direkt ein.
- Der Typ „Gewährleistungseinbehalt" löst bisher einbehaltene Beträge ab.

**Reihenfolge der Beträge im Dialog „Rechnungsdaten → Summe"** (rekonstruiert aus [47]):

1. Erbrachte Leistung inkl. Angebotsnachlass (netto) – kumuliert aus freigegebenen Aufmaßen.
2. − Abzüge netto (Sicherheitseinbehalt, Baustrom, Bauwasser … je nach Definition) = Rechnungssumme nach Abzügen (netto).
3. + MwSt (beauftragter Satz; ein abweichender Satz lässt sich für diese und alle folgenden Rechnungen setzen) = Rechnungssumme (brutto).
4. − Abzüge brutto = Rechnungssumme nach Abzügen (brutto).
5. − bereits freigegebene Vorrechnungen (bei kumulierter Rechnung) = ermittelter Auszahlungsbetrag (brutto).
6. ± Ausgleich aus vorherigen Zahlungen (Differenz zwischen tatsächlicher Zahlung und Anweisung).
7. = Zahlungsanweisung (manuell überschreibbar, z. B. zum Runden) → abzüglich Skonto (pro Rechnung abschaltbar) → abzüglich 15 % Bauabzugsteuer, falls keine Freistellungsbescheinigung vorliegt.

**Weitere Regeln:**

- Vorab definierte Abzüge erscheinen automatisch in jeder Rechnung. Eine spätere Änderung in den Vertragsinformationen wirkt **nicht** auf bereits erstellte Folgerechnungen [47].
- Die tatsächlich geflossene Zahlung lässt sich nur für die zuletzt freigegebene Rechnung erfassen [47].
- Eine Freigabe dokumentiert Name, Datum und Kommentar und kann die zugehörigen Aufmaße als „geprüft" sperren. Freigaben lassen sich zurücknehmen [48].
- Eine **Kostenteilung** nach Kostenträgern oder Förderfähigkeit erzeugt getrennte Teilrechnungen. Sie ist nur vor der ersten Rechnung aktivierbar; Rundungsdifferenzen landen auf der Kostenstelle „NZ" [48].
- Eine erstellte Rechnung ändert sich **nicht** mit später freigegebenen Aufmaßen; man muss sie löschen und neu erzeugen [45].
- **Ausgaben:**
  - Prüfrechnung detailliert oder kompakt;
  - Mengen-/Preisermittlungsliste (seit Juli 2025);
  - Aufmaß nach REB;
  - XRechnung oder ZUGFeRD (seit August 2026), mit Leitweg-ID oder Käuferreferenz (BT-10);
  - Anlagen wie die Originalrechnung des Auftragnehmers können ins PDF eingebettet werden.

  Quellen: [53][99][49][107].

*Rechtlicher Abgleich:* 15 % Steuerabzug und Freistellungsbescheinigung entsprechen § 48 EStG. Die Bagatellgrenzen von 5.000 bzw. 15.000 € pro Jahr erwähnt das Handbuch nicht [115][47]. Der Grund für Sicherheitseinbehalte und Abschlagszahlungen liegt in VOB/B und BGB, siehe [HOAI, VOB/B/C, BGB](/okf/research/standards/hoai-vob-b-c.md) und [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md).

## Berichte, PDF- und Excel-Ausgaben

| Bereich | Drucklisten (Auswahl) | Quelle |
|---|---|---|
| LV/Ausschreibung | LV-Kostenanschlag, Ausschreibungs-LV (Blanko mit Punktlinien), Baubeschreibung, Mengenvorermittlung (auch REB), LV-Prüfbericht; Sortierung oder Gruppierung nach Katalogen (z. B. DIN 276 × Gewerk) | [53][20][95] |
| Angebot/Vergabe | Preisspiegel, Angebots-LV, Vergabevorschlag, Bieterangabenverzeichnis, Formblätter EFB 221/222/223, Nachverhandlungsaufforderung mit Beiblatt, Submissionsprotokoll, Auftrags-LV | [53] |
| Abrechnung | Prüfrechnung (detailliert/kompakt), Mengen-/Preisermittlungsliste, Aufmaß (REB), E-Rechnung | [53][99] |
| Kosten | Kostenplanung, Kenndaten, Kostenanalyse/Kostentabelle | [53] |
| Übergreifend | „Tabellenansicht" druckt jede Tabelle so, wie sie am Bildschirm konfiguriert ist (inkl. Farblegende) | [53] |

**Wie stark lassen sich Berichte anpassen?**

- Der **Druckdesigner** gestaltet Deckblatt, Kopf- und Fußzeile mit Platzhaltern `{{…}}`, Tabellen, Logos und QR-Codes, pro Abteilung freischaltbar [54].
- Inhalt und Spalten der Listen selbst werden über Optionen gesteuert: Seitenformat, Inhaltsverzeichnis, Umbrüche, Einzüge, Positionsinhalte [53].
- Druckeinstellungen lassen sich als bürointerne „Vorgaben" speichern (seit September 2025) [101]. Seit 2025/2026 gibt es deutlich mehr Platzhalter, z. B. für Auftrags- und Nachtragssummen in der Rechnungsprüfung [102][104].
- Für den Excel-Export können eigene Excel-Vorlagen hinterlegt werden; Exporte behalten ihre Formeln [56][55].
- PDFs entstehen als Hintergrund-Job. Hat das LV Prüffehler, bekommt das Dokument das Wasserzeichen „ENTWURF" [53].

*Einschätzung:* Gut anpassbar sind „Rahmen" (Deckblatt, Kopf, Fuß) und Platzhalter. Die Grundstruktur des Listenrumpfs ist dagegen vom Hersteller vorgegeben; ein freier Berichtsgenerator für eigene Listen ist nicht dokumentiert.

## Zusammenarbeit, Rollen und Rechte

| Aspekt | Umsetzung in NOVA | Quelle |
|---|---|---|
| Lizenz | Floating-Lizenz = Anzahl gleichzeitiger Anmeldungen; Benutzer unbegrenzt anlegbar; sind alle Lizenzen belegt, dürfen nur noch Admins hinein; automatischer Logout nach genau 2 Stunden Inaktivität (nicht einstellbar); Admins können Sitzungen beenden | [61][2][60] |
| Rollen | Standardrolle je Abteilung; Überschreiben pro Projekt, LV, Kostenplanung oder Kostenanalyse; Gruppen; eine Einzelrolle schlägt die Gruppenrolle; eigene Admin-Rollen; „Lizenzmanager" verwaltet das Abo | [3][58] |
| Rechte-Matrix | je LV-Typ: Rolle × Phase × Komponente → Funktion → Aktion (Lesen, Neu, Ändern, Löschen); vererbbar; Pflichtrollen bei der LV-Anlage | [57] |
| Besitz und Sperren | Besitzer pro Objekt; Schreibschutz; LVs werden gesperrt, wenn jemand sie gerade bearbeitet; Admins können alle LV-Sperren aufheben | [10][57] |
| Workflows | mehrstufige Freigabe von Erfassungsblättern; Einreichen und Freigeben bei Kostenplanungen; LV-Phasen | [42][8][57] |
| Kommunikation | Benachrichtigungen in der App und per E-Mail (mit Kontext am LV seit Aug. 2026), Team-Messenger, Aktivitätenprotokoll, Notizen, Kalender mit CalDAV, Fragenkatalog | [2][45][107][24] |
| Externe | Bieter (Angebotscockpit), Auftragnehmer (Aufmaß-Zugang und App), Lieferanten (Lieferantenportal mit Pflichtdokumenten wie NDA), externe Benutzer anderer Firmen | [27][43][92][58] |
| Identität | Passwortrichtlinien, 2FA (OTP, seit Okt. 2026 auch Passkeys), SSO per SAML oder OpenID (Microsoft/Google), LDAP-Synchronisation, reine API-Benutzer | [59][108][58] |
| Wiederherstellung | gelöschte LVs liegen im Papierkorb; andere Projektdaten nur über den Hersteller; Archivstände wiederherstellbar (überschreibt den aktuellen Stand) | [65][64] |

*Einschätzung:* Gleichzeitiges Arbeiten verschiedener Personen an **verschiedenen** Objekten ist vorgesehen. Für **dasselbe** LV deutet „gesperrt bei aktiver Bearbeitung" auf exklusives Sperren statt Echtzeit-Mitbearbeitung hin; nicht verifiziert.

## Vorlagen, Stamm-LVs, SmartPool und Textquellen

| Quelle | Art | Lizenz/Kosten laut Hersteller | Einbindung | Quelle |
|---|---|---|---|---|
| Freitext + Textblöcke | eigene Bausteine je Abteilung, Import/Export | – | im Langtext-Editor | [17] |
| Stamm-LV | eigener Muster- und Preisspeicher; kopierte Positionen behalten eine STLV-Referenz und protokollieren Vergaben (Datum, Menge, Preise); Texte lassen sich ins Stamm-LV zurückschreiben (seit Aug. 2026) | – | Kopierdialog, Preisverzeichnis | [11][15][107] |
| Projekt- und Kostenplanungsvorlagen | als Vorlage markierte Projekte bzw. Kostenplanungen | – | bei der Neuanlage | [4][5] |
| NOVA SmartPool | Community-Datenbank vergebener Positionen mit Min-/Mittel-/Maxpreis und Preisverlauf; laut Hersteller anonymisiert und ohne Projektdaten | nur für Kunden | Suche mit Operatoren und Filtern (Region, Alter …) | [15][89] |
| STLB-Bau Online | Standardleistungsbuch (DIN/DBD) | separates Abo; Zugangsdaten je Benutzer; im SmartPool ohne Lizenz nur Kurztext | Textgenerator, Aktualisierung alter STLB-Positionen, STLB-Prüfung | [15][16][20] |
| DBD-BIM | Bauteilkatalog/Kostenelemente | separates Abo | Kostenplanung am Modell | [16][90] |
| Heinze VOB / Heinze ATM | produktneutrale bzw. herstellerbezogene Texte | VOB kostenpflichtig, ATM kostenlos | Sammelbox | [15][16][90] |
| ausschreiben.de | Herstellertexte | kostenlos | Textquelle | [15][90] |
| StLB/StLK-Dateien | lizenzierte Leistungsbereiche | eigene Lizenz | Import in die Administration | [16] |
| BKI, sirAdos | Baupreis- und Positionsdatenbanken | nicht genannt | über GAEB-XML-Import | [90] |

Mehr dazu unter [Leistungstexte und Lizenzen](/okf/research/standards/stlb-bau-tender-texts.md). Ohne freigeschaltete externe Bibliotheken sind nur Freitext-Positionen möglich [16].

## BIM, NEO-KI, HOAI-Modul, Terminplanung und Baudokumentation (kurz)

- **BIM (Add-on):** IFC2x3, IFC4 und IFC4x3 werden eingelesen. Bauteile bekommen Katalognummern und Mengenvariablen (z. B. `NetSideArea`, `Count`) und werden in neuen Modellversionen über ihre GUID wiedererkannt [68][69]. Darauf bauen auf: Kostenplanung am Modell (Bauteile bemustern, Kostenelemente), LV-Mengen über 3D-Filter, Modellvergleich, BCF-Tickets, Prüfung gegen IDS-Regeln über BIM.permit, Anbindung an Catenda Hub und ein eingeschränkter Viewer für Bieter [68][67]. Im Oktober 2026 kam eine neue Viewer-Technologie [109]. Mehr unter [BIM und AVA](/okf/research/standards/bim-and-ava.md).
- **NEO (Beta):**
  - Chat-Assistent mit den Rechten des Benutzers; laut Hersteller in Deutschland gehostet, mit Open-Source-Modellen und ohne Training auf Kundendaten [93].
  - Angekündigte Aufgaben: aus einem PDF ein LV erzeugen, VOB-Prüfung, Zuordnung zu DIN-276-Kostengruppen, Terminplan aus dem LV, Tickets aus Fotos, CO₂-Abschätzung [93][111].
  - Im Handbuch ist bisher nur die Steuerung des 3D-Viewers dokumentiert. Das Handbuch rät, von NEO erzeugte Filter vor einer Mengen- oder Kostenverwendung zu prüfen [70].
  - Externe KI per MCP-Add-on (in der Beta kostenlos, ab 01.02.2027 kostenpflichtig) [93][113].
- **HOAI-Modul (Beta seit 24./25.10.2026):**
  - Honorarangebot → Abrechnung → Nachträge → Rechnungen; außerdem Varianten, Controlling, Zeiterfassung, Tafelwerte nach HOAI 2021 (für Altverträge 2013) und E-Rechnung [71][112].
  - Strittige Sonderfälle sperrt das Modul, statt still zu rechnen; § 11 Abs. 4 HOAI (Folgeauftrag) wird noch nicht unterstützt [71][73].
  - Anrechenbare Kosten werden als Stand übernommen, nicht dauerhaft verknüpft [72].
- **Terminplanung (Add-on):** Import aus MS Project, Primavera P6, GanttProject und Project XML [74]. Seit Oktober 2026 kennt sie Ferien und Arbeitskalender (OpenHolidays, ICS) und die Kostenganglinie [108][109].
- **Baudokumentation (Beta seit Dez. 2025):** Pläne, Tickets/Mängel (mit LV-Position verknüpfbar), Besprechungsprotokolle und Bautagebuch für die Leistungsphasen 6–8 [75][103]. Auf der Funktionsübersicht ist sie weiterhin als „beta" gekennzeichnet [85].

## Einschränkungen und Stolpersteine laut Handbuch

| Bereich | Einschränkung (paraphrasiert) | Quelle |
|---|---|---|
| Datenerfassung | Excel-Bereiche lassen sich nicht per Copy & Paste in Tabellen einfügen (landen in einer Zelle); stattdessen CSV- oder Excel-Import | [63] |
| Kostenanalyse | keine automatische Aktualisierung; der Datenabruf ist nicht umkehrbar | [51] |
| Kostenanalyse | nur eine Kostenplanung je Katalog für die Analyse aktiv; nur eine Analyse je Katalog für die Gesamtansicht | [9][50] |
| Kostenplanung | generierte Positionen werden immer alphabetisch sortiert; ein Wert auf Oberebene löscht vorhandene Unterwerte | [8][6] |
| Ausschreibung | das LV wird nach der Einladung gesperrt (Standard); nach Beauftragung ist die LV-Erstellung nur lesbar; beim Aufheben und Neubeauftragen werden Nachträge ignoriert | [22][34] |
| Angebote | Löschen ist endgültig; „Nachlässe umlegen" ist nicht umkehrbar | [26][31] |
| Preisspiegel | Positionsfilter „verhandelt" nur bei Sonderkonfiguration; Wertungseinstellungen nur mit eigenem Recht | [28][29] |
| Nachträge | Struktur fixiert; Mehr- und Minderkosten nur im Ausdruck sichtbar | [37] |
| Aufmaß | prozentuale Eingabe nicht umkehrbar; höchstens 15 Erfassungsblätter gleichzeitig; Excel-Import kann vorhandene Aufmaße überschreiben; DA11/X31-Import übernimmt auch fehlerhafte Ansätze; Formelnummer 91 maximal 38 Zeichen im Export | [41][42][77] |
| Soll-Ist/Aufmaß | Ist-Erfassung pro Position nur in einer der beiden Komponenten | [44][40] |
| Rechnung | aktualisiert sich nicht bei Aufmaßänderungen; Kostenteilung nur vor der ersten Rechnung; tatsächliche Zahlung nur für die letzte freigegebene Rechnung | [45][48][47] |
| Formate | ÖNORM B 2063 (DTA/DTN) nicht unterstützt; ÖNORM-LV ohne GAEB-Export; GAEB XML 3.2/X83 ohne Kostenberechnungspreise | [14][21] |
| Lizenz/Abo | Pakete im selben Abo nicht mischbar; Abo-Wechsel blockiert, solange der Bestellwert negativ wäre; nach Kündigung kein Zugriff, Daten bis 12 Monate aufbewahrt | [61][62] |
| Wiederherstellung | gelöschte Projekte: nur die LVs selbst wiederherstellbar, der Rest nur über den Hersteller; Archiv-Wiederherstellung überschreibt den aktuellen Stand | [65][64] |
| Integrationen | Dropbox/Google Drive nur als einmaliger Import, keine Synchronisation; zusätzliche Schnittstellen nur über den Support | [67][66] |
| HOAI | Beta; § 11 Abs. 4 (Folgeauftrag) nicht unterstützt | [71][73] |

Als häufige Supportfrage taucht außerdem das Video „Warum kann ich mein LV nicht bearbeiten?" auf – eine Sperre durch laufende Ausschreibung oder Auftrag [82].

## Was einem Architekten fehlen dürfte (Einschätzung)

| Bedarf | Befund in Handbuch und Website | Bewertung |
|---|---|---|
| Öffentliche Bekanntmachung und e-Vergabe-Plattformen | Nur Registrierungslink und eigenes Bieterportal. Laut Website lassen sich LVs für Ausschreibungen auf öffentlichen Plattformen vorbereiten (GAEB/PDF); eine Plattform-Schnittstelle ist nicht dokumentiert [23][86] | Für öffentliche Auftraggeber muss ein Medienwechsel zur Plattform des Auftraggebers erfolgen. Siehe [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md) |
| Dokumentation nach § 20 VOB/A (Vergabevermerk) | Nicht erwähnt. Es gibt ein freies Feld „Vergabeverfahren", Vergabevorschlag und Submissionsprotokoll [34][53] | Pflichtinhalte nach § 20 VOB/A (Verfahrensschritte, Gründe, Ausschlüsse) [118] fehlen als geführte Struktur |
| Verfahrensarten und Wertgrenzen (VOB/A, UVgO, VgV) | Keine Logik oder Prüfungen dokumentiert | Unterstützung bei der Wahl des Verfahrens wäre ein Differenzierungsmerkmal |
| Verhandlungsverbot | Verhandlungsrunden und Auktionen ohne Hinweis auf öffentliche Verfahren [31][32] | Nach § 15 Abs. 3 VOB/A sind Verhandlungen nach Öffnung grundsätzlich unzulässig [117] → Schutzmechanismen je Verfahrensart sinnvoll |
| Formblätter (VHB) | Nur EFB 221–223 genannt [53] | Weitere VHB-Formulare und Anschreiben unklar |
| Zuschlagskriterien jenseits des Preises | keine Bewertungsmatrix gefunden | relevant bei öffentlichen Vergaben mit mehreren Kriterien |
| Eingehende E-Rechnungen | Nur Export eigener Prüfrechnungen; die Originalrechnung wird als Anlage abgelegt [49][47] | Lesen und Abgleichen einer XRechnung des Auftragnehmers fehlt |
| Bürgschaften und Sicherheiten | Nur Einbehalte in Rechnungen; Gewährleistungsfristen auf dem Dashboard [34][109] | Verwaltung von Bürgschaften (Art, Betrag, Rückgabe) nicht dokumentiert |
| Excel-Workflow | kein Copy & Paste [63] | im Büroalltag sehr häufig gebraucht |
| Live-Berechnung | Kostenanalyse und Rechnungen nicht automatisch aktuell [51][45] | Fehlerquelle bei Bauherren-Berichten |
| Datenhoheit | Kein Komplettexport des Accounts dokumentiert; nach Abo-Ende kein Zugriff [62] | Lock-in-Risiko; Export nur pro Objekt (GAEB/Excel/PDF/API) |
| Offline-Arbeit | Browser-App; Aufmaß-App nur für Auftragnehmer; Baudoku-App ab 01.02.2027 angekündigt [43][113] | Begehungen ohne Netz eingeschränkt |

## Release Notes 2024–2026: Taktung und wichtige Neuerungen

NOVA veröffentlicht keine Versionsnummern, sondern verbessert die Software laufend [96]. Seit Februar 2025 gibt es eine „Was gibt es Neues"-Anzeige im Dashboard, und die Monats-Updates erscheinen meist zusätzlich als PDF [94]. Dokumentierte Update-Beiträge: 2025 etwa zehn (Feb., Mär., 10.05. „neue Version" mit neuer Oberfläche, Juni 2×, Juli 2×, Aug., Sep., Okt., Dez.); 2026 bisher sieben (Feb. 2×, Mär., Apr., Aug., Okt. 2×) sowie ein Sicherheitsupdate am 21.10.2026 [94].

| Datum | Neuerung (AVA-relevant) | Quelle |
|---|---|---|
| 2024 | LV-Positionen per Drag & Drop kopieren; Baubeschreibung parallel zum LV; Druck gruppiert nach DIN 276 und Gewerk; passwortloser Bieter-Login; preisindexierte Vergleichsprojekte; Catenda-Anbindung | [95] |
| 10.05.2025 | modernisierte Oberfläche, Übersichtslisten mit Kachel- und Kartenansicht, gespeicherte Filter | [96] |
| 06/2025 | projektweite Farblegende, zweidimensionale Kostenanalyse, 80-%-Regel für strittige Nachträge, einstellbare Gültigkeit von Einladungslinks, Prognose-Schalter „LV priorisieren" | [97][98] |
| 07/2025 | GAEB-Zuschlagsvarianten überarbeitet; Mengen-/Preisermittlungsliste; Anlagen zu Prüfrechnungen | [99] |
| 08–10/2025 | Ausschreiber-Textergänzungen in Freitext, Autosave; Druck-Vorgaben als Bürostandard; Abzüge gebündelt; Nachlass/MwSt/Skonto im Preisspiegel editierbar; Aufmaß-Warnungen; Papierkorb mit Benutzer und Zeitpunkt | [100][101][102] |
| 12/2025 | Baudokumentation als Beta: Pläne, Tickets, Protokolle, Bautagebuch | [103] |
| 02/2026 | Nachtragsanfrage per GAEB X83/X84; Platzhalter für Auftrags-/Nachtragssummen; Bildbearbeitung; LV-Anlage per REST-API; SSO ohne Passwortmaske | [104] |
| 03/2026 | Vergabevorschlag als Druckliste und Kostenanalyse-Spalte | [105] |
| 04/2026 | Rahmenvertrag-Abrufe per Excel; API-Erweiterungen | [106] |
| 08/2026 | X50/X51 neu; Kostenplanung aus LVs; XRechnung/ZUGFeRD; Anlagen in PDFs; SSO per OIDC; OAuth2-Mailversand; Stamm-LV-Rückschreiben; Messenger; viele ÖNORM-Verbesserungen | [107] |
| 10/2026 | Terminplan mit Arbeitskalendern; Passkeys; neue BIM-Technik (IFC 4.3); neues Dashboard; Kostenganglinie; HOAI-Beta; NEO Betaphase 3 | [108][109][112] |

Preisseitig (Details in [Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md)):

- Seit 01.05.2026 kosten die Pakete 49 / 89 / 129 € netto pro Floating-Nutzer und Monat (Starter/Easy/Business) [110].
- Ab 01.02.2027 kostet jedes Add-on einheitlich 40 € pro Nutzer und Monat; Baudokumentation, NEO-MCP und HOAI werden dann kostenpflichtig [113].

## Schulungsangebot: Video-Tutorials und Webinare

Die Video-Tutorials sind nach Zielgruppen in vier Kategorien sortiert: Einsteiger, BIM-Anwender, erfahrene Nutzer (neue Funktionen) und Fortgeschrittene (Tipps und Tricks) [79].

| Format | Inhalt | Quelle |
|---|---|---|
| Videos „Einstieg und Grundfunktionen" (9) | Einstieg/Dashboard, Kostenschätzung nach DIN 276, LV erstellen, Ausschreibung und Angebotscockpit, Preisspiegel und Auftragsvergabe, Bauabrechnung, Kostenermittlung, BIM-Modell, BIM-Kostenelemente | [80] |
| Videos „Neue Funktionen" (8) | SmartPool, Aufmaß-App, 3D-Viewer, Text-/Farbfilter, digitale Signaturen, Hintergrund-Jobs, Zuschlagskalkulation, Vergleichsprojekte | [81] |
| Videos „Tipps und Tricks" (16) | Angebotscockpit, Stamm-LV als Preisspeicher, MwSt, ÖNORM/LBH, Benutzerzugriffe, Kataloge, Druckvorlagen (2), STLB-Bau, DBD-BIM, Notizen und Nachlässe im Preisspiegel, Bieterlücken, gesperrte LVs, LV während laufender Ausschreibung ändern, Rahmenverträge | [82] |
| Videos „BIM 5D" (14) | IFC-Import, Filter, Kostenelemente, Kostenplanung aus Modell, LV aus Modell, BIM-LV-Container, LV-3D-Connector, Workflows mit Allplan, Archicad und Vectorworks | [83] |
| Webinare Nov./Dez. 2026 (5 × 4 h) | Dashboard → Kostenplanung → LV; BIM; LV erstellen; Angebotseinholung, Preisspiegel und Vergabe; Aufmaß, Abrechnung, Nachträge, Kostenanalyse. 299 € netto pro Person (Stand: Nov. 2026), Google Meet, mindestens 4 Teilnehmer, Aufzeichnung untersagt; laut Anbieter können Architektenkammern sie als Fortbildung (4 Einheiten) anerkennen | [84] |
| Weitere | Handbuch, Community-Forum (laut Know-How-Seite), Support per E-Mail | [78][66] |

## Relevanz für unser Projekt

### Muss-Anforderungen (aus NOVA als De-facto-Referenz abgeleitet)

1. **Domänenmodell** mit diesen Objekten: Projekt, Katalog (DIN 276 u. a.), Kostenplanung (Zeilen mit Formeln und Variablen), LV als Vergabeeinheit mit OZ-Maske, Losen und allen Positionsarten (G/A/E/M/P/F/R/Zuschlag/EPA, Bezugs-/Wiederholungstexte), Angebot (realer und virtueller Bieter), Auftrag, Nachtrag (NA-Nr. plus Statusmodell), Erfassungsblatt, Rechnung und Zahlung, Kostenanalyse.
2. **GAEB DA XML 3.3:** Import und Export X81–X86, X31 (Mengen), X50/X51 (Kosten); GAEB-90-Import; Excel-Import mit Spaltenzuordnung. Ohne das ist ein Umstieg für den Architekten undenkbar ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)).
3. **Preisspiegel** mit Bezugsangebot, Ideal-/Mittel-/Medianbieter, Ausreißern, Varianten, Nachlässen und Excel-/PDF-Ausgabe.
4. **Rechnungsprüfung** kumulativ, mit Einbehalten, Skonto, Bauabzugsteuer, Kostenteilung und E-Rechnungs-Export.
5. **Kostenanalyse** mit den genannten Spalten und einer **nachvollziehbaren, dokumentierten** Prognoseregel.
6. **Bieterportal** oder mindestens ein sauberer Datei-Rundlauf über X83/X84.
7. **Berichte:** LV, Preisspiegel, Vergabevorschlag, Prüfrechnung und Kostenstand mit Bürolayout.

### Differenzierungschancen

- **Kein Floating-Lizenz-Zwang, keine Abo-Abhängigkeit:** selbst hostbar, mit vollständigem Export (z. B. Projektarchiv als GAEB + JSON + PDF). Das zielt direkt auf den bekannten Schmerzpunkt Preis und Lizenz ([Schmerzpunkte](/okf/research/market/pain-points.md)).
- **Öffentliche Vergabe ernst nehmen:** Verfahrensassistent mit Wertgrenzen, Vergabevermerk-Vorlage nach § 20 VOB/A, Hinweise zum Verhandlungsverbot, Paket für die Übergabe an e-Vergabe-Plattformen, Bewertungsmatrix für Nicht-Preis-Kriterien.
- **Bedienkomfort:** Excel-Copy-&-Paste, live berechnete Kostenanalyse und Prüfrechnung, Undo statt „nicht umkehrbar".
- **Eingangsrechnungen:** XRechnung/ZUGFeRD des Auftragnehmers einlesen und automatisch gegen das Aufmaß abgleichen.
- **Transparenz:** offene Rechenregeln (Prognose, Rechnungsrechenweg) als testbare Spezifikation.

### Risiken

- **Textlizenzen:** STLB-Bau, DBD und Heinze VOB sind proprietär und nur per Partnerschaft integrierbar. Realistisch sind zunächst Freitext, eigene Stamm-LVs und importierte GAEB-Texte ([Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md)).
- **Rechtliche Korrektheit** (VOB/B-Abrechnung, § 650c BGB, § 48 EStG, E-Rechnungs-Pflichtfelder): Für Fachreviews durch den Architekten Zeit einplanen.
- **GAEB-Konformität:** NOVA wirbt mit einer zertifizierten GAEB-XML-Schnittstelle [90]; die BVBS-Urkunden für 3.3 galten allerdings nur bis 10.10.2026, eine Erneuerung ist nicht belegt (siehe [Unternehmen und Entwicklung](/okf/research/nova-ava/company-and-development.md)). Ohne Prüfung gegen echte Dateien drohen Austauschfehler ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)).
- **Funktionsbreite:** NOVA hat über zehn Jahre Entwicklung (Updates seit 2014 [94]). Wir sollten nicht die ganze Breite (BIM, HOAI, KI, Auktionen) nachbauen.

### Grobe Aufwandsschätzung (Einschätzung, 1 Entwickler, Personenmonate)

| Baustein | PM |
|---|---|
| Domänenmodell + Projekt/Rollen | 1–1,5 |
| Kostenplanung DIN 276 mit Formeln | 1–2 |
| LV-Editor (Gliederung, Positionsarten, Langtext) | 2–3 |
| GAEB X81–X86/X31 Import/Export + Tests | 3–4 |
| Preisspiegel + Wertung | 1–2 |
| Nachträge + Aufmaß (REB-Formeln) | 2–3 |
| Prüfrechnung + E-Rechnung | 1,5–2,5 |
| Kostenanalyse + Berichte (PDF/Excel) | 2–3 |
| Bieterportal (optional) | 2–3 |
| **MVP ohne Portal** | **ca. 14–21 PM** |

**Abgleich (09.11.2026):** „MVP“ heißt hier die ganze Kette von der Kostenplanung bis zur Kostenanalyse (LPH 2/3 bis 8). Andere Notizen meinen mit MVP nur LPH 6–7 und schätzen dafür 4–9 PM; die vergleichbare Teilsumme hier (Domänenmodell, LV-Editor, GAEB, Preisspiegel) liegt bei 7–10,5 PM. Für die vollständige LPH 6–8 nennen andere Notizen 9–35 PM, für GAEB allein 1–3 PM statt 3–4 PM. Der Umfang erklärt das nur teilweise (widersprüchlich - siehe Offene Fragen). Gegenüberstellung aller Schätzungen: [Schmerzpunkte, Aufwandsschätzung](/okf/research/market/pain-points.md).

## Offene Fragen

### Nicht gefunden, nicht verifiziert oder widersprüchlich

- **Gleichzeitige Bearbeitung:** Unklar, ob zwei Nutzer dasselbe LV gleichzeitig bearbeiten können; das Handbuch nennt nur eine Sperre bei aktiver Bearbeitung [57].
- **Prognoseregel:** Projekt- und Gesamtanalyse beschreiben die Prognose für nicht beauftragte LV-Positionen unterschiedlich – „höherer Wert aus Kostenplanung/Kostenanschlag" gegenüber „Kostenanschlag" [51][52].
- **Bieter-Linkgültigkeit:** Das Handbuch nennt fest 10 Minuten [27], die Release Notes von Juni 2025 eine einstellbare Gültigkeit [97] (möglicherweise zwei verschiedene Links).
- **Zitierweise VOB/A:** Das Handbuch schreibt „VOB/A § 4 Nr. 4"; korrekt nach VOB/A 2019 ist § 4 Abs. 4 [34][116]. Die Bezeichnung „VOB 80-Prozent-Regelung" verweist sachlich auf § 650c Abs. 3 BGB [114].
- **Formblätter EFB 221–223:** genaue Titel und VHB-Stand nicht geprüft; die Formblatt-Liste beim FIB wurde nicht geöffnet.
- **Exportumfang:** Ob ein Komplettexport des Accounts existiert und wie weit die REST-API für Migrationen reicht, gehört in [API und Datenmodell](/okf/research/nova-ava/api-and-data-model.md).
- **YouTube:** Kanal, Videolängen und Upload-Daten nicht erhoben (Suchbudget erschöpft; Video-IDs auf nova-ava.de hinter Consent-Blocker).
- **Webinare:** Agenden der Webinar-Detailseiten nicht gelesen; vorhanden sind nur die Titel.
- **Herkunft der Handbuchtexte:** Das Handbuch ist neu und sehr gleichförmig verfasst. Einzelne Aussagen sollte man im echten System gegenprüfen (das kann der Architekten-Freund).
- **Aufwandsschätzungen abgleichen:** Die Notizen nennen für gleiche Umfänge Werte, die um den Faktor 2–3 auseinanderliegen (Gegenüberstellung in [Schmerzpunkte](/okf/research/market/pain-points.md)). Offen ist eine gemeinsame Bottom-up-Schätzung mit einheitlichem Umfang, einheitlicher Einheit (1 PM ≈ 4 PW ≈ 20 PT) und klaren Annahmen.

### Fragen an den Architekten-Freund

1. Welches Paket und welche Add-ons nutzt du (Starter/Easy/Business, BIM, Terminplanung, Kalkulation), und mit wie vielen gleichzeitigen Lizenzen?
2. Nutzt du das Angebotscockpit, oder laufen öffentliche Vergaben über eine e-Vergabe-Plattform des Auftraggebers – und wenn ja, über welche?
3. Wie dokumentierst du heute Vergabevermerk, Wertung und Absagen bei öffentlichen Auftraggebern?
4. Welche Textquellen nutzt du (STLB-Bau, Heinze, eigene Stamm-LVs, SmartPool)? Ist die STLB-Lizenz ein relevanter Kostenblock?
5. Wer erfasst Aufmaße – du selbst, die Auftragnehmer über das Portal/die App oder per DA11/X31-Datei?
6. Bekommst du Rechnungen inzwischen als XRechnung oder ZUGFeRD? Wie prüfst du sie?
7. Welche Berichte gibst du Bauherren (Kostenstand, Vergabevorschlag, Prüfrechnung), und was stört dich an deren Layout?
8. Welche der hier gelisteten Einschränkungen (Copy & Paste, manuelle Aktualisierung, Sperren, irreversible Aktionen, 2-Stunden-Logout) treffen dich im Alltag?
9. Arbeitest du mit Fachplanern oder Kollegen gleichzeitig im selben LV?
10. Brauchst du BIM/IFC, HOAI-Honorare oder KI überhaupt, oder sind das für dich Randthemen?

## Quellen

Handbuch (alle Artikel: `https://manual.avanova.io/articles/<slug>`, Weiterleitung von handbuch.avanova.de), Herausgeber NOVA BUILDING IT GmbH, Art: Primärquelle/Herstellerangabe, abgerufen 2026-11-09:

[1] Handbuch NOVA AVA („Novadex"): Startseite, Kategorien, Menüpfade, Glossar, Leitfäden – NOVA BUILDING IT – https://manual.avanova.io/ (Inhaltsdaten: https://manual.avanova.io/api/articles) – Primärquelle – abgerufen 2026-11-09
[2] NOVA AVA kennenlernen und erste Schritte – https://manual.avanova.io/articles/nova-ava-kennenlernen-und-erste-schritte – Primärquelle – abgerufen 2026-11-09
[3] Projekte erstellen und Projekteigenschaften festlegen – https://manual.avanova.io/articles/projekte-erstellen-und-eigenschaften-festlegen – Primärquelle – abgerufen 2026-11-09
[4] Projekte verwalten und die Projektübersicht nutzen – https://manual.avanova.io/articles/projekte-verwalten-und-uebersicht – Primärquelle – abgerufen 2026-11-09
[5] Kostenplanung im Projekt erstellen und Eigenschaften festlegen – https://manual.avanova.io/articles/kostenplanung-im-projekt-erstellen-und-eigenschaften-festlegen – Primärquelle – abgerufen 2026-11-09
[6] DIN 276 Kostenplanung: Kalkulation und Werte berechnen – https://manual.avanova.io/articles/din-276-kostenplanung-kalkulation-und-werte-berechnen – Primärquelle – abgerufen 2026-11-09
[7] DIN 276 Kostenplanung: Ansicht und Einstellungen konfigurieren – https://manual.avanova.io/articles/din-276-kostenplanung-ansicht-und-einstellungen-konfigurieren – Primärquelle – abgerufen 2026-11-09
[8] Kostenplanung generieren und Vergabeeinheiten ableiten – https://manual.avanova.io/articles/kostenplanung-generieren-und-vergabeeinheiten-ableiten – Primärquelle – abgerufen 2026-11-09
[9] Kostenplanung im Projekt überblicken und Eigenschaften festlegen – https://manual.avanova.io/articles/kostenplanung-im-projekt-ueberblicken-und-eigenschaften-festlegen – Primärquelle – abgerufen 2026-11-09
[10] Leistungsverzeichnisse: Übersicht und Verwaltung – https://manual.avanova.io/articles/leistungsverzeichnisse-uebersicht-und-verwaltung – Primärquelle – abgerufen 2026-11-09
[11] Neues Leistungsverzeichnis erstellen und Eigenschaften festlegen – https://manual.avanova.io/articles/neues-leistungsverzeichnis-erstellen-und-eigenschaften-festlegen – Primärquelle – abgerufen 2026-11-09
[12] LV-Elemente einfügen und strukturieren – https://manual.avanova.io/articles/lv-elemente-einfuegen-und-strukturieren – Primärquelle – abgerufen 2026-11-09
[13] LV-Elemente bearbeiten und Attribute festlegen – https://manual.avanova.io/articles/lv-elemente-bearbeiten-und-attribute-festlegen – Primärquelle – abgerufen 2026-11-09
[14] Leistungsverzeichnisse importieren – https://manual.avanova.io/articles/leistungsverzeichnisse-importieren – Primärquelle – abgerufen 2026-11-09
[15] Positionen aus Textquellen einfügen – https://manual.avanova.io/articles/positionen-aus-textquellen-einfuegen – Primärquelle – abgerufen 2026-11-09
[16] Textspeicher und externe Ausschreibungstextsysteme konfigurieren – https://manual.avanova.io/articles/textspeicher-und-ausschreibungstextsysteme-konfigurieren – Primärquelle – abgerufen 2026-11-09
[17] Textblöcke für die LV-Erstellung verwalten – https://manual.avanova.io/articles/textblocke-fur-die-lv-erstellung-verwalten – Primärquelle – abgerufen 2026-11-09
[18] Mengenvorermittlung durchführen – https://manual.avanova.io/articles/mengenvorermittlung-durchfuehren – Primärquelle – abgerufen 2026-11-09
[19] Kalkulation von Einheitspreisen durchführen – https://manual.avanova.io/articles/kalkulation-von-einheitspreisen-durchfuehren – Primärquelle – abgerufen 2026-11-09
[20] LV-Prüfung durchführen – https://manual.avanova.io/articles/lv-pruefung-durchfuehren – Primärquelle – abgerufen 2026-11-09
[21] GAEB-Dateien exportieren und Austauschphasen festlegen – https://manual.avanova.io/articles/gaeb-dateien-exportieren-und-austauschphasen-festlegen – Primärquelle – abgerufen 2026-11-09
[22] Ausschreibungen verwalten und Bieter einladen – https://manual.avanova.io/articles/ausschreibungen-verwalten-und-bieter-einladen – Primärquelle – abgerufen 2026-11-09
[23] Submissionstermin festlegen und Ausschreibung veröffentlichen – https://manual.avanova.io/articles/submissionstermin-festlegen-und-ausschreibung-veroeffentlichen – Primärquelle – abgerufen 2026-11-09
[24] Ausschreibungsunterlagen und Fragenkatalog verwalten – https://manual.avanova.io/articles/ausschreibungsunterlagen-und-fragenkatalog-verwalten – Primärquelle – abgerufen 2026-11-09
[25] LV-spezifische Einstellungen für Ausschreibung und Angebote – https://manual.avanova.io/articles/lv-spezifische-einstellungen-fuer-ausschreibung-und-angebote – Primärquelle – abgerufen 2026-11-09
[26] Angebote erstellen, importieren und verwalten – https://manual.avanova.io/articles/angebote-erstellen-importieren-und-verwalten – Primärquelle – abgerufen 2026-11-09
[27] Angebote prüfen und bearbeiten – https://manual.avanova.io/articles/angebote-pruefen-und-bearbeiten – Primärquelle – abgerufen 2026-11-09
[28] Preisspiegel anzeigen und konfigurieren – https://manual.avanova.io/articles/preisspiegel-anzeigen-und-konfigurieren – Primärquelle – abgerufen 2026-11-09
[29] Angebote werten und vergleichen – https://manual.avanova.io/articles/angebote-werten-und-vergleichen – Primärquelle – abgerufen 2026-11-09
[30] Erweiterte Angebotsverwaltung und Preisvergleich – https://manual.avanova.io/articles/erweiterte-angebotsverwaltung-und-preisvergleich – Primärquelle – abgerufen 2026-11-09
[31] Angebote verhandeln und Nachlässe umlegen – https://manual.avanova.io/articles/angebote-verhandeln-und-nachlaesse-umlegen – Primärquelle – abgerufen 2026-11-09
[32] Auktionen und E-Bidding durchführen – https://manual.avanova.io/articles/auktionen-und-e-bidding-durchfuehren – Primärquelle – abgerufen 2026-11-09
[33] Angebote beauftragen und losweise Vergabe durchführen – https://manual.avanova.io/articles/angebote-beauftragen-und-losweise-vergabe-durchfuehren – Primärquelle – abgerufen 2026-11-09
[34] Aufträge beauftragen, aufheben und Vertragsinformationen verwalten – https://manual.avanova.io/articles/auftraege-beauftragen-aufheben-und-vertragsinformationen-verwalten – Primärquelle – abgerufen 2026-11-09
[35] Vergabeeinheiten und Rahmenverträge erstellen – https://manual.avanova.io/articles/vergabeeinheiten-und-rahmenvertraege-erstellen – Primärquelle – abgerufen 2026-11-09
[36] Direktaufträge erstellen und vergeben – https://manual.avanova.io/articles/direktauftraege-erstellen-und-vergeben – Primärquelle – abgerufen 2026-11-09
[37] Nachtragsleistungen erfassen, bearbeiten und genehmigen – https://manual.avanova.io/articles/nachtragsleistungen-erfassen-bearbeiten-und-genehmigen – Primärquelle – abgerufen 2026-11-09
[38] Nachträge: Übersicht und Ansicht der Nachtragsspalten – https://manual.avanova.io/articles/nachtraege-uebersicht-ansicht-und-lv-pruefung – Primärquelle – abgerufen 2026-11-09
[39] Nachträge und Nachtragsangebote importieren (inkl. „Nachtragsangebote anfordern und importieren") – https://manual.avanova.io/articles/nachtraege-und-nachtragsangebote-importieren und https://manual.avanova.io/articles/nachtragsangebot-importieren – Primärquelle – abgerufen 2026-11-09
[40] Leistungserfassung und Aufmaß überblicken – https://manual.avanova.io/articles/leistungserfassung-und-aufmass-ueberblicken – Primärquelle – abgerufen 2026-11-09
[41] Aufmaße erfassen: Direkte Eingabe und Import – https://manual.avanova.io/articles/aufmasse-erfassen-direkte-eingabe-und-import – Primärquelle – abgerufen 2026-11-09
[42] Erfassungsblätter anlegen, bearbeiten und freigeben – https://manual.avanova.io/articles/erfassungsblaetter-anlegen-bearbeiten-und-freigeben – Primärquelle – abgerufen 2026-11-09
[43] Auftragnehmern Zugang zur Leistungserfassung freischalten – https://manual.avanova.io/articles/auftragnehmern-zugang-zur-leistungserfassung-freischalten – Primärquelle – abgerufen 2026-11-09
[44] Soll-Ist-Vergleich für Kosten- und Mengenüberwachung – https://manual.avanova.io/articles/soll-ist-vergleich-fuer-kosten-und-mengenueberwachung – Primärquelle – abgerufen 2026-11-09
[45] Rechnungs- und Zahlungsverwaltung starten und überblicken – https://manual.avanova.io/articles/rechnungs-und-zahlungsverwaltung-starten-und-ueberblicken – Primärquelle – abgerufen 2026-11-09
[46] Neue Rechnungen und Zahlungen erstellen – https://manual.avanova.io/articles/neue-rechnungen-und-zahlungen-erstellen – Primärquelle – abgerufen 2026-11-09
[47] Rechnungsdaten anpassen und verwalten – https://manual.avanova.io/articles/rechnungsdaten-anpassen-und-verwalten – Primärquelle – abgerufen 2026-11-09
[48] Rechnungen freigeben und Kostenteilung festlegen – https://manual.avanova.io/articles/rechnungen-freigeben-und-kostenteilung-festlegen – Primärquelle – abgerufen 2026-11-09
[49] Elektronische Rechnungen exportieren – https://manual.avanova.io/articles/elektronische-rechnungen-exportieren – Primärquelle – abgerufen 2026-11-09
[50] Kostenanalyse im Projekt erstellen und verwalten – https://manual.avanova.io/articles/kostenanalyse-im-projekt-erstellen-und-verwalten – Primärquelle – abgerufen 2026-11-09
[51] Projektspezifische Kostentabelle konfigurieren und nutzen (inkl. FAQ „Spalte Rechnungsfreigabe") – https://manual.avanova.io/articles/projektspezifische-kostentabelle-konfigurieren-und-nutzen und https://manual.avanova.io/articles/spalte-rechnungsfreigabe-in-der-kostenanalyse – Primärquelle – abgerufen 2026-11-09
[52] Projektübergreifende Kostenanalyse durchführen – https://manual.avanova.io/articles/projektuebergreifende-kostenanalyse-durchfuehren – Primärquelle – abgerufen 2026-11-09
[53] PDF-Dokumente erzeugen und allgemeine Einstellungen vornehmen – https://manual.avanova.io/articles/pdf-dokumente-erzeugen-und-allgemeine-einstellungen-vornehmen – Primärquelle – abgerufen 2026-11-09
[54] Druckvorlagen mit dem Druckdesigner erstellen und verwalten – https://manual.avanova.io/articles/druckvorlagen-mit-dem-druckdesigner-erstellen-und-verwalten – Primärquelle – abgerufen 2026-11-09
[55] Excel-Dateien aus verschiedenen Modulen exportieren – https://manual.avanova.io/articles/excel-dateien-aus-verschiedenen-modulen-exportieren – Primärquelle – abgerufen 2026-11-09
[56] Excel-Vorlagen für den Datenexport importieren und verwalten – https://manual.avanova.io/articles/excel-vorlagen-fur-den-datenexport-importieren-und-verwalten – Primärquelle – abgerufen 2026-11-09
[57] LV-Typen, Phasen und Rechte verwalten – https://manual.avanova.io/articles/lv-typen-phasen-und-rechte-verwalten – Primärquelle – abgerufen 2026-11-09
[58] Benutzer und Admin-Rollen verwalten – https://manual.avanova.io/articles/benutzer-und-admin-rollen-verwalten – Primärquelle – abgerufen 2026-11-09
[59] Anmelde- und Sicherheitseinstellungen konfigurieren – https://manual.avanova.io/articles/anmelde-und-sicherheitseinstellungen-konfigurieren – Primärquelle – abgerufen 2026-11-09
[60] Sitzungsverwaltung und automatische Abmeldung von Benutzern – https://manual.avanova.io/articles/sitzungsverwaltung-und-automatische-abmeldung-von-benutzern – Primärquelle – abgerufen 2026-11-09
[61] Abonnement anpassen und verwalten (inkl. „Vom Testkonto zur Produktlizenz") – https://manual.avanova.io/articles/abonnement-anpassen-und-verwalten und https://manual.avanova.io/articles/dein-abonnement-in-nova-ava-vom-testkonto-zur-produktlizenz – Primärquelle – abgerufen 2026-11-09
[62] Abonnement kündigen und pausieren – https://manual.avanova.io/articles/abonnement-kuendigen-und-pausieren – Primärquelle – abgerufen 2026-11-09
[63] Bulk-Import von Kostenansätzen per CSV – https://manual.avanova.io/articles/bulk-import-von-kostenansaetzen-per-csv – Primärquelle – abgerufen 2026-11-09
[64] Leistungsverzeichnisse, Kostenplanungen und Terminpläne archivieren – https://manual.avanova.io/articles/leistungsverzeichnisse-archivieren – Primärquelle – abgerufen 2026-11-09
[65] Gelöschte Projekte und Leistungsverzeichnisse wiederherstellen – https://manual.avanova.io/articles/geloeschte-projekte-und-leistungsverzeichnisse-wiederherstellen – Primärquelle – abgerufen 2026-11-09
[66] Protokolle und Schnittstellen – https://manual.avanova.io/articles/protokolle-und-schnittstellen-ueberwachen – Primärquelle – abgerufen 2026-11-09
[67] Integration externer Dienste und E-Signaturen – https://manual.avanova.io/articles/integration-externer-dienste-und-e-signaturen – Primärquelle – abgerufen 2026-11-09
[68] BIM in NOVA AVA im Überblick – https://manual.avanova.io/articles/grundlagen-des-bim-moduls-und-3d-modelle-verwalten – Primärquelle – abgerufen 2026-11-09
[69] So liest NOVA AVA ein IFC-Modell ein (inkl. FAQ IFC-Export) – https://manual.avanova.io/articles/so-liest-nova-ava-ein-ifc-modell-ein und https://manual.avanova.io/articles/faq1 – Primärquelle – abgerufen 2026-11-09
[70] Den Viewer mit dem KI-Assistenten NEO nutzen – https://manual.avanova.io/articles/den-viewer-mit-dem-ki-assistenten-neo-nutzen – Primärquelle – abgerufen 2026-11-09
[71] HOAI-Modul im Überblick – https://manual.avanova.io/articles/hoai-angebote-abrechnungen-und-honorarsummen – Primärquelle – abgerufen 2026-11-09
[72] Häufige Fragen zur HOAI-Honorarberechnung – https://manual.avanova.io/articles/haeufige-fragen-zur-hoai-honorarberechnung – Primärquelle – abgerufen 2026-11-09
[73] Mehrere Objekte nach § 11 HOAI berechnen – https://manual.avanova.io/articles/mehrere-objekte-nach-11-hoai-berechnen – Primärquelle – abgerufen 2026-11-09
[74] Terminpläne aus Microsoft Project, Primavera P6 und GanttProject importieren – https://manual.avanova.io/articles/terminplaene-importieren – Primärquelle – abgerufen 2026-11-09
[75] Baudokumentation: Überblick und Navigation – https://manual.avanova.io/articles/baudokumentation-ueberblick-und-erste-schritte – Primärquelle – abgerufen 2026-11-09
[76] Leitfaden „Vom Projekt zum beauftragten LV" – https://manual.avanova.io/leitfaden/vom-projekt-zum-beauftragten-lv – Primärquelle – abgerufen 2026-11-09
[77] Zeichenbegrenzungen bei der Mengenermittlung nach REB 23.003 – https://manual.avanova.io/articles/zeichenbegrenzungen-bei-der-mengenermittlung-nach-reb-23-003 – Primärquelle – abgerufen 2026-11-09

Website nova-ava.de, Herausgeber NOVA BUILDING IT GmbH, Art: Herstellerangabe, abgerufen 2026-11-09:

[78] NOVA Knowhow (Übersicht) – https://nova-ava.de/know-how/ – Herstellerangabe – abgerufen 2026-11-09
[79] Video-Tutorials (Übersicht) – https://nova-ava.de/video-tutorials/ – Herstellerangabe – abgerufen 2026-11-09
[80] Video-Tutorials: Einstieg und Grundfunktionen – https://nova-ava.de/video-tutorials/einstieg-und-grundfunktionen/ – Herstellerangabe – abgerufen 2026-11-09
[81] Video-Tutorials: Neue Funktionen vorgestellt – https://nova-ava.de/video-tutorials/neue-funktionen-vorgestellt/ – Herstellerangabe – abgerufen 2026-11-09
[82] Video-Tutorials: Tipps und Tricks – https://nova-ava.de/video-tutorials/tipps-und-tricks/ – Herstellerangabe – abgerufen 2026-11-09
[83] Video-Tutorials: BIM 5D Baukostenmanagement mit BIM – https://nova-ava.de/video-tutorials/bim-5d-baukostenmanagement-mit-bim/ – Herstellerangabe – abgerufen 2026-11-09
[84] Webinare – https://nova-ava.de/webinare – Herstellerangabe – abgerufen 2026-11-09
[85] Funktionen (Übersicht) – https://nova-ava.de/funktionen/ – Herstellerangabe – abgerufen 2026-11-09
[86] Funktion Ausschreibung und Vergabe – https://nova-ava.de/funktionen/ausschreibung-und-vergabe/ – Herstellerangabe – abgerufen 2026-11-09
[87] Funktion Abrechnung – https://nova-ava.de/funktionen/abrechnung/ – Herstellerangabe – abgerufen 2026-11-09
[88] Funktion Kostenanalyse – https://nova-ava.de/funktionen/kostenanalyse/ – Herstellerangabe – abgerufen 2026-11-09
[89] NOVA SmartPool – https://nova-ava.de/funktionen/nova-smartpool/ – Herstellerangabe – abgerufen 2026-11-09
[90] Ausschreibungstexte – https://nova-ava.de/funktionen/ausschreibungstexte/ – Herstellerangabe – abgerufen 2026-11-09
[91] Smartes Leistungsverzeichnis – https://nova-ava.de/funktionen/smartes-leistungsverzeichnis/ – Herstellerangabe – abgerufen 2026-11-09
[92] Add-ons – https://nova-ava.de/funktionen/add-ons/ – Herstellerangabe – abgerufen 2026-11-09
[93] NEO – Baukosten-KI (Beta) – https://nova-ava.de/neo-baukosten-ki/ – Herstellerangabe – abgerufen 2026-11-09
[94] Neues/News-Archiv inkl. RSS-Feed (2014–2026) – https://nova-ava.de/neues/ und https://nova-ava.de/feed/ – Herstellerangabe – abgerufen 2026-11-09

News und Release Notes auf nova-ava.de, Art: Herstellerangabe (Release Notes), abgerufen 2026-11-09:

[95] NOVA AVA Updates aus 2024 (31.12.2024) – https://nova-ava.de/nova-ava-updates-aus-2024/ – Herstellerangabe – abgerufen 2026-11-09
[96] Neue Version, neue Website, neues Logo (08.05.2025) – https://nova-ava.de/neue-version-neue-website-neues-logo/ – Herstellerangabe – abgerufen 2026-11-09
[97] Informationen zum Update 2025 Juni 01 (02.06.2025) – https://nova-ava.de/informationen-zum-update-1-6-2025/ – Herstellerangabe – abgerufen 2026-11-09
[98] Kostenprognose verbessert (Update 2025 Juni 02, 05.06.2025) – https://nova-ava.de/kostenprognose-verbessert-und-mehr-im-update-4-6-25/ – Herstellerangabe – abgerufen 2026-11-09
[99] Update Juli 2025 (02) (22.07.2025) – https://nova-ava.de/gaeb-bauzeitenplan-bauabrechnung/ – Herstellerangabe – abgerufen 2026-11-09
[100] Update August 2025 (18.08.2025) – https://nova-ava.de/ausschreibertextergaenzungen-als-neue-funktion/ – Herstellerangabe – abgerufen 2026-11-09
[101] Update September 2025 (16.09.2025) – https://nova-ava.de/updates-august-2025-einheitliche-vorgaben-pdf/ – Herstellerangabe – abgerufen 2026-11-09
[102] Update Oktober 2025 (25.10.2025) – https://nova-ava.de/update-oktober-2025-nova-ava/ – Herstellerangabe – abgerufen 2026-11-09
[103] 4 neue Tools für LP8 (03.12.2025) – https://nova-ava.de/neue-tools-fuer-lp8/ – Herstellerangabe – abgerufen 2026-11-09
[104] Update Februar 2026 (26.02.2026) – https://nova-ava.de/update-februar-2026/ – Herstellerangabe – abgerufen 2026-11-09
[105] Update März 2026 (23.03.2026) – https://nova-ava.de/update-maerz-2026/ – Herstellerangabe – abgerufen 2026-11-09
[106] Update April 2026 (21.04.2026) – https://nova-ava.de/update-april-2026-rahmenvertraege-und-mehr/ – Herstellerangabe – abgerufen 2026-11-09
[107] Update August 2026 – Nr. 1 + 2 (24.08.2026) – https://nova-ava.de/update-august-2026/ – Herstellerangabe – abgerufen 2026-11-09
[108] Terminplan als Fokus im Update Oktober 2026 (07.10.2026) – https://nova-ava.de/terminplan-update-oktober-2026/ – Herstellerangabe – abgerufen 2026-11-09
[109] Neue BIM-Technologie und HOAI Add-on in NOVA AVA (26.10.2026) – https://nova-ava.de/neue-bim-technologie-und-hoai/ – Herstellerangabe – abgerufen 2026-11-09
[110] NOVA AVA Preisanpassungen 2026: Tarife ab 1. Mai (18.02.2026) – https://nova-ava.de/nova-ava-preisanpassungen-2026-tarife-ab-1-mai/ – Herstellerangabe – abgerufen 2026-11-09
[111] BIM World 2026 – NOVA präsentiert NEO die Baukosten-KI & mehr (29.10.2026) – https://nova-ava.de/bim-world-2026-nova-praesentiert-neo/ – Presse/Herstellerangabe – abgerufen 2026-11-09
[112] Neues HOAI-Modul – kostenlos in NOVA AVA (27.10.2026) – https://nova-ava.de/neues-hoai-modul-in-nova-ava/ – Herstellerangabe – abgerufen 2026-11-09
[113] Einheitliches Preismodell für Add-ons ab 1.2.2027 (29.10.2026) – https://nova-ava.de/neues-preismodell-nova-ava-add-ons/ – Herstellerangabe – abgerufen 2026-11-09

Gesetze und Regelwerke:

[114] § 650c BGB (Vergütungsanpassung, Abs. 3: 80 % bei Abschlagszahlungen) – Bundesministerium der Justiz – https://www.gesetze-im-internet.de/bgb/__650c.html – Gesetz – abgerufen 2026-11-09
[115] § 48 EStG (Bauabzugsteuer 15 %) – Bundesministerium der Justiz – https://www.gesetze-im-internet.de/estg/__48.html – Gesetz – abgerufen 2026-11-09
[116] § 4 VOB/A 2019 (Vertragsarten, Abs. 4 Auf- und Abgebotsverfahren) – dejure.org (Wiedergabe) – https://dejure.org/gesetze/VOB-A/4.html – Regelwerk – abgerufen 2026-11-09
[117] § 15 VOB/A 2019 (Aufklärung, Abs. 3 Verhandlungsverbot) – dejure.org (Wiedergabe) – https://dejure.org/gesetze/VOB-A/15.html – Regelwerk – abgerufen 2026-11-09
[118] § 20 VOB/A 2019 (Dokumentation, Informationspflicht) – dejure.org (Wiedergabe) – https://dejure.org/gesetze/VOB-A/20.html – Regelwerk – abgerufen 2026-11-09
