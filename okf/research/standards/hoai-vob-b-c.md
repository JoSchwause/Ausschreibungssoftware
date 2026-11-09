---
type: Research Note
title: HOAI (LPH 6–8), VOB/B, VOB/C und BGB-Bauvertragsrecht – Pflichten mit AVA-Bezug
description: Welche Pflichten aus HOAI, BGB-Bauvertragsrecht, VOB/B, VOB/C, REB und Steuerrecht die Arbeit eines Architekten in Ausschreibung, Vergabe und Abrechnung bestimmen und welche Software-Funktionen, Fristen und Datenfelder daraus für eine Open-Source-AVA folgen.
resource: https://www.gesetze-im-internet.de/hoai_2013/anlage_10.html
tags: [research, hoai, vob-b, vob-c, bauvertragsrecht, reb, abrechnung]
timestamp: 2026-11-09T17:16:17Z
sources: 74
confidence: hoch
---

# HOAI (LPH 6–8), VOB/B, VOB/C und BGB-Bauvertragsrecht: Pflichten mit AVA-Bezug

> Lesehilfe für Nicht-Architekten: **AVA** = Ausschreibung, Vergabe, Abrechnung. **LV** (Leistungsverzeichnis) = nummerierte Liste der Bauleistungen („Positionen“) mit Menge, Einheit und Text, die Firmen bepreisen (engl. *bill of quantities*). **LPH** = Leistungsphase der HOAI. Fachbegriffe werden beim ersten Auftreten erklärt. Rechtsangaben sind Recherche-Ergebnisse, keine Rechtsberatung.

## Kurzfassung

- **Stand 09.11.2026:** Die HOAI gilt in der Fassung von 2021 unverändert (letzte Änderung 22.03.2023) [1]. Eine Novelle („HOAI 2027“) ist angekündigt, ein Referentenentwurf lag laut Verbands- und Fachquellen Anfang November 2026 aber noch nicht vor [5][6]. Die VOB/B gilt weiter in der Ausgabe 2016 [43][44][67]. Die VOB/C steht auf dem Stand „Ergänzungsband 2023“ mit DIN 18299:2023-09 [44][47]. Das BGB-Bauvertragsrecht gilt seit 2018. Ein BMJV-Referentenentwurf „Gebäudetyp E“ vom 26.10.2026 würde § 650a BGB erweitern [10][6].
- **Wirtschaftliches Gewicht:** Die AVA-nahen Phasen LPH 6 (10 %), LPH 7 (4 %) und LPH 8 (32 %) machen zusammen **46 % des Honorars** für Gebäude aus [3]. Software, die diese Phasen gut abdeckt, trifft den Kern der Büroarbeit.
- **Kostenkontrollkette als Pflicht:** Die HOAI verlangt Vergleiche über alle Stufen. Kostenschätzung (LPH 2) und Kostenberechnung (LPH 3) werden mit dem vom Planer bepreisten LV (LPH 6) verglichen, dann mit dem Ausschreibungsergebnis (LPH 7), mit Auftragssummen inkl. Nachträgen und Abrechnung (LPH 8) und zuletzt mit der Kostenfeststellung [2]. Dafür braucht jede LV-Position eine DIN-276-Zuordnung.
- **BGB vs. VOB/B:** Die beiden unterscheiden sich in fast jeder abrechnungsrelevanten Regel, etwa bei Fristen, Nachtragsvergütung, Abnahme und Mängelverjährung (4 statt 5 Jahre) [12][37][16][32]. Der **Vertragstyp je Auftrag** ist deshalb das zentrale Steuerungsmerkmal der Software.
- **Fristen-Engine ist Muss:** Es gibt Dutzende harte Fristen (21/30/60 Tage, 6/12/18 Werktage, 28+28 Tage, 2/4/5 Jahre) mit teils scharfen Rechtsfolgen. Beispiel: Stundenlohnzettel, die der Bauherr nicht binnen 6 Werktagen zurückgibt, gelten als anerkannt [39][40][41].
- **Nachträge:** Wie der Preis für geänderte Leistungen zu ermitteln ist, ist uneinheitlich. Die Verwaltungspraxis im Bund schreibt die **Urkalkulation** fort (VHB) [55]. Das BGB und der BGH (für Mehrmengen) stellen auf **tatsächlich erforderliche Kosten plus Zuschläge** ab [17][29]. Ein Prüfmodul sollte beide Methoden abbilden.
- **VOB/C Abschnitt 5** legt die Mengenermittlung fest, z. B. ob Öffnungen bis 2,5 m² übermessen werden (laut Sekundärquelle) [48][49]. Die ATV-Texte sind kostenpflichtige DIN-Normen [72]. Regeln sollten deshalb **parametrierbar** sein, die Normtexte dürfen nicht mitgeliefert werden.
- **REB-VB 23.003** (Ausgabe 2009) ist der etablierte Standard für prüfbare elektronische Mengenberechnungen und die Grundlage von GAEB X31. Das Dokument liegt frei bei der BASt [52][54]. Es ist ein gut spezifizierter, realistisch umsetzbarer Baustein.
- **Steuern in der Rechnungsprüfung:** Ohne Freistellungsbescheinigung sind 15 % Bauabzugsteuer einzubehalten, wenn der Bauherr Unternehmer oder öffentliche Hand ist [57]. Hinzu kommen § 13b UStG (Steuerschuld des Leistungsempfängers) [60] und die gestaffelte E-Rechnungspflicht für Unternehmen (Ausstellung spätestens ab 2028) [61][64].
- **Private Bauherren:** Gegenüber Verbrauchern ist die VOB/B nicht vor der AGB-Kontrolle geschützt [25][28]. Verträge über **einzelne Gewerke** sind laut BGH keine Verbraucherbauverträge [27]. Daraus entsteht eine eigene Regelkonstellation.
- **Öffentliche Auftraggeber:** Das VHB Bund regelt Rechnungsprüfung, Nachträge, Sicherheiten (5 %/3 % ab 250.000 € netto) und Datenaustausch nach GAEB/REB im Detail [55]. Es ist die beste frei verfügbare Prozessspezifikation.

## 1. Orientierung: Wer regelt was?

| Regelwerk | Rechtsnatur | Stand am 09.11.2026 | Wirkt auf | AVA-Bezug |
|---|---|---|---|---|
| **HOAI** (Honorarordnung für Architekten und Ingenieure) | Rechtsverordnung des Bundes; seit 2021 Honorar frei vereinbar, Tafelwerte nur Orientierung [1] | Fassung 2013 mit Änderungen 2021, zuletzt geändert 22.03.2023 [1] | Architektenvertrag (Honorar; Leistungsbilder als Referenz für den Leistungsumfang) | LPH 6–8 beschreiben die AVA-Arbeit inhaltlich [2] |
| **BGB-Werk- und Bauvertragsrecht** (§§ 631 ff., 650a ff.) | Gesetz | seit 01.01.2018; Entwurf „Gebäudetyp E“ (26.10.2026) [10] | jeder Bauvertrag, auch der Architektenvertrag (§§ 650p ff.) [22] | Abschläge, Nachträge, Abnahme, Schlussrechnung |
| **VOB/B** (DIN 1961) | Allgemeine Geschäftsbedingungen (AGB), vom DVA erarbeitet; gilt nur, wenn vereinbart [25] | Ausgabe 2016 [43][44] | Bauverträge mit VOB/B | Abrechnung, Zahlungsfristen, Sicherheiten, Mängel |
| **VOB/C** (ATV DIN 18299 ff.) | DIN-Normen; über § 1 Abs. 1 VOB/B Vertragsbestandteil [31] | Ergänzungsband 2023, 68 ATV [44][47] | VOB-Verträge (bei BGB-Verträgen nur, wenn vereinbart) | LV-Erstellung (Abschnitt 0), Nebenleistungen (Abschnitt 4), Abrechnung (Abschnitt 5) |
| **VOB/A** | Vergaberegeln für öffentliche Auftraggeber | Abschnitte 2/3 neu gefasst „Ausgabe 2026“ (anwendbar seit 08.09.2026) [66]; Abschnitt 1 (national) weiter Ausgabe 2019, nur § 3a geändert, zuletzt zum 01.01.2026 [73][74] | nur öffentliche Vergaben | → [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md) |
| **REB** (Regelungen für die elektronische Bauabrechnung) | Verfahrensbeschreibungen des Bundes (ursprünglich Abteilung Straßenbau) [52] | REB-VB 23.003 Ausgabe 2009 [52] | Abrechnung, wenn vereinbart | Formeln und Datenformat der Mengenberechnung |
| **VHB Bund** (Vergabe- und Vertragshandbuch für die Baumaßnahmen des Bundes) | Verwaltungsvorschrift/Handbuch für den Bundesbau | Ausgabe 2017, Stand 2019; Lesefassung Stand 2023 [56] | Bundesbauverwaltung (Länder/Kommunen haben eigene Handbücher – nicht geprüft) | Formblätter, Prüfprozesse |
| **EStG §§ 48 ff., UStG §§ 13b, 14 ff.** | Gesetz | aktuell (abgerufen 09.11.2026) | Bauherr als Leistungsempfänger | Rechnungsprüfung, Zahlung, Archivierung |

**Rangfolge bei Widersprüchen im VOB-Vertrag** (§ 1 Abs. 2 VOB/B) [31]. Software, die Vertragsunterlagen zusammenstellt, sollte diese Reihenfolge abbilden:

1. Leistungsbeschreibung (LV mit Vorbemerkungen)
2. Besondere Vertragsbedingungen (BVB, projektspezifisch)
3. Zusätzliche Vertragsbedingungen (ZVB, z. B. eines Auftraggebers für alle Projekte)
4. Zusätzliche Technische Vertragsbedingungen (ZTV)
5. Allgemeine Technische Vertragsbedingungen (VOB/C)
6. Allgemeine Vertragsbedingungen (VOB/B)

## 2. HOAI: Leistungsbild, Honoraranteile und Reformstand

### 2.1 Rechtsnatur seit 2021

- Der EuGH hat am 04.07.2019 (C-377/17) die verbindlichen Mindest- und Höchstsätze der HOAI als Verstoß gegen die EU-Dienstleistungsrichtlinie gewertet [4].
- Seither richtet sich das Honorar nach der Vereinbarung in **Textform**. Fehlt eine solche Vereinbarung, gilt für Grundleistungen der **Basishonorarsatz** (der untere Tafelwert) [1]. Verbraucher muss der Architekt vor Vertragsschluss in Textform darauf hinweisen, dass ein höheres oder niedrigeres Honorar vereinbart werden kann. Unterbleibt der Hinweis, gilt höchstens der Basishonorarsatz (§ 7 Abs. 2) [1].
- Die Änderungen von 2020 gelten für Verträge, die nach dem 31.12.2020 geschlossen wurden (§ 57 Abs. 2) [1].
- **Grundleistungen** sind die regelmäßig nötigen Leistungen eines Leistungsbilds. **Besondere Leistungen** können zusätzlich vereinbart werden, und ihre Liste ist nicht abschließend (§ 3) [1].
- **Anrechenbare Kosten** (die Kostenbasis der Honorarberechnung) werden nach DIN 276-1:2008-12 ermittelt, nicht nach der neueren DIN 276:2018-12 (§ 4 Abs. 1) [1]. Einschätzung: Eine AVA-Software muss deshalb beide DIN-276-Fassungen abbilden können → [Kostenplanung nach DIN 276](/okf/research/standards/din-276-cost-planning.md).
- Für Fälligkeit und Abschläge des Architektenhonorars verweist § 15 HOAI auf § 650g Abs. 4 und § 632a BGB [1].

### 2.2 Reformstand („HOAI 2027“)

| Datum | Ereignis | Quelle |
|---|---|---|
| 2022 bzw. Nov. 2023/Anfang 2024 | Gutachten zu Leistungsbildern/Planungsbereichen fertiggestellt bzw. veröffentlicht (die Datierung weicht zwischen den Quellen ab) | [5][7] |
| 17.01.2025 / 27.03.2025 | Honorargutachten (Endbericht, über 600 Seiten) datiert bzw. vom BMWK veröffentlicht | [9] |
| 04.12.2025 | AHO-Herbsttagung: Das BMWE kündigt die Fortführung „Mitte 2026“ an; Fachpresse berichtet von niedriger Priorität | [6][8] |
| 21.01.2026 | Treffen von BMWE und BMWSB mit den Verbänden; Ziel einer Novelle bestätigt | [7][8] |
| 01.07.2026 | Arbeit auf Arbeitsebene begonnen, kein Zeitplan, Herbst 2026 als vages Ziel; Abfrage bei allen 16 Ländern (die HOAI braucht die Zustimmung des Bundesrats) | [7] |
| 07.10.2026 | AHO kündigt Herbsttagung am 24.11.2026 unter dem Titel „HOAI 2027 auf der Zielgeraden“ an; das BMWE soll dort den Sachstand berichten | [6] |
| 02.11.2026 | Weiterhin kein Referentenentwurf; die Verbände erwarten eine Neufassung 2027 | [5] |

Diskutierte Inhalte (Vorschläge aus den Gutachten, **kein Entwurfstext**) [5]:

- Tafelwerte für Gebäude/Innenräume +16 bis +67 %, für Technische Ausrüstung +26 bis +76 %.
- Neues Leistungsbild „Städtebaulicher Entwurf“.
- Begriffsdefinition „Nachhaltigkeit“.
- Verschiebungen zwischen Grund- und Besonderen Leistungen (nicht näher benannt).

Ob LPH 6–8 inhaltlich geändert werden, war nicht zu ermitteln.

**Einschätzung:** Das Leistungsbild sollte in der Software als **versionierte Konfiguration** hinterlegt sein, etwa HOAI 2013/2021 und künftig 2027. Das gilt für Checklisten, Honoraranteile und Dokumentvorlagen. Für Verträge vor und nach einem Stichtag gelten typischerweise unterschiedliche Fassungen [1].

### 2.3 Honoraranteile der Leistungsphasen (§ 34 HOAI)

| LPH | Bezeichnung | Gebäude | Innenräume |
|---|---|---|---|
| 1 | Grundlagenermittlung | 2 % | 2 % |
| 2 | Vorplanung | 7 % | 7 % |
| 3 | Entwurfsplanung | 15 % | 15 % |
| 4 | Genehmigungsplanung | 3 % | 2 % |
| 5 | Ausführungsplanung | 25 % | 30 % |
| **6** | **Vorbereitung der Vergabe** | **10 %** | **7 %** |
| **7** | **Mitwirkung bei der Vergabe** | **4 %** | **3 %** |
| **8** | **Objektüberwachung (Bauüberwachung) und Dokumentation** | **32 %** | **32 %** |
| 9 | Objektbetreuung | 2 % | 2 % |

Quelle: [3]. Summe LPH 6–8: Gebäude 46 %, Innenräume 42 %.

### 2.4 LPH 6 – Vorbereitung der Vergabe (Anlage 10.1, sinngemäß)

| Buchst. | Grundleistung (sinngemäß) [2] | Folgerung für die Software |
|---|---|---|
| a | Vergabeterminplan aufstellen | Terminplan je Vergabeeinheit: Versand, Angebotsfrist, Eröffnung, Bindefrist, Zuschlag, Ausführungsbeginn |
| b | Leistungsbeschreibungen mit LV nach Leistungsbereichen aufstellen; Mengen aus der Ausführungsplanung ermitteln, unter Einbezug der Fachplaner-Beiträge | LV-Editor mit Gliederung nach Leistungsbereichen/Gewerken; nachvollziehbare Mengenermittlung (Formeln, Pläne, BIM) → [BIM und AVA](/okf/research/standards/bim-and-ava.md) |
| c | Schnittstellen zu den LVs der Fachplaner abstimmen | Mehrere LVs pro Projekt, Schnittstellen-/Abgrenzungsliste, Dublettenprüfung |
| d | Kosten auf Grundlage **vom Planer bepreister LVs** ermitteln | Preisdatenbank/Erfahrungspreise je Position; „bepreistes LV“ als eigene Kostenstufe |
| e | Kostenkontrolle: bepreiste LVs gegen die **Kostenberechnung** vergleichen | DIN-276-Kostengruppe je Position, Soll-Ist-Vergleich mit Abweichungsanzeige |
| f | Vergabeunterlagen für alle Leistungsbereiche zusammenstellen | Dokumentpaket (Anschreiben, BVB/ZVB, LV, Pläne, GAEB-Datei) → [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) |

Besondere Leistungen LPH 6 (Auswahl) [2]:

- **Leistungsbeschreibung mit Leistungsprogramm**: Ausschreibung über Funktions- und Zielvorgaben statt einzelner Positionen. Wird so ausgeschrieben, wird sie ganz oder teilweise zur Grundleistung, und die entsprechenden LV-Grundleistungen entfallen.
- Alternative Leistungsbeschreibungen für geschlossene Leistungsbereiche.
- Vergleichende Kostenübersichten.

### 2.5 LPH 7 – Mitwirkung bei der Vergabe

| Buchst. | Grundleistung (sinngemäß) [2] | Folgerung für die Software |
|---|---|---|
| a | Vergaben der Fachplaner koordinieren | Vergabe-Übersicht über alle LVs/Fachplaner |
| b | Angebote einholen | Bieterverwaltung, Versand, Angebotsrücklauf (z. B. GAEB-Angebotsdatei) |
| c | Angebote prüfen und werten, inkl. **Preisspiegel nach Einzelpositionen oder Teilleistungen**; zusätzlich Angebote für **zusätzliche und geänderte Leistungen** (Nachtragsangebote) und die Angemessenheit der Preise prüfen | Preisspiegel (Positions- und Summenvergleich), rechnerische Prüfung, Auffälligkeiten; Nachtragsprüfung (Abschnitt 3.5) |
| d | Bietergespräche führen | Gesprächsprotokolle je Bieter |
| e | Vergabevorschläge erstellen, Vergabeverfahren dokumentieren | Vergabevorschlag als Bericht; lückenlose Dokumentation (bei öffentlichen AG zusätzlich Vergabevermerk → [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md)) |
| f | Vertragsunterlagen für alle Leistungsbereiche zusammenstellen | Auftrags-LV, Vertragsbestandteile in Rangfolge (§ 1 Abs. 2 VOB/B), Vertragstyp |
| g | Ausschreibungsergebnisse mit den bepreisten LVs oder der Kostenberechnung vergleichen | Kostenkontroll-Bericht je Vergabe |
| h | Bei der Auftragserteilung mitwirken | Auftragsschreiben-Vorlage |

Besondere Leistungen LPH 7 (Auswahl) [2]:

- Nebenangebote mit Auswirkung auf die Planung prüfen und werten.
- Bei der **Mittelabflussplanung** mitwirken (Planung, wann welche Zahlungen fällig werden).
- Nachprüfungsverfahren (vergaberechtliche Streitverfahren) begleiten.
- Bei der Prüfung von **bauwirtschaftlich begründeten Nachtragsangeboten** mitwirken, etwa Mehrkosten aus Bauzeitverschiebung.
- Preisspiegel nach besonderen Anforderungen erstellen.

**Wichtig:** Die *technische* Prüfung von Nachtragsangeboten ist Grundleistung (c). Die *bauwirtschaftliche* Prüfung ist Besondere Leistung, wird also extra vergütet [2].

### 2.6 LPH 8 – Objektüberwachung (AVA-relevante Teile) und LPH 9

| Buchst. | Grundleistung (sinngemäß) [2] | Folgerung für die Software |
|---|---|---|
| d | Terminplan (Balkendiagramm) aufstellen, fortschreiben, überwachen | Termin-Import/-Export, Bezug zu Vertragsfristen |
| e | Bauablauf dokumentieren (z. B. Bautagebuch) | Bautagebuch, verknüpft mit Behinderungsanzeigen und Stundenlohnzetteln |
| f | **Gemeinsames Aufmaß** mit den ausführenden Firmen | Aufmaß-Erfassung (auch mobil), Freigabestatus, REB-Formeln, Fotos |
| g | **Rechnungsprüfung** einschließlich Prüfung der Aufmaße | Rechnungseingangsbuch, Prüfworkflow, kumulierte Abrechnung, Kürzungen mit Begründung |
| h | Ergebnisse der Rechnungsprüfung mit den **Auftragssummen inkl. Nachträgen** vergleichen | Vertragskonto je Auftrag (Auftrag + Nachträge + Abrechnungsstand) |
| i | **Kostenkontrolle**: Abrechnung der Firmen mit den Vertragspreisen vergleichen | Prognose/Hochrechnung, Mengen- und Preisabweichungen |
| j | **Kostenfeststellung** (z. B. nach DIN 276) | Abschlussbericht nach Kostengruppen |
| k | Abnahme organisieren, Mängel feststellen, Abnahme empfehlen | Abnahmeprotokoll inkl. Vorbehalten (Mängel, Vertragsstrafe) |
| o | **Verjährungsfristen für Mängelansprüche auflisten** | Gewährleistungsregister je Auftrag |
| p | Beseitigung der bei der Abnahme festgestellten Mängel überwachen | Mängelliste mit Fristen und Status |

Besondere Leistungen LPH 8 [2]:

- **Zahlungsplan** aufstellen, überwachen und fortschreiben.
- Differenzierte Zeit-, Kosten- oder Kapazitätspläne.
- Tätigkeit als verantwortlicher Bauleiter nach Landesrecht.

Die übrigen Grundleistungen (a–c, l–n) betreffen Überwachung, Koordination, behördliche Abnahmen, Dokumentation und Übergabe [2].

LPH 9 (Objektbetreuung) [2]:

- Mängel innerhalb der Verjährungsfristen fachlich bewerten, längstens fünf Jahre ab Abnahme.
- Das Objekt **vor Ablauf der Verjährungsfristen** begehen.
- Bei der **Freigabe von Sicherheitsleistungen** mitwirken.

→ Die Software braucht Erinnerungen vor Fristablauf und ein Sicherheitenregister.

Zum Vergleich: Für die Technische Ausrüstung (Anlage 15) verlangt LPH 8 noch den Vergleich der Abrechnung „mit dem **Kostenanschlag**“ sowie das Prüfen und Bescheinigen des Leistungsstands [1]. Anlage 10 (Gebäude) nennt keinen Kostenanschlag mehr [1]. Fachplaner-Daten können also anders strukturiert sein.

### 2.7 Kostenermittlungen und Kostenkontrolle über die Phasen

1. **LPH 2 – Kostenschätzung** nach DIN 276, Vergleich mit dem finanziellen Rahmen. Gliederung mindestens bis zur 1. Ebene der Kostengruppen [1][2].
2. **LPH 3 – Kostenberechnung** nach DIN 276, Vergleich mit der Kostenschätzung. Gliederung mindestens bis zur 2. Ebene [1][2].
3. **LPH 6 – Kosten aus vom Planer bepreisten LVs**, verglichen mit der Kostenberechnung [2]. In DIN 276:2018-12 heißt diese Stufe laut Sekundärquelle „Kostenvoranschlag“ (Grundlage: Ausführungsplanung und Vergabevorbereitung) [71].
4. **LPH 7 – Ausschreibungsergebnis** gegen bepreiste LVs oder Kostenberechnung [2]. In der DIN-Systematik entspricht das etwa dem „Kostenanschlag“ (Einschätzung; Details → [DIN 276](/okf/research/standards/din-276-cost-planning.md)).
5. **LPH 8 – Abrechnung gegen Vertragspreise, Rechnungsprüfung gegen Auftragssummen inkl. Nachträgen, Kostenfeststellung** [2].

**Datenmodell-Folgerung (Einschätzung):** Jede LV-Position braucht eine Kostengruppe (DIN 276, Fassung je Projekt). Zusätzlich braucht sie Preisschichten mit Herkunft: Planerpreis (LPH 6), Angebotspreise je Bieter (LPH 7), Vertragspreis (Auftrag), Nachtragspreise und abgerechnete Mengen (LPH 8). Nur so lassen sich alle HOAI-Vergleiche ohne Excel-Brüche erzeugen.

### 2.8 Der Architektenvertrag im BGB (Kurzüberblick)

- **Zielfindungsphase:** Sind die wesentlichen Planungs- und Überwachungsziele noch nicht vereinbart, legt der Architekt zuerst eine Planungsgrundlage mit **Kosteneinschätzung** vor (§ 650p Abs. 2). Danach hat der Bauherr ein Sonderkündigungsrecht, das zwei Wochen nach Vorlage erlischt. Bei Verbrauchern gilt das nur, wenn in Textform belehrt wurde (§ 650r) [22].
- **Anordnungen und Honorar:** Das Anordnungsrecht nach § 650b gilt auch im Architektenvertrag. Die Vergütung für angeordnete Mehr- oder Minderleistungen richtet sich nach den HOAI-Regeln, soweit die HOAI diese Leistungen erfasst (§ 650q) [22].
- **Teilabnahme:** Der Architekt kann eine Teilabnahme seiner Leistungen verlangen, sobald die letzte Bauleistung abgenommen ist (§ 650s) [22]. Seine Mängelhaftung verjährt nach **5 Jahren** ab Abnahme (§ 634a Abs. 1 Nr. 2) [12].
- **Haftung bei Überwachungsfehlern:** Wird der Architekt wegen eines Überwachungsfehlers in Anspruch genommen, kann er die Leistung verweigern, solange der Bauherr der ausführenden Firma noch keine erfolglose Nacherfüllungsfrist gesetzt hat (§ 650t) [22].
- **Prüfvermerk:** Der Prüfvermerk des Architekten auf einer Rechnung ist laut BGH eine **Wissenserklärung** gegenüber dem Bauherrn, kein Anerkenntnis gegenüber der Firma (BGH, 14.10.2004, VII ZR 190/03) [30]. → Software sollte „geprüft (Architekt)“ und „freigegeben/anerkannt (Bauherr)“ als getrennte Status führen.

## 3. Bauvertrag: BGB (seit 2018) und VOB/B (Ausgabe 2016)

### 3.1 Status der VOB/B und ihr Verhältnis zum BGB

- **Aktuelle Fassung:** VOB/B Ausgabe 2016 (Bekanntmachung vom 07.01.2016, BAnz AT 19.01.2016 B3, berichtigt BAnz AT 01.04.2016 B1) [43], als Norm DIN 1961:2016-09 [44]. Die Gesamtausgabe 2019 hat Teil B unverändert gelassen [44][45].
- **Keine Anpassung an das BGB 2018:** Der DVA (Deutscher Vergabe- und Vertragsausschuss für Bauleistungen) hat die VOB/B trotz des neuen BGB-Bauvertragsrechts vorerst nicht geändert [45]. Ein Entwurf des damaligen BMI von Ende 2020 wurde bisher nicht veröffentlicht. Ein Termin für eine neue VOB/B ist nicht bekannt (Stand der Quelle: 02.07.2026) [67].
- **VOB/A 2026 betrifft Teil A, nicht Teil B:** Die Neufassung 2026 betraf nur die VOB/A-Abschnitte 2 und 3 [66]. Abschnitt 1 (nationale Vergaben) gilt weiter in der Ausgabe 2019; geändert wurde dort nur § 3a (Wertgrenzen), befristet 2025 und neu gefasst zum 01.01.2026 (BAnz AT 16.12.2025 B7) [73][74]. Eine neue VOB/B ab 2025/2026 war nicht zu finden (Stand 09.11.2026).
- **Privilegierung:** Wird die VOB/B **„als Ganzes“ ohne inhaltliche Abweichungen** in einen Vertrag mit einem Unternehmer oder der öffentlichen Hand einbezogen, prüfen Gerichte ihre einzelnen Klauseln nicht nach AGB-Recht (§ 310 Abs. 1 Satz 3 BGB) [25]. Gegenüber **Verbrauchern** gilt diese Privilegierung nicht (BGH, 24.07.2008, VII ZR 55/07) [28].
- **Warnung des VHB Bund:** Weichen ergänzende Vertragsbedingungen inhaltlich von der VOB/B ab, droht die AGB-Kontrolle [55]. Dann können unwirksame Klauseln durch BGB-Regeln ersetzt werden, etwa die 30-Tage-Verhandlungsphase vor Anordnungen, die Nachtragsvergütung nach tatsächlichen Kosten oder 80 % Abschlag auf strittige Nachtragsangebote [55]. Das VHB beruft sich dabei auf § 310 BGB [55].
  - → Software-Vorlagen für BVB/ZVB sollten **VOB/B-konform** bleiben und Abweichungen sichtbar markieren (Einschätzung).

### 3.2 Vertrags- und Preisformen

| Form | Vergütung | Mengenrisiko | AVA-Folgen |
|---|---|---|---|
| **Einheitspreisvertrag** | Einheitspreis (EP) × tatsächlich ausgeführte Menge (§ 2 Abs. 2 VOB/B) [32] | beim Auftraggeber | LV mit **Vordersätzen** (geschätzten Mengen); Abrechnung nach Aufmaß. Vertragsbestandteil sind die EP, nicht die Mengen [68] |
| **Pauschalvertrag** | feste Pauschalsumme; Anpassung nur bei unzumutbarer Abweichung (§ 313 BGB), Anordnungen nach Abs. 4–6 bleiben möglich (§ 2 Abs. 7) [32] | beim Auftragnehmer (Umfang je nach Vertragsgestaltung) | Abrechnung nach Leistungsstand/Zahlungsplan statt Aufmaß; Nachträge trotzdem nötig |
| **Stundenlohnvertrag/-arbeiten** | nur bei vorheriger ausdrücklicher Vereinbarung (§ 2 Abs. 10, § 15) [32][39] | beim Auftraggeber | Stundenlohnzettel-Workflow |
| Pauschalen innerhalb von EP-Verträgen | z. B. Baustelleneinrichtung; Anpassung bei Mengenänderungen abhängiger Positionen (§ 2 Abs. 3 Nr. 4) [32][68] | gemischt | Positionsart „Pauschal“ im LV |

Öffentliche Auftraggeber sollen Bauleistungen in der Regel zu Einheitspreisen vergeben (§ 4 VOB/A) [68]. Die gängige Unterscheidung in Detail- und Global-Pauschalvertrag wurde hier nicht gesondert belegt (Details → [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md)).

### 3.3 BGB und VOB/B im Vergleich (abrechnungsrelevante Regeln)

| Thema | BGB-Bauvertrag | VOB/B-Vertrag |
|---|---|---|
| Änderungen anordnen | Erst Einigung anstreben; die Firma muss ein Nachtragsangebot machen. Ohne Einigung binnen **30 Tagen** kann der Bauherr in **Textform** anordnen (§ 650b) [16] | Bauherr kann Änderungen des Bauentwurfs und erforderliche Zusatzleistungen anordnen (§ 1 Abs. 3, 4) [31] |
| Vergütung geänderter/zusätzlicher Leistungen | **tatsächlich erforderliche Kosten** + angemessene Zuschläge; vereinbarungsgemäß hinterlegte Urkalkulation begründet eine Vermutung (§ 650c Abs. 1, 2) [17] | neuer Preis unter Berücksichtigung von Mehr-/Minderkosten (§ 2 Abs. 5); bei Zusatzleistungen auf Grundlage der Preisermittlung, **Ankündigung vor Ausführungsbeginn** (§ 2 Abs. 6) [32] |
| Abschlag auf strittige Nachträge | **80 %** des Nachtragsangebots ansetzbar (§ 650c Abs. 3) [17] | laut VHB Bund nicht vorgesehen, solange die VOB/B AGB-fest vereinbart ist [55] |
| Mengenänderungen | keine Sonderregel (allgemeines Recht) | ±10 %-Regel (§ 2 Abs. 3) [32] |
| Abschlagszahlungen | Wert der erbrachten, geschuldeten Leistungen; Nachweis durch Aufstellung (§ 632a) [11] | Wert der nachgewiesenen Leistungen inkl. USt; prüfbare Aufstellung; fällig **21 Tage** nach Zugang (§ 16 Abs. 1) [40] |
| Fälligkeit Schlusszahlung | Abnahme + **prüffähige Schlussrechnung**; gilt als prüffähig ohne begründete Einwendungen binnen **30 Tagen** (§ 650g Abs. 4) [19] | nach Prüfung, spätestens **30 Tage** nach Zugang (bis **60 Tage**, wenn ausdrücklich vereinbart); Einwand fehlender Prüfbarkeit nur innerhalb dieser Frist (§ 16 Abs. 3) [40] |
| Abnahme | Pflicht bei vertragsgemäßem Werk; **fiktive Abnahme** nach Fristsetzung, wenn der Bauherr nicht unter Angabe mindestens eines Mangels verweigert; bei Verbrauchern nur mit Hinweis in Textform (§ 640) [13] | binnen **12 Werktagen** nach Verlangen; fiktiv 12 Werktage nach schriftlicher Fertigstellungsmitteilung bzw. 6 Werktage nach Beginn der Benutzung (§ 12) [36] |
| Mängelverjährung Bauwerk | **5 Jahre** ab Abnahme (§ 634a) [12] | **4 Jahre** (Regelfrist); 2 Jahre für wartungsrelevante Anlagenteile ohne Wartungsauftrag; nach schriftlicher Mängelrüge 2 Jahre (§ 13 Abs. 4, 5) [37] |
| Sicherheiten | Bauhandwerkersicherung zugunsten der Firma (§ 650f) [18]; beim Verbraucherbauvertrag 5 % Sicherheit für den Verbraucher (§ 650m) [21] | Sicherheit nur, wenn vereinbart; Einbehalt höchstens 10 % je Zahlung bis zur Sicherheitssumme (§ 17) [41] |
| Kündigung | jederzeit (§ 648) oder aus wichtigem Grund (§ 648a); **schriftlich** (§ 650h) [20] | § 8 VOB/B, schriftlich; nach Kündigung Aufmaß, Abnahme und prüfbare Rechnung (§ 8 Abs. 6, 7) [34] |
| Stundenlohn | nach Vereinbarung | nur bei vorheriger Vereinbarung; Zettel-Rückgabe in 6 Werktagen, sonst gelten sie als anerkannt (§ 15) [39] |

### 3.4 Mengenänderungen (§ 2 Abs. 3 VOB/B)

Regel [32]:

- Weicht die ausgeführte Menge einer Position **um höchstens 10 %** vom Vordersatz ab, bleibt der vertragliche EP.
- Bei **Mehrmengen über 110 %** ist auf Verlangen für die darüber hinausgehende Menge ein neuer Preis zu vereinbaren.
- Bei **Mindermengen unter 90 %** ist auf Verlangen der EP zu erhöhen, soweit die Firma keinen Ausgleich über andere Positionen oder auf andere Weise erhält. Die Erhöhung soll vor allem die nicht gedeckten Baustellengemeinkosten und Allgemeinen Geschäftskosten ausgleichen.

Laut BGH richtet sich der neue Preis für Mehrmengen ohne Einigung nach den **tatsächlich erforderlichen Kosten zuzüglich angemessener Zuschläge**, nicht nach fortgeschriebener Urkalkulation (BGH, 08.08.2019, VII ZR 34/18) [29]. Eine Klausel, die Preisanpassungen bei Mengenänderungen ausschließt, hielt das OLG Köln (07.11.2014, 19 U 55/14) für AGB-rechtlich unbedenklich [69].

**Rechenbeispiel (eigenes Beispiel):** Eine Position hat den Vordersatz 1.000 m² und einen EP von 20 €.

- **Ausgeführt 1.250 m²:** 1.100 m² werden zum alten EP abgerechnet. Für die 150 m² über 110 % kann jede Seite einen neuen Preis verlangen.
- **Ausgeführt 800 m²:** Die Firma kann eine EP-Erhöhung verlangen. Prüfen muss man, ob Mehrmengen in anderen Positionen die Unterdeckung ausgleichen („Ausgleichsberechnung“).

→ **Software:** Die Software vergleicht Abrechnungs- und Vordersatzmenge automatisch je Position, markiert Abweichungen über ±10 %, teilt die Menge in die Bereiche ≤110 % und >110 % auf und bietet eine Ausgleichsberechnung über alle Positionen eines Auftrags an.

### 3.5 Nachträge (geänderte und zusätzliche Leistungen)

Ein **Nachtrag** ist eine Vergütungsforderung für Leistungen, die nicht oder anders im Vertrag stehen.

VOB/B [32]:

- **§ 2 Abs. 5** (geänderte Leistung): Ändern Entwurfsänderungen oder andere Anordnungen die Grundlagen des Preises, ist ein neuer Preis zu vereinbaren, möglichst vor der Ausführung.
- **§ 2 Abs. 6** (zusätzliche Leistung): Die Firma hat einen Vergütungsanspruch, muss ihn aber vor Beginn der Ausführung **ankündigen**.
- **§ 2 Abs. 8** (Leistungen ohne Auftrag): Sie werden grundsätzlich nicht vergütet. Ausnahmen sind ein nachträgliches Anerkenntnis durch den Bauherrn oder Leistungen, die notwendig waren, seinem mutmaßlichen Willen entsprachen und unverzüglich angezeigt wurden.

**Preisermittlung – Quellen weichen ab:**

- Das **VHB Bund** (Leitfaden 510) stellt bei § 2 Abs. 5 grundsätzlich auf die **Urkalkulation** der geänderten Position ab. Die Urkalkulation ist die interne Preiskalkulation der Firma zum Angebot. Bei § 2 Abs. 6 verlangt das VHB eine Preisbildung auf Grundlage der Preisermittlung zum Angebot [55].
- Das **BGB** (§ 650c) stellt auf tatsächlich erforderliche Kosten ab [17]. Der **BGH** hat das für § 2 Abs. 3 VOB/B ebenso entschieden [29].
- Einschätzung: Für § 2 Abs. 5/6 VOB/B ist die Methode in der Fachdiskussion umstritten. Die Software sollte **beide Rechenwege** nebeneinander darstellen können: vorkalkulatorische Preisfortschreibung aus Urkalkulation bzw. EFB-Preisblättern (VHB-Formblätter 221–223) und Kosten plus Zuschläge [55][69].

Öffentliche Auftraggeber dokumentieren Nachträge im VHB mit den Formblättern 521 (Vergütungszuordnung und -berechnung), 522 (Prüfungsvermerk) und 523 (Nachtragsvereinbarung) [55]. Auch Stundenlohnarbeiten sollen erst angeordnet werden, wenn die Leistung keiner beauftragten oder zusätzlichen Position zugeordnet werden kann [55].

→ **Nachtragsregister** mit diesen Feldern: Ursache/Anordnung, Rechtsgrundlage (§ 2 Abs. 5/6/8 bzw. § 650b), Ankündigungsdatum, Angebotsdatum, Prüfergebnis (technisch = LPH 7 c, bauwirtschaftlich = Besondere Leistung), beauftragter Betrag, Status und Auswirkung auf die Termine.

### 3.6 Abrechnung, Aufmaß und Rechnungsprüfung

- **Prüfbare Abrechnung** (§ 14 Abs. 1 VOB/B) [38]:
  - übersichtlich aufgestellt, in der Reihenfolge der Positionen, mit den Bezeichnungen des Vertrags;
  - Mengenberechnungen, Zeichnungen und andere Belege liegen bei;
  - Vertragsänderungen sind kenntlich gemacht, und auf Verlangen sind sie getrennt abzurechnen.
- **Gemeinsame Feststellungen (Aufmaß)** sollen möglichst mit dem Baufortschritt erfolgen (§ 14 Abs. 2). Dabei gelten die Abrechnungsregeln der VOB/C. Leistungen, die später verdeckt werden, muss die Firma rechtzeitig gemeinsam feststellen lassen [38].
  - Ein gemeinsam bestätigtes Aufmaß bindet beide Seiten bei den festgestellten Mengen, nicht aber bei der Frage, ob und wie diese Mengen zu vergüten sind (VHB [55]; Sekundärquelle mit Rechtsprechung [50]). Beispiel: Eine aufgemessene Leistung kann eine ohnehin geschuldete Nebenleistung sein.
- **Schlussrechnungsfrist:** Bei bis zu 3 Monaten Ausführungsfrist ist die Schlussrechnung binnen **12 Werktagen** nach Fertigstellung einzureichen. Je weitere 3 Monate kommen **6 Werktage** hinzu. Wer trotz Nachfrist keine prüfbare Rechnung vorlegt, riskiert, dass der Bauherr sie auf Kosten der Firma selbst aufstellt (§ 14 Abs. 3, 4) [38].
- **Inhalt der Schlussrechnung:** alle Forderungen aus dem Vertrag einschließlich Nachträgen, Abzug der Abschläge, Belege wie Aufmaße (Sekundärquelle) [70].
- **Prozess beim Bund** (VHB 400 Nr. 12, 14) [55]:
  - Jede eingehende Rechnung sofort auf Prüfbarkeit untersuchen und nicht prüfbare Rechnungen unverzüglich schriftlich mit Begründung zurückweisen.
  - Ist die Schlussprüfung verzögert, unbestrittene Beträge sofort als Abschlag zahlen.
  - Preisnachlässe und vereinbarte Skonti bei der Prüfung berücksichtigen.
  - Vor jeder Zahlung Abtretungen und Pfändungen prüfen.
  - Überzahlungen schriftlich zurückfordern. Sie verjähren in 3 Jahren ab Jahresende der Kenntnis, spätestens nach 10 Jahren.
- **Rechnungsprüfung als Kette (LPH 8 g–i):** Aufmaß prüfen → Mengen × Vertragspreise → Nachträge zuordnen → kumulierter Leistungsstand minus Vorauszahlungen und Abschläge → Einbehalte (Sicherheit, Mängel, Steuern) → Zahlbetrag → Abgleich mit Auftragssumme und Kostenprognose [2][38][40].

### 3.7 Stundenlohnarbeiten (§ 15 VOB/B)

- Vergütet werden sie nur, wenn sie **vor Beginn ausdrücklich vereinbart** wurden (§ 2 Abs. 10) [32]. Der Beginn ist anzuzeigen [39].
- Stundenlohnzettel (Listen über Stunden, Material, Geräte) sind je nach Verkehrssitte **werktäglich oder wöchentlich** einzureichen. Der Bauherr gibt sie binnen **6 Werktagen** bescheinigt zurück, sonst gelten sie als **anerkannt** [39]. Einwendungen sind auf dem Zettel oder gesondert schriftlich möglich [39].
- Stundenlohnrechnungen kommen alsbald nach Abschluss der Arbeiten, spätestens **alle 4 Wochen** [39]. Ohne Vereinbarung gilt die ortsübliche Vergütung bzw. Kosten plus Zuschläge [39].

→ Eingangskorb für Stundenlohnzettel mit Fristampel. Erledigt ihn das Architekturbüro, verhindert es stillschweigende Anerkennungen.

### 3.8 Zahlung (§ 16 VOB/B, ergänzend BGB)

| Zahlung | Regel | Quelle |
|---|---|---|
| Abschlag | auf Antrag, in kurzen Abständen oder zu vereinbarten Terminen; fällig **21 Tage** nach Zugang der Aufstellung; Gegenforderungen dürfen einbehalten werden, andere Einbehalte nur mit Vertrags- oder Gesetzesgrundlage | [40] |
| Vorauszahlung | vereinbar; auf Verlangen gegen Sicherheit; mangels Abrede mit 3 Prozentpunkten über dem Basiszinssatz zu verzinsen | [40] |
| Schlusszahlung | spätestens **30 Tage** nach Zugang, bis **60 Tage**, wenn ausdrücklich vereinbart und sachlich gerechtfertigt | [40] |
| Ausschlusswirkung | Nimmt die Firma die Schlusszahlung vorbehaltlos an, sind Nachforderungen ausgeschlossen. Voraussetzung: schriftliche Mitteilung über die Schlusszahlung mit Hinweis auf diese Wirkung. Vorbehalt binnen **28 Tagen**, Begründung binnen weiterer **28 Tage**; Aufmaß-, Rechen- und Übertragungsfehler bleiben korrigierbar | [40] |
| Skonto | nur wenn vereinbart | [40] |
| Verzug | nach Nachfristsetzung; ohne Nachfrist spätestens 30 Tage nach Zugang (bis 60 Tage, wenn vereinbart); Zinsen nach § 288 Abs. 2 BGB (9 Prozentpunkte über Basiszinssatz unter Unternehmern) und 40 € Pauschale | [40][23] |
| Direktzahlung an Nachunternehmer | unter Voraussetzungen zulässig (§ 16 Abs. 6) | [40] |
| BGB-Rahmen | Zahlungsfristen über 60 Tage nur ausdrücklich und nicht grob unbillig; öffentliche AG: über 30 Tage nur sachlich gerechtfertigt, über 60 Tage unwirksam; Prüf- und Abnahmefristen über 30 Tage nur ausdrücklich. Gilt nicht für Abschläge und nicht, wenn ein Verbraucher zahlt (§ 271a) | [24] |

Das VHB Bund konkretisiert: Abschläge binnen **21 Kalendertagen** leisten, Zahlungen so anweisen, dass das Geld innerhalb der Frist gutgeschrieben ist, und den Auftragnehmer mit Formblatt 452 über die Schlusszahlung informieren [55].

### 3.9 Sicherheiten

- **VOB/B § 17** [41]:
  - Arten: Einbehalt, Hinterlegung oder Bürgschaft; die Firma wählt und darf tauschen.
  - Bürgschaft schriftlich, unbefristet, ohne Einrede der Vorausklage und nicht „auf erstes Anfordern“.
  - Einbehalt höchstens **10 % je Zahlung** bis zur vereinbarten Summe. Die USt nach § 13b UStG bleibt dabei außer Ansatz.
  - Einbehaltene Beträge binnen **18 Werktagen** auf ein Sperrkonto („Und-Konto“) einzahlen; öffentliche AG dürfen ein eigenes unverzinstes Verwahrgeldkonto nutzen.
  - Rückgabe: Vertragserfüllungssicherheit spätestens nach Abnahme und Stellung der Mängelsicherheit; Mängelsicherheit nach **2 Jahren**, wenn nichts anderes vereinbart ist.
- **VOB/A § 9c** (öffentliche AG, Abschnitt 1 in der Ausgabe 2019; § 9c ist seitdem unverändert, weil die Änderungen 2025 und 2026 nur § 3a betrafen) [42][73]:
  - Unter **250.000 € netto** ist auf eine Vertragserfüllungssicherheit zu verzichten (zwingend formuliert), in der Regel auch auf die Mängelsicherheit.
  - Höchstgrenzen: Vertragserfüllung 5 % der Auftragssumme, Mängelansprüche 3 % der Abrechnungssumme.
  - Das VHB-Formblatt 214 setzt das so um: 5 % der Auftragssumme inkl. USt ohne Nachträge sowie 3 % der Abschlagssumme bei Abnahme [55].
- **BGB:**
  - Die Firma kann vom Bauherrn Sicherheit für ihre Vergütung plus 10 % Nebenforderungen verlangen (§ 650f). Das gilt nicht gegenüber insolvenzunfähiger öffentlicher Hand und nicht beim Verbraucherbauvertrag [18].
  - Beim Verbraucherbauvertrag dürfen Abschläge höchstens **90 %** der Gesamtvergütung betragen, und die Firma stellt dem Verbraucher 5 % Sicherheit (§ 650m) [21].
  - Wegen Mängeln darf der Bauherr in der Regel das **Doppelte** der Beseitigungskosten zurückhalten (§ 641 Abs. 3) [14][55].

### 3.10 Abnahme, Vertragsstrafe, Behinderung, Kündigung

- **Abnahme** = Billigung der Leistung als im Wesentlichen vertragsgemäß. Sie startet die Verjährung, kehrt die Beweislast um und macht die Vergütung fällig [13][14][12]. Bei der förmlichen Abnahme kommen Vorbehalte für bekannte Mängel und Vertragsstrafen in die Niederschrift (§ 12 Abs. 4) [36]. Bei fiktiver Abnahme sind sie innerhalb der 12-/6-Werktage-Fristen zu erklären (§ 12 Abs. 5) [36].
- **Vertragsstrafe:** Wer abnimmt, ohne sich die Vertragsstrafe vorzubehalten, verliert sie (§ 11 Abs. 4) [35]. Tagessätze zählen nur Werktage (§ 11 Abs. 3) [35]. Einschätzung: Im Abnahmeprotokoll der Software sollte der Vorbehalt der Vertragsstrafe ein Pflichtfeld mit Warnhinweis sein. Die Abnahme zu organisieren ist Grundleistung LPH 8 k [2].
- **Behinderung:** Die Firma muss Behinderungen unverzüglich schriftlich anzeigen (§ 6 Abs. 1). Ausführungsfristen verlängern sich bei Umständen aus der Sphäre des Bauherrn, bei Streik oder höherer Gewalt. Dauert eine Unterbrechung länger als 3 Monate, dürfen beide Seiten kündigen (§ 6 Abs. 7) [33]. → Diese Anzeigen sind die Grundlage für bauwirtschaftliche Nachträge (Besondere Leistung LPH 7) [2].
- **Werktage** sind laut VHB alle Tage außer Sonn- und Feiertagen, der **Samstag zählt also mit** [55]. Fristen werden nach §§ 186–193 BGB berechnet; der Tag des auslösenden Ereignisses zählt nicht mit (Beispiel im VHB) [55].

### 3.11 Mängelansprüche und Verjährung

- **VOB/B § 13** [37]:
  - Regelfrist für Bauwerke **4 Jahre**, für andere Werke 2 Jahre.
  - Für wartungsrelevante Teile maschineller und elektrotechnischer/elektronischer Anlagen gelten **2 Jahre**, wenn der Bauherr die Wartung nicht der Firma überträgt.
  - Die Frist beginnt mit der Abnahme (bei Teilabnahme für in sich abgeschlossene Teile).
  - Eine **schriftliche Mängelrüge** innerhalb der Frist löst für den gerügten Mangel eine Frist von 2 Jahren ab Zugang aus. Sie endet nicht vor der Regelfrist. Nach Abnahme der Mängelbeseitigung beginnt für diese Leistung eine neue 2-Jahres-Frist.
- **BGB § 634a**: Für Bauwerke und die Planungs- und Überwachungsleistungen dafür gelten **5 Jahre** ab Abnahme [12]. In AGB darf diese Frist nicht verkürzt werden (§ 309 Nr. 8 b ff) [26].
  - Einschätzung, nicht gesondert belegt: Die AGB-Kontrolle schützt nur den Vertragspartner dessen, der die Klausel stellt. Stellt der Bauherr die VOB/B, gilt die 4-Jahres-Frist meist zu seinen eigenen Lasten. In der Praxis werden in den BVB häufig längere Fristen vereinbart.
- **VHB-Praxis** [55]:
  - Mängelrügen schriftlich und konkret mit Frist formulieren.
  - Vor Ablauf der Verjährung Erfüllung oder gerichtliche Schritte sicherstellen, z. B. das selbständige Beweisverfahren (gerichtliches Gutachten vor einem Prozess).
  - Fristende tagesgenau berechnen. Beispiel aus dem VHB: Abnahme am 01.09.2016, Ende der 4-Jahres-Frist am 01.09.2020 um 24 Uhr.

→ **Gewährleistungsregister** (HOAI LPH 8 o, LPH 9 a–c): je Auftrag Abnahmedatum, Vertragstyp, vereinbarte Fristen je Bauteil, Rügen und daraus folgende neue Fristen, Sicherheiten mit Rückgabedatum sowie Erinnerung zur Objektbegehung vor Fristablauf [2][37][41].

### 3.12 Private Bauherren und Verbraucherbauvertrag

- **Verbraucherbauvertrag** = Vertrag eines Verbrauchers über den Bau eines neuen Gebäudes oder erhebliche Umbauten (§ 650i) [21]. Er braucht Textform.
- Die Firma muss eine **Baubeschreibung** liefern (§ 650j) [21]. Die Pflicht entfällt, wenn der Verbraucher oder ein von ihm Beauftragter die wesentlichen Planungsvorgaben macht, typischerweise also der Architekt.
- Weitere Regeln [21]:
  - verbindliche Angaben zum Fertigstellungszeitpunkt (§ 650k);
  - Widerrufsrecht (§ 650l);
  - Abschläge höchstens 90 % und 5 % Sicherheit (§ 650m);
  - Unterlagen für Behörden (§ 650n);
  - Abweichungen zulasten des Verbrauchers sind unwirksam (§ 650o).
- **Einzelgewerke:** Ein Vertrag, mit dem eine Firma nur **ein Gewerk** eines Neubaus übernimmt, ist **kein Verbraucherbauvertrag** (BGH, 16.03.2023, VII ZR 94/22) [27]. Folge: Die Ausnahme von der Bauhandwerkersicherung gilt dann nicht. Der private Bauherr kann also zur Sicherheitsleistung nach § 650f verpflichtet sein [27][18].
  - Einschätzung: Gerade die gewerkeweise Vergabe durch Architekten ist damit meist ein „normaler“ Bauvertrag ohne 90-%-Grenze.
- **Fiktive Abnahme gegenüber Verbrauchern** wirkt nur mit Hinweis auf die Rechtsfolgen in Textform (§ 640 Abs. 2) [13].
- **VOB/B gegenüber Verbrauchern:** keine Privilegierung, einzelne Klauseln unterliegen der AGB-Kontrolle [28].

→ Die Software braucht pro Projekt den **Bauherrentyp** (Verbraucher / Unternehmer / öffentliche Hand) und pro Auftrag den **Vertragstyp** (BGB-Bauvertrag / Verbraucherbauvertrag / VOB/B als Ganzes / VOB/B mit Abweichungen). Daraus ergeben sich Fristen, Sicherheiten, Steuerpflichten und Textbausteine.

### 3.13 Ausblick: Gebäudetyp E (Entwurf, noch nicht Gesetz)

Das BMJV hat am **26.10.2026** in Abstimmung mit dem BMWSB einen Referentenentwurf vorgelegt. Stellungnahmen waren bis 09.11.2026 möglich [10][6]. Der Entwurf würde den geltenden § 650a BGB [15] neu fassen (laut Fachportal) [10]:

- Die Parteien können den „gesetzlichen Basisstandard“ in **Textform** vereinbaren (Opt-in).
- Maßstab der Mangelfreiheit wären dann die Technischen Baubestimmungen der Länder.
- Unterhalb des üblichen Standards wäre mit klarem Hinweis vor Vertragsschluss abweichbar.
- Für Architektenverträge (§ 650q) sollen die neuen Regeln entsprechend gelten.
- Für Verbraucher wären Zusatzangaben in der Baubeschreibung nötig.

Kabinettstermin und Inkrafttreten sind offen; Altverträge bleiben unberührt [10].

Einschätzung: Sollte das Gesetz kommen, braucht die LV-/Baubeschreibungs-Software eine **Kennzeichnung von Abweichungen** vom üblichen Standard je Position bzw. je Leistungsbereich.

## 4. VOB/C: Aufbau der ATV und Abrechnungsregeln

### 4.1 Stand und Rechtswirkung

- Die VOB/C umfasst **68 ATV** (Allgemeine Technische Vertragsbedingungen), von DIN 18299 (Regeln für Bauarbeiten jeder Art) bis DIN 18459 (Abbruch- und Rückbauarbeiten) [46][47].
- **Ergänzungsband 2023** (erschienen Anfang Oktober 2023) [44][46]:
  - 17 ATV fachtechnisch überarbeitet, darunter DIN 18299:2023-09;
  - 1 ATV redaktionell überarbeitet (DIN 18322);
  - 3 ATV neu (DIN 18327, 18328, 18448);
  - die übrigen 47 ATV bleiben in den Fassungen 2016-09 bzw. 2019-09.
- Für den Bundesbau gilt der Ergänzungsband seit 01.10.2023. Das Datum des Einführungserlasses wird mit 20.09.2023 [46] bzw. 23.09.2023 [44] angegeben.
- Eine neuere VOB/C-Ausgabe 2025/2026 war nicht zu finden [44][45].
- Bei vereinbarter VOB/B wird die VOB/C über § 1 Abs. 1 Vertragsbestandteil [31]. Grundsätzlich gilt die Fassung zum Zeitpunkt des Vertragsschlusses; technische Regeln, die als anerkannte Regeln der Technik gelten, können bis zur Abnahme nachwirken (Verbandsauffassung) [45].
- Anders als die VOB/B „als Ganzes“ sind die ATV laut Sekundärquelle **nicht** von der AGB-Inhaltskontrolle freigestellt [46].
- **Bezug und Lizenz:** Die Texte erscheinen bei DIN Media und sind kostenpflichtig, auch über das Portal vob-online.de [72][44]. → Lizenzthemen: [Open-Source-Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).

### 4.2 Gleicher Aufbau jeder ATV (Abschnitte 0–5)

| Abschnitt | Inhalt [46][47] | Nutzen für die AVA-Software |
|---|---|---|
| 0 | Hinweise für das Aufstellen der Leistungsbeschreibung: 0.1 Angaben zur Baustelle, 0.2 zur Ausführung, 0.3 Abweichungen von der ATV, 0.4 Nebenleistungen/Besondere Leistungen, 0.5 **Abrechnungseinheiten**. **Nicht** Vertragsbestandteil, richtet sich an den Ausschreibenden | Prüfhilfen beim LV-Schreiben: Einheiten-Plausibilität, Checkliste „Angaben zur Baustelle“, Hinweis, wenn Besondere Leistungen fehlen |
| 1 | Geltungsbereich | Zuordnung LV-Abschnitt → ATV |
| 2 | Stoffe, Bauteile | – |
| 3 | Ausführung | – |
| 4 | 4.1 **Nebenleistungen**: gehören ohne Erwähnung zur Leistung, werden nicht extra bezahlt. 4.2 **Besondere Leistungen**: nur geschuldet, wenn im LV ausdrücklich genannt | Nachtragsprüfung: Ist die geforderte Leistung eine Nebenleistung? LV-Prüfung: Besondere Leistungen als eigene Positionen |
| 5 | **Abrechnung**: Ermittlung der Leistung, Maße, Übermessungsregeln | Aufmaß- und Abrechnungslogik |

**Digitale Abrechnung:** Seit 2023 sieht DIN 18299 eine Öffnungsklausel vor [44][47]. Die Leistung ist aus Zeichnungen **oder Modellen** zu ermitteln, soweit die Ausführung ihnen entspricht, sonst wird aufgemessen. Das stützt modellbasierte Mengen (BIM) im Vertrag → [BIM und AVA](/okf/research/standards/bim-and-ava.md). Das VHB formuliert denselben Grundsatz noch für Zeichnungen [55].

### 4.3 Übermessungsregeln (Abschnitt 5) – Beispiele

**Übermessen** heißt: Eine kleine Öffnung oder Aussparung wird **nicht abgezogen**, die Fläche wird also so abgerechnet, als wäre sie durchgehend. Die Schwellen unterscheiden sich je Gewerk. Die folgenden Werte stammen aus einer **Sekundärquelle**. Den Normtext haben wir nicht eingesehen, die Werte sind vor einer Implementierung zu verifizieren [48][49]:

| Gewerk (ATV) | Maßeinheit | abgezogen wird | übermessen wird |
|---|---|---|---|
| Mauer-, Beton (inkl. Schalung), Trockenbau, Putz, Tischler, Maler, Tapezier (DIN 18330, 18331, 18340, 18350, 18355, 18363, 18366) | m² (Wand) | Öffnungen/Nischen > 2,5 m² | bis 2,5 m²; maßgebend sind die kleinsten Maße der Öffnung |
| Fliesen, Estrich, Bodenbeläge (DIN 18352, 18353 u. a.) | m² | Aussparungen > 0,1 m² | bis 0,1 m² |
| Mauer- und Trockenbauarbeiten in Böden | m² | Aussparungen > 0,5 m² | bis 0,5 m² |
| Beton (DIN 18331) | m³ | Aussparungen/Einbauteile > 0,5 m³; Schlitze/Kanäle > 0,1 m³ je m | darunter |
| allgemein, Längenmaß | m | Unterbrechungen > 1 m | bis 1 m |
| allgemein, stabförmige Bauteile in Flächen | m² | Breite > 30 cm | bis 30 cm |

Die Quelle nennt für Bodenbelag einmal DIN 18356, was nach der ATV-Liste die Parkettarbeiten sind. Die Bodenbelagarbeiten sind DIN 18365 [45]. Die Zuordnung ist also zu prüfen.

**Eigenes Beispiel** (Innenputz, Wand-Regel 2,5 m²):

```
Pos. 01.02.0030  Innenputz Wand Achse A          (Einheit m²)
  Wand           5,000 × 2,750           =  13,750
  Tür T1         1,010 × 2,135 = 2,156   →  ≤ 2,5 m²: übermessen, kein Abzug
  Fenster F1    −2,010 × 1,385           =  −2,784   (> 2,5 m²: Abzug)
  Positionsmenge                            10,966
```

→ **Software-Folgerung (Einschätzung):** Die Übermessungsgrenzen gehören als **Regel-Parameter je Leistungsbereich** in die Software. Sie sollten vom Nutzer gepflegt oder als lizenzierter Datensatz importiert werden, nicht fest einprogrammiert. So bleiben die Regeln bei neuen ATV-Fassungen aktualisierbar, und DIN-Texte müssen nicht mitgeliefert werden.

## 5. REB: elektronische Mengenberechnung und Bezug zu GAEB X31

### 5.1 Was die REB sind

Die **Sammlung REB** (Regelungen für die elektronische Bauabrechnung) besteht aus Verfahrensbeschreibungen (VB) des Bundesverkehrsministeriums. Sie legen fest, wie Mengen elektronisch berechnet und ausgetauscht werden [52][51]. Wichtige Verfahrensbeschreibungen:

- **23.003** „Allgemeine Mengenberechnung“ für alle Fachbereiche;
- 21.003/21.013/21.033 Erdmassen aus Querprofilen;
- 22.013 Rauminhalte aus Prismen, d. h. aus Dreiecks-Geländemodellen [51].

Die PDFs stellt die Bundesanstalt für Straßenwesen (BASt) bereit [52]. Ergänzend gibt es einen „Formelkatalog Straßenbau“ (Ausgabe 2012) [52].

Hauptanwendung ist der Straßenbau. Im Hochbau kommen die REB zum Einsatz, wenn sie vereinbart sind [51]. Das VHB-Formblatt 244 legt fest: Angebotsdaten werden nach GAEB DA XML ausgetauscht, **Abrechnungsdaten nach den REB-Verfahrensbeschreibungen**. Bei Abweichungen gilt die schriftliche Fassung, außer bei Austausch über eine Vergabeplattform [55].

### 5.2 REB-VB 23.003, Ausgabe 2009 – technische Eckdaten

Alle Angaben aus der Primärquelle [52]:

- **Herkunft:** Die Fassung 2009 überarbeitet die Ausgabe von 1979. Sie wurde in „Allgemeine Mengenberechnung“ umbenannt und gilt nur zusammen mit „REB-Allgemein 2009“. Das Vorwort kündigte eine Neufassung für 2010 an. Eine solche war nicht zu finden; die BASt führt weiterhin die Ausgabe 2009.
- **Satzarten im Festformat (80 Stellen):**
  - **DA 00** ist die Überschrift eines Berechnungsabschnitts mit VB-Nummer, VB-Ausgabe „2009“ und einer **OZ-Maske**. Die OZ-Maske definiert bis zu 4 Gliederungsstufen, Positionsnummer und Index der Ordnungszahl.
  - **DA 11** ist die Rechenansatzzeile mit OZ, Zwischensummen-Index, Kennzeichen, Erläuterung, Vorzeichen, Faktor, Formelnummer, bis zu 5 Werten und Adresse.
- **Drei Schreibweisen:**
  - **FN 01–90**: Formelnummern für häufige Figuren, z. B. Dreieck, Rechteck/Quader, Trapez, Kreisbogen, Sektor, Parabelsegment, Abwicklungen; Winkel in **Neugrad (gon)**.
  - **FN 00**: die vier Grundrechenarten; Klammern müssen über Hilfswerte aufgelöst werden.
  - **FN 91**: freie mathematische Schreibweise mit Klammern, Potenz/Wurzel (`**`) und Winkelfunktionen.
  - Ein Rechenansatz umfasst höchstens **20 Zeilen** und endet mit `=`.
- **Kennzeichen:** `*` Textzeile, `H` Hilfswert, `Z` Zwischensumme, `P` Positionssumme, `S` Schätzmenge.
- **Abzüge und Faktoren:** Abzüge werden mit Minus markiert; Stückzahlen und Faktoren mit 3 Nachkommastellen.
- **Adressen:** Ergebnisse lassen sich über Adressen (Blatt, Zeile, Index) referenzieren, vorwärts wie rückwärts, ohne Zirkelbezüge.
- **Rundung:** Intern wird nicht gerundet. Ausgaben und die Positionssumme erhalten **3 Nachkommastellen**. Deshalb lassen sich die Ergebnisse laut VB nicht von Hand nachprüfen.
- **Erläuterungen und Bilder:** Kurz-Erläuterungen haben höchstens 9 Zeichen. Bilder werden über Textzeilen mit `#Bild <Pfad>` eingebunden; die Formate sind vorher zu vereinbaren.

### 5.3 Ökosystem und Grenzen

- **Erweiterungen und Formate:**
  - Wegen des 9-Zeichen-Limits hat der BVBS (Bundesverband Bausoftware) 2018 eine Erweiterung mit eigenem Namensraum beschlossen [53].
  - GAEB DA XML 3.2 erlaubt in der Datenart X31 längere Ordnungszahlen [53].
  - **X31-Dateien** (GAEB-Austauschphase „Mengenermittlung“) enthalten keine Positionstexte und Preise. Sie verweisen auf ein externes LV und tragen REB-23.003-Zeilen (Methode „1979“ oder „2009“) samt Bildanhängen [54]. → Details: [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md), [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md).
- **Öffentliche Praxis:**
  - Das VHB-Formblatt 451 („Datenträger Abrechnung“) nennt noch **REB-VB 23.003 Ausgabe 1979** als Vorbelegung [55].
  - Die Richtlinie dazu verlangt: Plausibilität gegen die LV-Mengen prüfen, **unabhängig nachrechnen** und Ergebnislisten mit Prüfstempel beifügen [55].
- **Straßenbau:**
  - Die HVA B-StB 2023 (Handbuch für die Vergabe und Ausführung im Straßen- und Brückenbau) lässt EDV-Abrechnung zu, schreibt sie aber nicht vor. Sie verlangt REB-konforme Programme und eine Toleranz von 0,2 ‰ je Teilleistung [51].
  - Seit 04.03.2023 gibt es ein REB-Prüfprogramm Version 6.0, das das BMDV am 14.04.2023 empfohlen hat [51].

**Einschätzung:** Ein Open-Source-Parser und -Rechner für REB 23.003 (1979 und 2009), mit Import und Export als DA-11-Text und als X31-Teil, ist klar spezifiziert. Er wäre ein glaubwürdiger Differenzierungsbaustein. Testfälle liefert die VB selbst (Beispielkapitel). Zu klären ist der Nutzungs- und Urheberrechtsstatus der VB-Texte (siehe offene Fragen).

## 6. Steuer- und Rechnungsthemen mit AVA-Bezug

### 6.1 Bauabzugsteuer (§§ 48 ff. EStG)

| Aspekt | Regel |
|---|---|
| Wer muss abziehen? | Der Leistungsempfänger einer Bauleistung, wenn er **Unternehmer** im Sinne des UStG oder **juristische Person des öffentlichen Rechts** ist. Ausnahme: Wer nicht mehr als zwei Wohnungen vermietet, muss für Bauleistungen an diesen Wohnungen nichts abziehen [57] |
| Höhe | **15 %** der Gegenleistung, d. h. Entgelt **inklusive** USt [57] |
| Ausnahmen | gültige **Freistellungsbescheinigung** im Zahlungszeitpunkt, oder voraussichtliche Jahressumme je Leistendem bis **5.000 €** (bis **15.000 €**, wenn der Empfänger ausschließlich steuerfreie Vermietungsumsätze ausführt) [57] |
| Verfahren | elektronische Anmeldung und Abführung bis zum **10. Tag des Folgemonats**; Abrechnungsbeleg an die Firma mit Rechnungsbetrag, Rechnungsdatum, Zahltag, Abzugshöhe und Finanzamt [58] |
| Haftung | Der Leistungsempfänger haftet für zu wenig abgeführte Beträge, nicht aber bei Vertrauen auf eine rechtmäßige Freistellungsbescheinigung [58] |
| Prüfung | Freistellungsbescheinigungen lassen sich beim Bundeszentralamt für Steuern elektronisch abfragen [59] |

→ **Software:** Je Auftrag die Freistellungsbescheinigung mit Gültigkeit erfassen, je Zahlung prüfen, ob abgezogen werden muss, den Abzug berechnen und den Anmeldetermin vormerken. Ist der Bauherr eine Privatperson ohne Unternehmereigenschaft, entfällt der Abzug [57]. Der Architekt bereitet die Zahlung typischerweise vor, der Bauherr leistet sie (Einschätzung).

### 6.2 Steuerschuldnerschaft bei Bauleistungen (§ 13b UStG)

- Bei Bauleistungen (ohne Planungs- und Überwachungsleistungen) schuldet der **Leistungsempfänger** die USt, wenn er selbst nachhaltig Bauleistungen erbringt. Davon ist auszugehen, wenn er eine **höchstens 3 Jahre gültige Bescheinigung** des Finanzamts vorlegt [60]. Öffentliche Stellen schulden die Steuer nicht, wenn sie für ihren nichtunternehmerischen Bereich einkaufen [60].
- Die Rechnung muss dann „Steuerschuldnerschaft des Leistungsempfängers“ angeben und weist keine USt aus (§ 14a Abs. 5) [62]. Beim Sicherheitseinbehalt bleibt diese USt außer Ansatz (§ 17 Abs. 6 VOB/B) [41].
- Einschätzung: Typische Architekten-Bauherren (Privatleute, Kommunen, Unternehmen ohne Bautätigkeit) fallen nicht darunter. Bauträger und Bauunternehmen als Bauherren können darunter fallen. → Je Auftrag ein **USt-Modus**, und die Rechnungsprüfung prüft den korrekten Ausweis.

### 6.3 E-Rechnung

| Zeitpunkt | Regel | Quelle |
|---|---|---|
| seit 27.11.2020 | Rechnungen an **Bundes**-Auftraggeber nur elektronisch, Standard **XRechnung**; ausgenommen Direktaufträge bis 1.000 € | [65] |
| seit 01.01.2025 | Inländische Rechnungen zwischen Unternehmen sind grundsätzlich als **E-Rechnung** im strukturierten Format nach EN 16931 auszustellen (§ 14 Abs. 1, 2 UStG); Empfang ohne Zustimmungserfordernis | [61] |
| bis 31.12.2026 | Übergang: Papier oder andere elektronische Formate (mit Zustimmung) für alle noch zulässig | [64] |
| bis 31.12.2027 | Übergang nur noch für Aussteller mit Vorjahresumsatz bis 800.000 € sowie für EDI-Verfahren | [64] |
| ab 01.01.2028 | volle Ausstellungspflicht im B2B-Bereich (Einschätzung, Ende der Übergänge) | [64] |

- Für Privatpersonen gilt keine E-Rechnungspflicht. Bei Werklieferungen und sonstigen Leistungen im Zusammenhang mit einem Grundstück ist aber binnen 6 Monaten eine Rechnung auszustellen (§ 14 Abs. 2 Nr. 3) [61].
- Unternehmen bewahren Rechnungen **8 Jahre** auf, Privatpersonen solche Grundstücksrechnungen **2 Jahre** (§ 14b) [63].
- Für Rechnungen an Landes- und Kommunalbehörden gelten Landesregeln, die nicht geprüft wurden.

→ **Software:** XRechnung/ZUGFeRD-Rechnungen importieren und dem Auftrag zuordnen (Einschätzung: Die Positionsebene einer E-Rechnung passt selten 1:1 auf die LV-Ordnungszahlen, das Aufmaß bleibt maßgeblich). Rechnungen revisionssicher archivieren und Aufbewahrungsfristen je Bauherrentyp verwalten.

### 6.4 Sonderpflicht öffentlicher Auftraggeber: Mitteilungsverordnung

Behörden müssen bestimmte Zahlungen an das Finanzamt melden, etwa Zahlungen auf ein anderes als das Geschäftskonto oder Zahlungen per Aufrechnung. Die Pflicht beginnt ab **1.500 € je Empfänger und Jahr**, Meldetermin ist der **30. April** des Folgejahres (VHB-Formblätter 453/454) [55]. Für private Bauherren ist das irrelevant.

## 7. Fristen-Katalog (Grundlage für eine Fristen-Engine)

| Auslöser | Frist | Einheit | Quelle | gilt bei | Folge bei Versäumnis |
|---|---|---|---|---|---|
| Zugang Abschlagsaufstellung | 21 | Tage | § 16 Abs. 1 Nr. 3 VOB/B [40] | VOB/B | Fälligkeit; danach Nachfrist bzw. Verzug |
| Zugang Rechnung (ohne Nachfrist) | 30 (max. 60) | Tage | § 16 Abs. 5 Nr. 3 VOB/B [40]; § 286 Abs. 3 BGB [23] | VOB/B, BGB (B2B) | Verzugszinsen, 40 € Pauschale |
| Zugang Schlussrechnung | 30 (max. 60) | Tage | § 16 Abs. 3 Nr. 1 VOB/B [40] | VOB/B | Fälligkeit; Prüfbarkeitseinwand danach ausgeschlossen |
| Zugang Schlussrechnung | 30 | Tage | § 650g Abs. 4 BGB [19] | BGB | Rechnung gilt als prüffähig |
| Fertigstellung | 12 + 6 je weitere 3 Monate Ausführungsfrist | Werktage | § 14 Abs. 3 VOB/B [38] | VOB/B (Firma) | Bauherr darf nach Nachfrist selbst abrechnen |
| Mitteilung Schlusszahlung | 28 + 28 | Tage | § 16 Abs. 3 Nr. 5 VOB/B [40] | VOB/B (Firma) | Nachforderungen ausgeschlossen |
| Zugang Stundenlohnzettel | 6 | Werktage | § 15 Abs. 3 VOB/B [39] | VOB/B (Bauherr) | Zettel gelten als anerkannt |
| Ende der Stundenlohnarbeiten | spätestens alle 4 Wochen | Wochen | § 15 Abs. 4 VOB/B [39] | VOB/B (Firma) | Zweifel am Umfang zulasten der Firma (§ 15 Abs. 5) |
| Abnahmeverlangen | 12 | Werktage | § 12 Abs. 1 VOB/B [36] | VOB/B | – |
| schriftliche Fertigstellungsmitteilung / Benutzungsbeginn | 12 / 6 | Werktage | § 12 Abs. 5 VOB/B [36] | VOB/B | fiktive Abnahme; Vorbehalte nötig (§ 11 Abs. 4) [35] |
| Fristsetzung zur Abnahme | angemessen | – | § 640 Abs. 2 BGB [13] | BGB | fiktive Abnahme, wenn kein Mangel benannt wird |
| Änderungsbegehren | 30 | Tage | § 650b Abs. 2 BGB [16] | BGB | danach Anordnung in Textform möglich |
| Zusatzleistung gefordert | vor Ausführungsbeginn | – | § 2 Abs. 6 VOB/B [32] | VOB/B (Firma) | Vergütungsanspruch gefährdet |
| Behinderung | unverzüglich, schriftlich | – | § 6 Abs. 1 VOB/B [33] | VOB/B (Firma) | keine Fristverlängerung (außer bei Offenkundigkeit) |
| Unterbrechung | > 3 Monate | Monate | § 6 Abs. 7 VOB/B [33] | VOB/B | Kündigungsrecht beider Seiten |
| Mitteilung Sicherheitseinbehalt | 18 | Werktage | § 17 Abs. 6 VOB/B [41] | VOB/B (Bauherr) | nach Nachfrist Auszahlung des Einbehalts, keine Sicherheit mehr |
| Vertragsschluss | 18 | Werktage | § 17 Abs. 7 VOB/B [41] | VOB/B (Firma) | Einbehalt durch Bauherrn |
| Abnahme | 2 Jahre (Rückgabe Mängelsicherheit) | Jahre | § 17 Abs. 8 Nr. 2 VOB/B [41] | VOB/B | Rückgabepflicht |
| Abnahme | 4 (2) Jahre | Jahre | § 13 Abs. 4 VOB/B [37] | VOB/B | Verjährung Mängelansprüche |
| Abnahme | 5 Jahre | Jahre | § 634a BGB [12] | BGB, Architektenvertrag | Verjährung |
| Zugang schriftliche Mängelrüge | 2 Jahre (nicht vor Regelfrist) | Jahre | § 13 Abs. 5 Nr. 1 VOB/B [37] | VOB/B | Verjährung für den gerügten Mangel |
| Bekanntwerden eines Kündigungsgrunds nach § 8 Abs. 4 | 12 | Werktage | § 8 Abs. 4 VOB/B [34] | VOB/B | Kündigungsrecht erlischt |
| Monat der Zahlung (Bauabzug) | 10. des Folgemonats | Datum | § 48a EStG [58] | Bauherr ist Unternehmer oder öffentliche Hand | Haftung |
| Vorlage der Planungsgrundlage (Architekt) | 2 Wochen | Wochen | § 650r BGB [22] | Architektenvertrag | Sonderkündigungsrecht erlischt |
| Kalenderjahr (öffentliche AG) | 30. April des Folgejahres | Datum | VHB 454 [55] | öffentliche AG | Meldepflicht verletzt |

Rechenregeln: Werktage sind Montag bis Samstag ohne Feiertage. Feiertage sind **länderspezifisch**, die Fristen-Engine braucht also einen Feiertagskalender je Bundesland (Einschätzung). Fristbeginn ist der Tag nach dem Ereignis (§§ 186–193 BGB) [55].

## 8. Checkliste: rechtliche Pflicht → Software-Funktion

Priorität: **M** = Muss (erste nutzbare Version), **S** = Soll, **K** = Kann.

| # | Pflicht / Regel | Quelle | Software-Funktion | Prio |
|---|---|---|---|---|
| 1 | Vergabeterminplan | HOAI LPH 6 a [2] | Terminplan je Vergabeeinheit mit Fristvorlagen | M |
| 2 | LV nach Leistungsbereichen, Mengen aus der Ausführungsplanung | LPH 6 b [2] | LV-Editor (OZ-Hierarchie, Positionsarten), nachvollziehbare Mengenansätze (REB-Formeln), GAEB-Import der Fachplaner-LVs | M |
| 3 | Schnittstellen zu Fachplaner-LVs abstimmen | LPH 6 c [2] | Mehr-LV-Projekt, Schnittstellenliste, Dublettenprüfung | S |
| 4 | Kosten aus bepreisten LVs | LPH 6 d [2] | Planerpreise je Position, Preisdatenbank | M |
| 5 | Kostenkontrolle bepreistes LV ↔ Kostenberechnung | LPH 6 e [2] | DIN-276-KG je Position, Vergleichsbericht | M |
| 6 | Vergabeunterlagen zusammenstellen | LPH 6 f [2] | Dokumentpaket, GAEB-Export, Vorlagen je Auftraggebertyp | M |
| 7 | ATV-Abschnitt 0 beachten (Angaben, Besondere Leistungen, Abrechnungseinheiten) | VOB/C [47] | Prüfhinweise und Einheiten-Plausibilität (ohne Normtext) | S |
| 8 | Angebote einholen und prüfen, Preisspiegel nach Einzelpositionen | LPH 7 b, c [2] | Bieterverwaltung, Angebotsimport, Preisspiegel, Rechenprüfung, Ausreißer | M |
| 9 | Nachtragsangebote und Angemessenheit der Preise prüfen | LPH 7 c [2]; § 2 Abs. 5/6 VOB/B [32]; § 650c BGB [17] | Nachtragsregister, Preisprüfung (Urkalkulation/EFB vs. Kosten+Zuschläge) | M |
| 10 | Bietergespräche, Vergabevorschlag, Dokumentation | LPH 7 d, e [2] | Protokolle, Vergabevorschlag-Bericht, revisionssichere Ablage | M |
| 11 | Vertragsunterlagen inkl. Rangfolge | LPH 7 f [2]; § 1 Abs. 2 VOB/B [31] | Auftrags-LV, Vertragstyp (BGB/VOB/B; EP/Pauschal), Sicherheiten, Fristen | M |
| 12 | Ausschreibungsergebnis ↔ bepreistes LV/Kostenberechnung | LPH 7 g [2] | Kostenkontroll-Bericht je Vergabe | M |
| 13 | Mittelabfluss-/Zahlungsplan | Besondere Leistung LPH 7/8 [2] | Cashflow-Plan aus Terminen und Verträgen | K |
| 14 | Gemeinsames Aufmaß | LPH 8 f [2]; § 14 Abs. 2 VOB/B [38]; DIN 18299 Abschn. 5 [44] | Aufmaßerfassung (offline/mobil), REB 23.003, Fotos, Freigabe durch beide Seiten, X31-Austausch | M |
| 15 | Prüfbare Rechnung, Rechnungsprüfung | LPH 8 g [2]; § 14 VOB/B [38]; §§ 632a, 650g BGB [11][19] | Rechnungseingangsbuch (Zugangsdatum!), Prüfbarkeits-Checkliste, kumulierte Abrechnung, Kürzungen mit Begründung, Prüfvermerk ≠ Freigabe [30] | M |
| 16 | Prüfergebnis ↔ Auftragssumme inkl. Nachträge | LPH 8 h [2] | Vertragskonto je Auftrag | M |
| 17 | Abrechnung ↔ Vertragspreise, Kostenfeststellung | LPH 8 i, j [2] | Prognose, Abweichungsanalyse, Kostenfeststellung nach DIN 276 | M |
| 18 | Mengenänderung ±10 % | § 2 Abs. 3 VOB/B [32]; BGH VII ZR 34/18 [29] | automatischer Mengenvergleich, Mengenaufteilung, Ausgleichsberechnung | M |
| 19 | Stundenlohnarbeiten | §§ 2 Abs. 10, 15 VOB/B [32][39] | Eingang Stundenlohnzettel mit 6-Werktage-Ampel, Abgleich mit Vereinbarung | M |
| 20 | Zahlungsfristen, Schlusszahlungsmitteilung | § 16 VOB/B [40]; § 271a BGB [24] | Fristenampel je Rechnung; Vorlage Schlusszahlungsmitteilung mit Hinweis auf Ausschlusswirkung | M |
| 21 | Sicherheiten | § 17 VOB/B [41]; § 9c VOB/A [42]; §§ 650f, 650m BGB [18][21] | Sicherheitenregister (Bürgschaften, Einbehalte, Sperrkonto, Rückgabe), automatische Einbehaltsberechnung | M |
| 22 | Abnahme mit Vorbehalten | LPH 8 k [2]; § 12 VOB/B [36]; § 11 Abs. 4 VOB/B [35]; § 640 BGB [13] | Abnahmeprotokoll mit Pflichtfeldern (Mängel, Vertragsstrafe), Fristen für fiktive Abnahme | M |
| 23 | Verjährungsfristen auflisten, Mängel überwachen | LPH 8 o, p; LPH 9 [2]; § 13 VOB/B [37]; § 634a BGB [12] | Gewährleistungsregister, Fristberechnung, Erinnerung vor Ablauf, Mängelliste | M |
| 24 | Behinderungsanzeigen, Bautagebuch | § 6 VOB/B [33]; LPH 8 e [2] | Bautagebuch mit verknüpften Anzeigen | S |
| 25 | Kündigung: Leistungsstand, Aufmaß, Abrechnung | § 8 Abs. 7 VOB/B [34]; § 648a Abs. 4 BGB [20] | Leistungsstandfeststellung und Teil-Schlussabrechnung | S |
| 26 | Bauabzugsteuer | §§ 48–48b EStG [57][58][59] | Freistellungsbescheinigung mit Gültigkeit, Abzugsberechnung, Termin | M (bei Unternehmer- oder öffentlichen Bauherren) |
| 27 | § 13b UStG | [60][62] | USt-Modus je Vertrag, Prüfung des Rechnungsausweises | S |
| 28 | E-Rechnung | § 14 UStG [61]; § 27 Abs. 38 UStG [64]; ERechV [65] | Import XRechnung/ZUGFeRD, Zuordnung zum Auftrag | S (ab 2027/28 faktisch M) |
| 29 | Aufbewahrung | § 14b UStG [63] | revisionssicheres Archiv, Fristen je Bauherrentyp | S |
| 30 | Öffentliche AG: VHB-Formblätter und Prozesse | VHB [55] | Vorlagen (214, 221–223, 244, 421–423, 441–443, 451–454, 521–523), Nachrechnungs-Stempel, Mitteilungsverordnung | S |
| 31 | Verbraucher-Konstellationen | §§ 640 Abs. 2, 650i ff. BGB [13][21]; BGH VII ZR 94/22 [27] | Bauherrentyp × Vertragstyp steuert Hinweise und Textbausteine | M |
| 32 | HOAI-Leistungsbild als Nachweis der Grundleistungen | HOAI [1][2] | versionierter Leistungskatalog (2013/2021 → 2027), Checklisten je Projekt | K |
| 33 | Gebäudetyp E (nur falls verabschiedet) | Referentenentwurf 26.10.2026 [10] | Kennzeichnung von Standardabweichungen im LV/in der Baubeschreibung | K |

## Relevanz für unser Projekt

**Muss-Anforderungen (aus Recht und Vertrag abgeleitet):**

1. **Vertragstyp-Modell** je Auftrag (BGB / Verbraucherbauvertrag / VOB/B als Ganzes / VOB/B mit Abweichungen; Einheitspreis / Pauschal / Stundenlohn) und Bauherrentyp je Projekt. Fast jede Frist und jeder Textbaustein hängt daran (Abschnitte 3.3, 3.12).
2. **Kostenkontrollkette** mit DIN-276-Zuordnung je LV-Position und Preisschichten (Planer, Bieter, Vertrag, Nachtrag, Abrechnung). Damit erfüllt das Büro die HOAI-Grundleistungen LPH 6 e, 7 g, 8 h–j auf Knopfdruck (Abschnitt 2.7).
3. **Fristen-Engine** nach dem Katalog in Abschnitt 7, mit Werktag-/Kalendertag-Logik und Feiertagen je Bundesland.
4. **Abrechnungskern:** Aufmaß (REB 23.003 und Übermessungsparameter), kumulierte Abschlags- und Schlussrechnungsprüfung, Nachtrags- und Mengenänderungsmodul, Sicherheiten und Einbehalte, Bauabzugsteuer.
5. **Abnahme- und Gewährleistungsregister** einschließlich Vorbehalten (Vertragsstrafe, Mängel) und Sicherheitenrückgabe.

**Differenzierungschancen (Einschätzung):**

- **„Fristen-Cockpit“**, das je Auftrag automatisch aus dem Vertragstyp abgeleitet wird. Sichtbar wäre zum Beispiel „Stundenlohnzettel Firma X: noch 2 Werktage bis zur fiktiven Anerkennung“. Ob NOVA das bietet, ist in [NOVA-Handbuch](/okf/research/nova-ava/manual-and-workflows.md) zu prüfen.
- **Transparente Nachtragsprüfung**, die beide Preisbildungsmethoden (Urkalkulation vs. tatsächliche Kosten) nebeneinander rechnet. Zusätzlich ein Abgleich mit ATV-Nebenleistungen und die Unterscheidung der HOAI-Leistung (Grundleistung vs. bauwirtschaftliche Besondere Leistung).
- **Offener REB-23.003-Rechner und -Parser** (1979/2009, DA 11 und X31) als eigenständige Bibliothek. Für ihn gibt es kaum offene Implementierungen (→ [Open-Source-Landschaft](/okf/research/open-source/existing-projects.md)).
- **E-Rechnungs-Import** mit Zuordnung zu Aufmaß und LV, passend zu den Pflichten ab 2027/2028.
- **Konfigurierbare Regelwerke** (HOAI-Fassung, DIN-276-Fassung, Übermessungsparameter, VHB-Varianten der Länder). Das ist zukunftsfest für HOAI 2027, eine mögliche neue VOB/B und Gebäudetyp E.

**Risiken:**

- **Rechtsänderungen:**
  - HOAI 2027: Leistungsbilder und Anteile können sich ändern.
  - VOB/B-Reform: angekündigt seit 2020 [67].
  - Gebäudetyp E: Entwurf [10].
  - Ende der E-Rechnungs-Übergangsfristen [64].
  - → Regeln als Daten mit Gültigkeitsdatum halten, nicht im Code verdrahten.
- **Urheberrecht/Lizenzen:** VOB/C-ATV und DIN 276 sind kostenpflichtige DIN-Normen [72]. STLB-Bau-Texte haben eigene Lizenzen (→ [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md)). Gesetze und Verordnungen sind als amtliche Werke frei nutzbar. Der Status von VOB/B (DVA-Text, im Bundesanzeiger bekanntgemacht, als DIN 1961 verkauft), REB-VB und VHB ist ungeklärt.
- **Haftung und Rechtsdienstleistung:** Die Software darf Fristen und Hinweise berechnen, aber keine Rechtsberatung suggerieren. Disclaimer und nachvollziehbare Rechenwege sind nötig. Ob automatisierte rechtliche Hinweise das Rechtsdienstleistungsgesetz berühren, ist offen.
- **Länderspezifika:** Vergabehandbücher der Länder und Kommunen, Feiertage und E-Rechnungsregeln der Länder wurden nicht geprüft.
- **AGB-Risiko in Vorlagen:** Weichen BVB/ZVB-Vorlagen von der VOB/B ab, kann die Privilegierung entfallen [25][55].

**Aufwandsschätzung (grobe Einschätzung, Personenwochen für erfahrene Entwickler, ohne UI-Feinschliff):**

| Baustein | Aufwand |
|---|---|
| Vertragstyp- und Regelmodell inkl. versionierter Regelwerke | 2–4 PW |
| Fristen-Engine (Werktage, Feiertage je Land, Ereignisse, Erinnerungen) | 2–4 PW |
| REB-23.003-Parser/-Rechner (FN 00, 01–90, 91; DA 00/11; Tests aus der VB) | 3–6 PW |
| Aufmaß-Erfassung inkl. Übermessungsparameter | 3–5 PW |
| Rechnungsprüfung (kumuliert, Einbehalte, Bauabzug, USt-Modus) | 6–10 PW |
| Nachtrags- und Mengenänderungsmodul | 4–8 PW |
| Sicherheiten-, Abnahme- und Gewährleistungsregister | 3–5 PW |
| Kostenkontrollkette DIN 276 und Berichte | 3–5 PW |
| E-Rechnungs-Import (XRechnung/ZUGFeRD) | 2–4 PW (mit vorhandenen Bibliotheken) |

## Offene Fragen

**Nicht gefunden bzw. nicht verifiziert:**

- Welche konkreten Änderungen schlägt das **Leistungsbild-Gutachten** für LPH 6–8 vor, etwa Verschiebungen zwischen Grund- und Besonderen Leistungen, BIM oder Nachhaltigkeit? Die Quellen nennen nur allgemeine Tendenzen [5]. Was berichtet das BMWE auf der AHO-Tagung am 24.11.2026?
- Exakter Normtext der **Übermessungsregeln** (Abschnitt 5) je ATV in der Fassung 2023; die Werte oben stammen aus einer Sekundärquelle [48][49].
- Status einer **Evaluierung des BGB-Bauvertragsrechts** und weitere BGB-Änderungspläne außer Gebäudetyp E. Kabinettstermin für den Gebäudetyp-E-Entwurf.
- Hat der DVA die **VOB/B** 2025/2026 beraten? Gibt es einen veröffentlichten neuen Entwurf? Gefunden wurden nur Hinweise auf die Entwürfe von 2020/2021 [67].
- Urheber- und Nutzungsrechtsstatus von **REB-VB-Texten**, **VHB-Formblättern** und dem **VOB/B-Text** für eine öffentliche Open-Source-Nutzung.
- Länder-VHBs (z. B. Landesbauverwaltungen) und kommunale Vergabehandbücher: Abweichungen bei Sicherheiten, Zahlungsfristen und REB-Vorgaben?
- Die ZVEI-Quelle nennt für die VOB/C „September 2023 bzw. Juli 2024“ [45]. Gab es 2024 Nachträge einzelner ATV?

**Fragen an den Architekten-Freund:**

1. Vereinbarst du bei privaten Bauherren die VOB/B, und wenn ja „als Ganzes“ oder mit eigenen BVB, z. B. 5 Jahre Gewährleistung? Bei öffentlichen Bauherren: Welche Formblätter (VHB Bund/Land/Kommune) musst du verwenden?
2. Wie viele deiner Aufträge sind Einheitspreis-, wie viele Pauschalverträge? Wie rechnest du Pauschalverträge ab (Zahlungsplan, Leistungsstand)?
3. Rechnen Firmen bei dir per Aufmaß mit REB-Dateien bzw. GAEB X31 ab, oder kommen PDFs bzw. Papier? Machst du gemeinsame Aufmaße vor Ort, und mit welchem Werkzeug?
4. Wie organisierst du heute Fristen, z. B. für Stundenlohnzettel, Schlussrechnungsprüfung, Vorbehalt der Vertragsstrafe, Gewährleistungsablauf und Rückgabe von Bürgschaften? Ist dir schon einmal eine Frist „durchgerutscht“?
5. Prüfst du Nachträge auf Basis der Urkalkulation bzw. EFB-Blätter oder mit eigenen Kostenansätzen? Wie oft bekommst du bauwirtschaftliche Nachträge (Bauzeit)?
6. Kümmerst du dich um Bauabzugsteuer, Freistellungsbescheinigungen und Sicherheitseinbehalte, oder macht das der Bauherr bzw. dessen Buchhaltung?
7. Bekommst du schon E-Rechnungen (XRechnung/ZUGFeRD) von Firmen? Wie gehst du damit um?
8. Welche Besonderen Leistungen (Zahlungsplan, Mittelabflussplanung, Leistungsprogramm) werden bei dir regelmäßig beauftragt?
9. Wo deckt NOVA AVA diese Pflichten heute gut ab, und wo arbeitest du mit Excel oder Word nebenher? (→ [Schmerzpunkte](/okf/research/market/pain-points.md))

## Quellen

1. [1] HOAI – Honorarordnung für Architekten und Ingenieure (Gesamttext, Stand: zuletzt geändert 22.03.2023) – gesetze-im-internet.de (BMJ/BfJ) – https://www.gesetze-im-internet.de/hoai_2013/BJNR227600013.html – Gesetz (Verordnung) – abgerufen 2026-11-09
2. [2] HOAI Anlage 10 (Leistungsbild Gebäude und Innenräume, Besondere Leistungen) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/anlage_10.html – Gesetz (Verordnung) – abgerufen 2026-11-09
3. [3] HOAI § 34 Leistungsbild Gebäude und Innenräume – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/__34.html – Gesetz (Verordnung) – abgerufen 2026-11-09
4. [4] EuGH, Urteil vom 04.07.2019, C-377/17 (Kommission/Deutschland) – dejure.org – https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=EuGH&Datum=04.07.2019&Aktenzeichen=C-377/17 – Rechtsprechung – abgerufen 2026-11-09
5. [5] Die HOAI-Novellierung: Stand und Erwartungen (Information geprüft am 02.11.2026) – Quostra (Softwareanbieter-Blog) – https://quostra.com/de-de/blog/hoai-leistungsphasen/hoai-novellierung-stand – Herstellerangabe/Fachblog – abgerufen 2026-11-09
6. [6] Aktuelles & Presse (Einträge 2024–29.10.2026) – AHO – https://www.aho.de/aktuelles-presse/ – Verband (Primärquelle für Verbandsaussagen) – abgerufen 2026-11-09
7. [7] HOAI-Novelle: Wo wir derzeit stehen (VBI, 01.07.2026) – Bayerische Ingenieurekammer-Bau – https://www.bayika.de/de/aktuelles/meldungen/2026-07-1_HOAI-Novelle-Wo-wir-derzeit-stehen-VBI.php – Verband – abgerufen 2026-11-09
8. [8] AHO-Veranstaltung ernüchtert: Neue HOAI hat bei Bundesministerien keine Priorität (24.12.2025) – IWW, PBP Planungsbüro professionell – https://www.iww.de/pbp/honorargestaltung/hoai-2026-aho-veranstaltung-ernuechtert-neue-hoai-hat-bei-bundesministerien-keine-prioritaet-f169582 – Presse – abgerufen 2026-11-09
9. [9] HOAI-Honorargutachten: Bundeswirtschaftsministerium veröffentlicht Endbericht (27.03.2025) – Bayerische Ingenieurekammer-Bau – https://www.bayika.de/de/aktuelles/meldungen/2025-03-27_HOAI-Honorargutachten-Bundeswirtschaftsministerium-veroeffentlicht-Endbericht.php – Verband – abgerufen 2026-11-09
10. [10] Gebäudetyp-E-Gesetz 2026: Der neue Referentenentwurf des BMJV – HOAI.de – https://www.hoai.de/allgemein/gebaeudetyp-e-gesetz-referentenentwurf-2026/ – Presse/Fachportal – abgerufen 2026-11-09
11. [11] BGB § 632a Abschlagszahlungen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__632a.html – Gesetz – abgerufen 2026-11-09
12. [12] BGB § 634a Verjährung der Mängelansprüche – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__634a.html – Gesetz – abgerufen 2026-11-09
13. [13] BGB § 640 Abnahme – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__640.html – Gesetz – abgerufen 2026-11-09
14. [14] BGB § 641 Fälligkeit der Vergütung – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__641.html – Gesetz – abgerufen 2026-11-09
15. [15] BGB § 650a Bauvertrag – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650a.html – Gesetz – abgerufen 2026-11-09
16. [16] BGB § 650b Änderung des Vertrags; Anordnungsrecht des Bestellers – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650b.html – Gesetz – abgerufen 2026-11-09
17. [17] BGB § 650c Vergütungsanpassung bei Anordnungen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650c.html – Gesetz – abgerufen 2026-11-09
18. [18] BGB § 650f Bauhandwerkersicherung – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650f.html – Gesetz – abgerufen 2026-11-09
19. [19] BGB § 650g Zustandsfeststellung; Schlussrechnung – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650g.html – Gesetz – abgerufen 2026-11-09
20. [20] BGB §§ 648, 648a, 650h (Kündigung, Schriftform) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__648a.html (sowie __648.html, __650h.html) – Gesetz – abgerufen 2026-11-09
21. [21] BGB §§ 650i–650o (Verbraucherbauvertrag) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650i.html (sowie __650j.html bis __650o.html) – Gesetz – abgerufen 2026-11-09
22. [22] BGB §§ 650p–650t (Architekten- und Ingenieurvertrag) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650p.html (sowie __650q.html bis __650t.html) – Gesetz – abgerufen 2026-11-09
23. [23] BGB §§ 286, 288 (Verzug, Verzugszinsen) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__288.html (sowie __286.html) – Gesetz – abgerufen 2026-11-09
24. [24] BGB § 271a Vereinbarungen über Zahlungs-, Überprüfungs- oder Abnahmefristen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__271a.html – Gesetz – abgerufen 2026-11-09
25. [25] BGB § 310 Anwendungsbereich (AGB; VOB/B-Privilegierung) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__310.html – Gesetz – abgerufen 2026-11-09
26. [26] BGB § 309 Klauselverbote ohne Wertungsmöglichkeit – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__309.html – Gesetz – abgerufen 2026-11-09
27. [27] BGH, 16.03.2023, VII ZR 94/22 (Einzelgewerk kein Verbraucherbauvertrag) – dejure.org – https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=16.03.2023&Aktenzeichen=VII%20ZR%2094/22 – Rechtsprechung – abgerufen 2026-11-09
28. [28] BGH, 24.07.2008, VII ZR 55/07 (keine VOB/B-Privilegierung gegenüber Verbrauchern) – dejure.org – https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=24.07.2008&Aktenzeichen=VII%20ZR%2055/07 – Rechtsprechung – abgerufen 2026-11-09
29. [29] BGH, 08.08.2019, VII ZR 34/18 (Preis für Mehrmengen nach § 2 Abs. 3 VOB/B) – dejure.org – https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=08.08.2019&Aktenzeichen=VII%20ZR%2034/18 – Rechtsprechung – abgerufen 2026-11-09
30. [30] BGH, 14.10.2004, VII ZR 190/03 (Prüfvermerk des Architekten) – dejure.org – https://dejure.org/dienste/vernetzung/rechtsprechung?Gericht=BGH&Datum=14.10.2004&Aktenzeichen=VII%20ZR%20190/03 – Rechtsprechung – abgerufen 2026-11-09
31. [31] VOB/B § 1 Art und Umfang der Leistung – dejure.org – https://dejure.org/gesetze/VOB-B/1.html – Regelwerk (AGB) – abgerufen 2026-11-09
32. [32] VOB/B § 2 Vergütung – dejure.org – https://dejure.org/gesetze/VOB-B/2.html – Regelwerk (AGB) – abgerufen 2026-11-09
33. [33] VOB/B § 6 Behinderung und Unterbrechung der Ausführung – dejure.org – https://dejure.org/gesetze/VOB-B/6.html – Regelwerk (AGB) – abgerufen 2026-11-09
34. [34] VOB/B § 8 Kündigung durch den Auftraggeber – dejure.org – https://dejure.org/gesetze/VOB-B/8.html – Regelwerk (AGB) – abgerufen 2026-11-09
35. [35] VOB/B § 11 Vertragsstrafe – dejure.org – https://dejure.org/gesetze/VOB-B/11.html – Regelwerk (AGB) – abgerufen 2026-11-09
36. [36] VOB/B § 12 Abnahme – dejure.org – https://dejure.org/gesetze/VOB-B/12.html – Regelwerk (AGB) – abgerufen 2026-11-09
37. [37] VOB/B § 13 Mängelansprüche – dejure.org – https://dejure.org/gesetze/VOB-B/13.html – Regelwerk (AGB) – abgerufen 2026-11-09
38. [38] VOB/B § 14 Abrechnung – dejure.org – https://dejure.org/gesetze/VOB-B/14.html – Regelwerk (AGB) – abgerufen 2026-11-09
39. [39] VOB/B § 15 Stundenlohnarbeiten – dejure.org – https://dejure.org/gesetze/VOB-B/15.html – Regelwerk (AGB) – abgerufen 2026-11-09
40. [40] VOB/B § 16 Zahlung – dejure.org – https://dejure.org/gesetze/VOB-B/16.html – Regelwerk (AGB) – abgerufen 2026-11-09
41. [41] VOB/B § 17 Sicherheitsleistung – dejure.org – https://dejure.org/gesetze/VOB-B/17.html – Regelwerk (AGB) – abgerufen 2026-11-09
42. [42] VOB/A § 9c Sicherheitsleistung (Fassung 2019) – dejure.org – https://dejure.org/gesetze/VOB-A/9c.html – Regelwerk – abgerufen 2026-11-09
43. [43] Bekanntmachung der VOB/A und VOB/B, Ausgabe 2016, vom 07.01.2016 (BAnz AT 19.01.2016 B3, ber. BAnz AT 01.04.2016 B1) – umwelt-online.de – https://umwelt-online.de/recht/bau/vob16.htm – Primärquelle (Bekanntmachungstext, Sekundärportal) – abgerufen 2026-11-09
44. [44] VOB: Ergänzungsband VOB/C 2023 (Stand 01.01.2026) – Architektenkammer Baden-Württemberg – https://www.akbw.de/berufspraxis/buerofuehrung/privates-baurecht-vob-b/vob-ergaenzungsband-vob/c-2023 – Kammer (Fachinformation) – abgerufen 2026-11-09
45. [45] Merkblatt 82029:2025-05 „VOB – Aktueller Stand mit Neuerungen des Teil C“ (22.05.2025) – ZVEI – https://www.zvei.org/fileadmin/user_upload/Verband/Fachverbaende/Arge_Errichter_und_Planer/Neue_Merkblaetter_in_der_Arge_Errichter_und_Planer/Merkblatt_82029_VOB_UEberarbeitung_Teil_C_22052025.pdf – Verband – abgerufen 2026-11-09
46. [46] VOB Teil C – Bauprofessor (f:data GmbH) – https://www.bauprofessor.de/vob-teil-c/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
47. [47] ATV – Allgemeine Technische Vertragsbedingungen (Stand 09/2023) – Bauprofessor – https://www.bauprofessor.de/atv-allgemeine-technische-vertragsbedingungen/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
48. [48] Aufmaßregeln – Bauprofessor – https://www.bauprofessor.de/aufmassregeln/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
49. [49] Öffnung – Bauprofessor – https://www.bauprofessor.de/oeffnung/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
50. [50] Aufmaß (Stand 15.09.2023) – Bauprofessor – https://www.bauprofessor.de/aufmass/ – Fachportal (Sekundärquelle, mit OLG-Rechtsprechung) – abgerufen 2026-11-09
51. [51] REB (Regelungen für die elektronische Bauabrechnung), Stand 29.04.2024 – Bauprofessor – https://www.bauprofessor.de/reb/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
52. [52] REB-Verfahrensbeschreibung 23.003 „Allgemeine Mengenberechnung“, Ausgabe 2009 – BMVBS, bereitgestellt von der BASt – https://www.bast.de/DE/Publikationen/Regelwerke/Verkehrstechnik/V-REB-VB/REB-VB-23-003-Ausgabe-2009.pdf?__blob=publicationFile&v=3 (Formelkatalog Straßenbau 2012: https://www.bast.de/DE/Publikationen/Regelwerke/Verkehrstechnik/V-REB-VB/REB-VB-23-003-Formelkatalog.html) – Primärquelle – abgerufen 2026-11-09
53. [53] BVBS verabschiedet REB-Erweiterung mit neuem Namensraum (14.07.2018) – baulinks.de – https://www.baulinks.de/bausoftware/2018/0062.php4 – Presse – abgerufen 2026-11-09
54. [54] pygaeb – Guide „Quantity phases“ (X31) – Read the Docs – https://pygaeb.readthedocs.io/en/latest/guides/quantity-phases/ – Open-Source-Dokumentation – abgerufen 2026-11-09
55. [55] Vergabe- und Vertragshandbuch für die Baumaßnahmen des Bundes (VHB Bund), Ausgabe 2017, Lesefassung Stand 2023 – BMWSB / Fachinformation Bundesbau – https://www.fib-bund.de/Inhalt/Vergabe/VHB/VHB_2017_Lesefassung_2023.pdf – Primärquelle (amtliches Handbuch) – abgerufen 2026-11-09
56. [56] VHB Bund – Übersichtsseite – Fachinformation Bundesbau – https://www.fib-bund.de/Inhalt/Vergabe/VHB/ – Primärquelle – abgerufen 2026-11-09
57. [57] EStG § 48 Steuerabzug – gesetze-im-internet.de – https://www.gesetze-im-internet.de/estg/__48.html – Gesetz – abgerufen 2026-11-09
58. [58] EStG § 48a Verfahren – gesetze-im-internet.de – https://www.gesetze-im-internet.de/estg/__48a.html – Gesetz – abgerufen 2026-11-09
59. [59] EStG § 48b Freistellungsbescheinigung – gesetze-im-internet.de – https://www.gesetze-im-internet.de/estg/__48b.html – Gesetz – abgerufen 2026-11-09
60. [60] UStG § 13b Leistungsempfänger als Steuerschuldner – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ustg_1980/__13b.html – Gesetz – abgerufen 2026-11-09
61. [61] UStG § 14 Ausstellung von Rechnungen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ustg_1980/__14.html – Gesetz – abgerufen 2026-11-09
62. [62] UStG § 14a Zusätzliche Pflichten bei der Ausstellung von Rechnungen in besonderen Fällen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ustg_1980/__14a.html – Gesetz – abgerufen 2026-11-09
63. [63] UStG § 14b Aufbewahrung von Rechnungen – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ustg_1980/__14b.html – Gesetz – abgerufen 2026-11-09
64. [64] UStG § 27 Allgemeine Übergangsvorschriften (Abs. 38 E-Rechnung) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ustg_1980/__27.html – Gesetz – abgerufen 2026-11-09
65. [65] E-Rechnungsverordnung (ERechV) des Bundes – gesetze-im-internet.de – https://www.gesetze-im-internet.de/erechv/BJNR355500017.html – Gesetz (Verordnung) – abgerufen 2026-11-09
66. [66] Neue VOB/A 2026: Was sich bei EU-weiten Bauvergaben ändert (08.09.2026) – cosinex Blog – https://blog.cosinex.de/2026/09/08/vob-a-2026-neufassung-abschnitt-2-3/ – Fachblog (E-Vergabe-Anbieter) – abgerufen 2026-11-09
67. [67] VOB/B Reform – Aktuelle Entwicklungen (zuletzt aktualisiert 02.07.2026) – Liebert & Röth Rechtsanwälte – https://www.liebert-roeth.de/de/rechtsgebiete/baurecht/reform-der-vob-b – Fachartikel (Kanzlei) – abgerufen 2026-11-09
68. [68] Einheitspreisvertrag – Bauprofessor – https://www.bauprofessor.de/einheitspreisvertrag/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
69. [69] Mengenänderung (Stand 20.09.2018) – Bauprofessor – https://www.bauprofessor.de/mengenaenderung/ – Fachportal (Sekundärquelle, teils veraltet) – abgerufen 2026-11-09
70. [70] Schlussrechnung (Stand 10.10.2023) – Bauprofessor – https://www.bauprofessor.de/schlussrechnung/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
71. [71] Kostenvoranschlag (Stand 25.02.2019) – Bauprofessor – https://www.bauprofessor.de/kostenvoranschlag/ – Fachportal (Sekundärquelle) – abgerufen 2026-11-09
72. [72] Hinweis VOB Teil C – vob-online.de (DIN Media GmbH) – https://www.vob-online.de/de/hinweis-vob-teil-c-155134 – Herstellerangabe (Verlag) – abgerufen 2026-11-09
73. [73] Bekanntmachung der Änderung der VOB/A Abschnitt 1 vom 15.12.2025, BAnz AT 16.12.2025 B7 (nur § 3a neu gefasst; Basis: Fassung vom 31.1.2019, BAnz AT 19.02.2019 B2, zuletzt geändert BAnz AT 02.04.2025 B7, ebenfalls nur § 3a) – umwelt-online (Normtextwiedergabe) – https://www.umwelt-online.de/recht/bau/161225b7.htm – Regelwerk (Wiedergabe) – abgerufen 2026-11-09
74. [74] Erlass BMWSB vom 15.12.2025 „Änderungen der VOB/A – 1. Abschnitt – § 3a“ (Anlage zu Rundschreiben 01/2026) – wirtschaft.bremen.de – https://www.wirtschaft.bremen.de/sixcms/media.php/13/Anlage%2Bzu%2BRundschreiben%2B01_2026%2B-%2B%25C3%2584nderung%2BWertgrenzen%2BVOB_A.pdf – Primärquelle (Erlass) – abgerufen 2026-11-09
