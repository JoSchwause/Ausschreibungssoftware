---
type: Research Note
title: Vergaberecht und E-Vergabe bei öffentlichen Auftraggebern
description: Was sich für Ausschreibung, Wertung, Vergabe, Dokumentation, E-Vergabe und E-Rechnung ändert, wenn der Bauherr öffentlich ist (Stand 9.11.2026) – Grundlage für Muss-Anforderungen und für die Abgrenzung öffentlich/privat in unserer AVA.
resource: https://www.recht.bund.de/bgbl/1/2026/137/VO.html
tags: [research, vergaberecht, e-vergabe, vob-a, wertgrenzen, vhb-bund, e-rechnung]
timestamp: 2026-11-09T17:16:17Z
sources: 69
confidence: mittel
---

# Vergaberecht und E-Vergabe bei öffentlichen Auftraggebern

> **Lesehinweis.** Stand der Recherche: 9.11.2026. Diese Notiz ist keine Rechtsberatung. Bund/EU-Teile stützen sich überwiegend
> auf Primärquellen (Bundesgesetzblatt, Bundesanzeiger, Normtexte) – Vertrauen hoch. Die Länder-Wertgrenzen ändern sich laufend
> und sind teils nur über Sekundärquellen belegt – Vertrauen mittel. Abkürzungen: **AG** = Auftraggeber (der Bauherr),
> **AN** = Auftragnehmer, **KT** = Kalendertage, **TW** = Teilnahmewettbewerb, **L/DL** = Liefer- und Dienstleistungen,
> **LV** = Leistungsverzeichnis.

## Kurzfassung

- **Zwei Rechtswelten, getrennt durch den EU-Schwellenwert.** Ab 5.404.000 € netto (Bauaufträge, gültig 2026/2027) gilt
  EU-Vergaberecht (GWB Teil 4, VgV, VOB/A Abschnitt 2 „EU“), darunter nationales Haushalts- und Landesrecht mit VOB/A
  Abschnitt 1 (Bau) bzw. UVgO (Liefer-/Dienstleistungen) [10][13][18][19]. Maßgeblich ist der Gesamtwert aller Lose [63].
- **2026 ist ein Reformjahr.** Das Vergabebeschleunigungsgesetz (VgBG) gilt seit 1.7.2026 (Eigenerklärungen als Regel,
  Angebotsprüfung vor Eignungsprüfung im offenen Verfahren, neuer Losgrundsatz § 97a GWB, schnellere Nachprüfung,
  Direktauftrag des Bundes bis 50.000 €) [1]. Die VOB/A EU „Ausgabe 2026“ (nur Abschnitte 2 und 3) ist seit 8.9.2026 verbindlich [4][5].
  Abschnitt 1 (national) gilt weiter in der Ausgabe 2019; geändert wurde seitdem nur § 3a, zuletzt mit neuen Wertgrenzen zum
  1.1.2026 [8][64][65]. Eine neue UVgO ist im Entwurf, Umsetzung in den Ländern bis 30.6.2027 geplant [32][33].
- **Wertgrenzen sind ein Flickenteppich.** Der Direktauftrag für Bauleistungen reicht von 20.000 € (Niedersachsen) über
  50.000 € (Bund) bis 750.000 € (Hessen); NRW-Kommunen haben seit 1.1.2026 gar keine landesrechtlichen Wertgrenzen mehr,
  Hessen erlaubt oberhalb des Direktauftrags freie Verfahrenswahl [8][25][26][29]. Software braucht dafür eine datierte,
  quellenbelegte Regeldatenbank statt fest verdrahteter Zahlen.
- **Kernregeln der Wertung:** keine Nachverhandlung in Ausschreibungen und offenen Verfahren (§ 15 VOB/A), Wertung in vier
  Stufen, bei Rechenfehlern gilt der Einheitspreis, unangemessen niedrige Preise müssen aufgeklärt werden (VHB Bund: Zweifel
  grundsätzlich ab 10 % Abweichung), alles ist in Textform zu dokumentieren [5][18][35].
- **Rollenteilung:** Der Architekt bereitet vor und wirkt mit (HOAI Leistungsphasen 6 und 7: LV, Vergabeunterlagen,
  Preisspiegel, Vergabevorschlag, Dokumentation) [38]; Entscheidungen und Außenkommunikation (Bekanntmachung, Öffnung,
  Ausschluss, Zuschlag, Bieterinformation) liegen bei der Vergabestelle des AG [14][18][35].
- **Formblätter:** Das Vergabehandbuch des Bundes (VHB Bund 2017, Lesefassung 2023) liefert nummerierte Standardformulare
  (111 Wahl der Vergabeart … 213 Angebotsschreiben … 321 Wertungsübersicht … 351 Aufhebung); inhaltsgleiche, elektronisch
  erzeugte Formulare sind ausdrücklich erlaubt [35][36]. Einschätzung: als amtliche Werke (§ 5 UrhG) nachbaubar, aber ohne
  inhaltliche Änderung und mit Quellenangabe [39].
- **E-Vergabe** ist oberhalb der Schwellen seit 18.10.2018 Pflicht [45], unterhalb für Liefer-/Dienstleistungen nach UVgO seit
  2020 (mit Ausnahmen) [19]; bei nationalen Bauvergaben kann der AG noch Papier zulassen [18]. Die Plattformlandschaft ist
  zersplittert (Bund, Länder, cosinex, Administration Intelligence, RIB, subreport) [47]–[53]. Der Schnittstellenstandard
  XVergabe wurde 2022 zugunsten von eForms aufgegeben [42] – praktisch läuft der Austausch AVA ↔ Plattform über GAEB-Dateien.
  Direkte Kopplungen gibt es nur herstellerspezifisch, z. B. CaliforniaX-Modul EVC zum AI-Vergabemanager und RIB iTWO mit der
  eigenen Plattform iTWO e-Vergabe [66][67][68].
- **Bekanntmachungen** laufen EU-weit seit 25.10.2023 im Datenformat eForms über den „Datenservice Öffentlicher Einkauf“
  des Beschaffungsamts des BMI (Spezifikation eForms-DE 2.2.0) [1][17][41].
- **E-Rechnung:** Pflicht gegenüber dem Bund seit 27.11.2020 (XRechnung, Leitweg-ID) [59]; im B2B-Bereich Empfangspflicht seit
  1.1.2025, Ausstellungspflicht stufenweise bis 1.1.2028 [58][61]. Für die Rechnungsprüfung in der AVA heißt das: XRechnung
  (3.0, ab 2027 4.0) und ZUGFeRD (2.5.2) lesen können [57][62].
- **Folgerung fürs Projekt:** Muss-Funktionen für öffentliche Vergaben sind ein VOB/A-konformer Preisspiegel mit Wertung,
  Fristen- und Wertgrenzen-Logik, revisionsfeste Dokumentation, VHB-Formulare und saubere GAEB-Pakete für fremde
  Vergabeplattformen. Eine eigene E-Vergabe-Plattform ist kein MVP-Thema.

## 1. Wann ist ein Bauherr „öffentlich“?

**Öffentlicher Auftraggeber** (§ 99 GWB) sind nicht nur Bund, Länder und Gemeinden (Nr. 1), sondern auch Einrichtungen, die
im Allgemeininteresse nichtgewerbliche Aufgaben erfüllen und überwiegend vom Staat finanziert, beaufsichtigt oder besetzt
werden (Nr. 2), deren Verbände (Nr. 3) – und **private Bauherren**, wenn ein Tiefbau-, Krankenhaus-, Sport-/Freizeit-,
Schul-, Hochschul- oder Verwaltungsbauprojekt zu mehr als 50 % öffentlich gefördert wird (Nr. 4) [12]. Unterhalb der
EU-Schwellen verpflichten zudem viele **Zuwendungsbescheide** (Fördermittelbescheide) zur Anwendung von VOB/A oder UVgO; ob die
landesrechtlich erhöhten Wertgrenzen dann gelten, ist ungeklärt und sollte mit der Förderstelle abgestimmt werden [24].

**Privater Auftraggeber** ohne solche Bindungen: kein Vergaberecht. Er darf frei verhandeln, beliebig viele Bieter direkt
anschreiben und ohne Formvorschriften beauftragen. Die VOB/B wird oft trotzdem als Vertragsgrundlage vereinbart (siehe
[HOAI, VOB/B, VOB/C](/okf/research/standards/hoai-vob-b-c.md)).

Einschätzung: Für unser Produkt ist „öffentlich/privat“ also ein **Projektattribut mit Folgen** (Verfahrenslogik, Fristen,
Formulare, Dokumentationspflicht) – nicht nur ein Etikett. Auch ein privat wirkender Bauherr kann über § 99 Nr. 4 GWB oder
Fördermittel vergaberechtlich gebunden sein.

## 2. Rechtsrahmen (Stand 9.11.2026)

### 2.1 Zwei Welten: Oberschwellen- und Unterschwellenbereich

| Bereich | Bauleistungen | Liefer-/Dienstleistungen (inkl. Planungsleistungen) |
|---|---|---|
| **Oberschwellenbereich** (ab EU-Schwellenwert) | GWB Teil 4 (§§ 97 ff.) → VgV (§ 2 verweist statisch auf die VOB/A EU) → **VOB/A Abschnitt 2, Ausgabe 2026** [4][5] | GWB Teil 4 → VgV; Planungsleistungen als Los eines Bauauftrags fallen seit 1.7.2026 ausdrücklich unter die VgV [1] |
| Sonderbereiche | Sektoren (SektVO), Konzessionen (KonzVgV), Verteidigung (VSVgV / VOB/A Abschnitt 3) [1][5] | dto. |
| **Unterschwellenbereich** | Haushaltsrecht (§ 30 HGrG, § 55 BHO/LHO, Gemeindehaushaltsrecht) + Landesvergabegesetz/-erlass → **VOB/A Abschnitt 1, Ausgabe 2019** mit § 3a in der Fassung vom 1.1.2026 [1][8][18] | Haushaltsrecht + Landesrecht → **UVgO 2017**; freiberufliche Leistungen nur nach den Grundsätzen des § 50 UVgO [19] |
| Rechtsschutz | Vergabekammer → Oberlandesgericht (§§ 155 ff. GWB) | unterhalb der Schwellen kein GWB-Nachprüfungsverfahren [29] |

Wichtig für Entwickler: **VOB/A und UVgO sind keine Gesetze**, sondern Verfahrensordnungen. Verbindlich werden sie erst durch
einen „Anwendungsbefehl“ – oberhalb der Schwellen durch § 2 VgV, unterhalb durch Haushaltsvorschriften von Bund, Ländern und
Kommunen [9][19][24]. Deshalb kann ein Land eine ältere VOB/A-Fassung weiter anwenden oder einzelne Paragrafen abbedingen
(Beispiel Hessen: VOB/A 2019 „in der im Land Hessen geltenden Fassung“) [26]. Die VOB/A selbst wird im Auftrag des Deutschen
Vergabe- und Vertragsausschusses (DVA) vom DIN als DIN 1960 herausgegeben [5].

### 2.2 Zeitleiste der Reformen 2025–2028

| Datum | Änderung | Kern | Quelle |
|---|---|---|---|
| 2.4.2025 | § 3a VOB/A Abschnitt 1 befristet geändert (Bekanntmachung vom 11.3.2025, BAnz AT 02.04.2025 B7) | Fußnoten in § 3a: Freihändige Vergabe bis 25.000 €, Direktauftrag bis 15.000 €, jeweils befristet bis 31.12.2025; die Wohnungsbau-Fußnote entfällt. Übrige Paragrafen der Ausgabe 2019 unverändert | [65] |
| 6.8.2025 | Regierungsentwurf Vergabebeschleunigungsgesetz | Nachfolger des in der Vorlegislatur nicht verabschiedeten „Vergaberechtstransformationspakets“ (Einschätzung, Vorgeschichte nicht erneut geprüft) | [3] |
| 1.1.2026 | Neue EU-Schwellenwerte 2026/2027 | Delegierte VO (EU) 2025/2150–2152 und 2025/2487; Bau 5.404.000 € | [10] |
| 1.1.2026 | § 3a VOB/A Abschnitt 1 neu (BAnz AT 16.12.2025 B7) | Beschränkte Ausschreibung ohne TW 150.000 €, Freihändige Vergabe 100.000 €, Direktauftrag 50.000 €; Staffel nach Gewerken entfällt. Die Bekanntmachung ändert nur § 3a; Abschnitt 1 bleibt im Übrigen Ausgabe 2019 (BAnz AT 19.02.2019 B2) | [8][64] |
| 1.1.2026 | NRW: § 75a GO NRW, § 26 KomHVO aufgehoben | Kommunen nicht mehr an VOB/A Abschn. 1 / UVgO gebunden | [29] |
| 1.5.2026 | Bundestariftreuegesetz (BGBl. 2026 I Nr. 119) | Bundesaufträge Bau/Dienstleistung ab 50.000 €: Tariftreueversprechen | [20] |
| 23.4. / 8.5. / 18.5.2026 | VgBG: Bundestag / Bundesrat / Verkündung (BGBl. 2026 I Nr. 137) | Artikelgesetz, ändert GWB, VgV, SektVO, KonzVgV, VSVgV, BHO, HGrG u. a. | [1][2] |
| 30.6.2026 | Hessen: neuer Vergabeerlass (gültig bis 31.12.2033), HVTG-Novelle | Direktauftrag Bau 750.000 €, freie Verfahrenswahl darüber | [26] |
| **1.7.2026** | **VgBG in Kraft** | siehe 2.3; Altverfahren laufen nach altem Recht (§ 187 Abs. 2 GWB) | [1][3] |
| **8.9.2026** | **VOB/A Abschnitt 2 und 3, Ausgabe 2026, verbindlich** (Bekanntmachung BAnz AT 24.08.2026 B6; Verweisänderung BGBl. 2026 I Nr. 250) | VgBG-Inhalte für Bauvergaben, Energieeffizienz (§ 8c EU), Barrierefreiheit (§ 7a EU) | [4][5][6][7] |
| 9.9.2026 | EU-Kommission: Vorschlag „Public Procurement Act“, COM(2026) 590 | Verordnung statt Richtlinien; Anwendung frühestens zwei Jahre nach Inkrafttreten | [34] |
| Sept. 2026 | Berlin: geänderte Ausführungsvorschriften zu § 55 LHO | Direktauftrag Bau 500.000 € | [27][28] |
| 1.10.2026 | NRW-Landesbehörden: Verhandlungsvergabe/Freihändige Vergabe mit TW bis EU-Schwelle | vorläufige Verwaltungsvorschrift | [29] |
| 1.1.2027 | NRW: Tarifentgeltsicherungsgesetz ersetzt TVgG NRW | Kommunen von den Branchenmindestlöhnen ausgenommen | [29] |
| bis 30.6.2027 | Neue UVgO in den Ländern umsetzen (Entwurf; Kommentierungsfrist endete 28.8.2026) | Grundlage: „Föderale Modernisierungsagenda“ vom 4.12.2025 | [32][33] |
| 1.10.2027 | Befristung der erhöhten Wertgrenzen in Baden-Württemberg endet | Land wird bis Ende 2026 evaluiert | [23] |
| 31.12.2027 | Zielmarke Rollout „Marktplatz Deutschland“ | zentrales Vergabeportal von Bund/Ländern | [33] |
| 1.1.2027 / 1.1.2028 | E-Rechnung: Ende der Übergangsfristen im B2B-Bereich | siehe Abschnitt 9 | [61] |

### 2.3 Das Vergabebeschleunigungsgesetz im Detail (seit 1.7.2026)

| Thema | Neuregelung | Fundstelle |
|---|---|---|
| Losgrundsatz | § 97 Abs. 4 GWB: Mittelstandsinteressen „vornehmlich“ berücksichtigen. Neuer § 97a: Teil- und Fachlose (siehe 5.1) sind die Regel; Gesamtvergabe nur, wenn wirtschaftliche oder technische Gründe es *erfordern*; neu zusätzlich aus zeitlichen Gründen, aber nur bei Infrastrukturvorhaben ab dem Doppelten des Schwellenwerts, die aus dem Sondervermögen Infrastruktur und Klimaneutralität finanziert werden oder Verkehrsinfrastruktur sind; Bericht an den Bundestag bis 30.9.2027 | [1] |
| Eignungsnachweise | § 122 Abs. 3 GWB: Eignung soll per Eigenerklärung belegt werden; weitere Unterlagen nur von aussichtsreichen Bietern, angefordert erst nach vorläufiger Prüfung (§ 48 VgV) | [1] |
| Prüfungsreihenfolge | § 42 Abs. 4 VgV: im offenen Verfahren Angebotsprüfung vor Eignungsprüfung; Abweichung ohne Begründung möglich | [1] |
| Leistungsbeschreibung | Pflicht zur „erschöpfenden“ Beschreibung gestrichen (§ 121 GWB, § 29 VgV) | [1] |
| Nebenangebote | Bekanntmachung muss angeben, ob zugelassen, vorgeschrieben oder ausgeschlossen; keine Begründung nötig (§ 35 VgV) | [1] |
| Angebotsöffnung | Vier-Augen-Prinzip entfällt bei elektronischen Angeboten, wenn technisch gesichert (§ 55 Abs. 2 VgV) | [1] |
| Unangemessen niedrige Angebote | § 60 Abs. 3 VgV: nicht aufklärbare Niedrigpreise „soll“ (statt „darf“) der AG ablehnen | [1] |
| Zahlung | § 29 Abs. 3 VgV: Zahlung i. d. R. binnen 30 Tagen nach prüfbarer Rechnung; Abschlags-/Vorauszahlungen sollen vereinbart werden | [1] |
| Architektenleistungen | § 75 Abs. 4 VgV: Eignungskriterien müssen kleinere Büros und Berufsanfänger angemessen berücksichtigen | [1] |
| Rechtsschutz | Rüge-Antragsfrist 15 KT nach Nichtabhilfe; Vergabekammer entscheidet in 5 Wochen; keine aufschiebende Wirkung der sofortigen Beschwerde, wenn die Kammer den Antrag abgelehnt hat; elektronische Akten, Videoverhandlung | [1] |
| Schwellenwert | § 106 Abs. 2 Nr. 1 GWB: der niedrigere L/DL-Schwellenwert gilt nur noch für Bundeskanzleramt und Bundesministerien | [1][13] |
| Haushaltsrecht | § 30 HGrG / § 55 Abs. 1 BHO: als Regelverfahren zählen neben Öffentlicher und Beschränkter Ausschreibung mit TW nun auch Verhandlungsvergabe/Freihändige Vergabe mit TW oder Bekanntmachung; § 55 Abs. 2 BHO: Direktauftrag des Bundes bis 50.000 € | [1] |
| Statistik, Register | Vergabestatistik unterschwellig erst ab 50.000 €; Pflichtabfrage Wettbewerbsregister ab 50.000 € | [1] |
| Datenservice | § 114 Abs. 3 GWB: Datenservice Öffentlicher Einkauf ist beim Beschaffungsamt des BMI eingerichtet | [1] |

## 3. Schwellenwerte und Wertgrenzen

### 3.1 EU-Schwellenwerte 2026/2027 (netto, gültig 1.1.2026–31.12.2027)

| Auftragsart | Schwellenwert | Hinweis |
|---|---|---|
| Bauaufträge (klassische AG, Sektoren, Verteidigung) und Konzessionen | **5.404.000 €** | 2024/25: 5.538.000 € |
| L/DL klassische öffentliche AG (z. B. Kommunen, Länder) | **216.000 €** | betrifft auch Architektenleistungen |
| L/DL oberste/obere Bundesbehörden | 140.000 € | seit 1.7.2026 nur noch Bundeskanzleramt und Bundesministerien [1][13] |
| L/DL Sektoren sowie Verteidigung/Sicherheit | 432.000 € | |

Quellen: BMWSB-Schreiben vom 16.12.2025 [10]; Werte für soziale und besondere Dienstleistungen (750.000 €) laut [24]. Die Werte
werden alle zwei Jahre aus den Sonderziehungsrechten des WTO-Beschaffungsabkommens umgerechnet und sanken daher
wechselkursbedingt [24]. **Schätzung:** maßgeblich ist der voraussichtliche Gesamtwert ohne Umsatzsteuer; bei Losen zählt der
Wert aller Lose zusammen. Einzelne Baulose unter 1 Mio. € dürfen bis zu 20 % des Gesamtwerts ausgenommen werden
(„80/20-Kontingent“, § 3 Abs. 9 VgV) [63] – diese Lose unterliegen dann nur nationalem Recht [24].

### 3.2 Nationale Wertgrenzen: Bund und sieben Länder

Erklärung der Verfahren: **Direktauftrag** = Beauftragung ohne Vergabeverfahren (nur Preisvergleich, Wirtschaftlichkeit,
Wechsel der Firmen). **Freihändige Vergabe** (Bau) bzw. **Verhandlungsvergabe** (L/DL) = Verfahren mit Verhandlungen,
oft ohne öffentliche Bekanntmachung. **Beschränkte Ausschreibung ohne TW** = der AG fordert ausgewählte Firmen (i. d. R. ≥ 3)
zur Angebotsabgabe auf, Verhandlungen verboten. Alle Werte netto, „bis“ = bis einschließlich.

| Gebiet / AG | Bau: Direktauftrag | Bau: Freihändige Vergabe | Bau: Beschr. Ausschr. ohne TW | L/DL: Direktauftrag | L/DL: Verhandlungsvergabe / Beschr. o. TW | Rechtsgrundlage, Stand | Quelle |
|---|---|---|---|---|---|---|---|
| **Bund** | 50.000 € | 100.000 € | 150.000 € | 50.000 € (seit 1.7.2026) | nicht verifiziert (laut ABSt ressortspezifisch) | § 3a VOB/A (seit 1.1.2026); § 55 Abs. 2 BHO | [1][8][31] |
| **Bayern** (Staat und Kommunen) | 250.000 € | 1.000.000 € | 1.000.000 € | 100.000 € (auch freiberufliche L.) | unterhalb EU-Schwelle (216.000 €) | Art. 20 BayWiVG; Werte je Gewerk; Stand 1.1.2026 | [21][22] |
| **NRW – Landesbehörden** | 100.000 € laut VV zu § 55 LHO NRW; das geht über § 3a Abs. 4 VOB/A (50.000 €) hinaus, ohne die Abweichung zu kennzeichnen (cosinex) | ohne TW 100.000 €; mit TW bis EU-Schwelle (ab 1.10.2026) | 1.250.000 € (ABSt: 750.000 € Einzel-/1.250.000 € Gesamtwert) | 50.000 € | ohne TW 100.000 €; Verhandlungsvergabe mit TW bis EU-Schwelle | VV zu § 55 LHO NRW, Stand 2.11.2026 | [29][31] |
| **NRW – Kommunen** | keine landesrechtlichen Wertgrenzen; eigene Satzung (Mustersatzung der Spitzenverbände) | – | – | – | – | § 75a GO NRW seit 1.1.2026 | [29] |
| **Baden-Württemberg – Land** | 50.000 € | 100.000 € | 150.000 € | 100.000 € | bis 216.000 € | VOB/A-Werte (Bau); VwV Beschaffung (L/DL), befristet bis 1.10.2027 | [23][24] |
| **Baden-Württemberg – Kommunen** | 100.000 € | 216.000 € | 1.000.000 € | 100.000 € | bis 216.000 € | VergabeVwV, befristet bis 1.10.2027 | [23][24] |
| **Niedersachsen** | 20.000 € | 150.000 € | 1.000.000 € | 20.000 € (Schulen 100.000 €) | 100.000 € | NWertVO, Stand 28.5.2025 | [25] |
| **Hessen** (Land und Kommunen) | 750.000 € | darüber freie Verfahrenswahl (Begründung, wenn kein Regelverfahren) | wie links | 100.000 € | darüber freie Wahl | HVTG + Vergabeerlass, gültig 30.6.2026–31.12.2033 | [26] |
| **Berlin** | 500.000 € | Hochbau 1.000.000 €; sonstige 50.000 € | Hochbau 1.000.000 €; sonstige 500.000 € | 75.000 € (Digitalisierung/Innovation 180.000 € bis 31.12.2028) | 200.000 € (mit/ohne TW) | AV zu § 55 LHO, geändert 09/2026, Evaluation bis Anfang 2029 | [27][28] |
| **Sachsen** | 50.000 € | **strittig:** 25.000 € (§ 4 Abs. 1 S. 2 SächsVergabeG) vs. 100.000 € (VOB/A) | 150.000 € | nicht verifiziert (laut ABSt noch VOL/A, Freihändige bis 25.000 €) | nicht verifiziert | SächsVergabeG + VOB/A, Stand Jan. 2026 | [30][31] |

Weitere Länder (Brandenburg, Hamburg, Mecklenburg-Vorpommern, Schleswig-Holstein, Thüringen u. a.) listen die
Auftragsberatungsstellen; dort reichen Bau-Direktaufträge bis 150.000 € und Freihändige Vergaben bis 1 Mio. € [31].

### 3.3 Fallstricke bei Wertgrenzen

1. **Bezugsgröße:** oft je Gewerk bzw. Fachlos (Bayern, Hessen) [22][26]; Aufteilen zur Umgehung ist verboten [21].
2. **Land ≠ Kommune:** In Baden-Württemberg und NRW gelten für Landesbehörden und Kommunen unterschiedliche Regeln [23][29].
3. **Statische Verweise:** Ein Land kann die VOB/A in einer festen Fassung anwenden (Hessen: VOB/A 2019) [26]; die Niedersächsische
   Wertgrenzenverordnung weicht ausdrücklich von § 3a VOB/A ab [25]. Neue Bundes-Werte gelten dann nicht automatisch.
4. **Befristungen:** Baden-Württemberg bis 1.10.2027 [23], Berliner Innovationsgrenze bis 31.12.2028 [27], Hessen bis 31.12.2033 [26].
5. **Transparenzpflichten bleiben:** Auch bei Direktaufträgen gelten Dokumentation, Vier-Augen-Prinzip (Hessen), Vergleichspreise ab
   20.000 € (Hessen) und das EU-Primärrecht bei Binnenmarktrelevanz [26].
6. **Volatilität:** Die Auftragsberatungsstellen weisen ausdrücklich darauf hin, dass sich die Werte häufig ändern [31].

## 4. Verfahrensarten, Ablauf und Fristen

### 4.1 Verfahrensarten

| Regelwerk | Frei wählbare Regelverfahren | Nur unter Voraussetzungen / Wertgrenzen | Ohne Verfahren |
|---|---|---|---|
| VOB/A Abschnitt 1 (Bau, national) | **Öffentliche Ausschreibung** (jedes Unternehmen darf anbieten), **Beschränkte Ausschreibung mit TW** (öffentlicher Aufruf, Auswahl von mind. 5 Bewerbern) | Beschränkte Ausschreibung ohne TW (i. d. R. mind. 3 Firmen, Bieterkreis wechseln), Freihändige Vergabe | Direktauftrag |
| UVgO (L/DL, national) | Öffentliche Ausschreibung, Beschränkte Ausschreibung mit TW | Beschränkte Ausschreibung ohne TW, Verhandlungsvergabe mit/ohne TW | Direktauftrag (§ 14: Grundwert 1.000 €; Bund/Länder höher) |
| VOB/A EU / VgV (oberhalb) | **Offenes Verfahren**, **nicht offenes Verfahren** (mit TW) | Verhandlungsverfahren mit/ohne TW, wettbewerblicher Dialog, Innovationspartnerschaft | – |

Quellen: [5][8][18][19]. Neu seit 1.7.2026 im Bundeshaushaltsrecht: Verhandlungsvergabe/Freihändige Vergabe mit TW oder
Bekanntmachung gelten ebenfalls als Regelverfahren [1]; die neue UVgO wird das voraussichtlich aufgreifen (Einschätzung).

### 4.2 Typischer Ablauf einer öffentlichen Bauvergabe – wer macht was?

Formblatt-Nummern nach VHB Bund [35][36]; Architektenleistungen nach HOAI Anlage 10 [38]. Ausführlicher Prozess (auch privat)
in [Der AVA-Prozess I](/okf/research/process/tendering-and-award.md).

1. **Auftragswert schätzen, Lose bilden** (Architekt: Kostenberechnung, bepreistes LV; AG entscheidet) → Ober- oder
   Unterschwelle, Fach-/Teillose, ggf. Begründung einer Gesamtvergabe im Vergabevermerk [1][5][63].
2. **Vergabeart wählen und dokumentieren** – Formblatt 111 „Wahl der Vergabeart“ (Vergabestelle; Architekt liefert
   Vergabeterminplan, LPH 6a) [36][38].
3. **Vergabeunterlagen zusammenstellen** – Anschreiben 211, Teilnahmebedingungen 212, Angebotsschreiben 213, Besondere
   Vertragsbedingungen 214, LV (meist als [GAEB-Datei](/okf/research/standards/gaeb-da-xml.md)), ergänzend 221–223 (Preisermittlung),
   226 (Mindestanforderungen Nebenangebote), 227 (Gewichtung Zuschlagskriterien), 124 (Eigenerklärung Eignung) [36]. Das LV und
   die Unterlagen erstellt der Architekt (LPH 6b–f) [38].
4. **Bekanntmachen** – EU: eForms über den Datenservice Öffentlicher Einkauf [5][17]; national: Internetportale, beim Bund
   service.bund.de, in Hessen zuerst in der Hessischen Ausschreibungsdatenbank (HAD) [18][26][35]. Zuständig: Vergabestelle.
5. **Unterlagen bereitstellen, Bieterfragen beantworten** – elektronisch, unentgeltlich, direkt abrufbar; Antworten an alle,
   EU spätestens 6 KT vor Fristende [5]. Fachliche Antworten formuliert meist der Architekt, versendet werden sie über die Plattform.
6. **Angebotsabgabe** durch die Bieter in Textform über die Vergabeplattform (Textform = lesbare Erklärung auf dauerhaftem
   Datenträger mit Namen des Erklärenden, ohne Unterschrift, § 126b BGB) [5][19].
7. **Öffnung** (Vergabestelle): national durch zwei Vertreter des AG mit Niederschrift (Formblatt 313); Eröffnungstermin mit
   Bietern nur noch, wenn Papierangebote zugelassen sind [18]; EU: Vier-Augen-Prinzip bei sicheren E-Angeboten entbehrlich [5].
8. **Prüfen und Werten** – erste Durchsicht (315), formale Prüfung, Nachforderung, Eignung, rechnerische Prüfung, Preisspiegel,
   Angemessenheit, Wertungsübersicht (321). Architekt: Prüfen und Werten, Preisspiegel, Aufklärungsgespräche, Vergabevorschlag
   (LPH 7c–e) [36][38].
9. **Zuschlagsentscheidung** (331) durch die Vergabestelle; Absageschreiben (332) bzw. Information nach § 134 GWB (333/334) [14][36].
10. **Zuschlag/Auftragsschreiben** (338) erst nach Ablauf der Wartefrist (EU) [14][36]; danach EU-Vergabebekanntmachung binnen
    30 KT bzw. national Ex-post-Information [5][18].
11. **Dokumentation abschließen** und aufbewahren (EU mindestens 3 Jahre ab Zuschlag) [16]. Bei Aufhebung: Formblätter 351/352 [36].

### 4.3 Fristen

| Frist | National (VOB/A Abschnitt 1) | EU (VOB/A EU 2026, GWB) |
|---|---|---|
| Angebotsfrist Öffentliche Ausschreibung / offenes Verfahren | ausreichend, auch bei Dringlichkeit ≥ 10 KT [18] | ≥ 35 KT ab Tag nach Absendung der Bekanntmachung; −5 KT bei elektronischer Angebotsabgabe; ≥ 15 KT nach Vorinformation oder bei begründeter Dringlichkeit [5] |
| Teilnahme-/Angebotsfrist nicht offenes Verfahren | „ausreichend“ [18] | Teilnahme ≥ 30 KT, Angebot ≥ 30 KT (−5 KT elektronisch; Dringlichkeit 15/10 KT) [5] |
| Verhandlungsverfahren ohne TW | – | Angebotsfrist ≥ 10 KT [5] |
| Auskünfte an Bieter | nicht geprüft | spätestens 6 KT vor Fristende (Dringlichkeit 4 KT), sonst Frist verlängern [5] |
| Nachforderung fehlender Unterlagen | soll 6 KT nicht überschreiten [18] | dto. [5] |
| Bindefrist (Zeitraum, in dem der Bieter an sein Angebot gebunden ist) | länger als 30 KT nur begründet [18] | regelmäßig 60 KT [5] |
| Information vor Zuschlag | keine allgemeine Wartefrist; Gründe auf Antrag binnen 15 KT [18] | Wartefrist 15 KT, elektronisch/Fax 10 KT, ab Tag nach Absendung [14] |
| Rüge (formale Beanstandung beim AG) | – (kein GWB-Rechtsschutz) | 10 KT ab Kenntnis; erkennbare Fehler bis Ablauf der Angebotsfrist; Nachprüfungsantrag binnen 15 KT nach Nichtabhilfe [15] |
| Vergabekammer | – | Entscheidung binnen 5 Wochen, Verlängerung i. d. R. ≤ 2 Wochen [1] |
| Veröffentlichung nach Zuschlag | Ex-post-Info ab 25.000 € (Beschr. Ausschr. ohne TW) bzw. 15.000 € (Freihändige Vergabe), 6 Monate [18] | Vergabebekanntmachung binnen 30 KT [5] |

Fristen laufen in Kalendertagen und beginnen am Tag nach dem auslösenden Ereignis [5][14]. Die VOB/A EU stellt bei späterem
angegebenem Veröffentlichungstag auf diesen Tag ab [1].

## 5. Kernregeln von der Öffnung bis zum Zuschlag

### 5.1 Losgrundsatz (Fachlose, Teillose)

**Fachlos** = Aufteilung nach Gewerk (z. B. Rohbau, Dach, Elektro); **Teillos** = mengenmäßige Aufteilung (z. B. Bauabschnitte).
Losweise Vergabe ist die Regel: national § 5 Abs. 2 VOB/A (Verzicht aus wirtschaftlichen/technischen Gründen möglich) [18],
oberhalb § 97a GWB / § 5a EU VOB/A mit enger gefassten Ausnahmen und Begründungspflicht im Vergabevermerk [1][5]. Für
Generalunternehmer-Vergaben (alles in einer Hand) braucht ein öffentlicher AG daher eine tragfähige Begründung.

### 5.2 Eignung

**Eignung** = Fachkunde, Leistungsfähigkeit, Zuverlässigkeit und keine Ausschlussgründe (z. B. Insolvenz, schwere Verfehlung,
Steuerrückstände) [18][5]. Nachweis national per Eintrag im Präqualifikationsverzeichnis des Vereins für die Präqualifikation von
Bauunternehmen („PQ-VOB“), per Einzelnachweis oder – wo zugelassen – per Eigenerklärung (VHB-Formblatt 124) [18][36]. Oberhalb
der Schwellen sollen seit 2026 Eigenerklärungen die Regel sein; Bescheinigungen nur von aussichtsreichen Bietern (§ 6b EU) [5].
Im offenen Verfahren prüft der AG seit 2026 zuerst die Angebote und erst danach die Eignung (§ 16b EU Abs. 1) [5]; national ist
diese Reihenfolge erlaubt (§ 16b Abs. 2 VOB/A) [18]. Bei Beschränkter Ausschreibung und Freihändiger Vergabe wird die Eignung
vor der Aufforderung zur Angebotsabgabe geprüft (§ 6b Abs. 5 VOB/A) [18].

### 5.3 Öffnung der Angebote

Bis zur Öffnung bleiben elektronische Angebote verschlüsselt; die Öffnung erfolgt unverzüglich nach Fristablauf, die
Niederschrift enthält Bieter, Endbeträge (auch je Los), unbedingte Preisnachlässe und Anzahl der Nebenangebote; sie wird nicht
veröffentlicht, Bieter dürfen sie einsehen [18][5]. Angebote sind geheim zu halten [5][18]. In Hessen entfällt der
Eröffnungstermin mit Bietern (§ 14a VOB/A) ganz [26].

### 5.4 Wertung in vier Stufen

| Stufe | Leitfrage | National | EU | Typische AVA-Unterstützung |
|---|---|---|---|---|
| 1 | Formal ausschließen? (verspätet, unvollständige Preise, Änderung der Vergabeunterlagen, Abrede, nicht zugelassene Nebenangebote) | §§ 16, 16a VOB/A | §§ 16, 16a EU | Checklisten, Nachforderungs-Workflow mit Frist |
| 2 | Bieter geeignet? | §§ 6a, 6b, 16b | §§ 6 EU ff., 16b EU; §§ 122 ff. GWB | Status je Bieter, Dokumentenliste |
| 3 | Rechnerisch, technisch, wirtschaftlich korrekt; Preis angemessen? | § 16c, § 16d Abs. 1 Nr. 1–3 | § 16c EU, § 16d EU Abs. 1 | Nachrechnen, Preisspiegel, Ausreißer-Markierung |
| 4 | Wirtschaftlichstes Angebot nach den bekanntgemachten Zuschlagskriterien? | § 16d Abs. 1 Nr. 4–7 | § 16d EU Abs. 2; § 127 GWB | Punktbewertung, Gewichtung (Formblatt 227) |

Quellen: [5][18][36]. Rechenregeln für die AVA: Weicht der Positionsbetrag von Menge × Einheitspreis ab, gilt der
**Einheitspreis**; bei Pauschalvergabe gilt die Pauschalsumme; die nachgerechneten Endsummen kommen in die Niederschrift
[18][5]. Unbedingte Nachlässe zählen nur an der vom AG vorgegebenen Stelle; unaufgefordert angebotene Skonti bleiben bei der
Wertung unberücksichtigt (§ 16d EU Abs. 4) [5]. Der VHB-Preisspiegel ordnet die Angebote nach nachgerechneter Summe; die
Preisermittlungsblätter 221–223 werden nicht Vertragsbestandteil [35]. Fehlende Preise dürfen nicht nachgefordert werden – außer
bei unwesentlichen Positionen, wenn Wettbewerb und Rangfolge auch mit dem höchsten Wettbewerbspreis unverändert bleiben [18][5].

### 5.5 Ungewöhnlich niedrige Angebote

Auf unangemessen hohe oder niedrige Preise darf kein Zuschlag erfolgen; erscheint ein Preis zu niedrig, muss der AG in Textform
Aufklärung über die Kalkulation verlangen, bevor er ausschließt [18][5]. Das VHB Bund nimmt Zweifel **grundsätzlich ab 10 %
Abweichung** an (zu anderen Angeboten oder zur eigenen Kostenermittlung) und verlangt dann mindestens die Formblätter 221/222
und 223 [35]. Oberhalb der Schwellen soll ein nicht aufklärbarer Niedrigpreis seit 2026 abgelehnt werden (§ 60 Abs. 3 VgV) [1].
In der Rechtsprechung wird häufig eine Aufgreifschwelle von 20 % genannt – in dieser Recherche nicht verifiziert.

### 5.6 Aufklärung statt Verhandlung

In Ausschreibungen (national) und im offenen/nicht offenen Verfahren (EU) darf der AG nach der Öffnung nur **aufklären**
(Eignung, Angebotsinhalt, Nebenangebote, Ausführungsart, Bezugsquellen, Preisangemessenheit – notfalls mit Einsicht in die
Kalkulation); Ergebnisse sind geheim zu halten und sollen in Textform festgehalten werden. **Verhandlungen über Preise oder
Angebotsänderungen sind unstatthaft**, außer für unumgängliche kleine technische Änderungen bei Nebenangeboten oder
Leistungsprogrammen. Wer die Aufklärung verweigert, wird ausgeschlossen [18][5]. Die HOAI nennt das „Führen von
Bietergesprächen“ als Grundleistung – im öffentlichen Bereich sind das Aufklärungsgespräche [38].

### 5.7 Nebenangebote

**Nebenangebot** = vom Bieter vorgeschlagene Alternative zur ausgeschriebenen Lösung. National sind Nebenangebote zu werten,
sofern der AG sie nicht ausgeschlossen hat [18]; das VHB empfiehlt, sie unterhalb der Schwellen in der Regel zuzulassen [35].
Oberhalb muss die Bekanntmachung seit 2026 sagen, ob Nebenangebote zugelassen, vorgeschrieben oder ausgeschlossen sind;
zugelassene brauchen Mindestanforderungen (VHB-Formblatt 226) [1][5][36]. Zuschlagskriterien müssen auf Haupt- und
Nebenangebote anwendbar sein; der Preis darf alleiniges Kriterium sein [18][35].

### 5.8 Zuschlagskriterien

Zuschlag auf das **wirtschaftlichste Angebot** (bestes Preis-Leistungs-Verhältnis); neben Preis/Kosten sind Qualität, Ästhetik,
Barrierefreiheit, Umwelt- und Sozialaspekte, Personalqualifikation, Kundendienst und Ausführungsfrist möglich; nur bekannt
gemachte Kriterien und Gewichtungen zählen; Festpreise mit reinem Qualitätswettbewerb sind zulässig [18][5]. Seit 2026 kommen
Lebenszykluskosten- und Energieeffizienzvorgaben (§ 8c EU) hinzu [5][6]. Ausblick: Der EU-Vorschlag sähe eine Mindestgewichtung
der Qualität von 30 % (personalintensiv 50 %) vor [34].

### 5.9 Dokumentation und Vergabevermerk

**Vergabevermerk** = fortlaufende Akte, die jede Stufe, Maßnahme und Entscheidung begründet. National (§ 20 VOB/A) Pflichtinhalte
u. a. AG, Leistung, Auftragswert, berücksichtigte und abgelehnte Bieter mit Gründen, Gründe für die Ablehnung ungewöhnlich
niedriger Angebote, Zuschlagsgründe, Nachunternehmeranteil, Gründe für die Verfahrenswahl [18]. Oberhalb verweist § 20 EU auf
§ 8 VgV (zusätzlich: Interessenkonflikte, Gründe für Gesamtvergabe, Aufbewahrung mindestens 3 Jahre, Vertragskopien ab
10 Mio. € Bauwert) [5][16]. Das VHB macht die Formblätter 111, 311/312, 321, 331 und 351 zum Kern der Dokumentation und
verlangt, jede Rüge zu registrieren [35].

### 5.10 Bekanntmachungen und Transparenz

- **EU:** Bekanntmachungen werden mit eForms erstellt (EU-Durchführungsverordnung 2019/1780, in Deutschland Pflicht seit
  25.10.2023) und über den Datenservice Öffentlicher Einkauf an das EU-Amtsblatt übermittelt; sie erscheinen frei zugänglich im
  Bekanntmachungsservice (oeffentlichevergabe.de) [17][41]. Strategische Felder (Nachhaltigkeit, Mittelstand, Zuschlagskriterien,
  Nebenangebote) sind Pflicht [17]. Standard: eForms-DE, Spezifikation 2.2.0 [41]; Bekanntmachungen nach Version 2.0 waren nur noch bis 30.6.2026 möglich [32].
- **National:** Bekanntmachung auf Internetportalen, in Tageszeitungen oder Amtsblättern; UVgO-Bekanntmachungen müssen über
  die Suche von bund.de auffindbar sein [18][19]. Ein UVgO-Entwurf 2026 sieht die Auffindbarkeit über oeffentlichevergabe.de oder
  den „Marktplatz Deutschland“ vor [33].
- **Ex-ante/ex-post:** Vorabinformation über geplante Beschränkte Ausschreibungen ohne TW ab 25.000 €; Information nach Zuschlag
  (25.000 €/15.000 €, 6 Monate) [18]; UVgO: ab 25.000 € für 3 Monate [19]; Hessen hebt beides auf 750.000 € (Bau) an [26].

### 5.11 Information, Wartefrist und Rechtsschutz

Oberhalb der Schwellen muss der AG unterlegene Bieter vor Vertragsschluss in Textform über Namen des Gewinners, Gründe der
Nichtberücksichtigung und frühesten Vertragsschluss informieren; danach 15 bzw. 10 KT warten (§ 134 GWB; keine Pflicht bei
Abrufen aus Rahmenvereinbarungen und bei Dringlichkeitsverfahren) [14]. Ein Vertrag unter Verstoß kann unwirksam sein (§ 135
GWB; seit 2026 alternativ Geldsanktion) [1]. Unterhalb gibt es nur Unterrichtungspflichten (§ 19 VOB/A) [18]; einzelne Länder
kennen eigene Vorabinformationen bzw. Nachprüfungsstellen – nicht verifiziert.

## 6. Rollenteilung: Architekt vs. Vergabestelle

| Aufgabe | Architekt/Planer (HOAI LPH 6–7) | Vergabestelle des AG | Beleg |
|---|---|---|---|
| Vergabeterminplan, LV mit Mengen, Schnittstellen zu Fachplanern | ✔ Grundleistung | prüft/übernimmt | [38] |
| Bepreistes LV, Kostenkontrolle gegen Kostenberechnung | ✔ | Budgetfreigabe | [38] |
| Wahl der Vergabeart, Losentscheidung, Wertgrenzenprüfung | bereitet vor, berät | entscheidet, dokumentiert (Formblatt 111) | [35][36] |
| Vergabeunterlagen zusammenstellen | ✔ (LPH 6f) | ergänzt Formblätter, gibt frei | [36][38] |
| Bekanntmachung, Plattform, Bieterkommunikation | liefert Inhalte | ✔ einziger Kommunikationskanal | [5][18] |
| Öffnung, Niederschrift | i. d. R. nicht beteiligt | ✔ zwei Vertreter des AG | [18] |
| Prüfen/Werten, Preisspiegel, Aufklärungsgespräche, Vergabevorschlag | ✔ (LPH 7c–e) | entscheidet über Ausschluss und Wertung | [35][38] |
| Zuschlag, Absagen, § 134-Information, Auftragsschreiben | wirkt mit (LPH 7h) | ✔ | [14][36][38] |
| Dokumentation | dokumentiert Vergabeverfahren (LPH 7e) | verantwortet Vergabevermerk | [16][35][38] |
| Nachprüfungsverfahren | Besondere Leistung (fachliche Mitwirkung) | ✔ Partei | [38] |

Im Bundesbau ist die „Baudurchführende Ebene“ für Vergabe und Vertragsabwicklung zuständig; für freiberufliche Leistungen ist das
VHB grundsätzlich nicht anwendbar [35].

## 7. Vergabehandbücher und Formblätter

### 7.1 VHB Bund

Das „Vergabe- und Vertragshandbuch für die Baumaßnahmen des Bundes“ (VHB 2017, Stand 2019, Lesefassung 2023) gliedert sich in
sechs Teile (Vorbereitung, Vergabeunterlagen, Durchführung, Bauausführung, Nachtragsmanagement, Sonstiges); die Formblätter
gibt es je Teil als ZIP sowie eine Formblatt-Liste (XLSX) mit Zuordnung zu jeder Verfahrensart [36][37]. Am 9.11.2026 zeigte
die Seite noch keinen an VgBG/VOB/A 2026 angepassten Stand [37]. Leistungsbeschreibungen sollen in der Regel auf dem
Standardleistungsbuch STLB-Bau beruhen (siehe [STLB-Notiz](/okf/research/standards/stlb-bau-tender-texts.md)) [35].

| Nr. | Bezeichnung (sinngemäß) | Zweck / AVA-Bezug |
|---|---|---|
| 111 | Vergabevermerk – Wahl der Vergabeart | Verfahrenswahl, Termine, Lose, Nebenangebote, Bindefrist |
| 113 / 114 | Ankündigung Beschränkte Ausschreibung (§ 20 Abs. 4) / Aufforderung zur Interessensbestätigung | Ex-ante-Transparenz |
| 121 / 122 | Bekanntmachung Öffentliche Ausschreibung / Öffentlicher TW | nationale Bekanntmachung |
| 124 (124 LD) | Eigenerklärung zur Eignung | Bieterunterlage |
| 211 (EU, VS) | Aufforderung zur Abgabe eines Angebots | Anschreiben |
| 212 (EU, VS) | Teilnahmebedingungen | Regeln für Bieter |
| 213 | Angebotsschreiben / Angebotsschreiben Lose | Angebotssumme, Nachlässe – Bezug zum LV |
| 214 | Besondere Vertragsbedingungen | Vertragsunterlage |
| 216 | Im Vergabeverfahren vorzulegende Unterlagen | Nachforderungsliste |
| 221 / 222 | Preisermittlung bei Zuschlagskalkulation / bei Kalkulation über die Endsumme | Kalkulationsangaben (Prüfung Stufe 3) |
| 223 | Aufgliederung der Einheitspreise | EP-Bestandteile (Lohn, Stoffe, Geräte …) |
| 224 / 225 / 228 | Lohngleitklausel / Stoffpreisgleitklausel / Stoffpreisgleitklausel Nichteisenmetalle | Preisgleitung |
| 226 | Mindestanforderungen an Nebenangebote | Wertung Nebenangebote |
| 227 | Gewichtung der Zuschlagskriterien | Wertung Stufe 4 |
| 233–236 | Nachunternehmerverzeichnis, Bietergemeinschaft, Kapazitäten anderer Unternehmen, Verpflichtungserklärung | Eignung |
| 248 | Erklärung zur Verwendung von Holzprodukten | Nachhaltigkeit |
| 311 / 312 | Vergabevermerk – Firmenliste | Bieterliste |
| 313 | Niederschrift über die (Er)Öffnung der Angebote | Submissionsergebnis |
| 315 | Vergabevermerk – Erste Durchsicht | formale Prüfung |
| 321 | Vergabevermerk – (Prüfungs- und) Wertungsübersicht | Preisspiegel, Wertung |
| 331 | Vergabevermerk – Entscheidung über den Zuschlag | Vergabevorschlag/-entscheidung |
| 332 / 333 / 334 / 336 | Absageschreiben, Information an erfolgreichen Bieter, Information nach § 134 GWB, Nichtberücksichtigung Bewerber | Bieterinformation |
| 338 / 339 | Auftragsschreiben (+ Beiblatt) | Vertragsschluss |
| 341 | Information über eine Beauftragung (§ 20 Abs. 3 VOB/A, § 30 UVgO) | Ex-post-Transparenz |
| 351 / 352 | Entscheidung über die Aufhebung / Aufhebung des Verfahrens | Aufhebung |
| 421–423, 442, 451–454, 521–523 | Bürgschaften, Abnahme, Datenträger Abrechnung, Zahlungsmitteilungen, Nachträge | Bauphase (LPH 8) |

Quellen: Formblatt-Liste und Inhaltsverzeichnis der Lesefassung [35][36]. Hinweis: **351 ist die Aufhebungsentscheidung**,
kein Aufklärungsformular.

### 7.2 Länder und Kommunen

Länder und Kommunen nutzen eigene Handbücher oder abgeleitete Formulare, oft mit derselben Nummernlogik. Belegtes Beispiel:
Berlin veröffentlichte im September 2026 Mustervordrucke für Direktaufträge mit den Kennungen Wirt-211-D, Wirt-213-D und
Wirt-338-D (Anfrage, Angebotsschreiben, Auftragsschreiben) [28]. NRW wendet für Landesbehörden ein eigenes Vergabehandbuch
(Erlass vom 11.5.2018) an [29]. Weitere Landeshandbücher (z. B. für Straßenbau oder kommunale Handbücher) wurden nicht geprüft.

### 7.3 Dürfen wir die Formblätter nachbauen?

- **Fakt:** Das VHB erlaubt Vergabestellen, statt der Formblätter elektronisch erzeugte Formulare zu verwenden, die nur die für
  das Verfahren relevanten Angaben enthalten; „Inhaltliche Abweichungen und Änderungen sind nicht zulässig.“ [35]
- **Fakt:** Gesetze, Verordnungen, amtliche Erlasse und Bekanntmachungen sind urheberrechtsfrei; andere amtliche Werke im
  öffentlichen Interesse ebenfalls, aber mit Änderungsverbot und Pflicht zur Quellenangabe; private Normwerke (z. B. DIN), auf
  die nur verwiesen wird, bleiben geschützt [39].
- **Einschätzung:** VHB-Formblätter (per Erlass eingeführt, öffentlich bereitgestellt) dürften nachgebaut werden, solange der
  Inhalt unverändert bleibt und die Quelle genannt wird. Eine Lizenzangabe fehlt auf der VHB-Seite [37]. Die VOB/A erscheint
  als Bekanntmachung im Bundesanzeiger [5]; VOB/C-Normtexte (DIN 18299 ff.) dagegen nicht frei verwenden. Vor einer
  Veröffentlichung im Repository: kurze juristische Prüfung, siehe
  [Open-Source-Bausteine und Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md).

## 8. E-Vergabe

### 8.1 Pflichten

| Bereich | Pflicht zur elektronischen Kommunikation/Angebotsabgabe | Quelle |
|---|---|---|
| Oberhalb der Schwellen | Grundsatz seit 18.10.2018 (§ 97 Abs. 5 GWB); Angebote in Textform mit elektronischen Mitteln; Signatur nur bei erhöhtem Sicherheitsbedarf | [11][45][5] |
| UVgO (L/DL) | ab 1.1.2019 Annahmepflicht, ab 1.1.2020 Vorgabepflicht für E-Angebote; Ausnahmen: Auftragswert ≤ 25.000 € oder Verfahren ohne TW | [19] |
| VOB/A Abschnitt 1 (Bau, national) | AG legt Form fest; Papierangebote weiterhin zulässig (dann Eröffnungstermin mit Bietern) | [18][45] |
| Hessen (unterhalb) | elektronische Kommunikation nach UVgO nicht zwingend; HAD-Veröffentlichung Pflicht | [26] |
| NRW Landesbehörden | alle Verfahren über das Vergabemanagementsystem / evergabe.nrw.de | [29] |

Signaturen sind die Ausnahme: Das VHB verlangt, bei E-Angeboten grundsätzlich darauf zu verzichten [35]; laut cosinex fordern
weniger als 1 % der Verfahren eine fortgeschrittene oder qualifizierte Signatur [46].

### 8.2 Plattformlandschaft (Auswahl)

| Plattform | Betreiber / Technik | Nutzer, Besonderheiten | Quelle |
|---|---|---|---|
| e-Vergabe-Plattform des Bundes (evergabe-online.de) | Beschaffungsamt des BMI (ServiceDesk Bonn) | Bundesbehörden | [47] |
| vergabe.bayern | Bayerisches Staatsministerium für Wohnen, Bau und Verkehr; Hotline durch RIB Software | staatliche Vergabestellen (VOB, UVgO, VgV); Bieter-Hotline kostenpflichtig (1,95 €/min) | [48] |
| Vergabemarktplatz NRW (evergabe.nrw.de) | cosinex (Version VMP 11.5.5) mit d-NRW | einer von acht verbundenen Marktplätzen (u. a. Metropole Ruhr, BLB NRW, Stadt Köln) | [49] |
| Deutsches Vergabeportal (DTVP) | DTVP Deutsches Vergabeportal GmbH; Partner Bundesanzeiger Verlag und cosinex | Kommunen, Hochschulen, Kliniken; kostenpflichtige Zusatzdienste für Bieter | [50] |
| subreport ELViS | subreport Verlag Schawe GmbH, seit 2001 | laut Hersteller für AG ohne Abo/lizenzfrei; Bieter sehen Unterlagen ohne Registrierung | [44][45] |
| Hessische Ausschreibungsdatenbank (HAD) | ABSt Hessen e.V. | Bekanntmachungsdatenbank, kostenlos, XML-Schnittstelle für fremde Plattformen | [51] |
| Sachsen (sachsen-vergabe.de), Berlin (vergabekooperation.berlin) | Seitentitel nennen „Administration Intelligence AG – Vergabe@Net“ | Landesplattformen | [52][53] |

Einschätzung: Ein Architekt mit öffentlichen Kunden in mehreren Ländern muss mit vielen Plattformen umgehen – die Plattform
wählt immer der AG.

### 8.3 Schnittstellen zwischen AVA-Software und Plattformen

- **XVergabe** sollte Bieter-Clients und Plattformen interoperabel machen (Projekt seit 2007, 2015 vom IT-Planungsrat für
  verbindlich erklärt). Mit Beschluss 2022/49 (10.11.2022) ersetzte der IT-Planungsrat XVergabe durch eForms im Rahmen der
  „XStandards Einkauf“ [42]. Heute umfasst die Familie Peppol, eForms-DE, XBestellung, XRechnung und XBezahldienste – XVergabe
  nicht mehr [40]. Reste leben in Produkten weiter: subreport bietet Bietern mit „XVergabe de Luxe“ einen Zugang zu mehreren
  XVergabe-Plattformen [43].
- **Praxis heute (Einschätzung):** Es gibt keinen offenen Standard „AVA → Vergabeplattform“. Der Austausch läuft dateibasiert:
  Die AVA exportiert das LV als GAEB-Datei (Angebotsaufforderung) plus PDF und Formblätter, die Vergabestelle lädt das Paket
  hoch, Bieter geben bepreiste GAEB-Dateien ab, nach der Öffnung kommen diese zur Prüfung zurück in die AVA (Details:
  [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md), [GAEB in der Praxis](/okf/research/standards/gaeb-tooling-interop.md)).
- **Herstellerbeispiele:** NOVA AVA bietet laut Hersteller ein eigenes Online-Ausschreibungsportal für ausgewählte Bieter mit
  optionalem Vier-Augen-Prinzip bei der Öffnung und automatischem Preisspiegel; für öffentliche Plattformen werden LVs nur
  „vorbereitet“, extern eingegangene Angebote per GAEB/ÖNORM importiert [55]. Der AI VERGABEMANAGER kann laut Hersteller LVs
  selbst erstellen oder importieren [54].
- **Direkte Kopplungen (herstellerspezifisch):**
  - G&W: Das California-Modul **EVC (E-Vergabe Connect)** stellt LVs aus California auf einer E-Vergabe-Plattform bereit und
    überträgt die Bieterangebote nach der Submission vollautomatisch zurück. Verfügbar ist derzeit die direkte Anbindung an den
    **AI-Vergabemanager**, also die Software der Vergabestellen auf den Plattformen von Administration Intelligence [66][54].
  - RIB: RIB bewirbt „AVA und eVergabe digital integriert“ mit der eigenen Plattform **iTWO e-Vergabe public**, die zahlreiche
    Kommunen nutzen [67][68]. Ob Angebote automatisch in den iTWO-Preisspiegel zurückfließen, sagt die Produktseite nicht.
  - **RIB TenderConnect** (2026) ist dagegen ein Netzwerk privater Nachunternehmer, keine öffentliche Vergabeplattform; dort
    fließen die Rückläufe laut RIB in den Preisspiegel zurück [69].
  - Für ORCA und NEVARIS wurde keine dokumentierte Kopplung an eine öffentliche Plattform gefunden (Suche nicht abschließend,
    siehe Offene Fragen und [Etablierte Anbieter](/okf/research/market/established-vendors.md)).
- **Ausblick:** Der „Marktplatz Deutschland“ (BMDS/FITKO) plant Bieterportal mit einmaliger Datenhinterlegung, E-Vergabe und
  Schnittstellen zu Präqualifizierungsstellen, Rollout bis 31.12.2027 – technische Schnittstellen sind noch nicht spezifiziert [33].
  Peppol soll langfristig auch Angebotsabgaben transportieren können (bisher Vision) [56]. Der EU-Vorschlag setzt auf ein Netz
  interoperabler Plattformen und eine Open-Source-Vergabeplattform der Kommission (Werkzeuge bis 30.6.2028) [34].

### 8.4 Die Bieterseite

Bieter laden Unterlagen kostenfrei herunter, stellen Fragen über die Plattform, geben Angebote in Textform ab und erhalten
Eingangsbestätigungen; bis zum Fristende können sie zurückziehen oder austauschen [44][45]. Die Abgabe wandert vom installierten
Bieter-Client in den Browser (cosinex seit Anfang 2026) [46]. Bauunternehmen kalkulieren das GAEB-LV in ihrer eigenen
Kalkulationssoftware und laden die bepreiste Datei samt Formblättern hoch (Einschätzung, siehe GAEB-Notizen). Für Bundesaufträge
ab 50.000 € kommt seit 1.5.2026 ein Tariftreueversprechen hinzu [20].

## 9. E-Rechnung (Relevanz für die Rechnungsprüfung)

### 9.1 Gegenüber öffentlichen Auftraggebern (B2G)

Lieferanten des Bundes müssen seit **27.11.2020** elektronische Rechnungen über ein Verwaltungsportal einreichen (ausgenommen
u. a. Direktaufträge bis 1.000 €); Standard ist XRechnung, Pflichtangaben u. a. **Leitweg-ID** (Adresse der Rechnungsstelle),
Bankverbindung, Zahlungsbedingungen [59]. Die Länder regeln B2G eigenständig; KoSIT führt eine Ländersynopse [57].

### 9.2 Zwischen Unternehmen (B2B)

| Zeitraum (Leistung nach …) | Regel | Quelle |
|---|---|---|
| seit 1.1.2025 | alle inländischen Unternehmen müssen E-Rechnungen empfangen können | [58][60] |
| 1.1.2025 – 31.12.2026 | Papier oder andere elektronische Formate (mit Zustimmung) weiter zulässig | [61] |
| 1.1.2027 – 31.12.2027 | Ausnahme nur noch bei Vorjahresumsatz ≤ 800.000 € oder EDI-Verfahren | [61] |
| ab 1.1.2028 | E-Rechnung im strukturierten Format nach EN 16931 Pflicht | [58][61] |

Die E-Rechnungspflicht gilt für Leistungen zwischen inländischen Unternehmern; steuerfreie Umsätze sind ausgenommen [60].
Privatpersonen als Bauherren fallen nicht darunter (Einschätzung aus § 14 Abs. 2 UStG).

### 9.3 Formate

- **XRechnung** (reines XML, deutsche Ausprägung der EN 16931): Version 3.0 gilt seit 1.2.2024 und mindestens bis 31.7.2027;
  Vorabversion 4.0 seit September 2026, finale Fassung voraussichtlich Frühjahr 2027 [57].
- **ZUGFeRD/Factur-X** (PDF/A-3 mit eingebettetem XML, B2B/B2G/B2C): aktuell 2.5.2 vom 4.8.2026 [62].
- **Übertragung:** Peppol, E-Mail oder Portale; Leitweg-ID im B2B nicht nötig [58]. KoSIT ist deutsche Peppol-Behörde [56].

### 9.4 Folgen für die AVA

Rechnungen gehen an den Bauherrn; der Architekt prüft sie in LPH 8 gegen Vertrag, Aufmaß und Nachträge (siehe
[Der AVA-Prozess II](/okf/research/process/billing-and-cost-control.md)). Einschätzung: Ab 2027/2028 kommen Abschlags- und
Schlussrechnungen von Baufirmen überwiegend als XRechnung/ZUGFeRD. Eine AVA sollte diese XML-Dateien lesen, anzeigen, gegen
LV-Positionen und bisherige Abschläge abgleichen und Prüfvermerke ausgeben können. Bei VgV-Aufträgen drängt die neue
30-Tage-Zahlungsregel auf schnelle Prüfung [1].

## 10. Funktionsbedarf: öffentliche vs. private Auftraggeber

| Funktion | Öffentlicher AG | Privater AG | Grundlage |
|---|---|---|---|
| Wertgrenzen-/Verfahrensart-Assistent | **Muss** (je Land, AG-Typ, Leistungsart, Datum) | entfällt | [8][21]–[31] |
| Fristenrechner (Mindestfristen, Bindefrist, Wartefrist) | **Muss** | hilfreich, frei wählbar | [5][14][18] |
| Formblatt-Generator (VHB Bund, Landesvarianten) | **Muss/Soll** je AG | optional (eigene Vorlagen) | [35][36] |
| Bekanntmachungsdaten (eForms) | Vergabestelle; AVA liefert Inhalte | entfällt | [17][41] |
| Bieterkommunikation | nur über die Plattform des AG | direkt aus der AVA (Portal/E-Mail) | [5][55] |
| Angebotsöffnung | förmlich, Niederschrift, Geheimhaltung | „Submission“ optional | [18] |
| Preisspiegel mit VOB/A-Rechenregeln, Losen, Nebenangeboten, Nachlässen | **Muss** | **Muss** (ohne Formzwang) | [5][18][35] |
| Prüfung unangemessener Preise (10 %-Hinweis) | **Muss** | nützlich | [35] |
| Nachverhandlung, Verhandlungsrunden | in Ausschreibungen verboten | **Muss** (versionierte Angebote) | [18] |
| Eignung, Eigenerklärungen, PQ, Wettbewerbsregister | **Muss** | optional | [1][5][18] |
| Losbildung inkl. Begründung einer Gesamtvergabe | **Muss** | frei (GU möglich) | [1][5] |
| Vergabevermerk/Audit-Trail in Textform, Aufbewahrung ≥ 3 Jahre | **Muss** | empfohlen | [16][18] |
| Absagen, § 134-Information, Ex-ante/Ex-post-Info | **Muss** | höflich, freiwillig | [14][18] |
| Tariftreue-/Mindestlohnerklärungen | je nach Bund/Land | entfällt | [20][29] |
| E-Rechnung prüfen | XRechnung/Leitweg-ID (B2G) | EN 16931 bei Unternehmer-Bauherr | [57][59][61] |
| Rechte, Vier-Augen-Freigaben | **Muss** | empfohlen | [5][26] |

## Relevanz für unser Projekt

**Muss-Anforderungen, sobald ein öffentlicher Bauherr unterstützt wird (Einschätzung):**

1. **Projektattribut „Vergaberegime“**: öffentlich/privat, Bund/Land/Kommune, Bundesland, ober-/unterschwellig, mit
   Gültigkeitsdatum – steuert Fristen, Formulare und Pflichtfelder.
2. **Regeldatenbank statt Hardcoding**: Wertgrenzen, Schwellenwerte und Fristen als versionierte Daten (z. B. YAML/JSON)
   mit Quelle, Stand und Ablaufdatum; Anzeige „Stand/Quelle“ in der Oberfläche. Ohne Pflege veraltet sie binnen Monaten.
3. **VOB/A-konformer Preisspiegel**: Nachrechnen (EP maßgebend), Pauschalen, unbedingte Nachlässe, Skonti-Ausschluss,
   Nebenangebote getrennt, Lose, Rangfolge nach nachgerechneter Summe, Abweichungsmarkierung (≥ 10 % konfigurierbar),
   Vergleich mit bepreistem LV/Kostenberechnung, Export als Wertungsübersicht.
4. **Wertungs-Workflow in vier Stufen** mit Nachforderungsfristen, Ausschlussgründen und Punktbewertung nach Formblatt 227.
5. **Revisionsfeste Dokumentation**: unveränderbares Ereignisprotokoll (wer, was, wann, warum), Export als PDF/A für den
   Vergabevermerk.
6. **Vergabeunterlagen-Paket für fremde Plattformen**: GAEB-Export plus PDF plus ausgefüllte Formblätter; Import bepreister
   GAEB-Angebote nach der Öffnung.
7. **Formblatt-Generator** für die wichtigsten VHB-Blätter (111, 211–214, 216, 221–227, 313, 321, 331–334, 338, 351).
8. **E-Rechnungsimport** (XRechnung UBL/CII, ZUGFeRD) für die Rechnungsprüfung.

**Differenzierungschancen:**

- Ein offener, gemeinschaftlich gepflegter **„Vergabe-Kompass“** (Wertgrenzen aller Länder mit Quellen und Datum) – der
  Flickenteppich (Abschnitt 3.2) ist eine echte Last für kleine Büros.
- **Klarer Modus „öffentlich vs. privat“** mit passenden Defaults; private Vergaben flexibel (Verhandlungsrunden), öffentliche
  streng (Verhandlungssperre, Pflichtdokumentation).
- **eForms-nahe Datenstruktur** für Bekanntmachungsinhalte, damit Vergabestellen sie übernehmen können (eForms-DE 2.2.0 als Vorlage).
- Nähe zur geplanten **Open-Source-Vergabeplattform der EU-Kommission** (ab 2028) – frühe Interoperabilität könnte ein
  Alleinstellungsmerkmal werden [34].

**Risiken:**

- **Haftung/Fehlinformation:** falsche Wertgrenzen oder Fristen können zu Verfahrensfehlern führen → Quellen anzeigen,
  Haftungsausschluss, Nutzerbestätigung.
- **Änderungstempo:** VgBG 2026, VOB/A EU 2026, UVgO-Reform 2026/27, Landesreformen, EU-Verordnung frühestens um 2029/30 [1][5][33][34].
- **Keine offene Plattform-API**, XVergabe aufgegeben, Marktplatz Deutschland unklar → Integration bleibt vorerst dateibasiert.
- **Urheberrecht:** VHB vermutlich frei nachnutzbar, DIN/VOB/C und STLB-Bau nicht (siehe STLB- und Lizenz-Notizen).
- **Eigene E-Vergabe-Plattform** wäre sicherheits- und haftungsintensiv (Verschlüsselung, Öffnung, Textform, Archivierung,
  eForms-Anbindung) → Nicht-Ziel für die erste Phase.

**Grobe Aufwandsschätzung (Einschätzung, Personentage für einen erfahrenen Entwickler):**

| Baustein | Aufwand |
|---|---|
| Regeldatenbank Wertgrenzen/Fristen + Assistent (ohne laufende Pflege) | 10–20 PT |
| Preisspiegel mit VOB/A-Regeln und Wertungsstufen | 20–40 PT |
| Dokumentation/Audit-Trail + PDF-Export | 10–20 PT |
| Formblatt-Generator (Kernsatz VHB Bund) | 15–30 PT |
| GAEB-Paket-Export/-Import für Plattformen (auf GAEB-Kern aufbauend) | 10–15 PT |
| E-Rechnungs-Import und -Anzeige (mit vorhandenen Bibliotheken) | 10–20 PT |
| Eigene E-Vergabe-Plattform | > 120 PT plus Sicherheitsprüfung – nicht empfohlen |

## Offene Fragen

**Nicht gefunden oder nicht verifiziert** (Hinweis: Das Websuche-Kontingent der Recherche war gegen Ende erschöpft; einzelne
Punkte konnten nur noch über bekannte URLs geprüft werden):

- Sachsen: Gilt für Freihändige Vergaben 25.000 € (SächsVergabeG) oder 100.000 € (VOB/A)? Gibt es inzwischen das angekündigte
  neue sächsische Vergabegesetz? Welche Regeln gelten dort für L/DL (UVgO oder noch VOL/A)?
- Niedersachsen: Stand der NTVergG-Novelle 2026; gelten die VOB/A-Werte vom 1.1.2026 wegen statischer Verweise nicht?
- NRW-Landesbehörden: Werte nur über cosinex belegt; der Text der VV zu § 55 LHO NRW (Runderlass 10.4.2026, Erlass 21.9.2026)
  wurde nicht selbst gelesen.
- Bund: Wertgrenzen für Verhandlungsvergaben nach UVgO je Ressort.
- Welche Länder kennen unterhalb der Schwellen eine Vorabinformation mit Wartefrist bzw. Nachprüfungsstellen?
- Rechtsprechung zur 20-%-Aufgreifschwelle bei Niedrigpreisen.
- Landes- und Kommunalvergabehandbücher (Bayern, Kommunen, Straßenbau-Handbuch) und deren Formularnummern.
- Konkrete AVA-↔-Plattform-Integrationen etablierter Anbieter: Für California (EVC zum AI-Vergabemanager) und RIB
  (iTWO e-Vergabe) belegt [66][67]; offen für ORCA und NEVARIS sowie die Frage, welche öffentlichen Plattformen außer dem
  AI-Vergabemanager angebunden werden – siehe [Etablierte Anbieter](/okf/research/market/established-vendors.md).
- Finaler Stand der UVgO 2026 (Entwurf kommentiert bis 28.8.2026) und ob der Bund sie bereits in Kraft gesetzt hat.
- BMF-Schreiben zur E-Rechnung (zulässige ZUGFeRD-Profile): BMF-Seite war bei der Recherche nicht erreichbar.
- Gibt es eine Anpassung des VHB Bund an VgBG/VOB/A 2026 (Erlass), die noch nicht online ist?

**Fragen an den Architekten-Freund:**

1. Für welche öffentlichen Auftraggeber arbeitest du (Bund, Land, Kommune, Fördermittelprojekte) und in welchen Bundesländern?
2. Wie oft sind es EU-weite Verfahren, wie oft nationale (Beschränkte Ausschreibung, Freihändige Vergabe, Direktauftrag)?
3. Über welche Vergabeplattformen laufen deine Projekte, und wer lädt dort die Unterlagen hoch – du oder die Vergabestelle?
4. Welche Formblätter verlangen deine Auftraggeber (VHB Bund, Landeshandbuch, kommunale Eigenformulare)? Füllst du sie heute
   von Hand aus?
5. Was fehlt dir in NOVA AVA konkret bei öffentlichen Vergaben (Wertungsübersicht, Vergabevermerk, Fristen, Formblätter)?
6. Bekommst du schon E-Rechnungen (XRechnung/ZUGFeRD) zur Prüfung, und wie gehst du damit um?
7. Bei privaten Bauherren: Wie läuft die Vergabe ab (Verhandlungsrunden, Bietergespräche, Online-Angebote)?

## Quellen

1. [1] Gesetz zur Beschleunigung der Vergabe öffentlicher Aufträge vom 12.5.2026, BGBl. 2026 I Nr. 137 – recht.bund.de – https://www.recht.bund.de/bgbl/1/2026/137/VO.html – Gesetz – abgerufen 2026-11-09
2. [2] Vergabebeschleunigungsgesetz: Verkündung und Inkrafttreten – vergabe.nrw.de (Land NRW) – https://www.vergabe.nrw.de/wirtschaft/vergabebeschleunigungsgesetz-verkuendung-und-inkrafttreten – Primärquelle (Behörde) – abgerufen 2026-11-09
3. [3] Finale: Vergabebeschleunigungsgesetz im Bundesgesetzblatt verkündet – rehm Verlag – https://www.rehm-verlag.de/vergaberecht/aktuelle-beitraege-zum-vergaberecht/finale-vergabebeschleunigungsgesetz-im-bundesgesetzblatt-verkuendet/ – Presse (Fachverlag) – abgerufen 2026-11-09
4. [4] Verordnung zur Änderung der VgV und der VSVgV vom 2.9.2026, BGBl. 2026 I Nr. 250 – recht.bund.de – https://www.recht.bund.de/bgbl/1/2026/250/VO.html – Gesetz (Verordnung) – abgerufen 2026-11-09
5. [5] Bekanntmachung der VOB/A Abschnitt 2 und 3, Ausgabe 2026, BAnz AT 24.08.2026 B6 – BMWSB/Bundesanzeiger – https://bundesanzeiger.de/pub/publication/73xO0rpP1jfX5HRt0Ja/content/73xO0rpP1jfX5HRt0Ja/BAnz%20AT%2024.08.2026%20B6.pdf?inline= – Primärquelle – abgerufen 2026-11-09
6. [6] Jetzt gilt’s: VOB/A 2026 tritt am 8.9.2026 in Kraft – rehm Verlag – https://www.rehm-verlag.de/vergaberecht/aktuelle-beitraege-zum-vergaberecht/jetzt-gilt-s-vob-a-2026-tritt-am-8.9.2026-in-kraft/ – Presse (Fachverlag) – abgerufen 2026-11-09
7. [7] Neue VOB/A 2026: Was sich bei EU-weiten Bauvergaben ändert – cosinex Blog – https://blog.cosinex.de/2026/09/08/vob-a-2026-neufassung-abschnitt-2-3/ – Presse (Fachblog eines Anbieters) – abgerufen 2026-11-09
8. [8] Erlass BMWSB vom 15.12.2025: Änderungen der VOB/A Abschnitt 1, § 3a (BAnz AT 16.12.2025 B7), Anlage zu Rundschreiben 01/2026 – wirtschaft.bremen.de – https://www.wirtschaft.bremen.de/sixcms/media.php/13/Anlage%2Bzu%2BRundschreiben%2B01_2026%2B-%2B%25C3%2584nderung%2BWertgrenzen%2BVOB_A.pdf – Primärquelle – abgerufen 2026-11-09
9. [9] Erhöhte Wertgrenzen für Bauleistungen ab 1. Januar – cosinex Blog – https://blog.cosinex.de/2025/12/19/erhoehte-wertgrenzen-fuer-bauleistungen-ab-1-januar/ – Presse (Fachblog) – abgerufen 2026-11-09
10. [10] BMWSB-Schreiben „EU-Schwellenwerte ab 2026“ vom 16.12.2025 – via ingenieurkammer.de – https://www.ingenieurkammer.de/fileadmin/dokumente/Downloads_PDF/News_Dokumente/2025-12-16_BII1-70409-3_1_EU-Schwellenwerte_ab_2026.pdf – Primärquelle – abgerufen 2026-11-09
11. [11] § 97 GWB – gesetze-im-internet.de – https://www.gesetze-im-internet.de/gwb/__97.html – Gesetz – abgerufen 2026-11-09
12. [12] § 99 GWB – gesetze-im-internet.de – https://www.gesetze-im-internet.de/gwb/__99.html – Gesetz – abgerufen 2026-11-09
13. [13] § 106 GWB – gesetze-im-internet.de – https://www.gesetze-im-internet.de/gwb/__106.html – Gesetz – abgerufen 2026-11-09
14. [14] § 134 GWB – gesetze-im-internet.de – https://www.gesetze-im-internet.de/gwb/__134.html – Gesetz – abgerufen 2026-11-09
15. [15] § 160 GWB – gesetze-im-internet.de – https://www.gesetze-im-internet.de/gwb/__160.html – Gesetz – abgerufen 2026-11-09
16. [16] § 8 VgV – gesetze-im-internet.de – https://www.gesetze-im-internet.de/vgv_2016/__8.html – Gesetz (Verordnung) – abgerufen 2026-11-09
17. [17] § 10a VgV – gesetze-im-internet.de – https://www.gesetze-im-internet.de/vgv_2016/__10a.html – Gesetz (Verordnung) – abgerufen 2026-11-09
18. [18] VOB/A Abschnitt 1 (Ausgabe 2019), Normtexte §§ 3b, 5, 6b, 8, 10, 12, 13, 14, 14a, 15, 16, 16a–16d, 19, 20 – vergabevorschriften.de (Normtextwiedergabe; dortige KI-Kommentare nicht verwendet) – https://www.vergabevorschriften.de/vob-a/20 – Primärtext über Sekundärseite – abgerufen 2026-11-09
19. [19] Unterschwellenvergabeordnung (UVgO), Ausgabe 2017, BAnz AT 07.02.2017 B1, nichtamtliche Fassung – BMWE – https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Downloads/U/unterschwellenvergabeordnung-uvgo.pdf?__blob=publicationFile – Primärquelle – abgerufen 2026-11-09
20. [20] Tariftreuegesetz vom 27.4.2026 (Bundestariftreuegesetz), BGBl. 2026 I Nr. 119 – recht.bund.de – https://www.recht.bund.de/bgbl/1/2026/119/VO.html – Gesetz – abgerufen 2026-11-09
21. [21] Art. 20 BayWiVG (Unterschwellenvergabe) – gesetze-bayern.de – https://www.gesetze-bayern.de/Content/Document/BayZustWiG-20 – Gesetz – abgerufen 2026-11-09
22. [22] Wertgrenzen kommunaler Auftraggeber, Stand 01.01.2026 – Bayerisches Staatsministerium des Innern – https://www.stmi.bayern.de/media/a-z/kommunen/vergaben-im-kommunalen-bereich/zulaessige-vergabeverfahren-unterhalb-der-eu-schwellenwerte/2026-01-01_-_%C3%9Cbersicht_Wertgrenzen_kommunaler_Auftraggeber.pdf – Primärquelle – abgerufen 2026-11-09
23. [23] Projektbericht „Erhöhung vergaberechtliche Wertgrenzen im Unterschwellenbereich“ (20.1.2026) – Statistisches Landesamt BW / Staatsministerium BW – https://stm.baden-wuerttemberg.de/fileadmin/redaktion/dateien/PDF/Buerokratieabbau/260120_Projektbericht-Erhoehung-vergaberechtliche-Wertgrenzen.pdf – Primärquelle (Behörde) – abgerufen 2026-11-09
24. [24] Überblick im Dschungel der Schwellenwerte (Vergabekongress 2026) – Menold Bezler Rechtsanwälte – https://www.menoldbezler.de/fileadmin/user_upload/Blog_PDFs/PDFs/Vergabekongress_2026/2_Dschungel_der_Schwellenwerte_MB_Vergabekongress26_14.pdf – Fachvortrag (Kanzlei) – abgerufen 2026-11-09
25. [25] Niedersächsische Wertgrenzenverordnung (NWertVO), nichtamtliche Lesefassung Stand 28.05.2025 – Nds. Wirtschaftsministerium – https://www.mw.niedersachsen.de/download/218407/ab_29.05.2025_NWertVO_nichtamtl._Lesefassung.pdf – Primärquelle – abgerufen 2026-11-09
26. [26] Gemeinsamer Runderlass zum öffentlichen Auftragswesen (Vergabeerlass) vom 12.6.2026, StAnz. 2026 S. 598 – Land Hessen – https://mobil.hessen.de/sites/mobil.hessen.de/files/2026-07/runderlass_vom_12_06_2026.pdf – Primärquelle – abgerufen 2026-11-09
27. [27] Inkrafttreten von Änderungen der AV zu § 55 LHO (Rundschreiben und Synopse, Sept. 2026) – Senatsverwaltung für Finanzen Berlin – https://www.berlin.de/vergabeservice/vergabeleitfaden/rechtsquellen/bekanntgabe-der-geaenderten-av-lho-vom-18092026.pdf – Primärquelle – abgerufen 2026-11-09
28. [28] Berlin: Änderung AV LHO und Mustervordrucke Direktauftrag (30.9.2026) – Vergabeblog – https://vergabeblog.de/2026-09-30/berlin-aenderung-av-lho-mustervordrucke-direktauftrag/ – Presse (Fachblog) – abgerufen 2026-11-09
29. [29] Vergaberecht Nordrhein-Westfalen (aktualisiert 2.11.2026) – cosinex Blog – https://blog.cosinex.de/2026/06/01/vergaberecht-nordrhein-westfalen/ – Presse (Fachblog eines Anbieters) – abgerufen 2026-11-09
30. [30] Änderungen im Vergaberecht 2026 + Ausblick (Vergabekonferenz 13.1.2026) – Landeshauptstadt Dresden / Ingenieurkammer Sachsen – https://www.dresden.de/media/pdf/wirtschaft/vergabekonferenz/VK-2026-Aktuelle-Entwicklungen-im-Vergaberecht.pdf – Fachvortrag – abgerufen 2026-11-09
31. [31] Wertgrenzen (Übersicht Bund und Länder) – Auftragsberatungsstellen – https://www.auftragsberatungsstellen.de/wertgrenzen – Sekundärquelle (Beratungsstellen) – abgerufen 2026-11-09
32. [32] Das Vergabejahr im Ausblick (5.1.2026) – cosinex Blog – https://blog.cosinex.de/2026/01/05/das-vergabejahr-im-ausblick/ – Presse (Fachblog) – abgerufen 2026-11-09
33. [33] Marktplatz Deutschland – Sachstand (21.8.2026) – cosinex Blog – https://blog.cosinex.de/2026/08/21/marktplatz-deutschland-sachstand/ – Presse (Fachblog) – abgerufen 2026-11-09
34. [34] Public Procurement Act: Kommissionsvorschlag COM(2026) 590 (10.9.2026) – cosinex Blog – https://blog.cosinex.de/2026/09/10/public-procurement-act/ – Presse (Fachblog) – abgerufen 2026-11-09
35. [35] VHB Bund 2017, Lesefassung Stand 2023 (Richtlinien 100, 111, 121–122, 211, 321 u. a.) – Fachinformationsbörse Bund / BMWSB – https://www.fib-bund.de/Inhalt/Vergabe/VHB/VHB_2017_Lesefassung_2023.pdf – Primärquelle – abgerufen 2026-11-09
36. [36] VHB Bund Formblatt-Liste (XLSX) – fib-bund.de – https://www.fib-bund.de/Inhalt/Vergabe/VHB/Formblatt-Liste.xlsx – Primärquelle – abgerufen 2026-11-09
37. [37] VHB 2017 Übersichtsseite (Downloads, Stand) – fib-bund.de – https://www.fib-bund.de/Inhalt/Vergabe/VHB/ – Primärquelle – abgerufen 2026-11-09
38. [38] HOAI Anlage 10 (Leistungsphasen 6 und 7) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/anlage_10.html – Gesetz (Verordnung) – abgerufen 2026-11-09
39. [39] § 5 UrhG (Amtliche Werke) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/urhg/__5.html – Gesetz – abgerufen 2026-11-09
40. [40] XStandards Einkauf – Überblick – KoSIT/xeinkauf.de – https://xeinkauf.de/ueberblick/ – Primärquelle – abgerufen 2026-11-09
41. [41] eForms-DE – KoSIT/xeinkauf.de – https://xeinkauf.de/eforms-de/ – Primärquelle – abgerufen 2026-11-09
42. [42] eForms ersetzen XVergabe (13.1.2023) – cosinex Blog – https://blog.cosinex.de/2023/01/13/eforms-ersetzen-xvergabe/ – Presse (Fachblog) – abgerufen 2026-11-09
43. [43] XVergabe de Luxe – subreport – https://www.subreport.de/subreport/xvergabe-de-luxe/ – Herstellerangabe – abgerufen 2026-11-09
44. [44] subreport ELViS – subreport Verlag Schawe – https://www.subreport.de/evergabe/subreport-elvis/ – Herstellerangabe – abgerufen 2026-11-09
45. [45] Technische Voraussetzungen (E-Vergabe) – subreport – https://www.subreport.de/evergabe/technische-voraussetzungen/ – Herstellerangabe – abgerufen 2026-11-09
46. [46] Webbasierte Angebotsabgabe (18.3.2026) – cosinex Blog – https://blog.cosinex.de/2026/03/18/webbasierte-angebotsabgabe/ – Herstellerangabe – abgerufen 2026-11-09
47. [47] e-Vergabe-Plattform des Bundes – Beschaffungsamt des BMI – https://www.evergabe-online.de/ – Primärquelle (Plattform) – abgerufen 2026-11-09
48. [48] Vergabeplattform vergabe.bayern – Bayerisches Staatsministerium für Wohnen, Bau und Verkehr – https://www.vergabe.bayern.de/ – Primärquelle (Plattform) – abgerufen 2026-11-09
49. [49] Vergabemarktplatz NRW – Land NRW/cosinex – https://www.evergabe.nrw.de/ – Primärquelle (Plattform) – abgerufen 2026-11-09
50. [50] Deutsches Vergabeportal (DTVP) – DTVP Deutsches Vergabeportal GmbH – https://www.dtvp.de/ – Herstellerangabe – abgerufen 2026-11-09
51. [51] Hessische Ausschreibungsdatenbank (HAD) – ABSt Hessen e.V. – https://www.had.de/ – Primärquelle (Plattform) – abgerufen 2026-11-09
52. [52] Vergabeplattform Sachsen – Administration Intelligence AG (Vergabe@Net) – https://www.sachsen-vergabe.de/ – Primärquelle (Plattform, nur Seitentitel) – abgerufen 2026-11-09
53. [53] Vergabeplattform Berlin – Administration Intelligence AG (Vergabe@Net) – https://vergabekooperation.berlin/ – Primärquelle (Plattform, nur Seitentitel) – abgerufen 2026-11-09
54. [54] AI VERGABEMANAGER – Administration Intelligence AG – https://www.ai-ag.de/module-bp/vm – Herstellerangabe – abgerufen 2026-11-09
55. [55] Ausschreibung und Vergabe – NOVA AVA – https://nova-ava.de/funktionen/ausschreibung-und-vergabe/ – Herstellerangabe – abgerufen 2026-11-09
56. [56] Peppol: einheitlicher Zugang zu öffentlichen Aufträgen (8.6.2026) – cosinex Blog – https://blog.cosinex.de/2026/06/08/peppol-einheitlicher-zugang-zu-offentlichen-auftragen/ – Presse (Fachblog) – abgerufen 2026-11-09
57. [57] XRechnung – KoSIT/xeinkauf.de – https://xeinkauf.de/xrechnung/ – Primärquelle – abgerufen 2026-11-09
58. [58] E-Rechnung B2B-Verpflichtung – KoSIT/xeinkauf.de – https://xeinkauf.de/b2b-verpflichtung/ – Primärquelle – abgerufen 2026-11-09
59. [59] E-Rechnungsverordnung (ERechV) des Bundes – gesetze-im-internet.de – https://www.gesetze-im-internet.de/erechv/BJNR355500017.html – Gesetz (Verordnung) – abgerufen 2026-11-09
60. [60] § 14 UStG – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ustg_1980/__14.html – Gesetz – abgerufen 2026-11-09
61. [61] § 27 Abs. 38 UStG – gesetze-im-internet.de – https://www.gesetze-im-internet.de/ustg_1980/__27.html – Gesetz – abgerufen 2026-11-09
62. [62] ZUGFeRD/Factur-X (Version 2.5.2 vom 4.8.2026) – Forum elektronische Rechnung Deutschland (FeRD) – https://www.ferd-net.de/standards/zugferd – Primärquelle (Standardisierungsgremium) – abgerufen 2026-11-09
63. [63] § 3 VgV (Schätzung des Auftragswerts) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/vgv_2016/__3.html – Gesetz (Verordnung) – abgerufen 2026-11-09
64. [64] Bekanntmachung der Änderung der VOB/A Abschnitt 1 vom 15.12.2025, BAnz AT 16.12.2025 B7 (nur § 3a neu gefasst; Basis: Fassung vom 31.1.2019, BAnz AT 19.02.2019 B2, zuletzt geändert BAnz AT 02.04.2025 B7) – umwelt-online (Normtextwiedergabe) – https://www.umwelt-online.de/recht/bau/161225b7.htm – Primärtext über Sekundärseite – abgerufen 2026-11-09
65. [65] Bekanntmachung der Änderung der VOB/A Abschnitt 1 vom 11.3.2025, BAnz AT 02.04.2025 B7 (§ 3a, befristete Wertgrenzen bis 31.12.2025) – umwelt-online (Normtextwiedergabe) – https://umwelt-online.de/recht/bau/020425b7.htm – Primärtext über Sekundärseite – abgerufen 2026-11-09
66. [66] California-Modul EVC (E-Vergabe Connect): LV auf E-Vergabe-Plattform bereitstellen, Angebote nach der Submission automatisch zurückübertragen; direkte Anbindung an den AI-Vergabemanager – G&W Software AG – https://www.gw-software.de/california/module/evc – Herstellerangabe – abgerufen 2026-11-09
67. [67] RIB iTWO AVA-Software, Kosten- und Bauprojektmanagement („AVA und eVergabe digital integriert“) – RIB Software GmbH – https://www.rib-software.com/de/rib-itwo/ava-software – Herstellerangabe – abgerufen 2026-11-09
68. [68] RIB iTWO e-Vergabe public in neuer Version 5.2 (Produktinformation, PDF, 2021) – RIB Software GmbH – https://www.rib-software.com/pdf/de/rib-e-vergabe-2021.pdf – Herstellerangabe – abgerufen 2026-11-09
69. [69] Pressemitteilung „Online-Planertag 2026“ (15.05.2026; RIB TenderConnect, Nachunternehmernetzwerk) – RIB Software GmbH – https://www.rib-software.com/de/news/rib-planertag-2026 – Herstellerangabe – abgerufen 2026-11-09
