# Umfang der Welle 7: „Einführungsreife“

Stand 2026-11-13. Verbindlich für den Schnitt der Welle 7 (`/implement-welle 7`). Entscheidungen des Nutzers: `grilling.md`,
Stufe 5 (G-58 bis G-64). Einordnung in den Plan: `plan.md` §2 (Strang E), §3 (Welle 7), §4 (Tor E).

Welle 7 ist die letzte Welle, bevor ein Büro die Software gezeigt bekommt und sie ausprobiert (G-59). Maßstab ist eine
Planerin, die von einem anderen AVA-Programm umsteigt: Sie bringt GAEB-Dateien mit, kennt die Abläufe und hat niemanden neben
sich, der die Oberfläche erklärt. Die Welle baut **keine neuen Module**. Sie schließt, was auf dem Weg dieser Person fehlt,
hakt oder uneinheitlich ist, und dazu die vier größeren Lücken aus G-61.

## 1. Wie die Befunde entstanden

- Stand: `main` nach dem Merge von PR #11 (Welle 6), gelesen am Stand `fce1b25`.
- Drei Lesedurchgänge: Oberfläche (`apps/web`, `ui-grid`, `ui-basis`, `ui-modell`), Fachpakete (`packages/*`, `fixtures/`),
  Entscheidungs- und Berichtsdokumente (`.scratch/ava-oss/`, `docs/`).
- **Begehung** der laufenden App wie ein Erstnutzer, ohne Testhaken: Projekt anlegen, die amtliche BVBS-Prüfdatei
  `fixtures/extern/bvbs/3.3-bauausfuehrung/*.x83` einlesen, dazu das X84, Preisspiegel, Zuschlag, Auftrags-LV, Aufmaß, Soll/Ist,
  Rechnungen, alle Seiten der Projektseite, `fixtures/ifc/haus-v1.ifc` mit 3D-Ansicht; Fenster 1440×900 und 1280×800.
  Befunde aus der Begehung tragen den Vermerk **(B)**.
- Die Kette lief ohne Fehler durch. Die Befunde betreffen Auffindbarkeit, Platz, Sprache, fehlende Bedienung und fehlende
  Ausgaben, keine falschen Beträge.

## 2. Befunde

Jeder Befund ist in §3 einem Punkt zugeordnet oder steht in §6 („nach Welle 7“).

### Orientierung und Navigation

| Nr | Befund | Beleg |
|---|---|---|
| B-01 | Die Seitenleiste hat drei Einträge; „LV“ und „Vergabe“ öffnen Platzhalterseiten („Hier entsteht die Tabelle …“), auch direkt nach der Arbeit in einem LV. **(B)** | `apps/web/src/ui/Platzhalterseite.tsx`, `ui/texte.ts:36-46`, `App.tsx` |
| B-02 | Erster Start: „Noch keine Projekte.“ und ein Formular. Kein Begrüßungstext, kein Beispielprojekt, keine Hilfe, keine Übersicht der Tastenkürzel, keine Seite „Über“ (Version, Lizenz). Version `0.0.0`. **(B)** | `projekt/ProjektlisteSeite.tsx`, `apps/web/package.json:3` |
| B-03 | Projektseite: eine Leiste mit 13 Einträgen, 1.863 px breit in 1.256 px Fläche. Bei 1440 px liegen „Bauzeitenpläne“, „Modelle“, „GAEB einlesen“ und „Zur Projektliste“ außerhalb des Fensters. „Projekt löschen“ steht mitten zwischen den Verweisen. **(B)** | `projekt/ProjektSeite.tsx` (Leiste) |
| B-04 | Kopfzeile zeigt „Vergabe“ auf Auftrags-LV-, Rechnungs- und Preisspiegelseiten, die Seitenleiste markiert dabei „Projekt“ oder „LV“. Kein Brotkrumenpfad. `document.title` wird nie gesetzt. Preisspiegel, Aufmaß und Rechnungen sind von der Projektseite aus nicht erreichbar. **(B)** | `App.tsx` (Titel je Route), `ui/Huelle.tsx` |

### Arbeitsfläche

| Nr | Befund | Beleg |
|---|---|---|
| B-05 | LV-Seite: 22 Schaltflächen ohne Gruppen. Bei 1280×800 (Mindestgröße nach U6) fünf Zeilen Werkzeugleiste, das Grid ist 294 px hoch (8 Zeilen), Einheitspreis und Gesamtpreis sind nicht sichtbar. **(B)** | `lv/LvSeite.tsx` (Leiste), `lv/lv.css` |
| B-06 | Auftrags-LV bei 1440 px: Die Spalte Gesamtpreis ist abgeschnitten, daneben steht das Prüf-Panel mit „Keine Befunde“. Verweise teils als Schaltfläche, teils als Textverweis. **(B)** | `auftrag/AuftragsLvSeite.tsx` |
| B-07 | OZ-Spalte zu schmal: 001.001.0010, 001.001.00101 und 001.001.0010A zeigen alle „001.001.00…“. Menge „12.345.678,012“ abgeschnitten. Feste Spaltenbreiten, keine Spaltenwahl. **(B)** | `packages/ui-grid/src/tabelle.ts:17` (`SPALTENBREITE`) |
| B-08 | Preisspiegel: rund 7 Datenzeilen sichtbar, weil Summenblock und Bieterübersicht fest stehen; die Bieterübersicht ist rechts abgeschnitten, die Meldung überdeckt sie. **(B)** | `vergabe/PreisspiegelSeite.tsx` |
| B-09 | Kein Suchen oder Filtern im LV-Grid, kein Kontextmenü. Tastenkürzel des Grids (Strg+Entf, Strg++, Alt+Pfeil) stehen nirgends. | `ui-grid/src/LvGrid.tsx` |

### Einlesen fremder Dateien

| Nr | Befund | Beleg |
|---|---|---|
| B-10 | GAEB DA XML 3.1 wird abgewiesen; die Meldung nennt ein internes Ticket („3.1 folgt mit Ticket G4“). **(B)** | `packages/gaeb/src/lesen.ts:1526` |
| B-11 | GAEB 90 (.d83) und GAEB 2000 (.p83): Meldung „xml-keine-wurzel Die Eingabe enthält kein XML-Element.“ Der Dateidialog bietet die Endungen nicht an. X82, X85, X89 werden abgewiesen; X80, X87, X88 werden wie ein LV gelesen (nicht nachgestellt). **(B)** | `gaeb/src/xml.ts:468`, `erkennung.ts:35`, `apps/web/src/gaeb/GaebEinlesen.tsx:70` |
| B-12 | Befunde beim Einlesen in Entwicklersprache: Kennungen wie `nicht-abgebildet`, „nicht im Vertrag abbildbar“ („Vertrag“ ist der Name eines Pakets), rohe Zahlen („450000.00“ statt 450.000,00, N4), „(Zeile 3)“ an jeder Zeile, 14 Einzelzeilen für Kopfdaten. **(B)** | Dialoge „GAEB-Datei einlesen“ und „Angebot (X84) einlesen“ |
| B-13 | X84: Nachlass je Position oder Titel und Bieter-Textergänzungen werden gemeldet, nicht übernommen (D-10, D-22). | `gaeb/src/angebot.ts` |
| B-14 | Bezeichnungen der Kostengruppen erst, nachdem der Nutzer eine CSV einliest (G-16). Kein Hinweis beim ersten Öffnen. | `apps/web/src/kosten/texte.ts:68` |

### Abläufe mit fehlender Bedienung

| Nr | Befund | Beleg |
|---|---|---|
| B-15 | Befehle ohne Bedienung in der App: `HinweistextAnlegen`, `HinweistextAendern` (Vor- und Nachtext entstehen nur durch GAEB), `AngebotLoeschen`, `AngebotspositionSetzen`, `AngebotsNachlassSetzen`, `OzMaskeSetzen`. | `packages/vertrag/src/befehle.ts`; kein Treffer in `apps/web/src` |
| B-16 | LV-Stand: nur anlegen, nicht umbenennen oder löschen. Bieter: nicht umbenennen oder löschen. Ein Zuschlag lässt sich nach der Sitzung nicht zurücknehmen; das Projekt ist dann nicht mehr löschbar. | `historie/texte.ts`, kein Befehl in `vertrag` |
| B-17 | Auftrags-LV-Seite: kein Excel, kein Positionsdialog (Langtext nicht lesbar), nur X86. | `auftrag/AuftragsLvSeite.tsx` |
| B-18 | Nachtrag: Der Auftragnehmer wird als Bieter von Hand getippt, der Status „angeboten“ von Hand gesetzt, erst dann „Beauftragen“. | `nachtrag/`, `e2e/nachtrag.spec.ts` |
| B-19 | EP-Kalkulation: Die Ansätze werden nicht gespeichert („Beim nächsten Öffnen beginnt die Kalkulation leer“). **(B)** | `packages/kosten/src/kalkulation.ts:5-6` |
| B-20 | Bieter hat nur einen Namen; Projekt nur Name und Bauherr. Keine Angaben zum Büro als Absender. | `packages/vertrag/src/modell.ts:516` |

### Ausgaben

| Nr | Befund | Beleg |
|---|---|---|
| B-21 | Kein PDF und kein Excel für Preisspiegel, Aufmaßblatt, Soll/Ist, Rechnungsprüfung (Zahlungsfreigabe), Kostenermittlung und Kostenkontrolle. Die Module aus Welle 6 haben PDFs. | `packages/ausgabe/src/index.ts` |
| B-22 | Bilder im Langtext drucken als „[Abbildung]“. Keine Vorschau vor dem Herunterladen. Bauzeitenplan-PDF ohne Balken. | `ausgabe/src/langtext.ts:42` |

### Meldungen und Fehlerfestigkeit

| Nr | Befund | Beleg |
|---|---|---|
| B-23 | Keine Fehlergrenze in React, kein Auffangen unbehandelter Fehler. Ein Leserfehler wird weitergeworfen und hinterlässt eine leere Seite. | `gaeb/Angebote.tsx:99`; kein `ErrorBoundary` in `apps/web/src` |
| B-24 | Fehlt OPFS oder passt der Browser nicht: „Unbekannter Fehler beim Speichern“, kein Hinweis, welcher Browser geht. Firefox und Safari nicht geprüft. | `speicher/SpeicherAnbieter.tsx` |
| B-25 | Eine Projektdatei, deren Projekt schon vorhanden ist, lässt sich nicht einlesen; kein „als Kopie“. | `lv/texte.ts:195` |
| B-26 | Falsche oder rohe Texte: „Merkmale gibt es nur an Positionen“ beim Bearbeiten eines Titels; rohe Fehlermeldung beim PDF. | `lv/LvSeite.tsx`, `ausgabe/LvDrucken.tsx` |

### Sprache

| Nr | Befund | Beleg |
|---|---|---|
| B-27 | Drei Anreden: „du“ (`kosten`, `bauzeit`, `honorar`), „Sie“ (`bim`, `sicherung`, `vorlage`, `mengen`, `modellvergleich`), sonst unpersönlich. | `apps/web/src/*/texte.ts` |
| B-28 | Zwei Namen für dasselbe: Ordnungszahl/OZ, MwSt/Umsatzsteuer, Menge/Vordersatz, „Projektdatei exportieren“/„Datensicherung“, einlesen/importieren, „Projekt anlegen“/„Anlegen“/„Neue Rechnung“. „Projekt umbenennen“ ändert auch den Bauherrn. Rohe IFC-Klassennamen („IfcFooting“). „€“ mal mit, mal ohne. | `apps/web/src/*/texte.ts`, `ui-grid/src/texte.ts` |

### Daten und Sicherung

| Nr | Befund | Beleg |
|---|---|---|
| B-29 | Nicht in Projektdatei und Sicherung: Druckprofile und KG-Bezeichnungen (`localStorage`), Einstellungen des Preisspiegels (nur Sitzung), Kalkulationsansätze (nie gespeichert). | `ausgabe/DruckProfilFeld.tsx:36`, `kosten/bezeichnungen.ts:15`, `vergabe/texte.ts:81` |
| B-30 | Ob der Browser den Speicher dauerhaft hält, wird nie gezeigt; die Statuszeile sagt immer „Bereit“. | `ui/Huelle.tsx:132` |

### Vorschau-Module (Welle 6) gegenüber dem Kern

| Nr | Befund | Beleg |
|---|---|---|
| B-31 | Verweise per Handeingabe oder gar nicht: Mangel → Bauteil über eine getippte GlobalId, Mangel → Position über eine getippte OZ; Vorgang → nur ganzes LV; Honorar liest eine Kostenermittlung ohne Verweis dorthin; „Aufmaß aus Modell“ landet auf der Modellliste. | `bauleitung/MangelFormular.tsx:99`, `bauzeit/VorgangDialog.tsx` |
| B-32 | Dasselbe Bauteil lässt sich auf zwei Aufmaßblättern messen, ohne Hinweis. Die Kostengruppe aus dem Modell wird nie mit der an der Position verglichen. | `packages/bim/src/aufmass-auswahl.ts` |
| B-33 | Offene Folgetickets 123 (Aufräumen, beginnt mit einem `vertrag`-Ticket) und 124 (Vorgang verschieben, Fortschritt aus dem Leistungsstand, KG-Hinweis). | `issues/123-*.md`, `issues/124-*.md` |

### Nie von einem Menschen geprüft

| Nr | Befund | Beleg |
|---|---|---|
| B-34 | HOAI-Tafeln gegen die amtliche Fassung (D-56); GAEB-Export in einem freien GAEB-Betrachter (Tor M2); X31 und XRechnung aus echter Software; PDF und Excel außerhalb von LibreOffice; Sicherungsordner über einen Browser-Neustart; IFC aus Revit, ArchiCAD, Allplan; ein echtes LV aus dem Büro (G-52). | `welle-3`- bis `welle-6-bericht.md` |
| B-35 | Das Interview mit dem Büro (G-02) fand nie statt. Keine `vertrag`-Version seit v1.2 wurde vom Nutzer geprüft. | `grilling.md` G-02, `entscheidungen-auto.md` |

### Bereitstellung und Dokumente

| Nr | Befund | Beleg |
|---|---|---|
| B-36 | Kein Deployment (G-53: GitHub Pages). `README.md` sagt „Stand: Aufbau“. | `.github/workflows/`, `README.md` |
| B-37 | Veraltete Dokumente: `okf/project/overview.md` und Ticketstände 02, 18, 24, 26; ADR 0012 und 0013 `proposed`; Regeln mit [NEU] nie bestätigt. (In dieser Sitzung berichtigt: `welle-status.md`, `plan.md` §5, `AGENTS.md`, Regel P5.) | wie genannt |

## 3. Umfang

Priorität: **P** = Pflicht, wird nie gekürzt · **S** = Soll · **K** = Kann, wird zuerst gekürzt. „`vertrag`“ nennt, ob der
Punkt eine Vertragsänderung braucht (v1.7, eigene serielle Tickets nach P9, Opus-Review im Demo-Modus).

### E1 Navigation · P · `apps/web/src/ui/`, `projekt/` · B-01, B-03, B-04

- Die Seitenleiste folgt dem geöffneten Projekt: Übersicht · Leistungsverzeichnisse · Vergabe · Aufträge (Auftrags-LV, Nachträge,
  Aufmaß, Rechnungen) · Kosten · Gruppe „Vorschau“ (Modelle, Bauzeitenpläne, Honorar, Mängel, Bautagebuch). Ohne Projekt: nur
  Projekte und Hilfe. Die Platzhalterseiten entfallen.
- Brotkrumenpfad auf jeder Seite (Projekt › LV › Preisspiegel), Kopfzeile und markierter Eintrag stimmen überein,
  `document.title` nennt Seite und Projekt.
- Projektseite als Übersicht: Abschnitte mit den LVs (Angebote, Zuschlag), Auftrags-LVs (Verweise auf Aufmaß und Rechnungen)
  und Kosten; Aktionen gruppiert, „Projekt löschen“ in einem Menü; kein Überlauf bei 1280 px.
- Kennzeichen „Vorschau“ (G-60) an den fünf Modulen aus Welle 6, an Honorar dazu der Satz, dass die Tafelwerte nicht gegen die
  amtliche Fassung geprüft sind (bis Ticket 126 erledigt ist).
- Grundlage ist das gemeinsame Seitengerüst aus Ticket 123.

### E2 Erster Start und Hilfe · P · `apps/web/src/ui/`, neu `hilfe/` · B-02, B-14, B-30

- Leere Projektliste: kurzer Begrüßungstext und drei Wege: **Beispielprojekt laden** (aus den Fixtures: `typisch` mit Angeboten,
  Zuschlag, einem Aufmaßblatt, einer Rechnung, `haus-v1.ifc`), **GAEB-Datei einlesen** (legt das Projekt an), **leeres Projekt**.
- Hilfe: „Erste Schritte“ (der Weg von der GAEB-Datei bis zur Rechnung), „Tastenkürzel“ (aus derselben Tabelle erzeugt, die
  die Kürzel bindet), „Annahmen“ (G-62, siehe §5), „Über“ (Version, Lizenz AGPL-3.0-or-later, Verweis auf den Quelltext).
- Hinweis, wo die Daten liegen und wie man sichert, sichtbar beim ersten Projekt; Statuszeile zeigt Speicherstatus
  (dauerhaft ja/nein) und die letzte Sicherung.
- Kosten: Hinweis und Verweis zum Einlesen der KG-Bezeichnungen, solange keine vorhanden sind.
- Keine Namen, Abläufe oder Begriffe eines bestimmten anderen Programms in den Texten (L3, C1).

### E3 Arbeitsfläche · P · `packages/ui-grid`, `apps/web/src/lv/`, `auftrag/`, `vergabe/` · B-05 bis B-08

- Werkzeugleiste in Gruppen mit Menüs (Radix, U1); bei 1280 px eine Zeile. Dasselbe Muster auf allen Seiten.
- Das Grid füllt die restliche Höhe. Das Prüf-Panel lässt sich einklappen und ist ohne Befunde zu. Der Summenfuß wird nicht
  abgeschnitten und nicht von Meldungen überdeckt.
- OZ-Spalte so breit wie die längste OZ der Maske samt Index; Spaltenbreiten per Maus und Tastatur änderbar und je Grid gemerkt;
  Zahlen nie abgeschnitten.
- Preisspiegel: Summenblock einklappbar, Bieterübersicht ohne Überlauf.
- **Ziel als Test:** bei 1280×800 zeigt die LV-Seite mindestens 15 Zeilen und die Spalten EP und GP ohne waagerechtes Rollen.

### E4 Suchen und Menüs · S · `packages/ui-grid`, `apps/web/src/lv/` · B-09

- Suchen (Strg+F) über OZ, Kurztext und Langtext mit Sprung zum Treffer; Filter nach Art, Merkmal, „ohne Preis“.
- Kontextmenü an Zeile und Zelle mit denselben Aktionen wie die Tastatur (U3); Kürzelübersicht aus dem Grid heraus aufrufbar.

### E5 GAEB DA XML 3.1 lesen · P · `packages/gaeb` · B-10

- X81, X83, X84, X86 in Version 3.1 lesen. Die amtlichen Musterdateien liegen in `fixtures/extern/gaeb/3.1-musterdateien/`.
- Schreiben bleibt bei 3.2 und 3.3 (G-10).

### E6 GAEB 90 und GAEB 2000 lesen · S · `packages/gaeb`, `vertrag` (Formatangabe) · B-11, G-61

- Lesen von .d81/.d83/.d84/.d86 und .p81/.p83/.p84/.p86 in dasselbe Modell wie DA XML; was sich nicht abbilden lässt, ist ein
  Befund (U5, Q5). Kein Schreiben.
- Prüfstein: dasselbe LV als XML 3.3, XML 3.1, GAEB 90 und GAEB 2000 ergibt dasselbe Modell (bis auf dokumentierte
  Unterschiede der Formate). Testdateien: selbst verfasst und die Dateien aus Ticket 125 (G-64, C4).
- Die Formatregeln stammen aus frei zugänglichen Beschreibungen; keine lizenzierten Normtexte im Repo (C1). Wo die Quelle
  nicht reicht, entscheidet der Berater und der Punkt wird im Bericht als unsicher genannt.

### E7 Meldungen beim Einlesen · P · `packages/gaeb`, `apps/web/src/gaeb/` · B-10 bis B-12

- Dateiart am Inhalt erkennen (DA XML, GAEB 90, GAEB 2000, unbekannt); der Dateidialog bietet alle GAEB-Endungen an.
- Jede abgewiesene Version und Phase (auch X80, X82, X85, X87, X88, X89) bekommt einen Satz, der sagt, was die Datei ist und
  was stattdessen geht. Keine Ticketnummern in Texten für Nutzer.
- Befunde in Nutzersprache: zusammengefasst („Nicht übernommen: Währung, Projektbezeichnung, …“, Einzelheiten aufklappbar),
  Zahlen im deutschen Format (N4), keine Kennungen als Lesetext, kein „Vertrag“, Zeilenangabe nur, wenn sie hilft. Gilt für die
  Dialoge zu GAEB, X84, X31, XRechnung und IFC.

### E8 Fehlende Bedienung · P · `apps/web` (mehrere Ordner), `vertrag`, `kern`, `speicher` · B-15, B-16, B-25

- Bedienung für vorhandene Befehle: Hinweistext anlegen und ändern; Angebot löschen, einzelne Angebotspreise erfassen und
  berichtigen, Nachlass des Angebots setzen und entfernen; OZ-Maske ändern (mit Prüfung der vorhandenen OZ).
- Neue Befehle (`vertrag`): LV-Stand umbenennen und löschen; Bieter umbenennen und löschen (nur ohne Angebot); Zuschlag
  zurücknehmen (Auftrags-LV löschen, solange es keine Nachträge, Aufmaße oder Rechnungen trägt; sonst eine Sperre, die nennt,
  was im Weg steht). Danach ist jedes Projekt wieder löschbar (Q5).
- Projektdatei einlesen, wenn das Projekt schon da ist: Wahl zwischen „als Kopie“ und Abbrechen.

### E9 Abläufe · S · `apps/web/src/auftrag/`, `nachtrag/`, `kosten/`, `vertrag` · B-17 bis B-19

- Auftrags-LV-Seite: Langtext lesen (Positionsdialog ohne Bearbeiten), Excel-Ausgabe.
- Nachtrag: Der Auftragnehmer ist als Bieter vorbelegt; nach dem Einlesen des Angebots schlägt die App den Status „angeboten“
  vor; „Beauftragen“ ist der sichtbare nächste Schritt.
- EP-Kalkulation: Ansätze und Zuschlagssätze werden an der Position gespeichert (`vertrag`), der Dialog öffnet mit ihnen.

### E10 Stammdaten · S · `vertrag`, `kern`, `speicher`, `apps/web/src/projekt/`, `vergabe/` · B-20, G-61

- Projekt: Nummer, Ort, Anschrift der Baustelle. Bieter: Anschrift, Ansprechperson, E-Mail, Telefon. Büro (Absender): Name,
  Anschrift, einmal für alle Projekte, in der Sicherung (E15).
- „Projekt umbenennen“ wird „Projektangaben“. X84 und X86 füllen die Anschrift des Bieters, wo die Datei sie trägt.
- Die Angaben erscheinen in den Köpfen der PDFs (E11, E12).

### A5 Abzüge und Zahlungen · S · `vertrag`, `abrechnung`, `speicher`, `fixtures/`, `apps/web/src/rechnung/` · G-61

- Skonto (Satz und Frist, wirkt auf den Zahlbetrag), Bauabzugsteuer (§ 48 EStG), Vertragsstrafe (Betrag mit Grund) in der
  Abzugskette nach D-34; die Reihenfolge entscheidet der Berater und sie steht auf der Seite „Annahmen“.
- Zahlungen je Rechnung (Datum, Betrag) mit offenem Betrag; Skonto nur, wenn die Zahlung in der Frist liegt.
- Sollwerte in einer Fixture, hergeleitet aus der Regel (C4), dazu ein Kettentest ohne Oberfläche.

### M4 Weitere REB-Formeln · K · `packages/mengen`, `gaeb` (X31), `apps/web/src/mengen/` · G-61

- Nummerierte Formeln nach REB 23.003 über die 91 hinaus; Auswahl und Quelle entscheidet der Berater. Beschreibungen in
  eigenen Worten (C1). X31 behält die Formelnummer im Rundweg.
- Wird bei Überlauf als Erstes gestrichen (G-61).

### E11 Ausgaben der Kernkette · P · `packages/ausgabe`, `apps/web/src/vergabe/`, `abrechnung/`, `rechnung/` · B-21, B-22

- PDF: Preisspiegel (quer, auch als Excel), Vergabevorschlag (Rangfolge, geprüfte Summen, freier Begründungstext),
  Aufmaßblatt mit Mengenansätzen, Soll/Ist, Rechnungsprüfung mit Zahlungsfreigabe (die Abzugskette Zeile für Zeile).
- Bilder aus dem Langtext im LV-PDF. Vorschau im Dialog vor dem Herunterladen.
- Alle über das `Ausgabemodell` bzw. `Berichtsmodell` (ADR 0012, D-113.1), Druckprofile wie beim LV.

### E12 Ausgaben der Kosten · S · `packages/ausgabe`, `apps/web/src/kosten/` · B-21

- PDF und Excel für Kostenermittlung und Kostenkontrolle. Bauzeitenplan-PDF mit Balken: **K**.

### E13 Fehlerfestigkeit · P · `apps/web/src/ui/`, `speicher/` · B-23, B-24, B-26

- Fehlergrenze und Auffangen unbehandelter Fehler: eine Seite mit „Projektdatei sichern“, „Neu laden“ und aufklappbaren
  Einzelheiten statt einer leeren Seite.
- Prüfung beim Start: Was der Browser können muss; die Meldung nennt, welche Browser gehen (Firefox und Safari vorher messen
  und das Ergebnis schreiben, nicht raten).
- Die in B-26 genannten Texte; alle Fehlermeldungen deutsch und mit einem nächsten Schritt.

### E14 Einheitliche Sprache · P · `apps/web/src/*/texte.ts`, `packages/ui-*`, `GLOSSARY.md` · B-27, B-28

- Anrede nach L4 (G-63). Ein Begriff je Sache nach `GLOSSARY.md`; wo das Glossar zwei zulässt, entscheidet dieses Ticket und
  trägt es dort ein (L2).
- Regeln für Schaltflächen: Verb mit Gegenstand („Projekt anlegen“), „…“ nur, wenn ein Dialog folgt, ein Trennzeichen in
  Seitentiteln, „€“ einheitlich. IFC-Klassen mit deutschem Namen und der Klasse in Klammern.
- Ein Test liest alle Textdateien und schlägt bei „du“-Formen und den abgewählten Doppelbegriffen fehl.

### E15 Daten und Sicherung · P · `vertrag`, `speicher` (Migration 7, Projektdatei Schema 7), `apps/web` · B-29

- Druckprofile, KG-Bezeichnungen und Büroangaben als Einstellungen im Speicher und in der Sicherung; Einstellungen des
  Preisspiegels am LV. Vorhandene Werte aus dem `localStorage` werden übernommen.
- Ältere Projektdateien (Schema 1–6) öffnen weiter (A8).

### E16 Vorschau-Module anbinden · S, Teile K · `apps/web/src/bim/`, `bauzeit/`, `honorar/`, `bauleitung/`, `bim` · B-31 bis B-33

- Tickets 123 und 124 (123 zuerst; sein Vertragsteil geht in v1.7 auf).
- Auswahl statt Handeingabe: Mangel → Position und Bauteil; Verweis Honorar ↔ Kostenermittlung; „Aufmaß aus Modell“ öffnet
  das Modell mit dem Auftrags-LV vorgewählt.
- Hinweis, wenn ein Bauteil schon auf einem anderen Aufmaßblatt gemessen ist: **S**. „Mangel aus Bauteil“ in der Modellansicht
  und der Befund „KG im Modell weicht ab“: **K**.

### E17 Bereitstellung und Dokumente · P · `.github/workflows/`, Wurzel, `docs/`, `okf/` · B-36, B-37

- Workflow für GitHub Pages aus `main` (G-53) mit Basis-Pfad; Versionsnummer und Stand des Builds auf der Seite „Über“.
- `README.md` (Stand, Adresse der Demo, erste Schritte), `CONTRIBUTING.md` (Stand nach M3).
- ADR 0012 auf `accepted` für v1 mit dem Nachtrag zum `Berichtsmodell` (G-62); ADR 0013 bleibt `proposed` (G-57 vertagt).
- OKF und die offenen Ticketstände (02, 18, 24, 26) berichtigen.

## 4. Schnitt, Kürzung und Tor

**Hinweise für den Schnitt** (der Orchestrator schneidet die Tickets ab Nr. 127; 125 und 126 sind Aufgaben für den Nutzer):

- `vertrag` v1.7 zuerst und seriell: (a) E8, E9, E10, E15 und der Vertragsteil von Ticket 123; (b) A5. Opus-Review gegen alle
  Verbraucher, der Nutzer prüft nach der Welle (P9).
- Ohne `vertrag` sofort startbar: E5, E7 (Paketteil), E3 (`ui-grid`), E1 und E2 (App-Hülle), E13, E14 (Test zuerst), E17.
- Ein Schreiber je Paket (P2): in `gaeb` nacheinander E5 → E7 → E6 (GAEB 90, dann GAEB 2000); in `ausgabe` E11 → E12;
  in `ui-grid` E3 → E4. In `apps/web` je Ordner ein Schreiber (D-20); E1 und E3 fassen viele Seiten an und laufen deshalb vor
  den Tickets, die einzelne Seiten ändern.
- Rund 40 Tickets. Höchstens 8 Agenten zugleich (P4).

**Kürzungsreihenfolge bei Überlauf** (zuerst genannt fällt zuerst): M4 → die K-Teile von E16 und E12 → Ticket 124 → E12 →
E4 → GAEB 2000 aus E6 → GAEB 90 aus E6 → E10. **Nie gekürzt:** alles mit P und das Tor. Was gekürzt wird, nennt der Bericht
und es geht nach §6.

**Tor E „Einführungsreife“** (`plan.md` §4):

1. `apps/web/e2e/umsteiger.spec.ts` bei 1280×800, ohne Testhaken und ohne getippte Adressen nach dem Start: erster Start →
   Beispielprojekt laden und ansehen → neues Projekt aus der amtlichen BVBS-X83 → LV-Seite zeigt mindestens 15 Zeilen samt EP
   und GP → zwei X84 → Preisspiegel, PDF erzeugt → Zuschlag → Nachtrag anlegen und beauftragen → Aufmaßblatt → Rechnung mit
   Skonto prüfen und freigeben, Zahlungsfreigabe als PDF → Kostenkontrolle → Projektdatei sichern → Projekt löschen →
   Sicherung einlesen → dieselben Werte.
2. Kein waagerechter Überlauf bei 1280 px auf allen Routen (ein Test geht die Routen ab).
3. Dasselbe LV als XML 3.3, XML 3.1, GAEB 90 und GAEB 2000 ergibt dasselbe Modell (Kettentest; ohne die gekürzten Formate).
4. Der Sprachtest aus E14 ist grün; die Fehlergrenze hat einen Test.
5. Alle früheren Tore bleiben grün (M1–M4, X1–X4), kein Leistungsbudget gelockert.

## 5. Seite „Annahmen“ (G-62)

Die Annahmen der Agenten gelten für v1. Die Seite nennt in einfachen Sätzen mindestens:

- Preisspiegel: wie Min, Mittel und Max gebildet werden, Ausreißer-Schwelle, ABC-Klassen, ein Nachlass je Angebot (D-05, G-26).
- Zuschlag: Das Auftrags-LV enthält nur das Beauftragte; die gewählte Wahlposition wird zur normalen Position (D-21).
- Nachtrag: eigenes LV, hängt nach dem Beauftragen als Gliederung im Auftrags-LV; es gilt der Nachlass des Hauptauftrags (D-35).
- Soll/Ist: Schwellen 110 % und 90 % nach VOB/B § 2 Abs. 3 (D-35).
- Rechnungsprüfung: Reihenfolge der Abzugskette samt Skonto, Bauabzugsteuer und Vertragsstrafe; eingefrorene Zahlbeträge (D-34, A5).
- Kostenkontrolle: netto, Nachlass als eigene Zeile, eine Kostengruppe je Position (D-37).
- Rundung: kaufmännisch, EP mit 3 Stellen, negative Werte nach E-07.
- Mengenermittlung: welche Formeln gerechnet werden, Dezimalkomma.
- Honorar (Vorschau): HOAI 2021, Tafeln und Rundung nach D-56, nicht amtlich geprüft.
- Was nicht übernommen wird: die Liste aus §6, soweit ein Nutzer sie erwartet.

Die Sitzung mit dem Büro (Ticket 126, zugleich das Interview G-02) geht diese Liste durch.

## 6. Nach Welle 7 (bewusst nicht im Umfang)

Nebenangebote (X85) · losweise Vergabe und Vergabe an mehrere Bieter (G-29) · mehrere Kostengruppen je Position · Prognose in
der Kostenkontrolle · beliebige Excel-LVs einlesen · Anschreiben und Auftragsschreiben · Nachlass je Position und
Bieter-Textergänzungen aus X84 (B-13) · ZUGFeRD lesen, XRechnung und ZUGFeRD erzeugen (G-15) · § 650c Abs. 3 BGB · DA11 ·
getaggtes PDF · Fotos an Mängeln · BCF · IFC 4.3 · Austausch mit MS Project · besondere Leistungen der HOAI ·
Textkataloge (G-17) · Mehrbenutzer und Sync-Server (G-57) · KI-Assistent X6 · Tablet (U6) · Ziehen mit der Maus im Grid.

## 7. Aufgaben für den Nutzer

- **Ticket 125, vor Welle 7:** Testdateien bereitstellen (G-64).
- **Ticket 126:** GitHub Pages einschalten (vor der Demo); nach Welle 7 die Handprüfungen aus B-34 und die Sitzung mit dem
  Büro, die zugleich das Interview ist (B-35). Die `vertrag`-Versionen bis v1.6 gelten mit G-58 als angenommen; v1.7 prüft
  der Nutzer nach der Welle (P9).
