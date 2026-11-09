---
type: Research Note
title: Kostenplanung nach DIN 276 und Kostenkontrolle im Hochbau
description: Wie Baukosten nach DIN 276 (mit DIN 277 als Mengenbasis) geplant, gegliedert, fortgeschrieben und kontrolliert werden, welche Kostendaten und GAEB-Kostenphasen es gibt und was daraus für das Datenmodell einer offenen AVA-Software folgt.
resource: https://www.dinmedia.de/de/norm/din-276/293154016
tags: [research, din-276, din-277, kostenplanung, kostenkontrolle, baupreisindex, datenmodell]
timestamp: 2026-11-09T17:16:17Z
sources: 63
confidence: mittel
---

# Kostenplanung nach DIN 276 und Kostenkontrolle im Hochbau

## Kurzfassung

- **DIN 276:2018-12 „Kosten im Bauwesen“ ist die aktuelle Fassung** (DIN Media führt sie am 2026-11-09 als „aktuell“, 56 Seiten). Sie hat DIN 276-1:2008-12 (Hochbau), DIN 276-4:2009-08 (Ingenieurbau) und DIN 277-3:2005-04 ersetzt. Einen Entwurf oder eine Neuausgabe habe ich nicht gefunden [1][2][4].
- **Die HOAI verweist für die anrechenbaren Kosten weiterhin auf DIN 276-1:2008-12** (§ 4 Abs. 1 HOAI). Anrechenbare Kosten sind die Kosten, nach denen sich das Architektenhonorar richtet. Eine Software braucht deshalb beide Kostengruppen-Kataloge und eine Zuordnungstabelle (Mapping) zwischen ihnen [10][6][8].
- **Gliederung:** Die Kosten werden in acht Kostengruppen (KG) der 1. Ebene geordnet (100 bis 800), dreistellig und über drei Ebenen. KG 300 und KG 400 ergeben zusammen die Bauwerkskosten. 2018 kamen u. a. KG 370 „Infrastrukturanlagen“, KG 630 „Informationstechnische Ausstattung“ und KG 800 „Finanzierung“ hinzu. Dazu gab es viele Umnummerierungen, z. B. 576 → 363 und 735 → 741 [3][8].
- **Sechs Stufen der Kostenermittlung:** Kostenrahmen, Kostenschätzung (mindestens 2. Ebene), Kostenberechnung (mindestens 3. Ebene), Kostenvoranschlag (2018 neu, entspricht dem bepreisten Leistungsverzeichnis), Kostenanschlag (wird mehrfach fortgeschrieben) und Kostenfeststellung [4][5][36]. Grundleistungen der HOAI, also Pflichtleistungen des Planers, sind davon nur Kostenschätzung (Leistungsphase 2), Kostenberechnung (LPH 3), „bepreiste LV“ mit Kostenkontrolle (LPH 6) und Kostenfeststellung (LPH 8) [14].
- **Zwei Sichten auf dieselben Kosten:** Die Planung denkt in Bauteilen (Kostengruppen), die Vergabe in Gewerken (Leistungsbereiche, Vergabeeinheiten). Fachleute nennen den Übergang „Systembruch“. Gute Software führt jede LV-Position (LV = Leistungsverzeichnis) in beiden Sichten. Eine Position kann sich dabei prozentual oder mengenanteilig auf mehrere KG verteilen, und die Summen beider Sichten müssen übereinstimmen [27][28][29][48].
- **Kostenkontrolle in der Praxis** folgt pro Vergabeeinheit der Kette Budget → Kostenberechnung → bepreistes LV → Angebote → Auftrag → Nachträge → Abrechnung → Prognose. Feste Zwischenstände (Snapshots) machen den Kostenverlauf nachvollziehbar [24][29].
- **Risiken und Preissteigerungen gehören gesondert ausgewiesen.** Der Entwurf von 2017 zur heutigen DIN 276:2018-12 verlangte das (den Wortlaut der Endfassung haben wir nicht geprüft; ein neuerer Entwurf wurde nicht gefunden, siehe oben), und die RBBau (Richtlinien des Bundes, Ausgabe 15.07.2026) setzt es mit dem „Projektkostenziel“ und einem Risikoregister konkret um [7][63].
- **Umsatzsteuer:** Die Kosten dürfen brutto oder netto angegeben werden, die gewählte Form muss aber genannt sein. Anrechenbare Kosten nach HOAI sind netto. BKI-Kostenkennwerte sind brutto, und Destatis veröffentlicht den Baupreisindex einschließlich Mehrwertsteuer [20][10][37][39].
- **Mengenbasis ist DIN 277:2021-08** mit BGF, BRI, NUF, NRF, KGF usw. und den Kennzeichen R/S. Für eine Kostenschätzung auf der 2. Ebene reichen laut BKI etwa 7 Mengen, für die 3. Ebene etwa 15 bis 25 Mengen [58][36].
- **Indexierung:** Destatis-Baupreisindex für Wohngebäude, Basis 2021 = 100, Stand August 2026: 141,7 und +5,5 % zum Vorjahr. Die GENESIS-Daten stehen unter „Datenlizenz Deutschland – Namensnennung 2.0“ und dürfen in Open Source verwendet werden [39][33][43].
- **Kostendaten:** BKI (Statistik aus abgerechneten Objekten), sirAdos (aus Angebotspreisen), DBD (aus Musterkalkulationen), RM „Baupreise online“ (99 €/Jahr) und NOVA „Neo“ (KI, Beta 2026) sind alle proprietär, also lizenzpflichtig und nicht weitergebbar. Frei verfügbar sind Destatis-Indizes, die NHK 2010 und eigene Kostenfeststellungen [35][56][54][57][50].
- **GAEB-Kostenphasen** (GAEB = Standard für den Austausch von Bau-Ausschreibungsdaten) gibt es: X50 Baukostenkatalog, X51 Kostenermittlung, X52 Kalkulationsansätze bzw. -daten (DA XML 3.3; die Beta von 3.4 ändert daran fachlich nichts). X51 kennt aber nur vier der sechs Stufen. X82 heißt „Kostenanschlag“, ist inhaltlich aber das bepreiste LV [46][47][48][49].

## 1. Grundbegriffe für Nicht-Architekten

| Begriff | Bedeutung (eigene Worte) |
|---|---|
| **Kostenplanung** | Oberbegriff für alles, was Baukosten vorab ermittelt, überwacht und beeinflusst. Er umfasst Kostenermittlung, Kostenkontrolle und Kostensteuerung [2][24]. |
| **Kostenermittlung** | Eine Vorausberechnung bzw. am Ende die Feststellung der Kosten zu einem bestimmten Planungsstand („Stufe“) [2][47]. |
| **Kostengruppe (KG)** | Dreistellige Ordnungszahl der DIN 276. Beispiele: 300 = Baukonstruktionen, 330 = Außenwände, 331 = tragende Außenwände [3][8]. |
| **Bauwerkskosten** | Summe aus KG 300 und KG 400. Auf diese Größe beziehen sich die meisten Kennwerte [28][36]. |
| **Kostenkennwert (KKW)** | Kosten je Bezugseinheit, z. B. €/m² BGF oder €/m² Außenwandfläche [28][36]. |
| **Bezugseinheit / Menge** | Die Größe, auf die ein Kennwert bezogen ist. Flächen und Rauminhalte richten sich nach DIN 277, Bauteilmengen nach DIN 276 Abschnitt 6 [2][58]. |
| **Leistungsbereich (LB)** | Gewerk nach STLB-Bau, z. B. LB 001 Gerüstarbeiten. Nach Leistungsbereichen ist ein Leistungsverzeichnis gegliedert [35]. Siehe [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md). |
| **Vergabeeinheit (VE)** | Paket, das getrennt vergeben wird und einen eigenen Vertrag ergibt (ein Los bzw. ein Auftrag). Zu einer VE gehören 1 bis n Nachträge [25]. |
| **Kostenvorgabe** | Vom Bauherrn festgelegte Obergrenze oder Zielgröße für die Kosten [7][24]. |
| **Kostenkontrolle / Kostensteuerung** | Kostenkontrolle vergleicht aktuelle Ermittlungen mit früheren Ermittlungen und mit der Vorgabe. Kostensteuerung greift gezielt ein, damit die Vorgabe eingehalten wird [24]. |
| **Anrechenbare Kosten** | Kostenbasis für das Honorar nach HOAI. Sie sind netto, die Umsatzsteuer gehört nicht dazu [10]. |

## 2. DIN 276: Status, Zweck, Grundsätze

### 2.1 Ausgaben und Status

| Ausgabe | Inhalt / Bedeutung |
|---|---|
| 1934 bis 2006 | Ältere Fassungen. GAEB kennt noch Kataloge für „DIN 276-81“, „-93“ und „-06“, was für den Import alter Projektdaten wichtig ist [3][48]. |
| DIN 276-1:2008-12 (Hochbau), DIN 276-4:2009-08 (Ingenieurbau) | Sind seit Dezember 2018 ersetzt. **Die HOAI 2009, 2013 und 2021 verweisen für die anrechenbaren Kosten trotzdem weiterhin auf 2008-12** [3][10]. |
| **DIN 276:2018-12** | **Aktuell** (DIN Media, abgerufen 2026-11-09). 56 Seiten statt bisher 26, Preis 143,40 € inkl. USt (PDF). Gilt für Hochbau, Ingenieurbau, Infrastruktur und Freianlagen; DIN 277-3 ist als Abschnitt 6 „Mengen und Bezugseinheiten“ mit Tabellen eingeflossen [1][4]. |

Gliederung der Norm laut Inhaltsverzeichnis [2]: 4 Grundsätze der Kostenplanung (4.2 Kostenermittlung, 4.3 Stufen, 4.4 Kostenkontrolle, 4.5 Kostensteuerung, 4.6 Kostenvorgabe), 5 Kostengliederung (5.3 ausführungsorientierte Gliederung, 5.4 Darstellung als Tabelle) und 6 Mengen und Bezugseinheiten (6.3 für KG 300, 6.4 für KG 400).

**HOAI-Bezug:** Nach Darstellung der Bayerischen Architektenkammer (ByAK) ist eine automatische Übernahme von DIN 276:2018-12 in die HOAI ausgeschlossen. Im Ergebnis entstünden aber keine anderen anrechenbaren Kosten [4][6]. Die seit Jahren erwartete HOAI-Novelle war im Mai 2026 noch nicht verabschiedet. Ob sie auf die Fassung 2018 umstellen wird, ist offen [17][18]. Details zur HOAI stehen in [HOAI/VOB](/okf/research/standards/hoai-vob-b-c.md).

### 2.2 Grundsätze mit Software-Relevanz

- **Gesamtkosten vollständig erfassen.** Was sich nicht ermitteln lässt, muss an der betreffenden Stelle benannt und gekennzeichnet werden [5].
- **Ziele:** Neben Wirtschaftlichkeit gelten seit 2018 ausdrücklich Kostensicherheit und Kostentransparenz [5].
- **Mehrere Bauwerke oder Bauabschnitte** bekommen jeweils getrennte Kostenermittlungen. So stand es im Entwurf 4.2.8; nach bauprofessor gilt das sinngemäß auch für die Endfassung [7][20].
- **Leistungen, die der Bauherr selbst stellt** (Beistellungen, Eigenleistungen), sowie Kosten durch besondere Standortbedingungen werden gesondert ausgewiesen [20]. Für das Honorar setzt die HOAI dafür ortsübliche Preise an (§ 4 Abs. 2) [10].
- **Umsatzsteuer (Tz. 4.2.15):** Angabe brutto oder netto, die gewählte Form muss genannt werden (siehe Abschnitt 7) [20].
- **Risikobedingte Kosten:** siehe Abschnitt 4.3.

## 3. Kostengliederung (Kostengruppen)

### 3.1 Erste und zweite Ebene (DIN 276:2018-12)

Nummern und Bezeichnungen nach [3][8]; die Kurzbeschreibungen sind eigene Worte.

| KG | Bezeichnung | 2. Ebene |
|---|---|---|
| 100 | Grundstück | 110 Grundstückswert, 120 Grundstücksnebenkosten, 130 Rechte Dritter |
| 200 | Vorbereitende Maßnahmen (bis 2008: „Herrichten und Erschließen“) | 210 Herrichten, 220 Öffentliche Erschließung, 230 Nichtöffentliche Erschließung, 240 Ausgleichsmaßnahmen und -abgaben, 250 Übergangsmaßnahmen |
| 300 | Bauwerk – Baukonstruktionen | 310 Baugrube/Erdbau, 320 Gründung, Unterbau, 330 Außenwände/Vertikale Baukonstruktionen, außen, 340 Innenwände/Vertikale Baukonstruktionen, innen, 350 Decken/Horizontale Baukonstruktionen, 360 Dächer, 370 Infrastrukturanlagen, 380 Baukonstruktive Einbauten, 390 Sonstige Maßnahmen für Baukonstruktionen |
| 400 | Bauwerk – Technische Anlagen (TGA = technische Gebäudeausrüstung) | 410 Abwasser-, Wasser-, Gasanlagen, 420 Wärmeversorgungsanlagen, 430 Raumlufttechnische Anlagen, 440 Elektrische Anlagen, 450 Kommunikations-, sicherheits- und informationstechnische Anlagen, 460 Förderanlagen, 470 Nutzungsspezifische und verfahrenstechnische Anlagen, 480 Gebäude- und Anlagenautomation, 490 Sonstige Maßnahmen für technische Anlagen |
| 500 | Außenanlagen und Freiflächen | 510 Erdbau, 520 Gründung, Unterbau, 530 Oberbau, Deckschichten, 540 Baukonstruktionen, 550 Technische Anlagen, 560 Einbauten in Außenanlagen und Freiflächen, 570 Vegetationsflächen, 580 Wasserflächen, 590 Sonstige Maßnahmen für Außenanlagen und Freiflächen |
| 600 | Ausstattung und Kunstwerke | 610 Allgemeine Ausstattung, 620 Besondere Ausstattung, 630 Informationstechnische Ausstattung, 640 Künstlerische Ausstattung, 690 Sonstige Ausstattung |
| 700 | Baunebenkosten | 710 Bauherrenaufgaben, 720 Vorbereitung der Objektplanung, 730 Objektplanung, 740 Fachplanung, 750 Künstlerische Leistungen, 760 Allgemeine Baunebenkosten, 790 Sonstige Baunebenkosten |
| 800 | Finanzierung (2018 neu als eigene 1. Ebene) | 810 Finanzierungsnebenkosten, 820 Fremdkapitalzinsen, 830 Eigenkapitalzinsen, 840 Bürgschaften, 890 Sonstige Finanzierungskosten |

Die Endziffer 9 steht durchgehend für „Sonstiges zur KG …“. Die Nummerierung ist nicht lückenlos, auf der 2. Ebene fehlen z. B. 650 bis 680 und 770/780 [3][8].

### 3.2 Dritte Ebene für KG 300 und KG 400

Nummern und Bezeichnungen nach der Gegenüberstellung von WEKA/SIRADOS [8]:

| 2. Ebene | 3. Ebene (DIN 276:2018-12) |
|---|---|
| 310 | 311 Herstellung, 312 Umschließung, 313 Wasserhaltung, 314 Vortrieb (neu) |
| 320 | 321 Baugrundverbesserung, 322 Flachgründungen und Bodenplatten, 323 Tiefgründungen, 324 Gründungsbeläge, 325 Abdichtungen und Bekleidungen, 326 Dränagen |
| 330 | 331 Tragende Außenwände, 332 Nichttragende Außenwände, 333 Außenstützen, 334 Außenwandöffnungen, 335 Außenwandbekleidungen, außen, 336 Außenwandbekleidungen, innen, 337 Elementierte Außenwandkonstruktionen, 338 Lichtschutz zur KG 330 |
| 340 | 341 Tragende Innenwände, 342 Nichttragende Innenwände, 343 Innenstützen, 344 Innenwandöffnungen, 345 Innenwandbekleidungen, 346 Elementierte Innenwandkonstruktionen, 347 Lichtschutz zur KG 340 |
| 350 | 351 Deckenkonstruktionen, 352 Deckenöffnungen (neu), 353 Deckenbeläge, 354 Deckenbekleidungen, 355 Elementierte Deckenkonstruktionen |
| 360 | 361 Dachkonstruktionen, 362 Dachöffnungen, 363 Dachbeläge, 364 Dachbekleidungen, 365 Elementierte Dachkonstruktionen, 366 Lichtschutz zur KG 360 |
| 370 | 371 bis 378: Anlagen für Straßen-, Schienen- und Flugverkehr, Wasserbau, Abwasserentsorgung, Wasserversorgung, Energie- und Informationsversorgung, Abfallentsorgung |
| 380 | 381 Allgemeine Einbauten, 382 Besondere Einbauten, 383 Landschaftsgestalterische Einbauten, 384 Mechanische Einbauten, 385 Einbauten in Konstruktionen des Ingenieurbaus, 386 Orientierungs- und Informationssysteme, 387 Schutzeinbauten |
| 390 / 490 / 590 | x91 Baustelleneinrichtung, x92 Gerüste, x93 Sicherungsmaßnahmen, x94 Abbruchmaßnahmen, x95 Instandsetzungen, x96 Materialentsorgung, x97 Zusätzliche Maßnahmen, x98 Provisorische … |
| 410 | 411 Abwasseranlagen, 412 Wasseranlagen, 413 Gasanlagen |
| 420 | 421 Wärmeerzeugungsanlagen, 422 Wärmeverteilnetze, 423 Raumheizflächen, 424 Verkehrsheizflächen (neu) |
| 430 | 431 Lüftungsanlagen, 432 Teilklimaanlagen, 433 Klimaanlagen, 434 Kälteanlagen |
| 440 | 441 Hoch- und Mittelspannungsanlagen, 442 Eigenstromversorgungsanlagen, 443 Niederspannungsschaltanlagen, 444 Niederspannungsinstallationsanlagen, 445 Beleuchtungsanlagen, 446 Blitzschutz- und Erdungsanlagen, 447 Fahrleitungssysteme (neu) |
| 450 | 451 Telekommunikationsanlagen, 452 Such- und Signalanlagen, 453 Zeitdienstanlagen, 454 Elektroakustische Anlagen, 455 Audiovisuelle Medien- und Antennenanlagen, 456 Gefahrenmelde- und Alarmanlagen, 457 Datenübertragungsnetze, 458 Verkehrsbeeinflussungsanlagen |
| 460 | 461 Aufzugsanlagen, 462 Fahrtreppen, Fahrsteige, 463 Befahranlagen, 464 Transportanlagen, 465 Krananlagen, 466 Hydraulikanlagen (neu) |
| 470 | 471 Küchentechnische Anlagen, 472 Wäscherei-, Reinigungs- und badetechnische Anlagen, 473 Medienversorgungsanlagen, Medizin- und labortechnische Anlagen, 474 Feuerlöschanlagen, 475 Prozesswärme-, kälte- und -luftanlagen, 476 Weitere nutzungsspezifische Anlagen, 477/478 Verfahrenstechnische Anlagen (neu) |
| 480 | 481 Automationseinrichtungen, 482 Schaltschränke, Automationsschwerpunkte, 483 Automationsmanagement, 484 Kabel, Leitungen und Verlegesysteme, 485 Datenübertragungsnetze |

Eine **4. Ebene oder tiefer** sieht die Norm nicht vor. Projekte, Software und Datenanbieter gliedern dort mit eigenen Strukturen weiter, z. B. mit BKI-„Elementarten“ (Abschnitt 6) [28][37].

### 3.3 Wechsel 2008 → 2018: Was ein Mapping leisten muss

Auswahl aus der Gegenüberstellung in [8]:

| DIN 276-1:2008-12 | DIN 276:2018-12 | Art der Änderung |
|---|---|---|
| 124 Maklerprovisionen | 129 Sonstiges zur KG 120 | aufgelöst |
| 126 Wertermittlungen, Untersuchungen | 125 Untersuchungen + 126 Wertermittlungen | **geteilt** |
| 324 Unterböden und Bodenplatten | 322 Flachgründungen und Bodenplatten | **zusammengelegt** |
| 325 Bodenbeläge / 326 Bauwerksabdichtungen / 327 Dränagen | 324 / 325 / 326 | umnummeriert |
| 352 Deckenbeläge, 353 Deckenbekleidungen | 353, 354 (neu: 352 Deckenöffnungen) | umnummeriert |
| 370 Baukonstruktive Einbauten | 380 (neu: 370 Infrastrukturanlagen) | umnummeriert |
| 474 Medizin- und labortechnische Anlagen / 476 Badetechnische Anlagen | 473 / 472 | zusammengelegt |
| 484 Raumautomationssysteme | 481 Automationseinrichtungen | zusammengelegt |
| 520 Befestigte Flächen … (gesamte KG 500) | 530 Oberbau, Deckschichten … | 2. und 3. Ebene neu strukturiert |
| 576 Begrünung unterbauter Flächen | 363 Dachbeläge | **wechselt die 1. Ebene (500 → 300)** |
| 611/612 Allgemeine/Besondere Ausstattung (3. Ebene) | 610/620 (2. Ebene) | **wechselt die Ebene** |
| 735 Tragwerksplanung | 741 (jetzt Fachplanung) | umgruppiert |
| 747 Sicherheits- und Gesundheitsschutz | 714 SiGe-Koordination | umgruppiert |
| 760 Finanzierungskosten | 800 Finanzierung (neu 840 Bürgschaften) | neue 1. Ebene |
| 770 Allgemeine Baunebenkosten | 760 (neu 761 Gutachten und Beratung) | umnummeriert |

**Folgerung:** Das Mapping ist n:m. Manche Zuordnungen sind eindeutig, manche müssen aufgeteilt werden, manche brauchen eine manuelle Entscheidung. Laut Hersteller führt SIRADOS die alten KG in seinen Baudaten parallel weiter, weil die HOAI auf 2008 verweist [8].

## 4. Stufen der Kostenermittlung, Kontrolle, Steuerung, Vorgabe, Risiko

### 4.1 Die sechs Stufen und ihr Bezug zur HOAI

LPH = Leistungsphase nach HOAI, Anlage 10 (Gebäude) [14].

| Stufe (DIN 276:2018-12) | Grundlage / Zeitpunkt | LPH | HOAI-Status | Mindesttiefe | Häufigkeit | Toleranz laut Literatur* |
|---|---|---|---|---|---|---|
| **Kostenrahmen** | Bedarfsplanung (DIN 18205), Mengen- und Qualitätsangaben zum Bedarf | 0/1 [3] | keine Grundleistung. Das BGB verlangt aber eine „Kosteneinschätzung“ zur Planungsgrundlage (§ 650p Abs. 2) [16] | Fassung 2008: Gesamtkosten, darin mindestens die Bauwerkskosten gesondert [29]. BKI liefert dafür Werte der 1. Ebene [36]. Wortlaut 2018 nicht geprüft | einmalig [5] | – |
| **Kostenschätzung** | Vorplanung, Mengen nach DIN 277 [19] | 2 | Grundleistung mit Abgleich gegen den Finanzrahmen [14]. § 2 Abs. 10 HOAI: mindestens 1. Ebene (nach 2008) [11]. TGA: 2. Ebene [15] | **2. Ebene** (bis 2008: 1. Ebene) [4][5] | einmalig | ±30 % [28]; < 30 % [19] |
| **Kostenberechnung** | Entwurfsplanung | 3 | Grundleistung mit Vergleich zur Kostenschätzung [14]. § 2 Abs. 11: mindestens 2. Ebene [11]. TGA: 3. Ebene [15]. Sie ist die Honorarbasis (§ 6) [12] | **3. Ebene** (bis 2008: 2. Ebene) [4][5] | einmalig | ±20 % [28]; 10–20 % [20] |
| **Kostenvoranschlag** (neu 2018) | Ausführungsplanung und Vorbereitung der Vergabe, also bepreiste LV | 5/6 [3][4] | Den Begriff kennt die HOAI nicht. LPH 6 verlangt aber, die Kosten aus vom Planer bepreisten LV zu ermitteln und mit der Kostenberechnung zu vergleichen [14][5] | 3. Ebene, darunter nach technischen bzw. herstellungsbezogenen Merkmalen, **geordnet nach Vergabeeinheiten** [36][21] | einmal oder in Schritten [5] | ±5 bis max. 12 % [21] |
| **Kostenanschlag** | Angebote, Aufträge, Rechnungen, geprüfte Mengen | 7/8 | seit HOAI 2013 keine Grundleistung mehr; laut Begründung durch die bepreisten LV „entbehrlich“ [36]. LPH 7: Ergebnisse der Ausschreibung mit bepreistem LV bzw. Kostenberechnung vergleichen [14] | 3. Ebene, nach den im Kostenvoranschlag festgelegten VE [22] | **immer mehrstufig** [5] | ±5 bis max. 10 % [22] |
| **Kostenfeststellung** | geprüfte Schlussrechnungen, Beistellungen, Abrechnungszeichnungen [23] | 8 | Grundleistung „Kostenfeststellung, z. B. nach DIN 276“ [14] | 3. Ebene oder nach Struktur des Kostenanschlags bzw. der VE [23] | einmalig | 0 % |

\*Die Toleranzwerte stammen aus Literatur und Fachportalen. Weder Norm noch Gesetz legen sie fest; vertraglich und gerichtlich zählt der Einzelfall [28].

Hinweise zur Tabelle:

- Die Mindesttiefen der Fassung 2018 haben Mitglieder des Normausschusses in Kammerbeiträgen übereinstimmend beschrieben [4][5]. Die BAK hatte die höheren Tiefen im Entwurf als Mehraufwand für Planer kritisiert [7].
- Bauprofessor nennt den Kostenanschlag noch als Grundleistung in LPH 7 [22]. Das entspricht dem Stand vor der HOAI 2013 und ist veraltet [36][14].
- Die BAK wies darauf hin, dass ein bepreistes LV ein **Verfahren** ist und keine eigene Kostenstufe [7].
- **GAEB X51 kennt nur vier Stufen** (Kostenschätzung, -berechnung, -anschlag, -feststellung) [47]. Für Kostenrahmen und Kostenvoranschlag gibt es dort kein eigenes Kennzeichen (siehe Abschnitt 12).

### 4.2 Kostenkontrolle, Kostensteuerung, Kostenvorgabe (DIN 276, 4.4 bis 4.6)

- **Kostenkontrolle** überwacht die Kostenentwicklung. Sie vergleicht aktuelle Ermittlungen laufend mit früheren Ermittlungen und mit der Kostenvorgabe und ist die Grundlage der Steuerung [24].
- **Kostensteuerung** greift gezielt ein, damit die Vorgabe eingehalten wird. Ausgangspunkt sind die Abweichungen, die die Kontrolle aufgedeckt hat [24].
- **Kostenvorgabe** ist eine Obergrenze oder eine Zielgröße, so die Definitionen im Normentwurf [7]. Bauprofessor nennt als Zweck: Kosten begrenzen, Kostensicherheit erhöhen, Investitionsrisiken senken und früh über Alternativen nachdenken [24]. Die BAK hielt den Kostenrahmen für zu unsicher, um daraus eine Kostenvorgabe abzuleiten [7].
- **Öffentliche Bauherren des Bundes:** Die RBBau macht das **„Projektkostenziel“** zur maßgeblichen Steuerungsgröße. Ein vorläufiges Ziel wird mit der Initialen Projektunterlage (IPU, Stufe Kostenrahmen) gesetzt, ein verbindliches mit der Finalen Projektunterlage (FPU, Stufe Kostenberechnung). Alle Änderungen kommen in ein Änderungsregister [63].

### 4.3 Risiko- und Preissteigerungsanteile („Risikobudget“)

- **DIN 276:** Der Entwurf von 2017 (4.2.13) verlangte, Kosten aus Unsicherheiten und Unwägbarkeiten an den betreffenden Stellen der Kostengliederung gesondert auszuweisen. Ermittlung und Zuordnung (auf KG oder auf die Gesamtkosten) sollten sich nach dem projektbezogenen Risikomanagement richten. Die Fassung 2008 hatte dagegen nur empfohlen, vorhersehbare Risiken nach Art, Umfang und Eintrittswahrscheinlichkeit zu benennen [7]. Laut DAB wurden die Regeln zu risikobedingten Kosten 2018 „präzisiert“ [5]. **Den endgültigen Wortlaut habe ich nicht prüfen können**, weil der Normtext kostenpflichtig ist.
- **RBBau, Ausgabe 15.07.2026, C.8:** Das Projektkostenziel setzt sich aus fünf Teilen zusammen, die jeweils gesondert auszuweisen sind [63]:
  - (a) Baukosten KG 200 bis 600,
  - (b) Baunebenkosten KG 700,
  - (c) prognostizierte Baukostensteigerungen,
  - (d) einzeln aufgeführte Risiken mit sehr hoher Eintrittswahrscheinlichkeit. Sie werden veranschlagt, aber erst freigegeben, wenn das Risiko eintritt;
  - (e) weitere begründete Risikokosten. Bei Einzelveranschlagung dürfen sie nur veranschlagt werden, wenn sie nach § 22 BHO gesperrt sind; die Freigabe nach § 36 BHO beantragt der Bauherr beim BMF.
- Dazu gehört ein **Risikoregister** mit Priorität, Eintrittswahrscheinlichkeit, Maßnahmen und Verantwortlichen, das laufend überwacht wird [63].
- Einschätzung: Für öffentliche Auftraggeber ist das eine sehr konkrete Datenstruktur, die eine AVA-Software abbilden kann. Für Privatkunden reicht wahrscheinlich eine einfache Position „Risiko/Unvorhergesehenes“ mit Begründung.

## 5. Gliederung nach Kostengruppen vs. ausführungsorientierte Gliederung

### 5.1 Das Problem („Systembruch“)

Planung und Bauausführung ordnen dieselben Kosten unterschiedlich:

- **Planung:** nach Bauteilen bzw. Kostengruppen, z. B. „353 Deckenbeläge“.
- **Ausschreibung und Vergabe:** nach Gewerken (Leistungsbereiche nach STLB-Bau bzw. VOB/C) und Verträgen (Vergabeeinheiten).

Ein Bauteil zerfällt dabei oft in mehrere Gewerke. Beispiel aus [28], mit der KG-Nummer nach 2018 [8]: Ein Deckenbelag aus schwimmendem Estrich und Betonwerkstein gehört zu einer KG, landet aber in zwei Vergabeeinheiten (Estricharbeiten und Betonwerksteinarbeiten). In der Literatur heißen die Ebenen unterhalb der 3. KG-Ebene „Ausführungsklasse“ oder „Ausführungsart“ [28].

- **DIN 276 lässt eine ausführungsorientierte Gliederung zu**, wenn der Einzelfall es erlaubt oder erfordert, typisch bei Modernisierungen. Dafür werden die KG der 1. Ebene nach Leistungsbereichen unterteilt, etwa nach STLB-Bau [26][3]. In der Fassung 2018 steht das in Abschnitt 5.3 [2].
- **Ordnung nach Vergabeeinheiten:** Der Entwurf verschärfte die bisherige Empfehlung („ab Kostenanschlag sollten …“) zu einer Pflicht ab dem Kostenvoranschlag [7]. BKI und bauprofessor beschreiben das ebenso für die Endfassung [36][21][22]. Wikipedia nennt dagegen nur Kostenanschlag und Kostenfeststellung [3].
- **Abschluss:** Laut Rösch (IWW) müssen die Summen beider Sichten übereinstimmen, weil sie aus denselben Einzelwerten gerechnet werden. Das Büro sollte die Gliederungstiefe beider Systeme als Standard festlegen und Nachträge nach Ursache getrennt ausweisen [27].

### 5.2 Wie Software LV-Positionen Kostengruppen zuordnet (beobachtete Muster)

| Muster | Beispiel / Beleg |
|---|---|
| Eine KG je Position | übliches Feld „Kostengruppe“ an der Position [29]. GAEB-Katalogzuordnung Typ „Unique“ [48] |
| **Aufteilung einer Position auf mehrere KG**, prozentual oder nach Mengenanteil | GAEB `CtlgAssignType` = Unique, Multi, Percentaged, Absolute, PctAbs; Mengenanteil je Zuordnung [48]. ORCA nennt das „Mengensplitting“ und vergibt KG je Teilmenge einer Mengenermittlung [29]. GAEB X31 erlaubt eine Katalogzuordnung je Aufmaßzeile [47] |
| Mehrere parallele Kostengliederungen je Projekt | ORCA bietet neben DIN 276 frei benennbare „Kontenrahmen“, z. B. Neubau/Umbau oder förderfähig/nicht förderfähig, je nach Edition bis zu 5 bzw. 10 [29]. NOVA AVA erlaubt seit 2025 mehrere Kostenanalysen, z. B. nach DIN 276 und nach Gewerken [51] |
| Zuordnung über Elemente mit „Rezepturen“ | Das Element trägt die KG, die zugehörigen Positionen der Leistungsbereiche erben sie (BKI AVA Elemente, GAEB X50) [38][47] |
| Zuordnung aus dem BIM-Modell | BKI IFC-Mengenermittler mit eigenen Regeln zur automatischen KG-Zuordnung [35]. DBD-BIM über den „DBD-BIM-Key“ [52]. Mehr dazu in [BIM und AVA](/okf/research/standards/bim-and-ava.md) |
| Vorschlag durch KI | NOVA „Neo“ schlägt laut Hersteller für jede Position die KG vor und markiert KI-Ergebnisse farbig [50] |
| Prüfroutinen | ORCA listet „Einträge ohne bzw. mit falscher Kostengruppe“, damit KG-Sicht und Gewerke-Sicht synchron bleiben [29] |

## 6. Ermittlungsmethoden: Kennwert, Element, Position

| Methode | Bezugsgrößen | typische Stufe | Bemerkung |
|---|---|---|---|
| **Einwertverfahren** (eine Bezugsgröße) | m³ BRI, m² BGF, m² NUF, je Nutzeinheit | Kostenrahmen, grobe Kostenschätzung | schnell, aber ungenau [28][36] |
| **Kostenflächenarten-Methode** | Flächenarten mit Kostenkennwerten | Schätzung, Berechnung | planungsorientiertes Verfahren, Grundlage der „Richtlinien für die Baukostenplanung“ (RBK) [28][63] |
| **Grobelemente (2. Ebene)** | Mengen von KG 310 bis 360 plus BGF, also etwa 7 Mengen | Kostenschätzung | BKI empfiehlt die 2. Ebene schon ab ersten Skizzen [36] |
| **Elemente (3. Ebene)** | etwa 15 bis 25 Mengen; KG 380, 390 und 410 bis 490 nur je m² BGF | Kostenberechnung | BKI „Bauelemente“ [36] |
| **Elementarten / Ausführungsarten** | eigene Bezugseinheit je Elementart, mit Anteilen der Leistungsbereiche | Kostenberechnung → Kostenvoranschlag | BKI: 5-stellige Nummer aus 3-stelliger KG plus 2-stelliger Ordnungszahl; die LB-Anteile dienen als Richtwert für die Umstellung auf eine vergabeorientierte Gliederung [37] |
| **Gewerke- bzw. LB-Schätzung** | Summen je Leistungsbereich | ab LPH 3 | ORCA „Gewerkeschätzung“ [29]. BKI teilt Bauwerkskosten prozentual auf LB auf („Budgetierung“), was ein Positions-LV aber nicht ersetzt [36] |
| **Positionen (bepreistes LV)** | Mengen und Einheitspreise je Teilleistung | Kostenvoranschlag, Kostenanschlag | entspricht GAEB X82 [47]; Preise mit von/mittel/bis-Spannen [36] |

**Elementmethode:** Das Bauwerk wird in Bauelemente zerlegt. Für jedes Element wird die Menge mit einem Kennwert multipliziert, der bei Bedarf über Baupreisindex und Regionalfaktor angepasst wird; die Summe ergibt die Bauwerkskosten [28]. Laut ORCA lohnen Bauelemente vor allem bei standardisierbaren Bauaufgaben wie Hallenbau, Mietwohnungsbau oder Standard-EFH, und der entscheidende Gewinn ist Zeit [29]. Mit Rezepturen, also hinterlegten Positionen je Elementeinheit, lässt sich daraus ein Roh-LV erzeugen: BKI AVA Elemente 2026 enthält über 800 Elemente (über 700 in KG 300, über 100 in KG 400) und 3.800 Positionen aus 50 Leistungsbereichen im Format GAEB X50 [38].

Einschätzung: Die Elementmethode mit Rezepturen überbrückt den Systembruch. Aus Kosten nach KG wird schrittweise ein LV nach Vergabeeinheiten, ohne dass die Kette abreißt. Für ein neues Werkzeug ist das ein klares Unterscheidungsmerkmal, aber auch einer der aufwendigsten Bausteine.

## 7. Umsatzsteuer: brutto oder netto

| Stelle | Regel |
|---|---|
| DIN 276 (Tz. 4.2.15) | Kosten mit oder ohne Umsatzsteuer, die Form ist anzugeben. Brutto ist maßgeblich, wenn der Bauherr keine Vorsteuer abziehen kann, z. B. im Wohnungsbau [20][23] |
| HOAI § 4 | Die auf die Objektkosten entfallende Umsatzsteuer gehört **nicht** zu den anrechenbaren Kosten [10] |
| BKI-Kennwerte | Kostenkennwerte enthalten die MwSt, Kostenstand 1. Quartal 2026, umgerechnet auf den Bundesdurchschnitt [37]. Positionspreise gibt BKI brutto und netto an [36] |
| Destatis-Baupreisindex | erhoben ohne Umsatzsteuer [41], veröffentlicht einschließlich MwSt [39]. Brutto- und Nettoreihe unterscheiden sich nur in den Quartalen 3 und 4/2020 wegen der befristeten MwSt-Senkung [33] |
| NHK 2010 (ImmoWertV) | €/m² BGF einschließlich USt und typischer Baunebenkosten [44] |
| Praxis Kostenkontrolle | ORCA trennt die „Leistungsprognose“ (netto, mit Auf- und Abschlägen) von der „Zahlungsprognose“ (brutto, mit vertraglichen Abzügen). Private Bauherren und Kommunen zahlen laut ORCA in der Regel USt, gewerbliche Bauherren können sie abziehen; im Einzelfall braucht es steuerliche Beratung [29] |
| GAEB | Summen mit Steuersatz und Steueranteilen, mehrere Steuersätze sind möglich [48] |

Folgerung: Intern netto speichern, den Steuersatz je Zeile bzw. je Leistungszeitraum mitführen und brutto ableiten. Jede Auswertung muss sichtbar sagen, ob sie brutto oder netto rechnet.

## 8. Kostenkennwerte und DIN 277:2021-08

**Status:** DIN 277:2021-08 „Grundflächen und Rauminhalte im Hochbau“ ist aktuell (14 Seiten, 67,70 € inkl. USt). Sie ersetzt DIN 277-1:2016-01, gilt nur noch für den Hochbau und regelt erstmals Räume, deren Nutzung noch nicht feststeht [58][61].

| Größe | Bedeutung | Beziehung |
|---|---|---|
| **BGF** Brutto-Grundfläche | alle Grundrissebenen einschließlich der umschließenden Konstruktion | BGF = NRF + KGF [59] |
| **KGF** Konstruktions-Grundfläche | Fläche der Wände, Stützen usw. | Teil der BGF |
| **NRF** Netto-Raumfläche | nutzbare Raumfläche | NRF = NUF + TF + VF [59] |
| **NUF** Nutzungsfläche (bis 2016 „Nutzfläche NF“) | NUF 1 bis 7: Wohnen und Aufenthalt, Büroarbeit, Produktion/Hand- und Maschinenarbeit, Lagern/Verteilen/Verkaufen, Bildung/Unterricht/Kultur, Heilen und Pflegen, Sonstige Nutzungen | Bezeichnungen nach Wikipedia (Stand 2005). Seit 2021 enthält NUF 7 zusätzlich Räume mit noch unbestimmter Nutzung [59][60] |
| **TF / VF** | Technikfläche / Verkehrsfläche | Teile der NRF |
| **BRI / NRI / KRI** | Brutto-, Netto- und Konstruktions-Rauminhalt | BRI = NRI + KRI [59] |
| **R / S** | Regelfall (allseitig umschlossen) / Sonderfall (z. B. Balkon, Loggia) | ersetzt seit 2016 die alte Einteilung a/b/c [59][60] |
| **GF, BF, UF, AF** | Grundstücks-, bebaute, unbebaute und Außenanlagenfläche | Grundstücksflächen [59] |

- Flächen werden aus Soll- oder Ist-Maßen ermittelt; die Messmethode ist anzugeben. Abtrennbare Bauabschnitte, unterschiedliche Geschosshöhen und unterschiedliche Ausbauzustände werden getrennt ermittelt [61].
- Faustwert im Wohnbau: Die NRF beträgt etwa 75 bis 85 % der BGF [62].
- **Kennwerte nutzen (BKI):**
  - Die „erste Zahl“ ergibt sich aus Kennwerten je m³ BRI, m² BGF, m² NUF oder je Nutzeinheit, angegeben als Mittelwert mit Streubereich von/bis.
  - Ein bloßer Mittelwert reicht für eine qualifizierte Ermittlung nicht; die konkrete Ausführung bestimmt, ob ein Wert über oder unter dem Mittel passt.
  - Planungskennwerte (Mengenverhältnisse) helfen, fehlende Mengen statistisch abzuschätzen [36].
  - DIN 276, Abschnitt 6, empfiehlt Mengen und Bezugseinheiten, schreibt sie aber nicht verbindlich vor [5][2].
- **Kostenstand und Ort:** Jeder Kennwert braucht einen Kostenstand (Zeitpunkt) und einen Bezugsort, z. B. den Bundesdurchschnitt. Regionale Anpassung erfolgt über Regional- bzw. Ortsfaktoren: BKI je Stadt- und Landkreis [35], SIRADOS-Ortsfaktoren [56], DBD-Preise für über 400 Kreise [54].
- **Bauen im Bestand:** Erst die 3. Ebene trennt Tragkonstruktion und Oberflächen. Das ist wichtig, um die mitzuverarbeitende Bausubstanz zu bewerten (HOAI § 4 Abs. 3) [36][10].

## 9. Kostenkontrolle in der Praxis: die Wertekette je Vergabeeinheit

| Wert | Quelle | LPH | Hinweis |
|---|---|---|---|
| Kostenvorgabe / Budget bzw. Projektkostenziel | Bauherr, Kostenrahmen oder Kostenberechnung | 1 bis 3 | Obergrenze oder Zielgröße [7][63] |
| Kostenberechnung (nach KG, auf VE umgelegt) | Planer | 3 | Basis für Honorar und Kontrolle [12] |
| Bepreistes LV bzw. LV-Budget (Kostenvoranschlag) | Planer | 6 | wird mit der Kostenberechnung verglichen [14]; ORCA erlaubt auch ein festes Budget je LV [29] |
| Angebote / Preisspiegel | Bieter | 7 | Vergleich mit bepreistem LV bzw. Kostenberechnung [14]; Details in [Prozess I](/okf/research/process/tendering-and-award.md) |
| Auftragssumme (Kostenanschlag) | Vertrag, mit Nachlässen | 7 | Verknüpfung LV ↔ Auftrag über die Ordnungszahl [29] |
| Nachträge | Auftragnehmer bzw. Auftraggeber | 8 | Status z. B. erkannt, angemeldet, angeboten, genehmigt, abgelehnt, zurückgezogen. Je Status wirkt ein Nachtrag auf Auftrag und Prognose, nur auf die Prognose oder gar nicht [29] |
| Abrechnung (Aufmaß, Abschlags- und Schlussrechnung, Einbehalte) | Auftragnehmer, Prüfung durch Planer | 8 | Vergleich mit den Auftragssummen einschließlich Nachträgen [14]; Details in [Prozess II](/okf/research/process/billing-and-cost-control.md) |
| **Prognose** (voraussichtliche Endkosten) | berechnet | 6 bis 8 | Beispiel ORCA: Liegt eine Schlussrechnung vor, gilt die freigegebene Rechnung. Pauschale Abschläge verdecken Mehrmengen, bis die Auftragssumme überschritten ist [29] |
| Kostenfeststellung | geprüfte Schlussrechnungen | 8 | Grundlage für eigene Kennwerte [23] |

**Kostenstände einfrieren:** ORCA archiviert „fixierte Kostenstände“ je Kostengliederung und vergleicht sie; Werte außerhalb der AVA, etwa der Grundstückswert, werden von Hand ergänzt [29]. NOVA archiviert Kostenanalysen als Versionen und kann Varianten einzeln aktivieren und deaktivieren [51].

**Berichte an den Bauherrn:** Rösch (IWW 2004) stellt KG- und VE-Sicht mit Spalten wie Schätzung, Berechnung, Anschlag und Feststellung (beauftragt, abgerechnet, Einbehalt, davon Nachtrag) gegenüber [27]. Öffentliche Auftraggeber verlangen zusätzlich Projektkostenziel, Änderungsregister, Risikoregister und für die Abrechnung eine Rechnungsliste aller VE mit ihren Abrechnungssummen [63].

## 10. Indexierung mit dem Baupreisindex

- **Destatis-Methode:**
  - Gemessen werden Marktpreise bei der Auftragsvergabe, keine Angebotspreise, erhoben ohne USt.
  - Grundlage sind 183 Bauleistungen (Basisjahr 2021) aus rund 5.000 Baufirmen, erhoben im Februar, Mai, August und November.
  - Es ist ein Laspeyres-Index mit Gewichten aus Abrechnungsunterlagen, die etwa alle fünf Jahre aktualisiert werden [41].
  - BKI nennt 177 Bauleistungen; diese Angabe widerspricht Destatis [33].
- **Aktuelle Werte, Berichtsmonat August 2026:**
  - Neubau Wohngebäude +5,5 % zum Vorjahr und +1,0 % zum Mai.
  - Rohbau +5,4 %, Ausbau +5,7 %, Bürogebäude +5,7 %, gewerbliche Betriebsgebäude +5,5 %, Straßenbau +6,9 %, Instandhaltung +6,0 % [39].
  - Index Wohngebäude: 141,7 (Q3 2026), 140,3 (Q2 2026), 134,3 (Q3 2025), Basis 2021 = 100 [33].
- **Basiswechsel:** Mit dem Berichtsmonat Mai 2024 wechselte die Basis von 2015 auf 2021. Reihen mit unterschiedlicher Basis dürfen nicht gemischt werden [33].
- **Daten:** GENESIS-Tabellen 61261-0001 ff. [39][40]. Lizenz: „Datenlizenz Deutschland – Namensnennung – Version 2.0“, Quellenangabe „© Statistisches Bundesamt (Destatis)“ [43].
- **Formel** [33]: Kosten_neu = Kosten_alt × Index_neu / Index_alt. Beispiel: 2.000.000 € brutto mit Kostenstand August 2025 × 141,7 / 134,3 ≈ 2.110.200 € mit Stand August 2026.
- Laut Hersteller ist BKI seit über 23 Jahren Dienstleister des Statistischen Bundesamts beim Baupreisindex [35].

## 11. Kostendatenquellen

| Quelle | Methode / Datenbasis | Umfang | Formate | Preis (Stand) |
|---|---|---|---|---|
| **BKI Baukosten 2026**, Fachbücher Teil 1 bis 3 | statistische Kennwerte aus abgerechneten Objekten; Mittelwert mit von/bis; brutto; Bundesdurchschnitt; Kostenstand Q1 2026 [37] | Gebäude: 87 Gebäudearten, 1. und 2. Ebene. Bauelemente: 3. Ebene, Elementarten, 85 Gebäudearten. Positionen: 50 LB mit KG-Zuordnung [35][36] | Buch | 119 / 99 / 99 €, Paket aller drei Bände 269 € (inkl. 7 % USt) [35] |
| **BKI Kostenplaner 2026/2027** (Windows) | über 1 Mio. Kennwerte, über 4.500 Objekte, über 150 bzw. 160 Gebäudearten [32][35] | DIN 276 bis zur 3. Ebene, Regionalfaktoren, IFC-Mengen, ÖNORM-Export ab 2027 | GAEB X51/X82/X80, Excel [32] | 2026 netto: Statistik 799 €, Statistik plus 1.399 €, plus [Positionen] 1.899 €, Freianlagen 599 €, Recherche 699 €; Zweitlizenz 30 % des Listenpreises; Einzelplatz oder Netzwerk [35][32] |
| **BKI KoRa** (online) | schnelle Bauwerkskosten im Wohnbau | Ein- und Mehrfamilien-, Reihen- und Doppelhäuser | Browser | 199 € (Einführungspreis bis 31.12.2026) [35] |
| **BKI AVA Elemente 2026** | Elemente mit Rezepturen | über 800 Elemente, 3.800 Positionen | GAEB X50 | auf Anfrage [38] |
| **SIRADOS** (WEKA Media) | von-mittel-bis-Preise aus Angebotspreisen bzw. Preisspiegeln, abschließend festgelegt von Fachautoren; Aktualisierung dreimal jährlich (März, Juli, November) [56] | Bauelemente nach DIN 276, Ortsfaktoren, beide DIN-276-Fassungen [8] | AVA-Schnittstellen | SIRADOS 365 Kostenplanung ab 399 €, Ausschreibungstexte ab 469 €; nur für Geschäftskunden [56] |
| **DBD** (Dr. Schiller & Partner) | DBD-BauPreise aus **Musterkalkulation**, gekoppelt an den STLB-Bau-Text; Anteile nach EFB 223 (Lohn, Stoffe, Geräte, Sonstiges) [54] | über 400 Kreise, 76 Gewerke, KG-Zuordnung. DBD-BIM Objekte: Kennwerte nach DIN 276 für 19 Bauwerkstypen [55]. Die DBD-KostenElemente sind eingestellt und durch DBD-BIM Elements ersetzt [53] | in viele AVA-Programme integriert, u. a. NOVA AVA, ORCA, iTWO [54] | auf Anfrage. In NOVA abhängig vom Abo-Paket [52] |
| **RM „Baupreise online“** | über 8.700 Positionen aus über 3.100 ausgewerteten Angeboten | KG- und LB-Zuordnung, Anpassung an Zeit und Region | Web | 99 €/Jahr (Mitteilung vom 22.01.2026) [57] |
| **NOVA „Neo“** | KI für Preisvorschlag, Preisprüfung und KG-Zuordnung; Datenbasis nicht offengelegt | – | in NOVA AVA | laut Hersteller ohne Aufpreis. Alpha im April 2026, Beta im Sommer 2026, Regelbetrieb bis Anfang 2027 erwartet [50] |
| **Frei:** Destatis-Baupreisindizes | amtliche Statistik | Indizes nach Bauwerksart und Gewerk | GENESIS | frei (dl-de/by-2-0) [43] |
| **Frei:** Destatis Bautätigkeitsstatistik | von Bauherren bei der Genehmigung veranschlagte Kosten, inkl. USt | nur grob (Bauwerk) | GENESIS 31111 / 31121 | frei [42] |
| **Frei:** NHK 2010 (ImmoWertV Anlage 4) | Normalherstellungskosten für die Wertermittlung, €/m² BGF für KG 300 + 400, inkl. USt und Baunebenkosten | rund 30 Gebäudearten, Standardstufen | Verordnungstext | frei; Preisstand 2010, muss indexiert werden [44] |
| **Verwaltung:** PLAKODA / RBK | Planungs- und Kostendaten der Bauverwaltungen | zentrale Datenbank nach Übergabe der Bauwerke | intern | nicht öffentlich [63] |

Mehr zu Text- und Preisbibliotheken steht in [Leistungstexte](/okf/research/standards/stlb-bau-tender-texts.md), zu NOVA in [NOVA Produkt und Preise](/okf/research/nova-ava/product-and-pricing.md).

## 12. GAEB-Austauschphasen für Kosten

| Phase | Name | Inhalt laut GAEB |
|---|---|---|
| **X50** | Baukostenkatalog | projektneutrale Sammlung von Preisinformationen zu Bauteilen und Bauelementen, auch über Teilleistungen beschrieben. **X50.1** setzt die Nummer aus Teilen je Ebene zusammen (Stil LV-Ordnungszahl), **X50.2** trägt in jeder Ebene die volle Nummer (Stil DIN 276, z. B. 300 / 310 / 314) [47] |
| **X51** | Kostenermittlung | Kostenermittlungen nach Planungsstand; ausdrücklich genannt sind nur vier Stufen (Schätzung, Berechnung, Anschlag, Feststellung); Varianten X51.1 und X51.2 wie bei X50 [47] |
| **X52** | Kalkulationsansätze bzw. -daten | Kosten nach Kostenarten, z. B. für Bietergemeinschaften oder Standardkosten aus Baudatenbanken; nur in ein bestehendes LV importierbar; auch in X80 zulässig [47][46] |
| **X82** | Kostenanschlag | **LV mit geschätzten Preisen** des Planers. Nach DIN 276:2018 entspricht das inhaltlich dem Kostenvoranschlag [47] |

- **Versionen:** Aktuell gilt GAEB DA XML 3.3 (2023-01); das Paket „Kosten und Kalkulation“ stammt unverändert von 2021-05 [45][46]. Die Beta 3.4 (2026-03) enthält für X50 und X51 „keine fachlichen Änderungen“; X52 bekommt nur neue Nachhaltigkeitsangaben [49].
- **Schema-Details** [48]:
  - Kopfdaten der X51: Art (`ECType`: cost estimate, cost determination, cost planning, cost estimation, other), Verfahren (`ECMethod`: cost by area method, cost by object comparison, cost by elements, other), Informationsstand (`DateOfInformation`) und Preisstand (`DateOfPrice`).
  - Elemente: Spannen `UPFrom`/`UPAvg`/`UPTo`, Anteil `Portion`, Zuschlag `Markup`, Eigenschaften mit CAD-Werten.
  - Katalogtypen (`CtlgType`) u. a. „cost group DIN 276-1 2008-12“, „cost group DIN 276 2018-12“, „work category“, „locality“, „cost unit“, „BIM“.
- Folgerung: Die DIN-Stufe muss das eigene Datenmodell führen; sie lässt sich nicht vollständig aus `ECType` ableiten. Mehr in [GAEB DA XML](/okf/research/standards/gaeb-da-xml.md) und [GAEB-Werkzeuge](/okf/research/standards/gaeb-tooling-interop.md).

## 13. Folgerungen für das Datenmodell

Skizze, eigene Ableitung aus den Abschnitten 3 bis 12:

```text
Kostenkatalog      (id, art: DIN276_2018 | DIN276_2008 | eigener Kontenrahmen, version)
Kostengruppe       (katalog, nummer, bezeichnung, ebene, eltern)
KatalogMapping     (von_kg, nach_kg, art: eindeutig|aufteilen|manuell, anteil)
Teilobjekt         (projekt, typ: Bauwerk|Bauabschnitt|Kostenträger|Förderbereich)
Kostenermittlung   (projekt, stufe: Vorgabe|Rahmen|Schätzung|Berechnung|Voranschlag|Anschlag|Feststellung,
                    snapshot_id, eingefroren_am, informationsstand, preisstand, index_ref, regionalfaktor,
                    ust_modus: netto|brutto, din276_fassung, methode)
Kostenzeile        (ermittlung, menge, einheit, bezugsgröße(DIN 277 / Bauteilmenge), kennwert, betrag_netto,
                    ust_satz, herkunft: Kennwert|Element|LV-Position|Angebot|Auftrag|Nachtrag|Rechnung,
                    flags: risiko|preissteigerung|eigenleistung|bereits_entstanden)
Zuordnung          (kostenzeile|lv_position|aufmasszeile → kostengruppe, anteil_% | menge)   -- n:m
Dimensionen        Vergabeeinheit, Leistungsbereich, Teilobjekt (je Zeile; Summen müssen über alle Sichten aufgehen)
Element/Elementart (kg, bezugseinheit, rezeptur: [lv_position_vorlage × faktor], lb_anteile)
Kennwert           (wert, von, bis, einheit, quelle, kostenstand, region, ust_inkl, stichprobe)
Nachtrag           (ve, status, wirksamkeit: Auftrag+Prognose|nur Prognose|keine, ursache)
Risiko             (register: wahrscheinlichkeit, schaden, maßnahme, verantwortlich, freigabe)
Indexreihe         (quelle: Destatis 61261, basisjahr, periode, wert)
```

Regeln, die daraus folgen:

1. **Einfrieren statt Überschreiben.** Jede Stufe ist ein unveränderlicher Stand. Kostenkontrolle heißt, zwei beliebige Stände auf jeder Ebene zu vergleichen (Differenz, Ursache).
2. **Mehrdimensionale Summen.** Eine Kostenzeile hängt an KG, VE, LB und Teilobjekt. Auswertungen sind Pivot-Sichten darauf; unzugeordnete Werte müssen als eigene Zeile sichtbar bleiben.
3. **Ein Preisstand je Wert:** Datum, Index, Region und USt-Modus gehören zu jedem Wert; eine Umrechnung legt einen neuen, nachvollziehbaren Wert an.
4. **Beide DIN-Fassungen** werden parallel geführt; das Honorar wird über den Katalog 2008 gerechnet (HOAI § 4, § 33) [10][13].
5. **Prognoseregeln konfigurierbar und dokumentiert** (Status von Nachträgen, Schlussrechnung schlägt Auftrag, Budget schlägt Schätzung), damit Abweichungen erklärbar bleiben.

## Relevanz für unser Projekt

**Muss-Anforderungen (MVP Kostenseite):**

- M1: Kataloge DIN 276:2018-12 und DIN 276-1:2008-12 mit Mapping (n:m) sowie frei definierbare Kontenrahmen, z. B. für förderfähige Kosten oder Bauabschnitte [8][29].
- M2: Sechs Stufen plus Kostenvorgabe, eingefrorene Stände, Vergleich auf jeder Ebene; Mindesttiefe je Stufe prüfen (Schätzung 2. Ebene, Berechnung 3. Ebene) [4][5].
- M3: Zuordnung jeder LV-Position und Aufmaßzeile zu KG (auch anteilig), VE und LB; Abgleich der Sichten [27][48].
- M4: USt-Modus je Projekt bzw. Auswertung, Steuersatz je Zeile; die Honorarbasis bleibt netto [10][20].
- M5: Mengen nach DIN 277:2021-08 als Bezugsgrößen; eigene Kennwertbibliothek aus Kostenfeststellungen; Indexierung mit Destatis-Daten (Lizenz geklärt) [43][58].
- M6: Wertekette je VE (Budget bis Prognose) mit Nachtragsstatus und Bericht für den Bauherrn [29][14].
- M7 (öffentliche Auftraggeber): Risiko- und Preissteigerungsanteile gesondert ausweisen, Projektkostenziel und Risikoregister nach RBBau [63]. Siehe [Vergaberecht](/okf/research/standards/procurement-law-e-vergabe.md).
- M8: GAEB-Katalogzuordnung mit `CtlgType` „cost group DIN 276 2018-12“ in X8x und X31; Import von X50 und Export von X51 als zweiter Schritt [48].

**Chancen zur Abgrenzung (Einschätzung):**

- Nachvollziehbare, offen dokumentierte Prognoselogik.
- Kostenkennwerte aus den eigenen Projekten des Architekten, automatisch indexiert; das ist ohne Lizenzkosten möglich.
- Fremddaten wie BKI, SIRADOS oder DBD nur über Importe mit eigener Lizenz des Nutzers, ohne Bündelung im Produkt.
- Elementmethode mit Rezepturen als Brücke von der KG- zur VE-Sicht.
- Vorlagen für öffentliche Auftraggeber (RBBau-Struktur).
- Laut Hersteller arbeitet NOVA an ähnlichen Punkten (Kostenanalysen nach DIN und nach Gewerken, Neo) [50][51]. Der Abgleich gehört nach [Schmerzpunkte](/okf/research/market/pain-points.md).

**Risiken:**

- Normtexte und Erläuterungen sind urheberrechtlich geschützt; Nummern und Namen der KG gelten hier als Fakten, die Rechtslage ist aber zu prüfen ([Lizenzen](/okf/research/open-source/building-blocks-and-licensing.md)).
- Daten von BKI, DBD, SIRADOS und STLB-Bau sind nicht weitergebbar.
- Die HOAI-Novelle ist offen, eine neue Fassung von DIN 276 könnte folgen, GAEB 3.4 ist noch Beta [18][49].
- Haftung: Kostenaussagen müssen ihre Annahmen sichtbar machen (Informations- und Preisstand, USt).

**Aufwand (grobe Einschätzung, Personentage für eine erfahrene Entwicklerin bzw. einen erfahrenen Entwickler):**

| Baustein | Personentage |
|---|---|
| Kataloge und Mapping | 5–8 |
| Editor für Kostenermittlungen (Stufen, Snapshots, Kennwert × Menge, DIN 277, USt, Index) | 15–25 |
| Zuordnung und Pivot-Sichten | 10–15 |
| Wertekette und Prognose (setzt den AVA-Kern voraus) | 20–35 |
| Destatis-Import | 2–4 |
| GAEB X50/X51 | 10–20 |
| Elementmethode | 15–30 |
| Risikoregister | 5–8 |

## Offene Fragen

**Nicht gefunden oder nicht verifizierbar:**

- Der genaue Wortlaut von DIN 276:2018-12 (kostenpflichtig) zu Kostenrahmen-Mindesttiefe, risikobedingten Kosten (Endfassung statt Entwurf), Ordnung nach VE und USt-Ziffer. Belegt sind diese Punkte nur über Sekundärquellen und den Entwurf [7][20].
- Ob es ein Überarbeitungsprojekt für DIN 276 gibt: Die Produktseite von DIN Media nennt am 2026-11-09 weder Entwurf noch Nachfolger [1]; das Arbeitsprogramm des NABau wurde nicht geprüft.
- Stand der HOAI-Novelle im November 2026: Die letzte ausgewertete Quelle ist vom Mai 2026 [18]; eine Websuche am 2026-11-09 fand keinen Beleg für einen veröffentlichten Referentenentwurf (nicht verifiziert).
- Die Bezugseinheiten-Tabellen in DIN 276, Abschnitt 6, mit ihren Kürzeln. Die genauen 2021er Bezeichnungen von NUF 1 bis 7, insbesondere NUF 3.
- Preise für DBD, Brutto/Netto-Angaben bei SIRADOS, Datenbasis von Neo, Zugang zu PLAKODA.
- Widerspruch bei der Zahl der Bauleistungen im Destatis-Index: 183 (Destatis) gegenüber 177 (BKI) [41][33].

**Fragen an den Architekten-Freund:**

1. Welche Stufen erstellst du tatsächlich und in welcher Tiefe? Nutzt du den Begriff „Kostenvoranschlag“?
2. Welche Kostendaten lizenzierst du (BKI, SIRADOS, DBD über NOVA), und welche eigenen Projektdaten hast du?
3. Rechnest du Honorare mit KG nach 2008 parallel? Wie gehst du mit der mitzuverarbeitenden Bausubstanz um?
4. Welche Formulare verlangen deine öffentlichen Auftraggeber (RBBau, Landesrichtlinien, Förderstellen: förderfähig/nicht förderfähig)?
5. Brutto oder netto: Wie oft hast du vorsteuerabzugsberechtigte Bauherren?
6. In welchem Format, wie oft und mit welchen Spalten berichtest du Kosten an Bauherren?
7. Arbeitest du mit Bauelementen bzw. Rezepturen oder nur mit Positionen?
8. Was genau fehlt dir an der Kostenkontrolle in NOVA (Prognose, Nachträge, Berichte, Indexierung)?

## Quellen

1. DIN 276:2018-12 Kosten im Bauwesen (Produktseite) – DIN Media – https://www.dinmedia.de/de/norm/din-276/293154016 – Primärquelle – abgerufen 2026-11-09
2. DIN 276:2018-12 Inhaltsverzeichnis (PDF) – DIN/NABau – https://www.din.de/de/mitwirken/normenausschuesse/nabau/veroeffentlichungen/wdc-beuth:din21:293154016/toc-2873248/download – Primärquelle – abgerufen 2026-11-09
3. DIN 276 – Wikipedia – https://de.wikipedia.org/wiki/DIN_276 – Lexikon (Sekundär) – abgerufen 2026-11-09
4. Neufassung der DIN 276, DAB 01/2019 Regionalteil Bayern (PDF) – Bayerische Architektenkammer – https://byak.de/data/pdfs/AuT/Normung/DAB_Artikel_ab_17-09/NN_19-01_DIN-276.pdf – Presse (Kammer) – abgerufen 2026-11-09
5. Die neue DIN 276 (31.01.2019) – DABonline – https://www.dabonline.de/recht/die-neue-din-276 – Presse – abgerufen 2026-11-09
6. DIN 276 „Kosten im Hochbau“ überarbeitet – Bayerische Architektenkammer – https://www.byak.de/aktuelles/newsdetail/din-276-kosten-im-hochbau-ueberarbeitet.html – Presse (Kammer) – abgerufen 2026-11-09
7. Stellungnahme der BAK zum Entwurf DIN 276 (27.09.2017) – Bundesarchitektenkammer/ByAK – https://byak.de/data/pdfs/AuT/Normung/Stellungnahmen/2017-09-27-bak-stellungnahme-zu-e_din_276.pdf – Primärquelle (Verbandsstellungnahme) – abgerufen 2026-11-09
8. Die neue DIN 276 – Übersicht der neuen Kostengruppen (© 2024) – WEKA Media / SIRADOS – https://www.weka.de/bi/sirados/download/Download_DIN276.pdf – Herstellerangabe – abgerufen 2026-11-09
9. Kostengruppen nach DIN 276 – SIDOUN – https://sidoun.de/wissen/din276/kostengruppen/ – Herstellerangabe (nennt KG 200 noch mit dem Namen von 2008) – abgerufen 2026-11-09
10. § 4 HOAI – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/__4.html – Gesetz – abgerufen 2026-11-09
11. § 2 HOAI – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/__2.html – Gesetz – abgerufen 2026-11-09
12. § 6 HOAI – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/__6.html – Gesetz – abgerufen 2026-11-09
13. § 33 HOAI – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/__33.html – Gesetz – abgerufen 2026-11-09
14. HOAI Anlage 10 (Gebäude und Innenräume) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/anlage_10.html – Gesetz – abgerufen 2026-11-09
15. HOAI Anlage 15 (Technische Ausrüstung) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/hoai_2013/anlage_15.html – Gesetz – abgerufen 2026-11-09
16. § 650p BGB – gesetze-im-internet.de – https://www.gesetze-im-internet.de/bgb/__650p.html – Gesetz – abgerufen 2026-11-09
17. HOAI-Novelle: Planer blicken auf 2026 (06.11.2025) – VBI – https://www.vbi.de/aktuelles/news/hoai-novelle-planer-blicken-auf-2026/ – Presse (Verband) – abgerufen 2026-11-09
18. Liegt die lang erwartete HOAI-Novellierung 2026 in der Luft? (05.05.2026) – VDI Wissensforum – https://www.vdi-wissensforum.de/wissen/liegt-die-lang-erwartete-hoai-novellierung-2026-in-der-luft/ – Presse – abgerufen 2026-11-09
19. Kostenschätzung nach DIN 276 – bauprofessor.de – https://www.bauprofessor.de/kostenschaetzung-nach-din-276/ – Fachportal – abgerufen 2026-11-09
20. Kostenberechnung nach DIN 276 – bauprofessor.de – https://www.bauprofessor.de/kostenberechnung-nach-din-276/ – Fachportal – abgerufen 2026-11-09
21. Kostenvoranschlag – bauprofessor.de – https://www.bauprofessor.de/kostenvoranschlag/ – Fachportal – abgerufen 2026-11-09
22. Kostenanschlag nach DIN 276 – bauprofessor.de – https://www.bauprofessor.de/kostenanschlag-nach-din-276/ – Fachportal – abgerufen 2026-11-09
23. Kostenfeststellung nach DIN 276 – bauprofessor.de – https://www.bauprofessor.de/kostenfeststellung-nach-din-276/ – Fachportal – abgerufen 2026-11-09
24. Kostenkontrolle – bauprofessor.de – https://www.bauprofessor.de/kostenkontrolle/ – Fachportal – abgerufen 2026-11-09
25. Vergabeeinheiten – bauprofessor.de – https://www.bauprofessor.de/vergabeeinheiten/ – Fachportal – abgerufen 2026-11-09
26. Die gewerkeorientierte Kostenberechnung (26.06.2018) – IWW Planungsbüro professionell – https://www.iww.de/pbp/honorargestaltung/honorarabrechnung-die-gewerkeorientierte-kostenberechnung-die-alternative-zur-berechnung-nach-kostengruppen-f113735 – Presse – abgerufen 2026-11-09
27. DIN 276-Gewerkezuordnung hilft dem Architekten (01.11.2004) – IWW Planungsbüro professionell – https://www.iww.de/pbp/archiv/din-276-gewerkezuordnung-hilft-dem-architekten-eine-kostenkontrolle-nach-vergabeeinheiten-versteht-der-bauherr-f28355 – Presse (älter) – abgerufen 2026-11-09
28. Bachelorarbeit „Baukostenermittlung in den frühen Projektphasen“ (2009) – Hochschule Mittweida – https://monami.hs-mittweida.de/files/254/Voigtlaender_Bachelorarbeit_Baukostenermittlung_in_den_fruehen_Projektphasen.pdf – Wissenschaft (älter, Normstand 2008) – abgerufen 2026-11-09
29. Workshop Einführung in das Kostenmanagement (Mai 2022) – ORCA Software – https://orca-software.com/wp-content/uploads/Seminar-Kostenmanagement.pdf – Herstellerangabe – abgerufen 2026-11-09
30. DIN 276 neu – Kostengruppen und Kostenplanung sind besonders betroffen (24.05.2019) – Forum Verlag – https://forum-verlag.com/fachwissen/bau-und-gebaeudemanagement/din-276-neu-kostengruppen-und-kostenplanung-sind-besonders-betroffen/ – Fachverlag – abgerufen 2026-11-09
31. BKI Startseite – Baukosteninformationszentrum Deutscher Architektenkammern – https://www.bki.de – Herstellerangabe – abgerufen 2026-11-09
32. BKI Kostenplaner 2027 – BKI – https://bki.de/bki-kostenplaner – Herstellerangabe – abgerufen 2026-11-09
33. BKI Baupreisindex – BKI – https://bki.de/baupreisindex – Herstellerangabe (auf Basis von Destatis) – abgerufen 2026-11-09
34. BKI Baukosten Bauelemente Neubau 2026 – BKI – https://bki.de/t2 – Herstellerangabe – abgerufen 2026-11-09
35. BKI Überblick 2026 (Produktkatalog, PDF) – BKI – https://bki-files.de/downloads/prospekt/BKI_Produktkatalog.pdf – Herstellerangabe – abgerufen 2026-11-09
36. Erläuterungen zur Fachbuchreihe BKI Baukosten Neubau 2026 (PDF) – BKI – https://bki-files.de/downloads/baukosten/2026/2026_T1-T3_Hinweise_zur_Reihe.pdf – Herstellerangabe – abgerufen 2026-11-09
37. BKI Baukosten Bauelemente 2026, Musterseiten (PDF) – BKI – https://bki-files.de/downloads/baukosten/2026/2026_T2_Muster.pdf – Herstellerangabe – abgerufen 2026-11-09
38. BKI AVA Elemente 2026 – Neubau inkl. Positionen (02.07.2026) – baulinks.de – https://www.baulinks.de/webplugin/2026/0942.php4 – Presse (Herstellermeldung) – abgerufen 2026-11-09
39. Baupreise für Wohngebäude im August 2026, PM Nr. 360 (09.10.2026) – Destatis – https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/10/PD26_360_61261.html – Primärquelle (amtliche Statistik) – abgerufen 2026-11-09
40. Baupreise und Immobilienpreise (Themenseite) – Destatis – https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/_inhalt.html – Primärquelle – abgerufen 2026-11-09
41. Erläuterungen zum Baupreisindex – Destatis – https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/Methoden/Erlaeuterungen/baupreisindex.html – Primärquelle – abgerufen 2026-11-09
42. Bauen (Themenseite Bautätigkeit) – Destatis – https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Bauen/_inhalt.html – Primärquelle – abgerufen 2026-11-09
43. Impressum / Nutzungsbedingungen – Destatis – https://www.destatis.de/DE/Service/Impressum/_inhalt.html – Primärquelle – abgerufen 2026-11-09
44. ImmoWertV Anlage 4 (NHK 2010) – gesetze-im-internet.de – https://www.gesetze-im-internet.de/immowertv_2022/anlage_4.html – Gesetz/Verordnung – abgerufen 2026-11-09
45. GAEB-Datenaustausch, Downloads – GAEB – https://www.gaeb.de/de/service/downloads/gaeb-datenaustausch/ – Primärquelle – abgerufen 2026-11-09
46. GAEB DA XML Version 3.3, Stand 2023-01 – GAEB – https://www.gaeb.de/de/produkte/gaeb-datenaustausch/versionen/gaeb-da-xml-version-3-3-stand-2023-01/ – Primärquelle – abgerufen 2026-11-09
47. Fachdokumentation GAEB DA XML 3.3, Ausgabe 2023-01 (PDF) – GAEB – https://www.gaeb.de/wp-content/uploads/2023/09/Fachdokumentation_GAEB-DA-XML_3.3_2023-01.pdf – Primärquelle – abgerufen 2026-11-09
48. Schemapaket „Kosten und Kalkulation“ 2021-05 (XSD, inkl. Library 3.3) – GAEB – https://www.gaeb.de/wp-content/uploads/2021/06/2021-05_Kosten_und_Kalkulation.zip – Primärquelle – abgerufen 2026-11-09
49. Changelog GAEB XML 3.4 (Beta 2026-03) gegenüber 3.3 – GAEB – https://www.gaeb.de/wp-content/uploads/2025/11/Changelog-3.4-2026-03-beta-vs-3.3.md – Primärquelle – abgerufen 2026-11-09
50. NOVA AVA KI: Here comes Neo (09.04.2026) – NOVA Building IT – https://nova-ava.de/en/nova-ava-ki-here-comes-neo/ – Herstellerangabe – abgerufen 2026-11-09
51. NOVA AVA mit neuer Nutzeroberfläche und verbesserten Features (22.07.2025) – baulinks.de – https://www.baulinks.de/webplugin/2025/0996.php4 – Presse (Herstellermeldung) – abgerufen 2026-11-09
52. NOVA AVA mit STLB-Bau und DBD-BIM – Dr. Schiller & Partner (DBD) – https://www.dbd.de/partner/nova-ava/ – Herstellerangabe – abgerufen 2026-11-09
53. DBD Startseite – Dr. Schiller & Partner – https://www.dbd.de – Herstellerangabe – abgerufen 2026-11-09
54. DBD-BauPreise – Dr. Schiller & Partner – https://www.dbd.de/dbd-baupreise/ – Herstellerangabe – abgerufen 2026-11-09
55. DBD-BIM Objekte – Dr. Schiller & Partner – https://www.dbd.de/dbd-bim-objekte/ – Herstellerangabe – abgerufen 2026-11-09
56. SIRADOS Startseite – WEKA Media – https://www.sirados.de – Herstellerangabe – abgerufen 2026-11-09
57. Baupreise online (Pressemitteilung 22.01.2026) – RM Rudolf Müller Medien – https://www.mynewsdesk.com/de/rudolf-mueller-mediengruppe/pressreleases/baupreise-online-3427510 – Herstellerangabe – abgerufen 2026-11-09
58. DIN 277:2021-08 Grundflächen und Rauminhalte im Hochbau – DIN Media – https://www.dinmedia.de/de/norm/din-277/342217323 – Primärquelle – abgerufen 2026-11-09
59. DIN 277 – Wikipedia – https://de.wikipedia.org/wiki/DIN_277 – Lexikon (Sekundär) – abgerufen 2026-11-09
60. DIN 277 – aktuelle Fassung 2021-08 – WEKA – https://www.weka.de/architekten-ingenieure/eine-fast-ganz-neue-din-277/ – Fachverlag – abgerufen 2026-11-09
61. DIN 277 Grundflächen und Rauminhalte im Hochbau – bauprofessor.de – https://www.bauprofessor.de/din-277-grundflaechen-rauminhalte-hochbau/ – Fachportal – abgerufen 2026-11-09
62. Ermittlung von Grundflächen und Rauminhalten – BauNetz Wissen – https://www.baunetzwissen.de/drucken/ermittlung-von-grundflaechen-und-rauminhalten-8606045 – Fachportal – abgerufen 2026-11-09
63. RBBau – Richtlinien für die Durchführung von Bauaufgaben des Bundes, Ausgabe 15. Juli 2026 (PDF) – Fachinformation Bundesbau / BMWSB – https://www.fib-bund.de/Inhalt/Richtlinien/RBBau/RBBau_Onlinefassung_Stand_15.07.2026.pdf – Primärquelle (Verwaltungsvorschrift) – abgerufen 2026-11-09
