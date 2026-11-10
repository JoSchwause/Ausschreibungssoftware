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
Position für Leistungen, deren Notwendigkeit bei Erstellung des LVs noch nicht feststeht. Bedarfs- und Wahlsummen werden getrennt ausgewiesen (E-04). Bedarf, Wahl, Stundenlohn und Pauschal sind einzeln kombinierbare Merkmale einer Position (E-05):
- **Ohne Gesamtbetrag (Standard nach VOB)**: Bieter gibt einen Einheitspreis (EP) an, der Gesamtpreis (GP) wird jedoch **nicht** in die Angebotssumme eingerechnet (oder separat ausgewiesen).
- **Mit Gesamtbetrag**: Menge × EP fließt in die Wertungssumme ein (nur in begründeten Ausnahmefällen zulässig).

### Wahlposition (Alternativposition)
Alternative Ausführungsvariante zu einer Grundposition (oder einer anderen Wahlposition). Gruppen- und Variantennummer aus GAEB bleiben erhalten; „gewählt“ wird erst bei der Vergabe (E-04). Im Standardzustand fließt der Gesamtpreis einer Wahlposition **nicht** in die LV-Summe ein, bis sich der Auftraggeber im Rahmen der Vergabe aktiv für diese Alternative entscheidet (wodurch sie die zugehörige Grundposition ersetzt).

### Zuschlagsposition
Position, die eine Mehr- oder Zusatzleistung zu einer bestehenden Bezugsposition (Grundposition) beschreibt (z. B. erschwerte Bedingungen oder höherwertiges Material) und zusätzlich zum Preis der Bezugsposition vergütet wird. Entspricht in GAEB dem Element `MarkupItem`. Die Referenzsoftware nennt sie „Zulage“; im Projekt gilt nur „Zuschlagsposition“ (Entscheidung 2026-11-09). Ab v1.1b/K6 gilt GAEB-Semantik: ein Prozentsatz auf die Summe der Bezugspositionen, mit mehreren Bezugsformen (Liste mit Teilmengen, alle Positionen einer Gliederung, markierte Positionen); bis dahin rechnet der Kern sie vorläufig wie eine Normalposition (Entscheidung E-03, 2026-11-10).

### Stundenlohnposition (Regieposition)
Position zur Abrechnung von Arbeiten nach Zeitaufwand (Stundenlohnarbeiten) anstelle einer mengenbezogenen Leistungseinheit.

### Positionsmerkmal
Eigenschaft einer Position, die sich mit anderen kombinieren lässt (E-05): Bedarf (mit oder ohne Gesamtbetrag), Wahl, Stundenlohn, Pauschal und das Zuschlagskennzeichen. Eine Bedarfsposition im Stundenlohn ist deshalb darstellbar. Es gibt keine einzelne „Positionsart“ mehr; im Code `Positionsmerkmale`. Welche Kombinationen fachlich ungültig sind, legt der Kern fest.

### Wahlzuordnung (Gruppe und Variante)
Die Zuordnung einer Position zu einer Wahl mit Gruppennummer und Variantennummer aus GAEB (Variante 0: Grundausführung, 1 bis 9: Alternativen). Im Ausschreibungs-LV gibt es keinen Zustand „gewählt“; gewählt wird bei der Vergabe (E-04). Im Code `Wahlzuordnung`.

### Zuschlagsbezug (Bezugsposition)
Die Positionen, auf die sich eine Zuschlagsposition bezieht. Drei Formen wie in GAEB: eine Liste einzelner Positionen (je mit optionaler Teilmenge), alle Positionen der Gliederung, unter der die Zuschlagsposition steht, oder alle Positionen mit Zuschlagskennzeichen. Im Code `Zuschlagsbezug`, `Bezugsposition`.

### Zuschlagskennzeichen
Markierung an einer Position, die sie zum Bezug einer Zuschlagsposition der Form „Kennzeichnung“ macht (GAEB `MarkupIt`). Im Code `Positionsmerkmale.zuschlagskennzeichen`.

### Leitbeschreibung / Unterbeschreibung
Eine Position mit Leitbeschreibung fasst mehrere Unterbeschreibungen zusammen; jede Unterbeschreibung ist eine Teilleistung mit Nummer, eigenem Text und optionaler Menge und Einheit (E-11). Im Code `Leitbeschreibung`, `Unterbeschreibung`.

### Bedarfssumme / Wahlsumme
Getrennt ausgewiesene Summen neben dem Netto (E-04): die Summe der Bedarfspositionen ohne Gesamtbetrag und die Summe der Wahlpositionen. Beide gehen nicht ins Netto ein. Im Code `summeBedarfOhneGesamtbetrag`, `summeWahl`.

### Hinweistext / Vorbemerkung / Texthinweis
Nicht-bepreister Textbaustein innerhalb des LVs (ohne Menge, Einheit und Preis), der Vertrags-, Ausführungs- oder technische Rahmenbedingungen für das gesamte LV, einen Titel oder nachfolgende Positionen erläutert.

### Kurztext & Langtext
- **Kurztext**: Prägnante einzeilige Bezeichnung der Position für Tabellenübersichten, Preisspiegel und Rechnungsdruck.
- **Langtext**: Vollständige, eindeutige und erschöpfende Beschreibung der geforderten Leistung (oft formatiert als Rich-Text/HTML oder GAEB-Textstruktur, ggf. aus Standardleistungsbüchern wie STLB-Bau abgeleitet).
  Ab `vertrag` v1.1b trägt der Langtext die GAEB-abbildbare Teilmenge: Auszeichnung (fett, kursiv, unterstrichen), Absätze, Listen, Tabellen, Bilder und Textergänzungen (E-10).

### Textergänzung
Stelle im Langtext, die der Bieter oder der Ausschreibende ausfüllt, mit Kennung und drei Teilen (davor, Stelle, danach; GAEB `TextComplement`). Der Bieter trägt seine Eingabe in X84 zurück (G-32). Im Code `Textergaenzung`.

### Menge, Einheit, Einheitspreis (EP), Gesamtpreis (GP)
- **Menge (Vordersatz)**: Geplante Ausführungsmenge einer Position, mit 3 Nachkommastellen.
- **Einheit**: Maßeinheit der Position (z. B. `m`, `m²`, `m³`, `St`, `psch`, `h`, `t`, `kg`).
- **Einheitspreis (EP)**: Netto-Preis pro Einheit, mit 3 Nachkommastellen gespeichert (Entscheidung G-21).
- **Gesamtpreis (GP)**: Produkt aus Menge × EP, kaufmännisch auf 2 Nachkommastellen (Cent) gerundet.

---

## Datenmodell, Befehle und Prüfung (Paket `vertrag`)

### Nachkommastellen (Dezimalwert)
Menge und Einheitspreis haben 3, Prozentwerte und Beträge 2 Nachkommastellen (G-21). Zahlen sind Dezimalwerte, nie Gleitkommazahlen; sie stehen im Speicher und in der Projektdatei als Zeichenkette in Punktnotation (`"12.35"`). Das deutsche Format (Dezimalkomma) gibt es nur an den Rändern der Anwendung.

### Kaufmännische Rundung
Rundung auf die Skala des Zahlentyps (Paket `dezimal`): Ist die erste wegfallende Ziffer 5 bis 9, wird aufgerundet, sonst abgerundet (half-up, DIN-1333-Regel für Beträge: 2,5 → 3 und 2,4 → 2). **Negative Werte** (Abzugspositionen, Nachlass-Beträge) werden nach ihrem Betrag gerundet, danach wird das Vorzeichen wieder gesetzt: Die Hälfte rundet also von Null weg (−2,5 → −3; −13,3750 → −13,38). Das Ergebnis ist nie „−0,00“. Beispiel: Menge −2,500 × EP 0,010 = −0,025 ergibt GP −0,03 (nicht −0,02).

### Gliederung
Oberbegriff für Los und Titel im LV-Baum. Eine Gliederung hat Ordnungszahl und Kurztext, aber keine Menge und keinen Preis; ihre Summe verdichtet die darunterliegenden Positionen.

### Angebot
Die Preise eines Bieters zu den Positionen eines Ausschreibungs-LV. Ein Angebot trägt höchstens einen eigenen Nachlass und verweist auf die Positionen über deren Positionsidentität. Der MwSt-Satz ist der des LV.

### Bieter
Anbieter, der zu einem Projekt ein oder mehrere Angebote abgibt. Nicht zu verwechseln mit dem **virtuellen Bieter** des Preisspiegels.

### Auftrags-Leistungsverzeichnis
Das nach dem Zuschlag aus Ausschreibungs-LV und beauftragtem Angebot entstehende LV mit den Vertragspreisen. Eigenes Aggregat mit den Positions-IDs der Ausschreibung (ADR 0011).

### Positionsidentität
Die unveränderliche, undurchsichtige Kennung (UUIDv7) einer Position. Sie ist im Ausschreibungs-LV, in jedem Angebot und im Auftrags-LV dieselbe und der einzige gemeinsame Schlüssel der Aggregate. Die Ordnungszahl ist nie ein Schlüssel.

### Nicht angeboten
Zustand einer Angebotsposition, zu der der Bieter keinen Preis abgegeben hat. Er ist verschieden von einem angebotenen Preis von 0,00.

### Befehl
Jede Änderung am Projekt ist ein Befehl, reine Daten ohne Funktionen und Zeitangaben (z. B. `MengeAendern`, `KnotenLoeschen`). Aus Zustand und Befehl entsteht ein ChangeSet oder ein Fehlerwert.

### ChangeSet
Ergebnis eines Befehls: die hinzugefügten, geänderten (mit altem und neuem Stand) und entfernten Knoten sowie die betroffenen Summen. UI, Speicher und Undo wenden ChangeSets an.

### Protokolleintrag
Ein Eintrag des Befehlsprotokolls: wer hat wann welchen Befehl ausgeführt. Genau ein Eintrag je Befehl. Bei einem Massenbefehl steht statt des ganzen Befehls seine Befehlskurzfassung (E-13).

### Massenbefehl
Befehl, der ein ganzes Aggregat mit langer Liste anlegt (`LeistungsverzeichnisAnlegen`, `AngebotAnlegen`, `AuftragsLeistungsverzeichnisAnlegen`; Konstante `MASSENBEFEHLSARTEN`). Im Protokoll genügen Kopf und Prüfsumme (E-13, ADR 0009).

### Befehlskurzfassung
Das, was das Befehlsprotokoll von einem Massenbefehl aufbewahrt: der Kopf (der Befehl ohne seine lange Liste) und eine Prüfsumme über den vollständigen Befehl, mit dem Algorithmus als Feld. Im Code `Befehlskurzfassung`, `Massenbefehlskopf`, `Pruefsumme`.

### Projektdatei
Die JSON-Datei zum Sichern und Austauschen eines Projekts, mit Schemaversion. Ältere Versionen lassen sich weiter öffnen.

### Prüfbefund
Warnung oder Fehler einer Prüfung (GAEB-Lesen, GAEB-Prüfung, LV-Prüfung) mit Quelle und Ort. Ein Prüfbefund sperrt nie die Eingabe.

### Befehlshinweis
Hinweis zu einem angenommenen Befehl (z. B. die Vergabe der Ordnungszahl wich auf einen kleineren Schritt aus, oder das Netto nach Nachlass ist negativ). Der Befehl wird trotzdem ausgeführt; ein Befehlshinweis ist kein Fehler und kein Prüfbefund, er ist flüchtig und wird nicht gespeichert. Die dauerhafte Fassung ist der Prüfbefund der LV-Prüfung.

### Auftraggeber (Kopfdaten)
Angaben zum Auftraggeber am LV, soweit die amtlichen GAEB-Dateien sie zeigen (Name, Anschrift, Vergabenummer; E-11). Nicht gleichgesetzt mit dem `Bauherr` des Projekts. Im Code `Auftraggeber`.

### Vergabeinformationen (Kopfdaten)
Angaben zum Vergabeverfahren am LV, soweit die amtlichen GAEB-Dateien sie zeigen (Eröffnungstermin, Abgabeort, Ausführungszeitraum, Auftragsnummer und -datum, Abnahmeart, Gewährleistung; E-11). Im Code `Vergabeinformationen`.

### Wurzel (des LV-Baums)
Die Kennung des LV (oder Auftrags-LV) selbst, die die Knoten der obersten Ebene als Elternknoten tragen. Im Code `WurzelId`, `LvInhalt.wurzelId`, `LvAnsicht.wurzelId`.

### Los-Stufe
Die oberste Stufe der OZ-Maske, wenn das LV Lose hat. Das Los ist die oberste Gliederungsstufe und zählt zu den höchstens 5 Stufen (F1); Lose und Titel stehen nie nebeneinander auf der obersten Stufe.

### Entwurfskennzeichen
Markierung eines GAEB-Exports, bei dem die eigene Prüfung Fehler fand. Der Export wird gewarnt und als Entwurf gekennzeichnet, nicht gesperrt.

### Schreibweise im Code
Bezeichner und Befehlsnamen im Code folgen dem Glossar, aber ASCII-transliteriert: ä = ae, ö = oe, ü = ue, ß = ss (z. B. `KnotenLoeschen`, `Ausreisser`). Technische Begriffe ohne Fachbezug bleiben englisch.

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

### Virtueller Bieter
Rechnerischer Vergleichsbieter im Preisspiegel, der nicht selbst angeboten hat: der günstigste Bieter (Min), der Mittelwert, der höchste Bieter (Max) und der Schätzpreis aus dem LV.

### Ausreißer
Bieterpreis, der um mehr als einen einstellbaren Schwellenwert vom Mittelwert oder Referenzpreis abweicht (Standard ±20 %). Das Mittel bilden nur die Bieter mit einem Einheitspreis über 0,00 (D-05); ein Nullpreis und „nicht angeboten“ haben je ein eigenes Kennzeichen und sind nie Ausreißer. Unter zwei Bietern mit Preis über 0,00 wird nichts markiert. Im Code `Ausreisser`.

### Bietersumme
Die Gesamtsummen eines Angebots (Netto, Nachlass, Netto nach Nachlass, MwSt, Brutto), gerechnet wie die des LV: mit den Einheitspreisen des Angebots, dem Nachlass des Angebots und dem MwSt-Satz des LV. Eine nicht angebotene Position geht nicht ein. Im Code `angebotSummenBerechnen`, `Bietersumme`.

### Rang
Reihenfolge der Bieter im Preisspiegel nach Netto nach Nachlass, aufsteigend (Rang 1 ist das günstigste Angebot). Gleiche Werte haben gleichen Rang. Im Code `rang`.

### ABC-Klasse
Einteilung der Positionen eines Preisspiegels nach ihrem Anteil an der Summe: absteigend nach Gesamtpreis sortiert bilden die Positionen bis zu einer einstellbaren Schwelle (Standard 80 %) die Klasse A, bis zur zweiten Schwelle (Standard 95 %) die Klasse B, der Rest die Klasse C. Bezug ist der GP eines virtuellen Bieters (Standard: Mittel). Im Code `AbcKlasse`.

### Nullpreis
Ein angebotener Einheitspreis von 0,00. Er ist ein Preis (GP 0,00, geht in die Bietersumme ein), anders als „nicht angeboten“, trägt im Preisspiegel aber ein eigenes Kennzeichen, zählt nicht für Min, Mittel und Max und ist nie Ausreißer (D-05). Im Code `nullpreis`.

### Nachlass
Prozentualer oder absoluter Abzug auf die Summe eines LVs. In v1 gibt es genau einen Nachlass je LV. Er ist umkehrbar und wird nicht in die Einheitspreise eingerechnet. Der Nachlassbetrag wird auf 2 Stellen gerundet und dann abgezogen; ein negatives Netto nach Nachlass ist ein Befund der LV-Prüfung (E-06).

### Befehlsprotokoll
Dauerhaftes Nebenbuch aller Befehle am Projekt (wer, was, wann). Es ist kein Quellzustand und in v1 nicht sichtbar (ADR 0009). Bei Massenbefehlen (z. B. GAEB-Import) werden nur Kopf und Prüfsumme protokolliert (E-13).

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
