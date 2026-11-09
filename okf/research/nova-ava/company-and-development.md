---
type: Research Note
title: "NOVA AVA: Unternehmen, Geschichte, Produktentwicklung und Roadmap"
description: "Wer hinter NOVA AVA steht, wie sich Firma und Produkt von ARCHITEXT (1985) über die Ausgründung 2014 bis zur Fusion 2026 entwickelt haben, wohin die Roadmap geht (KI, LPH 8, HOAI) und was daraus für Preise, Lock-in und unser Open-Source-Projekt folgt."
resource: https://nova-ava.de/unternehmen/
tags: [research, nova-ava, wettbewerb, unternehmensgeschichte, roadmap, preisentwicklung]
timestamp: 2026-11-09T17:16:17Z
sources: 84
confidence: mittel
---

# NOVA AVA: Unternehmen, Geschichte, Produktentwicklung und Roadmap

> **Lesehinweis:** Diese Notiz beschreibt die *Firma* und die *Entwicklungsgeschichte* hinter NOVA AVA. Funktionen im Detail,
> Preise im Detail, API und Nutzerkritik stehen in den Schwesternotizen:
> [Produkt & Preise](/okf/research/nova-ava/product-and-pricing.md) ·
> [Handbuch & Workflows](/okf/research/nova-ava/manual-and-workflows.md) ·
> [API & Datenmodell](/okf/research/nova-ava/api-and-data-model.md) ·
> [Nutzerstimmen](/okf/research/nova-ava/user-feedback.md).
> Kennzeichnung: „laut Hersteller“ = Selbstauskunft von NOVA; „Einschätzung:“ = eigene Bewertung. Alle Preise netto zzgl. MwSt.

## Kurzfassung

- **Kein Start-up aus dem Nichts:** NOVA AVA kommt aus dem Umfeld der **ARCHITEXT Software GmbH** in Mühltal bei Darmstadt, die seit **1985** AVA-Software entwickelt (heute Windows-Desktop-Produkt „Pallas“). 2014 wurde die **NOVA Building IT GmbH** als Ausgründung und **100-%-Tochter** gegründet, um eine reine Browser-Anwendung zu bauen [4][6][7].
- **Fusion 2026:** Rückwirkend zum 01.01.2026 und offiziell seit **01.09.2026** sind Mutter und Tochter **verschmolzen**. Das Gesamtunternehmen heißt jetzt **NOVA BUILDING IT GmbH** (Amtsgericht Darmstadt, **HRB 4686**, die Registernummer der früheren ARCHITEXT) und führt zwei Produktlinien: ARCHITEXT Pallas (Desktop) und NOVA AVA (Cloud) [5][3][8].
- **Klein und inhabergeführt:** Gründer und Geschäftsführer sind Felix Grau und Sven Walter. Die Website nennt 13 Personen, das Firmenprofil „knapp 20 Mitarbeiter“, ein Stellenportal 10–24 Beschäftigte und 1–5 Mio. € Umsatz [1][4][44][64]. Hinweise auf Investoren gibt es keine. Gesellschafter und Bilanzen konnten nicht verifiziert werden.
- **Zwölf Jahre Ausbau:** Release 1 im Juni 2014 → REST-API 2015 → BIM-Add-on 2017/18 → Terminplanung 2019 → Aufmaß-App und Preisdatenbank „SmartPool“ 2020 → Auktionen 2021 → Kalkulation und Procore-Anbindung 2022 → neue Oberfläche und neue Domain **nova-ava.de** am 10.05.2025 → Baudokumentation für die Bauüberwachung (Beta) ab Ende 2025 → **KI „NEO“** und **HOAI-Modul** 2026 [11]–[35].
- **Preise steigen deutlich:** Paketpreise pro Lizenz und Monat: 2016 **29/49/69 €** → ab 07/2017 **49/69/89 €** → ab 05/2022 **49/79/109 €** → ab 05/2026 **49/89/129 €** (Starter/Easy/Business). Ab **01.02.2027** kosten alle Add-ons einheitlich **40 €**. Die Terminplanung verdoppelt sich damit, und die bisher kostenlosen Betas Baudokumentation, HOAI und NEO-MCP werden kostenpflichtig [47][14][78][23][24][25].
- **Betrieb:** Das System läuft als SaaS bei **AWS in Frankfurt** (Container, Load Balancer, Deployment in einer einzigen Verfügbarkeitszone, SLA 99,8 %) auf einem PHP/SQL-Backend. Eine **eigene** Zertifizierung nach ISO 27001 oder BSI C5 hat NOVA nicht. Verwiesen wird auf die Zertifikate von AWS und auf Penetrationstests der secuvera GmbH (2016, 2020, 2025) [37][38][39][40][33].
- **Zertifikate teils abgelaufen (Stand 09.11.2026):** Die BVBS-Zertifikate für GAEB DA XML 3.3 („NOVA AVA 4“) waren bis **10.10.2026** gültig, das buildingSMART-Zertifikat für IFC2x3 bis **10.07.2021**. Eine Erneuerung war öffentlich nicht auffindbar [67][68][69].
- **Roadmap:** NEO ist eine KI auf Basis eines Open-Source-Sprachmodells mit eigenem „AI Hub“ in Frankfurt und soll **Anfang 2027** fertig sein. Zum 01.02.2027 sind eine Mittelabflussplanung und eine Baudoku-App angekündigt. Messen: BIM World (24.–25.11.2026) und BAU (11.–15.01.2027) [27][24][30][71].
- **Einschätzung:** NOVA baut sich von einer AVA-Software zu einer Plattform aus: Kostenmanagement, dann Bauüberwachung, dann Bürosteuerung mit HOAI, dann KI. Verdient wird über Add-ons. Für den Architekten-Freund heißt das: Die Kosten pro Arbeitsplatz steigen weiter, und die Bindung an NOVA wächst durch proprietäre Zusatzdaten (Preisdatenbank, Tickets, BIM-Verknüpfungen).

## Begriffe kurz erklärt

| Begriff | Erklärung (engl.) |
|---|---|
| AVA | **A**usschreibung, **V**ergabe, **A**brechnung. Software, mit der Planer Leistungsverzeichnisse erstellen, Angebote einholen und vergleichen, Aufträge vergeben und Rechnungen prüfen (*tendering, award, billing*). |
| Leistungsverzeichnis (LV) | Gegliederte Liste der Bauleistungen mit Positionen, Texten, Mengen und Preisen (*bill of quantities*). |
| GAEB DA XML | Austauschformat des Gemeinsamen Ausschusses Elektronik im Bauwesen. Die Datenarten („DA 81–86“) stehen für Projektphasen, etwa LV, Angebot und Auftrag. Details: [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) |
| BVBS | Bundesverband Software und Digitalisierung im Bauwesen (früher Bundesverband Bausoftware). Prüft und zertifiziert GAEB-Schnittstellen [66]. |
| IFC / buildingSMART | IFC ist das offene Datenmodell für BIM-Gebäudemodelle (ISO 16739). buildingSMART zertifiziert IFC-Schnittstellen. |
| BIM 5D | 3D-Gebäudemodell plus Zeit (4D) plus Kosten (5D). |
| SaaS | *Software as a Service*: Mietsoftware im Browser, die der Hersteller betreibt. |
| Floating-Lizenz | Abgerechnet wird die Zahl der **gleichzeitigen** Nutzungen, nicht die Zahl benannter Personen. |
| AVV | Auftragsverarbeitungsvertrag nach Art. 28 DSGVO (*data processing agreement*). Regelt die Datenverarbeitung durch den Anbieter und seine Unterauftragnehmer. |
| Verschmelzung | Zusammenschluss zweier Gesellschaften nach Umwandlungsgesetz. Eine Gesellschaft geht in der anderen auf (*merger*). |
| HRB | Handelsregister, Abteilung B (Kapitalgesellschaften wie GmbH). |
| LPH 8 | Leistungsphase 8 der HOAI: Objekt- bzw. Bauüberwachung, also Mängel, Bautagebuch, Aufmaß und Rechnungsprüfung. |
| HOAI | Honorarordnung für Architekten und Ingenieure. Grundlage für die Berechnung von Planerhonoraren. |
| MCP | *Model Context Protocol*. Offenes Protokoll, über das externe KI-Assistenten wie ChatGPT oder Claude Funktionen und Daten einer Anwendung nutzen können. |

## 1. Steckbrief

| Merkmal | Angabe (Stand 09.11.2026) | Quelle |
|---|---|---|
| Firma | NOVA BUILDING IT GmbH (bis 31.08.2026: ARCHITEXT Software GmbH als Mutter, NOVA Building IT GmbH als Tochter) | [5][3] |
| Sitz | In der Mordach 1a, 64367 Mühltal (Landkreis Darmstadt-Dieburg, Hessen) | [3] |
| Register | Amtsgericht Darmstadt, HRB 4686 | [3][5][8] |
| USt-IdNr. | DE 111 615 598 (laut Fusionsmitteilung unverändert) | [3][5] |
| Geschäftsführung | Felix Grau, Sven Walter (Gründer von NOVA, 2014) | [2][3] |
| Wurzeln | ARCHITEXT: AVA-Software seit 1985 (erst mobiles Aufmaßgerät und DOS, dann „Pallas“) | [7] |
| Gründung NOVA | 2014, Ausgründung („Spin-off“) und 100-%-Tochter der ARCHITEXT | [4][6] |
| Produkte | NOVA AVA (Cloud-SaaS), ARCHITEXT Pallas (Windows-Desktop), NOVA SmartPool (Text- und Preisdatenbank), NOVA Aufmaß-App, NOVA GAEB-Service (kostenloser Online-Viewer und Konverter) | [5][65] |
| Mitarbeitende | „knapp 20“ (Firmenprofil), 13 namentlich auf der Website, 10–24 (Stellenportal) | [4][44][64] |
| Umsatz | Größenklasse 1–5 Mio. € (Selbstauskunft auf einem Stellenportal, undatiert) | [64] |
| Kunden | keine Zahl veröffentlicht; rund 69 Logos auf der Kundenseite | [43] |
| Verband | Mitglied im BVBS | [65] |
| Hosting | Amazon Web Services (AWS), Region Frankfurt | [37][39][74] |

## 2. Herkunft und Unternehmensentwicklung

### 2.1 ARCHITEXT Software GmbH (seit 1985)

- ARCHITEXT bezeichnet sich als Pionier der Bausoftware. Laut eigener Darstellung entwickelt und vertreibt die Firma seit 1985 AVA-Software, angefangen Mitte der 1980er mit dem „Mobilen Aufmaß Computer“ und einer DOS-Version, später folgte die Windows-Software **Pallas** [7].
- Pallas gibt es als „Professional“ und „Basic“ (Einzelplatz, Netzwerk) und gab es als „Pallas Online“ (SaaS) [9]. Belegte Versionen: 4.5 (10/2014), 5.0 (03/2016), 5.7 (08/2023), 6.0 (07/2024), **6.1 (09/2025)** [9]. Ein Software-Verzeichnis führt „Pallas 2.0“ als AVA für Auftraggeber unter Windows und Linux [10].
- Laut Hersteller hat ARCHITEXT viele öffentliche Referenzkunden, etwa Bauverwaltungen in Bayern und München, Flughafen München, die Verdingungsstelle der Stadt Mainz und das Rechnungsprüfungsamt Dresden, außerdem Industriekunden. Die Liste ist undatiert [7]. ARCHITEXT gibt an, in wichtigen Gremien vertreten zu sein (mit GAEB-Logo) [7].
- **Pallas Online wird eingestellt:** Neubuchungen sind nicht mehr möglich, Verlängerungen gab es nur bis 31.12.2025, und ab 01.01.2026 wird das Produkt nicht mehr angeboten. Bestandskunden sollen auf NOVA AVA wechseln und ihre Daten per GAEB oder DA11 übertragen [6][9].

### 2.2 Ausgründung der NOVA Building IT GmbH (2014)

- Felix Grau und Sven Walter gründeten 2014 die NOVA Building IT GmbH [2]. Sie war eine Ausgründung der ARCHITEXT [4][61][62] und laut ARCHITEXT eine **100-prozentige Tochter** [6].
- **Gründungsidee laut Hersteller (rückblickend, 2026):** Eine jahrzehntealte Desktop-Software nachträglich um BIM zu erweitern, ergebe keinen Sinn. Deshalb baute man eine neue Web-Anwendung, die dennoch rund 30 Jahre AVA-Erfahrung von ARCHITEXT mitbrachte [70]. Auf der Gründerseite steht als Motivation: mobiler, ortsunabhängig, ohne wochenlange Schulung [2].
- **Start (zwei Lesarten):** Laut Hersteller-Rückblick ging „Release 1“ am **30.06.2014** online [11]. Die Domain avanova.de ist seit 08/2013 archiviert und war im Mai 2014 passwortgeschützt, was zu einer geschlossenen Entwicklungsphase passt [48]. In der Fachpresse erschien die Produktvorstellung erst am **17.10.2015** [53], die Pressemitteilung zur „ersten echten online AVA Webanwendung“ im März 2017 [59].

### 2.3 Verschmelzung 2026

- ARCHITEXT ist mit Rückwirkung zum **01.01.2026** und offiziell seit dem **01.09.2026** mit ihrer Tochter NOVA BUILDING IT GmbH verschmolzen. Das Unternehmen firmiert seitdem als NOVA BUILDING IT GmbH. HRB 4686, USt-IdNr. und Bankverbindung bleiben, ebenso alle Verträge und Ansprechpartner. Es gibt zwei Geschäftsbereiche: Pallas (Desktop) und NOVA AVA (Cloud) [5].
- Die ARCHITEXT-Website nennt bereits NOVA BUILDING IT GmbH als Verantwortliche und spricht von der „NOVA BUILDING IT GmbH (ehemals ARCHITEXT Software GmbH)“ [7][8]. Die NOVA-Website nutzt dieselben Registerdaten [3].

```
bis 31.08.2026                              ab 01.09.2026 (rückwirkend zum 01.01.2026)
ARCHITEXT Software GmbH (HRB 4686) ──┐
  └─ 100 % NOVA Building IT GmbH  ───┴──▶ NOVA BUILDING IT GmbH (HRB 4686)
       (gegründet 2014)                       ├─ Geschäftsbereich ARCHITEXT Pallas (Windows-Desktop-AVA)
                                              └─ Geschäftsbereich NOVA AVA (Cloud-AVA)
```

**Einschätzung:** Die Mutter übernimmt den Namen der Tochter. NOVA AVA ist damit das strategische Kernprodukt, Pallas läuft als Bestandslinie weiter (Version 6.1 noch 09/2025). Für den Freund bedeutet die Fusion personelle und organisatorische Kontinuität. Über die finanzielle Stabilität sagt sie nichts, weil keine Bilanzdaten vorliegen.

## 3. Personen, Team und Eigentum

- **Geschäftsführung:** Felix Grau tritt als Presse- und Redaktionsverantwortlicher auf und wird in Pressemitteilungen als Geschäftsführer bzw. CEO zitiert [3][50][62]. Sven Walter ist ebenfalls Geschäftsführer. Eine Meldung von 2020 nennt ihn als Ansprechpartner [56], und das Impressum führt ihn für Gestaltung und Programmierung der Website [3].
- **Vertrieb und Marketing:** Seit 01.09.2023 ist Dr. Eberhard Stegner dafür verantwortlich. Er kam von Graphisoft Deutschland, wo er seit 2015 das operative Geschäft geführt hatte [49]. **Einschätzung:** Das stärkt den BIM- und CAD-Partnerkanal (Archicad).
- **Teamstruktur laut Website (2026):** 2 Geschäftsführer, 3 Entwicklung, 4 Support, 1 Training und Support, 1 Training und Beratung, 1 Vertrieb und Marketing, 1 Office, insgesamt 13 Personen [44]. Laut Hersteller kommt ein Netzwerk externer Fachleute für BIM und GAEB sowie BSI-zertifizierter Sicherheitsexperten hinzu [2][4].
- **Größenangaben:** Das Firmenprofil spricht von „knapp 20 Mitarbeitern“ [4]. Es ist undatiert, die PDF wurde aber mit einem Google-Docs-Renderer von etwa 2025 erzeugt (Einschätzung: Stand um 2025). Campusjäger nennt 10–24 Mitarbeitende, die Einordnung „Start-up“ und eine Umsatzklasse von 1–5 Mio. €. Die Anzeige verlangte PHP 7/8 [64].
- **Finanzierung und Eigentum:** Für Wagniskapital oder externe Investoren gibt es keine Belege. Bis 2025 war NOVA eine 100-%-Tochter der ARCHITEXT [6]. Wer an ARCHITEXT bzw. der fusionierten Gesellschaft beteiligt ist, ließ sich nicht klären: Northdata antwortete während der Recherche mit HTTP 429 (Abruf gesperrt).
- **Akademische Herkunft:** Für eine Hochschul-Ausgründung gibt es keine Belege. Die Seite „Forschung und Lehre“ beschreibt kostenlose Lehrlizenzen, laut Hersteller für mehr als 3.000 Studierende an 29 Hochschulen. Gelistet sind rund 36 Einrichtungen, darunter die TU Darmstadt (Institut für Baubetrieb), die TU München, die Ruhr-Universität Bochum, das BIM-Institut der Uni Wuppertal, die HCU und die HSU Hamburg sowie in Österreich die FH Salzburg und die HTBLA Hallstatt [42].

## 4. Produkt-Zeitleiste 2013–2027

| Zeitpunkt | Ereignis | Quelle |
|---|---|---|
| 1985 | ARCHITEXT beginnt mit AVA-Software (mobiles Aufmaß, DOS) | [7] |
| 08/2013 – 05/2014 | avanova.de erstmals archiviert; im Mai 2014 passwortgeschützt | [48] |
| 2014 | Gründung der NOVA Building IT GmbH als Spin-off der ARCHITEXT | [4] |
| 30.06.2014 | „Release 1“ online, gebaut mit SQL-Datenbank, PHP-Modulen und Ajax | [11] |
| 08–12/2014 | Mengenermittlung nach REB 23.003 mit D11-Schnittstelle; „Angebotscockpit“, in dem Bieter das LV ohne eigene Software im Browser bepreisen; Excel-Import; Dashboard; Modul Abrechnung | [11] |
| 2015 | STLB-Bau online (06/2015), Angebotseröffnung im Vier-Augen-Prinzip, Heinze-Texte, Datanorm-4.0-Import, **RESTful API** | [12] |
| 17.10.2015 | Fachpresse: „NOVA – AVA in der Cloud“; Pakete aus Ausschreibung, Vergabe, Abrechnung und Controlling, monatlich kündbar | [53] |
| 01/2016 | Preise Starter 29 €, Easy 49 €, Business 69 € je Nutzer und Monat; Server bei **Hetzner** (Nürnberg, Falkenstein); Installation im Kunden-Intranet auf Anfrage | [47] |
| 04/2016 | Oberfläche zusätzlich auf Englisch und Französisch | [13] |
| 10–11/2016 | Öffentliche Ausschreibung über Registrierungslink; ÖNORM; Druckdesigner; erster Sicherheitstest durch secuvera | [13] |
| 02/2017 (BAU) | Zertifizierung für GAEB XML 3.2; ÖNORM-Konformität; Testat eines BSI-zertifizierten Prüfers | [54] |
| 03/2017 | Rahmenverträge und Jahres-LVs | [14] |
| 01.07.2017 | **Erste Preiserhöhung** auf 49/69/89 € | [14] |
| 10/2017 | Nachtragsmanagement, Aufmaßerfassung, Vergleichsprojekte in der Kostenplanung | [14] |
| 12/2017 | BKI-Import; **BIM-Add-on als kostenlose Beta** (bis 15.03.2018) | [14] |
| 2018 | BIM-Add-on mit BCF, ÖNORM und 4D; BIM-LV-Container nach DIN SPEC 91350 (damals gültig; 2023 zurückgezogen und durch DIN 18290-1/-2:2023-11 ersetzt; ob NOVA heute die neue Fassung schreibt, ist offen (widersprüchlich - siehe Offene Fragen)) | [15][82][83] |
| 27.07.2018 | Open-BIM-Projekt mit Graphisoft: Archicad ab Version 22 → IFC → NOVA | [55] |
| 03.09.2018 | Exklusive Partnerschaft mit dem BDB-Landesverband Bayern (10 % Rabatt für Mitglieder) | [61] |
| 01/2019 | Terminplanung (Gantt) und BIM 5D als Beta | [16] |
| 06/2019 | Datenbank-Cluster und Load Balancer; Nominierung für den DETAIL Produktpreis 2019 | [16] |
| 11.07.2019 | buildingSMART-Zertifikat IFC2x3 Coordination View 2.0, Import | [69][16] |
| 09/2019 | EFB-Preisblätter 221–223, GAEB X51 für Kostenplanungen, Heinze Bauoffice und ausschreiben.de | [16] |
| 28.10.2019 | Platz 1 im Ranking „Construction Tech Consulting/Services Companies 2019“ eines US-Magazins | [62] |
| 02–05/2020 | Pentest durch secuvera (Web-App v3.0, API v1.2.1): „sehr hohes Sicherheitsniveau“ | [56][17] |
| 04/2020 | NOVA Aufmaß-App V1 (iOS, Android); **SmartPool** geht live | [17] |
| 07/2020 | Zwei-Faktor-Authentifizierung | [17] |
| 10–11/2020 | Add-on eSignatur (Adobe Sign, DocuSign); Aufmaß-App V2; Add-on Lieferantenmanagement mit Lieferantenportal | [17] |
| 02/2021 | BVBS bestätigt GAEB DA XML 3.2 für Version 4 | [18] |
| 03–04/2021 | Add-ons direkt im Kundenkonto buchbar; Add-on **inverse Auktionen** | [18] |
| 10/2021 | BVBS-Zertifikate für GAEB DA XML 3.3 (AVA, Bauausführung); IFC4 | [18][67][68] |
| 2022 | Admin-Rollen; Funktionen im Auftrag eines Stuttgarter Architekturbüros; Add-on Kalkulation (EKT, 09/2022) | [19] |
| 01.05.2022 | **Zweite Preiserhöhung** auf 49/79/109 € „nach 5 Jahren Laufzeit“; Add-on-Preise unverändert | [78] |
| 22.11.2022 | Partnerschaft mit **Procore** (Marketplace); NOVA als Executive Partner der BIM World | [50] |
| 03/2023 (BAU) | Terminplanung als Vollversion mit Bauablaufsimulation; **SmartPool V2** mit über 2,5 Mio. LV-Positionen | [51][20] |
| 01.09.2023 | Neuer Leiter Vertrieb und Marketing (vorher Graphisoft) | [49] |
| 2024 | Kostengruppen-Ansicht, Baubeschreibung, Bieterzugang ohne Passwort, preisindizierte Kennwerte eigener Projekte | [21][57] |
| 10/2024 | BIM-Add-on ab 01.01.2025 einheitlich 40 €; **Catenda-Hub-Integration** in beide Richtungen | [21] |
| 01–02/2025 | Pentest durch secuvera (Build v5.241212): „sehr hoch“ | [40][41] |
| 10.05.2025 | „Neue Version“ mit neuer Oberfläche, neuem Logo und neuer Website **nova-ava.de** | [22][58] |
| 04.07.2025 | Warnung vor Phishing-Mails, die als Einladungen zur Angebotsabgabe getarnt sind | [73] |
| 10–12/2025 | LPH-8-Werkzeuge (Tickets und Mängel, Pläne, Protokolle, Bautagebuch): am 07.10.2025 angekündigt, Premiere auf der BIM World am 26.11.2025, seit dem Beitrag vom 03.12.2025 als kostenlose Beta für alle Pakete freigeschaltet | [75][35] |
| 06.11.2025 | ARCHITEXT kündigt das Aus für Pallas Online zum 01.01.2026 an | [6] |
| 18.02.2026 | Preiserhöhung für Easy und Business ab 01.05.2026; Baudokumentation dort als „neu im Portfolio“ und bis Ende 2026 kostenlose Beta genannt (die Beta lief schon seit 12/2025) | [23][35] |
| 03/2026 | digitalBAU Köln: „NOVA goes AI“, NOVA AI Hub in der Alpha-Phase | [26][29] |
| 09.04.2026 | Ankündigung von **NEO** (Alpha; Beta etwa 08/2026; Go-live Anfang 2027) | [27] |
| 08/2026 | Single Sign-on (Microsoft, Google, OpenID Connect), Mailversand per OAuth2, XRechnung und ZUGFeRD, neue GAEB-X50/X51-Funktionen; API-Dokumentation pro Mandant | [34] |
| 01.09.2026 | Verschmelzung ARCHITEXT + NOVA (rückwirkend zum 01.01.2026) | [5] |
| 10/2026 | Terminplan mit Arbeitskalendern und Feiertagen (OpenHolidays); PHP-Sicherheitsupdate am 21.10.; neue BIM-Viewer-Technik (IFC 4.3); HOAI-Add-on als Beta (24.10.); NEO-Beta Phase 3 (26.10.) | [77][33][31][32] |
| 29.10.2026 | Einheitspreis von 40 € für Add-ons ab 01.02.2027 angekündigt | [24] |
| 24.–25.11.2026 | BIM World München, Stand 22, NEO live | [30][72] |
| 11.–15.01.2027 | BAU 2027, Halle C5, Stand 218 | [71] |

**Muster:** Laut News-Feed liefert NOVA seit 2014 fast monatlich Updates. Seit 2025 gibt es nummerierte Monats-Updates mit PDF-Dokumentation [76][34]. Neue Module starten meist als **kostenlose Beta** und werden später zum kostenpflichtigen Add-on: BIM 2017/18, Kalkulation 2022, Baudokumentation, HOAI und MCP 2025–2027 [14][19][24].

## 5. Namen, Versionen und Domains

| Zeitraum | Produktname | Quelle |
|---|---|---|
| 2014–2016 | „NOVA“ bzw. „NOVA AVA“ (Website-Titel 2016: „GAEB und AVA im Web“) | [53][47] |
| 2017–2018 | „NOVA AVA BIM“ | [55][61] |
| 2019–2023 | „NOVA AVA BIM 5D“, auch „NOVA BIM 5D“ | [62][49][63] |
| seit 05/2025 | wieder „NOVA AVA“, mit neuem Logo | [22] |

- **Versionen:** Laut Hersteller hat NOVA AVA „normalerweise keine Version“, sondern wird laufend aktualisiert [22]. Prüfberichte nennen trotzdem Versionen: Web-App 3.0 und API 1.2.1 (2020) [56], „NOVA AVA 4“ (GAEB-Zertifikate 2021) [67] und Build **v5.241212** (Pentest 2025) [40]. Einschätzung: Die Buildnummer kodiert vermutlich ein Datum (12.12.2024).
- **Domains (eigene Abrufe und DNS-Abfragen am 09.11.2026 [74]):**

| Domain | Rolle | Quelle |
|---|---|---|
| architext.de | Website von ARCHITEXT bzw. Pallas; im Archiv seit 1999 | [9][48] |
| avanova.de | Ursprüngliche Produktdomain (archiviert ab 08/2013). Heute laufen Login, API, Handbuch, Support-Mail und die Mandanten-Subdomains darüber (`[TENANT].avanova.de`). Web-Inhalte leiten auf nova-ava.de um. | [47][48][34][74] |
| nova-ava.de | Marketing-Website seit 10.05.2025 (WordPress); als Weiterleitung schon 12/2021 archiviert | [22][33][48] |
| avanova.io | Statusseite `health.avanova.io` | [45][74] |
| novabuilding.de | Firmendomain (info@novabuilding.de); leitet auf nova-ava.de um | [65][74] |
| ava-bausoftware.de | im ARCHITEXT-Impressum mit aufgeführt | [8] |

## 6. Geschäftsmodell und Preisentwicklung

Details zu Paketinhalten und Konditionen stehen in [Produkt & Preise](/okf/research/nova-ava/product-and-pricing.md). Hier geht es um das **Modell** und den **Trend**.

- **Abo-Modell:** Gemietet wird pro Lizenz und Monat. Seit mindestens 2016 gibt es drei Pakete (Starter, Easy, Business) [47][52]. Eine Pressemitteilung von 2017 sprach dagegen von vier Paketen [60]. Abgerechnet wird als **Floating-Lizenz** nach gleichzeitiger Nutzung [23]. Für längere Laufzeiten gibt es Rabatt: 5 % für 3 Monate, 7,5 % für 6 Monate, 10 % für 12 Monate [23][25]. Ohne aktives Abo speichert NOVA die Daten 12 Monate kostenlos [25].
- **Kostenlos sind:** Bieter und Lieferanten [17], Hochschulen und Studierende [42], ein 14-tägiger Test [1] und der Standard-Support (2016: „bleibt so“) [47]. Der KI-Assistent NEO ist laut Hersteller in allen Paketen enthalten [28].
- **Zusätzliche Erlösquellen:** Service- und Change-Requests rechnet NOVA nach Aufwand ab und ist nicht verpflichtet, Change-Requests umzusetzen [38]. Kunden können Funktionen beauftragen (Beispiel 2022) [19]. 2016 bot NOVA auch Installationen im Kunden-Intranet an [47]. Heute ist dazu nichts mehr zu finden.
- **Vertriebskanäle:** Rabatt für BDB-Mitglieder (2018) [61], Procore-Marketplace (2022) [50], Messen und Webinare, kostenlose Lizenzen für Hochschulen als Nachwuchskanal [42].

**Paketpreise je Lizenz und Monat (netto):**

| Stichtag | Starter | Easy | Business | Bemerkung | Quelle |
|---|---|---|---|---|---|
| 01/2016 | 29 € | 49 € | 69 € | je Nutzer, monatlich kündbar | [47] |
| ab 01.07.2017 | 49 € | 69 € | 89 € | erste Erhöhung; Begründung u. a. steigende Kosten für Hardware und Server | [14] |
| ab 01.05.2022 | 49 € | 79 € | 109 € | zweite Erhöhung „nach 5 Jahren Laufzeit“ (Newsletter des Herstellers); Begründung u. a. steigende Kosten für Hardware und Server-Infrastruktur; Add-on-Preise unverändert. Passt zur Aussage vom Februar 2026, die letzte Preisänderung liege vier Jahre zurück | [78][23] |
| ab 01.05.2026 | 49 € | 89 € | 129 € | Floating-Lizenz; Begründung u. a. gestiegene Cloud-Hosting-Kosten | [23][25] |
| Δ 2016 → 2026 | +69 % | +82 % | +87 % | eigene Berechnung | – |

**Add-ons je Nutzer und Monat (netto):**

| Add-on | bis 2024 | 11/2026 | ab 01.02.2027 | Quelle |
|---|---|---|---|---|
| BIM | je nach Paket unterschiedlich | 40 € (seit 01.01.2025) | 40 € | [21][25] |
| Terminplanung | – | 20 € | **40 €** | [25][24] |
| Kalkulation | 2022 bis Jahresende gratis | 40 € | 40 € | [19][25] |
| Lieferantenmanagement | – | 40 € | 40 € | [25] |
| Auktionen | – | 30 € | „jedes Add-on 40 €“, also implizit 40 € (nicht ausdrücklich genannt) | [25][24] |
| Baudokumentation | – | Beta gratis | **40 €** | [23][24] |
| HOAI | – | Beta gratis | **40 €** | [32][24] |
| NEO MCP Server | – | Beta gratis | **40 €** | [28][24] |

**Rechenbeispiel (Einschätzung, Preise ab 01.02.2027):** Eine Business-Lizenz mit BIM, Terminplanung, Baudokumentation und HOAI kostet 129 + 4 × 40 = **289 € im Monat**. Das sind 3.468 € im Jahr bei monatlicher Zahlung oder etwa 3.121 € bei 12 Monaten Laufzeit (−10 %). Zum Vergleich: Business allein kostete 2016 69 € im Monat, also 828 € im Jahr. Der Funktionsumfang ist seitdem stark gewachsen. Die Floating-Lizenz dämpft die Kosten, wenn sich mehrere Personen eine Lizenz zeitversetzt teilen.

**Widersprüchliche Botschaften:** Am 27.10.2026 erschien der Beitrag „Neues HOAI-Modul – kostenlos in NOVA AVA“ [32]. Zwei Tage später kündigte NOVA an, dass HOAI ab 01.02.2027 kostenpflichtig wird [24]. Ähnlich bei der KI: NEO ist inklusive [28], der Zugang externer KIs über MCP kostet dagegen 40 € pro Nutzer und Monat [24].

## 7. Markt- und Kundenaussagen

| Aussage (laut Hersteller) | Quelle | Einordnung |
|---|---|---|
| „erste und bisher einzige, reine Webanwendung für AVA und Controlling“ | [49][29][4] | Wird seit 2017 wiederholt. Einschätzung: Bei heutigen Cloud-Angeboten anderer Hersteller kaum haltbar, siehe [Cloud- und Nischenanbieter](/okf/research/market/cloud-and-niche-vendors.md). Außerdem bot ARCHITEXT selbst „Pallas Online“ als SaaS an [6]. |
| Zielgruppen: Architekten, Planer, Ingenieure, Projektmanager, Behörden; Hoch-, Tief-, Anlagen- und Landschaftsbau | [49][52] | Seit 2022 gibt es mit dem Kalkulations-Add-on auch ein Angebot für Bauausführende [25]. |
| Kunden: Architektur- und Ingenieurbüros, Wohnungsbaugesellschaften, DAX-Konzerne | [4][43] | Logos u. a. von Siemens, BMW, VW und Bayer sowie den Städten Bonn, Fürth und Calw. Eine Kundenzahl wird nicht genannt. |
| mehr als 3.000 Studierende an 29 Hochschulen | [42] | nicht überprüfbar |
| SmartPool: mehr als 2,5 Mio. LV-Positionen mit Marktpreisen, „größte deutschsprachige Bibliothek“ | [51][6] | Netzwerkeffekt aus den Kundendaten; laut Hersteller DSGVO-konform ohne Personenbezug [17] |
| Leitbild: „die weltbeste Baukosten-Software“ bauen | [1] | Werbeaussage |
| Platz 1 bei „Construction Tech Review“ 2019 | [62] | Methodik nicht öffentlich. Einschätzung: als Qualitätsnachweis wenig aussagekräftig. |
| Internationalisierung | [63][13] | 2023 als Ziel genannt. Es gibt Oberflächen auf Englisch und Französisch sowie ÖNORM für Österreich, aber keine Belege für nennenswerte Auslandsmärkte. |

## 8. Partnerschaften, Verband, Zertifikate, Auszeichnungen

| Partner | Art der Zusammenarbeit | seit | Quelle |
|---|---|---|---|
| Graphisoft (Archicad, Nemetschek-Gruppe) | Open-BIM-Projekt, gemeinsame Webinare | 2018 | [55][1] |
| Allplan, Autodesk (Revit), Vectorworks | Anleitungen für BIM-Workflows, Webinare | 2024–2026 | [1][76] |
| MH-Software | als Technologiepartner gelistet, ohne Details | ? | [1] |
| DBD (STLB-Bau online, DBD-BIM) | Ausschreibungstexte, BIM-Kostenelemente | 2015 | [12][19] |
| Heinze, sirAdos, ausschreiben.de, Datanorm | Text- und Produktdaten | 2015–2019 | [12][16][47] |
| BKI | Import von Kostenplanungen; das proprietäre BKI-XML entfällt seit 08/2026, Import nur noch über GAEB X51 | 2017 | [14][34] |
| Adobe Sign, DocuSign | Add-on eSignatur | 10/2020 | [17] |
| Catenda (Catenda Hub) | BIM- und BCF-Kollaboration in beide Richtungen | 10/2024 | [21] |
| Procore | Integration in den Marketplace | 11/2022 | [50] |
| BDB-Landesverband Bayern | exklusive Partnerschaft, Rabatt für Mitglieder | 09/2018 | [61] |
| secuvera GmbH | Penetrationstests | 2016, 2020, 2025 | [13][56][40] |
| OpenHolidays, ÖKOBAUDAT | offene Datenquellen (Feiertage, CO₂-Werte) | 2026 | [77][28] |

- **Verbände:** NOVA ist **BVBS-Mitglied** [65]. Eine Mitgliedschaft bei buildingSMART war nicht belegbar, nur das Zertifikat [69]. ARCHITEXT gibt an, in Gremien mitzuarbeiten (mit GAEB-Logo) [7].
- **Auszeichnungen:** Nominierung für den DETAIL Produktpreis 2019 [16], Ranking von Construction Tech Review 2019 [62].

**Zertifikate und Prüfungen:**

| Nachweis | Gegenstand | Datum | gültig bis | Quelle |
|---|---|---|---|---|
| GAEB DA XML 3.2 (BVBS) | AVA | 02/2017; für Version 4 erneuert 02/2021 | laut BVBS 5 Jahre ab Ausstellung | [54][18][66] |
| GAEB DA XML 3.3 „AVA“ (Prüfliste 15/2021) | NOVA AVA 4: LV-Import und -Export, Import von Prüfdateien, Vergabephase | 11.10.2021 | **10.10.2026** | [67] |
| GAEB DA XML 3.3 „Bauausführung“ (16/2021) | NOVA AVA 4 | 11.10.2021 | **10.10.2026** | [68] |
| buildingSMART IFC2x3 CV 2.0, Import | „NOVA AVA BIM“ | 11.07.2019 | **10.07.2021** | [69] |
| Penetrationstests (secuvera, BSI-Durchführungskonzept, OWASP) | Web-App und API | 11/2016; 02–05/2020; 07.01.–13.02.2025 | – | [13][56][40] |
| ISO 27001 / BSI C5 | Nur das Rechenzentrum (AWS) ist zertifiziert, nicht NOVA selbst | – | – | [36][37][38] |

Die BVBS-Liste führt „NOVA AVA 4“ weiter für AVA und Bauausführung, nennt aber keine Daten [66]. Die Sicherheits-FAQ von NOVA verlinkt die Urkunden von 2021 und das IFC-Zertifikat von 2019 [37]. **Einschätzung:** Wenn öffentliche Auftraggeber eine gültige GAEB-Zertifizierung verlangen, sollte der Freund bei NOVA nach einer aktuellen Urkunde fragen.

## 9. Technik und Betrieb (öffentlich sichtbar)

**Technologie**
- **Backend:** 2014 entstand NOVA mit SQL-Datenbank, PHP-Modulen und Ajax [11]. Eine Stellenanzeige verlangte PHP 7/8, SQL, HTML5, CSS3 und JavaScript; Frameworks waren nicht genannt [64]. Das PHP-Sicherheitsupdate vom 21.10.2026 zeigt, dass das Backend weiter auf PHP läuft [33].
- **Mandanten und API:** Eine REST-API gibt es seit 2015 [12]. Die API-Dokumentation liegt seit 08/2026 pro Mandant unter `https://[TENANT].avanova.de/api.php/v1/docs` [34]. Einschätzung: mandantenfähige Architektur mit einer Subdomain pro Kunde. Mehr in [API & Datenmodell](/okf/research/nova-ava/api-and-data-model.md).
- **Komponenten laut Statusseite:** Frontend (NOVA AVA, Kundenportal, Login Service), Backend (Datenbank, BIM-Datenbank, REST API) und Services (SmartPool, IFC Translation Service, GANTT Print Service, GANTT Conversion Service) [45].

**Hosting und Infrastruktur**
- **Hosting-Historie:** 2016 lief NOVA bei Hetzner in Nürnberg und Falkenstein [47]. Ab 2017 (Archivkopie 05.06.2017) bis mindestens August 2019 nannte die Preisseite „dedizierte Cloud-Server bei der 1&1 Internet SE in Deutschland“ [79][80]. Ab Oktober 2019 hieß es nur noch „dedizierte Cloud-Server in Deutschland“, ohne Anbieter [81]. 2019 kamen Datenbank-Cluster und Load Balancer hinzu [16]. Spätestens 2025 lag alles bei **AWS Frankfurt**: dedizierte Cloud-Server, eine containerisierte Anwendung, OS-Patching über AWS Systems Manager, AWS Shield und WAF sowie ClamAV gegen Schadsoftware in Uploads [37]. Wann der Wechsel von 1&1 zu AWS stattfand, ist unbekannt.
- **DNS-Daten:** Login, API und Handbuch zeigen auf einen AWS-Load-Balancer in eu-central-1, ebenso die Statusseite. Die Website liegt bei einem WordPress-Hoster. Die SPF-Einträge nennen Google, Amazon SES und Brevo als Mailversender [74]. Einschätzung: Firmen-Mail über Google Workspace, Newsletter über Brevo.
- **Unterauftragnehmer laut AVV (15.05.2025):** AWS Frankfurt (Hosting und Datensicherung), easybill (CRM und Rechnungen), sipgate (Telefonanlage) [39]. Bei Vertragsende gibt NOVA die Daten nach Wahl des Kunden heraus oder löscht sie [39].

**Verfügbarkeit, Datensicherung und Support**
- **SLA:** 99,8 % Verfügbarkeit, gemessen monatlich; vereinbarte Wartungsfenster zählen nicht mit. Redundanz: „Multi Instance Single Zone Deployment“ [38]. Einschätzung: 0,2 % entsprechen bis zu etwa 17,5 Stunden Ausfall im Jahr, zuzüglich der Wartungsfenster. Fällt die eine AWS-Zone aus, ist trotz mehrerer Instanzen alles betroffen.
- **Gemessene Verfügbarkeit:** Am 09.11.2026 zeigte die Statusseite 99,95 % über 30 Tage und 99,84 % über 90 Tage. Zwischen dem 16.08. und dem 05.09.2026 gab es vier Ausfälle (NOVA AVA zweimal, BIM-Datenbank, IFC-Dienst) [45].
- **Datensicherung:** Vollbackup alle 24 Stunden, Datenbank-Snapshots alle 8 Stunden, Aufbewahrung höchstens 12 Tage, Wiederherstellung innerhalb von 4 Stunden (RTO). Daten sind gespeichert mit AES-256 verschlüsselt, in der Übertragung per TLS [37][36].
- **Support:** Montag bis Donnerstag 8–17 Uhr, Freitag 8–16 Uhr, vier Prioritätsstufen. Reaktionszeiten nennt das SLA nicht [38].

**Anmeldung und Sicherheit**
- **Zugang:** Zwei-Faktor-Authentifizierung seit 07/2020 (per E-Mail oder Authenticator-App) [17][37]. Single Sign-on gibt es per SAML [37], seit 08/2026 auch per OpenID Connect mit Microsoft, Google oder anderen Anbietern [34]. Passwortrichtlinien sind einstellbar [37].
- **Öffentlich bekannte Sicherheitsvorfälle:** Im Juli 2025 kursierten Phishing-Mails im Namen von NOVA-Kunden mit gefälschten Einladungen zur Angebotsabgabe [73]. Am 21.10.2026 spielte NOVA ein Update gegen PHP-Lücken ein, die Schadcode aus der Ferne ermöglichten [33]. Ein Datenabfluss ist nicht berichtet.

**KI (NEO)**
- NEO basiert auf einem „leistungsstarken Open-Source-Sprachmodell“ im eigenen AI Hub im Frankfurter Rechenzentrum [26]. Der Ankündigungstext spricht zusätzlich von eigens trainierten, spezialisierten AVA-Modellen [27], die Produktseite von „OpenSource-Modellen“ in ISO-27001-zertifizierten Rechenzentren in Deutschland [28]. Laut Hersteller verlassen keine Daten den Server, Kundendaten werden nicht zum Training genutzt, und NEO hat dieselben Rechte wie der jeweilige Nutzer [26][27][28].
- Der MCP-Server meldet sich per OAuth an. Externe KIs wie ChatGPT, Claude, Copilot oder Gemini sind nur angebunden, wenn der Nutzer das selbst einrichtet [28]. Welches Modell und welche Hardware NEO nutzt, ist nicht veröffentlicht.

## 10. Roadmap und angekündigte Änderungen

| Vorhaben | Stand und Termin | Quelle |
|---|---|---|
| NEO (KI-Assistent) | Alpha 03–04/2026, Beta ab etwa 08/2026, Phase 3 seit 26.10.2026; Go-live „Anfang 2027“. Im März 2026 hieß es noch „im Laufe des Jahres 2026“. | [26][27][31] |
| NEO-Funktionen (gezeigt bzw. geplant) | LV aus PDF erzeugen, Prüfung nach VOB/A, B und C, Zuordnung zu DIN-276-Kostengruppen, Terminplan aus LV, CO₂-Abschätzung über ÖKOBAUDAT, Mängelticket aus Foto, Prüfung von PDF-Rechnungen, Bewertung von Nachträgen, eigene Agenten | [27][28][71] |
| Einheitspreis 40 € für Add-ons | 01.02.2027 | [24] |
| Mittelabflussplanung im Terminplan | „zum Stichtag“ 01.02.2027 | [24] |
| Mobile App für die Baudokumentation | 01.02.2027 | [24] |
| HOAI-Modul | Beta seit 24.10.2026; kostenpflichtig ab 01.02.2027 | [32][24] |
| BIM und „digitale Souveränität“ | für die BIM World 2026 angekündigt, ohne Details | [72] |
| Messen | BIM World 24.–25.11.2026; BAU 11.–15.01.2027 | [30][71] |
| Internationalisierung | 2023 als Ziel genannt, seitdem keine Belege | [63] |

Eine formale, datierte Roadmap veröffentlicht NOVA nicht. Ankündigungen stehen verstreut in Blogbeiträgen und Pressemitteilungen [30][28]. Die Presseseite zeigt nur Meldungen von 2025 und 2026. Ältere Pressemitteilungen sind unter avanova.de nicht mehr abrufbar und nur noch als Archivkopien erhalten [46][49].

## 11. Einschätzung: Strategie und Folgen für den Architekten-Freund

1. **Vom Werkzeug zur Plattform.** NOVA erweitert sein Angebot schrittweise:
   - AVA (2014)
   - Kostenmanagement mit BIM (2017–2019)
   - Lieferanten, Kalkulation und Terminplanung (2020–2023)
   - Bauüberwachung in LPH 8 (2025)
   - Bürosteuerung mit HOAI und Zeiterfassung (2026)
   - KI-Assistent (2026/27)

   Jedes neue Modul wird als Add-on monetarisiert [24][35][32].
2. **Preistrend nach oben.** Der Grundpreis stieg zum 01.07.2017, 01.05.2022 und 01.05.2026. Dazu kommen höhere Add-on-Preise 2025 und 2027. Als Gründe nennt NOVA Hosting-Kosten und neue Funktionen [14][78][23][24]. Weitere Erhöhungen in Abständen von etwa vier Jahren sind plausibel. Wer viele Module nutzt, zahlt ab 2027 rund 3.100–3.500 € pro Lizenz und Jahr (siehe Rechenbeispiel).
3. **Lock-in mittel bis hoch.** Exporte gibt es: GAEB, Excel, CSV, PDF, REST-API, seit 08/2026 auch GAEB X51 für Kostenplanungen [37][34]. Daten bleiben 12 Monate nach Abo-Ende gespeichert [25]. Proprietäre Artefakte lassen sich aber kaum verlustfrei mitnehmen: SmartPool-Bezüge, BIM-Verknüpfungen, Tickets, Protokolle, HOAI-Daten, NEO-Prompts. Für eigene Installationen bleibt nur noch die Desktop-Linie Pallas [5][6].
4. **Stabile Firma, kleines Team.** Die AVA-Linie reicht 40 Jahre zurück, die Firma ist inhabergeführt, die Fusion ordnet die Struktur [5][7]. Dem stehen etwa drei namentlich genannte Entwickler und ein sehr breiter Funktionsumfang gegenüber [44]. Daraus entsteht ein Qualitätsrisiko: Fast jedes Update enthält eine lange Liste mit Fehlerkorrekturen [34][31].
5. **Öffentliche Auftraggeber.** Die Daten liegen bei einem US-Hyperscaler (AWS), wenn auch in Frankfurt. Gleichzeitig wirbt NOVA bei der KI mit Datensouveränität [26][72]. Ein Ausschluss von US-Anbietern (Stichwort US CLOUD Act) oder eine Pflicht zum Selbstbetrieb ist für öffentliche Auftraggeber nicht belegt. Belegt sind engere Vorgaben: Im bayerischen Bundesbau müssen Auftragnehmer, also auch Planer, für Cloud-Software den BSI-Mindeststandard „Externe Cloud-Dienste“ sinngemäß erfüllen und das bestätigen; für Verschlusssachen (VS-NfD) brauchen sie selbst akkreditierte IT [84]. Einschätzung: Rückfragen sind damit vor allem bei sicherheitsrelevanten Bundesbauprojekten zu erwarten; NOVA hat kein eigenes C5-Testat und verweist auf AWS [37][38]. Details: [Anforderungen öffentlicher Auftraggeber](/okf/research/standards/public-client-ava-requirements.md). Die GAEB-3.3-Urkunden sind am 10.10.2026 ausgelaufen, sofern sie nicht erneuert wurden [67]. Ob die Angebotsplattform als E-Vergabe ausreicht, behandelt [Vergaberecht & E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md).

## Relevanz für unser Projekt

**Muss-Anforderungen**, abgeleitet aus dem, was NOVA-Kunden über die Jahre bekommen haben:
1. **Bieter ohne eigene Software:** Bieter füllen das LV im Browser aus, so bei NOVA seit 2014 [11]. Dazu braucht es GAEB DA XML 3.3 in Zertifizierungsqualität (DA 81–86) sowie DA11 und REB 23.003 für das Aufmaß. Siehe [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) und [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md).
2. **Öffentliche Vergabe:** Registrierungslink, Angebotseröffnung im Vier-Augen-Prinzip, EFB-Preisblätter 221–223 und Rechnungen als XRechnung oder ZUGFeRD [12][13][16][34].
3. **Sicherheit und Compliance:** 2FA, Single Sign-on (OIDC, SAML), Verschlüsselung, dokumentierte Backups mit Wiederherstellungs- und Datenverlustzeiten, ein Muster-AVV, eine Liste der Unterauftragnehmer und Bereitschaft für Pentests. Die Sicherheits-FAQ von NOVA zeigt, welche Fragen große und öffentliche Kunden typischerweise stellen [37]. Wir sollten von Anfang an gleichwertige Antworten dokumentieren.
4. **Datenportabilität als Prinzip:** vollständiger Export in offenen Formaten und ein **Import aus NOVA** über GAEB, Excel oder die REST-API. Das ist für einen Umstieg entscheidend; siehe [API & Datenmodell](/okf/research/nova-ava/api-and-data-model.md).

**Wo wir uns abheben können:**
- **Eigenbetrieb:** auf dem eigenen Server oder bei einem deutschen bzw. europäischen Hoster. NOVA bietet seit dem Aus für Pallas Online nur noch SaaS bei AWS an [6][37], die Intranet-Installation von 2016 gibt es nicht mehr [47].
- **Keine Gebühr pro Arbeitsplatz und Modul:** gerade HOAI, Baudokumentation und Terminplanung sollen nicht zu 40-€-Bausteinen werden [24].
- **Offener MCP-Server mit optionalem lokalem Sprachmodell:** NOVA verlangt für MCP ab 2027 40 € pro Nutzer und Monat [24].
- **Öffentliches Changelog** und keine Überraschungen nach dem Muster „erst kostenlose Beta, dann kostenpflichtig“.
- **Hochschulen als Community-Partner:** NOVA wirbt dort mit Gratislizenzen [42], Open Source ist dort ein natürliches Argument.

**Risiken:**
- **Umfang:** NOVA hat zwölf Jahre fast monatlicher Releases hinter sich. Funktionsgleichheit ist unrealistisch, wir müssen uns auf den Kernablauf des Freundes konzentrieren.
- **Daten mit Netzwerkeffekt:** Eine Preisdatenbank wie der SmartPool mit 2,5 Mio. Positionen ist nicht kurzfristig nachzubauen. Textdaten wie STLB-Bau sind lizenzpflichtig, siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md).
- **Zertifizierungen kosten Zeit und Geld:** Die BVBS-Urkunde gilt fünf Jahre, das buildingSMART-Zertifikat galt zwei Jahre [66][69].
- **Marke und Urheberrecht:** keine Namensnähe zu „NOVA“ und keine Übernahme von Oberflächentexten oder Handbuchinhalten. Siehe [Rechtsfragen & Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).

**Aufwand (grobe Einschätzung):** NOVA brauchte vom Prototyp (2013/14) bis zu Release 1 mit AVA-Kern und Bieterportal etwa ein Jahr. Das Team brachte rund 30 Jahre AVA-Wissen aus ARCHITEXT mit [11][48][70]. Die Abrechnung kam ein halbes Jahr später, BIM etwa 3,5 Jahre später [11][14]. Ein MVP für den Kernablauf des Freundes erscheint mit 1–2 Entwicklern in 6–12 Monaten machbar:
- LV erstellen
- GAEB-Import und -Export
- Bieterportal
- Preisspiegel
- Auftrag und Nachtrag
- Rechnungsprüfung

Diese Schätzung ist mit hoher Unsicherheit behaftet und hängt stark vom Fachwissen ab, das der Architekten-Freund einbringt. Andere Notizen schätzen ähnliche Umfänge auf 9–35 Personenmonate; die Gegenüberstellung aller Schätzungen steht in [Schmerzpunkte, Aufwandsschätzung](/okf/research/market/pain-points.md).

## Offene Fragen

**Nicht gefunden oder nicht verifiziert:**
- Gesellschafter, Bilanzen und Registereintrag zur Verschmelzung (Northdata gab HTTP 429 zurück; Bundesanzeiger und Unternehmensregister nicht geprüft).
- Geklärt (09.11.2026): Die Paketpreise 49/79/109 € galten vom 01.05.2022 bis 30.04.2026 (Newsletter des Herstellers zur Preisanpassung ab 01.05.2022) [78].
- Zeitpunkt des Wechsels zu AWS. Belegt sind Hetzner (2016), 1&1 Internet SE (2017 bis mindestens 08/2019), danach „dedizierte Cloud-Server in Deutschland“ ohne Anbieter (ab 10/2019) und AWS Frankfurt spätestens 2025 [47][79][80][81][37].
- Welche Fassung des BIM-LV-Containers NOVA heute schreibt: die zurückgezogene DIN SPEC 91350 (so die Add-on-Seite) oder DIN 18290-2:2023-11 [82][83].
- Teilweise geklärt (09.11.2026): Eine allgemeine Pflicht zu EU-Hauptsitz oder Selbstbetrieb ist nicht belegt; belegt sind der BSI-Mindeststandard „Externe Cloud-Dienste“ für Cloud-Software von Auftragnehmern im bayerischen Bundesbau und die VS-NfD-Regeln [84]. Offen ist, ob NOVA die Erfüllung dieses Mindeststandards nachweisen kann.
- Ob die GAEB-3.3-Zertifikate nach dem 10.10.2026 und das IFC-Zertifikat nach 2021 erneuert wurden, etwa für IFC4 [67][69].
- Mitgliedschaft bei buildingSMART; konkrete Mitarbeit in GAEB-Gremien.
- Zahl der Kunden und Nutzer; Kündigungsquote.
- Welches Open-Source-Modell NEO nutzt und auf welcher Infrastruktur es läuft.
- Inhalte mehrerer PresseBox-Meldungen, deren Abruf blockiert war, darunter „Top 5 Innovatoren“, „buildingSMART-Woche“ und „Kalkulation mit BIM“. Gegen Ende der Recherche war außerdem das Websuche-Kontingent erschöpft, sodass die Fachpresse (z. B. DAB, BauNetz) nicht weiter durchsucht wurde.

**Fragen an den Architekten-Freund:**
1. Welches Paket und welche Add-ons nutzt du, wie viele Lizenzen hast du, und wie lange läuft dein Abo? Hat dich die Erhöhung zum 01.05.2026 getroffen?
2. Nutzt du die Betas für Baudokumentation, HOAI oder MCP, die ab 01.02.2027 jeweils 40 € kosten? Würdest du sie dann bezahlen?
3. Verlangen deine öffentlichen Auftraggeber bestimmte Nachweise wie eine GAEB-Zertifizierung, Hosting in Deutschland oder bei einem deutschen Anbieter, einen AVV oder Pentest-Berichte?
4. Wie wichtig ist dir die Preisdatenbank SmartPool im Vergleich zu eigenen Kennwerten oder BKI?
5. Hast du Ausfälle oder Performance-Probleme erlebt, etwa im August und September 2026?
6. Hast du NEO schon ausprobiert, und wäre KI für dich ein Muss?
7. Wäre die Desktop-Variante Pallas aus derselben Firma für dich eine Alternative gewesen?

## Quellen

[1] NOVA AVA – Unternehmen – nova-ava.de – https://nova-ava.de/unternehmen/ – Herstellerangabe – abgerufen 2026-11-09
[2] NOVA AVA – Gründer – nova-ava.de – https://nova-ava.de/unternehmen/gruender/ – Herstellerangabe – abgerufen 2026-11-09
[3] NOVA AVA – Impressum – nova-ava.de – https://nova-ava.de/impressum/ – Primärquelle – abgerufen 2026-11-09
[4] Unternehmensprofil NOVA Building IT GmbH (PDF, undatiert, ca. 2025) – nova-ava.de – https://nova-ava.de/wp-content/uploads/Unternehmensprofil-NOVA-Building-IT-GmbH.pdf – Herstellerangabe – abgerufen 2026-11-09
[5] „Wichtige Information: Aus ARCHITEXT Software GmbH wird NOVA BUILDING IT GmbH“ (14.09.2026) – architext.de – https://architext.de/2026/09/14/wichtige-information-aus-architext-software-gmbh-wird-nova-building-it-gmbh/ – Primärquelle – abgerufen 2026-11-09
[6] „Wichtige Informationen für ARCHITEXT Pallas Online Kunden“ (06.11.2025) – architext.de – https://architext.de/2025/11/06/wichtige-informationen-fuer-architext-pallas-online-kunden/ – Primärquelle – abgerufen 2026-11-09
[7] ARCHITEXT – Unternehmen – architext.de – https://architext.de/unternehmen/ – Herstellerangabe – abgerufen 2026-11-09
[8] ARCHITEXT – Impressum – architext.de – https://architext.de/impressum/ – Primärquelle – abgerufen 2026-11-09
[9] ARCHITEXT – Startseite, News-Feed und Blog-Archiv (Pallas-Versionen) – architext.de – https://architext.de/ und https://architext.de/feed/ – Herstellerangabe – abgerufen 2026-11-09
[10] Pallas 2.0 – heise Download – https://www.heise.de/download/product/pallas-45285 – Presse/Softwareverzeichnis – abgerufen 2026-11-09
[11] „NOVA AVA Updates aus 2014 – Alles auf einen Blick“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-aus-2014-jetzt-nachlesen/ – Herstellerangabe – abgerufen 2026-11-09
[12] „Nova Ava Updates aus 2015“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-aus-2015/ – Herstellerangabe – abgerufen 2026-11-09
[13] „Nova Ava Updates aus 2016“ – nova-ava.de – https://nova-ava.de/alle-nova-ava-updates-aus-2016/ – Herstellerangabe – abgerufen 2026-11-09
[14] „Nova Ava Updates 2017“ (inkl. neue Abopreise ab 01.07.2017) – nova-ava.de – https://nova-ava.de/nova-ava-updates-2017/ – Herstellerangabe – abgerufen 2026-11-09
[15] „NOVA AVA Updates 2018“ – nova-ava.de – https://nova-ava.de/die-nova-ava-updates-2018-jetzt-entdecken/ – Herstellerangabe – abgerufen 2026-11-09
[16] „NOVA AVA Updates 2019“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-2019-neue-module-smartere-funktionen/ – Herstellerangabe – abgerufen 2026-11-09
[17] „NOVA AVA Updates aus 2020“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-aus-2020/ – Herstellerangabe – abgerufen 2026-11-09
[18] „NOVA AVA Updates aus 2021“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-aus-2021-kontinuierlich-verbessert/ – Herstellerangabe – abgerufen 2026-11-09
[19] „NOVA AVA Updates aus 2022“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-aus-2022-praxisnah-und-smart/ – Herstellerangabe – abgerufen 2026-11-09
[20] „NOVA AVA Updates aus 2023“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-aus-2023-echte-frottschritte/ – Herstellerangabe – abgerufen 2026-11-09
[21] „NOVA AVA Updates aus 2024“ – nova-ava.de – https://nova-ava.de/nova-ava-updates-aus-2024/ – Herstellerangabe – abgerufen 2026-11-09
[22] „Neue Version, neue Website, neues Logo“ (08.05.2025) – nova-ava.de – https://nova-ava.de/neue-version-neue-website-neues-logo/ – Herstellerangabe – abgerufen 2026-11-09
[23] „NOVA AVA Preisanpassungen 2026: Tarife ab 1. Mai“ (18.02.2026) – nova-ava.de – https://nova-ava.de/nova-ava-preisanpassungen-2026-tarife-ab-1-mai/ – Herstellerangabe – abgerufen 2026-11-09
[24] „Einheitliches Preismodell für Add-ons ab 1.2.2027“ (29.10.2026) – nova-ava.de – https://nova-ava.de/neues-preismodell-nova-ava-add-ons/ – Herstellerangabe – abgerufen 2026-11-09
[25] NOVA AVA – Preise – nova-ava.de – https://nova-ava.de/preise/ – Herstellerangabe – abgerufen 2026-11-09
[26] „NOVA goes AI – und nimmt die Nutzer mit“ (17.03.2026) – nova-ava.de – https://nova-ava.de/nova-goes-ai/ – Herstellerangabe – abgerufen 2026-11-09
[27] „NOVA AVA KI: Hier kommt Neo“ (09.04.2026) – nova-ava.de – https://nova-ava.de/nova-ava-ki-hier-kommt-neo/ – Herstellerangabe – abgerufen 2026-11-09
[28] NEO – Baukosten-KI (Produktseite) – nova-ava.de – https://nova-ava.de/neo-baukosten-ki/ – Herstellerangabe – abgerufen 2026-11-09
[29] Pressemitteilung digitalBAU 2026 (11./16.03.2026) – nova-ava.de – https://nova-ava.de/nova-building-it-auf-der-digitalbau-2026/ – Herstellerangabe – abgerufen 2026-11-09
[30] Pressemitteilung „BIM World 2026 – NOVA präsentiert NEO“ (29.10.2026) – nova-ava.de – https://nova-ava.de/bim-world-2026-nova-praesentiert-neo/ – Herstellerangabe – abgerufen 2026-11-09
[31] „Neue BIM-Technologie und HOAI Add-on in NOVA AVA“ (26.10.2026) – nova-ava.de – https://nova-ava.de/neue-bim-technologie-und-hoai/ – Herstellerangabe – abgerufen 2026-11-09
[32] „Neues HOAI-Modul – kostenlos in NOVA AVA“ (27.10.2026) – nova-ava.de – https://nova-ava.de/neues-hoai-modul-in-nova-ava/ – Herstellerangabe – abgerufen 2026-11-09
[33] „NOVA AVA auf dem neuesten PHP-Sicherheitsstand“ (22.10.2026) – nova-ava.de – https://nova-ava.de/nova-ava-php-sicherheitsstand-aktuell/ – Herstellerangabe – abgerufen 2026-11-09
[34] „Update August 2026 – Nr 1 + 2“ – nova-ava.de – https://nova-ava.de/update-august-2026/ – Herstellerangabe – abgerufen 2026-11-09
[35] „4 neue Tools für LP8 – so funktionieren sie!“ (03.12.2025) – nova-ava.de – https://nova-ava.de/neue-tools-fuer-lp8/ – Herstellerangabe – abgerufen 2026-11-09
[36] NOVA AVA – Commitment – nova-ava.de – https://nova-ava.de/commitment/ – Herstellerangabe – abgerufen 2026-11-09
[37] Fragen und Antworten zur Informationssicherheit von NOVA AVA (PDF) – nova-ava.de – https://nova-ava.de/wp-content/uploads/NOVA-AVA-FAQ-Informationssicherheit.pdf – Herstellerangabe – abgerufen 2026-11-09
[38] NOVA AVA – Service Level Agreement (PDF) – nova-ava.de – https://nova-ava.de/wp-content/uploads/NOVA-AVA-SLA.docx.pdf – Primärquelle (Vertragsdokument) – abgerufen 2026-11-09
[39] Auftragsverarbeitungsvertrag, Stand 15.05.2025 (PDF) – nova-ava.de – https://nova-ava.de/wp-content/uploads/NOVA_AVV_2025-05-15.pdf – Primärquelle (Vertragsdokument) – abgerufen 2026-11-09
[40] secuvera-Testat zur Webanwendung NOVA AVA, 24.02.2025 (PDF) – nova-ava.de – https://nova-ava.de/wp-content/uploads/NOVA-AVA-Secuvera-Testat-2025-02-24.pdf – Primärquelle (Prüfnachweis) – abgerufen 2026-11-09
[41] Pressemitteilung „Höchstes Sicherheitsniveau für NOVA AVA bestätigt“ (12.03.2025) – nova-ava.de – https://nova-ava.de/hoechstes-sicherheitsniveau-fuer-nova-ava-bestaetigt/ – Herstellerangabe – abgerufen 2026-11-09
[42] NOVA AVA – Forschung und Lehre – nova-ava.de – https://nova-ava.de/unternehmen/forschung-und-lehre/ – Herstellerangabe – abgerufen 2026-11-09
[43] NOVA AVA – Kunden – nova-ava.de – https://nova-ava.de/unternehmen/kunden/ – Herstellerangabe – abgerufen 2026-11-09
[44] NOVA AVA – The Company (englische Seite mit Teamliste) – nova-ava.de – https://nova-ava.de/en/the-company/ – Herstellerangabe – abgerufen 2026-11-09
[45] NOVA AVA – Systemstatus – health.avanova.io – https://health.avanova.io – Primärquelle (Live-Messdaten) – abgerufen 2026-11-09
[46] NOVA AVA – Presse – nova-ava.de – https://nova-ava.de/unternehmen/presse/ – Herstellerangabe – abgerufen 2026-11-09
[47] Archivkopie der Website avanova.de vom 09.01.2016 – Internet Archive – https://web.archive.org/web/20160109185244/http://avanova.de/ – Herstellerangabe (archiviert) – abgerufen 2026-11-09
[48] Wayback-CDX-Daten zur Domain-Historie von avanova.de, nova-ava.de und architext.de – Internet Archive – https://web.archive.org/cdx/search/cdx?url=avanova.de – Primärquelle (Archivdaten) – abgerufen 2026-11-09
[49] Pressemitteilung „NOVA Building IT holt Eberhard Stegner an Bord“ (13.09.2023), Archivkopie – Internet Archive – https://web.archive.org/web/20240715145028/https://avanova.de/wp-content/uploads/2023/11/PM-NOVA-Building-IT-holt-Eberhard-Stegner-an-Bord.pdf – Herstellerangabe – abgerufen 2026-11-09
[50] Pressemitteilung „NOVA Building IT geht Partnerschaft mit Procore-Plattform ein“ (11/2022), Archivkopie – Internet Archive – https://web.archive.org/web/20240715082233/https://avanova.de/wp-content/uploads/2023/11/PM-NOVA-Procore-BIM-World22.pdf – Herstellerangabe – abgerufen 2026-11-09
[51] Pressemitteilung „Moderne AVA braucht leistungsstarke Terminplanung“ (03/2023), Archivkopie – Internet Archive – https://web.archive.org/web/20240723203104/https://avanova.de/wp-content/uploads/2023/11/PM-NOVA-Terminplanung-SmartPool-Web.pdf – Herstellerangabe – abgerufen 2026-11-09
[52] Produktinformation NOVA AVA BIM 5D (Fragen und Antworten, 11/2020), Archivkopie – Internet Archive – https://web.archive.org/web/20240723201344/https://avanova.de/wp-content/uploads/2023/11/NOVA-AVA-QA-Produktinfo.pdf – Herstellerangabe – abgerufen 2026-11-09
[53] „NOVA – AVA in der Cloud“ (17.10.2015) – baulinks.de – https://www.baulinks.de/bausoftware/2015/0068.php4 – Presse (Abdruck einer Pressemitteilung) – abgerufen 2026-11-09
[54] „NOVA AVA, die AVA aus der Cloud, wurde mehrfach zertifiziert“ (24.02.2017) – baulinks.de – https://www.baulinks.de/bausoftware/2017/0009.php4 – Presse – abgerufen 2026-11-09
[55] „NOVA Building IT und Graphisoft starten gemeinsames Open BIM-Projekt“ (27.07.2018) – baulinks.de – https://www.baulinks.de/bausoftware/2018/0080.php4 – Presse – abgerufen 2026-11-09
[56] „Anwendungssicherheit von Nova AVA erneut bestätigt“ (03.07.2020) – baulinks.de – https://www.baulinks.de/bausoftware/2020/0061.php4 – Presse – abgerufen 2026-11-09
[57] „NOVA AVA: Kostenermittlung mit Vergleichsobjekten“ (04.11.2024) – baulinks.de – https://www.baulinks.de/webplugin/2024/1482.php4 – Presse – abgerufen 2026-11-09
[58] „NOVA AVA mit neuer Nutzeroberfläche und verbesserten Features“ (22.07.2025) – baulinks.de – https://www.baulinks.de/webplugin/2025/0996.php4 – Presse – abgerufen 2026-11-09
[59] „NOVA AVA – die erste echte online AVA Webanwendung“ (30.03.2017) – Deutscher Presseindex – https://www.deutscherpresseindex.de/?p=10268 – Presse (Pressemitteilung) – abgerufen 2026-11-09
[60] „Viele Vorteile, keine Nachteile – wir sind zufrieden“ (31.03.2017) – Deutscher Presseindex – https://www.deutscherpresseindex.de/?p=10501 – Presse (Pressemitteilung) – abgerufen 2026-11-09
[61] „BDB und NOVA Building IT gehen exklusive AVA-Partnerschaft ein“ (03.09.2018) – Deutscher Presseindex – https://www.deutscherpresseindex.de/?p=99028 – Presse (Pressemitteilung) – abgerufen 2026-11-09
[62] „NOVA Building IT an der Spitze der europäischen ‚Construction Tech Consulting Companies‘“ (28.10.2019) – Deutscher Presseindex – https://www.deutscherpresseindex.de/?p=214371 – Presse (Pressemitteilung) – abgerufen 2026-11-09
[63] „Interview with NOVA Building IT“ (16.03.2023) – FineEngineering – https://fineeng.eu/?p=25816 – Presse – abgerufen 2026-11-09
[64] Stellenanzeige „Webentwickler PHP (m/w/d)“ (undatiert, nicht mehr aktiv) – Campusjäger – https://www.campusjaeger.de/en/job/8896-webentwickler-php-m-w-d – Stellenportal (Selbstauskunft) – abgerufen 2026-11-09
[65] Mitgliedsprofil NOVA Building IT GmbH – BVBS – https://www.bvbs.de/project/nova-building-it-gmbh/ – Primärquelle (Verband) – abgerufen 2026-11-09
[66] BVBS – Zertifizierungen (GAEB DA XML) – BVBS – https://www.bvbs.de/zertifizierungen/ – Primärquelle (Verband) – abgerufen 2026-11-09
[67] BVBS-Zertifikat GAEB DA XML 3.3 „AVA“ für NOVA AVA 4 (11.10.2021) – nova-ava.de – https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_AVA_3.3_202110.pdf – Primärquelle (Zertifikat) – abgerufen 2026-11-09
[68] BVBS-Zertifikat GAEB DA XML 3.3 „Bauausführung“ für NOVA AVA 4 (11.10.2021) – nova-ava.de – https://nova-ava.de/wp-content/uploads/Urkunde-NOVABuilding-AVA-4_Bauausfg_3.3_202110.pdf – Primärquelle (Zertifikat) – abgerufen 2026-11-09
[69] buildingSMART-Zertifikat IFC2x3 Coordination View 2.0, Import (11.07.2019) – nova-ava.de – https://nova-ava.de/wp-content/uploads/IFC2x3Certificate_Import_NOVA.pdf – Primärquelle (Zertifikat) – abgerufen 2026-11-09
[70] „Warum ist NOVA AVA die führende BIM Software …?“ (13.05.2026) – nova-ava.de – https://nova-ava.de/warum-ist-nova-ava-die-fuehrende-bim-software/ – Herstellerangabe – abgerufen 2026-11-09
[71] „BAU 2027: KI-Baukostenmanagement mit NOVA AVA“ (22.09.2026) – nova-ava.de – https://nova-ava.de/bau-2027-ki-baukostenmanagement-mit-nova-ava/ – Herstellerangabe – abgerufen 2026-11-09
[72] „BIM World 2026 mit NEO, der Baukosten-KI“ (22.09.2026) – nova-ava.de – https://nova-ava.de/bim-world-2026-mit-neo-der-baukosten-ki/ – Herstellerangabe – abgerufen 2026-11-09
[73] „Sicherheitshinweis“ (04.07.2025) – nova-ava.de – https://nova-ava.de/sicherheitshinweis/ – Herstellerangabe – abgerufen 2026-11-09
[74] Eigene DNS-Abfragen und Abrufe (A-, CNAME-, MX- und TXT-Einträge, Weiterleitungen) für nova-ava.de, avanova.de, login.avanova.de, api.avanova.de, handbuch.avanova.de, health.avanova.io und novabuilding.de – eigene Messung – Primärdaten – abgerufen 2026-11-09
[75] „BIM World Munich 2025 – die Wahrheit über BIM und AVA“ (07.10.2025) – nova-ava.de – https://nova-ava.de/bim-world-munich-2025-baukostenmanagement/ – Herstellerangabe – abgerufen 2026-11-09
[76] NOVA AVA – News-Feed (vollständige Beitragsliste 2014–2026) – nova-ava.de – https://nova-ava.de/feed/ – Herstellerangabe – abgerufen 2026-11-09
[77] „Terminplan als Fokus im Update Oktober 2026“ (07.10.2026) – nova-ava.de – https://nova-ava.de/terminplan-update-oktober-2026/ – Herstellerangabe – abgerufen 2026-11-09
[78] Newsletter „Preisanpassung ab 01.05.2022“ (Paketpreise 49/79/109 € netto je User und Monat ab 01.05.2022), Archivkopie vom 01.07.2022 – avanova.de via Internet Archive – https://web.archive.org/web/20220701230018/https://avanova.de/newsletter-archiv/NOVA%20AVA%20Preisanpassung%20ab%2001.05.2022.html – Herstellerangabe (archiviert) – abgerufen 2026-11-09
[79] Pakete & Preise, Archivkopie vom 05.06.2017 (Hosting bei der 1&1 Internet SE) – avanova.de via Internet Archive – https://web.archive.org/web/20170605213716/https://avanova.de/preise – Herstellerangabe (archiviert) – abgerufen 2026-11-09
[80] Pakete & Preise, Archivkopie vom 22.08.2019 (Hosting weiter bei der 1&1 Internet SE) – avanova.de via Internet Archive – https://web.archive.org/web/20190822185905/https://avanova.de/preise – Herstellerangabe (archiviert) – abgerufen 2026-11-09
[81] Pakete & Preise, Archivkopie vom 23.10.2019 („dedizierte Cloud-Server in Deutschland“ ohne Anbieter) – avanova.de via Internet Archive – https://web.archive.org/web/20191023041656/https://avanova.de/preise – Herstellerangabe (archiviert) – abgerufen 2026-11-09
[82] DIN SPEC 91350:2016-11 (zurückgezogen, ersetzt durch DIN 18290-1:2023-11 und DIN 18290-2:2023-11) – DIN Media – https://www.dinmedia.de/en/technical-rule/din-spec-91350/263151122 – Primärquelle (Normenkatalog) – abgerufen 2026-11-09
[83] Add-on BIM („Import & Export von BIM-LV-Container nach DIN SPEC 91350“) – nova-ava.de – https://nova-ava.de/add-ons/bim/ – Herstellerangabe – abgerufen 2026-11-09
[84] VHF Bayern VI.23.0 – Richtlinie Informationssicherheit (Stand 05/2026), § 3.2–3.3 (BSI-Mindeststandards, bei Cloud-Software „Externe Cloud-Dienste“, Umsetzungsbestätigung; VS-NfD mit Selbstakkreditierung) – Bayerisches Staatsministerium für Wohnen, Bau und Verkehr – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-23-0_richtlinie-info-sichh-anl-meldung-vorkommnis_0526.pdf – Primärquelle (Vertragsanlage) – abgerufen 2026-11-09
