# 79: Speicher v1.4: Migration 5, Repositories für Auftrags-LV, Aufmaß, Rechnung, Kostenermittlung

Status: done-by-agent
Type: task
Welle: 5 · Strang: S · Paket: `packages/speicher`
Blocked by: 70
Regeln: A5, A8, Q5, ADR 0002, ADR 0009, ADR 0011, G-56, D-17, D-36
Herkunft: `vertrag` v1.4 (Ticket 70, Comments „Folgearbeit Speicher“); D-64.2

## What to build

1. **Migration 5** (Datenbank und Projektdatei, A8; Vorbild Migration 4 in `migrationen.ts` und `dateimigration4.ts`):
   - Knoten: `kostengruppe`, `textquelle` (nur Positionen); LV-Kopf: `nachtrag` (kanonisches JSON), `vorlage`.
   - Neue Tabellen `aufmass`, `rechnung`, `kostenermittlung`: Kopfspalten zum Suchen und für Fremdschlüssel (`projekt_id`,
     `auftrags_lv_id`, `nummer` mit `UNIQUE (auftrags_lv_id, nummer)`), Inhalt als kanonisches JSON (D-36 (8): ganze
     Aggregate). Eigene Tabellenform nur, wo eine Abfrage sie braucht; begründen.
   - `protokoll.aggregat_art` kennt die drei neuen Arten (SQLite kann eine CHECK-Regel nicht ändern: Tabelle neu anlegen
     und umkopieren, wie Migration 2 es mit `knoten` tut; Reihenfolge `seq` bleibt).
   - Alte Projektdateien (Schema 1–4) öffnen sich weiter; neue Felder fehlen dort (kein Rechnen, D-17 nicht nötig).
2. **Repositories** aus v1.4: `auftragsLeistungsverzeichnisse` (`auflisten`, `laden`), `aufmasse`, `rechnungen`,
   `kostenermittlungen`; Sortierung wie im Vertrag beschrieben.
3. **`anwenden`** für die neuen ChangeSets (ganzes Aggregat: Anlegen, Ändern, Löschen; `vorher` muss zum gespeicherten Stand
   passen, sonst `konflikt`) und für Auftrags-LV-ChangeSets mit `knoten.hinzugefuegt`/`geaendert` (Nachtrag übernehmen,
   Kostengruppe setzen) samt Summenzeilen. Löschregeln aus v1.4 (`konflikt`). Protokolleintrag in derselben Transaktion,
   Massenbefehle als Kurzfassung (E-13), wenn v1.4 sie so festlegt.
4. **Projektdatei** exportiert und importiert die neuen Listen kanonisch (byte-stabil, G-56); Rundweg-Test.
5. Undo: `Rueckgaengig`/`Wiederholen` mit umgekehrten ChangeSets der neuen Arten funktioniert (der Speicher kehrt nicht
   selbst um; Test mit einer im Test gebauten Umkehrung durch Tausch von `vorher`/`nachher`).

## Grenzen

- Nur `packages/speicher` (dazu die markierten mechanischen Zeilen aus Ticket 70 in `speicher` ersetzen). Keine Fachrechnung
  (A3): Summen kommen aus dem ChangeSet bzw. dem Kern wie bisher.
- Leistung: Einzeländerung bei 5.000 Positionen bleibt in ihrem Budget (Ticket 52, D-29); die neuen Tabellen ändern daran nichts.
- `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [ ] Migrationstests 1→5, 4→5 (DB und Datei), Rundweg der Projektdatei mit allen neuen Aggregaten
- [ ] Repositories und `anwenden` je neuer Art mit Konflikt- und Löschfällen getestet; Undo/Redo-Test
- [ ] E2E des Pakets (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/speicher e2e`) grün
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün

## Nachträge aus dem Review von v1.4 (D-42)

- Freigabe-Invariante (Review-Befund 1): `konflikt` auf jedes `RechnungChangeSet` mit `vorher: null`, wenn dasselbe
  Auftrags-LV eine freigegebene Rechnung mit größerer Nummer hat (Lesart in v1.4); Test „AR 2 löschen, AR 3 freigeben, AR 2
  neu anlegen“ → `konflikt`.
- `LvUebersicht.nachtrag?`/`vorlage?` aus dem Kopf füllen (D-43); Test: Übersicht = Kopf nach `NachtragsangabenSetzen` /
  `VorlageSetzen` und nach deren Undo.

## Comments

### Ergebnis (Branch `welle-5/79-speicher-v1.4`, Basis `integration/welle-5`, zuletzt gemergt bei `f189ef3`)

Nur `packages/speicher`. `vertrag` unverändert, keine Vertragsänderung nötig.

- **Migration 5** (`migrationen.ts`, `SCHEMA_V5`; `dateimigration5.ts`): Spalten `knoten.kostengruppe`, `knoten.textquelle`
  (CHECK: nur Positionen), `leistungsverzeichnis.nachtrag` (kanonisches JSON), `leistungsverzeichnis.vorlage` (nur `1`);
  Tabellen `aufmass`, `rechnung`, `kostenermittlung` (D-79.1); `protokoll` neu angelegt und umkopiert mit den drei neuen
  Aggregatarten, `seq` und AUTOINCREMENT-Zähler bleiben (D-79.2). Dateimigration 4 → 5: Identität, weist alles aus v1.4 in
  einer Datei der Version 4 ab (Listen, Kopffelder, Knotenfelder in LV, Auftrags-LV, Papierkorb, Ständen; neue Aggregatarten
  im Protokoll). Eingefrorene `fixtures/projektdatei-v5.json` (aus `testhilfe/inhalt-v5.ts`); v1–v4 bleiben byte-gleich und
  öffnen weiter.
- **Repositories**: `auftragsLeistungsverzeichnisse` (`auflisten` nach Name de-DE, dann Kennung; `laden`), `aufmasse`
  (Köpfe nach Blattnummer, ohne die Zeilen zu lesen), `rechnungen` (ganz, nach Nummer), `kostenermittlungen` (ohne Einträge,
  nach Name de-DE); unbekanntes Projekt bzw. Auftrags-LV `nicht-gefunden`. Über RPC/Worker erreichbar (`rpc.ts`, `client.ts`).
  `LvUebersicht.nachtrag?`/`.vorlage?` aus dem Kopf (D-43).
- **`anwenden`** für `AufmassChangeSet`, `RechnungChangeSet`, `KostenermittlungChangeSet` (ganze Aggregate: Anlegen, Ändern,
  Löschen; `vorher` ≠ gespeichert → `konflikt`) und für LV/Auftrags-LV mit den neuen Feldern. Alle `konflikt`-Regeln aus dem
  Kommentar an `Speicher` in `bezuege.ts` (nur lesend) und `schreiben.ts`: Auftrags-LV mit Blatt, Rechnung oder
  Nachtragsangaben; Position mit Aufmaßzeile; Blatt in einer Rechnung; Reihenfolge der Freigaben (D-79.7); fremde Kennungen
  (Nachtragsangaben, `auftragsLvId`, `aufmassIds`); doppelte Blatt-/Rechnungsnummer; Projekt mit Kostenermittlung (und
  Blatt/Rechnung). `AufmassAnlegen` geht als Kurzfassung ins Protokoll (D-70.5).
- **Projektdatei**: drei optionale Listen (leer = weggelassen, nach Kennung), Dekoder streng (D-79.4), Import in der Reihenfolge
  Blätter → Rechnungen nach Nummer → Kostenermittlungen, Nachtragsangaben am Ende geprüft (D-79.8).
- **Entfernt**: `vertrag-v14.ts` samt Test (`pruefeV14`), alle Marker „v1.4: mechanisch angepasst“ in `speicher`
  (`kern.ts`, `client.ts`, `client.test.ts`, `dekoder.ts`, `kurzfassung.ts`, `testhilfe/umkehrung.ts`).
- **Tests**: `migrationen.test.ts` (Schemaabbild 5; Datenbank 4 → 5 mit Inhalt, Protokoll, `seq`/Zähler, CHECK;
  Dateimigration 4 → 5; 1 → 5 über die bestehenden Tests 2 und 3), `v14-felder.test.ts` (Kopf- und Knotenfelder mit Undo,
  Papierkorb, Stand, Übersicht, Auftrags-LV-Liste), `aufmass.test.ts`, `rechnung.test.ts` (Review-Befund 1: „AR 2 löschen,
  AR 3 freigeben, AR 2 neu anlegen“ → `konflikt`), `v14-loeschen.test.ts` (Kostenermittlung, Löschregeln, Undo/Redo mit
  `Rueckgaengig`/`Wiederholen` je neuer Art), `projektdatei-v14.test.ts` (Rundweg byte-gleich, 32 ungültige Formen),
  `projektdatei-v5.test.ts` (Golden, Rundlauf über die Repositories, v1–v4 öffnen, Version 4 mit Neuem ungültig); E2E
  „Vertrag v1.4 im OPFS“ (Import v5, Blatt ändern, Konflikt beim Löschen eines Blatts in einer Rechnung, Neuladen).

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-79.0** Wo setzen die Tests an (Skill `tdd`, Seams)? Am `SpeicherKern` (anwenden, Repositories, Projektdatei), am Client
  über `speicherUeberTransport` und an `migriere`/`MIGRATIONEN`, wie die bestehenden Tests. Grund: öffentliche Schnittstellen
  des Pakets; Demo-Modus, keine Rückfrage.
- **D-79.1** Tabellenform der drei Aggregate? Kopfspalten plus kanonisches JSON für den Rest: `aufmass (id, projekt_id,
  auftrags_lv_id, nummer, bezeichnung, datum, positionen)`, `rechnung (id, projekt_id, auftrags_lv_id, nummer, angaben)`,
  `kostenermittlung (id, projekt_id, stufe, name, eintraege)`, `UNIQUE (auftrags_lv_id, nummer)`, Fremdschlüssel auf Projekt
  und Auftrags-LV. Keine eigenen Tabellen für Zeilen, Einträge oder `aufmassIds`. Grund: `auflisten` braucht Kopf bzw.
  Übersicht ohne die (bis zu 5.000) Zeilen zu parsen; geschrieben wird immer das ganze Aggregat (D-36 (8), D-45); die zwei
  Abfragen über Zeilen bzw. `aufmassIds` laufen nur beim Entfernen bzw. Löschen (`json_each`).
- **D-79.2** `protokoll` neu anlegen: Zeilen in `seq`-Reihenfolge umkopieren und den Zähler aus `sqlite_sequence` übernehmen
  (höchster Wert aus alt und neu). Grund: Ticket („Reihenfolge `seq` bleibt“); ohne den Zähler bekäme ein neuer Eintrag nach
  dem Löschen eines Projekts eine schon vergebene Nummer (Test).
- **D-79.3** Was der Vertrag nicht kennt und still verloren ginge, ist `unbekannt` (Programmfehler, Q5): `vorlage` ≠ `true`;
  `nachtrag`/`vorlage` am Kopf des Auftrags-LV (D-42); Blatt- oder Rechnungsnummer keine ganze Zahl ≥ 1; Wechsel von
  `auftragsLvId` oder `nummer` (D-70.9); Kennung oder Projekt passen nicht zu ChangeSet bzw. Protokolleintrag; beide Seiten
  `null`.
- **D-79.4** Strenge des Dekoders (Version 5): Kostengruppennummer `^[1-9][0-9]{2}$`, `textquelle`, `bemerkung` und
  `rechnungsnummerAuftragnehmer` nicht `''`, `vorlage` nur `true`, Nachtragsnummer nicht leer, `status` aus der Liste, je
  Position höchstens eine Aufmaßzeile, Mengenansatz nicht leer, `aufmassIds` eindeutig, `gefordert` nicht dreimal `null`
  (D-44), Einträge nach Nummer aufsteigend und eindeutig, Nummern ≥ 1, Dezimalwerte kanonisch. `datum`/`eingang` nur Text oder
  `null` (ihr Format prüft der Ausführer; strenger als er wäre, ließe Exporte nicht mehr importieren). Der Datenbankweg prüft
  die Form nicht (wie D-57.5).
- **D-79.5** `konflikt` oder `nicht-gefunden`? Verweise auf andere Aggregate (Auftrags-LV, Aufmaßblatt, Nachtragsangaben)
  `konflikt` (Kommentar an `Speicher`); ein unbekanntes Aggregat ändern oder löschen `nicht-gefunden`, eine Kostenermittlung in
  einem unbekannten Projekt anlegen `nicht-gefunden` (wie bei LV und Angebot). Aufmaßzeilen zu Kennungen, die keine Position
  des Auftrags-LV sind, prüft `speicher` nicht (Befund von `aufmassPruefen`, U5).
- **D-79.6** Bestehende Tests, die Version 5 berührt (wie D-57.7): Der Migrationstest 3 → 4 stellt erst Version 4 nach
  (`testhilfe/schema4.ts`) und läuft dann bis zur aktuellen Version; der Test 2 → 3 vergleicht den Export nach Migration bis
  zur aktuellen Version (der Export liest die Tabellen aus Version 5). Grund: Sie prüfen dieselbe Sache weiter.
- **D-79.7** Invariante der Freigaben (D-34 (7), Review-Befund 1): vor dem Schreiben `konflikt` beim Anlegen und Löschen,
  solange eine Rechnung mit größerer Nummer freigegeben ist (auch wenn die neue selbst freigegeben wäre); nach dem Schreiben
  `konflikt`, wenn eine freigegebene Rechnung eine offene mit kleinerer Nummer hat (fängt Freigeben und Aufheben außer der
  Reihe). Der Import schreibt Rechnungen nach Nummer. Grund: genau die Regeln am `RechnungChangeSet`, auch ohne Ausführer.
- **D-79.8** Nachtragsangaben: Verweis bei jedem Schreiben eines LV-Kopfs mit `nachtrag` geprüft; beim Import erst am Ende
  (ein LV kann auf ein Auftrags-LV zeigen, das selbst aus einem LV entsteht). Das Löschen eines Auftrags-LV prüft nur lebende
  LVs, nicht LV-Stände (eingefroren; ein aus dem Stand zurückgeholtes LV ist kein Nachtrag mehr).
- **D-79.9** „Position mit Aufmaßzeile“ nur, wenn ein Auftrags-LV-ChangeSet Positionen entfernt; sonst keine Abfrage. Grund:
  Ticket 52/D-29 (die Einzeländerung bleibt, wie sie war).

### Messwerte (Ticket 52 nicht verschlechtert)

E2E `@tethys/speicher` (17 bestanden, parallel zu anderen Agenten): `MengeAendern` auf `gross` im dauerhaften Profil gesamt
7,5 ms (Ticket 57: 6,1–7,9), flüchtiger Kontext 36,4 ms (Ticket 57: 25–39), weiter 21 Schreibzugriffe; LV-Übersicht Median
3 ms. Suite nach dem Merge von `integration/welle-5` (bei `f189ef3`): `pnpm lint`, `pnpm typecheck` grün; `pnpm test`
2319 bestanden, 2 übersprungen (wie zuvor), `node --test` 29/29.

## Answer

`speicher` hält jetzt alles aus `vertrag` v1.4 (Schema und Projektdatei Version 5, alte Datenbanken und Dateien v1–v4 öffnen
weiter). Die App kann `speicher.auftragsLeistungsverzeichnisse.auflisten/laden` statt des Projektdatei-Umwegs (D-64.2)
nutzen, `aufmasse`, `rechnungen`, `kostenermittlungen` auflisten und laden, und `anwenden` mit `AufmassChangeSet`,
`RechnungChangeSet`, `KostenermittlungChangeSet` (Undo durch Tausch) sowie LV-/Auftrags-LV-ChangeSets mit `nachtrag`,
`vorlage`, `kostengruppe`, `textquelle` aufrufen; `LvUebersicht` trägt `nachtrag`/`vorlage`. Alle Löschregeln und die
Invariante der Freigaben weist `speicher` mit `konflikt` ab; die App sollte vorher prüfen (`freigabeMoeglich`) und `konflikt`
als Meldung zeigen.
