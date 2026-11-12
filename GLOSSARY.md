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

### Wahlgruppe
Die Alternativen, unter denen bei der Vergabe höchstens eine gewählt wird, mit den Grundpositionen, die eine gewählte Alternative ersetzt (D-21, D-59.1). Zusammengehörig sind Positionen mit derselben GAEB-Gruppennummer unter demselben Elternknoten und Alternativen mit ihrem Verweis auf die Grundposition; Grundposition ist jedes Mitglied, das keine Alternative ist (Variante 0 oder Ziel des Verweises). Im Code `wahlgruppenBilden` (`packages/vergabe`).

### Zuschlagsposition
Position, die eine Mehr- oder Zusatzleistung zu Bezugspositionen beschreibt (z. B. erschwerte Bedingungen) und zusätzlich vergütet wird. Entspricht in GAEB dem Element `MarkupItem`. Die Referenzsoftware nennt sie „Zulage“; im Projekt gilt nur „Zuschlagsposition“ (Entscheidung 2026-11-09). Seit K6 gilt GAEB-Semantik (E-03, D-03): Ihr Betrag ist der Zuschlagssatz auf die Zuschlagsbasis, kaufmännisch auf 2 Stellen gerundet, und geht wie ein GP in die Gliederungssumme und, nach ihren Merkmalen, in Netto, Bedarfs- oder Wahlsumme. Drei Bezugsformen (siehe Zuschlagsbezug): Gliederung, Kennzeichnung, Liste. Eine Zuschlagsposition ist nie Bezugsposition einer anderen. Ohne Satz hat sie keinen Betrag, außer in der Altform. Im Code `Positionsdaten.zuschlag`.

### Zuschlagsbasis
Die Summe der GP der Bezugspositionen einer Zuschlagsposition, auf die der Zuschlagssatz gerechnet wird. Es zählen nur Bezugspositionen mit GP, deren Betrag ins Netto geht (keine Wahl mit Variante ungleich 0, kein Bedarf ohne Gesamtbetrag) und die selbst keine Zuschlagsposition sind; bei einer Teilmenge zählt Teilmenge × EP. Im Code `Zuschlagsbasis.basis` (`zuschlagsbasen`).

### Altform der Zuschlagsposition
Eine Zuschlagsposition ohne Zuschlagssatz, aber mit eigener Menge und eigenem EP. Sie rechnet wie vor K6 Menge × EP (gespeicherte Projekte der Schemaversion 1; D-10). Die LV-Prüfung meldet sie als Befund (K8). Die Fixtures `typisch`, `gross` und `typisch-angebote` trugen sie bis Ticket 51 und stehen seitdem in der GAEB-Form (Satz und Bezugsform Liste; aus Ticket 44 abgespalten, D-44.2).

### Stundenlohnposition (Regieposition)
Position zur Abrechnung von Arbeiten nach Zeitaufwand (Stundenlohnarbeiten) anstelle einer mengenbezogenen Leistungseinheit.

### Positionsmerkmal
Eigenschaft einer Position, die sich mit anderen kombinieren lässt (E-05): Bedarf (mit oder ohne Gesamtbetrag), Wahl, Stundenlohn, Pauschal und das Zuschlagskennzeichen. Eine Bedarfsposition im Stundenlohn ist deshalb darstellbar. Es gibt keine einzelne „Positionsart“ mehr; im Code `Positionsmerkmale`. Welche Kombinationen fachlich ungültig sind, legt der Kern fest.

### Wahlzuordnung (Gruppe und Variante)
Die Zuordnung einer Position zu einer Wahl mit Gruppennummer und Variantennummer aus GAEB (Variante 0: Grundausführung, 1 bis 9: Alternativen). Im Ausschreibungs-LV gibt es keinen Zustand „gewählt“; gewählt wird bei der Vergabe (E-04). Im Code `Wahlzuordnung`.

### Zuschlagsbezug (Bezugsposition)
Die Positionen, auf die sich eine Zuschlagsposition bezieht. Drei Formen wie in GAEB: eine Liste einzelner Positionen, wo immer sie im LV stehen, je mit optionaler Teilmenge (`ListInSubQty`); „Gliederung“: die Positionen vor der Zuschlagsposition unter demselben Elternknoten bis zur vorigen Zuschlagsposition oder zum Anfang, wobei unmittelbar aufeinanderfolgende Zuschlagspositionen dieselbe Basis teilen (`AllInCat`); „Kennzeichnung“: derselbe Bereich, davon nur die Positionen mit Zuschlagskennzeichen (`IdentAsMark`). Im Code `Zuschlagsbezug`, `Bezugsposition`.

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
Stelle im Langtext, die der Bieter oder der Ausschreibende ausfüllt, mit Kennung und drei Teilen (davor, Stelle, danach; GAEB `TextComplement`). Der Bieter trägt seine Eingabe in X84 zurück (G-32). Im Code `Textergaenzung`. Die Eingabe des Bieters zu einer Textergänzung im Angebot heißt **Bieterergänzung**; das Angebot hält sie noch nicht (Befund beim X84-Import, Offene Typfrage in Ticket 53).

### Menge, Einheit, Einheitspreis (EP), Gesamtpreis (GP)
- **Menge (Vordersatz)**: Geplante Ausführungsmenge einer Position, mit 3 Nachkommastellen.
- **Einheit**: Maßeinheit der Position (z. B. `m`, `m²`, `m³`, `St`, `psch`, `h`, `t`, `kg`). Eine leere Eingabe ist keine Einheit: Ein Befehl darf eine leere Zeichenkette tragen, gespeichert wird „keine Einheit“ (`null`); im Zustand steht nie eine leere Einheit (D-06).
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
Warnung oder Fehler einer Prüfung (GAEB-Lesen, GAEB-Prüfung, LV-Prüfung, E-Rechnung lesen) mit Quelle und Ort. Ein Prüfbefund sperrt nie die Eingabe. Beim Lesen einer E-Rechnung (Quelle `erechnung-lesen`, v1.5) ist der Ort der Business Term der EN 16931, zu dem der Befund gehört (z. B. `BT-115`), und das Element in der Datei; Zeile und Spalte nur, wenn die Datei kein lesbares XML ist. Weitere Quellen (v1.6): IFC lesen (`ifc-lesen`, Ort: die Instanz der Datei wie `#123` mit ihrer Zeile), Modellprüfung (`modell-pruefung`, Paket `bim`: das Bauteil über seine GlobalId, die Position über ihre Kennung), Terminrechnung (`terminrechnung`: der Vorgang), Honorarberechnung (`honorarberechnung`: das Honorarobjekt als Pfad `/objekte[n]`, ab 1) und Fristprüfung (`fristpruefung`: der Mangel). Im Code `Pruefbefund`, `Befundquelle`, `Befundort`.

### Migrationsbefund
Hinweis des Speichers, dass eine Migration die Summen eines Aggregats (LV, Angebot, Auftrags-LV) nicht mit dem Kern neu rechnen konnte, weil der Kern dessen Altdaten abweist. Daten und gespeicherte Summen bleiben unverändert, die Migration läuft weiter (D-17, Q5). Im Code `Migrationsbefund`, `migrationsbefunde()`.

### Formale LV-Prüfung (LV-Prüfung)
Die Prüfung eines Ausschreibungs-LV auf Vollständigkeit und GAEB-Tauglichkeit (fehlende oder doppelte Ordnungszahl, leere Texte, fehlende Einheit oder Menge, zu große Zahlen, Zuschlagspositionen ohne Bezug, negatives Netto nach Nachlass usw.). Sie liefert Prüfbefunde mit der Quelle `lv-pruefung` und sperrt nie die Eingabe. Im Code `lvPruefen`, Regeln in `pruefregeln.ts`.

### Befehlshinweis
Hinweis zu einem angenommenen Befehl (z. B. die Vergabe der Ordnungszahl wich auf einen kleineren Schritt aus, das Netto nach Nachlass ist negativ, oder ein GAEB-Import brachte eine OZ-Maske mit, die die Prüfung beanstandet). Der Befehl wird trotzdem ausgeführt; ein Befehlshinweis ist kein Fehler und kein Prüfbefund, er ist flüchtig und wird nicht gespeichert. Die dauerhafte Fassung ist der Prüfbefund der LV-Prüfung.

### Papierkorb, Papierkorbeintrag
Ablage gelöschter Knoten eines LV, aus der sie sich wiederherstellen lassen. Ein Papierkorbeintrag hält die Knoten eines Löschvorgangs samt Unterbäumen und ihrer alten Lage; beim Wiederherstellen behalten sie ihre Kennungen (Positionsidentität). Positionen im Papierkorb gehen in keine Summe ein. Bezüge auf Positionen im Papierkorb bleiben stehen und zählen nichts, bis die Position zurückkommt; erst das endgültige Entfernen löst sie. Endgültig entfernt wird ein Eintrag nur ausdrücklich und nicht, solange ein Angebot auf eine seiner Positionen verweist (Q5). Im Code `Papierkorbeintrag`, `LvZustand.papierkorb`, `KnotenInPapierkorbLegen`.

### LV-Stand
Ein benannter, eingefrorener und unveränderlicher Stand eines LV samt Summen (ADR 0006), z. B. vor dem Versand. Ein LV-Stand wird nicht zurück in das bestehende LV geschrieben; ein LV daraus entsteht als neues LV. Im Code `LvStand`, `LvStandAnlegen`.

### Rückgängig / Wiederholen (Undo/Redo)
Nimmt den letzten Befehl der Sitzung zurück bzw. führt einen zurückgenommenen wieder aus. Beides sind selbst Befehle im Befehlsprotokoll; ihr ChangeSet ist die Umkehrung bzw. das Original des ursprünglichen ChangeSets (ADR 0006). Im Code `Rueckgaengig`, `Wiederholen`.

### Zuschlagssatz
Der Prozentsatz einer Zuschlagsposition, der auf die Summe ihrer Bezugspositionen gerechnet wird (GAEB `Markup`). Im LV steht er an der Zuschlagsposition (`Zuschlag.prozentsatz`), im Angebot ist es der Satz, den der Bieter anbietet (`Angebotsposition.zuschlagssatz`, X84). Ist er im Angebot gesetzt, rechnet das Angebot die Zuschlagsposition mit diesem Satz, nicht mit einem Einheitspreis. Nicht zu verwechseln mit dem Zuschlagssatz der Kalkulation.

### Auftraggeber (Kopfdaten)
Angaben zum Auftraggeber am LV, soweit die amtlichen GAEB-Dateien sie zeigen (Name, Anschrift, Vergabenummer; E-11). Nicht gleichgesetzt mit dem `Bauherr` des Projekts. Im Code `Auftraggeber`.

### Auftragnehmer (Kopfdaten)
Der Bieter, der den Zuschlag erhalten hat, mit Name und Anschrift, soweit die GAEB-Dateien sie zeigen (GAEB `CTR`, X86). Steht am LV-Kopf; gesetzt beim Auftrags-LV (Zuschlag) oder aus einer X86-Datei; im Ausschreibungs-LV fehlt er. Nicht gleichgesetzt mit dem `Bieter` des Projekts, der nur einen Namen hat. Im Code `Auftragnehmer`, `LvInhaltKopf.auftragnehmer`.

### Vergabeinformationen (Kopfdaten)
Angaben zum Vergabeverfahren am LV, soweit die amtlichen GAEB-Dateien sie zeigen (Eröffnungstermin, Abgabeort, Ausführungszeitraum, Auftragsnummer und -datum, Abnahmeart, Gewährleistung; E-11). Im Code `Vergabeinformationen`.

### Wurzel (des LV-Baums)
Die Kennung des LV (oder Auftrags-LV) selbst, die die Knoten der obersten Ebene als Elternknoten tragen. Im Code `WurzelId`, `LvInhalt.wurzelId`, `LvAnsicht.wurzelId`.

### Los-Stufe
Die oberste Stufe der OZ-Maske, wenn das LV Lose hat. Das Los ist die oberste Gliederungsstufe und zählt zu den höchstens 5 Stufen (F1); Lose und Titel stehen nie nebeneinander auf der obersten Stufe.

### OZ-Vorschlag
Die Ordnungszahl, die der Kern für einen neuen Knoten an einem Ort vorschlägt, bevor die App oder eine reine Funktion den Befehl baut (der Befehl trägt die OZ dann als Wert): der Teil des Vorgängers unter denselben Geschwistern plus 10 (Position) bzw. plus 1 (Gliederung); passt das nicht, 5, 2 oder 1 mit Befehlshinweis, sonst kein Vorschlag (F2, D-42.3). Er gilt im LV und im Auftrags-LV, jeweils mit der Kennung des eigenen Aggregats als Wurzel (v1.5, D-80.1). Im Code `OzVorschlag`, Signatur `OzVorschlagen`, Funktion `ozVorschlag` (Paket `kern`).

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
- **Blankett**: Das LV ohne Preise als Vordruck für Bieter (PDF „ohne Preise“ mit Eingabefeldern, Excel für Bieter). Der Bieter trägt EP und, bei Zuschlagspositionen, den Zuschlagssatz ein.
- **Excel-Rundlauf**: Der Weg Blankett als `.xlsx` → Bieter füllt EP aus → „Excel einlesen“ legt Bieter und Angebot an. Zugeordnet wird über die versteckte Positions-ID; eine Prüfsumme der LV-Struktur zeigt, ob das LV seit dem Export geändert wurde. Gleichwertig zum X84-Weg, nicht GAEB.

### BIM (Building Information Modeling) & IFC
Modellbasierte Arbeitsweise im Bauwesen. Über offene Austauschformate wie **IFC (Industry Foundation Classes)** werden 3D-Bauwerksmodelle mit Bauteileigenschaften (Properties/Quantities) geladen, um Mengen direkt am 3D-Bauteil zu ermitteln (**modellbasierte Mengenermittlung / QTO**) und nachvollziehbar mit LV-Positionen oder Kostengruppen zu verknüpfen.

### Bauwerksmodell
Ein eingelesenes IFC-Modell (IFC 2x3 oder IFC 4, Datei im STEP-Format `.ifc`), unveränderlich: Bauwerksstruktur und Bauteile mit ihren Mengen, ohne Geometrie. Jedes Einlesen ergibt ein neues Bauwerksmodell; ein neuer Stand nennt seinen Vorgänger. Im Code `Bauwerksmodell`, gelesen von `ifcLesen` (Paket `ifc`).

### Bauwerksstruktur / Strukturknoten
Die räumliche Gliederung eines Bauwerksmodells: Projekt → Grundstück → Gebäude → Geschoss → Raum (IFC `IfcProject`, `IfcSite`, `IfcBuilding`, `IfcBuildingStorey`, `IfcSpace`, verbunden über `IfcRelAggregates`). Ein **Strukturknoten** ist ein Knoten dieser Gliederung mit GlobalId, Art (`projekt`, `grundstueck`, `gebaeude`, `geschoss`, `raum`), Name, Elternknoten und eigenen Bauteilmengen (z. B. Brutto-Grundfläche eines Geschosses, Netto-Raumfläche eines Raums).

### Bauteil
Ein Produkt des Bauwerksmodells mit GlobalId (Wand, Decke, Fenster, Tür …), das in einem Strukturknoten steht (`IfcRelContainedInSpatialStructure`), oder ein Teil eines solchen Produkts (`IfcRelAggregates`, mit Verweis auf das Ganze). Öffnungen, virtuelle Elemente, Beschriftungen und Raster sind keine Bauteile. Ein Bauteil trägt seine IFC-Klasse, wie sie in der Datei steht (z. B. `IfcWallStandardCase`), Name, Typname, Bauteilmengen, Eigenschaften, Klassifikationen (System, Kennung, Name) und Materialnamen. Eine dreistellige Nummer aus einer Klassifikation mit „276“ im Namen ist ein **Kostengruppen-Vorschlag**, keine Zuordnung.

### GlobalId
Die Kennung eines Objekts in IFC: 22 Zeichen aus dem IFC-Base64-Alphabet (`0-9`, `A-Z`, `a-z`, `_`, `$`). Über sie werden Bauteile zwischen zwei Modellständen, zwischen Leser und 3D-Ansicht und mit LV-Positionen verknüpft. Doppelte oder nicht wohlgeformte GlobalIds sind ein Befund; beide Objekte bleiben. Im Bauwerksmodell (v1.6) meint jeder Verweis bei einer doppelten GlobalId das erste Objekt in der Reihenfolge der Datei. Im Code `IfcGlobalId`, Muster `IFC_GLOBALID_MUSTER` (Paket `vertrag`).

### Mengensatz
Eine benannte Gruppe von Bauteilmengen in IFC (`IfcElementQuantity`, z. B. `Qto_WallBaseQuantities`), am Bauteil oder an seinem Typ. Eine Menge am Bauteil überschreibt die gleichnamige Menge desselben Mengensatzes am Typ. Im Code `satz` einer Bauteilmenge.

### Bauteilmenge
Eine Menge eines Bauteils oder Strukturknotens aus einem Mengensatz: Name, wie er im Modell steht (z. B. `NetVolume`), Art (`laenge`, `flaeche`, `volumen`, `anzahl`, `gewicht`, `zeit`) und Wert in der SI-Grundeinheit (m, m², m³, Stück, kg, s), exakt umgerechnet und erst am Ende kaufmännisch auf 3 Stellen gerundet. Fehlt die Einheit, bleibt die Menge ohne Wert (nie 0). Eine Bauteilmenge wird nie aus der Geometrie berechnet. Derselbe Name in zwei Mengensätzen eines Bauteils ergibt zwei Bauteilmengen.

### Eigenschaftssatz
Eine benannte Gruppe von Eigenschaften in IFC (`IfcPropertySet`, z. B. `Pset_WallCommon` mit `IsExternal`), am Bauteil oder an seinem Typ; das Bauteil überschreibt den Typ wie beim Mengensatz. Eine Eigenschaft hat einen Namen und Werte als Text mit IFC-Typname (z. B. `IfcBoolean`, `IfcLengthMeasure`). Eigenschaften werden nicht im Bauwerksmodell gespeichert, sondern bei Bedarf aus der Datei gelesen (D-51).

### Modellstand
Ein Bauwerksmodell als Stand einer Folge (D-53): Wer eine neue Fassung derselben Planung einliest, legt ein neues Bauwerksmodell an, das seinen **Vorgänger** nennt; zwei Stände werden über die GlobalId verglichen. Ein Bauwerksmodell ändert sich nach dem Anlegen nicht mehr, nur sein Name; das Datum des Einlesens setzt die App. Ein Stand, den ein anderer als Vorgänger nennt oder auf den ein Mangel verweist, lässt sich nicht löschen (v1.6, Q5). Im Code `Bauwerksmodell.vorgaengerId`, `Bauwerksmodell.eingelesen`, Befehle `BauwerksmodellAnlegen`, `BauwerksmodellUmbenennen`, `BauwerksmodellLoeschen`.

### Modelldatei
Die IFC-Datei eines Bauwerksmodells, unverändert als Bytes abgelegt und über den SHA-256 ihrer unkomprimierten Bytes angesprochen (64 Hexziffern, klein; inhaltsadressiert, D-51). Die Bytes stehen nie in einem Aggregat, einem ChangeSet oder der Undo-Historie; das Bauwerksmodell trägt nur Hash, Dateinamen und Größe. Gleiche Bytes liegen nur einmal ab und bleiben, solange ein Bauwerksmodell sie nennt. In der Projektdatei stehen sie komprimiert (deflate-raw, Base64), damit eine Sicherung eine einzige Datei bleibt; verglichen wird immer der SHA-256 der unkomprimierten Bytes. Eigenschaften und Klassifikationen der Bauteile liest die App bei Bedarf aus diesen Bytes. Im Code `Modelldatei` (`hash`, `dateiname`, `groesse`), `Modelldateiablage` (`Speicher.modelldateien`).

### Modellansicht
Die 3D-Ansicht eines Bauwerksmodells im Browser: Sie zeichnet die Geometrie aus der Modelldatei (web-ifc und three.js, nur im Paket `ui-modell`, D-50) und zeigt nur an, sie ändert nichts. Bauteile kennt sie nur über ihre GlobalId: Die Auswahl geht als Liste von GlobalIds hinein und heraus, so gleicht die App sie mit dem Modellbaum ab; Bauteile ohne Geometrie meldet sie als Befund. Im Code `Modellansicht` (Paket `ui-modell`).

### Bauteilzuordnung
Die Verknüpfung einer Position (im Ausschreibungs-LV oder Auftrags-LV) mit einem Bauteil über dessen GlobalId und die Mengenart, die die Position vom Bauteil übernimmt (D-52). Eine Position trägt eine geordnete Liste von Zuordnungen; ein Bauteil darf mehreren Positionen zugeordnet sein, dasselbe Paar aus GlobalId und Mengenart an einer Position nur einmal. Die Zuordnung nennt kein Modell, sie gilt für jeden Modellstand, in dem das Bauteil steht; eine GlobalId, die im gewählten Modell fehlt, ist eine **hängende Zuordnung** (Befund, keine Sperre). Die Kostengruppe eines Bauteils ist die seiner Position. Kopieren einer Position verwirft ihre Zuordnungen, Verschieben behält sie; ein LV-Stand trägt sie, der Zuschlag übernimmt sie ins Auftrags-LV. Im Code `Bauteilzuordnung`, `Positionsdaten.bauteile`, Befehl `BauteileZuordnen`.

### Mengenart
Welche Menge eine Position von einem zugeordneten Bauteil übernimmt: der Name einer Bauteilmenge, wie er im Modell steht (z. B. `NetVolume`), oder fest `Stueck` (jedes Bauteil zählt 1, in der Oberfläche „Stück“). Nicht die Art einer Bauteilmenge (Länge, Fläche, Volumen, Anzahl, Gewicht, Zeit; im Code `Bauteilmenge.art`). Trägt ein Bauteil denselben Namen in zwei Mengensätzen, ist die Mengenart an ihm mehrdeutig (Befund). Im Code `Bauteilzuordnung.mengenart`.

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

### Gedachtes LV
Das LV, wie es mit den Preisen eines Bieters rechnet (R7): die Knoten des Ausschreibungs-LV, jede Position mit dem EP des Angebots (nicht angeboten: kein EP), eine Zuschlagsposition mit dem Zuschlagssatz des Bieters statt dem des LV, dazu der Nachlass des Angebots und der MwSt-Satz des LV. Bietersumme, Preisspiegel und Bieterzuschläge rechnet der Kern auf diesem LV; gespeichert wird es nie. Im Code `GedachtesLv`, `gedachtesLv`.

### Preiskennzeichen
Kennzeichen eines Bieterpreises im Preisspiegel (D-05): angeboten, Nullpreis, nicht angeboten oder, nur an einer Zuschlagsposition, angeboten ohne Zuschlagssatz (rechnet wie nicht angeboten). Im Code `Preiskennzeichen` mit den Werten `angeboten`, `nullpreis`, `nicht-angeboten`, `zuschlagssatz-fehlt`.

### Bieterzuschlag
Eine Zuschlagsposition, gerechnet mit den Preisen eines Bieters (Ticket 44): sein Zuschlagssatz, die Zuschlagsbasis aus seinen Preisen, der Betrag und das Preiskennzeichen; dazu, ob eine Bezugsposition ohne Preis des Bieters die Basis unvollständig lässt. Im Code `Bieterzuschlag`.

### Zuschlag (Vergabe)
Die Annahme eines Angebots durch den Auftraggeber (VOB/A § 18), in der App „Zuschlag erteilen“ aus dem Preisspiegel: Aus Ausschreibungs-LV und beauftragtem Angebot entsteht das Auftrags-LV, höchstens eines je LV (D-21). Nicht zu verwechseln mit der Zuschlagsposition (GAEB `MarkupItem`) und den Begriffen, die zu ihr gehören: Zuschlagssatz, Zuschlagsbasis, Zuschlagsbezug, Zuschlagskennzeichen, Bieterzuschlag. Im Code heißt der Zuschlag der Vergabe „Zuschlagserteilung“: `zuschlagErteilen`, `zuschlagsvorschau` und `Zuschlagswarnung` in `packages/vergabe`, in der App `zuschlagserteilungPlanen`, `zuschlagserteilungSpeichern`, `Zuschlagserteilungsplan`, `ZuschlagserteilungDialog`. Ein Bezeichner, der nur „zuschlag“ heißt (`Positionsdaten.zuschlag`, `Bieterpreis.zuschlag`), meint immer die Zuschlagsposition; der Warncode `zuschlagssatz-fehlt` einer `Zuschlagswarnung` meint den Zuschlagssatz einer Zuschlagsposition im Auftrags-LV.

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

### Kostengruppe
Einheit der Kostengliederung, im Repo nur über ihre dreistellige **Kostengruppennummer** (`100` bis `999`) bezeichnet. Die Ebene folgt aus den Ziffern: `X00` ist Ebene 1, `XY0` (Y ≠ 0) Ebene 2 unter `X00`, `XYZ` (Z ≠ 0) Ebene 3 unter `XY0`. Die Bezeichnungen der Norm stehen nicht im Repo; sie importiert der Nutzer als CSV (G-16, D-24). Eine Position trägt höchstens eine Kostengruppe, im Ausschreibungs-LV wie im Auftrags-LV (C2, D-36); im LV-Grid steht sie in der Spalte „KG“ (v1.5). Im Code `Kostengruppennummer` (Marke in `vertrag`), `kgLesen`, `bezeichnungenLesen`, `Positionsdaten.kostengruppe`, Befehl `KostengruppeSetzen`, Grid-Spalte `LvSpalte` `'kostengruppe'`.

### Kostengliederung
Baum der Kostengruppen eines Projekts, allein aus den Nummern gebildet (Elternteil, Vorfahren, Sortierung nach Nummer). Paket `kosten`.

### Kostenermittlung
Liste von Einträgen (Kostengruppennummer, Nettobetrag mit 2 Stellen, wahlweise Bemerkung), für die je Kostengruppe der **eigene Betrag** und die **Summe** (eigener Betrag plus Summen der Kinder) gebildet werden; die **Gesamtsumme** ist die Summe der Ebene-1-Gruppen. Doppelte Nummern, eigener Betrag neben Kinderbeträgen und negative Beträge sind Befunde, keine Sperre (U5). Gespeichert ist eine Kostenermittlung ein eigenes Aggregat des Projekts mit Name, Kostenermittlungsstufe und Einträgen, je Kostengruppennummer höchstens einer; die Kostenkontrolle nimmt sie als Budget (C3, D-37). Im Code `Kostenermittlung`, `Kostenermittlungseintrag` (gespeichert, geprüft), `Kostenermittlungseingabe` (ungeprüfter Text aus Grid oder CSV, Paket `kosten`), `kostenermittlungBerechnen`, Befehle über `kostenermittlungBefehlAusfuehren`.

### Kostenermittlungsstufe
Die Stufe einer Kostenermittlung nach DIN 276: Kostenrahmen, Kostenschätzung, Kostenberechnung, Kostenanschlag oder Kostenfeststellung. Im Code `Kostenermittlungsstufe`.

### Aufmaß & Mengenermittlung (REB 23.003)
Nachvollziehbare Berechnung ausgeführter oder geplanter Mengen über geometrische oder freie Rechenansätze (oft nach **REB-Verfahrensbeschreibung 23.003**), die als Nachweis für LV-Vordersätze oder Rechnungspositionen dienen.

### Aufmaßblatt
Die aufgemessenen Mengen zu einem Auftrags-LV auf einem Blatt: Nummer (ab 1, je Auftrags-LV eindeutig), Bezeichnung, Datum und je Position höchstens eine Aufmaßposition. Mehrere Blätter ergeben zusammen die kumulierte Menge, die eine Rechnung abrechnet. Ein GAEB-X31-Import legt ein Aufmaßblatt an. Im Code `Aufmass` (kurz für das Blatt), `AufmassKopf`. „Aufmaß“ allein ist kein Name für das Blatt, sondern die Tätigkeit (siehe „Aufmaß & Mengenermittlung“).

### Aufmaßposition
Eine Zeile eines Aufmaßblatts: die Position des Auftrags-LV, ihr Mengenansatz (oder keiner) und die Menge dieses Blatts. Die Menge rechnet die App aus dem Mengenansatz (Paket `mengen`); gespeichert werden beide. Im Code `Aufmassposition`.

### Aufmaßbefund
Befund zu einem Aufmaßblatt gegen sein Auftrags-LV: eine Zeile ohne Position im Auftrags-LV, zu einer Gliederung oder einem Hinweistext, zu einer Zuschlagsposition (wird nicht aufgemessen), zu einer Position ohne Einheitspreis oder ohne Menge, oder ein Blatt eines anderen Auftrags-LV. Ein Aufmaßbefund sperrt nie (U5); Soll/Ist und Rechnung lassen solche Zeilen weg. Im Code `Aufmassbefund`, `aufmassPruefen` (Paket `abrechnung`).

### Rechnung
Eine Rechnung des Auftragnehmers zu einem Auftrags-LV, wie der Auftraggeber sie prüft (A3, D-34): Nummer (Reihenfolge, ab 1), Rechnungsart, Eingangsdatum, Rechnungsnummer des Auftragnehmers, geforderte Beträge, die abgerechneten Aufmaßblätter (kumuliert: alle bis dahin), Umlagen, Einbehaltssätze und Freigabe. Die Prüfung rechnet die Kette Leistung → Nachlass → MwSt → Umlagen → Einbehalt → Zahlbetrag, jeden Schritt auf 2 Stellen gerundet; ihr Ergebnis wird nie gespeichert, nur der freigegebene Zahlbetrag. Umlagen und Einbehalt heißen zusammen die **Abzüge** der Rechnung. Im Code `Rechnung`.

### Rechnungsart
**Abschlagsrechnung** (kumuliert: rechnet die ganze bis dahin aufgemessene Leistung ab und zieht die früheren Zahlbeträge ab) oder **Schlussrechnung** (die letzte; statt des Sicherheitseinbehalts gilt der Gewährleistungseinbehalt, ein absoluter Nachlass zählt voll). Im Code `Rechnungsart` mit `abschlag`, `schluss`.

### Umlage
Prozentualer Abzug des Auftraggebers vom kumulierten Bruttobetrag einer Rechnung für eine gemeinsam genutzte Leistung (z. B. Bauwesenversicherung, Baustrom), mit Bezeichnung und Satz. Alle Umlagen einer Rechnung werden auf dieselbe Basis gerechnet, nicht aufeinander; sie mindern die Steuerbasis nicht. Im Code `Umlage`.

### Sicherheitseinbehalt / Gewährleistungseinbehalt
Prozentualer Einbehalt vom kumulierten Bruttobetrag einer Rechnung als Sicherheit des Auftraggebers: in Abschlagsrechnungen der **Sicherheitseinbehalt** (Vertragserfüllung), in der Schlussrechnung stattdessen der **Gewährleistungseinbehalt** (Mängelansprüche). Im Code `Rechnung.sicherheitSatz`, `Rechnung.gewaehrleistungSatz`.

### Zahlbetrag / Freigabe
**Zahlbetrag**: was der Auftraggeber auf eine Rechnung zahlt, kumuliertes Brutto minus Umlagen, Einbehalt und alle früheren Zahlbeträge; negativ heißt Überzahlung (ein Befund). **Freigabe**: Der Prüfer gibt eine Rechnung mit ihrem Zahlbetrag frei; der Betrag wird dabei eingefroren, damit eine spätere Aufmaßkorrektur eine bezahlte Rechnung nicht still ändert. Freigegeben wird in der Reihenfolge der Rechnungsnummern; eine freigegebene Rechnung ändert sich nur, wenn ihre Freigabe ausdrücklich aufgehoben wird. Im Code `Rechnung.freigabe`, `RechnungFreigeben`, `RechnungsfreigabeAufheben`.

### Leistungsstand
Die geprüfte Leistung einer Rechnung je Position (kumulierte Aufmaßmenge und Gesamtpreis) mit Leistungssumme, Nachlass und Netto nach Nachlass. Er wird aus Auftrags-LV und Aufmaßblättern gerechnet (Paket `abrechnung`) und von der Kostenkontrolle gelesen (Paket `kosten`); gespeichert wird er nie. Was dabei auffällt (eine Zeile, die nicht zählt, eine aufgemessene Position ohne Einheitspreis, eine Zuschlagsposition ohne Satz, ein negatives Netto nach Nachlass), ist ein **Leistungsbefund**. Im Code `Leistungsstand`, `leistungsstandBerechnen`, `Leistungsbefund`.

### Rechnungsprüfung / Abzugskette
Die Prüfung einer Rechnung gegen Auftrags-LV und Aufmaßblätter (D-34): die **Abzugskette** Leistung → Nachlass → Netto nach Nachlass → MwSt → Brutto kumuliert → Umlagen → Einbehalt → frühere Zahlbeträge → Zahlbetrag, jeder Schritt auf 2 Stellen gerundet, dazu der Vergleich mit der Forderung des Auftragnehmers (je Netto, Brutto und Zahlbetrag die **Forderungsdifferenz** = gefordert − geprüft, D-44; nicht die Abweichung der Kostenkontrolle) und **Rechnungsbefunde** (etwa Überzahlung, frühere Rechnung nicht freigegeben, Blatt einer früheren Rechnung fehlt, Schlussrechnung nicht die letzte). Das Ergebnis wird nie gespeichert. Im Code `rechnungPruefen`, `Rechnungspruefung`, `Abzugskette`, `Forderungsvergleich`, `Forderungsdifferenz`, `Rechnungsbefund`, `freigabeMoeglich` (Paket `abrechnung`).

### Soll/Ist
Vergleich der Menge einer Position im Auftrags-LV (Soll) mit der Summe ihrer Aufmaßblätter (Ist), mit Anteil in Prozent und den Gesamtpreisen beider Seiten, je Gliederung und gesamt summiert. Überschreitet das Ist 110 % der Soll-Menge streng, ist das ein Befund; unter 90 % erst, wenn die Schlussrechnung vorliegt (VOB/B § 2 Abs. 3, D-35; beide Schwellen einstellbar). Im Code `sollIstBerechnen`, `SollIst`, `SollIstBefund` (Paket `abrechnung`).

### Kostenkontrolle
Vergleich der Kosten eines Projekts je Kostengruppe in vier Spalten, durchgehend netto (D-37): **Budget** (die Kostenermittlung, die der Nutzer wählt, als Baumsummen nach D-24), **Vergabe** (Summe der Gesamtpreise der Positionen der Auftrags-LVs, die ins Netto eingehen, je Kostengruppe der Position), **Abrechnung** (Summe der Gesamtpreise des Leistungsstands der jeweils letzten Rechnung je Auftrags-LV) und **Abweichung** (Vergabe − Budget). Zeilen: die Kostengruppen als Baum (eigener Wert plus Kinder), „ohne Kostengruppe“, „Nachlass“ (negativ, ohne Budget) und Gesamt (Netto nach Nachlass); die Ebene-1-Zeilen, „ohne Kostengruppe“ und „Nachlass“ ergeben auf den Cent das Gesamt. Mehrere Auftrags-LVs werden addiert; Umlagen, Einbehalt und MwSt gehören nicht dazu. Eine Kostengruppe außerhalb der Gliederung des Budgets zählt trotzdem und ist ein Befund. Gerechnet, nie gespeichert. Im Code `kostenkontrolleBerechnen`, `Kostenkontrolle` (Paket `kosten`).

### Mengenansatz
Folge von Ansatzzeilen, deren Summe eine Menge ergibt (Rechnung im Paket `mengen`). Die Summe ist die Summe der auf 3 Stellen gerundeten Zeilenergebnisse; enthält eine Zeile einen Fehler, gibt es keine Summe. Eine Position kann ihren Mengenansatz tragen; dann ist ihre Menge die Summe, die die App gerechnet hat, und beide werden zusammen gesetzt. Wer die Menge von Hand ändert, entfernt den Ansatz. Im Code `mengenansatzBerechnen`, `Positionsdaten.mengenansatz`, Befehl `MengenansatzSetzen`.

### Ansatzzeile
Eine Zeile eines Mengenansatzes: Zeilennummer, REB-Formel (Nummer) und Rechenausdruck, wahlweise mit einem Variablennamen. Ihr **Zeilenergebnis** ist der Wert des Ausdrucks, kaufmännisch auf 3 Stellen gerundet; spätere Zeilen beziehen sich darauf mit `Z` und Zeilennummer (`Z3`) oder über den Variablennamen. Im Code `Ansatzzeile` (Typ in `vertrag`), `Zeilenergebnis`.

### Textform (einer Ansatzzeile)
Die Form, in der eine Zeile aus einer GAEB-Mengenermittlung (X31) im Mengenansatz steht, wenn der freie Rechenansatz sie nicht genau abbildet (andere REB-Formel als 91, Kennung wie Hilfswert oder Zwischensumme, Vorzeichen oder Faktor, Verweis außerhalb der Position): Die Formelnummer bleibt, der Ausdruck ist `*` und dahinter die Zeile der Datei im Wortlaut. `mengen` rechnet eine solche Zeile nie (die Menge der Position bleibt leer), sie bleibt aber lesbar erhalten (Q5; D-83.2). Beim X31-Export entfällt eine Position mit einer Zeile in der Textform ganz, mit Warnung (D-83.10). Im Code `x31Lesen` (Paket `gaeb`).

### REB-Formel
Rechenvorschrift der REB-Verfahrensbeschreibung 23.003, im Repo nur über ihre **Nummer** bezeichnet (z. B. 91 für den freien Rechenansatz). Formeltexte, Bezeichnungen und Skizzen des Katalogs stehen nicht im Repo; sie importiert der Nutzer (G-16). Im Code `Formel`, Tabelle `FORMELN`.

### Nachtrag
Nach Vertragsschluss vereinbarte Leistungsänderung oder zusätzliche Leistung, die mit eigener Nachtragsnummer, eigener Kalkulations-/Prüfhistorie und Bezug zum Hauptauftrag in die Abrechnung einfließt. In v1 (D-35) ist ein Nachtrag ein gewöhnliches Ausschreibungs-LV mit Nachtragsangaben (**Nachtrags-LV**); das **Nachtragsangebot** ist ein gewöhnliches Angebot des Auftragnehmers dazu. Ist der Nachtrag beauftragt, kommen seine Positionen mit ihren Kennungen als eigene Gliederung „Nachtrag <Nummer>“ ins Auftrags-LV; erst dann gehen sie in Aufmaß und Rechnung. Im Code `LvKopf.nachtrag`, Befehl `NachtragUebernehmen`.

### Nachtragsangaben
Die Angaben, die ein LV zum Nachtrags-LV machen: das Auftrags-LV, zu dem der Nachtrag gehört, die Nachtragsnummer (z. B. `N01`) und der Nachtragsstatus. Im Code `Nachtragsangaben`, Befehl `NachtragsangabenSetzen`.

### Nachtragsstatus
Stand eines Nachtrags: **angemeldet** (der Auftragnehmer hat die geänderte oder zusätzliche Leistung angezeigt), **angeboten** (das Nachtragsangebot liegt vor), **beauftragt** (vom Auftraggeber beauftragt und ins Auftrags-LV übernommen) oder **abgelehnt**. Nur ein beauftragter Nachtrag geht in eine Rechnung. Im Code `Nachtragsstatus`.

### Nachtrag übernehmen
Die Übernahme eines beauftragten Nachtrags ins Auftrags-LV: eine neue Gliederung „Nachtrag <Nummer>“ am Ende der obersten Ebene (Los oder Titel wie die Gliederungen dort) mit der nächsten freien Ordnungszahl, darunter der Baum des Nachtrags-LV mit seinen Kennungen und seinen Ordnungszahlen, vor die die Ordnungszahl der neuen Gliederung tritt (`01.0010` → `04.01.0010`), und den Preisen des Nachtragsangebots. Wahl-Alternativen entfallen, ein Los des Nachtrags-LV wird Titel. Weil die neue Gliederung die oberste Stufe der OZ-Maske belegt, bekommt ein Nachtrags-LV beim Anlegen die Maske des Auftrags-LV ohne deren oberste Gliederungsstufe (**Nachtragsmaske**, D-48; ohne Gliederungsstufe bleibt sie gleich); umnummeriert wird bei der Übernahme nie. Was dabei auffällt (nicht angeboten, entfallene Alternativen, ignorierter Nachlass, mehr Gliederungsstufen als die Maske, Ordnungszahl außerhalb der Maske), ist eine **Nachtragswarnung**; der Befehl entsteht trotzdem. Passen Nachtragsstatus und Übernahme nicht zusammen (beauftragt, aber nicht übernommen, oder umgekehrt), ist das ein **Nachtragsbefund**. Im Code `nachtragUebernehmen`, `nachtragsmaske`, `Nachtragswarnung`, `nachtragsbefunde`, `Nachtragsbefund` (Paket `abrechnung`), Befehl `NachtragUebernehmen`.

---

## Kalkulation, Stammdaten & Kennwerte

### Einheitspreisanteile (EPA)
Aufgliederung eines Einheitspreises (EP) in bis zu sechs Kostenarten-Bestandteile (typischerweise Lohn, Stoffe/Material, Geräte, Nachunternehmer, Sonstiges sowie ein frei definierbarer Anteil), deren Summe den Einheitspreis ergibt. Im Code `Einheitspreisanteile`, ein Anteil `EpaArt`.

### EPA-Bezeichnung
Die Zuordnung eines nummerierten Anteils der GAEB-Datei (1 bis 6) zu einer Art der Einheitspreisanteile samt der Beschriftung, die das LV ihm gibt (z. B. „Lohn“, „Nachunternehmer“; GAEB `LblUPComp`). Über sie ordnet der Import eines Angebots (X84) die Anteile des Bieters zu; ohne sie gilt die feste Belegung 1 Lohn bis 6 frei. Im Code `EpaBezeichnung`, `LvInhaltKopf.epaBezeichnungen`.

### Einzelpreiskalkulation (Bottom-Up-Kalkulation / Urkalkulation)
Detaillierte Ermittlung eines Einheitspreises über untergeordnete Kalkulationsansätze (Arbeitszeitansätze, Baustoffe, Gerätestunden, Nachunternehmerleistungen) zuzüglich Kostenartenzuschlägen für Baustellengemeinkosten (BGK), Allgemeine Geschäftskosten (AGK) sowie Wagnis und Gewinn (W+G). In der App eine reine Rechnung (Paket `kosten`, D-39): Je Kostenart ist der Anteil (Σ Einzelkosten) × (1 + Zuschlagssatz der Kalkulation / 100), kaufmännisch auf 3 Stellen gerundet; der EP ist die Summe dieser Anteile, sodass „Summe der Anteile = EP“ immer gilt. Das Ergebnis sind Einheitspreisanteile und EP, die die App mit den vorhandenen Befehlen schreibt; die Kalkulation selbst wird nicht gespeichert (D-36). Im Code `einzelpreiskalkulationBerechnen`, `Einzelpreiskalkulation`.

### Kalkulationsansatz
Eine Zeile der Einzelpreiskalkulation einer Position: Kostenart (eine Art der Einheitspreisanteile, `EpaArt`), freie Bezeichnung, **Ansatzmenge** je Einheit der Position (z. B. 0,450 h je m², 3 Stellen) und Kostensatz. Die **Einzelkosten** der Zeile sind Ansatzmenge × Kostensatz, ungerundet. Bei der Kostenart Lohn zählt die Ansatzmenge als Lohnstunden. Eine Zeile ohne Ansatzmenge oder ohne Kostensatz zählt nicht und ist ein Befund. Im Code `Kalkulationsansatz`, `ansatzmenge`; die Zeile des Formulars in der App, alle Felder als Text, heißt **Kalkulationszeile** (`Kalkulationszeile`), nie Ansatzzeile (die gehört zum Mengenansatz).

### Kostensatz
Kosten je Einheit eines Kalkulationsansatzes (z. B. 48,500 € je Lohnstunde oder je m² Stein), netto, 3 Stellen wie ein EP. Im Code `kostensatz`.

### Zuschlagssatz der Kalkulation
Prozentsatz (2 Stellen), mit dem die Zuschlagskalkulation die Einzelkosten einer Kostenart beaufschlagt; ein Satz je Kostenart, der die Zuschläge für Gemeinkosten der Baustelle, Allgemeine Geschäftskosten sowie Wagnis und Gewinn vorab zusammenfasst. Eine Kostenart ohne Satz hat 0 %. Der gerechnete Betrag je Einheit (Einzelkosten × Satz / 100, ungerundet) heißt **Kalkulationszuschlag**. Ausdrücklich nicht der Zuschlagssatz einer Zuschlagsposition (GAEB `MarkupItem`, `Markup`), der auf die Summe von Bezugspositionen gerechnet wird; darum tragen die Bezeichner im Code immer das Wort „Kalkulation“: `Kalkulationszuschlagssaetze`, `kalkulationszuschlagssatz`, `kalkulationszuschlag`.

### Kalkulationsübersicht
Die Einzelpreiskalkulationen mehrerer Positionen eines LV mit ihren Mengen zusammengerechnet, ohne Baum: je Position EP und GP (kaufmännisch auf 2 Stellen, N2), je Kostenart die Summe der Einzelkosten und die Summe der Anteile × Menge (je Position auf 2 Stellen gerundet), die Herstellkosten und der Mittellohn-Nachweis. Im Code `kalkulationsuebersichtBerechnen`, `Kalkulationsuebersicht`.

### Mittellohn
Lohnkosten je Lohnstunde über die Lohnzeilen einer Kalkulationsübersicht: Σ (Menge × Einzelkosten Lohn) / Σ (Menge × Lohnstunden je Einheit), exakt gerechnet und einmal kaufmännisch auf 3 Stellen gerundet. Zusammen mit der Summe der **Lohnstunden** (3 Stellen) bildet er den Mittellohn-Nachweis. Im Code `mittellohn`, `lohnstunden`.

### Herstellkosten & Zuschlagskalkulation
- **Herstellkosten**: Summe der direkten Einzelkosten der Teilleistungen (EKT) ohne nachgelagerte Gemeinkosten- und Gewinnzuschläge. In der Kalkulationsübersicht die Summe der Einzelkosten aller Kostenarten (`Kalkulationsuebersicht.herstellkosten`).
- **Zuschlagskalkulation**: Beaufschlagung der Einzelkosten je Kostenart mit prozentualen Zuschlagssätzen der Kalkulation zur Ermittlung des Angebotspreises.

### Kostenkennwert & Mengenbezugsgrößen (DIN 277)
Verhältniszahl aus Baukosten (z. B. je Kostengruppe nach DIN 276 oder Leistungsbereich) und einer geometrischen Bezugsgröße des Bauwerks (z. B. Brutto-Grundfläche **BGF**, Brutto-Rauminhalt **BRI** Nutzungsfläche **NF** oder Netto-Raumfläche **NRF** nach **DIN 277**), angegeben etwa in `€/m² BGF`. Die **Netto-Raumfläche (NRF)** ist die Summe der Grundflächen aller Räume eines Bauwerks (Nutzungs-, Technik- und Verkehrsflächen), also die BGF ohne die Grundflächen der Konstruktion. Aus einem Bauwerksmodell: BGF aus den Brutto-Grundflächen der Geschosse, BRI aus deren Brutto-Rauminhalten, NRF aus den Netto-Grundflächen der Räume (Ticket 108); jede Größe mit ihrer Quelle (Modell oder Eingabe).

### Muster-LV (MLV) & Rahmenvertrag (RLV)
- **Muster-LV**: Projektübergreifende Bibliothek geprüfter Standardpositionen, Texte, Kostengruppenzuordnungen und Kalkulationsansätze. In v1 ist ein Muster-LV ein gewöhnliches LV mit dem Kennzeichen **Vorlage** (C5, D-36); seine Positionen und Hinweistexte sind die Textbausteine, die man in andere LVs kopiert. Einen eigenen Typ für Textbausteine gibt es nicht. Im Code `LvKopf.vorlage`, Befehl `VorlageSetzen`.
- **Rahmenvertrag**: Zeitlich befristete Vereinbarung mit einem Auftragnehmer über fest vereinbarte Einheitspreise (ggf. mit Auf-/Abgebotsfaktor) für wiederkehrende Bauunterhaltungs- und Einzelabrufe.

### Textquelle
Freie Angabe, woher der Text einer Position stammt (z. B. ein Katalog, ein Muster-LV oder eigener Text). Der Text selbst steht in Kurz- und Langtext; ein Katalog wie STLB-Bau wird nicht angebunden (G-17). Im Code `Positionsdaten.textquelle`, Befehl `TextquelleSetzen`.

---

## Planerhonorar (HOAI) & Projektsteuerung

### HOAI (Honorarordnung für Architekten und Ingenieure)
Bundesrechtliche Verordnung zur Berechnung der Entgelte für Grundleistungen und Besondere Leistungen der Architekten und Ingenieure in Deutschland. Die App rechnet nach der **HOAI 2021** (Änderungsverordnung BGBl. I 2020 S. 2636): Die Honorartafeln sind Orientierungswerte, das Honorar richtet sich nach der Vereinbarung in Textform (§ 7 Abs. 1). Rechenkern im Paket `honorar` (D-56).

### Leistungsbild & Leistungsphasen (LP 1 – LP 9)
Fachliche Gliederung der Planungsleistungen nach Objektkategorien (z. B. Gebäude und Innenräume § 34, Freianlagen § 39, Ingenieurbauwerke § 43, Verkehrsanlagen § 47, Tragwerksplanung § 51, Technische Ausrüstung § 55 HOAI; die Honorare stehen im jeweils folgenden Paragraphen). Jedes Leistungsbild unterteilt sich in bis zu neun **Leistungsphasen (LP 1 Grundlagenermittlung bis LP 9 Objektbetreuung)**, die die HOAI mit Prozentsätzen des Honorars bewertet; die Tragwerksplanung hat nur LP 1 bis 6 (§ 51 Abs. 1). Gebäude und Innenräume teilen die Honorartafel (§ 35), bewerten die Leistungsphasen aber verschieden (§ 34 Abs. 3). Beauftragt werden einzelne Leistungsphasen (§ 8 Abs. 1); ein abweichender **Anteil** (§ 8 Abs. 2, z. B. § 51 Abs. 2 bis 4, § 55 Abs. 2) ersetzt den Prozentsatz der HOAI und ist ein Befund. Im Code `Leistungsbild` (`gebaeude`, `innenraeume`, `freianlagen`, `ingenieurbauwerke`, `verkehrsanlagen`, `tragwerksplanung`, `technische-ausruestung`), `Leistungsphase`, `BeauftragteLeistungsphase`, die Daten in `LEISTUNGSBILDER` (Paket `honorar`).

### Anrechenbare Kosten
Derjenige Teil der nach DIN 276 ermittelten Netto-Baukosten (insbesondere KG 300 Bauwerk – Baukonstruktionen und KG 400 Bauwerk – Technische Anlagen), der nach den Vorschriften der HOAI als Bemessungsgrundlage in die Honorarberechnung einfließt; die Umsatzsteuer gehört nicht dazu, und die HOAI meint die DIN 276 in der Fassung 2008-12 (§ 4 Abs. 1). Bei Gebäuden und Innenräumen (§ 33) zählt KG 300 voll; KG 400 zählt, wenn der Auftragnehmer die Technischen Anlagen nicht selbst fachlich plant und überwacht, voll bis 25 % der **sonstigen anrechenbaren Kosten** (KG 300 und die von Hand eingegebenen Kosten nach § 33 Abs. 3, etwa Herrichten oder Ausstattung, soweit der Auftragnehmer sie plant oder überwacht) und zur Hälfte mit dem Teil darüber; die mitzuverarbeitende Bausubstanz kommt von Hand dazu. Jeder Teilbetrag wird kaufmännisch auf 2 Stellen gerundet (D-56). Bei den übrigen Leistungsbildern gibt der Nutzer die anrechenbaren Kosten von Hand ein. Gespeichert (v1.6) stehen sie als **Anrechenbare-Kosten-Angabe**: Betrag von Hand oder Verweis auf eine Kostenermittlung des Projekts, aus deren KG 300 und KG 400 die Rechnung § 33 anwendet; eine so genannte Kostenermittlung lässt sich nicht löschen (Q5). Die Rechnung selbst nimmt als **Anrechenbare-Kosten-Eingabe** den Betrag oder die Beträge von KG 300 und KG 400 (der Verweis ist dann aufgelöst, Ticket 110). Im Code `AnrechenbareKostenangabe` (nur die gespeicherte Form, Paket `vertrag`), `AnrechenbareKosteneingabe` (die Eingabe der Rechnung, Paket `honorar`; bis Ticket 110 heißt sie dort noch `AnrechenbareKostenangabe`), `KostenNachDin276`, `anrechenbareKostenHerleiten`, `AnrechenbareKostenHerleitung`.

### Honorarzone (I – V) & Honorarsatz
- **Honorarzone**: Einstufung des Planungsobjekts nach seinem Schwierigkeitsgrad (von Zone I = sehr geringe Planungsanforderungen bis Zone V = sehr hohe Planungsanforderungen; die Technische Ausrüstung kennt nur die Zonen I bis III, § 56 Abs. 1), über Bewertungsmerkmale und gegebenenfalls Bewertungspunkte ermittelt. Der Nutzer wählt die Zone; die App ermittelt sie nicht. Im Code `Honorarzone` (`'I'` bis `'V'`).
- **Honorarsatz**: Die Lage des Honorars in der Honorarspanne einer Zone, in Prozent der Spanne: Honorar = von + (bis − von) × Honorarsatz / 100, kaufmännisch auf 2 Stellen (D-56). 0 ist der Basishonorarsatz, 100 der obere Honorarsatz. Mindest- und Höchstsatz gibt es seit der HOAI 2021 nicht mehr; „Viertelsatz“, „Mittelsatz“ (50) und „Dreiviertelsatz“ sind nur Bezeichnungen der Praxis, keine Begriffe der HOAI. Ein Honorarsatz unter 0 oder über 100 wird gerechnet und ist ein Befund. Im Code `Honorarobjekt.honorarsatz`, `honorarInSpanne`.

### Basishonorarsatz / oberer Honorarsatz
Die untere („von“) bzw. obere („bis“) Grenze der Honorarspanne. Ist über die Höhe des Honorars nichts in Textform vereinbart, gilt für Grundleistungen der Basishonorarsatz (§ 7 Abs. 1); der Honorarsatz ist dann 0.

### Honorartafel
Die Tafel eines Leistungsbilds in der HOAI (z. B. § 35 Abs. 1 für Gebäude und Innenräume): je **Tafelzeile** anrechenbare Kosten in Euro und je Honorarzone eine Honorarspanne. Die Tafeln der HOAI 2021 stehen als Daten im Repo (amtliches Werk nach § 5 Abs. 1 UrhG, D-56), je mit Paragraph, Absatz, Adresse und Abrufdatum. Anrechenbare Kosten unter der ersten oder über der letzten Tafelzeile ergeben kein Honorar (Befund `ausserhalb-honorartafel`, keine Extrapolation; RifT später). Im Code `Honorartafel`, `Tafelzeile`.

### Honorarspanne
Die Werte „von“ (Basishonorarsatz) und „bis“ (oberer Honorarsatz) einer Honorarzone in einer Tafelzeile, in Euro; in den Tafeln der HOAI 2021 ist „bis“ einer Zone zugleich „von“ der nächsten. Liegen die anrechenbaren Kosten zwischen zwei Tafelzeilen, werden „von“ und „bis“ je für sich linear interpoliert (§ 13): erst multiplizieren, dann teilen, kaufmännisch auf 2 Stellen (D-56). Im Code `Honorarspanne`, `honorarspanneBerechnen`, `Tafelinterpolation` (Tafelzeilen unten und oben mit der interpolierten Spanne).

### Grundhonorar
Die Summe der Beträge der beauftragten Leistungsphasen eines Honorarobjekts, ohne Umbauzuschlag, Nebenkosten und MwSt: je Leistungsphase Honorar × Anteil / 100, kaufmännisch auf 2 Stellen (D-56). Sind alle Leistungsphasen mit den Sätzen der HOAI beauftragt, weicht es vom Honorar nur um Rundungsreste ab. Das Grundhonorar einer Honorarberechnung ist die Summe über ihre Honorarobjekte. Im Code `Phasenbetrag`, `Objektergebnis.grundhonorar`, `Honorarergebnis.grundhonorar`.

### Nebenkosten
Die Auslagen des Auftragnehmers neben dem Honorar (§ 14), etwa für Versand, Vervielfältigung oder Fahrten. In einer Honorarberechnung einmal angegeben: als Prozentsatz von Grundhonorar plus Umbauzuschlägen (kaufmännisch auf 2 Stellen) oder als Betrag. Sie gehen ins Netto und damit in die MwSt ein (§ 16 Abs. 1). Im Code `Nebenkostenangabe`, `Honorarergebnis.nebenkosten`.

### Honorarobjekt
Ein Objekt (§ 2 Abs. 1), dessen Honorar für sich berechnet wird (§ 11 Abs. 1): Bezeichnung, Leistungsbild, Honorarzone, Honorarsatz, anrechenbare Kosten, beauftragte Leistungsphasen und wahlweise ein Umbauzuschlagssatz. Mehrere Honorarobjekte werden je für sich gerechnet und dann summiert; Zusammenfassung und Wiederholungen nach § 11 Abs. 2 bis 4 rechnet die App in v1 nicht (Befund). Im Code `Honorarobjekt`, `Objektergebnis`.

### Honorarberechnung
Die Honorarobjekte eines Auftrags mit Nebenkosten und MwSt-Satz und das daraus gerechnete **Honorarergebnis**: je Honorarobjekt die anrechenbaren Kosten mit Herleitung, die Tafelzeilen, die Honorarspanne, das Honorar, die Beträge der Leistungsphasen, das Grundhonorar und der Umbauzuschlag; gesamt Grundhonorar, Umbauzuschläge, Nebenkosten, Netto, MwSt (die Umsatzsteuer nach § 16 Abs. 1 auf Netto) und Brutto, dazu die **Honorarbefunde** (U5). Das Ergebnis wird gerechnet, nie gespeichert. Im Code `Honorarberechnung`, `honorarBerechnen`, `Honorarergebnis`, `Honorarbefund` (Paket `honorar`). Gespeichert ist eine Honorarberechnung ein eigenes Aggregat des Projekts mit Namen (v1.6, D-56); im Vertrag trägt das Honorarergebnis Prüfbefunde mit der Quelle `honorarberechnung`.

### Bewertungstabellen (Siemon / Simmendinger) & Tafel-Extrapolation (RifT)
- **Siemon- / Simmendinger-Tabellen**: Anerkannte Split-Tabellen zur Bewertung einzelner Grundleistungen innerhalb einer Leistungsphase, wenn nicht alle Grundleistungen einer Phase übertragen werden.
- **RifT-Tabelle**: *Richtlinie der Staatlichen Bauverwaltungen* zur Fortschreibung der HOAI-Honorartafeln bei anrechenbaren Kosten oberhalb des regulären Tabellenendwerts.

### Mitzuverarbeitende Bausubstanz & Umbauzuschlag
- **Mitzuverarbeitende Bausubstanz (§ 2 Abs. 7, § 4 Abs. 3 HOAI)**: Der Teil des zu planenden Objekts, der bereits durch Bauleistungen hergestellt ist und technisch oder gestalterisch mitverarbeitet wird. Er wird bei den anrechenbaren Kosten angemessen berücksichtigt; Umfang und Wert werden in Textform vereinbart, in der App von Hand eingegeben. Im Code `mitzuverarbeitendeBausubstanz`.
- **Umbauzuschlag (§ 6 Abs. 2, § 36 HOAI)**: Prozentualer Zuschlag auf das Grundhonorar eines Honorarobjekts bei Umbauten und Modernisierungen, kaufmännisch auf 2 Stellen (D-56). Bei durchschnittlichem Schwierigkeitsgrad bis 33 % (Gebäude § 36 Abs. 1, Freianlagen § 40 Abs. 6, Ingenieurbauwerke § 44 Abs. 6, Verkehrsanlagen § 48 Abs. 6) bzw. bis 50 % (Innenräume § 36 Abs. 2, Tragwerksplanung § 52 Abs. 4, Technische Ausrüstung § 56 Abs. 5); ein höherer Satz ist ein Befund, kein Fehler. Ohne Vereinbarung gelten nach § 6 Abs. 2 Satz 4 20 %; der Rechenkern rechnet ohne Satz keinen Zuschlag, die App bietet 20 % als Vorschlag an, wenn der Nutzer „Umbau“ wählt. Im Code `Honorarobjekt.umbauzuschlagssatz`, `Objektergebnis.umbauzuschlag`.

### Bauzeitenplan (Gantt) & 4D-BIM / 5D-BIM
- **Bauzeitenplan**: Zeitliche Ablaufplanung eines Projekts aus Vorgängen, Sammelvorgängen und Meilensteinen, die über Anordnungsbeziehungen verbunden sind und auf einem Arbeitskalender terminiert werden (D-57). Gespeichert werden nur die Eingaben (Projektbeginn, Arbeitskalender, Vorgänge); Termine, Puffer und kritischer Weg werden gerechnet, nie gespeichert. Die Rechnung heißt **Terminrechnung**: die Vorwärtsrechnung ab dem **Projektbeginn** ergibt die frühe Lage (Beginn und Ende jedes Vorgangs), die Rückwärtsrechnung vom **Projektende** (spätestes Ende der frühen Lage) die späte Lage (spätester Beginn, spätestes Ende). Die Lesarten der Rechnung stehen als `BAUZEIT_ANNAHMEN` im Code. Für die Balkenspalte des Grids (dort `Zeitleiste`) liefert das Paket die **Zeitachse**: Tagesindex je Datum, Monate und Kalenderwochen nach ISO 8601, freie Tage; die Texte formatiert die App. Im Code `bauzeitenplanBerechnen`, `Bauzeitenplaneingabe`, `Vorgangstermine`, `Bauzeitbefund`, `zeitachseBerechnen` (Paket `bauzeit`).
- **4D-BIM / 5D-BIM**: Verknüpfung von 3D-Bauteilen (IFC-GUIDs), LV-Positionen/Mengen (5D-Kostenverlauf / Mittelabflussplan) und Terminplan-Vorgängen (4D-Bauablaufsimulation).

### Vorgang
Eine Tätigkeit im Bauzeitenplan mit Bezeichnung, wahlweise Nummer, und einer **Dauer** in ganzen Arbeitstagen (≥ 0). Er belegt die Arbeitstage von seinem Beginn bis zu seinem Ende einschließlich; er beginnt nie vor dem Projektbeginn und nie an einem freien Tag. Ist-Termine (Beginn, Ende) und Fortschritt (in Prozent) trägt der Nutzer von Hand ein; sie werden angezeigt, verschieben in v1 aber nichts. Im Code `Vorgang` (`dauer`, `elternId`, `vorgaenger`, `fruehesterBeginn`, `ist`).

### Sammelvorgang
Ein Vorgang, der andere Vorgänge zusammenfasst: Er hat Kinder (Vorgänge, deren `elternId` ihn nennt). Seine Termine folgen aus den Kindern (Beginn = frühester Beginn, Ende = spätestes Ende der Kinder); seine Dauer hat keine Bedeutung. Anordnungsbeziehungen und Terminvorgaben an einem Sammelvorgang rechnet v1 nicht, sie sind ein Befund. Im Code `Vorgangsart` `'sammelvorgang'`.

### Meilenstein
Ein Vorgang mit Dauer 0: ein Zeitpunkt am Anfang seines Arbeitstags, Beginn und Ende sind derselbe Tag. Ein Meilenstein kostet keine Zeit; ein Nachfolger mit Ende-Anfang und Abstand 0 beginnt am Tag des Meilensteins. Im Code `Vorgangsart` `'meilenstein'`.

### Anordnungsbeziehung
Die Abhängigkeit eines Vorgangs von einem Vorgänger, mit einer von vier **Anordnungsarten** und einem **Abstand** in ganzen Arbeitstagen (auch 0 oder negativ; negativ heißt Überlappung). Der Anfang eines Vorgangs ist der Beginn seines ersten Arbeitstags, sein Ende der Schluss seines letzten:
- **Ende-Anfang**: Der Nachfolger beginnt frühestens Abstand Arbeitstage nach dem Ende des Vorgängers; Abstand 0 heißt am nächsten Arbeitstag nach dem Ende.
- **Anfang-Anfang**: Der Nachfolger beginnt frühestens Abstand Arbeitstage nach dem Anfang des Vorgängers; Abstand 0 heißt am selben Tag.
- **Ende-Ende**: Der Nachfolger endet frühestens Abstand Arbeitstage nach dem Ende des Vorgängers; Abstand 0 heißt am selben Tag.
- **Anfang-Ende**: Der Nachfolger endet frühestens Abstand Arbeitstage nach dem Anfang des Vorgängers; Abstand 0 heißt am Arbeitstag vor dessen Beginn.

Im Code `Anordnungsbeziehung` (`vorgaengerId`, `art`: `Anordnungsart` = `'ende-anfang' | 'anfang-anfang' | 'ende-ende' | 'anfang-ende'`, `abstand`).

### Arbeitskalender
Die Tage, an denen gearbeitet wird: die **Arbeitstage** der Woche (ISO-Wochentage, 1 = Montag; Standard Montag bis Freitag) ohne die **Feiertage** des gewählten Bundeslands und ohne die **freien Tage** des Plans. Feiertage folgen rein aus Regeln (D-57): die bundesweiten (Neujahr, Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag, 3. Oktober, 25. und 26. Dezember; Ostern nach der gregorianischen Osterformel) und die landesweiten nach dem Feiertagsgesetz des Landes, je ab dem Jahr, in dem sie gelten. Nur regional geltende Feiertage (etwa Fronleichnam in Teilen Sachsens und Thüringens, Mariä Himmelfahrt in Teilen Bayerns) und einmalige Feiertage trägt der Nutzer als freie Tage ein. Das Bundesland steht als Kürzel nach ISO 3166-2:DE ohne Länderpräfix (`BY`); ohne Land gelten nur die bundesweiten Feiertage. Im Code `Arbeitskalender` (`arbeitstage`, `bundesland`, `freieTage`), `feiertage`, `istArbeitstag`.

### Terminvorgabe
Eine von Hand gesetzte Grenze für die Lage eines Vorgangs. In v1 gibt es nur „Beginn frühestens“: Der Vorgang beginnt nicht vor diesem Datum, sondern frühestens am ersten Arbeitstag ab dem Datum. Im Code `Vorgang.fruehesterBeginn`.

### Gesamtpuffer
Die Zahl der Arbeitstage, um die ein Vorgang aus seiner frühen Lage verschoben werden kann, ohne das Projektende zu verschieben: spätester Beginn minus Beginn. Ein Vorgang ist **kritisch**, wenn sein Gesamtpuffer ≤ 0 ist. Ein Sammelvorgang hat den kleinsten Gesamtpuffer seiner Kinder. Im Code `Vorgangstermine.gesamtpuffer`, `Vorgangstermine.kritisch`.

### Freier Puffer
Die Zahl der Arbeitstage, um die ein Vorgang aus seiner frühen Lage verschoben werden kann, ohne die frühe Lage eines Nachfolgers oder das Projektende zu verschieben; nie größer als der Gesamtpuffer. Ein Sammelvorgang hat den kleinsten freien Puffer seiner Kinder. Im Code `Vorgangstermine.freierPuffer`.

### Kritischer Weg
Eine Folge kritischer Vorgänge, in der je zwei aufeinanderfolgende durch eine Anordnungsbeziehung ohne Spielraum verbunden sind; sie beginnt am Projektbeginn oder an einer Terminvorgabe und endet am Projektende. Ein Plan kann mehrere kritische Wege haben; Sammelvorgänge gehören nie dazu. Im Code `Bauzeitenplanergebnis.kritischeWege`.

### Vorgangsbezug
Der Bezug eines Vorgangs auf ein Ausschreibungs-LV oder Auftrags-LV: das ganze LV (auch mit später hinzukommenden Knoten, etwa einem übernommenen Nachtrag) oder ausgewählte Knoten darin (Positionen oder Gliederungen samt ihren Positionen). Er geht nicht in die Terminrechnung ein; er zeigt, welche Leistung ein Vorgang umfasst, und aus dem Leistungsstand eines Auftrags-LV schlägt die App den Fortschritt vor. Fehlt das LV oder ein bezogener Knoten, ist das ein Befund der App: Ein LV wird nie wegen eines Bauzeitenplans gesperrt. Im Code `Vorgang.bezug`, `Vorgangsbezug`.

---

## Bauleitung (LP 8) & DACH-Standards

### Bautagebuch
Chronologische tägliche Dokumentation des Bauablaufs auf der Baustelle (Witterung, eingesetzte Arbeitskräfte und Großgeräte, ausgeführte Arbeiten, Abnahmen, Behinderungen und besondere Vorkommnisse).

### Mängelmanagement, Plan-Pinning & BCF
- **Mängelmanagement**: Erfassung, Verortung, Fristüberwachung, Mängelanzeige und Freigabeprüfung von Ausführungsmängeln oder offenen Restleistungen (Tickets).
- **Plan-Pinning**: Grafische Verortung eines Mangels über X/Y-Koordinaten auf einem 2D-Bauplan (PDF).
- **BCF (BIM Collaboration Format)**: Offener buildingSMART-Standard zum Austausch modellbasierter Mängel und Aufgaben inklusive 3D-Kameraposition (Viewpoint), Schnittebenen und betroffener IFC-GUIDs.

### Mangel
Ein festgestellter Ausführungsmangel eines Projekts (D-57): Nummer (ab 1, je Projekt eindeutig), Titel, Beschreibung, Ort als freier Text, wahlweise das Auftrags-LV (und damit der Auftragnehmer) mit einer Position daraus, wahlweise ein Bauteil (GlobalId, wahlweise eines bestimmten Bauwerksmodells), Tag der Feststellung, Frist zur Beseitigung und der Mängelverlauf. Eigenes Aggregat; keine Fotos in v1.6. Im Code `Mangel`, Befehle `MangelAnlegen`, `MangelangabenSetzen`, `MangelstatusSetzen`, `MangelLoeschen`.

### Mangelstatus
Stand eines Mangels: **offen** (festgestellt), **angezeigt** (dem Auftragnehmer mit Frist zur Beseitigung angezeigt), **beseitigt** (die Beseitigung ist gemeldet), **abgenommen** (der Auftraggeber hat die Beseitigung abgenommen). Zulässig sind die Wechsel offen → angezeigt → beseitigt → abgenommen und beseitigt → offen (Beseitigung nicht anerkannt); jeden anderen Wechsel weist der Befehl ab. Im Code `Mangelstatus`, Fehlercode `statuswechsel-unzulaessig`.

### Mängelverlauf
Die Folge der Statuswechsel eines Mangels mit Datum und wahlweise Bemerkung, ältester zuerst, mit nicht fallenden Daten. Er ist die Quelle des Status: Der Status eines Mangels ist der seines letzten Eintrags; ein Statuswechsel hängt einen Eintrag an, nichts wird überschrieben. Der erste Eintrag ist `offen`. Ein Eintrag `angezeigt` trägt die Frist dieser Mängelanzeige, damit sie nach einem Wiederöffnen im Verlauf bleibt; die geltende Frist steht am Mangel. Im Code `Mangel.verlauf`, `Mangelverlaufseintrag` (`frist`).

### Fristprüfung
Die Prüfung der Mängel eines Projekts zu einem Stichtag, den die App übergibt (A2): Ein Mangel mit einer Frist vor dem Stichtag und dem Status offen oder angezeigt ist **überfällig** (Prüfbefund, Quelle `fristpruefung`); eine Frist am Stichtag ist nicht überfällig. Im Code Paket `bauleitung` (Ticket 111).

### Bautagebucheintrag
Der Eintrag des Bautagebuchs zu einem Tag eines Projekts, höchstens einer je Projekt und Datum (D-57): Wetter (Beschreibung, tiefste und höchste Temperatur in ganzen Grad Celsius), Arbeitskräfte je Firma (Zahl der Köpfe), Geräte, ausgeführte Leistungen, Behinderungen und besondere Vorkommnisse als Text. Eigenes Aggregat; keine Fotos in v1.6. Das **Bautagebuch** eines Projekts ist die Liste seiner Einträge nach Datum. Im Code `Bautagebucheintrag`, Befehle `BautagebucheintragSetzen`, `BautagebucheintragLoeschen`, `Speicher.bautagebuch`.

### E-Rechnung (XRechnung & ZUGFeRD)
Strukturierte elektronische Rechnungsformate nach europäischer Norm **EN 16931** für Bau- und Planerrechnungen (reines XML bei **XRechnung** bzw. hybrides PDF/A-3 mit eingebettetem XML bei **ZUGFeRD**).

### Eingangsrechnung
Eine beim Auftraggeber eingegangene XRechnung (UBL oder CII), so gelesen, wie sie in der Datei steht: Angaben nach den Business Terms der EN 16931 (BT-1 Rechnungsnummer bis BT-115 Zahlbetrag, Umsatzsteueraufschlüsselung, Positionen mit Unterpositionen der Extension), dazu Befunde. Die Rechenprüfung der Eingangsrechnung prüft nur die Summenregeln der Norm; sie ist nicht die Rechnungsprüfung gegen Aufmaß und Auftrags-LV (Abrechnung). Die App übernimmt daraus Nummer, Datum und geforderte Beträge in eine `Rechnung`. „Abschläge“ und „Zuschläge auf Dokumentenebene“ (BT-107, BT-108) sind Minderungen bzw. Aufschläge der Rechnung, weder Abschlagsrechnung noch Zuschlag (Vergabe). Im Code `Eingangsrechnung`, `xrechnungLesen` (Paket `erechnung`).

### DACH-Ausschreibungsstandards (STLB-Bau, ÖNORM, SIA / CRB NPK)
- **STLB-Bau / STLB-K / STLK**: Dynamische bzw. katalogbasierte deutsche Standardleistungsbücher für das Bauwesen sowie den Straßen-, Brücken- und Wasserbau.
- **ÖNORM B 2063 / A 2063**: Österreichische Standards für Leistungsbeschreibungen, Aufmaß und elektronischen AVA-Datenaustausch (`.onlv` / `.onlb`).
- **SIA 451 & CRB NPK**: Schweizerischer Datenaustauschstandard (**SIA 451**) und **Normpositionen-Katalog (NPK)** der Schweizerischen Zentralstelle für Baurationalisierung (CRB) inklusive Baukostenplan (**BKP / eBKP**).
