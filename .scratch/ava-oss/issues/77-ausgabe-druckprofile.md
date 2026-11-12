# 77: O3: Druckprofile und Spike „getaggtes PDF“

Status: resolved
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
   lebt in `ausgabe`, nicht im Vertrag (D-36 (7)): gespeichert wird ein Profil von der App als Einstellung des Nutzers.
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

- [x] je Profileinstellung ein Test über den Seitentext; Standardprofile getestet; JSON-Rundweg mit Befunden
- [x] Spike-Ergebnis in ADR 0012 und im Ticket (Empfehlung für v1.x)
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments

### D-77.1 Deckblatt ist der Kopfblock
Question: Ist das „Deckblatt“ eine eigene Seite? Decision: Nein, der Kopfblock am Anfang des Drucks (wie in Ticket 58); „aus“ lässt Projekt, Bauherr, Auftraggeber, Vergabeinformationen weg, der LV-Name bleibt als Überschrift. Reason: Standardwerte bleiben das heutige Verhalten; eine eigene Seite braucht Umbruchlogik ohne Nutzen für die Demo. Reversible: yes.

### D-77.2 Langtext „nur Kurztext“ und Kürzung
Decision: „kein“ entfernt den Langtext von Positionen und Unterbeschreibungen, Hinweistexte bleiben (eigene Knoten). Gekürzt wird auf n Zeilen (Absatz, Listenpunkt, Tabellenzeile, jeder Zeilenumbruch im Absatz); der Schnitt ist durch den Absatz „[…]“ sichtbar (Q5); passt alles, bleibt der Text unverändert. Das ist eine logische, keine gesetzte Zeile.

### D-77.3 Kopf-/Fußzeile
Decision: `kopfzeile`/`fusszeile` ersetzen die Vorgabe vollständig, Platzhalter `{seite}`, `{seiten}`, `{datum}`, `{lv}` (ein Durchgang, unbekannte bleiben, fehlendes Datum leer). Ohne Angabe bleibt die Vorgabe („Stand“, „Seite x von y“). Seitenrand „eng“ = 28 pt links/rechts, 56 oben, 40 unten; „normal“ wie bisher.

### D-77.4 Profil-JSON
Decision: `schemaversion: 1` im Objekt; fehlende Felder = Standardwert ohne Befund; unbekanntes Feld, ungültiger Wert (Feld behält Standardwert), fehlende/neuere Version sind Befunde; kein JSON-Objekt ergibt `profil: null` und Befund `kein-profil`. Nichts wirft. Standardprofile: die drei genannten (Kostenanschlag mit engem Rand).

### D-77.5 Zusatzpunkt des Orchestrators (Ticket 75, Wellen-Review 4 P1)
`FxLv.sollwerte.ausweise?` in `testhilfen.ts` ergänzt; `modell.test.ts` (Gesamt und je Titel) und `lv-druck.test.ts` prüfen Bedarfs- und Wahlsumme gegen `sollwerte.ausweise` der Fixture statt gegen `zustand.summen.gesamt`; ohne `ausweise` (winzig, zuschlag) darf keine Bedarfs-/Wahlsumme gedruckt werden.

## Answer

Suite: lint, typecheck grün; `pnpm test` 2050 grün, einzig `packages/kern/src/lv-pruefung-fixtures.test.ts` (lvPruefen(gross) Median 111 ms unter Parallellast, Budget 50 ms) fiel; allein wiederholt: grün. Budget nicht angefasst.

Druckprofile in `packages/ausgabe`: Typ, drei Standardprofile, JSON mit Befunden, neue Optionen. Je Einstellung ein Test über den Seitentext (`src/druckprofil.test.ts`), vorhandene Tests unverändert grün.

Öffentliche API (`index.ts`):
- `Druckprofil`, `neuesDruckprofil(name)`, `STANDARD_DRUCKPROFILE` (Ausschreibung ohne Preise; Kostenanschlag nur Kurztext; Auftrags-LV).
- `profilAlsOptionen(profil, { datum?, projekt? }): PdfOptionen` → `erzeugePdf` / `baueAusgabemodell`.
- `druckprofilAlsJson(profil)`, `druckprofilAusJson(text): { profil | null, befunde }`, `DRUCKPROFIL_SCHEMAVERSION`.
- Neue Optionen (Vorgabe = bisheriges Verhalten): `langtext` (`voll | kein | zeilen`), `titelsummen`, `schlussblock`, `deckblatt`; nur PDF: `seitenrand`, `kopfzeile`, `fusszeile`; dazu `ersetzePlatzhalter`, `kuerzeBloecke`.

Spike getaggtes PDF (ADR 0012, Abschnitt „Spike: getaggtes PDF“; Code `messung/spike-tags.spec.ts`, `pnpm --dir packages/ausgabe messen`): pdfkit 0.20.2 (MIT, schon unter pdfmake, keine neue Abhängigkeit) schreibt mit `tagged: true` und `struct()` einen echten Strukturbaum; `gross` als Gerüst etwa 1,7 s, 6,6 MB (pdfmake 1,4 MB), Bündel unverändert 68 KiB gzip; im Browser nicht gemessen. Empfehlung v1.x: pdfmake bleibt; bei Tag-Pflicht ein zweiter Renderer direkt auf pdfkit (eigener Umbruch nötig), eigenes Ticket. Nicht geprüft: pdf-lib, jsPDF, @react-pdf.

Merged: 843bc745116bf8af561f513f0d56a3f2d6bacfc9 in integration/welle-5
