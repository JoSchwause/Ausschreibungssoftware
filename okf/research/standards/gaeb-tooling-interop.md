---
type: Research Note
title: "GAEB in der Praxis: Bibliotheken, Werkzeuge und Interoperabilitätsprobleme"
description: Umsetzungsseite von GAEB – kommerzielle und freie Bibliotheken, kostenlose Viewer/Konverter/Prüfwerkzeuge, der Datenrücklauf von Bietern, typische Interoperabilitätsfehler und die BVBS-Zertifizierung – als Entscheidungsgrundlage „bauen oder wiederverwenden" für die GAEB-Schnittstelle unseres Open-Source-AVA-Projekts.
resource: https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/
tags: [research, gaeb, interoperabilität, bibliotheken, zertifizierung, bieter, open-source]
timestamp: 2026-11-09T17:16:17Z
sources: 58
confidence: mittel
---

# GAEB in der Praxis: Bibliotheken, Werkzeuge und Interoperabilitätsprobleme

> Stand aller Zahlen: 2026-11-09, sofern nicht anders angegeben. Diese Notiz ergänzt
> [GAEB DA XML: Standard, Austauschphasen und Datenmodell](/okf/research/standards/gaeb-da-xml.md)
> um die Implementierungsseite. Methodik-Hinweis: Das gemeinsame Websuch-Kontingent war während der
> Recherche erschöpft. Primärquellen (GAEB, BVBS, Herstellerhandbücher, Quellcode, Paketregister)
> wurden direkt gelesen; Foren und Bewertungsportale zu GAEB-Problemen konnten nicht mehr ausgewertet
> werden (siehe [Offene Fragen](#offene-fragen)).

## Kurzfassung

- **Gültig ist GAEB DA XML 3.3** (Schemata 2021-05, Fachdokumentation 2023-01); 3.4 existiert nur als Beta
  (2026-03) [1][6]. Der GAEB erklärt 3.3 ausdrücklich für syntaktisch inkompatibel zu allen Vorgängern:
  „Eine Kompatibilität zur Syntax der vorherigen Regelungen einschließlich XML 3.2 ist nicht vorhanden." [2]
  In der Praxis laufen trotzdem GAEB 90 (`.D8x`), GAEB 2000 (`.P8x`) und XML 3.1/3.2/3.3 parallel [29][33][30].
- **Kommerzielle Referenz für Entwickler** ist Dangl IT: .NET-Bibliotheken seit 2013 für alle Formate inkl.
  GAEB 90/2000 (Preis auf Anfrage) und die SaaS-API AVACloud ab 99 €/Monat [18][19][20]. MWM bietet eine
  Windows-DLL („GAEB-Toolbox", Preis auf Anfrage) [15]. Beide sind proprietär.
- **Open Source ist neu, aber ernst zu nehmen:** pyGAEB (Python, MIT, DA XML 2.0–3.3, aktivstes Projekt),
  gaebboss (Rust + Python, MIT/Apache-2.0, erst seit 2026-11-01), openbim-gaeb (Rust, verlustfrei) und
  gaeb-php (nur 3.3) [40][42][43][44]. Für Java, TypeScript und .NET gibt es keine reife freie Bibliothek;
  **GAEB 90 ist in OSS praktisch nicht belastbar abgedeckt** [46][56][57].
- **Kostenlose Werkzeuge:** WebGAEB (Online-Konverter/-Viewer inkl. Excel), MWM-Primo (Ansehen gratis),
  der GAEB-XML-Checker des BVBS (nur formale Schemaprüfung) [22][16][1].
- **Bieter** lesen X83 und schreiben X84 mit Kalkulations- oder Handwerkersoftware; ohne Software bleiben
  Viewer, Excel-Umwege, Bieterportale oder Papier/PDF – dann tippt der Architekt ab [3][26][34][35].
  VOB/A § 13 erlaubt Kurzfassungen nur mit vollständigen, unveränderten Ordnungszahlen [39].
- **Häufigste Fehlerbilder:** falsche Version/Phase, veränderte OZ-Struktur, Rundungsdifferenzen,
  Formatierungsverlust (GAEB 90 kennt keine Formatierung), falsch deklarierte Zeichensätze,
  herstellerspezifische Elemente und schemawidrige Dateien „aus der freien Wildbahn" [24][29][42][40][14].
- **Viele Regeln sind exakt normiert** (Rundung, X84-Struktur, max. 14 OZ-Zeichen, EP mit 3 und GB mit
  2 Nachkommastellen, Einheit max. 4 Zeichen) – daraus lassen sich automatische Prüfungen bauen [4][5].
- **BVBS-Zertifizierung** (AVA, Bauausführung, Mengenermittlung, Texterstellung): 5 Jahre gültig, Erstprüfung
  2.950 € für Nichtmitglieder (Stand 09/2021); Prüfkriterien und Prüfdateien sind öffentlich [8][9].
  **NOVA AVA 4 steht für AVA und Bauausführung (XML 3.2/3.3) auf der BVBS-Liste**, nicht für Mengenermittlung [8].
  Die 3.3-Urkunden galten aber nur bis 10.10.2026; eine Erneuerung ist nicht belegt. Die Liste nennt keine Daten,
  „gelistet“ heißt also nicht sicher „gültig“ [58].
- **Einschätzung:** Wiederverwenden statt neu bauen – eigenes Domänenmodell, GAEB nur als Adapter; Basis
  pyGAEB oder gaebboss je nach Technologie, offizielle XSD und BVBS-Prüfdateien als Tests, tolerant lesen und
  streng schreiben; GAEB 90 und ein Excel-/Browser-Rückweg für Bieter selbst bauen.

## Begriffe für Nicht-Architekten

| Begriff | Erklärung |
|---|---|
| GAEB | Gemeinsamer Ausschuss Elektronik im Bauwesen; definiert die deutschen Austauschformate für Leistungsverzeichnisse (LV, engl. *bill of quantities*). Umgangssprachlich heißen auch die Dateien „GAEB" [3]. |
| GAEB 90 / GAEB 2000 / GAEB DA XML | Drei Formatgenerationen: GAEB 90 = Textdatei mit Zeilen von genau 80 Zeichen (`.D8x`), GAEB 2000 = Textformat mit Tags (`.P8x`), GAEB DA XML = XML (`.X8x`) [14][24][3]. |
| Austauschphase (Datenart) | Zweck einer Datei, steht in der Endung: 81 LV-Übergabe, 82 Kostenanschlag, 83 Angebotsaufforderung, 84 Angebotsabgabe, 85 Nebenangebot, 86 Auftragserteilung, 31 Mengenermittlung, 89 Rechnung [4]. |
| Ordnungszahl (OZ) | Hierarchische Positionsnummer, z. B. `01.02.0030` (Los/Titel/Position, optional ein Index-Zeichen) [14]. |
| OZ-Maske (`BoQBkdn`) | Festlegung der Stellen je Gliederungsstufe, z. B. `1122PPPPI` = 2 + 2 Stellen Gliederung, 4 Stellen Position, 1 Index [14][4]. |
| Einheitspreis (EP), Gesamtbetrag (GB, auch GP) | Preis je Mengeneinheit bzw. gerundetes Produkt aus Menge und EP [4]. |
| Kurztext / Langtext | Kurzbezeichnung bzw. vollständige, ggf. formatierte Leistungsbeschreibung einer Position [4]. |
| Textergänzung („Bieterlücke") | Im Text vorgesehene Lücke, die Ausschreibender oder Bieter ausfüllt (z. B. Fabrikat); muss in der X84 mit unveränderter Nummer zurückkommen [4]. |
| Bedarfs-, Alternativ-, Zuschlags-, Pauschalposition | Sonderpositionen (nur bei Bedarf; Alternative zu einer Grundposition; prozentualer Aufschlag; Pauschalpreis). Sie zählen unterschiedlich in Summen – eine häufige Fehlerquelle [4][10]. |
| Preisspiegel | Positionsweiser Vergleich aller Angebote; im GAEB-Modell X83 plus beliebig viele X84 [4]. |
| Kalkulationssoftware | Programm des Bieters zur Preisermittlung; liest X83, schreibt X84 [14]. |
| Fachplaner / TGA | Fachingenieure, z. B. Technische Gebäudeausrüstung (Heizung, Lüftung, Sanitär, Elektro), die eigene LVs in eigener Software erstellen. |
| BVBS | Bundesverband Software und Digitalisierung im Bauwesen; zertifiziert GAEB-Schnittstellen in Zusammenarbeit mit dem GAEB [8]. |
| XSD / Namensraum | XML-Schema (erlaubte Struktur) bzw. Namespace, der Version und Phase einer GAEB-XML-Datei kennzeichnet [1][40]. |

## 1. Werkzeuglandschaft nach Rollen

| Rolle | GAEB-Aufgabe | Typische Werkzeuge |
|---|---|---|
| Architekt (AVA) | X81/X83 erzeugen, X84 einlesen, Preisspiegel, X86 erzeugen | AVA-Software (z. B. NOVA, ORCA, California) – siehe [etablierte Anbieter](/okf/research/market/established-vendors.md) |
| Fachplaner (TGA u. a.) | LV als X81/X83 an den Architekten liefern | eigene AVA- oder Fachsoftware [33] |
| Bieter (Bau-/Handwerksbetrieb) | X83 lesen, Preise eintragen, X84 zurückgeben | Kalkulations-/Handwerkersoftware, Viewer, Excel-Konverter, Bieterportale [8][30][22] |
| Entwickler | lesen, schreiben, prüfen, konvertieren | SDKs, OSS-Bibliotheken, offizielle XSD, GAEB-XML-Checker [18][40][1] |

## 2. Bibliotheken und SDKs

### 2.1 Kommerzielle SDKs und Dienste

| Angebot | Anbieter | Technik | Formate | Lizenz / Preis (Stand 2026-11-09) | Bemerkungen |
|---|---|---|---|---|---|
| Dangl.GAEB + Dangl.AVA („GAEB & AVA .Net Library") | Dangl IT GmbH | .NET Framework und modernes .NET; NuGet-Paket oder DLL; Windows, Linux, macOS, mobil [18][19] | GAEB 90, GAEB 2000, „alle" GAEB-XML-Versionen; ÖNORM A/B 2063, SIA 451, Excel, Datanorm/UGL/BMEcat [18][19] | Preis nur auf Anfrage; Quellcode-Zugang (Git) und NuGet-Feed gegen Aufpreis; Testpaket auf Anfrage [18][19] | seit 2013 am Markt; DA XML 3.3 laut Dangl seit Mitte September 2019 unterstützt [27]; einheitliches Datenmodell (Dangl.AVA) getrennt vom Format (Dangl.GAEB) [19]; keine BVBS-Zertifizierung angegeben [18]. Die öffentliche Beispiel-App auf GitHub braucht die kommerziellen Pakete [55]. |
| AVACloud (GAEB-SaaS-API) | Dangl IT GmbH | REST-Dienst, gehostet oder per Docker on-premises; Clients u. a. .NET, Java, PHP, Swift, Rust [20] | GAEB, ÖNORM A 2063 [20] | Basic 99 €/Monat netto (bis 500 Konvertierungen), Premium 329 €/Monat (100.000), Enterprise auf Anfrage; 30 Tage Test [20]. Ohne Vertrag nur nicht-kommerzielle Evaluierung erlaubt [21] | Daten verlassen das eigene System. npm-Clients ohne Lizenzangabe [56]. |
| MWM GAEB-Toolbox | MWM Software & Beratung GmbH | Windows-DLL [15] | über 30 Formate: GAEB 90, GAEB 2000, GAEB DA XML (aktuell 3.3), ÖNORM [15] | Preis auf Anfrage [15] | basiert auf MWM-Primo; laut MWM-Broschüre vom BVBS empfohlen [14][15]. Die alte Domain gaebtoolbox.de ist geparkt (eigene Prüfung). |
| GAEB365.online API | anouri GmbH | .NET-Client (NuGet) für die Web-Plattform [56] | Projekte auf GAEB365.online | nicht geprüft | Plattform BVBS-zertifiziert für Bauausführung XML 3.3 [8][29]. |

### 2.2 Open-Source-Bibliotheken (Stand 2026-11-09)

| Projekt | Sprache | Lizenz | Versionen / Formate | Phasen | Lesen / Schreiben | Aktivität | Einschätzung |
|---|---|---|---|---|---|---|---|
| [pyGAEB](https://github.com/frameIQ/pygaeb) | Python ≥ 3.10, Pydantic v2 | MIT; Beiträge nur mit CLA [40] | DA XML 2.0–3.3; GAEB 90 „geplant"; kein GAEB 2000 [40] | X31, X50–X52, X80–X86, X88, X89/X89B, X93–X97 [40] | L + S, Versionskonvertierung mit Verlustbericht, Diff, Export nach Excel/PDF/Word/CSV, XSD-Prüfung, Cross-Phase-Prüfung X83↔X84 [40] | ★ 24, 6 Forks, v1.21.0 vom 2026-10-29, 34 Releases seit 2026-03, ca. 134 Commits, 4 Contributors [40][41] | Reifste freie Option. Laut Projekt validieren geschriebene 3.3-Dateien gegen die offiziellen XSD, geprüft mit BVBS-Prüfdateien [40]. |
| [gaebboss](https://github.com/4thel00z/gaebboss) | Rust-Kern, Python-Wheels (CPython ≥ 3.12), CLI, TUI | MIT oder Apache-2.0 [42] | liest DA XML 3.0–3.3; schreibt 3.2/3.3; GAEB 90/2000 nur erkannt, nicht gelesen [42] | X80–X89 typisiert; schreibt X83, X84, X86; andere Phasen ungetestet [42] | L + S, Validierung (auch X84 gegen X83), Angebot aus Ausschreibung erzeugen [42] | ★ 0, v0.4.0 vom 2026-11-05, Repo seit 2026-11-01, ca. 46 Commits [42][56] | Technisch stark: aus den XSD generiert, Dezimalarithmetik, toleranter Leser mit Warnungen. Laut Projekt ca. 210-mal schneller als pyGAEB. Aber erst Tage alt. |
| [openbim-gaeb](https://github.com/openbimrs/gaeb) | Rust | MIT [43] | erkennt 3.1–3.3 und 3.4 Beta; typisierte Bindings nur für 3.1 X81/X83/X86 [43] | allgemein | L (byte-identischer Roundtrip), als Änderung nur Mengen [43] | ★ 1, crate 0.1.2 vom 2026-09-26, ca. 39 Commits, 8 offene Issues [43][56] | Nische „verlustfrei editieren"; 18 Plausibilitätsregeln; früh. |
| [gaeb-php](https://github.com/bambamboole/gaeb-php) | PHP ≥ 8.4 | MIT [44] | nur DA XML 3.3 [44] | liest X80–X87, X89; schreibt X84, X87, X89 [44] | L + S, Geldbeträge dezimalgenau (BigDecimal) [44] | ★ 1, 58 Packagist-Downloads, seit 2026-07 [56] | Klein und sauber, für PHP-Stacks. |
| [gaeb (PyPI)](https://pypi.org/project/gaeb/) | Python | MIT (laut PyPI) [46] | DA XML 2.0–3.3, GAEB 90 (mit Zeichensatzerkennung), GAEB 2000 [46] | 31, 50–52, 80–89, Z-Phasen, 93–97 [46] | L + S, Diff, XSD-Prüfung, Preisspiegel-Modell [46] | 1 Release (0.5.4, 2026-09-27); verlinktes GitHub-Repo liefert 404 [46] | Einziges freies Paket, das GAEB 90/2000 schreiben will; Herkunft und Pflege unklar → hohes Risiko. |
| [gaeb-go](https://github.com/ChristianGaertner/gaeb-go) | Go | **keine Lizenzdatei** [45] | DA XML | X81, X83, X84, X86 [45] | L + S [45] | ★ 0, Aktivität an einem Tag (2026-08-24) | Ohne Lizenz rechtlich nicht nutzbar. |
| [gaeb-parser](https://github.com/meindonut/gaeb-parser) | Python (BeautifulSoup, pandas) | MIT [51] | DA XML (nicht spezifiziert) | – | nur L → DataFrame [51] | ★ 10, PyPI 0.1.2 (2025-09) [51] | Nur für Datenanalyse. |
| [GAEB4Linux](https://github.com/klaus4772/gaeb4linux) | Java 21, Spring Boot, Vaadin | MPL-2.0 laut README, keine LICENSE-Datei im Wurzelverzeichnis [47] | DA XML X81–X87 [47] | Viewer/Editor | L, teils S [47] | ★ 5, v1.0.0 vom 2026-07-22 [47] | Anwendung, keine Bibliothek. |
| [bieterwerk](https://github.com/samuelvoltarius/bieterwerk) | Node.js, SQLite | AGPL-3.0-only [48] | Import GAEB 90, GAEB 2000, DA XML X81–X89, ÖNORM A 2063; Export X84 [48] | Bieterseite | L + S | eingestellt, ohne Support (seit 2026-09) [48] | Copyleft; als Referenzcode lesbar. |

### 2.3 Weitere freie GAEB-Werkzeuge

| Projekt | Zweck | Sprache / Lizenz |
|---|---|---|
| [davioe/GAEB_validator](https://github.com/davioe/GAEB_validator) | Kommandozeilen-Prüfung gegen die offiziellen XSD [52] | C#/.NET 8, MIT |
| [BaukoDoz/GAEB-XML-Validator](https://github.com/BaukoDoz/GAEB-XML-Validator) | XSD-Prüfung mit `xmlschema`, inkl. Schema-Downloader; ausdrücklich Lernprojekt [52] | Python, MIT |
| [reuak/gaeb-toolkit](https://github.com/reuak/gaeb-toolkit) | LV-PDF → X83 (3.3), ausgerichtet auf „NOVA-ähnliche" LV-Ausdrucke; prüft doppelte OZ und Rechenfehler [49] | Rust, keine Lizenz |
| [r3dlex/boq-core](https://github.com/r3dlex/boq-core) | geplanter verlustbewusster Parser; nennt Zertifizierungs-*Reife* ausdrücklich nicht „offizielle Zertifizierung" [50] | Rust, keine Lizenz |
| gaebviewer, x84-viewer, GAEB2PDF (Links in [53]) | Web-Viewer, lokaler X84-Viewer mit Excel-Export, Stapelkonvertierung nach PDF [53] | TS/JS/Python, keine Lizenz |
| saCsv2Gaeb90, LV-Konverter (Links in [53]) | CSV → GAEB 90 bzw. CSV → D83 (macOS, letzte Änderung 2020) [53] | C#/Obj-C, MIT |
| metis-systems-ag-opensource/gaeb-sql-converter (GitLab) | GAEB-Daten in eine Datenbank übernehmen (2021–2022) [53] | – |
| [dazi-web/reb-da11](https://github.com/dazi-web/reb-da11) | Aufmaß-Format REB DA11 lesen/schreiben, Ausgabe in CP850 mit CRLF [54] | PHP, MIT |
| brsksr/german-construction-tenders-gaeb-api | öffentliche Ausschreibungen von oeffentlichevergabe.de inkl. GAEB als JSON [53] | MIT |

**Registerbefund (2026-11-09):** Maven Central liefert 0 Treffer für „gaeb", Codeberg ebenfalls 0. npm hat nur
Dangl-Clients (ohne Lizenzangabe) und einen Angular-Uploader von 2023. NuGet hat vier Treffer (zwei
AVACloud-Clients, den GAEB365-Client und ein unklares „DMS-GAEB"). crates.io führt openbim-gaeb/gaeb und
gaebboss-\*; Packagist führt dangl/avacloud, bambamboole/gaeb und dazi-web/reb-da11 [56]. Die GitHub-Suche nach
„gaeb", „x83", „d83" usw. ergibt viele Fehltreffer (z. B. koreanische „gaebal"-Projekte, x86-Assembler) und
nur die oben genannten fachlichen Projekte [57]. Bestehende AVA-/Kalkulations-OSS-Projekte behandelt
[Open-Source-Landschaft](/okf/research/open-source/existing-projects.md).

### 2.4 Qualitätsbeobachtungen

- **Dezimalzahlen statt Gleitkomma:** gaebboss, gaeb-php und openbim-gaeb rechnen ausdrücklich dezimalgenau
  mit kaufmännischer Rundung [42][44][43]. Das ist Pflicht, weil GAEB Stellen und Rundung genau vorgibt [4][5].
- **Tolerant lesen, streng schreiben:** gaebboss repariert Zeichensätze, schließt offene Tags, behält
  unbekannte Elemente und meldet jede Abweichung als Warnung mit Byte-Position. Fehlende Pflichtelemente
  werden beim Schreiben standardmäßig nur gemeldet, weil echte X83 sie oft nicht haben [42]. pyGAEB hat
  eine ähnliche Wiederherstellungskette [40].
- **Sicherheit:** pyGAEB und PyPI-gaeb werben mit Schutz vor XXE-Angriffen, „Billion Laughs",
  Größen- und Rekursionsgrenzen [40][46]. Für hochgeladene Fremddateien ist das Pflicht.
- **Lizenzlage der Spezifikation:** gaebboss legt die offiziellen XSD unverändert ins Repo
  (Rechte bei GAEB/DIN). openbim-gaeb lädt sie dagegen erst zur Testzeit, weil die Weiterverbreitungslizenz
  nicht explizit ist [42][43]. GAEB DA XML ist als PAS 1067 dokumentiert [3]. Dokumentationen zu GAEB 90/2000
  sind laut Dangl nicht mehr öffentlich verfügbar; die Downloadseite des GAEB führt sie nicht [19][1].
- **Reifesignale (Einschätzung):** Alle ernsthaften freien Bibliotheken sind 2025/2026 entstanden, haben
  kleine Maintainer-Basen und erkennbar KI-gestützte Entwicklung (z. B. mitgelieferte Agenten-Skills,
  „AI SDLC"-Repos) [42][50]. Mehrere Repos haben gar keine Lizenz [45][49][50][53].

## 3. Kostenlose Viewer, Konverter und Prüfwerkzeuge

| Werkzeug | Art | Kosten | Formate | Hinweise |
|---|---|---|---|---|
| WebGAEB (web-gaeb.de, Dangl IT) | Online-Konverter, LV-Viewer, AVA- und XRechnung-Viewer | kostenlos, „ohne Garantie auf Richtigkeit" [22] | Excel, GAEB 90, GAEB 2000 (+ Handel), XML 3.1/3.2/3.3 (+ 3.2 Handel), ÖNORM; Phasen 81–86; REB DA11/X31 → GAEB/Excel [22] | Konvertierte Datei nur einmal abrufbar, nicht abgerufene Dateien werden nach 15 Minuten gelöscht [25]. Reparatur durch Konvertieren in dasselbe Format [25]. Firmenversion für eigene Netze auf Anfrage [23]. |
| MWM-Primo | Windows-Viewer und -Konverter | Ansehen unbegrenzt gratis, Demo mit 5 Exporten; Vollversion 1.200 € netto + 15 €/Monat Wartung [16] | GAEB 90 D81–D86, GAEB 2000, DA XML X81–X89, X93–X97, ÖNORM [16] | repariert defekte Dateien und konvertiert OZ-Strukturen; PDF-Import nur nach OCR mit Fremdsoftware [16]. |
| MWM-Rialto | GAEB → Excel/CSV | Demo gratis [15] | – | – |
| GAEB-Online 2025 | Windows-Werkzeug für Bieter | Demo gratis; Einzelplatz 120 € netto einmalig [28] | DA XML 3.3 (Speichern auch z. B. in 3.2), GAEB 2000, GAEB 90 [28] | Kalkulation in Excel/LibreOffice, Rückgabe als DA84, PDF, XRechnung; Kommandozeilenmodus; nutzt laut Anbieter die „neueste GAEB-Toolbox" [28]. |
| GAEB365.online | Web-App für Angebote und Aufmaß | Registrierung gratis, Nutzung zeitraumbezogen kostenpflichtig (Preise nicht genannt) [29] | D83, P83, X83; D11/X31 [29] | BVBS-zertifiziert für Bauausführung XML 3.3, Urkunde vom 27.06.2024 [29][8]. |
| GAEB-XML-Checker (BVBS) | formale Schemaprüfung | kostenlos; ZIP ca. 0,4 MB, Stand 2025-01 [8] | DA XML 2.0, 2.1, 3.0, 3.1 (2007-11/2009-12/2010-09), 3.2 (2013-10), 3.3 (2021-05) [1] | wählt das Schema selbst; prüft nur GAEB-Namensräume und entfernt fremde Elemente vorher; **keine fachliche Prüfung** [1][14]. |
| Offizielle XSD + beliebiger XSD-Validator | Schemaprüfung | kostenloser Download ohne Registrierung [1][42] | 3.1, 3.2, 3.3, 3.4 Beta [1] | Weiterverbreitungslizenz nicht explizit [43]. |
| OSS: gaebboss-CLI/TUI, pyGAEB-Exporte, GAEB4Linux | Kommandozeile, Terminal-Explorer, PDF/Excel, Web-Viewer | kostenlos | siehe 2.2 | kein Endnutzerprodukt mit Support. |

Der GAEB selbst liefert keine Software. Laut seiner FAQ reicht zum Lesen ein kostenloser Viewer; zum Ausfüllen
braucht es einen Viewer mit Eingabefunktion oder AVA-/Kalkulationssoftware [3].
**Datenschutz (Einschätzung):** Online-Konverter bekommen das komplette LV, bei X84 samt Bieterpreisen. Für
Vergabeunterlagen öffentlicher Auftraggeber ist lokale Verarbeitung vorzuziehen.

## 4. Wie Bieter GAEB empfangen und zurückgeben

### 4.1 Soll-Ablauf

1. Der Architekt exportiert die **Angebotsaufforderung X83**. In NOVA etwa wählt er GAEB 90, GAEB 90 HVA StB
   (Variante für Straßen- und Brückenbau mit kürzeren Texten) oder XML 3.1/3.2/3.3 [32].
2. Der Bieter liest die X83 in seine Kalkulation ein. Er trägt Einheitspreise ein, optional bis zu sechs
   EP-Anteile (Lohn, Stoffe, Geräte, Sonstiges; analog Formblatt 223 des VHB), Textergänzungen und
   Nachlässe [4].
3. Der Bieter exportiert die **Angebotsabgabe X84**. Projekt-, LV- und Strukturdaten müssen unverändert aus der
   X83 übernommen werden [4]. Mengen, Einheiten und Texte dürfen in der X84 entfallen [4]. In `GAEBInfo` muss
   seine eigene Software stehen, nicht die Angaben aus der X83 [4].
4. Abgabe des Angebots in der vom Auftraggeber festgelegten Form. Bei elektronischen Angeboten ist das nach
   dessen Wahl Textform oder fortgeschrittene/qualifizierte elektronische Signatur bzw. Siegel (§ 13 Abs. 1 Nr. 1 VOB/A) [39]; Details in
   [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md).
5. Der Architekt liest alle X84 in den Preisspiegel ein und rechnet nach. „Nicht angeboten" muss sich von
   0,00 € unterscheiden; ein Preis von 0,00 € wird übertragen [4][34].
6. Nach dem Zuschlag geht die **Auftragserteilung X86** an den Auftragnehmer [4][32]. Prozesskontext:
   [AVA-Prozess I](/okf/research/process/tendering-and-award.md).

Rechtlicher Hintergrund: Nach § 13 Abs. 1 Nr. 6 VOB/A 2019 dürfen Bieter eine selbstgefertigte Abschrift oder
Kurzfassung des LV verwenden. Der Wortlaut des Auftraggebers muss dabei als allein verbindlich anerkannt
werden. Kurzfassungen müssen alle Ordnungszahlen vollständig, in gleicher Reihenfolge und mit gleichen
Nummern enthalten [39]. Eine X84 ist technisch eine solche Kurzfassung (Einschätzung).

### 4.2 Bieter-Software

| Kategorie | Beispiele (Stand 2026-11-09) | Belege |
|---|---|---|
| Für „Bauausführung" auf der BVBS-Liste (X83 lesen, X84 schreiben; Liste ohne Gültigkeitsdaten) | 12Build 2024, BRZ 365 Angebot und Vertrag 2022, California.pro V13/V14, CaliforniaX V23–V25, Cosuno 2023, GAEB365.online, iTWO 2022, MWM-Pisa 5.4, NEVARIS 2023–2026, NOVA AVA 4 (3.3-Urkunde bis 10.10.2026), pds Software 3.39, RIB 4.0 24 | [8][58] |
| Handwerkersoftware mit GAEB | z. B. „das programm": GAEB-Import kostenlos; Rückgabe der 84 als GAEB 90, 2000 oder XML 3.1–3.3; Option „Struktur der originalen GAEB beibehalten" | [30] |
| Einfache Bieterwerkzeuge | MWM-Pisa (Erstlizenz 590 € netto, Miete 35 €/Monat), GAEB-Online 2025 (120 € netto), GAEB365.online (Web, Zeitraum-Abo) | [17][28][29] |
| Plattformen | Cosuno: Basispaket für Nachunternehmer kostenlos, inkl. Angebotsabgabe nach GAEB; NOVA: befristeter Bieterzugang zum Bepreisen im Browser mit formaler Prüfung vor Freigabe | [31][35] |

### 4.3 Bieter ohne GAEB-Software

- **Nur lesen:** kostenloser Viewer [3][16][22].
- **Excel-Umweg:** WebGAEB wandelt X83 in eine Excel-Mappe (Übersicht, Projektinformation, Kalkulation,
  verstecktes Datenblatt) und daraus wieder in GAEB 84 (90/2000/XML). Wer das versteckte Blatt ändert,
  zerstört die Rückkonvertierung [26]. NOVA bietet eine eigene Excel-Angebotsvorlage zum Reimport an [34].
- **Papier/PDF:** Der Architekt legt das Angebot manuell an und tippt die Preise ab. NOVA bietet dafür eine
  Kontrollspalte („GB erfasst" gegen berechneten GB) [34].
- **PDF statt GAEB** kommt offenbar so oft vor, dass es Werkzeuge gibt, die LV-Ausdrucke zurück in GAEB
  wandeln: MWM-Primo per OCR, gaeb-toolkit für NOVA-ähnliche Ausdrucke [16][49].

### 4.4 Typische Reibung beim Architekten

| Symptom beim Einlesen | Ursache | Belege |
|---|---|---|
| Datei lässt sich nicht öffnen | zu neue Version (3.3 in Altsoftware), falsche Phase (X83/X81 statt X84) oder defekte Datei | [30][25][14] |
| Preise landen nicht bei den richtigen Positionen | Bieter hat OZ oder Struktur verändert bzw. Positionen ergänzt oder gelöscht | [30][4][39] |
| Summen weichen ab | andere Rundung oder Summenbildung, Sonderpositionen falsch gewertet | [4][10][34] |
| Bieterangaben fehlen | Textergänzungen nicht oder mit anderer Nummer zurückgegeben | [4][11] |
| Viele Formate parallel | jeder Bieter antwortet in „seinem" Format (D84, P84, X84 3.1–3.3), Excel, PDF oder Papier | [30][34] |

## 5. Interoperabilitätsprobleme in der Praxis

### 5.1 Versionen und Formatgenerationen

- **GAEB 90 und DA XML sind nicht kompatibel.** Konverter übertragen nur Inhalte, die es in beiden Formaten
  gibt [3]. GAEB 90 hat Zeilen von genau 80 Zeichen, Zahlen ohne Trennzeichen mit festen Nachkommastellen
  (Menge und EP 3, Gesamtpreis 2), höchstens 4 Zeichen für die Einheit und keinerlei Textformatierung [14][24].
- **Verbreitung ist strittig:** Dangl nennt GAEB 90 „by far" das meistgenutzte Format (undatiert, nennt 3.2 als
  neueste Version, also vermutlich vor 2019) [24]. Das Freie GAEB Buch (V4.0, ca. 2021) nennt DA XML die
  wichtigste Austauschversion [14]. Belastbare aktuelle Zahlen fehlen.
- **3.3 gegen 3.2:** Laut GAEB ist 3.3 syntaktisch inkompatibel [2]. Ältere Software kann 3.3 nicht lesen [30].
  Nach NOVA kann eine X83 in 3.2 keine Preise aus der Kostenberechnung transportieren (Auf-/Abgebotsverfahren),
  daher blendet NOVA die Option aus [32].
- **Unterausgaben innerhalb von 3.3:** Zuerst kam 05-2019, auf Drängen der Hersteller dann 11-2019; die damalige
  Toolbox unterstützte nur 11-2019 [13]. Gültig wurde 2021-05 [14]. Die Ausgabe 2023-01 änderte nur
  Fachdokumentation und Mengenermittlung (X31, eingebettete Anlagen als Base64) [1][7].
  Wer `VersDate` streng prüft, muss das kennen. Die BVBS-Prüfung verlangt in der X84 `Version` = 3.3 und
  `VersDate` = 2021-05 [11].
- **3.4 Beta (2026-03):** neuer Namensraum „3.4", Nachhaltigkeitsangaben je Position (`Sustainability`) und
  Kataloge, IBAN-Variante; ausdrücklich keine gültige Version [6][1]. Leser, die Namensräume fest verdrahten,
  scheitern daran (Einschätzung).
- **Versionserkennung:** 3.0/3.1 nutzen den Namensraum `…/GAEB_DA_XML/200407`, 3.1 kennt zwei Namensräume, ab
  3.2 gibt es Schemata und Namensräume je Phase (z. B. `DA86/3.3`) [43][40][1]. DA XML 2.x hat deutsche
  Elementnamen [40]. Bibliotheken werten deshalb Namensraum, `GAEBInfo/Version`, `Award/DP` und erst zuletzt die
  Dateiendung aus [42][40]. Endungen sind nicht eindeutig: Das GAEB nennt `.D83` für GAEB 90 [3], pyGAEB
  ordnet `.D8x` auch DA XML 2.x zu [40].
- **Umgang der Hersteller:** Export mit Versionswahl und Admin-Filter für sichtbare Formate (NOVA), Import
  von GAEB 90, 2000 und XML 3.1–3.3 [32][33]. Bieterseitig ist die 84 in jeder Generation exportierbar [30].
  Dazu kommen Konverter wie WebGAEB und MWM-Primo [22][16].

### 5.2 Langtexte und Formatierung

- GAEB 90 hat reinen Text, GAEB 2000 nutzt RTF (wenig unterstützt), DA XML eine eigene XHTML-Teilmenge
  [14][24].
- Die XSD 3.3 erlaubt in formatierten Texten nur `p`, `span` (mit `class`/`style`), `br`, `page`, `div`,
  `table`/`tr`/`td`/`th`, `ul`/`ol`/`li`, `image` und `attachment`. Ein `span` enthält nur Text, kein
  verschachteltes Markup [5]. Fett steht also im `style`, nicht als `<b>` (Einschätzung).
- Das `style`-Attribut kennt CSS-ähnliche Eigenschaften, darunter das Word-spezifische `mso-tab-count` [4].
  Der GAEB empfiehlt, keine feste Textbreite zu übergeben; Layout, Deckblatt und Inhaltsverzeichnis erzeugt das
  empfangende Programm [4].
- Abweichungen in echten Dateien: Listen direkt unter `DetailTxt`, `<b>` in `span` [42]. Die BVBS-Prüfung
  vergleicht Formatierungen, Sonderzeichen und Grafiken visuell mit einem Musterausdruck [10]. Sie prüft
  außerdem einen neunzeiligen Kurztext auf Vollständigkeit [11]. Das deutet darauf hin, dass Kürzungen ein
  bekanntes Problem sind (Einschätzung).
- **Folge für uns:** Der Rich-Text-Editor muss auf genau diese Teilmenge abbilden. Für GAEB 90 braucht es eine
  dokumentierte, verlustbehaftete Absenkung (Tabellen und Bilder entfallen) [32].

### 5.3 Ordnungszahl und OZ-Maske

- **XML-Regeln:** höchstens 14 Zeichen über alle Stufen, höchstens fünf Gliederungsstufen (bzw. Los plus vier)
  vor der Position, Index genau 1 Zeichen, Los an erster Stelle [4]. Erlaubt sind Ziffern, Buchstaben,
  Leerzeichen und Unterstrich, keine Umlaute und kein „ß"; ausgelassene Hierarchiestufen sind zulässig [14][4].
- **GAEB 90:** höchstens 9 Stellen, nur der Index darf alphanumerisch sein. Hersteller legen den Index
  (ein- oder mehrstellig) und Füllzeichen (führende Nullen oder Leerzeichen) unterschiedlich aus, manche
  Programme lehnen bestimmte Masken ab [14]. Das Aufmaßformat REB DA11 ist auf 9-stellige OZ beschränkt; für
  längere OZ gibt es X31 [4][14].
- **Rückgabe:** Die X84 muss die OZ-Maske der X83 unverändert enthalten; das ist ein eigener BVBS-Prüfpunkt [11].
  Wer Positionsnummern ändert, verliert die Zuordnung [30].
- **Umgang:** MWM-Primo konvertiert OZ-Strukturen [16], NOVA kann LVs neu nummerieren [38]. Bibliotheken melden
  zu lange OZ-Teile als Fehler [42].

### 5.4 Zahlen, Rundung, EP/GP

- **Rundungsregel (Fachdokumentation 4.6.17):** kaufmännisch runden; GB = auf 2 Stellen gerundetes Produkt aus
  Menge und EP; ein Positionsnachlass wird vom gerundeten GB abgezogen und erneut gerundet; Summen addieren die
  gerundeten Werte. Beispiel: 73,789 m³ × 9,77 € = 720,92 €, nach 1,5 % Nachlass 710,11 € [4].
- **Stellen laut XSD 3.3:** Menge 11 Stellen davon 3 Nachkommastellen; EP 13/3; GB 13/2; Einheit höchstens
  4 Zeichen [5]. Der BVBS prüft einen EP mit 3 Nachkommastellen und eine Menge von 12.345.678,012 [10][11].
- **Weitere Fallen:** Summe der EP-Anteile muss den EP ergeben (bis 6 Anteile) [4]. „Nicht angeboten" ist nicht
  0,00 [4]. Alternativ- und Bedarfspositionen ohne GB zählen nicht in die Summe, Zuschläge beziehen sich auf
  definierte Positionen [10][42]. In echten Dateien kommen Dezimalkommas in XML vor [42].
- **Umgang:** NOVA zeigt die Differenz zwischen erfasstem und berechnetem GB [34]. openbim-gaeb und gaebboss
  rechnen GB und Summen nach und melden Abweichungen [43][42].

### 5.5 Herstellerspezifische Erweiterungen

- Fremde Elemente in eigenen Namensräumen werden vom GAEB-XML-Checker vor der Schemaprüfung entfernt, sind
  also faktisch geduldet [14][1]. Musterdateien enthalten etwa einen eigenen Toolbox-Namensraum [14].
- Es kommen aber auch Fremdelemente **innerhalb** von Positionen vor (Beispiele: `Codetext`, `OZ`) [42].
  Gute Bibliotheken bewahren sie auf und schreiben sie unverändert zurück [42][40].
- `GAEBInfo/ProgSystem` muss die erzeugende Software nennen [4][11]. Für Fehlerdiagnose ist das wertvoll
  (Einschätzung).

### 5.6 Zeichensätze und Umlaute

- Bei XML ist die Kodierung frei deklarierbar; die Fachdokumentation schreibt keine vor (eigene Prüfung) [4].
  Typische Fehler in echten Dateien: UTF-8 deklariert, aber Latin-1-Bytes; UTF-16 deklariert, aber reines ASCII
  (laut pyGAEB ein häufiger .NET-Fehler); doppelt kodierte Umlaute („GrÃ¶ÃŸe"); Byte-Order-Marks [40][42].
- GAEB 90 enthält keine Zeichensatzangabe, Bibliotheken raten ihn heuristisch [40]. Zwei freie Implementierungen
  nennen bzw. verwenden DOS-Codepage 850 für 80-Spalten-Formate [46][54]. GAEB-2000-Beispiele tragen einen
  Kopfeintrag „Zeichensatz ANSI" [14].

### 5.7 Fehlende Phasenunterstützung

- Stabil definiert sind X80–X87, X89/X89B, Zeitvertragsphasen, X31, X50–X52 und X93–X97. **Preisspiegel
  (X84P) und Raumbuch (X61) sind Beta**; eine Freigabe setzt mindestens zwei erprobte Prototypen voraus [4].
- Die Zertifizierungsliste zeigt ungleiche Abdeckung: 27 Produktversionen für AVA, 18 für Bauausführung, nur
  13 für Mengenermittlung; NOVA AVA 4 ist dort nicht gelistet [8].
- Auch Bibliotheken decken Phasen ungleich ab: gaebboss testet nur X80–X89 [42], gaeb-php schreibt nur X84,
  X87 und X89 [44]. NOVA exportiert 81–86 und X51, aber laut Handbuch kein GAEB 2000 [32] (nicht verifiziert).

### 5.8 LVs von Fachplanern (TGA)

- NOVA importiert LVs von externen Planern, aus anderen Programmen und Katalogen. Eine GAEB-Datei lässt sich nur
  in ein Projekt mit GAEB-Norm einlesen (nicht ÖNORM) [33].
- Kostengruppen (z. B. nach DIN 276) und GUIDs lassen sich über die **Katalogzuordnung** transportieren. Kataloge
  und LVs sind getrennte Dateien, je Phase eine Datei [4]. Siehe [DIN 276](/okf/research/standards/din-276-cost-planning.md)
  und [BIM und AVA](/okf/research/standards/bim-and-ava.md).
- **Einschätzung (nicht direkt belegt):** typische Reibungen sind abweichende OZ-Masken gegenüber dem
  Architektenprojekt, Lieferung als GAEB 90 mit Formatierungsverlust (siehe 5.2) sowie fehlende Katalogzuordnungen,
  weil sendende oder empfangende Software sie nicht unterstützt. → Frage an den Architekten.

### 5.9 Schemawidrige Dateien „aus der freien Wildbahn"

- Dangl schreibt von „a lot of incompatibilities, schema violations and deviations in 'files in the wild'" [24].
  Laut Dangl lesen manche Programme GAEB mit wenig Fehlertoleranz, daher die Reparaturfunktion [25].
- gaebboss dokumentiert typische Defekte, die so in echten Dateien vorkommen oder aus dem Standard folgen:
  Datei endet mitten im Langtext, verwaiste End-Tags, Dezimalkomma, Werte außerhalb von Aufzählungen, doppelte
  Elemente und IDs, Herstellerelemente, falscher Zeichensatz, fehlende OZ-Maske, zu lange OZ [42].
  pyGAEB repariert zusätzlich nackte `&` und Steuerzeichen [40].
- NOVA warnt vor dem Export bei formalen Fehlern, erzeugt die Datei nach „Fortsetzen" aber trotzdem; sie ist
  dann formal fehlerhaft [32]. Die Prüfregeln sind abteilungsweise konfigurierbar (z. B. fehlende Langtexte,
  unbekannte Einheiten, EP gegen EP-Anteile, Regelwerk HVA StB) [37][36].

**Gesamtbild (Einschätzung):** Die Fehler entstehen weniger durch Lücken im Standard als durch nachsichtige
Exporter und strenge Importer. Wer Dateien von vielen Bietern und Fachplanern annimmt, braucht einen
nachsichtigen Leser mit verständlichen Meldungen und einen strengen, validierten Schreiber.

## 6. Zertifizierung

### 6.1 Ablauf und Kosten

| Aspekt | Inhalt | Belege |
|---|---|---|
| Wer | BVBS in Zusammenarbeit mit dem GAEB | [8] |
| Was | GAEB DA XML 3.1, 3.2, 3.3; Bereiche AVA, Bauausführung, Mengenermittlung, Texterstellung | [8] |
| Ablauf | Test gegen veröffentlichte Prüfkriterien, Protokoll, Urkunde für eine bestimmte Softwareversion | [8] |
| Dauer | 2012: typischerweise 2–4 Stunden, meist vor Ort beim Hersteller mit dessen Entwickler | [12] |
| Gültigkeit | 5 Jahre; Re-Zertifizierung bei neuer Softwareversion oder geänderten Kriterien | [8][9] |
| Preise (Stand 09/2021, netto) | Erstzertifizierung 2.100 € (Mitglied) / 2.950 € (Nichtmitglied); jedes weitere Produkt oder jeder weitere Bereich 1.075 € / 1.475 €; Re-Zertifizierung 450 € / 625 €; Reisekosten nach Aufwand; 20 % Nachlass auf den Grundpreis bei neuer GAEB-Version innerhalb der Gültigkeit | [9] |
| Öffentliche Prüfmittel | Prüfkriterien (PDF), Musterausdrucke und Prüfdateien je Bereich und Version, GAEB-XML-Checker (Stand 2025-01) | [8] |

Die Preise von 2012 (Nichtmitglieder 2.950 € Erst-, 500 € Re-Zertifizierung) sind überholt [12].
Ob die Liste von 09/2021 noch gilt, ist offen.

### 6.2 Was geprüft wird

- **AVA (3.3, Stand 11.06.2021):** Import einer X81 mit Hinweistexten, StLB-Nummer, Leit- und
  Ausführungsbeschreibungen, Grund- und Alternativpositionen, Bedarfspositionen mit und ohne GB, Wahlgruppen,
  freier Menge, „Position entfällt", ausgelassenen Hierarchiestufen, Zuschlagspositionen, Index, Grafik und drei
  Bieter-Textergänzungen. Danach Export als X81 mit Formalprüfung im XML-Checker und Dateivergleich. Import
  einer X86, Export als X86, X84 und X83. Abschließend ein Preisspiegel mit X84-Import und Abgleich der Summen
  (Gesamtbetrag der Prüfdatei 1.421.003.968,15 €) [10].
- **Bauausführung (3.3, Stand 04.04.2024):** X83 importieren, Preise eintragen, X84 exportieren. Geprüft werden
  u. a. Indexpositionen, Grafik, maximale Menge, Grund- und Alternativposition, Titel und Position „0000",
  maximale OZ 999.999.9999 mit Index „z", Zuschlag auf vorangestellte Positionen, neunzeiliger Kurztext,
  Textergänzungen, Leit- und Unterbeschreibung. Zur Rückgabe: unveränderte OZ-Maske, `Version` 3.3,
  `VersDate` 2021-05, `ProgSystem`, Währung EUR, Gesamtbetrag 2.000.000,00 € [11].
- Der BVBS passt die Kriterien an häufige Austauschprobleme des Marktes an [11]. Die Prüfliste ist damit eine
  gute Checkliste realer Problemfälle (Einschätzung).

### 6.3 Gelistete Produkte (Auszug, Stand 2026-11-09)

Die BVBS-Liste ist mit „aktuell zertifiziert“ überschrieben, nennt aber weder Ausstellungs- noch Ablaufdaten.
Mindestens ein Eintrag ist abgelaufen: Die 3.3-Urkunden für NOVA AVA 4 galten vom 11.10.2021 bis 10.10.2026 [8][58].
Die Zahlen unten sind deshalb gelistete, nicht nachweislich gültige Zertifikate.

| Bereich | Einträge | Beispiele |
|---|---|---|
| AVA | 27 Produktversionen | AVANTI, AVA Relax 8, Bechmann AVA/flex, BUILDUP V29, California.pro/CaliforniaX, Cosuno 2023, iTWO 2022, NEVARIS 2023–2026, **NOVA AVA 4 (3.2 + 3.3; 3.3-Urkunde bis 10.10.2026)**, ORCA AVA 23–25, RIB 4.0 26.1 |
| Bauausführung | 18 | siehe 4.2, darunter **NOVA AVA 4 (3.2 + 3.3; 3.3-Urkunde bis 10.10.2026)** |
| Mengenermittlung | 13 | AVA Relax 8, California.pro/CaliforniaX, iTWO 2022, MWM Libero 14, NEVARIS, ORCA AVA 25 |
| Texterstellung | 2 | Hagerplan, MWM-Primo 7 |

Quelle: [8]. Die 100. Urkunde ging im Januar 2017 an California.pro [14]. 2012 waren es 23 [12].

### 6.4 Was eine Zertifizierung für ein Open-Source-Produkt bedeuten würde

- **Formal:** Zertifiziert wird eine Softwareversion eines Anbieters [8]. Ein OSS-Projekt bräuchte einen
  Antragsteller (z. B. Verein oder UG) und einen eingefrorenen Release. Ob Nicht-Unternehmen zugelassen sind,
  ist ungeklärt.
- **Kosten:** 2.950 € plus Reisekosten für die Erstprüfung des ersten Produkts in einem Bereich, 1.475 € je
  weiteren Bereich, 625 € je Re-Zertifizierung (Nichtmitglied, netto, Stand 09/2021) [9]. Bei häufigen Releases wäre es sinnvoll, nur Langzeitversionen zu
  zertifizieren (Einschätzung).
- **Nutzen:** Vertrauenssignal, besonders gegenüber öffentlichen Auftraggebern. Schon 2012 hieß es, öffentliche
  Auftraggeber verlangten zunehmend zertifizierte Software [12] (veraltet, prüfen). NOVA ist zertifiziert;
  für einen Wechsel wäre Gleichstand hilfreich (Einschätzung).
- **Ohne Urkunde:** Weil Prüfkriterien und Prüfdateien öffentlich sind, kann das Projekt
  „Zertifizierungsreife" laufend in der CI belegen, wie es pyGAEB und boq-core tun [40][50]. Das ist aber
  ausdrücklich keine offizielle Zertifizierung [50]. Der Name „GAEB" darf keine Verbindung zum GAEB suggerieren
  (vgl. Haftungshinweis in [48]).

## 7. Einschätzung: bauen oder wiederverwenden?

| Option | Vorteile | Nachteile | Eignung |
|---|---|---|---|
| A. Proprietäres SDK (Dangl .NET, MWM-DLL) | sehr breite Formatabdeckung inkl. GAEB 90/2000, Excel, ÖNORM; seit Jahren im Einsatz [18][15] | Closed Source, Preis unbekannt, .NET- bzw. Windows-Bindung, Verteilung in einem OSS-Projekt rechtlich heikel | niedrig (höchstens als optionales Plugin) |
| B. SaaS (AVACloud) | sofort nutzbar, viele Client-Sprachen [20] | 99–329 €/Monat, LV-Daten bei Dritten, kommerzielle Nutzung nur mit Vertrag [20][21] | niedrig (optionales Plugin) |
| C. OSS-Bibliothek nutzen (pyGAEB, gaebboss, openbim-gaeb, gaeb-php) | frei (MIT/Apache), dezimalgenau, XSD-validiert, tolerante Leser [40][42][43][44] | jung, kleine Maintainer-Basis, kein belastbares GAEB 90, API-Brüche möglich | **hoch**, mit Absicherung |
| D. Eigenbau | volle Kontrolle, passend zum eigenen Domänenmodell | großer Aufwand: allein die typisierten DA-XML-Elemente 3.1–3.3 zählen über 500 [42]; Feinheiten lernt man nur an echten Dateien | nur für Lücken |

**Empfehlung (Einschätzung): C plus gezielter Eigenbau.**

1. **Eigenes Domänenmodell, GAEB als Adapter.** LV-Baum, Positionsarten, Preise als Dezimalzahl, Texte als
   strukturierter Rich-Text. GAEB wird nur beim Import und Export übersetzt. So trennt auch Dangl
   Datenmodell und Format [19]. Siehe [NOVA API und Datenmodell](/okf/research/nova-ava/api-and-data-model.md).
2. **Bibliothek nach Stack wählen:** Python-Backend → pyGAEB (reifste API, breite Phasen) oder die
   Python-Bindings von gaebboss (schnell, toleranter Leser, Angebotserzeugung). Rust → gaebboss oder
   openbim-gaeb. TypeScript/Java → keine reife freie Bibliothek; die Python/Rust-Komponente als Dienst
   kapseln (bzw. gaebboss nach WebAssembly, ungeprüft) [40][42][43].
3. **Tolerant lesen, streng schreiben:** Warnungen in verständlichem Deutsch anzeigen, unbekannte Elemente
   aufbewahren, vor jedem Export gegen die offiziellen XSD validieren. Ungültige Dateien nur mit ausdrücklicher
   Bestätigung schreiben (wie bei NOVA) [32][42].
4. **Konformität in der CI:** offizielle XSD zur Build-Zeit laden statt ins Repo legen [43]. BVBS-Prüfdateien
   als Golden-Tests, X83↔X84-Abgleich und Rundungsprüfung nach 4.6.17 [4][8]. Dazu ein anonymisierter
   Korpus echter Dateien vom Architekten und aus öffentlichen Vergaben (Lizenz prüfen) [53].
5. **Selbst bauen, wo es nichts Gutes gibt:** GAEB-90-Lesen/-Schreiben (D83/D84), die Abbildung zwischen
   Editor-Rich-Text und GAEB-XHTML, Excel- und Browser-Rückweg für Bieter. Änderungen möglichst an die
   Bibliotheken zurückgeben.
6. **Zertifizierung „AVA 3.3"** als Qualitätsziel nach dem ersten stabilen Release, nicht als Startbedingung.

## Relevanz für unser Projekt

**Muss-Anforderungen**

- M1 Import X81/X83/X86 in DA XML 3.1–3.3; Import X84 in 3.1–3.3 **sowie D84 (GAEB 90)**, nachrangig P84,
  weil Bieter in jeder Generation antworten [30][33].
- M2 Export X83 in 3.3, mit 3.2 als Rückfalloption, und X86; optional D83 für Altsoftware; X81 für Fachplaner [32].
- M3 Exakte Dezimalarithmetik und Rundung nach 4.6.17; EP 3, GB 2 Nachkommastellen; „nicht angeboten" ≠ 0,00 [4][5].
- M4 Alle Positionsarten (Bedarfs-, Alternativ-/Wahl-, Zuschlags-, Pauschal-, Stundenlohnpositionen),
  Textergänzungen und bis zu 6 EP-Anteile korrekt in Summen und Preisspiegel [4][10].
- M5 Robuster Import: Erkennung von Format und Version am Inhalt statt an der Endung, Zeichensatzreparatur,
  XML-Wiederherstellung, Aufbewahrung unbekannter Elemente, verständliche Warnungen [40][42].
- M6 X84↔X83-Abgleich über OZ und IDs: Strukturänderungen erkennen, GB nachrechnen und Differenzen zeigen [11][34].
- M7 XSD-Validierung vor dem Versand; eigene Angaben in `GAEBInfo`/`ProgSystem` [4][11].
- M8 Rich-Text nur in der GAEB-Teilmenge; kontrollierte Absenkung für GAEB 90 [5][32].
- M9 Weg für Bieter ohne Software: Bepreisen im Browser und/oder Excel-Vorlage, Ausgabe als X84/Excel/PDF [34][35][26].

**Differenzierungschancen**

- D1 Kostenloses, kontofreies Bieter-Erlebnis (Link öffnen, bepreisen, X84/PDF herunterladen). Bei NOVA gibt
  es das nur im System des Architekten [35].
- D2 Ein „GAEB-Doktor": öffentliche, lokal im Browser laufende Prüfung, die Fehler auf Deutsch erklärt, eine
  X84 mit ihrer X83 vergleicht und nachrechnet. Er schlösse die Lücke zwischen dem rein formalen
  GAEB-XML-Checker [1] und kostenpflichtigen Werkzeugen [16].
- D3 Läuft nativ unter Linux, macOS und im Browser, während MWM-Toolbox und GAEB-Online Windows brauchen [15][28].
- D4 Prototyp für den Preisspiegel-Austausch X84P: Der GAEB verlangt mindestens zwei Prototypen für die
  Freigabe [4].

**Risiken**

- R1 Lizenzlage der Spezifikation: Rechte bei GAEB/DIN, PAS 1067, Weiterverbreitung der XSD nicht geregelt
  → nicht ins Repo legen, ggf. beim GAEB anfragen [3][42][43]. Siehe
  [Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).
- R2 Spezifikationen zu GAEB 90/2000 sind nicht öffentlich [19][1]; ein Eigenbau stützt sich auf
  Sekundärquellen und Beispieldateien.
- R3 Junge Bibliotheken mit wenigen Maintainern; CLA bei pyGAEB erlaubt spätere Neulizenzierung [40];
  lizenzlose Repos sind tabu [45][49][50]; AGPL-Code (bieterwerk) nur mit Copyleft-Folgen nutzbar [48].
- R4 Zertifizierung kostet Geld je Version und braucht einen Antragsteller [9].
- R5 Datenschutz: LVs mit Bieterpreisen nicht an Online-Konverter geben; eigene Verarbeitung lokal oder
  selbst gehostet [25].

**Aufwandsschätzung (Einschätzung, 1 erfahrene Entwicklerperson)**

| Baustein | mit OSS-Bibliothek | Eigenbau |
|---|---|---|
| DA XML 3.2/3.3 lesen (X81–X86) inkl. Texte und Sonderpositionen, Abbildung aufs Domänenmodell | 1–2 Wochen | 6–10 Wochen |
| DA XML 3.3 schreiben X83/X86 (+ 3.2) | 1–2 Wochen | 4–6 Wochen |
| X84 in den Preisspiegel inkl. Abgleich und Rundungsprüfung | 1–2 Wochen | 3–4 Wochen |
| GAEB 90 D83/D84 lesen und schreiben | 3–5 Wochen (keine belastbare OSS-Basis) | 3–5 Wochen |
| Rich-Text-Abbildung Editor ↔ GAEB-XHTML | 2–3 Wochen | 2–3 Wochen |
| Excel- und Browser-Rückweg für Bieter | 2–4 Wochen | 2–4 Wochen |
| Konformitätstests (XSD, BVBS-Prüfdateien, Korpus) | 1–2 Wochen | 1–2 Wochen |
| Zertifizierung vorbereiten und durchführen | 2–3 Wochen + ca. 3.000 € | 2–3 Wochen + ca. 3.000 € |
| **Summe** | **ca. 13–23 Wochen** | **ca. 23–37 Wochen** |

## Offene Fragen

**An den Architekten-Freund**

1. Welche Formate verschickst du (X83 3.3? 3.2? D83?) und was kommt zurück (X84, D84, Excel, PDF, Papier)? Grober
   Anteil der Bieter ohne GAEB-Software?
2. Wie oft scheitern GAEB-Importe in NOVA, und kannst du anonymisierte Problemdateien als Testkorpus beisteuern?
3. Bekommst du LVs von TGA-Fachplanern als GAEB? Aus welcher Software, und was geht dabei kaputt (OZ-Maske,
   Texte, Kostengruppen)?
4. Verlangen deine öffentlichen Auftraggeber zertifizierte Software oder eine bestimmte GAEB-Version?
5. Lässt du Bieter im NOVA-Bieterportal bepreisen oder verschickst du Dateien?
6. Brauchst du X31/DA11 (Aufmaß) und X89 (Rechnung) im Austausch mit Firmen?

**Nicht gefunden oder nicht verifiziert**

- Belastbare aktuelle Zahlen zur Verbreitung von GAEB 90 gegenüber DA XML (Quellen widersprechen sich, undatiert) [24][14].
- Aktuelle BVBS-Preisliste nach 09/2021, BVBS-Mitgliedsbeitrag, Zulassung nicht-gewerblicher Antragsteller.
- Gültigkeit der gelisteten BVBS-Zertifikate: Die Liste nennt keine Daten. Belegt abgelaufen ist NOVA AVA 4
  (3.3-Urkunden bis 10.10.2026); ältere Einträge wie California.pro V13/V14 oder iTWO 2022 wurden nicht geprüft [8][58].
- Lizenzpreise von Dangl.GAEB/Dangl.AVA und der MWM-Toolbox; Lizenz der Dangl-npm-Pakete.
- Ausdrückliche Nutzungs- und Weiterverbreitungsbedingungen der GAEB-XSD und Fachdokumentation.
- Original-Spezifikation GAEB 90/2000; Zeichensatz von GAEB 90 nur aus OSS-Sekundärquellen (CP850).
- Vorgaben des VHB Bund bzw. der E-Vergabe-Plattformen zu GAEB-Versionen (→ Vergaberechts-Notiz).
- Erfahrungsberichte aus Foren und Bewertungsportalen zu GAEB-Problemen (Suchbudget erschöpft).
- Quellcode des PyPI-Pakets `gaeb` (Repo 404); Code-Qualität der jüngsten Bibliotheken nur aus Doku und Metadaten
  beurteilt.
- NOVA-Handbuch (manual.avanova.io) ist eine clientseitig gerenderte Web-App; die darauf gestützten Aussagen
  [32]–[38] (u. a. Exportformate ohne GAEB 2000, Verhalten bei formalen Fehlern) konnten bei der Nachprüfung
  am 2026-11-09 nicht erneut abgerufen werden (nicht verifiziert).
- Widerspruch: Laut GAEB-FAQ gibt es keine GAEB-eigenen DA-XML-Musterdateien [3], die Downloadseite bietet aber
  Musterdateien zu 3.1 an [1].

## Quellen

[1] Downloads GAEB-Datenaustausch (Versionen, Schemata, GAEB-XML-Checker) - GAEB - https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/ - Primärquelle - abgerufen 2026-11-09
[2] GAEB-Datenaustausch (Produktseite) - GAEB - https://www.gaeb.de/de/produkte/gaeb-datenaustausch/ - Primärquelle - abgerufen 2026-11-09
[3] FAQ GAEB-Datenaustausch - GAEB - https://www.gaeb.de/de/service/faq/gaeb-datenaustausch-faq/ - Primärquelle - abgerufen 2026-11-09
[4] Fachdokumentation GAEB DA XML 3.3, Ausgabe 2023-01 (PDF) - GAEB - https://www.gaeb.de/wp-content/uploads/2023/09/Fachdokumentation_GAEB-DA-XML_3.3_2023-01.pdf - Primärquelle - abgerufen 2026-11-09
[5] Schemapaket Leistungsverzeichnis 3.3 2021-05 (u. a. GAEB_DA_XML_Lib_3.3_2021-05.xsd) - GAEB - https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Leistungsverzeichnis.zip - Primärquelle - abgerufen 2026-11-09
[6] Changelog GAEB XML 3.4 (2026-03 Beta) gegenüber 3.3 - GAEB - https://www.gaeb.de/wp-content/uploads/2025/11/Changelog-3.4-2026-03-beta-vs-3.3.md - Primärquelle - abgerufen 2026-11-09
[7] Was ist neu – GAEB-Datenaustausch - GAEB - https://www.gaeb.de/de/service/was-ist-neu/was-ist-neu-gaeb-datenaustausch/ - Primärquelle - abgerufen 2026-11-09
[8] Zertifizierungen (Listen zertifizierter Software, Prüfkriterien, Prüfdateien, Checker) - BVBS - https://www.bvbs.de/zertifizierungen/ - Primärquelle - abgerufen 2026-11-09
[9] Preisliste GAEB-Zertifizierung, Stand 09/2021 (PDF) - BVBS - https://www.bvbs.de/wp-content/uploads/2024/02/BVBS-Preisliste-Zertifizierungen-202109.pdf - Primärquelle - abgerufen 2026-11-09
[10] Prüfkriterien GAEB DA XML 3.3 – AVA, Version 11.06.2021 (PDF) - BVBS - https://www.bvbs.de/wp-content/uploads/2024/02/BVBS_Pruefkriterien-GAEB-DA-XML-3.3-AVA-V-11-06-2021.pdf - Primärquelle - abgerufen 2026-11-09
[11] Prüfkriterien GAEB DA XML 3.3 – Bauausführung, Version 04.04.2024 (PDF) - BVBS - https://www.bvbs.de/wp-content/uploads/2024/05/Pruefkriterien-GAEB-DA-XML-3.3-Bauausfuehrung-V-04-04-2024.pdf - Primärquelle - abgerufen 2026-11-09
[12] Interview mit dem BVBS: GAEB-Zertifizierung steigert Qualität im Datenaustausch (02.11.2012) - Baulinks - https://www.baulinks.de/bausoftware/2012/0081.php4 - Presse - abgerufen 2026-11-09
[13] Neue GAEB-Version „GAEB DA XML 3.3 11-2019" (Ausgabe 01/2020) - Computer Spezial - https://www.computer-spezial.de/artikel/neue-gaeb-version-gaeb-da-xml-3-3-11-2019-3512953.html - Presse - abgerufen 2026-11-09
[14] Das Freie GAEB Buch, Version 4.0 (PDF, ca. 2021) - MWM Software & Beratung GmbH - https://www.mwm.de/download/ftp/docs/Das_freie_GAEB_Buch.pdf - Herstellerangabe (Fachbroschüre) - abgerufen 2026-11-09
[15] Mehr Infos zu GAEB (GAEB-Toolbox, Primo, Rialto, Pisa) - MWM - https://www.mwm.de/gaeb_reb/mehr_infos_zu_gaeb/ - Herstellerangabe - abgerufen 2026-11-09
[16] MWM-Primo (Produkt- und Preisseite) - MWM - https://www.mwm.de/software/primo - Herstellerangabe - abgerufen 2026-11-09
[17] MWM-Pisa (Produkt- und Preisseite) - MWM - https://www.mwm.de/software/pisa - Herstellerangabe - abgerufen 2026-11-09
[18] GAEB & AVA .Net Library - Dangl IT GmbH - https://www.dangl-it.com/products/gaeb-ava-net-library/ - Herstellerangabe - abgerufen 2026-11-09
[19] Produktdatenblatt Dangl.AVA & Dangl.GAEB (30.07.2022, PDF) - Dangl IT GmbH - https://www.dangl-it.com/media/1226/20220730-danglava-danglgaeb-product-data-sheetpdf.pdf - Herstellerangabe - abgerufen 2026-11-09
[20] AVACloud – GAEB SaaS (inkl. Preise) - Dangl IT GmbH - https://www.dangl-it.com/products/avacloud-gaeb-saas/ - Herstellerangabe - abgerufen 2026-11-09
[21] AVACloud Licence - Dangl IT GmbH - https://docs.dangl-it.com/Projects/AVACloud/latest/licence.html - Herstellerangabe - abgerufen 2026-11-09
[22] WebGAEB – kostenloser GAEB-Konverter und -Viewer - Dangl IT GmbH - https://www.web-gaeb.de/ (Viewer: https://www.web-gaeb.de/Viewer) - Herstellerangabe - abgerufen 2026-11-09
[23] WebGAEB (Produktseite) - Dangl IT GmbH - https://www.dangl-it.com/products/webgaeb/ - Herstellerangabe - abgerufen 2026-11-09
[24] The GAEB Data Formats in Detail (undatiert) - Dangl IT GmbH - https://www.dangl-it.com/articles/the-gaeb-data-formats-in-detail/ - Herstellerangabe - abgerufen 2026-11-09
[25] Convert GAEB Files with the Free GAEB Converter - Dangl IT GmbH - https://www.dangl-it.com/articles/convert-gaeb-files-with-the-free-gaeb-converter/ - Herstellerangabe - abgerufen 2026-11-09
[26] Working with GAEB in Microsoft Excel - Dangl IT GmbH - https://www.dangl-it.com/articles/working-with-gaeb-in-microsoft-excel/ - Herstellerangabe - abgerufen 2026-11-09
[27] Support for the new, BIM-ready GAEB XML Version 3.3 - Dangl IT GmbH - https://www.dangl-it.com/articles/support-for-the-new-bim-ready-gaeb-xml-version-33/ - Herstellerangabe - abgerufen 2026-11-09
[28] GAEB-Online 2025 - gaeb-online - https://www.gaeb-online.de/gaeb-2025-en.html - Herstellerangabe - abgerufen 2026-11-09
[29] GAEB365.online - anouri GmbH - https://www.gaeb-365.online/ - Herstellerangabe - abgerufen 2026-11-09
[30] GAEB Formate, Phasen, Einrichtung: Für Handwerker - das programm - https://das-programm.io/support/artikel/gaeb/ - Herstellerangabe - abgerufen 2026-11-09
[31] Funktionen für Nachunternehmer - Cosuno - https://www.cosuno.com/web/de/subcontractor-features - Herstellerangabe - abgerufen 2026-11-09
[32] Handbuch: GAEB-Dateien exportieren und Austauschphasen festlegen (Stand 2026-08-31) - NOVA Building IT - https://manual.avanova.io/articles/gaeb-dateien-exportieren-und-austauschphasen-festlegen - Herstellerangabe - abgerufen 2026-11-09
[33] Handbuch: Leistungsverzeichnisse importieren - NOVA Building IT - https://manual.avanova.io/articles/leistungsverzeichnisse-importieren - Herstellerangabe - abgerufen 2026-11-09
[34] Handbuch: Angebote erstellen, importieren und verwalten - NOVA Building IT - https://manual.avanova.io/articles/angebote-erstellen-importieren-und-verwalten - Herstellerangabe - abgerufen 2026-11-09
[35] Handbuch: Ausschreibungen verwalten und Bieter einladen - NOVA Building IT - https://manual.avanova.io/articles/ausschreibungen-verwalten-und-bieter-einladen - Herstellerangabe - abgerufen 2026-11-09
[36] Handbuch: LV-Prüfung durchführen - NOVA Building IT - https://manual.avanova.io/articles/lv-pruefung-durchfuehren - Herstellerangabe - abgerufen 2026-11-09
[37] Handbuch: Datenprüfung für LVs und Angebote konfigurieren - NOVA Building IT - https://manual.avanova.io/articles/datenpruefung-fuer-lvs-und-angebote-konfigurieren - Herstellerangabe - abgerufen 2026-11-09
[38] Handbuch: LV neu nummerieren - NOVA Building IT - https://manual.avanova.io/articles/lv-neu-nummerieren - Herstellerangabe - abgerufen 2026-11-09
[39] § 13 VOB/A (Fassung 2019) – Form und Inhalt der Angebote - dejure.org - https://dejure.org/gesetze/VOB-A/13.html - Gesetz/Norm (Wiedergabe) - abgerufen 2026-11-09
[40] pyGAEB (README, docs/guides/parsing.md, docs/guides/conversion.md, CLA.md) - GitHub frameIQ/pygaeb - https://github.com/frameIQ/pygaeb - Primärquelle (Open Source) - abgerufen 2026-11-09
[41] pyGAEB auf PyPI - PyPI - https://pypi.org/project/pyGAEB/ - Paketregister - abgerufen 2026-11-09
[42] gaebboss (README, docs/src/reference/limitations.md, docs/src/guide/reading.md, docs/src/guide/texts.md, tests/fixtures/failure-modes, standard/README.md) - GitHub 4thel00z/gaebboss - https://github.com/4thel00z/gaebboss - Primärquelle (Open Source) - abgerufen 2026-11-09
[43] openbim-gaeb (README, docs/business-rules.md) - GitHub openbimrs/gaeb - https://github.com/openbimrs/gaeb - Primärquelle (Open Source) - abgerufen 2026-11-09
[44] gaeb-php - GitHub bambamboole/gaeb-php / Packagist bambamboole/gaeb - https://github.com/bambamboole/gaeb-php - Primärquelle (Open Source) - abgerufen 2026-11-09
[45] gaeb-go - GitHub ChristianGaertner/gaeb-go - https://github.com/ChristianGaertner/gaeb-go - Primärquelle (Open Source) - abgerufen 2026-11-09
[46] gaeb 0.5.4 und gaeb-cli 0.5.4 - PyPI - https://pypi.org/project/gaeb/ - Paketregister - abgerufen 2026-11-09
[47] GAEB4Linux - GitHub klaus4772/gaeb4linux - https://github.com/klaus4772/gaeb4linux - Primärquelle (Open Source) - abgerufen 2026-11-09
[48] Bieterwerk - GitHub samuelvoltarius/bieterwerk - https://github.com/samuelvoltarius/bieterwerk - Primärquelle (Open Source) - abgerufen 2026-11-09
[49] GAEB Toolkit (PDF → X83) - GitHub reuak/gaeb-toolkit - https://github.com/reuak/gaeb-toolkit - Primärquelle (Open Source) - abgerufen 2026-11-09
[50] boq-core - GitHub r3dlex/boq-core - https://github.com/r3dlex/boq-core - Primärquelle (Open Source) - abgerufen 2026-11-09
[51] gaeb-parser - GitHub meindonut/gaeb-parser / PyPI gaeb-parser - https://github.com/meindonut/gaeb-parser - Primärquelle (Open Source) - abgerufen 2026-11-09
[52] GAEB-Validatoren - GitHub davioe/GAEB_validator und BaukoDoz/GAEB-XML-Validator - https://github.com/davioe/GAEB_validator ; https://github.com/BaukoDoz/GAEB-XML-Validator - Primärquelle (Open Source) - abgerufen 2026-11-09
[53] Kleinere GAEB-Werkzeuge - GitHub/GitLab - https://github.com/weschnin/gaebviewer ; https://github.com/paolomolo/x84-viewer ; https://github.com/MartinFraenkel/GAEB2PDF ; https://github.com/sa1961-code/saCsv2Gaeb90 ; https://github.com/luisgerhorst/LV-Konverter ; https://gitlab.com/metis-systems-ag-opensource/gaeb-sql-converter ; https://github.com/brsksr/german-construction-tenders-gaeb-api - Primärquelle (Open Source) - abgerufen 2026-11-09
[54] reb-da11 (REB-VB 23.003 DA11 Reader/Writer) - GitHub dazi-web/reb-da11 - https://github.com/dazi-web/reb-da11 - Primärquelle (Open Source) - abgerufen 2026-11-09
[55] Dangl.AVA.Examples - GitHub GeorgDangl/Dangl.AVA.Examples - https://github.com/GeorgDangl/Dangl.AVA.Examples - Herstellerangabe (Beispielcode) - abgerufen 2026-11-09
[56] Registerabfragen „gaeb" (npm, NuGet, crates.io, Maven Central, Packagist, GitLab, Codeberg, PyPI-JSON) - https://registry.npmjs.org/-/v1/search?text=gaeb ; https://azuresearch-usnc.nuget.org/query?q=gaeb ; https://crates.io/api/v1/crates?q=gaeb ; https://search.maven.org/solrsearch/select?q=gaeb ; https://packagist.org/search.json?q=gaeb ; https://gitlab.com/api/v4/projects?search=gaeb ; https://codeberg.org/api/v1/repos/search?q=gaeb - Paketregister - abgerufen 2026-11-09
[57] GitHub-Repository-Suche (gaeb, gaeb xml, x83, x84, d83, Leistungsverzeichnis u. a.; per gh search repos) - GitHub - https://github.com/search?q=gaeb&type=repositories - Paketregister/Suche - abgerufen 2026-11-09
[58] BVBS-Zertifikate GAEB DA XML 3.3 „AVA“ (Nr. 15/2021) und „Bauausführung“ (Nr. 16/2021) für NOVA AVA 4, ausgestellt 11.10.2021, gültig bis 10.10.2026 - NOVA Building IT GmbH / BVBS - https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_AVA_3.3_202110.pdf und https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_Bauausfg_3.3_202110.pdf - Primärquelle (Zertifikat) - abgerufen 2026-11-09
