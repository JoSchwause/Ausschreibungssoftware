# 57: Speicher v1.3: Migration 4 (Mengenansatz, Auftragnehmer, EPA-Bezeichnungen), LV-Übersicht

Status: claimed
Type: task
Welle: 4 · Strang: S · Paket: `packages/speicher`
Blocked by: 53 (`vertrag` v1.3), 52 (gleiches Paket)
Regeln: A8, Q5, U7, ADR 0009, G-56, D-22
Herkunft: Ticket 53 (Punkte 1, 2, 6, 9)

## What to build

`vertrag` v1.3 führt optionale Felder ein, die `speicher` heute nicht hält. Ohne dieses Ticket gingen sie beim Speichern
still verloren (Q5). Deshalb:

1. **Migration 4** (A8, nummeriert, getestet, vorwärts): Spalten bzw. Tabellen für `Positionsdaten.mengenansatz` (JSON),
   die EPA-Bezeichnungen am LV (Punkt 2) und den Auftragnehmer (Punkt 6, am LV bzw. Auftrags-LV, wie 53 es festlegt).
   Alte Datenbanken und Projektdateien öffnen sich weiter (Datei-Migration für die Projektdatei-Version, wie Tickets 38/43);
   eingefrorene Projektdateien bleiben byte-gleich und lesbar.
2. Schreiben, Lesen, Umkehren (Undo) und LV-Stände tragen die neuen Felder verlustfrei; Projektdatei-Export und -Import
   ebenso (Rundweg-Test).
3. **`LvRepository.auflisten` → `LvUebersicht`** (Punkt 1): falls Ticket 53 es nur mechanisch gelöst hat, hier sauber: eine
   Abfrage ohne Knoten, nach Name mit `Intl.Collator('de-DE')`. Leistung: Projekt mit `gross` listet in < 20 ms.
4. Gibt es noch eine Sperre („Feld X nicht speicherbar“) für ein Feld aus v1.3, wird sie aufgehoben.

## Grenzen

- Nur `packages/speicher`. Protokollform unverändert (ADR 0009). Messwerte aus Ticket 52 nicht verschlechtern
  (`MengeAendern` bei `gross` bis zur Summenzeile).
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Migrationstest 3 → 4 auf Datenbank und Projektdatei; eingefrorene Dateien v1–v3 öffnen sich
- [x] Rundweg (Speichern → Laden, Export → Import, Undo) mit Mengenansatz, EPA-Bezeichnungen und Auftragnehmer
- [x] `auflisten` liefert `LvUebersicht` sortiert
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und die E2E von `speicher` und
      `@tethys/web` grün

## Nicht-Ziele

Neue Befehle, Oberfläche, GAEB.

## Comments

### Aus Ticket 53 (Review, D-27)
- `Summenaenderung.vorher` ist Pflicht: Prüfung in `speicher` überall, nicht nur beim Löschen.
- `pruefeV13` (vorläufige Abweisung der neuen Felder) entfernen, sobald sie gespeichert werden.
- Projektdatei-Dekoder: neue Schemaversion mit den Feldern; Papierkorb- und LV-Stand-Rundweg mit Mengenansatz.
- EPA-Bezeichnungen in der Form aus D-28 (`nummer`, `anteil`, `bezeichnung | null`).

### Umsetzer (Branch `welle-4/57-speicher-v1.3`)

Nur `packages/speicher`. Protokollform unverändert (ADR 0009), `vertrag` unverändert.

- **Migration 4** (`migrationen.ts`, `SCHEMA_V4`): JSON-Spalten `auftragnehmer`, `epa_bezeichnungen` an
  `leistungsverzeichnis` und `auftrags_lv`, `mengenansatz` an `knoten` (CHECK: nur Positionen). Papierkorb und LV-Stände
  halten Knoten und Kopf schon als JSON. Keine Summen-Neuberechnung (der Ansatz ändert keine Summe). Dateimigration
  `dateimigration4.ts` (3 → 4: Identität, weist die neuen Felder in einer Datei der Version 3 ab, auch im Papierkorb,
  im Auftrags-LV und in LV-Ständen). Dekoder Version 4 mit den drei Feldern; eingefrorene `fixtures/projektdatei-v4.json`
  (aus `testhilfe/inhalt-v4.ts`: Mengenansatz im LV, im Papierkorb, im Stand; importiertes LV mit EPA-Bezeichnungen,
  Angebot, Auftrags-LV mit Auftragnehmer). Dateien v1–v3 bleiben byte-gleich und öffnen weiter.
- `pruefeV13` samt Aufruf und Test entfernt; `LEERES_SUMMENVORHER` liegt jetzt in `summenvorher.ts`; alle Marker
  „v1.3: mechanisch angepasst“ in `speicher` entfernt.
- **`summen.vorher` überall geprüft** (`summenvorher.ts`, aus `wendeLvAn`, `wendeAuftragsLvAn`, `wendeAngebotAn` nach
  der Prüfung der Knoten-Vorherstände, vor dem ersten Schreiben). Löschen eines Aggregats wie bisher
  (`pruefeLoeschSummen`, D-31.2).
- **LV-Übersicht**: war mit Ticket 53 schon eine Abfrage ohne Knoten mit `Intl.Collator('de-DE')`; hier gemessen:
  `gross` in Node (Median von 9 < 20 ms, im Test hart) und im OPFS über den Worker (E2E hart < 20 ms; gemessen Median
  2 ms, max 6–7 ms).
- Tests: `v13-felder.test.ts` (Anlegen → Laden, Mengenansatz setzen/entfernen mit Undo, Kopf mit Undo, Papierkorb,
  LV-Stand, Wiederherstellen, Auftrags-LV, Export → Import → Export), `projektdatei-v4.test.ts` (Golden, Rundlauf,
  13 ungültige Formen, v1–v3 öffnen, Version 3 mit neuem Feld ungültig), `migrationen.test.ts` (Schemaabbild 4,
  Datenbank 3 → 4 mit Inhalt, CHECK, Dateimigration 3 → 4), `summenvorher.test.ts` (9 Fälle).

**Messwerte (Ticket 52 nicht verschlechtert)**, E2E `speicher`, hohe Last (parallele Agenten): `MengeAendern` auf
`gross` in Phasen, dauerhaftes Profil gesamt 6,1–7,9 ms (Vorherstand 0,6–0,9 ms statt 0,3–0,4 ms: die Summenprüfung
liest Position, Gliederungen, Gesamtsumme), flüchtiger Kontext 25–39 ms; weiter 21 Schreibzugriffe. Web-E2E
dauerhaftes Profil: Mengenänderung bis Summenzeile Median 41 ms (Speicher 16), Undo Median 32 ms (Speicher 8);
flüchtiger Kontext Median 52 ms.

Suite: `pnpm lint`, `pnpm typecheck` grün; `pnpm test` 1963 bestanden, 2 übersprungen, `node --test` 20; E2E
`@tethys/speicher` 16 bestanden, `@tethys/web` 60 bestanden.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-57.1** Ablage der neuen Felder? Je eine JSON-Spalte (kanonisch kompakt, `NULL` = fehlt), keine eigenen Tabellen.
  Grund: wie `auftraggeber`/`vergabeinformationen` (Schema 2); die Felder werden nur als Ganzes gelesen und geschrieben,
  das spaltenweise UPDATE aus Ticket 52 bleibt (eine Spalte mehr in `KNOTEN_SPALTEN`).
- **D-57.2** Wie streng prüft `speicher` `summen.vorher` außerhalb des Löschens? `konflikt`, wenn ein alter Wert vom
  gespeicherten abweicht, zu einer gespeicherten Summe kein alter Wert genannt wird (die Umkehrung löschte sie), die
  Summe eines entfernten Knotens in `vorher.entfernt` fehlt oder abweicht, oder die alten Gesamtsummen bei neuen nicht
  den gespeicherten gleichen; `unbekannt` bei Widerspruch im ChangeSet selbst (alter Wert ohne neuen, entfernte Summe
  ohne entfernten Knoten, alte Gesamtsummen ohne neue). Erlaubt bleibt ein alter Wert zu einer Summe, die nicht
  gespeichert ist. Grund: Q5 (bei der Umkehrung geht nichts verloren); die Ausnahme verliert nichts und trifft
  `vergabe` (`positionSetzen` bildet für eine LV-Position, die nach dem Anlegen des Angebots entstand, einen gerechneten
  alten Wert, obwohl das Angebot dazu keine Summe gespeichert hat; die Umkehrung schreibt dann eine Summe mehr).
  Folgefrage an `vergabe`: dort kein `vorher`-Eintrag ohne gespeicherte Summe.
- **D-57.3** Angebot und `vorher.entfernt`? Nur „gleich dem gespeicherten“ geprüft, keine Vollständigkeit gegen die
  entfernten Angebotspositionen. Grund: Angebotssummen hängen an LV-Positionen; die Umkehrung einer hinzugefügten
  Angebotsposition (`vergabe`) bringt die Summe über `positionen` zurück, nicht über `entfernt`.
- **D-57.4** Neues Aggregat (`kopf.vorher: null`)? `vorher` muss leer sein (sonst `konflikt`: es gab keine Summen),
  ohne Einzelabfragen. Grund: Import und Anlegen von `gross` bleiben so schnell wie bisher.
- **D-57.5** Strenge des Dekoders (Version 4)? `epaBezeichnungen` nicht leer, `nummer` 1–6 streng aufsteigend, `anteil`
  je Art einmal, `bezeichnung` Text oder `null` (D-28); `mengenansatz` nicht leer, Zeilen mit genau `zeile`, `formel`
  (ganze Zahlen ≥ 0), `ausdruck`, `variable`, nicht ausgewertet (A3); `auftragnehmer` genau vier nullbare Textfelder.
  Der Datenbankweg prüft die Form nicht (Sache des Kerns, wie bei allen anderen Feldern). Grund: Vertrag „nie `[]`“ und
  D-28; eine Datei wird nie halb übernommen.
- **D-57.6** Migrationstest 3 → 4 auf der Datenbank? Die Datenbank der Version 3 wird nachgestellt
  (`testhilfe/schema3.ts`: Datei v3 importieren, die Spalten von Version 4 mit `DROP COLUMN` entfernen, `user_version`
  3; das Schema wird gegen `SCHEMA_ABBILD[3]` geprüft). Grund: Der Schreibweg kennt nur das aktuelle Schema; so prüft der
  Test die echte Migration auf dem Inhalt aller Tabellen.
- **D-57.7** Bestehende Tests, die der neue Stand berührt? Migrationstest 2 → 3 vergleicht den Export jetzt mit
  `schemaVersion: 3` (die frische Datenbank exportiert Version 4); drei Testliterale tragen jetzt das richtige `vorher`
  (`kern.test.ts`, `baumpruefung.test.ts`); die Phasenmessung aus Ticket 52 (E2E) bildet jedes ChangeSet auf dem Stand
  nach dem vorigen (vorher alle auf dem Anfangsstand, also mit veralteten alten Summen). Grund: Die Tests prüfen
  dieselbe Sache weiter; nur ihre ChangeSets waren für die neue Prüfung unvollständig.
- **D-57.8** `Projektdatei.lvStaende` mit Migration 4 Pflicht machen (Offene Typfrage 2 aus Ticket 53)? Nein, bleibt
  optional. Grund: Vertragsänderung, nicht in diesem Paket (P2); das Feld fehlt weiter, wenn es keine Stände gibt.
