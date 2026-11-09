---
type: Research Note
title: Schmerzpunkte und unerfüllte Bedürfnisse von Architekten mit AVA-Software
description: Sammelt belegte Frustrationen und Wünsche deutscher Architekturbüros rund um AVA-Software (Preis/Lizenz, Lock-in, Excel, Mac, GAEB, BIM u. a.) über alle Produkte hinweg und leitet daraus Anforderungen für unser Open-Source-Projekt ab.
resource: https://www.architektenkammer-hessen.de/fileadmin/ARKO/2026-03_ARKO_Flyer_Screen.pdf
tags: [research, markt, schmerzpunkte, lizenzmodell, anforderungen, kleine-bueros]
timestamp: 2026-11-09T17:16:17Z
sources: 65
confidence: mittel
---

# Schmerzpunkte und unerfüllte Bedürfnisse von Architekten mit AVA-Software

## Kurzfassung

- **Preis und Lizenzmodell sind der am besten belegte Schmerzpunkt, und zwar produktübergreifend.** Der Markt verlagert sich zu Abos je Nutzer: ORCA nennt auf der eigenen Website nur noch Abo-Preise, NOVA AVA und Phase0 sind reine SaaS-Abos [13][18][21]. Funktionen für die Leistungsphase 8 (Abrechnung, Kostenkontrolle) und BIM stecken oft in teureren Editionen oder Add-ons [15][18][27]. NOVA vereinheitlicht seine Add-ons ab 01.02.2027 auf 40 € pro Nutzer und Monat; bisher waren sie teils kostenlos oder kosteten 20 € [19]. Sechs Architektenkammern nennen in ihrem ARKO-Flyer (03/2026) „steigende IT-Lizenzkosten und proprietäre Plattform-Software“ ausdrücklich als Belastung des Berufsstands [36].
- **Die Zielgruppe ist klein und reagiert empfindlich auf Preise je Arbeitsplatz.** 74,8 % der Architekturbüros haben höchstens 5 Beschäftigte, der Median liegt bei 1,8 Vollzeitstellen (Befragung 2025, n = 459 Architekturbüros) [33]. Ausgeschrieben wird unregelmäßig, deshalb fühlen sich Fixkosten je Sitzplatz und Modul besonders teuer an (Einschätzung, gestützt auf [29]).
- **Excel und Word bleiben ein De-facto-Standard für Leistungsverzeichnisse, Preisspiegel und Kostenverfolgung.** Genannte Gründe sind Kosten, Gewohnheit und Flexibilität, Schulungs- und Umstellungsaufwand sowie Bauherren, die ohnehin Excel-Übersichten erwarten [31][32][26]. Excel hat bekannte Nachteile: Es wird bei Komplexität fehleranfällig, Bezüge sind undurchsichtig und Teamarbeit ist schwierig [31].
- **Der Lock-in ist real.** Beim Wechsel geht Projekthistorie verloren, weil GAEB laut Sekundärquelle Kostenverläufe, Nachträge und Vorlagen nicht vollständig transportiert. Laufende Projekte erzwingen dann einen Parallelbetrieb [27]. Bei SaaS hängt der Datenzugang am Abo, etwa bei NOVA mit 12 Monaten kostenloser Aufbewahrung nach Abo-Ende [18]. Kammern und Fachpresse thematisieren 2026 die Abhängigkeit von Software-Anbietern [35][36][34].
- **Mac-Büros sind schlecht versorgt.** ORCA AVA läuft nur unter Windows. Virtualisierung empfiehlt der Hersteller nur für Intel-Macs, Apple-Silicon-Nutzer brauchen Remote-Desktop oder eine Cloud-Windows-Umgebung [15][16]. Mac-Kompatibilität taucht wiederholt in Suchanfragen von Büros auf [3][10]. Browser-Lösungen wie NOVA und Phase0 werben gezielt damit [20][21][23].
- **Die Lernkurve ist hoch, und Wissen liegt oft bei einer Person.** Einsteiger brauchen viel Fachwissen (VOB, STLB-Bau, GAEB) [28]. Einzelne Programme gelten als kompliziert, etwa California X im Vergleich zu ORCA oder NOVA (Forum, 08/2026) [40]. Teams, in denen nur eine Person die Software beherrscht, werden als typisches Problem genannt [26].
- **Der Austausch mit Bietern ist holprig.** Angebote kommen weiterhin als PDF oder auf Papier und werden abgetippt [26]. Kleine Bieter haben oft keine GAEB-Software, Excel-GAEB-Konverter dienen als Notbrücke [32][52].
- **Das BIM-Versprechen deckt sich nicht mit der Praxis.** Nur 13 % der befragten Planungsbüros nutzen BIM in allen Projekten, fast ein Drittel gar nicht (Fraunhofer IRB, 03/2026) [34]. Ein LV direkt aus dem Modell gelingt nicht ohne Nacharbeit [53][42]. IFC-Funktionen kosten extra [15][27].
- **Kostenkontrolle und Berichte sind zersplittert.** Kostenstufen liegen in getrennten Dateien, Abschlagsrechnungen werden ohne Gesamtüberblick geprüft, und Bauherrenberichte entstehen aus mehreren Quellen [26]. Büros fordern eine automatische Zuordnung zu den DIN-276-Kostengruppen als Muss-Kriterium [7].
- **Öffentlich sichtbare Nutzerstimmen sind sehr dünn.** Bewertungsportale zeigen für AVA-Produkte 0–4 Bewertungen [45][46][47][59]. Wichtige Foren (Graphisoft, Allplan, Reddit) waren für diese Recherche gesperrt, und viele bau.de-Threads sind alt und mit KI-Text aufgefüllt [58]. **Die Hypothesen dieser Notiz müssen in Interviews mit dem Architekten-Freund und weiteren Büros geprüft werden.**
- **Unsere Chance:** eine offene, selbst hostbare und plattformneutrale AVA mit vollständigem Datenexport, ohne Editions-Sperren, mit guter Excel- und PDF-Brücke und vollständiger LPH 6–8. Die ARKO-Initiative der Kammern mit dem Ziel Datensouveränität ist ein möglicher Verbündeter [36][37].

## Begriffe vorab (für Nicht-Architekten)

| Begriff | Bedeutung (kurz) | Englisch |
|---|---|---|
| **AVA** | Ausschreibung, Vergabe, Abrechnung: die Software-Kategorie und der Arbeitsprozess vom Leistungsverzeichnis bis zur Schlussrechnung | tendering, award, billing |
| **HOAI-Leistungsphasen (LPH) 6–8** | Honorarordnung für Architekten. LPH 6 = Vorbereitung der Vergabe (LV erstellen), LPH 7 = Mitwirkung bei der Vergabe (Angebote prüfen, Preisspiegel, Vergabevorschlag), LPH 8 = Objektüberwachung (u. a. Aufmaß, Rechnungsprüfung, Kostenkontrolle). Details: [HOAI, VOB/B, VOB/C](/okf/research/standards/hoai-vob-b-c.md) | work stages 6–8 |
| **Leistungsverzeichnis (LV)** | Strukturierte Liste der Bauleistungen mit Positionen, Mengen und Einheiten, die Bieter bepreisen | bill of quantities |
| **Position / Ordnungszahl (OZ)** | Einzelne Leistung im LV. Die OZ ist ihre hierarchische Nummer (z. B. 01.02.0030) | item / item number |
| **Vorbemerkungen** | Allgemeine oder technische Vorbedingungen, die vor den Positionen stehen | preliminaries |
| **Preisspiegel** | Tabellarischer Vergleich aller Angebote je Position und Summe | bid comparison sheet |
| **Vergabevorschlag / Vergabevermerk** | Empfehlung an den Bauherrn, wer den Auftrag bekommt, bzw. die Dokumentation dieser Entscheidung (bei öffentlichen Auftraggebern Pflicht) | award recommendation / record |
| **Nachtrag** | Zusätzliche oder geänderte Leistung nach Auftragserteilung, mit eigenem Preis | change order |
| **Aufmaß** | Ermittlung der tatsächlich ausgeführten Mengen als Grundlage der Abrechnung | as-built measurement |
| **Abschlagsrechnung / Rechnungsprüfung** | Teilrechnung während der Bauzeit bzw. deren fachliche Prüfung durch den Architekten | interim invoice / invoice check |
| **Kostenkontrolle, DIN 276, Kostengruppe (KG)** | Fortlaufender Vergleich der Kosten über die Stufen Kostenschätzung, Kostenberechnung, Kostenanschlag und Kostenfeststellung. Die DIN 276 gliedert Kosten in Kostengruppen (z. B. KG 300 Bauwerk – Baukonstruktionen). Details: [DIN 276](/okf/research/standards/din-276-cost-planning.md) | cost control, cost groups |
| **GAEB DA XML (X81/X83/X84/X86 …)** | Deutscher Standard für den Austausch von LVs und Angeboten. X83 = Angebotsaufforderung an Bieter, X84 = Angebotsabgabe des Bieters. Details: [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) | German tender data exchange standard |
| **STLB-Bau** | Lizenzpflichtige Datenbank mit standardisierten Leistungstexten. Details: [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) | standard tender text library |
| **Edition / Add-on** | Preisstufe mit festem Funktionsumfang bzw. ein separat bezahltes Zusatzmodul | tier / add-on |
| **Servicevertrag / Wartung** | Jährliche Gebühr für Updates und Support bei Kauflizenzen | maintenance contract |
| **Floating-Lizenz** | Lizenz, die sich mehrere Nutzer abwechselnd teilen (gleichzeitige Nutzung begrenzt) | concurrent licence |
| **IFC / BIM** | Offenes Format für Gebäudemodelle bzw. die modellbasierte Arbeitsweise. Details: [BIM und AVA](/okf/research/standards/bim-and-ava.md) | open BIM format |
| **E-Vergabe** | Elektronische Abwicklung öffentlicher Vergaben über Vergabeplattformen. Details: [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md) | e-procurement |
| **XRechnung / E-Rechnung** | Strukturiertes elektronisches Rechnungsformat, das in der Rechnungsprüfung zunehmend ankommt | e-invoice |

## Methodik und Qualität der Evidenz

- **Quellenlage.** Gelesen wurden: Anforderungslisten von Büros auf SoftGuide [1]–[12], Herstellerseiten (Preise, Editionen, Systemvoraussetzungen) [13]–[25][63], Vergleichsartikel [26]–[30], Fachpresse [31][32][35][38][54]–[56], Umfragen [33][34][39] und Foren [40][48]–[52][58][61].
- **Gesperrte oder leere Kanäle.** Graphisoft-Community, Allplan-Connect-Forum, Capterra/GetApp, G2, TrustRadius, hausbau-forum und Reddit lieferten Bot-Schutz- oder 403-Seiten. Diese Sperren wurden nicht umgangen. Für Graphisoft, Allplan und Capterra liegen nur **Suchmaschinen-Auszüge** vor [41]–[45][60][62]; sie sind unten entsprechend markiert und gelten als schwache Evidenz. Das Suchbudget dieser Recherche war gegen Ende erschöpft, deshalb fehlen weitere gezielte Suchen, etwa nach XING- oder LinkedIn-Diskussionen.
- **KI-aufgefüllte Foren.** Die bau.de-Threads stammen meist aus den Jahren 2001–2013. Sie wurden 2026 mit automatisch erzeugten „Analysen“ angereichert [58]. Hier wurden nur die menschlichen Beiträge ausgewertet.
- **Bewertungsportale sind fast leer.** Capterra zeigt für ORCA AVA und CaliforniaX keine Bewertungen [46][59], für NEVARIS Build vier [45], OMR für Phase0 keine [47]. *Einschätzung:* AVA ist ein kleiner Nischenmarkt mit wenig öffentlichem Feedback, deshalb sind direkte Interviews hier wichtiger als bei Massen-Software.
- **Interessenlagen.** Mehrere Quellen stammen von Anbietern oder sind gesponsert: Dr. Web ist gesponsert [26], KI-Syndikat ist ein Beratungsunternehmen [27]–[29], Phase0 schreibt über die Konkurrenz [21]–[23], die ABZ- und CiH-Artikel sind herstellernah [31][32], und KOBOLD hat seine eigenen Kunden befragt [39]. Solche Aussagen sind als „laut Hersteller“ oder „laut Vergleichsartikel“ gekennzeichnet.
- **Evidenzstärke** in den Tabellen: **stark** = mehrere unabhängige Quellen, darunter Primärquellen. **Mittel** = einige Quellen, überwiegend sekundär oder vom Hersteller. **Schwach** = einzelne, indirekte oder nicht direkt einsehbare Quellen.

## Überblick: Schmerzpunkt-Matrix

| # | Kategorie | Kernproblem | Evidenz | Betroffene Produkte | Belege |
|---|---|---|---|---|---|
| 1 | Preis & Lizenzmodell | Abo je Nutzer, Editionen und Add-ons, Wartungsgebühren, intransparente Preise, Preisanstiege | **stark** | ORCA, NOVA, Phase0, AVAPLAN; „auf Anfrage“ bei iTWO, NEVARIS, CaliforniaX, SIDOUN | [2][13][14][18][19][24][26][27][29][36] |
| 2 | Lock-in & Datenexport | Teurer Wechsel, unvollständiger Datentransport, Datenzugang hängt am Abo | mittel | alle; SaaS besonders | [18][21][27][35][36][57] |
| 3 | Bedienbarkeit & Lernkurve | Fachwissen nötig, überladene oder veraltete Oberflächen, Wissen bei einer Person | mittel | ORCA, California X, iTWO („überdimensioniert“) | [26][27][28][34][40][41] |
| 4 | Excel-Abhängigkeit | LV, Preisspiegel und Kosten in Excel; AVA gilt als „Zwang“ | stark (Quellen meist herstellernah) | branchenweit | [21][26][31][32][55] |
| 5 | GAEB mit Bietern und Fachplanern | PDF- oder Papierangebote, Abtippen, Formatbrüche | mittel | alle | [20][26][32][52] |
| 6 | Kostenkontrolle & Berichte | Getrennte Dateien, Berichte aus mehreren Quellen, Kostengruppen-Zuordnung, Preisspiegel-Darstellung | mittel | alle; Einzelbeleg NEVARIS | [7][22][26][31][45] |
| 7 | Zusammenarbeit, Mehrplatz, Cloud | Lizenz-Handling im Homeoffice, Benutzerverwaltung nur in Top-Edition, Datenschutz-Bedenken | mittel | ORCA und Desktop-AVA allgemein | [15][17][26][34] |
| 8 | Mac | Windows-only, Virtualisierung, Apple Silicon | **stark** (für Mac-Büros) | ORCA u. a. Desktop-AVA | [3][10][16][23][60] |
| 9 | Support, Updates, Kontinuität | Wartungsverträge, bezahlte Updates, Produktwechsel und -einstellungen | mittel | ORCA, AVAPLAN, NEVARIS | [14][24][25][45][51] |
| 10 | Performance & Stabilität | Startprobleme, Verlangsamung, Last durch virtuelle Maschinen | schwach | NEVARIS (Einzelbelege), Windows-AVA auf Mac | [23][44] |
| 11 | Textbibliotheken | Vorbemerkungen fehlen, Texte müssen extra gekauft werden, Kopieren aus Altprojekten | mittel | alle | [5][7][26][48] |
| 12 | BIM | IFC-Mengen unvollständig, Nacharbeit nötig, Funktionen hinter Editionen oder Add-ons | **stark** | alle; ORCA Enterprise, NOVA BIM-Add-on | [27][34][40][42][53] |
| 13 | Öffentliche Vergabe, E-Rechnung, KI | Wertungsschritte, Dokumentation, XRechnung, Datenschutz bei KI | schwach bis mittel | – | [6][15][27][34] |

## 1. Preis und Lizenzmodell (Schwerpunkt)

### 1.1 Was der Markt verlangt (Stand Herbst 2026)

| Produkt | Modell | Preis (netto) | Stand / Hinweis | Quelle |
|---|---|---|---|---|
| ORCA AVA Starter / Professional / Enterprise | **Jahresabo** je Lizenz, Servicevertrag inklusive | 828 / 1.788 / 2.388 € (erste Lizenz), 708 / 1.428 / 1.908 € (weitere), zzgl. „Bearbeitungspauschale“ | Herstellerseite, abgerufen 2026-11-09. Starter deckt nur **LPH 5–7** ab (LV, Angebote mit Preisspiegel, Aufträge und Nachträge; ohne Aufmaßprüfung, Rechnungsfreigabe und Kostenstand), Professional LPH 1–9 + IFC-Basic, Enterprise zusätzlich IFC-Advanced + **Benutzerverwaltung** | [13][15][64] |
| ORCA AVA Kauflizenz | Kauf + Servicevertrag | Kaufpreis nur auf Anfrage. Sekundärquelle nannte bis Mitte 2026 1.798 / 4.278 / 6.138 €. Servicevertrag ab Jahr 2: 348 / 828 / 1.188 € (weitere Lizenz 300 / 660 / 948 €), **12 Monate Mindestlaufzeit, automatische Verlängerung, Kündigung 4 Wochen vorher** | Kaufpreise nicht mehr auf der Herstellerseite; KI-Syndikat meldet sie als „nicht mehr gelistet“ | [14][28] |
| NOVA AVA Starter / Easy / Business | Abo je Lizenz, monatliche Zahlung oder 3/6/12 Monate mit Rabatt; Kündigungsfristen auf der Website nicht genannt | 49 / 89 / 129 € pro Monat bzw. 529 / 961 / 1.393 € pro Jahr. Easy und Business mit Vermerk „ab 01.05.2026“. Rabatte 5–10 % für 3, 6 oder 12 Monate | Bieten und Vergabe erst ab Easy; Nachträge, Aufmaß, Soll-Ist-Vergleich, Rechnungsprüfung und Abrechnung **erst in Business** (Herstellerangabe) | [18] |
| NOVA AVA Add-ons | Abo je Nutzer | **ab 01.02.2027 einheitlich 40 € pro Nutzer und Monat** (Terminplanung, Baudokumentation, NEO MCP Server, HOAI). Bisher: Terminplanung 20 €, die anderen kostenlos (Beta) | Angekündigt am 29.10.2026, gilt für neue Bestellungen und automatische Verlängerungen | [19] |
| Phase0 | Abo je Nutzer, ohne Mindestlaufzeit | Einzellizenz 80 € pro Monat bei jährlicher Zahlung (100 € monatlich), „Bauleiter“ 120 €, volle Lizenz 160 €. Preisdatenbank 20 € je Büro und Monat, Pausieren 10 € pro Monat | Stand Okt./Nov. 2026. Details: [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md) | [21][29] |
| AVAPLAN Lite / Pro / ProPlus | Kauf **oder** Jahresabo | Kauf 390 / 1.119 / 1.549 €, Abo 499 / 679 € (Pro / ProPlus). Servicevertrag bei Kauf **25 % des Listenpreises pro Jahr** (erstes Jahr frei). Alternativ bezahlte Jahres-Updates (UpDate Pro 2026: 335,70 €). **Kauf und Abo dürfen nicht gemischt werden** | Herstellerseite 2026 | [24][63] |
| RIB iTWO, NEVARIS Build, CaliforniaX, SIDOUN Globe/KIAVA | „auf Anfrage“, modular | keine Listenpreise. Bei iTWO ist nur die DB-Dienstleister-Miete von 328 € pro Monat öffentlich | Stand Sept./Okt. 2026 | [26][27] |
| Kleinere Kaufprodukte (u. a. ASBwin, AVA.relax, Hottgenroth, MWM-Libero, AVANTI) | Kauf, teils Miete | ca. 390–3.840 € je Lizenz. AVANTI-Miete 125–250 € pro Monat | Herstellerangaben laut gesponsertem Vergleich | [26][30] |
| Gratis-Einstiegsversionen (AVAPLAN Base, SIDOUN Globe4all, DBD-BaukostenApp) | kostenlos | 0 € | Für Preisspiegel, Abrechnung und Mehrplatzbetrieb laut Vergleichsartikel meist **nicht ausreichend** | [26] |

Ausführlichere Anbieter-Daten stehen in [Etablierte AVA-Anbieter](/okf/research/market/established-vendors.md), [NOVA AVA: Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md) und [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md).

### 1.2 Rechenbeispiele für kleine Büros (Einschätzung, netto, ohne Rabatte und Pauschalen)

Ziel ist der volle Umfang der LPH 6–8, also inklusive Abrechnung und Kostenkontrolle. Damit sind die Einstiegs-Editionen ausgeschlossen [15][18].

| Szenario | ORCA Professional (Abo) | NOVA Business | Phase0 |
|---|---|---|---|
| 1 Arbeitsplatz pro Jahr | 1.788 € | 1.393 € (jährlich) bzw. 1.548 € (monatlich) | 960 € (nur AVA) bzw. 1.920 € (volle Lizenz) |
| 3 Arbeitsplätze pro Jahr | 1.788 + 2 × 1.428 = **4.644 €** | 3 × 1.393 = **4.179 €** (jährlich) bzw. 4.644 € (monatlich). **Ab 02/2027 je Add-on +1.440 €** | 2.880 € (nur AVA) bzw. 5.760 € (voll) |
| 3 Arbeitsplätze über 5 Jahre | 23.220 € | 20.895 € (+7.200 € je Add-on) | 14.400 € bzw. 28.800 € |

*Einschätzung:* Für ein Büro mit Median-Größe (1,8 Vollzeitstellen [33]) liegen die laufenden AVA-Kosten bei rund 1.000–2.000 € pro Jahr und Sitzplatz. Dazu kommen CAD-Abos, Textdatenbanken und Büro-Software. Der Ärger über den Preis entsteht vermutlich weniger an der einzelnen Zahl als an **(a)** der Summe aller Abos, **(b)** Preissprüngen durch Editionen und Add-ons und **(c)** fehlender Planbarkeit wegen Preisänderungen und Vermerken wie „ab 01.05.2026“. Das deckt sich mit den Belegen in 1.3.

### 1.3 Belege für den Schmerz

- **Preis- und Lizenztransparenz als ausdrückliche Anforderung.** Ein kleines Büro (1–3 Plätze) nennt bei der Softwaresuche „transparente Preisgestaltung und Lizenz-/Modulstruktur“ als Kriterium [2]. Ein Landschaftsarchitekturbüro mit einem Platz sucht ausdrücklich eine „kostengünstige“ einfache Lösung [4].
- **Der Berufsstand selbst sieht ein Problem.** Der ARKO-Flyer der Architektenkammern (03/2026) nennt steigende IT-Lizenzkosten und proprietäre Plattform-Software als Belastung und stellt ARKO als Antwort auf „digitale Abhängigkeiten“ dar [36]. Die Initiative geht von sechs Landeskammern aus (BW, BY, BE, HE, NI, NRW). Die Gründungsversammlung fand am 24.06.2026 in Wiesbaden statt; die Kammerseite führt ARKO weiterhin als Genossenschaft „in Gründung“ [37][38].
- **Kosten bremsen die Digitalisierung.** 51 % der befragten Planungsbüros nennen hohe Anfangsinvestitionen und Kosten als Hemmnis für BIM (Fraunhofer IRB, Umfrage März 2026) [34]. Das betrifft BIM, nicht AVA im Speziellen, zeigt aber, wie preisempfindlich die Büros sind.
- **Selbst Sekundärquellen nennen Preise als Hürde.** KI-Syndikat bezeichnet den Phase0-Preis als „ein echtes Hindernis für kleine Büros“: Fünf Einzellizenzen kosten 4.800 € pro Jahr, was bei seltenen Ausschreibungen schwer zu rechtfertigen sei [29]. Für ORCA AVA nennt die Quelle Freiberufler mit ein bis zwei Projekten pro Jahr als wenig geeignete Zielgruppe [28].
- **Kammern verhandeln Rabatte.** Laut KI-Syndikat meldete die Architektenkammer Saarland 2024 ein vergünstigtes ORCA-Professional-Abo für Mitglieder [27]. *Einschätzung:* Kammern reagieren damit kollektiv auf Preisdruck. Nicht direkt verifiziert.
- **Abo-Unmut im CAD-Umfeld derselben Zielgruppe.** In der Graphisoft-Community laufen Threads mit Titeln wie „Dauerlizenzen ab 2026 wertlos?“, „Neue Features nur mit Subscription“ und „Preisanpassungen ArchiCAD-Vertrag“. Laut Suchauszug wird dort auch erwähnt, dass AVA-Programme neben Archicad zu den laufenden Kosten kleiner Büros zählen [43]. Nur Titel und Auszüge, Inhalt nicht einsehbar.
- **Historisch durchgängig.** Schon 2001 und 2002 suchten Architekten auf bau.de nach „preiswerten“ AVA-Programmen. Sidoun WIN-AVA wurde dort mit rund 9.000 DM als teure Option genannt [49].
- **Herstellervergleiche raten zur Gesamtkostenrechnung.** Dr. Web empfiehlt, die Kosten über fünf Jahre zu vergleichen, einschließlich Wartung, Modulen, Textdatenbanken (z. B. STLB-Bau), Netzwerklizenzen und Schulung. Bei vielen großen Anbietern fehlen Listenpreise [26].
- **Der konkrete Anlass beim Freund.** NOVA hat die Preise für Easy und Business zum 01.05.2026 neu gesetzt und erhöht die Add-on-Preise ab 02/2027 [18][19]. Ob genau das den Freund stört, ist offen (siehe Offene Fragen). Mehr dazu in [NOVA AVA: Nutzerstimmen](/okf/research/nova-ava/user-feedback.md).

### 1.4 Wiederkehrende Muster im Lizenzmodell

| Muster | Beispiel | Warum es schmerzt (Einschätzung) |
|---|---|---|
| **Abo statt Kauf** | ORCA nennt online nur Abo-Preise, Kauf gibt es auf Anfrage [13][14]. NOVA und Phase0 sind reine Abos [18][21] | Nach Kündigung keine Nutzung mehr; Kosten laufen auch in auftragsarmen Phasen weiter |
| **Editions-Sperren nach Leistungsphase** | ORCA Starter nur LPH 5–7 [15]. NOVA: Abrechnung und Rechnungsprüfung erst in Business [18] | LPH 8 (Aufmaß, Rechnungsprüfung, Kostenkontrolle) ist Pflichtleistung nach HOAI, aber nur in der teuersten Stufe enthalten |
| **BIM und Benutzerverwaltung als Aufpreis** | IFC-Advanced und Benutzerverwaltung nur in ORCA Enterprise (rund 600 € pro Lizenz und Jahr über Professional) [15][27]. NOVA-IFC über ein bezahltes BIM-Add-on [27]. AVAPLAN BIM-Modul 390 € [63] | Mehrplatzbetrieb und BIM werden zu Preistreibern |
| **Add-on-Ökonomie** | NOVA: 40 € je Add-on, Nutzer und Monat ab 2027 [19]. Phase0: Preisdatenbank und Zeiterfassung extra [21][29] | Kosten wachsen mit jedem Zusatzbedarf; Beta-Funktionen werden später kostenpflichtig |
| **Wartung als Prozentsatz bzw. Fixbetrag** | AVAPLAN 25 % des Listenpreises pro Jahr [63]; ORCA-Servicevertrag 348–1.188 € pro Jahr [14] | Faktisch wiederkehrende Kosten auch bei Kauflizenzen |
| **Laufzeiten und automatische Verlängerung** | ORCA-Servicevertrag 12 Monate, verlängert sich automatisch, Kündigung 4 Wochen vorher [14]. Gegenmodell: NOVA mit Monatspreis, Kündigungsbedingungen nicht veröffentlicht (nicht verifiziert) [18], Phase0 ohne Mindestlaufzeit [21] | Kündigungsfristen werden leicht verpasst |
| **Intransparenz** | iTWO, NEVARIS, CaliforniaX, SIDOUN ohne Listenpreise [26][27] | Vergleich nur über Vertriebsgespräche möglich |
| **Keine Mischmodelle** | AVAPLAN: Kauf- und Abolizenzen bzw. Editionen nicht mischbar [24][63] | Wachsende Büros müssen alles umstellen |

## 2. Lock-in und Datenexport

- **Unvollständiger Austausch.** GAEB transportiert laut Sekundärquelle keine Kostenverläufe, Nachträge oder Vorlagen. Wer wechselt, muss laufende Projekte im alten System weiterführen und hat parallele Kosten. Hinzu kommen getrennte Preisdatenbank-Lizenzen und Schulung [27]. *Einschätzung:* Teile davon deckt GAEB in eigenen Austauschphasen ab (z. B. Aufmaß, Rechnung). Abgleich mit [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) nötig.
- **Datenzugang hängt am Abo.** NOVA speichert Daten ohne aktives Abo 12 Monate kostenlos [18]. Bei Phase0 kostet das Pausieren mit Datenerhalt 10 € pro Monat [21][29]. *Einschätzung:* Für Büros mit Aufbewahrungspflichten über viele Jahre (Gewährleistung, Streitfälle) ist das ein ernstes Risiko.
- **Lange Bindung.** Ein (nicht direkt einsehbarer, vermutlich älterer) Pressetext zur BauInfoConsult-Marktstudie nennt eine durchschnittliche Nutzungsdauer der AVA-Software von **11 Jahren**. Pro Kategorie dominiere jeweils ein Anbieter [57]. Datum und Methodik ließen sich nicht prüfen.
- **Abhängigkeit ist 2026 ein Berufsstandsthema.** Der ARKO-Flyer warnt, Planungswissen könne über Cloud-Lösungen unbemerkt verloren gehen, und verspricht eine treuhänderische Datenplattform [36][37]. Das DAB fragt, wer künftig die Daten und Werkzeuge kontrolliert [35]. In der Fraunhofer-Umfrage gilt die Abhängigkeit von Software-Unternehmen als Hemmnis beim KI-Einsatz [34].
- **Herstellerkontinuität.** Ältere Graphisoft-Beiträge berichten von einem AVA-Programm, dessen Weiterentwicklung eingestellt wurde und das danach nur noch unter einer veralteten Mac-Umgebung lief [60]. Produktgenerationen wechseln, etwa AUER Success zu NEVARIS Build oder California.pro zu CaliforniaX [45][51][59]. Laut Schwester-Notiz wird „Pallas Online“ zugunsten von NOVA AVA eingestellt (nicht unabhängig geprüft, siehe [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md)).
- **Betroffen:** alle Produkte, Cloud-Produkte wegen der Datenhaltung besonders. *Gegenbeispiel:* NOVA bietet eine öffentliche API (siehe [NOVA AVA: API](/okf/research/nova-ava/api-and-data-model.md)). Ob sich darüber ein vollständiger Export bauen lässt, ist dort zu klären.

## 3. Bedienbarkeit und Lernkurve

- **Fachliche Einstiegshürde.** Wer noch nie mit VOB, STLB-Bau und GAEB gearbeitet hat, ist mit ORCA AVA laut Vergleichsseite nicht sofort produktiv [28]. Planungsbüros nennen in der Fraunhofer-Umfrage zu 82 % hohen Weiterbildungsbedarf in Digitalisierung und KI. Kein Büro sieht sich als „Profi“ bei digitalen Tools [34].
- **Wahrgenommene Komplexität einzelner Produkte.** Im Vectorworks-Forum (August, vermutlich 2026) findet ein Büro California X deutlich komplizierter und weniger intuitiv als ORCA AVA oder NOVA AVA, unabhängig davon, ob das Modell aus Vectorworks oder Archicad kommt [40]. RIB iTWO gilt für kleine Büros als „überdimensioniert“ [27].
- **Positive Gegenbeispiele.** In einem älteren Graphisoft-Thread wird NOVA als frischer, schlanker und intuitiver beschrieben, allerdings ohne längere Praxis. Gelobt werden auch der Support und der Wegfall von Updates durch den Browser-Betrieb [41] (nur Suchauszug). Capterra-Auszüge zu NEVARIS Build loben die Oberfläche und den einfachen Umstieg vom Vorgänger AUER Success [45].
- **Wissensinseln.** Dr. Web nennt Teams, in denen nur eine Person die Software kennt, sowie halb umgestellte Projekte als typische Probleme [26].
- **Wünsche aus Anforderungslisten:** „einfache, benutzerfreundliche Bedienung“ und „modern/zeitgemäß programmiert“ [2], „einfach zu bedienen“ [4].
- **Herstellersicht (Phase0, parteiisch):** Große AVA-Programme seien für große Büros gebaut, hätten Menüs voller ungenutzter Funktionen und Eingabemasken, die „Jahrzehnte alt“ wirken [21]. Enterprise-Tools gelten dort für viele kleine Büros als überladen [22].
- *Einschätzung:* Die Lernkurve hat zwei Ursachen, das Fach (VOB, GAEB, DIN 276) und die Bedienung. Unsere Software kann die Fachkomplexität nicht wegnehmen, sie aber durch geführte Abläufe, verständliche Begriffe und gute Voreinstellungen abfedern. Gelegenheitsnutzer, die wenige Ausschreibungen pro Jahr machen, sind der kritische Fall.

## 4. Excel-Abhängigkeit

- **Typische Excel-Arbeitsweise (laut gesponsertem Vergleich).** LVs entstehen in Word oder Excel, Texte werden aus alten Projekten kopiert. Angebote kommen als PDF oder Papier und werden abgetippt. Der Preisspiegel ist eine selbst gebaute Tabelle, in der Rechenfehler spät auffallen. Kostenschätzung, -berechnung und -anschlag liegen in getrennten Dateien [26].
- **Warum Architekten bei Excel bleiben (ABZ, 30.04.2021).** Excel ist günstiger als eine AVA. AVA bedeutet für viele, sich formalen Vorgaben zu beugen, die sich mit kreativer Arbeit schlecht vertragen. Mitarbeiter brauchen Schulungen, und Arbeitsabläufe müssen umgebaut werden. Viele bezweifeln, dass sich der Aufwand lohnt, wenn der Bauherr am Ende ohnehin eine Excel-Übersicht sehen will [31].
- **Excel-Nachteile (ebenda).** Bei vielen Reitern mit Makros wird es unübersichtlich. Woher Bezüge stammen, weiß oft nur, wer die Datei angelegt hat. Schreibschutz behindert die Teamarbeit [31].
- **Konverter als Brücke.** Ein GAEB-Konverter-Anbieter berichtet, viele Anwender erstellten LVs am liebsten in Excel und Word. Architekten wandeln Excel-LVs mit seinem Werkzeug in GAEB D81 oder D83 um [32].
- **Kostendaten in Tabellen versteckt.** Erfahrungswerte zu Kosten stecken oft in aufwendigen Excel-Tabellen und sind schwer wiederzuverwenden [55].
- **Seit Jahrzehnten gewünscht.** Schon 2003 suchte ein Büro auf bau.de eine LV- und Budget-Software „möglichst flexibel auf Excel-Basis“ [61]. 2019 forderte ein Beratungsbüro eine **bidirektionale Word/Excel-Schnittstelle** [6]. Sidoun warb 2021 mit voll integriertem Excel [31].
- **Hersteller bieten Excel-Vorlagen als Köder an.** Phase0 verlinkt Blogartikel wie „DIN 276 Excel Vorlage“ und „Leistungsverzeichnis Vorlage gratis“ [21]. *Einschätzung:* Das zeigt, wonach kleine Büros tatsächlich suchen.
- **Auch Büro-Controlling startet in Excel.** In einer Fallstudie der KOBOLD-Studie lief das Controlling zuerst über Excel-Tabellen, bis das Büro gewachsen war [39].

## 5. Was kleine Büros (1–10 Personen) tatsächlich nutzen – und warum

**Fakten zur Bürogröße.** In der Befragung von IW Consult im Auftrag von AHO, BAK, VBI und BIngK (April/Mai 2025, 2.452 Unternehmen, davon 869 Architekturbüros; die Frage zur Beschäftigtenzahl beantworteten 459 Architekturbüros) hatten Architekturbüros im Schnitt 6,7 Vollzeitstellen, im Median nur 1,8. **74,8 % hatten höchstens 5 Beschäftigte** [33].

**Verbreitung von AVA-Software.** Eine ältere Marktstudie stellte laut Pressetext fest, dass höchstens jedes zweite Architekturbüro AVA-Software nutzt [57]. Aktuelle Zahlen ließen sich nicht finden. *Einschätzung:* Der Anteil reiner Excel- und Word-Büros dürfte bei Kleinstbüros hoch sein, belastbar beziffern lässt er sich nicht.

**Werkzeuge, die kleine Büros nutzen (beobachtet):**

| Werkzeug | Rolle | Beleg |
|---|---|---|
| Excel/Word (+ eigene Vorlagen) | LV, Preisspiegel, Kostenverfolgung, Bauherrenberichte | [26][31][32] |
| GAEB-Konverter (Excel ↔ GAEB) | Pflicht-GAEB für Auftraggeber oder Bieter erzeugen | [32] |
| Gratis-AVA-Einstiegsversionen | LV-Erstellung; für Preisspiegel und Abrechnung meist zu schwach | [26] |
| Günstige Kauf- oder Miet-AVA (z. B. AVAPLAN, ASBwin, SJ AVA) | volle AVA zu niedrigen Kosten, Windows | [26][30] |
| Cloud-AVA (NOVA, Phase0) | browserbasiert, Mac-tauglich, Abo | [18][21] |
| Marktführer-AVA (ORCA, California) | bei regelmäßigen und öffentlichen Ausschreibungen | [27][28] |

**Warum Excel statt AVA? Gründe nach Beleglage:**

| Grund | Beleg | Stärke |
|---|---|---|
| Kosten je Platz im Verhältnis zur Ausschreibungshäufigkeit | [29][31] | mittel |
| Gewohnheit und Flexibilität, keine „formalen Zwänge“ | [31][32] | mittel (herstellernah) |
| Schulungs- und Umstellungsaufwand | [31][34] | mittel |
| Bauherr will ohnehin Excel | [31] | schwach |
| Bieter haben oft kein GAEB, deshalb ohnehin PDF oder Excel | [26][32][52] | mittel |
| Seltene Ausschreibungen (1–2 Projekte pro Jahr) | [28][29] | mittel (Einschätzung der Quellen) |
| Private Bauherren verlangen keine VOB-Formalien | – | *Einschätzung*, beim Freund prüfen |

## 6. GAEB-Austausch mit Bietern und Fachplanern

- **Formatbrüche.** Bieter schicken Angebote als PDF oder auf Papier, Preise werden von Hand übertragen. Mit Bietern und Fachplanern kommt es zu Formatbrüchen [26]. Ein Herstellervergleich nennt den Datenaustausch zwischen verschiedenen Werkzeugen als Fehlerquelle [22].
- **Bieter ohne GAEB.** Ein Unternehmen soll einem Architekten eine Rechnung als GAEB liefern, hat aber nur Word und PDF. Es ist ratlos, und die Antworten erklären, dass GAEB-Dateien aus AVA-Programmen entstehen und nicht aus Rechnungen konvertiert werden (2011) [52]. Konverter-Anbieter adressieren genau diese Lücke [32].
- **Bieterportale als Herstellerantwort.** NOVA bewirbt einen passwortgeschützten Bieterbereich, damit kein händisches Eintippen von Angeboten mehr nötig ist [20].
- **Support-Thema in Foren.** Im Allplan-Forum (Kategorie AVA, laut Suchauszug 259 Themen) wiederholen sich Fragen zu GAEB-Export und -Import bei NEVARIS [44].
- Vertiefung: [GAEB in der Praxis: Interoperabilität](/okf/research/standards/gaeb-tooling-interop.md).

## 7. Kostenkontrolle, Berichte und Ausdrucke

- **Zersplitterte Kostenkontrolle.** Abschlagsrechnungen werden ohne Überblick über bereits Gezahltes und offene Nachträge geprüft. Kostenberichte für den Bauherrn entstehen aus mehreren Quellen [26].
- **Muss-Kriterien aus Anforderungslisten.** Gefordert werden die automatische Zuordnung von Positionen zu DIN-276-Kostengruppen („Muss“), die Fortführung aus dem BKI-Kostenplaner und der Export mit Kostengruppen [7] sowie die Kostenschätzung nach DIN 276 mit Fortschreibung [8].
- **Längere Projekte in LPH 6–8.** 78,7 % der Architekturbüros berichten seit 2015 von Projektverlängerungen in den Phasen 6–8 gegenüber der ursprünglichen Vereinbarung, in den Phasen 1–5 sind es 68,5 % [33]. *Einschätzung:* Längere Bauphasen bedeuten mehr Nachträge, Abschläge und Kostenfortschreibung, also genau die Stellen, an denen Werkzeuge schwach sind.
- **Darstellung und Ausdrucke.** Laut Capterra-Auszügen zu NEVARIS Build reiht der Preisspiegel die Bieter nicht immer nach Angebotssumme. Filter und Auswertungen nach Kostengruppen seien eingeschränkt [45]. Im Allplan-Forum gibt es Threads zu Spalteneinstellungen im NEVARIS-Preisspiegel [44]. Phase0 nennt das Formatieren von Ausdrucken wie PDFs „mühsam“ [22]. Ein Hersteller betont, sein Preisspiegel sei „nicht festgefroren“ und lasse sich ohne Neuanlage anpassen, was im Umkehrschluss bei anderen ein Problem nahelegt [31].
- *Einschätzung:* Die Belege zu Ausdrucken und Layouts sind dünn, aber plausibel. Für den Architekten ist der Ausdruck (Preisspiegel, Vergabevorschlag, Kostenbericht) das eigentliche Arbeitsergebnis gegenüber dem Bauherrn. **Beim Freund konkret nachfragen.** Prozessdetails: [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md).

## 8. Zusammenarbeit, Mehrplatz und Cloud

- **Lizenz-Handling im Homeoffice.** ORCA verkaufte AVA früher als Kauflizenz mit jährlich neu erzeugten Lizenzschlüsseln. Floating-Lizenzen ließen sich bei Remote-Arbeit schwer durchsetzen, als Workaround dienten Laptop-Lizenzen. Seit Oktober 2020 gibt es einen Cloud-Lizenzserver, seit Version 26 einen Schlüssel für die ganze Produktlebensdauer (Herstellerangaben des Lizenzdienstleisters) [17].
- **Mehrplatzbetrieb ist teuer.** ORCA unterstützt Einzelplatz, Netzwerk und Terminalserver [15], die **Benutzerverwaltung** gibt es aber nur in der Enterprise-Edition [15]. Excel-Teamarbeit scheitert an Schreibschutz-Konflikten [31].
- **Integration statt Insellösungen.** In der KOBOLD-Befragung (2022, 617 Antworten von Bestandskunden, darunter 233 Architekturbüros) gehört das Zusammenspiel von CAD, AVA und Baustellenmanagement zu den wichtigsten Zukunftsthemen. Controller beklagen doppelt und manuell geführte Daten [39].
- **Cloud wird angenommen, aber mit Vorbehalten.** Dr. Web rät bei Cloud-AVA zu Servern in der EU und einem Auftragsverarbeitungsvertrag nach Art. 28 DSGVO [26]. BauNetz Wissen nennt als Nachteile digitaler Ausschreibung Kompatibilitätsprobleme, fehlende Kenntnisse bei Beteiligten und Datenschutzbedenken [56]. In der Fraunhofer-Umfrage sehen 73 % rechtliche Unsicherheit und Datenschutz als größtes KI-Risiko [34].
- **Wunsch nach Büro-Integration.** Anforderungslisten nennen Mac-Kontakte und -Mail [3][10], Outlook [12] sowie Bautagebuch, Zeiterfassung, DMS und CRM [3][9][11][12].

## 9. Mac-Unterstützung

| Produkt | Mac-Status | Beleg |
|---|---|---|
| ORCA AVA | Windows 10/11 laut Systemvoraussetzungen. Virtualisierung (Parallels/VMware) laut Hersteller **nur auf Intel-Macs**. Auf Apple Silicon (M-Serie) nur Remote-Desktop oder Windows-Server in der Cloud (Azure/AWS) | [15][16] |
| NOVA AVA, Phase0 | Browserbasiert auf macOS und Windows (Herstellerangabe) | [20][21] |
| NEVARIS Build | On-Premise, nicht webbasiert. Das SoftGuide-Profil listet pauschal auch „Mac OS“ neben Mainframe und Unix, das wirkt unplausibel | [25] |
| CaliforniaX, iTWO | Mac-Status in den Vergleichen „nicht angegeben“ | [22] |

- **Nachfrage aus Büros.** Ein kleines Büro arbeitet „ausschließlich“ mit Mac und wünscht Anbindung an macOS-Kontakte und -Mail [3]. Ein Architektur- und Planungsbüro fordert Kompatibilität mit Mac-Adressbuch, -Kalender und -Mail [10]. Schon 2004 fragte ein Büro auf bau.de nach einem guten AVA-Programm für OS X [50]. Ältere Graphisoft-Threads beschreiben eine sehr kleine Mac-Auswahl und die Abhängigkeit von Windows-Virtualisierung [60].
- **Kosten des Workarounds (Herstellersicht Phase0).** Zusätzliche Windows-Lizenz, Systemlast, eine weitere Fehlerquelle. Ein Phase0-Kunde habe Parallels „gehasst“ [22][23].
- *Einschätzung:* Wie viele Architekturbüros Macs nutzen, ist unbekannt (siehe Offene Fragen). Für Mac-Büros ist die Lage aber eindeutig ein K.-o.-Kriterium, und mit Apple Silicon hat sie sich verschärft [16].

## 10. Support, Updates und Herstellerkontinuität

- **Updates kosten Geld.** Beim ORCA-Servicevertrag sind Updates und Support inklusive, er kostet aber jährlich und hat eine Mindestlaufzeit [14]. AVAPLAN verlangt 25 % des Listenpreises pro Jahr oder bezahlte Jahres-Updates [24][63]. Bei NEVARIS Build ist laut Profil keine Wartung erforderlich und die Hotline inklusive, Schulung und Installationshilfe kosten extra [25].
- **Gekoppelte Updates.** Laut Capterra-Auszug kann NEVARIS Build in einem Unternehmen nicht getrennt von NEVARIS Finance aktualisiert werden [45].
- **Support-Lob als Differenzierung.** Bei NOVA wird der freundliche Support hervorgehoben [41] (Suchauszug).
- **Produktwechsel.** 2013 galt NEVARIS als neuer Anlauf von Nemetschek im AVA-Bereich. Ein Teilnehmer riet, mehrere Produkte zu testen, weil Softwareentscheidungen langfristig teuer seien [51]. Siehe auch Abschnitt 2 zur Herstellerkontinuität.

## 11. Performance und Stabilität

- Im Allplan-Forum finden sich laut Suchauszug Threads zu NEVARIS, das nicht mehr startet (Systemzeit-Meldung), und zu Verlangsamungen nach Windows-Updates [44].
- Windows-AVA in einer virtuellen Maschine auf dem Mac kostet Systemressourcen (Herstellersicht Phase0) [23].
- *Einschätzung:* Die Evidenz ist schwach. Performance-Klagen dürften vor allem große LVs, Netzwerkbetrieb über VPN und VMs betreffen. **Beim Freund nachfragen**, ob NOVA im Browser bei großen LVs träge wird.

## 12. Textbibliotheken und Vorbemerkungen

- **Vorbemerkungen fehlen.** Ein Büro testete Heinze und ORCA und vermisste Vorbemerkungen bzw. fand sie nur sehr begrenzt. Die Antworten: Vorbemerkungen müsse man meist separat als Ausschreibungstexte kaufen (sirAdos, Mittag, WEKA). Ein Teilnehmer warnte, zu viele vertragliche Vorbemerkungen schafften Haftungsrisiken, „weniger ist mehr“ (2009/2010) [48].
- **Texte und Preise als eigener Markt.** Ein Büro mit 5 Plätzen sucht 2026 eine Stammdatensoftware für Texte und Preise passend zu seiner bestehenden AVA [5]. Ein anderes verlangt Anbindungen an SIRADOS, Heinze und STLB [7]. Dr. Web nennt Textdatenbanken als versteckten Kostenblock [26].
- **Recycling aus Altprojekten** ist der Normalfall bei Excel-Büros [26].
- Vertiefung und Lizenzfragen: [Leistungstexte: STLB-Bau u. a.](/okf/research/standards/stlb-bau-tender-texts.md).

## 13. BIM: Versprechen und Praxis

- **Geringe Verbreitung.** 13 % der Büros nutzen BIM in allen Projekten, rund 31 % gar nicht. Hemmnisse sind fehlende Kompetenz (53 %), Kosten (51 %), organisatorischer Aufwand, fehlende Schnittstellen und Projekte, die BIM nicht fordern (Fraunhofer IRB, 03/2026) [34].
- **Ein LV aus dem Modell braucht Nacharbeit.** Eine Bachelorarbeit (HTWK Leipzig, 2016) zur IFC-Übergabe von ArchiCAD an ORCA AVA und RIB iTWO fand fehlerhafte Fenster- und Türattribute. Die Übergabe sei für ein vollautomatisches LV ohne manuelle Nacharbeit nicht ausgereift, und Standards fehlten [53]. Graphisoft-Threads (Suchauszüge, Datum oft unklar) berichten von teils manuell, teils automatisch ermittelten Mengen, Abweichungen bei Wänden und dem Verlust der Modellverknüpfung bei stark attribuierten Bauteilen [42]. NOVA brauche zusätzlich schichtweise Mengen und nicht nur Basismengen [41].
- **Modellqualität als Voraussetzung.** Für den IFC-Export nach AVA müssen in Vectorworks intelligente Objekte, PredefinedTypes, Common Psets, BaseQuantities und Einstellungen für mehrschichtige Bauteile sauber gesetzt sein (Hinweise eines Vectorworks-Beraters, 08/2026) [40]. BauNetz Wissen betont VOB-konforme Mengen und das Nachführen von Modelländerungen ins LV [54].
- **Wunsch und Realität.** Ein kleines Büro will eine „einfache aber funktionierende“ BIM-Integration zu Archicad mit visuell prüfbarem IFC-Import [2]. Herstellernahe Presse räumt ein, dass viele BIM-AVA-Schnittstellen fehleranfällig sind [31]. Ein alter Graphisoft-Wunschlisten-Thread fordert AVA direkt in Archicad [62].
- **Aufpreise.** IFC-Advanced nur in ORCA Enterprise, NOVA-IFC per BIM-Add-on, AVAPLAN BIM-Modul 390 € [15][27][63].
- Vertiefung: [BIM und AVA](/okf/research/standards/bim-and-ava.md).

## 14. Öffentliche Auftraggeber, E-Rechnung und KI: neue Anforderungen

- **Wertung und Dokumentation.** Ein Beratungsbüro forderte formale Prüfung und Eignungsprüfung der Angebote sowie AVA für Bau- **und** Dienstleistungen (VOB, VOL analog) [6]. *Einschätzung:* Für Büros mit öffentlichen Auftraggebern, wie den Freund, sind die Wertungsstufen und der Vergabevermerk Pflicht. Direkte Klagen dazu fanden sich nicht. Siehe [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md).
- **E-Rechnung.** ORCA AVA 27 erzeugt Zahlungsfreigaben direkt aus XRechnung-Rechnungen [15]. CaliforniaX bewirbt in Version 26 die E-Rechnungsprüfung [27]. *Einschätzung:* XRechnung und ZUGFeRD in der Rechnungsprüfung werden zum Pflichtthema. Rechtslage und Fristen in [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md) prüfen.
- **KI.** Die Zahlen stammen aus drei Erhebungen mit verschiedener Basis und dürfen nicht gleichgesetzt werden:
  - Fraunhofer IRB (Onlineumfrage März 2026, Architektur- und Ingenieurbüros gemischt, 45 % davon Architekturbüros): 38 % der Büros nutzen KI bereits, 30 % testen oder planen. Je Einsatzgebiet (Mehrfachauswahl, Anteil aller Antwortenden): Textproduktion 64 %, Mengenermittlung/AVA 18 % [34].
  - ifo-Konjunkturumfrage für die BAK (Mai 2026, Unternehmen = Architekturbüros): 54,2 % „setzen KI bereits ein“, 2023 waren es 6,9 %, ein Jahr zuvor 34,3 % [35].
  - Berufspolitische Befragung 2025 der BAK (Personen = Kammermitglieder, veröffentlicht 11/2025): 29 % nutzen KI-Werkzeuge im Alltag [65].
  - *Einschätzung:* Die Spanne 29–54 % erklärt sich aus Basis (Personen oder Büros), Zeitpunkt (2025 oder 2026) und Frageformulierung. Für AVA zählt vor allem die kleine Zahl von 18 % bei Mengenermittlung und AVA.
  - Hersteller bauen KI-Assistenten ein (NOVA NEO, Phase0-LV-Agent im Beta, SIDOUN KIAVA) [27][29]. Datenschutz bleibt die Hauptsorge [34].

## 15. Anforderungslisten, die Architekturbüros veröffentlichen (SoftGuide)

SoftGuide strukturiert Suchanfragen von Firmen nach Funktionslisten. Die Texte sind also redigiert und kein O-Ton. Die Präfixe der Projektnummern deuten auf die Jahre 2017–2026 hin (nicht bestätigt). Alle Anfragen sind abgeschlossen.

| Nr. | Büro | Plätze | Plattform | Kernanforderungen | Auffällig | Quelle |
|---|---|---|---|---|---|---|
| 24/3401 | Architekturbüro in Gründung | 3, später 4–15 | Windows | 16 Funktionen: GAEB-LV, Preisspiegel, Nachtragsmanagement, Mengen- und Massenermittlung, Kostenmanagement, Kalkulation, IFC, funktionale Ausschreibung, DMS, Collaboration, Bestellmanagement, Abrechnung | Nur 1 von 6 gezeigten Produkten erfüllte alle 16 Funktionen (ASBwin), ORCA und NEVARIS je 12 | [1] |
| 19/1597 | Kleines Architektur- und Planungsbüro (tritt als GU auf) | 1–3 | Windows, netzwerkfähig | Kostenschätzung, AVA LPH 3–8, Kostenkontrolle, IFC-3D-Import mit visueller Kontrolle, Archicad-BIM | **Transparente Preis- und Lizenz-/Modulstruktur**, einfache Bedienung, zeitgemäß, skalierbar | [2] |
| 20/2029 | Kleines Architekturbüro | 1 | **nur Mac** | AVA, Anbindung an macOS-Kontakte und -Mail; Bautagebuch und Zeiterfassung optional | Mac als K.-o.-Kriterium | [3] |
| 17/950 | Landschaftsarchitektur, klein | 1 | Windows | LV-Erstellung, GAEB | **Einfach und kostengünstig** | [4] |
| 26/3572 | Architektur- und Ingenieurbüro | 5 | Windows 11, optional iOS/Android | Texte und Preise für VOB-LVs, GAEB, Schnittstelle zur **bestehenden** AVA | Ergänzt statt ersetzt die AVA | [5] |
| 19/1778 | Beratungsbüro (Immobilien) | 3–4 | Windows | AVA für Bau- und Dienstleistungen, **bidirektional Word/Excel**, formale Prüfung, Eignungsprüfung; Textbausteine optional | Vergabe-Wertung | [6] |
| 20/2055 | Architekturbüro Norddeutschland | 2 | Windows | Kostenplanung, -verfolgung, Ausschreibung, Mengen; **automatische DIN-276-Zuordnung (Muss)**; BKI-Fortführung; SIRADOS, Heinze, STLB | Kosten-BIM bis zur AVA | [7] |
| 21/2747 | Architekturbüro Hochbau | 1 | lokal oder web, Windows | Kostenschätzung und -berechnung nach DIN 276 mit Fortschreibung | Shortlist u. a. ORCA, NEVARIS | [8] |
| 17/792 | Architekturbüro als Bauherrenvertretung | ca. 10 | k. A. | LV LPH 1–9, AVA, DIN 276, Controlling, 2D-CAD- und IFC-Anbindung, Verträge, Sicherheitseinbehalte, Zahlungskontrolle, Mängel, Abnahme, Korrespondenz, mobile App | All-in-one | [9] |
| 17/831 | Architektur- und Planungsbüro mit Bauträger-Tätigkeit | ca. 2 | **Mac-kompatibel** | AVA, Bauzeitenplan, Verträge, DMS, Büro, Vertrieb, FiBu | Mac und Büro-Integration | [10] |
| 18/1411 | Süddeutsches Architekturbüro | 10–20 | Windows | Komplettlösung inkl. AVA, HOAI, Faktura, Zeiten, Baustelle | papierlos | [11] |
| 17/795 | Architektur- und Ingenieurbüro | 40, später 100 | k. A. | Projektmanagement inkl. AVA, GAEB, Outlook, Web-Zeiterfassung | Großbüro | [12] |

**Auszählung der 12 Listen (Einschätzung, grob):**
- Mac gefordert in 2 Listen, Windows in 8, keine Angabe in 2.
- Ausdrücklich GAEB: 4. IFC/BIM: 5. DIN-276-Kostenplanung oder -kontrolle: 5.
- Anbindung an Office, Mail oder Kontakte: 4. Funktionen über AVA hinaus (Bautagebuch, Zeiten, DMS, CRM, HOAI): 6.
- Einfachheit oder Preis ausdrücklich: 2 (beide von Kleinstbüros).

## 16. Synthese: Wunschliste der Architekten

1. **Faire, planbare Kosten:** keine Editions-Fallen, keine Überraschungen bei Add-ons, transparente Preise [2][19][36].
2. **Volle LPH 6–8 in einem Werkzeug:** LV, Preisspiegel, Vergabe, Nachträge, Aufmaß, Rechnungsprüfung, Kostenkontrolle nach DIN 276 [1][7][26].
3. **Excel-Freundlichkeit:** Import und Export in beide Richtungen, Berichte als .xlsx [6][31].
4. **Einfache Bedienung für Gelegenheitsnutzer** [2][4][28].
5. **Mac und Browser** [3][10][16].
6. **Bieter ohne Medienbrüche anbinden:** kein Abtippen mehr [20][26].
7. **BIM, das „einfach funktioniert“,** mit visueller Mengenprüfung [2][40].
8. **Gute Ausdrucke und Bauherrenberichte** [22][26].
9. **Eigene Texte und Preise wiederverwenden** [5][26][55].
10. **Datenhoheit** und Unabhängigkeit von einzelnen Anbietern [35][36].
11. **Integration mit Büro-Werkzeugen** (Mail, Kontakte, Zeiterfassung, Bautagebuch) [3][10][39].

## Relevanz für unser Projekt

### Muss-Anforderungen (abgeleitet)

| ID | Anforderung | Adressiert Schmerzpunkt |
|---|---|---|
| M1 | **Freie Nutzung ohne Sitzplatz-, Modul- oder Leistungsphasen-Sperren.** LPH 6–8 vollständig im Kern; Mehrplatz und Benutzerverwaltung nicht als Aufpreis | 1, 7 |
| M2 | **Datenhoheit:** lokale oder selbst gehostete Speicherung. Vollständiger Projekt-Export in einem offenen, dokumentierten Format, einschließlich Nachträgen, Aufmaßen, Rechnungen, Preisspiegeln und Historie. Lesbar ohne laufendes Abo | 2 |
| M3 | **Plattformneutral:** Windows, macOS (Apple Silicon nativ) und Linux, z. B. über den Browser oder eine plattformneutrale Desktop-App | 8 |
| M4 | **GAEB DA XML** Import und Export mindestens für LV und Angebote (X81/X83/X84/X86), später Aufmaß und Rechnung. Robust gegenüber Varianten (siehe [GAEB-Interop](/okf/research/standards/gaeb-tooling-interop.md)) | 5 |
| M5 | **Excel-Brücke:** LV-Import aus Excel; alle Tabellen (LV, Preisspiegel, Kostenstand) als .xlsx exportierbar | 4 |
| M6 | **Kostenkontrolle nach DIN 276** über alle Stufen in einem Projekt, Kostengruppen-Zuordnung je Position, Übersicht über Abschläge und Nachträge | 6 |
| M7 | **Druckfertige, anpassbare PDF-Berichte** (LV, Preisspiegel, Vergabevorschlag, Kostenbericht) ohne Hersteller-Dienstleistung | 6 |
| M8 | **Geführte Abläufe** für Gelegenheitsnutzer, verständliche Fachbegriffe, gute Voreinstellungen | 3 |
| M9 | **Eigene Textbibliothek** (Vorbemerkungen, Standardpositionen), Wiederverwendung aus Altprojekten, Import externer Texte über GAEB | 11 |
| M10 | **Öffentliche Vergabe:** Wertungsschritte und Vergabevermerk (Details in der Vergaberechts-Notiz) | 13 |

### Differenzierungschancen

- **„Kein Lock-in“ als Kernversprechen:** offenes Dateiformat, Export-Garantie, Archivmodus für abgeschlossene Projekte. Das passt zur ARKO-Linie der Kammern (Datensouveränität, treuhänderische Plattform, Benchmarks aus echten Projekten) [36][37]. *Lead:* ARKO als möglicher Partner oder Pilotnutzer.
- **Eigene Preisdatenbank aus abgeschlossenen Preisspiegeln.** Das Büro baut Kennwerte aus den eigenen Projekten auf; heute stecken diese Daten in Excel [55]. Startups (BauKoDat) und Cloud-Anbieter (Phase0-Preisdatenbank) zeigen, dass dafür Bedarf besteht [55][21].
- **Bieterzugang ohne Bieter-Software:** ein Excel-Roundtrip mit Validierung oder ein einfaches Web-Formular gegen das Abtippen [26][32].
- **Echte Mac- und Linux-Unterstützung**, auch offline-fähig. *Einschätzung:* Das ist selten im Markt.
- **Transparente optionale Dienste** wie Hosting, Support und Schulung mit festen Preisen, als Gegenmodell zu „auf Anfrage“ [26][27].
- **Später:** IFC-Mengen mit visueller Prüfung [2], XRechnung-Prüfung [15], lokale KI-Unterstützung ohne Datenabfluss [34].

### Risiken

- **Fachliche Korrektheit und Haftung.** Fehler in Preisspiegel, Wertung oder Kostenkontrolle haben für Architekten Haftungsfolgen. Fachliche Reviews durch den Freund sind unverzichtbar. Siehe [HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md).
- **GAEB-Kompatibilität und ggf. Zertifizierung.** Öffentliche Auftraggeber und Bieter erwarten verlässlichen Austausch. Klärung in [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md).
- **Textlizenzen.** STLB-Bau und Herstellertexte dürfen nicht mitgeliefert werden, möglich ist nur ein Import. Siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) und [Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).
- **Support-Erwartung.** Architekten sind Hotline und Schulung gewohnt [14][25]. Ein Open-Source-Projekt braucht ein glaubwürdiges Support-Modell.
- **Dünne Evidenz.** Ohne Interviews droht eine Entwicklung am Bedarf vorbei. Gegenmaßnahme: 3–5 Büros (1–10 Personen) befragen, Pilotprojekt mit dem Freund.
- **Preiswettbewerb.** SaaS ab 49 € pro Monat (NOVA Starter) bzw. 80 € (Phase0) ist günstig [18][21]. Kostenlos allein reicht als Argument nicht; es braucht Datenhoheit, Plattformfreiheit und Vollständigkeit zusammen.
- **Datenschutz** bei einer gehosteten Variante: EU-Server und Auftragsverarbeitungsvertrag [26].

### Aufwandsschätzung (grob, Einschätzung, ungeprüft)

| Baustein | Personenmonate (1 erfahrene Person) |
|---|---|
| Datenmodell LV + Editor + PDF-Ausgabe | 2–4 |
| GAEB DA XML Import/Export X81/X83/X84/X86 (mit vorhandener Bibliothek weniger) | 1–3 |
| Preisspiegel, Vergabevorschlag, Excel-Brücke | 1–2 |
| LPH 8: Aufträge, Nachträge, Aufmaß, Abschläge, Rechnungsprüfung, DIN-276-Kostenkontrolle | 4–8 |
| Mehrplatz bzw. Web, Rechte, Backup/Export | 2–4 |
| Optional: IFC-Mengenübernahme | 2–4 |
| **Erstes nutzbares Werkzeug für LPH 6–7, Einzelplatz** | **ca. 4–9** |
| **Vollständige LPH 6–8 für ein Kleinbüro** | **ca. 10–20** |

**Gegenüberstellung der Aufwandsschätzungen aller Notizen** (Stand 09.11.2026; umgerechnet in Personenmonate für eine Person, 1 PM ≈ 4 Personenwochen ≈ 20 Personentage; alle Werte sind Einschätzungen, nicht geprüft):

| Umfang | Schätzungen | Hauptgründe für die Unterschiede |
|---|---|---|
| GAEB DA XML 3.3 Import/Export | 1–2 PM (20–40 PT, mit Bibliotheken, inkl. X31) [API und Datenmodell](/okf/research/nova-ava/api-and-data-model.md); 1,5–2,5 PM (6–10 PW inkl. LV-Modell und Testsuite, ohne X31; X31 mit REB-Rechenkern zusätzlich 0,75–1,5 PM) [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md); 1–3 PM (diese Notiz); 3–4 PM (inkl. X31 und Tests) [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md) | mit oder ohne X31/REB-Rechenkern, Testsuite und Datenmodell; Wiederverwendung freier Bibliotheken |
| LPH 6–7 ohne Bieterportal | 4–8 PM [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md), [NOVA-Nutzerstimmen](/okf/research/nova-ava/user-feedback.md), [NOVA Produkt](/okf/research/nova-ava/product-and-pricing.md); 4–9 PM (diese Notiz); 7–10,5 PM (Teilsumme im [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)); 8–12 PM inkl. DIN-276-Kostenplanung [Etablierte Anbieter](/okf/research/market/established-vendors.md) | Kostenplanung, Domänenmodell und GAEB-Tiefe mitgerechnet oder nicht |
| LPH 8 allein | 4–8 PM (diese Notiz); etwa 5–7 PM (Differenz in [NOVA-Nutzerstimmen](/okf/research/nova-ava/user-feedback.md)); 5,5–8,5 PM (Teilsumme im [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md)); 6–12 PM [NOVA Produkt](/okf/research/nova-ava/product-and-pricing.md); 8–12 PM [Etablierte Anbieter](/okf/research/market/established-vendors.md); 9–12,5 PM [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md) | Sicherheiten- und Nachtragsregister, Fristen, Berichte, E-Rechnungs-Import und X89 |
| Vollständige LPH 6–8 | 9–15 PM [NOVA-Nutzerstimmen](/okf/research/nova-ava/user-feedback.md); 10–20 PM (diese Notiz); 14–21 PM ohne Portal [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md); 6–24 PM für ein MVP mit Bieterportal, Nachträgen und Rechnungsprüfung (1–2 Entwickler × 6–12 Monate) [NOVA-Unternehmen](/okf/research/nova-ava/company-and-development.md); 14,5–29 PM mit Portal [NOVA Produkt](/okf/research/nova-ava/product-and-pricing.md); 16–32 PM ohne Portal [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md); 23–35 PM mit Portal, Layouts und Zertifizierungsreife [Etablierte Anbieter](/okf/research/market/established-vendors.md) | Bieterportal, Mehrplatz und Rechte, Kostenplanung, Druck- und Berichtslayouts, Zertifizierungsreife, Qualitätsziel („Kleinbüro“ oder „gleichauf mit ORCA PE“) |

*Einschätzung:* Der Umfang erklärt die Unterschiede nur teilweise. Auch bei vergleichbarem Umfang liegen die Werte noch um den Faktor 1,5–2 auseinander, z. B. LPH 8 mit 4–8 gegenüber 9–12,5 PM. Eine gemeinsame Bottom-up-Schätzung fehlt (widersprüchlich - siehe Offene Fragen).

## Offene Fragen

### Nicht gefunden oder nicht verifiziert

- Aktuelle, unabhängige Zahlen zur Zufriedenheit mit AVA-Software und zum Anteil reiner Excel-Büros. Die BauInfoConsult-Angaben (höchstens jedes zweite Büro nutzt AVA, Ø 11 Jahre Nutzung) sind alt und nicht direkt prüfbar [57].
- Mac-Anteil in deutschen Architekturbüros.
- Inhalte der Graphisoft-, Allplan-, Capterra- und Reddit-Diskussionen (Bot-Schutz). Graphisoft-, Allplan- und Capterra-Aussagen beruhen auf Suchauszügen [41]–[45][60][62].
- Preiserhöhungen anderer Anbieter als NOVA (ORCA, California, NEVARIS, iTWO): keine öffentlichen Belege gefunden.
- Belastbare Klagen zu Performance, Ausdrucken und Layouts sowie E-Vergabe-Anbindung: nur Einzelbelege.
- Ob ORCA-Kauflizenzen nach Ablauf des Servicevertrags weiterlaufen: auf der Herstellerseite nicht beantwortet [14].
- ORCAs Mac-Seite nennt noch Windows 10 und „Mac OS X“ und ist möglicherweise veraltet [16].
- NOVA AVA: Kündigungsfrist und Mindestlaufzeit der Abos stehen nicht auf der Website; „monatlich kündbar“ ließ sich nicht bestätigen [18][20].
- **Aufwandsschätzungen abgleichen:** Die Notizen nennen für gleiche Umfänge Werte, die um den Faktor 2–3 auseinanderliegen (Tabelle im Abschnitt Aufwandsschätzung). Offen ist eine gemeinsame Bottom-up-Schätzung mit einheitlichem Umfang, einheitlicher Einheit und klaren Annahmen (Teamgröße, Bibliotheken, Qualitätsziel, Bieterportal ja/nein).

### Fragen an den Architekten-Freund

1. **NOVA-Preis:** Was genau stört: die Höhe, Abo statt Kauf, Kosten je Nutzer, die Add-on-Preise ab 2027, die Preisänderung zum Mai 2026? Welche Edition, wie viele Nutzer, welche Add-ons nutzt er?
2. **Was funktioniert bei NOVA gut** und darf in unserer Lösung nicht fehlen?
3. Wie viele LVs und Vergaben pro Jahr? Anteil öffentlich vs. privat?
4. Welche GAEB-Phasen nutzt er tatsächlich (X83, X84, X86, Aufmaß, Rechnung)? In welcher Form kommen Angebote (GAEB, Excel, PDF, Papier)?
5. Welche E-Vergabe-Plattformen nutzen seine öffentlichen Auftraggeber? Wer erstellt den Vergabevermerk?
6. Welche Rechner (Mac/Windows)? Welches CAD (Archicad, Vectorworks, Allplan …)? Nutzt er IFC-Mengen?
7. Woher stammen seine Texte (STLB-Bau, Herstellerportale, eigene Bibliothek)?
8. Wie berichtet er dem Bauherrn über Kosten: aus NOVA, oder baut er Excel nach? Welche Ausdrucke sind ihm wichtig?
9. Wie prüft er Rechnungen? Kommen schon E-Rechnungen (XRechnung/ZUGFeRD) an?
10. Hat er je Daten aus NOVA exportiert (Excel, GAEB, API)? Was wäre bei einem Wechsel verloren?
11. Arbeitet er im Team oder mit Fachplanern (z. B. TGA-LVs) im selben Projekt?
12. Würde er für Hosting, Support oder Schulung zahlen, und wie viel?

## Quellen

1. Architekturbüro in Gründung sucht AVA-Software (Projekt 24/3401) – SoftGuide – https://www.softguide.de/ausschreibungen/architekturbuero-in-gruendung-sucht-ava-software – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
2. Architektur- und Planungsbüro sucht AVA-Software (19/1597) – SoftGuide – https://www.softguide.de/ausschreibungen/architektur-und-planungsbuero-sucht-ava-software – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
3. Kleines Architekturbüro sucht AVA-Software mit Bautagebuch & Zeiterfassung (20/2029) – SoftGuide – https://www.softguide.de/ausschreibungen/kleines-architekturbuero-sucht-ava-software-mit-bautagebuch-zeiterfassung – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
4. Planungsbüro für Landschaftsarchitektur sucht einfache AVA Software (17/950) – SoftGuide – https://www.softguide.de/ausschreibungen/planungsbuero-landschaftsarchitektur-sucht-einfache-ava-software – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
5. Architektur- und Ingenieurbüro sucht Stammdatensoftware Texte/Preise (26/3572) – SoftGuide – https://www.softguide.de/ausschreibungen/architektur-und-ingenieurbuero-sucht-stammdatensoftware-texte-preise – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
6. Beratungsbüro sucht Ausschreibungssoftware mit Preisspiegel und Abrechnung (19/1778) – SoftGuide – https://www.softguide.de/ausschreibungen/beratungsbuero-sucht-ausschreibungssoftware-mit-preisspiegel-und-abrechnung – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
7. Architekturbüro sucht Software zur Kostenermittlung (20/2055) – SoftGuide – https://www.softguide.de/ausschreibungen/architekturbuero-sucht-software-zur-kostenermittlung – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
8. Architekturbüro sucht Software zur Kostenschätzung nach DIN 276 (21/2747) – SoftGuide – https://www.softguide.de/ausschreibungen/architekturbro-sucht-software-zur-kostenschaetzung-nach-din-276 – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
9. Architekturbüro sucht Software zur Durchführung von Bauprojekten (17/792) – SoftGuide – https://www.softguide.de/ausschreibungen/architekturbuero-sucht-software-zur-durchfuehrung-von-bauprojekten – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
10. Architektur- und Planungsbüro sucht Branchenlösung (17/831) – SoftGuide – https://www.softguide.de/ausschreibungen/architektur-und-planungsbuero-sucht-branchenloesung – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
11. Architekturbüro sucht Komplettlösung (18/1411) – SoftGuide – https://www.softguide.de/ausschreibungen/architekturbuero-sucht-komplettloesung – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
12. Branchenlösung für Architektur- und Ingenieurbüro gesucht (17/795) – SoftGuide – https://www.softguide.de/ausschreibungen/branchenloesung-fuer-architektur-und-ingenieurbro-gesucht – Art: Primärquelle (Anforderungsliste) – abgerufen 2026-11-09
13. ORCA AVA – Preise – ORCA Software GmbH – https://www.orca-ava.de/preise/ – Art: Herstellerangabe – abgerufen 2026-11-09
14. ORCA AVA – Servicevertrag – ORCA Software GmbH – https://www.orca-ava.de/servicevertrag/ – Art: Herstellerangabe – abgerufen 2026-11-09
15. ORCA AVA 27 (Editionen, Systemvoraussetzungen, Neuerungen) – ORCA Software GmbH – https://www.orca-ava.de/orca-ava-27 – Art: Herstellerangabe – abgerufen 2026-11-09
16. ORCA AVA & Mac – ORCA Software GmbH – https://www.orca-software.com/orca-wissen/orca-ava-mac/ – Art: Herstellerangabe – abgerufen 2026-11-09
17. Success Story: ORCA Software – SLASCONE – https://slascone.com/success-stories/orca-software/ – Art: Herstellerangabe (Lizenzdienstleister) – abgerufen 2026-11-09
18. NOVA AVA (Website mit Preisen, EN) – NOVA Building IT GmbH – https://nova-ava.de/en/ – Art: Herstellerangabe – abgerufen 2026-11-09
19. Einheitliches Preismodell für Add-ons ab 1.2.2027 (29.10.2026) – NOVA Building IT GmbH – https://nova-ava.de/neues-preismodell-nova-ava-add-ons/ – Art: Herstellerangabe – abgerufen 2026-11-09
20. NOVA AVA (Startseite, DE) – NOVA Building IT GmbH – https://nova-ava.de/ – Art: Herstellerangabe – abgerufen 2026-11-09
21. Phase0 (Startseite) – Phase0 GmbH – https://www.phase0.com/ – Art: Herstellerangabe – abgerufen 2026-11-09
22. Die besten AVA-Softwares im Vergleich 2026 (Stand 05.11.2026) – Phase0 GmbH – https://www.phase0.com/blog/ava-software-vergleich – Art: Herstellerangabe (Wettbewerbervergleich) – abgerufen 2026-11-09
23. ORCA AVA Alternative – AVA-Software für Mac (Stand 05.11.2026) – Phase0 GmbH – https://www.phase0.com/blog/orca-ava-alternative-mac – Art: Herstellerangabe (Wettbewerbervergleich) – abgerufen 2026-11-09
24. AVAPLAN UpDate kaufen – AVAPLAN Software GmbH – https://www.avaplan.de/ava-software/update-kaufen/ – Art: Herstellerangabe – abgerufen 2026-11-09
25. NEVARIS Build – Produktprofil (Stand 28.05.2025) – SoftGuide / NEVARIS Bausoftware GmbH – https://www.softguide.de/programm/nevaris-build-ava – Art: Herstellerangabe – abgerufen 2026-11-09
26. AVA-Software Vergleich 2026 (16.10.2026, gesponsert) – Dr. Web – https://www.drweb.de/ava-software-vergleich/ – Art: Presse (gesponserter Vergleich) – abgerufen 2026-11-09
27. AVA-Software im Vergleich: Alternativen zu ORCA AVA und RIB iTWO (Stand 09/2026) – KI-Syndikat (Gerabo GmbH) – https://www.ki-syndikat.de/ava-software-vergleich/ – Art: Sekundärquelle (Beratungsunternehmen, nicht getestet) – abgerufen 2026-11-09
28. ORCA AVA 27: Editionen, Preise, Alternativen – KI-Syndikat – https://www.ki-syndikat.de/tools/orca-ava/ – Art: Sekundärquelle – abgerufen 2026-11-09
29. Phase0 – Tool-Profil (Stand 10/2026) – KI-Syndikat – https://www.ki-syndikat.de/tools/phase0/ – Art: Sekundärquelle – abgerufen 2026-11-09
30. Wie viel kostet eine Ausschreibungssoftware? – softwareabc24 – https://www.softwareabc24.de/ausschreibungssoftware/preise-uebersicht – Art: Vergleichsportal – abgerufen 2026-11-09
31. „Kostenkontrolle mit Excel-Integration“, Allgemeine Bauzeitung Nr. 17, 30.04.2021 (Pressespiegel-PDF) – ABZ / Softtech – https://www.softtech.de/_fileadmin/Allgemein/files/pdf-text/Presse/Pressespiegel/Presse_ABZ_April2021.pdf – Art: Presse (herstellernah) – abgerufen 2026-11-09
32. „Brückenschlag im Bauwesen“ (Excel ↔ GAEB), Computern im Handwerk 6/2020 – handwerke.de – https://www.handwerke.de/pdf/CiH_6-20_Schnitt_Gaeb.pdf – Art: Presse (herstellernah) – abgerufen 2026-11-09
33. Mitgliederbefragung zur wirtschaftlichen Situation der Architektur- und Ingenieurbüros 2025, Endbericht 14.07.2025 – IW Consult im Auftrag von AHO, BAK, VBI, BIngK – https://cci-dialog.de/wp-content/uploads/2025/07/Mitgliederbefragung-Architektur-und-Ingenieurbueros-2025.pdf – Art: Primärquelle (Umfrage) – abgerufen 2026-11-09
34. Neues Arbeiten in Architektur- und Ingenieurbüros (Onlineumfrage März 2026) – Fraunhofer IRB – https://irb.fraunhofer.de/content/dam/irb_neu/insights/neues-arbeiten-in-architektur-und-ingenieurbueros-fraunhofer-irb.pdf – Art: Wissenschaft (Umfrage) – abgerufen 2026-11-09
35. KI verändert das Architekturbüro (16.09.2026) – Deutsches Architektenblatt – https://www.dabonline.de/bueropraxis/ki-veraendert-das-architekturbuero – Art: Presse – abgerufen 2026-11-09
36. ARKO – Architekturkooperative, Flyer (03/2026) – Architektenkammer Hessen / ARKO-Arbeitsgruppe – https://www.architektenkammer-hessen.de/fileadmin/ARKO/2026-03_ARKO_Flyer_Screen.pdf – Art: Primärquelle (Kammer) – abgerufen 2026-11-09
37. ARKO – Informationsseite – Architektenkammer Hessen – https://www.architektenkammer-hessen.de/arko – Art: Primärquelle (Kammer) – abgerufen 2026-11-09
38. Gründungsversammlung der Architekturkooperative ARKO am 24. Juni 2026 – Deutsches Architektenblatt – https://www.dabonline.de/bueropraxis/gruendungsversammlung-der-architekturkooperative-arko-am-24-juni-2026 – Art: Presse – abgerufen 2026-11-09
39. Zukunftsstudie 2022 – Planungsbüros in Deutschland – KOBOLD Management Systeme GmbH (via tga-praxis.de) – https://www.tga-praxis.de/sites/default/files/public/data-news/KOBOLD%20Zukunftsstudie%202022%20-%20Planungsb%C3%BCros%20in%20Deutschland%20-%20eine%20Standortbestimmung.pdf – Art: Herstellerstudie (Kundenbefragung) – abgerufen 2026-11-09
40. Thread „Ausschreibung“ (20./21. August, vermutlich 2026) – Vectorworks Forum – https://www.vectorworksforum.eu/topic/31815-ausschreibung/ – Art: Forum – abgerufen 2026-11-09
41. Thread „Erfahrungen NOVA AVA“ – Graphisoft Community – https://community.graphisoft.com/t5/Kollaboration-mit-anderer/Erfahrungen-NOVA-AVA/td-p/570337 – Art: Forum (Bot-Schutz; nur Suchmaschinen-Auszug) – abgerufen 2026-11-09
42. Threads zu AVA und Mengenermittlung (u. a. „AVA-Software“) – Graphisoft Community – https://community.graphisoft.com/t5/Modellierung/AVA-Software/td-p/540850 – Art: Forum (Bot-Schutz; nur Suchmaschinen-Auszug) – abgerufen 2026-11-09
43. Lizenz-Threads (u. a. „Dauerlizenzen ab 2026 wertlos?“) – Graphisoft Community – https://community.graphisoft.com/t5/Allgemeine-Fragen/Dauerlizenzen-ab-2026-wertlos/m-p/659609 – Art: Forum (Bot-Schutz; nur Titel/Suchauszug) – abgerufen 2026-11-09
44. Forum, Kategorie AVA – Allplan Connect – https://connect.allplan.com/forum/topics/ava.html – Art: Forum (403; nur Suchmaschinen-Auszug) – abgerufen 2026-11-09
45. NEVARIS Build – Capterra Deutschland – https://www.capterra.com.de/software/1041806/nevaris-build – Art: Bewertungsportal (403; nur Suchmaschinen-Auszug, 4 Bewertungen) – abgerufen 2026-11-09
46. ORCA AVA – Capterra – https://www.capterra.com/p/188595/ORCA-AVA/ – Art: Bewertungsportal (403; Suchauszug: 0 Bewertungen) – abgerufen 2026-11-09
47. Phase0 (ehem. Compa) – OMR Reviews – https://omr.com/de/reviews/product/compa – Art: Bewertungsportal (0 Bewertungen) – abgerufen 2026-11-09
48. „Ausschreibungsprogramm für Architekten: Vorbemerkungen …“ (12/2009–01/2010) – bau.de Forum – https://bau.de/forum/architektur/11085.php – Art: Forum – abgerufen 2026-11-09
49. „AVA-Software: Empfehlungen für Architekten & Bauleiter“ (2002) – bau.de Forum – https://bau.de/forum/edv/10028.php – Art: Forum – abgerufen 2026-11-09
50. „AVA Software für MacOS“ (2004) – bau.de Forum – https://bau.de/forum/edv/10086.php – Art: Forum – abgerufen 2026-11-09
51. „AVA Software Vergleich: Nevaris Alternative …“ (2013) – bau.de Forum – https://bau.de/forum/architektur/11252.php – Art: Forum – abgerufen 2026-11-09
52. „Word, Excel oder PDF Datei in GAEB umwandeln“ (02/2011) – administrator.de – https://administrator.de/forum/word-excel-oder-pdf-datei-in-gaeb-umwandeln-160601.html – Art: Forum – abgerufen 2026-11-09
53. Die IFC-Schnittstelle zwischen ArchiCAD und ORCA AVA sowie RIB iTWO (Bachelorarbeit HTWK Leipzig, 2016) – diplomarbeiten24 – https://www.diplomarbeiten24.de/document/359036 – Art: Wissenschaft (nur Abstract/Inhaltsverzeichnis) – abgerufen 2026-11-09
54. AVA Software – BauNetz Wissen – https://www.baunetzwissen.de/integrales-planen/fachwissen/software/ava-software-5289657 – Art: Presse – abgerufen 2026-11-09
55. Digitale Baukostendatenbank (BauKoDat) – BauNetz Wissen (gesponsert von PROJEKT PRO) – https://www.baunetzwissen.de/controlling-und-management/tipps/news/digitale-baukostendatenbank-9853095 – Art: Presse (gesponsert) – abgerufen 2026-11-09
56. Digitale Ausschreibung – BauNetz Wissen – https://www.baunetzwissen.de/controlling-und-management/fachwissen/kosten-und-vertraege/digitale-ausschreibung-8468954 – Art: Presse – abgerufen 2026-11-09
57. Marktstudie Bausoftware jetzt verfügbar – BauInfoConsult GmbH (PresseBox) – https://pressebox.com/pressrelease/bauinfoconsult-gmbh/marktstudie-bausoftware-jetzt-verfuegbar/boxid/366817 – Art: Presse (Volltext gesperrt; nur Suchauszug, Datum unklar) – abgerufen 2026-11-09
58. „AVA-Software Vergleich: Welche Bausoftware ist am benutzerfreundlichsten?“ (2002, mit KI-Inhalten von 2026) – bau.de Forum – https://bau.de/forum/edv/10007.php – Art: Forum – abgerufen 2026-11-09
59. CaliforniaX – Capterra Deutschland – https://www.capterra.com.de/software/1043185/californiax – Art: Bewertungsportal (Suchauszug: 0 Bewertungen) – abgerufen 2026-11-09
60. Ältere Mac-Threads (u. a. „Archicad und AVA für MacOsX“) – Graphisoft Community – https://community.graphisoft.com/t5/Installation-und-Aktualisierung/Archicad-und-AVA-f%C3%BCr-MacOsX/td-p/419147 – Art: Forum (Bot-Schutz; nur Suchmaschinen-Auszug) – abgerufen 2026-11-09
61. „Bau-Budgetverwaltung & LV-Ausschreibung: Excel-Vorlagen …“ (06/2003) – bau.de Forum – https://bau.de/forum/architektur/10286.php – Art: Forum – abgerufen 2026-11-09
62. „AVA in ArchiCad integriert“ (Alte Wunschliste) – Graphisoft Community – https://community.graphisoft.com/t5/Alte-Wunschliste/AVA-in-ArchiCad-intergriert/td-p/560147 – Art: Forum (nur Titel) – abgerufen 2026-11-09
63. AVAPLAN – Editionen und Preise – AVAPLAN Software GmbH – https://www.avaplan.de/ava-software/editionen-preise/ – Art: Herstellerangabe – abgerufen 2026-11-09
64. ORCA AVA – Vergleich aller Editionen und Starter Edition (SE: Leistungsverzeichnisse, Angebote mit Preisspiegel, Aufträge und Nachträge; ohne Aufmaßprüfung, Rechnungsfreigabe, Kostenstand) – ORCA Software GmbH – https://www.orca-ava.de/vergleich-aller-editionen/ und https://www.orca-ava.de/starter-edition/ – Art: Herstellerangabe – abgerufen 2026-11-09
65. Büroführung: Umfrage der Architektenkammer – erst 29 Prozent setzen schon KI ein (10.11.2025; Basis: Kammermitglieder, Berufspolitische Befragung 2025 der BAK) – IWW Institut (PBP) – https://www.iww.de/pbp/unternehmensfuehrung/buerofuehrung-umfrage-der-architektenkammer-erst-29-prozent-der-architekturbueros-setzen-schon-ki-im-buero-ein-f170364 – Art: Presse über Kammerumfrage – abgerufen 2026-11-09
