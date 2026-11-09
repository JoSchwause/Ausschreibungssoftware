---
type: Research Note
title: Cloud-, Nischen- und neue Anbieter rund um AVA – Positionierung, Preise und Innovationsmuster
description: Marktscan der cloudbasierten, günstigen, KI-getriebenen und Nischen-Werkzeuge für Ausschreibung, Vergabe und Abrechnung (inkl. Kostenplanung, Bieterzugang und angrenzender Bau-SaaS) mit konkreten Preisen, Lizenzmodellen und Folgerungen für ein Open-Source-AVA.
resource: https://www.phase0.com/preise
tags: [research, market, cloud, pricing, ki, gaeb, kostenplanung]
timestamp: 2026-11-09T17:16:17Z
sources: 77
confidence: mittel
---

# Cloud-, Nischen- und neue Anbieter rund um AVA

## Kurzfassung

- **Phase0** (Berlin, 2020 als „Compa“ gegründet) ist der sichtbarste cloud-native Herausforderer: Browser-Software für Büros mit 1–20 Personen, bündelt AVA, HOAI-Honorar und Bautagebuch, hat einen KI-Agenten für Leistungsverzeichnisse und kostet 80–200 € netto pro Nutzer und Monat. Laut Hersteller nutzen es über 1.000 Büros. Im September 2026 kamen 2,6 Mio. € Seed-Extension dazu [5][6][10][11].
- **Neu im Jahr 2026 ist SIRADOS 365 AVA** (WEKA Intelligence). Es läuft im Browser oder offline unter Windows, kostet ab 399 €/Jahr und ist eng an die eigene Baudaten-Bibliothek gekoppelt. Bieter können ihre Angebote direkt im System abgeben [43][44][45].
- **Die Preisspanne ist sehr groß.** Sie reicht von kostenlos (AVAPLAN Base, SIDOUN Globe4all) über 220 €/Jahr (SJ AVA) und 295 € einmalig (AFAP-AVA) bis zu 1.400–3.600 € Kauf bzw. 125–250 €/Monat Miete (AVANTI). In der Cloud kosten Lizenzen 49–129 € pro Monat (NOVA AVA) bzw. 80–200 € pro Nutzer und Monat (Phase0) [15][28][34][21][52][5].
- **Der Markt konsolidiert sich stark.** Die **Orca Group** bündelt neun Marken, darunter ORCA AVA, COSOBA (AVA.relax), SOFTTECH (AVANTI), BauerSoftware (BUILDUP), PROJEKT PRO und Ausschreiben.de [23][71][72]. Ihr Kern aus ORCA, SOFTTECH und PROJEKT PRO gehört seit 2024 zum Portfolio des Investors LEA Partners [73]. Bei der Bürosoftware gehören untermStrich und KOBOLD zur everii Group [23][54]. ARCHITEXT Pallas läuft heute unter NOVA BUILDING IT, und „Pallas Online“ wurde zugunsten von NOVA AVA eingestellt [25].
- **KI ist das zentrale Verkaufsargument der Neulinge.** Angeboten werden LV-Erstellung per Chat, VOB/DIN-Prüfung von Texten, Preisvorschläge aus Angebotsdaten und Mengen aus PDF-Plänen oder IFC-Modellen. Vieles davon ist Herstellerangabe oder Beta. Die Haftung bleibt beim Planer [7][12][39][58][61].
- **Cloud-Anbieter nutzen einen Datennetzwerk-Effekt.** Phase0 speist anonymisierte Bieterpreise aus Ausschreibungen über die Plattform in eine eigene Preisdatenbank ein, laut Hersteller rund 5.000 LVs mit über 230.000 Positionen [5][7].
- **Eine native Mac-AVA wurde nicht gefunden.** Mac-Nutzer kommen nur über Browser-SaaS oder Windows-Virtualisierung ans Ziel, die AVAPLAN und BKI ausdrücklich empfehlen [16][47].
- **Selbst-Hosting fehlt.** Kein geprüfter Anbieter bietet eine selbst hostbare Web-AVA an. Cloud-Anbieter hosten in Deutschland, Desktop-AVA läuft fast nur unter Windows. *Einschätzung:* Das ist die klarste Lücke für ein Open-Source-Projekt.
- **Versteckte Kosten** entstehen vor allem durch Text- und Preisdatenbanken, Wartung (AVAPLAN: 25 % des Listenpreises pro Jahr), Onboarding (untermStrich 1.399–2.999 €) und Auto-Verlängerungen [28][43][15][54]. Beispiele für Textdaten: STLB-Bau als Miete bei SJ „ab 990 €“ pro Jahr (Paket nicht genannt) [28]; beim Vertriebspartner WESA das Paket Architektur online 799,43 €/Jahr, Komplett 1.527,45 €/Jahr, als Kauf Architektur 2.090 € plus 20 % Pflege [77] (Details in [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md)); SIRADOS „Architektur Complete“ 2.499 € [43].
- **Angrenzende Bau-SaaS** wie Capmo, PlanRadar, Thinkproject und Alasco machen kein AVA und kein GAEB. Sie decken Baustellendoku, gemeinsame Projektdatenräume (CDE) und Investoren-Kostencontrolling ab. Die Grenze ist also klar [65][66][67][68].

## Begriffe in dieser Notiz

| Begriff | Kurz erklärt (engl.) |
|---|---|
| **AVA** | Ausschreibung, Vergabe, Abrechnung. Software für die HOAI-Leistungsphasen 6–8: Leistungen beschreiben, Angebote vergleichen, Auftrag vergeben, Rechnungen prüfen (tendering, award, billing) |
| **Leistungsverzeichnis (LV)** | Strukturierte Liste der Bauleistungen. Jede Position hat Kurz- und Langtext, Menge und Einheit, Bieter tragen Preise ein (bill of quantities) |
| **GAEB / GAEB DA XML** | Deutscher Standard für den Datenaustausch von LVs. Wichtige Phasen: X81 Leistungsbeschreibung, X83 Angebotsaufforderung, X84 Angebotsabgabe, X86 Auftragserteilung, X31 Mengenermittlung. GAEB 90 und GAEB 2000 sind Vorgängerformate (D8x/P8x). Siehe [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) |
| **Preisspiegel** | Tabelle, die die Preise aller Bieter Position für Position vergleicht (bid comparison) |
| **Aufmaß / Mengenermittlung** | Messen bzw. Berechnen der Mengen, vor der Ausschreibung (geplant) oder nach der Ausführung (abzurechnen) (quantity take-off / measurement) |
| **Nachtrag** | Zusätzliche oder geänderte Leistung nach Vertragsschluss (change order) |
| **DIN 276 / Kostengruppen (KG)** | Norm, die Baukosten gliedert, z. B. KG 300 Bauwerk/Baukonstruktion und KG 400 Technische Anlagen. Sie definiert die Stufen Kostenrahmen, -schätzung, -berechnung, -anschlag und -feststellung. Siehe [DIN 276](/okf/research/standards/din-276-cost-planning.md) |
| **HOAI / Leistungsphasen (LPH)** | Honorarordnung für Architekten und Ingenieure. LPH 6 = Vorbereitung der Vergabe, LPH 7 = Mitwirkung bei der Vergabe, LPH 8 = Objektüberwachung |
| **STLB-Bau** | Standardleistungsbuch mit normierten, VOB-gerechten Ausschreibungstexten. Herausgeber sind DIN und DBD, die Nutzung ist lizenzpflichtig. Siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) |
| **SaaS** | Software as a Service: Software, die im Browser läuft und gemietet wird |
| **Floating-Lizenz** | Lizenz, die auf beliebig vielen Geräten installiert sein darf. Begrenzt wird nur die Zahl der gleichzeitigen Nutzer |
| **Freemium** | Dauerhaft kostenlose Basisversion mit kostenpflichtigen Ausbaustufen |
| **E-Vergabe** | Elektronische Abwicklung öffentlicher Vergaben über Vergabeplattformen. Siehe [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md) |
| **XRechnung / ZUGFeRD** | Strukturierte E-Rechnungsformate, relevant für die Rechnungsprüfung |
| **IFC / BIM** | Offenes Gebäudemodell-Format bzw. modellbasiertes Planen. Siehe [BIM und AVA](/okf/research/standards/bim-and-ava.md) |
| **CDE** | Common Data Environment: gemeinsamer Projektdatenraum für alle Beteiligten |

## Methodik und Quellenlage

- Primärquellen sind die Hersteller-Websites mit Preisseiten, Produktseiten und eingebetteten Strukturdaten. Ergänzend wurden Fachpresse (baulinks, Computer Spezial, iww), Gründerpresse (starting-up, Berlin Partner, Munich Startup) und Software-Verzeichnisse (SoftGuide, softwareabc24, heise Download) gelesen, außerdem zwei Vergleichsartikel (KI-Syndikat, Dr. Web). Alle Quellen wurden am 09.11.2026 abgerufen.
- **Grenzen der Verzeichnisse:** Die Betriebssystem-Listen bei SoftGuide wirken wie Textbausteine. Selbst Desktop-Windows-Programme stehen dort mit „Mainframe/Unix/Linux/macOS“ [20][33]. Diese Angaben werden hier nicht als Fakt übernommen. softwareabc24 nennt Startpreise und weist darauf hin, dass Hersteller dafür zahlen [35]. Dr. Web legt offen, dass empfohlene Anbieter eine Gebühr oder Provision zahlen [2]. KI-Syndikat hat keines der Programme selbst getestet [1].
- **Suchbudget:** Gegen Ende der Recherche war das gemeinsame Websuche-Kontingent aller parallel arbeitenden Agenten aufgebraucht. Die angrenzenden SaaS-Anbieter (Capmo, PlanRadar, Thinkproject, Alasco) sind deshalb nur über ihre eigenen Seiten erfasst. Weitere sehr junge Start-ups könnten fehlen (siehe *Offene Fragen*).
- **Nachfragesignal:** Ein Architekturbüro in Gründung suchte über SoftGuide eine AVA-Software für 3 Arbeitsplätze, später 4–15, unter Windows. Es verlangte 16 Pflichtfunktionen, darunter Preisspiegel, Nachtragsmanagement, IFC-Schnittstelle, DMS (Dokumentenmanagement) und funktionale Ausschreibung. In der Trefferliste standen nur klassische Desktop-Anbieter: ASBwin 16/16, CaliforniaX 13/16, AVA.relax, NEVARIS, ORCA und SJ AVA mit je 12/16. Das Projekt (Nr. 24/3401) stammt vermutlich aus 2024 [4].

## Marktkarte: Segmente im Überblick

| Segment | Beispiele | Betrieb | Typische Preise (netto, Stand 11/2026) |
|---|---|---|---|
| Cloud-native AVA (+Bürofunktionen, KI) | Phase0, NOVA AVA, SIRADOS 365 AVA | Browser-SaaS, DE-Hosting | 49–200 € pro Nutzer/Lizenz und Monat, ab 399 €/Jahr [5][52][45] |
| Hybride / „KI-AVA“ etablierter Häuser | SIDOUN KIAVA, BUILDUP V31, AVANTI + GRAVA connect | Windows + Cloud-Hosting/Browser-Teile | meist „auf Anfrage“, AVANTI 125–250 €/Monat [39][24][21] |
| Günstige Desktop-AVA | AVAPLAN, SJ AVA, nextbau, ASBwin, AFAP-AVA, Hottgenroth LV/AVA | Windows (on-premises) | 0 € bis ca. 1.900 € Kauf, 220–975 €/Jahr Abo [15][28][32][33][34][36] |
| Klassische Nischen-AVA | AVA.relax, AVANTI, Pallas, BECHMANN | Windows, Netz/Terminalserver | 1.263–3.600 € Kauf bzw. individuell [19][21][26][37] |
| KI-Start-ups (LV, Mengen) | BauGPT, BAU AI, PlanQ, condesk | SaaS bzw. Dienstleistung | Freemium, „auf Anfrage“, erfolgsbasiert [56][58][59][60] |
| Bieterzugang / Plattformen | Phase0-Online-LV, SIRADOS-Bieterzugang, Cosuno, BECHMANN BIT | Browser bzw. Gratis-Tool | inklusive, auf Anfrage oder kostenlos [8][44][63][37] |
| Kostenplanung | BKI Kostenplaner/KoRa, SIRADOS 365 Kostenplanung, DBD, SJ KOSMA, NOVA NEO | Desktop + Web-Apps | 41 € (2 Wochen) bis 1.899 € je Ausgabe [47][48][46][28] |
| Angrenzende Bau-SaaS | Capmo, PlanRadar, Thinkproject, Alasco, untermStrich | SaaS | 19–129 € pro Nutzer/Monat bis volumenbasiert [65][66][54] |

## 1. Cloud-native AVA und neue Plattformen

### 1.1 Phase0 (Berlin)

| Merkmal | Befund |
|---|---|
| Firma | Phase0 GmbH, früher Compa Construction Solutions GmbH, Berlin, gegründet 2020 [1][13][14] |
| Positionierung | Laut Hersteller einfache Software für kleine Büros mit 1–20 Mitarbeitenden in den LPH 1–8. Zielgruppe sind Architektur-, Ingenieur-, Landschafts- und Innenarchitekturbüros [6]. Phase0 vergleicht sich öffentlich mit ORCA AVA, KOBOLD, untermStrich, PROJEKT PRO und PlanRadar, greift also AVA- und Bürosoftware zugleich an [6] |
| Module | AVA (Kostenschätzung DIN 276, LV, Ausschreibung, Preisspiegel, Rechnungsprüfung, Kostenverfolgung), HOAI (Honorarangebote nach HOAI 2021, Rechnungen inkl. XRechnung, Controlling), Bautagebuch per WhatsApp mit Mängeltickets, Zeiterfassung [5][6] |
| Betrieb | Nur Browser (Mac, Windows, Handy), keine Installation. Laut Hersteller in Deutschland entwickelt und gehostet, Datenverarbeitung DSGVO-konform mit AVV (Auftragsverarbeitungsvertrag) [6][14]. Im Blog wirbt Phase0 mit AVA auf dem Mac ohne Virtualisierung und VPN [5] |
| Preise (Stand: Preisseite, Strukturdaten vom 29.09.2026) | **Monatliche Zahlung:** Volle Lizenz (AVA + Bautagebuch + HOAI) 200 €, Bauleiter (AVA + Bautagebuch) 150 €, Einzellizenz (ein Modul) 100 € je Nutzer und Monat. **Jährliche Zahlung (−20 %):** 160 €, 120 € bzw. 80 € je Nutzer und Monat (1.920 €, 1.440 € bzw. 960 € pro Jahr) [5]. Add-ons bei jährlicher Zahlung: Zeiterfassung 16 € je Mitarbeiter und Monat, LV-Preisdatenbank 20 € je Büro und Monat [5] |
| Vertragsbedingungen | Keine Mindestlaufzeit, Abrechnung in 30-Tage-Perioden, Pausieren für 10 €/Monat bei unbegrenzter Datenaufbewahrung. 14 Tage kostenlos testen ohne Auto-Umwandlung. Support, Onboarding, unbegrenzte Projekte und Daten sind inklusive. Studierende erhalten AVA-Lizenzen auf Anfrage gratis [5] |
| Abweichende Preisangaben | KI-Syndikat (09/2026) nennt die Tarife noch „Simple/Plus/Pro“ zu 80/120/160 € [1]. SoftGuide (07/2026) nennt „ab 80 € je Modul, All-in-One 150 €“ [14]. *Einschätzung:* Phase0 hat Tarifnamen und -zuschnitt 2026 mehrfach geändert |
| GAEB | Liest und schreibt GAEB 90, GAEB 2000 und GAEB DA XML (D8x/P8x/X8x) [5][9] |
| KI (Herstellerangaben) | Der **AVA-Agent** erstellt, prüft und bepreist LVs im Chat. Er baut die Struktur aus Plänen, IFC-Daten und alten LVs, schreibt Kurz- und Langtexte sowie Vorbemerkungen und prüft gegen VOB und DIN [7][12]. Der **Bautagebuch-Agent** macht aus WhatsApp-Fotos und -Sprachnachrichten Berichte. Ein Terminplanungs-Agent ist in Entwicklung, viele weitere Agenten sind geplant [7]. Einen KI-Aufpreis weist Phase0 nicht aus [7] |
| Reifegrad (Widerspruch) | Laut Presse (06/2026) ermittelt der Agent Mengen aus Plänen und IFC [12]. KI-Syndikat fand Mengenermittlung auf der Produktseite im 09/2026 noch als „Bald“ markiert, IFC wurde dort nicht genannt [1]. Die Finanzierungsrunde soll unter anderem Mengenermittlung und Kostenschätzung per KI erst ausbauen [11]. SoftGuide führte den AVA-Agenten im 07/2026 noch als Beta [14] |
| Daten / Training | Die Agenten nutzen Bürodaten nur innerhalb des Büros. **Rücklaufende Bieterpreise fließen ohne Projekt- und Firmennamen in die Phase0-Preisdatenbank**, die eigenen Preise des Büros ausgenommen [7]. Die Datenbank zeigt laut Hersteller Mindest-, Median- und Höchstpreise aus rund 5.000 LVs mit über 230.000 Positionen, nach Ort und Gewerk [5]. Welche KI-Modelle bzw. Anbieter genutzt werden, steht nicht auf der Seite [7] |
| Bieterzugang | Ein Online-LV wird per Link verschickt. Bieter bepreisen es im Browser ohne eigenen Account, und der Preisspiegel füllt sich automatisch. Für Bieter mit eigener Kalkulationssoftware gibt es GAEB-Export, für öffentliche Vergaben eine Bieter-Anonymisierung. Eine Anbindung an E-Vergabe-Plattformen und die UVgO werden nicht erwähnt [8] |
| Traktion | Über 1.000 Büros (Herstellerangabe), 50–100 neue pro Monat, Trustpilot 4,8 bei 119 Bewertungen. Als Zielmarkt nennt Phase0 rund 110.000 kleine und mittlere Planungsbüros in Deutschland [11]. SoftGuide nennt über 900 Büros in Deutschland mit mehr als 1.500 aktiven Nutzern [14] |
| Finanzierung | 2,6 Mio. € Seed-Extension (gemeldet am 02.09.2026). Lead war Realyze Ventures, Bestandsinvestoren sind LocalGlobe und Atlantic. Als Business Angels kamen der CEO von ATP architekten ingenieure und ein früherer Chief Growth Officer von ServiceTitan dazu. Gründer und Geschäftsführer ist Matthäus Kerres [10][11] |

*Einschätzung:* Phase0 ist das Referenzmodell für „AVA als schlankes SaaS für Kleinbüros“. Stärken sind niedrige Einstiegshürden, Mac-Tauglichkeit, Bundling mit HOAI und Bautagebuch sowie KI. Schwächen sind der Preis pro Nutzer, der bei Vollausbau über NOVA AVA liegt, ein nicht offengelegter KI-Stack, keine erwähnte API und keine E-Vergabe-Anbindung. Dazu kommt die Abhängigkeit von VC-Finanzierung.

### 1.2 SIRADOS 365 AVA und SIRADOS 365 Kostenplanung (WEKA Intelligence) – neu 2026

- **Was:** Browserbasierte AVA für Ausschreibung, Angebotseingang, Bieterspiegel, Vergabe und Abrechnung mit Soll-Ist-Vergleich und Nachtragspositionen. Sie ist ausdrücklich zur Kombination mit den SIRADOS-Baudatenpaketen gedacht, die VOB-konforme Positionen, Kostenelemente nach DIN 276, Baupreise und Zeitwerte enthalten [43][44].
- **Bieter:** Ausgewählte Bieter tragen ihre Angebote direkt im System ein, optional mit SIRADOS kalkuliert. Alternativ werden Angebote per GAEB importiert. Bis zur Submission lassen sie sich ändern [44].
- **Betrieb:** Online im Browser auf jedem Gerät. Die Offline-Version läuft nur unter Windows 8–11 (64 Bit) [43][45].
- **Preise:** AVA-Modul ab 399 € pro Jahr, Wartung und Hotline inklusive. SIRADOS 365 Kostenplanung kostet ebenfalls ab 399 € pro Jahr [42][45][46]. Das Bundle „Architektur Complete“ mit AVA, allen Baudaten, Kostenplanung und VOB-Vorbemerkungen kostet 2.499 € [43]. Die Jahreslizenzen verlängern sich automatisch, wenn nicht 6 Wochen vor Laufzeitende gekündigt wird. Zusatzbenutzer kosten extra, Preise dafür sind nicht genannt [43].
- **KI:** Angebote, LVs und Kostenplanungen lassen sich laut Verzeichniseintrag des Herstellers mit KI-Unterstützung bepreisen [45][46].
- **Neuheit:** Der Blogbeitrag vom 22.06.2026 stellt das Produkt als neu vor [44]. SoftGuide nennt 2026 als Jahr der ersten Installation [45].

*Einschätzung:* Ein Datenanbieter steigt mit eigener Cloud-AVA ins Geschäft ein. Das Muster heißt „Software billig, Daten teuer“, ähnlich wie bei nextbau mit STLB-Bau/DBD (Abschnitt 2).

### 1.3 NOVA AVA – nur als Vergleichsanker

Details stehen in [NOVA AVA: Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md). Zur Einordnung: Starter kostet 49 €/Monat oder 529 €/Jahr, Easy 89 €/Monat oder 961 €/Jahr, Business 129 €/Monat oder 1.393 €/Jahr. Die Easy- und Business-Preise tragen den Vermerk „ab 01. Mai 2026“, was auf eine Preisänderung hindeutet. Längere Laufzeiten bringen 5–10 % Rabatt [52]. Die KI „NEO“ wird als „Baukosten-KI“ beworben [52]. Laut KI-Syndikat ist sie nach Anbieterangabe ohne Aufpreis enthalten und läuft in einem eigenen „AI Hub“ in Frankfurt [1].

### 1.4 SIDOUN KIAVA und Globe4all (Freiburg)

- **KIAVA** bewirbt der Hersteller als erste AVA-Software mit KI. Die KI-Assistenz heißt IILSE und umfasst Frag-IILSE, LV-PrüfungKI, BauTextKI, Übersetzung sowie semantische Projektsuche. Dazu kommen Excel- und Word-Integration mit Zwei-Wege-Abgleich, ein Teammodus und eine BIM-Anbindung [39][41].
- **KI-Stack:** Standard ist ChatGPT, Alternative ist Microsoft 365 Copilot. Gemini, Claude und Perplexity sind angekündigt, eine europäische KI aus Österreich ist geplant. **Kunden nutzen ihr eigenes Konto beim KI-Anbieter**, SIDOUN stellt nur die Verbindung her. Kundendaten trainieren laut Hersteller nicht die Basismodelle [39][1].
- **Betrieb und Preis:** Laut SoftGuide als SaaS/Cloud und on-premises erhältlich, nicht als Web-App. Erste Installation 2025. Unterstützt GAEB 90, GAEB 2000 und GAEB XML, Datanorm sowie IFC. Preise nennt SIDOUN nicht, Wartung und Schulung kosten extra [41][39]. Die integrierte KI gibt es laut KI-Syndikat seit März 2026 [62].
- **Globe4all** ist laut Hersteller dauerhaft kostenlos und ausdrücklich keine Demo. Es deckt LV, Vergabe und Abrechnung ab, ein Wechsel zu Globe oder KIAVA ist jederzeit möglich [40]. Daneben gibt es das klassische Produkt Globe [38]. SIDOUN nennt auf der eigenen Website rund 50 Jahre Erfahrung [38], ein Verzeichnis spricht von 44 Jahren [3].

*Einschätzung:* Das Modell „Bring your own LLM account“ verlagert KI-Kosten und Datenschutzfragen zum Kunden. Für öffentliche Auftraggeber ist die Nutzung externer KI-Dienste vor Vertragsschluss zu klären, wie auch KI-Syndikat anmerkt [1].

## 2. Günstige Desktop-AVA und Nischenanbieter

| Produkt (Anbieter) | Betrieb | Preis/Lizenz (netto) | GAEB | Besonderheiten | Traktion / Alter |
|---|---|---|---|---|---|
| **AVAPLAN** (AVAPLAN Software GmbH, Berlin, gegr. 2009/2010) [17] | Windows. Mac nur mit Windows-Virtualisierung (Parallels ab V18, Windows on ARM) [16] | **Base gratis**. Kauf: Lite 390 €, Pro 1.119 €, ProPlus 1.549 €, jede weitere Lizenz 50 %. Abo (Jahreslizenz): Pro 499 €, ProPlus 679 €, weitere Lizenz 50 %. BIM-Modul 390 €. Servicevertrag beim Kauf 25 % des Listenpreises pro Jahr, das erste Jahr gratis. Editionen und Kauf/Abo lassen sich nicht mischen [15]. KI-Syndikat nennt abweichend 390/890/1.290 € für die Erstlizenzen [61], die Herstellerseite hat Vorrang | Import/Export DA 81–86, GAEB 90/2000/XML 3.3, D11/X31 [15] | KI-Hilfe im Programm ist im Service enthalten [15]. Version 26.x erscheint 2026 [74] | Mehrere Tausend Lizenzen (Herstellerangabe) [17] |
| **AVA.relax** (COSOBA GmbH, Darmstadt; Orca Group) | Windows: Einzelplatz, Netz, Terminalserver. Cloud-Variante erwähnt, ohne Preis [19] | Kauf: Business 1.263 €, Business-plus 1.644 € (mit Abrechnung), Professional 1.897 € (mit Kostenkontrolle DIN 276) [19]. Miete laut SoftGuide ab 100 €/Monat, Floating-Lizenzen [20] | GAEB 90/2000/XML, DA11/X31, GAEB-zertifiziert [18][20] | BIM-/IFC-Mengen, BIM-LV-Container [18] | 7.500 Installationen, erste 2002 (SoftGuide, Stand 01/2025) [20] |
| **AVANTI** (BAUER SOFTTECH GmbH, Neustadt/Weinstraße; Orca Group) | Windows. Mengenermittlung GRAVA connect im Browser [21] | **Miete** 125 / 175 / 250 €/Monat (AVANTI / pro / BIM). **Kauf** 1.400 / 2.700 / 3.600 € Erstlizenz. Floating-Lizenz, Folgelizenzen günstiger [21] | GAEB-Schnittstelle [21] | IFC 2x3/IFC 4, Revit-Plugin. Grafische Mengen aus PDF/DWG. Version 2026 mit E-Rechnungs-Export (XRechnung/ZUGFeRD erzeugen; ein Import eingehender E-Rechnungen ist nicht beschrieben) und Mängel/Einbehalten [21]. KI-Plananalyse in GRAVA connect [22] | SOFTTECH gegründet 1985 [22] |
| **BUILDUP** (BauerSoftware, jetzt BAUER SOFTTECH; Orca Group) | Windows. „Cloud-Version“ heißt hier gehostetes Windows-Programm, Bautagebuch-App [24] | Preise nicht öffentlich [24] | GAEB-Schnittstelle [24] | AVA + Kosten + HOAI + Zeiterfassung + Bautagebuch in einem Programm. KI ab V31 (LV, PDF lesen, BIM-Auswertung, HOAI-Prüfung), Beta ab 08/2026 [24][22] | BauerSoftware gegründet 1986 [22] |
| **ARCHITEXT Pallas** (NOVA BUILDING IT GmbH, ehem. ARCHITEXT Software GmbH, Mühltal) | Windows 10+. Firebird 5.0 inklusive, optional MS SQL/Oracle, Citrix/Terminalserver [26] | Individuelle Angebote je Modul- und Lizenzanzahl [25][26] | Zertifizierte Schnittstellen (GAEB, Datanorm, REB) [26] | Editionen Basic und Professional. **Pallas Online** nimmt keine Neukunden mehr an, Verlängerungen nur bis 31.12.2025, Nachfolger ist NOVA AVA. Desktop-Version V6.1.2509.15 (09/2025) [25] | Seit 1985 [25] |
| **BECHMANN AVA / flex** (BECHMANN GmbH, Frankenthal) | Desktop mit Produktaktivierung, Details k. A. [37] | Nicht öffentlich [37] | AVA 2026 und flex sind für GAEB XML 3.3 zertifiziert (08/2026) [37] | **BECHMANN BIT** als Gratis-Tool für Bieter. Baustein BECHMANN BIM [37] | Laut eigener Angabe rund 50 Jahre am Markt, Umzug nach Frankenthal 2025 [37] |
| **SJ AVA** (SJ Software GmbH, Aachen, seit 1989) [27] | Windows, on-premises [29] | **Miete 220 €/Jahr** ohne Vertragsbindung, Updates und Support inklusive. Pakete 450–1.200 €/Jahr, Module 28–90 €/Jahr [28][29]. Seit 2022 Mietmodell, Lizenzen lassen sich pausieren und reaktivieren [30] | DA 81–84, 86 für GAEB 90/2000/XML 3.3 [29] | Schnittstellen zu Ausschreiben.de, BKI, Heinze, RMV, SIRADOS, STLB-Bau [28][29] | >10.000 Installationen [29] |
| **nextbau** (f:data GmbH, Weimar) | Desktop + Cloud-Erweiterung **365bau** für Browser und Smartphone [32] | **Architekten ab 570 €/Jahr**, Komplett+ 975 €/Jahr (Abo) [32]. softwareabc24 nennt abweichend 870 € Kauf [35] | Import/Export, X81, DA11/31 [32] | Die Architekten-Edition enthält bereits STLB-Bau und DBD-BauPreise, dazu Bauprofessor-Wissen [32] | f:data: 225.000 Nutzer über alle Produkte (Herstellerangabe) [32] |
| **ASBwin** (Heitker GmbH, Hannover) | Windows, on-premises [33] | Ab 400 € (Paket 1 SBE), Wartung kostenpflichtig [33]. Dr. Web nennt 640–3.840 € Kauf [2] | GAEB-LV, Angebotsimport/-export [33] | Raumbuch, Bauzeitenplan, DMS. Version 20 [33] | ~8.000 Installationen, seit 1992 [33] |
| **AFAP-AVA** (fecho software, Witten) | Desktop, on-premises [34] | 295 € Kauf (Portalangabe) [34] | Nicht genannt | Preisspiegel, Bauzeitenplan, Bautagebuch, für Kleinbüros [34] | Keine Bewertungen [34] |
| **Hottgenroth LV/AVA** (Hottgenroth Software) | Desktop, Erweiterung der Bürosoftware [36] | 999 € Kauf [36] | Nicht genannt [36] | Mengen aus HottCAD, DIN-276-Auswertung. Weitere Schnittstellen nur mit Pflegevertrag [36] | k. A. |
| **MWM-Libero** (MWM Software & Beratung) | Windows. Aufmaß 365 im Browser [69][70] | Ab 1.890 €, nur für Gewerbetreibende (Stand 01/2026) [70] | GAEB-zertifiziert [69] | Schwerpunkt Aufmaß und Bauabrechnung, eher für Auftragnehmer. XRechnung [69] | 16.000 Lizenzen, davon 10.000 über Partner (09/2025) [69] |

Weitere Befunde:
- **Archiwin:** heise listet nur „archiwin SJ AVA 9.5“ von WESA Distribution, 3 Lizenzen für 475 €, für Windows 95 bis Vista [31]. *Einschätzung:* Das ist ein veralteter Vertriebsname bzw. eine Altversion von SJ AVA, kein eigenständiges aktuelles Produkt.
- **„BauPlus“:** Kein AVA-Produkt dieses Namens nachweisbar (siehe *Offene Fragen*).
- **Konsolidierung:** LEA Partners übernahm ORCA im Juli 2024. SOFTTECH und PROJEKT PRO waren damals schon im LEA-Portfolio, zusammen hatten sie über 200 Mitarbeitende [73]. Bis Februar 2026 entstand daraus die Orca Group mit acht Anbietern, inzwischen neun Marken einschließlich Ausschreiben.de [23][71][72]. Im Oktober 2026 wurden BauerSoftware und SOFTTECH zur BAUER SOFTTECH GmbH verschmolzen, mit rund 50 Mitarbeitenden. Marken, Lizenzen und Verträge bleiben laut Unternehmen bestehen [22]. Laut Orca Group soll sich für Anwender nichts ändern, Ziel seien engere Schnittstellen [23].

## 3. KI-Start-ups und KI-Werkzeuge rund um das LV

| Werkzeug (Anbieter) | Funktion (laut Hersteller) | GAEB | Hosting | Preis | Reife / Traktion |
|---|---|---|---|---|---|
| **BauGPT Pro** (BauGPT GmbH, ehem. Crafthunt, München, gegr. 2022) | Bau-Chatassistent. LVs erstellen, prüfen und aus Plänen ableiten, Angebote vergleichen, Protokolle schreiben, Firmenwissen (SharePoint, PlanRadar) durchsuchen [56] | Liest .x83/.x84, exportiert GAEB (.x83) [55][56] | Deutschland, Daten getrennt, keine Weitergabe an Modellanbieter [56] | Free / Pro (Festpreis pro Nutzer, nicht veröffentlicht) / Business ab 5 Nutzern [56] | Umbenennung 10/2025, über 70.000 Nutzer aus Bau und Handwerk [57] |
| **BAU AI** (BAU AI GmbH) | Vier Agenten: Ausschreibungssuche, Vertragsprüfung, Angebotsvergleich, Mengen aus 2D-PDF (Beta) [58] | Liest X81–X86, exportiert X83–X86 [58] | AWS Frankfurt. Single-Tenant oder on-premises auf Anfrage [58] | Solo/Duo/Studio/Enterprise auf Anfrage, dazu ein erfolgsbasierter „Win-Plan“ ohne Grundgebühr [58] | 300+ registrierte Firmen, 1,5 Mio. € Forschungszulage [58] |
| **PlanQ** (PlanQ GbR, Leipzig, Ausgründung HTWK) | Erkennt Wände, Öffnungen und Räume in 2D-Plänen (Graph Neural Network), schlägt Mengen vor, vergleicht Planstände [59] | X31-Export [59] | k. A. | k. A. | Prototyp, Piloten ab Q1/2027, Marktstart geplant Q4/2027, EXIST-gefördert [59] |
| **condesk** (Raum München) | KI rechnet Mengen vor, ein Bauingenieur gibt jede Zeile frei. Dienstleistung, keine Software [60] | X31 + Aufmaß-PDF [60] | Eigene Server in DE [60] | Erfolgsbasiert nach Volumen [60] | k. A. |
| **GovRadar** (München) | Leistungsbeschreibungen und Vergabeunterlagen für Vergabestellen [62] | k. A. | Azure Frankfurt [62] | Auf Anfrage, in NRW über Landeslizenz [62] | k. A. |
| KI in Bestandsprodukten | Phase0-Agent, NOVA NEO, SIDOUN IILSE, SIRADOS-Bepreisung, BUILDUP V31, GRAVA connect (siehe oben) | – | – | Meist ohne ausgewiesenen Aufpreis. Ausnahme SIDOUN: Kunden brauchen ein eigenes LLM-Konto [39] | Bei ORCA und California keine KI ausgewiesen. NEVARIS zeigte einen KI-Co-Piloten, RIB baut „Omni“ auf RIB Unify (siehe [Etablierte Anbieter](/okf/research/market/established-vendors.md)) [1][61] |

KI-Syndikat ordnet ein [61]: Es gibt keine unabhängige Studie zur Zeitersparnis. Jede Position braucht weiter eine fachliche Prüfung, denn die Haftung bleibt beim unterzeichnenden Planer. Vertrauliche Unterlagen gehören ohne Vertrag nicht auf fremde Server, und für die Einführung sollte man 4–6 Wochen und ein Pilotgewerk einplanen. Ein generischer Chat-Assistent wie ChatGPT (8–23 €/Monat) oder Claude Pro (18 €/Monat) liefert Text, aber keinen GAEB-Export [61].

## 4. Bieterzugang, Ausschreibungsplattformen und E-Tendering-Helfer

| Lösung | Mechanik | Kosten | Quelle |
|---|---|---|---|
| Phase0 Online-LV | Link an Bieter, Bepreisung im Browser ohne Account, automatischer Preisspiegel, GAEB-Export als Alternative | In der AVA-Lizenz enthalten | [8] |
| SIRADOS 365 AVA | Bieter tragen Angebote im System ein oder importieren GAEB, Bearbeitung bis zur Submission | In der AVA-Lizenz enthalten | [44] |
| Cosuno (Cosuno Ventures GmbH, Berlin) | KI-Ausschreibungsplattform und Nachunternehmer-Marktplatz, auch für Architekten. Laut Hersteller 280.000+ Nachunternehmer, 600+ Auftraggeber, 4.000+ Ausschreibungen pro Monat | Auf Anfrage, Basisumfänge laut AGB kostenlos [62]. Series B 30 Mio. USD (02/2022, Lead Avenir, Bewertung 150 Mio. USD, möglicherweise veraltet) | [63][62][64] |
| BECHMANN BIT | Kostenloses Tool für Bieter: Preise eintragen, Angebot abgeben, GAEB-Austausch | Kostenlos | [37] |
| Bieter-Suchdienste (VergabePilot, TendiGo, Patterno, DTAD) | Durchsuchen öffentliche Portale für Bieter. Für den Planer nur indirekt relevant | z. B. VergabePilot 0/60/125 €/Monat, TendiGo 0/39/89/230 €/Monat | [62] |
| Vergabemanagement (z. B. cosinex mit KI-„Intelligence Hub“ seit 2026) | Seite der öffentlichen Auftraggeber | k. A. | [62] |

*Einschätzung:* Cloud-AVA ersetzt für **private** Auftraggeber zunehmend den E-Mail-Versand von GAEB-Dateien durch Bieter-Links. Für **öffentliche** Auftraggeber bleibt die E-Vergabe-Plattform der Pflichtkanal (siehe [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md)). Keiner der Neulinge wirbt mit einer direkten Plattform-Anbindung [8].

## 5. Kostenplanungswerkzeuge

| Werkzeug | Modell und Preis (netto) | Betrieb | Besonderheiten |
|---|---|---|---|
| **BKI Kostenplaner 2027** | Kauf je Ausgabe: Freianlagen 599 €, Recherche 699 €, Statistik 799 €, Statistik plus 1.399 €, Positionen 1.899 €. Updates 309–799 €, Zweitlizenz 30 % des Listenpreises [50][47] | Nur Windows, Netzversion mit SQL Server 2019+. Mac nur per Virtualisierung oder Remote Desktop [47] | Über 1 Mio. Kostenkennwerte, 160+ Gebäudearten. GAEB-Export X51/X82, mit Positionen auch X80. GAEB 3.4 vorbereitet. IFC/CAD-Mengen aus Revit, Archicad, Vectorworks, Elitecad [47] |
| **BKI KoRa** | Ab 41 € netto für 2 Wochen oder Jahresabo. KI-Syndikat nennt 199 € netto pro Jahr [48][50] | Web-App für PC und Tablet (Windows, macOS, iPadOS, Android) [48] | Nur Wohnbau. Kosten nach DIN 276 für KG 300/400 bis Ebene 2 aus wenigen Merkmalen, Basis über 20.000 Kostenplanungen [48][49]. Die Server-Region nennt BKI nicht [50] |
| **SIRADOS 365 Kostenplanung** | Ab 399 €/Jahr [46] | Browser + Windows-Offline [46] | Vom Kostenrahmen bis zur Kostenberechnung, GAEB, KI-Bepreisung [46] |
| **DBD** (Dr. Schiller & Partner) | Lizenzprodukte, auf der Startseite keine Preise [51] | Browser-App für DBD-KostenAnsätze, CAD-Plug-ins für Archicad und Revit, Online-BIM-Portal [51] | STLB-Bau (79 Gewerke), DBD-BauPreise, DBD-KostenKalkül. DBD-BIM Elements ersetzt die früheren DBD-KostenElemente [51]. Die DBD-BaukostenApp ist laut Dr. Web kostenlos [2], die DBD-Seite sagt dazu nichts [51] |
| **SJ KOSMA** | 90 €/Jahr Miete [28] | Windows | Kostenermittlung nach DIN 276 als SJ-Modul [28] |
| **NOVA NEO** | In NOVA AVA (siehe 1.3) | Browser | „Baukosten-KI“ [52] |

*Einschätzung:* Kostenkennwerte (BKI, SIRADOS, DBD) sind das eigentliche Geschäftsmodell der Datenhäuser, die Software wird zur Beigabe. BKI-Daten hinken dem Markt laut KI-Syndikat 2–3 Jahre hinterher. Eine Einzelprojekt- oder Pay-per-Use-Option gibt es außer KoRa nicht [50]. Details zum Verfahren stehen in [DIN 276](/okf/research/standards/din-276-cost-planning.md).

## 6. Kostenlose und sehr günstige Werkzeuge (inkl. Excel)

| Werkzeug | Umfang | Einschränkung | Quelle |
|---|---|---|---|
| AVAPLAN Base | Voll lauffähige AVA-Basisversion, unbefristet | Windows, Download nur gegen Kontaktdaten. Der Funktionsumfang der Base-Edition ist auf der Herstellerseite nicht einzeln aufgelistet. Preisspiegel, Rechnungsprüfung und Kostenprognose werden für Lite, Pro und ProPlus genannt | [15][16] |
| SIDOUN Globe4all | LV, Vergabe, Abrechnung, laut Hersteller ohne Zeit- oder Funktionslimit | Upsell-Pfad zu Globe/KIAVA | [40] |
| Phase0 GAEB-Viewer | Online, ohne Registrierung. Liest GAEB 90/2000/XML | Nur anzeigen | [9] |
| GAEB-Viewer von T&T Datentechnik | Kostenlose Vollversion ab Windows 10. Anzeigen und Prüfen von GAEB 90/2000/XML und ÖNORM A 2063 | Kein Bearbeiten, kein Export | [61] |
| BECHMANN BIT | Bieter-Tool für Preiseintrag und GAEB-Austausch | Nur Bieterseite | [37] |
| Ausschreiben.de | Kostenlose Ausschreibungstexte und Bauproduktdaten (Herstellertexte). Gehört zur Orca Group | Produktbezogene Texte | [28][72] |
| Excel-Vorlagen | Phase0 verteilt kostenlose Vorlagen für LV, DIN 276 und Bauzeitenplan, als Lead-Magnet. SIDOUN baut eine Excel-Kopplung in KIAVA ein | Kein GAEB, keine Prüfung | [5][39] |

Widerspruch: Dr. Web schreibt, Gratisversionen wie AVAPLAN Base, Globe4all und die DBD-BaukostenApp deckten meist keine Preisspiegel, keine Abrechnung und keinen Mehrplatzbetrieb ab [2]. SIDOUN sagt dagegen ausdrücklich, Globe4all enthalte Vergabe und Abrechnung ohne Einschränkung [40]. Der genaue Funktionsumfang wäre per Test zu klären. GAEB-Werkzeuge im Detail stehen in [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md).

## 7. Angrenzende Bau-SaaS – Abgrenzung

| Produkt | Kernnutzen | Preismodell | AVA/GAEB? |
|---|---|---|---|
| **Capmo** | Bauleitung: Pläne, Bautagebuch, Mängel, Aufgaben, Nachträge, Dokumente. Mobil und offline | Nach Bau- bzw. Honorarvolumen, Einstiegspakete laut Anbieter meist im mittleren vierstelligen Euro-Bereich, unbegrenzte Nutzer, ISO 27001 [65] | Nicht erwähnt [65] |
| **PlanRadar** | Mängel- und Baudokumentation | Basic 26 €, Starter 89 €, Pro 129 € pro Nutzer und Monat, Enterprise individuell, unbegrenzte Projekte [66] | Nicht erwähnt [66] |
| **Thinkproject** | CDE, BIM-Koordination und Analytics für große Bauherren und Infrastruktur, 3.000+ Kunden, Sitz München | Nicht öffentlich [67] | Ausschreibung auf der Startseite nicht erwähnt [67] |
| **Alasco** | Kosten-, Finanz- und Cashflow-Controlling für Projektentwickler und Investoren, München | Nicht auf der Startseite [68] | DIN 276/GAEB nicht erwähnt [68] |
| **untermStrich** (everii Austria GmbH; everii Group mit KOBOLD, MOCO u. a.) | Büromanagement für Planer: Stunden, Honorare, Kosten, Abrechnung, DATEV | 19 / 29 / 39 € pro Nutzer und Monat plus 60 / 120 / 160 € Grundgebühr. Onboarding 1.399–2.999 €, DATEV-Add-on ab 50 €/Monat. 6.000+ Kunden [53][54] | **Kein AVA-Modul** erkennbar [53][54] |
| **PROJEKT PRO** (Orca Group) | Controlling und Büromanagement | k. A. | Nein, aber Schwester von ORCA [72][73] |

*Einschätzung:* Bausoftware zerfällt in drei Felder. Das **kaufmännische Planer-Werkzeug** (AVA, Kosten, Honorar) ist unser Feld. Daneben stehen die **Baustellen- und Doku-Plattformen** (Capmo, PlanRadar) und die **Großprojekt-CDE bzw. Investorensicht** (Thinkproject, Alasco). Phase0 und BUILDUP greifen über das Bautagebuch in das zweite Feld über. Für ein Open-Source-AVA reicht später eine Export- oder Link-Schnittstelle zu diesen Plattformen.

## 8. Preisvergleich: Was kostet ein AVA-Arbeitsplatz?

Eigene Berechnung aus Listenpreisen (netto, Stand des Abrufs 09.11.2026), ohne Text- und Preisdatenbanken, ohne Schulung und ohne MwSt.

| Produkt / Edition | Modell | 1 Platz, Jahr 1 | 1 Platz, ab Jahr 2 | Quelle |
|---|---|---|---|---|
| AVAPLAN Base / Globe4all | Freemium | 0 € | 0 € | [15][40] |
| SJ AVA | Miete | 220 € | 220 € | [28] |
| AFAP-AVA | Kauf | 295 € | k. A. | [34] |
| AVAPLAN Lite | Kauf | 390 € (1. Jahr Service gratis) | 97,50 € Service (25 %) | [15] |
| SIRADOS 365 AVA (Modul) | Jahreslizenz | ab 399 € | ab 399 € (+ Baudaten) | [45] |
| NOVA AVA Starter / Business | Jahresabo | 529 € / 1.393 € | gleich | [52] |
| nextbau Architekten (inkl. STLB-Bau + DBD-Preise) | Abo | 570 € | 570 € | [32] |
| AVAPLAN ProPlus | Abo / Kauf | 679 € / 1.549 € | 679 € / 387,25 € Service | [15] |
| ORCA AVA Starter / Professional | Abo inkl. Service | 828 € / 1.788 € | gleich | [1] |
| Phase0 Einzellizenz AVA | jährlich / monatlich | 960 € / 1.200 € | gleich | [5] |
| Hottgenroth LV/AVA | Kauf | 999 € | Pflegevertrag k. A. | [36] |
| AVANTI / AVANTI pro | Miete | 1.500 € / 2.100 € | gleich | [21] |
| AVA.relax Professional | Kauf | 1.897 € | Wartung k. A. | [19] |
| Phase0 Volle Lizenz (AVA + HOAI + Bautagebuch) | jährlich / monatlich | 1.920 € / 2.400 € | gleich | [5] |
| AVANTI BIM | Kauf | 3.600 € | Wartung k. A. | [21] |

**Beispiel Büro mit 3 AVA-Plätzen pro Jahr:** AVAPLAN ProPlus-Abo kostet 679 € + 2 × 339,50 € = 1.358 € [15]. NOVA AVA Business (jährlich) kostet 3 × 1.393 € = 4.179 € [52]. Phase0 Einzellizenz AVA (jährlich) plus Preisdatenbank kostet 3 × 960 € + 240 € = 3.120 €, die Volle Lizenz 5.760 € [5]. ORCA Professional kostet 1.788 € + 2 × 1.428 € = 4.644 € [1]. AVANTI pro zur Miete kostet 3 × 2.100 € = 6.300 €, unter der Annahme, dass der Mietpreis je Lizenz gilt [21]. Datenbank-Zuschläge kommen hinzu, z. B. STLB-Bau ab 990 €/Jahr, BKI-Positionen 350 €/Jahr, Heinze ab 430 €/Jahr, SIRADOS ab 239 €/Jahr (Mietpreise jeweils über SJ, Paket nicht genannt) [28]. Beim Vertriebspartner WESA kostet STLB-Bau online je Platz und Jahr 799,43 € (Paket Architektur) bzw. 1.527,45 € (Komplett), kleinere Fachpakete ab 378,68 € (Freianlagen) [77]. Die „ab“-Preise sind also nur innerhalb desselben Anbieters und Pakets vergleichbar.

*Einschätzung:* Die reine Software ist bei Desktop-Nischenanbietern sehr günstig. Teuer werden Cloud-Pro-Nutzer-Modelle bei mehreren Plätzen, Funktionsbündel und Datenbanken. Für das Schmerzthema „Preis/Lizenz“ des Architekten-Freundes (siehe [Schmerzpunkte](/okf/research/market/pain-points.md)) zählen daher die Gesamtkosten mit Textdaten, Wartung und Plätzen, nicht der Listenpreis.

## 9. Muster und Trends

**Preismodelle**
1. **Pro Nutzer und Monat mit Jahresrabatt** ist im Cloud-Segment Standard: Phase0 −20 %, NOVA 5–10 % [5][52].
2. **Funktionsbündel nach Rolle** statt nach Modulen, z. B. Phase0 „Bauleiter“ ohne Honorarsicht [5]. Editionen nach Leistungsphasen gibt es bei ORCA [1].
3. **Freemium als Einstieg:** AVAPLAN Base, Globe4all, BauGPT Free, Gratis-GAEB-Viewer [15][40][56][9].
4. **Pause statt Kündigung:** Phase0 für 10 €/Monat, NOVA laut ARCHITEXT ebenfalls, SJ mit pausierbaren Mietlizenzen [5][25][30]. Damit gehen die Anbieter auf Gelegenheitsnutzer ein.
5. **Kauf mit Wartungsquote** lebt bei Desktop-Anbietern weiter, z. B. AVAPLAN mit 25 % pro Jahr. Floating-Lizenzen haben AVANTI und AVA.relax [15][21][20].
6. **Volumen- und erfolgsbasierte Modelle** gibt es am Rand: Capmo nach Bauvolumen, BAU AI mit „Win-Plan“, condesk nach Aufmaßvolumen [65][58][60].
7. **Daten als eigentliches Produkt:** SIRADOS, nextbau, BKI und DBD verkaufen Texte und Preise, die Software ist Beigabe [43][32][47][51].
8. **Bildungslizenzen:** Phase0 gratis für Studierende, SOFTTECH mit kostenlosen Ausbildungsversionen, BUILDUP mit Studentenversion [5][21][24].

**KI**
- Die Funktionen ähneln sich stark: LV per Chat, VOB/DIN-Textprüfung, KG-Zuordnung nach DIN 276, Preisvorschläge, Rechnungs- und Nachtragsprüfung, Mengen aus PDF/IFC, Bautagebuch aus Sprachnachrichten [1][7][24][39].
- Drei Architekturen: (a) **eigene Modelle oder eigener Hub** (NOVA, laut Anbieter), (b) **Kunde bringt sein eigenes LLM-Konto mit** (SIDOUN), (c) **nicht offengelegt** (Phase0) [1][39][7].
- Hosting in Frankfurt oder Deutschland ist ein zentrales Verkaufsargument: NOVA, BAU AI, BauGPT, Phase0 [1][58][56][6].

**Mobil und Baustelle:** Fast alles läuft im Browser. Die Baustellen-Erfassung wandert in Messenger (Phase0 per WhatsApp) oder in Apps (BUILDUP-Bautagebuch, Capmo, PlanRadar) [6][24][65][66]. Mengen werden im Browser auf PDF-Plänen ermittelt (GRAVA connect, Aufmaß 365) [21][69].

**Zusammenarbeit:** Bieter-Links und Bieter-Eingabe ersetzen den Dateiversand (Phase0, SIRADOS). Netzwerk-Plattformen wie Cosuno bündeln Nachunternehmer und Ausschreibungen in großer Zahl [8][44][63]. Phase0 macht aus dem Bieter-Rücklauf eine Preisdatenbank [7]. *Einschätzung:* Das ist ein Netzwerkeffekt, den ein Open-Source-Projekt ohne zentrale Instanz nicht automatisch hat.

**Offenheit:** GAEB ist die gemeinsame Minimal-Schnittstelle, selbst bei 220-€-Produkten [29]. Eine dokumentierte **öffentliche API** für AVA-Projektdaten ist im Cloud-Segment nur von NOVA bekannt (siehe [NOVA API](/okf/research/nova-ava/api-and-data-model.md)). SIRADOS nennt einen API-Export nur für seine Baudaten [45], Phase0 nennt auf der Website keine API [6]. Pallas setzte schon früh auf offene Datenbanken (Firebird/SQL) und XML-Webservices [26]. Einen vollständigen Projektexport jenseits von GAEB, PDF und Excel bewirbt keiner der geprüften Anbieter.

**Konsolidierung:** Es gibt zwei Plattform-Klammern. Die Orca Group umfasst AVA, CAD, CDE, Controlling und Texte, ihr Kern gehört seit 2024 zum Portfolio von LEA Partners [23][72][73]. Die everii Group deckt Bürosoftware ab [54]. Dazu kommt die Bündelung Architext/NOVA [25]. *Einschätzung:* Mittelfristig drohen Preisharmonisierung und Produktbereinigung, auch wenn die Konzerne derzeit Kontinuität zusagen [22][23].

**Mac und Betriebssysteme:** Unter den geprüften Desktop-AVAs ist keine native macOS-Version dokumentiert. Die Hersteller verweisen auf Parallels oder Remote Desktop [16][47]. Nur Browser-Produkte bedienen den Mac nativ (Phase0, NOVA, SIRADOS online, BKI KoRa) [6][52][43][48].

## 10. Unterversorgte Segmente (Einschätzung)

1. **Kleinst- und Gelegenheitsbüros**, die nur wenige Ausschreibungen pro Jahr haben, aber den vollen Ablauf brauchen (Preisspiegel, Abrechnung, Kostenkontrolle). Abos pro Nutzer und Monat bestrafen sie. Gratisversionen sind entweder Windows-only (AVAPLAN Base) oder Upsell-Einstiege (Globe4all). Pay-per-Projekt gibt es praktisch nicht, nur BKI KoRa mit 2-Wochen-Zugang [15][40][48].
2. **Mac-Büros**, die lokal oder offline arbeiten wollen. Heute bleibt nur Cloud-SaaS oder Windows-Virtualisierung [16][47].
3. **Datenhoheit und Self-Hosting.** Cloud-Anbieter hosten zwar in Deutschland, sind aber nicht selbst betreibbar. On-premises ist fast nur unter Windows zu haben. BAU AI bietet on-premises nur für KI-Agenten und nur auf Anfrage [58]. Eine selbst hostbare Web-AVA, etwa im Docker-Container, wurde nicht gefunden.
4. **Transparente, stabile Preise.** Viele Anbieter nennen Preise nur „auf Anfrage“ (Pallas, BECHMANN, KIAVA, BUILDUP, Capmo). Preisänderungen kommen vor (NOVA ab 01.05.2026), und die Konsolidierung nimmt zu [26][37][41][24][65][52][23].
5. **Öffentliche Auftraggeber mit KI-Vorbehalten.** Gebraucht werden KI-freie oder lokal betriebene KI-Optionen, denn externe LLM-Konten sind vergaberechtlich und datenschutzrechtlich heikel [1][61].
6. **Vendor-neutrale Interoperabilität.** Ein vollständiger, offener Projektexport für Archivierung und Anbieterwechsel fehlt durchgängig. GAEB deckt LV und Angebote ab, aber nicht Kostenverfolgung, Nachtragshistorie oder Rechnungsprüfung (siehe [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)).

## Relevanz für unser Projekt

**Muss-Anforderungen (abgeleitet aus dem Wettbewerbsniveau)**
- **M1 – GAEB DA XML 3.3:** Import und Export mindestens für X81, X83, X84 und X86, dazu X31 für Mengen. GAEB 90 und GAEB 2000 sollten zumindest gelesen werden. Das bietet selbst SJ AVA für 220 €/Jahr [29][15]. Siehe [GAEB-Tooling](/okf/research/standards/gaeb-tooling-interop.md).
- **M2 – Durchgängiger LPH-6–8-Kern:** LV, Angebotsprüfung, Preisspiegel, Vergabe, Auftrags-LV, Aufmaß und Rechnungsprüfung, Nachträge und Kostenkontrolle nach DIN 276. Genau hier trennen sich Gratis- und Bezahlversionen [2][15][19]. Siehe [Prozess I](/okf/research/process/tendering-and-award.md) und [Prozess II](/okf/research/process/billing-and-cost-control.md).
- **M3 – Browser-Oberfläche** für Mac und Windows, weil das im Cloud-Segment Standard ist [5][52][43].
- **M4 – Bieterzugang** per Link mit Preiseingabe ohne Account, dazu GAEB-X84-Import als Rückfallebene [8][44].
- **M5 – E-Rechnungen (XRechnung/ZUGFeRD) in der Rechnungsprüfung** einlesen, wie es ORCA AVA 27 (Übernahme aus XRechnungen in den Rechnungslauf) und CaliforniaX V26 (Modul ERE, E-Rechnungsprüfung mit LV-Abgleich) vorleben [75][76]. AVANTI 2026 erzeugt E-Rechnungen dagegen nur (Export) [21]. Siehe [Etablierte Anbieter](/okf/research/market/established-vendors.md).
- **M6 – Export nach PDF und Excel** mit eigenen Drucklayouts, wie bei allen Wettbewerbern.

**Differenzierungschancen**
- **D1 – Kostenlos und selbst hostbar** (z. B. Docker) mit voller Datenhoheit. Das adressiert die Segmente 1–3 und lässt sich optional als gehostete Instanz anbieten.
- **D2 – Kein Lock-in:** Offenes, dokumentiertes Projektformat mit Komplett-Export und -Import, also mehr als GAEB. Ein Importpfad aus NOVA, etwa über deren API, könnte Umsteiger gewinnen (siehe [NOVA API](/okf/research/nova-ava/api-and-data-model.md)).
- **D3 – KI optional und austauschbar:** lokales Modell oder eigener API-Schlüssel, mit Protokoll jeder KI-Änderung am LV. Ohne KI muss alles voll funktionieren, das ist das Argument für öffentliche Auftraggeber [1][61].
- **D4 – Transparente Gesamtkosten:** null Lizenzkosten, Texte wahlweise aus freien Quellen (z. B. Herstellertexte über GAEB-Import) oder aus eigenen lizenzierten Datenbanken.
- **D5 – API-first und Plugins** für Brücken zu Capmo, PlanRadar, CAD/IFC und Bürosoftware.

**Risiken**
- **R1 – Wettbewerb durch „gut genug und billig“:** AVAPLAN Base und Globe4all sind gratis, SJ AVA kostet 220 €/Jahr, SIRADOS 365 ab 399 €/Jahr [15][40][28][45]. Allein über den Preis gewinnt ein Open-Source-Projekt deshalb nicht. Den Unterschied müssen Bedienbarkeit, Web und Mac sowie Datenhoheit machen.
- **R2 – Finanzierte Cloud-Konkurrenz:** Phase0 hat 1.000+ Büros, KI-Agenten, VC-Geld und Preisdaten-Netzwerkeffekte [5][7][11].
- **R3 – Lizenzbarrieren bei Inhalten:** STLB-Bau, SIRADOS-, BKI- und DBD-Daten sind kostenpflichtig lizenziert und lassen sich nicht mitliefern. Für Schnittstellen sind ggf. Zertifizierungen nötig (siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) und [Open-Source-Bausteine](/okf/research/open-source/building-blocks-and-licensing.md)).
- **R4 – GAEB-Zertifizierung als Vertrauenssignal:** Fast alle Anbieter werben damit [18][37][69]. Kosten und Ablauf der Zertifizierung siehe GAEB-Notizen.
- **R5 – Haftung und Recht bei KI-LVs:** Die Verantwortung bleibt beim Planer [61]. Ein gehosteter Betrieb verlangt außerdem AVV, DSGVO-Pflichten und Support.
- **R6 – Scope Creep:** Wettbewerber bündeln HOAI, Zeiterfassung und Bautagebuch [5][24]. *Einschätzung:* Wir sollten uns auf den AVA-Kern konzentrieren und angrenzende Funktionen per Schnittstelle lösen.

**Aufwandsschätzung (grobe Einschätzung)**
- MVP mit LV-Editor, GAEB X83-Export und X84-Import, Preisspiegel, Vergabe und PDF-Ausgabe: **ca. 4–8 Personenmonate.**
- Vollständige LPH 6–8 mit Aufmaß nach REB/X31, Rechnungsprüfung inkl. E-Rechnung, Nachträgen, DIN-276-Kostenkontrolle, Mehrbenutzerbetrieb und Rollen: **zusätzlich ca. 12–24 Personenmonate.**
- Bieter-Link-Portal: **ca. 1–3 PM.** Optionale KI-Assistenz für Textvorschläge und Prüfungen: **ca. 2–6 PM.**
- **Abgleich (09.11.2026):** Andere Notizen schätzen ähnliche Umfänge anders: LPH 6–7 4–12 PM, LPH 8 allein 4–12,5 PM, die vollständige LPH 6–8 zwischen 9 und 35 PM (hier 16–32 PM ohne Portal). Der Umfang (Bieterportal, Kostenplanung, Rechte, Berichte, Zertifizierungsreife, E-Rechnungs-Import) erklärt das nur teilweise (widersprüchlich - siehe Offene Fragen). Gegenüberstellung aller Schätzungen: [Schmerzpunkte, Aufwandsschätzung](/okf/research/market/pain-points.md).

## Offene Fragen

**Nicht gefunden oder nicht verifiziert**
- **„BauPlus“:** Kein AVA-Produkt dieses Namens nachweisbar. Möglicherweise ist eine Verwechslung gemeint, etwa BUILDUP von BauerSoftware oder das Bauprofessor-Angebot von f:data.
- **Archiwin:** Gefunden wurde nur ein alter Download-Eintrag als Vertriebsname von SJ AVA [31]. Der aktuelle Status ist unklar.
- **Preise nicht öffentlich:** KIAVA/Globe, BUILDUP, Pallas, BECHMANN, BauGPT Pro, BAU AI, Cosuno, Capmo-Details, Thinkproject. Unklar sind auch die Mietpreise von AVA.relax (SoftGuide nennt ab 100 €/Monat, auf der Herstellerseite fehlen sie) und ob die AVANTI-Miete pro Lizenz gilt.
- **Phase0:** Welche KI-Modelle bzw. Anbieter laufen dahinter? Ist die KI dauerhaft im Preis enthalten? Gibt es einen Datenexport und eine API? Wie ist der tatsächliche Stand der Mengenermittlung? Die Quellen widersprechen sich hier [1][12][14].
- Ob die **DBD-BaukostenApp** gratis ist, sagt nur Dr. Web [2]. Die Preise von Hottgenroth (999 €) und ASBwin (400 € vs. 640–3.840 €) haben unterschiedliche Bezugspunkte [33][2][36].
- **Funktionsumfang der Gratisversionen** (Preisspiegel, Abrechnung): Die Quellen widersprechen sich [2][40].
- Weitere sehr junge KI-Start-ups für LV oder Mengen konnten nicht systematisch gesucht werden, weil das Suchkontingent aufgebraucht war. Ebenso fehlen Funding-Daten zu Alasco und Thinkproject.
- Die Cosuno-Finanzierungsdaten stammen von 2022, aktuellere Runden wurden nicht geprüft [64].
- **STLB-Bau bei SJ:** Welches Paket der Preis „ab 990 €“ pro Jahr meint und ob es Online- oder Offline-Daten sind, sagt die SJ-Preisseite nicht [28].
- **Aufwandsschätzungen abgleichen:** Die Notizen nennen für gleiche Umfänge Werte, die um den Faktor 2–3 auseinanderliegen (Gegenüberstellung in [Schmerzpunkte](/okf/research/market/pain-points.md)). Offen ist eine gemeinsame Bottom-up-Schätzung mit einheitlichem Umfang, einheitlicher Einheit (1 PM ≈ 4 PW ≈ 20 PT) und klaren Annahmen.

**Fragen an den Architekten-Freund**
1. Wie viele Plätze nutzt du, auf welchem Betriebssystem? Arbeitest du auch mobil oder offline auf der Baustelle?
2. Welche NOVA-Funktionen nutzt du wirklich (LV, Preisspiegel, Abrechnung, Kostenkontrolle, BIM-Add-on, KI „NEO“)? Welche fehlen dir?
3. Woher kommen deine Texte (STLB-Bau, eigene Bibliothek, Herstellertexte)? Welche Textlizenzen bezahlst du heute?
4. Wie laufen öffentliche Vergaben bei dir ab: Welche E-Vergabe-Plattformen nutzt du? Lädst du GAEB-Dateien dort manuell hoch?
5. Wären Bieter-Links (Preiseingabe im Browser) bei privaten Bauherren willkommen? Oder erwarten deine Bieter GAEB per E-Mail?
6. Wäre Self-Hosting im Büro (NAS/Server) realistisch, oder bevorzugst du einen gehosteten Dienst?
7. Wie stehst du zu KI im LV: gewünscht, egal oder bei öffentlichen Auftraggebern tabu?
8. Würdest du kurzfristig ein zweites Werkzeug parallel testen, etwa Phase0 (14 Tage), AVAPLAN Base oder Globe4all, um Funktionslücken zu benennen?

## Quellen

1. AVA-Software Vergleich: Alternativen zu ORCA AVA und RIB iTWO – KI-Syndikat (Gerabo GmbH) – https://www.ki-syndikat.de/ava-software-vergleich/ – Art: Presse/Vergleich (Stand 09/2026) – abgerufen 2026-11-09
2. AVA-Software Vergleich 2026 – Dr. Web – https://www.drweb.de/ava-software-vergleich/ – Art: Presse/Vergleichsportal (16.10.2026, bezahlte Platzierungen offengelegt) – abgerufen 2026-11-09
3. AVA.relax Alternativen – softwareabc24 – https://www.softwareabc24.de/alternativen/ava-relax-alternativen – Art: Bewertungsportal – abgerufen 2026-11-09
4. Architekturbüro in Gründung sucht AVA-Software – SoftGuide – https://www.softguide.de/ausschreibungen/architekturbuero-in-gruendung-sucht-ava-software – Art: Bewertungsportal/Softwareauswahl – abgerufen 2026-11-09
5. Preise – Phase0 – https://www.phase0.com/preise – Art: Herstellerangabe (Primärquelle, inkl. Strukturdaten vom 29.09.2026) – abgerufen 2026-11-09
6. Startseite – Phase0 – https://www.phase0.com/ – Art: Herstellerangabe – abgerufen 2026-11-09
7. Künstliche Intelligenz – Phase0 – https://www.phase0.com/kuenstliche-intelligenz – Art: Herstellerangabe – abgerufen 2026-11-09
8. Ausschreibung – Phase0 – https://www.phase0.com/ausschreibung – Art: Herstellerangabe – abgerufen 2026-11-09
9. GAEB-Datei öffnen / GAEB-Viewer – Phase0 – https://www.phase0.com/gaeb-datei-bearbeiten – Art: Herstellerangabe – abgerufen 2026-11-09
10. Phase0 erhält zusätzliches Seedkapital – StartingUp – https://www.starting-up.de/news/news-investments/phase0-erhaelt-zusaetzliches-seedkapital.html – Art: Presse – abgerufen 2026-11-09
11. Phase0 lands €2.6m to automate architects' admin – Berlin Partner (invest-in.berlin) – https://invest-in.berlin/n/phase0-lands-eur26m-to-automate-architects-admin/ – Art: Presse (02.09.2026) – abgerufen 2026-11-09
12. Phase0 integriert KI-Agenten in AVA-Software zur LV-Erstellung – baulinks – https://www.baulinks.de/webplugin/2026/0768.php4 – Art: Presse (02.06.2026) – abgerufen 2026-11-09
13. Leistungsverzeichnisse jetzt mit KI erstellen – Computer Spezial – https://www.computer-spezial.de/news/leistungsverzeichnisse-jetzt-mit-ki-erstellen-4391239.html – Art: Presse (03.06.2026) – abgerufen 2026-11-09
14. Phase0 – SoftGuide – https://www.softguide.de/programm/phase0 – Art: Bewertungsportal/Herstellereintrag (02.07.2026) – abgerufen 2026-11-09
15. Editionen + Preise – AVAPLAN Software GmbH – https://www.avaplan.de/ava-software/editionen-preise/ – Art: Herstellerangabe – abgerufen 2026-11-09
16. AVAPLAN unter macOS – AVAPLAN Software GmbH – https://www.avaplan.de/ava-software/macos/ – Art: Herstellerangabe – abgerufen 2026-11-09
17. Unternehmen – AVAPLAN Software GmbH – https://www.avaplan.de/kontakt/unternehmen/ – Art: Herstellerangabe – abgerufen 2026-11-09
18. Startseite – COSOBA GmbH – https://www.cosoba.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
19. AVA.relax Editionen & Preise – COSOBA GmbH – https://www.cosoba.de/ava-relax/editionen-preise – Art: Herstellerangabe – abgerufen 2026-11-09
20. AVA.relax – SoftGuide – https://www.softguide.de/programm/avarelax – Art: Bewertungsportal/Herstellereintrag (Stand 01/2025) – abgerufen 2026-11-09
21. AVANTI – AVA-Software – BAUER SOFTTECH GmbH – https://www.softtech.de/software/kosten-controlling/avanti-grafische-ava – Art: Herstellerangabe – abgerufen 2026-11-09
22. Zusammenschluss: BauerSoftware und SOFTTECH jetzt BAUER SOFTTECH GmbH – baulinks – https://www.baulinks.de/webplugin/2026/1540.php4 – Art: Presse (18.10.2026) – abgerufen 2026-11-09
23. Konsolidierung im Büromanagementsoftware-Markt: Orca Group bündelt acht Softwareanbieter – iww (PBP) – https://www.iww.de/pbp/unternehmensfuehrung/bueromanagement-konsolidierung-im-bueromanagementsoftware-markt-schreitet-fort-orca-group-buendelt-acht-softwareanbieter-n172004 – Art: Presse (04.02.2026) – abgerufen 2026-11-09
24. BauerSoftware / BUILDUP – BauerSoftware – https://www.bauer-software.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
25. ARCHITEXT AVA Software (Startseite) – NOVA BUILDING IT GmbH / ARCHITEXT – https://www.architext.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
26. ARCHITEXT Pallas Software und Systemvoraussetzungen – NOVA BUILDING IT GmbH / ARCHITEXT – https://architext.de/software/ – Art: Herstellerangabe – abgerufen 2026-11-09
27. Startseite – SJ Software GmbH – https://www.sj-software.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
28. Preise – SJ Software GmbH – https://www.sj-software.de/preise – Art: Herstellerangabe – abgerufen 2026-11-09
29. SJ AVA – SoftGuide – https://www.softguide.de/programm/sj-ava-software – Art: Bewertungsportal/Herstellereintrag (14.01.2026) – abgerufen 2026-11-09
30. SJ Software mit neuem Lizenzmodell – baulinks – https://www.baulinks.de/bausoftware/2022/0022.php4 – Art: Presse (2022) – abgerufen 2026-11-09
31. archiwin SJ AVA – heise Download – https://www.heise.de/download/product/archiwin-sj-ava-51698 – Art: Download-Verzeichnis – abgerufen 2026-11-09
32. nextbau – f:data GmbH – https://www.nextbau.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
33. ASBwin – SoftGuide – https://www.softguide.de/programm/asbwin – Art: Bewertungsportal/Herstellereintrag (14.08.2025) – abgerufen 2026-11-09
34. AFAP-AVA – softwareabc24 – https://www.softwareabc24.de/ausschreibungssoftware/afap-ava – Art: Bewertungsportal – abgerufen 2026-11-09
35. Wie viel kostet eine Ausschreibungssoftware? – softwareabc24 – https://www.softwareabc24.de/ausschreibungssoftware/preise-uebersicht – Art: Bewertungsportal – abgerufen 2026-11-09
36. LV/AVA – Hottgenroth Software – https://www.hottgenroth.de/M/SOFTWARE/Buerodigitalisierung/Erweiterungen/LV-AVA/Seite.html,225106,198457 – Art: Herstellerangabe – abgerufen 2026-11-09
37. Startseite und News – BECHMANN GmbH – https://www.bechmann-software.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
38. Startseite – SIDOUN International GmbH – https://www.sidoun.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
39. KIAVA – SIDOUN International GmbH – https://sidoun.de/loesungen/kiava/ – Art: Herstellerangabe – abgerufen 2026-11-09
40. Globe4all (kostenlose AVA-Software) – SIDOUN International GmbH – https://sidoun.de/loesungen/kostenlose-ava-software/ – Art: Herstellerangabe – abgerufen 2026-11-09
41. KIAVA – SoftGuide – https://www.softguide.de/programm/kiava – Art: Bewertungsportal/Herstellereintrag (30.10.2026) – abgerufen 2026-11-09
42. Startseite – SIRADOS (WEKA Intelligence) – https://www.sirados.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
43. Architektur-AVA (Pakete und Lizenzbedingungen) – SIRADOS – https://www.sirados.de/architektur-ava – Art: Herstellerangabe – abgerufen 2026-11-09
44. SIRADOS 365 AVA (Blog) – SIRADOS – https://www.sirados.de/blog/sirados-365-ava – Art: Herstellerangabe (22.06.2026) – abgerufen 2026-11-09
45. SIRADOS 365 AVA – SoftGuide – https://www.softguide.de/programm/sirados-365-ava-1 – Art: Bewertungsportal/Herstellereintrag (26.10.2026) – abgerufen 2026-11-09
46. SIRADOS 365 Kostenplanung – SoftGuide – https://www.softguide.de/programm/sirados-365-kostenplanung-1 – Art: Bewertungsportal/Herstellereintrag (26.10.2026) – abgerufen 2026-11-09
47. BKI Kostenplaner – BKI Baukosteninformationszentrum Deutscher Architektenkammern – https://bki.de/kostenplaner – Art: Herstellerangabe – abgerufen 2026-11-09
48. BKI KoRa – BKI – https://bki.de/kora – Art: Herstellerangabe – abgerufen 2026-11-09
49. BKI KoRa: Bauwerkskosten für Wohnbauten webbasiert ermitteln – baulinks – https://www.baulinks.de/webplugin/2026/0945.php4 – Art: Presse (02.07.2026) – abgerufen 2026-11-09
50. BKI Baukosten (Tool-Profil) – KI-Syndikat – https://www.ki-syndikat.de/tools/bki-baukosten/ – Art: Presse/Vergleich (geprüft 18.09.2026, Preisangaben teils 11/2026) – abgerufen 2026-11-09
51. Startseite – DBD Dynamische BauDaten (Dr. Schiller & Partner GmbH) – https://www.dbd.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
52. Startseite (Preise, NEO) – NOVA AVA – https://nova-ava.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
53. Startseite – untermStrich (everii Austria GmbH) – https://www.untermstrich.com/ – Art: Herstellerangabe – abgerufen 2026-11-09
54. Preise – untermStrich – https://www.untermstrich.com/preise – Art: Herstellerangabe – abgerufen 2026-11-09
55. BauGPT ermöglicht Export von Leistungsverzeichnissen als GAEB-Dateien – baulinks – https://www.baulinks.de/webplugin/2026/0937.php4 – Art: Presse (02.07.2026) – abgerufen 2026-11-09
56. BauGPT Pro – BauGPT GmbH – https://baugpt.com/en/pro – Art: Herstellerangabe – abgerufen 2026-11-09
57. Aus Crafthunt wird BauGPT – Munich Startup – https://munich-startup.de/news/aus-crafthunt-wird-baugpt – Art: Presse (07.10.2025) – abgerufen 2026-11-09
58. BAU AI – Das KI-Betriebssystem für den Bauprozess – BAU AI GmbH – https://www.bauai.eu/ – Art: Herstellerangabe – abgerufen 2026-11-09
59. PlanQ – PlanQ GbR – https://planq-calc.com/ – Art: Herstellerangabe – abgerufen 2026-11-09
60. condesk – Bauabrechnung und Mengenermittlung – condesk – https://condesk.io/ – Art: Herstellerangabe – abgerufen 2026-11-09
61. Use Case: LV-Erstellung mit KI – KI-Syndikat – https://www.ki-syndikat.de/usecases/bauwesen/02-lv-erstellung/ – Art: Presse/Vergleich (Stand 03.10.2026) – abgerufen 2026-11-09
62. KI-Tools für Ausschreibung und Vergabe im Vergleich – KI-Syndikat – https://www.ki-syndikat.de/ki-ausschreibung-vergleich/ – Art: Presse/Vergleich (Stand 09/2026) – abgerufen 2026-11-09
63. Startseite – Cosuno Ventures GmbH – https://www.cosuno.com/de – Art: Herstellerangabe – abgerufen 2026-11-09
64. Cosuno erhält 30 Millionen US-Dollar – startbase – https://www.startbase.de/news/cosuno-erhaelt-30-millionen-us-dollar/ – Art: Presse (10.02.2022) – abgerufen 2026-11-09
65. Preise – Capmo – https://www.capmo.com/de/preise – Art: Herstellerangabe – abgerufen 2026-11-09
66. Preise – PlanRadar – https://www.planradar.com/de/preise/ – Art: Herstellerangabe – abgerufen 2026-11-09
67. Startseite – Thinkproject – https://thinkproject.com/de/ – Art: Herstellerangabe – abgerufen 2026-11-09
68. Startseite – Alasco GmbH – https://www.alasco.com/de – Art: Herstellerangabe – abgerufen 2026-11-09
69. MWM: 16.000 verkaufte Lizenzen der MWM-Libero Software – baulinks – https://www.baulinks.de/webplugin/2025/1277.php4 – Art: Presse (12.09.2025) – abgerufen 2026-11-09
70. MWM-Libero – heise Download – https://www.heise.de/download/product/mwm-libero-52935 – Art: Download-Verzeichnis (06.01.2026) – abgerufen 2026-11-09
71. Gebündelte Expertise (Orca Group auf der digitalBAU 2026) – BauNetz Wissen – https://www.baunetzwissen.de/controlling-und-management/tipps/news/gebuendelte-expertise-10311025 – Art: Presse (2026) – abgerufen 2026-11-09
72. Orca Group – Marken und Lösungen – Orca Group – https://orca.group/ – Art: Herstellerangabe – abgerufen 2026-11-09
73. ORCA bekommt neuen Eigentümer: strategische Partnerschaft mit LEA Partners – ORCA Software GmbH – https://orca-software.com/wp-content/uploads/2024-07-Milestone-ORCA_Pressemeldung.pdf – Art: Primärquelle/Pressemitteilung (05.07.2024) – abgerufen 2026-11-09
74. Startseite – AVAPLAN Software GmbH – https://www.avaplan.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
75. ORCA AVA 27 (Neuerungen, u. a. „Direkte Übernahme aus XRechnungen“ in den Rechnungslauf) – ORCA Software GmbH – https://www.orca-ava.de/orca-ava-27/ – Art: Herstellerangabe – abgerufen 2026-11-09
76. CaliforniaX V26 – neue Version (Modul ERE: E-Rechnungsprüfung mit LV-Abgleich) – G&W Software AG – https://www.gw-software.de/california/californiax-v26 – Art: Herstellerangabe – abgerufen 2026-11-09
77. STLB-Bau Ausschreibungstexte und DBD-BauPreis (Pakete, Kauf- und Online-Preise) – WESA Software GmbH – https://www.wesa-software.de/stlb-bau-dynamische-baudaten – Art: Herstellerangabe (Vertriebspartner) – abgerufen 2026-11-09
