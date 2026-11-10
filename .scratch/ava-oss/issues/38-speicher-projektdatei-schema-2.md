# 38: Speicher: Projektliste und Projektdatei, Migration auf Schema 2 (S2)

Status: ready-for-agent
Type: task
Welle: 3 (Phase A) · Strang: S (S2) · Paket: `packages/speicher`
Blocked by: 31, 29
Regeln: A1, A5, A8, N1, Q1, Q2, Q5, U7, C3, G-56, ADR 0002, ADR 0006, ADR 0009 (mit E-13)
Herkunft: `plan.md` §2 S2, Ticket 29 (Punkt 1: `zuschlagssatz`), Ticket 31 (Liste „Bleibt für Ticket 38“), Ticket 26 („Nicht rein mechanisch“, Punkt 2, und Folgeliste `speicher`), Ticket 24 (Folgeliste `speicher`), E-13, altes Ticket `.scratch/ava-mvp/issues/11`

## What to build

`speicher` legt das Inhaltsmodell von `vertrag` v1.1b verlustfrei ab, die Projektdatei bekommt die Schemaversion 2,
und die Übergangsfunktion aus Ticket 26 verschwindet. Dazu protokolliert `speicher` Massenbefehle verkürzt (E-13).
Vorgehen: TDD mit dem Skill `tdd`; am Ende `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün (`speicher` hat
eine Playwright-Prüfung im Harness). `okf/research/` wird nicht gelesen (C3).

Vor dem Entwurf lesen: `packages/speicher/src/migrationen.ts` (Regeln für eine neue Migration stehen oben in der Datei),
`projektdatei.ts`, `zeilen.ts`, `dekoder.ts`, `schreiben.ts`, `lesen.ts`; Ticket 26, Abschnitt „Nicht rein mechanisch“,
Punkt 2; die Comments von Ticket 31 (was dort schon geändert ist: `konflikt`, Löschen, Auftrags-LV, `schliessen`,
Langtext-Sperre).

1. **Migration 2 (A8)** am Ende von `MIGRATIONEN`, bestehende Einträge unverändert:
   - `hoch`: Tabelle `knoten` bekommt Platz für `merkmale`, `zuschlag` und `leitbeschreibung` (Vorschlag: je eine
     `TEXT`-Spalte mit kanonischem JSON, wie heute der Langtext; Dezimalwerte darin als Zeichenketten, N1); die
     Kopf-Tabellen von LV und Auftrags-LV bekommen `auftraggeber` und `vergabeinformationen` (JSON-Text, `NULL` = fehlt);
     `summe_gesamt` und `summe_gliederung` bekommen `summe_bedarf_ohne_gb` und `summe_wahl` (`TEXT`, `NULL` = nicht
     berechnet); `angebotsposition` bekommt `zuschlagssatz` (`TEXT`, `NULL` = kein Satz; Vertrag v1.2, Ticket 29, Punkt 1),
     und die Abweisung mit `unbekannt`, die Ticket 29 dafür in `schreiben.ts` gesetzt hat, entfällt. Vorhandene Zeilen werden überführt: aus den alten Spalten (`positionsart`, `pauschal`,
     `bedarf_mit_gesamtbetrag`, `bezugsposition_id`, `grundposition_id` bzw. wie sie heißen) entstehen `merkmale` und
     `zuschlag` genau so, wie `neuAusAltSpalten` es heute beim Lesen tut; danach werden die alten Spalten nicht mehr
     gelesen. Kein Datenverlust (Q5): Ein Test füllt eine Datenbank der Version 1 mit jeder Positionsart, migriert und
     vergleicht das gelesene Modell mit dem vor der Migration.
   - `datei`: hebt eine Projektdatei der Version 1 auf 2 (Positionen von der alten Form in `merkmale`/`zuschlag`; Felder,
     die es in Version 1 nicht gab, fehlen bzw. sind `null`).
   - Der Zuschlag einer Position der Version 1 ist die Altform (Satz `null`, Menge und EP bleiben; Ticket 37, R8). Die
     Migration erfindet keinen Satz.
2. **Übergang löschen.** `projektdateiInAlterForm`, `altSpalten`, `neuAusAltSpalten`, `pruefeKopfdaten`,
   `pruefeSummenfelder` und die Leseseite der alten Positionsform im Dekoder entfallen (die alte Form liest nur noch die
   `datei`-Migration). Jede Stelle mit `// v1.1b: mechanisch angepasst, Folgeticket` in `speicher` ist danach weg oder
   begründet.
3. **Projektdatei Version 2.** Neue eingefrorene Datei `packages/speicher/fixtures/projektdatei-v2.json`, selbst verfasst
   (C4), mit allem, was Version 2 neu trägt: jede Merkmalskombination (Bedarf im Stundenlohn, Wahl mit Gruppe und Variante,
   Pauschal), Zuschlag in jeder Bezugsform mit Satz und mit Teilmenge, Altform, Leitbeschreibung mit Unterbeschreibungen,
   Auftraggeber und Vergabeinformationen, beide Ausweise in Gesamt- und Gliederungssummen, ein Angebot mit
   `zuschlagssatz` an einer Zuschlagsposition, Langtext mit Absatz,
   Auszeichnung, Liste, Tabelle, Bild und Textergänzung, und im Protokoll eine `Befehlskurzfassung`. Export ist byte-gleich
   der eingefrorenen Datei; `projektdatei-v1.json` öffnet weiter (über `datei`), unverändert auf der Platte.
4. **Massenbefehle im Protokoll (E-13, ADR 0009).** Für jede Art aus `MASSENBEFEHLSARTEN` schreibt `anwenden` statt des
   Befehls eine `Befehlskurzfassung`: `kopf` = `Massenbefehlskopf` (Befehl ohne seine lange Liste), `pruefsumme` =
   SHA-256 über die UTF-8-Bytes von `kanonischesJson(befehl)` (vorhandene Funktion), hexadezimal klein, über Web Crypto
   (`crypto.subtle.digest`, in Browser und Node vorhanden, keine Abhängigkeit). `digest` ist asynchron: die Summe entsteht
   vor der Transaktion, die Transaktion bleibt synchron. Der Dekoder liest `Befehlskurzfassung` (heute kennt `BEFEHLSARTEN`
   sie nicht). Wer einen Massenbefehl ausführt, kann prüfen, dass seine Summe zum Protokoll passt (Test).
5. **Größe messen (E-13).** Projektdatei mit `gross` (5.000 Positionen) als LV, einmal angelegt: Größe der Datei und Zahl
   der Protokolleinträge im Ticket festhalten (vorher/nachher, falls vorher messbar).
6. **Projektliste.** Was die App für die Projektliste braucht (Ticket 39), liefert der Vertrag schon:
   `projekte.auflisten()` (Name und Kennung) und `leistungsverzeichnisse.auflisten(projektId)`. Prüfen und testen: die
   Liste ist nach Name sortiert (Vorschlag, de-DE-Vergleich mit `Intl.Collator`, protokollieren), gelöschte Projekte
   fehlen, ein neues Projekt erscheint sofort. Fehlt etwas für eine Projektliste mit LV-Namen, nicht im Vertrag ergänzen,
   sondern in den Comments als Lücke für ein Vertragsticket notieren (A4).
7. **Browser.** Im Playwright-Harness des Pakets: Eine Datenbank der Version 1 im OPFS wird beim Öffnen auf Version 2
   migriert; danach liefern Export und erneutes Öffnen dieselben Daten.

## Grenzen

- **Paket `packages/speicher`.** Keine Änderung an `vertrag` (A4); fehlt dort etwas, als Lücke in die Comments.
- `speicher` importiert nur `vertrag` (A3, `tools/boundaries.mjs`): keine Rechnung, kein Kern. Summen werden gespeichert,
  wie sie im ChangeSet stehen.
- Nach jeder Migration gilt: alte Dateien und alte Datenbanken öffnen weiter (A8). Eine Migration, die einmal gemergt
  ist, wird nie geändert.
- Was über Ticket 31 hinausgeht (Löschen, `konflikt`), nicht doppelt bauen; Konflikte mit 31 löst der Rebase.
- **Zu groß?** Zuerst streichen: Punkt 5 (Messung), dann Punkt 7 (Browser-Migration; der Node-Test bleibt), dann Punkt 6.

## Acceptance criteria

- [ ] Migration 2 mit `hoch` und `datei`; Test: Datenbank der Version 1 mit jeder alten Positionsart → Version 2, Modell vorher = nachher
- [ ] `projektdatei-v1.json` öffnet weiter (unverändert auf der Platte); `projektdatei-v2.json` deckt jede Neuerung aus Punkt 3 ab und ist Export-Golden (byte-gleich)
- [ ] Rundlauf: jede Position und Angebotsposition aus `projektdatei-v2.json` → speichern → laden → exportieren ist identisch; keine Abweisung mehr mit `unbekannt` für Merkmale, Zuschlag, Leitbeschreibung, Kopfdaten, Ausweise oder `zuschlagssatz`
- [ ] `projektdateiInAlterForm`, `altSpalten`, `neuAusAltSpalten`, `pruefeKopfdaten`, `pruefeSummenfelder` sind gelöscht
- [ ] Massenbefehle stehen als `Befehlskurzfassung` mit SHA-256 im Protokoll; alle anderen Befehle vollständig; genau ein Eintrag je Befehl; Test für jede der drei Massenbefehlsarten
- [ ] Dekoder liest `Befehlskurzfassung` und weist eine ungültige Prüfsumme der Form nach (nicht hexadezimal, falsche Länge) mit `datei-ungueltig` ab
- [ ] Projektliste sortiert, Test
- [ ] Playwright im Harness: OPFS-Datenbank Version 1 wird auf 2 migriert
- [ ] Größe der Projektdatei mit `gross` im Ticket festgehalten
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e` grün

## Nicht-Ziele

Undo/Redo, LV-Stände, Papierkorb und die Protokolleinträge dafür (43); Oberfläche der Projektliste (39); Datensicherung,
Export-Erinnerung, Sicherungsordner (S4); neue Repository-Schnittstellen im Vertrag.

## Comments
