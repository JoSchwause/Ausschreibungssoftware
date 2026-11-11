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
Warnung oder Fehler einer Prüfung (GAEB-Lesen, GAEB-Prüfung, LV-Prüfung) mit Quelle und Ort. Ein Prüfbefund sperrt nie die Eingabe.

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
Einheit der Kostengliederung, im Repo nur über ihre dreistellige **Kostengruppennummer** (`100` bis `999`) bezeichnet. Die Ebene folgt aus den Ziffern: `X00` ist Ebene 1, `XY0` (Y ≠ 0) Ebene 2 unter `X00`, `XYZ` (Z ≠ 0) Ebene 3 unter `XY0`. Die Bezeichnungen der Norm stehen nicht im Repo; sie importiert der Nutzer als CSV (G-16, D-24). Eine Position trägt höchstens eine Kostengruppe, im Ausschreibungs-LV wie im Auftrags-LV (C2, D-36). Im Code `Kostengruppennummer` (Marke in `vertrag`), `kgLesen`, `bezeichnungenLesen`, `Positionsdaten.kostengruppe`, Befehl `KostengruppeSetzen`.

### Kostengliederung
Baum der Kostengruppen eines Projekts, allein aus den Nummern gebildet (Elternteil, Vorfahren, Sortierung nach Nummer). Paket `kosten`.

### Kostenermittlung
Liste von Einträgen (Kostengruppennummer, Nettobetrag mit 2 Stellen, wahlweise Bemerkung), für die je Kostengruppe der **eigene Betrag** und die **Summe** (eigener Betrag plus Summen der Kinder) gebildet werden; die **Gesamtsumme** ist die Summe der Ebene-1-Gruppen. Doppelte Nummern, eigener Betrag neben Kinderbeträgen und negative Beträge sind Befunde, keine Sperre (U5). Gespeichert ist eine Kostenermittlung ein eigenes Aggregat des Projekts mit Name, Kostenermittlungsstufe und Einträgen, je Kostengruppennummer höchstens einer; die Kostenkontrolle nimmt sie als Budget (C3, D-37). Im Code `Kostenermittlung`, `Kostenermittlungseintrag`, `kostenermittlungBerechnen`.

### Kostenermittlungsstufe
Die Stufe einer Kostenermittlung nach DIN 276: Kostenrahmen, Kostenschätzung, Kostenberechnung, Kostenanschlag oder Kostenfeststellung. Im Code `Kostenermittlungsstufe`.

### Aufmaß & Mengenermittlung (REB 23.003)
Nachvollziehbare Berechnung ausgeführter oder geplanter Mengen über geometrische oder freie Rechenansätze (oft nach **REB-Verfahrensbeschreibung 23.003**), die als Nachweis für LV-Vordersätze oder Rechnungspositionen dienen.

### Aufmaßblatt (Aufmaß)
Die aufgemessenen Mengen zu einem Auftrags-LV auf einem Blatt: Nummer (ab 1, je Auftrags-LV eindeutig), Bezeichnung, Datum und je Position höchstens eine Aufmaßposition. Mehrere Blätter ergeben zusammen die kumulierte Menge, die eine Rechnung abrechnet. Ein GAEB-X31-Import legt ein Aufmaßblatt an. Im Code `Aufmass`, `AufmassKopf`.

### Aufmaßposition
Eine Zeile eines Aufmaßblatts: die Position des Auftrags-LV, ihr Mengenansatz (oder keiner) und die Menge dieses Blatts. Die Menge rechnet die App aus dem Mengenansatz (Paket `mengen`); gespeichert werden beide. Im Code `Aufmassposition`.

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
Die geprüfte Leistung einer Rechnung je Position (kumulierte Aufmaßmenge und Gesamtpreis) mit Leistungssumme, Nachlass und Netto nach Nachlass. Er wird aus Auftrags-LV und Aufmaßblättern gerechnet (Paket `abrechnung`) und von der Kostenkontrolle gelesen (Paket `kosten`); gespeichert wird er nie. Im Code `Leistungsstand`.

### Mengenansatz
Folge von Ansatzzeilen, deren Summe eine Menge ergibt (Rechnung im Paket `mengen`). Die Summe ist die Summe der auf 3 Stellen gerundeten Zeilenergebnisse; enthält eine Zeile einen Fehler, gibt es keine Summe. Eine Position kann ihren Mengenansatz tragen; dann ist ihre Menge die Summe, die die App gerechnet hat, und beide werden zusammen gesetzt. Wer die Menge von Hand ändert, entfernt den Ansatz. Im Code `mengenansatzBerechnen`, `Positionsdaten.mengenansatz`, Befehl `MengenansatzSetzen`.

### Ansatzzeile
Eine Zeile eines Mengenansatzes: Zeilennummer, REB-Formel (Nummer) und Rechenausdruck, wahlweise mit einem Variablennamen. Ihr **Zeilenergebnis** ist der Wert des Ausdrucks, kaufmännisch auf 3 Stellen gerundet; spätere Zeilen beziehen sich darauf mit `Z` und Zeilennummer (`Z3`) oder über den Variablennamen. Im Code `Ansatzzeile` (Typ in `vertrag`), `Zeilenergebnis`.

### REB-Formel
Rechenvorschrift der REB-Verfahrensbeschreibung 23.003, im Repo nur über ihre **Nummer** bezeichnet (z. B. 91 für den freien Rechenansatz). Formeltexte, Bezeichnungen und Skizzen des Katalogs stehen nicht im Repo; sie importiert der Nutzer (G-16). Im Code `Formel`, Tabelle `FORMELN`.

### Nachtrag
Nach Vertragsschluss vereinbarte Leistungsänderung oder zusätzliche Leistung, die mit eigener Nachtragsnummer, eigener Kalkulations-/Prüfhistorie und Bezug zum Hauptauftrag in die Abrechnung einfließt. In v1 (D-35) ist ein Nachtrag ein gewöhnliches Ausschreibungs-LV mit Nachtragsangaben (**Nachtrags-LV**); das **Nachtragsangebot** ist ein gewöhnliches Angebot des Auftragnehmers dazu. Ist der Nachtrag beauftragt, kommen seine Positionen mit ihren Kennungen als eigene Gliederung „Nachtrag <Nummer>“ ins Auftrags-LV; erst dann gehen sie in Aufmaß und Rechnung. Im Code `LvKopf.nachtrag`, Befehl `NachtragUebernehmen`.

### Nachtragsangaben
Die Angaben, die ein LV zum Nachtrags-LV machen: das Auftrags-LV, zu dem der Nachtrag gehört, die Nachtragsnummer (z. B. `N01`) und der Nachtragsstatus. Im Code `Nachtragsangaben`, Befehl `NachtragsangabenSetzen`.

### Nachtragsstatus
Stand eines Nachtrags: **angemeldet** (der Auftragnehmer hat die geänderte oder zusätzliche Leistung angezeigt), **angeboten** (das Nachtragsangebot liegt vor), **beauftragt** (vom Auftraggeber beauftragt und ins Auftrags-LV übernommen) oder **abgelehnt**. Nur ein beauftragter Nachtrag geht in eine Rechnung. Im Code `Nachtragsstatus`.

---

## Kalkulation, Stammdaten & Kennwerte

### Einheitspreisanteile (EPA)
Aufgliederung eines Einheitspreises (EP) in bis zu sechs Kostenarten-Bestandteile (typischerweise Lohn, Stoffe/Material, Geräte, Nachunternehmer, Sonstiges sowie ein frei definierbarer Anteil), deren Summe den Einheitspreis ergibt. Im Code `Einheitspreisanteile`, ein Anteil `EpaArt`.

### EPA-Bezeichnung
Die Zuordnung eines nummerierten Anteils der GAEB-Datei (1 bis 6) zu einer Art der Einheitspreisanteile samt der Beschriftung, die das LV ihm gibt (z. B. „Lohn“, „Nachunternehmer“; GAEB `LblUPComp`). Über sie ordnet der Import eines Angebots (X84) die Anteile des Bieters zu; ohne sie gilt die feste Belegung 1 Lohn bis 6 frei. Im Code `EpaBezeichnung`, `LvInhaltKopf.epaBezeichnungen`.

### Einzelpreiskalkulation (Bottom-Up-Kalkulation / Urkalkulation)
Detaillierte Ermittlung eines Einheitspreises über untergeordnete Kalkulationsansätze (Arbeitszeitansätze, Baustoffe, Gerätestunden, Nachunternehmerleistungen) zuzüglich Kostenartenzuschlägen für Baustellengemeinkosten (BGK), Allgemeine Geschäftskosten (AGK) sowie Wagnis und Gewinn (W+G). In der App eine reine Rechnung (Paket `kosten`, D-39): Je Kostenart ist der Anteil (Σ Einzelkosten) × (1 + Zuschlagssatz der Kalkulation / 100), kaufmännisch auf 3 Stellen gerundet; der EP ist die Summe dieser Anteile, sodass „Summe der Anteile = EP“ immer gilt. Das Ergebnis sind Einheitspreisanteile und EP, die die App mit den vorhandenen Befehlen schreibt; die Kalkulation selbst wird nicht gespeichert (D-36). Im Code `einzelpreiskalkulationBerechnen`, `Einzelpreiskalkulation`.

### Kalkulationsansatz
Eine Zeile der Einzelpreiskalkulation einer Position: Kostenart (eine Art der Einheitspreisanteile, `EpaArt`), freie Bezeichnung, **Ansatzmenge** je Einheit der Position (z. B. 0,450 h je m², 3 Stellen) und Kostensatz. Die **Einzelkosten** der Zeile sind Ansatzmenge × Kostensatz, ungerundet. Bei der Kostenart Lohn zählt die Ansatzmenge als Lohnstunden. Eine Zeile ohne Ansatzmenge oder ohne Kostensatz zählt nicht und ist ein Befund. Im Code `Kalkulationsansatz`, `ansatzmenge`.

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
Verhältniszahl aus Baukosten (z. B. je Kostengruppe nach DIN 276 oder Leistungsbereich) und einer geometrischen Bezugsgröße des Bauwerks (z. B. Brutto-Grundfläche **BGF**, Brutto-Rauminhalt **BRI** oder Nutzungsfläche **NF** nach **DIN 277**), angegeben etwa in `€/m² BGF`.

### Muster-LV (MLV) & Rahmenvertrag (RLV)
- **Muster-LV**: Projektübergreifende Bibliothek geprüfter Standardpositionen, Texte, Kostengruppenzuordnungen und Kalkulationsansätze. In v1 ist ein Muster-LV ein gewöhnliches LV mit dem Kennzeichen **Vorlage** (C5, D-36); seine Positionen und Hinweistexte sind die Textbausteine, die man in andere LVs kopiert. Einen eigenen Typ für Textbausteine gibt es nicht. Im Code `LvKopf.vorlage`, Befehl `VorlageSetzen`.
- **Rahmenvertrag**: Zeitlich befristete Vereinbarung mit einem Auftragnehmer über fest vereinbarte Einheitspreise (ggf. mit Auf-/Abgebotsfaktor) für wiederkehrende Bauunterhaltungs- und Einzelabrufe.

### Textquelle
Freie Angabe, woher der Text einer Position stammt (z. B. ein Katalog, ein Muster-LV oder eigener Text). Der Text selbst steht in Kurz- und Langtext; ein Katalog wie STLB-Bau wird nicht angebunden (G-17). Im Code `Positionsdaten.textquelle`, Befehl `TextquelleSetzen`.

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

### Eingangsrechnung
Eine beim Auftraggeber eingegangene XRechnung (UBL oder CII), so gelesen, wie sie in der Datei steht: Angaben nach den Business Terms der EN 16931 (BT-1 Rechnungsnummer bis BT-115 Zahlbetrag, Umsatzsteueraufschlüsselung, Positionen mit Unterpositionen der Extension), dazu Befunde. Die Rechenprüfung der Eingangsrechnung prüft nur die Summenregeln der Norm; sie ist nicht die Rechnungsprüfung gegen Aufmaß und Auftrags-LV (Abrechnung). Die App übernimmt daraus Nummer, Datum und geforderte Beträge in eine `Rechnung`. „Abschläge“ und „Zuschläge auf Dokumentenebene“ (BT-107, BT-108) sind Minderungen bzw. Aufschläge der Rechnung, weder Abschlagsrechnung noch Zuschlag (Vergabe). Im Code `Eingangsrechnung`, `xrechnungLesen` (Paket `erechnung`).

### DACH-Ausschreibungsstandards (STLB-Bau, ÖNORM, SIA / CRB NPK)
- **STLB-Bau / STLB-K / STLK**: Dynamische bzw. katalogbasierte deutsche Standardleistungsbücher für das Bauwesen sowie den Straßen-, Brücken- und Wasserbau.
- **ÖNORM B 2063 / A 2063**: Österreichische Standards für Leistungsbeschreibungen, Aufmaß und elektronischen AVA-Datenaustausch (`.onlv` / `.onlb`).
- **SIA 451 & CRB NPK**: Schweizerischer Datenaustauschstandard (**SIA 451**) und **Normpositionen-Katalog (NPK)** der Schweizerischen Zentralstelle für Baurationalisierung (CRB) inklusive Baukostenplan (**BKP / eBKP**).
