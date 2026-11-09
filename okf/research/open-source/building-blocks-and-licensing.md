---
type: Research Note
title: "Open-Source-Bausteine, Rechtsfragen und Lizenzen für ein AVA-Projekt"
description: "Welche freien Bibliotheken (E-Rechnung, PDF, Excel, Rich-Text, Dezimalarithmetik) ein Open-Source-AVA-Projekt nutzen kann, welche Urheber-, Marken- und Lizenzfragen bei Normen, Regelwerken und Daten bestehen, welche OSS-Lizenz passt und was ein gehosteter Betrieb rechtlich verlangt – als Entscheidungsgrundlage für Architektur, Lizenzwahl und Risiken."
resource: https://www.gesetze-im-internet.de/urhg/__5.html
tags: [research, open-source, lizenzen, urheberrecht, e-rechnung, dsgvo, bibliotheken]
timestamp: 2026-11-09T17:16:17Z
sources: 45
confidence: mittel
---

# Open-Source-Bausteine, Rechtsfragen und Lizenzen für ein AVA-Projekt

> **Keine Rechtsberatung.** Diese Notiz sammelt Fakten mit Quellen und kennzeichnet eigene Bewertungen als
> „Einschätzung“. Vor einer Veröffentlichung von Normtexten, Formularen oder Datenbeständen und vor dem Start
> eines gehosteten Angebots sollte eine Fachanwältin oder ein Fachanwalt (IT-/Urheberrecht) draufschauen.
> Stand aller Versionen, Preise und Fristen: 2026-11-09, sofern nicht anders angegeben. Versionsangaben aus
> Paketregistern wurden am 2026-11-09 per Registry-API abgefragt [28]–[33].
> Überschneidungen mit anderen Notizen sind kurz gehalten und verlinkt: GAEB-Schemas
> ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)), GAEB-Bibliotheken
> ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)), STLB-Bau
> ([Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md)), E-Rechnungspflichten
> ([Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md)), DIN 276
> ([Kostenplanung](/okf/research/standards/din-276-cost-planning.md)).

## Kurzfassung

- **Für fast jeden technischen Baustein gibt es reife, permissiv lizenzierte Bibliotheken.** E-Rechnung:
  Mustangproject 2.26.0 (Java, Apache-2.0), factur-x 7.9 (Python, BSD), drafthorse (Python, Apache-2.0), dazu
  KoSIT-Validator, XRechnung-Prüfkonfiguration und XRechnung-Visualisierung (alle Apache-2.0) [1][2][3][11][12][13].
  PDF: WeasyPrint 70.0 (BSD) und Typst 0.15 (Apache-2.0) erzeugen beide PDF/A und PDF/UA [5][6][28][30].
  Excel, Rich-Text und Dezimalrechnung sind ebenfalls frei abgedeckt (Abschnitte 4–6). Lücken bleiben bei
  GAEB 90 und bei Fachlogik wie Seitenüberträgen – das bauen wir selbst.
- **Lizenzfallen kennen:** iText und borb (AGPL), QuestPDF (gratis nur unter 1 Mio. USD Umsatz, Behörden
  ausgeschlossen), EPPlus (Polyform Noncommercial), SheetJS (npm-Paket veraltet, aktuelle Fassung nur vom
  Hersteller-CDN), CKEditor 5 und TinyMCE ab Version 7 (GPL-2.0-or-later oder kommerziell), mPDF (GPL-2.0-only).
  Für PDFsharp tragen die NuGet-Pakete vom 14.10.2026 „AGPL-3.0-only“, ältere „MIT“ [16][17][19][20][21][28][31][32].
- **Rundungsfalle:** Pythons `decimal` rundet standardmäßig „half even“ (2,665 → 2,66); kaufmännisch ist
  `ROUND_HALF_UP` und muss ausdrücklich gesetzt werden [23]. JavaScript-`number` ist für Preise ungeeignet.
- **Normtexte sind geschützt.** VOB/C (die ATV) ist laut BGH 1983 kein amtliches Werk [7]. Seit 13.09.2003 bleiben
  private Normen wie DIN 276/277 auch dann geschützt, wenn Gesetze (z. B. die HOAI) auf sie verweisen
  (§ 5 Abs. 3 UrhG). Frei ist nur Normtext, der im Wortlaut in ein Gesetz übernommen wurde [4][27].
  Kostengruppen-Nummern als Datenstruktur sind nach unserer Einschätzung unkritisch, ein vollständiger
  Katalog mit Bezeichnungen ist „gelb“.
- **VOB/A und VOB/B:** DIN verzichtete 1979 auf Urheberrechte an Teil A und B, sofern sie im Bundesanzeiger
  bekanntgemacht werden [7]. Ob das für die heutigen Ausgaben fortgilt, ist ungeklärt. Zitieren und
  zusammenfassen ist unkritisch. Den Volltext erst nach Rückfrage mitliefern.
- **VHB-Formblätter** sind vermutlich amtliche Werke (§ 5 Abs. 2 UrhG): nachbauen ja, aber inhaltlich unverändert
  und mit Quelle. Eine ausdrückliche Lizenz nennt das Portal nicht [4][45].
- **E-Rechnungsformate sind frei implementierbar:** FeRD lizenziert ZUGFeRD kostenlos an Implementierer.
  Schemas und Schematron stehen unter Apache-2.0, die EN-16931-Prüfartefakte unter EUPL-1.2 [14][15]. Anders bei
  GAEB: Dessen XSD tragen „© DIN“ ohne Lizenz, sie werden besser zur Build-Zeit geladen
  ([GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)).
- **Lizenzempfehlung (Einschätzung):** Die Anwendung unter **AGPL-3.0-or-later**, wiederverwendbare Bibliotheken
  (GAEB-Adapter, REB-Parser, Rundung) unter **MIT/Apache-2.0**, Texte und Doku unter **CC BY 4.0**, Beiträge per DCO.
  Die AGPL schließt die SaaS-Lücke der GPL und ist bei vergleichbaren Projekten verbreitet (Nextcloud, Grafana, Kimai,
  Documenso) [24]. EUPL-1.2 ist eine Alternative mit Netzwerkklausel. Ihre Kompatibilitätsklausel kann diesen Schutz
  aber aushebeln [34].
- **Gehosteter Betrieb:** Das Büro ist Verantwortlicher, der Betreiber Auftragsverarbeiter. Nötig ist ein AV-Vertrag
  nach Art. 28 DSGVO, elektronische Form genügt [39]. Hosting in der EU vermeidet Drittlandfragen. Der
  EU-US-Datenrahmen wurde am 03.09.2025 vom EuG bestätigt, ein Rechtsmittel ist möglich [40]. Der **Data Act** gilt seit
  12.09.2025 auch für SaaS: Anbieterwechsel und Datenexport sind Pflicht, ab 12.01.2027 sind Wechselentgelte
  verboten [35]. Ein vollständiger Export ist damit Rechtspflicht und zugleich ein Verkaufsargument.
- **Aufbewahrung:** Vergabeakten bei EU-Vergaben mindestens 3 Jahre ab Zuschlag (§ 8 VgV) [9]. Steuerlich gelten
  10 Jahre für Bücher, 8 Jahre für Buchungsbelege und 6 Jahre für Geschäftsbriefe (§ 147 AO) [10]. Bei E-Rechnungen
  genügt seit den GoBD vom 14.07.2025 grundsätzlich der XML-Teil [38]. Backups ersetzen kein Archiv.
- **Neue Produktregeln:** Der Cyber Resilience Act gilt ab 11.12.2027, seine Meldepflichten schon seit 11.09.2026 [36].
  Die neue Produkthaftung ab 09.12.2026 erfasst Software. Freie Software außerhalb einer Geschäftstätigkeit bleibt
  ausgenommen [37]. Sobald das Projekt kommerziell angeboten wird (z. B. bezahltes Hosting), muss das geprüft werden.
- **Österreich/Schweiz später:** ÖNORM A 2063-1:2021-03-15 kostet als PDF 244,78 € netto [42]. CRB-Standards (NPK)
  dürfen nur über zertifizierte Software genutzt werden. Zugriff Dritter „über softwaretechnische Verbindungen“
  braucht die schriftliche Zustimmung der CRB [41].

## Begriffe

| Begriff | Erklärung |
|---|---|
| **Copyleft** | Lizenzklausel: Wer veränderte Fassungen weitergibt, muss sie unter derselben Lizenz und mit Quellcode weitergeben. „Starkes“ Copyleft (GPL, AGPL) erfasst das ganze abgeleitete Programm, „schwaches“ (LGPL, MPL) nur die Bibliothek bzw. die einzelne Datei. |
| **Permissive Lizenz** | Lizenz ohne Copyleft (MIT, BSD, Apache-2.0). Der Code darf auch in proprietäre Produkte einfließen. Pflicht ist im Kern nur, Lizenz- und Urhebervermerk mitzuliefern. |
| **AGPL** | GNU Affero General Public License v3: wie GPL-3.0, zusätzlich muss der Quellcode auch denen angeboten werden, die das Programm nur über ein Netzwerk nutzen (z. B. als SaaS). |
| **Source-available** | Der Quellcode ist einsehbar, die Lizenz ist aber nicht „Open Source“ im Sinne der Open Source Initiative (OSI). Beispiele: Elastic License 2.0, Polyform Noncommercial. |
| **CLA / DCO** | Contributor License Agreement: Beitragende räumen dem Projekt weitreichende Rechte ein, oft inklusive späterer Neulizenzierung. Developer Certificate of Origin: Beitragende bestätigen nur, dass sie den Beitrag einbringen dürfen. |
| **SPDX / REUSE** | Standardisierte Lizenzkennungen (z. B. `AGPL-3.0-or-later`) bzw. eine Konvention, sie in jede Datei zu schreiben. Darauf bauen Lizenzprüfungen und Stücklisten (SBOM) auf. |
| **Amtliches Werk** | Werk einer Behörde, das nach § 5 UrhG keinen Urheberrechtsschutz genießt (Gesetze, Erlasse, amtliche Bekanntmachungen) bzw. nur mit Änderungsverbot und Quellenpflicht frei ist [4]. |
| **Privates Normwerk** | Von einer privaten Stelle (z. B. DIN) erarbeitete Norm. Sie bleibt geschützt, auch wenn ein Gesetz auf sie verweist (§ 5 Abs. 3 UrhG) [4]. |
| **Datenbankherstellerrecht** | Eigenes Schutzrecht (§§ 87a ff. UrhG) für Datenbanken, in die wesentlich investiert wurde – unabhängig vom Schutz der einzelnen Einträge. Siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md). |
| **E-Rechnung, XRechnung, ZUGFeRD** | Strukturierte elektronische Rechnung nach der europäischen Norm EN 16931. XRechnung ist reines XML (deutsche Ausprägung). ZUGFeRD bzw. Factur-X ist ein PDF/A-3 mit eingebettetem XML. |
| **PDF/A, PDF/UA** | ISO-Profile für langzeitarchivierbare (PDF/A) bzw. barrierefreie (PDF/UA) PDF-Dateien. PDF/A-3 erlaubt eingebettete Dateien beliebigen Typs, darauf beruht ZUGFeRD. |
| **AV-Vertrag (AVV)** | Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO (*data processing agreement*) zwischen Verantwortlichem (hier: Architekturbüro) und Dienstleister (hier: Betreiber der gehosteten AVA). |
| **GoBD** | „Grundsätze zur ordnungsmäßigen Führung und Aufbewahrung von Büchern, Aufzeichnungen und Unterlagen in elektronischer Form sowie zum Datenzugriff“, eine Verwaltungsanweisung des Bundesfinanzministeriums (BMF). |
| **EP / GP** | Einheitspreis (Preis je Mengeneinheit) und Gesamtpreis (Menge × EP) einer Position im Leistungsverzeichnis (LV). |

## 1. Bausteine im Überblick: was wiederverwenden, was selbst bauen

| Funktionsbereich | Empfehlung (Einschätzung) | Details |
|---|---|---|
| GAEB-Import/-Export | freie Bibliothek (pyGAEB, gaebboss u. a.) hinter eigenem Adapter; GAEB 90 selbst bauen | [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md) |
| E-Rechnung prüfen und anzeigen | Mustangproject (Java) oder factur-x/drafthorse (Python), dazu KoSIT-Validator und KoSIT-Visualisierung | Abschnitt 2 |
| LV-Ausdruck, Preisspiegel, Vergabevermerk als PDF | HTML/CSS mit WeasyPrint oder Satz mit Typst; PDF/A-2b bzw. PDF/A-3b; Prüfung mit veraPDF | Abschnitt 3 |
| Excel-Import/-Export (Bieter ohne GAEB-Software) | openpyxl, XlsxWriter, python-calamine (Python) oder ExcelJS (JavaScript); EPPlus und das veraltete npm-Paket `xlsx` meiden | Abschnitt 4 |
| Langtext-Editor | ProseMirror bzw. Tiptap mit einem Schema, das genau die GAEB-Textteilmenge abbildet; Sanitizer beim Import | Abschnitt 5 |
| Preise und Mengen | Dezimaltypen (Python `decimal`, Java `BigDecimal`, `rust_decimal`, `decimal.js`), Datenbank-Typ `numeric` | Abschnitt 6 |
| Aufmaß (REB 23.003, DA11) | eigener Parser; vorhandene Referenz `reb-da11` (PHP, MIT) | [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md), [HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md) |
| IFC/BIM-Mengen | IfcOpenShell bzw. web-ifc (hier nur Verweis) | Abschnitt 7, [BIM und AVA](/okf/research/standards/bim-and-ava.md) |
| Kostenkennwerte | eigene Kostenfeststellungen plus Destatis-Indizes (Datenlizenz Deutschland, frei nutzbar); BKI, SIRADOS und DBD nur mit Lizenz des Nutzers | [Kostenplanung](/okf/research/standards/din-276-cost-planning.md) |
| Leistungstexte | eigene, offen lizenzierte Starter-Bibliothek; STLB-Bau nur „bring your own license“ | [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md) |
| Bestehende OSS-AVA-Projekte als Basis | separat untersucht | [Open-Source-Landschaft](/okf/research/open-source/existing-projects.md) |

## 2. E-Rechnung: XRechnung und ZUGFeRD lesen, prüfen, anzeigen

**Rechtlicher Rahmen** (Pflichten, Fristen, Formatversionen): siehe
[Vergaberecht und E-Vergabe, Abschnitt 9](/okf/research/standards/procurement-law-e-vergabe.md) und
[HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md). Kurz: Seit 1.1.2025 müssen alle inländischen Unternehmen
E-Rechnungen empfangen können. Ab 2027/2028 müssen Baufirmen sie im B2B-Bereich auch ausstellen. Der Architekt
prüft in Leistungsphase 8 deshalb zunehmend XML-Rechnungen statt PDFs. Für das Projekt heißt das:
**Lesen, prüfen, lesbar anzeigen und dem Auftrag zuordnen** ist Pflicht. **Erzeugen** braucht man höchstens für
Honorarrechnungen des Büros oder für Prüfvermerke.

### 2.1 Bibliotheken und Werkzeuge

| Baustein | Sprache | Lizenz | Version (Stand) | Funktionen | Einschätzung |
|---|---|---|---|---|---|
| **Mustangproject** | Java (CLI ab JRE 11), auf Apache PDFBox | Apache-2.0 [1] | 2.26.0 vom 25.08.2026 [1] | ZUGFeRD 1 und 2.x, Factur-X und XRechnung (CII) lesen, schreiben, prüfen; PDF/A-1 → PDF/A-3; Umwandlung CII → UBL; Kommandozeile; daneben ein kostenpflichtiger REST-Server („Mustangserver“) [1] | Referenz im Java-Umfeld, aktiv gepflegt |
| **KoSIT-Validator** | Java ≥ 11 | Apache-2.0 [3] | keine Release-Angabe auf der Projektseite; Roadmap: 1.5.x eingefroren, 1.6.x nur Wartung, 2.0.0 war für „Winter 2025“ angekündigt [3] | prüft XML gegen XSD und Schematron. Er kennt selbst keine Regeln, sondern lädt „Szenarien“. Nutzbar als Kommandozeile, Java-Bibliothek oder HTTP-Daemon [3] | Referenzwerkzeug der KoSIT (Koordinierungsstelle für IT-Standards); als Dienst neben jedem Stack einsetzbar |
| **Prüfkonfiguration XRechnung** (KoSIT) | XML/Schematron | Apache-2.0 [12] | eigene Releases je XRechnung-Version [3][12] | Szenarien für XRechnung in UBL- und CII-Syntax [3] | Pflichtbaustein zum Validator |
| **XRechnung-Visualisierung** (KoSIT) | XSLT | Apache-2.0 [13] | – | macht aus einer XRechnung eine lesbare HTML- bzw. PDF-Darstellung [13] | spart eine eigene Rechnungsansicht |
| **EN-16931-Prüfartefakte** (CEN/TC 434) | XSD/Schematron | EUPL-1.2 [14] | – | normative Prüfregeln der europäischen Norm (UBL und CII) [14] | Die Copyleft-Lizenz gilt für die Artefakte selbst; als mitgelieferte Daten unkritisch (Einschätzung) |
| **factur-x** (Akretion) | Python ≥ 3.8 | BSD [2][28] | 7.9 vom 30.10.2026 [2] | Factur-X/ZUGFeRD-PDF erzeugen, XML aus PDF extrahieren (seit 3.13 auch XRechnung), gegen XSD/Schematron prüfen, CII/UBL aus einem Python-Dictionary erzeugen; 316 Sterne [2] | stabil und verbreitet |
| **drafthorse** (pretix) | Python | Apache-2.0 [11][28] | 2025.2.0 vom 15.09.2025 [28] | bildet das ZUGFeRD-Datenmodell (Stand 2.3) 1:1 ab, erzeugt und parst XML, hängt es an ein PDF; kein PDF-Parsen; Ausgabe wird gegen die offiziellen XSD geprüft [11] | gepflegt, laut Maintainern aber nicht Kerngeschäft, daher längere Reaktionszeiten [11] |
| pycheval | Python ≥ 3.11 | keine Lizenzangabe im Register [28] | 0.3.3 vom 20.02.2026 [28] | nicht geprüft | ohne Lizenz nicht verwenden |
| ZUGFeRD-csharp (`s2industries.ZUGFeRD`) | .NET | Apache-2.0 [31] | 6.1.0 [31] | ZUGFeRD-Bibliothek (Umfang nicht geprüft) | .NET-Option |
| horstoeko/zugferd | PHP | MIT [32] | 1.0.135 vom 08.11.2026 [32] | ZUGFeRD/XRechnung-Bibliothek (Umfang nicht geprüft) | sehr häufige Releases |
| easybill/zugferd-php | PHP | MIT [32] | 6.0.0 vom 30.03.2026 [32] | wie oben | PHP-Alternative |
| @e-invoice-eu/core | TypeScript | WTFPL [29] | 3.4.3 [29] | E-Rechnungen erzeugen (laut Paketname) | WTFPL ist keine OSI-geprüfte Lizenz; juristisch eher meiden |
| node-zugferd | TypeScript | MIT [29] | 0.1.1-beta.1 [29] | – | Beta, nicht produktionsreif |

### 2.2 Rechte an den Spezifikationen

- **ZUGFeRD:** Inhalt und Aufbau der Spezifikation sind urheberrechtlich geschützt. Textauszüge brauchen die
  Zustimmung der AWV e. V. (Dachverband des FeRD). Das **Format** selbst darf jeder Hersteller kostenlos und
  unwiderruflich in Soft- und Hardware implementieren; wesentliche Patente von FeRD-Mitgliedern sind davon nicht
  umfasst. Schemas und Schematron stehen unter Apache-2.0. Teile der EN 16931-1 und der CEN/TS 16931-2 dürfen laut DIN
  mit Hinweis auf CEN und DIN frei verwendet werden. Für das ZUGFeRD-Logo gelten eigene Regeln [15].
- **XRechnung:** Prüfkonfiguration und Visualisierung der KoSIT stehen unter Apache-2.0 [12][13].
- **EN 16931:** Die Norm selbst ist ein kostenpflichtiges CEN/DIN-Dokument. Die maschinenlesbaren Prüfregeln von
  CEN/TC 434 stehen unter EUPL-1.2 [14][15].

**Einschätzung:** Implementieren ist rechtlich unproblematisch. Schemas, Schematron und XSLT der KoSIT dürfen unter
ihren Lizenzen mitgeliefert werden – anders als die GAEB-Schemas (Abschnitt 8). Spezifikationstexte gehören nicht in
die eigene Dokumentation.

### 2.3 Ablauf in der AVA (Einschätzung)

1. Rechnung annehmen (Upload, E-Mail-Postfach; später ggf. Peppol über einen Dienstleister).
2. Format erkennen: XRechnung UBL, XRechnung CII, ZUGFeRD/Factur-X (XML aus dem PDF ziehen) [1][2].
3. Prüfen mit KoSIT-Validator und XRechnung-Szenario; Prüfbericht speichern [3][12].
4. Anzeigen mit der KoSIT-Visualisierung [13].
5. Zuordnen zu Auftrag, Abschlagsstand und Aufmaß – eigene Fachlogik, siehe
   [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md).
6. Original-XML unverändert und mit Prüfsumme archivieren (GoBD, Abschnitt 10.4).

## 3. Druck und Berichte: LV-Ausdruck, Preisspiegel, PDF/A

**Anforderungen (Einschätzung):** lange Tabellen mit Seitenumbruch und wiederholtem Tabellenkopf; Überträge und
Zwischensummen je Seite und Titel; Querformat für Preisspiegel mit vielen Bietern; Kopf- und Fußzeilen mit Projekt
und Vergabeeinheit; Unterschriftsfelder. Dazu PDF/A als Archivformat für Vergabeakte und Projektarchiv, optional
PDF/UA (Barrierefreiheit) für öffentliche Auftraggeber und optional eingebettete Dateien (z. B. die X83/X84 im PDF).

### 3.1 Werkzeuge

| Werkzeug | Ansatz | Sprache | Lizenz | Version | PDF/A, PDF/UA, Anhänge | Einschätzung |
|---|---|---|---|---|---|---|
| **WeasyPrint** | HTML + CSS (Paged Media) → PDF | Python ≥ 3.10 | BSD [28] | 70.0 vom 08.09.2026 [28] | PDF/A-1b bis 4f (u. a. `pdf/a-2b`, `pdf/a-3b`), PDF/UA-1 und -2, PDF/X; Anhänge per Option oder `<link rel=attachment>`. Konformität wird nicht garantiert, Nutzer müssen selbst prüfen [5] | **Favorit für Python-Stacks**: Vorlagen als HTML, dieselben Templates für Bildschirm und Druck |
| **Typst** | eigene Satzsprache mit Compiler | Rust (auch als Python-Paket `typst`) | Apache-2.0 [30][29] | Crate 0.15.1 vom 17.07.2026; Python-Paket 0.15.2 [30][28] | PDF/A-1b bis 4e/4f, PDF/UA-1 (nicht UA-2); PDF/A-4 und PDF/UA-1 schließen sich aus; Anhänge über `pdf.attach` (PDF/A-3 und 4f) [6] | schneller, präziser Satz; eigene Vorlagensprache; gute Wahl für komplexe Preisspiegel |
| Headless Chromium (Playwright, Puppeteer) | HTML → PDF über einen Browser | Node.js u. a. | Apache-2.0 [29] | Playwright 1.65.0, Puppeteer 25.16.0 [29] | kein PDF/A ab Werk (Einschätzung) | Notlösung, schwer zu betreiben |
| ReportLab | PDF im Code aufbauen | Python | BSD [28] | 5.1.0 vom 22.10.2026 [28] | – | bewährt, Layout steckt aber im Code |
| fpdf2 | PDF im Code aufbauen | Python | LGPL-3.0-only [28] | 2.9.0 [28] | – | schwaches Copyleft beachten |
| pypdf / pikepdf | PDF nachbearbeiten (zusammenfügen, Anhänge, Metadaten) | Python | BSD-3-Clause / MPL-2.0 [28] | 7.0.0 / 10.18.0 [28] | – | Hilfswerkzeuge |
| Apache PDFBox | PDF lesen und schreiben | Java | Apache-2.0 | 3.0.7 (Maven-Index) [33] | – | Basis von Mustangproject [1] |
| pdfmake, @react-pdf/renderer | PDF im Browser oder in Node erzeugen | JavaScript | MIT [29] | 0.3.14 / 4.9.0 [29] | – | für Ausdrucke direkt im Browser |
| **veraPDF** | PDF/A- und PDF/UA-Prüfung | Java | wahlweise GPLv3+ oder MPLv2+ [22] | – | Prüfwerkzeug | in die CI einbinden |

**Einschätzung zu Seitenüberträgen:** CSS-Paged-Media und Typst können Kopf- und Fußzeilen und Seitenzähler.
„Übertrag von Seite x“ setzt aber voraus, dass man weiß, welche Positionen auf welcher Seite landen. Das braucht
entweder zwei Durchläufe (setzen, Umbrüche auslesen, Summen einfügen) oder die Zustandsfunktionen von Typst. Vor der
Werkzeugwahl einen Prototyp mit einem echten LV und einem 8-Bieter-Preisspiegel bauen.

### 3.2 Lizenzfallen bei PDF-Bibliotheken

| Bibliothek | Lizenz | Problem |
|---|---|---|
| iText (Java/.NET) | AGPL-3.0 laut NuGet-Metadaten (Version 9.8.0 vom 30.09.2026) [31]; kommerzielle Lizenzen beim Hersteller (nicht geprüft) | zwingt das Gesamtprojekt in die AGPL oder in eine Kauflizenz |
| borb (Python) | AGPL-3.0-or-later [28] | wie iText |
| QuestPDF (.NET) | eigene „Community License“: frei für Einzelpersonen, gemeinnützige Organisationen, Hochschulen, OSI-lizenzierte Open-Source-Projekte und Firmen unter 1 Mio. USD Jahresumsatz. **Behörden und börsennotierte Firmen sind ausgeschlossen**, unabhängig vom Umsatz [21] | Das OSS-Projekt dürfte es nutzen, viele seiner Anwender (Behörden, größere Büros) aber nicht ohne Kauf → für uns ungeeignet |
| PDFsharp (.NET) | Versionen bis 6.2.4 MIT. Die am 14.10.2026 veröffentlichten Pakete 6.5.0 und 7.0.0-preview-2 tragen laut NuGet „AGPL-3.0-only“ [31] | widerspricht älteren Lizenzseiten des Herstellers; vor Nutzung klären |
| mPDF (PHP) | GPL-2.0-only [32] | nicht mit GPL-3.0/AGPL-3.0 kombinierbar (Einschätzung wegen „only“) |
| dompdf, TCPDF (PHP) | LGPL-2.1 bzw. LGPL-3.0-or-later [32] | schwaches Copyleft, meist unkritisch |

## 4. Tabellenkalkulation: Excel-Import und -Export

Excel ist der Rückweg für Bieter ohne GAEB-Software und ein häufiges Importformat für Mengen und Kostenschätzungen
(siehe [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md), M9).

| Bibliothek | Sprache | Lizenz | Version (Stand) | Kann | Einschätzung |
|---|---|---|---|---|---|
| openpyxl | Python | MIT [28] | 3.1.5 vom 28.06.2024 [28] | .xlsx lesen und schreiben, Formeln, Zellschutz | Standard, aber seit über zwei Jahren ohne Release |
| XlsxWriter | Python | BSD-2-Clause [28] | 3.3.1 vom 28.10.2026 [28] | .xlsx erzeugen (nicht lesen), mit Formaten, Blattschutz, Datenüberprüfung | gut für Bieter-Vorlagen |
| python-calamine / fastexcel | Python mit Rust-Kern | MIT [28] | 0.9.1 vom 03.11.2026 / 0.21.0 vom 19.08.2026 [28] | schnelles Lesen von xlsx, xls, ods | gut für robusten Import |
| pandas | Python | BSD-3-Clause [28] | 3.1.1 [28] | Tabellen einlesen und auswerten | nur als Hilfsmittel |
| Apache POI | Java | Apache-2.0 | 5.5.1 (Maven-Index) [33] | xls/xlsx lesen und schreiben | Java-Standard |
| ExcelJS | JavaScript | MIT [29] | 4.4.0 [29] | lesen und schreiben in Browser und Node | gute Wahl für den Browser-Rückweg |
| SheetJS Community Edition (`xlsx`) | JavaScript | Apache-2.0 (npm-Angabe) [29] | npm: 0.18.5 (veraltet); aktuell 0.20.3, nur über das CDN des Herstellers [19] | sehr viele Formate | Lieferketten-Risiko: Die npm-Version ist veraltet, die aktuelle kommt von einem fremden CDN [19] |
| rust_xlsxwriter / calamine / umya-spreadsheet | Rust | MIT bzw. MIT OR Apache-2.0 [30] | 0.102.0 / 0.38.0 / 3.1.1 [30] | schreiben / lesen / beides | für einen Rust-Kern |
| ClosedXML | .NET | MIT [31] | 0.105.1 vom 25.07.2026 [31] | lesen und schreiben | .NET-Option |
| EPPlus | .NET | **Polyform Noncommercial 1.0.0** [20] | 9.0.0-preview [31] | lesen und schreiben | **nicht Open Source**, kommerzielle Nutzung lizenzpflichtig → meiden |
| PhpSpreadsheet | PHP | MIT [32] | 5.11.0 vom 08.11.2026 [32] | lesen und schreiben | PHP-Option |

**Hinweise (Einschätzung):** Zahlen aus Excel-Zellen sind Gleitkommawerte. Beim Import deshalb auf die zulässigen
Nachkommastellen der jeweiligen Größe (Menge, EP) runden, Abweichungen zum Rohwert melden und nichts stillschweigend
übernehmen. Bieter-Vorlagen mit Blattschutz versehen und nur die Preisfelder freigeben. Ordnungszahlen als Text
speichern, damit führende Nullen erhalten bleiben. Eine versteckte Prüfspalte (z. B. Positions-ID und Prüfsumme
über das LV) erlaubt es, beim Rückimport Strukturänderungen durch den Bieter zu erkennen.

## 5. Rich-Text für GAEB-Langtexte

**Was GAEB verlangt:** Langtexte sind in GAEB DA XML ein XHTML-ähnliches Subset (Absätze, `span`, Tabellen,
Bilder) mit CSS-ähnlichem `style`-Attribut. Textergänzungen (Bieterangaben) sind eigene Elemente, und GAEB 90 kennt
gar keine Formatierung (siehe [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) und
[GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)). Der Editor sollte also **genau diese
Teilmenge** erzeugen und kein beliebiges HTML.

| Editor/Bibliothek | Lizenz | Version | Einschätzung |
|---|---|---|---|
| **ProseMirror** (Kern) | MIT [29] | prosemirror-model 1.25.13 [29] | schemabasiert: Erlaubte Knoten und Auszeichnungen lassen sich exakt auf die GAEB-Teilmenge begrenzen → **erste Wahl** |
| **Tiptap** (auf ProseMirror) | MIT (Kernpaket) [29] | 3.33.0 [29] | komfortablere Programmierschnittstelle auf ProseMirror |
| Lexical (Meta) | MIT [29] | 0.53.0 (noch 0.x) [29] | modern, Schnittstelle aber noch nicht stabil |
| Quill | BSD-3-Clause [29] | 2.0.3 [29] | einfach, Tabellen schwach |
| CKEditor 5 | GPL-2.0-or-later oder kommerziell [16] | 49.1.0 [29] | mit GPL-/AGPL-Projekten kombinierbar, nicht mit einer MIT/Apache-Weitergabe |
| TinyMCE | seit Version 7 (Ankündigung 20.03.2024) GPL-2.0-or-later oder kommerziell; ältere Versionen behalten ihre alte Lizenz [17] | 8.10.1 [29] | wie CKEditor |
| HugeRTE | MIT; Fork von TinyMCE mit Copyright-Vermerk von Tiny aus 2022 [18] | – | Ausweg, falls die TinyMCE-Bedienung gewünscht ist |

**Sicherheit:** Langtexte aus fremden GAEB-Dateien sind HTML-artig und werden im Browser angezeigt. Sie müssen deshalb
beim Import und vor der Anzeige bereinigt werden (Allowlist der GAEB-Elemente), sonst droht Cross-Site-Scripting.
Freie Sanitizer: DOMPurify (MPL-2.0 oder Apache-2.0, 3.4.17) [29], sanitize-html (MIT) [29], nh3 (Python, MIT) [28].
Einschätzung: Das ist dasselbe Prinzip wie der Schutz vor XML-Angriffen (XXE), den pyGAEB und andere Parser schon
eingebaut haben ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)).

**Datenhaltung (Einschätzung):** Den Langtext intern als strukturiertes Dokument speichern (z. B. ProseMirror-JSON)
und daraus drei Ausgaben ableiten: GAEB-XHTML (DA XML), reinen Text (GAEB 90, Kurztext, Suche) und HTML für den
Druck. Rundreise-Tests (GAEB → Editor → GAEB) mit echten Dateien sichern ab, dass nichts verloren geht.

## 6. Dezimal- und Geldarithmetik für EP und GP

**Regeln aus GAEB:** Die Fachdokumentation legt Nachkommastellen und Rundung genau fest (u. a. EP mit 3, Gesamtbetrag
mit 2 Nachkommastellen; Rundungsregel 4.6.17). „Nicht angeboten“ ist etwas anderes als 0,00 – Details in
[GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md). Bei Rechenfehlern im Angebot gilt nach VOB/A
der Einheitspreis ([Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md)).

**Falle Standardrundung:** Pythons `decimal`-Modul rechnet im Standardkontext mit 28 Stellen und rundet nach
`ROUND_HALF_EVEN` („Banker's Rounding“, 2,665 → 2,66). Kaufmännische Rundung heißt `ROUND_HALF_UP` und muss
ausdrücklich gesetzt werden. Die Dokumentation empfiehlt Dezimalzahlen für Buchhaltung, weil sie Werte wie 0,1
exakt darstellen [23].

| Umgebung | Baustein | Lizenz | Hinweis |
|---|---|---|---|
| Python | `decimal` (Standardbibliothek) | Python-Lizenz | Rundungsmodus explizit setzen [23] |
| Java | `java.math.BigDecimal` | JDK | `RoundingMode.HALF_UP` angeben |
| Rust | rust_decimal 1.43.0 [30] | MIT [30] | dezimalgenaues Rechnen wie in gaebboss ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)) |
| JavaScript/TypeScript | decimal.js 10.6.0, big.js 7.0.1, dinero.js 2.0.2 [29] | MIT [29] | `number` ist eine binäre Gleitkommazahl → nie für Preise |
| PHP | brick/money 0.15.2, moneyphp/money 4.9.0 [32] | MIT [32] | – |

**Praxisregeln (Einschätzung):**

1. Mengen, EP, GP und Summen als Dezimalwert speichern (Datenbank `numeric` mit fester Skala) und in JSON als
   Zeichenkette übertragen.
2. GP = Menge × EP, dann **einmal** auf die vorgeschriebenen Stellen runden. Summen aus den gerundeten GP bilden.
3. Nachlässe, Umlagen und Umsatzsteuer erst auf Summenebene und in der Reihenfolge des Angebots anwenden.
4. Beim X84-Import jede Position nachrechnen und Abweichungen zur Bieterangabe ausweisen (nach VOB/A gilt der EP).
5. Eine zentrale, getestete Rundungsfunktion für alle Module (LV, Preisspiegel, Rechnung, E-Rechnung) – mit
   Testfällen aus den BVBS-Prüfdateien und aus echten Angeboten.

## 7. IFC und BIM: nur Verweise

Details stehen in [BIM und AVA](/okf/research/standards/bim-and-ava.md). Für die Lizenzwahl relevant:

| Bibliothek | Sprache | Lizenz | Version |
|---|---|---|---|
| IfcOpenShell | C++/Python | LGPL-3.0-or-later [28][25] | 0.9.0.post1 vom 15.10.2026 [28] |
| web-ifc | WebAssembly/JavaScript | MPL-2.0 [29] | 0.0.78 [29] |
| That Open Components (`@thatopen/components`) | TypeScript | MIT [29] | 3.6.0 [29] |
| xBIM (XbimEssentials) | .NET | CDDL [25] | – |

Einschätzung: LGPL und MPL passen zu jeder der geprüften Projektlizenzen, solange man die Bibliotheken unverändert
einbindet oder Änderungen an ihnen offenlegt. Die CDDL gilt als nicht GPL-kompatibel.

## 8. Urheberrecht an Normen, Regelwerken, Formularen und Daten

### 8.1 Rechtsrahmen

- **§ 5 UrhG (amtliche Werke):** Gesetze, Verordnungen, amtliche Erlasse und Bekanntmachungen sowie
  Gerichtsentscheidungen sind gemeinfrei (Abs. 1). Andere amtliche Werke, die im amtlichen Interesse zur
  allgemeinen Kenntnisnahme veröffentlicht wurden, sind es ebenfalls, aber mit Änderungsverbot und Pflicht zur
  Quellenangabe (Abs. 2). Private Normwerke bleiben geschützt, wenn Gesetze oder Erlasse nur auf sie verweisen, ohne
  ihren Wortlaut wiederzugeben. Der Rechteinhaber muss dann Verlegern zu angemessenen Bedingungen ein Recht zur
  Vervielfältigung und Verbreitung einräumen (Abs. 3) [4].
- **BGH 1983 (I ZR 129/81, VOB/C):** Teil C der VOB (die ATV) ist kein amtliches Werk. Der damalige
  Verdingungsausschuss war keine Behörde, und Verweise von Ministerien oder Kommunen machen die ATV nicht zum
  amtlichen Werk [7]. Für die **Teile A und B** hatte DIN am 4.12.1979 erklärt, keine Urheberrechte zu beanspruchen,
  sofern das Ministerium sie im Bundesanzeiger bekanntmacht. Das geschah am 6.11.1979 (BAnz Nr. 208). Über A und B
  musste der BGH deshalb nicht entscheiden [7].
- **BGH 1990 (I ZR 79/88, „DIN-Normen“):** DIN-Normen, die bauaufsichtlich als Technische Baubestimmungen eingeführt
  waren, galten als amtliche Werke nach § 5 Abs. 1. Schon ein Verweis genügte [8]. Das Bundesverfassungsgericht
  billigte das 1998 (1 BvR 1143/90) [27].
- **Reaktion des Gesetzgebers 2003:** § 5 Abs. 3 UrhG kam mit dem Gesetz zur Regelung des Urheberrechts in der
  Informationsgesellschaft vom 10.09.2003 (BGBl. I S. 1774) und gilt seit 13.09.2003. Seitdem bleibt eine Norm
  geschützt, wenn amtliche Texte nur auf sie verweisen. Nur Normtext, der **im Volltext** in ein Gesetz übernommen
  wurde, ist frei. Die Zwangslizenz hilft nur Verlegern, nicht einzelnen Bürgern; reine Online-Verleger sind nach der
  Kommentarliteratur nicht erfasst. Das OLG Hamburg hielt die Regel 2017 (3 U 220/15 Kart) für verfassungs- und
  unionsrechtskonform und sprach DIN einen Unterlassungsanspruch gegen die Online-Veröffentlichung von Normen zu [27].
- **EuGH 2024 (C-588/21 P, Public.Resource.Org):** Harmonisierte europäische Normen sind wegen ihrer Rechtswirkungen
  Teil des Unionsrechts. An ihrer Verbreitung besteht ein überwiegendes öffentliches Interesse, die Kommission musste
  Zugang gewähren [26]. Das Urteil betrifft den **Zugang zu Dokumenten** nach der Transparenzverordnung, nicht das Recht
  zur Weiterverbreitung. Zur Urheberrechtsfrage sagt die Pressemitteilung nichts [26]. Einschätzung: DIN 276, DIN 277
  und die VOB sind rein nationale Regelwerke und keine harmonisierten Normen; das Urteil hilft hier nicht.
- **Dateiformate und Funktionalität** eines Programms sind nach EuGH (C-406/10, SAS Institute) nicht als
  Ausdrucksform eines Computerprogramms geschützt, Handbuchtexte dagegen schon. Details in
  [GAEB DA XML, Abschnitt 5](/okf/research/standards/gaeb-da-xml.md).

### 8.2 Ampel je Regelwerk und Datenquelle

| Gegenstand | Rechtslage (Fakten) | Was das Projekt darf (Einschätzung) | Ampel |
|---|---|---|---|
| **DIN 276 / DIN 277 – Normtext, Erläuterungen, Tabellen** | private Normwerke, kostenpflichtig bei DIN Media (DIN 276:2018-12: 143,40 €) ([Kostenplanung](/okf/research/standards/din-276-cost-planning.md)). Die HOAI verweist nur auf DIN 276 → § 5 Abs. 3 [4][27] | nicht kopieren; Begriffe und Regeln in eigenen Worten erklären; auf die Norm verweisen | rot (Text) |
| **Kostengruppen-Nummern und Kurzbezeichnungen** (z. B. 330 Außenwände) | Einzelne Nummern und kurze Begriffe erreichen kaum die nötige Schöpfungshöhe. Die vollständige Gliederung könnte aber als Sammel- oder Datenbankwerk geschützt sein. Rechtsprechung dazu nicht gefunden | Nummernsystem als Datenstruktur nutzen; Bezeichnungen kurz und eigenständig formulieren; den vollständigen Katalog optional per Import, den der Nutzer aus eigener Lizenz befüllt | gelb |
| **VOB/C (ATV, DIN 18299 ff.)** | kein amtliches Werk (BGH 1983) [7]; kostenpflichtig bei DIN Media ([HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md)) | ATV-Nummern, Titel und Abrechnungslogik in eigenen Worten nutzen (z. B. Prüfregel „Abrechnungseinheit passt zum Leistungsbereich“); keine Textauszüge | rot (Text), grün (Nummern und Verweise) |
| **VOB/A und VOB/B** | DIN verzichtete 1979 auf Rechte an A und B, unter der Bedingung der Bekanntmachung im Bundesanzeiger [7]. Die Teile erscheinen weiter als Bekanntmachung im Bundesanzeiger ([Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md)). Ob der Verzicht für heutige Ausgaben fortgilt, ist ungeklärt | Paragrafen zitieren und zusammenfassen ist unkritisch. Den Volltext erst nach Rückfrage bei DVA/BMWSB bzw. DIN Media mitliefern, bis dahin verlinken | grün (Zitat), gelb (Volltext) |
| **VHB-Bund-Formblätter** | Das VHB erlaubt inhaltsgleiche elektronische Formulare ohne inhaltliche Änderung ([Vergaberecht, 7.3](/okf/research/standards/procurement-law-e-vergabe.md)). Das Portal nennt keine Lizenz, nur „© 2026 Fachinformation Bundesbau“ im Auftrag von BImA, BMWSB und BMVg [45]. Vermutlich amtliches Werk nach § 5 Abs. 2 mit Änderungsverbot und Quellenpflicht [4] | Formular-Generator mit unverändertem Inhalt und Quellenangabe; vor Veröffentlichung im Repo beim BMWSB/FIB nachfragen | grün–gelb |
| **GAEB-Schemas (XSD) und Fachdokumentation** | „© DIN“, keine Lizenz; die Schemas dürfen nicht verändert werden ([GAEB DA XML, 5](/okf/research/standards/gaeb-da-xml.md)) | Format implementieren: ja. XSD zur Build-Zeit von gaeb.de laden statt ins Repo legen. Doku-Texte nicht kopieren | grün (Format), gelb (XSD im Repo) |
| **STLB-Bau, STLK, Herstellertexte, Textportale** | Lizenzbedingungen verbieten u. a. die Weitergabe von Datensätzen und Codierungen sowie Retrieval-Systeme ([Leistungstexte, 8](/okf/research/standards/stlb-bau-tender-texts.md)) | Metadaten in Nutzer-LVs erhalten; nichts mitliefern; Integration nur per Partnervertrag | rot (Inhalte) |
| **BKI, SIRADOS, DBD-Preise** | proprietär und lizenzpflichtig ([Kostenplanung, 11](/okf/research/standards/din-276-cost-planning.md)); Datenbankherstellerrecht. Die BKI-Lizenzbedingungen waren öffentlich nicht auffindbar | nur Import aus der Lizenz des Nutzers, keine Bündelung | rot (Bündelung) |
| **Destatis-Baupreisindizes** | Datenlizenz Deutschland – Namensnennung 2.0 ([Kostenplanung](/okf/research/standards/din-276-cost-planning.md)) | mitliefern mit Quellenvermerk „© Statistisches Bundesamt (Destatis)“ | grün |
| **Gesetze, Verordnungen, Gerichtsentscheidungen** (GWB, VgV, UVgO, HOAI, UStG …) | gemeinfrei (§ 5 Abs. 1) [4] | zitieren, verlinken, in Prüfregeln abbilden | grün |
| **ZUGFeRD, XRechnung, EN-16931-Artefakte** | siehe Abschnitt 2.2 [12][13][14][15] | Artefakte unter ihren Lizenzen mitliefern; Spezifikationstexte nicht kopieren | grün |
| **NOVA-Handbuch, Oberflächentexte, Screenshots** | urheberrechtlich geschützte Werke des Herstellers (Einschätzung) | Funktionen nachbauen: ja; Texte, Grafiken und Handbuchinhalte übernehmen: nein | rot (Texte) |

**Ein Ausweg für den KG-Katalog (Einschätzung, zu prüfen):** Wird Normtext im Wortlaut in ein amtliches Werk
übernommen, ist dieser Wortlaut frei [27]. Es lohnt sich zu prüfen, ob eine Verwaltungsvorschrift (z. B. Muster der
RBBau) die Kostengruppen im Wortlaut enthält. Dann ließe sich genau diese Fassung mit Quellenangabe nutzen.

### 8.3 Marken und Namen

- **Beschreibende Begriffe sind nicht eintragungsfähig:** Zeichen, die nur Art, Beschaffenheit oder Bestimmung einer
  Ware beschreiben oder im Verkehr üblich geworden sind, werden nicht als Marke eingetragen, es sei denn, sie haben
  sich durch Benutzung durchgesetzt (§ 8 Abs. 2 Nr. 1–3, Abs. 3 MarkenG) [44]. Einschätzung: „AVA“ ist in der
  Branche die übliche Abkürzung für Ausschreibung, Vergabe und Abrechnung und als Einzelwort für AVA-Software kaum
  schützbar. Kombinationen wie „NOVA AVA“ oder „ORCA AVA“ sind dagegen als Ganzes geschützt bzw. schutzfähig.
- **Fremde Marken beschreibend nennen ist erlaubt,** wenn es den anständigen Gepflogenheiten entspricht – etwa um
  Bestimmung oder Kompatibilität anzugeben (§ 23 MarkenG) [43]. Beispiele (Einschätzung): „Import von GAEB-Dateien“,
  „liest ZUGFeRD und XRechnung“, „übernimmt Exporte aus NOVA AVA“.
- **Logos nur nach Regeln des Inhabers:** Das ZUGFeRD-Logo ist nur gemäß den FeRD-Vorgaben nutzbar. FeRD bezeichnet
  die Wort- und Bildzeichen „FeRD“ und „ZUGFeRD“ als geschützt [15]. „BVBS-zertifiziert“ darf erst nach
  bestandener Zertifizierung stehen ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)).
- **Eigener Projektname (Einschätzung):** einen unterscheidungskräftigen Namen wählen, vorher in den Registern von
  DPMA und EUIPO (bzw. TMview) in den Klassen 9 (Software) und 42 (SaaS) recherchieren und Nähe zu NOVA, ORCA, AVANTI,
  California u. a. meiden ([Etablierte Anbieter](/okf/research/market/established-vendors.md)).

## 9. Lizenzwahl für das eigene Projekt

### 9.1 Optionen

| Lizenz | Copyleft | SaaS-Lücke geschlossen? | Folge für Dritte | Beispiele (Lizenzdateien geprüft) |
|---|---|---|---|---|
| MIT / Apache-2.0 | nein | – | dürfen alles, auch proprietäre Forks und SaaS | pyGAEB (MIT) [25], Mustangproject (Apache-2.0) [1] |
| MPL-2.0 | schwach (je Datei) | nein | geänderte Dateien offenlegen, der Rest ist frei | Penpot (Design-Werkzeug) [24] |
| LGPL-3.0 | schwach (Bibliothek) | nein | die Bibliothek bleibt frei, die Anwendung nicht | Odoo Community [24] |
| GPL-3.0 | stark | **nein** – reiner SaaS-Betrieb gilt nicht als Weitergabe (Einschätzung) | proprietärer SaaS-Fork möglich | ERPNext, OpenProject, Dolibarr [24] |
| **AGPL-3.0** | stark, auch bei Netzwerknutzung | **ja** | wer eine geänderte Fassung als Dienst anbietet, muss den Code offenlegen | Nextcloud, Grafana, Kimai, Documenso; mit kommerziellem Zusatzteil („Open Core“): Metabase, Twenty [24] |
| EUPL-1.2 | stark; erfasst ausdrücklich auch den Zugang zu den „wesentlichen Funktionen“ (Netzwerknutzung) [34] | ja, aber mit Schlupfloch: Abgeleitete Werke zusammen mit Code unter einer „kompatiblen Lizenz“ (u. a. GPL-2.0/3.0, AGPL-3.0, MPL-2.0, LGPL, EPL) dürfen unter jener Lizenz weitergegeben werden. Bei Konflikten gilt deren Pflichtenkatalog [34] | wie AGPL, solange niemand in die GPL wechselt | CEN/TC-434-Prüfartefakte [14] |
| Source-available (Elastic License 2.0, Polyform) | – | – | kein Open Source im OSI-Sinn | Invoice Ninja (ELv2) [24], EPPlus (Polyform Noncommercial) [20] |

Im AVA-Umfeld selbst ist bieterwerk (Node.js) AGPL-3.0 lizenziert [25]. Die Bibliotheken pyGAEB und gaebboss
stehen unter MIT bzw. MIT/Apache-2.0 ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)).

### 9.2 Verträglichkeit mit den Bausteinen (Einschätzung)

| Bausteinlizenz | in AGPL-3.0-Projekt | in MIT/Apache-Projekt |
|---|---|---|
| MIT, BSD, Apache-2.0, Python-Lizenz | ja | ja |
| LGPL, MPL-2.0 (IfcOpenShell, web-ifc, pikepdf, fpdf2, DOMPurify) | ja | ja, als unveränderte Bibliothek |
| GPL-2.0-or-later (CKEditor 5, TinyMCE ≥ 7) | ja (unter GPL-3.0 nutzbar) | nein |
| GPL-2.0-only (mPDF) | nein | nein |
| AGPL-3.0 (iText, borb, bieterwerk) | ja | nein |
| EUPL-1.2 (EN-16931-Artefakte als Daten) | ja | ja, als getrennt mitgelieferte Daten |
| CDDL (xBIM) | nein | ja |
| Source-available (EPPlus, QuestPDF) oder ohne Lizenz (pycheval, gaeb-go) | nein | nein |

### 9.3 Empfehlung (Einschätzung)

1. **Anwendung (Server und Web-Oberfläche): AGPL-3.0-or-later.** Sie verhindert, dass ein kommerzieller Anbieter
   eine geänderte, geschlossene SaaS-Fassung betreibt. Selbst-Hosting und die tägliche Nutzung durch Architekten
   bleiben frei. Sie ist bei vergleichbaren Webanwendungen verbreitet [24].
2. **Wiederverwendbare Bibliotheken** (GAEB-Adapter, REB-DA11-Parser, Rundungs- und Preisspiegelkern, Prüfregeln):
   **Apache-2.0** (mit Patentklausel) oder MIT. So können andere Projekte – auch pyGAEB und gaebboss – sie aufnehmen,
   und Beiträge fließen leichter zurück.
3. **Inhalte** (Vorbemerkungs- und Textbibliothek, Doku, diese Wissensbasis): **CC BY 4.0**, siehe
   [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md).
4. **Beiträge per DCO statt CLA**, solange kein Dual Licensing geplant ist. Wer später eine kommerzielle Zweitlizenz
   verkaufen will, braucht von Anfang an einen CLA (pyGAEB nutzt einen,
   siehe [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)). Diese Entscheidung früh treffen.
5. **REUSE/SPDX-Kopfzeilen** in jeder Datei, eine automatische Lizenzprüfung der Abhängigkeiten in der CI und eine
   SBOM. Das macht das Projekt auch für den Cyber Resilience Act anschlussfähig (Abschnitt 10.3).
6. **EUPL-1.2** nur wählen, wenn öffentliche Auftraggeber als Mitentwickler gewonnen werden sollen. Sie ist eine
   europäische Lizenz mit Netzwerkklausel, deren Kompatibilitätsklausel aber einen Wechsel in die GPL erlaubt [34].

## 10. Gehosteter Betrieb: DSGVO, Produktrecht, Aufbewahrung, Backups

### 10.1 Rollen und AV-Vertrag

- **Rollen:** Das Architekturbüro ist Verantwortlicher für die personenbezogenen Daten in seinen Projekten. Dazu
  gehören Bieter-Ansprechpartner, private Bauherren, Nachunternehmerlisten und Namen auf Stundenlohnzetteln
  (Einschätzung). Der Betreiber einer gehosteten AVA verarbeitet diese Daten weisungsgebunden, ist also
  **Auftragsverarbeiter**. Hosting in Rechenzentren und Cloud-Computing sind typische Fälle; Wartung und Fernzugriff
  ebenfalls [39].
- **AV-Vertrag:** Er ist nach Art. 28 DSGVO Pflicht und kann schriftlich **oder elektronisch** geschlossen werden.
  Unterauftragsverarbeiter (z. B. der Rechenzentrumsbetreiber) brauchen die vorherige Genehmigung des
  Verantwortlichen; spätere Änderungen sind ihm mitzuteilen. Verstöße gegen Art. 28 können mit Bußgeld belegt
  werden [39]. Das DSK-Kurzpapier ist Stand 17.12.2018; die Grundsätze gelten weiter (Einschätzung).
- **Datenstandort:** Hosting in der EU vermeidet Übermittlungen in Drittländer. Der EU-US-Datenschutzrahmen
  (Angemessenheitsbeschluss vom 10.07.2023) wurde vom EuG am 03.09.2025 bestätigt (T-553/23); ein Rechtsmittel zum
  EuGH ist möglich, der Beschluss gilt bis zu einer Aufhebung [40]. Einschätzung: Für ein Angebot an Architekten mit
  öffentlichen Auftraggebern ist ein EU-Anbieter ohne US-Mutter das einfachste Verkaufsargument. NOVA hostet bei AWS in
  Frankfurt ([NOVA Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md)).
- **Vertraulichkeit:** Bieterpreise sind Geschäftsgeheimnisse der Bieter und bei öffentlichen Vergaben besonders
  geschützt. Einschätzung: Verschlüsselung (Transport und Speicherung), Mandantentrennung, Rollen und ein
  Zugriffsprotokoll gehören in jedes Hosting-Paket.

### 10.2 Data Act: Anbieterwechsel und Datenexport

Die Wechselregeln des Data Act (Kapitel VI) gelten seit **12.09.2025** für alte und neue Verträge, ausdrücklich auch
für SaaS [35]:

| Pflicht | Inhalt [35] |
|---|---|
| Kündigungs- und Vorbereitungsfrist | höchstens 2 Monate nach dem Wechselwunsch (Art. 25 Abs. 2 lit. d) |
| Übergangszeitraum | höchstens 30 Kalendertage; bei nachgewiesener technischer Undurchführbarkeit bis 7 Monate |
| Daten nach dem Wechsel | mindestens 30 Kalendertage abrufbar, dann löschen, sofern keine Aufbewahrungspflicht besteht |
| Exportformat | strukturiert, gängig, maschinenlesbar; offene Schnittstellen kostenlos samt Dokumentation (Art. 30, 31) |
| Wechselentgelte | bis 11.01.2027 nur Kosten, die direkt durch den Wechsel entstehen; **ab 12.01.2027 verboten** (Art. 29) |

Einschätzung: Ein dokumentierter **Gesamtexport** (GAEB, Excel, PDF/A, E-Rechnungs-XML und ein offenes JSON-Modell)
ist damit nicht nur Kür, sondern Pflicht für jeden SaaS-Betreiber. NOVA fehlt laut unserer Recherche ein solcher
dokumentierter Gesamtexport ([NOVA Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md)).

### 10.3 Cyber Resilience Act und neue Produkthaftung

| Regelwerk | Daten | Bedeutung für uns |
|---|---|---|
| Cyber Resilience Act, Verordnung (EU) 2024/2847 | gilt allgemein ab **11.12.2027**; Meldepflichten nach Art. 14 seit **11.09.2026**; Kapitel IV (Konformitätsbewertungsstellen) seit 11.06.2026 [36] | Nach Sekundärquellen ist freie Software außerhalb einer Geschäftstätigkeit nicht erfasst; für „Open-Source-Verwalter“ (Stewards) gelten leichtere Pflichten, reine SaaS fällt meist nicht darunter (nicht am Verordnungstext geprüft). Wer eine Selbst-Hosting-Version kommerziell vertreibt, wird Hersteller mit Pflichten zu Schwachstellenmanagement, SBOM und Meldungen |
| Produkthaftungsrichtlinie (EU) 2024/2853, deutsches „Gesetz zur Modernisierung des Produkthaftungsrechts“ | Software gilt als Produkt, auch als App oder aus der Cloud. Freie und Open-Source-Software außerhalb einer Geschäftstätigkeit ist ausgenommen. Datenverlust kann ersatzfähiger Schaden sein (für nicht beruflich genutzte Daten). Laut IHK Frankfurt im Bundestag am 08.10.2026 beschlossen, am 27.10.2026 verkündet; neues Recht für Produkte, die nach dem 08.12.2026 in Verkehr gebracht werden [37] | Ein bezahltes Angebot (Hosting, Support-Lizenz) braucht Haftungsregeln in den AGB, Versicherungsschutz und einen Sicherheitsprozess. Einschätzung: Architekturbüros nutzen Daten beruflich; dann greift die Datenschadensregel nach IHK-Darstellung nicht |

### 10.4 Aufbewahrung, GoBD und Backups

| Unterlage | Frist | Rechtsgrundlage |
|---|---|---|
| Vergabedokumentation, Vergabevermerk, Angebote und Teilnahmeanträge mit Anlagen (EU-Vergaben nach VgV) | bis zum Ende der Vertragslaufzeit, mindestens 3 Jahre ab Zuschlag; Kopien geschlossener Verträge ab 10 Mio. € (Bau) bzw. 1 Mio. € (Liefer- und Dienstleistungen) ebenso [9] | § 8 Abs. 4 VgV |
| Bücher, Aufzeichnungen, Jahresabschlüsse, Organisationsunterlagen | 10 Jahre [10] | § 147 Abs. 1 Nr. 1, Abs. 3 AO |
| Buchungsbelege (z. B. Rechnungen) | 8 Jahre [10] | § 147 Abs. 1 Nr. 4, Abs. 3 AO |
| Handels- und Geschäftsbriefe, sonstige steuerlich bedeutsame Unterlagen | 6 Jahre [10] | § 147 Abs. 1 Nr. 2, 3, 5 AO |
| Rechnungen beim Unternehmer bzw. bei Privatpersonen (Leistungen am Grundstück) | 8 bzw. 2 Jahre ([HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md)) | § 14b UStG |
| Nationale Vergaben (VOB/A Abschnitt 1, UVgO) | Landeshaushaltsrecht und Vorgaben des Auftraggebers; nicht recherchiert | – |

- **Fristbeginn:** Die AO-Fristen beginnen mit Ablauf des Kalenderjahres der letzten Eintragung bzw. der Entstehung,
  des Eingangs oder Versands. Sie laufen nicht ab, solange die Unterlagen für eine noch nicht festgesetzte Steuer
  bedeutsam sind [10].
- **Datenzugriff:** Bei elektronischen Unterlagen darf das Finanzamt Einsicht, Auswertung oder Übergabe verlangen,
  auch wenn ein Dritter (z. B. ein SaaS-Anbieter) die Daten hält. Nach einem Systemwechsel genügt ab dem fünften
  Kalenderjahr eine maschinell auswertbare Aufbewahrung [10].
- **GoBD vom 14.07.2025** (BMF, IV D 2 - S 0316/00128/005/088, sofort anzuwenden): Bei E-Rechnungen genügt es, den
  strukturierten XML-Teil aufzubewahren. Ein PDF bzw. der PDF-Teil eines hybriden Formats muss nur zusätzlich
  aufbewahrt werden, wenn er abweichende oder zusätzliche steuerrelevante Angaben enthält. Inhaltliche
  Übereinstimmung reicht, bildliche ist nicht nötig [38]. (Quelle ist eine Verbandszusammenfassung; das BMF-Schreiben
  selbst wurde nicht gelesen.)
- **Wessen Pflicht?** (Einschätzung) Rechnungen der Baufirmen sind Belege des **Bauherrn**. Das Architekturbüro
  bewahrt Kopien zur eigenen Dokumentation und Haftungsabwehr auf; bei öffentlichen Vergaben führt der Auftraggeber
  die Vergabeakte, der Architekt liefert zu ([Vergaberecht, 6](/okf/research/standards/procurement-law-e-vergabe.md)).
  Die Software sollte trotzdem jede Frist abbilden können, weil sie oft das einzige vollständige Archiv ist.
- **Backups ersetzen kein Archiv** (Einschätzung): NOVA hält Sicherungen höchstens 12 Tage
  ([NOVA Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md)). Das ist Katastrophenschutz, keine
  Aufbewahrung. Nötig sind: verschlüsselte Sicherungen an einem zweiten EU-Standort, regelmäßige
  Wiederherstellungstests, ein unveränderbares Archiv (Original-XML, GAEB-Dateien, PDF/A mit Prüfsummen) mit
  Aufbewahrungsfristen je Dokumenttyp, Löschsperren für laufende Fristen und ein Löschkonzept für die Zeit danach.

## 11. Österreich und Schweiz (Ausblick)

| | Österreich | Schweiz |
|---|---|---|
| Datenformat | **ÖNORM A 2063-1:2021-03-15** „Austausch von Daten in elektronischer Form für die Phasen Ausschreibung, Vergabe und Abrechnung (AVA)“, Teil 1: Leistungsbeschreibungs-, Ausschreibungs-, Angebots-, Auftrags- und Abrechnungsdaten; aktuell, 39 Seiten, nur Deutsch [42]. Ältere Fassungen 2009/2015 siehe [GAEB DA XML, 7](/okf/research/standards/gaeb-da-xml.md) | SIA 451 bzw. heute IfA18 mit Format CRBX ([GAEB DA XML, 7](/okf/research/standards/gaeb-da-xml.md)) |
| Kosten der Spezifikation | PDF 244,78 € netto (261,91 € brutto) bei DIN Media [42]; ob XML-Schemas frei verfügbar sind, war nicht zu klären | – |
| Textkataloge | Standardisierte Leistungsbeschreibungen (z. B. LB-HB) kostenlos, mit Nutzungsbedingungen (keine Änderung, kein Weiterverkauf) ([GAEB DA XML, 7](/okf/research/standards/gaeb-da-xml.md)) | NPK (Normpositionen-Katalog): Jahreslizenz je Arbeitsplatz und Sprache ([GAEB DA XML, 7](/okf/research/standards/gaeb-da-xml.md)) |
| Software-Regeln | keine Zertifizierung recherchiert | CRB-AGB (Nr. 0226.1, Februar 2026): Elektronische Nutzung nur über **getestete, zertifizierte Software** von Drittherstellern; Lizenzen je Arbeitsplatz, benannter Nutzer (max. 2 Geräte) oder gleichzeitige Nutzer; keine 1:1-Vervielfältigung und keine Änderung der Datenstrukturen; Nutzung durch Dritte „direkt oder über softwaretechnische Verbindungen“ nur mit vorheriger schriftlicher Zustimmung und gegen Entgelt; erstellte Dokumente bleiben nach Lizenzende einsehbar [41] |

**Einschätzung:** Einen Import für ÖNORM A 2063 zu bauen, ist rechtlich möglich (Dateiformat nicht geschützt), kostet
aber den Normkauf und Testdateien. Für die Schweiz braucht ein OSS-Projekt eine Zertifizierung und einen Vertrag mit
der CRB, bevor NPK-Inhalte verarbeitet werden. Ein Online-Dienst, über den Dritte NPK-Daten nutzen, ist ohne
Zustimmung ausgeschlossen [41]. Beides ist für die erste Phase kein Thema.

## Relevanz für unser Projekt

**Muss-Anforderungen (Vorschlag)**

- **M1 – Lizenzhygiene ab dem ersten Commit:** SPDX/REUSE-Kopfzeilen, automatische Lizenzprüfung der Abhängigkeiten
  mit Sperrliste (AGPL-Bibliotheken in Apache-Teilen, Polyform, WTFPL, Pakete ohne Lizenz), SBOM, DCO-Prüfung.
- **M2 – E-Rechnungseingang:** XRechnung (UBL/CII) und ZUGFeRD/Factur-X lesen, mit KoSIT-Validator prüfen, mit der
  KoSIT-Visualisierung anzeigen, das Original-XML unverändert und mit Prüfsumme archivieren [3][12][13][38].
- **M3 – PDF/A-Ausgabe** (PDF/A-2b, mit Anhängen PDF/A-3b) für LV, Preisspiegel, Vergabevermerk und
  Prüfrechnung; Prüfung mit veraPDF in der CI [5][6][22].
- **M4 – Zentrale Dezimal- und Rundungsbibliothek** (`ROUND_HALF_UP`, GAEB-Stellen), `numeric` in der Datenbank,
  Dezimalwerte als Zeichenketten in JSON [23].
- **M5 – Rich-Text-Schema = GAEB-Teilmenge** plus Sanitizer für importierte Texte.
- **M6 – Keine geschützten Inhalte im Repo:** keine DIN-, VOB/C-, STLB- oder BKI-Texte, keine GAEB-XSD, nur
  synthetische Testdaten; Beitragsregel „keine Fremdtexte“.
- **M7 – Hosting-Grundpaket:** AV-Vertrag-Vorlage, Liste der Unterauftragsverarbeiter, EU-Rechenzentrum,
  Verschlüsselung, getestete Wiederherstellung, TOM-Dokumentation [39].
- **M8 – Vollständiger Projekt- und Kontoexport** in offenen Formaten sowie konfigurierbare Aufbewahrungsfristen
  und ein Löschkonzept (Data Act, § 8 VgV, § 147 AO, GoBD) [9][10][35][38].

**Differenzierungschancen**

- **D1 – „Ausstieg garantiert“:** offene Formate, Gesamtexport und Selbst-Hosting antworten direkt auf den Lock-in, den
  Architekten beklagen ([Schmerzpunkte](/okf/research/market/pain-points.md)). Der Data Act macht das ab 2027 zum
  Marktstandard; wir können es von Anfang an besser machen.
- **D2 – Keine Lizenzkosten für die Software selbst**, transparente Kosten nur für fremde Inhalte (STLB-Bau, BKI) und
  optionales Hosting – gegen den Preisschmerz ([NOVA Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md)).
- **D3 – Kostenloser Prüfdienst für GAEB- und E-Rechnungsdateien**, gebaut aus den freien Bibliotheken (vgl. den
  „GAEB-Doktor“ in [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)).
- **D4 – Archivpaket für die Vergabeakte** (PDF/A, GAEB, XML und JSON mit Prüfsummen) für die Fristen nach
  § 8 VgV und AO.

**Risiken**

- **R1 – Urheberrecht an Normen und Regelwerken:** KG-Katalog, VOB/B-Volltext und VHB-Formulare vor einer Veröffentlichung
  anwaltlich prüfen oder die Rechteinhaber fragen (Abschnitt 8.2).
- **R2 – Lizenzwechsel bei Abhängigkeiten:** TinyMCE (2024), PDFsharp (laut NuGet 10/2026), EPPlus und QuestPDF zeigen,
  dass sich Lizenzen ändern [17][20][21][31]. Gegenmittel: Versionen festschreiben, Projekte mit Stiftung oder breiter
  Basis bevorzugen, je Baustein eine Alternative kennen.
- **R3 – Produktrecht bei kommerziellem Angebot:** CRA-Pflichten ab 11.12.2027 (Meldepflichten seit 11.09.2026) und
  neue Produkthaftung ab 09.12.2026 [36][37]. Einschätzung: Solange das Projekt nicht monetarisiert wird, gering;
  bei bezahltem Hosting oder Support anwaltlich klären.
- **R4 – Hosting-Haftung und DSGVO:** Datenpannen, Bußgelder, Haftung gegenüber Büros; ohne AV-Vertrag, TOM und
  Versicherung kein gehosteter Betrieb.
- **R5 – Junge oder dünn gepflegte Bibliotheken:** drafthorse „nicht Kerngeschäft“, openpyxl ohne Release seit
  06/2024, KoSIT-Validator 2.0 verspätet [3][11][28]. Kapseln, damit man austauschen kann.

**Aufwandsschätzung (Einschätzung, Personentage = PT, eine erfahrene Entwicklerperson)**

| Baustein | Aufwand |
|---|---|
| Lizenz-Setup (REUSE, CI-Lizenzprüfung, SBOM, CONTRIBUTING mit DCO) | 2–3 PT |
| E-Rechnungseingang (lesen, prüfen, anzeigen, archivieren) mit den Bibliotheken | 8–15 PT (vgl. 2–4 Personenwochen in [HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md)) |
| PDF-Vorlagen LV, Preisspiegel, Vergabevermerk inkl. PDF/A und Überträgen | 10–20 PT |
| Rich-Text-Editor mit GAEB-Schema und Sanitizer | 10–15 PT |
| Rundungsbibliothek mit Testkatalog | 3–5 PT |
| Excel-Rückweg für Bieter | siehe [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md) (2–4 Wochen) |
| Hosting-Grundpaket (AV-Vertrag-Vorlage, TOM, Backup/Restore, Gesamtexport, Löschkonzept) | 10–20 PT plus anwaltliche Prüfung |

## Offene Fragen

**Recherche und Rechtslage**

1. Gilt der DIN-Verzicht von 1979 für die heutigen Ausgaben von VOB/A und VOB/B? → Anfrage an DVA/BMWSB und DIN Media.
2. Darf ein offener Kostengruppen-Katalog (Nummern plus Bezeichnungen nach DIN 276) mitgeliefert werden? Gibt es
   amtliche Werke (RBBau-Muster, Förderformulare), die den Katalog im Wortlaut enthalten?
3. Erlaubt das BMWSB/FIB ausdrücklich, VHB-Formblätter in Open-Source-Software nachzubilden? Das Portal nennt keine Lizenz [45].
4. Dürfen die GAEB-XSD in ein öffentliches Repository? → Anfrage an die GAEB-Geschäftsstelle (siehe
   [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md)).
5. BKI-Lizenzbedingungen (Export, Weitergabe an Bauherren, Nutzung in Fremdsoftware) waren öffentlich nicht zu finden.
6. Sind die XML-Schemas zu ÖNORM A 2063 frei erhältlich, und unter welchen Bedingungen? Gibt es eine österreichische
   Software-Prüfung?
7. CRB: Bedingungen und Kosten für Software-Partner und Zertifizierung; ist ein Open-Source-Werkzeug zertifizierbar?
8. PDFsharp: Ist der Wechsel auf AGPL-3.0-only (NuGet, 14.10.2026) beabsichtigt? Herstellerseite und NuGet widersprechen sich.
9. Ausgang des Rechtsmittels gegen das EuG-Urteil zum EU-US-Datenschutzrahmen (nicht recherchiert).
10. CRA- und Produkthaftungsrisiko für ein spendenfinanziertes OSS-Projekt mit optionalem Bezahl-Hosting; der
    Verordnungstext und das Bundesgesetzblatt wurden nicht selbst gelesen, nur Sekundärquellen [36][37].
11. GoBD-Schreiben vom 14.07.2025 im Wortlaut prüfen (bisher nur Verbandszusammenfassung) [38].
12. Aufbewahrungsfristen für nationale Vergaben (Landeshaushaltsrecht, Kommunen) und für Architektenunterlagen
    (Verjährung der Haftung) sind nicht recherchiert.

**Fragen an den Architekten-Freund**

1. Würdest du die Software lieber selbst betreiben (Büro-Server, eigener Cloud-Vertrag) oder als Dienst nutzen?
2. Hast du einen Datenschutzbeauftragten oder AV-Vertrags-Vorlagen? Welche Anforderungen stellen deine öffentlichen
   Auftraggeber an Datenstandort und Zertifikate?
3. Welche Unterlagen archivierst du heute wie lange (Vergabeakte, Angebote, Rechnungen, Aufmaße), und wo?
4. Bekommst du schon E-Rechnungen (XRechnung/ZUGFeRD)? Stellst du deine Honorarrechnungen elektronisch aus?
5. Welche Formulare nutzt du: VHB Bund, Landes- oder kommunale Handbücher, eigene Vorlagen?
6. Welche fremden Inhalte lizenzierst du (STLB-Bau, BKI, SIRADOS, DBD), und müsste die neue Software sie einbinden?
7. Hast du Projekte in Österreich oder der Schweiz, oder bekommst du ÖNORM-Dateien von Herstellern?
8. Ist dir ein eigener Produktname oder eine Marke wichtig, etwa für ein späteres gemeinsames Angebot?

## Quellen

1. [1] Mustangproject – Startseite (Version 2.26.0, Lizenz, Funktionen) – mustangproject.org – https://www.mustangproject.org – Herstellerangabe/Primärquelle – abgerufen 2026-11-09
2. [2] akretion/factur-x – GitHub-Repository mit Changelog – https://github.com/akretion/factur-x – Primärquelle (Quellcode) – abgerufen 2026-11-09
3. [3] itplr-kosit/validator – GitHub-Repository (KoSIT) – https://github.com/itplr-kosit/validator – Primärquelle (Quellcode) – abgerufen 2026-11-09
4. [4] § 5 UrhG Amtliche Werke – gesetze-im-internet.de – https://www.gesetze-im-internet.de/urhg/__5.html – Gesetz – abgerufen 2026-11-09
5. [5] WeasyPrint API Reference (PDF-Varianten, Anhänge) – CourtBouillon – https://doc.courtbouillon.org/weasyprint/stable/api_reference.html – Primärquelle (Doku) – abgerufen 2026-11-09
6. [6] Typst Reference: PDF – typst.app – https://typst.app/docs/reference/pdf/ – Primärquelle (Doku, v0.15.1) – abgerufen 2026-11-09
7. [7] BGH, Urteil vom 30.06.1983, I ZR 129/81 (VOB/C) – lexetius.com – https://lexetius.com/1983,3 – Gesetz (Rechtsprechung) – abgerufen 2026-11-09
8. [8] BGH, Urteil vom 26.04.1990, I ZR 79/88 (DIN-Normen) – lexetius.com – https://lexetius.com/1990,178 – Gesetz (Rechtsprechung) – abgerufen 2026-11-09
9. [9] § 8 VgV Dokumentation und Vergabevermerk – gesetze-im-internet.de – https://www.gesetze-im-internet.de/vgv_2016/__8.html – Gesetz (Verordnung) – abgerufen 2026-11-09
10. [10] § 147 AO Ordnungsvorschriften für die Aufbewahrung von Unterlagen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ao_1977/__147.html – Gesetz – abgerufen 2026-11-09
11. [11] drafthorse – Projektbeschreibung inkl. Wartungshinweis – PyPI – https://pypi.org/project/drafthorse/ – Primärquelle (Projekt) – abgerufen 2026-11-09
12. [12] itplr-kosit/validator-configuration-xrechnung – GitHub (LICENSE: Apache-2.0) – https://github.com/itplr-kosit/validator-configuration-xrechnung – Primärquelle – abgerufen 2026-11-09
13. [13] itplr-kosit/xrechnung-visualization – GitHub (LICENSE: Apache-2.0) – https://github.com/itplr-kosit/xrechnung-visualization – Primärquelle – abgerufen 2026-11-09
14. [14] ConnectingEurope/eInvoicing-EN16931 – Prüfartefakte CEN/TC 434 (LICENSE.txt: EUPL-1.2) – https://github.com/ConnectingEurope/eInvoicing-EN16931 – Primärquelle – abgerufen 2026-11-09
15. [15] Disclaimer and rights of use ZUGFeRD – FeRD/AWV – https://www.ferd-net.de/en/ueber-uns/ressourcen-1/veroeffentlichungen/disclaimer-and-rights-of-use-zugferd – Primärquelle (Rechteinhaber) – abgerufen 2026-11-09
16. [16] CKEditor 5 – LICENSE.md – GitHub – https://github.com/ckeditor/ckeditor5/blob/master/packages/ckeditor5/LICENSE.md – Primärquelle – abgerufen 2026-11-09
17. [17] „On TinyMCE 7 moving to GPLv2+“ (Discussion #9496, 20.03.2024) – GitHub/Tiny – https://github.com/tinymce/tinymce/discussions/9496 – Herstellerangabe – abgerufen 2026-11-09
18. [18] HugeRTE – LICENSE.TXT (MIT) – GitHub – https://github.com/hugerte/hugerte – Primärquelle – abgerufen 2026-11-09
19. [19] SheetJS: Node.js-Installation (npm-Version veraltet, CDN) – docs.sheetjs.com – https://docs.sheetjs.com/docs/getting-started/installation/nodejs – Herstellerangabe – abgerufen 2026-11-09
20. [20] EPPlus – license.md (Polyform Noncommercial 1.0.0) – GitHub – https://github.com/EPPlusSoftware/EPPlus – Primärquelle – abgerufen 2026-11-09
21. [21] QuestPDF – LICENSE.md (Community License, Professional/Enterprise) – GitHub – https://github.com/QuestPDF/QuestPDF/blob/main/LICENSE.md – Primärquelle – abgerufen 2026-11-09
22. [22] veraPDF-library – README (Lizenz GPLv3+ oder MPLv2+) – GitHub – https://github.com/veraPDF/veraPDF-library – Primärquelle – abgerufen 2026-11-09
23. [23] decimal — Decimal fixed-point and floating-point arithmetic – Python-Dokumentation – https://docs.python.org/3/library/decimal.html – Primärquelle (Doku) – abgerufen 2026-11-09
24. [24] Lizenzdateien (LICENSE/COPYING) der Repositories odoo/odoo, frappe/erpnext, nextcloud/server, opf/openproject, grafana/grafana, penpot/penpot, kimai/kimai, invoiceninja/invoiceninja, Dolibarr/dolibarr, metabase/metabase, twentyhq/twenty, documenso/documenso – raw.githubusercontent.com – https://raw.githubusercontent.com/<repo>/HEAD/<datei> – Primärquelle (Lizenztexte) – abgerufen 2026-11-09
25. [25] Lizenzdateien IfcOpenShell (COPYING.LESSER), xBimTeam/XbimEssentials (LICENCE.md, CDDL), frameIQ/pygaeb (MIT), samuelvoltarius/bieterwerk (AGPL-3.0) – raw.githubusercontent.com – https://raw.githubusercontent.com/<repo>/HEAD/<datei> – Primärquelle – abgerufen 2026-11-09
26. [26] Pressemitteilung Nr. 41/24 vom 05.03.2024 zum Urteil C-588/21 P (Public.Resource.Org und Right to Know/Kommission) – Gerichtshof der EU – https://curia.europa.eu/jcms/upload/docs/application/pdf/2024-03/cp240041de.pdf – Gesetz (Rechtsprechung, Pressemitteilung) – abgerufen 2026-11-09
27. [27] Die Entwicklung des Urheberrechts an privaten Normwerken. Zum Diskurs um § 5 Abs. 3 UrhG (WD 10 - 3000 - 045/20, 17.11.2020) – Wissenschaftliche Dienste des Deutschen Bundestages – https://www.bundestag.de/resource/blob/817174/WD-10-045-20-pdf-3-.pdf – Wissenschaft (Parlamentsgutachten) – abgerufen 2026-11-09
28. [28] PyPI JSON-API, Paketmetadaten (factur-x, drafthorse, pycheval, WeasyPrint, typst, reportlab, fpdf2, borb, pypdf, pikepdf, openpyxl, XlsxWriter, python-calamine, fastexcel, pandas, nh3, ifcopenshell) – pypi.org – https://pypi.org/pypi/<paket>/json – Primärquelle (Paketregister) – abgerufen 2026-11-09
29. [29] npm-Registry, Paketmetadaten (@e-invoice-eu/core, node-zugferd, pdfmake, @react-pdf/renderer, playwright, puppeteer, exceljs, xlsx, @tiptap/core, prosemirror-model, lexical, quill, ckeditor5, tinymce, dompurify, sanitize-html, decimal.js, big.js, dinero.js, web-ifc, @thatopen/components, typst) – registry.npmjs.org – https://registry.npmjs.org/<paket>/latest – Primärquelle (Paketregister) – abgerufen 2026-11-09
30. [30] crates.io-API (rust_decimal, calamine, rust_xlsxwriter, typst, umya-spreadsheet) – crates.io – https://crates.io/api/v1/crates/<crate> – Primärquelle (Paketregister) – abgerufen 2026-11-09
31. [31] NuGet-Registrierungs-API (s2industries.ZUGFeRD, itext, PdfSharp, ClosedXML, EPPlus, QuestPDF) – nuget.org – https://api.nuget.org/v3/registration5-semver1/<id>/index.json – Primärquelle (Paketregister) – abgerufen 2026-11-09
32. [32] Packagist (horstoeko/zugferd, easybill/zugferd-php, dompdf/dompdf, mpdf/mpdf, tecnickcom/tcpdf, phpoffice/phpspreadsheet, brick/money, moneyphp/money) – packagist.org – https://repo.packagist.org/p2/<paket>.json – Primärquelle (Paketregister) – abgerufen 2026-11-09
33. [33] Maven-Central-Suchindex (org.apache.pdfbox:pdfbox, org.apache.poi:poi) – search.maven.org – https://search.maven.org/solrsearch/select?q=g:<gruppe>+AND+a:<artefakt> – Primärquelle (Paketregister; Index kann hinterherhinken) – abgerufen 2026-11-09
34. [34] European Union Public Licence v. 1.2 (Lizenztext mit Anhang „Compatible Licences“) – Interoperable Europe/Europäische Kommission – https://interoperable-europe.ec.europa.eu/sites/default/files/distribution/access_url/2024-10/e5101c2c-40b6-428e-a16e-a6ac9ade8a01/EUPL_v1.2.pdf – Primärquelle (Lizenztext) – abgerufen 2026-11-09
35. [35] Data Act – Fragen und Antworten für Anbieter (Cloud-Wechsel) – Bundesnetzagentur – https://www.bundesnetzagentur.de/DE/Fachthemen/Digitales/DataAct/Hintergrund/3-Anbieter/faq/faq_anbieter.html – Primärquelle (Behörde) – abgerufen 2026-11-09
36. [36] Art. 71 Cyber-Resilienz-Verordnung (EU) 2024/2847 – lxgesetze.de – https://lxgesetze.de/crv/71 – Gesetz (EU-Verordnung, Textwiedergabe) – abgerufen 2026-11-09
37. [37] Neue Regelungen zur Produkthaftung 2026 – IHK Frankfurt am Main – https://www.frankfurt-main.ihk.de/recht/uebersicht-alle-rechtsthemen/vertragsrecht-und-e-commerce-recht/uebersicht/neue-regelungen-zur-produkthaftung-2026-7177184 – Presse (Kammerinformation) – abgerufen 2026-11-09
38. [38] Veröffentlichung aktualisierter GoBD (BMF-Schreiben vom 14.07.2025) – Zentralverband des Deutschen Handwerks – https://www.zdh.de/ueber-uns/fachbereich-steuern-und-finanzen/abgabenordnung/aktuelles/veroeffentlichung-aktualisierter-gobd/ – Presse (Verbandsinformation) – abgerufen 2026-11-09
39. [39] Kurzpapier Nr. 13: Auftragsverarbeitung, Art. 28 DS-GVO (Stand 17.12.2018) – Datenschutzkonferenz (DSK) – https://www.datenschutzkonferenz-online.de/media/kp/dsk_kpnr_13.pdf – Primärquelle (Aufsichtsbehörden) – abgerufen 2026-11-09
40. [40] EuG bestätigt Wirksamkeit des EU-US Data Privacy Framework – Heuking – https://www.heuking.de/en/news-events/newsletter-articles/detail/eug-confirms-effectiveness-of-eu-us-data-privacy-framework.html – Presse (Kanzleibeitrag) – abgerufen 2026-11-09
41. [41] AGB / Disclaimer / Impressum (Nr. 0226.1, Februar 2026) – CRB – https://crb.ch/AGB.html – Primärquelle (Rechteinhaber) – abgerufen 2026-11-09
42. [42] ÖNORM A 2063-1:2021-03-15 – DIN Media – https://www.dinmedia.de/en/standard/oenorm-a-2063-1/339043125 – Herstellerangabe (Verlag) – abgerufen 2026-11-09
43. [43] § 23 MarkenG Benutzung von Namen und beschreibenden Angaben – gesetze-im-internet.de – https://www.gesetze-im-internet.de/markeng/__23.html – Gesetz – abgerufen 2026-11-09
44. [44] § 8 MarkenG Absolute Schutzhindernisse – gesetze-im-internet.de – https://www.gesetze-im-internet.de/markeng/__8.html – Gesetz – abgerufen 2026-11-09
45. [45] Vergabe- und Vertragshandbuch für die Baumaßnahmen des Bundes (VHB 2017) – Fachinformation Bundesbau – https://www.fib-bund.de/Inhalt/Vergabe/VHB/ – Primärquelle (Behördenportal) – abgerufen 2026-11-09
