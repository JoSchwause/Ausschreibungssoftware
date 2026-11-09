---
type: Research Note
title: "Bausteine für LV-Editor, Preisspiegel und Aufmaß: Tabellen-Grids, Excel-Zwischenablage, Mehrbenutzerbetrieb und Offline"
description: "Bewertet freie Tabellen-Komponenten (Grids), die Excel-Zwischenablage im Browser, Nebenläufigkeitsmodelle für 1–10 Nutzer sowie Offline- und Desktop-Optionen für den tabellenartigen Kern einer AVA – mit geprüften Lizenzen, Versionen und Muss/Soll/Kann-Anforderungen."
resource: https://www.ag-grid.com/javascript-data-grid/modules/
tags: [research, open-source, grid, excel, nebenlaeufigkeit, offline, lizenzen]
timestamp: 2026-11-09T17:16:17Z
sources: 58
confidence: mittel
---

# Bausteine für LV-Editor, Preisspiegel und Aufmaß: Tabellen-Grids, Excel-Zwischenablage, Mehrbenutzerbetrieb und Offline

> Stand aller Versionen, Lizenzen und Preise: 2026-11-09. Versionen, Veröffentlichungsdaten und Release-Zahlen
> stammen aus den npm-Registry-Dokumenten [19], Lizenzangaben aus den Lizenzdateien der Repositories und aus den
> Lizenzseiten der Hersteller [4][8][20]. Es wurde **keine** Software installiert oder ausgeführt; alle
> Funktionsangaben stammen aus Dokumentation und Quellcode. Herstelleraussagen zu Leistung („Millionen Zeilen“)
> sind als solche markiert und nicht nachgemessen.
> Ergänzt [Open-Source-Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md) (PDF,
> Excel-Dateien, Rich-Text, Dezimalzahlen, IFC, E-Rechnung) und wiederholt diese Themen nicht.

## Kurzfassung

- **Kein freies Grid liefert alles, was eine AVA braucht.** Baumdaten, Bereichsauswahl, Einfügen aus Excel,
  Rückgängig und Excel-Export sind bei den bekanntesten Komponenten kostenpflichtig: AG Grid 36.3 (Enterprise),
  MUI X 9.17 (Pro/Premium, 299 bzw. 599 USD pro Entwickler und Jahr), RevoGrid 4.31 (Pro: Baum, Undo, Excel)
  [1][2][6][7][12]. Handsontable 18.1 ist proprietär und verbietet ausdrücklich Konkurrenzprodukte [8].
- **Frei (MIT) und am nächsten dran:** Tabulator 6.7.1 (Baum, Zwischenablage, Bereichsauswahl, Undo) und
  SlickGrid-Universal 10.11.3 (Baum, Excel-Kopierpuffer, Excel-Export). Beide rendern ins DOM. TanStack Table 9.3.1
  mit TanStack Virtual ist die „headless“ Basis für ein eigenes Grid [13][14][15][19].
- **Weitere Lizenzfallen:** Das freie MUI-Grid virtualisiert nur 100 Zeilen, Handsontables Formel-Engine HyperFormula
  steht unter GPL-3.0-only, NocoDB hat seit 29.01.2026 eine „Sustainable Use License“ (kein Open Source), und Univer
  verlangt für Echtzeit-Mitarbeit und XLSX-Import/-Export die kommerzielle Server-SDK [7][10][17][23].
- **Excel-Zwischenablage:** Der Browser sieht nur Klartext (TSV) und HTML. Strg+V über das `paste`-Ereignis funktioniert
  überall ohne Berechtigung. Ein eigener „Einfügen“-Menüpunkt braucht dagegen die Async Clipboard API, mit Berechtigung in
  Chromium und einem Bestätigungsmenü in Firefox und Safari [21][54]. Excel liefert die *angezeigten* Werte, also
  gerundet und formatiert, und setzt mehrzeilige Zellen in Anführungszeichen [44][45]. Daraus folgen ein eigener Parser
  mit deutschem Zahlenformat, eine Vorschau und ein einzelner Rückgängig-Schritt (Anforderungen X1–X9).
- **Leistung:** Für ein LV mit 20.000 Zeilen genügt DOM-Virtualisierung. Der Preisspiegel mit 30 Bietern braucht
  zusätzlich Spalten-Virtualisierung. Unabhängige Benchmarks fehlen; der einzige gefundene Vergleich stammt vom
  RevoGrid-Hersteller [57]. Canvas-Grids (Glide, Univer, Teable, NocoDB) skalieren gut, erschweren aber
  Barrierefreiheit, Browsersuche, Druck und automatisierte Tests [11][52].
- **Mehrbenutzer (Empfehlung, Einschätzung):** Der Server bleibt maßgeblich. Pro Position gilt optimistische
  Nebenläufigkeit mit Versionsnummer/ETag. Änderungen werden live an die anderen geschickt, laufende Bearbeitungen
  angezeigt statt das ganze LV zu sperren. Baumoperationen laufen als geprüfte Befehle, und an jedem Phasenwechsel
  entsteht ein unveränderlicher Stand. Frappe/ERPNext arbeitet nach demselben Prinzip [53].
- **CRDTs** (Yjs, Automerge, Loro, alle MIT) lösen Konflikte still nach festen Regeln. Für Preise und Mengen passt das
  nicht, für Langtexte und spätere Offline-Funktionen schon. Loro bringt einen verschiebbaren Baum mit; für Yjs gibt
  es Bäume mit Verschieben nur über Zusatzbibliotheken [28][29][30]. **ShareDB** (MIT, OT) ist die reife Echtzeit-Option: Der Server kann Änderungen ablehnen, und die
  Operationshistorie bleibt lückenlos. Teable kombiniert es mit einem Canvas-Grid und PostgreSQL [31][52].
- **Offline:** SQLite-WASM 3.54 läuft auf OPFS. Browser-Speicher kann aber verschwinden, und Safari räumt nach Inaktivität
  auf. Er taugt deshalb nur als Zwischenspeicher [22][55]. Sync-Engines (ElectricSQL, PowerSync, Zero, alle Apache-2.0)
  kommen erst für ein späteres Offline-Aufmaß infrage [32][33][34].
- **Desktop:** Tauri 2 (MIT/Apache-2.0, kleine Pakete, signierte Updates sind Pflicht) liegt vor Electron (MIT,
  überall dasselbe Chromium). Kosten für die Signatur: Apple 99 USD pro Jahr; Windows ab 9,99 USD pro Monat (Azure)
  oder kostenlos über die SignPath Foundation für Open-Source-Projekte [19][36][37][38][39][48][49].
- **Selbst-Hosting:** Docker Compose, Anmeldung per OIDC (Keycloak Apache-2.0, authentik mit MIT-Kern, ZITADEL seit v3
  im April 2025 unter AGPL-3.0) und eine getestete Wiederherstellung [26][41][42].
- **Stack-Vorschlag (Einschätzung):** TypeScript mit TanStack Table/Virtual und einer eigenen Grid-Schicht für
  Bereichsauswahl, Zwischenablage und Undo; als Abkürzung Tabulator. Dazu PostgreSQL mit optimistischer
  Nebenläufigkeit und Live-Push, Tauri erst in einer späteren Phase. Alle Bausteine sind mit einer AGPL-3.0-Anwendung
  verträglich (Abschnitt 8).

## Begriffe für Nicht-Entwickler und Nicht-Architekten

| Begriff | Erklärung |
|---|---|
| **LV, Position, OZ** | Leistungsverzeichnis: hierarchische Liste der Bauleistungen (Lose, Titel, Untertitel, Positionen). Die Ordnungszahl (OZ, z. B. `01.02.0030`) ist die Gliederungsnummer jeder Zeile. Details in [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md). |
| **Kurztext / Langtext** | Kurzer Positionstitel (eine Zeile im Grid) bzw. ausführliche Leistungsbeschreibung (formatierter Text, wird getrennt im Texteditor bearbeitet, siehe [Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) Abschnitt 5). |
| **Preisspiegel** | Tabellarischer Vergleich aller Angebote: Zeilen = LV-Positionen, Spaltengruppen = Bieter (je EP, GP, Abweichung). Siehe [Vergabeprozess](/okf/research/process/tendering-and-award.md). |
| **Aufmaß** | Mengenermittlung der tatsächlich ausgeführten Leistung, Zeile für Zeile mit Rechenansätzen (z. B. Länge × Breite × Anzahl), Grundlage der Rechnungsprüfung. Siehe [Abrechnung](/okf/research/process/billing-and-cost-control.md). |
| **Vergabeakte** | Dokumentation des Vergabeverfahrens; Angebote und LV-Stände müssen nachweisbar unverändert bleiben (siehe [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md)). |
| **Grid (Datenraster)** | Programmbaustein, der Daten als bearbeitbare Tabelle im Browser anzeigt – das „Excel im Programm“. |
| **Tree-Grid (Baumtabelle)** | Grid, dessen Zeilen eine Hierarchie bilden und sich auf- und zuklappen lassen (für LV-Gliederung nötig). |
| **Virtualisierung** | Das Grid zeichnet nur die gerade sichtbaren Zeilen. Ohne Virtualisierung wird ein LV mit 20.000 Zeilen im Browser unbenutzbar langsam. |
| **DOM- vs. Canvas-Rendering** | DOM: jede sichtbare Zelle ist ein HTML-Element (durchsuchbar, druckbar, für Screenreader lesbar). Canvas: das Grid malt Pixel auf eine Zeichenfläche (sehr schnell, aber für Browser-Suche, Screenreader und Testwerkzeuge zunächst „unsichtbar“). |
| **Bereichsauswahl (Range Selection)** | Markieren eines Zellblocks mit Maus oder Umschalt+Pfeil, wie in Excel. Voraussetzung für Kopieren/Einfügen ganzer Blöcke. |
| **Ausfüllkästchen (Fill Handle)** | Das kleine Quadrat an der Markierung, mit dem man Werte nach unten „zieht“. |
| **Fixierte Spalten (frozen/pinned)** | Spalten (z. B. OZ, Kurztext), die beim seitlichen Scrollen stehen bleiben – im Preisspiegel mit 30 Bietern unverzichtbar. |
| **Mehrzeilige Kopfzeilen (Column Groups)** | Überschrift „Bieter A“ über den Unterspalten EP / GP / Abweichung. |
| **TSV** | Tab-separated values: Text, in dem Zellen durch Tabulatoren und Zeilen durch Zeilenumbrüche getrennt sind. So legt Excel kopierte Zellen als Klartext in die Zwischenablage. |
| **Open Core** | Geschäftsmodell: Grundversion frei (z. B. MIT), wichtige Zusatzfunktionen nur gegen Lizenzgebühr („Pro“, „Enterprise“). |
| **Pessimistisches Sperren** | Wer ein Objekt öffnet, sperrt es für alle anderen (so arbeitet NOVA beim LV). |
| **Optimistische Nebenläufigkeit** | Jeder darf bearbeiten. Beim Speichern prüft der Server per Versionsnummer (ETag), ob jemand anderes zwischenzeitlich geändert hat, und weist sonst zurück. |
| **OT (Operational Transformation)** | Verfahren für Echtzeit-Mitbearbeitung: Ein zentraler Server ordnet gleichzeitige Änderungen und passt sie aneinander an (Google-Docs-Prinzip). |
| **CRDT** | Conflict-free Replicated Data Type: Datenstruktur, die sich ohne zentralen Server automatisch zusammenführen lässt; Grundlage vieler Offline-first-Programme. |
| **Sync-Engine** | Fertige Schicht, die eine Server-Datenbank (meist PostgreSQL) teilweise in den Browser spiegelt und Änderungen in beide Richtungen überträgt. |
| **PWA** | Progressive Web App: Webanwendung, die sich installieren lässt und mit lokalem Speicher auch offline funktioniert. |
| **IndexedDB / OPFS** | Speicher im Browser: IndexedDB ist eine Objektdatenbank, das Origin Private File System (OPFS) ein privates Dateisystem je Website, auf dem z. B. SQLite laufen kann [22]. |
| **Notarisierung / Code-Signing** | Digitale Signatur von Desktop-Programmen. Ohne sie warnen macOS (Gatekeeper) und Windows (SmartScreen) beim Start oder blockieren ihn. |
| **OIDC / SSO** | OpenID Connect: Standard für zentrale Anmeldung (Single Sign-on), z. B. über Keycloak oder das Microsoft-Konto des Büros. |

## 1. Was die drei Tabellen leisten müssen

| Merkmal | LV-Editor | Preisspiegel | Aufmaß |
|---|---|---|---|
| Typische Größe | 200–5.000 Zeilen, große Projekte bis ca. 20.000 (Einschätzung) | Zeilen wie LV, dazu 10–30 Bieter × 3–5 Spalten = 30–150 Wertspalten | je Abrechnung Dutzende bis Tausende Ansatzzeilen |
| Struktur | Baum (Los → Titel → Untertitel → Position), OZ abgeleitet aus der Lage im Baum | Baum wie LV, nur lesend; Summenzeilen je Titel | Liste je Position, Formelzeilen nach REB 23.003 |
| Bearbeitung | Kurztext, Menge, Einheit, Positionsart, Kostengruppe; Langtext im eigenen Editor | Nachlässe, Notizen, Markierungen; Preise nur bei manueller Angebotserfassung | Rechenansatz, Formel, Faktoren, Bemerkung |
| Besonders wichtig | Verschieben im Baum, Neunummerierung, Einfügen aus Excel, Rückgängig | fixierte Spalten, Spaltengruppen je Bieter, bedingte Farben (günstigster/teuerster, Ausreißer), schnelles horizontales Scrollen | Formeln mit Dezimalgenauigkeit, Kopieren aus Excel-Aufmaßen, Prüfvermerke |
| NOVA-Bezug | LV wird bei Bearbeitung gesperrt; kein Excel-Copy-&-Paste ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)) | Spaltensets, Ausreißer, Varianten, Excel-Export mit Formeln ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)) | höchstens 15 Erfassungsblätter gleichzeitig; prozentuale Eingabe nicht umkehrbar ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)) |

## 2. Grid-Komponenten im Vergleich

### 2.1 Lizenz, Version und Pflege

Spalte „Releases 12 M.“ = veröffentlichte npm-Versionen vom 10.11.2025 bis 09.11.2026 (in Klammern: davon stabile) [19].
Sterne und Mitwirkende laut GitHub-API am 09.11.2026 [20].

| Komponente | Lizenz (SPDX) und Bezahlgrenze | Version, Datum | Releases 12 M. | Sterne / Mitwirkende | Rendering |
|---|---|---|---|---|---|
| AG Grid Community / Enterprise | `ag-grid-community` **MIT**; `ag-grid-enterprise` **kommerziell** (Paketangabe „Commercial“) [4][19] | 36.3.0, 04.11.2026 [19] | 13 (13) | 15.675 / ca. 209 | DOM, virtualisiert |
| MUI X Data Grid / Pro / Premium | `@mui/x-data-grid` **MIT**; Pro und Premium kommerziell („SEE LICENSE IN LICENSE“) [5][19] | 9.17.0, 30.10.2026 [19] | 59 (52) | 5.875 / ca. 560 (ganzes MUI-X-Repo) | DOM, virtualisiert (MIT nur bis 100 Zeilen, s. u.) |
| Handsontable | **proprietär**: kostenlos nur zur Evaluierung oder für genehmigte nichtkommerzielle Projekte; Konkurrenzprodukte verboten [8] | 18.1.2, 07.10.2026 [19] | 8 stabile | 22.081 / ca. 168 | DOM, virtualisiert |
| HyperFormula (Formel-Engine von Handsontable) | **GPL-3.0-only** oder kommerziell [10] | 3.5.0 [10] | – | 2.830 | – |
| Glide Data Grid | **MIT** [11] | 6.0.3, 03.02.2024; danach nur Alphas (6.0.4-alpha24) [19] | 0 | 5.432 / ca. 56 | **Canvas** |
| RevoGrid | Kern **MIT**; „RevoGrid Pro“ kommerziell [12] | 4.31.4, 04.11.2026 [19] | 77 (77) | 3.464 / ca. 35; ein npm-Maintainer | DOM, virtualisiert |
| Tabulator | **MIT** [13] | 6.7.1, 22.10.2026 [19] | 9 (9) | 7.804 / ca. 142 | DOM, virtualisiert |
| TanStack Table + Virtual | **MIT** [14] | table-core 9.3.1, 12.10.2026; virtual-core 3.19.11, 03.11.2026 [19] | 101 (11) bzw. 40 (40) | 28.557 / ca. 503 bzw. 7.193 / ca. 172 | „headless“: liefert nur Logik, Darstellung baut man selbst |
| SlickGrid-Universal | **MIT** [15] | 10.11.3, 07.10.2026; 11.0.0-beta.0 [19] | 27 (25) | 179 / ca. 32; ein npm-Maintainer | DOM, virtualisiert |
| Jspreadsheet CE / Pro | CE **MIT** laut README (npm-Paket ohne Lizenzfeld); Pro kommerziell [16][19] | CE 5.0.4, 25.08.2025; Pro 13.1.0, 02.11.2026 [19] | CE 0; Pro 72 | 7.241 / ca. 89 | DOM |
| Univer | Web-SDK **Apache-2.0**; Server-SDK (Echtzeit-Mitarbeit, Historie, XLSX-Import/-Export) kommerziell [17] | 1.4.0, 07.11.2026 [19] | 198 (40) | 22.940 / ca. 84 | **Canvas** |
| Fortune-sheet | **MIT** [18] | 1.0.4, 06.11.2025 [19] | 0 | 3.752 / ca. 30 | Canvas |
| x-spreadsheet | **MIT** [18] | 1.1.9, 20.05.2021 [19] | 0 | 14.572 / ca. 36; letzter Push 08/2024 | Canvas |
| react-data-grid (Comcast) | **MIT** [27] | 7.0.0-beta.64, 05.11.2026 (v7 seit Jahren Beta) [19] | 6 (0) | 7.693 / ca. 150 | DOM, virtualisiert |

### 2.2 Funktionen für AVA-Tabellen

Legende: ✔ frei enthalten · € nur in der kostenpflichtigen Stufe · ✖ nicht vorhanden · (S) selbst bauen · ? nicht verifiziert.

| Funktion | AG Grid Comm. | MUI X (MIT) | Handsontable | Glide | RevoGrid Kern | Tabulator | TanStack | SlickGrid-U. | Jspreadsheet CE | Univer (OSS) |
|---|---|---|---|---|---|---|---|---|---|---|
| Baumdaten (Tree) | € [2] | € Pro [7] | ✔ (Plugin `nestedRows`) [8] | ✖ (S) | € Pro [12] | ✔ | ✔ Logik (Sub-Rows), UI (S) | ✔ (`treeDataOptions`) [15] | ? | ✖ (Tabellenblatt) |
| Zeilen über 100 virtualisiert | ✔ | € Pro [7] | ✔ | ✔ | ✔ | ✔ | ✔ mit Virtual | ✔ | ✔ | ✔ |
| Bereichsauswahl | € [2] | € Premium [7] | ✔ | ✔ | ✔ | ✔ | (S) | ✔ | ✔ | ✔ |
| Kopieren als TSV | € [1][2] | ✔ [7] | ✔ [9] | ✔ | ✔ [12] | ✔ [13] | (S) | ✔ [15] | ✔ [16] | ✔ |
| Einfügen aus Excel | € [1][2] | € Premium [7] | ✔ [9] | ✔ | ✔ [12] | ✔, aber naiver Parser (s. 3.4) [13] | (S) | ✔ [15] | ✔ [16] | ✔ |
| Ausfüllkästchen | € (Teil der Bereichsauswahl, Einschätzung) | € Premium [7] | ✔ | ✔ | ✔ | ? | (S) | ? | ✔ | ✔ |
| Rückgängig/Wiederholen | ✔ [2] | € Premium [7] | ✔ [8] | (S) | € Pro [12] | ✔ [13] | (S) | ? | ✔ [16] | ✔ [17] |
| Excel-Export (.xlsx) | € [1][2] | € Premium [7] | ✔ | ✖ | € Pro [12] | ✔, braucht aber eine SheetJS-kompatible Zusatzbibliothek [13] | (S) | ✔ [15] | experimentell [16] | € (Server-SDK) [17] |
| Fixierte Spalten | ✔ (Doku-Seite ohne Enterprise-Kennzeichnung; nur das Spaltenmenü ist Enterprise) [56] | € Pro [7] | ✔ [8] | ✔ [11] | ✔ [12] | ✔ | ✔ Logik | ✔ | ✔ | ✔ [17] |
| Spaltengruppen | ? | ✔ [7] | ✔ | ✔ | ✔ (Pro: Sync beim Verschieben) [12] | ✔ | ✔ | ✔ | ✔ | – |
| Barrierefreiheit | ? | ARIA-Grid nach WAI-ARIA [7] | Ziel WCAG 2.2 AA [8] | vorhanden, laut README aber ohne Tests durch Betroffene [11] | WAI-ARIA laut README [12] | ? | (S) | ? | ? | Canvas: eingeschränkt (Einschätzung) |
| Frameworks | JS, React, Angular, Vue [4] | nur React | JS, React, Angular, Vue [8] | nur React | Web Component, React, Vue, Angular, Svelte | JS (Wrapper extern) | React, Vue, Solid, Svelte, Angular, Lit | JS, Angular, Aurelia, React, Vue [15] | JS, React, Vue | JS, React, Vue |

Ein Teil der ✔-Angaben für Tabulator, Glide, SlickGrid-Universal, Jspreadsheet und Univer sowie die Framework-Zeile
für RevoGrid, TanStack, Jspreadsheet und Univer beruhen auf Funktionslisten der Hersteller und wurden nicht einzeln
in der Doku nachgeprüft. Vor einer Entscheidung ist ein
Prototyp mit echten LV-Daten nötig.

### 2.3 Bewertung je Kandidat (Einschätzung)

| Komponente | Urteil | Begründung |
|---|---|---|
| **AG Grid Community** | ✖ für den Kern | Gut gepflegt, aber gerade die AVA-Kernfunktionen (Baum, Bereich, Zwischenablage, Excel) liegen im Enterprise-Paket [2]. Das Enterprise-Paket ist mit einem Open-Source-Projekt praktisch unvereinbar: Lizenzen gelten pro Entwickler, alle Frontend-Entwickler eines Projekts brauchen eine [3], ohne Schlüssel erscheinen Wasserzeichen [1]. |
| **MUI X (MIT)** | ✖ | Ohne Pro nur 100 virtualisierte Zeilen, kein Baum, keine fixierten Spalten [7]. |
| **Handsontable** | ✖ | proprietär; die kostenlose Lizenz deckt nur Evaluierung oder genehmigte nichtkommerzielle Projekte ab und verbietet Software, die mit Handsontable konkurriert [8]. |
| **Glide Data Grid** | ◐ nur für Spezialansichten | Canvas, sehr schnell, MIT; aber kein Baum und seit 02/2024 keine stabile Version [11][19]. |
| **RevoGrid (Kern)** | ◐ | MIT-Kern mit Zwischenablage, Bereich und ARIA; Baum, Undo und Excel nur in Pro [12]. Ein einziger npm-Maintainer [19]. |
| **Tabulator** | ✔ Kandidat (schnellster Weg) | MIT, Baum, Zwischenablage, Bereichsauswahl und Undo eingebaut [13]. Schwächen: einfacher Einfüge-Parser (s. 3.4), XLSX-Export nur mit Zusatzbibliothek [13]. Das Repository liegt in der GitHub-Organisation `tabulator-tables`, die am 16.05.2026 angelegt wurde, und die Website nennt „Beekeeper Studio Inc“ als Rechteinhaber [13][20]; was das für die Pflege bedeutet, ist offen. |
| **SlickGrid-Universal** | ✔ Kandidat | MIT, Baum, Excel-Kopierpuffer und Excel-Export, Wrapper für Angular, Aurelia, React und Vue [15]; laut README auch mit einer Million Zeilen flüssig [15] (Herstellerangabe). Risiko: im Kern ein Maintainer, 179 Sterne [19][20]. |
| **TanStack Table + Virtual** | ✔ Kandidat (meiste Kontrolle) | MIT, sehr verbreitet, v9 stabil [19][20]. Liefert Sortierung, Gruppierung, Unterzeilen und Fixierung als Logik. Darstellung, Bearbeitung, Bereichsauswahl und Zwischenablage baut man selbst; dafür ist alles auf GAEB-Logik zuschneidbar. |
| **Jspreadsheet CE** | ✖ | MIT laut README, aber keine npm-Version seit 08/2025 und kein Lizenzfeld im npm-Paket [16][19]; Weiterentwicklung findet in der kommerziellen Pro-Version statt. |
| **Univer** | ◐ für Excel-artige Nebenwerkzeuge | Apache-2.0-Kern mit Formel-Engine und Canvas-Rendering; Echtzeit, Historie und XLSX-Import/-Export aber kommerziell [17]. Ein Tabellenblatt-Modell passt nicht zum LV-Baum. |
| **Fortune-sheet, x-spreadsheet** | ✖ | geringe bzw. keine Aktivität mehr (letzte Version 11/2025 bzw. 05/2021) [19]. |

## 3. Excel-Interop über die Zwischenablage

NOVA dokumentiert, dass kopierte Excel-Bereiche nicht in Tabellen eingefügt werden können (sie landen in einer
Zelle); als Ersatz dient der Datei-Import ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)). Excel ist
in kleinen Büros aber das Hauptwerkzeug neben der AVA ([Schmerzpunkte](/okf/research/market/pain-points.md)
Abschnitt 4). Die Zwischenablage ist deshalb kein Komfortdetail, sondern eine Umstiegsbrücke.

### 3.1 Was Excel in die Zwischenablage legt

| Aspekt | Befund |
|---|---|
| Formate, die der Browser sieht | Browser stellen üblicherweise `text/plain`, `text/html` und `image/png` bereit [21]. Grid-Hersteller schreiben beim Kopieren `text/plain` und `text/html` und lesen beim Einfügen zuerst `text/html`, dann `text/plain` [9]. Excels interne Formate sind für Webseiten nicht zugänglich (Einschätzung). |
| Aufbau des Klartexts | Zellen durch Tabulator, Zeilen durch Zeilenumbruch getrennt (TSV); so beschreibt es auch MUI für den eigenen Kopiervorgang [7]. |
| Mehrzeilige Zellen | Enthält eine Zelle harte Zeilenumbrüche, setzt Excel ihren Inhalt beim Kopieren in doppelte Anführungszeichen, damit die Umbrüche außerhalb von Excel erhalten bleiben (Antwort im Microsoft-Q&A-Forum, 10.09.2023) [44]. Dieselbe Konvention nutzen andere Tabellenwerkzeuge für ihr TSV [43]. Ein Parser muss diese Quotierung wie bei CSV (RFC 4180) auflösen; ob Excel auch Zellen mit Tabulatoren oder Anführungszeichen so behandelt, ist mit echten Zwischenablagen zu testen. |
| Angezeigter statt gespeicherter Wert | Der Klartext enthält den **angezeigten** Text, also mit Tausenderpunkten, Währungszeichen und auf die angezeigten Stellen gerundet. GraphPad fügt deshalb standardmäßig die angezeigten Werte ein. Eine zweite, genauere Zahl stand nur im HTML-Teil einiger älterer Excel-Versionen; ab Excel für Windows 2007 nicht mehr [45]. |
| Formeln | Beim Kopieren aus Excel kommt das Ergebnis an, nicht die Formel (Einschätzung, deckt sich damit, dass Grids kopierte Daten als reinen Text behandeln [9]). |

### 3.2 Browser-Schnittstellen

| Weg | Wann | Einschränkungen |
|---|---|---|
| `copy`/`cut`/`paste`-Ereignis mit `clipboardData` | Nutzer drückt Strg+C/Strg+V (bzw. ⌘), während das Grid den Fokus hat | robustester Weg in allen Browsern; keine Berechtigungsabfrage, weil der Nutzer selbst auslöst (Einschätzung). Das Grid muss den Tastaturfokus haben; Handsontable empfiehlt deshalb vorher `isListening()` zu prüfen [9] |
| Async Clipboard API `navigator.clipboard.read()`/`write()` | eigene Schaltflächen und Kontextmenüs („Einfügen“) | nur über HTTPS; Chromium verlangt die Berechtigungen `clipboard-read`/`clipboard-write` und bereinigt HTML beim Lesen, außer mit `unsanitized: ["text/html"]`; seit 2024 in allen großen Browsern verfügbar („Baseline 2024“) [21]. Handsontable bietet „Einfügen“ im Kontextmenü deshalb nicht an [9]. Firefox und Safari kennen diese Berechtigungen nicht (auch nicht geplant); sie zeigen bei einem Lesezugriff nach Nutzerklick ein kurzes Menü mit einer einzigen Option „Einfügen“, die erst nach einer Sekunde anklickbar wird. Bei Inhalten derselben Herkunft (z. B. aus unserer eigenen App kopiert) entfällt dieses Menü [54] |
| Eigene Formate (`web `-Präfix) | Kopieren zwischen zwei Fenstern unserer Anwendung, z. B. Positionen samt IDs, Langtext und Preisen | nur, wo `ClipboardItem.supports()` sie meldet [21]; immer zusätzlich `text/plain` und `text/html` schreiben |

### 3.3 Deutsche Zahlen-, Datums- und Textformate

| Eingabe aus der Zwischenablage | Richtige Deutung | Falle |
|---|---|---|
| `1.234,56` / `1234,56` | 1234,56 | „1.234“ kann im deutschen Excel 1234 und im englischen 1,234 bedeuten → Gebietsschema des Nutzers zugrunde legen und Vorschau zeigen |
| `1.234,56 €`, `EUR 1.234,56` | 1234,56 | Währungszeichen, geschützte Leerzeichen und Minuszeichen-Varianten (−, -) entfernen |
| `12,5 %` | 0,125 bzw. 12,5 je nach Feld | Prozentfeld (Nachlass) oder Zahl? Feldtyp entscheidet |
| `09.11.2026` | Datum | Excel liefert das angezeigte Datumsformat; im englischen Excel `11/9/2026` |
| `01.02.0030` (OZ) | Text | darf weder als Datum noch als Zahl gelesen werden; führende Nullen erhalten |
| `m²`, `m2`, `qm`, `Stk`, `psch` | Einheiten | auf die zulässigen GAEB-Einheiten abbilden ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)) |
| leer, `0`, `-`, `entfällt`, `n. a.` | „kein Preis“, 0,00 oder „nicht angeboten“ | im Preisspiegel fachlich verschieden ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)) |
| gerundeter Anzeigewert, z. B. `12,35` statt 12,3456 | wie angezeigt | Genauigkeitsverlust (s. 3.1); bei EP mit drei Nachkommastellen warnen |

### 3.4 Einfügen in hierarchische Strukturen

1. **Werte in bestehende Zeilen:** Der eingefügte Block überschreibt ab der markierten Zelle; nur bearbeitbare
   Zellen werden geändert, gesperrte (z. B. OZ, Summen, Titelzeilen) übersprungen. So arbeiten auch MUI (nur
   `editable`-Spalten, Ziel abhängig von der Markierung) [7] und Handsontable (`skipRowOnPaste`, `skipColumnOnPaste`) [9].
2. **Neue Positionen aus Excel:** Zeilen werden unter der markierten Zeile eingefügt. Die Hierarchie ergibt sich aus
   einer OZ-Spalte, aus einer „Typ“-Spalte oder aus der Einrückung; NOVA erkennt beim Datei-Import seit Oktober 2025
   Titel und Positionen aus einer Spalte „Typ“ ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)).
3. **Spaltenzuordnung:** Tabulators Standard-Parser prüft, ob die erste eingefügte Zeile Spaltentitel enthält, und
   ordnet die Spalten dann nach Titel zu, sonst nach Position [13]. Dieselbe Quelldatei teilt den Text aber einfach an
   Zeilenumbrüchen und Tabulatoren auf, ohne Anführungszeichen auszuwerten [13] – mehrzeilige Excel-Zellen zerfallen
   damit in mehrere Zeilen (Einschätzung aus dem Quelltext, nicht getestet). Ein eigener Parser ist ohnehin nötig.
4. **Vorschau und ein Rückgängig-Schritt:** Größere Einfügungen erst als Vorschau mit Fehlerliste zeigen (nicht
   lesbare Zahlen, unbekannte Einheiten, Hierarchiekonflikte) und dann als **eine** rückgängig machbare Aktion
   übernehmen. RevoGrid Pro hat dafür eine eigene Vorschau-Funktion [12].

### 3.5 Kopieren nach Excel

- **Beide Formate schreiben:** `text/plain` als TSV mit korrekter Quotierung und `text/html` als Tabelle.
- **Zahlen:** Für deutsches Excel im deutschen Format oder im HTML-Teil mit Zahlenformat-Angabe. Excel versteht in
  HTML-Tabellen die CSS-Eigenschaft `mso-number-format` (belegt für HTML-Dateien, die als Tabelle geöffnet werden) [46];
  ob das beim Einfügen aus der Zwischenablage genauso greift, muss mit deutschem und englischem Excel getestet werden.
- **Werte statt Formeln als Standard.** Optional „mit Formeln“ (z. B. GP = Menge × EP als Excel-Formel), so wie
  NOVAs Excel-Export Formeln behält ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)).
- **Formel-Injektion verhindern:** Beginnt ein Zelltext mit `=`, `+`, `-`, `@`, Tabulator oder Zeilenumbruch (auch
  in vollbreiter Schreibweise), können Excel oder LibreOffice ihn als Formel auswerten; OWASP empfiehlt Quotierung
  und ein vorangestelltes Hochkomma und warnt, dass keine Methode in jedem Programm sicher ist [47]. Texte aus
  fremden Quellen (Bieterangaben, GAEB-Importe) beim Export deshalb entschärfen; MUI bietet für den CSV-Export eine
  Option „Escape formulas“ [7].

### 3.6 Abgeleitete Anforderungen

| ID | Anforderung |
|---|---|
| X1 | Strg+C/Strg+V (⌘ auf dem Mac) für Zellbereiche in allen drei Tabellen; Lesen von `text/html` mit Fallback `text/plain` |
| X2 | TSV-Parser mit Quotierung nach RFC-4180-Art (mehrzeilige Zellen, doppelte Anführungszeichen) |
| X3 | Zahlenparser für deutsches und englisches Format, Währungs- und Prozentzeichen; Werte sofort als Dezimalzahl (nie als Gleitkommazahl) übernehmen |
| X4 | OZ, Einheiten, Kurztexte immer als Text behandeln; Einheiten auf GAEB-Einheiten abbilden |
| X5 | Einfügen in Baum: Überschreiben vorhandener Zeilen oder Anlegen neuer Positionen mit Hierarchie aus OZ- oder Typ-Spalte |
| X6 | Vorschau mit Fehlerliste ab einer Schwelle (z. B. > 20 Zellen), danach ein einziger Rückgängig-Schritt |
| X7 | Serverseitige Prüfung jeder eingefügten Zeile wie bei manueller Eingabe (Phase, Rechte, Plausibilität) |
| X8 | Kopieren nach Excel: TSV + HTML, Zahlen im Gebietsschema, wahlweise Formeln; Formel-Injektion entschärfen |
| X9 | Tests mit echten Excel-Zwischenablagen (Excel Windows und Mac, LibreOffice, Google Sheets) als Fixtures in der CI |

## 4. Performance bei 10.000–100.000 Zeilen

### 4.1 Größenordnungen

| Tabelle | Rechnung (Einschätzung) | Folgerung |
|---|---|---|
| LV-Editor | 20.000 Zeilen × 12 Spalten = 240.000 Zellen | Zeilen-Virtualisierung genügt |
| Preisspiegel | 20.000 Zeilen × (5 feste + 30 Bieter × 4) Spalten ≈ 2,5 Mio. Zellen | zusätzlich **Spalten-Virtualisierung**, Summen und Farben vorberechnen (Server oder Web Worker) |
| Aufmaß | einige Tausend Zeilen je Abrechnung | unkritisch, Formelauswertung inkrementell |

- **Scrollhöhe:** Browser begrenzen die Höhe eines Scroll-Containers auf rund 17,5 Mio. Pixel (Firefox) bzw.
  33,5 Mio. Pixel (Chrome, Edge, Safari) [7]. Bei 32 Pixel Zeilenhöhe sind das rund 547.000 bzw. 1 Mio. Zeilen
  (eigene Rechnung) – für LVs kein Problem.
- **Speicher im Datenmodell:** Ein Dezimalobjekt (z. B. decimal.js) pro Zelle kostet ein Vielfaches einer Zahl.
  Einschätzung: Im Grid Zeichenketten oder skalierte Ganzzahlen halten und dezimalgenau nur dort rechnen, wo
  gerechnet wird (Server, Worker); siehe [Bausteine](/okf/research/open-source/building-blocks-and-licensing.md)
  Abschnitt 6.

### 4.2 Was es an Messungen gibt

| Quelle | Aussage | Belastbarkeit |
|---|---|---|
| RevoGrid-Hersteller, 19.11.2024: 1.000 bis 400.000 Zeilen × 100 Spalten, Playwright, Versionen nicht genannt [57] | JS-Heap bei 100.000 Zeilen: RevoGrid 214,58 MB, AG Grid und Handsontable je 1.297,00 MB; Scrollen bei 100.000 und 200.000 Zeilen bei allen rund 60 FPS; AG Grid brach bei 400.000 Zeilen ab, Handsontable über 300.000 [57] | **gering**: Herstellervergleich, Versionen fehlen, und zwei Produkte haben auf die Nachkommastelle denselben Speicherwert – das deutet auf einen Messfehler hin |
| Hersteller-README | Glide: „Millionen“ Zeilen, Zellen werden erst bei Bedarf gezeichnet [11]; RevoGrid: über 1 Mio. Zeilen ohne feste Grenze [12]; SlickGrid-Universal: flüssig mit einer Million Zeilen [15] | Werbeaussagen, nicht nachgemessen |
| Unabhängige Vergleiche | keiner gefunden, der Baumdaten mit 10.000–100.000 Zeilen in aktuellen Versionen vergleicht | Lücke → eigener Prototyp-Benchmark |

**Empfehlung (Einschätzung):** Vor der Grid-Entscheidung einen zweitägigen Benchmark mit synthetischem LV
(20.000 Zeilen, 5 Ebenen) und Preisspiegel (30 Bieter) in Chrome, Firefox und Safari bauen. Messen: Zeit bis zur ersten
Zelle, Speicher nach 60 s Scrollen, Bildrate beim Scrollen quer durch die Bieter, Dauer von Aufklappen,
Verschieben und Einfügen von 500 Zeilen.

### 4.3 Folgen von Canvas-Rendering

| Thema | DOM-Grid (virtualisiert) | Canvas-Grid |
|---|---|---|
| Barrierefreiheit | ARIA-Rollen `grid`/`row`/`gridcell` direkt am Element; MUI und RevoGrid folgen WAI-ARIA [7][12], Handsontable zielt auf WCAG 2.2 AA [8] | Screenreader sehen nur, was zusätzlich als unsichtbares DOM bereitgestellt wird; Glide nennt mögliche Lücken selbst [11] |
| Browsersuche (Strg+F) | findet nur die gerade gezeichneten Zeilen | findet nichts → in beiden Fällen ist eine eigene Suche nötig (Einschätzung) |
| Druck | Bildschirm-Grid ist ohnehin nicht druckfähig | ebenso → Druck immer serverseitig als PDF ([Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) Abschnitt 3) |
| Automatisierte Tests (Playwright) | Zellen über Text und Rolle ansprechbar | Zellen nicht als Elemente vorhanden; Tests brauchen eine Test-Schnittstelle oder Bildvergleiche (Einschätzung) |
| Leistung | gut, solange nur sichtbare Zeilen und Spalten gezeichnet werden (Einschätzung) | laut Hersteller auch bei Millionen Zeilen [11] |
| Gestaltung von Zellen | normales HTML/CSS (Eingabefelder, Symbole, Tooltips) | alles selbst zeichnen; Teable und NocoDB haben dafür eigene Render-Schichten gebaut [52] |

## 5. Mehrbenutzerbetrieb: Nebenläufigkeitsmodelle

### 5.1 Was die AVA vom Mehrbenutzermodell verlangt

1. **Exakte Dezimalwerte:** Mengen, EP und GP sind Dezimalzahlen mit fester Stellenzahl (siehe
   [Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) Abschnitt 6). Ein Synchronisationsverfahren
   darf sie nicht als Gleitkommazahl transportieren oder „zusammenrechnen“.
2. **Unveränderliche Stände und Prüfpfad:** Das LV zum Versandzeitpunkt, jedes eingegangene Angebot (auch je
   Verhandlungsrunde) und jede freigegebene Prüfrechnung müssen eingefroren und nachweisbar sein (Vergabeakte,
   Aufbewahrung, siehe [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md)).
3. **Konfliktsemantik für Zahlenfelder:** Ändern zwei Personen dieselbe Menge, darf nicht still „der Letzte gewinnt“
   gelten, ohne dass es jemand merkt. Bei Preisen ist ein automatisches Zusammenführen fachlich sinnlos.
4. **Baumoperationen:** Verschieben von Positionen und Titeln, Neunummerierung der OZ. Gleichzeitige Verschiebungen
   können Zyklen oder doppelte OZ erzeugen.
5. **Serverseitige Prüfung:** Phasenregeln (nach Versand kein Ändern des LV, nach Submission kein Ändern der Angebote),
   Rechte, Plausibilitäten. Der Server muss Änderungen ablehnen können.

### 5.2 Die Modelle im Vergleich

| Modell | Bausteine (Lizenz, Version) | Wie Konflikte entstehen und gelöst werden | Eignung für AVA (Einschätzung) |
|---|---|---|---|
| **Pessimistisches Sperren** ganzer Objekte | eigene Sperrtabelle; NOVA sperrt das LV bei Bearbeitung, Admins heben Sperren auf ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)) | Konflikte unmöglich, dafür Wartezeiten und „vergessene“ Sperren; NOVA hat eigens ein Hilfevideo „Warum kann ich mein LV nicht bearbeiten?“ ([NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)) | einfach, aber genau der beklagte Engpass. Nur für **Phasenwechsel** sinnvoll (z. B. LV nach Versand schreibgeschützt), nicht für die tägliche Bearbeitung |
| **Feingranulare Sperre / Bearbeitungshinweis** je Position oder Aufmaßblatt | eigene Lease-Tabelle mit Ablaufzeit plus Präsenzanzeige („Anna bearbeitet 01.02.0030“) | Sperre nur für die Zeile, läuft nach z. B. 2 Minuten Inaktivität ab | gute Ergänzung zu optimistischer Nebenläufigkeit |
| **Optimistische Nebenläufigkeit** (Versionsnummer, ETag/`If-Match`) | Standard-HTTP und Datenbank-Spalte `version`; keine Bibliothek nötig | Speichern mit veralteter Version wird abgelehnt (HTTP 412), die Oberfläche zeigt „geändert von …, übernehmen oder verwerfen?“. NOVAs API hat **keine** ETags oder Versionsfelder ([NOVA-API](/okf/research/nova-ava/api-and-data-model.md)) | **passt sehr gut**: exakte Werte, Server prüft jede Änderung, Konflikte werden sichtbar statt still gelöst. Bei 1–10 Personen selten |
| **Server-autoritative OT** | ShareDB **MIT**, 7.0.1 vom 09.11.2026 [19][31] | Server ordnet alle Operationen; Middleware-Haken `submit`, `apply` und `commit` können eine Operation mit Fehler ablehnen [31]. Alle Operationen werden gespeichert; jeder frühere Stand lässt sich per Version oder Zeitstempel abrufen, Altstände sind nur lesbar; Milestone-Snapshots beschleunigen das [31] | technisch passend (Server prüft, lückenlose Historie), aber JSON-Dokument-Modell statt relationaler Tabellen; für Echtzeit-Mitarbeit an **einem** LV. Wird von Teable eingesetzt (Abschnitt 7) |
| **CRDT** | Yjs **MIT** 13.6.33 (v14 in Beta); Automerge **MIT** 3.5.0; Loro **MIT** 1.17.1 [19][28][29][30] | Jede Kopie ändert lokal, Zusammenführung ohne Server. Bei Map-Schlüsseln gewinnt ein Eintrag nach fester Regel; Yjs nimmt den zuletzt eingefügten Eintrag je Schlüssel [28]. Loro hat einen **verschiebbaren Baum** nach dem Verfahren von Kleppmann et al. mit Fractional Index für die Geschwisterreihenfolge [30]; für Yjs listet das README dafür eine Zusatzbibliothek auf Basis von `Y.Map` [28]. Zyklen aus gleichzeitigen Verschiebungen sind ein bekanntes Problem; Figma lässt den Server solche Verschiebungen ablehnen [30] | stark für Offline und Texte, aber: Zahlenkonflikte werden still entschieden, Server-Validierung ist nachträglich (Ablehnen heißt Gegenoperation), Historie wächst. **Für Kern-Preisdaten nicht empfohlen**, eher für Langtexte (z. B. Yjs mit ProseMirror) |
| **Sync-Engines** | ElectricSQL **Apache-2.0** (nur Lesepfad, Schreiben über eigene API) [32]; PowerSync-Service **Apache-2.0** laut LICENSE-Datei [33]; Zero **Apache-2.0** [19][34]; Replicache 15.3.0 (npm-Lizenzfeld verweist auf Nutzungsbedingungen, im Monorepo Apache-2.0) [19][34]; Triplit **AGPL-3.0-only**, letzte npm-Version 07/2025 [19][35] | Teilmengen der Postgres-Daten liegen lokal im Client. ElectricSQL synchronisiert nur in Leserichtung; geschrieben wird über die eigene API, die damit auch prüft [32]. Den Schreibweg von PowerSync und Zero hat diese Recherche nicht im Detail geprüft. Beiträge zu ElectricSQL setzen einen CLA voraus [32] | interessant für **Offline-Aufmaß** in einer späteren Phase; zusätzlicher Betriebsbaustein und schnelle Versionsfolge (Zero: 778 npm-Versionen in 12 Monaten, davon 35 stabil) [19] |

### 5.3 Empfehlung (Einschätzung)

**Stufe 1 – server-autoritativ mit optimistischer Nebenläufigkeit (für den Start):**

1. **PostgreSQL ist die Wahrheit.** Positionen, Angebotspreise und Aufmaßzeilen sind Tabellenzeilen mit `version`
   (Ganzzahl) und `updated_by`/`updated_at`.
2. **Jede Änderung trägt die gelesene Version** (`If-Match` bzw. Feld im Befehl). Weicht sie ab, antwortet der Server
   mit einem Konflikt und liefert den aktuellen Stand. Die Oberfläche zeigt „Ihr Wert / aktueller Wert von Anna“ zur
   Auswahl. So arbeitet Frappe mit dem `modified`-Zeitstempel [53].
3. **Live-Push** (Server-Sent Events oder WebSocket) verteilt gespeicherte Änderungen an alle offenen Ansichten. Bei
   1–10 Personen verringert das Konflikte stark, weil jeder fast sofort den neuen Stand sieht.
4. **Bearbeitungshinweis statt LV-Sperre:** Die Zeile, die gerade jemand bearbeitet, wird markiert (Lease mit
   Ablaufzeit). Gesperrt wird nur, was fachlich gesperrt sein muss.
5. **Baumoperationen als Befehle:** „Verschiebe Knoten X unter Y nach Z“ wird in einer Transaktion geprüft (kein Zyklus,
   erlaubte Ebene, Phase); die OZ ist ein abgeleiteter Wert. „Neu nummerieren“ ist ein eigener, rückgängig machbarer
   Befehl, und ab dem Versand ist die OZ eingefroren. Das ist die Server-Strategie, die auch Figma für Baum-Zyklen
   nutzt [30].
6. **Unveränderliche Stände** an jedem Phasenwechsel (Versand, Submission, jede Verhandlungsrunde, Auftrag, freigegebene
   Rechnung): als eigene, schreibgeschützte Kopie mit Prüfsumme, dazu der exportierte GAEB-Stand. Das entspricht dem
   Muster „Speichern → Buchen → Stornieren“, dessen Übergänge Frappe prüft [53].
7. **Prüfpfad:** Jede Änderung landet als Ereignis (wer, wann, Feld, alt, neu, Befehl) in einer nur anhängbaren Tabelle.
   Rückgängig bedeutet eine neue, gegenläufige Änderung und keine Löschung.

**Stufe 2 – nur bei Bedarf:**

- **Gleichzeitiges Schreiben am selben Langtext:** Yjs mit ProseMirror (beide MIT) für den Texteditor [28]; der
  Server speichert das Ergebnis als normale Version.
- **Echtzeit-Zellbearbeitung wie in Google Sheets:** ShareDB als OT-Schicht vor PostgreSQL, wie bei Teable [31][52].
  Die Middleware prüft jede Operation serverseitig [31].
- **Offline-Aufmaß auf der Baustelle:** lokale Datenbank (SQLite-WASM oder Desktop-SQLite) mit Ausgangswarteschlange;
  beim Wiederverbinden laufen die Befehle durch dieselbe Serverprüfung wie online. Konflikte erscheinen als Liste.
  Sync-Engines (PowerSync, ElectricSQL, Zero) sind dafür Abkürzungen, die vorher in einem Prototyp geprüft werden müssen.

**Nicht empfohlen:** CRDT als Speicher für Mengen und Preise, eine Sync-Engine schon im ersten Schritt, LV-weite Sperren
für die normale Bearbeitung.

## 6. Offline und Desktop

### 6.1 Browser-App mit lokalem Speicher (PWA)

| Baustein | Stand | Was zu beachten ist |
|---|---|---|
| `@sqlite.org/sqlite-wasm` | 3.54.1-build1 vom 19.10.2026; Hülle Apache-2.0, SQLite selbst gemeinfrei [19][20] | offizielles SQLite für den Browser |
| VFS `opfs` | Worker-Pflicht; braucht `SharedArrayBuffer`, also die Header COOP `same-origin` und COEP `require-corp` oder `credentialless`; in Safari erst ab 17 [22] | mehrere Tabs: Sperrkonflikte, wenn die Anwendung `SQLITE_BUSY` nicht behandelt; laut Test im März 2026 hielten 8–10 Worker gleichzeitig durch [22] |
| VFS `opfs-sahpool` | seit SQLite 3.43, ohne COOP/COEP, auf allen großen Browsern seit März 2023; schnellste Variante [22] | grundsätzlich nur **eine** Verbindung je Datenbank; vor 3.54 ein Sperrfehler, der Daten beschädigen konnte [22] |
| VFS `opfs-wl` | seit 3.53.0, Sperren über Web Locks, braucht `Atomics.waitAsync()` [22] | neu; erst seit 2025 breit verfügbar [22] |
| Haltbarkeit | – | OPFS-Daten können durch Virenscanner, Aufräumprogramme, Rechteänderungen oder Browser-Bereinigung verschwinden; privates Surfen hat kleinere oder keine dauerhafte Ablage [22] |
| Safari (ab 17.0) | Kontingent je Website bis 60 % des Datenträgers im Browser; Löschung nach dem Prinzip „am längsten unbenutzt“ bei Platzmangel oder wenn eine Website eine Zeit lang nicht benutzt wurde (Tracking-Schutz) [55] | `navigator.storage.persist()` wird unterstützt, Safari entscheidet aber nach eigenen Regeln, z. B. ob die App auf dem Home-Bildschirm liegt; garantiert ist nichts [55] |

**Einschätzung:** Lokaler Browser-Speicher taugt als **Zwischenspeicher** (Offline-Erfassung, schnelle Anzeige), nicht als
einzige Ablage für Vergabeakten. Ein Offline-Modus braucht deshalb immer einen Server oder eine Desktop-Datei als
„Wahrheit“ und einen sichtbaren Sync-Status.

### 6.2 Desktop-Hülle: Tauri 2 oder Electron

| Kriterium | Tauri 2 | Electron |
|---|---|---|
| Lizenz | MIT OR Apache-2.0 (`@tauri-apps/api`) [19] | MIT [19] |
| Version und Takt | `@tauri-apps/api` 2.12.4 vom 14.10.2026; 3.0.0-alpha.3 in Arbeit [19] | 45.2.3 vom 04.11.2026; 205 stabile npm-Versionen in 12 Monaten über mehrere Release-Linien [19] |
| Basis | Rust-Kern plus **System-WebView** des Betriebssystems (Einschätzung: Darstellung kann je System abweichen) | gebündeltes Chromium plus Node.js → überall gleiche Darstellung |
| Größe und Speicher (ein Erfahrungsbericht, kein Normtest) | App-Bundle 8,6 MiB; ca. 172 MB RAM mit sechs Fenstern [39] | App-Bundle 244 MiB; ca. 409 MB RAM [39] |
| Signatur macOS | Apple Developer Program 99 USD pro Jahr (bzw. Landeswährung), Developer ID und Notarisierung inklusive [38] | ebenso; ohne Signatur meldet Gatekeeper die App als „beschädigt“, und Auto-Update (Squirrel.Mac) setzt eine gültige Signatur voraus [36] |
| Signatur Windows | wie Electron | seit Juni 2023 laut Electron-Doku nur noch EV-Zertifikate wirksam (nicht unabhängig geprüft), Schlüssel auf Hardware-Modul (FIPS 140 Level 2), daher Cloud-Signierdienste; Azure Artifact Signing (früher Trusted Signing) als günstigste Option, nur in bestimmten Ländern [36]. Preis: Basic 9,99 USD/Monat mit 5.000 Signaturen, Premium 99,99 USD/Monat mit 100.000; jede weitere Signatur 0,005 USD [37] |
| Referenz im Umfeld | Open Calc Studio (Tauri 2, React 19) [40] | Grist Desktop (Electron, Apache-2.0, auch auf Apple-Silicon-Macs) [50] |

Ergänzungen:

- **Auto-Update in Tauri:** Update-Pakete müssen signiert sein; das lässt sich laut Doku nicht abschalten. Wer den
  privaten Schlüssel verliert, kann bestehende Installationen nicht mehr aktualisieren. Als Quelle genügt eine statische
  JSON-Datei, z. B. auf GitHub Releases, oder ein eigener Update-Server. Unterstützte Formate: AppImage (Linux),
  `.app`-Bundle (macOS), MSI und NSIS (Windows); unter Windows beendet sich die App vor der Installation [48].
  Deb- und RPM-Pakete nennt die Updater-Doku nicht; dort übernimmt der Paketmanager das Aktualisieren (Einschätzung).
- **Kostenlose Windows-Signatur für Open Source:** Die SignPath Foundation stellt Open-Source-Projekten kostenlos ein
  Code-Signing-Zertifikat bereit, prüft dafür, dass das Programm aus dem öffentlichen Repository gebaut wurde, und
  hält den Schlüssel in einem Hardware-Sicherheitsmodul [49]. Die genauen Aufnahmebedingungen stehen auf den
  Bewerbungsseiten (nicht geprüft).
- **Kostenrahmen Desktop (Einschätzung, Stand 09.11.2026):** 99 USD/Jahr Apple plus 0 USD (SignPath, falls
  angenommen) oder rund 120 USD/Jahr (Azure Basic) für Windows; Linux braucht keine kostenpflichtige Signatur.

### 6.3 Selbst-Hosting, Anmeldung und Datensicherung

- **Docker Compose** als Standardauslieferung: Anwendung, PostgreSQL, Reverse-Proxy mit TLS und ein Backup-Dienst.
  Grist zeigt das Muster mit einem einzigen Container und einem `/persist`-Verzeichnis [50].
- **Anmeldung:** eingebaut (Passwort plus Passkey oder TOTP) für das Ein-Personen-Büro, dazu OIDC für Büros mit
  zentralem Konto. Freie Identitätsanbieter: Keycloak (Apache-2.0) [42], authentik (Kern MIT, Verzeichnis
  `authentik/enterprise/` unter eigener Lizenz) [26], ZITADEL (bis v2 Apache-2.0, seit v3 vom 02.04.2025 AGPL-3.0) [41]. Einschätzung: Die Anwendung
  spricht nur OIDC und bindet keinen Anbieter fest ein; dann ist die Lizenz des Anbieters für unseren Code unerheblich.
- **Backup und Wiederherstellung:** Datenbank-Dump plus Dateiablage (Anhänge, Original-GAEB-Dateien, PDFs),
  verschlüsselt und außer Haus; eine **getestete** Wiederherstellung gehört zur Auslieferung (siehe
  [Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) Abschnitt 10). Grist speichert jedes Dokument
  als SQLite-Datei, die jedes SQLite-Werkzeug lesen kann [50] – ein einfaches Muster für Export und Archiv.

## 7. Referenzprojekte

| Projekt | Lizenz | Grid | Mehrbenutzer und Sync | Lehre für uns (Einschätzung) |
|---|---|---|---|---|
| **Open Calc Studio** (OpenAEC, NL) | LGPL-3.0-only [40] | keine Grid-Bibliothek in der `package.json` im Wurzelverzeichnis, also vermutlich eigene Umsetzung (React 19) [40] | Desktop über Tauri 2 plus Web-Version ([Open-Source-Landschaft](/okf/research/open-source/existing-projects.md)) | eine Code-Basis für Web und Desktop ist machbar; Tauri-Plugins für Dateien und Dialoge [40] |
| **Grist** | `grist-core`, `grist-desktop`, `grist-static` Apache-2.0; Vollversion kommerziell, frei für Organisationen unter 1 Mio. USD Jahresbudget [50] | eigenes Grid (`app/client/components/GridView.ts`) [50] | serverseitig: ein Dokument = eine SQLite-Datei; Python-Formeln in einer Sandbox (gVisor, macOS-Sandbox oder Pyodide); WebSockets mit Long-Polling als Ausweichweg [50] | Dokument-als-Datei erleichtert Backup, Export und Desktop-Betrieb; Formeln laufen auf dem Server, nicht im Browser |
| **Baserow** | Kern MIT, `premium/` und `enterprise/` eigene Lizenzen [25] | Frontend in Vue.js [51], Grid selbst gebaut (Einschätzung) | Django und PostgreSQL [51]; Echtzeit-Aktualisierung über WebSockets (Abhängigkeit `channels` im Backend, `realTimeHandler.js` im Frontend) [52] | Open-Core-Muster: Kernfunktionen offen, Spezialfunktionen kostenpflichtig |
| **NocoDB** | seit 29.01.2026 „Sustainable Use License“ – nur interne oder nichtkommerzielle Nutzung, kein OSI-Open-Source [23] | Canvas-Grid (`nc-gui/components/smartsheet/grid/canvas`) [52] | – | **Lizenzwechsel-Warnung**: Code nicht übernehmen |
| **Teable** | Anwendungen AGPL-3.0 mit Markenschutz-Zusatz; alle Pakete unter `packages/` MIT [24] | eigenes **Canvas-Grid** im SDK-Paket (`packages/sdk/src/components/grid`, Render-, Interaktions- und Scroll-Ebenen) [52] | **ShareDB** (OT) auf PostgreSQL; ShareDB steckt in Backend, Frontend, SDK und einem eigenen Realtime-Adapter [52][24] | zeigt die Kombination Canvas-Grid + OT + Postgres in Produktion; das MIT-Grid-Paket wäre lizenzrechtlich wiederverwendbar (Passung ungeprüft) |
| **Frappe / ERPNext** | Frappe MIT [20]; ERPNext GPL-3.0 ([Open-Source-Landschaft](/okf/research/open-source/existing-projects.md)) | `frappe-datatable` MIT, 1.22.0 vom 03.11.2026 [19] | **optimistisch:** vor dem Speichern wird der `modified`-Zeitstempel verglichen, sonst Fehler „has been modified after you have opened it“; dazu geprüfte Statusübergänge Speichern → Buchen → Stornieren [53] | genau das Muster, das wir für Positionen und Angebote brauchen: Versionsprüfung plus unveränderliche, „gebuchte“ Stände |

## 8. Kandidaten-Stacks und Lizenzfallen

### 8.1 Drei Kandidaten (Einschätzung)

Alle drei setzen die Lizenzempfehlung aus [Bausteine](/okf/research/open-source/building-blocks-and-licensing.md)
Abschnitt 9 voraus: Anwendung AGPL-3.0-or-later, wiederverwendbare Bibliotheken MIT/Apache-2.0.

| | **A – Eigenes Grid auf TanStack** | **B – Fertiges MIT-Grid** | **C – Canvas und Echtzeit** |
|---|---|---|---|
| Grid | TanStack Table 9 + TanStack Virtual (MIT) plus eigene Schicht für Bereichsauswahl, Zwischenablage, Ausfüllen und Undo | Tabulator 6.7 oder SlickGrid-Universal 10 (MIT), eigener TSV-Parser davor | Glide Data Grid (MIT) oder das Canvas-Grid aus Teables MIT-Paket `packages/sdk` [24][52] |
| Frontend | React oder Vue (frei wählbar) | Tabulator: framework-neutral; SlickGrid-Universal: Angular, Aurelia, React, Vue [15] | React |
| Mehrbenutzer | PostgreSQL + Versionsnummer/ETag + SSE (Abschnitt 5.3) | wie A | ShareDB (MIT) auf PostgreSQL, wie Teable [31][52] |
| Offline / Desktop | später: Tauri 2 mit lokaler SQLite oder PWA mit SQLite-WASM | wie A | schwieriger: OT braucht den Server |
| Stärken | volle Kontrolle über Baum, OZ, Dezimalwerte, ARIA und Tests; keine Open-Core-Abhängigkeit | schnellster Weg zu einem brauchbaren LV-Editor; Baum, Zwischenablage und Undo vorhanden | höchste Leistung im Preisspiegel; Echtzeit wie in Google Sheets |
| Schwächen | größter Eigenbau (Bereich, Zwischenablage, Tastatur) | Grenzen der Bibliothek (einfacher Einfüge-Parser, Styling, Pflege durch wenige Personen) | Barrierefreiheit, Tests, Suche selbst bauen; Glide seit 02/2024 ohne stabile Version [19]; OT-Dokumentmodell neben dem relationalen Modell |
| Lizenzlage | nur MIT | nur MIT (XLSX-Export ohne SheetJS lösen, z. B. ExcelJS oder serverseitig) | MIT; Teable-Anwendungscode ist AGPL-3.0 und darf nur unter AGPL übernommen werden [24] |
| Eignung | **Empfehlung für den Kern** | **Empfehlung für einen schnellen Prototyp**, ggf. dauerhaft für Aufmaß | nur, wenn der Freund Echtzeit-Mitarbeit wirklich braucht |

**Verträglichkeit mit AGPL-3.0:** MIT-, BSD- und Apache-2.0-Bausteine sind unproblematisch (siehe
[Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) Abschnitt 9.2). GPL-3.0-Code (z. B. HyperFormula)
darf nach Abschnitt 13 der AGPL mit AGPL-Code zu einem Werk verbunden werden; jeder Teil behält dann seine Lizenz [58].
In MIT/Apache-Bibliotheken des Projekts hat GPL-Code dagegen nichts zu suchen.

### 8.2 Lizenzfallen

| # | Falle | Folge für uns |
|---|---|---|
| L1 | **AG Grid Enterprise**: Baum, Zeilengruppierung, Bereichsauswahl, Zwischenablage, Excel-Export, Zeilennummern, Formeln und Stapelbearbeitung sind kommerziell [2]; Lizenz pro Entwickler, alle Frontend-Entwickler brauchen eine; Preise erst nach Konfiguration [3]; Wasserzeichen ohne Schlüssel [1] | nicht nutzbar in einem Projekt mit freien Beitragenden |
| L2 | **MUI X**: freie Version nur 100 Zeilen virtualisiert; Baum und fixierte Spalten in Pro, Einfügen, Bereich, Undo und Excel in Premium [7]; 299 bzw. 599 USD pro Entwickler und Jahr [6] | wie L1 |
| L3 | **Handsontable**: proprietär; kostenlose Lizenz nur zur Evaluierung oder für genehmigte nichtkommerzielle Projekte; Konkurrenzprodukte verboten; Beiträge nur mit CLA [8] | ausgeschlossen |
| L4 | **HyperFormula**: GPL-3.0-only oder kommerziell [10] | in der AGPL-Anwendung möglich [58], nicht in MIT-Bibliotheken |
| L5 | **RevoGrid Pro**: Baum, Undo/Redo, Excel-Import/-Export, Formeln [12] | Kern nutzbar, Baum selbst bauen |
| L6 | **Univer**: Echtzeit, Historie, XLSX-Import/-Export in der kommerziellen Server-SDK [17] | nur Kern nutzbar |
| L7 | **Jspreadsheet CE**: MIT laut README, aber npm-Paket ohne Lizenzfeld; Weiterentwicklung in der kommerziellen Pro-Version [16][19] | meiden |
| L8 | **Tabulator-XLSX-Export** braucht eine SheetJS-kompatible Bibliothek [13]; das npm-Paket `xlsx` ist veraltet, aktuelle Fassungen gibt es nur vom Hersteller-CDN ([Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) Abschnitt 4) | Excel-Export separat lösen |
| L9 | **NocoDB**: seit 29.01.2026 Sustainable Use License [23] | keinen Code übernehmen |
| L10 | **Open-Core-Verzeichnisse**: Baserow (`premium/`, `enterprise/`) und authentik (`authentik/enterprise/`) haben eigene Lizenzen neben dem MIT-Kern [25][26]; Teable-Anwendungen AGPL-3.0 mit Markenschutz-Zusatz, nur `packages/` MIT [24] | beim Lesen und Übernehmen auf das Verzeichnis achten |
| L11 | **Grist Vollversion**: zusätzliche Funktionen außerhalb von `grist-core`; „kostenlos unter 1 Mio. USD Budget“ ist eine Nutzungserlaubnis, keine Open-Source-Lizenz [50] | nur `grist-core` als Referenz |
| L12 | **ZITADEL**: seit v3 (Commit vom 02.04.2025) AGPL-3.0 [20][41] | als separater Dienst unproblematisch; nicht in MIT-Teile einbetten |
| L13 | **Triplit**: AGPL-3.0-only, letzte npm-Version 07/2025; **Replicache**: npm-Lizenzfeld verweist auf Nutzungsbedingungen, das Monorepo nennt Apache-2.0 [19][34][35] | nicht als Grundlage wählen |
| L14 | **ElectricSQL**: Apache-2.0, aber Beiträge nur mit CLA [32] | für die Nutzung unkritisch |

## Relevanz für unser Projekt

### Muss/Soll/Kann je Tabelle

**LV-Editor**

| Stufe | Anforderung |
|---|---|
| Muss | Baum mit Los, Titel, Untertitel und Position, auf- und zuklappbar; flüssig bei 20.000 Zeilen (Benchmark aus 4.2) |
| Muss | Excel-Tastaturbedienung: Pfeile, Tab, Enter, F2, Esc, Strg+Z/Y, Umschalt+Pfeil für Bereiche |
| Muss | Kopieren und Einfügen mit Excel nach X1–X9, auch neue Positionen samt Hierarchie |
| Muss | Rückgängig/Wiederholen über Bearbeiten, Einfügen, Verschieben, Löschen – als Befehle, die auch der Server kennt (statt NOVAs „nicht umkehrbar“) |
| Muss | Verschieben per Ziehen oder Ausschneiden/Einfügen mit Serverprüfung; OZ automatisch, Neunummerierung als eigener Befehl |
| Muss | Dezimalgenaue Eingabe (Menge, später EP) im deutschen Format; Positionsarten (Normal-, Bedarfs-, Wahlposition) sichtbar |
| Muss | Langtext im eigenen Editor neben dem Grid ([Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) Abschnitt 5) |
| Muss | eigene Suche und Filter (Strg+F reicht bei Virtualisierung nicht) |
| Muss | Konflikterkennung beim Speichern (Abschnitt 5.3) und Bearbeitungshinweis |
| Soll | Ausfüllkästchen, Massenänderung (z. B. Kostengruppe für 50 Positionen), Spaltenauswahl speicherbar, Kontextmenü |
| Soll | Live-Anzeige der Änderungen anderer |
| Kann | Echtzeit-Mitbearbeitung derselben Zeile (ShareDB), Mengenformeln direkt im Mengenfeld |

**Preisspiegel**

| Stufe | Anforderung |
|---|---|
| Muss | fixierte Spalten (OZ, Kurztext, Menge, Einheit) und Spaltengruppen je Bieter (EP, GP, Abweichung, Rang) |
| Muss | 30 Bieter × 20.000 Zeilen ohne Ruckeln (Spalten-Virtualisierung) |
| Muss | bedingte Farben: günstigster/teuerster Preis, Ausreißer, ABC-Klassen; Werte serverseitig dezimalgenau berechnet |
| Muss | Summen je Titel und Los, Bezugsangebot wählbar (NOVA-Funktionsumfang siehe [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)) |
| Muss | standardmäßig nur lesbar; Eingaben nur in vorgesehenen Feldern (Nachlass, Notiz, „nicht gewertet“) |
| Muss | Kopieren nach Excel (X8) und XLSX-Export mit Formeln; Druck/PDF serverseitig |
| Soll | Bieter ein-/ausblenden und umsortieren, gespeicherte Spaltensets, kompakte Ansicht, Filter „nur Ausreißer“ |
| Soll | Verhandlungsrunden als eingefrorene Stände nebeneinander vergleichen |
| Kann | Canvas-Ansicht für sehr große Preisspiegel; Diagramme |

**Aufmaß**

| Stufe | Anforderung |
|---|---|
| Muss | Formelzeilen nach REB 23.003 mit eigenem Parser und Dezimalarithmetik; Ergebnis je Zeile sofort, Summe je Position |
| Muss | Einfügen aus Excel-Aufmaßlisten (X1–X9); Import DA11/X31 ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)) |
| Muss | Status je Zeile oder Blatt (erfasst, geprüft, freigegeben) mit Prüfpfad; Freigabe zurücknehmbar statt „nicht umkehrbar“ |
| Muss | optimistische Konflikterkennung, wenn Auftragnehmer und Bauleitung parallel arbeiten |
| Soll | Fotos und Skizzen an Zeilen hängen; mehrere Erfassungsblätter ohne feste Obergrenze (NOVA: höchstens 15) |
| Soll | Offline-Erfassung auf dem Tablet, falls der Freund das braucht (Stufe 2 in 5.3) |
| Kann | Excel-kompatible Formeln über HyperFormula (GPL-3.0, nur im AGPL-Teil) |

### Empfehlung zu Mehrbenutzerbetrieb, Offline und Desktop (Einschätzung)

1. **Start:** Webanwendung (Browser) mit server-autoritativem Modell nach 5.3, Selbst-Hosting per Docker Compose,
   OIDC optional. Das deckt Windows, Mac und Linux sofort ab ([Schmerzpunkte](/okf/research/market/pain-points.md)
   Abschnitt 9).
2. **Desktop später** mit Tauri 2: dieselbe Oberfläche und lokale Datenhaltung für Einzelplatz-Büros ohne Server.
   Kosten der Signaturen einplanen (Abschnitt 6.2).
3. **Offline** nur für das Aufmaß und nur, wenn die Interviews es bestätigen.

### Differenzierungschancen

- **Excel-Zwischenablage, die funktioniert** – direkt gegen eine dokumentierte NOVA-Grenze.
- **Kein Sperren ganzer LVs**, sichtbare Konflikte statt stiller Überschreibungen, Rückgängig statt „nicht umkehrbar“.
- **Prüfpfad und eingefrorene Stände** als eingebaute Vergabeakte.
- **Mac und Linux nativ**, optional als signierte Desktop-App.

### Aufwand (Einschätzung, Personentage = PT für eine erfahrene Person)

| Baustein | A: TanStack + Eigenbau | B: Tabulator/SlickGrid | C: Canvas + ShareDB |
|---|---|---|---|
| Grid-Grundlage (Baum, Virtualisierung, Tastatur, Bearbeiten) | 25–40 PT | 8–15 PT | 30–50 PT |
| Bereichsauswahl, Ausfüllen, Undo-Befehlsstapel | 10–15 PT | 3–6 PT (Anpassung) | 10–15 PT |
| Zwischenablage (Parser, Vorschau, Einfügen in Baum, Kopieren nach Excel) | 8–12 PT | 8–12 PT | 8–12 PT |
| Preisspiegel-Ansicht (Fixierung, Gruppen, Farben, Summen) | 8–12 PT | 6–10 PT | 8–12 PT |
| Barrierefreiheit, Suche, E2E-Testbarkeit | 3–5 PT | 3–5 PT | 10–20 PT |
| Mehrbenutzer (Versionen, Konflikt-UI, SSE, Prüfpfad, Snapshots) | 10–15 PT | 10–15 PT | 20–30 PT (ShareDB-Integration) |
| **Summe Tabellenkern** | **ca. 65–100 PT** | **ca. 40–65 PT** | **ca. 85–140 PT** |

Zusätzlich, unabhängig vom Stack: Offline-Aufmaß mit lokaler Datenbank und Warteschlange 20–40 PT; Tauri-Desktop mit
Signatur und Auto-Update 8–15 PT plus laufende Kosten (Abschnitt 6.2); Docker Compose, OIDC und
Backup/Wiederherstellung 8–12 PT (überschneidet sich mit dem Hosting-Grundpaket in
[Bausteine](/okf/research/open-source/building-blocks-and-licensing.md)).

### Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| **Wenige Maintainer** bei den freien Kandidaten (SlickGrid-Universal, RevoGrid mit je einem npm-Maintainer; Glide ohne stabile Version seit 2024; Tabulator mit neuer Organisation seit 05/2026) [19][20] | Grid hinter eigener Schnittstelle kapseln; Fachlogik (Baum, OZ, Dezimal, Befehle) nie im Grid-Code |
| **Open-Core-Drift**: Funktionen wandern in Bezahlstufen (AG Grid, RevoGrid, Univer) [2][12][17] | Versionen festschreiben, Lizenzprüfung in der CI ([Bausteine](/okf/research/open-source/building-blocks-and-licensing.md) M1) |
| **Excel-Varianten** (Windows/Mac, Sprache, Version) verhalten sich unterschiedlich [45] | Zwischenablage-Fixtures aus echten Programmen, Tests mit dem Freund |
| **Stilles Überschreiben** bei gleichzeitiger Arbeit | optimistische Versionen, Konflikt-UI, Prüfpfad |
| **Datenverlust offline** durch Browser-Bereinigung [22][55] | Browser-Speicher nur als Zwischenspeicher, sichtbarer Sync-Status |
| **Verlust des Update-Signaturschlüssels** (Tauri) [48] | Schlüssel in zwei getrennten Tresoren, dokumentierter Wechselprozess |
| **Canvas-Barrierefreiheit**, falls öffentliche Auftraggeber barrierefreie Werkzeuge verlangen (Einschätzung, nicht belegt) | DOM-Grid für den Kern bevorzugen |

## Offene Fragen

**An den Architekten-Freund**

1. **Offline:** Erfasst du Aufmaße auf der Baustelle ohne Netz (Tablet, Laptop)? Wie oft?
2. **Mac:** Arbeitet das Büro mit Macs (Apple Silicon)? Reicht der Browser, oder wird eine Desktop-App erwartet?
3. **Gleichzeitig am selben LV:** Bearbeiten mehrere Personen wirklich zur selben Zeit dasselbe LV, oder eher
   nacheinander bzw. verschiedene Lose? Wie oft störte dich NOVAs LV-Sperre?
4. **Excel-Rundreisen:** Welche Richtungen kommen vor: LV-Entwurf aus Excel, Mengen aus Excel-Aufmaßlisten, Preise aus
   Bieter-Excel, Preisspiegel nach Excel für den Bauherrn? Werden Formeln erwartet oder nur Werte?
5. **Größen:** Wie viele Positionen hat dein größtes LV, wie viele Bieter dein größter Preisspiegel?
6. **Tastatur:** Welche Excel-Gewohnheiten sind unverzichtbar (z. B. Strg+Enter, Ausfüllen nach unten, F2)?
7. **Betrieb:** Server im Büro (NAS), gemietet in der EU oder Desktop ohne Server? Gibt es Microsoft-365-Konten für eine
   gemeinsame Anmeldung?
8. **Barrierefreiheit:** Verlangen öffentliche Auftraggeber Nachweise zur Barrierefreiheit der eingesetzten Software?

**Technisch nicht geklärt**

- Wie Excel Zellen mit Tabulatoren oder Anführungszeichen in TSV schreibt und ob `mso-number-format` beim Einfügen aus der
  Zwischenablage wirkt (nur mit echten Excel-Versionen prüfbar).
- Ob AG-Grid-Spaltengruppen und -Barrierefreiheit in der Community-Version vollständig enthalten sind (Doku nicht
  eindeutig); AG-Grid-Preise (nur nach Konfiguration sichtbar) [3].
- Belastbare, unabhängige Leistungsdaten für Baum-Grids mit 20.000 Zeilen und 150 Spalten – nur durch eigenen Benchmark.
- Schreibweg und Konfliktbehandlung von PowerSync und Zero im Detail; Zukunft von Replicache und Triplit.
- Wer Tabulator künftig pflegt (neue GitHub-Organisation seit 05/2026, „Beekeeper Studio Inc“ als Rechteinhaber auf der Website).
- Ob Teables MIT-Grid-Paket ohne den AGPL-Anwendungscode sinnvoll nutzbar ist.
- Aufnahmebedingungen der SignPath Foundation und Verfügbarkeit von Azure Artifact Signing für Einzelpersonen in Deutschland.

## Quellen

[1] AG Grid: Community vs. Enterprise – AG Grid Ltd – https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/ – Herstellerangabe – abgerufen 2026-11-09
[2] AG Grid: Modules (Modulliste mit Enterprise-Kennzeichnung, Version 36.3.0) – AG Grid Ltd – https://www.ag-grid.com/javascript-data-grid/modules/ – Herstellerangabe – abgerufen 2026-11-09
[3] AG Grid: License & Pricing – AG Grid Ltd – https://www.ag-grid.com/license-pricing/ – Herstellerangabe – abgerufen 2026-11-09
[4] AG Grid: LICENSE.txt (Paketlizenzen MIT/Commercial) – GitHub ag-grid/ag-grid – https://github.com/ag-grid/ag-grid/blob/latest/LICENSE.txt – Primärquelle – abgerufen 2026-11-09
[5] MUI X: Licensing – MUI – https://mui.com/x/introduction/licensing/ – Herstellerangabe – abgerufen 2026-11-09
[6] MUI: Pricing – MUI – https://mui.com/pricing/ – Herstellerangabe – abgerufen 2026-11-09
[7] MUI X Data Grid, Doku-Quelltexte (clipboard, tree-data, export, cell-selection, column-pinning, column-groups, row-grouping, undo-redo, virtualization, accessibility) – GitHub mui/mui-x – https://github.com/mui/mui-x/tree/master/docs/data/data-grid – Herstellerangabe – abgerufen 2026-11-09
[8] Handsontable: LICENSE.txt, README (Abschnitt Licenses) und Plugin-Verzeichnis `handsontable/src/plugins` – GitHub handsontable/handsontable – https://github.com/handsontable/handsontable – Primärquelle – abgerufen 2026-11-09
[9] Handsontable: Clipboard (Doku 18.1) – Handsoncode – https://handsontable.com/docs/javascript-data-grid/basic-clipboard/ – Herstellerangabe – abgerufen 2026-11-09
[10] HyperFormula: npm-Paket 3.5.0 (Lizenzfeld) und Repository – https://www.npmjs.com/package/hyperformula ; https://github.com/handsontable/hyperformula – Primärquelle – abgerufen 2026-11-09
[11] Glide Data Grid: README – GitHub glideapps/glide-data-grid – https://github.com/glideapps/glide-data-grid – Herstellerangabe – abgerufen 2026-11-09
[12] RevoGrid: README (Kern- und Pro-Funktionen) – GitHub revolist/revogrid – https://github.com/revolist/revogrid – Herstellerangabe – abgerufen 2026-11-09
[13] Tabulator: Repository und Quelltext `src/js/modules/Clipboard/defaults/pasteParsers.js`; Website tabulator.info – https://github.com/tabulator-tables/tabulator ; https://tabulator.info – Primärquelle – abgerufen 2026-11-09
[14] TanStack Table und TanStack Virtual – GitHub – https://github.com/TanStack/table ; https://github.com/TanStack/virtual – Primärquelle – abgerufen 2026-11-09
[15] SlickGrid-Universal: README und Quelltext (`packages/common/src/extensions`, u. a. `slickCellExcelCopyManager.ts`, `slickCellRangeSelector.ts`; Pakete `excel-export`, `pdf-export`; `treeDataOptions` in `gridOption.interface.ts`) – GitHub ghiscoding/slickgrid-universal – https://github.com/ghiscoding/slickgrid-universal – Herstellerangabe/Primärquelle – abgerufen 2026-11-09
[16] Jspreadsheet CE: README – GitHub jspreadsheet/ce – https://github.com/jspreadsheet/ce – Herstellerangabe – abgerufen 2026-11-09
[17] Univer: README (Scope and licensing) – GitHub dream-num/univer – https://github.com/dream-num/univer – Herstellerangabe – abgerufen 2026-11-09
[18] Fortune-sheet und x-spreadsheet – GitHub – https://github.com/ruilisi/fortune-sheet ; https://github.com/myliang/x-spreadsheet – Primärquelle – abgerufen 2026-11-09
[19] npm-Registry, Paketdokumente (dist-tags, time, license) aller genannten Pakete – npm Inc. – https://registry.npmjs.org/ – Primärquelle – abgerufen 2026-11-09
[20] GitHub REST API, Repository-Metadaten (Lizenz, Sterne, letzter Push, Mitwirkende) – GitHub – https://api.github.com/repos/ – Primärquelle – abgerufen 2026-11-09
[21] Clipboard: read() method – MDN Web Docs – https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read – Primärquelle (Referenzdoku) – abgerufen 2026-11-09
[22] SQLite WASM: Persistent Storage Options – SQLite-Projekt – https://sqlite.org/wasm/doc/trunk/persistence.md – Primärquelle – abgerufen 2026-11-09
[23] NocoDB: LICENSE.md (Sustainable Use License, aktualisiert 29.01.2026) – GitHub nocodb/nocodb – https://github.com/nocodb/nocodb/blob/develop/LICENSE.md – Primärquelle – abgerufen 2026-11-09
[24] Teable: LICENSE – GitHub teableio/teable – https://github.com/teableio/teable/blob/develop/LICENSE – Primärquelle – abgerufen 2026-11-09
[25] Baserow: LICENSE – GitHub baserow/baserow – https://github.com/baserow/baserow/blob/develop/LICENSE – Primärquelle – abgerufen 2026-11-09
[26] authentik: LICENSE – GitHub goauthentik/authentik – https://github.com/goauthentik/authentik/blob/main/LICENSE – Primärquelle – abgerufen 2026-11-09
[27] react-data-grid: LICENSE – GitHub Comcast/react-data-grid – https://github.com/Comcast/react-data-grid – Primärquelle – abgerufen 2026-11-09
[28] Yjs: README und INTERNALS.md – GitHub yjs/yjs – https://github.com/yjs/yjs – Primärquelle – abgerufen 2026-11-09
[29] Automerge: README – GitHub automerge/automerge – https://github.com/automerge/automerge – Primärquelle – abgerufen 2026-11-09
[30] Loro: Doku „Tree“ und Blogbeitrag „Movable tree CRDTs“ (Quelltexte der Doku) – GitHub loro-dev/loro-docs – https://github.com/loro-dev/loro-docs/blob/main/pages/docs/tutorial/tree.mdx ; https://loro.dev/blog/movable-tree – Herstellerangabe – abgerufen 2026-11-09
[31] ShareDB: Doku „Op submission“, „Actions“, „Document history“ – GitHub share/sharedb – https://github.com/share/sharedb/tree/master/docs – Primärquelle – abgerufen 2026-11-09
[32] ElectricSQL: README – GitHub electric-sql/electric – https://github.com/electric-sql/electric – Herstellerangabe – abgerufen 2026-11-09
[33] PowerSync Service: LICENSE – GitHub powersync-ja/powersync-service – https://github.com/powersync-ja/powersync-service – Primärquelle – abgerufen 2026-11-09
[34] Rocicorp Monorepo (Zero, Replicache): LICENSE und packages/replicache/package.json – GitHub rocicorp/mono – https://github.com/rocicorp/mono – Primärquelle – abgerufen 2026-11-09
[35] Triplit: Repository – GitHub aspen-cloud/triplit – https://github.com/aspen-cloud/triplit – Primärquelle – abgerufen 2026-11-09
[36] Electron: Code Signing – Electron-Projekt (OpenJS Foundation) – https://www.electronjs.org/docs/latest/tutorial/code-signing – Primärquelle – abgerufen 2026-11-09
[37] Azure Retail Prices API, Dienst „Trusted Signing“ (heute „Artifact Signing“), und Preisseite – Microsoft – https://prices.azure.com/api/retail/prices?$filter=serviceName%20eq%20'Trusted%20Signing' ; https://azure.microsoft.com/en-us/pricing/details/artifact-signing/ – Herstellerangabe – abgerufen 2026-11-09
[38] Apple Developer Program: Enrollment (Gebühr 99 USD pro Mitgliedsjahr) und Choosing a Membership – Apple – https://developer.apple.com/programs/enroll/ ; https://developer.apple.com/support/compare-memberships/ – Herstellerangabe – abgerufen 2026-11-09
[39] Tauri vs. Electron: performance, bundle size, and the real trade-offs – Hopp (Blog auf dev.to) – https://dev.to/gethopp/tauri-vs-electron-performance-bundle-size-and-the-real-trade-offs-1el4 – Blog/Erfahrungsbericht – abgerufen 2026-11-09
[40] Open Calc Studio: package.json (Version 2026.45.1, Abhängigkeiten) – GitHub OpenAEC-Foundation/open-calc-studio – https://github.com/OpenAEC-Foundation/open-calc-studio/blob/main/package.json – Primärquelle – abgerufen 2026-11-09
[41] ZITADEL: Repository und Versionsgeschichte der LICENSE-Datei (Apache-2.0 bis zum Commit „Introduce ZITADEL v3“ vom 02.04.2025, danach AGPL-3.0) – GitHub zitadel/zitadel – https://github.com/zitadel/zitadel/commits/main/LICENSE – Primärquelle – abgerufen 2026-11-09
[42] Keycloak: Repository (Lizenz Apache-2.0) – GitHub keycloak/keycloak – https://github.com/keycloak/keycloak – Primärquelle – abgerufen 2026-11-09
[43] Mathesar: Issue #2811 „Improve TSV serialization for tab and newline characters …“ (2023, erledigt) – GitHub – https://github.com/mathesar-foundation/mathesar/issues/2811 – Primärquelle (Issue) – abgerufen 2026-11-09
[44] Microsoft Q&A: Antwort vom 10.09.2023 zu Anführungszeichen beim Kopieren mehrzeiliger Excel-Zellen – Microsoft – https://learn.microsoft.com/en-us/answers/a/11523854 – Forum – abgerufen 2026-11-09
[45] GraphPad Prism User Guide: Options when pasting data from Excel – GraphPad – https://graphpad.com/guides/prism/latest/user-guide/options_when_pasting_data_from.htm – Herstellerangabe – abgerufen 2026-11-09
[46] Styling Excel cells with mso-number-format CSS attribute (02/2020) – dev.to – https://dev.to/anrodriguez/styling-excel-cells-with-mso-number-format-css-attribute-updated-j6i – Blog – abgerufen 2026-11-09
[47] CSV Injection – OWASP Community – https://community.owasp.org/attacks/CSV_Injection – Primärquelle (Sicherheitswissen) – abgerufen 2026-11-09
[48] Tauri 2: Updater-Plugin – Tauri-Projekt – https://v2.tauri.app/plugin/updater/ – Primärquelle – abgerufen 2026-11-09
[49] SignPath Foundation: kostenlose Code-Signierung für Open-Source-Projekte – SignPath Foundation – https://signpath.org/ – Herstellerangabe – abgerufen 2026-11-09
[50] Grist: README von grist-core und grist-desktop – GitHub gristlabs – https://github.com/gristlabs/grist-core ; https://github.com/gristlabs/grist-desktop – Herstellerangabe – abgerufen 2026-11-09
[51] Baserow: README – GitHub baserow/baserow – https://github.com/baserow/baserow – Herstellerangabe – abgerufen 2026-11-09
[52] Quelltext-Fundstellen per GitHub-Codesuche: Teable `packages/sdk/src/components/grid` und `package.json`-Abhängigkeiten zu `sharedb`; NocoDB `packages/nc-gui/components/smartsheet/grid/canvas/index.vue` – GitHub – https://github.com/teableio/teable ; https://github.com/nocodb/nocodb – Primärquelle – abgerufen 2026-11-09
[53] Frappe: `frappe/model/document.py`, Methode `check_if_latest` – GitHub frappe/frappe – https://github.com/frappe/frappe/blob/develop/frappe/model/document.py – Primärquelle – abgerufen 2026-11-09
[54] Clipboard API (Übersicht, Abschnitt Security considerations) – MDN Web Docs – https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API – Primärquelle (Referenzdoku) – abgerufen 2026-11-09
[55] Updates to Storage Policy (10.08.2023, gilt ab Safari 17) – WebKit-Blog – https://webkit.org/blog/14403/updates-to-storage-policy/ – Herstellerangabe – abgerufen 2026-11-09
[56] AG Grid: Column Pinning (Version 36.3.0) – AG Grid Ltd – https://www.ag-grid.com/javascript-data-grid/column-pinning/ – Herstellerangabe – abgerufen 2026-11-09
[57] Battle of the Rows: The Limits of Data Performance (19.11.2024, Autor ist Geschäftsführer des RevoGrid-Herstellers) – dev.to – https://dev.to/revolist/battle-of-the-rows-the-limits-of-data-performance-4mcn – Herstellerangabe/Blog – abgerufen 2026-11-09
[58] GNU Affero General Public License v3, Abschnitt 13 – Free Software Foundation – https://www.gnu.org/licenses/agpl-3.0.html – Primärquelle (Lizenztext) – abgerufen 2026-11-09
