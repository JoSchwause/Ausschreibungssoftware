# 52: Speicher: Einzeländerung bei 5.000 Positionen unter 100 ms bis zur Summenzeile

Status: claimed
Type: task
Welle: 4 · Strang: S · Paket: `packages/speicher` (dazu Messung in `apps/web/e2e/leistung.spec.ts`)
Blocked by: –
Regeln: Q4, G-33, A3, A5, Q5
Herkunft: Ticket 39 (Comments, Punkt 5 nicht hart erfüllt), Ticket 47 und 48 (Comments, Messwerte), Ticket 10 (Einzelbefehl Median 47 ms, „nicht optimiert“)

## What to build

Q4 verlangt: Das LV-Grid bleibt bei 5.000 Zeilen flüssig; eine Einzeländerung erreicht die Summenzeile in unter 100 ms.
Die App-Schicht hält das (Median 11–20 ms ohne Speicher), der Gesamtweg nicht sicher. Messwerte aus den Comments von 39,
47 und 48 (`gross`, Mengenänderung Enter → Summenzeile, Maschine unter Last):

- Gesamt Median 78 / 82 / 86 ms in drei Läufen, unter starker Last 101 / 133 ms (Ticket 39); 77 / 94 / 67 ms (Ticket 47)
- davon `speicher.anwenden` (Worker, OPFS) Median 68–111 ms (Ticket 39); Undo: 54 ms von 69 ms gesamt (Ticket 48)

Der Hebel liegt in `speicher`: Prüfsumme (Web Crypto, asynchron, Ticket 38), Protokolleintrag (~410 Bytes je Einzeländerung),
Baumprüfung nach dem Schreiben (`pruefeBaum`), Transaktion und Antwort über den Worker. Zuerst messen, wo die Zeit steht
(Phasen einzeln), dann die größte Stelle kürzen, ohne eine Prüfung zu schwächen (Q5) oder die Protokollform zu ändern (ADR 0009).

## Grenzen

- Nur `speicher` und Messung; Vertrag unverändert. Die Reihenfolge der Aufrufe (Kette im Kern und im Worker-Host) bleibt.
- Die harte Schranke in `e2e/leistung.spec.ts` wird auf die Gesamtzeit (< 100 ms Median) angehoben, sobald der Messwert
  auch unter Last trägt; bis dahin Messwert im Ticket nennen.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Phasenmessung von `anwenden` (Prüfsumme, Prüfungen, Transaktion, Worker-Antwort) im Ticket
- [ ] `MengeAendern` bei `gross` (5.000 Positionen) bis zur Summenzeile: Median < 100 ms gesamt, in drei Läufen; Messwert im Ticket
- [ ] Alle bisherigen `speicher`-Tests grün, Prüfungen unverändert (Q5), Protokoll unverändert
- [ ] `e2e/leistung.spec.ts` prüft die Gesamtzeit hart (< 100 ms Median, grobe Schranke nur für Ausreißer)
- [ ] `pnpm lint && pnpm typecheck && pnpm test` und `pnpm --filter @tethys/web e2e` grün

## Nicht-Ziele

Änderung der Protokollform, Weglassen der Prüfsumme, Umbau auf eine andere Speicherschicht.

## Comments

### Umsetzer (Branch `welle-4/52-speicher-leistung`)

Nur `packages/speicher` und `apps/web/e2e/leistung.spec.ts`. Protokollform, Schema, Projektdatei und `vertrag`
unverändert; die Kette im Kern und im Worker-Host unverändert.

**Messwerkzeug.** `harness/mess-worker.ts`: derselbe Worker wie `src/worker.ts`, misst jede SQL-Anweisung und jeden
Aufruf des OPFS-Zugriffshandles (`write`, `read`, `flush`, …) und hängt die Zahlen an die Antwort. Der E2E
„Einzeländerung in Phasen“ (`e2e/speicher.spec.ts`) wendet 26 `MengeAendern`-ChangeSets des Kerns (Position, ihre
Gliederungen, Gesamtsumme) auf `gross` an, 5 zum Aufwärmen, und gibt die Mediane je Phase aus. Phasen: Transaktion
(BEGIN, COMMIT), Baumprüfung, Vorherstand (Lesen und Vergleich), Schreiben (INSERT/UPDATE/DELETE), JavaScript im Worker
(Vergleiche, Protokollform; eine Einzeländerung ist kein Massenbefehl, die Prüfsumme entfällt), Worker-Antwort
(Nachrichten hin und zurück). Maschine: 4 Kerne, Last 8–22 durch parallele Agenten.

**Phasen vorher** (Rückroll-Journal, flüchtiger Testkontext, Median ms von 21; drei Läufe):

| Lauf | gesamt | Transaktion | Schreiben | Baumprüfung | Vorherstand | JS | Antwort | Zugriffe `write` |
|---|---|---|---|---|---|---|---|---|
| Last 2 | 72,5 | 20,2 | 39,9 | 6,4 | 0,4 | 0,3 | 0,3 | – |
| Last ~10 | 71,3 | 19,3 | 40,7 | 6,6 | 0,4 | 0,3 | 0,4 | 50 (55 ms) |
| Last 18 | 102,1 | 24,8 | 72,2 | 6,6 | 0,4 | 0,3 | 0,3 | 50 (89 ms) |

Befund: Die Zeit steht fast ganz in den Schreibzugriffen aufs OPFS, nicht in Prüfsumme, Prüfungen oder Worker-Antwort.
Das Rückroll-Journal schreibt je geänderter Seite drei Teile ins Journal (während der Anweisungen: `INSERT INTO protokoll`
allein 13 ms, `UPDATE knoten` 10 ms) und die Seiten beim COMMIT noch einmal; `flush` kostet nichts. Im flüchtigen Kontext
von Playwright (wie Inkognito) liegt das OPFS im Browser-Prozess, jeder `write` ist ein Aufruf über Prozessgrenzen
(1–2 ms). In einem dauerhaften Profil kostet derselbe `write` rund 0,03 ms. Zweitgrößte Phase, und im dauerhaften
Profil die größte: die Baumprüfung (zwei Abfragen, die erste liest dafür jede Knotenzeile).

**Was gekürzt wurde** (Prüfungen gleich, Meldungen gleich):

1. OPFS-Datenbank im WAL mit exklusiver Sperre (`backends.ts`, D-52.1): 50 → 23 Schreibzugriffe.
2. Baumprüfung in einem Durchlauf über den Index `knoten_eltern` (`schreiben.ts`): Waisen und Lücken in einer gruppierten
   Abfrage; nur bei einem Befund laufen die bisherigen Abfragen für die Meldung (Waise vor Lücke, erster Elternknoten
   nach Kennung). Node: 7,7 → 2,7 ms. Neue Tests `baumpruefung.test.ts` (vor der Änderung gegen den alten Code grün):
   Waise, entfernte Gliederung mit Kindern, Lücke, doppelte Reihenfolge, Beginn nicht bei 0, Waise und Lücke zugleich,
   zwei Lücken, gültiges Verschieben.
3. Geänderte Knoten: nur die Spalten, die sich von `vorher` unterscheiden (`vorher` ist gegen den gespeicherten Stand
   geprüft). Bei gleicher Lage bleibt der Index `knoten_eltern` unberührt: 23 → 21 Schreibzugriffe. Gleiche
   Spaltenmengen teilen eine vorbereitete Anweisung (Umnummerieren: eine).

**Phasen nachher** (WAL, Median ms von 21):

| Kontext, Last | gesamt | Transaktion | Baumprüfung | Vorherstand | Schreiben | JS | Antwort | `write` |
|---|---|---|---|---|---|---|---|---|
| flüchtig, Last 19 (nur 1.) | 48,6 | 35,6 | 6,7 | 0,4 | 0,8 | 0,3 | 0,3 | 23 (35 ms) |
| dauerhaftes Profil, Last 19 (nur 1.) | 10,1 | 1,8 | 6,5 | 0,3 | 0,6 | 0,3 | 0,3 | 23 (0,7 ms) |
| flüchtig, Last 18 (1.–3.) | 30,4 | 23,5 | 2,8 | 0,4 | 0,6 | 0,3 | 0,3 | 21 (23 ms) |
| dauerhaftes Profil, Last 18 (1.–3.) | 8,2 | 3,2 | 2,7 | 0,3 | 0,6 | 0,2 | 0,3 | 21 (0,6 ms) |

Großer Befehl, flüchtiger Kontext, unter Last 18–20: Speichern `gross` 2.249 ms (vorher 2.203 ms im selben Lastbereich),
Import `gross` 3.043 ms (vorher 2.550 ms): Das WAL schreibt einen großen Befehl zweimal (Rahmen, dann Checkpoint). Laden
unverändert (Median 293 ms beide). Ziel „Laden < 2 s“ hält.

**Gesamtweg** (`e2e/leistung.spec.ts`, `gross`, Mengenänderung Enter → Summenzeile, 9 Messungen nach 2 zum Aufwärmen,
Last 15–22), drei Läufe:

| Lauf | dauerhaftes Profil: Mengenänderung | dauerhaftes Profil: Undo | flüchtiger Kontext: Mengenänderung |
|---|---|---|---|
| 1 | Median 61 (Speicher 33, App 30), max 225 | Median 29 (Speicher 8, App 19), max 154 | Median 75 (Speicher 54, App 25) |
| 2 | Median 61 (Speicher 23, App 36), max 124 | Median 39 (Speicher 16, App 24), max 237 | Median 109 (Speicher 76, App 28) |
| 3 | Median 57 (Speicher 21, App 26), max 79 | Median 34 (Speicher 15, App 18), max 82 | Median 67 (Speicher 43, App 25) |

Vorher (Ticket 39/47/48, flüchtiger Kontext): 78/82/86, unter starker Last 101/133 ms; Undo 69 ms.

**Harte Prüfung (D-52.2).** Mengenänderung und Undo laufen in einem dauerhaften Browser-Profil
(`chromium.launchPersistentContext`, leeres Verzeichnis je Test) und prüfen hart: Gesamtzeit Median < 100 ms, App-Schicht
Median < 100 ms, jede einzelne Messung < 400 ms (Ausreißer). Der flüchtige Kontext wird weiter gemessen, hart nur die
App-Schicht, die Gesamtzeit grob (< 400 ms Median). Ehrlich: Im flüchtigen Kontext hält < 100 ms unter Last nicht sicher
(Median 67–109 ms); der Speicheranteil dort sind fast nur Aufrufe über Prozessgrenzen, die es beim Nutzer nicht gibt.

### Entscheidungen

- D-52.1 Schreibmodus der OPFS-Datenbank? → `PRAGMA locking_mode = EXCLUSIVE`, `journal_mode = WAL`,
  `journal_size_limit` 4 MiB (so groß wie der automatische Checkpoint bei 1.000 Seiten), gesetzt in `oeffneOpfs` vor
  jedem anderen Zugriff; Node (In-Memory) unverändert. → Größte Phase sind die Schreibzugriffe; WAL halbiert sie.
  Haltbarkeit gleich (`synchronous` bleibt FULL, das WAL wird bei jedem COMMIT auf den Datenträger gebracht, nach
  einem Absturz beim Öffnen eingespielt; E2E „ohne sauberes Schließen“ grün). Der VFS `opfs-sahpool` hat keinen
  gemeinsamen Speicher, daher die exklusive Sperre (die Datenbank gehört ohnehin einer Verbindung). Schema, Protokoll
  und Projektdatei unberührt; eine alte Datenbank wird beim Öffnen umgestellt. Lehnt SQLite das WAL ab, bleibt das
  Rückroll-Journal (der E2E prüft den Modus). Preis: Große Befehle werden doppelt geschrieben (Import `gross` etwa
  +20 %), alle rund 80 Einzeländerungen kommt ein Checkpoint (einzelner langsamer Befehl).
- D-52.2 Wo wird die Gesamtzeit hart geprüft? → Im dauerhaften Browser-Profil. → Das ist der Weg des Nutzers (installierte
  App, normales Fenster); Playwrights flüchtiger Kontext legt das OPFS in den Browser-Prozess und macht jeden
  Schreibzugriff zu einem Aufruf über Prozessgrenzen (gemessen: 0,03 ms gegen 1–2 ms je `write`). Der flüchtige Kontext
  bleibt gemessen und grob begrenzt.
- D-52.3 Baumprüfung schneller, aber nicht schwächer? → Weiter immer der ganze Baum des Aggregats, keine Ausnahme für
  „Lage unverändert“. Nur die Abfrage ist eine andere; Befund genau dann, wenn eine der alten Abfragen etwas findet,
  Meldung aus den alten Abfragen.
- D-52.4 Spaltenweises UPDATE? → Ja, nur Spalten, die sich zwischen `vorher` und `nachher` unterscheiden. → Die Zeile
  ist danach dieselbe; SQLite schreibt einen Index nur neu, wenn seine Spalten im SET stehen.

### Nicht gekürzt (Folgefragen)

- Je Einzeländerung schreibt das WAL rund 10 Seiten; vier davon gehören dem Protokoll (Tabelle, zwei Indizes,
  `sqlite_sequence` wegen `AUTOINCREMENT`). Weniger ginge nur über das Schema (eigenes Ticket, Protokollform bleibt).
- Im flüchtigen Kontext bleibt der Speicher unter Last bei 20–75 ms; härter prüfen ließe er sich nur mit weniger
  Schreibzugriffen (siehe oben).

### Nachtrag: Datenverlust beim Neuladen gefunden und behoben (D-52.5)

Die App-E2E fielen mit WAL etwa einmal in 20 Läufen an einem Neuladen direkt nach dem Schreiben: Das LV (in
`projekt.spec.ts` das importierte Projekt) war danach **nicht mehr da** (`nicht-gefunden`); mit Rückroll-Journal 0 von
30. Ursache im VFS `opfs-sahpool`: Scheitert das Einrichten (`gesperrt`, weil der Worker der vorigen Seite die Dateien
noch hält), ruft er `removeVfs()` und löscht sein ganzes Verzeichnis rekursiv. Solange der alte Worker alle Dateien hält,
scheitert das Löschen („removeVfs() failed with no recovery strategy“ in der Konsole); gibt er sie in genau diesem
Moment frei, sind Datenbank oder WAL weg. Mit WAL dauert das Schließen beim `pagehide` länger (Checkpoint), das Fenster
wird größer; die Lücke bestand aber auch vorher. Im Prüfstand nachgestellt (25 Runden schreiben, `schliessen` anstoßen,
neu laden: unter hoher Last 1 von 3 Läufen mit leerem Projekt).

- D-52.5 → `installOpfsSAHPoolVfs({ preserveOnInitFailure: true })`: Ein gescheitertes Einrichten gibt nur die Handles
  frei und lässt die Dateien liegen. → Q5; die App öffnet bei `gesperrt` ohnehin mit einem neuen Worker erneut (E-14).
  Danach App-E2E (die drei betroffenen Tests je 15 Mal) 45 von 45 grün. Neuer Browser-Test „Neuladen während des
  Schließens“ (25 Runden) als Wache; er trifft das Zeitfenster nicht zuverlässig (auf ruhiger Maschine auch ohne die
  Option grün).
