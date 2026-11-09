---
type: Research Note
title: "Vorgaben öffentlicher Bauherren an Planer-LVs und AVA-Daten: Pflichtenhefte, Planerhandbücher, GAEB-Versionen"
description: "Inventar und Anforderungsmatrix dessen, was Bund, Länder-Bauverwaltungen, Kommunen und öffentliche Unternehmen von freiberuflichen Planern bei LV-Dateien, Ausdrucken, Kosten- und Aufmaßdaten sowie IT-Sicherheit in LPH 6–8 verlangen – Grundlage für Export-Profile eines „öffentlichen Modus“ unserer AVA."
resource: https://nlbl.niedersachsen.de/download/208208/AVA-Pflichtenheft_des_SBN_Version_2024-01.pdf
tags: [research, gaeb, pflichtenheft, oeffentliche-auftraggeber, vhb, informationssicherheit, export-profile]
timestamp: 2026-11-09T17:16:17Z
sources: 34
confidence: mittel
---

# Vorgaben öffentlicher Bauherren an Planer-LVs und AVA-Daten: Pflichtenhefte, Planerhandbücher, GAEB-Versionen

> **Lesehinweis.** Stand der Recherche: 9.11.2026. Alle Kernaussagen stammen aus den Originaldokumenten der Bauherren
> (PDF, DOCX, XLSX – selbst gelesen). Vergaberechtliche Grundlagen stehen in
> [Vergaberecht und E-Vergabe](/okf/research/standards/procurement-law-e-vergabe.md), das GAEB-Datenmodell in
> [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md), Werkzeugfragen in
> [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md), Textquellen in
> [STLB-Bau und Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md). Abkürzungen: **AG** = Auftraggeber/Bauherr,
> **AN** = Auftragnehmer, **FbT/FBT** = freiberuflich Tätige (Architekten, Fachplaner), **LB** = Leistungsbeschreibung,
> **LV** = Leistungsverzeichnis, **OZ** = Ordnungszahl, **KG** = Kostengruppe nach DIN 276, **TE** = Textergänzung.

## Kurzfassung

- **Öffentliche Bauherren schreiben Planern die AVA-Daten bis ins Detail vor** – meist als Vertragsanlage zum Planervertrag:
  Niedersachsen (AVA-Pflichtenheft des SBN, 2024-01), NRW (AVA-Standard des BLB NRW, 07-2025), Bayern (VHF Bayern mit
  ZVB DV-Anwendungen, ZVB Datenverarbeitung und Datenaustauschbogen 09/2025), Flughafen München (Richtlinie zur LV-Erstellung,
  2010/2019) [1][19][11][12][13][6]. Wer die Regeln verletzt, muss auf eigene Kosten nachbessern; SBN und BLB verlangen vorab
  einen **AVA-Test** mit Muster-LV, Bayern einen Testlauf [1][3][19][12].
- **Die GAEB-Version ist nicht einheitlich – das ist der wichtigste Befund.** SBN: ausschließlich **DA XML 3.2**, 3.3 „(noch)“
  nicht, ohne Begründung [1]. Bayern: Datenaustauschbogen 2025 „**XML 3.3 ff.**“, ältere ZVB „XML 3.1 ff.“ [13][11][12].
  BLB NRW: **GAEB 90 oder GAEB XML** ohne Versionsangabe, GAEB 2000 ausgeschlossen [19]. Flughafen München: **GAEB-90-Regeln**
  und GAEB-90-Export [6]. VHB Bund (Formblatt 244): „GAEB DA XML“ **ohne Version** [7].
- **Planer liefern meist X82** (bepreister Kostenanschlag, „Kostenanschlag“ = Planerpreise je Position) – die Vergabestelle macht
  daraus die X83 für Bieter (SBN, BLB). In Bayern liefert der Planer zusätzlich eine **geprüfte X83 für vergabe.bayern.de** und
  erhält dafür eigene Zugangsdaten zur Plattform [1][19][12].
- **Strenge Inhaltsregeln:** Wahlpositionen sind überall verboten, Bedarfspositionen beim Bund, beim SBN und in Bayern ebenfalls,
  beim BLB nur für Nicht-Bundesmaßnahmen mit Einzelbegründung; freie Mengen, Preisanfrage- und (teils) Zuschlagspositionen verboten; keine
  EP-Aufgliederung Lohn/Material; **jede Position mit DIN-276-KG** (SBN: 3. Ebene, Fassung 2008 oder 2018 je Auftrag);
  **keine Hinweise auf den Planer** im LV [7][1][11][19].
- **Formale Details unterscheiden sich stark:** OZ-Maske meist `1122PPPPI`, aber Schrittweite 10 mit führenden Nullen (SBN, BLB)
  gegen Schrittweite 1 ohne Lücken (Bayern); Ort/Leistungsbereich-Stufen am Flughafen; BLB begrenzt Kurztexte auf **65 Zeichen**,
  Bieter-TE auf **53 Zeichen** und erlaubt nur einen engen Zeichensatz; Bayern und BLB verbieten jede Textformatierung, das SBN
  schreibt Arial 10 pt vor [1][11][19][6].
- **STLB-Bau** ist Pflicht beim SBN („grundsätzlich“) und in Bayern (Hochbau), beim BLB NRW mindestens 50 % der Positionen,
  beim Bund „in der Regel“ [1][11][19][7]. Eine Lizenzierung von STLB-Bau an Planer durch Länder wurde nicht gefunden – die
  Lizenzkosten trägt das Büro (Einschätzung).
- **Abrechnung:** VHB-Formblatt 451 nennt noch **REB-VB 23.003 Ausgabe 1979**, das SBN verlangt **REB-VB 23.003:2009** mit **X31**
  (DA11 nur ersatzweise); beide Ausgaben sind laut SBN inkompatibel [7][1].
- **Kostenkontrolle:** Bayern verlangt neben DIN 276:2018-12 eine Prognose je **vergabeorientierter Kostenkontrolleinheit (KKE)**
  im Formular „Kostenprognose FBT Hochbau“ aus dem Haushaltssystem HaSta; Kostendokumente in Word/Excel [16][15][12].
- **IT-Sicherheit:** Für Bundesbau in Bayern gilt eine Richtlinie Informationssicherheit (Fassung 05/2026): Planer-IT nach BSI-IT-Grundschutz,
  **Cloud-Dienste nach BSI-Mindeststandard „Externe Cloud-Dienste“**, Umsetzungsbestätigung bei Vertragsschluss und alle drei Jahre [17][18].
  Bei **VS-NfD**-Projekten gelten Selbstakkreditierung (Pflicht seit 01.09.2025) und BSI-zugelassene Verschlüsselung [22].
- **Die Behauptung „Behörden verlangen EU-Anbieter oder Selbstbetrieb“ ließ sich so nicht belegen.** Gefunden wurden
  Sicherheitsniveau-Anforderungen (BSI) und VS-NfD-Regeln, aber kein generelles Verbot von US-Anbietern [17][22]. Für
  VS-NfD-Daten ist ein gewöhnlicher SaaS-Dienst praktisch ausgeschlossen (Einschätzung).
- **Folgerung:** Unser „öffentlicher Modus“ braucht **Export-Profile je Bauherr** (GAEB 90 / XML 3.2 / XML 3.3, OZ-Regeln,
  Positionsarten, Text- und Zeichenregeln, KG-Pflicht, Dateinamen, PDF-Varianten) mit **Prüfung vor dem Export**, sowie einen
  selbst betreibbaren Betriebsmodus für sicherheitsrelevante Projekte.

## Begriffe für Nicht-Architekten

| Begriff | Erklärung |
|---|---|
| **Pflichtenheft / Planerhandbuch / ZVB** | Schriftliche Vorgaben eines Bauherrn, wie Planer ihre Daten liefern müssen. Sie werden meist Vertragsbestandteil (z. B. als „Zusätzliche Vertragsbestimmungen“, ZVB). |
| **Staatliche Bauverwaltung** | Landesbehörden, die Bauten des Landes und – im Auftrag („Organleihe“) – des Bundes durchführen, z. B. Staatliches Baumanagement Niedersachsen (SBN), Staatliche Bauämter in Bayern, Bau- und Liegenschaftsbetrieb NRW (BLB). |
| **Vergabestelle** | Stelle des Bauherrn, die das Vergabeverfahren förmlich führt (Bekanntmachung, Versand, Öffnung, Zuschlag). Der Planer bereitet nur vor (VHB Richtlinie 111 Nr. 8) [7]. |
| **Datenaustauschphase (DA)** | GAEB-Kennziffer des Arbeitsschritts: 81 = LV ohne Preise, 82 = Kostenanschlag mit Planerpreisen, 83 = Angebotsaufforderung an Bieter, 84 = Angebot, 85 = Nebenangebot, 86 = Auftrag, 31 = Aufmaß. Dateiendung: `X8x` (XML), `D8x` (GAEB 90), `P8x` (GAEB 2000). |
| **OZ-Maske** | Schablone für die Nummerierung, z. B. `1122PPPPI` = 2 Stellen Bereich/Titel, 2 Stellen Abschnitt/Untertitel, 4 Stellen Position, 1 Stelle Index. |
| **Positionsarten** | Normalposition (fest beauftragt), Bedarfs-/Eventualposition (nur bei Bedarf), Wahl-/Alternativposition (Alternative zu einer Grundposition), Zulageposition (Aufpreis-Position mit eigener Menge), Zuschlagsposition (prozentualer Zuschlag auf andere Positionen), Stundenlohn-, Pauschal-, Preisanfrageposition, Position mit „freier Menge“ (Bieter setzt die Menge). |
| **Textergänzung (TA/TB)** | Lücke im Positionstext, die der Ausschreibende (TA) oder der Bieter (TB, z. B. „Hersteller/Typ“) ausfüllt. |
| **EP-Aufgliederung** | Aufteilung des Einheitspreises in Anteile (Lohn, Stoffe, Geräte, Sonstiges). |
| **REB 23.003 / DA11 / X31** | Regeln für elektronische Bauabrechnung (Rechenansätze im Aufmaß). DA11 = altes Festformat (max. 9-stellige OZ), X31 = XML-Nachfolger. |
| **KKE (Kostenkontrolleinheit)** | Vergabeorientierte Einheit, in der Bayerns Bauverwaltung Kosten verfolgt (statt nur nach DIN-276-Kostengruppen). |
| **VS-NfD** | Verschlusssache „Nur für den Dienstgebrauch“ – niedrigste Geheimhaltungsstufe; Pläne sicherheitsrelevanter Gebäude (Bundeswehr, Polizei, Justiz) können so eingestuft sein. |
| **Selbstakkreditierung** | Erklärung eines Unternehmens, dass seine IT die Anforderungen des VS-NfD-Merkblatts erfüllt [22]. |

## 1. Inventar: Wer gibt was vor?

| Nr. | Bauherr (Ebene) | Dokument | Stand | Geltung | Verbindlichkeit | Quelle |
|---|---|---|---|---|---|---|
| 1 | Bund | VHB Bund: Formblätter 212 (Teilnahmebedingungen), 244 (Datenverarbeitung), 451 (Datenträger Abrechnung), Richtlinien 100/111/451, Anhang 10 | Ausgabe 2017, Stand 2019/2020, Lesefassung 2023 | Bundesbaumaßnahmen (auch durch Länderbauverwaltungen) | per Erlass verbindlich | [7] |
| 2 | Bund | RBBau – Richtlinien für die Durchführung von Bauaufgaben des Bundes | Ausgabe 15.07.2026 | Bundesbau | Verwaltungsvorschrift | [8] |
| 3 | Bund | BIM für Bundesbauten – Arbeitshilfe Datenaustausch | 07/2023 | Bundesbau mit BIM | Arbeitshilfe, empfehlend | [9] |
| 4 | Bund | STLB-Bau-Folgeerlass (Version 2026-04) | 18.06.2026 | Bundeshochbau | Erlass; Länder-Erlasse auf gaeb.de nicht gelistet | [23], [STLB-Notiz](/okf/research/standards/stlb-bau-tender-texts.md) |
| 5 | Bund (BMWE/BAAINBw) | VS-NfD-Merkblatt (Anlage 4 Geheimschutzhandbuch), Ausgabe BAAINBw-B 096a/08.2026 | Merkblatt-Stand 01.09.2023 | alle Aufträge mit VS-NfD | Vertragsbestandteil bei VS-NfD | [22] |
| 6 | Land Niedersachsen (NLBL/SBN) | AVA-Pflichtenheft des SBN | Version 2024-01 (Datei 20.06.2024), am 9.11.2026 aktuell | Hochbau SBN (Land und Bund in NI) | Anlage zum Honorarvertrag, verpflichtend | [1][2] |
| 7 | Land Niedersachsen | AVA-Test mit Anlagen 1–6 (Testbeschreibung, Muster-LB, Protokolle) | nicht öffentlich | Erstbeauftragung eines FbT | Voraussetzung | [1][3] |
| 8 | Land Niedersachsen | Muster „Vergabevorschlag von Freiberuflich Tätigen“ (DOCX) | Datei zuletzt 02/2023 geändert | LPH 7 | Muster | [5] |
| 9 | Land Bayern (StMB) | VHF Bayern VI.6 – ZVB DV-Anwendungen (LV, GAEB, Vergabeplattform) | 06/2018, red. 10/2018 | Hochbau, Straßenbau (Land und Bund) | Vertragsanlage | [11] |
| 10 | Land Bayern | VHF Bayern VI.10 – ZVB Datenverarbeitung | 02/2020 | wie oben | Vertragsanlage | [12] |
| 11 | Land Bayern | VHF Bayern VI.4.1 – Datenaustauschbogen (XLSX) | 09/2025 | projektbezogen ausgefüllt | Vertragsanlage | [13] |
| 12 | Land Bayern | VHF Bayern VI.4.H – ZVB CAD-Pflichtenheft | 07/2026 | Hochbau Land und Bund | Vertragsanlage | [14] |
| 13 | Land Bayern | VHF Bayern VI.16 – ZVB Kostenkontrollinstrument | 05/2025 | Hochbau | Vertragsanlage | [15] |
| 14 | Land Bayern | VHF Bayern VII.10 – Vertragsmuster Objektplanung Gebäude (Bund) | 02/2025 | Bundesbau in Bayern | Vertragsmuster | [16] |
| 15 | Land Bayern (für Bundesbau) | VHF Bayern VI.23.0 Richtlinie Informationssicherheit + VI.23 Umsetzungsbestätigung | 05/2026 | organbeliehener Bundesbau, Bundeswehr | Vertragsanlage | [17][18] |
| 16 | Land NRW (BLB NRW) | Standard für Erzeugung und Austausch von AVA-Daten | Stand 07-2025 (Datei „Version 05-2025“) | BLB, Land NRW, Bund im BLB-Bereich | wird in Verträgen vereinbart | [19] |
| 17 | Land NRW (BLB NRW) | Muster-LV für den Datenaustausch (Testgrundlage) | 28.08.2020 (älter) | Datenaustauschtest | Test | [20] |
| 18 | Kommune (Stadt Köln) | Allgemeine Vertragsbestimmungen (AVB) für Verträge mit freiberuflich Tätigen | 03/2026 | städtische Maßnahmen | Vertragsbestandteil | [21] |
| 19 | Öffentliches Unternehmen (Flughafen München GmbH) | Richtlinie zur LV-Erstellung für Bau-/Liefer- und Dienstleistungen | Text 03.2010, Anhänge 11.04.2019 (**veraltet**) | alle LVs der FMG | Vorgabe an externe Ausschreibende | [6] |
| 20 | Plattformen (Bieterseite) | vergabe.bayern.de (AVA-Sign), RIB-eVergabe-Hilfe | undatiert | Angebotsabgabe | Plattformregeln | [24][25] |

**Nicht gefunden (öffentlich, ohne Registrierung):** vergleichbare AVA-Vorgaben von Baden-Württemberg (Vermögen und Bau),
Hessen (LBIH), Berlin, Hamburg, Sachsen sowie von Hochschul- und Klinik-Bauabteilungen. Hinweise auf mögliche Fundstellen
stehen unter Offene Fragen.

## 2. Tiefenlektüre: AVA-Pflichtenheft des SBN, Version 2024-01

**Rahmen.** Herausgeber ist die Leitstelle für Ausschreibung, Vergabe und Abrechnung (AVA) im Niedersächsischen Landesamt für
Bau und Liegenschaften (NLBL); 16 Seiten, Dateistand 20.06.2024 [1]. Die Landesseite bietet am 9.11.2026 weiterhin nur
die Version 2024-01 an und nennt das Pflichtenheft eine **Anlage zum Honorarvertrag**, verpflichtend für alle LBs [2].
Das SBN arbeitet selbst mit **RIB iTWO** [1][4]; Vorgaben, die dort voreingestellt sind, tragen im Pflichtenheft ein „(V)“ [1].

**AVA-Test.** Vor dem ersten Auftrag muss ein FbT eine kurze LB nach den Vorgaben selbst erstellen; die Leitstelle prüft sie.
Nach Bestehen ist keine Wiederholung nötig, aber alle folgenden Projekte müssen die Vorgaben vollständig erfüllen [3]. Das
Pflichtenheft nennt sechs Anlagen (Testbeschreibung, Muster-LB, Angaben des FbT, Testprotokoll, Übergabeerklärung, Prüfergebnis);
wer trotz bestandenem Test fehlerhaft liefert, korrigiert [1]. Die Anlagen sind nicht öffentlich.

### 2.1 Alle Regeln mit Software-Bezug

| Nr. | Regel (sinngemäß) | Folge für unsere Software |
|---|---|---|
| 01 | Austausch **ausschließlich GAEB DA XML 3.2**; keine Herstellerformate; XML 3.1/3.0, GAEB 2000 und GAEB 90 nicht verwenden; **XML 3.3 „(noch)“ nicht verwenden**. FbT liefert **X82**; X81/X83 nicht benötigt. SBN erzeugt X83 und Lang-/Kurztext-PDF und stellt sie auf die Landesplattform; Bieter geben X84/X85 ab (Verweis auf VHB 244), Struktur unverändert; nach Vergabe erhält der FbT die **X86** für Nachträge und Rechnungsprüfung. | X82-Export in 3.2; X86-Import 3.2. |
| 02 | Datei darf **keine Fehler**, möglichst keine Warnungen erzeugen: beim Import in iTWO, im **GAEB-XML-Checker des BVBS**, bei „LV-Prüfen“ in iTWO und beim Re-Export. | Vorprüfung + XSD-Validierung + eigene Regeln. |
| 03 | **Nicht mitliefern:** Zahlungsziele/Skonto, Projektadresse, Büro- und AG-Daten inkl. Bankverbindung, Submissionsdaten (Vergabenummer, -art, Termin), Kostenträger. Unvollständige AG-Adressen in der X83 können Bieter-Importe scheitern lassen. | Schalter „Kopfdaten leer lassen“. |
| 04 | Layout wird nicht übertragen; **keine festen Seitenbezüge**; kein Deckblatt/Inhaltsverzeichnis in der Datei. | Lint gegen „siehe Seite …“. |
| 05 | **USt-Satz nur einmal** für das ganze LV. | Export-Schalter. |
| 06 | **Dateinamen** `VVVVVVVV-KK-jjmmtt-FFFF.x8x` (Vergabenummer, AB/VD/AT für Arbeits-/Verdingungs-/Auftrags-LB, Datum, Format X32/X33 bzw. Kurz/Lang für PDF); für die X82 des FbT „möglichst analog“ (Beispiel dort mit „XML32“). | Dateinamen-Schablone. |
| 10 | **4-stufig**, OZ-Maske **`1122PPPPI`**, keine ausgelassenen Stufen; Bezeichnungen Bereich/Abschnitt/Position/Index; **Schrittweite 1/1/10**, Anfang 1/1/10, **führende Nullen** (erste Position `01.01.0010`); Stufen numerisch, Index alphanumerisch; Abweichung nur begründet und abgestimmt. | OZ-Profil + Neunummerierung. |
| 11 | EP-Anteile exakt **Löhne, Stoffe, Geräte, Sonstiges**, Anteil 5 ff. leer; Option „Einheitspreis-Aufgliederung“ für **keine** Position (manche Bieterprogramme können es nicht). | Standard-EP-Anteile, Flag aus. |
| 14 | LB = Baubeschreibung + LV (Vorbemerkungen + Positionen); nichts, was VHB-Formblättern (214, 241) widerspricht oder sie doppelt. | Lint-Hinweis. |
| 15 | **Kein Rückschluss auf den Verfasser** oder den SBN-Sachbearbeiter; Kontakt nur über die Vergabestelle. | Anonymisierungs-Prüfung. |
| 16 | Keine Nebenleistungen (VOB/C), keine Instandhaltung (dafür AMEV-Muster). | Lint-Hinweis. |
| 17 | **Keine** Bedarfs-, Preisanfrage-, Wahl- und Grundpositionen, **keine freien Mengen** (in iTWO gesperrt). | Positionsarten sperren. |
| 18 | Stundenlohn nur im unbedingt nötigen Umfang; keine Materialzuschlags-Positionen (läuft über VHB 221/222). | Lint-Hinweis. |
| 19 | **STLB-Bau in der jeweils aktuellen Version „grundsätzlich“**, Freitext nur für nicht Darstellbares; alle Pflichtmerkmale belegt; STLB-BauZ nur für Zeitverträge; DBD-Baupreise freiwillig, vollständig bepreister Kostenanschlag Pflicht. | STLB-Kennungen verlustfrei; Bepreisungs-Check. |
| 20 | Jedes Element mit **eindeutigem, einzeiligem Kurztext**; Kurztext nicht im Langtext wiederholen; Langtext-LB verbindlich, Kurztext-LB mit **Bieterangabenverzeichnis**. | Prüfregeln + Druckvariante. |
| 21 | Langtext **Arial 10 pt, schwarz, linksbündig**; Textbreite 17 cm (Positionen abzüglich 2,5 cm links/4,5 cm rechts); keine erzwungenen Umbrüche, Tabulator 2,0 cm, keine festen Trennzeichen; **Bilder nicht in den Langtext** (Ausnahme: reduzierte Auflösung). | Formatierung nicht übertragen; Bildgrößen-Check. |
| 22/23 | Baubeschreibung/Vorbemerkungen als **Textelement** (nur Vor-/Nachspann), Hinweise als **Hinweistext**; ohne TE. Das Pflichtenheft nennt dafür die Elementnamen in anderen Programmen, darunter NOVA AVA. | Richtige GAEB-Elemente. |
| 24/25 | TA/TB nur als **echte TE-Bausteine** mit Einleitung und Folgetext; Fabrikatabfragen möglichst vermeiden (Ausschlussrisiko); sonst Ausschreiberprodukt „oder gleichwertig“ voranstellen. | TE als Datenobjekte. |
| 26/27 | Wiederholungs- und **Zuschlagspositionen** sowie Ausführungsbeschreibungen programmtechnisch verknüpfen; Wiederholungsposition nur mit abweichenden Merkmalen, gleiche Einheit und KG. | Referenzen im Modell. |
| 28 | **Einheitenkürzel nach STLB-Bau** auch bei Freitext (nicht „Stck“, „Std“, „m²“); Pauschale `psch` mit Menge 1, möglichst vermeiden. | Einheitenkatalog. |
| 29 | **Alle Positionen mit KG bis zur 3. Ebene**; Fassung nach Rundverfügung vom 03.04.2024: DIN 276-1:2008-12 (Land bis 01.03.2024, Bund nach alter RBBau) bzw. DIN 276:2018-12 (Land ab 01.03.2024, Bund nach neuer RBBau); ältere Fassungen verboten; keine KG an Gliederungsstufen; bei Mengensplit KG an der Gesamtposition. | KG-Pflicht, Katalog 2008/2018. |
| 50/51 | Aufmaß nach **REB-VB 23.003:2009**, Austausch als **X31**, nur ersatzweise **DA11** (max. 9-stellige OZ); Ausgaben 1979 und 2009 inkompatibel. | X31, REB-2009-Rechenkern. |

Quelle der Tabelle: [1].

### 2.2 Schließt das SBN XML 3.3 aus – und warum?

- **Fakt:** Ja. Das Pflichtenheft erlaubt nur 3.2 und schreibt, 3.3 sei „ebenfalls (noch) nicht zu verwenden“ [1]. Die
  Fassung 2024-01 ist am 9.11.2026 weiterhin die angebotene Version [2].
- **Fakt:** **Eine Begründung steht nicht im Dokument** [1].
- **Einschätzung:** Plausibel sind (a) die eigene iTWO-Installation mit Druckvorlagen und Prüfprotokollen, die auf 3.2
  abgestimmt sind, (b) Rücksicht auf Bieter mit älterer Software, die 3.3 nicht lesen kann
  ([GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)), (c) Aufwand für AVA-Test und Muster-LB. Keiner dieser
  Gründe ist belegt. „Noch“ deutet auf eine geplante Umstellung.

### 2.3 Vergabevorschlag-Muster des NLBL

Das Muster „Vergabevorschlag von Freiberuflich Tätigen“ (DOCX mit Formularfeldern) zeigt, was der Planer in LPH 7 liefert [5]:

1. Kopf: Verfasser, Vergabenummer, Baumaßnahme, Leistung; Anlagenliste (Prüfung und Wertung je Bieter, Entwurf
   „Vergabevermerk – Entscheidung über den Zuschlag“, Angebote, Bescheinigungen, Schriftverkehr, Sonstiges).
2. Verfahren: Verfahrensart (national/EU, auch NATO-Ausschreibung), Angebots- und Bindefrist, Ausführungsfristen nach Formblatt 214.
3. Wertungskriterien: Preis (Wertungssumme aus nachgerechneten Angebotssummen) oder mehrere Kriterien; ggf. Instandhaltung mit
   Barwertfaktor bei Laufzeit über 5 Jahre.
4. Übersicht: Angebote in der engeren Wahl mit **Wertungssumme inkl. MwSt.**; ausgeschlossene Angebote mit Begründung.
5. Je Angebot eine Anlage: formale, technische, wirtschaftliche Prüfung, **Eignung** (PQ-Nummer oder Formblatt 124/124 LD bzw.
   EEE, Nachunternehmen), Preisbeurteilung (**Preisspiegel**, Erfahrungswerte, Formblätter 221/222/223, Urkalkulation,
   Lohngleitung), Wertungssumme, Aufklärung, Zuschlagsvorschlag mit Auftragssumme.

Einschätzung: Diese Gliederung ist ein guter Zielentwurf für die Ausgabe „Vergabevorschlag“ unserer Software; Details zu
Preisspiegel und Wertung in [AVA-Prozess I](/okf/research/process/tendering-and-award.md).

## 3. Tiefenlektüre: Richtlinie zur LV-Erstellung der Flughafen München GmbH (FMG)

**Stand:** Textteil „03.2010“, PDF zuletzt 24.09.2019 geändert, Anhänge „Stand: 11.04.2019“ – **veraltet** im Sinne dieser
Recherche; eine neuere Fassung war nicht auffindbar [6].

| Regel (sinngemäß) | Folge für unsere Software |
|---|---|
| OZ nach **GAEB-90-Regeln**: aufsteigend, **max. 9 Stellen** (Stufen + Position + Index). | GAEB-90-kompatible OZ-Prüfung. |
| **Standard-OZ `Z1 Z1 Z2 Z2 P P P P I`**: Z1 = **Ort** aus dem FMG-Bauwerkskatalog (z. B. Terminal-Zonen), Z2 = **Leistungsbereich** aus dem FMG-LB-Katalog (GAEB-LB-Nummern plus Flughafen-Bereiche wie Gepäckförderanlage, Fluggastbrücken, 400-Hz-Anlagen); diese Struktur ist **DA11-konform**. | Orts- und LB-Kataloge als Stammdaten. |
| Position 4-stellig, Schritt 1, 5 oder bevorzugt 10; **Index leer lassen** (Reserve für Nachtragspositionen). | Index-Reserve. |
| **Erweiterte OZ** mit Titelstufe nur, wenn sicher nicht per DA11 abgerechnet wird. | Warnung „DA11 unmöglich“. |
| **Gesamtmengen-LV:** identische Positionen mehrerer Orte zusammenfassen; jede Position trägt **Teilmengen je Ort (Mengensplit)**; Z1 konstant 1; nach Vergabe wandelt das FMG-System in ein ortsgegliedertes LV um. Externe AVA-Systeme **müssen Mengensplits erfassen und als GAEB 90 exportieren**. | Mengensplit nach Ort, GAEB-90-Export. |
| **Freie Summenzeilen** als Hinweistexte mit Präfix „FMG-Sz“, die das FMG-System (ARCHITEXT Pallas) beim GAEB-90-Import in Zwischensummen umsetzt. | Sonderelement „Summenzeile“. |
| Absätze und Aufzählungen mit hartem Zeilenumbruch. | Export-Option. |
| Bieterangaben nur als GAEB-konforme TE, nicht in Hinweisen/Vorbemerkungen. | wie SBN. |
| Lose als zusätzliche Ebene **außerhalb** der 9-stelligen OZ. | Los-Ebene. |
| Jede Position mit **5-stelliger KG nach FMG-Katalog** („DIN 276 neu“ plus Ergänzungen). | Frei definierbare KG-Kataloge. |

Quelle: [6]. **Einschätzung:** Öffentliche Unternehmen definieren eigene Kataloge und herstellerspezifische Konventionen
(Präfix-Hinweistexte für ARCHITEXT Pallas) – das verlangt frei konfigurierbare Kataloge und Sonderelemente.

## 4. Bund: VHB, RBBau und BIM-Arbeitshilfe

### 4.1 VHB Bund, Formblatt 244 „Datenverarbeitung“ (Ausgabe 2017)

- Ergänzt die Angebotsaufforderung; Datenaustausch vorgesehen für **Angebotsanforderung, Angebotsabgabe und Abrechnung** [7].
- Angebotsdaten nach **GAEB, Schnittstelle DA XML – ohne Versionsangabe**; Abrechnung nach den REB-Verfahrensbeschreibungen;
  andere Formate (z. B. EDIFACT) nur nach Einzelvereinbarung; Datenträger eindeutig dem Verfahren zuordenbar kennzeichnen [7].
- **Datei = Arbeitsmittel:** Bei Abweichungen gilt die schriftliche Fassung – außer bei Austausch über eine Vergabeplattform;
  Unterschiede muss der Unternehmer kennzeichnen [7].

### 4.2 VHB Bund, Formblatt 451 „Datenträger Abrechnung“ und Richtlinien

- Anschreiben des AN zur Abschlags-, Teilschluss- oder Schlussrechnung mit Datenträger; vorgedruckt ist
  **„REB-VB 23.003 Ausgabe 1979“**, weitere Verfahrensbeschreibungen können eingetragen werden [7].
- Richtlinien: Vollständigkeits- und Plausibilitätsprüfung der Mengen gegen das LV; **Nachrechnung unabhängig vom AN**, mit oder
  ohne Datenträger; Ergebnislisten und Stempel „Nachrechnung mit DV“; Abweichungen innerhalb der „mit Formblatt 244 vereinbarten
  Toleranzregelung“ bleiben unberücksichtigt [7].
- **Widerspruch im VHB (eigene Prüfung):** Das aktuelle Formblatt 244 enthält gar keine Toleranzregelung [7]. Einschätzung: Relikt
  einer älteren Fassung.

### 4.3 Weitere VHB-Regeln mit Software-Bezug

| VHB-Stelle | Regel (sinngemäß) | Quelle |
|---|---|---|
| Formblatt 212 / 212 EU / 612, Nr. 3.3 | Bieter dürfen eine **selbstgefertigte Abschrift oder Kurzfassung** des LV verwenden; die Langfassung der Vergabestelle ist allein verbindlich | [7] |
| Richtlinie 100 Nr. 4.2.2 | LB „in der Regel“ auf STLB-Bau/STLB-BauZ, Freitext für nicht Darstellbares; STLK für Straßen-/Tiefbau möglich | [7] |
| Richtlinie 100 Nr. 4.2.3/4.2.4 | Fabrikatangaben der Bieter nur, wenn unverzichtbar; produktneutral; Leitfabrikat unzulässig | [7] |
| Richtlinie 100 Nr. 4.6 | **Bedarfs- und Wahlpositionen weder ins LV noch in andere Vergabeunterlagen** (strenger als § 7 VOB/A) | [7] |
| Richtlinie 100 Nr. 4.7 | Angehängte Stundenlohnarbeiten nur im unbedingt erforderlichen Umfang | [7] |
| Richtlinie 111 Nr. 8 | FbT bestimmen keine Bieter, versenden nichts, geben keine Auskünfte, nehmen keine Angebote an; Unterlagen ohne Rückschluss auf den Planer | [7] |
| Anhang 10 | Rechnerische Prüfung mit DV: Stamm-LV gesichert ablegen, nur Kopie verwenden; fehlende Preise nicht ergänzen; Ergebnisliste; Stempel „Rechnerische Prüfung mit DV“ | [7] |
| Hinweise zu 521 | Nachtragstabelle (Excel) an AN und FbT nur ausgedruckt, interne Spalten ausgeblendet | [7] |
| Formblätter 125/126, 247 | Geheim- und Sabotageschutz; bei VS-NfD Verpflichtungserklärung und VS-NfD-Merkblatt | [7] |

### 4.4 RBBau, Ausgabe 15. Juli 2026

- Schlanker Rahmen (33 Seiten); **nennt weder GAEB noch eine DIN-276-Fassung** (eigene Volltextsuche) [8].
- Finale Projektunterlage (FPU) mit **Kostenermittlung auf Stufe der Kostenberechnung**; Prüfung u. a. der Plausibilität der
  Kostenermittlung mit **PLAKODA bzw. RBK** [8].
- Schlussrechnung: Rechnungsliste je Bauaufgabe mit allen Vergabeeinheiten und Abrechnungssummen; Verträge und Rechnungen der FbT
  „nach Möglichkeit“ digital [8].
- Unterlagen einschließlich BIM-Modellen und fachsystemspezifischer Daten sind **revisionssicher, integritäts- und
  authentizitätsgesichert** aufzubewahren und gegen Einsicht Unbefugter zu schützen [8].
- Einschätzung: Konkrete Datenformate für Planer stehen nicht mehr in der RBBau, sondern in Vertragsmustern und Länder-Anlagen.

### 4.5 BIM für Bundesbauten – Arbeitshilfe Datenaustausch (07/2023)

- Nennt **GAEB DA XML 3.3 Ausgabe 2021-05** als den Stand, der BIM-Anforderungen aufgreift und LV-Daten mit Modellen verknüpft;
  BIM-LV-Container nach DIN 18290 (Entwürfe 03/2023) [9].
- **Keine verbindliche Versionsvorgabe** für Planer-LVs; Schwerpunkt ist IFC [9]. Mehr in [BIM und AVA](/okf/research/standards/bim-and-ava.md).

## 5. Bayern: Vertragshandbuch für freiberufliche Leistungen (VHF Bayern)

Das VHF Bayern (Handbuch „Stand Juli 2026“) bündelt Vertragsmuster und Anlagen für Landes- und Bundesbaumaßnahmen in Bayern [10].

### 5.1 ZVB DV-Anwendungen (VI.6, 06/2018) und ZVB Datenverarbeitung (VI.10, 02/2020)

| Regel (sinngemäß) | Quelle |
|---|---|
| Weitere Besondere Vertragsbedingungen (WBVB) als eigene Textelemente in Abschnitt 01, mit Anfang/Ende markiert, nummeriert als Fortsetzung von Formblatt 214 VHB Bayern; Standardtexte im „Beuth-Format“ (ASCII, Satzlänge 105) | [11][12] |
| **OZ: 2 Stellen Abschnitt, 2 Stellen Unterabschnitt, 4 Stellen Position, 1 Stelle Index** (nie vorbelegen); numerisch; keine Nummer 0; je Abschnitt ab Position 1 **mit Schrittweite 1, ohne Lücken; keine Indizes** | [11] |
| Kein Deckblatt, kein manuelles Inhaltsverzeichnis; **keine Formatierung (fett, kursiv, Farbe), keine Tabellen, keine Aufzählungen, keine Bilder** in Positionstexten | [11] |
| Standardtexte und deren Einheiten nicht verändern; TA zwingend ausfüllen; Bieterangaben bei Freitext über die GAEB-Felder `ComplCaption`/`ComplBody`/`ComplTail` mit „vom Bieter einzutragen“ | [11] |
| Stundenlohn (LB 893) nur bei begründetem Bedarf, eigener Unterabschnitt; Pauschalen nur mit Menge 1 | [11] |
| **Unzulässig:** Wahl-, Bedarfs-, Preisanfrage-, **Zuschlags**positionen (Zulagepositionen sind etwas anderes), freie Mengen, EP-Aufteilung Material/Lohn, Bieter-TE in Vorbemerkungen/Hinweisen, Bieterkommentare | [11] |
| **STLB-Bau in jeweils aktueller Fassung** für Hochbau, LB-StB-By für Straßenbau | [11][12] |
| GAEB „**XML 3.1 ff.**“; Übergabe als **X81 bzw. X82** (bepreist) und **X83** für die Plattform; Medien vergabe.bayern.de oder E-Mail; AG darf Medien vorschreiben | [11][12] |
| Keine Hinweise auf den Planer in LV und Anlagen | [11][12] |
| **Ein Los = eine LV-Datei**; allgemeine Vorbemerkungen in jedes Los | [11] |
| **Testlauf** beim AG; Prüfung mit AG-Prüfsoftware, Übernahme nur fehlerfrei; Nachbesserung und Kosten der Wiederholungsprüfung trägt der AN | [11][12] |
| **Zugelassene Einheiten** als feste Liste (u. a. `St`, `m2`, `m3`, `psch`, `h`, `Wo`, zusammengesetzte wie `m2Wo`, `StMt`) | [11] |
| Planer erhalten **eigene Zugangsdaten für vergabe.bayern.de** (nur ein Zugang, Startpasswort ändern); die LB muss der Schnittstelle DA 83 entsprechen und vor der Übergabe mit einem vom AG genannten Online-GAEB-Prüfprogramm fehlerfrei geprüft sein; Pläne als PDF, auf Verlangen auf die Plattform hochladen | [11][12] |
| Sonstige Unterlagen, **ausdrücklich Kostenberechnung, Kostenanschlag und Kostenkontrolle**, in Word- bzw. Excel-Format | [12] |

### 5.2 Datenaustauschbogen (VI.4.1, Stand 09/2025)

- Projektbezogenes Excel-Formular, das AG und AN gemeinsam ausfüllen [13].
- **AVA-System des AG im Muster: Architext Pallas**; Auswahlliste außerdem NOVA AVA und RIB iTWO [13].
- Planer liefern das **LV als GAEB „XML 3.3 ff.“** und **Beschreibungen als PDF/A**; Aufmaß als **GAEB DA11** ist als Option
  vorgesehen (im Muster nicht angekreuzt) [13].
- Allgemeine Daten docx/xlsx (Version 2024), PDF/A; Übergabe „virenfrei“ [13].
- Bei Bundeswehr-Maßnahmen ist der Projektraum **SAP C4P (cloud for projects)** zu verwenden [13].
- **Widerspruch innerhalb Bayerns:** ZVB 2018/2020 nennen „XML 3.1 ff.“ [11][12], der Bogen 2025 „XML 3.3 ff.“ [13].
  Einschätzung: Der projektbezogen ausgefüllte, jüngere Bogen ist maßgeblich.

### 5.3 Kostenkontrolle (VI.16, 05/2025) und Vertragsmuster Gebäude (Bund, 02/2025)

- Kosten bis zur Entwurfsplanung nach **DIN 276:2018-12**, ab Ausführungsplanung parallel nach **KKE**; optional ab
  Vergabevorbereitung nur noch nach KKE; laufende Kostenkontrolle elektronisch nach Vorgaben des AG zu Inhalt, Form und
  Austauschformat [16].
- VI.16: Das Bauamt exportiert aus **HaSta** (Haushaltsverfahren der Staatsbauverwaltung) das Formular „Kostenprognose FBT Hochbau“
  (z. B. bearbeitbares PDF) mit KKE, Verträgen, Zahlungen und Prognosen; der Planer trägt **B0 (Rückstellungen)** und
  **B1 (Einplanungen)** je KKE, Fertigstellungsgrad und Begründung ein; die Objektplanung sammelt die Fachplaner-Dateien und
  liefert eine Gesamtübersicht; das Bauamt überträgt zurück [15].
- Einschätzung: Für Bayern braucht eine AVA eine **Prognose je KKE** (B0–B4-Logik) und eine Ausgabe, die dieses Formular füllt;
  reine DIN-276-Berichte genügen nicht. Grundlagen in [Kostenplanung nach DIN 276](/okf/research/standards/din-276-cost-planning.md)
  und [AVA-Prozess II](/okf/research/process/billing-and-cost-control.md).

### 5.4 CAD-Pflichtenheft (VI.4.H, 07/2026)

Regelt 2D-Pläne (Layer, Koordinaten, Plankopf, TA-Kennzeichnung) und verweist für Formate auf den Datenaustauschbogen [14].
Für die AVA nur mittelbar relevant (Pläne als PDF-Anlagen).

## 6. NRW und Kommunen

### 6.1 „Standard für Erzeugung und Austausch von AVA-Daten des BLB NRW“ (Stand 07-2025)

Gilt für BLB-eigene, Landes- und Bundesbaumaßnahmen im Bereich des BLB und wird in Verträgen mit Externen vereinbart [19].
Dazu gehört ein Muster-LV für den Datenaustauschtest (28.08.2020) [20].

| Regel (sinngemäß) | Quelle |
|---|---|
| Nur **GAEB 90 und GAEB XML** (XML bevorzugt, **ohne Versionsangabe**); **GAEB 2000/2000XML nicht unterstützt** | [19] |
| Phasen mit Freischaffenden **X81/X82 bzw. D81/D82**; X82/D82 mit **Kalkulationspreisen (Eigenansatz) und DIN-276-KG** | [19] |
| Aufbau mindestens nach **GAEB-90-Standard ohne Erweiterungen**; OZ **`1122PPPPI`**: Titel und Untertitel je 2-stellig (Schritt 1), Position 4-stellig (**Schritt 10**), Index ungenutzt; „00“ verboten; **führende Nullen zwingend** | [19] |
| **Keine Formatierung**; **erlaubter Zeichensatz** nur Buchstaben inkl. Umlaute/ß, Ziffern und wenige Satzzeichen (`: = ( ) , ; . + - x / * %`); Schreibweisen nach STLB-Bau („größer“ statt `>`) | [19] |
| **Kurztext max. 65 Zeichen** (Rest wird abgeschnitten); **Bieter-TE max. 53 Zeichen**; keine Bieter-TE in Vorbemerkungen/Hinweisen | [19] |
| Keine Tabellen, Skizzen, Fotos im LV (gesonderte Dateien) | [19] |
| **Grund-/Wahlpositionen verboten**; **Bedarfspositionen** bei Bundesmaßnahmen verboten, sonst nur ausnahmsweise mit **schriftlicher Begründung je Position** für die Vergabeakte | [19] |
| Verboten: Preisanfrage-, Zuschlags- und bezuschlagbare Positionen, freie Mengen, Hinweistexte in Abschnitten ohne Positionen, EP-Trennung Material/Lohn | [19] |
| **Jede Position mit DIN-276-KG**, Ausgabe und Tiefe projektbezogen; Einheiten nur aus der Einheitentabelle | [19] |
| **STLB-Bau für mindestens 50 % der Teilleistungen** je LB (Wiederholungspositionen zählen nicht) | [19] |
| Selbst kalkulierte Preise; Vertragsbedingungen nicht ins LV; kein Deckblatt/Inhaltsverzeichnis; **keine Hinweise auf den Planer** | [19] |
| Übergabe **per E-Mail** (andere Medien nach Absprache); Virenprüfung (Schadenersatz bei Versäumnis); **Dateinamen nur A–Z, 0–9, `-`, `_`**, Muster `Projektnummer_Bezeichnung.x82`, Versionierung; alle LVs und Zusatzdokumente auch als **PDF** (A4, Seitenzahl unten rechts, mind. 10 pt) | [19] |
| **Datenaustauschtest** mit einer Muster-LB als PDF, die der Planer erfasst und als GAEB zurückgibt | [19][20] |
| **Vertraulichkeit:** keine sicherheitsrelevanten Informationen an Dritte; nach Auftragsende Rückgabe oder Vernichtung aller Daten und Kopien | [19] |

Einschätzung: Der BLB NRW verlangt faktisch „GAEB-90-taugliche“ LVs in XML-Hülle (9-stellige OZ, kurze Kurztexte, enger
Zeichensatz). Das Profil muss das **vor** dem Export prüfen.

### 6.2 Stadt Köln: AVB für Verträge mit freiberuflich Tätigen (03/2026)

- In LB/LV/Vorbemerkungen keine Regelungen, die von VOB/B und VOB/C abweichen [21].
- Arbeitsergebnisse müssen über die DV-Anlagen des AG und der übrigen Beteiligten austauschbar sein; **Datenaustausch auf
  Verlangen praktisch testen**; Planinhalte nach AG-Vorgabe einheitlich kodieren [21].
- Vertraulichkeit auch nach Vertragsende; Weitergabe an Unbeteiligte nur mit Zustimmung in Textform; **Löschung vom AG
  gelieferter Daten auf Anforderung**; bei elektronischen Unterlagen Verfasser in Textform nennen [21].
- Keine GAEB-Version, keine OZ-Regeln (Einschätzung: Kommunen regeln das eher projektbezogen oder gar nicht).

## 7. Anforderungsmatrix (Bauherr × Anforderung)

Legende: „–“ = in den geprüften Dokumenten nicht geregelt.

| Anforderung | Bund (VHB/RBBau) | SBN Niedersachsen | Bayern (VHF) | BLB NRW | Flughafen München | Stadt Köln |
|---|---|---|---|---|---|---|
| GAEB-Format/-Version | DA XML, keine Version [7]; BIM-AH nennt 3.3 [9] | **nur XML 3.2**; 3.3 „(noch)“ nicht; kein GAEB 90/2000 [1] | **XML 3.3 ff.** (2025) [13]; ZVB: 3.1 ff. [11][12] | **GAEB 90 oder XML** (ohne Version); kein GAEB 2000 [19] | GAEB-90-Regeln und -Export [6] | – |
| Lieferphase Planer | – | **X82**; erhält X86 [1] | **X81/X82 + geprüfte X83** für die Plattform [12] | **X81/X82** bzw. D81/D82 [19] | (GAEB-90-Export) [6] | Austauschbarkeit + Test [21] |
| OZ-Maske | – | `1122PPPPI`, Schritt 1/1/10, führende Nullen [1] | 2+2+4+1, **Schritt 1, keine Lücken, kein Index** [11] | `1122PPPPI`, Schritt 1/1/10, führende Nullen [19] | `Z1Z1Z2Z2PPPPI` (Ort, LB), Index leer [6] | – |
| Kurztext/Feldlängen | – | 1 Zeile, eindeutig [1] | Lang- und Kurztext Pflicht [11] | **65 Zeichen**, Bieter-TE **53** [19] | – | – |
| Formatierung/Bilder | – | Arial 10 pt, sparsam fett/kursiv, keine Bilder [1] | **keine** Formatierung, Tabellen, Bilder [11] | **keine** Formatierung, Tabellen, Bilder; enger Zeichensatz [19] | harte Umbrüche [6] | – |
| STLB-Bau | „in der Regel“ [7] | „grundsätzlich“, aktuelle Version [1] | Pflicht (Hochbau) [11] | **≥ 50 %** [19] | – | – |
| Hersteller/Leitfabrikat | Leitfabrikat unzulässig [7] | Fabrikatabfragen vermeiden; „oder gleichwertig“ [1] | – | – | – | keine Abweichung von VOB/B/C [21] |
| Bedarfspositionen | verboten [7] | verboten [1] | verboten [11] | Bund verboten, sonst Ausnahme mit Begründung [19] | – | – |
| Wahl-/Grundpositionen | verboten [7] | verboten [1] | verboten [11] | verboten [19] | – | – |
| Zuschlagspositionen | – | erlaubt, verknüpfen [1] | **verboten** [11] | **verboten** [19] | – | – |
| Stundenlohn | nur unbedingt nötig [7] | nur unbedingt nötig [1] | nur begründet, eigener Abschnitt [11] | – | eigener LB 900/091 im Katalog [6] | – |
| Freie Menge / Preisanfrage | – | verboten [1] | verboten [11] | verboten [19] | – | – |
| EP-Aufgliederung | Formblatt 223 auf Verlangen [7] | Anteile benennen, Aufgliederung **aus** [1] | keine Material/Lohn-Teilung [11] | keine Material/Lohn-Teilung [19] | – | – |
| DIN-276-KG je Position | – | **Pflicht, 3. Ebene**, Fassung 2008/2018 je Auftrag [1] | Kosten nach DIN 276:2018-12 + KKE [16] | **Pflicht**, Fassung/Tiefe je Projekt [19] | **5-stellig nach FMG-Katalog** [6] | – |
| Einheiten | Abrechnungseinheit nach ATV [7] | STLB-Kürzel [1] | feste Liste [11] | Einheitentabelle [19] | – | – |
| Planer-Anonymität | Pflicht [7] | Pflicht [1] | Pflicht [11][12] | Pflicht [19] | – | – (Pläne unterzeichnet der Planer als Verfasser) [21] |
| Dateinamen | Datenträger kennzeichnen [7] | `Vergabenr-KK-jjmmtt-Format` [1] | – | Projektnr_Bezeichnung, nur A–Z/0–9/-/_ [19] | – | – |
| PDF/Druck | schriftliche Fassung gilt [7] | SBN druckt Lang-/Kurz-LV selbst [1] | **PDF/A** für Beschreibungen [13] | PDF aller LVs, A4, Seitenzahlen [19] | – | – |
| Deckblatt/Inhaltsverzeichnis | – | nicht liefern [1] | nicht erstellen [11] | nicht erforderlich [19] | – | – |
| Aufmaß/REB | REB-VB 23.003 **Ausgabe 1979** (Formblatt 451) [7] | **REB 2009, X31**, DA11 ersatzweise [1] | DA11 optional [13] | – | DA11-konforme OZ [6] | – |
| Kostenkontrolle | Kostenberechnung, PLAKODA/RBK [8] | – | **KKE-Prognose (HaSta-Formular)**, Word/Excel [15][12] | Kalkulationspreise in X82 [19] | SAP-Kontierung im FMG-System [6] | – |
| Test vor Auftrag | – | **AVA-Test** [1][3] | Testlauf [11][12] | Datenaustauschtest [19] | – | Test auf Verlangen [21] |
| Bestimmte AVA-Software verlangt? | nein | nein (SBN selbst iTWO) [1][4] | nein (AG: Architext Pallas) [13] | nein | nein (FMG: ARCHITEXT Pallas) [6] | nein |
| IT-Sicherheit | VS-NfD-Regeln [7][22] | – | BSI-Grundschutz, Cloud nach BSI-Mindeststandard (Bundesbau) [17] | Vertraulichkeit, Rückgabe/Vernichtung, Virenprüfung [19] | – | Vertraulichkeit, Löschung [21] |

**Keiner der geprüften Bauherren verlangt eine BVBS-Zertifizierung oder ein bestimmtes AVA-Produkt.** Sie verlangen fehlerfreie
Importe in **ihre** Systeme (iTWO, Architext Pallas) und prüfen mit eigenen Werkzeugen bzw. dem BVBS-GAEB-XML-Checker [1][12][19].

## 8. GAEB-Versionen in der Praxis: Stichprobe aktueller Ausschreibungen

**Methode:** Gesucht wurden öffentlich lesbare Bekanntmachungen und Bieterbedingungen 2025/2026 ohne Registrierung. Gelesen wurden
neun eForms-Bekanntmachungen (Datenservice Öffentlicher Einkauf, oeffentlichevergabe.de) aus März bis Mai 2026 [26]–[34].
Die eigentlichen Teilnahmebedingungen und LV-Dateien liegen auf den Plattformen (evergabe-online, evergabe.nrw, DTVP,
vergabe.bayern) und waren ohne Sitzung bzw. Registrierung nicht abrufbar; sie wurden nicht weiter verfolgt.

| Nr. | Bauherr | Maßnahme (Kurz) | Übermittelt | Bieterformat laut Bekanntmachung | GAEB-Version | Kurz-LV erwähnt | Quelle |
|---|---|---|---|---|---|---|---|
| 1 | Stadt Essen – Immobilienwirtschaft | Neubau Gesamtschule, Tischlerarbeiten | 08.04.2026 | Angebotsdatei **GAEB D84 oder X84**, sonst allgemein lesbare Formate; bepreistes LV zusätzlich als PDF-Scan „ratsam“ | nicht genannt | nein | [26] |
| 2 | Berliner Verkehrsbetriebe | Betriebshof, Tiefbau | 28.04.2026 | nicht genannt | – | nein | [27] |
| 3 | Stadt Halle (Saale) | Kita-Sanierung, Bauendreinigung | 08.04.2026 | nicht genannt | – | nein | [28] |
| 4 | Landeshauptstadt Wiesbaden, Hochbauamt | Schule, Brandschutzsanierung, Lüftung | 27.03.2026 | nicht genannt | – | nein | [29] |
| 5 | Stadt Wermelskirchen | Planerleistungen Schulen (keine Bauleistung) | 05.05.2026 | nicht genannt | – | nein | [30] |
| 6 | DB InfraGO AG | Rangierbahnhof Kassel | 15.04.2026 | nicht genannt | – | nein | [31] |
| 7 | Congress-Centrum Saar GmbH | Congresshalle, Baulogistik | 14.04.2026 | nicht genannt | – | nein | [32] |
| 8 | Beschaffer „FE.EI-SW“ | PFA 1.1 Bonatzbau | 24.04.2026 | nicht genannt | – | nein | [33] |
| 9 | LAKUMED Kliniken Landshut | Krankenhaus Umbau/Erweiterung BA 8 | 22.04.2026 | nicht genannt | – | nein | [34] |

**Auszählung:** Bieterformat genannt 1 von 9; GAEB-Version genannt 0 von 9; Kurz-LV-Regel in der Bekanntmachung 0 von 9.
Ergänzend: Wer VHB-Formblatt 212 verwendet, erlaubt Bietern immer eine **selbstgefertigte Kurzfassung** mit verbindlicher
Langfassung [7]. Auf vergabe.bayern.de füllen Bieter das LV mit dem mitgelieferten Programm **AVA-Sign** aus oder exportieren
die **GAEB-DA83-Datei** in ihre eigene Kalkulation [24]; die RIB-eVergabe-Hilfe nennt als Upload-Formate D83, P83 und X83 [25].

**Einschätzung:** Eine belastbare Versionsverteilung (3.2 vs. 3.3 vs. GAEB 90) lässt sich aus öffentlichen Bekanntmachungen
**nicht** gewinnen – die Angaben stehen in Teilnahmebedingungen und Dateinamen auf den Plattformen. Der beste Weg ist, beim
Architekten-Freund die Unterlagen seiner letzten Verfahren auszuwerten (siehe Fragen unten).

## 9. IT-, Hosting- und Sicherheitsanforderungen an Planer

### 9.1 Bundesbau in Bayern: Richtlinie Informationssicherheit (VI.23.0, 05/2026)

- Gesamtverantwortung beim Bauherrn, auf Bundeswehr-Liegenschaften bei der Bundeswehr; der AN verantwortet die
  Informationssicherheit seiner Leistungen einschließlich Unterauftragnehmern [17].
- Maßstab für die Planer-IT ist der **aktuelle BSI-IT-Grundschutz** [17].
- Nicht öffentliche Auftragsdaten ohne VS-Bezug: IT muss die **BSI-Mindeststandards nach § 44 Abs. 1 BSIG sinngemäß** erfüllen,
  **bei Cloud-Software insbesondere den Mindeststandard „Externe Cloud-Dienste“** [17].
- Nachweis: **„Informationssicherheits-Umsetzungsbestätigung“** (Formular VI.23) bei Vertragsschluss, danach mindestens alle drei
  Jahre und auf Verlangen; eine VS-NfD-Selbstakkreditierung ersetzt sie [17][18].
- Bundeswehr-Liegenschaften: **Meldepflicht** für Sicherheitsvorfälle (z. B. Cyberangriff, Datenabfluss) an AG, CSO Bw und
  CISO Infra mit Formular; Fragen u. a. nach VS-konformer Verschlüsselung und getrennt verwahrten Schlüsseln [17].

### 9.2 VS-NfD-Merkblatt (Anlage 4 Geheimschutzhandbuch, Stand 01.09.2023)

- Unternehmen, die VS-NfD elektronisch verarbeiten, müssen ihre IT **selbst akkreditieren**; Frist war der **01.09.2025** [22].
- IT-Systeme brauchen vor der ersten Nutzung eine **Freigabe** durch die verantwortliche Person; Verarbeitung beginnt schon beim
  Lesen auf IT [22].
- **Elektronische Übertragung grundsätzlich verschlüsselt** mit IT-Sicherheitsprodukten mit **BSI-Zulassungsaussage**; mobile
  Systeme mit zugelassener Verschlüsselung [22].
- In den beschriebenen Netz-Konstellationen darf die Schadcode-Prüfung **nicht außerhalb des VS-NfD-Netzes, etwa in der Cloud,**
  laufen; zusätzlich IT-Grundschutz (Basis- und Standardanforderungen) [22].
- Weitergabe an **Unternehmen mit Sitz im Ausland** nur mit Zustimmung des VS-Herausgebers und grundsätzlich auf Basis eines
  Geheimschutzabkommens mit dem Empfängerland [22].
- Einschätzung: Für VS-NfD-Projektdaten ist eine gewöhnliche Mehrmandanten-SaaS-AVA praktisch nicht nutzbar – unabhängig vom
  Firmensitz des Anbieters. Nötig ist ein Betrieb auf freigegebener, selbst akkreditierter Büro-IT (lokal oder im eigenen Netz).

### 9.3 Vertraulichkeits- und Datenklauseln in Planerverträgen

| Bauherr | Klausel (sinngemäß) | Quelle |
|---|---|---|
| BLB NRW | sorgfältige, vertrauliche Behandlung; keine sicherheitsrelevanten Informationen an Dritte; nach Auftragsende Rückgabe oder Vernichtung; Virenprüfung mit Haftung | [19] |
| Stadt Köln | Verschwiegenheit über Vertragsende hinaus; Weitergabe nur mit Zustimmung; Löschung gelieferter Daten auf Anforderung | [21] |
| Bayern (Datenaustauschbogen) | Daten virenfrei; Regelung zu Softwarelizenzen für native Daten; Bundeswehr-Projektraum SAP C4P | [13] |
| Bund (RBBau) | revisionssichere, integritätsgesicherte Aufbewahrung, Schutz vor unbefugter Einsicht (Bauverwaltung) | [8] |
| Bund (VHB) | Geheim- und Sabotageschutz über Formblätter 125/126/247 und VS-NfD-Merkblatt | [7][22] |

### 9.4 Prüfung der Behauptung „öffentliche Auftraggeber verlangen EU-Anbieter oder Selbstbetrieb“

Die NOVA-Notiz enthält die unbelegte Einschätzung, manche öffentliche Auftraggeber verlangten Anbieter mit EU-Hauptsitz oder
Selbstbetrieb ([NOVA AVA: Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md), Abschnitt 12).

- **Nicht belegt:** In keinem der geprüften Dokumente steht eine Pflicht zu EU-Hauptsitz, ein „Keine US-Cloud“-Verbot oder
  eine allgemeine Pflicht zum Selbstbetrieb [1]–[22].
- **Belegt ist Folgendes:** (a) Bundesbau in Bayern erlaubt Cloud-Software, verlangt aber den **BSI-Mindeststandard „Externe
  Cloud-Dienste“** und eine Umsetzungsbestätigung [17]; (b) **VS-NfD-Daten** dürfen nur auf freigegebener, selbst akkreditierter
  IT mit zugelassener Verschlüsselung verarbeitet werden, Weitergabe an Unternehmen im Ausland nur mit Zustimmung [22];
  (c) die Bundeswehr gibt für Projekträume selbst eine Cloud-Plattform vor (SAP C4P) [13].
- **Bewertung:** Die Aussage ist in dieser Allgemeinheit **nicht haltbar**. Haltbar ist: Bei sicherheitsrelevanten Projekten
  (VS-NfD) und bei Bundesbau mit BSI-Anforderungen braucht ein Planer eine Lösung, die er **selbst betreiben** kann oder deren
  Cloud-Betrieb BSI-Anforderungen nachweisbar erfüllt. Einschätzung: Für unser Projekt ist Selbstbetrieb damit ein echtes
  Differenzierungsmerkmal, aber kein Muss für alle öffentlichen Kunden.

## 10. Widersprüche zwischen Bauherren

| Thema | Konflikt | Quellen |
|---|---|---|
| GAEB-Version | SBN nur 3.2 (3.3 verboten) ↔ Bayern 3.3 ff. ↔ BLB GAEB 90 oder XML ↔ FMG GAEB 90 ↔ Bund ohne Version | [1][13][19][6][7] |
| Version innerhalb Bayerns | ZVB 2018/2020 „3.1 ff.“ ↔ Datenaustauschbogen 2025 „3.3 ff.“ | [11][12][13] |
| Positionsschrittweite | 10 mit führenden Nullen (SBN, BLB) ↔ 1 ohne Lücken (Bayern) ↔ 1/5/10 (FMG) | [1][19][11][6] |
| Index | alphanumerisch zulässig (SBN) ↔ nie verwenden (Bayern) ↔ ungenutzt (BLB) ↔ Reserve für Nachträge (FMG) | [1][11][19][6] |
| Textformatierung | Arial 10 pt, sparsam fett/kursiv, Tabellen empfohlen (SBN) ↔ keinerlei Formatierung und keine Tabellen (Bayern, BLB) | [1][11][19] |
| Zuschlagspositionen | SBN: verknüpft verwenden ↔ Bayern, BLB: verboten | [1][11][19] |
| Bedarfspositionen | Bund/SBN/Bayern: verboten ↔ BLB: für Nicht-Bundesmaßnahmen ausnahmsweise | [7][1][11][19] |
| STLB-Anteil | „grundsätzlich“ (SBN), Pflicht (Bayern), ≥ 50 % (BLB), „in der Regel“ (Bund) | [1][11][19][7] |
| Aufmaß-Norm | Formblatt 451: REB-VB 23.003 von 1979 ↔ SBN: Ausgabe 2009, X31 bevorzugt | [7][1] |
| Gliederung | Titel nach Gewerk/Bereich (SBN, BLB) ↔ Ort + Leistungsbereich (FMG) | [1][19][6] |
| KG-Katalog | DIN 276 2008/2018 (SBN), projektbezogen (BLB), 2018 + KKE (Bayern), FMG-eigener 5-stelliger Katalog | [1][19][16][6] |
| Lieferumfang | nur X82 (SBN) ↔ X81 + X82 (BLB) ↔ X81/X82 + X83-Upload (Bayern) | [1][19][12] |

## 11. Abgeleiteter Konfigurationsbedarf: Export-Profile je Bauherr

Einschätzung: Statt fest verdrahteter „öffentlicher Regeln“ braucht die Software **versionierte, datierte Profile** (z. B. als
YAML/JSON im Repository), die Export, Prüfung und Druck steuern. Vorschlag für Profilparameter:

| Parameter | Werte (Beispiele) | SBN 2024-01 | Bayern 2025 | BLB NRW 2025 | FMG 2019 |
|---|---|---|---|---|---|
| `gaeb.format` | GAEB90, XML31, XML32, XML33 | XML32 | XML33 | XML (Version absprechen) oder GAEB90 | GAEB90 |
| `gaeb.phasen` | X81, X82, X83, X86-Import, X31 | X82; X86 rein; X31 | X81/X82, X83 | X81/X82 (D81/D82) | D8x |
| `kopf.leer` | Zahlungsziele, Adressen, Bank, Submission, Kostenträger | ja | – | – | – |
| `oz.maske` / `oz.schritt` / `oz.nullen` / `oz.index` | `1122PPPPI` / 1-1-10 / ja / erlaubt | wie links | 2-2-4-1 / Position 1, lückenlos / – / verboten | `1122PPPPI` / 1-1-10 / ja / ungenutzt | `Z1Z1Z2Z2PPPPI` / 10 / – / reserviert |
| `positionsarten.gesperrt` | Bedarf, Wahl, Grund, Zuschlag, Preisanfrage, freie Menge | Bedarf, Wahl, Grund, Preisanfrage, freie Menge | + Zuschlag | + Zuschlag (Bedarf nur mit Begründung außerhalb Bund) | – |
| `text.formatierung` | voll, sparsam, keine | sparsam (Arial 10) | keine | keine | harte Umbrüche |
| `text.kurztext.max` / `te.max` | Zeichenzahl | 1 Zeile | – | 65 / 53 | – |
| `text.zeichensatz` | frei, eingeschränkt | frei | frei | eingeschränkt | – |
| `text.bilder` / `text.tabellen` | ja/nein | nein / ja | nein / nein | nein / nein | – |
| `kg.pflicht` / `kg.katalog` / `kg.ebene` | DIN 276 2008/2018, eigener Katalog | ja / 2008 o. 2018 / 3 | (Kosten 2018 + KKE) | ja / projektbezogen | ja / FMG-Katalog / 5-stellig |
| `stlb.mindestanteil` | % | „grundsätzlich“ (Warnung je Freitext) | 100 % Hochbau (Warnung) | 50 % | – |
| `einheiten.liste` | STLB, eigene Liste | STLB | VI.6-Liste | BLB-Tabelle | – |
| `ep.anteile` / `ep.aufgliederung` | Namen / an-aus | Löhne, Stoffe, Geräte, Sonstiges / aus | aus | aus | – |
| `dateiname.schablone` | Muster | `{vergabenr}-AB-{jjmmtt}-X32.x82` | – | `{projektnr}_{bezeichnung}_{version}.x82`, ASCII | – |
| `druck.varianten` | Lang-LV, Kurz-LV mit Bieterangabenverzeichnis, PDF/A | (SBN druckt selbst) | PDF/A | PDF A4 mit Seitenzahl | – |
| `anonymisierung` | Büroname, Logo, Metadaten prüfen | ja | ja | ja | – |
| `aufmass.format` / `reb.ausgabe` | X31, DA11 / 1979, 2009 | X31 / 2009 | DA11 optional | – | DA11 / – |
| `lose.datei_je_los` | ja/nein | – | ja | – | Los-Ebene |
| `sonderelemente` | Summenzeile mit Präfix, Mengensplit je Ort | – | WBVB-Blöcke | – | „FMG-Sz“, Ort-Mengensplit |
| `kosten.bericht` | DIN 276, Vergabeeinheit, KKE B0–B4 | – | KKE-Prognose | Kalkulationspreise | – |

Dazu gehört ein **Prüfbericht vor dem Export** (Fehler/Warnungen je Regel, wie „LV-Prüfen“ beim SBN) und die Möglichkeit, Profile
mit **Gültigkeitszeitraum** zu versionieren (SBN 2024-01 → später 3.3).

## Relevanz für unser Projekt

### Muss (öffentlicher Modus, erste Ausbaustufe)

1. **GAEB DA XML 3.2 und 3.3 schreiben** (X81, X82, X83) und **lesen** (X84–X86), Version je Profil wählbar; X31 lesen/schreiben.
   Begründung: SBN verlangt 3.2, Bayern 3.3 [1][13].
2. **Profil-Engine mit Prüfung vor dem Export** (Positionsarten, OZ, Kurztexte, Zeichensatz, KG-Pflicht, Einheiten, TE-Struktur,
   Anonymität, Kopfdaten) plus XSD-Validierung; Ergebnis als lesbarer Prüfbericht [1][11][19].
3. **DIN-276-KG je Position** mit Katalogwahl (2008/2018) und Ebenenprüfung; KG an Gesamtposition bei Mengensplit [1][19].
4. **Positionsarten sperrbar** (Bedarf, Wahl, Grund, Zuschlag, Preisanfrage, freie Menge) und Begründungsfeld je Bedarfsposition [7][19].
5. **OZ-Profile mit Neunummerierung** (Schrittweite 1 oder 10, führende Nullen, Index-Regeln) [1][11][19].
6. **Textergänzungen als Datenobjekte** (Einleitung, Lücke, Folgetext) statt Freitext; Bieterangabenverzeichnis im Kurz-LV-Druck [1][11].
7. **Anonymisierung**: keine Planerdaten in LV, PDF-Metadaten und GAEB-Kopf [7][1][19].

### Soll

- **GAEB 90 schreiben** (D81/D82/D83) für BLB NRW und FMG; DA11 lesen/schreiben (9-stellige OZ) [19][6].
- **REB-Ausgaben 1979 und 2009** unterscheiden (Formblatt 451 vs. SBN) [7][1].
- **Kostenkontrolle nach Vergabeeinheiten/KKE** mit Prognosewerten (B0/B1) und Export nach Excel für das bayerische HaSta-Formular [15][16].
- **Vergabevorschlag** nach dem NLBL-Muster bzw. VHB-Logik (Wertungsübersicht, Eignung, Preisbeurteilung, Zuschlagsvorschlag) [5][7].
- **Dateinamen-Schablonen** und **PDF/A**-Ausgabe [1][13][19].
- **Selbst betreibbare Variante** (lokal oder im Büronetz) für VS-NfD- und Bundeswehr-Projekte [22][17].

### Kann

- Flughafen-Sonderfunktionen: Mengensplit je Ort im Gesamtmengen-LV, Summenzeilen mit Präfix, eigene 5-stellige KG-Kataloge [6].
- Formatvorgaben-Simulation (Arial 10 pt, Einzüge) für SBN-Vorschau [1].
- Vorbefüllte Profile für weitere Bauherren, sobald deren Vorgaben vorliegen.

### Differenzierungschancen (Einschätzung)

- Etablierte Programme lassen Planer Einstellungen selbst finden (das SBN-Pflichtenheft erklärt Elementnamen je Programm, auch
  für NOVA) [1]. **Ein mitgeliefertes, gepflegtes Profil „SBN 2024-01“, „BLB NRW 07-2025“, „VHF Bayern 09/2025“** mit
  Prüfbericht wäre ein klarer Vorteil – auch gegenüber NOVA.
- Offene, versionierte Profile im Repository könnten Planerbüros gemeinsam pflegen (Pull Requests bei neuen Fassungen).
- Selbstbetrieb deckt Projekte ab, die für reine SaaS-Lösungen schwierig sind (VS-NfD).

### Risiken

- **Vorgaben ändern sich ohne Ankündigung** (SBN „noch“ kein 3.3; Bayern 3.1 → 3.3; GAEB 3.4 in Beta). Profile brauchen
  Datumsangaben und Pflegeprozess.
- **Abnahme hängt an fremder Software:** Bauherren testen mit iTWO bzw. Architext Pallas; ohne Testmöglichkeit gegen diese
  Systeme bleiben Restrisiken. Der AVA-Test des SBN ist ein Praxistest für unsere Exporte (Einschätzung).
- **STLB-Bau-Pflicht** zieht Lizenzkosten und eine Integrationsfrage nach sich (siehe
  [STLB-Notiz](/okf/research/standards/stlb-bau-tender-texts.md)); ohne STLB-Anbindung ist der öffentliche Modus für Bayern,
  SBN und BLB nur eingeschränkt brauchbar.
- **Rechtliches:** Profile beschreiben fremde Regeln in eigenen Worten – unkritisch; die Dokumente selbst (Verwaltungsvorschriften,
  Vertragsmuster) nicht ins Repository kopieren, sondern verlinken (vgl. [Open-Source-Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md)).
- **IT-Sicherheit:** Ein gehosteter Dienst müsste für Bundesbau-Kunden den BSI-Mindeststandard für externe Cloud-Dienste
  nachweisen können [17].

### Grobe Aufwandsschätzung (Einschätzung, 1 erfahrene Person)

| Baustein | Aufwand |
|---|---|
| Profil-Engine (Datenformat, Versionierung, Auswahl je Projekt) | 1–2 Wochen |
| Prüfregeln (ca. 40 Regeln aus SBN/BLB/Bayern) + Prüfbericht | 2–3 Wochen |
| GAEB XML 3.2 zusätzlich zu 3.3 schreiben (bei vorhandener Bibliothek) | 1–2 Wochen |
| GAEB 90 (D81–D83) schreiben inkl. Zeichensatz/Zeilenformat | 2–4 Wochen |
| DA11/X31 inkl. REB-Ausgaben | 2–3 Wochen |
| Druckvarianten (Lang-/Kurz-LV, Bieterangabenverzeichnis, PDF/A) | 2–3 Wochen |
| KKE-Kostenprognose + Excel-Export | 1–2 Wochen |
| Vergabevorschlag-Ausgabe | 1 Woche |
| Erste Profile (SBN, BLB, Bayern) pflegen und testen | 1–2 Wochen + Tests mit echten Bauherren |

## Offene Fragen

**Recherche-Lücken**

- **SBN:** Warum 3.3 ausgeschlossen ist, steht nirgends; die Anlagen 1–6 (AVA-Test, Muster-LB) sind nicht öffentlich [1][3].
  Nachfrage bei der AVA-Leitstelle des NLBL wäre der direkte Weg.
- **FMG:** Gibt es eine neuere Richtlinie als 03.2010/04.2019, und verlangt der Flughafen inzwischen GAEB XML? [6]
- **Weitere Bauherren:** Für Baden-Württemberg, Hessen (LBIH; die GABau 2022 wurde nicht gelesen), Berlin (ABau Teil V,
  Neufassung 06/2026 laut Suchtreffer), Hamburg, Sachsen und für Hochschul-/Klinikbauabteilungen wurden keine öffentlich
  lesbaren AVA-Vorgaben gefunden.
- **Länder-Lizenzen für STLB-Bau an Planer:** nicht gefunden; das SBN stellt DBD-Baupreise nur in der eigenen Software bereit [1].
- **Stichprobe:** Die Versionsverteilung (3.2/3.3/GAEB 90) in echten Teilnahmebedingungen bleibt offen, weil die Unterlagen
  hinter Plattform-Sitzungen liegen (Abschnitt 8). Suchtreffer deuten auf X83-Dateien mit Namenszusatz „V33“ auf evergabe.nrw.de
  hin – nicht verifiziert.
- **VHB Bund:** Wird das VHB nach VgBG/VOB/A 2026 überarbeitet und dabei eine GAEB-Version festgelegt? Formblatt 451 und die
  „Toleranzregelung“ aus 244 sind inkonsistent [7].
- **BSI-Mindeststandard „Externe Cloud-Dienste“:** Inhalt (z. B. C5-Testat) wurde nicht gelesen; für ein Hosting-Angebot prüfen.
- **NOVA-Notiz:** Die Einschätzung zu „EU-Hauptsitz oder Selbstbetrieb“ sollte dort präzisiert werden (siehe 9.4).

**Fragen an den Architekten-Freund**

1. Für welche öffentlichen Bauherren arbeitest du (Bund über Landesbauverwaltung, Land, Kommune, Hochschule, öffentliches
   Unternehmen) und in welchen Bundesländern?
2. Welche Vorgaben hast du schriftlich bekommen (z. B. SBN-AVA-Pflichtenheft, BLB-AVA-Standard, VHF Bayern VI.6/VI.10,
   Datenaustauschbogen, städtische AVB, Planerhandbücher)? Kannst du sie (ohne Projektdaten) teilen?
3. Hast du einen AVA-Test oder Datenaustauschtest gemacht? Wie lief er mit NOVA, welche Fehler gab es?
4. Welche GAEB-Version und welche Phasen lieferst du je Bauherr (X81, X82, X83, GAEB 90)? Lädst du selbst auf Plattformen hoch?
5. Welche Formate kommen von Bietern zurück (X84 3.2/3.3, D84, P84, Excel, PDF, Papier)?
6. Wie berichtest du Kosten: DIN 276 (welche Fassung, welche Ebene), Vergabeeinheiten oder KKE-Formulare wie in Bayern?
7. Aufmaß: X31 oder DA11? Welche REB-Ausgabe?
8. Hattest du VS-NfD-Projekte, eine Selbstakkreditierung oder eine Informationssicherheits-Erklärung? Hat je ein Bauherr nach
   dem Hosting deiner AVA-Software gefragt oder Cloud-Software abgelehnt?
9. Nutzt du STLB-Bau, und wer zahlt die Lizenz?

## Quellen

[1] AVA-Pflichtenheft des SBN, Version 2024-01 (Dateistand 20.06.2024) – Niedersächsisches Landesamt für Bau und Liegenschaften, Leitstelle AVA – https://nlbl.niedersachsen.de/download/208208/AVA-Pflichtenheft_des_SBN_Version_2024-01.pdf – Art: Primärquelle (Verwaltungsvorgabe) – abgerufen 2026-11-09
[2] AVA-Pflichtenheft (Seite der AVA-Leitstelle) – NLBL – https://www.nlbl.niedersachsen.de/startseite/service/ava_leitstelle/ava_pflichtenheft/ava-pflichtenheft-201885.html – Art: Primärquelle – abgerufen 2026-11-09
[3] AVA-Test (Seite der AVA-Leitstelle) – NLBL – https://www.nlbl.niedersachsen.de/startseite/service/ava_leitstelle/ava_test/ava-test-201886.html – Art: Primärquelle – abgerufen 2026-11-09
[4] AVA-Software (Seite der AVA-Leitstelle) – NLBL – https://www.nlbl.niedersachsen.de/startseite/service/ava_leitstelle/ava_software/ava-software-201888.html – Art: Primärquelle – abgerufen 2026-11-09
[5] Vergabevorschlag von Freiberuflich Tätigen (DOCX-Muster) – NLBL – https://www.nlbl.niedersachsen.de/download/184614/Vergabevorschlag_von_Freiberuflich_Taetigen.docx – Art: Primärquelle (Muster) – abgerufen 2026-11-09
[6] Richtlinie zur LV-Erstellung für Bau-/Liefer- und Dienstleistungen (Text 03.2010, Anhänge 11.04.2019) – Flughafen München GmbH – https://Munich-Airport.De/_b/0000000000000007428832bb5d8b282c/richtlinie-zur-lv-erstellung.pdf – Art: Primärquelle (Unternehmensrichtlinie) – abgerufen 2026-11-09
[7] Vergabe- und Vertragshandbuch für die Baumaßnahmen des Bundes (VHB 2017, Lesefassung 2023): Formblätter 212, 244, 247, 451, Richtlinien 100, 111, 451, Anhang 10, Hinweise zu 521 – BMWSB / fib-bund.de – https://www.fib-bund.de/Inhalt/Vergabe/VHB/VHB_2017_Lesefassung_2023.pdf – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
[8] RBBau – Richtlinien für die Durchführung von Bauaufgaben des Bundes, Ausgabe 15. Juli 2026 (Onlinefassung) – BMWSB / fib-bund.de – https://www.fib-bund.de/Inhalt/Richtlinien/RBBau/RBBau_Onlinefassung_Stand_15.07.2026.pdf – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
[9] BIM für Bundesbauten, BIM-Handbuch – Arbeitshilfe Datenaustausch (07/2023) – BMWSB/BBR, fib-bund.de – https://www.fib-bund.de/Inhalt/Themen/BIM_fuer_Bundesbauten/2023-07_BIM_AH_Datenaustausch.pdf – Art: Primärquelle (Arbeitshilfe) – abgerufen 2026-11-09
[10] Vergabe freiberuflicher Dienstleistungen – VHF Bayern (Übersicht aller Anlagen, Handbuch Stand Juli 2026) – Bayerisches Staatsministerium für Wohnen, Bau und Verkehr – https://www.stmb.bayern.de/buw/bauthemen/vergabeundvertragswesen/freiberuflichedienstleistungen/index.php – Art: Primärquelle – abgerufen 2026-11-09
[11] VHF Bayern VI.6 – ZVB DV-Anwendungen (Ausschreibungsunterlagen, GAEB XML, vergabe.bayern.de), Stand 06/2018, red. 10/2018 – StMB – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-6_zvb-dvanwendung1018a_bearb.pdf – Art: Primärquelle (Vertragsanlage) – abgerufen 2026-11-09
[12] VHF Bayern VI.10 – ZVB Datenverarbeitung, Stand 02/2020 – StMB – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-10_zvb_datenverarbeitungung_0220a_bearb.pdf – Art: Primärquelle (Vertragsanlage) – abgerufen 2026-11-09
[13] VHF Bayern VI.4.1 – Datenaustauschbogen (XLSX), Stand 09/2025 – StMB – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-4-1_datenaustauschbogen_0925.xlsx – Art: Primärquelle (Formular) – abgerufen 2026-11-09
[14] VHF Bayern VI.4.H – ZVB CAD-Pflichtenheft 2D-Planunterlagen, Stand 07/2026 – StMB – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-4-h_zvb-pflichtenheft_0726_bearb.pdf – Art: Primärquelle (Vertragsanlage) – abgerufen 2026-11-09
[15] VHF Bayern VI.16 – ZVB Kostenkontrollinstrument („Kostenprognose FBT Hochbau“), Stand 05/2025 – StMB – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-16-zvb_kostenkontrollinstrument_0525_bearb.pdf – Art: Primärquelle (Vertragsanlage) – abgerufen 2026-11-09
[16] VHF Bayern VII.10 – Vertragsmuster Objektplanung Gebäude und Innenräume (Bund), Stand 02/2025 – StMB – https://www.mobilitaet.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vii-10_bund-vm_geb_0225.docx – Art: Primärquelle (Vertragsmuster) – abgerufen 2026-11-09
[17] VHF Bayern VI.23.0 – Richtlinie Informationssicherheit und Anlage Meldung Vorkommnis, Stand 05/2026 – StMB – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-23-0_richtlinie-info-sichh-anl-meldung-vorkommnis_0526.pdf – Art: Primärquelle (Vertragsanlage) – abgerufen 2026-11-09
[18] VHF Bayern VI.23 – Informationssicherheits-Umsetzungsbestätigung in Bauaufgaben, Stand 05/2026 – StMB – https://www.stmb.bayern.de/assets/stmi/buw/bauthemen/vergabeundvertragswesen/vhf/vi-23_informationssicherheits-umsetzungsbest%C3%A4tigung_0526a.docx – Art: Primärquelle (Formular) – abgerufen 2026-11-09
[19] Standard für Erzeugung und Austausch von AVA-Daten des BLB NRW, Stand 07-2025 (Datei „Version 05-2025“) – Bau- und Liegenschaftsbetrieb NRW – https://www.blb.nrw.de/fileadmin/Home/Service/Service_fuer_Auftragnehmer/Standards_Erlasse_Regelungen/AVA/ava-standard-fuer-erzeugung-austausch-und-archivierung.pdf – Art: Primärquelle (Verwaltungsvorgabe) – abgerufen 2026-11-09
[20] Muster-LV für den Datenaustausch (Muster-LV Externe), 28.08.2020 – BLB NRW – https://www.blb.nrw.de/fileadmin/Home/Service/Service_fuer_Auftragnehmer/Standards_Erlasse_Regelungen/AVA/muster-leistungsnachweis-fuer-den-datenaustasch.pdf – Art: Primärquelle (Muster) – abgerufen 2026-11-09
[21] Allgemeine Vertragsbestimmungen der Stadt Köln (AVB) für Verträge mit freiberuflich Tätigen, Stand März 2026 – Stadt Köln – https://www.stadt-koeln.de/mediaasset/content/pdf30/01_avb_03_2026.pdf – Art: Primärquelle (Vertragsbedingungen) – abgerufen 2026-11-09
[22] Merkblatt für die Behandlung von Verschlusssachen des Geheimhaltungsgrades VS-NUR FÜR DEN DIENSTGEBRAUCH (VS-NfD-Merkblatt, Anlage 4 GHB), Merkblatt-Stand 01.09.2023, Ausgabe BAAINBw-B 096a/08.2026 – BAAINBw / Bundeswehr – https://www.bundeswehr.de/resource/blob/133024/ac7c50b79fe4054f4abe76077efedb30/b096a-data.pdf – Art: Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
[23] Erlasse (Übersicht STLB-Bau/STLB-BauZ) – GAEB – https://www.gaeb.de/de/service/erlasse/ – Art: Primärquelle – abgerufen 2026-11-09
[24] Herunterladen von Vergabeunterlagen in elektronischer Form – vergabe.bayern.de – https://www.vergabe.bayern.de/informationen/download_von_vergabeunterlagen/index.html – Art: Primärquelle (Plattforminformation) – abgerufen 2026-11-09
[25] Was ist GAEB (Hilfe der RIB-eVergabe-Plattform V5.7) – RIB/arriba-net – https://download.arriba-net.de/fileadmin/downloaddaten/my.vergabe.bayern.de/hilfe/was-ist-ageb.html – Art: Herstellerangabe – abgerufen 2026-11-09
[26] eForms-Bekanntmachung „Neubau Gesamtschule Altenessen-Süd – Tischlerarbeiten“, übermittelt 08.04.2026 – Stadt Essen, über Datenservice Öffentlicher Einkauf – https://oeffentlichevergabe.de/api/notices/eb65f6e6-d127-4f0c-85a6-4f127fc7c14e?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[27] eForms-Bekanntmachung „BVG Betriebshofverbund Süd-Ost – Tiefbauarbeiten“, übermittelt 28.04.2026 – Berliner Verkehrsbetriebe – https://oeffentlichevergabe.de/api/notices/0ad15e86-2887-4450-b725-3ed5c1464082?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[28] eForms-Bekanntmachung „Sanierung Kita Tabaluga – Bauendreinigung“, übermittelt 08.04.2026 – Stadt Halle (Saale) – https://oeffentlichevergabe.de/api/notices/0af38a2f-a372-4c2c-bffc-80a47e874422?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[29] eForms-Bekanntmachung „Friedrich-von-Bodelschwingh-Schule, Brandschutzsanierung – Lüftung“, übermittelt 27.03.2026 – Landeshauptstadt Wiesbaden, Hochbauamt – https://oeffentlichevergabe.de/api/notices/e998b720-5a5c-4c11-a2ff-13ae595973c0?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[30] eForms-Bekanntmachung „Architektur- und Ingenieurleistungen: Umbaumaßnahmen an zwei Schulstandorten“, übermittelt 05.05.2026 – Stadt Wermelskirchen – https://oeffentlichevergabe.de/api/notices/da8f34b3-52c6-41b1-844c-846ac72103d8?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[31] eForms-Bekanntmachung „OBP Kassel Paket 3/3 Kassel Rbf“, übermittelt 15.04.2026 – DB InfraGO AG – https://oeffentlichevergabe.de/api/notices/0e3c0314-ec00-4885-b418-336c33bed3b5?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[32] eForms-Bekanntmachung „messe- kongress- kulturforum saarbrücken – baulogistik“, übermittelt 14.04.2026 – Congress-Centrum Saar GmbH – https://oeffentlichevergabe.de/api/notices/5b826960-8120-4ba0-9146-8831d9f578bd?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[33] eForms-Bekanntmachung „PFA 1.1 – Bonatzbau“, übermittelt 24.04.2026 – Beschaffer laut Bekanntmachung „FE.EI-SW“ – https://oeffentlichevergabe.de/api/notices/a01749f9-5aed-4357-a047-a15638fdec66?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
[34] eForms-Bekanntmachung „LAKUMED Krankenhaus Landshut-Achdorf – Umbau und Teilerweiterung BA 8“, übermittelt 22.04.2026 – LAKUMED Kliniken Landshut – https://oeffentlichevergabe.de/api/notices/f3127522-56cd-4fec-ad21-edc09309a9cc?format=pdf – Art: Primärquelle (Bekanntmachung) – abgerufen 2026-11-09
