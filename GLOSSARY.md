# Glossary (AVA – Ausschreibung, Vergabe, Abrechnung)

Dieses Glossar definiert die allgemeinen Fachbegriffe der Bau-Ausschreibung, Vergabe und Abrechnung (AVA), die in unserer Domäne verwendet werden. Alle Begriffe sind herstellerneutral formuliert.

---

## Grundbegriffe & Hierarchie

### AVA (Ausschreibung, Vergabe, Abrechnung)
Der dreistufige Prozess zur Planung, Beauftragung und Abrechnung von Bauleistungen:
1. **Ausschreibung**: Erstellung von Leistungsverzeichnissen (LV) mit Mengen und Leistungsbeschreibungen zur Einholung von Angeboten.
2. **Vergabe**: Auswertung der eingegangenen Bieterangebote (Preisspiegel), Angebotsprüfung und Zuschlagserteilung (Auftrag).
3. **Abrechnung**: Laufende Mengenermittlung (Aufmaß), Rechnungsprüfung (Abschlags-, Teilschluss-, Schlussrechnung) und Nachtragsmanagement.

### Projekt
Die oberste organisatorische Einheit eines Bauvorhabens, der Bauherr, Projektstammdaten, Kostenstrukturen (z. B. nach DIN 276), BIM-Teilmodelle und mehrere Leistungsverzeichnisse (LVs) zugeordnet sind.

### Leistungsverzeichnis (LV)
Strukturierte Aufstellung aller zu erbringenden Bauleistungen eines Gewerks oder Fachbereichs. Ein LV gliedert sich hierarchisch in Gliederungsebenen (Lose, Titel/Abschnitte) und Einzelpositionen.

### Ordnungszahl (OZ) / OZ-Maske
Eindeutige hierarchische Kennung eines Gliederungsknotens oder einer Position innerhalb eines LVs. Das Format wird durch eine **OZ-Maske** vorgegeben (z. B. `11.22.3333A`), wobei Zifferngruppen die Gliederungstiefe (z. B. Los, Titel, Position) und ein optionaler Buchstabe den Index definieren.

### Los / Titel / Abschnitt
Hierarchische Gliederungsebenen (Gruppenstufen) oberhalb der Positionen in einem LV:
- **Los**: Vergabeeinheit, die getrennt beauftragt werden kann (Fachlos oder Teillos).
- **Titel / Abschnitt / Unterabschnitt**: Fachliche oder räumliche Gruppierung von Positionen innerhalb eines Loses oder LVs, deren Positionssummen zu einer Titelsumme verdichtet werden.

---

## Positionsarten & Positionsbestandteile

### Position
Kleinste kalkulierbare und abrechenbare Leistungseinheit im LV. Besteht typischerweise aus Ordnungszahl (OZ), Positionsart, Kurztext, Langtext, Menge, Einheit, Einheitspreis (EP) und Gesamtpreis (GP).

### Normalposition (Grundposition)
Reguläre, verbindlich auszuführende Position, deren Menge und Gesamtpreis (GP = Menge × EP) vollständig in die Titel- und LV-Summe einfließen.

### Bedarfsposition (Eventualposition)
Position für Leistungen, deren Notwendigkeit bei Erstellung des LVs noch nicht feststeht:
- **Ohne Gesamtbetrag (Standard nach VOB)**: Bieter gibt einen Einheitspreis (EP) an, der Gesamtpreis (GP) wird jedoch **nicht** in die Angebotssumme eingerechnet (oder separat ausgewiesen).
- **Mit Gesamtbetrag**: Menge × EP fließt in die Wertungssumme ein (nur in begründeten Ausnahmefällen zulässig).

### Wahlposition (Alternativposition)
Alternative Ausführungsvariante zu einer Grundposition (oder einer anderen Wahlposition). Im Standardzustand fließt der Gesamtpreis einer Wahlposition **nicht** in die LV-Summe ein, bis sich der Auftraggeber im Rahmen der Vergabe aktiv für diese Alternative entscheidet (wodurch sie die zugehörige Grundposition ersetzt).

### Zulageposition
Position, die eine Mehr- oder Zusatzleistung zu einer bestehenden Bezugsposition (Grundposition) beschreibt (z. B. erschwerte Bedingungen oder höherwertiges Material) und zusätzlich zum Preis der Bezugsposition vergütet wird.

### Stundenlohnposition (Regieposition)
Position zur Abrechnung von Arbeiten nach Zeitaufwand (Stundenlohnarbeiten) anstelle einer mengenbezogenen Leistungseinheit.

### Hinweistext / Vorbemerkung / Texthinweis
Nicht-bepreister Textbaustein innerhalb des LVs (ohne Menge, Einheit und Preis), der Vertrags-, Ausführungs- oder technische Rahmenbedingungen für das gesamte LV, einen Titel oder nachfolgende Positionen erläutert.

### Kurztext & Langtext
- **Kurztext**: Prägnante einzeilige Bezeichnung der Position für Tabellenübersichten, Preisspiegel und Rechnungsdruck.
- **Langtext**: Vollständige, eindeutige und erschöpfende Beschreibung der geforderten Leistung (oft formatiert als Rich-Text/HTML oder GAEB-Textstruktur, ggf. aus Standardleistungsbüchern wie STLB-Bau abgeleitet).

### Menge, Einheit, Einheitspreis (EP), Gesamtpreis (GP)
- **Menge (Vordersatz)**: Geplante Ausführungsmenge einer Position (typischerweise mit bis zu 3 Nachkommastellen).
- **Einheit**: Maßeinheit der Position (z. B. `m`, `m²`, `m³`, `St`, `psch`, `h`, `t`, `kg`).
- **Einheitspreis (EP)**: Netto-Preis pro Einheit (typischerweise mit 2, optional 3 Nachkommastellen).
- **Gesamtpreis (GP)**: Produkt aus Menge × EP, kaufmännisch auf 2 Nachkommastellen (Cent) gerundet.

---

## Datenaustausch (GAEB) & BIM

### GAEB (Gemeinsamer Ausschuss Elektronik im Bauwesen)
Standardisiertes deutsches Datenaustauschformat für Leistungsverzeichnisse, Angebote, Aufträge und Abrechnungen (aktuell **GAEB DA XML 3.2 / 3.3**, historisch GAEB 90 / GAEB 2000).

### GAEB-Austauschphasen (X81 – X89)
Die Dateiendung kennzeichnet die Projektphase im Datenaustausch:
- **X81**: Leistungsbeschreibung (LV-Struktur und Texte ohne Preise, zur Übergabe zwischen Planern).
- **X82**: Kostenansatz (LV mit geschätzten/geplanten Preisen des Planers).
- **X83**: Angebotsaufforderung (LV mit Mengen und Texten ohne Preise, Versand an Bieter).
- **X84**: Angebotsabgabe (Bieter sendet ausgefüllte Einheitspreise zurück an Ausschreibenden).
- **X85**: Nebenangebot (Abweichendes Angebot eines Bieters).
- **X86**: Auftragserteilung (Vereinbartes Auftrags-LV mit Vertragspreisen).
- **X89**: Rechnungs-/Abrechnungsdaten.
- **X31**: Mengenermittlungsdaten (Übergabe von Aufmaßen).

### BIM (Building Information Modeling) & IFC
Modellbasierte Arbeitsweise im Bauwesen. Über offene Austauschformate wie **IFC (Industry Foundation Classes)** werden 3D-Bauwerksmodelle mit Bauteileigenschaften (Properties/Quantities) geladen, um Mengen direkt am 3D-Bauteil zu ermitteln (**modellbasierte Mengenermittlung / QTO**) und nachvollziehbar mit LV-Positionen oder Kostengruppen zu verknüpfen.

---

## Vergabe, Kosten & Abrechnung

### Preisspiegel (Bietervergleich)
Tabellarische Gegenüberstellung aller Bieterangebote zu einem LV auf Positions-, Titel- und Gesamtsummenebene zur rechnerischen, technischen und wirtschaftlichen Prüfung (inkl. Ausreißererkennung, Mindest-/Mittel-/Höchstpreisen und Nachlässen).

### DIN 276 (Kosten im Bauwesen)
Deutsche Norm zur Ermittlung und Gliederung von Projektkosten im Hochbau nach **Kostengruppen (KG 100 bis KG 800)** über die Stufen Kostenrahmen, Kostenschätzung, Kostenberechnung, Kostenanschlag und Kostenfeststellung.

### Aufmaß & Mengenermittlung (REB 23.003)
Nachvollziehbare Berechnung ausgeführter oder geplanter Mengen über geometrische oder freie Rechenansätze (oft nach **REB-Verfahrensbeschreibung 23.003**), die als Nachweis für LV-Vordersätze oder Rechnungspositionen dienen.

### Nachtrag
Nach Vertragsschluss vereinbarte Leistungsänderung oder zusätzliche Leistung, die mit eigener Nachtragsnummer, eigener Kalkulations-/Prüfhistorie und Bezug zum Hauptauftrag in die Abrechnung einfließt.

---

## Kalkulation, Stammdaten & Kennwerte

### Einheitspreisanteile (EPA)
Aufgliederung eines Einheitspreises (EP) in bis zu sechs Kostenarten-Bestandteile (typischerweise Lohn, Stoffe/Material, Geräte, Nachunternehmer, Sonstiges sowie ein frei definierbarer Anteil), deren Summe den Einheitspreis ergibt.

### Einzelpreiskalkulation (Bottom-Up-Kalkulation / Urkalkulation)
Detaillierte Ermittlung eines Einheitspreises über untergeordnete Kalkulationsansätze (Arbeitszeitansätze, Baustoffe, Gerätestunden, Nachunternehmerleistungen) zuzüglich Kostenartenzuschlägen für Baustellengemeinkosten (BGK), Allgemeine Geschäftskosten (AGK) sowie Wagnis und Gewinn (W+G).

### Herstellkosten & Zuschlagskalkulation
- **Herstellkosten**: Summe der direkten Einzelkosten der Teilleistungen (EKT) ohne nachgelagerte Gemeinkosten- und Gewinnzuschläge.
- **Zuschlagskalkulation**: Beaufschlagung der Einzelkosten je Kostenart mit prozentualen Zuschlagssätzen zur Ermittlung des Angebotspreises.

### Kostenkennwert & Mengenbezugsgrößen (DIN 277)
Verhältniszahl aus Baukosten (z. B. je Kostengruppe nach DIN 276 oder Leistungsbereich) und einer geometrischen Bezugsgröße des Bauwerks (z. B. Brutto-Grundfläche **BGF**, Brutto-Rauminhalt **BRI** oder Nutzungsfläche **NF** nach **DIN 277**), angegeben etwa in `€/m² BGF`.

### Muster-LV (MLV) & Rahmenvertrag (RLV)
- **Muster-LV**: Projektübergreifende Bibliothek geprüfter Standardpositionen, Texte, Kostengruppenzuordnungen und Kalkulationsansätze.
- **Rahmenvertrag**: Zeitlich befristete Vereinbarung mit einem Auftragnehmer über fest vereinbarte Einheitspreise (ggf. mit Auf-/Abgebotsfaktor) für wiederkehrende Bauunterhaltungs- und Einzelabrufe.

---

## Planerhonorar (HOAI) & Projektsteuerung

### HOAI (Honorarordnung für Architekten und Ingenieure)
Bundesrechtliche Verordnung zur Berechnung der Entgelte für Grundleistungen und Besondere Leistungen der Architekten und Ingenieure in Deutschland.

### Leistungsbild & Leistungsphasen (LP 1 – LP 9)
Fachliche Gliederung der Planungsleistungen nach Objektkategorien (z. B. Gebäude § 35, Freianlagen § 40, Ingenieurbauwerke § 44, Tragwerksplanung § 52, Technische Ausrüstung § 56 HOAI). Jedes Leistungsbild unterteilt sich in bis zu neun **Leistungsphasen (LP 1 Grundlagenermittlung bis LP 9 Objektbetreuung)** mit gesetzlich definierten Prozentsätzen am Gesamthonorar.

### Anrechenbare Kosten
Derjenige Teil der nach DIN 276 ermittelten Netto-Baukosten (insbesondere KG 300 Bauwerk – Baukonstruktionen und KG 400 Bauwerk – Technische Anlagen), der nach den Vorschriften der HOAI als Bemessungsgrundlage in die Honorarberechnung einfließt.

### Honorarzone (I – V) & Honorarsatz
- **Honorarzone**: Einstufung des Planungsobjekts nach seinem Schwierigkeitsgrad (von Zone I = sehr geringe Planungsanforderungen bis Zone V = sehr hohe Planungsanforderungen), häufig über ein Punkteschema ermittelt.
- **Honorarsatz**: Lage innerhalb der Honorarspanne einer Zone zwischen unterem Honorarsatz (Basissatz/Mindestsatz), Viertelsatz (`25 %`), Mittelsatz (`50 %`), Dreiviertelsatz (`75 %`) und oberem Honorarsatz (Höchstsatz `100 %`).

### Bewertungstabellen (Siemon / Simmendinger) & Tafel-Extrapolation (RifT)
- **Siemon- / Simmendinger-Tabellen**: Anerkannte Split-Tabellen zur Bewertung einzelner Grundleistungen innerhalb einer Leistungsphase, wenn nicht alle Grundleistungen einer Phase übertragen werden.
- **RifT-Tabelle**: *Richtlinie der Staatlichen Bauverwaltungen* zur Fortschreibung der HOAI-Honorartafeln bei anrechenbaren Kosten oberhalb des regulären Tabellenendwerts.

### Mitverarbeitete Bausubstanz & Umbauzuschlag
- **Mitverarbeitete Bausubstanz (§ 4 Abs. 3 HOAI)**: Vorhandene, technisch oder gestalterisch mitverarbeitete Bauteile bei Bestandsbauten, die angemessen bei den anrechenbaren Kosten berücksichtigt werden.
- **Umbau- / Instandsetzungszuschlag (§ 6 Abs. 2 / § 12 HOAI)**: Prozentualer Honorarzuschlag auf das Grundhonorar bei Umbauten, Modernisierungen oder Instandsetzungen.

### Bauzeitenplan (Gantt) & 4D-BIM / 5D-BIM
- **Bauzeitenplan**: Zeitliche Ablaufplanung von Vorgängen, Meilensteinen und Abhängigkeiten unter Berücksichtigung von Arbeitszeitkalendern.
- **4D-BIM / 5D-BIM**: Verknüpfung von 3D-Bauteilen (IFC-GUIDs), LV-Positionen/Mengen (5D-Kostenverlauf / Mittelabflussplan) und Terminplan-Vorgängen (4D-Bauablaufsimulation).

---

## Bauleitung (LP 8) & DACH-Standards

### Bautagebuch
Chronologische tägliche Dokumentation des Bauablaufs auf der Baustelle (Witterung, eingesetzte Arbeitskräfte und Großgeräte, ausgeführte Arbeiten, Abnahmen, Behinderungen und besondere Vorkommnisse).

### Mängelmanagement, Plan-Pinning & BCF
- **Mängelmanagement**: Erfassung, Verortung, Fristüberwachung, Mängelanzeige und Freigabeprüfung von Ausführungsmängeln oder offenen Restleistungen (Tickets).
- **Plan-Pinning**: Grafische Verortung eines Mangels über X/Y-Koordinaten auf einem 2D-Bauplan (PDF).
- **BCF (BIM Collaboration Format)**: Offener buildingSMART-Standard zum Austausch modellbasierter Mängel und Aufgaben inklusive 3D-Kameraposition (Viewpoint), Schnittebenen und betroffener IFC-GUIDs.

### E-Rechnung (XRechnung & ZUGFeRD)
Strukturierte elektronische Rechnungsformate nach europäischer Norm **EN 16931** für Bau- und Planerrechnungen (reines XML bei **XRechnung** bzw. hybrides PDF/A-3 mit eingebettetem XML bei **ZUGFeRD**).

### DACH-Ausschreibungsstandards (STLB-Bau, ÖNORM, SIA / CRB NPK)
- **STLB-Bau / STLB-K / STLK**: Dynamische bzw. katalogbasierte deutsche Standardleistungsbücher für das Bauwesen sowie den Straßen-, Brücken- und Wasserbau.
- **ÖNORM B 2063 / A 2063**: Österreichische Standards für Leistungsbeschreibungen, Aufmaß und elektronischen AVA-Datenaustausch (`.onlv` / `.onlb`).
- **SIA 451 & CRB NPK**: Schweizerischer Datenaustauschstandard (**SIA 451**) und **Normpositionen-Katalog (NPK)** der Schweizerischen Zentralstelle für Baurationalisierung (CRB) inklusive Baukostenplan (**BKP / eBKP**).
