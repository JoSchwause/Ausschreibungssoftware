# 94: Aufmaßblatt mit 5.000 Zeilen: Einzeländerung und Undo unter 100 ms

Status: claimed
Type: task
Welle: 6 · Strang: S, A2 · Paket: `packages/speicher` (Ausnahme von P2: die Messung in `apps/web/src/abrechnung/leistung.test.ts`
darf nachgezogen werden, dort schreibt in Stufe 1 niemand)
Blocked by: –
Modell: opus
Regeln: Q4, A6, D-29, D-36 (8), D-45, D-47
Herkunft: Wellen-Review 5, P4; Messung in Ticket 87 (D-45): Undo 82–144 ms je Schritt, ein Befehl 84–93 ms, fast alles im
Speicherkern (ganzes Blatt ≈ 1 MiB JSON lesen, mit `vorher` vergleichen, neu schreiben)

## What to build

Zuerst die kleine Lösung: `speicher` vergleicht `vorher` über den gespeicherten kanonischen Text (Hash) statt über das
geparste Blatt und schreibt nur bei Änderung. Reicht das nicht für < 100 ms im dauerhaften Profil (D-29), dann `vertrag` v1.5:
`AufmassChangeSet` mit `Aenderungen<Aufmassposition>` statt ganzem Blatt (eigenes Vertragsticket, Mensch prüft, P9).

Vorgehen:

1. **Messen, bevor du änderst.** Lies `issues/87-web-aufmass-sollist.md` (Abschnitt „Messung D-45“) und
   `apps/web/src/abrechnung/leistung.test.ts`. Baue in `speicher` einen eigenen Budgettest (Node, In-Memory-SQLite wie die
   übrigen Tests des Pakets) für ein Aufmaßblatt mit 5.000 Zeilen am Auftrags-LV aus `fixtures/gross.json`: ein
   `AufmasspositionSetzen` anwenden, dann dessen Umkehrung (Undo) und erneut (Redo); Median über mindestens 5 Läufe. Halte
   die Ausgangswerte im Ticket fest.
2. **Kleine Lösung.** Wo heute `vorher` des ChangeSets gegen das gespeicherte Blatt geparst und verglichen wird, den
   gespeicherten kanonischen Text (oder einen Hash davon, mitgespeichert) gegen die kanonische Form von `vorher` vergleichen;
   geschrieben wird nur, was sich ändert. Prüfe, wo sonst noch das ganze Blatt gelesen, geparst oder serialisiert wird
   (Konfliktprüfungen der Rechnung, Protokolleintrag, Worker-Grenze) und ob das nötig ist. Die Konfliktregeln aus
   `vertrag` (`Speicher.anwenden`: Freigabe-Invariante, Blatt in einer Rechnung, Nummern) bleiben unverändert und getestet.
3. **Bewerten.** Budget: Einzeländerung und Undo je < 100 ms (Median) im Speicherkern unter Node bei 5.000 Zeilen, und die
   App-Messung (`leistung.test.ts`) nachziehen. Reicht es: fertig. Reicht es nicht: **nicht** selbst `vertrag` ändern,
   sondern mit Messwerten an den Orchestrator melden (Stufe 3), der dann über `Aenderungen<Aufmassposition>` in v1.5
   entscheidet.

## Grenzen

- Keine Änderung an `vertrag`, `kern`, `abrechnung` oder anderen Ordnern der App außer der Messdatei oben.
- Kein Budget lockern, kein Test überspringen. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Messung vor/nach im Ticket; Budgettest für 5.000 Zeilen in `speicher` (Q4), Konfliktregeln unverändert grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Comments
