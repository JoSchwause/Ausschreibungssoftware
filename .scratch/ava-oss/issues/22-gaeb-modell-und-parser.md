# 22: GAEB: XML-Modell und Parser X81/X83, Version 3.3 (G1)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: G · Paket: `packages/gaeb` (einziger Schreiber)
Blocked by: 02, 03, 23
Regeln: A2, A3, N1, N4, Q1, Q3, G-10, G-11, G-12, G-13, ADR 0010

## What to build

Leser für **GAEB DA XML 3.3** der Phasen **X81 und X83**, nach `vertrag`-Typen (LV mit OZ-Maske, Gliederung,
Positionen, Texte, Mengen, Einheiten). Eigene Implementierung, **kein fremder Code** (C1): freie Bibliotheken
dienen nur als Vergleich. Prinzip **tolerant lesen, streng schreiben**: kaputte Dateien werden nicht abgelehnt,
sondern mit **Prüfbefunden** (Warnung/Fehler mit Quelle und Position) gelesen. Sicherheit: kein XXE, keine externen
Entitäten, Größen- und Tiefengrenzen. Zahlen nur als Dezimalwerte, de-DE nie im XML (N1, N4). Versions- und
Phasenerkennung aus Namensraum, `GAEBInfo/Version`, `Award/DP` und zuletzt der Endung.
Eigene Validierung in der App (ADR 0010); das XSD kommt nicht in dieses Ticket (nur CI, Ticket G2).
Lesen von 3.2 und weitere Phasen sind Ticket G4.

## Acceptance criteria

- [ ] Liest alle X81/X83-Dateien aus `fixtures/extern/` (Ticket 23), die Version 3.3 sind, ohne Absturz; Befunde je Datei als Golden-Datei
- [ ] Liest die zehn Fehlerdateien (ungeschlossenes Tag, Dezimalkomma, ungültiges Enum, doppelte ID, Latin-1 trotz UTF-8, OZ-Überlauf …) mit je der erwarteten Warnung oder dem Fehler und liefert die übrigen Positionen
- [ ] Ergebnis `Leistungsverzeichnis` stimmt bei der BVBS-Prüfdatei Bauausführung 3.3 (X83) in Positionszahl, Gliederung und OZ-Maske mit den Angaben der BVBS-Prüfkriterien überein; Zahl und Quelle im Ticket
- [ ] Indexpositionen (`RNoIndex`), Bedarfs-, Wahl- und Zuschlagspositionen (`MarkupItem`) werden erkannt und dem richtigen Typ zugeordnet
- [ ] Eingebettete Bilder im Langtext gehen nicht verloren und gelangen nicht in die Metadaten
- [ ] Sicherheitstests: Billion-Laughs-Datei und Datei mit externer Entität werden abgewiesen
- [ ] `gaeb` importiert nur `vertrag` und `dezimal` (A3, CI-geprüft)
- [ ] Datei über 2 MB wird in unter 1 s gelesen (Messwert im Ticket)

## Nicht-Ziele

Schreiben X81/X83/X86 und XSD-Gegenprüfung (G2), X84-Import (G3), Version 3.2 und GAEB 90/2000 (G4), Oberfläche.
