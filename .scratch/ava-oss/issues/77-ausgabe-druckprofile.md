# 77: O3: Druckprofile und Spike „getaggtes PDF“

Status: ready-for-agent
Type: task
Welle: 5 · Strang: O3 · Paket: `packages/ausgabe`
Blocked by: –
Regeln: A2, A3, N4, U4, U8, C5, Q1, ADR 0012, D-23
Herkunft: `plan.md` §2 O3 („Druckprofile“), D-23 („Vor O3 ein Spike mit einer Bibliothek, die Struktur-Tags schreibt“),
`welle-4-bericht.md` (Eintritt Welle 5, Punkt 5)

## What to build

1. **Druckprofil.** Ein benanntes Bündel von Druckeinstellungen für den LV-Druck (heute nur `mitPreisen`, `datum`): mit oder
   ohne Preise (Blankett), Langtext vollständig, nur Kurztext oder Langtext gekürzt auf die ersten n Zeilen, Titelsummen an
   oder aus, Schlussblock (Bedarfs- und Wahlsummen getrennt, F4) an oder aus, Deckblatt mit Projekt, Bauherr, Auftraggeber
   und LV-Name an oder aus, Kopf- und Fußzeilentext frei (mit Platzhaltern für Seitenzahl und Datum), Seitenrand eng/normal.
   Typ, Standardprofile (mindestens „Ausschreibung mit Langtext ohne Preise“, „Kostenanschlag mit Preisen, nur Kurztext“,
   „Auftrags-LV mit Preisen“) und eine reine Funktion, die ein Profil auf `ModellOptionen`/`PdfOptionen` abbildet. Der Typ
   lebt in `ausgabe`, nicht im Vertrag (D-34): gespeichert wird ein Profil von der App als Einstellung des Nutzers.
2. **Profil lesen/schreiben als JSON** (reine Funktionen, Schemaversion im Objekt, unbekannte Felder Befund, fehlende
   Felder Standardwert), damit die App Profile ablegen und als Datei weitergeben kann.
3. **Spike getaggtes PDF (Zeitbox ≤ 1 h).** Prüfen, ob eine Bibliothek mit AGPL-verträglicher Lizenz einen echten
   Strukturbaum (Tags für Überschrift, Tabelle, Absatz) im Browser schreibt; Messung wie in Ticket 28 (Strukturbaum
   vorhanden? Bündelgröße? Laufzeit bei `gross`?). Ergebnis als Abschnitt in ADR 0012 (Status bleibt `proposed`) und im
   Ticket. Kein Wechsel des Renderers in diesem Ticket; der Spike-Code liegt nur in einem Test oder unter `werkzeuge/`.

## Grenzen

- Kein Vertragstyp, keine Speicherung, keine Oberfläche (die App folgt in einem eigenen Ticket).
- Golden-Tests über den Text der Seiten wie in Ticket 58 (`pdftext.ts`), nicht über Bytes.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] je Profileinstellung ein Test über den Seitentext; Standardprofile getestet; JSON-Rundweg mit Befunden
- [ ] Spike-Ergebnis in ADR 0012 und im Ticket (Empfehlung für v1.x)
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments
