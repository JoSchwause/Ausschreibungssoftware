---
status: accepted
---
# PDF-Ausgabe mit pdfmake, ungetaggt in v1

Der LV-Druck erzeugt das PDF im Browser mit pdfmake (MIT) und der eingebetteten Schrift Noto Sans (OFL-1.1). Das PDF ist in v1 **ungetaggt**: Es trägt Sprache und Titel, aber keinen Strukturbaum. pdfmake bleibt hinter dem eigenen `Ausgabemodell` von `packages/ausgabe`; der Renderer liest nur dieses Modell und ist austauschbar.

Status: angenommen für v1 (2026-11-13). Für die Demo umgesetzt (Entscheidung D-23); mit G-58 und G-62 gelten die Annahmen der Agenten für v1, damit gilt auch dieser Text. Offen bleibt nur, ob ein getaggtes PDF verlangt wird (W-04, siehe Spike unten); dann ändert sich nur der Renderer. ADR 0013 bleibt `proposed`.

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
- **Nachtrag 2026-11-14 (Welle 7, G-61, E11/E12, D-88):** Bilder aus dem Langtext stehen jetzt im LV-PDF (PNG und JPEG, am Inhalt erkannt, mit Grenzen für Dateigröße und Bildpunkte, auf dem Papier nie vergrößert; D-141.5). Die Marke „[Abbildung]“ bleibt für alles, was der Druck nicht sicher lesen kann, damit nichts still verschwindet (Q5). Das Bild steht schon im `Ausgabemodell`; der Renderer rechnet weiter nichts.
- Die Schrift Noto Sans liegt als Datei im Repo (`packages/ausgabe/schriften/`, REUSE-Eintrag, Lizenztext unter `LICENSES/OFL-1.1.txt`).
- Entscheidung als Annahme im Demo-Lauf getroffen und für v1 angenommen (G-58, G-62); das Büro prüft im Probebetrieb, ob ein getaggtes PDF nötig ist (W-04).

## Spike: getaggtes PDF (Ticket 77)

Frage: Schreibt eine Bibliothek mit AGPL-verträglicher Lizenz im Browser einen echten Strukturbaum? Geprüft wurde `pdfkit` 0.20.2 (MIT, die Bibliothek unter pdfmake, schon im Bündel; keine neue Abhängigkeit). Quelle: `node_modules/pdfkit/package.json` (`"license": "MIT"`) und der Code der Ausgabe. pdf-lib, jsPDF und @react-pdf wurden in der Zeitbox nicht geöffnet und bleiben ungeprüft.

- **Strukturbaum: ja.** `new PDFDocument({ tagged: true })` schreibt `/MarkInfo`, `/StructTreeRoot` und nach `struct(...)` echte Elemente (Document, H1/H2, Table, TR, TD, P), und `text(..., { structParent })` bindet den Text per Marked Content an sie. pdfmake 0.3.14 reicht diese Schnittstelle nicht durch; es setzt nur die Kennzeichen.
- **Messung** (`messung/spike-tags.spec.ts`, `gross` mit 5.000 Positionen, Node 22, 4 Kerne, nur ein Gerüst aus OZ, Kurztext, Menge, Einheit, EP, GP ohne Langtext und Summen): 5.000 TR, 30.000 TD, 405 Table, 605 Überschriften; Dauer etwa 1,7 s (Median von drei Läufen); Datei etwa 6,6 MB (pdfmake: etwa 1,4 MB, die Struktur kostet gut das Vierfache); Bündel unverändert (pdfkit-Browserbündel 287 KiB, gzip 68 KiB, steckt schon in pdfmake). Im Browser nicht gemessen (kein Mehraufwand zu erwarten, dasselbe Bündel).
- **Preis:** Mit pdfkit direkt entfallen die Layout-Dienste von pdfmake (Spalten, Seitenumbruch ohne Waise, Kopf- und Fußzeile, „Seite x von y“, Tabellen im Langtext). Ein getaggter Renderer ist ein zweiter Renderer mit eigenem Umbruch, kein Schalter. Wegen der Naht (`Ausgabemodell`) bleibt Modell und Test über den Seitentext gleich.
- **Empfehlung für v1.x:** pdfmake bleibt für v1. Verlangt ein Auftraggeber ein getaggtes PDF (W-04), baut ein eigenes Ticket einen zweiten Renderer auf pdfkit (`tagged: true`, Überschrift je Titel, eine Tabelle je Titel, Spaltenköpfe als TH, Langtext als P und L/LI) und prüft ihn mit einem PDF/UA-Prüfer außerhalb des Repos. Bis dahin bleibt es bei pdfmake.

## Nachtrag: Berichtsmodell neben dem Ausgabemodell (G-62, D-113.1)

Die Ausgaben der Vorschau-Module (Mängelliste, Mängelanzeige, Bautagebuch, Honorarberechnung, Bauzeitenplan) haben eine andere Form als der LV-Druck: Sie sind Berichte aus Kopf, Abschnitten und Tabellen, nicht LV-Zeilen mit Summenstand. Sie bekommen deshalb ein eigenes `Berichtsmodell` in `packages/ausgabe` neben dem `Ausgabemodell`, statt dieses aufzuweiten.

- Die Naht-Regel dieses ADR gilt unverändert: Der Renderer liest nur ein druckfertiges Modell, Zahlen und Texte sind schon de-DE formatiert (N4), das Paket rechnet nichts (A2) und kennt keine Uhr; Datum und Datei-ID kommen aus der Eingabe.
- Beide Modelle werden mit pdfmake und Noto Sans ungetaggt gedruckt. Ein getaggter Renderer (siehe Spike) bräuchte für jedes der beiden Modelle einen eigenen Weg.
- Der Excel-Export bleibt am `Ausgabemodell`; für Berichte gibt es in v1 nur PDF.
- **Nachtrag 2026-11-14 (Welle 7, G-61, E11/E12, D-88):** Berichte gibt es jetzt auch als Excel (Preisspiegel, Aufmaßblatt, Soll/Ist, Kostenermittlung, Kostenkontrolle). Ein allgemeiner Excel-Renderer liest das `Berichtsmodell`, wie der PDF-Renderer; eine Zahl trägt neben ihrem de-DE-Text den Wert und ihre Zahlenart, damit Excel sie als Zahl mit dem Format nach N3 schreibt (D-141.2). Das Modell rechnet dafür nichts (A2). Die Entscheidung dieses ADR (pdfmake, ungetaggt, das Modell als Naht) bleibt unverändert; der LV-Export liest weiter das `Ausgabemodell`.
