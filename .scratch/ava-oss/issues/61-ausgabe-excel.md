# 61: O2: Excel-Export und -Import (LV für Bieter, Rücklauf als Angebot)

Status: claimed
Type: task
Welle: 4 · Strang: O2 (mit V5) · Paket: `packages/ausgabe`
Blocked by: 58 (gleiches Paket)
Regeln: A2, A3, N1, N4, C5, U5, Q5, G-14, D-25
Herkunft: `plan.md` §2 O2 („Excel-Export/-Import“) und V5 („Excel-Rundlauf für Bieter (mit O2)“), G-14

## What to build

G-14: Bieter geben ihre Preise über X84 oder über einen Excel-Rundlauf ab. Dieses Ticket baut beide Richtungen als reine
Funktionen in `ausgabe` (Bytes rein, Bytes raus; keine Datei-API):

1. **Bibliothek (D-25):** `fflate` (MIT) für ZIP, eigene kleine SpreadsheetML-Schicht (Schreiben: Arbeitsblatt, feste
   Stile, Spaltenbreiten, fixierte Kopfzeile, Zellschutz; Lesen: Zellwerte aus `sheet1`, Shared Strings, Inline Strings,
   Zahlen). Deterministische Bytes (feste Zeitstempel in den ZIP-Einträgen und `docProps`).
2. **Export „LV für Bieter“** (`lvAlsExcel(lv: LvZustand, optionen)`): eine Zeile je Knoten in Dokumentreihenfolge mit
   OZ, Kurztext, Merkmalen (Text), Menge, Einheit, EP (leer, eingebbar), GP (Formel `=Menge*EP` gerundet, nur zur Anzeige
   für den Bieter), Zuschlagssatz-Spalte an Zuschlagspositionen; eine **versteckte Spalte mit der Positions-ID** und eine
   Kopfzeile mit LV-ID und Prüfsumme der Struktur, damit der Rücklauf eindeutig zuordnet. Gesperrt sind alle Zellen außer
   EP und Zuschlagssatz. Optional „mit Preisen“ (Schätzpreise als Wert) für den Ausschreibenden.
3. **Import „Rücklauf“** (`excelRuecklaufLesen(bytes, lv)` → `{ positionen: Angebotsposition[], nachlass: null, befunde }`):
   EP als Zahl oder als de-DE-Text (`1.234,5`) → `Einheitspreis` mit 3 Stellen (N3/N4; mehr Stellen: Befund, nicht still
   runden); leere EP-Zelle → `nicht-angeboten`; `0` → angeboten mit 0,000; Satz an Zuschlagspositionen → `zuschlagssatz`
   (Platzhalter-EP nach D-29.1). Befunde: unbekannte/fehlende Positions-ID, falsches LV, geänderte Struktur (Prüfsumme),
   Text in Zahlzelle, Preis an Gliederung. Nichts still verwerfen (Q5).
4. Rundweg-Test: `typisch` exportieren, Preise eines Bieters aus `typisch-angebote` in die Zellen schreiben (über die eigene
   Schreibschicht oder durch Ändern der XML), zurücklesen → Angebotspositionen gleich der Fixture.
5. Zusätzlich `preisspiegelAlsExcel(...)`? **Nein** in diesem Ticket (Nicht-Ziel), damit `ausgabe` nicht von `vergabe` abhängt.

## Grenzen

- Nur `packages/ausgabe`; `ausgabe` importiert `vertrag`, `dezimal` und ggf. `kern`, nie `vergabe` oder `gaeb` (A3).
- Neue Abhängigkeit nur mit grüner Lizenzprüfung (C5).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Golden-Test der erzeugten Datei (Bytes oder kanonisierte XML) für `winzig`
- [x] Rundweg mit `typisch` und allen drei Bietern; Befund-Tests für jeden Fehlerfall
- [x] Datei öffnet sich in LibreOffice (headless `soffice --convert-to csv`, falls im Container verfügbar; sonst im Ticket
      vermerken) – sonst mindestens XML-Wohlgeformtheit und Struktur gegen die OOXML-Grundform geprüft
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Preisspiegel als Excel, Import beliebiger fremder Excel-LVs, Formatvorlagen, Anbindung in der App (Ticket 66).

## Comments

### Ergebnis (Agent, Branch `welle-4/61-excel`, Basis `integration/welle-4` bei `5b7dc4f`)

**Geliefert.** `packages/ausgabe`: `lvAlsExcel(zustand, { mitPreisen?, datum? }) → { bytes, befunde }` und
`excelRuecklaufLesen(bytes, zustand) → { positionen, nachlass: null, befunde }`, dazu `strukturPruefsumme(lv)`. Neu: `src/xlsx.ts`
(SpreadsheetML-Schicht über `fflate` 0.8.3, MIT, Lizenzprüfung grün), `src/pruefsumme.ts` (SHA-256, synchron), `src/excel.ts`,
Testhilfen `src/testhilfe/excel.ts`, Golden `testdaten/excel-winzig.golden.xml` (alle Teile, je Element eine Zeile;
aktualisieren mit `GOLDEN_UPDATE=1`). Tests: `excel.test.ts` (Rundweg `typisch` mit allen drei Bietern als Zahl- und als
de-DE-Textzellen, Zahlformen), `excel-befunde.test.ts` (jeder Fehlerfall), `excel-datei.test.ts` (Golden, Determinismus, OOXML-Grundform,
Zellschutz, Inhalt, Export-Befunde), `excel-libreoffice.test.ts`.

**LibreOffice.** `soffice` ist im Container vorhanden (LibreOffice 24.2.7.2). Der Test öffnet die von Bieter B gefüllte Datei
headless, gibt sie als CSV aus (Kopf, alle Knoten, die von LibreOffice beim Öffnen gerechneten GP gleich den Sollwerten der Fixture)
und liest eine von LibreOffice neu gespeicherte .xlsx (Shared Strings, eigene Zahlschreibweise, Schutz und fixierte Zeilen bleiben)
zurück: gleiche Angebotspositionen, kein Befund. Ohne `soffice` wird der Test übersprungen (`describe.skipIf`); die CI prüft dann nur
Wohlgeformtheit, Content-Types und Beziehungsziele (`excel-datei.test.ts`). In Microsoft Excel selbst ist die Datei nicht geöffnet worden.

**Leistung (nur gemessen, kein Test).** `gross` (5.000 Positionen) mit Preisen: Export etwa 0,4 s, 429 kB; Rücklauf etwa 0,5 s
(Maschine belastet, Last 12–13 auf 4 Kernen).

**Entscheidungen.**

- **D-61.1** Frage: Schnittstelle? Entscheidung: `lvAlsExcel` gibt `{ bytes, befunde }` zurück, nicht nur Bytes, weil auch der Export
  etwas melden muss (`text-gekuerzt` über 32.767 Zeichen je Zelle, `zahl-zu-genau` über 15 geltende Ziffern); `mitPreisen` ist
  standardmäßig `false` (Blankett). `excelRuecklaufLesen` nimmt den `LvZustand` (wie der Export). Getestet wird nur an diesen beiden
  Funktionen; die SpreadsheetML-Schicht über sie und über das Golden. Grund: Q5, eine Naht.
- **D-61.2** Frage: Befundtyp? Entscheidung: eigener Typ `ExcelBefund` in `ausgabe`, gebaut wie `Pruefbefund` (Schwere, Code, Meldung,
  `Befundort` mit Zeile, Spalte, Knoten, Feld), Quelle `'excel'`. Grund: `Befundquelle` in `vertrag` ist geschlossen; eine Erweiterung um
  `'excel'` wäre ein eigenes Vertrags-Ticket (P9), falls die App Excel-Befunde in die gemeinsame Befundliste legen will (Ticket 66).
- **D-61.3** Frage: Aufbau des Blatts? Entscheidung: Zeile 1 LV-Name, Zeile 2 `LV-ID` und `Prüfsumme` (Bezeichnung, Wert rechts daneben),
  Zeile 3 Spaltenköpfe (fixiert), ab Zeile 4 eine Zeile je Knoten in Dokumentreihenfolge (Los/Titel, Hinweistext, Position; keine
  Titelsummen). Spalten: OZ, Kurztext, Merkmale, Menge, Einheit, EP, GP, „Zuschlagssatz in %“, Positions-ID (versteckt). Kein Langtext
  und keine Unterbeschreibungen: der Bieter hat dazu X83 bzw. PDF; Hinweistexte stehen als Klartext in der Kurztext-Spalte. Merkmale
  aus dem Ausgabemodell (Ticket 58), dazu „Zuschlagsposition <Bezug>“. Der Rücklauf sucht Kopf und Spalten über ihre Beschriftung,
  eingefügte Zeilen oder Spalten stören also nicht. Grund: Ticket-Spalten, robust gegen Bieter-Änderungen.
- **D-61.4** Frage: Zellschutz und GP? Entscheidung: Blattschutz ohne Kennwort; entsperrt nur EP an Positionen ohne Zuschlag und Satz an
  Zuschlagspositionen (EP einer Zuschlagsposition gesperrt: sie hat keine Menge). Spaltenbreite und Zeilenhöhe dürfen geändert werden.
  GP als Formel `IF(F="","",ROUND(D*F,2))` (`ROUND` rundet wie N2 kaufmännisch), nur Anzeige; die Arbeitsmappe verlangt Neuberechnung
  beim Öffnen. An der Zuschlagsposition bleibt GP im Blankett leer; mit Preisen steht dort der Betrag aus dem `Summenstand`.
- **D-61.5** Frage: Prüfsumme der Struktur? Entscheidung: SHA-256 (eigene synchrone Umsetzung, A2: `crypto.subtle` ist asynchron) über
  LV-ID und, in Dokumentreihenfolge, Art, Kennung, Eltern, OZ, Index, Menge, Einheit und Zuschlagskennung der Knoten; Texte und Preise
  zählen nicht. Abweichung: Warnung `struktur-geaendert`, die Preise werden über die ID trotzdem zugeordnet. Fremde LV-ID: Fehler
  `falsches-lv`, **nichts** übernommen (auch wenn IDs zufällig passen, etwa beim Auftrags-LV mit gleicher Positionsidentität).
- **D-61.6** Frage: Zahlen aus der Zelle? Entscheidung: Zahlzellen tragen Gleitkommatext. Exponenten werden aufgelöst; mehr als 15
  geltende Ziffern werden auf 15 gebracht (`18.440999999999999` → `18.441`), weil Excel nur 15 Ziffern hält und der Rest das Abbild der
  Gleitkommazahl ist, nicht Eingabe des Bieters. Danach gilt: mehr als 3 (EP) bzw. 2 (Satz) Nachkommastellen → Befund
  `zu-viele-nachkommastellen`, nie gerundet. Textzellen über `parseDe` (Tausenderpunkt, Komma; `12.34` ist mehrdeutig und ein Befund);
  am Satz darf `%` stehen. Formelzellen zählen mit ihrem gespeicherten Ergebnis; ohne Ergebnis Befund `formel-ohne-ergebnis`.
  Wahrheits- und Fehlerwerte: `text-in-zahlzelle`. Ein Satz, den Excel als Prozentformat speichert (`0,0851` für 8,51 %), wird nicht
  umgerechnet, sondern meldet `zu-viele-nachkommastellen` (die Spalte heißt „in %“ und hat das Zahlformat `0,00`).
- **D-61.7** Frage: Was wird aus einer Zeile? Entscheidung: Satz an Zuschlagsposition → `zuschlagssatz`, EP aus der Datei, sonst
  `0.000` (D-29.1). EP an Zuschlagsposition ohne Satz → angeboten mit diesem EP ohne Satz (D-29.1; der Preisspiegel kennzeichnet das als
  `zuschlagssatz-fehlt`). Satz an einer anderen Position → Befund `satz-ohne-zuschlagsposition`, der Satz wird nicht übernommen, der EP
  gilt. Hat eine Zahlzelle einen Befund, entsteht für die Position **keine** Angebotsposition (auch nicht „nicht angeboten“), weil der
  Wille des Bieters unklar ist. Position fehlt in der Datei → Warnung `position-fehlt`, keine Angebotsposition. Doppelte ID → die erste
  Zeile zählt, Befund für die weiteren. Zeile ohne ID und ohne Preis (Notiz) → kein Befund. Ausgabe in Dokumentreihenfolge des LV.
- **D-61.8** Frage: Deterministische Bytes? Entscheidung: `datum` (`JJJJ-MM-TT`) setzt `docProps/core.xml` und die ZIP-Zeitstempel,
  Vorgabe `1980-01-01` (Beginn der DOS-Zeit im ZIP). `fflate` exakt auf 0.8.3 gepinnt (die Bytes hängen vom Deflate ab). Geschrieben
  werden Inline Strings (keine `sharedStrings.xml`); gelesen werden beide. Steuerzeichen und das Muster `_xHHHH_` werden nach
  SpreadsheetML maskiert.
- **D-61.9** Frage: Naht zum Ausgabemodell? Entscheidung: `TitelZeile`, `PositionZeile` und `HinweisZeile` tragen zusätzlich `knotenId`
  (additiv); Excel nimmt Reihenfolge und Texte aus dem Modell und die rohen Zahlen aus dem `LvZustand` (wie in 58 beschrieben).

**Lücken / Vorschläge.**

1. Glossar: „Excel-Rundlauf“ (Blankett als .xlsx an den Bieter, Rücklauf als Angebotspositionen, G-14) und „Blankett“ (LV ohne Preise
   zum Ausfüllen) stehen noch nicht in `GLOSSARY.md` (L2); nicht selbst eingetragen (außerhalb des Pakets).
2. `Befundquelle` um `'excel'` erweitern, falls die App die Befunde mit den übrigen Prüfbefunden zeigt (Vertrags-Ticket, siehe D-61.2).
3. Nicht geprüft: Öffnen in Microsoft Excel und in Numbers; Dateien mit mehreren Blättern (gelesen wird das erste Blatt laut
   `workbook.xml`); `.xls` (altes Binärformat) wird als `datei-unlesbar` gemeldet.
