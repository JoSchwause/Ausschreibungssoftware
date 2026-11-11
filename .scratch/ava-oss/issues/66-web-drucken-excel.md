# 66: O1/O2: Drucken und Excel-Rundlauf in der App

Status: resolved
Type: task
Welle: 4 · Strang: O1/O2 · Paket: `apps/web` (Ordner `src/ausgabe/`; Einhängestellen in `lv/LvSeite.tsx` und der Angebotsliste, D-20)
Blocked by: 58 (PDF), 61 (Excel)
Regeln: A5, U5, U7, Q5, G-14, D-23, D-25
Herkunft: `plan.md` §2 O1, O2, V5

## What to build

1. **Drucken:** Knopf „Als PDF“ auf der LV-Seite mit Auswahl „mit Preisen“/„ohne Preise“ und Datum (heute, vorbelegt; die
   Uhr liest nur die App). `erzeugePdf` aus `ausgabe` läuft in einem Web Worker (der Hauptthread bleibt bedienbar; Ticket 28
   maß 2,5–3 s bei 5.000 Zeilen); Fortschritt/Abbrechen; Ergebnis als Download `<LV-Name>.pdf`. `ausgabe` per `import()`
   nachladen (Bündelgröße).
2. **Excel für Bieter:** Knopf „Excel für Bieter“ → `lvAlsExcel` → Download `<LV-Name>-Bieter.xlsx`.
3. **Excel-Rücklauf:** In der Angebotsliste (Ticket 49) neben „X84 einlesen“: „Excel einlesen“ → `excelRuecklaufLesen` →
   Vorschau mit Bietername und Befunden wie beim X84-Import (Komponenten von dort wiederverwenden) → „Übernehmen“ legt Bieter
   (falls neu) und Angebot an, ein Undo-Schritt.

## Grenzen

- Nur `apps/web/src/ausgabe/` und markierte Einhängestellen; Wiederverwendung aus `src/gaeb/` nur lesend (Import), keine
  Änderung dort außer einem markierten Export einer Komponente, falls nötig.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] E2E: PDF-Download von `typisch` (Datei > 0 Bytes, beginnt mit `%PDF`, enthält Netto-Summe per Textauszug); Excel-
      Download und Rücklauf einer per Test erzeugten Datei → Angebot in der Liste mit Bietersumme gleich dem Sollwert
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Druckprofile (O3), Preisspiegel-Druck.

## Comments

### Aus Tickets 58 und 61 (Orchestrator)
- `baueAusgabemodell(zustand, { mitPreisen, datum, projekt })`: `LvZustand` trägt weder Projektname noch Bauherr; die App übergibt `projekt`. Alle vier Schriftdateien (Noto Sans normal/fett/kursiv/fett-kursiv) laden.
- `lvAlsExcel` liefert `{ bytes, befunde }`; Befunde des Exports (zu lange Texte, > 15 Stellen) vor dem Download zeigen. `ExcelBefund` lebt in `ausgabe` (nicht `Befundquelle` im Vertrag): die App zeigt sie in der Import-/Export-Vorschau selbst, nicht im Prüf-Panel.
- Eine Zeile mit Befund in einer Zahlzelle ergibt keine Angebotsposition (weder angeboten noch „nicht angeboten“); eine Datei für ein anderes LV übernimmt nichts.
- „Excel-Rundlauf“ und „Blankett“ ins `GLOSSARY.md` (L2), falls die Oberfläche die Begriffe zeigt.

### D-66.1 Fortschritt ohne Prozentanzeige
Frage: `erzeugePdf` meldet keinen Fortschritt; was zeigt die App? Entscheidung: Schritte „Schriften werden geladen“ und „Seiten werden gesetzt“ aus dem Worker (Status-Region), dazu „Abbrechen“, das den Worker sofort beendet (kein Download, nichts bleibt zurück). Grund: Das Paket bleibt unverändert (P2); Prozente gäbe es nur mit einem Rückruf im Paket.

### D-66.2 Datum als TT.MM.JJJJ-Textfeld
Frage: Eingabefeld des Datums? `Eingabefeld` aus `ui-basis` kennt nur `type="text"`. Entscheidung: Textfeld in deutscher Schreibweise, mit „heute“ aus `u.uhr()` (Ortszeit) vorbelegt; ungültig → Hinweis und „PDF erzeugen“ gesperrt (nur diese Aktion, U5 gilt für Fachdaten). Intern `JJJJ-MM-TT`. Grund: N4 (de-DE nur am Rand), keine Änderung an `ui-basis`.

### D-66.3 Bietername aus dem Dateinamen, Übernehmbarkeit
Frage: Die Excel-Datei trägt keinen Bieternamen. Entscheidung: Vorschlag ist der Dateiname ohne `.xlsx`, in der Vorschau änderbar; leer → Hinweis, kein Anlegen. Übernehmbar ist nur eine Datei mit mindestens einer angebotenen Position (leeres Blankett, falsches LV, unlesbare Datei: Befunde sichtbar, kein „Übernehmen“). Bieter (falls neu) und Angebot gehen über `angebotAnlegenPlan` und `befehlswegFuer(u).angebotAnlegen` aus Ticket 49: ein Undo-Schritt. Der Nachlass bleibt leer (steht nicht in der Datei).

### D-66.4 Ablageort und Nachladen
`ausgabe` kommt nur per `import()` (Excel im Hauptthread beim Öffnen des Dialogs bzw. Lesen der Datei; PDF im Worker). Das Hauptbündel enthält kein pdfmake; Worker und Nachlade-Chunk bündeln `ausgabe` je einmal (zwei Chunks `src-*.js`, je rund 0,8 MB). Die vier Noto-Sans-Dateien werden im Worker über `?url` aus `packages/ausgabe/schriften/` geladen und vom Service Worker vorgehalten (offen nutzbar). Hakenstellen: `lv/LvSeite.tsx` (`<LvDrucken>`) und `gaeb/Angebote.tsx` (`<ExcelEinlesen>`), je mit `// Ticket 66`. `ExcelBefund` ist kein `Pruefbefund`, daher eigene `ExcelBefunde`-Liste mit den Klassen aus `gaeb.css`; `gaeb/` sonst unverändert.

### D-66.5 Glossar
„Blankett“ und „Excel-Rundlauf“ sind im `GLOSSARY.md` (L2), weil die Oberfläche sie zeigt.

## Answer

Gemergt auf `integration/welle-4` mit Merge-Commit e35c350; Review-Befunde behoben in `fix/welle-4-review` (847aa43, siehe `../review-welle-4.md`).
