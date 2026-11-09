---
type: Research Note
title: "Open-Source-Landschaft: bestehende AVA-, LV- und Kalkulationsprojekte"
description: Systematischer Scan von Code-Plattformen, Paketregistern und OSS-Ökosystemen nach freien Projekten für Ausschreibung, Vergabe, Abrechnung, Leistungsverzeichnisse, Baukalkulation und Kostenplanung – mit Reifegrad, Lizenz und Wiederverwendbarkeit, damit unser Projekt nichts doppelt baut und nichts Nutzbares übersieht.
resource: https://github.com/datadrivenconstruction/OpenConstructionERP
tags: [research, open-source, ava, boq, kalkulation, wettbewerb]
timestamp: 2026-11-09T17:16:17Z
sources: 59
confidence: mittel
---

# Open-Source-Landschaft: bestehende AVA-, LV- und Kalkulationsprojekte

> Stand aller Zahlen (Sterne, Versionen, letzte Commits): 2026-11-09, sofern nicht anders angegeben.
> GAEB-Parser-Bibliotheken sind bereits in
> [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md#22-open-source-bibliotheken-stand-2026-11-09)
> katalogisiert und werden hier nur verlinkt. Diese Notiz behandelt alles andere: Anwendungen,
> Kalkulations- und Kostenwerkzeuge, BIM-Mengen, ERP-Module, internationale Gegenstücke und
> eingeschlafene Versuche.

## Kurzfassung

- **Es gibt keine reife, frei lizenzierte AVA für deutsche Planer.** Gesucht wurde auf GitHub (über 50 Begriffe,
  ca. 1.400 Repos), GitLab, Codeberg, SourceForge und in sechs Paketregistern. Die Lücke für ein freies,
  selbst hostbares Planer-AVA über die HOAI-Leistungsphasen 6–8 ist bestätigt [1][14][46][47][48].
- **Größter Wettbewerber ist OpenConstructionERP:** AGPL-3.0 plus kommerzielle Lizenz, 1.334 Sterne, Release v19.3.0
  vom 2026-11-09, generisches „Bau-ERP“ für 40+ Märkte mit DACH-Paket (GAEB X83/X84, DIN 276, VOB, HOAI). Es nimmt keine
  externen Pull Requests an, und seine deutsche Doku verwechselt GAEB-Phasen [2][3][4][5].
- **OpenAVA** (openava.de) verspricht eine komplette Planer-AVA als „Open Core (MIT)“ – GAEB X83–X89, Preisspiegel,
  REB-Aufmaß, Rechnungsprüfung, DIN 276. Ein öffentliches Repository war **nicht auffindbar** [53][1].
- **2026 entstehen viele deutsche Kleinwerkzeuge**, aber keines frei nutzbar: APVE (Preisspiegel und Vergabevermerk,
  ohne Lizenz), Conocto (LV-Viewer, nur einsehbar), AVALito (Windows-AVA, nur Installer) [10][11][12].
- **Bester wiederverwendbarer Baustein außerhalb von GAEB:** Open Calc Studio der niederländischen OpenAEC Foundation
  (LGPL-3.0, Kalkulation, Formate BC3/ÖNORM/CUF). GAEB kann es nur importieren, Vergabe und Abrechnung fehlen [6][49].
- **LeenO (Italien, LGPL-2.1, seit 2013)** zeigt, dass ein schmales OSS-Werkzeug für öffentliche Bauabrechnung
  langlebig sein kann – getragen von einem Hauptentwickler, LibreOffice und frei verfügbaren amtlichen Preislisten [7][8].
- **ERP- und PM-Ökosysteme decken Ausschreibung nicht ab:** Odoo-BoQ-Module sind proprietär (z. B. 257 €), die
  ERPNext-Bau-App ist Auftragsentwicklung (ab 799 US-$), das Dolibarr-Baupaket kostet 950 €, und OpenProject BIM kennt
  keine Kosten [17][18][51][52].
- **BIM:** IfcOpenShell/ifc5d (LGPL-3.0) wandelt IFC-Kostenpläne von und nach CSV/XLSX/ODS. Die Kostenfunktionen in
  Bonsai sind dokumentiert als „work in progress“ [54][15][16].
- **International gedeiht OSS dort, wo Format und Preisdaten frei sind** (Spanien BC3, Italien, Brasilien SINAPI). In
  Deutschland ist GAEB nutzbar, Texte und Preise sind es nicht [57][7][30].
- **Abgebrochene Versuche** (Estimate 2011–2020, QCost 2013–2017, diverse Parser, bieterwerk) scheiterten an fehlender
  Nutzerbasis, Einzelentwicklern oder aufgegebenen kommerziellen Plänen [47][48][50].
- *Einschätzung:* Formatbibliotheken, Mengenwerkzeuge und viele UX-Ideen sind wiederverwendbar. Das Planer-Domänenmodell
  (LV, Bieterrücklauf, Preisspiegel, Vergabe, Aufmaß, Rechnungsprüfung, Kostenkontrolle) muss selbst gebaut werden.

## Begriffe für Nicht-Architekten

| Begriff | Erklärung |
|---|---|
| **AVA** | Ausschreibung, Vergabe, Abrechnung: Software für Leistungsverzeichnis, Angebotsvergleich, Auftrag und Rechnungsprüfung (HOAI-Leistungsphasen 6–8). |
| **Leistungsverzeichnis (LV)** | Die nach Positionen gegliederte Liste der Bauleistungen mit Text, Menge und Einheit; englisch *bill of quantities (BoQ)*. |
| **Ordnungszahl (OZ)** | Hierarchische Positionsnummer im LV, z. B. `01.02.0030`. |
| **Kalkulation** | Preisermittlung. Beim Bauunternehmen: Einheitspreise aus Lohn, Material, Gerät und Zuschlägen. Beim Architekten: Kostenschätzung des LV vor der Vergabe. |
| **Preisspiegel** | Tabelle, die die Angebote aller Bieter Position für Position nebeneinanderstellt (*bid tabulation / bid levelling*). |
| **Aufmaß** | Feststellung der tatsächlich gebauten Mengen als Grundlage der Abrechnung (*measurement*); das italienische Gegenstück heißt *libretto delle misure*. |
| **Mengenermittlung, QTO** | Mengen aus Plänen oder Modell ableiten (*quantity takeoff*). |
| **DIN 276 / Kostengruppen (KG)** | Deutsche Gliederung der Baukosten (z. B. KG 300 Bauwerk – Baukonstruktionen), siehe [DIN 276](/okf/research/standards/din-276-cost-planning.md). |
| **5D-BIM** | Gebäudemodell (3D) plus Zeit (4D) plus Kosten (5D). |
| **Copyleft (GPL/AGPL/LGPL)** | Lizenzen, die verlangen, dass abgeleitete Werke unter derselben Lizenz offengelegt werden. AGPL gilt auch beim Betrieb als Webdienst; LGPL erfasst nur Änderungen an der Bibliothek selbst. |
| **Dual Licensing** | Ein Rechteinhaber bietet denselben Code unter Copyleft (gratis) und zusätzlich unter einer kommerziellen Lizenz (gegen Geld) an. Setzt voraus, dass er alle Rechte am Code hält. |
| **Source-available** | Quelltext ist öffentlich lesbar, darf aber nicht frei genutzt werden – das ist **kein** Open Source. |

## 1. Methodik und Suchumfang

| Ort | Vorgehen | Ergebnis (Stand 2026-11-09) |
|---|---|---|
| GitHub | `gh search repos` mit über 50 Begriffen (deutsch: Leistungsverzeichnis, Aufmaß/Aufmass, Preisspiegel, Bauabrechnung, DIN 276, Kostengruppen, Baukosten, Baukalkulation, Kostenberechnung, Angebotsauswertung, SIA 451, ÖNORM A 2063, AVA Software …; englisch: bill of quantities, BoQ, quantity surveying/surveyor, construction (cost) estimating, quantity takeoff, 5D BIM, tender management, construction bidding …; international: computo metrico, FIEBDC/BC3, DPGF, métré, kosztorys, orçamento de obras/SINAPI, MasterFormat, UniFormat, NRM2) [1] | ca. 1.400 eindeutige Repositories, davon nur einige Dutzend fachlich relevant; Details in Abschnitt 2 |
| GitLab.com, Codeberg | Projekt-Such-APIs mit denselben Kernbegriffen [14] | praktisch leer: GitLab nur LeenO (Italien) und ein DPGF-Repo von 2022; Codeberg nur eine Preisspiegel-Analyse ohne Bezug zum Bau-LV und ein „Ausschreibungs-Agent“ |
| npm, NuGet, Maven Central, crates.io, Packagist | Such-APIs mit „leistungsverzeichnis“, „aufmass“, „din276“, „bill of quantities“, „boq“, „construction estimating“, „quantity surveying“, „fiebdc“/„bc3“, „tender construction“ [46] | **Kein einziges deutsches AVA- oder LV-Paket** außer den GAEB-Bibliotheken aus der GAEB-Notiz (crates.io: gaebboss, openbim-gaeb; Packagist: bambamboole/gaeb, dazi-web/reb-da11). npm: mehrere spanische BC3-Parser (`bc3`, `bc3-parser-jmc-js`, `bc3-writer-jmc-js`, `construparser`, `bc3reader`, alle 2025–2026) und Rechenhilfen (`@buildvisionai/construction-calculators`). NuGet: ein KI-Paket mit 200 Downloads. Maven Central: nichts Einschlägiges |
| PyPI | Die Suchseite verlangt JavaScript und lässt sich nicht maschinell abfragen; geprüft wurden daher die aus GitHub bekannten Paketnamen [46] | `openconstructionerp`, `pyGAEB`, `gaeb`, `gaeb-parser` – also nur bereits bekannte Projekte |
| SourceForge | Verzeichnissuche [47][48] | Kein Treffer für „Leistungsverzeichnis“, „AVA Ausschreibung“ oder „GAEB“. Funde: **QCost** (C++/Qt, GPL-3.0, Alpha, 2013–2017), **Estimate** (Java-Web-App, AGPL, 2011–2020), zwei Kalkulations-Hilfsprogramme (GuideCP, AnalysisCP; letzteres mit bulgarischer Beschreibung), ein italienisches Rechnungs-/Angebotsprogramm (Coppettino) und ein Spiegel von OpenConstructionERP |

**Rauschen:** Die Suche nach „tender management“ liefert fast nur Studienprojekte (Java/JDBC-Übungen ohne Baubezug) [1];
das am besten gepflegte ist ein allgemeines Ausschreibungs- und Angebotssystem für Einkaufsabteilungen ohne Bau- oder
LV-Bezug (PHP, MIT, 2026) [32].
„AVA Software“ trifft vor allem portugiesische/spanische Repos („avanzado“, „avaliação“). Mehrere Repositories mit
auffällig vielen Sternen bieten angeblich Installer kommerzieller Kalkulationssoftware (CostX, ProEst, OnScreen
Takeoff) an [44]. *Einschätzung:* Solche „Setup-Guide“-Repos sind ein bekanntes Muster für Schadsoftware-Verteilung;
sie sind hier nur als Warnung erwähnt und dürfen nicht heruntergeladen werden.

## 2. Gesamttabelle der Funde

Spalten: Sterne (★) und Forks (F) zum Abrufzeitpunkt; „Aktiv“ = letzter Push. *Wiederverwendbarkeit* ist eine
Einschätzung für unser Projekt (hoch / mittel / gering / keine).

### 2.1 Plattformen mit AVA- oder Kalkulationsanspruch

| Projekt | Herkunft / Stack | Lizenz | ★ / F | Seit → aktiv | Umfang | Reife | Wiederverw. |
|---|---|---|---|---|---|---|---|
| [OpenConstructionERP](https://github.com/datadrivenconstruction/OpenConstructionERP) | DataDrivenConstruction; React + FastAPI (Python) + PostgreSQL [2] | AGPL-3.0 + kommerzielle Lizenz [2] | 1.334 / 403 | 2026-04 → 2026-11-09 (v19.3.0) [2] | „Bau-ERP“: BOQ-Editor, Mengen aus PDF/DWG/IFC, KI-Kostenzuordnung, Ausschreibung/Bieter, Nachträge, Rechnungen, 190+ Module, 44 Sprachen; DACH-Pack mit GAEB X83/X84, DIN 276, VOB, HOAI [2][3][4][5] | sehr schnelle Entwicklung, fast nur ein Committer-Konto, keine externen PRs [2]; fachliche Fehler in der Doku (s. 3.1) | mittel (Ideen, Testfälle) – Code nur unter AGPL |
| [Open Calc Studio](https://github.com/OpenAEC-Foundation/open-calc-studio) | OpenAEC Foundation (NL); TypeScript/React, Tauri 2 (Rust) für Windows/macOS/Linux, Web-App, SDK, MCP [6] | LGPL-3.0-only [6] | 22 / 9 | 2026-05 → 2026-11-09 (2026.45.0) [6] | Kalkulationsprogramm („calculatie“): hierarchische Kalkulation mit Normstunden, Zuschlägen, MwSt.; Mengen aus IFC, PDF, Excel; Import/Export BC3, ÖNORM A 2063, IFC; Import GAEB [6] | „public testing“, 923 Tests, signierte Releases [6] | **hoch** (LGPL-Bibliothek, Formatkonverter) |
| [bidwright](https://github.com/braedonsaunders/bidwright) | Einzelentwickler (Nordamerika); Next.js 16, React 19, PostgreSQL/Prisma, pgvector, Docker [9] | AGPL-3.0-only [9] | 83 / 22 | 2026-03 → 2026-11-03 | KI-zentrierte Angebotskalkulation für Unternehmer: Unterlagen-Intake, 2D/3D-Mengen, Baugruppen (*assemblies*), Prüfung durch KI-Agent, Angebotsversand [9] | jung, schnell wachsend | gering (Bieterseite, US-Logik) |
| [BinaaCost](https://github.com/Alfrahi/BinaaCost) | React, TypeScript, PocketBase [31] | eigene Lizenz („other“) [31] | 15 / 2 | 2026-01 → 2026-10 | Kalkulation und Finanzmodell [31] | früh | keine (Lizenz unklar) |
| [AVALito](https://github.com/ing-bassam/AVALito-releases) | Windows-Desktop (Installer per Electron-Updater) [12] | **kein OSS** – nur Installationsdateien, Quellcode „an anderer Stelle“ [12] | 0 / 0 | 2026-10 → 2026-11-08 | lokale AVA für LVs (Ausschreibung, Vergabe, Abrechnung), eigenes Dateiformat `.avalito` [12] | sehr jung (0.3.x) | keine – aber Marktsignal |
| [OpenAVA](https://openava.de/) | Bielefelder Architekturbüro laut Projektseite; Node.js/TypeScript, Fastify, Prisma, PostgreSQL, React/Vite, Docker [53] | „Open Core (MIT)“ laut Website, **aber kein öffentliches Repository auffindbar** [53][1] | – | „© 2026“, keine Version [53] | vollständige Planer-AVA laut Website: GAEB-Roundtrip X83–X89, Preisspiegel, Nachlässe, Teilvergabe, Aufmaß mit REB-23.003-Formeln, Rechnungsprüfung im Vier-Augen-Prinzip, Verträge/Nachträge nach VOB/B, DIN-276-Kostenverfolgung, 4.514 Musterpositionen [53] | unklar: Demo nur auf Anfrage; Kennzahlen (659.000 Codezeilen, 636 Tests) nur Selbstauskunft [53] | **unklar** – erst prüfbar, wenn Code veröffentlicht ist |

### 2.2 Deutsche Teilwerkzeuge (LV, Preisspiegel, Aufmaß, Kosten)

| Projekt | Zweck | Stack | Lizenz | ★ | Aktiv | Wiederverw. |
|---|---|---|---|---|---|---|
| [APVE](https://github.com/DaniilSvinolobov/APVE) | Angebotsauswertung: GAEB X8x/P8x/D8x und PDF einlesen, Preisspiegel je Los, Nachverhandlungsrunden, Vollständigkeitsprüfung, Vergabevermerk als PDF; Daten bleiben im Browser [10] | TypeScript, Vite, IndexedDB [10] | **keine Lizenz** (alle Rechte vorbehalten) | 0 | 2026-10 → 2026-11-05 | keine (aber Funktionsvorbild) |
| [Conocto](https://github.com/NicPalapte/conocto-doc) | LV-Viewer für Bieter: GAEB im Browser als Graph, Prüfhinweise, Positionsvergleich [11] | TypeScript | **source-available**, ausdrücklich keine Nutzungsrechte [11] | 1 | 2026-05 → 2026-11-09 | keine |
| [Aufmaß (bauzertifikate.de)](https://github.com/DoktorDaveJoos/aufmass) | DWG/DXF-3D-Volumenkörper → Mengen je Bauteil → Excel, JSON, X83 (DA XML 3.2) [13] | Rust | eigene („other“) | 0 | 2026-11, schon wieder in ein Firmen-Repo umgezogen [13] | gering |
| [GAEB4Linux](https://github.com/klaus4772/gaeb4linux), [bieterwerk](https://github.com/samuelvoltarius/bieterwerk) | GAEB-Viewer/-Editor bzw. Bieter-Werkzeug | Java/Vaadin bzw. Node.js | MPL-2.0 (README) bzw. AGPL-3.0 | 5 / – | siehe [GAEB-Notiz](/okf/research/standards/gaeb-tooling-interop.md#22-open-source-bibliotheken-stand-2026-11-09) | gering–mittel |
| [reb-da11](https://github.com/dazi-web/reb-da11) | Aufmaßformat REB DA11 lesen/schreiben | PHP | MIT | 0 | 2026-09 | mittel (Formatwissen) |
| [kostengruppensuche](https://github.com/runxel/kostengruppensuche) | Schnellsuche, welche Kostengruppe nach DIN 276 passt [34] | JavaScript | keine Lizenz | 0 | 2024-12 → 2026-08 | keine |
| [din276-example](https://github.com/cpm-ont-network/din276-example) | Beispiel für DIN-276-Klassifikation (Ontologie-Netzwerk) [35] | JavaScript | keine Lizenz | 0 | 2025-01 (einmalig) | keine |
| [lcabim-ontology](https://github.com/Design-Computation-RWTH/lcabim-ontology) | RWTH Aachen: Ontologie-Module u. a. für DIN 276, ÖKOBAUDAT, BKI [36] | RDF/OWL | eigene („other“) | 1 | 2026-01 → 2026-07 | gering (Forschung) |
| [NHMzh-plugin-cost](https://github.com/LTplus-AG/NHMzh-plugin-cost) | Kostenberechnung im Nachhaltigkeitsmonitoring der Stadt Zürich [37] | TypeScript | AGPL-3.0 | 0 | 2025-03 → 2025-12 | gering |
| [ERP-System für Handwerksbetriebe](https://github.com/Winfo2024Kuhn/ERP-System-fuer-Handwerksbetriebe) | Handwerker-ERP: Angebote, Rechnungen mit ZUGFeRD/XRechnung, Zeiterfassung [23] | Java | eigene („other“) | 20 / 8 | 2026-03 → 2026-11-09 | gering (Bieterseite) |
| [Aufmaßwerk](https://github.com/aufmasswerk/aufmasswerk) | Handwerk: Angebot, Aufmaß, Rechnung mit E-Rechnung, offline unter Linux [24] | Python | GPL-3.0 | 0 | 2026-10 | gering |

Daneben gibt es über 25 kleine, meist lizenzlose Aufmaß-Apps einzelner Handwerksbetriebe (Maler, Tischler,
Fenster, Tiefbau) sowie Einzelprojekte wie „Preisspiegel ermitteln“ oder „LPH 6 Vorbereitung der Vergabe“ ohne
Lizenz und ohne Nutzerbasis [1]. *Einschätzung:* Diese Repos zeigen Bedarf, sind aber nicht wiederverwendbar.

### 2.3 Internationale Gegenstücke (Auswahl)

| Projekt | Land / Norm | Stack | Lizenz | ★ | Seit → aktiv | Umfang | Wiederverw. |
|---|---|---|---|---|---|---|---|
| [LeenO](https://github.com/giuserpe/leeno) (Fork von [Ultimus](https://github.com/mrjive/ultimus)) | Italien: *computo metrico estimativo* und *contabilità lavori* [7] | Python-Makros als LibreOffice-Calc-Erweiterung [7] | LGPL-2.1 [7] | 8 / 2 | 2013/2014 → 2026-11-09 | Kostenermittlung mit Mengen, Baustellenbuchhaltung, Nachträge (*varianti*), Aufmaßbuch, regionale Preislisten [7] | mittel (Vorbild, kein Code) |
| [ogorhc/BC3](https://github.com/ogorhc/BC3) | Spanien: FIEBDC-3/BC3 (Presto, Arquímedes, TCQ) [19] | TypeScript, ohne Abhängigkeiten | MIT | 5 / 1 | 2025-12 → 2026-05 | Parser in ein typisiertes Hierarchiemodell [19] | mittel (falls BC3 nötig) |
| [concreta-mediciones](https://github.com/jramirezbandera/concreta-mediciones) | Spanien: *mediciones, presupuestos y certificaciones* (Aufmaß, Kostenanschlag, Abschlagsrechnungen) [26] | React + TypeScript | eigene („other“) | 0 | 2026-06 → 2026-11-09 | Web-App | gering |
| [presupuestos-bc3](https://github.com/juancar75/presupuestos-bc3) | Spanien: BC3 [27] | Rust | GPL-3.0 | 0 | 2026-10 → 2026-11-09 | Kostenanschläge | gering |
| [fiebdc3-parser](https://github.com/JcMinarro/fiebdc3-parser), [bc3reader](https://github.com/pihglez/bc3reader) | Spanien: FIEBDC-3 [39] | Java bzw. – | keine bzw. GPL-2.0 | 0 | je 2015, danach nichts | Parser | keine (verwaist) |
| [ONP-Bill_of_Quantities](https://github.com/OldNestling/ONP-Bill_of_Quantities) | Russland: Mengenaufstellungen nach XML-Schema des Bauministeriums [28] | Python | eigene („other“) | 5 | 2026-07 → 2026-11-09 | BoQ nach Staatsschema | gering (Muster „Staats-XML“) |
| [AutoSINAPI](https://github.com/LAMP-LUCAS/AutoSINAPI) | Brasilien: amtliche Kostendatenbank SINAPI [30] | Python | keine Lizenzdatei | 11 / 4 | 2025-05 → 2026-09 | Abruf und Aufbereitung öffentlicher Kostendaten | gering (Muster „offene Preisdaten“) |
| [masterformat-json](https://github.com/outer-labs/masterformat-json) | USA: CSI MasterFormat 2016 als JSON [29] | JSON | MIT | 12 / 7 | 2019 (einmalig) | Codeliste | keine (Lizenz der CSI-Titel fraglich) |
| [aec-platform/qto](https://github.com/aec-platform/qto) | international: IFC-Mengen mit austauschbarer Klassifikation (UniFormat, MasterFormat, NRM, OmniClass, vietn. Normen) [20] | Python | MIT | 2 | 2026-08 (einmalig) | QTO-Engine | gering–mittel (Architekturidee) |
| [BidSheet](https://github.com/Person810/BidSheet) | USA: Angebote für Tiefbau-Nachunternehmer [22] | TypeScript | GPL-3.0 | 8 / 1 | 2026-03 → 2026-09 | Kalkulation | gering |
| [takeoffcraft](https://github.com/getcadcraft/takeoffcraft) | international: Mengen aus PDF-Plänen (kalibriert, Längen/Flächen/Stück) mit Kostenspalten [21] | JavaScript | Apache-2.0 | 20 / 9 | 2026-10 → 2026-11-09 | PDF-QTO | **mittel–hoch** (PDF-Aufmaß, permissive Lizenz) |
| [Open-E.Hub](https://github.com/bbossolo/Open-E.Hub) | Italien: Preislisten, *computo metrico*, öffentliche Bauabrechnung für Haustechnik-Planer [45] | TypeScript | MIT | 1 | 2026-08 → 2026-11 | Planer-Suite | gering |

### 2.4 Mengen aus BIM, Kostendaten, Prüfwerkzeuge

| Projekt | Zweck | Lizenz | ★ | Aktiv | Wiederverw. |
|---|---|---|---|---|---|
| IfcOpenShell / Bonsai (Kostenpläne nach IFC) | Kostenpläne (`IfcCostSchedule`), Positionen, Einheitspreis-Kataloge, QTO im offenen BIM-Werkzeug; ifc5d für CSV/XLSX/ODS [15][16][54] | LGPL-3.0 (IfcOpenShell, ifc5d) / GPL-3.0 (Bonsai) [54] | 2.943 (Gesamt-Repo) | täglich aktiv | mittel (IFC-Kosten, QTO) |
| [FreeCAD-QuantityTakeoff](https://github.com/buildsmart888/FreeCAD-QuantityTakeoff), [qto_buccaneer](https://github.com/simondilhas/qto_buccaneer) | QTO-Modul für FreeCAD bzw. IFC-QTO-Skripte [42] | MIT | 6 / 6 | 2025 bzw. 2026-02 | gering–mittel |
| [QuantityTakeoff-Python](https://github.com/datadrivenconstruction/QuantityTakeoff-Python) | Mengen aus Revit/IFC-Exporten per pandas [43] | GPL-3.0 | 37 | 2021 → 2023-12 | gering |
| [DDC-CWICR](https://github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR) | „offene“ mehrsprachige Kostendatenbank (55.000+ Leistungen, 27.000+ Ressourcen, 30 Regionen) für KI-Agenten [25] | **Daten CC BY-NC 4.0** (früher CC BY 4.0; ältere Kopien bleiben CC BY), Code Apache-2.0; kommerzielle Datennutzung nur mit Zusatzlizenz [25] | 277 / 67 | 2025-12 → 2026-08 | gering – ein Architekturbüro nutzt Daten kommerziell |
| [boq-lint](https://github.com/KanadeK/boq-lint), [boq-diff](https://github.com/KanadeK/boq-diff) | lokale Prüfung bzw. Versionsvergleich von Excel-BoQs [41] | MIT | 2 | 2026-07 → 2026-09 | mittel (Prüf-/Diff-Ideen) |

## 3. Die wichtigsten Projekte im Detail

### 3.1 OpenConstructionERP (DataDrivenConstruction)

**Was es ist:** Das mit Abstand sichtbarste OSS-Projekt im Feld: seit 2026-04-02 auf GitHub, 1.334 Sterne,
403 Forks, AGPL-3.0, aktuelles Release v19.3.0 vom 2026-11-09 [2]. Stack laut README: React-Frontend,
FastAPI-Backend, PostgreSQL; Installation per `pip install openconstructionerp`, Python ≥ 3.12 [2].

**Fachlicher Umfang laut Projekt [2][3]:** BOQ-Editor mit Hierarchie, Baugruppen und Formeln; Mengen aus PDF, DWG
und IFC; KI-Zuordnung zu einer Kostendatenbank; Ausschreibungs-, Bieter- und RFQ-Module mit Angebotsvergleich und
Zuschlag; Nachträge (*change orders, variations, site measurements*); Fortschritt je Position; E-Rechnung nach
EN 16931; Validierungsregeln für DIN 276, GAEB, NRM und MasterFormat. Ein Modul liest und schreibt BIM-LV-Container
nach DIN SPEC 91350 [3].

**GAEB- und DACH-Umfang:** Die Projektdoku nennt Lesen und Schreiben von GAEB DA XML 3.3 für X83 und X84 als eigene
Implementierung; die offiziellen XSD werden bewusst nicht mitgeliefert, sondern zur Testzeit geladen, und die
BVBS-Prüfdateien wurden wegen der Nutzungsbedingungen durch selbst erzeugte Testdateien ersetzt [4]. Das
„Germany Construction Pack“ lädt DIN 276:2018, VOB 2019 und HOAI-Honorartafeln [5].

**Beobachtete Schwächen (eigene Prüfung):**
- Das Germany-Pack beschreibt X83 als „Angebotsabgabe“ und X84 als „Nebenangebot“ [5]; richtig ist
  X83 = Angebotsaufforderung, X84 = Angebotsabgabe – so steht es sogar in der GAEB-Seite desselben Repos [4] und in
  [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md). *Einschätzung:* Widersprüche dieser Art deuten auf
  großflächig generierte Inhalte ohne fachliche Endkontrolle.
- Entwicklungsmodell: ca. 9.000 Commits fast ausschließlich über das Organisationskonto; externe Pull Requests werden
  aus Lieferketten-Gründen nicht gemerged [2]. Die Plattform ist damit faktisch ein Einzelanbieter-Produkt mit
  offenem Quellcode und kommerzieller Zweitlizenz.
- Breite statt Tiefe: von Punktwolken über Fördermittel bis Steuerabzug [3]. *Einschätzung:* Für das Architekturbüro
  mit LPH 6–8 ist der Funktionsumfang überdimensioniert und die deutschen Spezialfälle (Preisspiegel nach VHB,
  Vergabevermerk, Aufmaß nach REB, Abschlagsrechnung nach VOB/B) sind nicht erkennbar tief umgesetzt.

**Wiederverwendbarkeit:** Code nur unter AGPL nutzbar (würde unser Projekt ebenfalls zu AGPL machen). Gut nutzbar
als Ideensammlung und als Beispiel für eine saubere Rechtsbegründung zu XSD und Prüfdateien [4].

### 3.2 Open Calc Studio (OpenAEC Foundation, Niederlande)

**Was es ist:** Ein Kalkulationsprogramm („calculatieprogramma“) für die Baubranche, getragen von der
niederländischen OpenAEC Foundation. Repository seit 2026-05-02, Release 2026.45.0 (Versionierung Jahr.ISO-Woche),
LGPL-3.0-only, laut README noch in „public testing“ [6].

**Technik [6]:** TypeScript/React; Desktop über Tauri 2 (Windows, macOS universal, Linux als AppImage/DEB/RPM, Snap),
dazu eine Browser-Version, ein React/JS-SDK (`@openaec/open-calc-studio`), eine native Bibliothek (DLL/.so/.dylib),
ein Headless-Rechendienst und ein MCP-Server für KI-Assistenten. Eigenes Projektformat `.ifcCalc` (Formatversion 2.4.0).
Laut README liefen für das Release 923 Tests; die Pakete sind signiert und notarisiert.

**Fachlicher Umfang [6]:** Hierarchische Kalkulation mit Kapiteln, Kostenpositionen, Aufwandswerten, Stundensätzen,
Ressourcenklassen, Zuschlägen (Gemeinkosten, Gewinn), gemischter MwSt. und Rundung; Varianten und Schnappschüsse;
Mengen aus IFC, PDF-Messungen und Tabellen mit nachvollziehbarer Herkunft; „Review Center“ für Preis-, Mengen- und
Einheitenprüfungen; Katalogpreis-Aktualisierung mit Rückgängig-Funktion; KI-Vorschläge nur nach Bestätigung.

**Austauschformate [6][49]:** Import und Export für niederländisches CUF/RAW/IBIS, spanisches BC3 und österreichisches
ÖNORM A 2063 (ONLV). **GAEB nur eingeschränkt:** Import einer X83 (Kapitel, Positionen, Text, Einheit, Menge,
ggf. Preis) und Übernahme der Preise aus einer X84 auf exakt passende OZ; Anlagen, Alternativen und manche Freitexte
gehen verloren; **kein GAEB-Export, keine BVBS-Zertifizierung** [49]. SIA 451, italienisches XPWE und US-Formate sind
nicht umgesetzt [49].

**Einordnung:** Die Software ist eine *Kalkulation* (Kostenermittlung des Planers oder Unternehmers), keine AVA: Es
gibt keinen Bieterrücklauf, keinen Preisspiegel, keine Vergabe und keine Abrechnung [6][49].
*Einschätzung:* Für uns der interessanteste Baustein – LGPL erlaubt die Einbindung als Bibliothek, ohne dass unser
Projekt dieselbe Lizenz übernehmen muss; das Projekt sucht offenbar internationale Formate und könnte ein Partner für
eine gemeinsame Kalkulations-/Formatbibliothek sein.

### 3.3 LeenO / Ultimus (Italien)

**Was es ist:** Eine Erweiterung für LibreOffice Calc für *computo metrico estimativo* (Kostenermittlung mit
Mengenansatz, entspricht grob LV mit Kostenanschlag) und *contabilità lavori* (Bauabrechnung mit Aufmaßbuch,
Abschlagsständen und Nachträgen) [7]. LeenO ist ein Fork des älteren Ultimus (GitHub-Spiegel von 2013, LGPL-3.0) [8][7].

**Kennzahlen [7]:** LGPL-2.1; GitHub-Repo seit 2014, GitLab seit 2018, letzter Commit 2026-11-09; rund 3.800 Commits
des Hauptentwicklers, daneben wenige weitere Beitragende und KI-Agenten. Finanzierung über Spenden (eigene Website,
Liberapay); Community über Telegram- und Facebook-Gruppen.

**Funktionen laut Projekt [7]:** Computo, Baustellenbuchhaltung, Varianten (Nachträge) und *libretti delle misure*
(Aufmaßbücher); Import der jährlich aktualisierten regionalen Preislisten (*prezzari*) italienischer Regionen und
Behörden; ausgerichtet auf die italienische Verordnung DM 49/2018 zur elektronischen Bauabrechnung; Dateien im offenen
ODF-Format.

**Einordnung:** LeenO ist der deutlichste Beleg, dass ein schmales, fachlich genaues OSS-Werkzeug für öffentliche
Bauprojekte über ein Jahrzehnt überleben kann – mit einem engagierten Hauptentwickler, einer Tabellenkalkulation als
Oberfläche und amtlichen, frei verfügbaren Preislisten. *Einschätzung:* Für Deutschland fehlt das letzte Element:
STLB-Bau und Baupreisdaten sind lizenzpflichtig (siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md)).

### 3.4 Bonsai und IfcOpenShell: Kosten im IFC-Modell

**Was es ist:** Bonsai (früher BlenderBIM) ist das freie BIM-Werkzeug auf Basis von Blender und der Bibliothek
IfcOpenShell. Es bildet Kosten direkt im IFC-Standard ab: Kostenpläne als `IfcCostSchedule`, Positionen als
`IfcCostItem`, verschachtelte Summenpositionen, feste Werte oder Summen, Menge × Wert [15].

**Für AVA relevante Bausteine [15][16]:**
- Ein *Schedule of Rates* ist ein Kostenplan nur mit Einheitspreisen, ohne Mengen; seine Positionen lassen sich mit
  Positionen eines anderen Plans – etwa einer BoQ – verknüpfen, sodass ein Preis mehrfach genutzt wird.
- Mengen lassen sich manuell eintragen oder aus Bauteilen ableiten; eine QTO-Funktion schreibt berechnete Mengen in die
  Standard-Mengensätze des Modells.

**ifc5d [54]:** Das Teilpaket von IfcOpenShell für Kostendaten wandelt CSV in IFC-Kostenpläne um und exportiert
IFC-Kostenpläne nach XLSX, CSV und ODS. Mitgeliefert sind Beispiel-CSVs für eine einfache BoQ, einen Schedule of
Rates, eine BoQ mit Mengenabfrage auf Modellelemente, mit Kategorien, mit Preisen und mit Formeln. IfcOpenShell
steht unter LGPL-3.0 (2.943 Sterne, täglich aktiv) [54].

**Grenzen [15][16]:** Die Wiki-Seite ist als „W.I.P.“ markiert (zuletzt bearbeitet 13.07.2026), mehrere Abschnitte
(Mengen aus verknüpften Bauteilen, QTO-Werkzeuge) sind leer; die offizielle Anleitung ist ebenfalls unvollständig.
Ausschreibung, Bieter, Preisspiegel und Abrechnung kommen nicht vor.

*Einschätzung:* Bonsai ist ein Werkzeug für Modellierer, kein AVA-Ersatz. Für uns relevant sind die IFC-Kostenobjekte
als mögliches Austauschformat zum Modell und IfcOpenShell als Python-Bibliothek für eine spätere IFC-Mengenübernahme
(Details: [BIM und AVA](/okf/research/standards/bim-and-ava.md)).

### 3.5 Deutsche Kleinwerkzeuge: APVE, Conocto, Aufmaß, AVALito, bieterwerk

Im Herbst 2026 tauchen auf GitHub mehrere deutsche Werkzeuge auf, die genau unsere Prozessschritte berühren – aber
**keines ist frei lizenziert und zugleich auf der Planerseite vollständig**:

| Werkzeug | Prozessschritt | Bemerkenswert | Haken |
|---|---|---|---|
| **APVE** [10] | Vergabe (LPH 7): Angebotsauswertung | liest GAEB X8x/P8x/D8x und bepreiste LV-PDFs, erkennt Bieterordner und ZIPs, Preisspiegel je Los mit Abweichung zum Günstigsten und zur Kostenschätzung (X82), Nachverhandlungsrunden, Vollständigkeitsprüfung der Unterlagen, Vergabevermerk als PDF, alles lokal im Browser | keine Lizenz → nicht nutzbar; Einzelentwickler, Vercel-Deployment |
| **Conocto** [11] | Bieterseite: LV verstehen | LV als Graph, Prüfhinweise (Bedarfs-/Alternativpositionen, offene Bieterangaben), Begleit-PDF, lokal im Browser | ausdrücklich „alle Rechte vorbehalten“ |
| **Aufmaß** (bauzertifikate.de) [13] | Mengenermittlung | liest 3D-Volumenkörper aus DWG/DXF, berechnet Wände, Decken, Dächer, schreibt X83 (DA XML 3.2) | nach fünf Tagen in ein Firmen-Repository umgezogen; eigene Lizenz |
| **AVALito** [12] | ganze AVA | lokale Windows-AVA mit Projekten, Vorlagen und Benutzerkonten | nur Installer, Quellcode nicht offen |
| **bieterwerk** [50] | Bieterseite: Kalkulation | Import GAEB 90/2000/XML und ÖNORM, EFB-Formblätter 221/223, Preisspiegel, Nachträge nach VOB, X84-Export, XRechnung, lokale KI | AGPL; 2025/2026 als kommerzielles Produkt entstanden, dann ohne Support freigegeben [50] |

*Einschätzung:* Funktional ist APVE das beste deutsche Vorbild für den Preisspiegel-Schritt; die
Detailtiefe (Bieterordner, Nachverhandlung, Vollständigkeitsprüfung, Vergabevermerk) zeigt, was Praktiker
erwarten. Da es keine Lizenz trägt, kann man nur die Ideen übernehmen, nicht den Code; eine Anfrage beim Autor
wäre möglich.

### 3.6 bidwright und US-Estimating-Projekte

**bidwright** [9] ist eine KI-zentrierte Kalkulationsplattform für Bauunternehmen: Ausschreibungsunterlagen
einlesen und indizieren, 2D-Mengen aus PDF und 3D-Mengen aus Modellen, wiederverwendbare Baugruppen mit Parametern und
verschachtelten Unterbaugruppen, eine strukturierte „Estimate Strategy“ (Umfang → Ausführung → Pakete → Benchmark),
KI-Prüfung des Angebots gegen die Unterlagen und Angebotsversand. Stack: Next.js 16, React 19, PostgreSQL mit Prisma
(73 Modelle) und pgvector, Redis, lokale Modelle über Ollama, MCP-Server; AGPL-3.0-only; seit 2026-03, 83 Sterne [9].

Weitere Projekte sind enger: **BidSheet** (GPL-3.0) für US-Tiefbau-Nachunternehmer [22], **TakeoffCraft**
(Apache-2.0) für kalibrierte Längen-, Flächen- und Stückmengen aus PDF-Plänen mit Kostenspalten [21].
*Einschätzung:* Diese Werkzeuge stehen auf der **Bieterseite** und folgen US-Logik (Pauschalangebot an den
Generalunternehmer, *assemblies*, *markups*). Für die Planerseite eines deutschen Büros sind sie nur als Ideenquelle
(Baugruppen, Mengenherkunft, PDF-Aufmaß) brauchbar; TakeoffCraft ist wegen Apache-2.0 und seiner Aktivität der
aussichtsreichste direkt einbindbare PDF-Mengen-Baustein im Scan (Reife ungeprüft, Repo erst seit 2026-10) [21].

## 4. Verwandte OSS-Ökosysteme (ERP, Projektmanagement, BIM)

| Ökosystem | Was es für Bau/BoQ gibt | Lizenzlage | Ausschreibung/Vergabe? | Quelle |
|---|---|---|---|---|
| **Odoo** | Im Kern nichts Bauspezifisches. Im App-Store kostenpflichtige Drittmodule, z. B. „Construction Project BOQ and Cost Tracking“ (Probuse, 257 €): BoQ-Zeilen nach Material/Lohn/Gemeinkosten, Revisionen, Sperren, Übergabe an Job-Kostenblätter | **Odoo Proprietary License v1.0** – Weitergabe verboten [17] | nein; GAEB nicht erwähnt [17] |  [17] |
| **ERPNext / Frappe** | Laut einem Dienstleister sind die Standard-Projekte und Rechnungen von ERPNext nicht für BoQ, Nachunternehmerketten und Einbehalte gebaut; er verkauft eine Bau-App auf Bestellung (BoQ mit Kostencodes, Abschlagsrechnungen nach bestätigten Mengen je BoQ-Zeile, Einbehalte) ab 799 US-$ [18]. Auf GitHub nur kleine Community-Apps (z. B. `construction_management`, MIT, 2026; eine philippinische App für Abschlagsrechnungen) [59] | Bestell-App: Quellcode geht an den Kunden, kein OSS-Projekt [18]; Community-Apps uneinheitlich | Ausschreibung nicht erwähnt [18]; eine Tender-Management-App für ERPNext v12 von 2020 (zwei Tage Aktivität) [33] | [18][33][59] |
| **Dolibarr** | „BTP“-Mikromodul von 2017, das nur Grundeinstellungen setzt [1]; kostenpflichtiges „Pack DoliConstruction v2“ (ATM Consulting, 950 € netto inkl. ein Jahr Updates, Version 2.7, letzte Aktualisierung 26.06.2026): Projekte, Abschlagsrechnungen, Vertragsnachträge, Zwischensummen in Angeboten [51] | Kern GPL-3.0; Lizenz des Pakets auf der Shopseite nicht angegeben [51] | nein; Métré, DPGF oder Ausschreibung nicht erwähnt [51] | [1][51] |
| **Tryton** | keine Treffer | – | nein | [1] |
| **kivitendo** (deutsches Web-ERP, Perl, 123 Sterne, aktiv) | kaufmännisches ERP; die GitHub-Codesuche findet kein „GAEB“ [58] | GitHub erkennt keine Lizenzdatei [58] | nein | [58] |
| **OpenProject BIM** | IFC-Viewer im Browser, mit dem Modell verknüpfte Aufgaben, BCF-Import/-Export, Revit-Add-in (Revit 2019–2021 genannt) [52] | BCF-Modul laut BIM-Guide ein Enterprise-Add-on [52] | nein; Kosten, BoQ, Ausschreibung oder Budgets kommen im BIM-Guide nicht vor [52] | [52] |
| **IfcOpenShell / Bonsai** | `IfcCostSchedule`, Schedule of Rates, QTO, ifc5d-Konverter (Abschnitt 3.4) | LGPL-3.0 (IfcOpenShell, ifc5d) bzw. GPL-3.0 (Bonsai), laut Lizenzdateien [54] | nein | [15][16][54] |
| **FreeCAD (BIM)** | Bauteillisten; QTO-Zusatzmodul eines Drittanbieters [42] | LGPL (FreeCAD), MIT (Modul) | nein | [42] |

*Einschätzung:* Kein verbreitetes OSS-ERP deckt Ausschreibung, Preisspiegel oder Bauabrechnung für Planer ab. Was es
gibt, zielt auf Bauunternehmen (Kalkulation, Job-Costing) und ist im Odoo-Umfeld meist proprietär. Ein
AVA-Modul *in* einem ERP würde uns außerdem an dessen Datenmodell und Release-Zyklus binden; für ein Architekturbüro
ist ein ERP ohnehin nicht das führende System.

## 5. Internationale Gegenstücke

Wie andere Länder das Planer-Dokument „Leistungsverzeichnis mit Mengen und Preisen“ regeln und ob dort freie
Software entstanden ist:

| Land | Regelwerk / Dokument | Entspricht bei uns | Offenes Austauschformat? | OSS-Lage | Lehre für uns |
|---|---|---|---|---|---|
| **Vereinigtes Königreich** | RICS NRM: NRM 1 Kostenplanung, NRM 2 detaillierte Aufmaßregeln für *bills of quantities* und *schedules of rates*, NRM 3 Instandhaltung; aktuelle Fassung als Paket vom 28.10.2021, 2022 neu eingestuft [55] | NRM 1 ≈ DIN 276, NRM 2 ≈ VOB/C-Abrechnungsregeln plus LV-Gliederung | kein nationales Datenformat bekannt | nur Klassifikationen in generischen QTO-Werkzeugen [20] und ein UK-Pack in OpenConstructionERP [3] | Kostenplanung und Leistungsbeschreibung sind auch dort getrennte Regelwerke |
| **USA** | CSI MasterFormat (Gliederung der Leistungsbeschreibung), UniFormat (Gliederung nach Bauteilen) [29][20] | etwa Leistungsbereiche/Gewerke bzw. Kostengruppen | nein (Pauschalvergabe an Generalunternehmer üblich) | viel Kalkulations-OSS auf **Bieterseite** (bidwright, BidSheet, TakeoffCraft) [9][22][21]; MasterFormat-Codeliste als JSON von 2019 [29] | Bieterseite ist OSS-freundlicher Markt; Planerseite fehlt auch dort |
| **Frankreich** | DPGF (Aufschlüsselung eines Pauschalpreises, meist ohne Vertragswert), BPU (Einheitspreisliste), DQE (BPU × geschätzte Mengen, vor allem zum Angebotsvergleich) [56] | DQE ≈ Einheitspreis-LV mit Preisspiegel; DPGF ≈ Pauschalvertrag mit Leistungsaufgliederung | nein | nur winzige DPGF-Skripte [1][14]; Dolibarr-Baupakete ohne DPGF [51] | dieselbe Aufteilung Einheitspreis/Pauschal wie bei uns |
| **Spanien** | FIEBDC-3/BC3, gepflegt vom Verband FIEBDC; gültig sind die Fassungen 2020 und 2024; kostenloser BC3-Checker [57] | GAEB, aber auch für Preisdatenbanken genutzt | **ja** | lebendiges Parser-Ökosystem (TypeScript/npm, Rust, Java, Python) und Web-Apps für Aufmaß, Kostenanschlag und Abschlagsrechnungen [19][26][27][46] | ein offen dokumentiertes Nationalformat zieht freie Werkzeuge an |
| **Italien** | *computo metrico estimativo* und *contabilità lavori*, amtliche regionale Preislisten, DM 49/2018 [7] | LV mit Kostenanschlag + Bauabrechnung | Tabellen (ODF) | **LeenO** seit 2013, LGPL [7][8]; Open-E.Hub [45] | frei verfügbare amtliche Preisdaten tragen ein OSS-Werkzeug über Jahre |
| **Österreich** | ÖNORM A 2063 (Datenformat ONLV) | GAEB | genormtes Datenformat | Import/Export in Open Calc Studio [49], Import in bieterwerk [50] | Nachbarformat; mit wenig Aufwand mitnehmbar |
| **Schweiz** | SIA 451 / CRBX, Leistungstexte nach NPK (CRB) | GAEB / STLB-Bau | genormtes Datenformat | ein Versuch von 2015 (ein Monat Aktivität) [38]; in Open Calc Studio nicht umgesetzt [49] | ähnliche Lizenzlage wie STLB-Bau |
| **Brasilien** | SINAPI – öffentliche Referenzpreise für staatlich finanzierte Bauvorhaben [30] | Baupreisdaten | offene Datensätze | Werkzeuge zum Abruf und Aufbereiten (AutoSINAPI) [30] | offene Preisdaten = OSS-Treiber |
| **Russland** | XML-Schema des Bauministeriums für Mengenaufstellungen [28] | GAEB-Phase ohne Preise | ja (staatlich) | ein kleines Projekt [28] | Staatsformate erzeugen Nischen-OSS |

*Einschätzung:* Erfolgreiche freie Werkzeuge entstehen dort, wo **Format und Referenzdaten frei** sind (Spanien,
Italien, Brasilien). In Deutschland ist das Format GAEB frei nutzbar, die Daten (STLB-Bau, BKI, sirAdos) aber nicht –
siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) und [DIN 276](/okf/research/standards/din-276-cost-planning.md).

## 6. Eingeschlafene und abgebrochene Versuche

| Projekt | Zeitraum | Was | Was daraus wurde | Grund (soweit erkennbar) |
|---|---|---|---|---|
| Ultimus (Italien) | 2013 | *computo metrico* in LibreOffice | als **LeenO** weitergeführt, bis heute aktiv [8][7] | Gegenbeispiel: erfolgreicher Fork |
| Estimate (SourceForge) | 2011 → 2020-08-13 | Web-Kalkulation für Tief- und Anlagenbau (BoQ, Einheitspreisanalysen, Angebotsmanagement), Java, AGPL, zuletzt v2.1.1 [48] | ruht seit 2020 | nicht dokumentiert |
| QCost (SourceForge) | 2013-04 → 2017-04 | Kostenermittlung, C++/Qt, GPL-3.0, Alpha 0.8.2 [47] | ruht | nie über Alpha hinaus |
| fiebdc3-parser, bc3reader | je 2015 | BC3-Parser [39] | einmaliger Upload | Einzelversuch |
| janhajk/451 | 2015 (ein Monat) | SIA 451 lesen [38] | ruht | Einzelversuch |
| masterformat-json | 2019 | Codeliste [29] | ruht | einmalige Datenlieferung |
| bim-lv-parser | 2020 (ein Tag) | XML-Parser für „BIM-Leistungsverzeichnis“ [40] | ruht | Einzelversuch |
| ErpNext_V12_TenderMangement | 2020 (zwei Tage) | Ausschreibungsprozess für ERPNext v12 [33] | ruht, 11 Forks | an alte ERPNext-Version gebunden |
| module_dolibarr_btp | 2017 (zwei Wochen) | Dolibarr für Baubetriebe einrichten [59] | ruht | Hersteller verkauft heute ein kostenpflichtiges Paket [51] |
| LV-Konverter, gaeb-sql-converter | 2020 bzw. 2021–2022 | CSV → D83, GAEB → Datenbank | ruhen | siehe [GAEB-Notiz](/okf/research/standards/gaeb-tooling-interop.md#23-weitere-freie-gaeb-werkzeuge) |
| QuantityTakeoff-Python (DDC) | 2021 → 2023-12 | Mengen aus BIM-Exporten [43] | ruht | aufgegangen in OpenConstructionERP (Einschätzung) |
| bieterwerk | 2025/2026 → 2026-09 | Bieter-Kalkulation mit GAEB, Preisspiegel, Nachträgen [50] | als OSS „verschenkt“, ohne Support | laut README als kommerzielles Produkt entstanden und sonst „ungenutzt“ geblieben [50] |
| Aufmaß (bauzertifikate.de) | 2026-11 (fünf Tage) | DWG → Mengen → X83 [13] | in ein Firmen-Repository umgezogen | Produktintegration |

*Einschätzung:* Die Abbrüche folgen drei Mustern: (1) **Einzelentwickler mit Teilfunktion** (ein Parser, ein Format)
ohne Nutzerkreis; (2) **kommerzielle Versuche**, die aufgegeben und dann als Code „verschenkt“ werden; (3) Bindung an
eine **Wirtsplattform** (ERP-Version), die weiterzieht. Das einzige langlebige Beispiel (LeenO) hat einen engagierten
Hauptentwickler, eine klare Fachzielgruppe, frei verfügbare Daten und Spendenfinanzierung.

## 7. Muster und Beobachtungen

1. **Welle 2025/2026.** Fast alle relevanten Projekte sind 2025 oder 2026 entstanden: OpenConstructionERP (2026-04),
   Open Calc Studio (2026-05), bidwright (2026-03), APVE (2026-10), AVALito (2026-10), dazu die GAEB-Bibliotheken
   ([GAEB-Notiz](/okf/research/standards/gaeb-tooling-interop.md#24-qualitätsbeobachtungen)) [2][6][9][10][12].
   Viele zeigen erkennbar KI-gestützte Entwicklung: rund 9.000 Commits in sieben Monaten bei OpenConstructionERP [2],
   Commits von KI-Agenten bei LeenO [7], MCP-Server bei Open Calc Studio und bidwright [6][9].
2. **Planerseite ist unterversorgt.** Die meisten Projekte sind Kalkulation für Unternehmer (Bieterseite). Eine
   Planer-AVA über LPH 6–8 bieten nur OpenConstructionERP (breit, in der deutschen Tiefe fraglich) und OpenAVA
   (Funktionsliste ohne öffentlichen Code) [2][5][53].
3. **Lizenzlücken.** Wichtige deutsche Werkzeuge haben gar keine Lizenz (APVE), sind nur einsehbar (Conocto),
   geschlossen (AVALito) oder „Open Core“ ohne Code (OpenAVA) [10][11][12][53]. Ohne Lizenz darf niemand den Code
   nutzen, auch wenn er auf GitHub liegt.
4. **Lizenzwahl folgt der Rolle.** Plattformen nutzen meist AGPL (OpenConstructionERP, bidwright, bieterwerk,
   Estimate) [2][9][50][48], Bibliotheken permissive Lizenzen oder LGPL (pyGAEB, BC3: MIT; TakeoffCraft: Apache-2.0;
   Open Calc Studio, IfcOpenShell, LeenO: LGPL) [19][21][6][54][7].
5. **Geschäftsmodelle:** Dual Licensing (OpenConstructionERP) [2], Open Core mit SaaS (OpenAVA) [53], Spenden
   (LeenO) [7], Stiftung/Foundation (OpenAEC) [6], Bestell-Software auf ERP-Basis (Odoo/ERPNext-Dienstleister) [17][18].
6. **Daten statt Code als Engpass.** Freie Werkzeuge gedeihen, wo Referenzpreise öffentlich sind (Abschnitt 5).
   DataDrivenConstruction versucht, mit einer eigenen „offenen“ Kostendatenbank diese Lücke zu füllen, hat die Daten
   aber von CC BY 4.0 auf CC BY-NC 4.0 umgestellt – kommerzielle Nutzung, also auch die Arbeit eines Planungsbüros,
   braucht seitdem eine Zusatzlizenz [25]. Wie gut die Preise für deutsche Projekte passen, ist ungeprüft.
7. **Vorsicht bei Sternen.** Mehrere Repos mit 68–71 Sternen, die angeblich Installer kommerzieller Software
   anbieten, wurden am Abruftag aktualisiert [44]; Sterne sind kein Qualitätsmerkmal.

## 8. Einschätzung: Lücke und Wiederverwendung

**Gibt es bereits eine freie AVA für deutsche Architekten?** Nein – nicht in einer Form, die man heute einem Büro
empfehlen könnte:

| Kandidat | Warum (noch) keine Lösung |
|---|---|
| OpenConstructionERP | Generisches „Bau-ERP“ für 40+ Märkte; GAEB nur X83/X84; fachliche Fehler in der deutschen Doku; keine externen Beiträge möglich; AGPL bzw. kostenpflichtige Lizenz [2][3][4][5] |
| OpenAVA | Funktionsliste passt genau, aber kein öffentlicher Code, keine Version, Demo nur auf Anfrage [53] |
| AVALito | geschlossen, nur Windows [12] |
| Open Calc Studio | Kalkulation ohne Vergabe und Abrechnung; GAEB nur Import [6][49] |
| LeenO | italienisches Recht und italienische Preislisten [7] |

**Was sich wiederverwenden lässt:**

| Baustein | Kandidat | Lizenz | Art der Nutzung |
|---|---|---|---|
| GAEB lesen/schreiben | pyGAEB, gaebboss | MIT / MIT-Apache | Bibliothek – siehe [GAEB-Notiz](/okf/research/standards/gaeb-tooling-interop.md#7-einschätzung-bauen-oder-wiederverwenden) |
| Kalkulationskern, BC3/ONLV/CUF-Konverter | Open Calc Studio SDK | LGPL-3.0-only | Bibliothek oder Kooperation; vorher Datenmodell-Passung prüfen [6][49] |
| IFC-Kostenpläne, Mengen aus Modell | IfcOpenShell inkl. ifc5d | LGPL-3.0 | Bibliothek (Python) [54] |
| Mengen aus PDF-Plänen | TakeoffCraft | Apache-2.0 | Bibliothek/Komponente [21] |
| REB-DA11-Aufmaß | reb-da11 | MIT (PHP) | Formatreferenz, siehe [GAEB-Notiz](/okf/research/standards/gaeb-tooling-interop.md#23-weitere-freie-gaeb-werkzeuge) |
| Arbeitsablauf Preisspiegel/Vergabevermerk | APVE | keine Lizenz | nur Ideen; Lizenzanfrage möglich [10] |
| Prüfregeln als „Rule Packs“, eigene GAEB-Testdateien statt BVBS-Prüfdateien | OpenConstructionERP | AGPL | nur Konzept übernehmen, nicht Code [4] |
| Mengenherkunft, Review Center, Varianten | Open Calc Studio | LGPL | Konzept [6] |
| Baugruppen mit Parametern | bidwright | AGPL | Konzept [9] |

*Einschätzung:* Es gibt eine echte Lücke für ein **freies, selbst hostbares, gemeinschaftlich getragenes
Planer-AVA mit deutscher Fachtiefe**. Der Kern (LV-Modell, Bieterrücklauf, Preisspiegel, Vergabe, Aufmaßprüfung,
Rechnungsprüfung, Kostenkontrolle nach DIN 276) muss selbst gebaut werden; wiederverwendbar sind Formatbibliotheken,
Mengenwerkzeuge und viele Ideen.

## Relevanz für unser Projekt

**Muss-Anforderungen, die aus dem Scan folgen**
- **Lizenz früh und bewusst wählen.** AGPL-Code (OpenConstructionERP, bidwright, bieterwerk) dürfen wir nur übernehmen,
  wenn unser Projekt selbst AGPL wird. LGPL-Bibliotheken (Open Calc Studio, IfcOpenShell) und MIT/Apache-Bibliotheken
  (pyGAEB, gaebboss, TakeoffCraft) sind mit fast jeder Projektlizenz kombinierbar. Details in
  [Open-Source-Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).
- **Planerseite LPH 6–8 vollständig abdecken:** Das ist der unbesetzte Raum (Abschnitt 7, Punkt 2). Bieterkalkulation
  ist nicht unser Ziel; ein schlanker Bieterzugang (X83 hinaus, X84 zurück) aber schon.
- **Fachliche Korrektheit sichtbar machen:** Die GAEB-Phasenfehler bei OpenConstructionERP zeigen, wie leicht
  generierte Inhalte falsch sind. Wir brauchen fachliche Abnahme durch den Architekten-Freund und Tests gegen
  echte Dateien.
- **Lizenzklare Testdaten:** wie OpenConstructionERP eigene GAEB-Testdateien erzeugen, statt BVBS-Prüfdateien oder
  STLB-Texte ins Repo zu legen [4].

**Differenzierungschancen**
- Gemeinschaftsprojekt mit offener Steuerung (Stiftung, Verein) statt Einzelfirma mit Dual Licensing – das fehlt im
  deutschen Feld (OpenConstructionERP nimmt keine PRs an; OpenAVA ist Open Core ohne Code).
- Deutsche Tiefe statt 40-Länder-Breite: korrekte GAEB-Phasen, Preisspiegel mit Kostenschätzung als Vergleichsspalte,
  Vergabevermerk, Aufmaß nach REB, Abschlagsrechnungsprüfung nach VOB/B, Kostenkontrolle nach DIN 276
  (Prozesse: [Vergabe](/okf/research/process/tendering-and-award.md), [Abrechnung](/okf/research/process/billing-and-cost-control.md)).
- Lokale Verarbeitung im Browser (wie APVE, Conocto) als Datenschutz-Argument für öffentliche Auftraggeber.

**Risiken**
- **Sichtbarer Wettbewerber:** OpenConstructionERP hat Reichweite (1.334 Sterne, 403 Forks, viele Sprachen) und wirbt
  mit DIN 276 und GAEB [2]. Ein neues Projekt muss erklären, warum es trotzdem nötig ist.
- **OpenAVA könnte Code veröffentlichen** und dieselbe Nische besetzen; Doppelarbeit wäre dann vermeidbar, wenn man
  früh Kontakt aufnimmt [53].
- **Nachhaltigkeit:** Die Abbruchliste (Abschnitt 6) zeigt: Einzelentwickler-Projekte ohne Nutzerkreis schlafen ein.
- **KI-Flut:** Viele junge Repos sind schnell generiert; Qualität und Wartung sind unklar. Abhängigkeiten nur nach
  Prüfung (Tests, Aktivität, Lizenz) aufnehmen.

**Aufwandsschätzung (Einschätzung, grob)**
- Durch Wiederverwendung gespart: GAEB-Parser (Wochen), IFC- und PDF-Mengen (Monate), Formatkonverter für Nachbarländer.
- Nicht zu sparen: das Planer-Domänenmodell und die Prozesse LPH 6–8 – hier gibt es keinen freien Code, den man
  übernehmen könnte. Ein erster nutzbarer Umfang (LV anlegen, X83 ausgeben, X84 einlesen, Preisspiegel) dürfte
  eher mehrere Personenmonate als Wochen brauchen.

## Offene Fragen

- **OpenAVA:** Ist der Code irgendwo öffentlich, unter welcher Lizenz genau, wie reif ist er? Kontakt über die
  Projektseite wäre der direkteste Weg [53].
- **OpenConstructionERP:** Wie gut ist der GAEB-Export wirklich? Ein Test mit pyGAEB-Validierung und einem Import in
  NOVA AVA würde das klären. Woher stammen die Preise der CWICR-Datenbank (Daten CC BY-NC 4.0), und taugen sie für
  deutsche Projekte [25]?
- **Open Calc Studio:** Ist die OpenAEC Foundation offen für einen GAEB-Export-Beitrag oder eine gemeinsame
  Kalkulationsbibliothek? Wie wird die Stiftung gesteuert und finanziert?
- **APVE:** Wäre der Autor bereit, eine freie Lizenz zu vergeben?
- **IfcOpenShell/Bonsai:** Bonsai (GPL-3.0) eignet sich nur als eigenständiges Werkzeug neben unserem Projekt; ob
  ifc5d (LGPL-3.0) für deutsche LV-Strukturen (OZ-Maske, Lose, Bedarfspositionen) reicht, ist ungeprüft [54].
- **PyPI** war nicht maschinell durchsuchbar; weitere Pakete ohne GitHub-Repo könnten fehlen.
- **Nutzerzahlen** von LeenO, Estimate oder OpenConstructionERP sind nicht belegt (Sterne und Downloads sind kein Maß
  für Büros im Echtbetrieb).
- **Fragen an den Architekten-Freund:**
  1. Kennst du OpenAVA, OpenConstructionERP oder AVALito – hat jemand im Kollegenkreis so etwas getestet?
  2. Würdest du einen Tabellen-Ansatz (wie LeenO in LibreOffice) akzeptieren, oder muss es eine eigene Oberfläche sein?
  3. Welcher Teilschritt ist für dich am wertvollsten als Erstes: LV-Erstellung, Preisspiegel/Vergabevermerk oder
     Aufmaß-/Rechnungsprüfung?
  4. Wie wichtig ist dir, dass Bieter ohne Software (nur Browser) Preise eintragen können?

## Quellen

1. GitHub-Repository-Suche (eigene Abfragen per `gh search repos`, über 50 Suchbegriffe) – GitHub – https://github.com/search?type=repositories – Art: Primärquelle (Code-Hosting) – abgerufen 2026-11-09
2. OpenConstructionERP – README und Repository-Metadaten – GitHub – https://github.com/datadrivenconstruction/OpenConstructionERP – Art: Herstellerangabe/Quellcode – abgerufen 2026-11-09
3. OpenConstructionERP – MODULES.md – GitHub – https://github.com/datadrivenconstruction/OpenConstructionERP/blob/main/MODULES.md – Art: Herstellerangabe – abgerufen 2026-11-09
4. OpenConstructionERP – docs/standards/GAEB.md – GitHub – https://github.com/datadrivenconstruction/OpenConstructionERP/blob/main/docs/standards/GAEB.md – Art: Herstellerangabe – abgerufen 2026-11-09
5. OpenConstructionERP – Germany Construction Pack (packs/germany-de/README.md) – GitHub – https://github.com/datadrivenconstruction/OpenConstructionERP/blob/main/packs/germany-de/README.md – Art: Herstellerangabe – abgerufen 2026-11-09
6. Open Calc Studio – README – OpenAEC Foundation/GitHub – https://github.com/OpenAEC-Foundation/open-calc-studio – Art: Herstellerangabe/Quellcode – abgerufen 2026-11-09
7. LeenO – README und Repository – GitHub/GitLab – https://github.com/giuserpe/leeno ; https://gitlab.com/giuserpe/leeno – Art: Herstellerangabe/Quellcode – abgerufen 2026-11-09
8. Ultimus (Vorläufer von LeenO) – GitHub – https://github.com/mrjive/ultimus – Art: Quellcode – abgerufen 2026-11-09
9. bidwright – README – GitHub – https://github.com/braedonsaunders/bidwright – Art: Herstellerangabe/Quellcode – abgerufen 2026-11-09
10. APVE – Angebotsauswertung – README – GitHub – https://github.com/DaniilSvinolobov/APVE – Art: Herstellerangabe – abgerufen 2026-11-09
11. Conocto – README und LICENSE – GitHub – https://github.com/NicPalapte/conocto-doc – Art: Herstellerangabe – abgerufen 2026-11-09
12. AVALito – Veröffentlichungen (README) – GitHub – https://github.com/ing-bassam/AVALito-releases – Art: Herstellerangabe – abgerufen 2026-11-09
13. Aufmaß (bauzertifikate.de) – README – GitHub – https://github.com/DoktorDaveJoos/aufmass – Art: Herstellerangabe – abgerufen 2026-11-09
14. GitLab-Projektsuche und Codeberg-Repo-Suche (API) – https://gitlab.com/api/v4/projects?search=… ; https://codeberg.org/api/v1/repos/search?q=… – Art: Primärquelle (Code-Hosting) – abgerufen 2026-11-09
15. OSArch Wiki – Bonsai Costing – https://wiki.osarch.org/bonsai-costing/ – Art: Community-Dokumentation – abgerufen 2026-11-09
16. Bonsai-Dokumentation – Costing and scheduling – https://docs-unstable.bonsaibim.org/guides/costing_and_scheduling/index.html – Art: Herstellerdokumentation – abgerufen 2026-11-09
17. Odoo Apps – Construction Project BOQ and Cost Tracking (Probuse, `project_boq_construction_contracting`) – apps.odoo.com – https://apps.odoo.com/apps/modules/18.0/project_boq_construction_contracting – Art: Herstellerangabe – abgerufen 2026-11-09
18. ECOSIRE – ERPNext Construction Site Management – ecosire.com – https://ecosire.com/fr/apps/erpnext/erpnext-construction-site-management – Art: Herstellerangabe – abgerufen 2026-11-09
19. ogorhc/BC3 – GitHub – https://github.com/ogorhc/BC3 – Art: Quellcode – abgerufen 2026-11-09
20. aec-platform/qto – GitHub – https://github.com/aec-platform/qto – Art: Quellcode – abgerufen 2026-11-09
21. TakeoffCraft – GitHub – https://github.com/getcadcraft/takeoffcraft – Art: Quellcode – abgerufen 2026-11-09
22. BidSheet – GitHub – https://github.com/Person810/BidSheet – Art: Quellcode – abgerufen 2026-11-09
23. ERP-System für Handwerksbetriebe – GitHub – https://github.com/Winfo2024Kuhn/ERP-System-fuer-Handwerksbetriebe – Art: Quellcode – abgerufen 2026-11-09
24. Aufmaßwerk – GitHub – https://github.com/aufmasswerk/aufmasswerk – Art: Quellcode – abgerufen 2026-11-09
25. OpenConstructionEstimate DDC-CWICR – GitHub – https://github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR – Art: Herstellerangabe – abgerufen 2026-11-09
26. concreta-mediciones – GitHub – https://github.com/jramirezbandera/concreta-mediciones – Art: Quellcode – abgerufen 2026-11-09
27. presupuestos-bc3 – GitHub – https://github.com/juancar75/presupuestos-bc3 – Art: Quellcode – abgerufen 2026-11-09
28. ONP-Bill_of_Quantities – GitHub – https://github.com/OldNestling/ONP-Bill_of_Quantities – Art: Quellcode – abgerufen 2026-11-09
29. masterformat-json – GitHub – https://github.com/outer-labs/masterformat-json – Art: Quellcode – abgerufen 2026-11-09
30. AutoSINAPI – GitHub – https://github.com/LAMP-LUCAS/AutoSINAPI – Art: Quellcode – abgerufen 2026-11-09
31. BinaaCost – GitHub – https://github.com/Alfrahi/BinaaCost – Art: Quellcode – abgerufen 2026-11-09
32. tender-management-system (allgemeines Ausschreibungssystem) – GitHub – https://github.com/KhawarMehfooz/tender-management-system – Art: Quellcode – abgerufen 2026-11-09
33. ErpNext_V12_TenderMangement – GitHub – https://github.com/michaelkaraz/ErpNext_V12_TenderMangement – Art: Quellcode – abgerufen 2026-11-09
34. kostengruppensuche – GitHub – https://github.com/runxel/kostengruppensuche – Art: Quellcode – abgerufen 2026-11-09
35. din276-example – GitHub – https://github.com/cpm-ont-network/din276-example – Art: Quellcode – abgerufen 2026-11-09
36. lcabim-ontology – RWTH Aachen/GitHub – https://github.com/Design-Computation-RWTH/lcabim-ontology – Art: Wissenschaft – abgerufen 2026-11-09
37. NHMzh-plugin-cost – LTplus AG/GitHub – https://github.com/LTplus-AG/NHMzh-plugin-cost – Art: Quellcode – abgerufen 2026-11-09
38. janhajk/451 (SIA 451) – GitHub – https://github.com/janhajk/451 – Art: Quellcode – abgerufen 2026-11-09
39. fiebdc3-parser und bc3reader – GitHub – https://github.com/JcMinarro/fiebdc3-parser ; https://github.com/pihglez/bc3reader – Art: Quellcode – abgerufen 2026-11-09
40. bim-lv-parser – GitHub – https://github.com/fapiper/bim-lv-parser – Art: Quellcode – abgerufen 2026-11-09
41. boq-lint und boq-diff – GitHub – https://github.com/KanadeK/boq-lint ; https://github.com/KanadeK/boq-diff – Art: Quellcode – abgerufen 2026-11-09
42. FreeCAD-QuantityTakeoff und qto_buccaneer – GitHub – https://github.com/buildsmart888/FreeCAD-QuantityTakeoff ; https://github.com/simondilhas/qto_buccaneer – Art: Quellcode – abgerufen 2026-11-09
43. QuantityTakeoff-Python – GitHub – https://github.com/datadrivenconstruction/QuantityTakeoff-Python – Art: Quellcode – abgerufen 2026-11-09
44. Beispiel für verdächtige „Installer“-Repositories – GitHub – https://github.com/aka-erfan/CostX-BIM-Estimating-Setup-Guide – Art: Primärquelle (Beobachtung, nicht geöffnet/heruntergeladen) – abgerufen 2026-11-09
45. Open-E.Hub – GitHub – https://github.com/bbossolo/Open-E.Hub – Art: Quellcode – abgerufen 2026-11-09
46. Paketregister-Suchen (eigene Abfragen): npm https://registry.npmjs.org/-/v1/search?text=… ; NuGet https://azuresearch-usnc.nuget.org/query?q=… ; Maven Central https://search.maven.org/solrsearch/select?q=… ; crates.io https://crates.io/api/v1/crates?q=… ; Packagist https://packagist.org/search.json?q=… ; PyPI https://pypi.org/search/ (nur mit JavaScript nutzbar) – Art: Primärquelle (Register) – abgerufen 2026-11-09
47. QCost – SourceForge – https://sourceforge.net/projects/qcost/ – Art: Projektseite – abgerufen 2026-11-09
48. Estimate – SourceForge – https://sourceforge.net/projects/estimate/ – Art: Projektseite – abgerufen 2026-11-09
49. Open Calc Studio – Formatunterstützung und Grenzen (docs/wereldwijde-uitwisseling.md) – GitHub – https://github.com/OpenAEC-Foundation/open-calc-studio/blob/main/docs/wereldwijde-uitwisseling.md – Art: Herstellerangabe – abgerufen 2026-11-09
50. bieterwerk – README – GitHub – https://github.com/samuelvoltarius/bieterwerk – Art: Herstellerangabe – abgerufen 2026-11-09
51. Dolistore – Pack DoliConstruction v2 (ATM Consulting) – https://www.dolistore.com/en/modules/1502-Pack-DoliConstruction-v2.html – Art: Herstellerangabe – abgerufen 2026-11-09
52. OpenProject – BIM guide – openproject.org – https://www.openproject.org/docs/bim-guide/ – Art: Herstellerdokumentation – abgerufen 2026-11-09
53. OpenAVA – Projektseite – openava.de – https://openava.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
54. IfcOpenShell – Repository, ifc5d-README und Lizenzdateien (src/ifc5d, src/bonsai) – GitHub – https://github.com/IfcOpenShell/IfcOpenShell/tree/v0.9.0/src/ifc5d – Art: Quellcode/Herstellerdokumentation – abgerufen 2026-11-09
55. RICS – New Rules of Measurement (NRM) – rics.org – https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/construction-standards/nrm – Art: Primärquelle (Standardgeber) – abgerufen 2026-11-09
56. marche-public.fr – Définition DPGF – https://www.marche-public.fr/Marches-publics/Definitions/Entrees/DPGF.htm – Art: Fachportal – abgerufen 2026-11-09
57. FIEBDC – Formato FIEBDC-3 – fiebdc.es – https://www.fiebdc.es/format-fiebdc/ – Art: Primärquelle (Formatverband) – abgerufen 2026-11-09
58. kivitendo ERP – GitHub – https://github.com/kivitendo/kivitendo-erp – Art: Quellcode – abgerufen 2026-11-09
59. ERP-Community-Apps auf GitHub: https://github.com/mradul010/construction_management ; https://github.com/zuilsoft03/erpnext_construction_ph ; https://github.com/vertelab/odoo-construction ; https://github.com/atm-greg/module_dolibarr_btp – Art: Quellcode – abgerufen 2026-11-09
