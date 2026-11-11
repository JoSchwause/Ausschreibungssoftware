---
status: proposed
---
# PDF-Ausgabe mit pdfmake, ungetaggt in v1

Der LV-Druck erzeugt das PDF im Browser mit pdfmake (MIT) und der eingebetteten Schrift Noto Sans (OFL-1.1). Das PDF ist in v1 **ungetaggt**: Es trägt Sprache und Titel, aber keinen Strukturbaum. pdfmake bleibt hinter dem eigenen `Ausgabemodell` von `packages/ausgabe`; der Renderer liest nur dieses Modell und ist austauschbar.

Status: für die Demo umgesetzt, Mensch bestätigt später (W-04, Entscheidung D-23). Bis zur Bestätigung gilt der Text als Vorschlag.

## Kontext

Das Spike-Ticket 28 hat zwei Wege verglichen, mit `fixtures/gross.json` (5.000 Positionen, A4, Noto Sans 8 pt) unter Node und in Chromium:

- **Weg A, pdfmake:** Das PDF entsteht als Bytes in der App. Dauer etwa 3 s, Datei etwa 1,3 MB, 270 Seiten; Bündel etwa 290 KB gzip. Seitenumbruch (Titel nicht vom ersten Kind trennen), Kopf- und Fußzeile und „Seite x von y“ lassen sich selbst steuern. pdfmake setzt bei `tagged` nur die Kennzeichen, schreibt aber keine Strukturelemente.
- **Weg B, Druckweg des Browsers mit Druck-CSS:** Der Browser schreibt echte Tags (Dokument, Tabelle, Zeile, Zelle), braucht dafür aber etwa die zehnfache Dateigröße und das 2,6-Fache an Zeit. Vor allem liefert er der App keine Bytes: Das PDF entsteht erst im Druckdialog. Umbruch und Ränder hängen von Browser und Dialogeinstellungen ab, und ohne Dialog lässt sich der Weg kaum automatisch testen.

Die App läuft lokal ohne Server (ADR 0001). Ein PDF, das sich ablegen und später an eine Vergabe hängen lässt, braucht Bytes in der App. U8 verlangt Tastatur und Kontrast, nennt das PDF aber nicht; ob ein getaggtes (barrierefreies) PDF in v1 verlangt wird, ist offen (W-04).

## Entscheidung

- pdfmake, ungetaggt, für v1 (Weg A). Der Browserdruck (Weg B) entfällt; sein Code und seine Messung sind aus dem Repo entfernt, die Messwerte stehen im Ticket 28.
- Das `Ausgabemodell` ist die Naht: Es enthält druckfertige Zeilen mit schon de-DE formatierten Zahlen (N4) und rechnet nichts (A2). Alle Beträge kommen aus dem `Summenstand` des Kerns. Auch die Variante „ohne Preise“ wird im Modell gebildet, nicht im Renderer; ohne Preise steht keine Zahl mit Preischarakter im Modell. Der Excel-Export (Ticket 61) liest dasselbe Modell.
- Das PDF ist bei gleicher Eingabe gleich: Das Erzeugungsdatum und damit die Datei-ID kommen aus der Eingabe (das Paket kennt keine Uhr).
- Bedarfs- und Wahlsumme stehen getrennt von der Netto-Summe (F4).

## Folgen

- pdfmake belegt den Hauptthread (etwa 3 bis 4 s bei 5.000 Positionen). Die App ruft es aus einem Worker auf und lädt das Bündel erst beim Drucken nach (Ticket 66).
- Das PDF ist nicht barrierefrei im Sinne eines Strukturbaums. Verlangt ein Auftraggeber Tags, braucht es vor den Druckprofilen (O3) einen kleinen Spike mit einer Bibliothek, die Struktur-Tags schreibt (nicht geprüft: pdf-lib, jsPDF, @react-pdf). Wegen der Naht ändert sich dann nur der Renderer.
- Bilder im Langtext druckt v1 nicht; an ihrer Stelle steht die Marke „[Abbildung]“, damit nichts still verschwindet (Q5).
- Die Schrift Noto Sans liegt als Datei im Repo (`packages/ausgabe/schriften/`, REUSE-Eintrag, Lizenztext unter `LICENSES/OFL-1.1.txt`).
- Entscheidung als Annahme für den Demo-Lauf getroffen; der Nutzer bestätigt oder verwirft sie (W-04).
