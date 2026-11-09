---
type: Research Note
title: "Leistungstexte: STLB-Bau, Herstellertexte, Textbibliotheken und Lizenzen"
description: Woher der Text einer LV-Position kommt (STLB-Bau, STLB-BauZ, STLK, Herstellerportale, kommerzielle Textbibliotheken, Bürostandards, KI), was das kostet, welche Regeln für Leistungsbeschreibungen gelten und was ein Open-Source-AVA-Projekt rechtlich ausliefern, verlinken oder integrieren darf.
resource: https://www.gaeb.de/de/produkte/stlb-bau/
tags: [research, stlb-bau, ausschreibungstexte, lizenzen, vob-a, herstellertexte, urheberrecht]
timestamp: 2026-11-09T17:16:17Z
sources: 88
confidence: mittel
---
# Leistungstexte: STLB-Bau, Herstellertexte, Textbibliotheken und Lizenzen

> Leseanleitung für Nicht-Architekten: Ein **Leistungsverzeichnis (LV)** ist die in einzelne
> **Positionen** (= *Teilleistungen*) gegliederte Liste der Bauleistungen, die ein Bieter anbieten
> soll. Jede Position hat eine **Ordnungszahl (OZ)**, eine Menge mit **Mengeneinheit**, einen
> **Kurztext** (eine Zeile zur Unterscheidung) und einen **Langtext** (die vertraglich maßgebliche,
> vollständige Beschreibung) [12][34]. Diese Notiz beantwortet: *Wer schreibt diese Texte, wem
> gehören sie, was kosten sie – und was folgt daraus für ein Open-Source-Werkzeug?*
> Prozessüberblick: [AVA-Prozess I](/okf/research/process/tendering-and-award.md).

## Kurzfassung

- **STLB-Bau** („Standardleistungsbuch für das Bauwesen – Dynamische BauDaten“) ist der
  De-facto-Standard für produktneutrale, VOB-gerechte Positionstexte: Der GAEB stellt die Inhalte
  in ehrenamtlichen Fachgremien auf, DIN gibt heraus, die Dr. Schiller & Partner GmbH (Marke
  „Dynamische BauDaten“, DBD, Dresden) setzt datentechnisch um, rund 40 Vertriebspartner (meist
  Softwarehäuser) verkaufen [8][5]. Umfang laut Anbieter: über 1 Mio. Texte in 79
  Leistungsbereichen; Ausgaben zweimal jährlich (April/Oktober), aktuell 2026-04 bzw. 2026-10 [33][29][30].
- **Für Bundesbaumaßnahmen ist STLB-Bau Pflicht-Grundlage**: VHB Bund, Richtlinie 100 Nr. 4.2.2
  verlangt „in der Regel“ STLB-Bau/STLB-BauZ, Freitext nur für nicht darstellbare Besonderheiten;
  eingeführt per Erlass vom 03.08.1998, zuletzt Folgeerlass vom 18.06.2026 für Version 2026-04 [9][7][8].
  Für Länder/Kommunen und Private gibt es keine allgemeine Pflicht (Stand der Recherche; offen).
- **STLB-Bau ist proprietär und kostet pro Arbeitsplatz** (alle Preise netto, Stand 2026):
  Paket Architektur als Kaufversion 2.090 € + 20 % Pflege/Jahr, als Online-Jahreslizenz 799,43 €
  (Online-Preise laut Vertriebspartner WESA); Komplettpaket 3.990 € bzw. 1.527,45 €/Jahr; kleinste
  Fachpakete online ab 378,68 €/Jahr; weitere Plätze je 40 % [36][37][38]. SJ vermietet STLB-Bau
  „ab 990 €“ pro Jahr, ohne das Paket zu nennen [88]. „Ab“-Preise sind deshalb nur bei gleichem Paket
  und gleichem Anbieter vergleichbar. Diese Kosten
  fallen **zusätzlich** zur AVA-Software an – auch bei NOVA AVA, die nur STLB-Bau *Online* anbindet [18][27].
- **Die Lizenzbedingungen schließen ein Bündeln aus**: erlaubt sind eigene LVs und deren
  unentgeltliche, projektbezogene Weitergabe (z. B. an Bieter); verboten sind u. a. Weitergabe von
  aus STLB-Bau erzeugten Datensätzen und der *numerischen Codierung*, Einspeisen in Retrieval-Systeme/
  Intranets, Bearbeitung/Umgestaltung sowie (Offline-Produkte) Einsatz als ASP/SaaS [35][26].
  ⇒ Ein OSS-Projekt darf **keine** STLB-Texte, -Codes oder aus STLB erzeugte Test-LVs mitliefern.
- **Integration ist nur über offizielle Schnittstellen** möglich (STLB-Bau Online-API seit 2007;
  2015 als SOAP-Webservice mit fertiger Oberfläche beschrieben); die Entwickler-Doku liegt hinter
  einem Login, Partnerkonditionen sind nicht öffentlich [23][39][32].
- **GAEB DA XML transportiert den STLB-Bau-Schlüssel** (Elemente `STLBBau`, `STLBBauCtlg`,
  `STLBBauID`) und Kennzeichnungen „TA/TB“ für Textergänzungen [13][12]. Ein OSS-Tool muss diese
  Daten verlustfrei erhalten – das ist technisch einfach und rechtlich unkritisch (Nutzerdaten).
- **Herstellertexte sind kostenlos, aber produktgebunden**: ausschreiben.de (ORCA Software) bot 2020
  knapp 1 Mio. Texte von über 600 Herstellern ohne Kosten [48]; Heinze nennt 375.000 Texte von 8.000
  Herstellern [55]. Für öffentliche Aufträge kollidieren produktspezifische Texte mit § 7 Abs. 2 VOB/A
  (Produktneutralität, „oder gleichwertig“); das VHB verbietet Leitfabrikate grundsätzlich [75][9].
  Portal-Nutzungsbedingungen verbieten Crawling/Text-Data-Mining und eigene Datenbanken [56][58].
- **Kommerzielle produktneutrale Alternativen** zu STLB-Bau: Heinze VOB-Texte (über 50.000
  Stammpositionen, 650 €/Jahr), SIRADOS (WEKA, ab 469 €), BKI, EURO BAU DATA u. a. [57][61][50].
- **STLB-BauZ** (Zeitvertrags-/Bauunterhaltungsarbeiten, 30 LB, mit Einheitspreisen, jährlich im
  Juli) und **STLK** (Straßen-/Brückenbau, FGSV, 39 LB, Ausgabestand 06/26) sind Nischen mit eigener
  Lizenzlogik [19][44].
- **Wirklich freie, wiederverwendbare Texte sind rar**: Demos (16 STLB-Bauleistungen), der
  bayerische Ergänzungskatalog RLK StB-By (kostenloser Download), AMEV-Vertragsmuster für TGA-Wartung
  – Nachnutzungsrechte jeweils ungeklärt [33][46][47]. Eine eigene, offen lizenzierte Textbibliothek
  ist möglich, aber teuer in Pflege und Qualitätssicherung (Einschätzung).
- **KI-Trend**: NOVA AVA testet „NEO“ (Beta, u. a. LV-Erstellung aus PDFs, VOB-Prüfung) und einen
  anwenderübergreifenden Positionspool „SmartPool“; NEVARIS bietet KI-Textsuche und Positions-Mapping
  [69][70][72]. KI auf lizenzierten Texten ist vertraglich heikel (Retrieval-/TDM-Verbote) [35][56].

## 1. Woher kommt ein Positionstext? Überblick der Quellen

| Quelle | Wer erstellt / vertreibt | Produktneutral? | Kosten für Planer | Typische Integration | Lizenz-Kernpunkt |
|---|---|---|---|---|---|
| **STLB-Bau** | GAEB (Inhalt), DIN (Herausgabe), DBD (Technik), DIN Bauportal (Online), ~40 Vertriebspartner [8] | ja (Ziel) [2] | ab ca. 400–800 €/Jahr je Paket online bzw. Kauf + 20 % Pflege [38][36] | Dialog direkt in AVA-Software, Online-API, GAEB-Export [17][33] | nur eigene Nutzung + projektbezogene Weitergabe [35] |
| **STLB-BauZ** | GAEB im Auftrag des Bundes, DIN, DBD [19] | ja | nicht öffentlich ermittelt | Export PDF/GAEB/DATANORM [19] | AGB DBD [26] |
| **STLK** (Straße/Brücke) | FGSV-Querschnittsausschuss QA 6; FGSV-Verlag; online f:data [44][45] | ja | nicht öffentlich ermittelt (Monats-/Jahreslizenz) [45] | USB-Stick/Datei, GAEB-Import [44][45] | eigene AGB [45] |
| **Herstellertexte** | Bauprodukthersteller über Portale (ausschreiben.de, Heinze AT-Manager) [48][54] | **nein** (produktspezifisch) | kostenlos [48][54] | GAEB-Download, Drag&Drop, Partner-APIs [49][54] | Nutzung im eigenen Projekt; kein Crawling/TDM [56] |
| **Kommerzielle Textbibliotheken** | Heinze VOB-Texte, SIRADOS (WEKA), BKI, EURO BAU DATA, DREIPLUS u. a. [57][61][50][67] | ja (laut Anbieter) | z. B. 430–650 €/Jahr (Heinze), ab 469 € (SIRADOS) [57][61] | Login in AVA, API, GAEB/MDI [59][63] | personengebunden, keine Weitergabe außerhalb Projekt [58] |
| **Bürostandards / alte LVs** | das eigene Büro | je nach Pflege | Arbeitszeit | AVA-Kataloge, Favoriten, GAEB [29] | eigene Texte frei; eingebettete Fremdtexte behalten ihre Lizenz (Einschätzung) |
| **Öffentliche Kataloge/Muster** | z. B. Bayern (RLK StB-By), AMEV (BMWSB) [46][47] | ja | kostenlos | PDF, Word, „Beuth-Format“ (.lb) [46][47] | ungeklärt (§ 5 UrhG?) |
| **KI-generiert** | AVA-Anbieter (NOVA NEO, NEVARIS) oder allgemeine LLMs [69][72] | abhängig vom Prompt | im Abo / Beta | integriert | Haftung/Qualität beim Planer [69] |

## 2. STLB-Bau – Dynamische BauDaten

### 2.1 Rollen und Organisationen

| Akteur | Rolle | Belege |
|---|---|---|
| **GAEB** (Gemeinsamer Ausschuss Elektronik im Bauwesen) | stellt STLB-Bau auf; paritätisch besetzte Fachgremien; ca. 600 ehrenamtliche Fachleute in über 90 Arbeitskreisen; Geschäftsstelle beim Bundesamt für Bauwesen und Raumordnung (Bonn); seit 2005 Teil des DVA (Verfasser der VOB) | [1][2][5][8] |
| **DIN** Deutsches Institut für Normung e. V. | Herausgeber; Vertragspartner der STLB-Bau-Lizenz | [8][26] |
| **Dr. Schiller & Partner GmbH – Dynamische BauDaten (DBD)** | datentechnische Umsetzung und Betriebssoftware; gegründet 1992, Sitz Dresden, 10–50 Beschäftigte (laut Eigenangabe) | [8][23][24][25] |
| **DIN Bauportal GmbH – Dynamische BauDaten** (Berlin) | Vermarktung/Betrieb von STLB-Bau Online (seit 2000) und DIN BIM Cloud; Vertrieb auch über „Anwendungspartner“ | [33][35][23] |
| **f:data GmbH** (Weimar) | Technikpartner für STLB-Bau Online; erstellt mit DIN das Baunormenlexikon; betreibt stlk.de und bauprofessor.de | [39][30][45][42] |
| **DIN Media GmbH** (vormals Beuth Verlag) | Verlag/Vertrieb (u. a. STLB-BauZ-Buchausgaben); 1998 lief der CD-Vertrieb noch über Beuth | [10][7][5] |
| **Vertriebspartner („Mitvertreiber“)** | ca. 40, überwiegend Bausoftware-Anbieter (z. B. ORCA, G&W, WESA verkaufen Pakete) | [8][5][36][37][38] |

Hinweis: Die genaue Umbenennung Beuth → DIN Media (Datum) wurde hier nicht verifiziert.

### 2.2 Geschichte und Verbindlichkeit

1. **1970er–1990er:** Das alte „Standardleistungsbuch“ (StLB) war ein *Teiltextsystem*: Texte aus fünf
   Textteilen mit bis zu 14-stelligen Nummern, gedruckt als Hefte je Gewerk; es wird nicht mehr gepflegt [42][7].
2. **1996:** STLB-Bau erscheint als datenbankbasiertes, „dynamisches“ Textsystem (Version 04-1996) [2][23].
3. **03.08.1998:** Einführungserlass des Bundesbauministeriums: STLB-Bau läuft parallel zum alten StLB;
   Bundesländer hatten StLB-Lizenzverträge mit DIN, die STLB-Bau einschlossen (plus Konvertierungskosten
   je Land) [7]. Kurios: LB 029 Beschlagarbeiten wurde wegen RAL-Bezug auf die Liste nicht zu
   verwendender Texte gesetzt – auch Standardtexte können mit dem Vergaberecht kollidieren [7].
4. **1999/2000/2007:** Umstellung auf XML, STLB-Bau Online, erste API für STLB-Bau Online [23].
5. **2019-10:** „Neue Generation“ mit überarbeiteter Oberfläche und Direktintegration in AVA-Software [41][23].
6. **Seitdem:** halbjährliche Ausgaben; der Bund führt jede Version per Folgeerlass ein (zuletzt
   BII1-70419/4#27 vom 18.06.2026 für 2026-04; ersetzt den Erlass vom 26.01.2026) [8][6].

**VHB Bund (Vergabe- und Vertragshandbuch für Baumaßnahmen des Bundes)**, Richtlinie 100:
Nr. 4.2.2 – Leistungsbeschreibungen sind „in der Regel“ auf STLB-Bau und STLB-BauZ aufzubauen;
was damit nicht darstellbar ist, wird frei formuliert; für Straßen- und Tiefbau „kann“ der STLK
verwendet werden [9]. Richtlinie 611 Nr. 5: Rahmenverträge im Auf- und Abgebotsverfahren sind aus
StLB-BauZ-Texten zu erstellen [9]. Laut GAEB ist STLB-Bau bei Bundeshochbaumaßnahmen verpflichtend
[1]. STLB-Bau ist **kein Bestandteil der VOB**, beruht aber auf ihr [34].

### 2.3 Funktionsweise: wie eine STLB-Bau-Position entsteht

1. Nutzer wählt in der AVA-Software (oder im Browser) einen **Leistungsbereich (LB)** bzw. sucht per
   Schlagwort/Favorit [17][7].
2. STLB-Bau zeigt einen **Textvorschlag**; der Nutzer wählt **Merkmale** (z. B. Qualität,
   Verwendungszweck, Einbauort) und deren **Ausprägungen** [17][34].
3. Eine Fachlogik prüft die Stimmigkeit; unpassende Ausprägungen werden ausgegraut und entfernt [17][3].
4. Pflichtergänzungen sind markiert: **TA** = vom Auftraggeber zu ergänzen, **TB** = vom Bieter zu
   ergänzen (z. B. angebotenes Produkt) [3]. Freie Zusätze im Standardtext sind nicht vorgesehen;
   Ergänzungen gehören in vorgesehene Felder [3].
5. Ergebnis: **Langtext, Kurztext, Mengeneinheit, DIN-276-Kostengruppe** und eine eindeutige
   **Schlüsselnummer**, die laut Prospekt über spätere Versionen unverändert bleibt [29][17].
6. Übergabe an die AVA-Software per Schnittstelle oder als GAEB-Datei [17][33].

Weitere Fakten:
- **LB 099 „Allgemeine Standardbeschreibungen (Vorbemerkungen)“**: projektbezogene Hinweise und
  Vertragsregelungen ohne OZ und ohne Preis; LB-übergreifende stehen in LB 099, gewerkespezifische im
  jeweiligen LB [3]. Seit 2026-10 trägt der LB wieder die Nummer 099 im Titel [30].
- Seit 2026-10 hat **jede Position ein Ergänzungsfeld „Leistungsort“** [30].
- Laut GAEB lassen sich ca. **75–80 %** der Bauleistungen mit STLB-Bau beschreiben; der Rest braucht
  Freitext „in der Syntax“ von STLB-Bau [2]. Preise enthält STLB-Bau nicht (dafür DBD-BauPreise) [2].
- STLB-Bau berücksichtigt die ATV der VOB/C (insb. DIN 18299 und gewerkespezifische ATV) inkl.
  Nebenleistungen/Besondere Leistungen; VOB/B und VOB/C werden bewusst *nicht* zitiert, um
  Wiederholungen und Widersprüche zu vermeiden [34][1].
- Ein gedrucktes Buch gibt es nicht, da die Kombinationsvielfalt nicht druckbar ist [2].
- **Mustervorlagen**: GAEB- und Hersteller-Mustervorlagen; letztere führen zu einem *produktneutralen*
  STLB-Text, den das Herstellerprodukt erfüllt [34]. Ob Hersteller dafür zahlen, ist nicht öffentlich.

### 2.4 Leistungsbereiche (Stand April 2026, 79 LB)

Quelle: Anlage zum Folgeerlass vom 18.06.2026 [8]. Die Nummerierung entspricht im Wesentlichen der
Gliederung der VOB/C [12]. (Händler nennen teils 77 LB – vermutlich älterer Stand [36][31].)

| LB | Bezeichnung | LB | Bezeichnung |
|---|---|---|---|
| 099 | Allgemeine Standardbeschreibungen (Vorbemerkungen) | 040 | Wärmeversorgungsanlagen – Betriebseinrichtungen |
| 000 | Sicherheitseinrichtungen, Baustelleneinrichtungen | 041 | Wärmeversorgungsanlagen – Leitungen, Armaturen, Heizflächen |
| 001 | Gerüstarbeiten | 042 | Gas- und Wasseranlagen – Leitungen, Armaturen |
| 002 | Erdarbeiten | 043 | Druckrohrleitungen für Gas, Wasser und Abwasser |
| 003 | Landschaftsbauarbeiten | 044 | Abwasseranlagen – Leitungen, Abläufe, Armaturen |
| 004 | Landschaftsbauarbeiten – Pflanzen | 045 | Gas-, Wasser-, Entwässerungsanlagen – Ausstattung, Elemente, Fertigbäder |
| 005 | Brunnenbauarbeiten und Aufschlussbohrungen | 046 | Gas-, Wasser-, Entwässerungsanlagen – Betriebseinrichtungen |
| 006 | Spezialtiefbauarbeiten | 047 | Dämm- und Brandschutzarbeiten an technischen Anlagen |
| 007 | Untertagebauarbeiten | 049 | Feuerlöschanlagen, Feuerlöschgeräte |
| 008 | Wasserhaltungsarbeiten | 050 | Blitzschutz-/Erdungsanlagen, Überspannungsschutz |
| 009 | Entwässerungskanalarbeiten | 051 | Kabelleitungstiefbauarbeiten |
| 010 | Drän- und Versickerarbeiten | 052 | Mittelspannungsanlagen |
| 011 | Abscheider- und Kleinkläranlagen | 053 | Niederspannungsanlagen – Kabel/Leitungen, Verlegesysteme, Installationsgeräte |
| 012 | Mauerarbeiten | 054 | Niederspannungsanlagen – Verteilersysteme und Einbaugeräte |
| 013 | Betonarbeiten | 055 | Sicherheits- und Ersatzstromversorgungsanlagen |
| 014 | Natur-, Betonwerksteinarbeiten | 057 | Gebäudesystemtechnik |
| 016 | Zimmer- und Holzbauarbeiten | 058 | Leuchten und Lampen |
| 017 | Stahlbauarbeiten | 059 | Sicherheitsbeleuchtungsanlagen |
| 018 | Abdichtungsarbeiten | 060 | Such-, Signal-, Zeitdienst-, Antennen-, elektroakustische Anlagen, Medientechnik |
| 019 | Kampfmittelräumarbeiten | 061 | Kommunikations- und Übertragungsnetze |
| 020 | Dachdeckungsarbeiten | 062 | Kommunikationsanlagen |
| 021 | Dachabdichtungsarbeiten | 063 | Gefahrenmeldeanlagen |
| 022 | Klempnerarbeiten | 064 | Zutrittskontroll-, Zeiterfassungssysteme |
| 023 | Putz- und Stuckarbeiten, Wärmedämmsysteme | 069 | Aufzüge |
| 024 | Fliesen- und Plattenarbeiten | 070 | Gebäudeautomation |
| 025 | Estricharbeiten | 075 | Raumlufttechnische Anlagen |
| 026 | Fenster, Außentüren | 078 | Kälteanlagen für raumlufttechnische Anlagen |
| 027 | Tischlerarbeiten | 080 | Straßen, Wege, Plätze |
| 028 | Parkett-, Holzpflasterarbeiten | 081 | Betonerhaltungsarbeiten |
| 029 | Beschlagarbeiten | 082 | Bekämpfender Holzschutz |
| 030 | Rollladenarbeiten | 084 | Abbruch-, Rückbau- und Schadstoffsanierungsarbeiten |
| 031 | Metallbauarbeiten | 085 | Rohrvortriebsarbeiten |
| 032 | Verglasungsarbeiten | 087 | Abfallentsorgung, Verwertung und Beseitigung |
| 033 | Baureinigungsarbeiten | 089 | Verkehrssicherungsarbeiten |
| 034 | Maler- und Lackierarbeiten – Beschichtungen | 090 | Baulogistik |
| 035 | Korrosionsschutzarbeiten an Stahlbauten | 091 | Stundenlohnarbeiten |
| 036 | Bodenbelagarbeiten | 096 | Bauarbeiten an Bahnübergängen |
| 037 | Tapezierarbeiten | 097 | Bauarbeiten an Gleisen und Weichen |
| 038 | Vorgehängte hinterlüftete Fassaden | 098 | Witterungsschutzmaßnahmen |
| 039 | Trockenbauarbeiten | | |

**Pakete** (Zahl der LB laut DBD): Architektur 41, Tiefbau 29, Freianlagen 18,
Heizung/Sanitär/RLT/GA 17, Elektro/GA 22, Tiefbau-Rohbau-Ausbau (TRA) 51, Technik 35, Komplett 79 [17].

### 2.5 Abbildung in GAEB DA XML (der „STLB-Bau-Schlüssel“)

Details zum Format: [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md). Für Textquellen relevant:

| Element (Schema 3.3) | Inhalt laut Schema-Doku | Folgerung |
|---|---|---|
| `Description/STLBBau` | „Schlüssel STLB-Bau“ einer Position | muss beim Import erhalten bleiben |
| `STLBBauCtlg` | Katalogname, Versionsdatum, Leistungsbereich (`WCtg`), Gruppen-ID (`Group`), Kostengruppe (`CostGrp`) | Version + LB anzeigen |
| `STLBBauID` (0..n) | ID des Beschreibungsmerkmals (`ArtChrIdent`), Index, ID der Ausprägung (`ChVIdent`), Flag „liefert Kurztextteil“ | die eigentliche „numerische Codierung“ |

Quelle: XSD `GAEB_DA_XML_Lib_3.3_2021-05.xsd` [13]. Die Fachdokumentation verlangt, dass Textergänzungen
bei Standardtexten in der Zeile der Katalog-/Schlüsselnummer als „TA“/„TB“ gekennzeichnet werden; im
Ausdruck erscheint eine Herkunftszeile wie „STLB-Bau <Version> <LB> [TA|TB]“ [12][2]. Die AVA-Software
entscheidet selbst, ob sie unvollständige Texte markiert [3]. Der kostenlose **STLB-Bau Check** prüft
GAEB-DA-XML-LVs gegen eine bestimmte STLB-Bau-Version, protokolliert Freitexte und Ergänzungen und wird
laut DBD besonders von öffentlichen Auftraggebern genutzt [28][4] – verlorene Schlüssel machen ein LV
dort zu „Freitext“ (Einschätzung).

### 2.6 Ausgaben und Aktualisierung

- **Rhythmus:** zweimal jährlich (April/Oktober); Versionsnummern wie 26.04.0001 [17][29][33].
- **Aktueller Stand (2026-11-09):** Das DBD-Dokument „Neues in STLB-Bau 2026-10“ ist auf Oktober 2026
  datiert (u. a. neue ZTV Asphalt-StB 2026, Neufassung DIN 18533, Feld „Leistungsort“) [30]; GAEB-Website
  und letzter Bundeserlass nennen noch 2026-04 [14][8]. Erlasse folgen den Ausgaben mit Monaten Verzug.
- **Online** nutzt immer die aktuelle Ausgabe; **offline** braucht Installation + Pflegevertrag [34][33].
- Ältere LVs lassen sich über die Favoritenliste gegen die installierte Version prüfen/aktualisieren [3][17].

### 2.7 Produkte, Pakete und Preise (Stand: abgerufen 2026-11-09, alle netto zzgl. MwSt.)

| Paket | LB | Kauf (unbefristet) | Pflege/Jahr (20 %) | Online-Jahreslizenz¹ | mit DBD-BauPreise Plus: Kauf / online¹ |
|---|---|---|---|---|---|
| Architektur | 41 | 2.090 € | 418 € | 799,43 € | 3.640 € / 1.560,18 € |
| Tiefbau | 29 | 1.440 € | 288 € | 550,80 € | 2.390 € / 1.035,30 € |
| Freianlagen | 18 | 990 € | 198 € | 378,68 € | 1.690 € / 714,43 € |
| Tiefbau-Rohbau-Ausbau | 51 | 2.690 € | 538 € | 1.018,73 € | 4.690 € / 1.991,98 € |
| Technik (TGA) | 35 | 1.790 € | 358 € | 671,93 € | 3.140 € / 1.326,43 € |
| Elektro/GA | 22 | 1.140 € | 228 € | 445,74 € | 1.990 € / 866,49 € |
| Heizung/Sanitär/RLT/GA | 17 | 990 € | 198 € | 398,82 € | 1.790 € / 777,07 € |
| **Komplett** | 79 | **3.990 €** | 798 € | **1.527,45 €** | 6.490 € / 2.755,70 € |

Quellen: Kauf/Pflege [36][37][38]; ¹ Online-Preise laut Reseller-Liste WESA mit Link auf den DBD-Onlineshop
[38] – der offizielle Shop rendert per JavaScript und konnte nicht direkt geprüft werden.

Weitere Konditionen:
- Zweit- bis Zehntlizenz je **40 %** der Erstlizenz (z. B. Architektur 836 €) [38][37][36].
- Andere Vertriebspartner nennen andere Einstiegspreise: SJ Software führt STLB-Bau unter „Miete pro Jahr“
  mit „ab 990 €“ (Paket und Online/Offline nicht genannt) [88]. Der Betrag entspricht dem Kaufpreis der
  kleinsten Pakete (Freianlagen, Heizung/Sanitär) bei WESA [38]; ob SJ eine Miete oder einen Kauf meint,
  ist offen. Für Kostenvergleiche immer Paket, Anbieter und Lizenzform (Kauf, Pflege, Online-Jahreszugang)
  zusammen angeben.
- Pflege laut ORCA mit **Mindestlaufzeit 2 Jahre**, zwei Updates pro Jahr [36]; Pflegeverträge
  verlängern sich jährlich, Kündigung 3 Monate vor Ablauf [26][38].
- Online: Monats- oder Jahreszugang; Jahreszugang verlängert sich automatisch (Kündigung 3 Monate vorher);
  Preisliste höchstens einmal pro Quartal anpassbar, Sonderkündigungsrecht bei Erhöhungen deutlich über
  der Inflation [35].
- Zusatzmodule: Baunormenlexikon (Architektur 1.090 € Kauf / 408 € online p. a.) [38][36];
  Bildungslizenz (1 Dozent + 25 Studierende) 1.250 € [36]; Studentenversion auf Antrag [33].
- Kostenlos: Testzugang mit **16 vollständigen Bauleistungen** (Konto nötig) [33][17], STLB-Bau Check,
  GAEB-Ausschreibungsvorlage (einfaches LV-Werkzeug, laut GAEB kein AVA-Ersatz) [4][28].
- Historischer Vergleich: 2010 wurde eine STLB-Bau-Flatrate für 349 €/Jahr berichtet (Suchtreffer,
  nicht geprüft) – Einschätzung: Preise sind seither deutlich gestiegen.

### 2.8 Lizenzbedingungen für Endnutzer

Primärquellen: Nutzungsbedingungen DIN Bauportal für STLB-Bau online, Stand März 2024 [35];
AGB Dr. Schiller & Partner (Offline/Online-DBD-Produkte, STLB-Bau/STLB-BauZ), Stand Mai 2024 [26].

| Erlaubt | Verboten / eingeschränkt |
|---|---|
| Nutzung zum eigenen Gebrauch im Geschäftsbetrieb; nicht ausschließlich, nicht übertragbar, nicht unterlizenzierbar; online auf Vertragsdauer [35] | Zugänge für Dritte; Weitergabe von Benutzerkennungen [35] |
| Erstellen und Speichern von Leistungsbeschreibungen mit/ohne Preise für eigene Nutzung [35][26] | Einspeisen in ein lokales Retrievalsystem/Intranet; gewerbliche Informationsvermittlung [35][26] |
| **unentgeltliche Weitergabe im Rahmen projektbezogener Zusammenarbeit**, soweit für das Projekt zwingend erforderlich – inkl. DBD-Codierung (also: LV an Bieter) [35][26] | Vermarktung/Verbreitung inkl. **numerischer Codierung** sowie Herstellung und Verbreitung von Datensätzen auf STLB-Basis [35][26] |
| dauerhaftes Abspeichern; einzelne Papierkopien in den Grenzen des Urheberrechts [35] | jede Übersetzung, Bearbeitung, Anordnung, Umgestaltung [35][26] |
| Mehrplatz nur mit Mehrplatzvertrag; Online-Nebennutzer im eigenen Unternehmen [26][35] | Offline-Software als **ASP/SaaS** betreiben (ohne Sondervereinbarung) [26] |
| Zugriff auch über Anwendungssoftware mit integrierter STLB-Bau-Online-Schnittstelle [35] | nach Vertragsende darf DIN Bauportal online gespeicherte Nutzerdaten löschen; Sicherung ist Sache des Nutzers [35] |

Kaufversionen (offline) sind standardmäßig **unbefristet**; Quellcode ist nicht Vertragsgegenstand
[26]. Laut Nutzungsbedingungen ist STLB-Bau urheberrechtlich geschützt und Missbrauch strafbar [35].

### 2.9 Integration in Software (Sicht Softwarehersteller)

- **Wege:** (a) Online-Schnittstelle zu STLB-Bau Online (API seit 2007; 2015 als SOAP-Webservice
  *mit kompletter Benutzeroberfläche* beschrieben, d. h. der Textdialog erscheint in der AVA-Software)
  [23][39][40]; (b) Offline-Schnittstelle „STLB-Bau neue Generation“ zur lokalen Installation [38];
  (c) GAEB-Export aus dem Webportal (Zusatzmodul „Leistungsverzeichnisse“) [33].
- **Bedingungen:** Schnittstellenbeschreibungen liegen im DBD-Entwickler-Portal hinter einem Login [32];
  Integrationsanfragen über Kontaktformular [16]. DBD haftet nicht für Datenübernahme oder Funktion der
  Schnittstelle; verantwortlich ist der Anbieter der Anwendungssoftware [26]. Gebühren, NDA- oder
  Open-Source-Regeln sind **nicht öffentlich**.
- **Wer integriert (Auswahl laut DBD-Liste, ca. 50 Produkte)** [18]:

| Software | Hersteller | STLB offline | STLB online | DBD-BauPreise | DBD-BIM |
|---|---|---|---|---|---|
| NOVA AVA | NOVA Building IT | – | ja | ja | online |
| ARCHITEXT Pallas | NOVA Building IT | ja | ja | ja | – |
| ORCA AVA | ORCA Software | ja | ja | ja | ja |
| CaliforniaX | G&W Software | ja | ja | ja | ja |
| NEVARIS Build / Success X | Nevaris | ja | ja | ja | ja |
| iTWO / RIB 4.0 | RIB Software | ja / – | ja | ja | ja / – |
| SIDOUN Globe | SIDOUN | ja | ja | ja | ja |
| AVA.relax, AVANTI, AVAPLAN, Bechmann, BUILDUP, ASBwin, SJ AVA | div. | ja | ja | ja | teils |
| Cosuno | Cosuno Ventures | – | ja | – | – |

Für NOVA AVA heißt das: Texte und DBD-BauPreise stehen „je nach abonniertem Paketumfang“ im LV-Modul;
ein „Smart Key“ verbindet NOVA und STLB-Bau Online zum Aktualisieren alter LVs [27]. Siehe
[NOVA: Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md).

## 3. STLB-BauZ, STLK und weitere Standardkataloge

| | **STLB-BauZ** | **STLK** |
|---|---|---|
| Zweck | wiederkehrende Bauunterhaltungsarbeiten (Zeitvertragsarbeiten), Rahmenverträge oder Einzelaufträge [19][10] | Straßen-, Brücken- und sonstiger Tiefbau [44][43] |
| Aufsteller / Herausgeber | GAEB im Auftrag des Bundes; DIN; DBD [19] | FGSV-Querschnittsausschuss QA 6; Vertrieb FGSV-Verlag; online f:data (stlk.de) [44][43][45] |
| Umfang | 30 LB (z. B. Erdarbeiten, Dachdeckung, Trockenbau, Maler, Niederspannung) [19] | 39 LB im Ausgabestand 06/26 [44] |
| Besonderheit | jede Textkombination hat einen **Einheitspreis**; Bieter bieten prozentuale Auf-/Abschläge (Auf- und Abgebotsverfahren, § 4 Abs. 4 VOB/A) [19][10][42] | StL-Nr. bis 16-stellig; Grundtext + Folgetexte; eigene Mengeneinheiten [43] |
| Ausgaben | jährlich im Juli (2023-07 … 2026-07) [19] | per Allgemeinem Rundschreiben Straßenbau (ARS 14/2026 vom 26.06.2026) [44] |
| Formate | Buch (DIN Media) und Download; Export PDF, GAEB, DATANORM [10][19] | Buch und Datenträger (STLK/LB-Datei); FGSV-USB-Stick für AVA-Programme; online Monats-/Jahreslizenz [44][45] |
| Verbindlichkeit | VHB 611: Pflicht für Auf-/Abgebotsverfahren im Bund [9] | für Bundesfernstraßen „ab sofort“ zu verwenden; Länder sollen einführen [44]; VHB: „kann“ [9] |

Weitere: **STLK-W** (Wasserbau) [42]; **RLK StB-By 21** – bayerischer Ergänzungskatalog (LB 901–934,
Ausgabe 01/2024) zum STLK, als PDF und „Beuth-Format“ (.lb) **kostenlos herunterladbar**; Nachnutzungsrechte
nicht angegeben [46].

## 4. Weitere DBD-Daten rund um STLB-Bau

| Produkt | Inhalt (laut Hersteller) | Status / Lizenz |
|---|---|---|
| **DBD-BauPreise** (Plus) | regionale Von-Mittel-Bis-Orientierungspreise je STLB-Position (Stadt-/Landkreis), Preisanteile, Zeitansatz [33][17] | Zusatz zu STLB-Bau |
| **DBD-KostenAnsätze** | Kalkulationsdaten (Einzelkosten der Teilleistungen nach Lohn, Material, Gerät, Sonstiges) für über 60 LB; optional KI-Vorschlag einer Erstkalkulation; Lernfunktion [20] | Cloud-Datenbank für Kalkulations-/ERP-Software; Test mit 15 Bauleistungen [20] |
| **DBD-KostenElemente** | bauteilorientierte Kostenelemente, über 15 Jahre im Einsatz | **abgelöst** durch DBD-BIM Elements (News 2021) [22] |
| **DBD-BIM** (Konfigurator, Elements, Objekte, Regeln der Technik) | konfigurierbare Bauteile mit Kosten, STLB-Zuordnung, Merkmalen nach DIN BIM Cloud; Schlüssel „DBD-BIMKey“; Kosten nach DIN 276 [21] | Lizenzschlüssel + DBD-Konto; Firmenlizenz; 7-Tage-Test; Preise nicht öffentlich [21] |
| Plug-ins / Apps | Revit, ARCHICAD (21.09.2026), Vectorworks (seit 02.11.2026), DBD-Connect (IFC), DBD-KostenKalkül, DBD-BaukostenApp [16] | – |
| **Baunormenlexikon für STLB-Bau** | ca. 16.554 Normabschnitte aus über 1.579 Normen, ca. 71.000 Verknüpfungen; erstellt von DIN mit f:data; **kein Teil von STLB-Bau** [30] | nur betriebsinternes Lesen erlaubt [35] |

Initiativen von DBD: DIN SPEC 91400 (BIM-Klassifikation nach STLB-Bau, 2014) und mit RIB DIN SPEC 91350
(verlinkter BIM-/LV-Datenaustausch, 2016) [23]. Vertiefung: [BIM und AVA](/okf/research/standards/bim-and-ava.md),
[DIN 276](/okf/research/standards/din-276-cost-planning.md).

## 5. Herstellertexte, Textportale und kommerzielle Textbibliotheken

### 5.1 Portale im Einzelnen

| Portal / Anbieter | Betreiber | Umfang (Stand der Quelle) | Kosten | Formate / Integration | Bedingungen |
|---|---|---|---|---|---|
| **ausschreiben.de** | ORCA Software GmbH (Neubeuern) [48][50] | 2020: knapp 1 Mio. Texte, >600 Hersteller, 705 Kataloge, ~9.000 Besucher/Tag [48] | frei; 2021 ohne Registrierung [49] | Export Word, Excel, RTF, PDF, Text, GAEB XML, GAEB 90, DATANORM 5, ÖNORM [49]; >30 Schnittstellen; Partner-API „ADE API 2.0“ mit C#-Beispiel (kostenlos für Partner) [48] | Nutzungsbedingungen nicht abrufbar (JS-App) [52] |
| ausschreiben.de (Bezahlteil) | Textanbieter | produktneutrale Texte von BKI, DBD, Heinze, sirAdos, EURO BAU DATA [50] | kostenpflichtig [50] | – | – |
| **Heinze AT-Manager** | Heinze GmbH | „über 355.000“ Texte [54]; Startseite: 375 Tsd. Texte, 8.000 Hersteller [55] | kostenlos; für Funktionen Registrierung [54] | GAEB, PDF, Text; Direktschnittstelle bei 8 Anbietern (u. a. NOVA Building IT, NEVARIS, G&W, ARCHITEXT) [54] | kein Crawling/Scraping/TDM, keine externen Datenbanken, keine Weitergabe außerhalb eines Projekts [56] |
| **Heinze Ausschreibungstexte (VOB)** | Heinze GmbH | über 50.000 produktneutrale Stammpositionen mit Orientierungspreisen und DIN-276-Zuordnung [57] (ARCHITEXT nennt 46.000 – älter) [65] | Standard 650 €/Jahr (12 Mon.), Premium 430 €/Jahr (36 Mon.), Zusatzlizenz 80 €/Jahr, Demo 20 Positionen [57] | GAEB-XML, GAEB 90, PDF; 18 Schnittstellen-Anleitungen für 16–17 AVA-Programme [57]; in NOVA als „Textspeicher Heinze-VOB“ mit Heinze-Login [59] | personengebunden; Inhaltsrecht zeitlich unbefristet, aber nur für Projekte [58] |
| **BauNetz / BauNetz Wissen** | Heinze GmbH (Niederlassung Berlin, Teil von Infopro Digital) [60] | Fachwissen, keine Texte | – | – | – |
| **SIRADOS** | WEKA Intelligence GmbH & Co. KG [61] | Paket Neubau ca. 22.800 Positionen / 3.480 Elemente; Altbau 10.400 / 650; Technik 15.400 / 2.090; mit Baupreisen und Zeitwerten [62] | „365 Ausschreibungstexte“ ab 469 € (Jahreslizenz, Kündigung 6 Wochen vor Ablauf) [61][62] | GAEB XML 3.2/3.3, X50, MDI, CSV; API bei 5 Partnern [63][62] | Zusatzlizenzen für weitere Nutzer [62] |
| **ARCHITEXT Pallas** | NOVA Building IT GmbH (vormals Architext Software GmbH, Mühltal) [64] | **kein Textportal**, sondern AVA-Software; bindet STLB-Bau, STLK, sirAdos, Heinze, BKI-Positionen, „Stuttgarter Leistungsbuch“ an [65] | Pallas Online: keine Neubuchungen, Verlängerung nur bis 31.12.2025 → Umstieg auf NOVA AVA [64] (nicht verifiziert – Seite bei Nachprüfung nicht abrufbar) | – | siehe [NOVA: Unternehmen](/okf/research/nova-ava/company-and-development.md) |
| **ausschreibungstexte.de** | – | leitet (Stand 2026-11-09) auf die Website eines Teppichherstellers weiter; **kein** eigenständiges Portal [66] | – | – | – |

### 5.2 Wie Herstellertexte ins LV kommen (typischer Ablauf)

1. Planer sucht im Portal nach Produkt/Gewerk (Herstellerkatalog) [48][54].
2. Export als GAEB-Datei bzw. Drag&Drop oder Direktschnittstelle in die AVA-Software [49][54][63].
3. Im LV wird der Text angepasst – für öffentliche Auftraggeber **neutralisiert** (Produktnamen raus oder
   mit „oder gleichwertig“, TB-Feld für Bieterfabrikat) [75][9].

### 5.3 Rechtliche und fachliche Einordnung

- **Öffentliche Auftraggeber:** Technische Spezifikationen dürfen nicht auf Marken, Typen oder Herkunft
  verweisen, außer der Auftragsgegenstand rechtfertigt es oder er ist anders nicht hinreichend
  beschreibbar – dann mit Zusatz „oder gleichwertig“ [75]. Das VHB Bund verschärft: Planungs- bzw.
  **Leitfabrikat** unzulässig, ebenso *vorgeblich neutrale* Beschreibungen über Kenngrößen, die nur ein
  Produkt erfüllt; Bieterangaben zu Fabrikaten nur, wenn unverzichtbar [9]. Das ist genau das typische
  Risiko von Herstellertexten (Einschätzung).
- Laut NEVARIS-Blog (Anbietersicht) sind kostenlose Herstellerbibliotheken nicht VOB-konform und nur
  zur Orientierung geeignet [71]. Einschätzung: pauschal überspitzt – entscheidend ist die Neutralisierung.
- **Private Auftraggeber:** VOB/A gilt nicht; ein Leitfabrikat ist vertraglich zulässig (Einschätzung) –
  unklare Beschreibungen erhöhen aber das Nachtragsrisiko.
- **Geschäftsmodell (Einschätzung, nicht belegt):** Herstellertexte sind Marketing; Portale finanzieren
  sich über Hersteller (Kataloge, Sichtbarkeit) und/oder Software-Lizenzen. Konkrete Herstellergebühren
  bei ausschreiben.de oder für STLB-Mustervorlagen wurden nicht gefunden.

## 6. Bürostandards, Wiederverwendung und KI

### 6.1 Bürostandards und Textbibliotheken

- Viele Büros pflegen eigene **Stamm-/Muster-LVs** und Vorbemerkungen. STLB-Bau unterstützt das über
  **Favoriten**, persönlich oder als **Bürostandard** [29].
- NEVARIS (Blog, 08.12.2025): Textbausteine sparen Zeit und sichern Konsistenz, müssen aber laufend an
  Normen angepasst werden – manuell schwer skalierbar [71].
- Ein altes Forum (2009/10) zeigt das Grundproblem: Vorbemerkungen fehlen oft in AVA-Programmen und
  werden separat gekauft (genannt: sirAdos, Mittag, WEKA); zu umfangreiche Vorbemerkungen gelten als
  Haftungs- und AGB-Risiko [74] (veraltet, nur als Indiz).
- Werkzeug gegen Veralten: STLB-Bau Check bzw. Aktualisierungsfunktion für STLB-Positionen [28][3];
  für Freitexte gibt es nichts Vergleichbares (Einschätzung).

### 6.2 Wiederverwendung früherer LVs

| Ansatz | Anbieter | Mechanik | Anmerkung |
|---|---|---|---|
| **NOVA SmartPool** | NOVA AVA | durchsuchbarer Pool tatsächlich *beauftragter* Positionen aller NOVA-Kunden, anonymisiert, mit Preisen, filterbar nach Region/Zeitraum [70] | Netzwerkeffekt als Bindung; wie lizenzierte Fremdtexte (STLB/Heinze) im Pool behandelt werden, ist offen |
| Positions-Mapping | NEVARIS Build | ordnet Positionen eines neuen LV einem vorbereiteten Stamm-LV zu und übernimmt Kalkulationsdaten [72] | Fokus Kalkulation (Bauunternehmen) |
| STLB-Aktualisierung | DBD / NOVA / ORCA | alte STLB-Positionen per Schlüssel auf neue Version heben [3][27][36] | nur für STLB-Positionen |

### 6.3 KI-generierte Texte (Trend 2025/2026)

| Produkt | Funktion laut Anbieter | Stand |
|---|---|---|
| **NOVA AVA „NEO“** | Projekte/LVs aus unstrukturierten PDF-Kostenschätzungen erzeugen, LVs auf VOB/A-, VOB/B-, VOB/C-Konformität prüfen, CAD-Bauteillisten DIN 276 zuordnen, CO₂ über ÖKOBAUDAT; eigene „AI-HUB“-Infrastruktur mit Open-Source-Modellen, Kundendaten nicht fürs Training; externe KIs per MCP (Add-on) [69] | Beta, in allen Paketen [69]; vorgestellt BIM World 2026 [68] |
| **NEVARIS Build KI** | semantische Textsuche in Positionen, Positions-Mapping, Kalkulationsassistent; *keine* Textgenerierung [72] | Version 2026.2 [72] |
| **DBD-KostenAnsätze** | KI schlägt Erstkalkulation je Position vor und meldet fehlende LV-Angaben [20] | optional [20] |
| **Cosuno** | „automatisierte Ausschreibungsprozesse mit KI“ (ohne Details) [73] | Marketingaussage |
| ORCA AVA 27, G&W | auf den Startseiten keine KI-Textfunktionen erkennbar [51][67] | Stand 2026-11-09 |

Rechtliche Leitplanken (Einschätzung, keine Rechtsberatung):
- Texte ohne menschliche Schöpfung sind nach § 2 Abs. 2 UrhG kein „Werk“ [82] – KI-Output ist also
  vermutlich nicht urheberrechtlich geschützt, die fachliche Haftung bleibt beim Planer.
- Ein RAG-Index (Retrieval-Augmented Generation) über STLB-Texte wäre ein „lokales Retrievalsystem“ und
  damit nach den Nutzungsbedingungen unzulässig [35][26]; Heinze verbietet Text- und Data-Mining
  ausdrücklich [56]. § 44b UrhG erlaubt TDM nur ohne Vorbehalt des Rechteinhabers, online wirksam nur in
  maschinenlesbarer Form [84] – ob AGB-Klauseln genügen, ist offen.

## 7. Regeln für eine ordnungsgemäße Leistungsbeschreibung (Kurzfassung)

Vertiefung: [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md),
[HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md).

### 7.1 Gesetzliche/normative Anforderungen

| Norm | Kerninhalt (eigene Zusammenfassung) |
|---|---|
| **§ 7 Abs. 1 VOB/A** (Fassung 2019) | Nr. 1 eindeutig und erschöpfend, gleiches Verständnis aller Bieter, sichere Kalkulation ohne umfangreiche Vorarbeiten; Nr. 2 alle preisrelevanten Umstände angeben; Nr. 3 kein ungewöhnliches Wagnis; Nr. 4 Bedarfspositionen grundsätzlich nicht, angehängte Stundenlohnarbeiten nur soweit unbedingt nötig; Nr. 5 Zweck/Beanspruchung; Nr. 6 Boden-/Wasserverhältnisse; Nr. 7 Abschnitt 0 der ATV DIN 18299 ff. beachten [75] |
| **§ 7 Abs. 2 VOB/A** | Produktneutralität; Ausnahmen nur bei Rechtfertigung durch den Auftragsgegenstand oder fehlender anderer Beschreibbarkeit, dann „oder gleichwertig“ [75] |
| **§ 7 Abs. 3 VOB/A** | verkehrsübliche Bezeichnungen verwenden [75] |
| **§ 7a VOB/A** | technische Spezifikationen über Normen (mit „oder gleichwertig“) oder Leistungs-/Funktionsanforderungen; Gleichwertigkeitsnachweis zulassen; Umweltzeichen unter Bedingungen [76] |
| **§ 7b VOB/A** | Regelfall: allgemeine **Baubeschreibung** + **LV in Teilleistungen**; Nebenleistungen müssen nicht aufgeführt werden; eine Position nur für technisch gleichartige, gleich kalkulierbare Leistungen (Sammelposition nur bei untergeordneten Anteilen) [77] |
| § 7c VOB/A | Leistungsbeschreibung mit **Leistungsprogramm** (funktional, Entwurf im Wettbewerb) [12][9] |
| § 7 EU VOB/A, § 121 GWB | oberhalb der EU-Schwellenwerte gleichlaufend; § 121 GWB verlangt eine möglichst eindeutige, vergleichbare Beschreibung [9][78] |
| § 31 VgV | Parallelregel für Liefer-/Dienstleistungen (inkl. „oder gleichwertig“, Abs. 6); für Bauaufträge gilt nach § 2 VgV im Übrigen VOB/A Abschnitt 2 [79][80] |

Die VOB/A in der Fassung 2019 ist laut dejure.org weiterhin die aktuelle Fassung (Stand der Abfrage) [75];
etwaige Reformen 2025/26 deckt die Vergaberechts-Notiz ab.

### 7.2 Konkretisierung im VHB Bund (Richtlinie 100)

| Nr. | Regel | Software-Bezug (Einschätzung) |
|---|---|---|
| 4.2.1 | eindeutig, vollständig, technisch richtig (mit Definitionen) | Checklisten |
| 4.2.2 | auf das Wesentliche beschränken; STLB-Bau/BauZ als Regelgrundlage; Freitext für Besonderheiten | STLB-Herkunft je Position anzeigen |
| 4.2.3 / 4.2.4 | Bieterangaben zu Fabrikaten nur wenn unverzichtbar; Leitfabrikat und pseudo-neutrale Kenngrößen unzulässig | Lint: Markennamen, „Leitfabrikat“, fehlendes „oder gleichwertig“ |
| 4.2.6 | keine Wiederholung/Abweichung von VOB/B, VOB/C, ZVB/BVB; sonst AGB-Kontrolle der VOB/B | Lint für Vorbemerkungen |
| 4.2.7 | in der Regel Einheitspreise; Pauschale nur bei genau bestimmter Leistung | Positionsart-Validierung |
| 4.3.2 | Leistungsbeschreibung = Baubeschreibung + LV (Vorbemerkungen + Teilleistungen) | Dokumentstruktur |
| 4.3.3 / 4.3.4 | Vorbemerkungen nur technische Regeln, die für *alle* Leistungen gelten; Umstände sonst bei der Position | Hinweis beim Editieren |
| 4.3.5 | Pflichtangaben je Teilleistung, u. a. Abrechnungseinheit nach Abschnitt 0.5 der jeweiligen ATV | Einheitenliste je LB |
| 4.5 | Nebenleistungen (DIN 18299 Abschnitt 4.1) grundsätzlich nicht aufnehmen; Besondere Leistungen (4.2 / 0.4.2) als eigene Positionen | Lint |
| 4.6 | Bedarfs- und Wahlpositionen im Bund **unzulässig** | Modus „Bund“ |

Quelle für alle Zeilen: [9]. Hinweis: Das VHB verweist bei der AGB-Kontrolle auf „§ 310 Abs. 3 Satz 1
BGB“; die Privilegierung der unverändert einbezogenen VOB/B steht laut Gesetzestext in § 310 Abs. 1
Satz 3 BGB [9][81].

### 7.3 Aufbau der VOB/C (ATV)

Die VOB/C besteht aus der allgemeinen ATV DIN 18299 und gewerkespezifischen ATV (DIN 18300 ff.); sie
wird mit der VOB/B Vertragsbestandteil [87][19]. Einheitliche Gliederung jeder ATV:

| Abschnitt | Inhalt | Bedeutung |
|---|---|---|
| 0 | Hinweise für das Aufstellen der Leistungsbeschreibung (u. a. 0.4 Neben-/Besondere Leistungen, 0.5 Abrechnungseinheiten) | Checkliste für den Planer; per § 7 Abs. 1 Nr. 7 VOB/A zu beachten [75][9] |
| 1 | Geltungsbereich | – |
| 2 | Stoffe, Bauteile | – |
| 3 | Ausführung | – |
| 4 | Nebenleistungen (4.1), Besondere Leistungen (4.2) | was ohne Position geschuldet ist vs. eigene Position [9] |
| 5 | Abrechnung | Aufmaßregeln, siehe [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md) |

Quellen: Inhaltsbereiche laut [87], Abschnittsverweise laut [75][9]; Unterabschnittstitel aus
Fachwissen, nicht gegen den (nicht frei verfügbaren) Normtext geprüft.

### 7.4 Praktische Schreibregeln (laut ORCA-Whitepaper, Stand 03/2024)

Vermeiden: veraltete/umgangssprachliche Fachbegriffe, „liefern und einbauen“ (Lieferung ist nach VOB
ohnehin geschuldet; „einbauen“ kann missverstanden werden), Produktnamen (wenn, dann „oder gleichwertig“),
zu viel Text und Floskeln wie „fachgerecht ausführen“. Vorgehen: Bauteile in Positionen mit einheitlicher
Abrechnungseinheit und einheitlichem Werkstoff zerlegen (z. B. Beton, Schalung, Bewehrung getrennt),
dann Kurztext, OZ, Kostengruppe, Mengeneinheit, Langtext (kurzer Fließtext + Eigenschaftsliste),
zuletzt kostenrelevante Faktoren [53].

## 8. Freie Textquellen und was ein OSS-Projekt darf

### 8.1 Rechtsrahmen (Einschätzung, keine Rechtsberatung)

- **Urheberrecht am Einzeltext:** geschützt sind nur „persönliche geistige Schöpfungen“ [82]. Kurze,
  technisch determinierte Positionstexte erreichen das oft nicht – aber darauf sollte man nicht bauen.
- **Datenbankherstellerrecht** (§§ 87a, 87b UrhG): schützt Sammlungen mit wesentlicher Investition gegen
  Entnahme wesentlicher Teile und gegen wiederholte, systematische Entnahme unwesentlicher Teile [85][86].
  Das trifft STLB-Bau, Heinze, SIRADOS und Portale wie ausschreiben.de unabhängig vom Einzeltextschutz.
- **Vertragsrecht:** AGB/Nutzungsbedingungen binden jeden Lizenznehmer zusätzlich (Abschnitt 2.8, [56][58]).
- **Amtliche Werke** (§ 5 UrhG): Gesetze, Verordnungen, Erlasse sind frei (Abs. 1); andere amtliche Werke
  zur allgemeinen Kenntnisnahme ebenfalls, aber mit Änderungsverbot und Quellenpflicht (Abs. 2); private
  Normwerke (z. B. DIN-Normen, auf die Erlasse nur verweisen) bleiben geschützt (Abs. 3) [83]. STLB-Bau
  ist trotz Bundes-Erlass ein privates DIN-Werk (Einschätzung) und wird lizenziert vertrieben [35].

### 8.2 Bestandsaufnahme freier oder kostenloser Quellen

| Quelle | Was | Kosten | Wiederverwendung im OSS-Repo |
|---|---|---|---|
| STLB-Bau-Demo | 16 vollständige Bauleistungen [33] | frei (Konto) | nein – Lizenz [35] |
| STLB-Bau Check, GAEB-Ausschreibungsvorlage | Prüf-/LV-Werkzeug (Windows-Installer) [28][4][15] | frei | nein (proprietäre Software) |
| GAEB-Schemas und Fachdokumentation | XSD 3.1–3.3, 3.4-Beta (2026-03), PDF-Dokus [11] | frei, ohne Anmeldung | Lizenz nicht angegeben → nicht kopieren, sondern beim Build laden (siehe [GAEB-Praxis](/okf/research/standards/gaeb-tooling-interop.md)) |
| Herstellertexte (ausschreiben.de, Heinze AT-Manager) | Einzeltexte zum Download [48][54] | frei | nein in Masse; Nutzer importiert selbst per GAEB |
| RLK StB-By 21 (Bayern) | Ergänzungstexte Straßenbau LB 901–934 [46] | frei | ungeklärt (ggf. § 5 Abs. 2 UrhG) – anfragen |
| AMEV-Empfehlungen/-Vertragsmuster (z. B. Wartung 2018: Vertragsmuster, Arbeitskarten als Word) [47] | TGA-Betrieb/Wartung | frei | ungeklärt – anfragen |
| VHB-Formblätter (Bund) [9] | Vergabe-/Vertragsformulare | frei | ggf. amtliches Werk; Änderungsverbot beachten |
| Heinze-Studienlizenz [57] | Volllizenz für Studierende (nur bei Hochschulvertrag) | frei | nein |

### 8.3 Ampel: ausliefern, verlinken, integrieren

| Vorhaben | Ampel | Begründung |
|---|---|---|
| Selbst geschriebene Texte (Vorbemerkungs-Gerüste, Baubeschreibungs-Vorlagen, Beispielpositionen) unter offener Lizenz (z. B. CC BY 4.0) | grün | eigene Urheberschaft; Regel: kein Copy-Paste aus STLB/Heinze/Herstellern |
| Verweise/Zitate aus Gesetzen und Erlassen | grün | § 5 Abs. 1 UrhG [83] |
| LB-Nummern und -Bezeichnungen als Gliederung (Liste aus Erlass [8]) | grün–gelb | kurze Bezeichnungen aus amtlichem Anhang; „numerische Codierung“ der AGB zielt laut Wortlaut auf Merkmale/Ausprägungen [26] – trotzdem prüfen |
| STLB-Schlüssel in importierten Nutzer-LVs lesen, erhalten, exportieren, anzeigen | grün | Verarbeitung von Nutzerdaten; Schema öffentlich [13] |
| STLB-Texte/-Codes, STLB-basierte Beispiel-LVs oder Testdaten im Repo | **rot** | Verbreitung von Datensätzen und Codierung verboten [35][26]; § 87b UrhG [86] |
| Portale crawlen oder Herstellerkataloge bündeln | **rot** | Nutzungsbedingungen [56]; § 87b UrhG [86] |
| Deep-Links auf ausschreiben.de, Heinze, STLB-Bau Online | grün | Verlinkung |
| STLB-Bau-Online-Integration („bring your own license“) | gelb | Partnervertrag mit DIN Bauportal/DBD nötig; Doku hinter Login [32]; NDA könnte Open-Source-Code verhindern |
| ADE API (ausschreiben.de), Heinze-, SIRADOS-Schnittstellen | gelb | Partnerschaften; Konditionen unbekannt [48][54][63] |
| GAEB-Dateiimport aus Portalen durch den Nutzer | grün | Nutzer handelt im Rahmen der Portalbedingungen |
| KI-Assistent auf eigenen/offenen Texten, lokal | grün–gelb | Qualität und Haftung; keine Lizenztexte indexieren |
| KI-Index über STLB-/Heinze-Texte | **rot** | Retrieval- und TDM-Verbote [35][56] |

## Relevanz für unser Projekt

**Muss-Anforderungen (Vorschlag):**
- **M1 – Verlustfreier GAEB-Roundtrip von Standardtext-Metadaten:** `STLBBau`/`STLBBauCtlg`/`STLBBauID`,
  STLK-StL-Nr., TA/TB-Kennzeichen; Anzeige der Herkunftszeile und Version; Warnung, wenn eine STLB-Position
  editiert wird (sie wird faktisch zum Freitext) [13][12][3].
- **M2 – Freitext-Positionen erster Klasse:** Kurztext, Langtext, Mengeneinheit, KG DIN 276, Positionsart;
  ca. 20–25 % aller Positionen sind ohnehin frei [2].
- **M3 – Eigene Textbibliothek (Bürostandard):** Kataloge, Favoriten, Versionierung, Suche über alte LVs,
  Import/Export (GAEB + offenes Format), Kennzeichnung „Quelle/Lizenz“ je Text.
- **M4 – Import von Herstellertexten per GAEB-Datei** (Drag&Drop) als partnerfreier Basisweg [49][63].
- **M5 – Prüfregeln (Lint) nach § 7 VOB/A und VHB:** Markennamen ohne „oder gleichwertig“, „Leitfabrikat“,
  Bedarfs-/Wahlpositionen im Modus „öffentlich/Bund“, Vorbemerkungen mit VOB/B-Wiederholungen,
  Floskeln, Mengeneinheit passend zum LB [75][9][53].
- **M6 – Strikte Trennung von Nutzerdaten und lizenzierten Inhalten:** keine automatische Weitergabe von
  LV-Texten an Dritte oder Pools (Gegenmodell zu SmartPool) ohne Opt-in und Lizenzprüfung.

**Differenzierungschancen:**
- Transparenz statt Bündel: Text-Lizenzen bleiben beim Büro („bring your own license“); das OSS-Tool selbst
  kostet nichts extra (Kostenschmerz siehe [Schmerzpunkte](/okf/research/market/pain-points.md)).
- Produktneutralitäts-Assistent (regelbasiert, optional KI), der Herstelltexte neutralisiert und TB-Felder
  für Bieterfabrikate erzeugt – laut Recherche bei keinem Anbieter prominent beworben (Einschätzung).
- Offen lizenzierte Starter-Bibliothek für Vorbemerkungen/Baubeschreibung, gemeinsam mit dem Architekten
  geschrieben, mit Versionierung und Quellen je Absatz.
- Lokale/private KI (vgl. NOVA-Argument „keine Big-Tech-Abhängigkeit“ [69]) ohne Lizenztexte im Index.

**Risiken:**
- Urheber-/Datenbank-/Vertragsrecht bei Beiträgen: Contributor-Regeln (DCO, „keine Fremdtexte“),
  Fixtures nur synthetisch.
- Kein Zugang zur STLB-Bau-Online-Schnittstelle oder Zugang nur unter NDA → ggf. separates, nicht-offenes
  Plugin nötig; Lizenzkompatibilität der Plugin-Architektur prüfen (siehe
  [OSS-Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md)).
- Ohne STLB-Bau ist das Tool für Bundesbaumaßnahmen kaum einsetzbar [9]; Bedeutung für Länder/Kommunen offen.
- Qualität/Haftung offener Texte (veraltete Normen) – Pflegeaufwand ist hoch; GAEB braucht dafür ~600
  Ehrenamtliche [2].

**Aufwandsschätzung (grob, Personentage = PT, Einschätzung):**

| Baustein | Aufwand |
|---|---|
| M1 STLB-/STLK-Metadaten-Roundtrip (auf bestehendem GAEB-Parser) | 3–5 PT |
| M3 Textbibliothek (CRUD, Versionen, Suche, Import/Export) | 15–25 PT |
| M5 erste 10–15 Lint-Regeln | 5–10 PT |
| STLB-Bau-Online-Integration (nach Partnervertrag) | 10–20 PT + Verhandlung (unbekannt) |
| Starter-Bibliothek (50–100 Positionen/Vorbemerkungen) | 20–40 h Fachzeit des Architekten + Rechtsprüfung |
| KI-Entwurfsassistent (MVP mit Prüfregeln) | 10–20 PT |

**Kostenbeispiel für den Architekten (Einschätzung, netto, 1 Arbeitsplatz, Stand 2026):** STLB-Bau Online
Architektur ca. 800 €/Jahr, mit DBD-BauPreise Plus ca. 1.560 €/Jahr [38]; plus ggf. Heinze VOB-Texte
430–650 €/Jahr [57] – unabhängig vom AVA-Abo.

## Offene Fragen

- **Partnerkonditionen** für die STLB-Bau-Online-Schnittstelle (Gebühren, NDA, darf der Client
  Open Source sein?) – Entwickler-Portal nur mit Login [32]; Anfrage an DBD nötig.
- **Offizielle Online-Preise** im DIN-Bauportal-Shop (JavaScript) nicht direkt verifiziert; Werte stammen
  vom Reseller [38].
- **SJ-Preis „ab 990 €“:** Welches Paket und welche Lizenzform (Miete, Kauf, online) gemeint sind, sagt die
  SJ-Preisseite nicht [88].
- Gelten STLB-Pflichten auch für **Länder und Kommunen** (Landes-VHB, kommunale Vorgaben)? Bestehen heute
  noch **Landeslizenzen** wie 1998 beschrieben [7]?
- Darf ein Büro **nach Ende eines Online-Abos** früher erzeugte STLB-Texte in neuen Projekten
  wiederverwenden? Ist das Editieren eines STLB-Texts eine verbotene „Bearbeitung“ [35]?
- Nutzungsbedingungen und aktuelle Kennzahlen von **ausschreiben.de**; Konditionen der ADE-API und der
  Heinze-Schnittstelle; zahlen Hersteller für Portale bzw. STLB-Mustervorlagen?
- Rechtsstatus von **RLK StB-By, AMEV-Mustern, VHB-Formblättern** für Weiterverbreitung (§ 5 Abs. 2 UrhG?).
- Wie behandelt **NOVA SmartPool** lizenzierte Fremdtexte (STLB/Heinze) im anwenderübergreifenden Pool?
- Preise für STLB-BauZ, STLK online, DBD-BIM; Verfügbarkeit/Lizenz der DIN SPEC 91400.
- Gibt es Rechtsprechung zum Urheberrechtsschutz einzelner LV-Texte? (noch nicht recherchiert)
- Status von **ARCHITEXT Pallas Online** (Neubuchungsstopp, Verlängerung nur bis 31.12.2025) – Herstellerseite
  [64] war bei der Nachprüfung am 2026-11-09 nicht abrufbar (HTTP 403); nicht verifiziert.

**Fragen an den Architekten-Freund:**
1. Welche Textquellen nutzt du heute in NOVA (STLB-Bau Online? Paket? Heinze-VOB? Herstellertexte?
   eigene Vorlagen?) und was kosten sie pro Jahr zusätzlich zum NOVA-Abo?
2. Grob: Wie viel Prozent deiner Positionen sind STLB-Bau, eigene Freitexte, Herstellertexte?
3. Verlangen deine öffentlichen Auftraggeber STLB-Bau oder einen STLB-Bau-Check? Welche Auftraggeber
   (Bund, Land, Kommune)?
4. Wie pflegst du Vorbemerkungen und Baubeschreibung – gibt es einen Bürostandard, und wo hakt es?
5. Wie gehst du bei Privatkunden mit Leitfabrikaten um, wie bei öffentlichen mit „oder gleichwertig“?
6. Nutzt du SmartPool oder NEO, und was erwartest du von KI-Unterstützung?
7. Würdest du eigene Texte (bereinigt) für eine offene Bibliothek beisteuern?

## Quellen

[1] STLB-Bau (Produktseite) – GAEB – https://www.gaeb.de/de/produkte/stlb-bau/ – Primärquelle – abgerufen 2026-11-09
[2] STLB-Bau-FAQ – GAEB – https://www.gaeb.de/de/service/faq/stlb-bau-faq/ – Primärquelle – abgerufen 2026-11-09
[3] STLB-Bau Anwendung-FAQ – GAEB – https://www.gaeb.de/de/service/faq/stlb-bau-anwendung-faq/ – Primärquelle – abgerufen 2026-11-09
[4] STLB-Bau Zusatztools-FAQ – GAEB – https://www.gaeb.de/de/service/faq/stlb-bau-zusatztools-faq/ – Primärquelle – abgerufen 2026-11-09
[5] GAEB-FAQ – GAEB – https://www.gaeb.de/de/service/faq/gaeb-faq/ – Primärquelle – abgerufen 2026-11-09
[6] Erlasse (Übersicht) – GAEB – https://www.gaeb.de/de/service/erlasse/ – Primärquelle – abgerufen 2026-11-09
[7] Einführungserlass STLB-Bau vom 03.08.1998 (BI2-B 1051 b-00/5) – Bundesministerium für Raumordnung, Bauwesen und Städtebau – https://www.gaeb.de/wp-content/uploads/2019/04/Einfuehrungserlass.pdf (gelesen über Kopie https://www.dbd.de/media/87bf4fd2-4cc5-406f-90b7-eaf454f2589e-STLB-Bau_Einfuehrungserlass.pdf) – Primärquelle (Erlass) – abgerufen 2026-11-09
[8] Folgeerlass STLB-Bau Version 2026-04 vom 18.06.2026 (BII1-70419/4#27) mit Anlage „Leistungsbereiche, Stand April 2026“ – BMWSB – https://www.gaeb.de/wp-content/uploads/2026/08/Erlass_2026-06-18-BII1-70419_427_STLB-Bau-2026-04.pdf (gelesen über Kopie https://www.dbd.de/media/3e029198-d09e-4647-bf70-62206560a0df-STLB-Bau_Folgeerlass.pdf) – Primärquelle (Erlass) – abgerufen 2026-11-09
[9] Vergabe- und Vertragshandbuch für die Baumaßnahmen des Bundes (VHB 2017), Lesefassung (Dateiname 2023; Fußzeilen der Richtlinienseiten teils „Ausgabe 2017 – Stand 2019“), Richtlinien 100 und 611 – BMWSB/Fachinformationen Bund – https://www.fib-bund.de/Inhalt/Vergabe/VHB/VHB_2017_Lesefassung_2023.pdf – Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
[10] STLB-BauZ (Produktseite) – GAEB – https://www.gaeb.de/de/produkte/stlb-bauz/ – Primärquelle – abgerufen 2026-11-09
[11] Downloads GAEB-Datenaustausch – GAEB – https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/ – Primärquelle – abgerufen 2026-11-09
[12] Fachdokumentation GAEB DA XML 3.3, Ausgabe 2023-01 – GAEB – https://www.gaeb.de/wp-content/uploads/2023/09/Fachdokumentation_GAEB-DA-XML_3.3_2023-01.pdf – Primärquelle – abgerufen 2026-11-09
[13] XML-Schemas Leistungsverzeichnis GAEB DA XML 3.3 (2021-05), Datei GAEB_DA_XML_Lib_3.3_2021-05.xsd – GAEB – https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Leistungsverzeichnis.zip – Primärquelle – abgerufen 2026-11-09
[14] Was ist neu? STLB-Bau – GAEB – https://www.gaeb.de/de/service/was-ist-neu/was-ist-neu-stlb-bau-single/ – Primärquelle – abgerufen 2026-11-09
[15] Downloads Ausschreibungsvorlagen – GAEB – https://www.gaeb.de/de/service/downloads/ausschreibungsvorlagen/ – Primärquelle – abgerufen 2026-11-09
[16] Startseite Dynamische BauDaten – Dr. Schiller & Partner GmbH – https://www.dbd.de – Herstellerangabe – abgerufen 2026-11-09
[17] STLB-Bau (Produktseite) – DBD – https://www.dbd.de/stlb-bau/ – Herstellerangabe – abgerufen 2026-11-09
[18] Software mit DBD – DBD – https://www.dbd.de/ressourcen/software-mit-dbd/ – Herstellerangabe – abgerufen 2026-11-09
[19] STLB-BauZ – DBD – https://www.dbd.de/stlb-bauz/ – Herstellerangabe – abgerufen 2026-11-09
[20] DBD-KostenAnsätze – DBD – https://www.dbd.de/dbd-kostenansaetze/ – Herstellerangabe – abgerufen 2026-11-09
[21] DBD-BIM – DBD – https://www.dbd.de/dbd-bim/ – Herstellerangabe – abgerufen 2026-11-09
[22] DBD-BIM Elements ersetzt DBD-KostenElemente (07.09.2021, akt. 26.07.2024) – DBD – https://www.dbd.de/news/dbd-bim-elements-ersetzt-dbd-kostenelemente/ – Herstellerangabe – abgerufen 2026-11-09
[23] Unternehmen/Geschichte – DBD – https://www.dbd.de/unternehmen/ – Herstellerangabe – abgerufen 2026-11-09
[24] Facts: Dynamische BauDaten – DBD – https://www.dbd.de/facts/dynamische-baudaten/ – Herstellerangabe – abgerufen 2026-11-09
[25] Impressum – DBD – https://www.dbd.de/impressum/ – Primärquelle (Impressum) – abgerufen 2026-11-09
[26] AGB der Dr. Schiller & Partner GmbH – Dynamische BauDaten (Stand Mai 2024, inkl. Bedingungen für Offline-/Online-DBD-Produkte und STLB-Bau/STLB-BauZ) – DBD – https://www.dbd.de/allgemeine-geschaeftsbedingungen/ – Primärquelle (Vertragsbedingungen) – abgerufen 2026-11-09
[27] Partner NOVA AVA – DBD – https://www.dbd.de/partner/nova-ava/ – Herstellerangabe – abgerufen 2026-11-09
[28] STLB-Bau Check (13.04.2021) – DBD – https://www.dbd.de/news/stlb-bau-check/ – Herstellerangabe – abgerufen 2026-11-09
[29] STLB-Bau Prospekt (PDF) – DBD – https://www.dbd.de/media/02457435-946a-43ec-8642-40bc780891dc-STLB-Bau-Prospekt.pdf – Herstellerangabe – abgerufen 2026-11-09
[30] Neues in STLB-Bau und Schwerpunkte der Datenpflege 2026-10 (PDF, Oktober 2026) – DBD/DIN – https://www.dbd.de/media/d19b5174-19a2-4af7-b1dd-a56062e67b10-STLB-Bau_Was_ist_neu.pdf – Herstellerangabe – abgerufen 2026-11-09
[31] Lösungen – DBD – https://www.dbd.de/loesungen/ – Herstellerangabe – abgerufen 2026-11-09
[32] Entwickler-Portal (Weiterleitung auf Login beobachtet, Inhalt nicht eingesehen) – DBD – https://www.dbd.de/ressourcen-entwickler/ – Herstellerangabe – abgerufen 2026-11-09
[33] STLB-Bau Online (Startseite) – DIN Bauportal GmbH – https://www.stlb-bau-online.de/ – Herstellerangabe – abgerufen 2026-11-09
[34] Über STLB-Bau – DIN Bauportal GmbH – https://www.stlb-bau-online.de/ueber-stlb-bau – Herstellerangabe – abgerufen 2026-11-09
[35] Allgemeine Nutzungsbedingungen der DIN Bauportal GmbH für STLB-Bau online mit Zusatzmodulen (Stand März 2024) – DIN Bauportal GmbH – https://www.stlb-bau-online.de/agb/dinbp/ – Primärquelle (Vertragsbedingungen) – abgerufen 2026-11-09
[36] STLB-Bau (Pakete und Preise) – ORCA Software GmbH – https://www.orca-ava.de/stlb-bau/ – Herstellerangabe (Vertriebspartner) – abgerufen 2026-11-09
[37] STLB-Bau „pur“ bestellen – G&W Software Shop – https://shop.gw-software.de/ausschreibungstexte/stlb-bau/stlb-bau-pur/ – Herstellerangabe (Vertriebspartner) – abgerufen 2026-11-09
[38] STLB-Bau Ausschreibungstexte und DBD-BauPreis – WESA Software GmbH – https://www.wesa-software.de/stlb-bau-dynamische-baudaten – Herstellerangabe (Vertriebspartner) – abgerufen 2026-11-09
[39] Jetzt kommt STLB-Bau aus der Cloud in AVA (02.08.2015) – bauprofessor.de (f:data) – https://www.bauprofessor.de/news/jetzt-kommt-stlb-bau-aus-cloud-in-ava/ – Presse (herstellernah) – abgerufen 2026-11-09
[40] STLB-Bau per Klick aus der Cloud (04.04.2019) – bauprofessor.de – https://www.bauprofessor.de/news/stlb-bau-per-klick-aus-der-cloud/ – Presse (herstellernah) – abgerufen 2026-11-09
[41] Neue Generation STLB-Bau (06.01.2020) – bauprofessor.de – https://www.bauprofessor.de/news/neue-generation-stlb-bau/ – Presse (herstellernah) – abgerufen 2026-11-09
[42] Standardleistungstexte (14.05.2016) – bauprofessor.de – https://www.bauprofessor.de/standardleistungstexte/ – Presse/Fachlexikon – abgerufen 2026-11-09
[43] STLK – Standardleistungen Straßen- und Brückenbau – bauprofessor.de – https://www.bauprofessor.de/stlk-standardleistungen-strassen-und-brueckenbau/ – Presse/Fachlexikon – abgerufen 2026-11-09
[44] Allgemeines Rundschreiben Straßenbau Nr. 14/2026 vom 26.06.2026: STLK Ausgabestand 06/26 – Bundesministerium für Verkehr (Kopie Ingenieurkammer) – https://www.ingenieurkammer.de/fileadmin/dokumente/News/PDF-Dateien/ARS_14-2026_STLK_mit_Anlage.pdf – Primärquelle (Rundschreiben) – abgerufen 2026-11-09
[45] STLK online – f:data GmbH – https://www.stlk.de – Herstellerangabe – abgerufen 2026-11-09
[46] Leistungsbeschreibung im Straßen- und Brückenbau (RLK StB-By, LB StB-By) – Bayerisches Staatsministerium für Wohnen, Bau und Verkehr – https://www.stmb.bayern.de/vum/strasse/bauunderhalt/regelwerke/leistungsbeschreibung/index.php – Primärquelle – abgerufen 2026-11-09
[47] AMEV – Startseite, Vertragsmuster und „Wartung 2018“ – Arbeitskreis Maschinen- und Elektrotechnik staatlicher und kommunaler Verwaltungen (BMWSB) – https://www.amev-online.de/AMEVInhalt/Betriebsfuehrung/Vertragsmuster/Wartung%202018/ – Primärquelle – abgerufen 2026-11-09
[48] Infoplattform mit Ausschreibungstexten von über 600 Produktherstellern (01.12.2020) – Deutsches Handwerksblatt – https://www.handwerksblatt.de/betriebsfuehrung/infoplattform-mit-ausschreibungstexten-von-ueber-600-produktherstellern-bauprodukte-know-how-gebuendelt-und-direkt-digital-abrufbar – Presse – abgerufen 2026-11-09
[49] INFRALAN auf ausschreiben.de (05.07.2021) – EFB-Elektronik GmbH – https://www.efb-elektronik.de/en/blog/bc7013c5c2f341e8b43c8f3fa82c7514 – Herstellerangabe (Bauprodukthersteller) – abgerufen 2026-11-09
[50] Firmenprofil ORCA Software GmbH – Softguide – https://www.softguide.de/firma/orca-software-gmbh – Bewertungs-/Verzeichnisportal – abgerufen 2026-11-09
[51] ORCA AVA (Startseite) – ORCA Software GmbH – https://www.orca-ava.de/ – Herstellerangabe – abgerufen 2026-11-09
[52] ausschreiben.de (Startseite, HTML-Quelltext) – ORCA Software GmbH – https://www.ausschreiben.de/ – Herstellerangabe – abgerufen 2026-11-09
[53] Whitepaper „5 Schritte zu Ihrem Ausschreibungstext“ (Stand 03/2024) – ORCA Software GmbH (via baulinks.de) – https://www.baulinks.de/bkd_file/orca-software/ORCA_5_Schritte_zu_Ihrem_Ausschreibungstext_20250221.pdf – Herstellerangabe – abgerufen 2026-11-09
[54] Ausschreibungstexte (Tools, AT-Manager) – Heinze GmbH – https://www.heinze.de/tools/ausschreibungstexte – Herstellerangabe – abgerufen 2026-11-09
[55] Heinze (Startseite, Kennzahlen) – Heinze GmbH – https://www.heinze.de/ – Herstellerangabe – abgerufen 2026-11-09
[56] Nutzungsbedingungen – Heinze GmbH – https://www.heinze.de/nutzungsbedingungen/ – Primärquelle (Vertragsbedingungen) – abgerufen 2026-11-09
[57] Heinze Ausschreibungstexte (VOB-konform) – Heinze GmbH – https://www.heinze-ausschreibungstexte.de – Herstellerangabe – abgerufen 2026-11-09
[58] Nutzungsbedingungen Heinze Ausschreibungstexte – Heinze GmbH – https://www.heinze-ausschreibungstexte.de/nutzungsbedingungen/ – Primärquelle (Vertragsbedingungen) – abgerufen 2026-11-09
[59] Anleitung NOVA AVA – Heinze GmbH – https://www.heinze-ausschreibungstexte.de/nova-ava/ – Herstellerangabe – abgerufen 2026-11-09
[60] Impressum BauNetz Wissen – Heinze GmbH – https://www.baunetzwissen.de/impressum – Primärquelle (Impressum) – abgerufen 2026-11-09
[61] SIRADOS (Startseite, Shop) – WEKA Intelligence GmbH & Co. KG – https://www.sirados.de – Herstellerangabe – abgerufen 2026-11-09
[62] SIRADOS 365 Ausschreibungstexte – WEKA Intelligence – https://www.sirados.de/architektur-ausschreibungstexte – Herstellerangabe – abgerufen 2026-11-09
[63] SIRADOS Softwarepartner – WEKA Intelligence – https://www.sirados.de/softwarepartner – Herstellerangabe – abgerufen 2026-11-09
[64] ARCHITEXT AVA Software (Startseite) – NOVA Building IT GmbH – https://architext.de/ – Herstellerangabe – abgerufen 2026-11-09
[65] ARCHITEXT Ausschreibungstexte – NOVA Building IT GmbH – https://architext.de/ausschreibungstexte/ – Herstellerangabe – abgerufen 2026-11-09
[66] ausschreibungstexte.de (HTTP-Weiterleitung, eigene Prüfung per curl) – http://www.ausschreibungstexte.de/ – Primärquelle (Beobachtung) – abgerufen 2026-11-09
[67] G&W Software (Startseite, Partnerlösungen) – G&W Software AG – https://www.gw-software.de/ – Herstellerangabe – abgerufen 2026-11-09
[68] NOVA AVA (Startseite, News BIM World 2026) – NOVA Building IT GmbH – https://nova-ava.de/ – Herstellerangabe – abgerufen 2026-11-09
[69] NEO – die Baukosten-KI – NOVA Building IT GmbH – https://nova-ava.de/neo-baukosten-ki/ – Herstellerangabe – abgerufen 2026-11-09
[70] NOVA SmartPool – NOVA Building IT GmbH – https://nova-ava.de/funktionen/nova-smartpool/ – Herstellerangabe – abgerufen 2026-11-09
[71] Ausschreibungstexte im Bauwesen (08.12.2025) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/blog/ausschreibungstexte/ – Herstellerangabe – abgerufen 2026-11-09
[72] NEVARIS Build KI – NEVARIS Bausoftware GmbH – https://www.nevaris.com/build-ki/ – Herstellerangabe – abgerufen 2026-11-09
[73] Cosuno (Startseite) – Cosuno Ventures GmbH – https://www.cosuno.com/de – Herstellerangabe – abgerufen 2026-11-09
[74] Ausschreibungsprogramm für Architekten: Vorbemerkungen, Standards (Thread 2009/2010) – bau.de Forum – https://bau.de/forum/architektur/11085.php – Forum – abgerufen 2026-11-09
[75] § 7 VOB/A Leistungsbeschreibung (Fassung 2019) – dejure.org – https://dejure.org/gesetze/VOB-A/7.html – Primärquelle (Regelwerk, Wiedergabe) – abgerufen 2026-11-09
[76] § 7a VOB/A Technische Spezifikationen – dejure.org – https://dejure.org/gesetze/VOB-A/7a.html – Primärquelle (Regelwerk, Wiedergabe) – abgerufen 2026-11-09
[77] § 7b VOB/A Leistungsbeschreibung mit Leistungsverzeichnis – dejure.org – https://dejure.org/gesetze/VOB-A/7b.html – Primärquelle (Regelwerk, Wiedergabe) – abgerufen 2026-11-09
[78] § 121 GWB Leistungsbeschreibung – gesetze-im-internet.de – https://www.gesetze-im-internet.de/gwb/__121.html – Gesetz – abgerufen 2026-11-09
[79] § 31 VgV Leistungsbeschreibung – gesetze-im-internet.de – https://www.gesetze-im-internet.de/vgv_2016/__31.html – Gesetz – abgerufen 2026-11-09
[80] § 2 VgV Vergabe von Bauaufträgen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/vgv_2016/__2.html – Gesetz – abgerufen 2026-11-09
[81] § 310 BGB Anwendungsbereich (AGB) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__310.html – Gesetz – abgerufen 2026-11-09
[82] § 2 UrhG Geschützte Werke – gesetze-im-internet.de – https://www.gesetze-im-internet.de/urhg/__2.html – Gesetz – abgerufen 2026-11-09
[83] § 5 UrhG Amtliche Werke – gesetze-im-internet.de – https://www.gesetze-im-internet.de/urhg/__5.html – Gesetz – abgerufen 2026-11-09
[84] § 44b UrhG Text und Data Mining – gesetze-im-internet.de – https://www.gesetze-im-internet.de/urhg/__44b.html – Gesetz – abgerufen 2026-11-09
[85] § 87a UrhG Begriffsbestimmungen (Datenbank) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/urhg/__87a.html – Gesetz – abgerufen 2026-11-09
[86] § 87b UrhG Rechte des Datenbankherstellers – gesetze-im-internet.de – https://www.gesetze-im-internet.de/urhg/__87b.html – Gesetz – abgerufen 2026-11-09
[87] Vergabe- und Vertragsordnung für Bauleistungen – Wikipedia (de) – https://de.wikipedia.org/wiki/Vergabe-_und_Vertragsordnung_f%C3%BCr_Bauleistungen – Sekundärquelle (Enzyklopädie) – abgerufen 2026-11-09
[88] Preise (u. a. Datenbanken: „STLB-Bau ab 990 €“ Miete pro Jahr) – SJ Software GmbH – https://www.sj-software.de/preise – Herstellerangabe (Vertriebspartner) – abgerufen 2026-11-09
