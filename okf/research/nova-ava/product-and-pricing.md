---
type: Research Note
title: NOVA AVA – Produkt, Module, Editionen, Preise und Lizenzmodell
description: Was NOVA AVA offiziell anbietet (Module, Pakete, Add-ons), was es kostet (inkl. Preisentwicklung 2016–2027 und Rechenbeispielen), wie das Floating-Lizenzmodell funktioniert und welche Vertrags-, Daten- und Hosting-Bedingungen gelten – Grundlage für Scoping, Anforderungen und die Preis-/Lizenzargumente unseres Open-Source-Projekts.
resource: https://nova-ava.de/preise/
tags: [research, nova-ava, preise, lizenzmodell, saas, datenhaltung]
timestamp: 2026-11-09T17:16:17Z
sources: 73
confidence: hoch
---
# NOVA AVA – Produkt, Module, Editionen, Preise und Lizenzmodell

## Kurzfassung

- **Produkt:** NOVA AVA ist eine reine Browser-Anwendung (SaaS = Software as a Service, Miete statt Kauf) der NOVA BUILDING IT GmbH aus Mühltal bei Darmstadt [24][1]. Es gibt drei Pakete: Starter, Easy und Business. Dazu kommen kostenpflichtige Add-ons (Zusatzmodule). Die komplette AVA-Kette mit Nachträgen, Aufmaß und Rechnungsprüfung (HOAI-Leistungsphase 8) gibt es nur im **Business**-Paket [1][39].
- **Preise (Stand 09.11.2026, netto je Lizenz):** Starter 49 €/Monat, Easy 89 €/Monat, Business 129 €/Monat. Bei Jahreszahlung kosten die Pakete 529, 961 bzw. 1.393 € (rund 10 % Rabatt) [1]. Seit dem 01.05.2026 ist Easy um 12,7 % und Business um 18,3 % teurer (vorher 79 bzw. 109 €, gültig seit 01.05.2022) [2][61][66].
- **Was „Lizenz“ heißt:** Eine Lizenz ist eine *gleichzeitige* Anmeldung (Floating-Lizenz, also eine geteilte Nutzungslizenz). Benutzerkonten lassen sich unbegrenzt anlegen [25][2]. Paket, Add-ons und Laufzeit gelten aber immer für **alle** Lizenzen eines Kontos. Unterschiedliche Pakete lassen sich nicht mischen [27][28].
- **Add-ons:** Aktuell kosten BIM 40 €, Terminplanung 20 €, Kalkulation 40 €, Lieferantenmanagement 40 € und Auktionen 30 €, jeweils pro Monat und Lizenz [1]. **Ab 01.02.2027 kostet jedes Add-on einheitlich 40 €.** Dann werden auch die bisher kostenlosen Betas Baudokumentation, NEO-MCP-Server und HOAI kostenpflichtig [3].
- **Kostenbeispiel (netto, Jahreszahlung):** 3 Business-Lizenzen mit BIM und Terminplanung kosteten 5.475 €/Jahr (vor Mai 2026). Ab Februar 2027 sind es 6.771 €/Jahr (+23,7 %). Wer zusätzlich HOAI und Baudokumentation nutzt, zahlt 9.363 €/Jahr (+71 %); siehe Abschnitt 8.
- **Preisgeschichte:** Business stieg von 69 € (2016 bis 06/2017) über 89 € (07/2017–04/2022) und 109 € (05/2022–04/2026) auf 129 € (seit 05/2026). Das sind +87 % in zehn Jahren. Alle Stufen sind durch Herstellerangaben belegt (archivierte Preisseiten, Update-Beitrag 2017, Newsletter 2022, Beitrag 2026) [52][67][66][2][1].
- **Vertrag:** Die Laufzeit ist frei wählbar (1, 3, 6 oder 12 Monate). Sie verlängert sich automatisch um denselben Zeitraum und lässt sich online bis zum Laufzeitende kündigen. Es gibt keine Erstattungen. Neue Preise greifen bei der nächsten Verlängerung [18][25][2]. Die AGB stammen von **April 2020** [18].
- **Daten:** Laut AGB bleibt der Kunde Eigentümer seiner Datenbanken. Er räumt NOVA aber ein **unwiderrufliches, übertragbares Nutzungsrecht an selbst erstellten LV-Positionen** ein, die Grundlage des Community-Textpools „SmartPool“ [18][48]. Nach Abo-Ende bleiben die Daten nur noch **12 Monate** gespeichert. Früher hieß es „unbefristet“ [1][26][54].
- **Export:** Daten lassen sich per GAEB, ÖNORM, Excel, CSV, PDF, XRechnung/ZUGFeRD und REST-API exportieren. Ein dokumentierter **Gesamtexport des Kontos fehlt** [32–36][44].
- **Hosting:** Die Anwendung läuft bei AWS in Frankfurt. Das SLA verspricht 99,8 % Verfügbarkeit, die AGB nur 98 % [21][22][18]. Backups: Vollsicherung alle 24 h, Datenbank-Snapshots alle 8 h, Aufbewahrung 12 Tage, Wiederherstellungszeit 4 h [22]. Als Unterauftragnehmer sind AWS, easybill und sipgate gelistet [23].
- **KI:** Die KI „NEO“ ist laut Hersteller in allen Paketen enthalten (Beta) und läuft auf eigenen Open-Source-Modellen in Deutschland [8]. Externe KIs wie ChatGPT oder Claude lassen sich nur über das MCP-Add-on anbinden, ab 02/2027 für 40 € je Lizenz und Monat [8][3].
- **Test und Lehre:** Es gibt einen 14-Tage-Test ohne Kreditkarte mit Business-Umfang und allen Add-ons [17][27]. Hochschulen und Studierende erhalten kostenlose Lizenzen [16].

## 1. Begriffe für Nicht-Architekten (Kurzreferenz)

| Begriff | Bedeutung (kurz) |
|---|---|
| **AVA** | Ausschreibung, Vergabe, Abrechnung. Gemeint ist der Bauprozess vom Leistungsverzeichnis über Angebote und Auftrag bis zur Prüfung der Rechnungen. |
| **LV (Leistungsverzeichnis)** | Strukturierte Liste der Bauleistungen (Positionen mit Text, Menge, Einheit, später Preis). Es ist das zentrale Dokument jeder Ausschreibung (engl. *bill of quantities*). |
| **HOAI / LPH** | Honorarordnung für Architekten und Ingenieure. Sie gliedert die Arbeit in Leistungsphasen (LPH). AVA betrifft vor allem LPH 6 (Vorbereitung der Vergabe), LPH 7 (Mitwirkung bei der Vergabe) und LPH 8 (Objektüberwachung, Abrechnung). Siehe [HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md). |
| **Kostenplanung (DIN 276)** | Gliedert die Baukosten nach Kostengruppen und schreibt sie fort, von der Schätzung bis zur Feststellung. Siehe [DIN 276](/okf/research/standards/din-276-cost-planning.md). |
| **Preisspiegel** | Tabelle, die die Angebote aller Bieter Position für Position vergleicht. |
| **Nachtrag** | Zusätzliche oder geänderte Leistung nach Auftragserteilung, mit eigenem Preis. |
| **Aufmaß** | Ermittlung der tatsächlich gebauten Mengen als Grundlage der Abrechnung. |
| **Rechnungsprüfung / Soll-Ist-Vergleich** | Prüfen der Abschlags- und Schlussrechnungen der Firmen sowie Vergleich der beauftragten (Soll) mit der erbrachten oder abgerechneten (Ist) Leistung. |
| **GAEB / ÖNORM A 2063** | Deutsche bzw. österreichische Austauschformate für LVs. Die „Austauschphasen“ (z. B. 83 = Angebotsaufforderung, 84 = Angebot, 86 = Auftrag) legen fest, was eine Datei enthält. Siehe [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md). |
| **IFC / BCF / IDS** | Offene BIM-Formate: IFC für Gebäudemodelle, BCF für Prüfkommentare und Tickets am Modell, IDS für Anforderungen an Modelldaten. Siehe [BIM und AVA](/okf/research/standards/bim-and-ava.md). |
| **STLB-Bau, DBD-BIM, Heinze** | Kommerzielle Bibliotheken mit Ausschreibungstexten. Siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md). |
| **Floating-Lizenz** | Lizenz, die nicht an eine Person gebunden ist. Sie zählt gleichzeitig angemeldete Nutzer. |
| **AVV / SLA** | Auftragsverarbeitungsvertrag nach DSGVO Art. 28 bzw. Service Level Agreement, also eine Zusage zu Verfügbarkeit und Support. |

## 2. Positionierung, Zielgruppen, Kunden

**Anbieter.** Hinter NOVA AVA steht die NOVA BUILDING IT GmbH, In der Mordach 1a, 64367 Mühltal (HRB 4686, Amtsgericht Darmstadt) [24]. Firmengeschichte und Roadmap behandelt [Unternehmen und Entwicklung](/okf/research/nova-ava/company-and-development.md).

**Werbeaussagen (Seite „Vorteile“, laut Hersteller) [13]:**
1. Die Bedienung sei einfach und intuitiv, mit Dashboard.
2. Die Software laufe im Browser auf jedem Computer oder Tablet. Die Daten lägen hochverfügbar und DSGVO-konform auf einem deutschen Cloud-Server, der zudem als BSI-zertifiziert bezeichnet wird.
3. BIM-basierte Kostenplanung per IFC-Import.
4. Online-Ausschreibung: Bieter geben ihre Angebote ohne zusätzliche Software im passwortgeschützten Bereich ab (siehe auch [45]).
5. Kosten- und Terminkontrolle über alle HOAI-Phasen.
6. Ein als fair beworbenes Abomodell: Pakete und Add-ons seien bei Bedarf monatlich kündbar.
7. Support aus Mühltal per Telefon, E-Mail und Fernwartung.

Einschätzung: Die Angabe *BSI-zertifiziert* ist unscharf. Belegt sind zwei Dinge: Ein vom BSI zertifizierter Dienstleister (secuvera) hat einen Penetrationstest durchgeführt [20]. Außerdem besitzt der Hosting-Anbieter AWS eigene Testate wie BSI C5 [21]. Ein BSI-Zertifikat für NOVA AVA selbst wurde nicht gefunden.

**Selbstbild:** In einer Produktinfo von 11/2023 nennt sich NOVA die erste und bislang einzige rein webbasierte Open-BIM-Anwendung für Baukostenmanagement. Sie eigne sich für Hoch-, Tief-, Anlagen- und Landschaftsbau [51]. Laut Pressemitteilung vom 29.10.2026 sieht sich NOVA als Pionier des cloudbasierten Baukostenmanagements, mit AVA, Controlling, Baudokumentation und HOAI auf einer Plattform [12].

**Zielgruppen und Kunden (Seite „Kunden“) [14]:** Der Hersteller nennt Architekturbüros, Generalplaner und Bauabteilungen von Unternehmen, von Start-ups bis zu DAX-Konzernen. Die Logo-Wand zeigt unter anderem:
- öffentliche Auftraggeber: Stadt Bonn, Stadt Fürth, Stadt Calw, Landkreis Gießen, NRW.BANK, Messe Berlin, Berliner Stadtwerke;
- Konzerne: Siemens, BMW, Bayer, Volkswagen;
- Planungsbüros: Staab Architekten, Arup;
- weitere Einrichtungen: Fraunhofer, Asklepios, TÜV Rheinland, Studierendenwerk München.

Kunden-, Nutzer- oder Projektzahlen veröffentlicht NOVA nicht [14].

**Erfahrungen-Seite [15]:** Die Seite enthält vom Hersteller ausgewählte Stimmen: bei Abruf 9 Text- und 6 Video-Testimonials, vor allem von Architektur-, Generalplaner- und Ingenieurbüros. Gelobt werden die einfache Bedienung, der BIM-Workflow aus Allplan, Archicad und Revit über IFC, die Cloud, die Online-Angebotsabgabe und der Support. Preis und GAEB werden nicht thematisiert. Kritik und Links auf Bewertungsportale fehlen [15]. Unabhängige Stimmen sammelt [Nutzerstimmen](/okf/research/nova-ava/user-feedback.md).

**Forschung und Lehre [16]:**
- Hochschullizenzen sind kostenfrei. NOVA schaltet nach Kontaktaufnahme unbegrenzte Zugänge für Studierende frei.
- Studierende ohne Hochschullizenz bekommen mit Immatrikulationsbescheinigung einen Einzelzugang bis Semesterende.
- Dozenten erhalten ein kostenloses Einführungswebinar.
- Laut Hersteller haben über 3.000 Studierende an 29 Hochschulen Zugang. Die Partnerliste auf derselben Seite nennt allerdings deutlich mehr Einrichtungen [16].
- Schon 2019 warb die Preisseite mit kostenlosen Hochschullizenzen [54].

Einschätzung: Das ist ein bewusster Nachwuchskanal. Absolventen kennen NOVA bereits, wenn sie in Büros anfangen.

## 3. Funktionsumfang laut Marketing

Die Bedienung im Detail beschreibt [Handbuch und Workflows](/okf/research/nova-ava/manual-and-workflows.md). Hier steht nur, *was* angeboten wird und *in welchem Paket*.

| Modul / Funktion | Kurzbeschreibung (laut Hersteller) | Ab Paket | Status / Preis |
|---|---|---|---|
| Projekte, Benutzer- und Rechteverwaltung, Adressbuch, Kalender und Notizen, Aktivitäten und Messenger | Basisfunktionen der Plattform | Starter | inklusive [1] |
| Kostenplanung | Kostenschätzung und -berechnung, u. a. nach DIN 276, aus BIM-Modell oder Referenzprojekten; Fortschreibung bis Projektende | Starter | inklusive [1][4] |
| Kostenanalyse | Kostenentwicklung verfolgen, dokumentieren, prognostizieren; seit 2025 nach zwei Katalogen gleichzeitig gliederbar | Starter | inklusive [1][4] |
| LV-Erstellung („Smartes LV“) | LV-Editor; Import aus GAEB, ÖNORM A 2063, Excel; Texte aus STLB-Bau, DBD-BIM, Heinze, ausschreiben.de | Starter | inklusive; externe Texte teils kostenpflichtig beim Textanbieter [4][37] |
| NOVA SmartPool | Suchpool aller jemals über NOVA *vergebenen* Positionen mit Text und Marktpreis, anonymisiert, filterbar nach Region und Zeitraum | Starter | inklusive [1][48] |
| Ausschreibung | Bieter einladen, Online-Angebotsabgabe im Bieterbereich, Rückfragen, Fristen, Angebotsöffnung nach dem Vier-Augen-Prinzip | Easy | inklusive [1][45] |
| Angebot / Preisspiegel | Automatische Auswertungen: günstigster Preis, Mittelwert, Median, Ausreißer- und ABC-Analyse, Variantenrechnung | Easy | inklusive [1][45] |
| Vergabe / Aufträge | Vergabevorschlag, Auftrags-LV | Easy | inklusive [1][45] |
| Nachtragsmanagement | Nachtragspakete, Status, Prognose; seit 06/2025 eine 80-%-Regel für strittige Nachträge | Business | inklusive [1][46] |
| Leistung / Aufmaß | Formeln nach REB 23.003, Austausch per DA11/X31, Erfassung durch die ausführende Firma, kostenlose Aufmaß-App für iOS und Android | Business | inklusive [1][46][42] |
| Soll-Ist-Vergleich | Leistungsstand je Gewerk, Abschnitt und Position, mit Warnungen bei Mengenabweichungen | Business | inklusive [1][46] |
| Rechnungsprüfung / Abrechnung | Abschlags-, Teilschluss- und Schlussrechnungen, Sicherheitseinbehalt, Skonto, Kostenteilung, E-Rechnung (XRechnung, ZUGFeRD) | Business | inklusive [1][46][36] |
| NEO Baukosten-KI | KI-Assistent: PDF-Angebot → LV, VOB-Check von LVs, CAD-Bauteillisten → DIN-276-Kostengruppen, Terminplan aus LV, Mängeltickets aus Fotos, CO₂-Auswertung, Projektstatus | alle Pakete | Beta (Phase 3 seit 26.10.2026), laut Hersteller inklusive [8][10] |
| Bautagebuch / Baudokumentation | Tickets, Protokolle, Bautagebuch, Pläne, BCF-Verortung am Modell; Tickets mit Auftragspositionen verknüpfbar | Add-on | kostenlose Beta seit 12/2025 (laut Beitrag vom 02/2026 „bis Ende 2026“); **ab 01.02.2027 40 €** [68][2][3][47] |
| HOAI-Modul | Honorarangebote und -abrechnung nach HOAI 2021 (alle Leistungsbilder), Honorarzonen, Teilleistungstabellen (Siemon, Simmendinger), Zeiterfassung, Controlling, XRechnung 3 | Add-on | Beta, vorläufig für alle Kunden freigeschaltet; **ab 01.02.2027 40 €** [9][10][3] |
| BIM (Add-on) | IFC-Import (IFC2x3/IFC4, seit 10/2026 kompatibel mit IFC 4.3), 3D-Viewer, Raum- und Gebäudebuch, Mengen aus Bauteilen, Modellvergleich, BIM-LV-Container (laut Add-on-Seite nach DIN SPEC 91350; diese Norm ist zurückgezogen und durch DIN 18290-1/-2:2023-11 ersetzt, das Handbuch nennt keine Norm; welche Fassung NOVA schreibt, ist offen (widersprüchlich - siehe Offene Fragen)) | Add-on | 40 € [1][6][10][71] |
| Terminplanung (Add-on) | Gantt-Diagramm, Vergabeterminplan, Bauzeitenplan, Arbeitskalender, Kostenganglinien (Soll/Ist); Mittelabflussplanung angekündigt | Add-on | 20 €, **ab 01.02.2027 40 €** [1][3][11] |
| Kalkulation (Bauausführende) | Einheitspreiskalkulation mit EKT-Ansätzen (Einzelkosten der Teilleistungen), Kostenarten, Zuschlägen; Zielgruppe sind eher Baufirmen | Add-on | 40 € [1][5] |
| Lieferantenmanagement | Lieferantenstamm, Bewertungen, Umkreissuche, Gewerke, Statistiken, Vertragsdokumente; dauerhaftes Lieferantenportal (für Lieferanten kostenfrei) | Add-on | 40 € [1][7] |
| Auktionen | Rückwärtsauktionen (Preis sinkt im Wettbewerb) mit Bietern in der Angebotsverhandlung | Add-on | 30 € [1][5] |
| NEO MCP-Server | Schnittstelle, über die externe KIs (ChatGPT, Claude, Copilot, Gemini …) per OAuth Daten in NOVA lesen und schreiben | Add-on | kostenlos in der Beta, **ab 01.02.2027 40 €** [8][3] |
| E-Signaturen | Angebote und Aufträge über Adobe Sign oder DocuSign signieren | (Add-on) | 2023–2025 als 20-€-Add-on gelistet (Easy/Business) [57]; heute nicht mehr auf der Preisliste, im Handbuch aber noch als wählbares Add-on erwähnt [25][38] |

**BIM-Funktionen nach Paket** (Add-on-Seite BIM [6]):
- *Starter:* BIM-Kostenplanung (Import, Viewer, Raum- und Gebäudebuch, Mengen aus Bauteilen, Modellversionen mit Änderungsprotokoll, Export und Import des BIM-LV-Containers).
- *Easy:* zusätzlich Modellfreigabe für Bieter und ein mit dem 3D-Modell verknüpfter Preisspiegel.
- *Business:* zusätzlich Aufträge, Nachträge und Aufmaß am Modell.

**Öffentliche Vergaben:** NOVA beschreibt sich als vollwertige Ausschreibungsplattform. Für öffentliche Ausschreibungen spricht es nur davon, LVs für öffentliche Plattformen *vorzubereiten* (GAEB, ÖNORM, PDF) [45]. Einschätzung: NOVA wirbt nicht damit, selbst eine e-Vergabe-Plattform im Sinne von VgV oder UVgO zu sein. Bei öffentlichen Auftraggebern dürfte der Architekt die Plattform des Auftraggebers nutzen und das LV dorthin exportieren. Details stehen in [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md).

## 4. Editionen und Funktionsmatrix (Stand 09.11.2026)

| Funktion | Starter | Easy | Business |
|---|:-:|:-:|:-:|
| Projekte, Benutzermanagement, Kontakte & Adressbuch, Rechteverwaltung, Kalender & Notizen, Aktivitäten & Messenger | ✓ | ✓ | ✓ |
| Kostenanalyse, Kostenplanung | ✓ | ✓ | ✓ |
| LV-Erstellung, NOVA SmartPool | ✓ | ✓ | ✓ |
| Ausschreibung, Angebot/Preisspiegel, Vergabe/Aufträge | – | ✓ | ✓ |
| Nachtragsmanagement, Leistung/Aufmaß, Soll-Ist-Vergleich, Rechnungsprüfung, Abrechnung | – | – | ✓ |
| Hotline & Support | ✓ | ✓ | ✓ |
| NEO-KI (Beta) | ✓ | ✓ | ✓ |
| Add-ons buchbar (BIM, Terminplanung, Kalkulation, Lieferantenmanagement, Auktionen; ab 02/2027 auch Baudoku, HOAI, MCP) | ✓ | ✓ | ✓ |
| Abgedeckte HOAI-Leistungsphasen (Einschätzung) | Kostenplanung, LPH 6 | LPH 6–7 | LPH 6–8 |

Quellen: [1][8][39]. Hinweis: 2023–2025 waren Lieferantenmanagement, Auktionen und E-Signaturen nur für Easy und Business buchbar [57]. Die aktuelle Preisseite zeigt keine solche Einschränkung mehr [1]. Das Handbuch ordnet die Programmteile ebenso zu: Starter umfasst die LV-Erstellung, Easy zusätzlich Ausschreibung und Vergabe, Business zusätzlich die Abrechnung [39].

**Folgerung für den Architekten-Freund (Einschätzung):** Er schreibt für öffentliche und private Bauherren aus und betreut die Abrechnung. Damit braucht er praktisch das **Business-Paket**. Starter und Easy decken LPH 8 nicht ab.

## 5. Preise (Stand 09.11.2026)

### 5.1 Pakete

Alle Preise sind Nettopreise je Lizenz zuzüglich 19 % USt. Rabatt gibt es für längere Laufzeiten: 3 Monate −5 %, 6 Monate −7,5 %, 12 Monate −10 % [1][2].

| Paket | Monatlich | 3 Monate (−5 %)¹ | 6 Monate (−7,5 %)¹ | 12 Monate (Listenpreis) | Ersparnis/Jahr |
|---|--:|--:|--:|--:|--:|
| Starter | 49 € | 139,65 € | 271,95 € | 529 € | 59 € |
| Easy | 89 € | 253,65 € | 493,95 € | 961 € | 107 € |
| Business | 129 € | 367,65 € | 715,95 € | 1.393 € | 155 € |

¹ Eigene Rechnung (Monatspreis × Monate × (1 − Rabatt)). NOVA veröffentlicht für 3 und 6 Monate nur die Prozentsätze, nicht die Beträge [1]. Die Jahrespreise entsprechen 12 × Monatspreis × 0,9, abgerundet; Business z. B. 129 × 12 × 0,9 = 1.393,20 €.

### 5.2 Add-ons: heute und ab 01.02.2027

Add-ons sind nur zusammen mit einem Paket buchbar [1]. Nach dem Handbuch gilt die Auswahl immer für alle Lizenzen des Abos [27][28].

| Add-on | Heute €/Monat | Heute €/Jahr | Ab 01.02.2027 €/Monat | Veränderung |
|---|--:|--:|--:|---|
| BIM | 40 | 432 | 40 | unverändert |
| Terminplanung | 20 | 216 | 40 | +100 % |
| Kalkulation (Bauausführende) | 40 | 432 | 40 | unverändert |
| Lieferantenmanagement | 40 | 432 | 40 | unverändert |
| Auktionen | 30 | 324 | 40² | +33 %² |
| Baudokumentation | 0 (Beta) | 0 | 40 | neu kostenpflichtig |
| NEO MCP-Server | 0 (Beta) | 0 | 40 | neu kostenpflichtig |
| HOAI | 0 (Beta) | 0 | 40 | neu kostenpflichtig |

Quellen: [1][3][8][9]. Laut Ankündigung vom 29.10.2026 gilt für jedes Add-on ein einheitlicher Preis von 40 € pro User und Monat, und zwar für Neubestellungen und automatische Verlängerungen [3].

² Auktionen wird in der Ankündigung nicht namentlich genannt. Die Erhöhung folgt nur aus der allgemeinen Aussage, dass jedes Add-on 40 € kosten soll (Einschätzung). Ob der Jahresrabatt von 10 % auch auf die neuen Add-on-Preise gilt, sagt die Ankündigung ebenfalls nicht. Die Preisseite nennt Rabatte für längere Laufzeiten aber auch bei Add-ons [1].

## 6. Preisentwicklung 2016–2027

Belegt durch archivierte Preisseiten (Internet Archive) und Herstellermeldungen.

| Zeitraum (Beleg) | Starter | Easy | Business | Bemerkungen |
|---|--:|--:|--:|---|
| 04/2016–06/2017 [52][53] | 29 € | 49 € | 69 € | Preise je Benutzer und Monat, Monatsvertrag. 2017 gültig für Bestellungen bis 30.06.2017, danach neues Angebot. Intranet- bzw. On-Premise-Paket auf Anfrage. Server bei Hetzner (2016), dann 1&1 (2017) |
| 07/2017–04/2022 [67][54][55] | 49 € | 69 € | 89 € | Gültig ab 01.07.2017 für Neubestellungen und Verlängerungen [67]; in Archivkopien 08/2019–07/2021 belegt. BIM-Add-on +20/+30/+40 € je nach Paket. Rabatte 5/7,5/10 %. Speicherplatz laut Hersteller unbegrenzt und unbefristet. Konto und Daten werden nur auf Kundenwunsch gelöscht |
| 05/2022–04/2026 [66][56][57][61] | 49 € | 79 € | 109 € | Gültig ab 01.05.2022 für Neubestellungen und automatische Verlängerungen, „nach 5 Jahren Laufzeit“; Add-on-Preise blieben unverändert [66]. Jahrespreise 529/853/1.177 €. Passt zur Herstelleraussage vom Februar 2026, die letzte Preisänderung liege vier Jahre zurück [2] |
| ab 01.05.2026 [2][1] | 49 € | 89 € | 129 € | Angekündigt am 18.02.2026. Bestehende Abos behalten ihre Konditionen bis Laufzeitende; neue Preise gelten bei Verlängerung oder Neuabschluss |

**Add-on-Historie:**

| Zeitpunkt | Änderung | Quelle |
|---|---|---|
| 2019–2021 | Nur BIM als Add-on: Starter +20 €, Easy +30 €, Business +40 € | [54][55] |
| ab 01/2023 | Zusätzlich Kalkulation (40 €), Auktionen (30 €) und Lieferantenmanagement (40 €); die beiden letzten nur für Easy und Business | [56] |
| ab 11/2023 | Zusätzlich Terminplanung (20 €) und E-Signaturen (20 €, nur Easy/Business) | [57] |
| 01.01.2025 | BIM für alle Pakete einheitlich 40 € (vorher Starter 20 €, Easy 30 €) | [58][59] |
| ab 06/2025 (neue Website) | Preise *pro Lizenz*; Add-ons mit Jahrespreisen; E-Signaturen nicht mehr gelistet | [60] |
| 12/2025 | Baudokumentation (Pläne, Tickets, Protokolle, Bautagebuch) als kostenlose Beta für alle Pakete; vorgestellt auf der BIM World am 26.11.2025. Der Preis-Beitrag vom 18.02.2026 nennt sie „neu im Portfolio“ und kostenlos bis Ende 2026 | [69][68][2] |
| 10/2026 | HOAI-Modul und MCP-Add-on als kostenlose Betas | [9][8] |
| 01.02.2027 | Alle Add-ons einheitlich 40 €: Terminplanung verdoppelt sich, Baudokumentation, MCP und HOAI werden kostenpflichtig | [3] |

**Veränderung über zehn Jahre:** Starter +69 % (29 → 49 €), Easy +82 % (49 → 89 €), Business +87 % (69 → 129 €). Gegenüber dem Preis von 07/2017–04/2022: Business +45 % (89 → 129 €) [52][67][1].

**Begründung des Herstellers (Februar 2026):**
- Gestiegene Kosten für das Cloud-Hosting.
- Ausbau der BIM-Funktionen und neuer Add-ons.
- Mehr Performance sowie Anpassung an Normen und Formate [2].

Starter blieb unverändert. Easy und Business seien funktional stark ausgebaut worden [2]. Als Tipp empfahl NOVA, vor dem 1. Mai noch zu alten Preisen auf längere Laufzeiten umzustellen [2].

**Einschätzung:**
- Die Erhöhungen treffen genau die Pakete, die Architekten für LPH 7 und 8 brauchen.
- Das Muster aus kostenloser Beta, Gewöhnung und anschließender Kostenpflicht (Baudokumentation, HOAI, MCP) dürfte die Gesamtkosten weiter steigen lassen.
- Ein On-Premise-Angebot (Betrieb im eigenen Netz) stand 2016–2021 auf der Preisseite [52][55]. Seit 2023 fehlt es dort [56][57]. Ob es noch auf Anfrage existiert, ist unbelegt.

## 7. Was genau ist eine „Lizenz“? (Lizenzmodell)

| Aspekt | Regelung | Quelle |
|---|---|---|
| Zähleinheit | Anzahl **gleichzeitiger Anmeldungen** (Floating-Lizenz). Die Zahl anlegbarer Benutzer ist unabhängig davon und unbegrenzt. | [25][27][2] |
| Wortwahl schwankt | Preisseite: *pro Lizenz* [1]. Preisanpassung 2026: *pro Monat und Nutzer*, maßgeblich seien gleichzeitige Nutzungen [2]. Add-on-Ankündigung: *pro User* [3]. 2016–2023 hieß es *je Benutzer* [52][57]. | [1][2][3] |
| Ein Paket für alle | Paket, Add-ons und Laufzeit gelten immer für alle Lizenzen. Pakete lassen sich innerhalb eines Abos nicht mischen. | [27][28][57] |
| Belegte Lizenzen | Automatische Abmeldung nach genau 2 Stunden Inaktivität, nicht einstellbar. Admins können Sitzungen beenden. Sind alle Lizenzen belegt, kommen nur noch Admins herein (eingeschränkte Anmeldung). | [29][43] |
| Rollen | Ein *Lizenzmanager* verwaltet Abo und Lizenzen unter *Mein Konto*. Dazu kommen Admin-Rollen, Abteilungen, LDAP-Synchronisation, SAML-SSO, externe Logins (Google, Microsoft, OpenID) und 2FA (E-Mail, Authenticator-App, seit 10/2026 Passkeys). | [28][30][31][11] |
| Externe Beteiligte | Bieter (Angebotscockpit), Lieferanten (Lieferantenportal, für sie kostenfrei) und ausführende Firmen (Aufmaßzugang, App) erhalten eigene, zeitlich steuerbare Zugänge. | [45][7][42] |
| API-Nutzung | Die REST-API steht auf keiner Preisliste. Die Ratenlimits richten sich nach Lizenzmerkmalen: 100 Anfragen/min als Standard, 200 mit dem Merkmal `award`, 600 mit `settlement`. Technische API-Benutzer lassen sich für die normale Anmeldung sperren. | [44][30] |
| Abo ändern | Jede Änderung beendet das laufende Abo und startet ein neues. Das Restguthaben wird höchstens bis zur Höhe der neuen Bestellung verrechnet. Ein negativer Bestellwert ist nicht erlaubt. | [25][28] |
| Erstattung | Fehlbuchungen werden grundsätzlich nicht erstattet. Bei vorzeitiger Nutzungseinstellung gibt es keine Erstattung der Restlaufzeit. | [27][18] |
| Hochschulen | Kostenlose Lizenzen für Lehre, Studierende bis Semesterende. | [16] |

**Einschätzungen zum Lizenzmodell:**
- Ob externe Beteiligte eine der gekauften Floating-Lizenzen belegen, steht nirgends ausdrücklich. Die Kostenfreiheit für Lieferanten spricht dagegen.
- Die Stufen `award` und `settlement` entsprechen vermutlich den Paketen Easy und Business. Das ist abgeleitet, nicht belegt.
- Das Floating-Modell ist für kleine Büros fair: 5 Mitarbeitende kommen mit 3 Lizenzen aus, wenn nie mehr als drei gleichzeitig arbeiten.
- Teuer wird es durch die Regel *alles für alle Lizenzen*. Braucht nur eine Person BIM oder die Abrechnung, zahlen alle Lizenzen Business plus BIM.
- Die Restguthaben-Logik verhindert praktisch eine Reduzierung mitten in der Laufzeit, etwa nach Ende eines Großprojekts. Erst wenn das Guthaben aufgebraucht ist, kann man auf weniger Lizenzen oder ein kleineres Paket wechseln.

## 8. Rechenbeispiele: Jahreskosten für 1, 3 und 5 Business-Lizenzen

**Annahmen:**
- Jahreszahlung (12 Monate Laufzeit), Nettopreise, Lizenz = gleichzeitige Nutzung.
- Add-ons gelten für alle Lizenzen [27].
- HOAI und Baudokumentation kosten bis 31.01.2027 nichts [3][9].
- Ab 01.02.2027 wird für Add-ons derselbe Jahresrabatt von 10 % angenommen, also 40 × 12 × 0,9 = 432 €. Das ist nicht ausdrücklich bestätigt.

**Bausteine je Lizenz und Jahr:**
- Business vor 01.05.2026: 109 × 12 × 0,9 = 1.177 € (Listenpreis) [61]
- Business ab 01.05.2026: 129 × 12 × 0,9 = 1.393 € [1]
- BIM: 40 × 12 × 0,9 = 432 € [1]
- Terminplanung bis 31.01.2027: 20 × 12 × 0,9 = 216 €; ab 01.02.2027: 432 € [1][3]
- HOAI, Baudokumentation, NEO-MCP ab 01.02.2027: je 432 € [3]

| Szenario | je Lizenz | 1 Lizenz | 3 Lizenzen | 5 Lizenzen |
|---|--:|--:|--:|--:|
| A: nur Business, Preise vor 01.05.2026 | 1.177 € | 1.177 € | 3.531 € | 5.885 € |
| B: nur Business, ab 01.05.2026 | 1.393 € | 1.393 € | 4.179 € | 6.965 € |
| C: Business + BIM + Terminplanung, vor 01.05.2026 (1.177 + 432 + 216) | 1.825 € | 1.825 € | 5.475 € | 9.125 € |
| D: wie C, 01.05.2026–31.01.2027 (1.393 + 432 + 216) | 2.041 € | 2.041 € | 6.123 € | 10.205 € |
| E: wie C, ab 01.02.2027 (1.393 + 432 + 432) | 2.257 € | 2.257 € | 6.771 € | 11.285 € |
| F: E + HOAI + Baudokumentation, ab 01.02.2027 (1.393 + 4 × 432) | 3.121 € | 3.121 € | 9.363 € | 15.605 € |
| G: F + NEO-MCP (externe KI), ab 01.02.2027 (1.393 + 5 × 432) | 3.553 € | 3.553 € | 10.659 € | 17.765 € |

**Veränderungen:**
- A → B: +18,4 %, also +216 € je Lizenz und Jahr.
- C → D: +11,8 %.
- C → E: +23,7 %.
- C → F: +71,0 %, wenn HOAI und Baudokumentation genutzt werden.

**Weitere Varianten:**
- *Brutto:* Mit 19 % USt kostet z. B. B mit 3 Lizenzen 4.179 × 1,19 = 4.973,01 €. Einschätzung: Architekturbüros sind in der Regel vorsteuerabzugsberechtigt, relevant ist daher meist der Nettobetrag.
- *Monatliche Zahlung ohne Rabatt:* Business kostet 129 × 12 = 1.548 € je Lizenz und Jahr. Mit BIM und Terminplanung ab 02/2027 sind es (129 + 40 + 40) × 12 = 2.508 €.
- *Fünf-Jahres-Perspektive (Einschätzung):* 3 Lizenzen in Szenario E summieren sich über fünf Jahre auf rund 33.900 € netto. Ohne Add-ons (Szenario B) sind es rund 20.900 €. Weitere Preiserhöhungen sind dabei nicht eingerechnet. So viel Budget könnte eine Open-Source-Lösung umverteilen.
- *Übergang:* Bestehende Abos laufen zu alten Konditionen bis Laufzeitende [2]. Wer vor dem 01.05.2026 auf 12 Monate verlängert hat, zahlte also bis spätestens April 2027 die alten Paketpreise (abgeleitet aus [2]).

## 9. Zusatzkosten und versteckte Kosten

| Kostenposition | Was bekannt ist | Quelle |
|---|---|---|
| Add-ons | Je Lizenz und für alle Lizenzen; ab 02/2027 je 40 €/Monat | [1][3][27] |
| KI | NEO laut Hersteller inklusive. Externe KI nur mit MCP-Add-on (ab 02/2027 40 €) plus eigenem Abo beim KI-Anbieter (Einschätzung) | [8][3] |
| Ausschreibungstexte | STLB-Bau, DBD-BIM und Heinze VOB brauchen ein eigenes Abonnement beim Textanbieter. Heinze ATM und ausschreiben.de sind kostenlos. STLB-Benutzer müssen einem NOVA-Benutzer zugeordnet sein. | [37] |
| E-Signatur | Eigenes Konto bei Adobe Sign oder DocuSign nötig | [38] |
| BIM-Dienste | Catenda Hub (CDE = gemeinsame Projektdatenumgebung) und BIM.permit (IDS-Prüfung) nur mit eigenen Zugangsdaten beim jeweiligen Anbieter | [38] |
| Support | *Hotline & Support* ist in allen Paketen enthalten [1]. Das SLA rechnet Service-Requests (Beispiel: Passwort zurücksetzen) und Change-Requests nach Aufwand ab [21]. Nicht-Kunden zahlen pauschal 75 € netto je Anfrage [49]. | [1][21][49] |
| Schulung / Onboarding | Video-Tutorials, Handbuch, Forum und Online-Webinare; die Webinare sind bei ausgewählten Architektenkammern als Fortbildung anerkannt (je 4 Unterrichtseinheiten). Preise für Webinare oder individuelle Schulungen wurden nicht gefunden. | [50] |
| Speicherplatz | Aktuell keine Grenze veröffentlicht. 2019–2023 wurde unbegrenzter Speicher beworben. | [1][54][56] |
| Daten nach Kündigung | 12 Monate kostenlos gespeichert. Was danach geschieht oder kostet, ist nicht angegeben. | [1][26] |
| API | Kein eigener Preis gefunden; Ratenlimit abhängig vom Paket (siehe Abschnitt 7) | [44] |
| Zahlung | Vorkasse per Rechnung oder SEPA-Lastschrift; Vorabankündigung bei Lastschrift auf 1 Tag verkürzt | [18][27] |
| Apps | Aufmaß-App kostenlos (iOS/Android). Eine Baudoku-App ist zum 01.02.2027 im kostenpflichtigen Add-on angekündigt. | [46][3] |

**Widerspruch beim Support:** Das SLA verlangt Geld für Service-Requests [21]. Die Preisseite nennt Support als Paketbestandteil [1], und die Produktinfo 2023 versprach einen kostenlosen Anwenderservice per Live-Chat, E-Mail und Telefon [51]. Einschätzung: Normale Hilfe ist vermutlich frei, Konfigurationsarbeiten nicht. Das ist unklar und muss geklärt werden (siehe Offene Fragen).

## 10. Vertragsbedingungen (AGB, Stand April 2020)

| Thema | Regelung | Quelle |
|---|---|---|
| Vertragspartner | NOVA Building IT GmbH, Mühltal | [18][24] |
| Kundenkreis | Nur Unternehmer, juristische Personen und Sondervermögen des öffentlichen Rechts (reines B2B) | [18] §3(1) |
| Zweckbeschreibung | Dokumente zu Leistungen nach VOB, VOL und VOF. Einschätzung: veraltet, denn die VOF ging 2016 in der VgV auf und die VOL/A wurde für Unterschwellenvergaben weitgehend durch die UVgO ersetzt. Gleiches steht im AVV von 2025. | [18] §1, [23] |
| Vertragsschluss | Bestellung unter *Mein Konto* per kostenpflichtigem Bestell-Button | [18] §3(4) |
| Laufzeit / Verlängerung | Gewählter Zeitraum (1/3/6/12 Monate); automatische Verlängerung um denselben Zeitraum | [18] §12(2–3), [25] |
| Kündigung | Online jederzeit ohne Frist zum Laufzeitende; sonst in Textform bis 1 Werktag vor Laufzeitende; Kündigung widerrufbar | [18] §12(2), [26] |
| Erstattung | Keine Erstattung bei vorzeitiger Einstellung der Nutzung | [18] §12(4) |
| Zahlungsverzug | Fristlose Kündigung möglich, zusätzlich pauschal ein Viertel der restlichen Grundpauschale als Schadensersatz | [18] §12(5) |
| Preisänderungen | Keine ausdrückliche Preisanpassungsklausel; es gilt die jeweilige Preisliste. In der Praxis greifen neue Preise bei Verlängerung oder Neubestellung | [18] §8(1), [2][3] |
| Leistungsänderungen | Einseitig nach billigem Ermessen, soweit zumutbar. AGB-Änderungen gelten, wenn der Kunde nicht binnen 14 Tagen widerspricht | [18] §13 |
| Verfügbarkeit | 98 % im Jahresmittel, gemessen am Routerausgang des Rechenzentrums | [18] §4(2) |
| Datensicherung durch Kunden | Kunde soll Dokumente regelmäßig, mindestens täglich herunterladen | [18] §9(4) |
| Schnittstellen | Kunde allein verantwortlich für die Prüfung importierter oder exportierter Daten | [18] §9(5) |
| Haftung | Unbeschränkt bei Vorsatz, grober Fahrlässigkeit und Personenschäden; sonst nur bei wesentlichen Pflichten, begrenzt auf typische Schäden; verschuldensunabhängige Haftung nach § 536a BGB ausgeschlossen | [18] §11 |
| Nutzungsrecht Kunde | Einfaches, nicht übertragbares Recht für eigene Unternehmenszwecke während der Laufzeit | [18] §6(1) |
| Recht / Gerichtsstand | Deutsches Recht ohne UN-Kaufrecht; Gerichtsstand Sitz von NOVA | [18] §14 |

Einschätzung: Für Kunden ist das Vertragsmodell flexibel, weil monatliche Laufzeiten möglich sind und es keine Mindestbindung gibt. Die AGB sind aber sechs Jahre alt und passen nicht mehr zum Produkt: Sie nennen 98 % Verfügbarkeit, das SLA dagegen 99,8 %. Eine Regel zur Datenhaltung nach Vertragsende fehlt. Zudem darf NOVA Leistungen einseitig ändern.

## 11. Daten: Eigentum, Aufbewahrung, Export, Lock-in

### 11.1 Rechte an den Daten
- **Eigentum:** Datenbanken, die beim Kunden entstehen, stehen ihm zu, auch nach Vertragsende [18] §6(2).
- **Rechte für NOVA:** Für *selbst erstellte* LV-Positionen räumt der Kunde NOVA ein Nutzungsrecht ein [18] §7(3–4). Es ist räumlich, zeitlich und inhaltlich unbeschränkt, unwiderruflich, übertragbar, unterlizenzierbar und unentgeltlich. NOVA darf die Positionen nach automatischer Anonymisierung nutzen. Der Kunde verzichtet auf die Urhebernennung.
- **SmartPool:** Der Pool enthält alle jemals über NOVA vergebenen Positionen mit Texten und Marktpreisen, anonymisiert [48]. Ein Opt-out wird nicht erwähnt [48].
- **Einschätzung:** Architekten, die eigene Textbibliotheken als Know-how betrachten, geben damit Nutzungsrechte ab. Eine Open-Source-Lösung kann klar zusichern: „Deine Texte bleiben deine.“ Eine Preisdatenbank wäre dann nur per Opt-in denkbar.

### 11.2 Aufbewahrung nach Abo-Ende – die Aussagen haben sich verschärft

| Stand | Aussage | Quelle |
|---|---|---|
| 2019–2023 | Konto und Daten bleiben erhalten; Löschung nur auf Kundenwunsch; Speicher unbefristet | [54][56] |
| 11/2023–04/2025 | Daten werden auf unbestimmte Zeit aufbewahrt. Testkonten ohne Abo werden 6 Monate nach Testende gelöscht. | [57][59] |
| seit spätestens 04/2026 | Daten 12 Monate kostenlos gespeichert, Wiedereinstieg in dieser Zeit möglich. Im Archiv-Snapshot vom 12/2025 fehlte der Satz noch. | [62][61][1] |
| Handbuch 09/2026 | Nach Laufzeitende **kein Zugriff** mehr. Daten bis zu 12 Monate im Konto, Wiedereinstieg nur mit neuem Abo | [26] |
| Handbuch 08/2026 (anderer Artikel) | Account bleibe zeitlich unbegrenzt bestehen. Das widerspricht den Angaben oben | [28] |
| AVV 05/2025 | Nach Vertragsende werden die Daten nach Wahl des Kunden zurückgegeben oder gelöscht | [23] §15 |

Einschätzung: Wer kündigt, muss **vor** dem Laufzeitende exportieren, denn danach gibt es keinen Zugriff mehr [26]. Bauakten müssen oft über Gewährleistungsfristen von meist 4 Jahren nach VOB/B oder 5 Jahren nach BGB hinaus verfügbar sein. Das passt schlecht zu 12 Monaten. Die Fristen klärt [HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md).

### 11.3 Export- und Importformate (laut Handbuch)

| Format | Import | Export | Inhalt | Quelle |
|---|:-:|:-:|---|---|
| GAEB 90 / GAEB 2000 | ✓ | ✓ (GAEB 90, 90 HVA StB) | LVs | [32][33] |
| GAEB DA XML 3.1 / 3.2 / 3.3 | ✓ | ✓ | LVs in Phasen 81–86, Nachtrags-X83 und Auftrags-X86, auf Wunsch mit IFC-Mengenbezug | [32][33] |
| GAEB X51 | ? | ✓ | Kostenplanung (DIN 276 bzw. BIM) | [33] |
| DA11 / X31 | ✓ | ✓ | Aufmaße | [35][46] |
| ÖNORM A 2063 (.onlv/.onlb) | ✓ | ✓ (Aufträge/Nachträge) | Österreichische LVs; das alte B2063 wird nicht unterstützt | [32] |
| Excel (.xlsx) | ✓ (mit Spaltenzuordnung) | ✓ | LV, Preisspiegel, Kostenplanung, Kostenanalyse, Terminplan | [32][34][11] |
| Datanorm 4.0 | ✓ | – | Artikel- und Leistungsdaten aus Handwerk und Handel | [32] |
| CSV | ✓ (u. a. Kostenansätze, Adressen) | ✓ | Adressen, Lieferanten, Tickets, Projektbeteiligte, Benutzerliste | [35][30] |
| PDF | – | ✓ | Ausgaben in fast allen Modulen | [34] |
| XRechnung / ZUGFeRD | – | ✓ | Elektronische (Prüf-)Rechnungen, HOAI-Rechnungen | [36][9] |
| IFC / BCF | ✓ | (BCF-Tickets) | Gebäudemodelle (IFC2x3, IFC4; Viewer seit 10/2026 kompatibel mit IFC 4.3) | [6][10] |
| BIM-LV-Container (`.mmc`; Add-on-Seite: DIN SPEC 91350, inzwischen durch DIN 18290-1/-2 ersetzt; Fassung offen, siehe Offene Fragen) | ✓ | ✓ | LV plus Modell | [6][34][71] |
| Dokumente | ✓ | ✓ (ZIP) | Projektdokumente als ZIP-Archiv | [41] |
| REST-API v1.4.3 | ✓ | ✓ | 78 Pfade mit 108 Operationen: Adressen, Lieferanten, Dokumente, Projekte, Gebäude, Kostenplanungen, LVs (inkl. GAEB-Import), Analysen, Benutzer, Kataloge. Anmeldung per OAuth2 mit Client Credentials | [44] |

Ein dokumentierter **Komplettexport** des Kontos (alle Projekte, Verläufe, Bieterkommunikation) wurde **nicht gefunden**. Die Archivfunktion speichert nur Versionsstände *innerhalb* von NOVA [40]. Details zur API stehen in [API und Datenmodell](/okf/research/nova-ava/api-and-data-model.md), Interoperabilitätsprobleme in [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md).

**Einschätzung Lock-in: mittel bis hoch.**
- LVs lassen sich über GAEB gut mitnehmen.
- Kostenplanungen gibt es nur als X51 oder Excel, Terminpläne nur als PDF oder Excel. Bei HOAI-Daten ist unklar, ob ein Export existiert.
- Prozesshistorie, Bieterfragen und Prüfvermerke lassen sich kaum migrieren.
- Die 12-Monats-Frist und der fehlende Zugriff nach Abo-Ende erhöhen den Druck, Kunde zu bleiben.

## 12. Hosting, Datenschutz, Sicherheit, SLA

**Hosting:**
- Die Anwendung läuft bei AWS, Region Frankfurt, einschließlich Datensicherung [22][23].
- Das SLA nennt ein Multi-Instance-Single-Zone-Deployment: mehrere Instanzen, aber nur in einer Verfügbarkeitszone [21].
- Das SLA verweist auf Zertifikate von AWS: ISO/IEC 27001, 27017 und 27018, BSI C5, SOC 1 [21].

Frühere Hosting-Angaben:
- 2016: Hetzner, Nürnberg und Falkenstein [52]
- 2017 bis mindestens 08/2019: dedizierte Cloud-Server bei der 1&1 Internet SE [53][54]
- ab 10/2019: „dedizierte Cloud-Server in Deutschland“ ohne Anbieternennung (Archivkopien 23.10.2019 bis 01/2023) [70][55][56]
- spätestens 05/2025: AWS, Region Frankfurt (AVV, Sicherheits-FAQ) [23][22]

Einschätzung: AWS ist ein US-Konzern und unterliegt grundsätzlich dem US CLOUD Act. Eine allgemeine Pflicht öffentlicher Auftraggeber zu Anbietern mit EU-Hauptsitz oder zum Selbstbetrieb ist aber nicht belegt. Belegt sind engere Vorgaben: Die bayerische Staatsbauverwaltung verlangt im Bundesbau von ihren Auftragnehmern, also auch von Planern, für cloudbasierte Software den BSI-Mindeststandard „Externe Cloud-Dienste“ (sinngemäß) und eine Umsetzungsbestätigung bei Vertragsschluss; für Verschlusssachen (VS-NfD) braucht der Auftragnehmer selbst akkreditierte IT [73]. Für die Open-Source-Alternative ist Selbstbetrieb damit ein Argument für sicherheitsrelevante Projekte, kein allgemeines Muss. Details: [Anforderungen öffentlicher Auftraggeber](/okf/research/standards/public-client-ava-requirements.md).

**Website und Anwendung trennen.** Die Datenschutzerklärung auf nova-ava.de betrifft die Marketing-Website. Diese liegt bei HostPress und nutzt unter anderem Google Analytics, Ads, Tag Manager und Maps, YouTube, Vimeo, Meta, X und Navattic, teils mit Übermittlung in die USA [19]. Einschätzung: Für die AVA-Daten ist der AVV maßgeblich, nicht diese Erklärung.

**AVV (Stand 15.05.2025) [23]:**
- Unterauftragnehmer:
  - AWS Frankfurt (Webhosting und Datensicherung)
  - easybill GmbH (CRM und Faktura)
  - sipgate GmbH (Telefonanlage)
- Neue Unterauftragnehmer kündigt NOVA mindestens 4 Wochen vorher an. Der Kunde kann binnen 3 Wochen widersprechen. Dann darf NOVA kündigen, mit mindestens 14 Tagen Frist zum Monatsende. Schweigen gilt als Zustimmung [23] §9.
- Einschätzung: Ein KI-Unterauftragnehmer ist nicht gelistet. Das passt zur Herstelleraussage, NEO laufe auf eigener Infrastruktur [8]. Ob ein neuerer AVV existiert, ist offen.

**KI-Datenschutz (laut Hersteller) [8][12]:**
- NEO arbeite unabhängig von großen KI-Konzernen, mit eigenem *AI-HUB* und Open-Source-Modellen.
- Die Daten blieben in ISO-27001-zertifizierten Rechenzentren in Deutschland.
- Kundendaten würden nicht zum Training genutzt.
- NEO hat dieselben Rechte wie der aufrufende Benutzer und lässt sich firmenweit oder je Benutzer abschalten [8].
- Einschätzung: Wer über MCP ChatGPT oder Claude anbindet, schickt Projektdaten an diese Anbieter und ist dafür selbst verantwortlich.

**Sicherheit (FAQ Informationssicherheit, Commitment-Seite) [22][20]:**
- Verschlüsselung: AES-256 im Ruhezustand, TLS bei der Übertragung.
- Schutz: AWS Shield (gegen DDoS-Angriffe) und WAF (Web Application Firewall), Virenscan mit ClamAV, automatisches Betriebssystem-Patching, containerisierte Anwendung.
- Penetrationstest durch secuvera vom 07.01. bis 13.02.2025 (White-Box-Test, Bericht vom 27.02.2025).
- Backups: Vollsicherung alle 24 h, Datenbank-Snapshots alle 8 h, höchstens 12 Tage aufbewahrt, Wiederherstellung innerhalb von 4 h (RTO = Recovery Time Objective).
- Zertifikate: GAEB DA XML 3.3 für AVA und Bauausführung (ausgestellt 11.10.2021, laut Urkunden gültig bis 10.10.2026; eine Erneuerung war am 09.11.2026 nicht auffindbar) sowie ein buildingSMART-Zertifikat für den IFC2x3-Import (2019) [22][6][72].
- DSGVO-Werkzeuge: Adressen anonymisieren; personenbezogene Felder beim GAEB-Import auf Wunsch herausfiltern [65].

**SLA im Detail [21]:**
- Verfügbarkeit 99,8 %, monatlich gemessen, ohne Wartungsfenster. Die Ausfallzeit zählt von der Störungsmeldung bis zur Behebung innerhalb der Betriebszeiten.
- Support Mo–Do 8–17 Uhr, Fr 8–16 Uhr.
- Vier Prioritätsstufen, aber **keine Reaktions- oder Lösungszeiten** und **keine Gutschriften** bei Verfehlung.
- Wie sich das SLA zu den AGB verhält, die nur 98 % nennen, ist ungeklärt. Einschätzung: Das SLA ist eher Werbung als belastbare Zusage.

## 13. Testzugang, Systemvoraussetzungen, Formate

**Testzugang:**
- 14 Tage, ohne Kreditkarte, mit allen Funktionen und Add-ons. Laut Handbuch entspricht das dem Business-Umfang plus allen Add-ons [17][27].
- Der Test endet automatisch und kann auf Wunsch verlängert werden [27].
- Testdaten werden beim Abschluss zu Produktivdaten [27].
- Abgefragt werden Firma, Name, E-Mail, Telefon und ein Kontoname, der als Subdomain dient [17].
- Laut AGB können Testverträge im Funktionsumfang teilweise eingeschränkt sein [18] §3(3).
- 2023–2025 wurden Testdaten 6 Monate nach Testende gelöscht, wenn kein Abo folgte [57].

**Systemvoraussetzungen:** Eine aktuelle offizielle Liste mit Browsern und Betriebssystemen wurde nicht gefunden. Bekannt ist:
- Laut Hersteller funktioniert NOVA auf jedem Computer oder Tablet [13]. Frühere Preisseiten warben mit Unterstützung aller Browser und Betriebssysteme auf Smartphone, Tablet, PC und Mac [52][54].
- Die AGB verpflichten den Kunden, Internetzugang, Endgerät und einen aktuellen Browser selbst zu stellen [18] §9(3).
- Es gibt eine native App für das Aufmaß (iOS/Android) [46]. Die Terminplanung wurde 2026 für Touch-Bedienung verbessert [11].

**Formate:** Die Übersicht steht in Abschnitt 11.3. Laut Hersteller bietet NOVA Branchenschnittstellen für GAEB und IFC, zusätzlich Excel, CSV und PDF sowie eine REST-API [22].

## 14. Kurzer Preisvergleich mit Wettbewerbern

| Anbieter / Produkt | Modell | Preis (netto) | Quelle |
|---|---|---|---|
| NOVA AVA Business | SaaS, Floating-Lizenz | 1.393 €/Jahr je Lizenz (≈ 116 €/Monat); 3 Lizenzen 4.179 €, 5 Lizenzen 6.965 € | [1] |
| ORCA AVA Starter Edition (LPH 5–7) | Desktop-Abo inkl. Servicevertrag | 828 €/Jahr; jede weitere Lizenz 708 € | [63] |
| ORCA AVA Professional (LPH 1–9 + IFC-Basic) | Desktop-Abo inkl. Servicevertrag | 1.788 €/Jahr; weitere Lizenz 1.428 €; 3 Lizenzen = 4.644 € | [63] |
| ORCA AVA Enterprise (+ IFC-Advanced, Benutzerverwaltung) | Desktop-Abo inkl. Servicevertrag | 2.388 €/Jahr; weitere Lizenz 1.908 €; 3 Lizenzen = 6.204 € | [63] |
| CaliforniaX (G&W) | Kauf, Abo (12 Monate oder Kurzabo) oder SaaS (AVA4CLOUD) | Keine Preise öffentlich, nur Konfigurator oder Shop; Cloud-Verfügbarkeit bis zu 99,5 % | [64] |

ORCA berechnet zusätzlich eine Bearbeitungspauschale, deren Höhe unbekannt ist. Ob die Preise für weitere Lizenzen ebenfalls jährlich gelten, steht nicht ausdrücklich da [63].

Einschätzung: Beim Paketpreis liegt NOVA im Mittelfeld etablierter Anbieter, für ein Cloud-Produkt mit Bieterportal sogar eher günstig. Der Schmerz entsteht weniger durch den Grundpreis als durch die Struktur:
- Add-ons kosten für alle Lizenzen.
- Die Add-on-Preise steigen, und ehemals kostenlose Betas werden kostenpflichtig.
- Man zahlt dauerhaft, ohne etwas zu besitzen, und hat keinen Zugriff mehr nach Abo-Ende.
- Die Erhöhungen 2026/2027 kommen kurz hintereinander.

Die Funktionsumfänge sind nicht deckungsgleich: Desktop gegen Cloud, unterschiedliche Leistungsphasen. Tiefe Vergleiche liefern [Etablierte Anbieter](/okf/research/market/established-vendors.md), [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md) und [Marktüberblick](/okf/research/market/overview.md).

## Relevanz für unser Projekt

**Muss-Anforderungen (abgeleitet aus dem, was NOVA im Business-Paket verlangt):**
1. Die vollständige Kette für LPH 6–8: LV-Erstellung, Ausschreibung, Preisspiegel mit Auswertungen, Vergabe, Aufträge, Nachträge, Aufmaß, Rechnungsprüfung mit Einbehalten und Skonto, Soll-Ist-Vergleich, Kostenverfolgung nach DIN 276. Ohne LPH 8 ist kein Wechsel möglich, denn genau dafür zahlt der Freund den Business-Aufpreis [1][39].
2. GAEB DA XML 3.3: Import und Export der Phasen 81–86, dazu X31 bzw. DA11 (Aufmaß) und X51 (Kosten). Auch GAEB 90 bzw. 2000 sollte importierbar sein, weil Bieter und Behörden noch Altformate liefern [32][33].
3. Ein Bieterzugang im Browser, kostenlos für Bieter, mit Fristen, Rückfragen und Angebotsöffnung nach dem Vier-Augen-Prinzip. NOVA-Kunden halten das für ein Kernmerkmal [45][15]. Für öffentliche Verfahren genügt anfangs ein sauberer GAEB-Export zur e-Vergabe-Plattform des Auftraggebers.
4. E-Rechnung (XRechnung/ZUGFeRD), weil öffentliche Auftraggeber sie verlangen [36].
5. Mehrbenutzerbetrieb mit Rollen, ohne künstliche Lizenzgrenzen.

**Differenzierungschancen (Einschätzung):**
- **Keine Gebühr je Nutzer oder Funktion:** Alle Module für alle. Bezahlt wird höchstens Hosting oder Support. Das trifft direkt die Strukturprobleme aus Abschnitt 7–9.
- **Datensouveränität:** Ein vollständiger Export in einem offenen Format (z. B. Projektarchiv als ZIP mit JSON, GAEB und PDF), keine Rechteabtretung an Positionen, keine Löschfrist, Selbstbetrieb möglich.
- **Preisstabilität und Planbarkeit:** Keine Monetarisierung erst kostenlos angebotener Betas.
- **Migrationswerkzeug von NOVA:** Per REST-API (78 Pfade/108 Operationen, OAuth2) und GAEB lässt sich ein Import-Assistent bauen [44][33]. Er muss *während* eines aktiven Abos laufen, weil nach Laufzeitende kein Zugriff mehr besteht [26]. Das wäre ein starkes Wechselargument.
- **Archivtauglichkeit:** Langfristige, lesbare Projektarchive für Gewährleistungs- und Aufbewahrungsfristen.

**Risiken:**
- **Funktionstiefe:** NOVA wird seit über zehn Jahren entwickelt (Preisseiten ab 2016 [52]), mit HOAI, BIM, Terminplanung und KI. Der Umfang darf nicht unterschätzt werden. Das MVP sollte auf LPH 6–8 ohne BIM fokussieren.
- **Textbibliotheken:** Für STLB-Bau oder DBD sind Verträge und Lizenzen mit den Rechteinhabern nötig [37]. Siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) und [Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).
- **Glaubwürdigkeit bei GAEB:** NOVA wirbt mit einer GAEB-Zertifizierung [22]. Die Urkunden für GAEB DA XML 3.3 (AVA, Bauausführung) waren aber nur bis 10.10.2026 gültig; eine Erneuerung ist nicht belegt [72]. Eine eigene Zertifizierung kostet Geld und Aufwand. Die Alternative sind gründliche Tests gegen Referenzdateien; siehe [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md).
- **Haftung und Rechenfehler:** Fehler bei Rechnungsprüfung oder Preisspiegel haben finanzielle Folgen. Open-Source-Lizenzen schließen die Haftung weitgehend aus. Ein gehosteter Dienst bräuchte eigene AGB, AVV und Sicherheitsnachweise: 2FA, Backups mit definierter Wiederherstellungszeit, Penetrationstest. Das ist der Maßstab, den NOVA setzt [22].
- **Abhängigkeit vom Freund als einzigem Fachnutzer:** Anforderungen sollten früh mit weiteren Büros gespiegelt werden; siehe [Schmerzpunkte](/okf/research/market/pain-points.md).

**Grobe Aufwandsschätzung für den Kern** (Einschätzung, Personenmonate für eine erfahrene Person; zur Kalibrierung, nicht als Zusage):

| Baustein | Aufwand |
|---|--:|
| LV-Editor mit GAEB X81/X83/X84/X86 und Preisspiegel | 4–8 |
| Bieterportal (Zugänge, Fristen, Öffnung) | 2–4 |
| LPH 8 (Aufträge, Nachträge, Aufmaß/X31, Rechnungsprüfung, Soll-Ist) | 6–12 |
| Kostenplanung DIN 276 und Kostenanalyse | 2–4 |
| Migrationsimport aus NOVA (API und GAEB) | 0,5–1 |

**Abgleich (09.11.2026):** Andere Notizen schätzen ähnliche Umfänge deutlich anders: LPH 8 allein 4–12,5 PM, die vollständige LPH 6–8 zwischen 9 und 35 PM, GAEB-Import/-Export zwischen 1 und 4 PM. Der Umfang (Bieterportal, Kostenplanung, Rechte, Berichte, Zertifizierungsreife, E-Rechnungs-Import) erklärt das nur teilweise. Die Werte hier sind daher nur grobe Orientierung (widersprüchlich - siehe Offene Fragen). Gegenüberstellung aller Schätzungen: [Schmerzpunkte, Aufwandsschätzung](/okf/research/market/pain-points.md).

Bestehende Projekte, die sich wiederverwenden lassen, sammelt [Open-Source-Landschaft](/okf/research/open-source/existing-projects.md).

## Offene Fragen

**An den Architekten-Freund:**
1. Welches Paket, wie viele Lizenzen, welche Add-ons nutzt er? Zahlt er monatlich oder jährlich? Wie hoch ist seine Rechnung heute, und wie hoch wird sie ab Februar 2027?
2. Welche Funktionen nutzt er wirklich: BIM, Terminplanung, das neue HOAI-Modul, Baudokumentation, NEO, SmartPool, Auktionen?
3. Was ist neben dem Preis „nicht ausreichend“? Etwa Druckbilder, GAEB-Probleme mit Bietern, Geschwindigkeit, fehlende Funktionen, Bedienung, Support?
4. Arbeiten Kollegen oder Mitarbeitende gleichzeitig? Reicht das Floating-Modell, oder stören die Sperre nach 2 Stunden und belegte Lizenzen?
5. Nutzt er STLB-Bau, DBD oder Heinze, und mit eigenem Abo?
6. Wie schreibt er öffentlich aus: über welche e-Vergabe-Plattformen und mit welchen Formaten?
7. Wie lange muss er Projektdaten verfügbar halten? Reicht ein Export, oder braucht er weiterhin Lesezugriff?
8. Würde er für Hosting oder Support einer Open-Source-Lösung zahlen, und in welcher Größenordnung?

**Nicht gefunden oder nicht verifizierbar:**
- Belegen externe Beteiligte (Bieter, Lieferanten, Auftragnehmer) und reine API-Benutzer eine Floating-Lizenz?
- Gilt der Jahresrabatt von 10 % auch für die Add-on-Preise ab 01.02.2027? Steigt Auktionen tatsächlich auf 40 €?
- Exakte Beträge für 3- und 6-Monats-Laufzeiten (Rundung).
- Welche AGB gelten heute? Die veröffentlichte Fassung ist von April 2020. Ist das SLA (99,8 %) Vertragsbestandteil?
- Gibt es einen aktualisierten AVV, der die Infrastruktur von NEO und die MCP-Funktion abdeckt?
- Status und Preis des Add-ons E-Signaturen (nicht mehr auf der Preisliste, aber im Handbuch).
- Was geschieht mit den Daten nach Ablauf der 12 Monate? Gibt es eine kostenpflichtige Verlängerung? Die Handbuchartikel widersprechen sich (12 Monate gegen unbegrenzt).
- Speichergrenzen, Preise für Schulungen und Onboarding, offizielle Systemvoraussetzungen.
- Gibt es noch ein On-Premise-Angebot auf Anfrage?
- Geklärt (09.11.2026): Die Preisgeschichte ist lückenlos belegt, 49/69/89 € ab 01.07.2017 [67] und 49/79/109 € ab 01.05.2022 [66].
- Welche Fassung des BIM-LV-Containers NOVA schreibt: die zurückgezogene DIN SPEC 91350 (Add-on-Seite) oder DIN 18290-2:2023-11? Das Handbuch nennt nur das Dateiformat `.mmc` [6][71]. Wichtig für Interoperabilitätstests mit ORCA und CaliforniaX.
- Ist die GAEB-3.3-Zertifizierung nach dem 10.10.2026 erneuert worden? Die BVBS-Liste führt „NOVA AVA 4“ ohne Daten weiter [72].
- Teilweise geklärt (09.11.2026): Eine allgemeine Pflicht zu EU-Hauptsitz oder Selbstbetrieb ist nicht belegt; belegt sind der BSI-Mindeststandard „Externe Cloud-Dienste“ für Cloud-Software von Auftragnehmern im bayerischen Bundesbau und die VS-NfD-Regeln [73]. Offen: Kann NOVA die Erfüllung dieses Mindeststandards nachweisen? Ein eigenes C5-Testat hat NOVA nicht, es verweist auf die Zertifikate von AWS [21][22].
- Aufwandsschätzungen abgleichen: Die Notizen nennen für gleiche Umfänge Werte, die um den Faktor 2–3 auseinanderliegen (Gegenüberstellung in [Schmerzpunkte](/okf/research/market/pain-points.md)). Offen ist eine gemeinsame Bottom-up-Schätzung mit einheitlichem Umfang, einheitlicher Einheit (1 PM ≈ 4 PW ≈ 20 PT) und klaren Annahmen.
- Preisangaben auf Capterra, GetApp und OMR wurden nicht geprüft, weil das Suchbudget dieses Rechercheauftrags erschöpft war.

## Quellen

[1] Preise – Pakete und Laufzeiten - NOVA AVA (nova-ava.de) - https://nova-ava.de/preise/ - Art: Herstellerangabe - abgerufen 2026-11-09
[2] NOVA AVA Preisanpassungen 2026: Tarife ab 1. Mai (18.02.2026) - NOVA AVA - https://nova-ava.de/nova-ava-preisanpassungen-2026-tarife-ab-1-mai/ - Art: Herstellerangabe - abgerufen 2026-11-09
[3] Einheitliches Preismodell für Add-ons ab 1.2.2027 (29.10.2026) - NOVA AVA - https://nova-ava.de/neues-preismodell-nova-ava-add-ons/ - Art: Herstellerangabe - abgerufen 2026-11-09
[4] Funktionen (Übersicht) - NOVA AVA - https://nova-ava.de/funktionen/ - Art: Herstellerangabe - abgerufen 2026-11-09
[5] Funktionen: Add-ons - NOVA AVA - https://nova-ava.de/funktionen/add-ons/ - Art: Herstellerangabe - abgerufen 2026-11-09
[6] Add-on BIM - NOVA AVA - https://nova-ava.de/add-ons/bim/ - Art: Herstellerangabe - abgerufen 2026-11-09
[7] Add-on Lieferantenmanagement - NOVA AVA - https://nova-ava.de/add-ons/lieferantenmanagement/ - Art: Herstellerangabe - abgerufen 2026-11-09
[8] NEO – die Baukosten-KI in NOVA AVA - NOVA AVA - https://nova-ava.de/neo-baukosten-ki/ - Art: Herstellerangabe - abgerufen 2026-11-09
[9] Neues HOAI-Modul – kostenlos in NOVA AVA (27.10.2026) - NOVA AVA - https://nova-ava.de/neues-hoai-modul-in-nova-ava/ - Art: Herstellerangabe - abgerufen 2026-11-09
[10] Neue BIM-Technologie und HOAI Add-on in NOVA AVA (26.10.2026) - NOVA AVA - https://nova-ava.de/neue-bim-technologie-und-hoai/ - Art: Herstellerangabe - abgerufen 2026-11-09
[11] Terminplan als Fokus im Update Oktober 2026 (07.10.2026) - NOVA AVA - https://nova-ava.de/terminplan-update-oktober-2026/ - Art: Herstellerangabe - abgerufen 2026-11-09
[12] BIM World 2026 – NOVA präsentiert NEO die Baukosten-KI & mehr (Pressemitteilung, 29.10.2026) - NOVA AVA - https://nova-ava.de/bim-world-2026-nova-praesentiert-neo/ - Art: Herstellerangabe/Presse - abgerufen 2026-11-09
[13] Vorteile (sieben Gründe) - NOVA AVA - https://nova-ava.de/entdecken/vorteile/ - Art: Herstellerangabe - abgerufen 2026-11-09
[14] Kunden - NOVA AVA - https://nova-ava.de/unternehmen/kunden/ - Art: Herstellerangabe - abgerufen 2026-11-09
[15] Erfahrungen (vom Hersteller ausgewählte Testimonials) - NOVA AVA - https://nova-ava.de/erfahrungen/ - Art: Herstellerangabe - abgerufen 2026-11-09
[16] Forschung und Lehre - NOVA AVA - https://nova-ava.de/unternehmen/forschung-und-lehre/ - Art: Herstellerangabe - abgerufen 2026-11-09
[17] Kostenlos testen (ohne Kreditkarte) - NOVA AVA - https://nova-ava.de/kostenlos-testen/ - Art: Herstellerangabe (nur gelesen, kein Konto angelegt) - abgerufen 2026-11-09
[18] Allgemeine Geschäftsbedingungen (Stand: April 2020) - NOVA Building IT GmbH - https://nova-ava.de/agb/ - Art: Primärquelle (Vertragsbedingungen) - abgerufen 2026-11-09
[19] Datenschutzerklärung (Website) - NOVA AVA - https://nova-ava.de/datenschutz/ - Art: Primärquelle - abgerufen 2026-11-09
[20] Unser Commitment (SLA, FAQ Informationssicherheit, AVV, Pentest) - NOVA AVA - https://nova-ava.de/unternehmen/commitment/ - Art: Herstellerangabe - abgerufen 2026-11-09
[21] NOVA AVA – Service Level Agreement (PDF) - NOVA BUILDING IT GmbH - https://nova-ava.de/wp-content/uploads/NOVA-AVA-SLA.docx.pdf - Art: Primärquelle (Herstellerdokument) - abgerufen 2026-11-09
[22] Fragen und Antworten zur Informationssicherheit von NOVA AVA (PDF) - NOVA BUILDING IT GmbH - https://nova-ava.de/wp-content/uploads/NOVA-AVA-FAQ-Informationssicherheit.pdf - Art: Herstellerangabe - abgerufen 2026-11-09
[23] Auftragsverarbeitungsvertrag, Stand 15.05.2025 (PDF) - NOVA BUILDING IT GmbH - https://nova-ava.de/wp-content/uploads/NOVA_AVV_2025-05-15.pdf - Art: Primärquelle (Vertragsdokument) - abgerufen 2026-11-09
[24] Impressum - NOVA AVA - https://nova-ava.de/impressum/ - Art: Primärquelle - abgerufen 2026-11-09
[25] Handbuch: Abonnement anpassen und verwalten (Stand 09.09.2026) - NOVA AVA Handbuch (handbuch.avanova.de → manual.avanova.io) - https://manual.avanova.io/articles/abonnement-anpassen-und-verwalten - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[26] Handbuch: Abonnement kündigen und pausieren (Stand 09.09.2026) - NOVA AVA Handbuch - https://manual.avanova.io/articles/abonnement-kuendigen-und-pausieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[27] Handbuch: Dein Abonnement in NOVA AVA – vom Testkonto zur Produktlizenz (Stand 10.09.2026) - NOVA AVA Handbuch - https://manual.avanova.io/articles/dein-abonnement-in-nova-ava-vom-testkonto-zur-produktlizenz - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[28] Handbuch: NOVA AVA-Abonnement und Rechnungen verwalten (Stand 31.08.2026) - NOVA AVA Handbuch - https://manual.avanova.io/articles/nova-ava-abonnement-und-rechnungen-verwalten - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[29] Handbuch: Sitzungsverwaltung und automatische Abmeldung von Benutzern - NOVA AVA Handbuch - https://manual.avanova.io/articles/sitzungsverwaltung-und-automatische-abmeldung-von-benutzern - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[30] Handbuch: Benutzer und Admin-Rollen verwalten - NOVA AVA Handbuch - https://manual.avanova.io/articles/benutzer-und-admin-rollen-verwalten - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[31] Handbuch: Anmelde- und Sicherheitseinstellungen konfigurieren - NOVA AVA Handbuch - https://manual.avanova.io/articles/anmelde-und-sicherheitseinstellungen-konfigurieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[32] Handbuch: Leistungsverzeichnisse importieren - NOVA AVA Handbuch - https://manual.avanova.io/articles/leistungsverzeichnisse-importieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[33] Handbuch: GAEB-Dateien exportieren und Austauschphasen festlegen - NOVA AVA Handbuch - https://manual.avanova.io/articles/gaeb-dateien-exportieren-und-austauschphasen-festlegen - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[34] Handbuch: Dokumente als PDF drucken und Dateien exportieren - NOVA AVA Handbuch - https://manual.avanova.io/articles/dokumente-als-pdf-drucken-und-dateien-exportieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[35] Handbuch: CSV-Dateien exportieren - NOVA AVA Handbuch - https://manual.avanova.io/articles/csv-dateien-exportieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[36] Handbuch: Elektronische Rechnungen exportieren - NOVA AVA Handbuch - https://manual.avanova.io/articles/elektronische-rechnungen-exportieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[37] Handbuch: Textspeicher und externe Ausschreibungstextsysteme konfigurieren - NOVA AVA Handbuch - https://manual.avanova.io/articles/textspeicher-und-ausschreibungstextsysteme-konfigurieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[38] Handbuch: Integration externer Dienste und E-Signaturen - NOVA AVA Handbuch - https://manual.avanova.io/articles/integration-externer-dienste-und-e-signaturen - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[39] Handbuch: LV-Typen und Standardeinstellungen verwalten - NOVA AVA Handbuch - https://manual.avanova.io/articles/lv-typen-und-standardeinstellungen-verwalten - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[40] Handbuch: Leistungsverzeichnisse, Kostenplanungen und Terminpläne archivieren - NOVA AVA Handbuch - https://manual.avanova.io/articles/leistungsverzeichnisse-archivieren - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[41] Handbuch: Projektdokumente und Dokumente zu Leistungsverzeichnissen - NOVA AVA Handbuch - https://manual.avanova.io/articles/projektdokumente-und-leistungsverzeichnis-archive-verwalten - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[42] Handbuch: Auftragnehmern Zugang zur Leistungserfassung freischalten - NOVA AVA Handbuch - https://manual.avanova.io/articles/auftragnehmern-zugang-zur-leistungserfassung-freischalten - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[43] Handbuch: NOVA AVA kennenlernen und erste Schritte - NOVA AVA Handbuch - https://manual.avanova.io/articles/nova-ava-kennenlernen-und-erste-schritte - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[44] NOVA AVA REST API, OpenAPI-Spezifikation v1.4.3 - NOVA BUILDING IT GmbH - https://api.avanova.de/v1/docs (Spezifikation: https://api.avanova.de/v1/openapi.json) - Art: Primärquelle (API-Dokumentation) - abgerufen 2026-11-09
[45] Funktionen: Ausschreibung und Vergabe - NOVA AVA - https://nova-ava.de/funktionen/ausschreibung-und-vergabe/ - Art: Herstellerangabe - abgerufen 2026-11-09
[46] Funktionen: Abrechnung - NOVA AVA - https://nova-ava.de/funktionen/abrechnung/ - Art: Herstellerangabe - abgerufen 2026-11-09
[47] Funktionen: Bautagebuch und Baudokumentation (beta) - NOVA AVA - https://nova-ava.de/funktionen/bautagebuch-und-baudokumentation/ - Art: Herstellerangabe - abgerufen 2026-11-09
[48] Funktionen: NOVA SmartPool - NOVA AVA - https://nova-ava.de/funktionen/nova-smartpool/ - Art: Herstellerangabe - abgerufen 2026-11-09
[49] Support für Nicht-Kunden (Servicegebühr) - NOVA AVA - https://nova-ava.de/support-gast/ - Art: Herstellerangabe - abgerufen 2026-11-09
[50] NOVA AVA Online Webinare November 2026 (28.10.2026) - NOVA AVA - https://nova-ava.de/nova-ava-online-webinare-november-2026-jetzt-live/ - Art: Herstellerangabe - abgerufen 2026-11-09
[51] Produktinformation NOVA AVA BIM 5D (Q&A, PDF, 11/2023; Original nicht mehr online) - NOVA Building IT GmbH - http://web.archive.org/web/20240723201344/https://avanova.de/wp-content/uploads/2023/11/NOVA-AVA-QA-Produktinfo.pdf - Art: Herstellerangabe (Archivkopie) - abgerufen 2026-11-09
[52] Pakete & Preise, Archivkopie vom 27.04.2016 - avanova.de via Internet Archive - https://web.archive.org/web/20160427230400/https://avanova.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[53] Pakete & Preise, Archivkopie vom 05.06.2017 - avanova.de via Internet Archive - https://web.archive.org/web/20170605213716/https://avanova.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[54] AVA Pakete & Preise, Archivkopie vom 22.08.2019 - avanova.de via Internet Archive - https://web.archive.org/web/20190822185905/https://avanova.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[55] AVA Pakete & Preise, Archivkopie vom 16.05.2021 (inhaltsgleich noch am 28.07.2021) - avanova.de via Internet Archive - https://web.archive.org/web/20210516004734/https://avanova.de/preise - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[56] AVA Pakete & Preise, Archivkopie vom 27.01.2023 - avanova.de via Internet Archive - https://web.archive.org/web/20230127134009/https://avanova.de/preise - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[57] Pakete & Preise inkl. FAQ, Archivkopie vom 29.11.2023 - avanova.de via Internet Archive - https://web.archive.org/web/20231129194242/https://avanova.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[58] Pakete & Preise, Archivkopie vom 02.11.2024 (BIM 40 € ab 1.1.2025) - avanova.de via Internet Archive - https://web.archive.org/web/20241102021451/https://avanova.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[59] Pakete & Preise, Archivkopie vom 21.01.2025 - avanova.de via Internet Archive - https://web.archive.org/web/20250121115849/https://avanova.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[60] Preise, Archivkopie vom 12.06.2025 - nova-ava.de via Internet Archive - https://web.archive.org/web/20250612162732/https://nova-ava.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[61] Preise, Archivkopie vom 09.12.2025 - nova-ava.de via Internet Archive - https://web.archive.org/web/20251209141058/https://nova-ava.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[62] Preise, Archivkopie vom 20.04.2026 (Ankündigung der Mai-Preise, 12-Monats-Datenhaltung) - nova-ava.de via Internet Archive - https://web.archive.org/web/20260420194037/https://nova-ava.de/preise/ - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[63] ORCA AVA Abo-Preise - ORCA Software GmbH - https://www.orca-ava.de/preise/ - Art: Herstellerangabe (Wettbewerber) - abgerufen 2026-11-09
[64] CaliforniaX Lizenzmodelle - G&W Software AG - https://www.gw-software.de/california/lizenzmodelle - Art: Herstellerangabe (Wettbewerber) - abgerufen 2026-11-09
[65] Handbuch: DSGVO-Konfiguration und Datenschutz - NOVA AVA Handbuch - https://manual.avanova.io/articles/dsgvo-konfiguration-und-datenschutz - Art: Primärquelle (Handbuch) - abgerufen 2026-11-09
[66] Newsletter „Preisanpassung ab 01.05.2022“ (Starter 49 €, Easy 79 €, Business 109 € netto je User und Monat), Archivkopie vom 01.07.2022 - avanova.de via Internet Archive - https://web.archive.org/web/20220701230018/https://avanova.de/newsletter-archiv/NOVA%20AVA%20Preisanpassung%20ab%2001.05.2022.html - Art: Herstellerangabe (archiviert) - abgerufen 2026-11-09
[67] Nova Ava Updates 2017 (neue Paketpreise 49/69/89 € ab 01.07.2017) - NOVA AVA - https://nova-ava.de/nova-ava-updates-2017/ - Art: Herstellerangabe - abgerufen 2026-11-09
[68] 4 neue Tools für LP8 – so funktionieren sie! (03.12.2025; Beta kostenlos für alle Pakete) - NOVA AVA - https://nova-ava.de/neue-tools-fuer-lp8/ - Art: Herstellerangabe - abgerufen 2026-11-09
[69] BIM World Munich 2025 – die Wahrheit über BIM und AVA (07.10.2025; Premiere der LPH-8-Werkzeuge am 26.11.2025) - NOVA AVA - https://nova-ava.de/bim-world-munich-2025-baukostenmanagement/ - Art: Herstellerangabe - abgerufen 2026-11-09
[70] AVA Pakete & Preise, Archivkopie vom 23.10.2019 („dedizierte Cloud-Server in Deutschland“, kein Anbieter genannt) - avanova.de via Internet Archive - https://web.archive.org/web/20191023041656/https://avanova.de/preise - Art: Primärquelle (archivierte Herstellerseite) - abgerufen 2026-11-09
[71] DIN SPEC 91350:2016-11 (zurückgezogen, ersetzt durch DIN 18290-1:2023-11 und DIN 18290-2:2023-11) - DIN Media - https://www.dinmedia.de/en/technical-rule/din-spec-91350/263151122 - Art: Primärquelle (Normenkatalog) - abgerufen 2026-11-09
[72] BVBS-Zertifikate GAEB DA XML 3.3 „AVA“ (Nr. 15/2021) und „Bauausführung“ (Nr. 16/2021) für NOVA AVA 4, ausgestellt 11.10.2021, gültig bis 10.10.2026 - NOVA Building IT GmbH / BVBS - https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_AVA_3.3_202110.pdf und https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_Bauausfg_3.3_202110.pdf - Art: Primärquelle (Zertifikat) - abgerufen 2026-11-09
[73] VHF Bayern VI.23.0 – Richtlinie Informationssicherheit (Stand 05/2026), § 3.2–3.3: BSI-Mindeststandards, bei Cloud-Software „Externe Cloud-Dienste“, Umsetzungsbestätigung; VS-NfD mit Selbstakkreditierung - Bayerisches Staatsministerium für Wohnen, Bau und Verkehr - https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-23-0_richtlinie-info-sichh-anl-meldung-vorkommnis_0526.pdf - Art: Primärquelle (Vertragsanlage) - abgerufen 2026-11-09
