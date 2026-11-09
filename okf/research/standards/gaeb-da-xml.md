---
type: Research Note
title: "GAEB DA XML: Standard, Austauschphasen und Datenmodell"
description: "Überblick über den deutschen Datenaustauschstandard GAEB DA XML (Organisation, Versionen, alle Austauschphasen, LV-Datenmodell mit XML-Elementen, Schema-Bezug und Lizenzlage, BVBS-Zertifizierung, Abgrenzung zu ÖNORM A 2063 und SIA 451) als Grundlage für Anforderungen an eine Open-Source-AVA-Software."
resource: https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/
tags: [research, gaeb, gaeb-da-xml, datenaustausch, leistungsverzeichnis, zertifizierung, xsd]
timestamp: 2026-11-09T17:16:17Z
sources: 53
confidence: hoch
---

# GAEB DA XML: Standard, Austauschphasen und Datenmodell

> **Für wen?** Für den Entwickler (kein Architekt) und den Architekten-Freund. Fachbegriffe werden beim ersten Auftreten erklärt.
> **AVA** = Ausschreibung, Vergabe, Abrechnung von Bauleistungen. **LV** = Leistungsverzeichnis (englisch *bill of quantities*, im XML `BoQ`): die nach Ordnungszahlen sortierte Liste aller Teilleistungen (Positionen) einer Ausschreibung mit Menge, Einheit, Text und später Preisen.
> Stand der Recherche: 2026-11-09. Alle XML-Elementnamen wurden direkt in den offiziellen XSD-Dateien nachgeprüft.

## Kurzfassung

- **GAEB DA XML ist das Pflicht-Austauschformat jeder deutschen AVA-Software.** Ohne Import/Export von GAEB-Dateien kann ein Architekturbüro weder Fachplaner-LVs übernehmen noch Angebote von Bietern elektronisch einlesen [5][6][40].
- **Wer steht dahinter:** Der GAEB (Gemeinsamer Ausschuss Elektronik im Bauwesen) ist seit 01.01.2005 Hauptausschuss im DVA (Deutscher Vergabe- und Vertragsausschuss für Bauleistungen); die Geschäftsstelle sitzt beim BBSR im BBR in Bonn; die Arbeitsgruppe 13 pflegt den Datenaustausch; **DIN ist Herausgeber** der Ergebnisse [1][3][13].
- **Aktuell gültig ist Version 3.3** (Fachdokumentation Ausgabe 2023-01; die meisten Schemas tragen Stand 2021-05, nur X31 wurde 2023-01 geändert). **Version 3.4 liegt als Beta „Ausgabe 2026-03" vor** (Dateien seit 11/2025): Hauptthema sind Nachhaltigkeitsdaten (Ökobilanz) je Position; ein Freigabetermin ist nicht veröffentlicht [6][7][8][9][11].
- **Versionen sind untereinander nicht syntaxkompatibel.** Seit 3.2 hat jede Phase *und* jede Version einen eigenen XML-Namespace (z. B. `http://www.gaeb.de/GAEB_DA_XML/DA83/3.3`). Ein Importer muss also mehrere Versionen parallel verstehen [6][15][16][19].
- **Austauschphasen** (Dateiendung `.X81`, `.X83` …): X80–X87 (LV-Daten von Leistungsbeschreibung bis Auftragsbestätigung), X89/X89B (Rechnung bzw. rechnungsbegründende Unterlage), X31 (Mengenermittlung/Aufmaß), X50–X52 (Kosten und Kalkulation), X83Z/X84Z/X86ZR/X86ZE (Zeitverträge), X93–X97 (Handel); Beta: X61 (Raumbuch), X84P (Preisspiegel), X98/X99 [13][18].
- **Für ein Architekturbüro zentral** sind X81/X82 (intern bzw. Kostenanschlag), X83 an Bieter, X84/X85 von Bietern, X86 an den Auftragnehmer sowie X31, X89/X89B vom Auftragnehmer; Nachträge laufen über dieselben Phasen [13].
- **Datenmodell:** Wurzel `GAEB` → `GAEBInfo`, `PrjInfo`, `Award` → `BoQ` mit `BoQInfo` (u. a. OZ-Maske über `BoQBkdn`) und `BoQBody` (rekursive LV-Bereiche `BoQCtgy`, Positionslisten `Itemlist` mit `Item`, `Remark`, `PerfDescr`, `MarkupItem`). Ordnungszahl (OZ) max. 14 Stellen, max. 5 Hierarchiestufen inkl. Los [13][16].
- **Texte** sind ein XHTML-ähnliches Subset (`p`, `span`, `table`, `Image` …) mit CSS-ähnlichem `style`-Attribut; Textergänzungen und Bieterangaben sind eigene Elemente (`TextComplement`) [13][16].
- **Lizenzlage unklar:** Schemas und Fachdokumentation sind kostenlos und ohne Registrierung abrufbar, tragen aber „© … by DIN" ohne ausdrückliche Lizenz; die Schemas „dürfen nicht verändert werden". Das Format selbst nachzuprogrammieren ist nach EU-Rechtsprechung unkritisch, das Mitliefern der XSD-Dateien in einem öffentlichen Repo sollte vorher geklärt werden [7][13][16][45].
- **Zertifizierung** macht der BVBS (Bundesverband Software und Digitalisierung im Bauwesen) in vier Bereichen; gültig 5 Jahre; Erstzertifizierung 2.100 € (Mitglied) bzw. 2.950 € (Nichtmitglied) zzgl. USt und Reisekosten (Stand 09/2021). **NOVA AVA 4** ist für AVA und Bauausführung mit 3.2 und 3.3 gelistet; die 3.3-Urkunden galten aber nur bis 10.10.2026, eine Erneuerung ist nicht belegt. Die Liste nennt keine Daten, „gelistet“ heißt also nicht sicher „gültig“ [21][22][23][53].
- **XSD-Validierung reicht nicht:** Viele Fachregeln (Summen, Rundung, OZ-Eindeutigkeit, Verknüpfungen) stehen nur in Prosa in der Fachdokumentation; das BBSR-Forschungsprojekt „Next Level GAEB" arbeitet an maschinenlesbaren Prüfregeln [13][34].
- **Österreich und Schweiz** haben eigene, inkompatible Formate: ÖNORM A 2063 (XML, Ausgaben 2009/2015/2021) bzw. SIA 451 → heute IfA18/CRBX [47][48][49].

## 1. Organisation: Wer macht GAEB?

| Akteur | Rolle für GAEB DA XML | Quelle |
|---|---|---|
| **GAEB** – Gemeinsamer Ausschuss Elektronik im Bauwesen | Fördert die Datenverarbeitung im Bauwesen; Themen: standardisierte Leistungstexte (STLB-Bau), Regeln für den LV-Aufbau, Datenaustausch, Bauabrechnung. Besteht laut Wikipedia seit 1966. Rund 600 ehrenamtliche Experten in ca. 100 Gremien (Wikipedia nennt ~650). | [2][35] |
| **DVA** – Deutscher Vergabe- und Vertragsausschuss für Bauleistungen | Dachgremium (auch für die VOB). Der GAEB ist seit 01.01.2005 einer von vier Hauptausschüssen (HA GAEB). | [1][3] |
| **GAEB-Geschäftsstelle** | Beim Bundesinstitut für Bau-, Stadt- und Raumforschung (BBSR) im Bundesamt für Bauwesen und Raumordnung (BBR), Bonn, im Geschäftsbereich des Bundesbauministeriums (heute BMWSB). Nimmt Änderungswünsche an. | [3][4][13] |
| **Arbeitsgruppe 13 „Grundsatz Datenaustausch"** | Erarbeitet und pflegt GAEB DA (LV-Aufbau + XML-Schema); Mitglieder u. a. Bundesministerien, Bauverwaltungen, Deutsche Bahn, Kammern, Handwerk, Bauindustrie, Wissenschaft, BVBS, buildingSMART; DIN und Geschäftsstelle ohne Stimmrecht. (Die FAQ nennt sie abweichend „Programmsysteme".) | [3][5] |
| **DIN** – Deutsches Institut für Normung | **Herausgeber** aller GAEB-Arbeitsergebnisse; Copyright-Vermerk auf Fachdokumentation und XSD; Inhaber der Domain gaeb.de. GAEB DA XML ist **keine DIN-Norm**, war aber als DIN PAS 1067 (2006, inzwischen zurückgezogen) dokumentiert. | [3][4][5][13][30] |
| **DIN Media** (früher Beuth Verlag) | Vertrieb von GAEB-Produkten (v. a. STLB-Bau); früher auch der PAS-1067-CD. | [2][5][30] |
| **BVBS** – Bundesverband Software und Digitalisierung im Bauwesen e. V. (früher „Bundesverband Bausoftware") | Führt im Auftrag/Zusammenarbeit mit dem GAEB die **Software-Zertifizierung** durch; sein „AK Datenaustausch" gibt die Prüfkriterien heraus; hostet den GAEB-XML-Checker. | [13][21][22][24] |

**Einschätzung:** Der Standard wird de facto von der öffentlichen Hand (Bund) getragen und von DIN verlegt. Für ein Open-Source-Projekt sind daher zwei Ansprechpartner relevant: die GAEB-Geschäftsstelle (fachlich, Änderungswünsche) und DIN (Rechte an Texten und Schemas). Details zu STLB-Bau siehe [Leistungstexte: STLB-Bau, Herstellertexte, Textbibliotheken und Lizenzen](/okf/research/standards/stlb-bau-tender-texts.md).

## 2. Versionen und Geschichte

### 2.1 Zeitleiste

| Generation | Zeit | Merkmale | Dateiendung | Status 2026 | Quelle |
|---|---|---|---|---|---|
| Lochkarten-/Zeilenformat | ab 1974 | Ursprung des zeilenorientierten Formats | – | historisch | [36] |
| GAEB DA 1985 | 1985 | zeilenorientiert | D/K + Phase | nicht mehr verwendet | [13][39] |
| **GAEB 90** (DA 1990) | 1990 | feste Zeilen à 80 Zeichen (Satzart vorn, Zeilennummer hinten), nur ASCII; OZ max. 9 Stellen, 4 Hierarchiestufen, Langtext max. 999 Zeilen unformatiert, 4 EP-Anteile | `.D81`–`.D86` (+ D11 für REB-Aufmaß) | wird laut Herstellern noch angetroffen | [32][36][39][52] |
| **GAEB DA 2000** (Versionen 1.0–1.2) | 1999 | schlüsselwortorientiert (Tag-Syntax), OZ 14 Stellen, 5 Stufen, formatierter Text (RTF), 6 EP-Anteile | `.P81`–`.P86` (ab 1.2) | kaum verbreitet | [32][36][39] |
| GAEB DA XML 2.0 / 2.1 | 2002 | GAEB 2000 in XML abgebildet | `.X8x` | veraltet | [13][36] |
| GAEB DA XML 3.0 | 2004 (Namespace endet auf `/200407`) | Neuentwurf mit englischen Elementnamen | `.X8x` | veraltet | [19][20][36] |
| DIN PAS 1067 | 2006 | Veröffentlichung von GAEB DA XML als DIN-PAS | – | zurückgezogen | [30] |
| GAEB DA XML 3.1 | 20.11.2007, überarbeitet 2009-12 | „abgeschlossene" XML-Fassung; ein gemeinsamer Namespace für alle Phasen | `.X8x` | BVBS zertifiziert noch | [7][19][33] |
| GAEB DA XML 3.2 | Stand 2013-10 (Fachdoku vom 10.12.2013; laut engl. GAEB-Seite gültig ab 15.10.2013) | neu: X31, X52, X89; Zeitvertragsphasen; ab hier Namespace je Phase; nicht syntaxkompatibel zu 3.1 | `.X8x` | noch verbreitet | [15][19][20] |
| **GAEB DA XML 3.3** | erste Fassung 2019 (Hersteller-Support ab 09/2019), **Ausgabe 2021-05** (Fachdoku 31.05.2021) zur Anwendung freigegeben, **Stand 2023-01** (Fachdoku 31.01.2023) | GUIDs/Katalogzuordnung für BIM, neu X50/X51 und X89B; 2023-01: X31 mit eingebetteten Bildern/PDF (Base64) | `.X8x`, `.X31` … | **aktuell gültig** | [11][12][13][14][35][37] |
| **GAEB DA XML 3.4 Beta** | „Ausgabe 2026-03", Dateien veröffentlicht 11/2025 | Nachhaltigkeitskataloge und -indikatoren je Position, IBAN-Prüfung, vereinfachte Bankverbindung, Namespace `…/3.4` | `.X8x` | Beta „für Testzwecke", laut Downloadseite „keine derzeit eingeführte und gültige Version" | [7][8][9][10] |

**Widersprüche in den Quellen:** Ein GAEB/BBR-Flyer (ca. 2010–2013) und Wikipedia datieren „GAEB DA XML" auf 2009 [32][35]; die Fachdokumentation selbst nennt 2002 als Jahr der ersten XML-Beschreibung [13], ein Hersteller 2004 für 3.0 [36]. Plausibel ist: 2009 bezieht sich auf die damals aktuelle Fassung 3.1 (2009-12). Für 3.3 nennen Sekundärquellen sowohl „2019" [40] als auch „Sommer 2021" [42] – beides stimmt in dem Sinne, dass 2019 erste Fassungen kursierten und 2021-05 die freigegebene Ausgabe ist [12][14][37].

### 2.2 Kompatibilität und Versionserkennung

- **Keine Abwärtskompatibilität:** Die 3.2-Fachdoku erklärt die Syntax ausdrücklich als inkompatibel zu allen Vorgängern einschließlich 3.1; die GAEB-Produktseite sagt dasselbe für 3.3 gegenüber 3.2. GAEB 90 ist zu GAEB DA XML nicht kompatibel; Konverter funktionieren nur für Inhalte, die es in beiden Formaten gibt [5][6][15].
- **Ältere Regelungen werden „fachlich nicht mehr unterstützt"** – der GAEB pflegt nur die jeweils aktuelle Version [6][13].
- **Namespaces (selbst in den XSD geprüft):**

| Version | Namespace-Muster | Besonderheit | Quelle |
|---|---|---|---|
| 3.1 | `http://www.gaeb.de/GAEB_DA_XML/200407` (eine Datei für X81–X83, X85–X87; X84 separat) | importierte noch W3C-XML-Signature | [19] |
| 3.2 | `http://www.gaeb.de/GAEB_DA_XML/DA83/3.2` (je Phase) | Phase-Schemas „redefinieren" eine gemeinsame Bibliothek `GAEB_DA_XML_Lib_3.2_2013-10.xsd` | [19] |
| 3.3 | `http://www.gaeb.de/GAEB_DA_XML/DA83/3.3` (je Phase) | Bibliothek `GAEB_DA_XML_Lib_3.3_2021-05.xsd`; X31 eigenständig | [16][17] |
| 3.4 Beta | `http://www.gaeb.de/GAEB_DA_XML/DA83/3.4` (je Phase) | Bibliothek `GAEB_DA_XML_Lib_3.4_2026-03.xsd` | [9][10] |

- **Erkennung beim Import:** Wurzelelement ist immer `GAEB`; Version und Phase ergeben sich aus dem Namespace, zusätzlich aus `GAEBInfo/Version` + `GAEBInfo/VersDate` und `Award/DP` (Datenphase) [16]. Laut Dangl-Changelog kommen in der Praxis auch Dateien mit ungültiger Phase in `Award/DP` vor [38].
- **Technischer Stolperstein (eigene Prüfung):** Die Phase-Schemas ab 3.2 nutzen `xs:redefine`. Das W3C erklärt dieses Konstrukt in XSD 1.1 für veraltet und hält fest, dass Prozessoren es uneinheitlich interpretieren [46]. Ein selbst geschriebenes Minimal-X83 (Abschnitt 4.12) ließ sich mit Python/lxml (libxml2) gegen das offizielle X83-3.3-Schema validieren. **Einschätzung:** Code-Generatoren aus XSD (z. B. für Java/.NET) können mit `redefine` Probleme haben – vor einer Werkzeugentscheidung testen; mehr dazu in [GAEB in der Praxis: Bibliotheken, Werkzeuge und Interoperabilitätsprobleme](/okf/research/standards/gaeb-tooling-interop.md).

### 2.3 Welche Versionen sind in der Praxis im Einsatz?

- **3.3 dominiert bei zertifizierter Software:** In der BVBS-Liste (abgerufen 2026-11-09) sind im Bereich AVA 27 Produktversionen gelistet, davon 26 mit 3.3, 8 zusätzlich mit 3.2, eine nur mit 3.1/3.2. Bauausführung (= Bieter/Firmenseite): 18 Einträge, alle 3.3, 3 zusätzlich 3.2. Mengenermittlung: 13 Einträge, alle 3.3 [22]. Die Liste nennt keine Gültigkeitsdaten und enthält mindestens einen abgelaufenen Eintrag (NOVA AVA 4, 3.3-Urkunden bis 10.10.2026), die Zahlen sind also gelistete, nicht nachweislich gültige Zertifikate [53].
- **Hersteller empfehlen 3.3 für neue Projekte** (ORCA, Stand Juni 2026) [40].
- **GAEB 90 lebt weiter:** Ein Konverter-Hersteller beschreibt GAEB 90 als wegen seiner Einfachheit noch häufig genutzt; ORCA warnt vor Umlaut-/Kodierungsproblemen bei GAEB 90 [39][40]. Belastbare Marktanteile je Version wurden nicht gefunden.
- **Historische Größenordnung:** Eine BBR-Studie (2007/08) schätzte, dass ein Drittel des deutschen Bauvolumens von 240 Mrd. € (2006), also rund 80 Mrd. €, per GAEB-Datenaustausch abgewickelt wurde; Kernbefund: „GAEB ist nicht gleich GAEB" – die vielen Versionen überfordern die Anwender [33].

## 3. Austauschphasen (Datenaustauschphasen)

Eine **Austauschphase** (auch Datenart, im XML `DP` = *data phase*) beschreibt, *in welchem Schritt des Bauablaufs* eine Datei entsteht und welche Inhalte sie haben darf oder muss. Die Nummer steckt in der Dateiendung: `X` = XML, danach die Phase, z. B. `.X83` [13]. Für jede Phase wird eine eigene Datei erzeugt [13].

### 3.1 Nummernkreise

| Bereich | Inhalt | Quelle |
|---|---|---|
| X31–X39 | Mengenermittlungen | [13] |
| X50–X59 | Kosten- und Kalkulationsdaten | [13] |
| X60–X69 | Raum- und Bauteilinformationen | [13] |
| X80–X89 | LV-Daten (Ausschreibung bis Rechnung) | [13] |
| X90–X99 | Austausch zwischen Ausführung und Hersteller/Handel | [13] |

Phasen mit Endung „0" sind für projektunabhängige Daten (Kataloge) reserviert; X80 darf davon abweichen [13].

### 3.2 Alle Phasen von GAEB DA XML 3.3

Abkürzungen: **AG** = Auftraggeber (Bauherr; das Architekturbüro handelt meist in dessen Auftrag), **AN** = Auftragnehmer (beauftragte Baufirma), **Bieter** = Firma, die ein Angebot abgibt. Richtung = Einschätzung aus den Phasenbeschreibungen der Fachdoku [13] und Herstellerangaben [40], sofern nicht ausdrücklich angegeben.

| Phase | Name | Zweck | Typisch: von → an | AVA-Schritt | Paket / Status | Quelle |
|---|---|---|---|---|---|---|
| **X31** | Mengenermittlung | Aufmaß-/Mengenermittlungszeilen nach REB-VB 23.003 (Ausgaben 1979/2009), auch für OZ > 9 Stellen; seit 2023-01 mit eingebetteten Bildern/PDF | AN ↔ AG/Planer | Abrechnung (LPH 8) | Mengenermittlung 2023-01 | [11][13] |
| X50 (.1/.2) | Baukostenkatalog | projektneutrale Kostenkataloge zu Bauteilen/Elementen; .1 = Bezeichner je Ebene zusammengesetzt, .2 = vollständiger Bezeichner (z. B. DIN-276-Struktur) | Datenbankanbieter/Planer → Planer | Kostenplanung | Kosten & Kalkulation 2021-05 | [13][18] |
| X51 (.1/.2) | Kostenermittlung | Kostenschätzung, -berechnung, -anschlag, -feststellung (z. B. nach DIN 276) | Planer → AG | Kostenplanung | Kosten & Kalkulation 2021-05 | [13][18] |
| X52 | Kalkulationsdaten | Kostenansätze je Position auf Hauptkostenarten, z. B. in Bietergemeinschaften | Bieter ↔ Bieter; Baudatenbank → Kalkulation | Angebotskalkulation (Firmenseite) | Kosten & Kalkulation 2021-05 | [13] |
| X61 | Raumbuch | Raum- und Gebäudebuch | Planer ↔ Planer/Betreiber | Planung/Betrieb | **Beta** | [13][18] |
| **X80** | Universelle LV-Daten | LV-Daten ohne Bindung an einen Prozessschritt, kaum Pflichtfelder (z. B. Vorlagen, Musterleistungsverzeichnisse) | beliebig | – | LV 2021-05 | [13] |
| **X81** | Leistungsbeschreibung | LV (meist ohne Preise) mit Baubeschreibung/Anlagen | Planer → AG bzw. Fachplaner → Architekt | Vorbereitung der Vergabe (LPH 6) | LV 2021-05 | [5][13] |
| **X82** | Kostenanschlag | LV mit geschätzten Preisen; Basis für Vergabeentscheidung und Kostenkontrolle | Planer → AG | LPH 6/7 | LV 2021-05 | [13] |
| **X83** | Angebotsaufforderung | LV ohne Preise an interessierte Firmen; auch für Nachtragsangebote | AG/Planer → Bieter (oft über e-Vergabe-Plattform) | Ausschreibung (LPH 6/7) | LV 2021-05 | [5][13] |
| **X84** | Angebotsabgabe | Bieter ergänzt Preise, Bietertextergänzungen, freie Mengen; auch Nachtragsangebote | Bieter → AG/Planer | Angebotsprüfung, Preisspiegel (LPH 7) | LV 2021-05 | [5][13] |
| X84P | Preisspiegel | Zusammenfassung von X83 + beliebig vielen X84 mit Anmerkungen | AG intern / AG → Dritte | Wertung (LPH 7) | **Beta** | [13][18] |
| **X85** | Nebenangebot | vollständiges Alternativangebot des Bieters; auch unaufgeforderte Nachträge (Nachtragsanzeige) | Bieter/AN → AG | LPH 7 bzw. LPH 8 | LV 2021-05 | [13] |
| **X86** | Auftragserteilung | Zuschlag/Auftrag an den Bieter mit dem wirtschaftlichsten Angebot; enthält ggf. beauftragte Nachträge und die Vorgaben des AG zum Rechnungsaufbau | AG → AN | Vergabe (LPH 7) | LV 2021-05 | [13] |
| X87 | Auftragsbestätigung | Bestätigung durch den AN (Nachtrag ggf. geändert) | AN → AG | nach Vergabe | LV 2021-05 | [13] |
| **X89** | Rechnung | vollständige, rechtskonforme Rechnung inkl. Mengen und ggf. Zahlungshistorie, wenn kein anderes E-Rechnungsformat genutzt wird | AN → AG | Rechnungsprüfung (LPH 8) | Rechnung 2021-05 | [13] |
| **X89B** | Rechnung – rechnungsbegründende Unterlage | LV-basierte Begründung zu einer E-Rechnung (z. B. XRechnung/ZUGFeRD), selbst **keine** Rechnung im handelsrechtlichen Sinn | AN → AG | Rechnungsprüfung (LPH 8) | Rechnung 2021-05 (neu in 3.3) | [6][13] |
| X83Z | Angebotsaufforderung (Zeitvertrag) | Rahmen-LV; im Auf- und Abgebotsverfahren mit Preisvorgabe des AG | AG → Bieter | Rahmenverträge Bauunterhalt | Zeitvertrag 2021-05 | [13] |
| X84Z | Angebotsabgabe (Auf-/Abgebot) | prozentuale Auf-/Abgebote je Leistungsbereich, Materialzuschläge, Stundensätze | Bieter → AG | dito | Zeitvertrag 2021-05 | [13] |
| X86ZR | Rahmenauftrag | Beauftragung des Rahmenvertrags | AG → AN | dito | Zeitvertrag 2021-05 | [13] |
| X86ZE | Einzelauftrag | Abruf einer konkreten Leistung aus dem Rahmenvertrag | AG → AN | dito | Zeitvertrag 2021-05 | [13] |
| X93 | Handel-Preisanfrage | Materialpreisanfrage zum LV | Bieter → Hersteller/Handel | Angebotskalkulation | Handel 2021-05 | [13] |
| X94 | Handel-Preisangebot | Preisangebot zurück | Handel → Bieter | dito | Handel 2021-05 | [13] |
| X96 | Handel-Bestellung | Bestellung/Abruf | AN → Handel | Ausführung | Handel 2021-05 | [13] |
| X97 | Handel-Auftragsbestätigung | Bestätigung | Handel → AN | Ausführung | Handel 2021-05 | [13] |
| X98 / X99 | Handel-Lieferschein / -Rechnung | Lieferung bzw. Lieferantenrechnung | Handel → AN | Ausführung | **Beta** | [13][18] |

**Wichtige Regeln zu den Phasen** [13]:
1. **Beta-Phasen** (X61, X84P, X98, X99) dürfen prototypisch genutzt werden; sie können freigegeben werden, wenn **mindestens zwei Prototypen** erfolgreich erprobt sind.
2. **Nachträge** (Zusatzleistungen nach Vertragsschluss) verwenden dieselben Phasen wie der Hauptauftrag (X83 Aufforderung, X84 Nachtragsangebot, X85 Nachtragsanzeige ohne Aufforderung, X86 Beauftragung, X87 Bestätigung, X89 Abrechnung). Jede Nachtragsposition trägt eine Nachtragsnummer (`CONo`) und einen Status (`COStatus`: erkannt, angemeldet, angeboten, zurückgezogen, abgelehnt, Widerspruch, sachlich anerkannt, genehmigt). Abgerechnet werden darf nur ein genehmigter Nachtrag (`Approved`).
3. **X84 muss Projekt-, LV- und Strukturdaten unverändert aus der X83 übernehmen**; ein in X83 vergebener eindeutiger Schlüssel (`AwardInfo/BoQID`) wird unverändert zurückgegeben; Textergänzungsnummern bleiben gleich.
4. **`GAEBInfo` beschreibt immer das exportierende Programm** – beim Erzeugen einer X84 darf es nicht aus der eingelesenen X83 kopiert werden.
5. **Nicht angeboten ≠ 0,00 €:** Bietet ein Bieter eine Position nicht an, wird kein Einheitspreis übertragen und die Position als „nicht angeboten" (`NotOffered`) markiert; ein Preis von 0,00 ist ein echter Preis.

Zu Vergaberecht und e-Vergabe-Plattformen siehe [Vergaberecht und E-Vergabe bei öffentlichen Auftraggebern](/okf/research/standards/procurement-law-e-vergabe.md). Laut ORCA (Stand Juli 2026) ist der öffentliche AG grundsätzlich frei in der Wahl des Austauschformats, GAEB hat sich aber als gängiges Format durchgesetzt [41]. Auf der GAEB-Erlass-Seite sind nur STLB-Bau-Erlasse des Bundes gelistet, kein eigener Erlass zur GAEB-DA-Version [28].

### 3.3 Typischer Ablauf aus Sicht eines Architekturbüros (öffentlicher oder privater AG)

1. **LV erstellen** (eigenes LV, ggf. Fachplaner-LVs z. B. der Haustechnik als X81/X83 importieren) – intern ggf. X81, mit geschätzten Preisen als **X82 (Kostenanschlag)** zur Kostenkontrolle.
2. **Ausschreiben:** **X83** erzeugen und mit den Vergabeunterlagen an Bieter bzw. auf eine e-Vergabe-Plattform geben; Nebenangebote und Bieterkommentare ggf. in X83 zulassen (`PrjInfo/AlterBidPerm`, `PrjInfo/BidCommPerm`) [16].
3. **Angebote einlesen:** **X84** (Hauptangebote) und **X85** (Nebenangebote) importieren, Preisspiegel bilden (der Preisspiegel-Austausch X84P ist nur Beta).
4. **Vergeben:** **X86** an den Auftragnehmer (inkl. Rechnungsaufbau-Vorgaben des AG); der AN kann mit **X87** bestätigen.
5. **Bauausführung/Abrechnung:** Aufmaße als **X31** (oder in X86–X89 eingebettet), Rechnungen als **X89** oder E-Rechnung + **X89B**; Nachträge über X83/X84/X85/X86 mit Nachtragsnummer.

Prozessdetails: [Der AVA-Prozess I](/okf/research/process/tendering-and-award.md), [Der AVA-Prozess II](/okf/research/process/billing-and-cost-control.md).

## 4. Datenmodell des Leistungsverzeichnisses

### 4.1 Dokumentstruktur (vereinfacht, Elemente aus den 3.3-XSD [16][17])

```text
GAEB                                   Wurzel; Namespace je Phase/Version
├─ GAEBInfo   Version, VersDate, Date, Time, ProgSystem, ProgName, Certific
├─ PrjInfo    NamePrj, PrjID, LblPrj, Cur, BidCommPerm, AlterBidPerm, UPFracDig, AddText, CtlgAssign
├─ Award      (X80–X87; in X89/X89B stattdessen "Invoice")
│  ├─ DP           Datenphase, z. B. 83
│  ├─ AwardInfo    BoQID, Cat (Vergabeart), Cur, OpenDate, ContrNo, COInfo, CashDiscount …
│  ├─ OWN / CTR    Auftraggeber / Auftragnehmer bzw. Bieter (CTR z. B. in X84, X86)
│  └─ BoQ @ID      das Leistungsverzeichnis
│     ├─ BoQInfo   Name, LblBoQ, OutlCompl, BoQBkdn (1–7×), NoUPComps, LblUPComp1–6, Ctlg, Totals …
│     ├─ BoQBody   Remark | PerfDescr | BoQCtgy* | Itemlist
│     │  └─ BoQCtgy @RNoPart   LV-Bereich (Los, Titel …): LblTx, Totals, BoQBody (rekursiv)
│     │     └─ Itemlist        Remark | PerfDescr | Item @RNoPart @RNoIndex | MarkupItem
│     └─ LotGrp    Losgruppen
└─ AddText    Zusatztexte
```

### 4.2 Ordnungszahl (OZ) und OZ-Maske

- Die **Ordnungszahl (OZ)** ist die eindeutige, aufsteigende Nummer jeder Position im LV (inkl. aller Nachträge). Sie besteht aus den Teilschlüsseln der Hierarchiestufen, dem Positionszähler und optional einem **einstelligen Index**; **insgesamt max. 14 Stellen** [13].
- Erlaubte Zeichen: Leerzeichen, Ziffern, Großbuchstaben, Unterstrich, Kleinbuchstaben – in genau dieser Sortierreihenfolge; Umlaute und ß sind verboten [13].
- **Hierarchiestufen:** bis zu **5 Stufen einschließlich Los**. Das **Los** (Teil der Gesamtleistung, der getrennt vergeben werden kann; Teillos = örtlich, Fachlos = nach Gewerk) ist immer die oberste Stufe und heißt fest „Los"; alle anderen Stufen (z. B. Abschnitt, Titel, Untertitel) benennt der LV-Ersteller frei [13].
- **LV-Bereich** = jeder Knoten einer Hierarchiestufe (z. B. jeder Titel) mit Überschrift und eigener Summe; niedrigere Stufen dürfen unbelegt bleiben (im Druck z. B. mit „_" dargestellt) [13].
- Die **OZ-Maske** (Gliederung) steht in `BoQInfo/BoQBkdn`, einmal je Stufe: `Type` (`Lot`, `BoQLevel`, `Item`, `Index`), `LblBoQBkdn` (Bezeichnung), `Length` (Stellen), `Num` (numerisch ja/nein), `Alignment` (links/rechts bei alphanumerisch). Regeln: `Lot` höchstens einmal und zuerst, `Item` genau einmal, `Index` max. einmal nach `Item` und mit Länge 1, Summe aller Längen ≤ 14 [13][16].
- Jeder Knoten speichert nur seinen **Teilschlüssel** (`@RNoPart`, beim Index `@RNoIndex`); die volle OZ ergibt sich aus dem Pfad [16].

**Beispiel (eigenes):** Maske „Titel 2-stellig, Position 4-stellig, Index" → `BoQBkdn`: BoQLevel/2, Item/4, Index/1. Die Position mit OZ `01.0010.A` liegt im `BoQCtgy RNoPart="01"` als `Item RNoPart="0010" RNoIndex="A"`.

### 4.3 Positionsarten und Kennzeichen

| Positionsart (DE) | Erklärung | XML-Abbildung | Wichtige Regeln | Quelle |
|---|---|---|---|---|
| Normalposition (Normalbeschreibung) | Standardfall: Menge × Einheitspreis = Gesamtbetrag | `Item` ohne Sonderkennzeichen | – | [13] |
| **Bedarfsposition** (= Eventualposition) | Leistung wird nur bei Bedarf ausgeführt | `Provis` = `WithTotal` (mit Gesamtbetrag in der Summe) / `WithoutTotal` („nur Einheitspreis"); `ProvisAccpt` = beauftragt | mit allen Positionsarten kombinierbar; ist sie zugleich Alternative, kein GB | [13][16] |
| **Grundposition / Alternativposition** (= Wahlposition) | AG verlangt Varianten; Bieter muss alle anbieten, AG wählt meist vor Auftrag | Zuordnungszahl aus `ALNGroupNo` (Gruppe, max. 3 Stellen) + `ALNSerNo` (0 = Grundausführung, 1–9 = Alternativen); für ganze Bereiche `ALNBGroupNo`/`ALNBSerNo`; `Accepted` = `AltAccept`/`BasReject` | Alternativen ohne GB; Verknüpfung nur im selben LV-Bereich bzw. derselben Stufe | [13][16] |
| **Pauschalposition** | Pauschalvergütung | `LumpSumItem` | Menge entfällt oder = 1 (in Rechnungen Teilmengen ≤ 1); nicht mit freier Menge kombinierbar | [13][16] |
| Position mit **freier Menge** | Bieter ermittelt die Menge selbst | `QtyTBD` statt `Qty` | kein Mengensplit | [13][16] |
| **Zuschlagsposition** | prozentualer Zuschlag auf Positionen/Bereiche/Teilmengen | eigenes Element `MarkupItem` mit `MarkupType` (`IdentAsMark`, `AllInCat`, `ListInSubQty`), `Markup` (%), `ITMarkup`; betroffene Positionen mit `MarkupIt` | nur Positionen gleichen USt-Satzes; wird in Rechnungen anteilig mit abgerechnet | [13][16] |
| **Stundenlohnarbeiten** | Abrechnung nach Aufwand | `HourIt` | – | [16] |
| Schwerpunktposition | besonders preisrelevante Position | `KeyIt` | – | [16] |
| Vorhalteleistung | z. B. Gerüst: Grundeinsatz, Verlängerung, Vermietung | `HoldOutType` (`BaseUseItem`/`ExtUseItem`/`RentUseItem`), `UseDur`, `UseDurLblTime` (Minute … Monat), `RefBaseItem` | verbundene Positionen gleiche Einheit | [13][16] |
| Position/Bereich entfällt | gestrichen | `NotAppl`, `NotApplBoQ` | in Rechnungen nicht übertragen | [13][16] |
| Nicht angeboten | nur im Angebot | `NotOffered` (nur X84) | kein EP übertragen | [13][16] |
| Nachtragsposition | Zusatzleistung | `CONo`, `COStatus` | siehe Abschnitt 3.2 | [13][16] |
| **Zulageposition** | Praxisbegriff („Zulage zu Pos. …") | **kein eigenes GAEB-Kennzeichen** – weder Fachdoku noch XSD kennen den Begriff | **Einschätzung:** wird als Normalposition mit Textbezug abgebildet; nicht mit der Zuschlagsposition verwechseln | [13][16] |

### 4.4 Beschreibungsformen der Teilleistung

- **Normalbeschreibung:** OZ, Menge, Einheit, vollständiger Text (frei oder standardisiert mit Katalognummer), Positionsart, ggf. Textergänzungen, EP, GB, EP-Anteile, Kalkulationsdaten [13].
- **Leit- und Unterbeschreibung:** Bei sehr langen Texten trägt eine Leitbeschreibung (`SumDescr`) OZ und alle Merkmale, die Unterbeschreibungen (`SubDescr` mit `SubDNo` 1–99, lückenlos) ergänzen Text, ggf. eigene Menge/EP (nur wenn der AG das freischaltet). Unterbeschreibungen werden nicht abgerechnet [13][16].
- **Ausführungsbeschreibung** (`PerfDescr`, Nummer `PerfNo` max. 4-stellig, LV-weit eindeutig): gemeinsamer Textbaustein für mehrere Positionen; steht **vor** den Positionen, die per `RefPerfNo` darauf verweisen und nur den Ergänzungstext tragen [13][16].
- **Bezugs- und Wiederholungsbeschreibung** (`RefDescr` = `Ref`/`Rep`, Verweis `RefRNo`): Wiederholungsposition nennt nur Abweichungen („…, jedoch"); Einheit darf sich nicht ändern; keine Kette von Wiederholungen [13][16].
- **Hinweistexte** (`Remark`, ohne OZ): stehen immer *vor* dem Teil, auf den sie sich beziehen (LV, Bereich, Position), nie innerhalb einer Position [13][16].
- **Zusätzliche Texte / Vorbemerkungen:** am Anfang oder Ende des LV, z. B. Vorbemerkungen oder Baubeschreibung; im XML gibt es dafür `AddText` (Kurz-/Langtext) an mehreren Stellen [13][16]. **Einschätzung:** Je nach Software landen Vorbemerkungen als `Remark` am LV-Anfang oder als `AddText` – beim Import beide Wege unterstützen.

### 4.5 Texte: Kurztext, Langtext, Formatierung

- **Langtext** = rechtlich maßgebliche, vollständige Beschreibung; **Kurztext** = optionale, nicht rechtsverbindliche Kurzbezeichnung (z. B. für Rechnungen), darf leer sein [13]. Pfade: `Description/CompleteText/DetailTxt/Text` (Langtext) und `Description/CompleteText/OutlineText/OutlTxt/TextOutlTxt` (Kurztext); `BoQInfo/OutlCompl` gibt an, ob Kurz-, Lang- oder beide Texte geliefert werden [16].
- **Formatierter Text** ist ein XHTML-ähnliches Subset: `p`, `span`, `div`, `br`, `ul`/`ol`/`li`, `table`/`tr`/`th`/`td`, `Image`, `page`; Formatierung über ein CSS-ähnliches `style`-Attribut (Schrift, Größe, Farbe, Ausrichtung, Ränder, Tabstopps …) [13][16]. Achtung: `p` ist **element-only** – Fließtext muss in `span` stehen (eigene Validierung, Abschnitt 4.12).
- **Grafiken** dürfen in Langtexte eingebettet werden (`Image` mit Typ- und Kodierungsangabe); zusätzlich gibt es `attachment` als URI-Verweis [13][16].
- **Layout wird nicht übertragen:** Deckblatt, Inhaltsverzeichnis, Seitenumbrüche und Druckbild erzeugt die empfangende Software selbst; feste Seitenverweise in Texten sind unzulässig; die Fachdoku zeigt nur Muster für das Druckbild [13].

### 4.6 Textergänzungen und Bieterangaben

- **Textergänzung (TE):** Lücke in einem (meist standardisierten) Text, die der **Aufsteller** (TA, `Kind="Owner"`, z. B. Produktvorgabe „oder gleichwertig") oder der **Bieter** (TB, `Kind="Bidder"`, z. B. angebotenes Fabrikat) füllt. XML: `TextComplement` mit eindeutiger Nummer `@MarkLbl` und `ComplCaption`/`ComplBody`/`ComplTail`; Kennzeichen `ComplTSA`/`ComplTSB` am Langtext bzw. `OutlTSA` am Kurztext [13][16].
- Im Kurztext sind nur Ausschreiber-Ergänzungen erlaubt; Nummern bleiben in X84 unverändert; bei Standardtexten wird „TA"/„TB" in der Zeile der Katalognummer angezeigt [13].
- **Bieterkommentare** (`BidComm`) sind nur erlaubt, wenn der AG sie in X83 freischaltet [13][16].

### 4.7 Mengen, Preise, Preisanteile

| Angabe | XML | Format / Regel | Quelle |
|---|---|---|---|
| Menge | `Qty` | max. 8 Vor- und 3 Nachkommastellen | [13][16] |
| Mengeneinheit | `QU` | **max. 4 Zeichen**; GAEB empfiehlt eine Einheitenliste (STLB-Bau-Downloadbereich) | [13][16] |
| Einheitspreis (EP) | `UP` | 2 Nachkommastellen, auf Wunsch des AG 3 (`PrjInfo/UPFracDig`); bis 10 Vorkommastellen | [13][16] |
| Gesamtbetrag (GB) | `IT` | Menge × EP, gerundet auf 2 Nachkommastellen; bis 11 Vorkommastellen | [13][16] |
| EP-Anteile | `UPComp1`–`UPComp6`, Bezeichnungen `BoQInfo/LblUPComp1–6`, Anzahl `NoUPComps`, Kennzeichen `UPBkdn` | bis zu 6 Anteile, Summe = EP; Kategorien Löhne, Stoffe, Geräte, Sonstiges (entspricht VHB-Formblatt 223) | [13][16] |
| Umsatzsteuer | `VAT` (Position), `Totals/VATPart` | fehlt `VAT`, gilt der übergeordnete Satz | [16] |
| EP bei Mehrmengen | `UP110` | „Einheitspreis bei Mengen > 110 %" (Einschätzung: Bezug zu VOB/B § 2 Abs. 3, siehe [HOAI/VOB-Notiz](/okf/research/standards/hoai-vob-b-c.md)) | [16] |
| Rechnungs-/Prognosemenge | `BillQty` / `PredQty` | Abrechnung bzw. Prognose | [16] |
| Kalkulationsansätze | `CostApproach` (Item), `CostType` (BoQInfo) | X52 und X80 | [13][16] |

**Währung:** Projektwährung (informativ) und LV-Währung (verbindlich für alle Preise) werden getrennt angegeben [13].

### 4.8 Summen, Nachlässe, Rundung, Skonto

- Summen je LV-Bereich, Los, Losgruppe und LV in `Totals` (`Total`, `DiscountPcnt`/`DiscountAmt`, `TotAfterDisc`, `TotalNet`, `VATPart`, `TotalGross` …); bei Nachlass muss die Summe nach Nachlass mitgeliefert werden [13][16].
- **Rundungsregeln** (kaufmännisch): GB = gerundetes Produkt Menge × EP; prozentualer Nachlass wird vom gerundeten GB abgezogen und wieder auf 2 Stellen gerundet; Bereichssummen addieren gerundete Werte; Nachlassbetrag = Differenz der gerundeten Werte; gilt auch für negative Nachlässe (= Zuschläge) [13].
  - Eigenes Rechenbeispiel: 12,345 m² × 47,13 € = 581,81985 → **581,82 €**; 3 % Nachlass: 581,82 × 0,97 = 564,3654 → **564,37 €**; Nachlassbetrag 17,45 €.
- In Rechnungen (X89/X89B) müssen pauschale Nachlässe in prozentuale umgerechnet und an jeder betroffenen Position mitgeführt werden; dafür wird der komplette LV-Baum übertragen [13].
- **Skonto** (`AwardInfo/CashDiscount`, max. 3 Staffeln mit Tagen/Datum und Prozent) [16].

### 4.9 STLB-Bau-Bezüge, Kataloge, Mengensplit und BIM

- **STLB-Bau** (Standardleistungsbuch Bau, standardisierte Texte des GAEB) wird in der Position über `Description/STLBBau` referenziert: `STLBBauCtlg` (Katalog, Version, Leistungsbereich, Gruppe, Kostengruppe) und `STLBBauID` (Merkmals-/Ausprägungs-IDs). Für den Straßen-/Wasserbau-Katalog STLK gibt es `StLNo`, für Mutter-LVs `WICNo` [16]. Lizenzfragen zu STLB-Bau: [STLB-Bau-Notiz](/okf/research/standards/stlb-bau-tender-texts.md).
- **Kataloge und Katalogzuordnung:** `BoQInfo/Ctlg` definiert Kataloge (Typen u. a. DIN 276 in den Fassungen 1981/1993/2006/2008-12/2018-12, Örtlichkeit, Gewerk, Kostenträger, **BIM**, Sonstiges); Positionen, Bereiche, Mengensplits und Aufmaßzeilen verweisen per `CtlgAssign` (`CtlgID`, `CtlgCode`, optional Anteil) darauf [16]. So lassen sich Positionen z. B. DIN-276-Kostengruppen zuordnen – siehe [DIN-276-Notiz](/okf/research/standards/din-276-cost-planning.md).
- **Mengensplit** (`QtySplit`, Teilmenge oder Prozent + Katalogzuordnung): verteilt die Positionsmenge z. B. auf Bauteile/Räume; die Summe muss die Positionsmenge ergeben [13][16].
- **BIM-Verknüpfung (neu in 3.3):** Globale Identifikatoren (GUIDs) – etwa die ID eines Wandobjekts im Gebäudemodell – werden über den Katalogmechanismus an Positionen/Mengensplits gehängt; 3.3 hat außerdem GUID-fähige IDs an `PrjInfo/PrjID`, `AwardInfo/BoQID`, Beschreibungen und Textergänzungen [13][16][37]. Darauf baut der BIM-LV-Container auf (DIN SPEC 91350:2016-11, ersetzt durch DIN 18290-1/-2:2023-11) [31]. NOVA und ORCA nennen öffentlich noch DIN SPEC 91350, G&W DIN 18290; welche Fassung die Produkte tatsächlich schreiben, ist offen (widersprüchlich - siehe Offene Fragen). Details: [BIM und AVA](/okf/research/standards/bim-and-ava.md).

### 4.10 Nebenangebote

- X83 kann Nebenangebote zulassen (`PrjInfo/AlterBidPerm`); X85 muss ein **vollständiges** Nebenangebot enthalten [13][16].
- Jede Position bekommt einen Status `AlterBidStatus`: `Identical` (unverändert, Standard bei fehlendem Merkmal), `N/A` (nicht erforderlich), `Modified`, `New`. Nur bei geänderten/neuen Positionen wird die komplette Position übertragen, sonst nur Preise und Bietertextergänzungen [13][16].

### 4.11 Mengenermittlung (X31) und Rechnung (X89/X89B)

- **X31** ist ein stark reduziertes Schema (eigene Typen, keine `redefine`-Bibliothek): `GAEBInfo` + `QtyDeterm` mit `PrjInfo`, `QtyDetermInfo`, `DP`, `OWN`, `CTR`, `BoQ`; Positionen tragen nur `QtyDeterm` und Katalogzuordnungen [10][13].
- Aufmaßzeilen folgen der **REB-VB 23.003** (Regelungen für die elektronische Bauabrechnung, Verfahrensbeschreibung „Allgemeine Mengenberechnung", Ausgaben 1979/2009; die Ausgabe 2012 gilt für X31 **nicht**). Eine Zeile wird als 80-Zeichen-String im Attribut `QTakeoff/@Row` übertragen; die volle OZ kommt aus der übergeordneten Position [13].
- Importregel: Software ohne REB-Rechenkern übernimmt die mitgelieferte Summe `Qty`; Software mit Rechenkern rechnet selbst – bei Abweichung gilt die eigene Berechnung [13].
- Weit verbreitete, aber **nicht von GAEB geregelte** Erweiterung: `BVBS:Explanation` (56 statt 9 Zeichen Erläuterung) [13].
- Seit 3.3 Ausgabe 2023-01: eingebettete Anlagen (jpeg, gif, png, jpg, bmp, pdf) Base64-kodiert im Bereich `CtlgAttachment`, referenziert über `#Bild <Name>` in der Aufmaßzeile [11][13].
- **X89 Rechnung:** Kopfdaten sind Pflicht; der AG legt den Rechnungsaufbau fest und übermittelt ihn bereits mit X86; X89 muss ohne weitere Dateien eine vollständige, rechtskonforme Rechnung ergeben; Rechnungsmengen in `BillQty`, Prüfvermerke in `CheckNote`; wegen des flexiblen Aufbaus ist eine reine Schema-Prüfung eingeschränkt [13][17].
- **X89B** begleitet E-Rechnungsformate wie XRechnung/ZUGFeRD, die keine LV-Positionen abbilden [6][13]. Zur E-Rechnung siehe [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md).

### 4.12 Welche Positionsdaten sind in welcher Phase vorgesehen?

Aus den offiziellen 3.3-Schemas ausgelesen (✓ = Element im Phase-Schema vorgesehen, nicht zwingend Pflicht; – = nicht vorgesehen) [16][17]:

| Element in `Item` | X80 | X81 | X82 | X83 | X84 | X85 | X86 | X87 | X89 | X89B |
|---|---|---|---|---|---|---|---|---|---|---|
| `Qty` (Menge) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – (`BillQty`) | – (`BillQty`) |
| `QtyTBD` (freie Menge) | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | – | – |
| `QU` (Einheit) | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| `UP`/`IT` (EP/GB) | ✓ | ✓ | ✓ | **–** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `UPComp1–6` (EP-Anteile) | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `BidComm` (Bieterkommentar) | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | ✓ | – | – |
| `Provis`, `LumpSumItem`, `HourIt`, `ALNGroupNo` | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| `NotOffered` | – | – | – | – | ✓ | – | – | – | – | – |
| `QtySplit` (Mengensplit) | ✓ | ✓ | ✓ | ✓ | – | ✓ | ✓ | ✓ | – | – |
| `CostApproach` (Kalkulation) | ✓ | – | – | – | – | – | – | – | – | – |
| `QtyDeterm` (Aufmaß) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `CONo`/`COStatus` (Nachtrag) | ✓ | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | ✓ |
| `AlterBidStatus` | ✓ | ✓ | ✓ | – | – | ✓ | ✓ | ✓ | – | – |
| `CheckNote` (Prüfvermerk) | – | – | – | – | – | – | – | – | ✓ | ✓ |

Lesart: **X83 transportiert keine Preise**; **X84 ist eine Rückmeldung** mit stark reduzierter Position (u. a. `NotOffered`, `Qty`, `UP`, `UPComp1–6`, `DiscountPcnt`, `IT`, `VAT`, `Description` für Bieterergänzungen, `BidComm`, `SubDescr`, `Product`, `QtyDeterm`); Kurz-/Langtext, Menge und Einheit dürfen nur in X84 fehlen [13][16]. X81 erlaubt laut Schema Preise, enthält aber „in der Regel" keine; mitgelieferte Preise in X81/X83 wertet ORCA als Hinweis auf falsches Format oder fehlerhaften Export [13][40].

**Minimalbeispiel X83 (eigenes, gegen das offizielle 3.3-Schema mit lxml validiert):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3">
  <GAEBInfo><Version>3.3</Version><VersDate>2021-05</VersDate>
    <Date>2026-11-09</Date><ProgSystem>Beispiel-AVA</ProgSystem></GAEBInfo>
  <PrjInfo><NamePrj>Kita Musterstadt</NamePrj><Cur>EUR</Cur></PrjInfo>
  <Award>
    <DP>83</DP>
    <AwardInfo><Cur>EUR</Cur><OpenDate>2026-12-01</OpenDate></AwardInfo>
    <BoQ ID="BoQ1">
      <BoQInfo>
        <Name>LV012</Name><LblBoQ>Mauerarbeiten</LblBoQ><OutlCompl>AllTxt</OutlCompl>
        <BoQBkdn><Type>BoQLevel</Type><LblBoQBkdn>Titel</LblBoQBkdn><Length>2</Length><Num>Yes</Num></BoQBkdn>
        <BoQBkdn><Type>Item</Type><Length>4</Length><Num>Yes</Num></BoQBkdn>
      </BoQInfo>
      <BoQBody>
        <BoQCtgy ID="C01" RNoPart="01">
          <LblTx><p><span>Innenwände</span></p></LblTx>
          <BoQBody><Itemlist>
            <Item ID="I0010" RNoPart="0010">
              <Qty>120.000</Qty><QU>m2</QU>
              <Description><CompleteText>
                <DetailTxt><Text>
                  <p><span>Mauerwerk der Innenwand aus Kalksandstein, Dicke 17,5 cm, Fabrikat: </span></p>
                  <TextComplement Kind="Bidder" MarkLbl="1"><ComplBody><p><span></span></p></ComplBody></TextComplement>
                </Text></DetailTxt>
                <OutlineText><OutlTxt><TextOutlTxt><p><span>KS-Mauerwerk 17,5 cm</span></p></TextOutlTxt></OutlTxt></OutlineText>
              </CompleteText></Description>
            </Item>
          </Itemlist></BoQBody>
        </BoQCtgy>
      </BoQBody>
    </BoQ>
  </Award>
</GAEB>
```

Beobachtung bei der Validierung: In X83 sind `BoQInfo/Name`, `LblBoQ` und `OutlCompl` Pflicht, und Text in `p` ohne `span` wird abgewiesen [16].

### 4.13 Weitere Festlegungen mit Implementierungsrelevanz

- **Dateinamen:** Endung `.Xnn` (z. B. `.X86`), Name nach Absprache bis 256 Zeichen [13].
- **Vergabearten** in `AwardInfo/Cat`: z. B. `OpenCall` (öffentliche Ausschreibung), `SelectCall`/`SelectCallPostOpen` (beschränkte Ausschreibung ohne/mit Teilnahmewettbewerb), `NegCont` (freihändige Vergabe), EU-weit `OpenProc`, `ClosedProc`, `NegProc`/`NegProcOpen`, `CompetDialog`, `InnovationPartnership` (neu in 3.3), außerdem `IntNATO` [13][16].
- **Sonderformen:** `SpecialType` = Instandhaltung (`Maint`), Rahmenvertrag (`MastAgree`) oder beides; nur dann dürfen `MaintInfo`/`MastAgrInfo` vorkommen [13][16].
- **Losgruppen** (`LotGrp`) bündeln Lose; ohne Lose keine Losgruppen [13][16].
- **Signatur/Verschlüsselung:** laut GAEB können XML-Dateien verschlüsselt und qualifiziert signiert werden [6]; das 3.1-Schema importierte dafür noch das W3C-Signature-Schema, im 3.3-X89-Schema wurde dieser Import laut Änderungsvermerk entfernt [17][19]. **Einschätzung:** Signaturen erfolgen heute außerhalb des GAEB-Schemas (z. B. auf der e-Vergabe-Plattform).
- **Neu in 3.4 Beta:** `BoQInfo/CtlgSustainability` (Katalog von Nachhaltigkeitsindikatoren) und `Item/Sustainability` mit Indikatoren (`@Key`, `@Value`, `@UoM`, Umrechnungsfaktor, Quelle, Lebenszyklusphasen); in den LV-Phasen X80–X87 und X86ZR, nur auf LV-Ebene in X89/X89B; außerdem IBAN-Muster und vereinfachte Bankverbindung [9][10].

## 5. Schemas und Spezifikation: Bezugsquellen und Nutzungsbedingungen

### 5.1 Was es gibt und wo

| Dokument | Inhalt | Bezug | Quelle |
|---|---|---|---|
| Fachdokumentation GAEB DA XML 3.3 (Ausgabe 2023-01, 130 S.) | Prozesse, Phasen, LV-Aufbau, Regeln, Druckbild-Beispiele, Glossar | kostenloser PDF-Download | [7][13] |
| Schemapakete 3.3 (ZIP) | LV (X80–X87), Handel (X93–X97), Kosten & Kalkulation (X50–X52), Mengenermittlung (X31, 2023-01), Rechnung (X89/X89B), Zeitvertrag (X83Z, X84Z, X86ZE, X86ZR), Beta (X61, X84P, X98, X99); jedes Paket enthält die gemeinsame Bibliothek | kostenloser Download | [7][16][17][18] |
| 3.4 Beta: Changelog (Markdown) + Schemadateien (ZIP) | Änderungen 3.4 ggü. 3.3 | kostenloser Download, ausdrücklich nur zu Testzwecken | [7][8][9][10] |
| Vorversionen 3.2, 3.1 | Fachdoku + Schemas (3.1 auch Musterdateien) | kostenloser Download | [7] |
| TiGA | Online-Dokumentation der Elemente (Basis 3.1, mit Bezügen zu GAEB 90/2000/3.0), kostenlos | http://tiga.gaeb-software.de/ (laut GAEB-Seite) | [27] |
| Musterdateien 3.3 | GAEB veröffentlicht derzeit keine; BVBS stellt Prüfdateien für die Zertifizierung bereit | – | [5][22] |

Eine Registrierung oder Gebühr wird für die Downloads nicht verlangt [7][11].

### 5.2 Rechte und Lizenz – Fakten

- Fachdokumentation und XSD-Dateien tragen den Vermerk „Aufgestellt vom GAEB … © … by DIN Deutsches Institut für Normung e. V." [13][16].
- DIN ist laut Geschäftsordnung **Herausgeber** aller GAEB-Arbeitsergebnisse [3].
- Weder Impressum noch Haftungshinweis noch Downloadseite enthalten eine Lizenz oder Nutzungsbedingungen für die Downloads [4][7][29].
- Die Fachdokumentation bestimmt, dass die GAEB-Schemadateien Grundlage des Austauschs sind: „Diese Schemadateien dürfen nicht verändert werden." [13]
- Bestehendes Open-Source-Beispiel: Die MIT-lizenzierte Python-Bibliothek pyGAEB bietet XSD-Validierung nur optional über ein vom Nutzer bereitgestelltes Schema-Verzeichnis an, liefert die Schemas laut Projektseite also nicht mit [44].
- Der EuGH hat 2012 entschieden, dass weder die Funktionalität eines Programms noch Programmiersprache oder **Dateiformat** als Ausdrucksform eines Computerprogramms urheberrechtlich geschützt sind (C-406/10); Handbuchtexte können dagegen geschützt sein [45].

### 5.3 Einschätzung für ein Open-Source-Projekt (keine Rechtsberatung)

| Vorhaben | Einschätzung | Empfehlung |
|---|---|---|
| Eigenen Parser/Writer für GAEB DA XML schreiben und unter OSS-Lizenz veröffentlichen | geringes Risiko (Dateiformat nicht geschützt) | umsetzen; Element-/Regelwissen in eigenen Worten dokumentieren |
| Original-XSD im öffentlichen Repo mitliefern | **unklar** (DIN-Copyright, keine Lizenz) | schriftlich bei GAEB-Geschäftsstelle/DIN anfragen; bis dahin XSD beim Build/Install von gaeb.de laden lassen |
| XSD verändern (z. B. „korrigieren") | widerspricht der Fachdoku | nie verändern; eigene Zusatzregeln separat implementieren |
| Aus XSD generierten Code committen | Grauzone (abgeleitetes Werk?) | mit obiger Anfrage klären oder Generierung zur Build-Zeit |
| Texte aus der Fachdokumentation in Doku/UI übernehmen | nicht erlaubt ohne Zustimmung | nur eigene Formulierungen |
| BVBS-Prüfdateien als Testdaten | Nutzung lokal naheliegend, Weitergabe ungeklärt | BVBS fragen; eigene Testdateien erstellen |

Vertiefung: [Open-Source-Bausteine, Rechtsfragen und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).

## 6. Zertifizierung und Validierung

### 6.1 BVBS-Zertifizierung

- **Wer:** der BVBS in enger Zusammenarbeit mit dem GAEB; Prüfkriterien erstellt der BVBS-Arbeitskreis Datenaustausch [21][22][24].
- **Was:** GAEB DA XML 3.3, 3.2 und 3.1 in vier Bereichen: **AVA** (Planer-/AG-Software), **Bauausführung** (Firmen-/Bieter-Software), **Mengenermittlung**, **Texterstellung** [21][22]. Für 3.4 Beta gibt es noch keine Zertifizierung [22].
- **Wie:** Prüfung nach verbindlichen Kriterien mit Protokoll (früher typischerweise vor Ort beim Hersteller); bei Erfolg Urkunde und Siegel für **eine bestimmte Softwareversion**; Liste auf bvbs.de [21][22][23].
- **Gültigkeit:** 5 Jahre ab Ausstellung; Re-Zertifizierung bei neuer Softwareversion oder geänderten Kriterien [21][23].

**Preise (BVBS-Preisliste, Stand 09/2021, zzgl. USt und Reisekosten nach Aufwand) [23]:**

| Leistung | BVBS-Mitglieder | Nichtmitglieder |
|---|---|---|
| Erstzertifizierung, 1 Produkt + 1 Bereich (AVA, Bauausführung oder Mengenermittlung) | 2.100 € | 2.950 € |
| jedes weitere Produkt bzw. jeder weitere Bereich | 1.075 € | 1.475 € |
| Re-Zertifizierung je Produkt und Bereich | 450 € | 625 € |
| Nachlass bei neuer GAEB-Version innerhalb der Gültigkeit | 20 % auf den Grundpreis | 20 % auf den Grundpreis |

Ob die Preisliste 2026 noch gilt, war nicht zu klären (sie ist die auf bvbs.de verlinkte Fassung).

**Prüfinhalte (Auszug) [24][25][26]:**

| Bereich | Ablauf | Geprüft wird u. a. |
|---|---|---|
| AVA (V 11.06.2021) | X81-Prüfdatei importieren, als X81 exportieren und vergleichen; X86 mit Preisen importieren, als X86/X84/X83 exportieren; X83 + X84 in einen Preisspiegel laden | Formatierungen/Sonderzeichen/Grafiken, Hinweistexte, StL-Nr., Leit-/Unterbeschreibung, Ausführungsbeschreibung, Bezugs-/Wiederholungsbeschreibung, Grund-/Alternativpositionen und -gruppen, Katalogzuordnungen, Bedarfspositionen, freie Menge, entfallene Positionen, Mengensplit (Kann), ausgelassene Hierarchiestufen, drei Zuschlagsarten, Positionsindex, Bietertextergänzungen, Gesamtsumme und Bereichssummen, EP mit 3 Nachkommastellen; Exporte müssen den GAEB-XML-Checker bestehen |
| Bauausführung (V 04.04.2024) | X83 ohne Preise importieren, X84 exportieren | Normal-/Bedarfspositionen, numerischer und alphanumerischer Index, Grafik im Langtext, Mengen mit maximaler Stellenzahl (8+3) |
| Mengenermittlung (V 11.06.2021) | X86 + X31 importieren (REB 23.003, 2009), Ansätze ergänzen, drucken, X31 exportieren | Index, Stellenzahlen, Rechenergebnisse gegen PDF; Export muss den Checker bestehen |

Laut den Prüfkriterien werden künftig häufige Austauschprobleme in die Kriterien aufgenommen [25][26].

**NOVA AVA:** Die BVBS-Liste führt „NOVA AVA 4" (NOVA Building IT GmbH) in den Bereichen AVA und Bauausführung jeweils mit 3.2 und 3.3 [22]. Die beiden 3.3-Urkunden (Prüfliste 15/2021 und 16/2021) wurden am 11.10.2021 ausgestellt und galten bis 10.10.2026; eine Erneuerung war am 09.11.2026 nicht auffindbar [53]. Produktdetails: [NOVA AVA: Produkt, Module, Editionen, Preise](/okf/research/nova-ava/product-and-pricing.md).

### 6.2 Validierungswerkzeuge

| Werkzeug | Was es tut | Grenzen | Quelle |
|---|---|---|---|
| GAEB-XML-Checker (BVBS/GAEB, Download auf bvbs.de; dort ein Download „GAEB DA XML 3.3. Checker", laut Dateiname Fassung 2025-01) | prüft eine GAEB-Datei gegen das passende GAEB-Schema (Auswahl über Datei-Felder); Versionen 2.0, 2.1, 3.0, 3.1, 3.2, 3.3 (2021-05) | nur formale Schema-Prüfung und nur GAEB-Namespaces | [7][22] |
| TiGA | Online-Nachschlagewerk zu Elementen | Stand 3.1, keine Prüfung | [27] |
| Hersteller-Online-Checker (z. B. ORCA) | Plausibilitätsprüfung | ausdrücklich keine zertifizierte Schema-Validierung | [40] |
| Forschungsprojekt „Next Level GAEB-Datenaustausch" (RUB + 5D Institut, BBSR/Zukunft Bau) | Ziel: Fachregeln eindeutig und maschinenlesbar formulieren, eigenständige Prüfsoftware, Weiterentwicklung der Zertifizierung | Ergebnisse nicht veröffentlicht (Seite Stand 01/2023) | [34] |

**Einschätzung:** Eine reine XSD-Prüfung erkennt z. B. keine falschen Summen, doppelten OZ, falsche Zuordnungszahlen oder Rundungsfehler. Für unser Projekt braucht es eine zweite, fachliche Prüfschicht.

## 7. Abgrenzung: Österreich (ÖNORM A 2063) und Schweiz (SIA 451 / IfA18)

| Merkmal | Deutschland: GAEB DA XML | Österreich: ÖNORM A 2063 | Schweiz: SIA 451 → IfA18/CRBX |
|---|---|---|---|
| Träger | GAEB im DVA, Herausgeber DIN [3] | Austrian Standards (ÖNORM); Standard-Leistungsbeschreibungen vom Wirtschaftsministerium (heute BMWET) [47][48] | CRB (Schweizerische Zentralstelle für Baurationalisierung) mit SIA [49] |
| Format | XML, Namespace je Phase/Version | XML-basiert; ersetzte am 01.06.2009 die ÖNORMEN B 2062, B 2063, B 2114 (1996); Erweiterungen 2011 (Elementkataloge) und 2015 [47] | früher SIA 451 (1992) als Schnittstelle „IfA'92"; seit 01.01.2020 Richtlinie **IfA18** mit Format **CRBX** (V3.13 seit März 2024) [49][50] |
| Aktuelle Fassungen | 3.3 (2023-01), 3.4 Beta [7] | Leistungsbeschreibung Hochbau (LB-HB) Version 023 (31.12.2025) als ONLB-Datei gemäß **ÖNORM A 2063:2015 und A 2063:2021** [48] | IfA18/CRBX; neue SIA 451 (2025) ist ein konzeptioneller Standard zur Datenbereitstellung im Bauprozess [49] |
| Textkatalog | STLB-Bau (lizenziert) | LB-HB u. a. (kostenlos, mit Nutzungsbedingungen: Inhalt nicht verändern, Weiterverkauf als eigener Text verboten) [48] | NPK (Normpositionen-Katalog), Lizenz je Arbeitsplatz und Sprache, jährliche Gebühr [51] |
| Software-Prüfung | freiwillige BVBS-Zertifizierung [21] | – (nicht recherchiert) | Zertifizierung nach IfA18 durch unabhängige Stelle; zentrales Cloud-Prüfprogramm für .crbx; 41 (02/2024) bzw. 42 (05/2025) zertifizierte Lösungen [49][50] |
| Software-Unterstützung (Beispiel) | – | Dangl-Komponenten lesen/schreiben ÖNORM 2063 inkl. Fassungen 2009 und 2021 sowie die alte B 2063 [38][52] | Dangl-Komponenten lesen/schreiben SIA 451 und CRBX/IfA18 [38][52] |

**Einschätzung:** Für den deutschen Architekten ist ÖNORM/SIA nur ein Nice-to-have (z. B. Herstellertexte aus Österreich; laut Projektauftrag importiert NOVA ÖNORM). Die Formate sind nicht kompatibel; ein Import müsste über das eigene interne Modell laufen.

## 8. Vorsicht bei Sekundärquellen

Mehrere leicht auffindbare Web-Erklärungen sind fehlerhaft oder veraltet – Phasenzuordnungen immer gegen die Fachdokumentation [13] prüfen:

| Quelle | Problem |
|---|---|
| BauGrid-Glossar [42] | verschiebt die Phasen (nennt X83 als Angebotsabgabe, X84 als Nebenangebot, X85 als Auftrag); schreibt der 3.4 Beta erweiterte Mengenermittlungsstrukturen zu, obwohl das offizielle Changelog Nachhaltigkeitsdaten als Kern nennt [9] |
| Streit-Software [43] | nennt 3.2 als aktuelle Version und datiert DA XML auf 2012 |
| Englische GAEB-Seite [20] | noch auf Stand 3.2 („gültig seit 15.10.2013") |
| Wikipedia [35] | listet eine Phase „X82Z" und abweichende Namen (X80 „LV-Katalog", X82 „Kostenansatz"), die so nicht in der 3.3-Fachdoku stehen [13] |

## Relevanz für unser Projekt

**Muss-Anforderungen (MVP):**
1. **Import** von X81, X83, X84, X85, X86 in Version **3.3 und 3.2** (Fachplaner und Bieter nutzen verschiedene Programmstände); Erkennung über Namespace + `GAEBInfo` + `DP` [16][22].
2. **Export** von X83 (Ausschreibung) und X86 (Auftrag) in 3.3, optional 3.2; X81/X82 für Weitergabe/Kostenanschlag [13].
3. **Internes LV-Modell nahe am GAEB-Modell**: rekursive LV-Bereiche, OZ-Maske mit Längen/Typen/Index, alle Positionsarten aus Abschnitt 4.3, Leit-/Unterbeschreibung, Ausführungs- und Bezugsbeschreibungen, Hinweistexte, Textergänzungen TA/TB, EP-Anteile, Nachlässe, Losgruppen, Katalogzuordnungen, Nachtragsstatus – sonst gehen beim Round-Trip Daten verloren [13][16].
4. **Formatierter Text** als XHTML-Subset mit Tabellen und Bildern – Editor, Speicherung und Druck müssen das abbilden [13][16].
5. **Rechnen wie GAEB:** Dezimalarithmetik (keine Gleitkommazahlen), Rundungsregeln, Stellengrenzen (Menge 8+3, EP 10+2/3, GB 11+2), Einheiten ≤ 4 Zeichen [13][16].
6. **Zweistufige Validierung:** XSD (offizielle Schemas, unverändert) plus eigene Fachregeln mit verständlichen Fehlermeldungen [13][34].
7. **Preisspiegel aus X84/X85** inkl. „nicht angeboten" vs. 0,00, Alternativ- und Bedarfspositionen, Nebenangeboten [13].

**Soll (nach MVP):** X31-Import mit REB-23.003-Rechenkern (aufwendig: Formelsammlung der REB-VB), X89/X89B für die Rechnungsprüfung, Nachtragsworkflow über CONo/COStatus, GAEB-90-Import (D83/D84), X50/X51 für DIN-276-Kostenplanung, 3.4-Nachhaltigkeitsdaten.

**Differenzierungschancen:**
- **Offene, dokumentierte Abbildung** GAEB ↔ internes Modell (z. B. als JSON) und verlustfreier Round-Trip-Test als Qualitätsversprechen.
- **Robuster Import „schmutziger" Dateien** aus der Praxis mit präzisen Diagnosen (Hersteller berichten von häufigen Schemaverstößen) [36][40].
- **X84P-Preisspiegel-Austausch** umsetzen: Die Phase ist Beta und braucht zwei erprobte Prototypen zur Freigabe – ein OSS-Projekt könnte Mitgestalter werden [13].
- **Frühe 3.4-Unterstützung** für Ökobilanz-/Nachhaltigkeitsdaten je Position [9].
- **Beitrag zu maschinenlesbaren Prüfregeln** (Anschluss an „Next Level GAEB") [34].

**Risiken:**
- **Lizenz der XSD/Fachdoku** (DIN-Copyright, keine Lizenz) – vor dem ersten öffentlichen Commit klären [3][13].
- **Versionswechsel:** 3.4 bringt neue Namespaces; wann es freigegeben wird und wie schnell Bieter-Software nachzieht, ist offen [8][9].
- **`xs:redefine`** erschwert Code-Generierung aus XSD [46].
- **Zertifizierung kostet Geld und Zeit** (≈ 2.950 € netto + Reise für einen Bereich als Nichtmitglied, Stand 2021; Wiederholung bei neuen Versionen) – aber starkes Vertrauenssignal gegenüber öffentlichen Auftraggebern [23].
- **Fehlinformationen** in Sekundärquellen (Abschnitt 8).

**Aufwandsschätzung (Einschätzung, 1 erfahrene Person):**

| Paket | Aufwand |
|---|---|
| LV-Modell + 3.3 Import/Export X81/X83/X84/X85/X86, Texte, Summen/Rundung, XSD + Basis-Fachprüfung, Testsuite | 6–10 Personenwochen |
| 3.2-Unterstützung zusätzlich | 1–2 PW |
| X89/X89B | 2–4 PW |
| X31 mit REB-23.003-Rechenkern | 3–6 PW |
| GAEB-90-Import | 2–4 PW |
| Vorbereitung BVBS-Zertifizierung AVA | 2–4 PW + Gebühren |

**Abgleich (09.11.2026):** Andere Notizen schätzen GAEB-Import/-Export anders: 20–40 Personentage (≈ 1–2 PM, mit Bibliotheken, inkl. X31) in [API und Datenmodell](/okf/research/nova-ava/api-and-data-model.md), 1–3 PM in [Schmerzpunkte](/okf/research/market/pain-points.md), 3–4 PM inkl. X31 und Tests im [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md). Umgerechnet ergeben die 6–10 PW hier ≈ 1,5–2,5 PM, mit X31-Rechenkern ≈ 2,3–4 PM. Ein Teil der Spanne kommt vom Umfang (X31/REB, Testsuite, Datenmodell), ein Teil bleibt offen (widersprüchlich - siehe Offene Fragen).

## Offene Fragen

**Nicht gefunden bzw. nicht verifizierbar:**
- Dürfen die XSD-Dateien (und daraus generierter Code) in einem öffentlichen Open-Source-Repository weitergegeben werden? Keine Lizenzangabe auf gaeb.de; Anfrage an GAEB-Geschäftsstelle/DIN nötig.
- Freigabetermin und endgültiger Umfang von GAEB DA XML 3.4; gibt es eine Kommentierungsfrist für die Beta?
- Aktuelle BVBS-Preise (die verlinkte Liste ist von 09/2021) und ob Open-Source-Projekte Sonderkonditionen bekommen.
- Belastbare Zahlen zur Verbreitung von GAEB 90 / 3.2 / 3.3 im Markt (nur qualitative Herstelleraussagen).
- Gibt es einen Bundes-Erlass oder eine VHB-Vorgabe zur GAEB-DA-Version? Auf der GAEB-Erlass-Seite nur STLB-Bau-Erlasse [28] – an die Vergaberechts-Notiz weitergegeben.
- Inhalt der ÖNORM A 2063:2021 im Detail (Normtext nicht eingesehen).
- Nutzungsrechte an den BVBS-Prüfdateien als Testdaten.
- Gültigkeit der gelisteten BVBS-Zertifikate: Die Liste nennt keine Daten; belegt abgelaufen ist NOVA AVA 4 (10.10.2026) [22][53].
- Welche BIM-LV-Container-Fassung (DIN SPEC 91350 oder DIN 18290-2) NOVA und ORCA schreiben; beide nennen öffentlich noch die zurückgezogene DIN SPEC 91350 ([BIM und AVA](/okf/research/standards/bim-and-ava.md)).
- Aufwandsschätzungen abgleichen: Die Notizen nennen für GAEB-Import/-Export 1–4 PM (Gegenüberstellung in [Schmerzpunkte](/okf/research/market/pain-points.md)). Offen ist eine gemeinsame Bottom-up-Schätzung mit einheitlichem Umfang und einheitlicher Einheit (1 PM ≈ 4 PW ≈ 20 PT).
- Deckt der GAEB-XML-Checker auch das X31-Schema der Ausgabe 2023-01 ab? Die GAEB-Downloadseite nennt nur „3.3 (2021-05)" (nicht verifiziert).

**Fragen an den Architekten-Freund:**
1. Welche Phasen tauschst du tatsächlich aus (X81/X83 von Fachplanern? X84 von e-Vergabe-Plattformen? X86? X31/X89 von Firmen)?
2. In welcher GAEB-Version kommen Angebote und Aufmaße bei dir an – noch GAEB 90 (`.D84`) oder 3.2?
3. Nutzt du Nebenangebote, Alternativ-/Bedarfspositionen, Zuschlagspositionen, EP-Aufgliederung, Losgruppen regelmäßig?
4. Wie gut klappt der GAEB-Austausch heute mit NOVA (Datenverluste, Formatierungen, Bilder in Langtexten)?
5. Brauchst du X31-Aufmaße mit REB-Formeln oder nur Mengen?
6. Verlangen deine öffentlichen Auftraggeber eine bestimmte GAEB-Version oder zertifizierte Software?
7. Spielen Nachhaltigkeitsdaten (Ökobilanz, z. B. für Förderprogramme) in deinen Projekten eine Rolle?
8. Arbeitest du mit österreichischen oder Schweizer Partnern (ÖNORM/SIA)?

## Quellen

1. GAEB – Organisation – gaeb.de – https://www.gaeb.de/de/ueber-gaeb/organisation/ – Art: Primärquelle – abgerufen 2026-11-09
2. GAEB – FAQ (allgemein) – gaeb.de – https://www.gaeb.de/de/service/faq/gaeb-faq/ – Art: Primärquelle – abgerufen 2026-11-09
3. Hauptausschuss GAEB im DVA – Geschäftsordnung, Ausgabe 06.11.2025 (PDF) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2026/10/2025-11-11_Geschaeftsordnung_HA_GAEB_Ausgabe_2025-11-06_final.pdf – Art: Primärquelle – abgerufen 2026-11-09
4. GAEB – Impressum – gaeb.de – https://www.gaeb.de/de/impressum/ – Art: Primärquelle – abgerufen 2026-11-09
5. GAEB – FAQ GAEB-Datenaustausch – gaeb.de – https://www.gaeb.de/de/service/faq/gaeb-datenaustausch-faq/ – Art: Primärquelle – abgerufen 2026-11-09
6. GAEB – Produktseite GAEB-Datenaustausch – gaeb.de – https://www.gaeb.de/de/produkte/gaeb-datenaustausch/ – Art: Primärquelle – abgerufen 2026-11-09
7. GAEB – Downloads GAEB-Datenaustausch – gaeb.de – https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/ – Art: Primärquelle – abgerufen 2026-11-09
8. GAEB – GAEB DA XML Version 3.4 Ausgabe 2026-03 Beta – gaeb.de – https://www.gaeb.de/de/produkte/gaeb-datenaustausch/versionen/gaeb-da-xml-version-3-4-beta/ – Art: Primärquelle – abgerufen 2026-11-09
9. GAEB – Changelog GAEB DA XML 3.4 Ausgabe 2026-03 Beta zu 3.3 (Markdown) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2025/11/Changelog-3.4-2026-03-beta-vs-3.3.md – Art: Primärquelle – abgerufen 2026-11-09
10. GAEB – Schemadateien GAEB DA XML 3.4 Ausgabe 2026-03 Beta (ZIP, XSD selbst ausgewertet) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2025/11/2026-03_BETA-Schemadateien.zip – Art: Primärquelle – abgerufen 2026-11-09
11. GAEB – GAEB DA XML Version 3.3 Stand 2023-01 – gaeb.de – https://www.gaeb.de/de/produkte/gaeb-datenaustausch/versionen/gaeb-da-xml-version-3-3-stand-2023-01/ – Art: Primärquelle – abgerufen 2026-11-09
12. GAEB – GAEB DA XML Version 3.3 Stand 2021-05 – gaeb.de – https://www.gaeb.de/de/produkte/gaeb-datenaustausch/versionen/gaeb-da-xml-version-3-3-stand-2021-05/ – Art: Primärquelle – abgerufen 2026-11-09
13. GAEB/DIN – Fachdokumentation GAEB DA XML Version 3.3, Ausgabe 2023-01 (31.01.2023, PDF) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2023/09/Fachdokumentation_GAEB-DA-XML_3.3_2023-01.pdf – Art: Primärquelle – abgerufen 2026-11-09
14. GAEB/DIN – Fachdokumentation GAEB DA XML Version 3.3, Ausgabe 2021-05 (31.05.2021, PDF) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2021/07/Fachdokumentation_GAEB-DA-XML_3.3_2021-05.pdf – Art: Primärquelle – abgerufen 2026-11-09
15. GAEB/DIN – Fachdokumentation GAEB DA XML Version 3.2 (herausgegeben 10.12.2013, PDF) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2019/04/Fachdokumentation_3.2_2013-10.pdf – Art: Primärquelle – abgerufen 2026-11-09
16. GAEB – Schemapaket Leistungsverzeichnis 3.3, Ausgabe 2021-05 (ZIP, X80–X87 + Bibliothek, selbst ausgewertet) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Leistungsverzeichnis.zip – Art: Primärquelle – abgerufen 2026-11-09
17. GAEB – Schemapaket Rechnung 3.3, Ausgabe 2021-05 (ZIP, X89/X89B, selbst ausgewertet) – gaeb.de – https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Rechnung.zip – Art: Primärquelle – abgerufen 2026-11-09
18. GAEB – Schemapakete 3.3: Beta (X61, X84P, X98, X99) https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Beta.zip sowie Kosten und Kalkulation, Zeitvertrag, Handel (gleicher Pfad: 2021-05_Kosten_und_Kalkulation.zip, 2021-05_Zeitvertrag.zip, 2021-05_Handel.zip) – gaeb.de – Art: Primärquelle – abgerufen 2026-11-09
19. GAEB – Schemas 3.2 (Paket Leistungsverzeichnis 2013-10) https://www.gaeb.de/wp-content/uploads/2019/04/Leistungsverzeichnis.zip und 3.1 (2009-12) https://www.gaeb.de/wp-content/uploads/2022/11/Schema_GAEB_DA_XML_3.1_2009-12_X81-X83_u_X85-X87.zip – gaeb.de – Art: Primärquelle – abgerufen 2026-11-09
20. GAEB – GAEB data exchange (englische Seite, veraltet) – gaeb.de – https://www.gaeb.de/en/products/gaeb-data-exchange/ – Art: Primärquelle (veraltet) – abgerufen 2026-11-09
21. GAEB – Zertifizierung – gaeb.de – https://www.gaeb.de/de/produkte/gaeb-datenaustausch/zertifizierung/ – Art: Primärquelle – abgerufen 2026-11-09
22. BVBS – Zertifizierungen (Produktlisten, Prüfdateien, Checker; Tabellen selbst ausgewertet) – bvbs.de – https://www.bvbs.de/zertifizierungen/ – Art: Primärquelle – abgerufen 2026-11-09
23. BVBS – Preisliste GAEB Zertifizierung, Stand 09/2021 (PDF) – bvbs.de – https://www.bvbs.de/wp-content/uploads/2024/02/BVBS-Preisliste-Zertifizierungen-202109.pdf – Art: Primärquelle – abgerufen 2026-11-09
24. BVBS – Prüfkriterien GAEB DA XML 3.3 AVA, Version 11.06.2021 (PDF) – bvbs.de – https://www.bvbs.de/wp-content/uploads/2024/02/BVBS_Pruefkriterien-GAEB-DA-XML-3.3-AVA-V-11-06-2021.pdf – Art: Primärquelle – abgerufen 2026-11-09
25. BVBS – Prüfkriterien GAEB DA XML 3.3 Bauausführung, Version 04.04.2024 (PDF) – bvbs.de – https://www.bvbs.de/wp-content/uploads/2024/05/Pruefkriterien-GAEB-DA-XML-3.3-Bauausfuehrung-V-04-04-2024.pdf – Art: Primärquelle – abgerufen 2026-11-09
26. BVBS – Prüfkriterien GAEB DA XML 3.3 Mengenermittlung, Version 11.06.2021 (PDF) – bvbs.de – https://www.bvbs.de/wp-content/uploads/2024/02/Pruefkriterien-GAEB-DA-XML-3.3-Mengenermittlung-V-11-06-2021.pdf – Art: Primärquelle – abgerufen 2026-11-09
27. GAEB – TiGA – gaeb.de – https://www.gaeb.de/de/produkte/gaeb-datenaustausch/tiga/ – Art: Primärquelle – abgerufen 2026-11-09
28. GAEB – Erlasse – gaeb.de – https://www.gaeb.de/de/service/erlasse/ – Art: Primärquelle – abgerufen 2026-11-09
29. GAEB – Haftungshinweis – gaeb.de – https://www.gaeb.de/de/haftungshinweis/ – Art: Primärquelle – abgerufen 2026-11-09
30. DIN – PAS 1067 GAEB-Datenaustausch XML (GAEB DA XML), Ausgabe 2006, zurückgezogen – din.de – https://www.din.de/de/wdc-beuth:din21:91381713 – Art: Primärquelle – abgerufen 2026-11-09
31. DIN Media – DIN SPEC 91350:2016-11 Verlinkter BIM-Datenaustausch von Bauwerksmodellen und Leistungsverzeichnissen (zurückgezogen, ersetzt durch DIN 18290-1/-2:2023-11) – dinmedia.de – https://www.dinmedia.de/en/technical-rule/din-spec-91350/263151122 – Art: Primärquelle – abgerufen 2026-11-09
32. GAEB/BBR – Flyer „Datenaustausch XML" (Forschungsinitiative Zukunft Bau, undatiert, ca. 2010–2013) – tab.de – https://www.tab.de/download/554109/GAEB_DA_XML_Flyer.pdf – Art: Primärquelle (Herausgeber GAEB) – abgerufen 2026-11-09
33. Fraunhofer IRB / BBR – Projektkurzbeschreibung „Qualitätssicherung des GAEB-Datenaustausches für die Durchführung von Bauaufgaben öffentlicher Auftraggeber" (Laufzeit 08/2007–05/2008) – irbnet.de – https://www.irbnet.de/daten/baufo/20088034385/Projektkurzbeschreibung.pdf – Art: Wissenschaft – abgerufen 2026-11-09
34. Ruhr-Universität Bochum – Projekt „Next Level GAEB-Datenaustausch" – rub.de – https://www.inf.bi.ruhr-uni-bochum.de/iib/forschung/projekte/next_level_gaeb-datenaustausch.html.en – Art: Wissenschaft – abgerufen 2026-11-09
35. Wikipedia – GAEB – de.wikipedia.org – https://de.wikipedia.org/wiki/GAEB – Art: Sekundärquelle (Enzyklopädie) – abgerufen 2026-11-09
36. Dangl IT – The GAEB data formats in detail – dangl-it.com – https://dangl-it.com/articles/the-gaeb-data-formats-in-detail – Art: Herstellerangabe – abgerufen 2026-11-09
37. Dangl IT – Support for the new BIM-ready GAEB XML version 3.3 – dangl-it.com – https://www.dangl-it.com/articles/support-for-the-new-bim-ready-gaeb-xml-version-33/ – Art: Herstellerangabe – abgerufen 2026-11-09
38. Dangl IT – AVACloud Public Changelog (Version 1.20.1) – docs.dangl-it.com – https://docs.dangl-it.com/Projects/AVACloud/1.20.1/CHANGELOG_PUBLIC.html – Art: Herstellerangabe – abgerufen 2026-11-09
39. T&T Datentechnik – GAEB-Formate: Übersicht und Erklärung – gaeb-tools.de – https://gaeb-tools.de/faq/faq-gaeb-konverter/ – Art: Herstellerangabe – abgerufen 2026-11-09
40. ORCA Software – GAEB-Schnittstelle verstehen: Datenaustausch im Bauwesen (Stand Juni 2026) – orca-software.com – https://www.orca-software.com/gaeb-schnittstelle-datenaustausch/ – Art: Herstellerangabe – abgerufen 2026-11-09
41. ORCA Software – e-Vergabe: Elektronische Vergabe im Bauwesen (Stand Juli 2026) – orca-software.com – https://www.orca-software.com/e-vergabe/ – Art: Herstellerangabe – abgerufen 2026-11-09
42. BauGrid – Glossar: GAEB DA XML – baugrid.de – https://www.baugrid.de/glossar/gaeb-da-xml – Art: Herstellerangabe (fehlerhaft, siehe Abschnitt 8) – abgerufen 2026-11-09
43. STREIT Software – GAEB Formate – streit-software.de – https://www.streit-software.de/wissen/gaeb-formate – Art: Herstellerangabe (veraltet) – abgerufen 2026-11-09
44. PyPI – pyGAEB 1.7.1 – pypi.org – https://pypi.org/project/pyGAEB/1.7.1/ – Art: Projektseite (Open Source) – abgerufen 2026-11-09
45. EuGH, Urteil vom 02.05.2012, Rs. C-406/10 (SAS Institute / World Programming) – lexetius.com – https://lexetius.com/2012,1415 – Art: Gesetz/Rechtsprechung – abgerufen 2026-11-09
46. W3C – XML Schema Definition Language (XSD) 1.1 Part 1: Structures, Abschnitt 4.2.4 – w3.org – https://www.w3.org/TR/xmlschema11-1/ – Art: Primärquelle (Standard) – abgerufen 2026-11-09
47. Wikipedia – ÖNORM A 2063 (zuletzt bearbeitet 04.11.2026) – de.wikipedia.org – https://de.wikipedia.org/wiki/ÖNORM_A_2063 – Art: Sekundärquelle (Enzyklopädie) – abgerufen 2026-11-09
48. BMWET (Österreich) – Standardisierte Leistungsbeschreibung Hochbau (LB-HB) – bmwet.gv.at – https://www.bmwet.gv.at/Services/Bauservice/Hochbau.html – Art: Primärquelle – abgerufen 2026-11-09
49. CRB – Einheitlicher Datenaustausch: Damit wir uns besser verstehen (28.05.2025) – crb.ch – https://www.crb.ch/de/aktuelles/einheitlicher-datenaustausch-damit-wir-uns-besser-verstehen – Art: Primärquelle – abgerufen 2026-11-09
50. CRB – Neues zentrales Prüfprogramm optimiert den Datenaustausch (08.02.2024) – crb.ch – https://www.crb.ch/de/aktuelles/neues-zentrales-prufprogramm-optimiert-den-datenaustausch – Art: Primärquelle – abgerufen 2026-11-09
51. CRB – Lizenzen Normpositionen-Katalog NPK – crb.ch – https://www.crb.ch/de/normen-standards/normpositionen/lizenzen-normpositionen-katalog-npk – Art: Primärquelle – abgerufen 2026-11-09
52. Dangl IT – GAEB & AVA .NET Library (Produktseite) – dangl-it.com – https://www.dangl-it.com/products/gaeb-ava-net-library/ – Art: Herstellerangabe – abgerufen 2026-11-09
53. BVBS-Zertifikate GAEB DA XML 3.3 „AVA“ (Nr. 15/2021) und „Bauausführung“ (Nr. 16/2021) für NOVA AVA 4, ausgestellt 11.10.2021, gültig bis 10.10.2026 – NOVA Building IT GmbH / BVBS – https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_AVA_3.3_202110.pdf und https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_Bauausfg_3.3_202110.pdf – Art: Primärquelle (Zertifikat) – abgerufen 2026-11-09
