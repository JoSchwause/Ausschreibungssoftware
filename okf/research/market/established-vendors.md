---
type: Research Note
title: Etablierte AVA-Anbieter im Detail – ORCA, CaliforniaX, NEVARIS, RIB iTWO, SIDOUN u. a.
description: Tiefenprofile der etablierten planerseitigen AVA-Programme in Deutschland (Eigentümer, Editionen, Betrieb, Lizenz- und Preismodelle, Funktionen, GAEB-Zertifikate, Offenheit) mit Funktions- und Preisvergleich inklusive NOVA AVA – als Grundlage für Scoping und Positionierung eines Open-Source-AVA.
resource: https://www.orca-ava.de/preise/
tags: [research, market, wettbewerber, preise, lizenzmodelle, gaeb, ava-software]
timestamp: 2026-11-09T17:16:17Z
sources: 89
confidence: mittel
---

# Etablierte AVA-Anbieter im Detail – ORCA, CaliforniaX, NEVARIS, RIB iTWO, SIDOUN u. a.

## Kurzfassung

- **Der Markt ist 2024–2026 stark konsolidiert worden.** Die Beteiligungsgesellschaft LEA Partners kaufte ORCA im Juli 2024 und bündelte im Februar 2026 acht Bausoftware-Firmen zur **Orca Group** [12][13]. Dazu gehören vier AVA-Programme, die auf der BVBS-Liste GAEB-zertifizierter Software stehen: ORCA AVA, AVANTI, AVA.relax und BUILDUP [13][77]. Die Liste nennt keine Gültigkeitsdaten und führt mindestens ein abgelaufenes Zertifikat (NOVA AVA 4, gültig bis 10.10.2026), „gelistet“ heißt also nicht sicher „gültig“ [88]. NEVARIS gehört zu Nemetschek [42], RIB zu Schneider Electric [56]. Unter den großen Anbietern sind nur G&W (CaliforniaX) und SIDOUN noch eigenständig bzw. inhabergeführt [32][70].
- **Alle etablierten Produkte sind Windows-Programme.** Sie laufen als Desktop- oder Client-Server-Anwendung, meist mit MS SQL Server oder dateibasierter Datenbank [7][28][47]. „Cloud“ heißt bei ihnen in der Regel Hosting bzw. Fernzugriff auf das Windows-Programm, etwa G&W AVA4CLOUD oder RIB Hosting [27][60]. Ein im Browser laufendes AVA bietet unter den hier betrachteten Anbietern nur NOVA [79]. RIB 4.0 läuft ebenfalls als Cloud-Plattform, zielt aber stark auf Bauunternehmen [64].
- **Bei den Lizenzen setzt sich das Abo durch, der Kauf verschwindet aber nicht.**
  - ORCA zeigt auf der Preisseite nur noch Abo-Preise, z. B. Professional Edition 1.788 €/Jahr [1]. Kauflizenzen gibt es laut AGB weiterhin, Kaufpreise aber nur auf Anfrage [8].
  - NEVARIS verkauft Build als Subscription-Pakete [39]. Laut einem Händler kostet z. B. „Planen Pro“ 65 €/Monat und Nutzer [50].
  - G&W bietet bewusst Kauf, Abo (12 oder 3 Monate) und SaaS parallel an, jeweils mit Floating-Lizenzen [22][23].
  - SOFTTECH bietet AVANTI zur Miete oder zum Kauf an [72][73].
- **Preisniveau für einen Arbeitsplatz mit vollem Umfang der Leistungsphasen 6–8:**
  - Im Abo: etwa 1.200–2.100 € netto pro Jahr [1][23][50][72].
  - Im Kauf: einmalig etwa 3.100–6.100 € plus etwa 18–25 % des Listenpreises pro Jahr für die Pflege [19][23][76].
  - NOVA Business kostet 1.393 €/Jahr [78]. *Einschätzung:* NOVA ist im Vergleich nicht teurer als die etablierte Konkurrenz. Der Preisschmerz des Freundes liegt vermutlich an anderer Stelle (Add-ons, Kosten pro Nutzer, Abo-Zwang); das ist noch zu klären.
- **Die Kernfunktionen für die Leistungsphasen 6–8 sind Standard.** Alle Produkte bieten LV-Erstellung, Kostenplanung nach DIN 276, Preisspiegel, Nachträge, Aufmaß nach REB, Rechnungsprüfung und Kostenkontrolle [5][23][40][55][72][80]. Nicht-Fachleute finden die Begriffe in der Lesehilfe unten.
- **Unterschiede gibt es woanders:**
  - beim Zugang der Bieter und der Anbindung an E-Vergabe-Plattformen;
  - bei BIM (IFC, BIM-LV-Container);
  - bei E-Rechnung (XRechnung) und KI;
  - bei der Betriebsform.

  Details: CaliforniaX Offerte/EVC [33][34], RIB eVergabe und TenderConnect [55][58], NOVA-Bieterportal [79].
- **Die Daten sind wenig offen.** Eine öffentlich dokumentierte API hat von den betrachteten Produkten nur NOVA [85]. G&W nennt APIs und ERP-Anbindungen nur für die Enterprise Edition [23][31]. Der übliche Ausstiegsweg ist bei allen Produkten der GAEB-Export [77]. ORCA speichert Projekte als Dateien, die sich wie MS-Jet-Datenbanken verhalten [7].
- **Editionen sperren wichtige Funktionen.**
  - Bei ORCA endet die Starter Edition bei LPH 7: LV, Angebote mit Preisspiegel sowie Aufträge und Nachträge sind enthalten. Es fehlen Aufmaßprüfung, Rechnungsfreigabe und Kostenstand, also Abrechnung und Kostenkontrolle der LPH 8. Volle BIM-Funktionen gibt es nur in der Enterprise Edition [1][4][87].
  - G&W begrenzt die günstigen Small-Business-Editionen auf 5, 10 oder 20 gleichzeitig aktive Bauvorhaben [25].
- **Kostenlose Einstiege gibt es reichlich.**
  - Studierende bekommen Lizenzen gratis bei ORCA, G&W, NEVARIS und SOFTTECH [9][36][49][73]. RIB verlangt 99 € [61].
  - SIDOUN Globe4all ist dauerhaft kostenlos für bis zu drei gleichzeitige Nutzer [66].
  - *Einschätzung:* Ein Open-Source-AVA gewinnt deshalb nicht allein über den Preis „0 €“.
- **Unabhängige Nutzerbewertungen sind kaum zugänglich.** Die Portale Capterra, GetApp und TrustRadius lieferten HTTP 403. OMR zeigt für CaliforniaX 0 Bewertungen [84]. Die Forenbeiträge stammen aus den Jahren 2002 bzw. 2013 [82][83]. Die Stärken und Schwächen unten stammen daher überwiegend aus Hersteller-, Wettbewerber- und Redaktionsquellen und sind entsprechend gekennzeichnet.

## Lesehilfe: Begriffe für Nicht-Architekten

| Begriff | Erklärung (engl. Begriff in Klammern) |
|---|---|
| **AVA** | Ausschreibung, Vergabe und Abrechnung von Bauleistungen. AVA-Programme beginnen meist schon bei der Kostenschätzung [7]. (Tendering, award, billing) |
| **LV (Leistungsverzeichnis)** | Strukturierte Liste der Teilleistungen eines Gewerks. Jede Position hat eine Ordnungszahl (OZ), einen Text, eine Menge und eine Einheit. Bieter tragen Preise ein [7]. (Bill of quantities) |
| **Leistungsphasen (LPH) 6–8** | Phasen nach HOAI: LPH 6 Vorbereitung der Vergabe, LPH 7 Mitwirkung bei der Vergabe, LPH 8 Objektüberwachung. ORCA ordnet seine Editionen nach diesen Phasen [5]. Details: [HOAI-Notiz](/okf/research/standards/hoai-vob-b-c.md) |
| **Preisspiegel** | Tabelle, die die Preise aller Bieter Position für Position gegenüberstellt. Grundlage für den Vergabevorschlag [7]. (Bid comparison) |
| **Auftrags-LV / Vergabe-LV** | Das beauftragte LV mit den Vertragspreisen [7]. |
| **Nachtrag** | Zusätzliche oder geänderte Leistung nach der Auftragsvergabe. Wird mit Ursache und Anspruchsgrundlage dokumentiert [5]. (Change order) |
| **Aufmaß / REB / DA11 / X31** | Aufmaß ist die Mengenermittlung der erbrachten Leistung. REB 23.003 ist der Formelkatalog dafür. DA11 und GAEB X31 sind Austauschformate für Aufmaße [4][23]. (Quantity survey) |
| **Rechnungsprüfung / Zahlungsfreigabe** | Prüfung von Teil-, Schluss-, Regie- und Nachtragsrechnungen und Freigabe der Zahlung [5]. |
| **DIN 276** | Norm zur Gliederung von Baukosten in Kostengruppen. Wird für Kostenschätzung, Kostenberechnung bis Kostenfeststellung genutzt [5]. Details: [DIN-276-Notiz](/okf/research/standards/din-276-cost-planning.md) |
| **GAEB DA XML / X81–X86** | Deutsches Austauschformat für LVs. X81 = LV, X83 = Angebotsaufforderung, X84 = Angebot, X86 = Auftrag [7]. Details: [GAEB-Notiz](/okf/research/standards/gaeb-da-xml.md) |
| **BVBS-Zertifikat** | Konformitätsprüfung der GAEB-Schnittstelle durch den Softwareverband BVBS. Gilt für eine bestimmte Softwareversion 5 Jahre lang, getrennt nach den Bereichen AVA, Bauausführung, Mengenermittlung und Texterstellung [77]. |
| **STLB-Bau** | Standardleistungsbuch mit genormten Ausschreibungstexten. In der Regel lizenzpflichtig. Details: [Textquellen-Notiz](/okf/research/standards/stlb-bau-tender-texts.md) |
| **Edition** | Funktionsstufe eines Produkts, z. B. Starter, Professional oder Enterprise. Bestimmt, welche Funktionen und Leistungsphasen freigeschaltet sind [1]. |
| **Floating-Lizenz** | Bezahlt wird nach der Zahl gleichzeitiger Nutzer, nicht nach benannten Personen oder Rechnern [23]. (Concurrent licence) |
| **Softwarepflege / Servicevertrag** | Jährliche Gebühr bei Kauflizenzen. Umfasst Updates, neue Versionen und Hotline [3][26]. (Maintenance) |
| **BIM-LV-Container** | Paket aus GAEB-LV und IFC-Modell mit Verknüpfungen. ORCA nennt in der FAQ DIN SPEC 91350 als Grundlage, G&W inzwischen DIN 18290 [7][29]. DIN SPEC 91350 ist zurückgezogen und durch DIN 18290-1/-2:2023-11 ersetzt [89]. Welche Fassung ORCA tatsächlich schreibt, ist offen (widersprüchlich - siehe Offene Fragen). Details: [BIM-Notiz](/okf/research/standards/bim-and-ava.md) |

## Marktstruktur: Wem gehören die etablierten Produkte?

| Produkt | Hersteller (Sitz) | Eigentümer / Gruppe (Stand 11/2026) | Gegründet | Größe (laut Quelle) |
|---|---|---|---|---|
| **ORCA AVA** | ORCA Software GmbH (Neubeuern bei Rosenheim) [11] | Fonds von LEA Partners seit 2024, seit 02/2026 „Ein Unternehmen der Orca Group“ [11][12][13] | 1990 [12] | Über 110 Mitarbeitende (07/2024) [12]. Laut SoftGuide über 12.500 bzw. über 15.000 Installationen (widersprüchlich) [19] |
| **CaliforniaX / California.pro** | G&W Software AG (München, Niederlassungen Essen und Berlin) [35][32] | Unabhängige AG. Die Gründer sitzen im Aufsichtsrat [31][23] | 12/1982 [31] | „Viele tausend“ Kunden, über 500 Kommunen (Herstellerangabe 2023) [35] |
| **NEVARIS Build** (+ Success X in AT) | NEVARIS Bausoftware GmbH (Bremen, Elixhausen/AT) [44] | Nemetschek Group (seit 1998), vor 2015 „Nemetschek Bausoftware“ [41][42] | Name NEVARIS seit 2015 [41] | Über 250 Mitarbeitende an neun Standorten in DACH [43] |
| **RIB iTWO** (+ RIB 4.0) | RIB Software GmbH (Stuttgart) [56] | Schneider Electric SE [56] | „60-jährige Geschichte“ [56] | Über 550.000 Anwender weltweit, über 2.300 Mitarbeitende (07/2026) [56] |
| **SIDOUN Globe / Globe4all / KIAVA** | SIDOUN International GmbH (Freiburg) [65] | Inhabergeführt [70] | 1970er Jahre [70] | k. A. |
| **AVANTI** | SOFTTECH GmbH, seit 10/2026 BAUER SOFTTECH GmbH (Neustadt a. d. W., Heppenheim) [14] | Orca Group [13][14] | SOFTTECH 1985 [14] | Zusammen mit BauerSoftware rund 50 Mitarbeitende [14] |
| **AVA.relax** | COSOBA GmbH (Darmstadt) [75] | Orca Group [13] | k. A. | k. A. |
| **BUILDUP** | BauerSoftware (Heppenheim), jetzt BAUER SOFTTECH [14][74] | Orca Group [13] | 1986 [14] | siehe AVANTI |
| *NOVA AVA (Vergleichsanker)* | NOVA Building IT GmbH [77] | siehe [NOVA-Firmennotiz](/okf/research/nova-ava/company-and-development.md) | – | – |

**Zur Orca Group** [13][15]:
- Mitglieder: Acclaro, BauerSoftware, COSOBA, ISHAP, NetzWerkPlan, ORCA Software, PROJEKT PRO (Bürosoftware) und SOFTTECH.
- Erklärtes Ziel ist es, die Programme durchgängig zu vernetzen. Für Anwender soll sich laut Gruppe zunächst nichts ändern.
- Seit dem Verkauf 2024 liegen ORCA und die Schwestergesellschaft ORCA-online GmbH (AUSSCHREIBEN.DE) in LEA-Fonds [12].

*Einschätzung:* Wenn eine Private-Equity-Gruppe ein Marktsegment bündelt, folgen oft Preiserhöhungen und eine Standardisierung der Lizenzmodelle. Ein Hinweis darauf: ORCA hat sich in den Abo-AGB jährliche Preiserhöhungen vorbehalten [8]. Für ein Open-Source-Projekt ist das ein Argument: Die Unabhängigkeit vom Anbieter wird wichtiger.

## Produktprofile

### 1. ORCA AVA (ORCA Software GmbH, Orca Group)

**Editionen** (Version 27) [1][4][5]:

| Edition | Leistungsphasen | Umfang |
|---|---|---|
| **Starter (SE)** | 5–7 | Projektstammdaten, Kostenschätzung und -berechnung, Ausschreibung mit LV, Angeboten, Angebotsprüfung und Preisspiegel, Auftragsvergabe und Nachträge, Schriftverkehr, unbegrenzt viele Bauvorhaben [87] |
| **Professional (PE)** | 1–9 | Zusätzlich aus dem Programmbereich „Vergabe und Abrechnung“ Aufmaßprüfung und Rechnungsfreigabe (Aufträge und Nachträge hat schon SE), Kostenstand, IFC-Basic, bis zu 5 Kostengliederungen [1][87] |
| **Enterprise (EE)** | 1–9 | Zusätzlich Benutzer- und Gruppenrechte (auch pro Projektphase), BIM-LV-Container, IFC-Advanced (IFC-Diagnose, Brutto-, Netto- oder VOB-Maße), bis zu 10 Kostengliederungen |

**Neu in ORCA AVA 27** (Release um 11/2025, Helpdesk-Relaunch am 04.11.2025) [6]:
- „ORCA Manager“ mit Projektsuche und Live-Anzeige der aktiven Nutzer;
- Schnittstelle zu DBD-BIM Objekte für Kostenrahmen und Schätzung nach der Bauelementmethode;
- Anbindung an das kostenpflichtige Grafik-Aufmaß GRAVA connect von SOFTTECH;
- erweiterter IFC-Manager;
- Übernahme von XRechnungen in den Rechnungslauf.

**Betrieb und Technik:**
- Windows 11 (25H2) oder 10 (22H2) sowie Windows Server 2016–2025. Remote Desktop Services und Citrix werden unterstützt. Einzelplatz-, Netzwerk- und Terminalserver-Installation sind möglich [7].
- Die `*.ava`-Projektdateien soll man laut Hersteller wie MS-Jet-Datenbanken behandeln, also ohne Replikation und auf einem Windows-kompatiblen Dateiserver [7].
- Auf dem Mac geht es nur über Virtualisierung (nur Intel genannt), per Remote Desktop oder über Windows-Hosting bei Dritten wie Azure oder AWS [16]. Ein eigenes SaaS-Angebot gibt es nicht [16][20].
- Seit ORCA AVA 26 läuft die Lizenzierung über den Dienstleister SLASCONE. Kunden erhalten einen einzigen Schlüssel und Floating-Lizenzen, die ein Cloud-Lizenzserver verwaltet. Davor gab es jährlich neue Schlüssel [18].
- Neue Versionen lassen sich nicht parallel zu alten installieren. Projekte aus Version 27 lassen sich nicht in älteren Versionen öffnen [6].

**Lizenz und Preise** (netto, Abruf 09.11.2026):

| Posten | Preis | Hinweise / Quelle |
|---|---|---|
| **Abo** (inkl. Servicevertrag) | SE 828 €/Jahr, PE 1.788 €/Jahr, EE 2.388 €/Jahr | Jede weitere Lizenz: 708, 1.428 bzw. 1.908 €. Zzgl. „Bearbeitungspauschale“ ohne Betrag [1] |
| **Abo-Bedingungen** | Monatsmiete, jährlich im Voraus berechnet | Mindestlaufzeit 12 Monate, Verlängerung um 12 Monate, Kündigung einen Kalendermonat vor Ablauf. Preiserhöhung mit 6 Wochen Vorlauf zum Jahresende möglich, dann Sonderkündigungsrecht [8]. Die Abo-Seite selbst nennt vier Wochen Kündigungsfrist [2] |
| **Kauf** (Dauerlizenz) | laut SoftGuide (V25, 24.03.2025): SE ab 1.798 €, PE ab 4.278 €, EE ab 6.138 €, jeweils inkl. Servicevertrag | Sekundärquelle [19]. Die Herstellerseite nennt aktuell keine Kaufpreise mehr („Angebot anfordern“) [1][20]. Kauf ist laut AGB weiter möglich [8] |
| **Servicevertrag** nach dem 1. Jahr (bei Kauf) | SE 348 €, PE 828 €, EE 1.188 € pro Jahr | Weitere Lizenzen 300, 660 bzw. 948 €. 12 Monate, verlängert sich automatisch, Kündigung 4 Wochen vorher [3] |
| **Editionsupgrade** | SE → PE 2.000 € (jede weitere Lizenz 1.500 €), PE → EE 1.500 € (1.200 €), SE → EE 3.500 € (2.700 €) | [4] |
| **Studierende / Lehre** | Kostenlose Jahreslizenz der Enterprise Edition. Bildungspaket für Lehrende | [9] |
| **Kammern** | Sonderkonditionen für die Professional Edition über Rahmenverträge mit AK NRW (seit 10/2000), AK Rheinland-Pfalz, AK Baden-Württemberg, AK Saarland und AIK Schleswig-Holstein | Ohne veröffentlichte Beträge [10] |
| **Testversion** | 6 Wochen, voller Funktionsumfang | [5] |

**Funktionen** [5][4][6]:
- **Leistungsverzeichnisse:** aus Bibliotheken, Altprojekten oder per Import erstellen; prüfen; ausgeben auf Papier, als PDF oder als Datei.
- **Angebote:** per GAEB-Import oder manuell erfassen; Fehler- und Ausreißerpositionen markieren; Preisspiegel erstellen.
- **Aufträge und Nachträge:** Aufträge losweise vergeben; Nachträge mit Ursache dokumentieren.
- **Abrechnung:** Aufmaßprüfung (Import DA11, DA11S, DA12 oder GAEB X31); Rechnungsarten Teil-, Schluss-, Regie- und Nachtragsrechnung; Zahlungsfreigabe.
- **Kosten:** Kostenstand nach Gewerken und Kostengliederungen mit Prognose; eingefrorene („fixierte“) Kostenstände; DIN-276-Assistent (Stand 2018); Bauelement-Methode; Gewerkeschätzung mit „Auto-LV“.
- **Schriftverkehr:** PDF-Formulare.
- **Datenaustausch:**
  - Export nach Excel, Word, KTB und CPL;
  - GAEB- und ÖNORM-Schnittstellen;
  - „ORCA Transferpaket“ [5].

**Textquellen:**
- Das ORCA-eigene Portal AUSSCHREIBEN.DE ist für Planer kostenlos. Laut Hersteller enthält es 1,1 Mio. Ausschreibungstexte, Daten von über 750 Herstellern und bietet 50 API-Anbindungen [17].
- Kataloge anderer Textanbieter lassen sich anbinden [86].

**GAEB-Zertifikate** (aktuelle BVBS-Liste) [77]:
- Bereich AVA: ORCA AVA 23 (DA XML 3.1/3.2), 24 (3.2/3.3) und 25 (3.3).
- Bereich Mengenermittlung: ORCA AVA 25.
- Für die Versionen 26 und 27 ist noch kein eigener Eintrag gelistet.

**Typische Kunden:** Architekten, Ingenieure, Fachplaner, Wohnungsunternehmen, Behörden und Produkthersteller (über AUSSCHREIBEN.DE) [12].

**Lernkurve:** ORCA bietet ein zweitägiges Grundlagenseminar an. Die Unterlage hat 59 Seiten und deckt Projekt, LV, Angebote, Preisspiegel, Aufträge, Nachträge, Aufmaß, Rechnungsfreigabe und DIN-276-Kostenstand ab [21]. Ein gedrucktes Handbuch gibt es nicht, stattdessen den Online-Helpdesk [7]. Laut KI-Syndikat ist ohne Vorwissen zu VOB, STLB-Bau und GAEB mit einer echten Einarbeitungszeit zu rechnen [20].

**Stärken und Schwächen:**
- **Stärken laut Redaktionsportal** [20]: starke Ausrichtung auf deutsche Normen, zertifizierte GAEB-Schnittstelle, IFC, öffentlich gelistete Preise.
- **Schwächen laut Redaktionsportal** [20]: kein Cloud-first-Konzept; mobil nur ein LV-Viewer; volles BIM nur in der EE; kein Baustellen- oder Mängelmanagement.
- *Einschätzung:*
  - ORCA ist der „Standard“, an dem sich Architekten orientieren.
  - Ein Nachteil für kleine Büros: Vergabe und Abrechnung gibt es erst ab der PE. Die PE kostet im Abo mehr als NOVA Business (siehe Preisvergleich).

### 2. CaliforniaX und California.pro (G&W Software AG)

**Produktgenerationen** [31][28][29][77]:

| Generation | Zeitraum / Kennzeichen |
|---|---|
| „Programmsystem Architektur“ | ab 1978 |
| CALIFORNIA classic | erste Windows-Version |
| CALIFORNIA 3000 | 2000, SQL-basiert |
| California.pro | 2010, .NET |
| CaliforniaX | BVBS-zertifiziert seit V23; aktuell V26 (2026) |

- Die Vorgängergeneration California.pro wird weiter gepflegt; V16 erschien im 4. Quartal 2025 [28].
- Laut G&W ist CaliforniaX vollständig kompatibel zu den Daten aus California.pro [28].

**Editionen** [25][23]:

| Edition | Kennzeichen |
|---|---|
| **Small Business (SBE)** | Voller Funktionsumfang, aber höchstens 5, 10 oder 20 Bauvorhaben gleichzeitig im Zugriff |
| **Business (BE)** | Unbegrenzt viele Bauvorhaben |
| **Enterprise (EE)** | Integration in IT-Landschaften: ERP, APIs, Oracle-Datenbank, Mandantenfähigkeit, Workflows. Nur auf Anfrage |

**Module** werden zu Paketen kombiniert [23][24]:

| Paket | Module |
|---|---|
| AUSSCHREIBEN | LVE (LV-Erstellung, Angebotsprüfung, Preisspiegel, Vergabe), REB (Mengen/Aufmaß nach REB 23.003, DA11, X31), DAT (GAEB) |
| BAUKOSTEN | zusätzlich KOS (Kostenermittlung, z. B. DIN 276, AKVS) und PRO (Abrechnung, Kostenkontrolle, Nachträge) |
| BIM | zusätzlich RGB (Raum- und Gebäudebuch) und BIM (BIM2AVA: IFC, BCF) |
| FM | LVE, JLV (Jahres-LV für wiederkehrende Leistungen), BPO |

Weitere Add-ons [23]:
- AUF (freie Mengenermittlung), MOB (mobiles Aufmaß), DNO (DATANORM), ÖNO (ÖNORM A2063), MLV (mehrsprachige LVs);
- OFF (Offerte), EVC (E-Vergabe Connect), KAL (Kalkulation), KTR (Kostensplitting), BUD (Budget);
- ERE (E-Rechnung nach EN 16931, XRechnung/ZUGFeRD), ZRE (Rechte), LDP (LDAP).

**Betrieb und Technik:**
- Windows, Windows Server 2025, MS SQL Server bis 2025. Seit California.pro V16 wird kein SQL Server mehr automatisch mitinstalliert [29][28].
- In der EE alternativ Oracle [37].
- Citrix und Terminalserver werden unterstützt [35].
- **AVA4CLOUD** [27]:
  - Zugriff per Browser oder RDP auf eine von G&W gehostete CaliforniaX, Rechenzentren in Deutschland.
  - Eine vorhandene Kauflizenz kann mitgenommen und später wieder auf den eigenen Server zurückgeholt werden.
  - Laut FAQ ist AVA4CLOUD die Plattform, über die CaliforniaX auch auf Mac, Tablet und Smartphone nutzbar ist.
- Laut Hersteller gehören die Daten ausschließlich dem Kunden und werden nicht für KI-Training genutzt [27].

**Lizenz und Preise:** Die Liste stammt aus den öffentlichen Preisdaten des Produktkonfigurators. Sie wurden am 16.10.2026 erzeugt, die Artikellisten stammen vom 09.10.2026 [23]. Die Kaufpreise sind identisch mit dem Webshop [24]. Alle Preise netto, pro Floating-Lizenz.

| Paket | Edition | Kauf | Pflege bei Kauf | Abo (12 Monate) | Kurz-Abo (3 Monate) |
|---|---|---|---|---|---|
| AUSSCHREIBEN | SBE 5 | 870 € | 13,05 €/Monat | 492 €/Jahr | 159 € |
| AUSSCHREIBEN | BE | 1.660 € | 24,90 €/Monat | 696 €/Jahr | 225 € |
| BAUKOSTEN | SBE 5 / 10 / 20 | 1.640 / 2.180 / 2.640 € | 24,60 / 32,70 / 39,60 €/Monat | 684 / 912 / 1.104 €/Jahr | 222 / 294 / 357 € |
| **BAUKOSTEN** | **BE** | **3.110 €** | **46,65 €/Monat** | **1.296 €/Jahr** | **420 €** |
| BIM | BE | 5.510 € | 82,65 €/Monat | 2.196 €/Jahr | 711 € |
| FM | BE | 2.070 € | 31,05 €/Monat | 864 €/Jahr | 279 € |

Ergänzungen zur Tabelle:
- **Pflegesatz:** 1,5 % des Kaufpreises pro Monat, also 18 % pro Jahr. Mindestens 35 €/Monat [23].
- **Pflegevertrag:** optional, Mindestlaufzeit 24 Monate, verlängert sich automatisch, Kündigung 3 Monate vor Ende des Halbjahres. Bringt Updates, neue Generationen und 20 % Rabatt auf Seminare [26].
- **Add-ons** kosten 320–1.500 € Kauf bzw. 11–52 €/Monat im Abo. EVC etwa 820 € (SBE 5) bis 1.500 € (BE); ERE 320–620 € [23].
- **Mengenstaffel im Shop:** Der Stückpreis sinkt bei 2–4 Lizenzen auf 75 % und ab 20 Lizenzen auf 40 % [24].
- **SaaS:** Preis nur auf Anfrage [23][22].
- **Studierende:** kostenlose Semesterlizenz, beliebig verlängerbar [36].
- G&W wirbt mit „Kauf bleibt Kauf. Abo bleibt Wahl.“ [22].

**Funktionen und Neuerungen in V26** [29]:
- „California-Links“: programmweite Verknüpfung von Bauteilen, Positionen, Mengen und Angeboten;
- ERE mit Abgleich gegen das LV und Zuordnung im Aufmaßblatt;
- BIM-LV-Container nach DIN 18290;
- Zeitauswertungen;
- englische Benutzeroberfläche;
- Abrechnungssimulation im Soll-Ist-Vergleich.

**Bieter und E-Vergabe:**
- Modul **OFF** liefert Bietern das LV als HTML-Angebotsformular, das im Browser ausgefüllt und elektronisch zurückgelesen wird. Beim Bieter muss nichts installiert werden [34].
- Modul **EVC** verbindet CaliforniaX direkt mit der Plattform „AI Vergabemanager“: LV veröffentlichen, Angebote nach der Submission automatisch zurückübertragen [33].

**Offenheit:**
- Unterstützte Formate: IFC, GAEB (BVBS-zertifiziert), DATANORM, ÖNORM, REB, BCF. Zertifizierung durch BIMSWARM [30].
- ERP-Anbindungen: CS.BAU (Schleupen), SAP-Lösung mit BadenIT und eine XML-basierte ERP-Schnittstelle [31].

**GAEB-Zertifikate** [77]:
- California.pro V13/V14: DA XML 3.2 und 3.3.
- CaliforniaX V23–V25: 3.3.
- Jeweils in den Bereichen AVA, Bauausführung und Mengenermittlung.

**Typische Kunden** [35][31]:
- Architektur- und Ingenieurbüros, Projektsteuerer;
- über 500 Kommunen;
- Stadtwerke und Versorger (laut G&W Marktführer im Bereich Energie und Wasser);
- Wohnungswirtschaft, Kirchen, Banken.

**Stärken und Schwächen:**
- **Laut Hersteller:** leicht erlernbar; mehr als 80 % der Neukunden kommen über Empfehlungen [31][32]. Unabhängige Bewertungen fehlen, OMR zeigt 0 Reviews [84].
- *Einschätzung, Stärken:* Das transparenteste und flexibelste Lizenzmodell der etablierten Anbieter: öffentliche Preise, Floating-Lizenzen, Kauf weiter möglich.
- *Einschätzung, Schwächen:*
  - Die Matrix aus 20+ Modulkürzeln und Projektgrenzen ist für Laien schwer zu durchschauen.
  - Der SQL-Server muss selbst administriert werden.
  - Die „Cloud“ ist ein gehosteter Windows-Desktop, kein Web-AVA [27].

### 3. NEVARIS Build (NEVARIS Bausoftware GmbH, Nemetschek Group)

**Unternehmen** [41][44][43]:
- Hervorgegangen aus Nemetschek Bausoftware, 2015 umbenannt.
- Die österreichische AUER Success läuft heute als „Success X“ weiter.
- 2018 wurde die Baustellen-App 123erfasst übernommen.

**Produkte:**
- NEVARIS Build mit den Bausteinen Abrechnung, Kalkulation, Planen, BIM, Steuerung, Nachträge/Rechnungen und KI-gestützte Kalkulation [39].
- NEVARIS Finance (ERP) [39].
- Für Planer wirbt NEVARIS außerdem mit Design2Cost (BIM-basierte Kostenermittlung) und Bluebeam [39].

*Einschätzung:* Das Marketing richtet sich überwiegend an Bauunternehmen. Planer sind eine Nebenzielgruppe.

**Pakete für Planer** (Preise eines Vertriebspartners, netto pro Monat und Nutzer, undatiert mit © 2026; Modul-Dokumentation zu V2025.1) [50]:

| Paket | Inhalt | Preis |
|---|---|---|
| Planen Standard | Kostenelemente, Ausschreibung, LV-Import/-Export, Vergabe, Normdatenaustausch | 35 € |
| Planen Pro | zusätzlich Kostenermittlung und Mengenermittlung | 65 € |
| Rechnungen & Nachträge Standard | Abrechnungsprüfung | 35 € |
| Steuerung Standard | Projektkonto | 30 € |
| Steuerung Pro | Projektkonto, Terminplan | 45 € |
| Design2Cost Standard / Pro | – | 290 / 425 € |

- Auf der Herstellerseite stehen keine Preise.
- NEVARIS spricht von „Subscription-Modell“ und vordefinierten Paketen mit automatischen Updates. Lizenzzahl und Pakete lassen sich laut Hersteller anpassen [39][51].

**Lizenztechnik** [47][48]:
- Die Abo-Benutzer werden über id.nevaris.com verwaltet. Die Lizenzen kommen aus einem „Subscription-Pool“, das alte Lizenzsystem hieß „Liabil“ [48].
- Abo-Lizenzen laufen bis zu 7 Tage offline, gekaufte Lizenzen bis zu 365 Tage. Kauflizenzen existieren also noch, mindestens im Bestand [47].

**Betrieb (Version 2026.1)** [47]:
- Client nur Windows 11 (64 Bit); Server Windows Server 2025 oder 2022.
- Datenbank MS SQL Server 2025, 2022 oder Express; Client-Server-Architektur auf .NET 10.
- Für das BIM-Modul müssen Client und SQL-Server im selben LAN stehen, WAN und VPN funktionieren nicht.
- Mac, Citrix und Cloud werden nicht genannt [47]. Ein Wettbewerber nennt Parallels als Mac-Weg [52].

**Funktionen** [53][40][45][44]:
- LV per Drag & Drop aus Vorlagen; Anbindung an Text- und Preisbibliotheken bekannter Anbieter.
- Zertifizierter GAEB- und ÖNORM-Austausch.
- Mengen mit REB-Formeln und HVA-B-StB-Ausdrucken.
- Bieterangebote per Excel oder GAEB importieren; „interaktiver Online-Preisspiegel“; Versand über Outlook.
- Preisvergleichsbericht (2025.1).
- Kostenloser BIM-Viewer ab 2025.1; Kosten direkt aus dem BIM-Modell ab 2026.1.
- XRechnung für Regierechnungen.
- Angebotsunterlagen für Vergaben in Baden-Württemberg (2026.1).

**GAEB-Zertifikate:** NEVARIS 2023–2026 in den Bereichen AVA, Bauausführung und Mengenermittlung, jeweils DA XML 3.3 [77].

**Studierende:** kostenlos für 12 Monate, verlängerbar [49].

**Stärken und Schwächen:**
- **Kundenumfrage 2025 laut NEVARIS** [46]: 72 % haben NEVARIS oder 123erfasst weiterempfohlen bzw. würden es tun. Kritik gab es an der Kommunikation und Qualitätssicherung von Updates.
- **Laut dem Wettbewerber phase0** [52]: höherer IT-Aufwand und Bindung an die Plattform.
- *Einschätzung:* Für die Planer-Pakete ist das Preis-Leistungs-Verhältnis konkurrenzfähig. Die Architektur ist aber eine klassische Windows-Client-Server-Lösung, und die Lizenz hängt an einem Online-Konto.

### 4. RIB iTWO (RIB Software GmbH, Schneider Electric)

**Pakete für „Architektur & Public“** [54]:
- Basispakete: „RIB iTWO Planer Enterprise Edition“, „AVA“ und „Kostenplanung und Kostensteuerung“, dazu Varianten für ÖNORM und Schweizer Norm (NPK/CRB).
- Zusatzpakete: iTWO 5D (modellbasiert), Nachhaltigkeit und Rahmen-/Zeitverträge.
- Für Bauunternehmen gibt es eigene Pakete, darunter „iTWO für KMU“ [54].

**Funktionen** [55]:
- Kostenplanung nach DIN 276, AKVS und RBBau, auch parametrisiert.
- LV aus Plan, Objektbuch oder BIM-Modell; Mengenermittlung nach REB 23.003 mit 2D-Planmessung.
- Preisspiegel, Abrechnung, Nachträge, Prüfrechnung.
- Hochrechnung und Prognose über alle Leistungsphasen.
- SAP-Integration.

**Neuere Entwicklungen:**
- **iTWO 2025** (01/2025) bildet Nachhaltigkeitswerte im Vergabeprozess ab. Beispiel: ein CO₂-Schattenpreis im Wertungspreis des Preisspiegels, Daten aus ÖKOBAUDAT [57].
- **RIB TenderConnect** (2026) veröffentlicht Vergabeeinheiten direkt in ein Netzwerk mit laut RIB über 170.000 Nachunternehmern. Die Angebote fließen in den Preisspiegel zurück [58].
- Mit **RIB eVergabe** besitzt RIB eine eigene E-Vergabe-Plattform [55].

**Betrieb:**
- Klassische Installation, oder „RIB Hosting / PlanerCloud“ [59][60]:
  - schlüsselfertige Cloud, Zugriff über den Browser, Rechenzentrum in Berlin, 99,5 % Verfügbarkeit;
  - feste Kosten pro Nutzer und Monat;
  - Online-Textdienste wie STLB-Bau Online, DBD-BIM, sirAdos und Heinze zubuchbar.
- Die Plattform RIB 4.0 läuft in Microsoft Azure [64].

**Preise:**
- Öffentlich nur für Studierende: 99 € inkl. MwSt. für 12 Monate, Verlängerung 49 €; CodeMeter-Stick für eine übertragbare Lizenz 99 € [61].
- Alles andere gibt es nur auf Anfrage [54].

**GAEB-Zertifikate** [77][56]:
- iTWO 2022: DA XML 3.3 in den Bereichen AVA, Bauausführung und Mengenermittlung.
- RIB 4.0 26.1: Bereich AVA seit 06/2026. Zuvor war RIB 4.0 nur für die Bauausführung zertifiziert.

**Typische Kunden** [55][62][63]:
- große Planungsbüros und Projektsteuerer;
- öffentliche und gewerbliche Bauherren sowie Sektorenauftraggeber;
- Bauunternehmen.

**Stärken und Schwächen** (aus Anwenderberichten, die RIB selbst veröffentlicht):
- Ein Planungsbüro mit 16 Mitarbeitenden beschreibt iTWO 5D und RIB Site als komplexer als andere Produkte und vor allem für große Büros konzipiert. Man könne sich aber passende Bausteine herausgreifen [62].
- Ein großes Büro beschreibt das Programm als komplex und detailreich, nach der Einarbeitung aber sehr leistungsfähig [63].
- *Einschätzung:* RIB bietet die mächtigste Integration (BIM 5D, ERP, E-Vergabe, Nachhaltigkeit). Lernkurve und Preisintransparenz sind für ein kleines Architekturbüro aber eher abschreckend.

### 5. SIDOUN Globe, Globe4all und KIAVA (SIDOUN International GmbH)

**Produkte** [65][67][68]:
- **Globe:** klassisches AVA-Programm mit Baukalkulation.
- **Globe4all:** dauerhaft kostenlose Vollversion.
- **KIAVA:** seit 03/2026, laut Hersteller „die erste AVA-Software mit integrierter KI“ [68].
- Die Altgeneration hieß WIN-AVA. Sie kostete laut einem Forenbeitrag von 2002 etwa 9.000 DM [82].

**Merkmale von Globe** [65]:
- Excel und Word sind direkt eingebunden. Laut Hersteller war Globe die erste AVA-Software mit vollständiger Excel-Integration.
- Datenassistent „DAss“, „X-Bieter“ für den Angebotsvergleich, Team-Modus für paralleles Arbeiten im selben Projekt.

**Globe4all** [66][67]:
- Bis zu 3 gleichzeitige Lizenzen, zeitlich unbegrenzt nutzbar.
- Voraussetzungen: Windows (ab 7) und Vollversionen von MS Word und Excel (ab 2007).
- Mac nur über Parallels oder Boot Camp.
- Die Anmeldung läuft über eine „Projektraum“-Nummer. Die Datensicherung erfolgt nachts zwischen 0 und 3 Uhr, was auf eine zentral gehostete Datenhaltung hindeutet.
- Altdaten lassen sich per Excel oder GAEB übernehmen.
- Begründung des Herstellers für das Gratisangebot: Bekanntheit und Marktanteil steigern.

Details zu KIAVA und Globe4all: [Cloud-, Nischen- und neue Anbieter](/okf/research/market/cloud-and-niche-vendors.md).

**Lizenz:**
- Laut AGB Kauf mit Vorauskasse. Für Updates gibt es einen separaten Servicevertrag. Für den Netzwerkbetrieb braucht man Mehrfachlizenzen. Weiterverkauf der Lizenz ist mit Meldung an SIDOUN erlaubt [71].
- Preise für Globe und KIAVA sind nicht öffentlich.

**GAEB:**
- SIDOUN wirbt mit GAEB-zertifiziertem Datenaustausch [68].
- In der BVBS-Liste vom 09.11.2026 ist SIDOUN nicht aufgeführt [77]. Ob ein Zertifikat abgelaufen ist oder von einer anderen Stelle stammt, ist offen.

**Eigener Marktvergleich (08/2026):**
- SIDOUN vergleicht KIAVA mit NOVA, ORCA, California und RIB [69]. Ergebnis aus SIDOUN-Sicht:
  - NOVA: im Browser, BIM als Add-on;
  - ORCA: lokal, mit Editionen;
  - California: modular, lokal oder Cloud;
  - RIB: Installation oder Hosting.
- *Einschätzung:* Das ist eine Herstellerdarstellung und deshalb nicht neutral.

### 6. Weitere etablierte Planer-Produkte (Kurzprofile)

| Produkt | Kurzprofil | Preis / Lizenz (netto) |
|---|---|---|
| **AVANTI** (BAUER SOFTTECH, Orca Group) | AVA für alle Leistungsphasen der HOAI. Grafisches Aufmaß GRAVA aus PDF, DWG oder Scans ist integriert. Version 2026 mit XRechnung/ZUGFeRD-Export und Mängel- bzw. Einbehaltsverwaltung [72]. Läuft unter Windows. Einzelplatz per Dongle, Netzlizenz ab 5 Plätzen. Kostenlos für Studierende und Bildungseinrichtungen [73]. GAEB-zertifiziert (2022/2023/2025) [77] | **Miete** 125 / 175 / 250 €/Monat (AVANTI / pro / BIM), inkl. Updates und Support. **Kauf** 1.400 / 2.700 / 3.600 € für die Erstlizenz [72]. Bereits gezahlte Miete wird beim Kauf angerechnet. Wartung („Zirkel-Vertrag“) optional, Preis nicht genannt [73] |
| **AVA.relax** (COSOBA, Orca Group) | Editionen Business, Business-plus und Professional, für die Leistungsphasen 1–9 [75]. GAEB-zertifiziert (Version 8) [77] | Business ab 1.263 € [75] |
| **BUILDUP** (BauerSoftware, Orca Group) | Kombiniert AVA, Kostenmanagement, HOAI-Honorare, Büroorganisation und Bautagebuch. Cloud-Variante vorhanden [74]. GAEB-zertifiziert (V29) [77] | nicht öffentlich [74] |
| **AVAPLAN** (AVAPLAN Software GmbH, Berlin) | Editionen Base, Lite, Pro und ProPlus [76] | Base kostenlos. Kauf Lite 390 €, Pro 1.119 €, ProPlus 1.549 €. Abo als Jahreslizenz: Pro 499 €, ProPlus 679 €. Pflege 25 % des Listenpreises pro Jahr, das erste Jahr ist frei [76] |
| **Bechmann AVA / flex** (Bechmann GmbH) | GAEB-zertifiziert 2023–2026 [77]. Website beim Abruf nicht erreichbar | k. A. |
| **Historische Namen** | RIB ARRIBA (2013 noch in Foren empfohlen) [83], SIDOUN WIN-AVA [82], Archiwin [82] | – |

Details zu Nischen- und Cloud-Anbietern: [Cloud-, Nischen- und neue Anbieter](/okf/research/market/cloud-and-niche-vendors.md).

## Funktionsvergleich (Stand 11/2026, öffentliche Angaben)

Legende: ✓ vorhanden · (✓) eingeschränkt oder Zusatzmodul · – nicht vorhanden · k. A. keine öffentliche Angabe gefunden.

**A. Betrieb und Technik**

| Kriterium | ORCA AVA 27 | CaliforniaX V26 | NEVARIS Build 2026.1 | RIB iTWO | SIDOUN Globe/KIAVA | AVANTI 2026 | NOVA AVA |
|---|---|---|---|---|---|---|---|
| Betriebsform | Windows-Desktop: Einzelplatz, Netz, Terminalserver [7] | Windows + SQL Server; AVA4CLOUD als Hosting [29][27] | Windows-11-Client + SQL Server [47] | Installation; RIB Hosting (Browser); RIB 4.0 in Azure [59][64] | Windows + MS Office; lokal, Server oder Cloud [66][69] | Windows; GRAVA connect im Browser [73] | Browser-SaaS [79] |
| Mac | über Virtualisierung, RDP oder Fremd-Hosting [16] | über AVA4CLOUD [27] | nicht vorgesehen [47] | über Hosting [59] | Parallels oder Boot Camp [66] | k. A. | nativ im Browser [79] |
| Datenhaltung | `.ava`-Dateien, MS-Jet-artig [7] | MS SQL; Oracle in der EE [37] | MS SQL [47] | k. A. | zentral („Projektraum“, Globe4all) [66] | k. A. | Cloud [79] |
| Mehrplatz / Rechte | Netzwerk; Rechte nur in der EE [1][7] | Floating-Lizenzen, ZRE, LDAP [23] | Client-Server [47] | Rollenmanagement [54] | Team-Modus [65] | Netzlizenz ab 5 Plätzen [73] | Benutzer- und Rechteverwaltung [78] |
| KI-Funktionen | k. A. | k. A. | KI-Kalkulation (für Bauunternehmen) [39] | KI-Anwendungsfälle [58] | KIAVA-Assistenten [68] | KI in BUILDUP / GRAVA connect [14] | „NEO Baukosten-KI“ beworben [85] |

**B. Fachfunktionen Leistungsphasen 6–8**

| Kriterium | ORCA | CaliforniaX | NEVARIS | RIB iTWO | SIDOUN | AVANTI | NOVA |
|---|---|---|---|---|---|---|---|
| Kostenplanung DIN 276 | ✓ Assistent, Bauelemente [5] | ✓ KOS, DIN 276/AKVS [23] | ✓ Kostenermittlung (Planen Pro) [50] | ✓ DIN 276, AKVS, RBBau [55] | ✓ [69] | ✓ [72] | ✓ ab Starter [78] |
| LV und Textquellen | ✓ AUSSCHREIBEN.DE und Fremdkataloge [17][86] | ✓ STLB-Bau, BKI, DBD, SIRADOS, Heinze über Shop [24] | ✓ Bibliotheken bekannter Anbieter [39] | ✓ STLB-Bau, DBD, sirAdos, Heinze online [60] | ✓ SirAdos, STLB-Bau, Heinze [66] | ✓ [72] | ✓ SmartPool [78] |
| Angebotsprüfung, Preisspiegel | ✓ ab SE [5] | ✓ LVE [23] | ✓ inkl. Online-Preisspiegel [53] | ✓ [55] | ✓ X-Bieter [65] | ✓ [72] | ✓ ab Easy [78] |
| Bieterzugang ohne GAEB-Software | – (GAEB, PDF, Papier) [5] | (✓) Modul OFF [34] | k. A. | ✓ eVergabe, TenderConnect [55][58] | k. A. | k. A. | ✓ integriertes Online-Portal [79] |
| Anbindung E-Vergabe-Plattform | k. A. | (✓) EVC zum AI Vergabemanager [33] | k. A. | ✓ eigene RIB eVergabe [55] | k. A. | k. A. | (✓) GAEB-Vorbereitung [79] |
| Nachträge | ✓ ab SE (Aufträge und Nachträge) [5][87] | ✓ PRO [23] | ✓ Rechnungen & Nachträge [50] | ✓ [55] | k. A. | ✓ pro [72] | ✓ Business [80] |
| Aufmaß (REB, DA11, X31) | ✓ DA11/12, X31; grafisch per Add-on [4][6] | ✓ REB 23.003, DA11, X31; mobil [23] | ✓ REB-Formeln [40] | ✓ REB 23.003, 2D-Messung [55] | k. A. | ✓ GRAVA grafisch [72] | ✓ REB 23.003, DA11/X31, App [80] |
| Rechnungsprüfung, Zahlungsfreigabe | ✓ ab PE [5] | ✓ PRO [23] | ✓ Abrechnungsprüfung [50] | ✓ Prüfrechnung [55] | ✓ Abrechnung [68] | ✓ [72] | ✓ Business [80] |
| E-Rechnung (XRechnung) | ✓ Import (Version 27) [6] | ✓ Modul ERE [23][29] | (✓) Regie-XRechnung [45] | k. A. | k. A. | ✓ Export (2026) [72] | k. A. |
| Kostenkontrolle, Prognose | ✓ Kostenstand, fixierte Stände [5] | ✓ PRO, BUD, KTR [23] | ✓ Steuerung [50] | ✓ Hochrechnung [55] | ✓ [69] | ✓ [72] | ✓ Soll-Ist [78] |

**C. Austausch und Offenheit**

| Kriterium | ORCA | CaliforniaX | NEVARIS | RIB iTWO | SIDOUN | AVANTI | NOVA |
|---|---|---|---|---|---|---|---|
| BIM / IFC | ✓ Basic ab PE, Advanced in EE [4] | ✓ BIM2AVA, BCF [23] | ✓ BIM-Modul, Viewer gratis [45] | ✓ iTWO 5D [54] | ✓ laut Hersteller [68] | ✓ AVANTI BIM [72] | (✓) Add-on [78] |
| BIM-LV-Container | ✓ EE; FAQ nennt DIN SPEC 91350 [1][7] | ✓ V26, DIN 18290 [29] | k. A. | k. A. | k. A. | k. A. | (✓) BIM-Add-on; Herstellerseite nennt DIN SPEC 91350 [NOVA Produkt](/okf/research/nova-ava/product-and-pricing.md) |
| GAEB-Zertifikat (BVBS-Liste „aktuell zertifiziert“, ohne Gültigkeitsdaten) | AVA 23–25 [77] | California.pro V13/14, CaliforniaX V23–25; AVA, Bauausführung, Mengen [77] | 2023–2026; AVA, Bauausführung, Mengen [77] | iTWO 2022 (alle Bereiche); RIB 4.0 26.1 (AVA) [77] | nicht gelistet [77] | 2022, 2023, 2025 [77] | NOVA AVA 4; AVA, Bauausführung; Urkunden für 3.3 nur bis 10.10.2026 gültig, Erneuerung nicht belegt [77][88] |
| ÖNORM | ✓ [5] | (✓) Add-on ÖNO [23] | ✓ zertifiziert [53] | ✓ Paket [54] | k. A. | k. A. | ✓ [79] |
| API / Integration | keine öffentliche AVA-API gefunden; Export nach Excel, Word, GAEB [5] | ERP-Schnittstellen, APIs nur in der EE [23][31] | BMD-Warenwirtschaft (2026.1) [44] | SAP, eVergabe, Datawarehouse [55][57] | Excel/Word live verbunden [65] | Revit / ArchiCAD [73] | öffentliche REST-API [85] |

## Preis- und Lizenzmodelle im Vergleich

| Produkt | Lizenzformen | Öffentliche Listenpreise (netto) | Pflege bei Kauf | Laufzeit / Kündigung | Mehrplatz | Sonderangebote | Jüngste Änderungen |
|---|---|---|---|---|---|---|---|
| **ORCA AVA** | Abo, Kauf [1][8] | Abo SE 828 / PE 1.788 / EE 2.388 €/Jahr (Abruf 09.11.2026) [1]. Kauf laut SoftGuide (03/2025) ab 1.798 / 4.278 / 6.138 € [19] | ab dem 2. Jahr 348 / 828 / 1.188 €/Jahr [3] | Abo 12 Monate, verlängert um 12, Kündigung 1 Monat vorher; Preiserhöhung jährlich möglich [8] | jede weitere Abo-Lizenz etwa 15 % (SE) bzw. 20 % (PE, EE) günstiger [1] | Studierende gratis; Kammer-Rahmenverträge [9][10] | Abo-Modell eingeführt (Seite seit spätestens 06/2025 im Sitemap-Verzeichnis); Preisseite seit 2026 nur mit Abo-Preisen [2][20]; Lizenz-Server seit Version 26 [18] |
| **CaliforniaX** | Kauf, Abo (12 oder 3 Monate), SaaS [22] | BAUKOSTEN BE: Kauf 3.110 €, Abo 1.296 €/Jahr, Kurz-Abo 420 € (10/2026) [23] | 1,5 %/Monat des Listenpreises (18 % p. a.), mindestens 35 €/Monat [23] | Pflegevertrag mindestens 24 Monate, Kündigung 3 Monate vor Halbjahresende [26] | Floating-Lizenzen; Mengenstaffel bis −60 % [23][24] | Studierende gratis [36] | Wechsel zwischen den Modellen ausdrücklich möglich; eigene Kauflizenz in die Cloud mitnehmbar [22][27] |
| **NEVARIS Build** | Subscription (Neugeschäft); Kauf nur noch im Bestand erkennbar [39][47] | Händler: Planen Standard 35 / Pro 65, Rechnungen & Nachträge 35, Steuerung 30–45 €/Monat/Nutzer [50] | k. A. | k. A. | pro Nutzer (Lizenzpool) [48] | Studierende gratis [49] | Umzug vom Lizenzsystem „Liabil“ in den Subscription-Pool [48] |
| **RIB iTWO** | Angebot; Hosting mit festen Monatskosten pro Nutzer [54][60] | nur Studierende: 99 € bzw. 49 € pro Jahr [61] | k. A. | k. A. | k. A. | Lizenzen im Rahmen betreuter Seminare kostenlos [61] | Plattform RIB 4.0 in der Cloud [64] |
| **SIDOUN** | Kauf + Servicevertrag [71]; Globe4all gratis [66] | nicht öffentlich | k. A. | k. A. | Mehrfachlizenzen; Globe4all bis 3 gleichzeitig [71][66] | Globe4all gratis | KIAVA 03/2026 [68] |
| **AVANTI** | Miete, Kauf, Finanzierungskauf [73] | Miete 125–250 €/Monat; Kauf 1.400–3.600 € [72] | Zirkel-Vertrag, Preis k. A. [73] | k. A. | Folgelizenzen günstiger; Netz ab 5 Plätzen [73] | Studierende und Bildung gratis [73] | Miete wird beim Kauf angerechnet [73] |
| **NOVA AVA** | nur SaaS-Abo [78] | Starter 49 / Easy 89 / Business 129 €/Monat; jährlich 529 / 961 / 1.393 € [78] | – | Rabatt 5 % (3 Monate), 7,5 % (6 Monate), 10 % (12 Monate); Daten 12 Monate nach Abo-Ende gespeichert [78] | pro Lizenz [78] | – | Easy und Business seit 01.05.2026 zu neuen Preisen [78]; Details: [NOVA-Preisnotiz](/okf/research/nova-ava/product-and-pricing.md) |

**Was kostet ein Arbeitsplatz über fünf Jahre?**

*Einschätzung, Rechenbeispiel.* Annahmen:
- ein Arbeitsplatz mit vollem Umfang der Leistungsphasen 6–8 (Kostenplanung, LV, Preisspiegel, Vergabe, Nachträge, Aufmaß, Rechnungsprüfung), ohne BIM;
- Listenpreise netto, keine Rabatte oder Preiserhöhungen;
- Textlizenzen wie STLB-Bau und Schulungen nicht eingerechnet;
- Pflege bei Kauf ab Monat 1, außer der Hersteller nennt das erste Jahr als enthalten (ORCA, AVAPLAN).

| Produkt / Variante | Jahr 1 | danach pro Jahr | Summe 5 Jahre |
|---|---|---|---|
| ORCA PE, Abo [1] | 1.788 € | 1.788 € | 8.940 € |
| ORCA PE, Kauf (Preis 03/2025, Sekundärquelle) [19][3] | 4.278 € | 828 € | 7.590 € |
| CaliforniaX BAUKOSTEN BE, Kauf + Pflege [23] | 3.670 € | 560 € | 5.909 € |
| CaliforniaX BAUKOSTEN BE, Abo [23] | 1.296 € | 1.296 € | 6.480 € |
| CaliforniaX BAUKOSTEN SBE 10 (max. 10 aktive Bauvorhaben), Abo [23] | 912 € | 912 € | 4.560 € |
| NEVARIS Planen Pro + Rechnungen & Nachträge (+ Steuerung Standard) [50] | 1.200 € (1.560 €) | 1.200 € (1.560 €) | 6.000 € (7.800 €) |
| AVANTI pro, Miete [72] | 2.100 € | 2.100 € | 10.500 € |
| AVANTI pro, Kauf [72] | 2.700 € + Wartung | Wartung k. A. | ≥ 2.700 € |
| NOVA Business, Jahresabo [78] | 1.393 € | 1.393 € | 6.965 € |
| AVAPLAN ProPlus, Kauf + 25 % Pflege ab Jahr 2 [76] | 1.549 € | 387 € | 3.098 € |
| SIDOUN Globe4all (bis 3 gleichzeitige Nutzer) [66] | 0 € | 0 € | 0 € (MS-Office-Vollversion nötig) |
| RIB iTWO, SIDOUN Globe/KIAVA | k. A. | k. A. | k. A. |

*Einschätzung:*
- Über fünf Jahre ist der Kauf bei ORCA und G&W nur wenig günstiger als das Abo. Der eigentliche Unterschied: Nach Ende der Pflege darf man die Software weiter nutzen. Beim Abo endet das Nutzungsrecht, laut ORCA-AGB ist Weiternutzung dann eine Lizenzverletzung [8].
- NOVA Business liegt im Mittelfeld.
- G&W ist bei Nutzung mit Projektgrenze (SBE) und AVAPLAN im Kauf deutlich günstiger.

## Lizenzmodell-Trends 2024–2026

1. **Vom Kauf zum Abo**
   - ORCA führt ein Abo ein und stellt die Preisseite darauf um [1][2][20].
   - NEVARIS verkauft Build in Paketen als Subscription [39].
   - RIB bietet Hosting mit Fixkosten pro Nutzer [60].
   - Die Gegenbewegung gibt es auch: G&W und SOFTTECH werben ausdrücklich damit, dass Kauf weiter möglich ist [22][73].
2. **Lizenzserver und Online-Konten statt Dongles**
   - ORCA ab Version 26 über SLASCONE [18].
   - NEVARIS über id.nevaris.com, Abo-Lizenzen nur 7 Tage offline nutzbar [47][48].
   - AVANTI und RIB arbeiten weiter mit Dongle bzw. CodeMeter-Stick [73][61].
3. **Funktionen werden über Editionen gesteuert**
   - Etwa Vergabe erst ab ORCA PE [1], Projektgrenzen bei G&W SBE [25] oder BIM als Add-on [78].
   - *Einschätzung:* Der Grundpreis wirkt dadurch niedrig, aber der volle Umfang für LPH 6–8 kostet deutlich mehr.
4. **Gratis-Einstiege als Akquise**
   - Globe4all [67], AVAPLAN Base [76] und Studierendenlizenzen [9][36][49].
5. **Cloud bedeutet bei den Etablierten meist „Hosting des Windows-Programms“**
   - AVA4CLOUD [27] und RIB Hosting [60]. Echte Web-AVA-Programme kommen von Neueinsteigern; siehe [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md).

## Dokumentierte Stärken, Schwächen und Lernkurve (Synthese)

| Produkt | Stärken (Quelle) | Schwächen (Quelle) | Lernkurve |
|---|---|---|---|
| ORCA AVA | Deutsche Normen, zertifiziertes GAEB, AUSSCHREIBEN.DE, öffentliche Abo-Preise [20][17][1] | Nur Windows, kein Web-AVA, volles BIM nur in EE, kein Baustellenmanagement [20][16] | Zweitägiges Grundlagenseminar, Online-Helpdesk statt Handbuch [21][7] |
| CaliforniaX | Flexibles Lizenzmodell (Kauf, Abo, SaaS, Floating), modular, starke Kostenplanung, E-Vergabe- und Bieter-Module [22][23][33][34] | Viele Module, SQL-Server nötig, Cloud nur als Hosting (*Einschätzung*) [28][27] | Laut G&W leicht erlernbar; Seminare über die AVA-Akademie [32][26] |
| NEVARIS Build | Breites Bau-Ökosystem, BIM, Weiterempfehlungsquote 72 % [46][45] | Update-Kommunikation [46]; Windows 11 und SQL; BIM nur im LAN [47]; IT-Aufwand laut Wettbewerber [52] | Academy und Schulungen [39] |
| RIB iTWO | Größte Integrationstiefe (BIM 5D, SAP, E-Vergabe, Nachhaltigkeit) [55][57] | Komplex, für große Büros gedacht; Preise nur auf Anfrage [62][63][54] | Hoch („reingefuchst“ nötig) [63] |
| SIDOUN | Excel- und Word-Integration, Team-Modus, Gratisversion, KI [65][66][68] | MS-Office-Vollversion nötig, Preise intransparent, nicht in BVBS-Liste [66][77] | Vertraute Office-Werkzeuge (Herstellerargument) [65] |
| AVANTI | Integriertes grafisches Aufmaß, E-Rechnung, Kauf oder Miete [72] | Miete teuer im Verhältnis zum Kauf (*Einschätzung*); Windows und Dongle [73] | Laut Hersteller leicht zu bedienen und schnell zu erlernen [72] |

Ältere Forenstimmen [82][83]:
- Sie bestätigen nur, dass ORCA, SIDOUN (WIN-AVA, „eher teurer“) und RIB ARRIBA seit Jahrzehnten etabliert sind.
- Der Tenor von 2013: Funktional liegen alle Programme auf hohem Niveau, man solle selbst testen [83].
- Aktuelle, unabhängige Erfahrungsberichte fehlen; siehe Offene Fragen und [Schmerzpunkte-Notiz](/okf/research/market/pain-points.md).

## Relevanz für unser Projekt

**Muss-Anforderungen** (aus dem Funktionsstandard der Etablierten abgeleitet):
1. **LV-Editor mit Hierarchie und Ordnungszahlen:** Langtexte, Mengen, Einheiten, Alternativ- und Eventualpositionen; Bibliotheken und Kopieren aus Altprojekten [5][79].
2. **GAEB DA XML 3.3 vollständig:**
   - X81–X86 (LV, Angebotsaufforderung, Angebot, Nebenangebot, Auftrag) und X31 (Mengen);
   - zusätzlich DA11 und REB-23.003-Formeln.

   Alle Wettbewerber sind dafür BVBS-zertifiziert. Ohne GAEB ist ein Wechsel praktisch unmöglich [77][23][4]. Siehe [GAEB-Notiz](/okf/research/standards/gaeb-da-xml.md).
3. **Kostenplanung nach DIN 276** mit mehreren Gliederungen, eingefrorenen Kostenständen und Prognose [4][5].
4. **Preisspiegel** mit Prüfmarkierungen und Varianten; Vergabevorschlag; Auftrags-LV [5][79].
5. **Leistungsphase 8:** Nachträge mit Status, Aufmaßprüfung, die Rechnungsarten Teil-, Schluss-, Regie- und Nachtragsrechnung, Zahlungsfreigabe, Soll-Ist-Vergleich [5][80].
6. **E-Rechnung:** XRechnung/ZUGFeRD einlesen und gegen das Auftrags-LV prüfen. Das ist 2025/26 Standard geworden [6][29][72].
7. **Mehrbenutzerbetrieb mit Rechten** sowie Ausdruck und PDF in prüffähigen Layouts.

**Chancen zur Differenzierung** (*Einschätzung*):
- **Offenes, dokumentiertes Datenformat und API.** Keiner der etablierten Desktop-Anbieter bietet das öffentlich [5][85]. Dazu gehören Importer für GAEB-Altbestände, als Migrationspfad aus ORCA und California.
- **Echt browserbasiert und Mac-tauglich, aber selbst hostbar.** Die Etablierten liefern nur Windows oder gehostete Desktops [16][27][47]. NOVA ist browserbasiert, aber nur als SaaS zu haben [78].
- **Keine künstlichen Sperren:** keine Projektgrenzen und keine Editionen, die Vergabe oder Rechte abschalten [1][25].
- **Bieterzugang ohne Software** wie NOVA, CaliforniaX OFF oder RIB TenderConnect, aber offen und selbst hostbar [79][34][58].
- **Kosten nur für Hosting und Support** statt Lizenz pro Nutzer. Das ist ein Gegenmodell zum Abo-Trend und zur Konsolidierung durch die Orca Group.

**Risiken:**
- **Kostenlose Konkurrenz:** Globe4all und AVAPLAN Base sind schon kostenlos [66][76]. Ein Open-Source-Projekt muss mehr bieten als „gratis“.
- **GAEB-Zertifizierung durch den BVBS:** kostenpflichtig (Preisliste beim BVBS, Stand 09/2021; nicht verifiziert), versionsgebunden und 5 Jahre gültig [77]. Für öffentliche Auftraggeber ist sie faktisch ein Vertrauenssignal.
- **Textquellen:** STLB-Bau, DBD, sirAdos und Heinze sind lizenzpflichtige Fremdinhalte. Sie lassen sich nur über deren Schnittstellen einbinden [60][24]. Siehe [Textquellen-Notiz](/okf/research/standards/stlb-bau-tender-texts.md) und [Rechtsfragen](/okf/research/open-source/building-blocks-and-licensing.md).
- **E-Vergabe bei öffentlichen Auftraggebern:** Die Anbindung an Vergabeplattformen ist herstellerspezifisch, z. B. G&W zum AI Vergabemanager [33]. Siehe [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md).
- **Migration:** Die proprietären Formate (ORCA `.ava`, California SQL) sind vermutlich nicht offen dokumentiert. GAEB bleibt der realistische Weg für den Datenwechsel [7][28].

**Aufwandsschätzung** (*Einschätzung, grob*), um mit ORCA PE gleichzuziehen, ohne BIM:

| Baustein | Personenmonate |
|---|---|
| Kern: LV-Editor, GAEB X81/X83/X84/X86, DIN-276-Kostenplanung, Preisspiegel | 8–12 |
| Leistungsphase 8: Nachträge, Aufmaß (REB, X31), Rechnungsprüfung, Kostenstand und Prognose, XRechnung | 8–12 |
| Druck- und Berichtslayouts, Rechte, Zertifizierungsreife für GAEB | 4–6 |
| Bieterportal | 3–5 |
| **Summe** | **etwa 23–35** |

**Abgleich (09.11.2026):** Andere Notizen schätzen ähnliche Umfänge deutlich niedriger: die vollständige LPH 6–8 mit 9–32 PM, LPH 8 allein mit 4–12,5 PM. Die Summe hier ist die höchste, weil sie Bieterportal, Layouts, Rechte und Zertifizierungsreife einrechnet und Gleichstand mit ORCA PE anstrebt. Das erklärt die Spanne aber nur teilweise (widersprüchlich - siehe Offene Fragen). Gegenüberstellung aller Schätzungen: [Schmerzpunkte, Aufwandsschätzung](/okf/research/market/pain-points.md).

## Offene Fragen

**Zu den Anbietern:**
- **Aktuelle Kaufpreise von ORCA:** Die Herstellerseite nennt sie nicht mehr. Die SoftGuide-Angaben stammen von 03/2025 [19]. Seit wann gibt es das Abo genau? Vermutlich 2025, nur über das Sitemap-Datum belegt [2].
- **NEVARIS:** offizielle Preise und Mindestlaufzeiten. Werden Kauflizenzen noch an Neukunden verkauft? Die Händlerpreise sind undatiert [50].
- **RIB iTWO:** jegliche Preise für die Planer-Pakete und das Hosting [54][60]. Ist ARRIBA eingestellt?
- **SIDOUN:** Preise für Globe und KIAVA; Funktionsgrenzen von Globe4all gegenüber Globe; Stand der GAEB-Zertifizierung [77].
- **G&W:** SaaS-Preise [23]. Ist die Pflege im ersten Kaufjahr enthalten? Wie viele Mitarbeitende hat G&W?
- **Marktanteile:** Es wurden keine belastbaren Daten gefunden. ORCA nennt sich selbst „führend“ [6].
- **Unabhängige Nutzerbewertungen:** Capterra, GetApp und TrustRadius waren für den automatisierten Abruf gesperrt (HTTP 403). OMR hat für CaliforniaX keine Bewertungen [84]. Ein manueller Blick lohnt sich.
- **BVBS-Zertifizierungskosten:** Höhe und Aktualität der BVBS-Preisliste (zuletzt Stand 09/2021 gesehen) sind nicht verifiziert [77].
- **Orca Group:** Wird sie die vier AVA-Produkte (ORCA, AVANTI, AVA.relax, BUILDUP) mittelfristig zusammenführen oder abkündigen [13][15]?
- **Gültigkeit der BVBS-Zertifikate:** Die Liste nennt keine Ausstellungs- oder Ablaufdaten. Mindestens NOVA AVA 4 steht noch darauf, obwohl die 3.3-Urkunden am 10.10.2026 ausliefen [77][88]. Für ältere Einträge wie California.pro V13/V14 oder iTWO 2022 wurde die Gültigkeit nicht geprüft.
- **BIM-LV-Container:** Schreiben ORCA (FAQ: DIN SPEC 91350) und NOVA (Herstellerseite: DIN SPEC 91350) bereits die Fassung nach DIN 18290-2:2023-11, die G&W nennt [7][29][89]? Das ist für Interoperabilitätstests wichtig.
- **Aufwandsschätzungen abgleichen:** Die Notizen nennen für gleiche Umfänge Werte, die um den Faktor 2–3 auseinanderliegen (Gegenüberstellung in [Schmerzpunkte](/okf/research/market/pain-points.md)). Offen ist eine gemeinsame Bottom-up-Schätzung mit einheitlichem Umfang, einheitlicher Einheit (1 PM ≈ 4 PW ≈ 20 PT) und klaren Annahmen.

**Fragen an den Architekten-Freund:**
1. Welche Leistungsphasen bearbeitet er selbst? Nur LPH 6–7, oder auch 8 mit Aufmaß und Rechnungsprüfung?
2. Wie viele Personen arbeiten gleichzeitig mit dem AVA-Programm? Nutzt er Mac oder Windows?
3. Was genau drückt am NOVA-Preis? Die Höhe pro Monat, die Kosten pro Nutzer, Add-ons wie BIM für 40 €/Monat [78], der Abo-Zwang oder Preissteigerungen?
4. Welche Vergabeplattformen und Formate verlangen seine öffentlichen Auftraggeber? Nutzt er das NOVA-Bieterportal bei privaten Bauherren?
5. Welche Textquellen nutzt er (STLB-Bau, Herstellertexte, eigene Bibliothek)? Welche Ausgaben braucht er für Kammer oder Bauherren (DIN-276-Berichte, Preisspiegel-Layouts)?
6. Hat er früher ORCA, California oder ein anderes Programm genutzt? Was war dort besser oder schlechter als in NOVA?

## Quellen

[1] ORCA AVA Preise (Abo-Preise, Editionen) – ORCA Software GmbH – https://www.orca-ava.de/preise/ – Herstellerangabe – abgerufen 2026-11-09
[2] ORCA AVA Abo-Modell – ORCA Software GmbH – https://www.orca-ava.de/orca-ava-abo-modell/ – Herstellerangabe – abgerufen 2026-11-09
[3] ORCA AVA Servicevertrag (Preisliste, Laufzeit) – ORCA Software GmbH – https://www.orca-ava.de/servicevertrag/ – Herstellerangabe – abgerufen 2026-11-09
[4] ORCA AVA Editionsupgrade (Upgradepreise, Funktionen PE/EE) – ORCA Software GmbH – https://www.orca-ava.de/editionsupgrade/ – Herstellerangabe – abgerufen 2026-11-09
[5] ORCA AVA Vergleich aller Editionen / Professional Edition (Funktionsumfang) – ORCA Software GmbH – https://www.orca-ava.de/vergleich-aller-editionen/ – Herstellerangabe – abgerufen 2026-11-09
[6] ORCA AVA 27 (Neuerungen, FAQ) – ORCA Software GmbH – https://www.orca-ava.de/orca-ava-27/ – Herstellerangabe – abgerufen 2026-11-09
[7] AVA FAQ (Begriffe, GAEB-Phasen, Systemvoraussetzungen ORCA AVA 27) – ORCA Software GmbH – https://www.orca-ava.de/faq/ – Herstellerangabe – abgerufen 2026-11-09
[8] AGB: Kauf, Abo-Modell, Servicevertrag – ORCA Software GmbH – https://www.orca-ava.de/agb/ – Primärquelle (Vertragsbedingungen) – abgerufen 2026-11-09
[9] Studentenlizenz und Bildungspaket – ORCA Software GmbH – https://www.orca-ava.de/studentenlizenz/ – Herstellerangabe – abgerufen 2026-11-09
[10] ORCA AVA für Mitglieder der Architektenkammern – ORCA Software GmbH – https://www.orca-ava.de/orca-ava-fuer-mitglieder-der-architektenkammern/ – Herstellerangabe – abgerufen 2026-11-09
[11] Impressum ORCA AVA – ORCA Software GmbH – https://www.orca-ava.de/impressum/ – Primärquelle – abgerufen 2026-11-09
[12] Pressemitteilung „ORCA bekommt neuen Eigentümer: strategische Partnerschaft mit LEA Partners“ (05.07.2024) – ORCA Software GmbH – https://orca-software.com/wp-content/uploads/2024-07-Milestone-ORCA_Pressemeldung.pdf – Primärquelle/Herstellerangabe – abgerufen 2026-11-09
[13] Pressemeldung „Orca Group bündelt führende Softwarekompetenz für die Baubranche“ (03.02.2026) – SOFTTECH GmbH – https://www.softtech.de/entdecken-lernen/uebersicht/blog/pressemeldungen/orca-group-buendelt-fuehrende-softwarekompetenz-fuer-die-baubranche – Herstellerangabe – abgerufen 2026-11-09
[14] Pressemeldung „BauerSoftware und SOFTTECH werden zur BAUER SOFTTECH GmbH“ (06.10.2026) – SOFTTECH GmbH – https://www.softtech.de/entdecken-lernen/uebersicht/blog/pressemeldungen/bauersoftware-und-softtech-werden-zur-bauer-softtech-gmbh – Herstellerangabe – abgerufen 2026-11-09
[15] Konsolidierung im Büromanagementsoftware-Markt: Orca Group bündelt acht Softwareanbieter (04.02.2026) – IWW / PBP Planungsbüro professionell – https://www.iww.de/pbp/unternehmensfuehrung/bueromanagement-konsolidierung-im-bueromanagementsoftware-markt-schreitet-fort-orca-group-buendelt-acht-softwareanbieter-n172004 – Presse – abgerufen 2026-11-09
[16] ORCA AVA auf dem Mac – ORCA Software GmbH – https://www.orca-software.com/orca-wissen/orca-ava-mac/ – Herstellerangabe – abgerufen 2026-11-09
[17] AUSSCHREIBEN.DE – ORCA Software GmbH – https://www.orca-software.com/ausschreiben-de/ – Herstellerangabe – abgerufen 2026-11-09
[18] Success Story ORCA Software (Lizenzierung) – SLASCONE – https://slascone.com/success-stories/orca-software/ – Herstellerangabe (Dienstleister) – abgerufen 2026-11-09
[19] ORCA AVA Ausschreibungsprogramm (Version 25, aktualisiert 24.03.2025) – SoftGuide – https://www.softguide.de/programm/orca-ava-ausschreibungsprogramm-software – Bewertungsportal/Verzeichnis – abgerufen 2026-11-09
[20] ORCA AVA 27: ab 828 EUR im Jahr, Editionen, Alternativen (zuletzt geprüft 09/2026) – KI-Syndikat – https://www.ki-syndikat.de/tools/orca-ava/ – Presse/Redaktionsportal – abgerufen 2026-11-09
[21] Seminarunterlage „AVA in zwei Tagen / komplett“ – ORCA Software GmbH – https://www.orca-software.com/wp-content/uploads/Seminar-AVA-in-zwei-Tagen-komplett.docx.pdf – Herstellerangabe – abgerufen 2026-11-09
[22] CaliforniaX Lizenzmodelle (Kauf, Abo, SaaS) – G&W Software AG – https://www.gw-software.de/california/lizenzmodelle – Herstellerangabe – abgerufen 2026-11-09
[23] CaliforniaX-Produktkonfigurator inkl. öffentlicher Preisdaten (konfigurator-daten.json, erzeugt 16.10.2026) – G&W Software AG – https://www.gw-software.de/kaufen/ und https://www.gw-software.de/fileadmin/konfigurator/konfigurator-daten.json – Herstellerangabe – abgerufen 2026-11-09
[24] G&W-Webshop: CaliforniaX-Pakete, Module, Ausschreibungstexte – G&W Software AG – https://shop.gw-software.de/california-ava/californiax/pakete/ – Herstellerangabe – abgerufen 2026-11-09
[25] CaliforniaX Editionen (SBE, BE, EE) – G&W Software AG – https://www.gw-software.de/california/editionen – Herstellerangabe – abgerufen 2026-11-09
[26] Softwarepflege für CaliforniaX (Pflegevertrag) – G&W Software AG – https://www.gw-software.de/service/california-pflegevertrag – Herstellerangabe – abgerufen 2026-11-09
[27] AVA4CLOUD – G&W Software AG – https://www.gw-software.de/california/ava4cloud – Herstellerangabe – abgerufen 2026-11-09
[28] California.pro V16 – G&W Software AG – https://www.gw-software.de/california/californiapro-v16 – Herstellerangabe – abgerufen 2026-11-09
[29] CaliforniaX V26 – neue Version – G&W Software AG – https://www.gw-software.de/california/californiax-v26 – Herstellerangabe – abgerufen 2026-11-09
[30] CaliforniaX Schnittstellen und Zertifizierungen – G&W Software AG – https://www.gw-software.de/california/californiax-schnittstellen – Herstellerangabe – abgerufen 2026-11-09
[31] Geschichte der G&W Software AG – G&W Software AG – https://www.gw-software.de/unternehmen/geschichte – Herstellerangabe – abgerufen 2026-11-09
[32] Über die G&W Software AG – G&W Software AG – https://www.gw-software.de/unternehmen/ueber-gw-software-ag – Herstellerangabe – abgerufen 2026-11-09
[33] California-Modul EVC (E-Vergabe Connect) – G&W Software AG – https://www.gw-software.de/california/module/evc – Herstellerangabe – abgerufen 2026-11-09
[34] California-Modul OFF (Offerte) – G&W Software AG – https://www.gw-software.de/california/module/off – Herstellerangabe – abgerufen 2026-11-09
[35] CaliforniaX Kurzbeschreibung (PDF, 18.08.2023) – G&W Software AG via baulinks.de – https://www.baulinks.de/bkd_file/gw-software/CaliforniaX_Kurzbeschreibung_20230818.pdf – Herstellerangabe – abgerufen 2026-11-09
[36] Studierendenlizenz CaliforniaX – G&W Software AG – https://gw-software.de/ausbildung/studierende – Herstellerangabe – abgerufen 2026-11-09
[37] CaliforniaX AVA-Software Kostenplanung (aktualisiert 20.02.2025) – SoftGuide – https://www.softguide.de/programm/californiax-ava-software-kostenplanung – Verzeichnis (Herstellerdaten) – abgerufen 2026-11-09
[38] Umsteigen auf CaliforniaX – G&W Software AG – https://www.gw-software.de/california/umsteigen-auf-california – Herstellerangabe – abgerufen 2026-11-09
[39] NEVARIS Build – Baumanagement-Software (Pakete, Subscription) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/produkte/nevaris-build/ – Herstellerangabe – abgerufen 2026-11-09
[40] NEVARIS Build „Planen“ – NEVARIS Bausoftware GmbH – https://www.nevaris.com/produkte/build/planen/ – Herstellerangabe – abgerufen 2026-11-09
[41] Zehn Jahre NEVARIS – NEVARIS Bausoftware GmbH – https://www.nevaris.com/zehn-jahre-nevaris-zehn-jahre-innovationgemeinsam-mit-unseren-kunden/ – Herstellerangabe – abgerufen 2026-11-09
[42] Über NEVARIS (Nemetschek Group seit 1998) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/ueber-nevaris/ – Herstellerangabe – abgerufen 2026-11-09
[43] Über uns (Mitarbeitende, Standorte) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/ueber-uns/ – Herstellerangabe – abgerufen 2026-11-09
[44] Pressemitteilung „NEVARIS 2026.1 – Intelligente Integration“ (04/2026) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/?presse=nevaris-2026-1-intelligente-integration-fuer-durchgaengige-bauprozesse – Herstellerangabe – abgerufen 2026-11-09
[45] Pressemitteilung „Release 2025.1: BIM, E-Rechnung, Cloud“ – NEVARIS Bausoftware GmbH – https://www.nevaris.com/?presse=nevaris-veroeffentlicht-release-2025-1-neuerungen-rund-um-bim-e-rechnung-cloud-und-die-entgeltabrechnung – Herstellerangabe – abgerufen 2026-11-09
[46] Pressemitteilung „Kundenumfrage zeigt hohe Weiterempfehlungsrate“ (Umfrage 2025) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/presse/kundenumfrage-zeigt-hohe-weiterempfehlungsrate-fuer-bausoftware/ – Herstellerangabe – abgerufen 2026-11-09
[47] Systemvoraussetzungen ab Version 2026.1 – NEVARIS Build / Success X (28.04.2026) – NEVARIS Bausoftware GmbH (Confluence) – https://nevaris-gmbh.atlassian.net/wiki/spaces/NDB/pages/1086685185/Systemvoraussetzungen+ab+Version+2026.1+-+NEVARIS+Build+Success+X – Herstellerangabe – abgerufen 2026-11-09
[48] Benutzerverwaltung NEVARIS Build / Success X Subscription – NEVARIS Bausoftware GmbH (Confluence) – https://nevaris-gmbh.atlassian.net/wiki/spaces/NDB/pages/415563923/Benutzerverwaltung+NEVARIS+Build+Success+X+Subscription – Herstellerangabe – abgerufen 2026-11-09
[49] NEVARIS Education (kostenlos für Studierende) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/education/ – Herstellerangabe – abgerufen 2026-11-09
[50] NEVARIS Build – Module für Planer und Bauunternehmen (Preise) – cs concept GmbH (Vertriebspartner) – https://www.cs-concept.de/software/ava-software/nevaris.html – Händlerangabe – abgerufen 2026-11-09
[51] Blog „Was der Bau durch Subscription und Cloud sparen kann“ (24.02.2025, aktualisiert 27.02.2026) – NEVARIS Bausoftware GmbH – https://www.nevaris.com/blog/cloud-und-abo-fuer-den-bau-mit-nevaris-bausoftware/ – Herstellerangabe – abgerufen 2026-11-09
[52] Nevaris Build Alternative: Welche AVA-Software ist die richtige? (05.11.2026) – Phase0 (Wettbewerber) – https://www.phase0.com/blog/nevaris-build-alternative – Herstellerangabe (Wettbewerber) – abgerufen 2026-11-09
[53] AVA-Software: Programm für Ausschreibung, Vergabe & Co. – NEVARIS Bausoftware GmbH – https://www.nevaris.com/loesungen/ava-software/ – Herstellerangabe – abgerufen 2026-11-09
[54] RIB iTWO Preise – Überblick der Pakete – RIB Software GmbH – https://www.rib-software.com/de/rib-itwo/preise – Herstellerangabe – abgerufen 2026-11-09
[55] RIB iTWO AVA-Software, Kosten- und Bauprojektmanagement – RIB Software GmbH – https://www.rib-software.com/de/rib-itwo/ava-software – Herstellerangabe – abgerufen 2026-11-09
[56] Pressemitteilung „GAEB XML 3.3: RIB 4.0 jetzt zertifiziert“ (21.07.2026) – RIB Software GmbH – https://www.rib-software.com/de/news/gaeb-3-3-zertifikat-ava – Herstellerangabe – abgerufen 2026-11-09
[57] Pressemitteilung „RIB iTWO Release 2025“ (13.01.2025) – RIB Software GmbH – https://www.rib-software.com/de/news/rib-itwo-release-2025 – Herstellerangabe – abgerufen 2026-11-09
[58] Pressemitteilung „Online-Planertag 2026“ (15.05.2026, TenderConnect) – RIB Software GmbH – https://www.rib-software.com/de/news/rib-planertag-2026 – Herstellerangabe – abgerufen 2026-11-09
[59] RIB iTWO PlanerCloud – RIB Software GmbH – https://www.rib-software.com/de/rib-planercloud – Herstellerangabe – abgerufen 2026-11-09
[60] Pressemitteilung „RIB iTWO Cloud-Hosting“ (25.10.2023) – RIB Software GmbH – https://www.rib-software.com/de/news/rib-itwo-cloud-hosting – Herstellerangabe – abgerufen 2026-11-09
[61] Übersicht RIB Studierendenlizenzen – RIB Software GmbH – https://www.rib-software.com/de/studenten – Herstellerangabe – abgerufen 2026-11-09
[62] Anwenderbericht Architekturbüro Uebel – RIB Software GmbH – https://www.rib-software.com/de/anwenderberichte/architekturbuero-uebel – Herstellerangabe (Kundenstimme) – abgerufen 2026-11-09
[63] Anwenderbericht ATP architekten ingenieure – RIB Software GmbH – https://www.rib-software.com/de/anwenderberichte/atp-architekten-ingenieure – Herstellerangabe (Kundenstimme) – abgerufen 2026-11-09
[64] FAQ zu RIB 4.0 als Cloud-Lösung – RIB Software GmbH – https://www.rib-software.com/de/rib-4-0-faqs – Herstellerangabe – abgerufen 2026-11-09
[65] Globe – AVA-Software für etablierte Prozesse – SIDOUN International GmbH – https://sidoun.de/loesungen/globe/ – Herstellerangabe – abgerufen 2026-11-09
[66] Globe4all (Anmeldung und FAQ) – SIDOUN International GmbH – https://sidoun.de/loesungen/kostenlose-ava-software/globe4all/ – Herstellerangabe – abgerufen 2026-11-09
[67] Kostenlose AVA-Software Globe4all – SIDOUN International GmbH – https://sidoun.de/loesungen/kostenlose-ava-software/ – Herstellerangabe – abgerufen 2026-11-09
[68] News „KIAVA – Die erste AVA-Software mit KI“ (25.03.2026) – SIDOUN International GmbH – https://sidoun.de/news/kiava-ki-innovation-ava-software-sidoun/ – Herstellerangabe – abgerufen 2026-11-09
[69] AVA Vergleich 2026 (Stand August 2026) – SIDOUN International GmbH – https://sidoun.de/loesungen/ava-vergleich/ – Herstellerangabe (Wettbewerbsvergleich) – abgerufen 2026-11-09
[70] Über uns – SIDOUN International GmbH – https://sidoun.de/unternehmen/ueber-uns/ – Herstellerangabe – abgerufen 2026-11-09
[71] Allgemeine Geschäftsbedingungen – SIDOUN International GmbH – https://sidoun.de/agbs/ – Primärquelle (Vertragsbedingungen) – abgerufen 2026-11-09
[72] AVANTI – AVA-Software (Versionen und Preise, Neuerungen 2026) – SOFTTECH GmbH – https://www.softtech.de/software/kosten-controlling/avanti-grafische-ava – Herstellerangabe – abgerufen 2026-11-09
[73] Lizenzmodelle – Mieten oder Kaufen – SOFTTECH GmbH – https://www.softtech.de/software/trenner/lizenzpolitik – Herstellerangabe – abgerufen 2026-11-09
[74] BUILDUP – Bausoftware für AVA, Kosten und Honorarabrechnung – SOFTTECH/BauerSoftware – https://www.softtech.de/software/kosten-controlling/buildup – Herstellerangabe – abgerufen 2026-11-09
[75] AVA.relax – COSOBA GmbH – https://www.cosoba.de – Herstellerangabe – abgerufen 2026-11-09
[76] AVAPLAN Editionen und Preise – AVAPLAN Software GmbH – https://www.avaplan.de/ava-software/editionen-preise/ – Herstellerangabe – abgerufen 2026-11-09
[77] Zertifizierungen (Liste der aktuell GAEB-zertifizierten Software-Programme) – BVBS Bundesverband Software und Digitalisierung im Bauwesen e. V. – https://www.bvbs.de/zertifizierungen/ – Primärquelle – abgerufen 2026-11-09
[78] Preise – Pakete und Laufzeiten – NOVA Building IT GmbH – https://nova-ava.de/preise/ – Herstellerangabe – abgerufen 2026-11-09
[79] Funktion Ausschreibung und Vergabe – NOVA Building IT GmbH – https://nova-ava.de/funktionen/ausschreibung-und-vergabe/ – Herstellerangabe – abgerufen 2026-11-09
[80] Funktion Abrechnung – NOVA Building IT GmbH – https://nova-ava.de/funktionen/abrechnung/ – Herstellerangabe – abgerufen 2026-11-09
[81] AVA-Software Vergleich 2026 – die besten 31 Anbieter (16.10.2026) – Dr. Web – https://www.drweb.de/ava-software-vergleich/ – Presse/Vergleichsportal (teils gesponsert) – abgerufen 2026-11-09
[82] AVA-Software: Empfehlungen für Architekten (Thread 10028, 2002) – bau.net Forum – https://bau.net/forum/edv/10028.php – Forum – abgerufen 2026-11-09
[83] AVA-Software Thread 11252 (2013) – bau.de Forum – https://bau.de/forum/architektur/11252.php – Forum – abgerufen 2026-11-09
[84] CaliforniaX – OMR Reviews – OMR – https://omr.com/de/reviews/product/californiax – Bewertungsportal – abgerufen 2026-11-09
[85] NOVA AVA Startseite (Verlinkung API-Dokumentation https://api.avanova.de/v1/docs, „NEO Baukosten-KI“) – NOVA Building IT GmbH – https://nova-ava.de/ – Herstellerangabe – abgerufen 2026-11-09
[86] ORCA AVA Startseite (Text-Anbieter, AUSSCHREIBEN.DE) – ORCA Software GmbH – https://www.orca-ava.de/ – Herstellerangabe – abgerufen 2026-11-09
[87] ORCA AVA Starter Edition (SE) und Vergleich aller Editionen (Haken je Edition: SE mit Leistungsverzeichnissen, Angeboten, Aufträgen und Nachträgen; Aufmaßprüfung, Rechnungsfreigabe und Kostenstand ab PE) – ORCA Software GmbH – https://www.orca-ava.de/starter-edition/ und https://www.orca-ava.de/vergleich-aller-editionen/ – Herstellerangabe – abgerufen 2026-11-09
[88] BVBS-Zertifikate GAEB DA XML 3.3 „AVA“ und „Bauausführung“ für NOVA AVA 4 (ausgestellt 11.10.2021, gültig bis 10.10.2026) – NOVA Building IT GmbH / BVBS – https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_AVA_3.3_202110.pdf – Primärquelle (Zertifikat) – abgerufen 2026-11-09
[89] DIN SPEC 91350:2016-11 (zurückgezogen, ersetzt durch DIN 18290-1:2023-11 und DIN 18290-2:2023-11) – DIN Media – https://www.dinmedia.de/en/technical-rule/din-spec-91350/263151122 – Primärquelle (Normenkatalog) – abgerufen 2026-11-09
