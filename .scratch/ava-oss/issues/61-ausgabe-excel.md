# 61: O2: Excel-Export und -Import (LV für Bieter, Rücklauf als Angebot)

Status: ready-for-agent
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

- [ ] Golden-Test der erzeugten Datei (Bytes oder kanonisierte XML) für `winzig`
- [ ] Rundweg mit `typisch` und allen drei Bietern; Befund-Tests für jeden Fehlerfall
- [ ] Datei öffnet sich in LibreOffice (headless `soffice --convert-to csv`, falls im Container verfügbar; sonst im Ticket
      vermerken) – sonst mindestens XML-Wohlgeformtheit und Struktur gegen die OOXML-Grundform geprüft
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nicht-Ziele

Preisspiegel als Excel, Import beliebiger fremder Excel-LVs, Formatvorlagen, Anbindung in der App (Ticket 66).

## Comments
