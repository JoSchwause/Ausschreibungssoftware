# 106: Speicher v1.5/v1.6: Migration 6, Modelldateien, neue Aggregate

Status: resolved
Type: task
Welle: 6 · Strang: S · Paket: `packages/speicher`
Blocked by: 94 (gleiches Paket), 97 (und damit 95)
Modell: opus
Regeln: A5, A8, Q4, Q5, ADR 0002, ADR 0006, ADR 0009, G-56, D-51, D-54, D-57, D-92.4
Herkunft: Ticket 95 (Punkt 5), Ticket 97 (Punkte 1, 2, 4–8), Berater D-51, D-54, D-57

## What to build

1. **Migration 6 und Projektdatei Schema 6 (A8).** Tabellen für `Bauwerksmodell` (Kopf getrennt von Struktur und Bauteilen,
   damit `auflisten` und Umbenennen nicht das ganze Modell lesen), `Bauzeitenplan`, `Honorarberechnung`, `Mangel`,
   `Bautagebucheintrag`; `Positionsdaten.bauteile` im LV und Auftrags-LV, wie die übrigen optionalen Positionsfelder.
   Projektdateien der Versionen 1–5 öffnen sich weiter (Test je Version, wie bisher); eine Datei der Version 6 ohne die neuen
   Listen ist kanonisch gleich der Version 5 bis auf die Versionsnummer, wie bei v1.4.
2. **Modelldateien (D-51).** Eigene Tabelle `hash → BLOB` (SHA-256 der unkomprimierten Bytes, über `crypto.subtle` im Worker
   und unter Node), Inhalt komprimiert (deflate-raw, z. B. mit `fflate`, MIT, genaue Version); `ablegen` idempotent, `laden`,
   `vorhanden`. In der Projektdatei als `modelldateien: [{ hash, inhalt: Base64(deflate-raw) }]`; beim Import Hash der
   entpackten Bytes prüfen (sonst `ungueltig`, nichts halb importiert). Tests der kanonischen Datei vergleichen den SHA-256 der
   unkomprimierten Bytes, nie den komprimierten Text. Nähert sich die Ausgabe der Grenze für Zeichenketten (etwa 512 MB Text),
   schlägt der Export laut fehl (eigener Fehler, nie gekürzt). Freigabe ungenutzter Bytes nach der Lesart in v1.6 (z. B. beim
   Öffnen des Projekts, wenn kein Modell den Hash nennt), getestet: Undo von `BauwerksmodellLoeschen` in derselben Sitzung
   findet die Bytes noch.
3. **Repositories und `anwenden`** für alle neuen Aggregate und ChangeSets laut v1.6, mit den Löschregeln (`konflikt`) aus v1.6
   (u. a. `BauwerksmodellAnlegen` mit nicht abgelegtem Hash; Kostenermittlung in einer Honorarberechnung; Verweise von Mängeln)
   und Protokoll (Massenbefehl `BauwerksmodellAnlegen` als Kopf und Prüfsumme, E-13). Undo über die Umkehrung je Aggregat.
4. **`LvUebersicht.nettoNachNachlass` (v1.5 Punkt 5, D-92.4, Name nach D-95.5)** aus den gespeicherten Summen (Netto nach
   Nachlass, nicht `Gesamtsummen.netto`), nach Setzen und nach Undo gleich dem gespeicherten Summenstand (Test wie D-43).
5. **Leistung (Q4, D-54, D-57)**, unter Node mit In-Memory-SQLite wie die übrigen Budgettests des Pakets: ein Modell mit
   10.000 Bauteilen (`fixtures/ifc/erzeugen.mjs` über `packages/ifc`, sobald Ticket 107 gemergt ist; bis dahin ein Modell aus
   einem eigenen Testerzeuger in der Form von v1.6) speichern ≤ 3 s; Projektdatei-Export und -Import mit einem 25-MB-Modell je
   ≤ 10 s; eine Einzeländerung im LV `gross` in einem Projekt mit diesem Modell bleibt im bestehenden Budget; Undo eines
   `Bauzeitenplan`-ChangeSets bei 1.000 Vorgängen messen (Budget 100 ms wie D-45; darüber an den Orchestrator melden, D-57).

## Grenzen

- Nur `packages/speicher`. Keine Änderung an `vertrag`. `okf/research/` wird nicht gelesen (C3).

## Acceptance criteria

- [x] Migrationstests 1→6, Projektdatei v6 Rundweg (mit Modell und Bytes), Löschregeln, Undo je neuer Art, Freigabe der Bytes,
      Leistungstests im Budget
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün, dazu
      `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/speicher e2e` (OPFS im Browser)

## Comments

### Ergebnis (Branch `welle-6/106-speicher`, Basis `integration/welle-6`, zuletzt gemergt bei `ef749df`)

Nur `packages/speicher` (dazu `pnpm-lock.yaml` für `fflate`). `vertrag` unverändert; die Lesarten aus dem Review-Nachtrag D-66
(`IFC_GLOBALID_MUSTER`, `Mangelverlaufseintrag.frist?`, Regel „Inhalt nur beim Anlegen und Löschen“) sind umgesetzt.

- **Migration 6** (`migrationen.ts`, `SCHEMA_V6`; `dateimigration6.ts`): `knoten.bauteile` (CHECK: nur Positionen); Tabellen
  `modelldatei` (`hash` → `groesse`, `inhalt` BLOB, deflate-raw), `bauwerksmodell` (Kopf, `anzahl_bauteile`) getrennt von
  `bauwerksmodell_inhalt` (Struktur, Bauteile), `bauzeitenplan`, `honorarberechnung`, `mangel`, `bautagebucheintrag`;
  `protokoll` mit den fünf neuen Aggregatarten neu angelegt und umkopiert (`seq` und Zähler bleiben). Dateimigration 5 → 6:
  Identität, weist alles aus v1.6 in einer Datei der Version 5 ab (Listen, `bauteile` in LV, Auftrags-LV, Papierkorb, Stand;
  neue Aggregatarten und Befehle im Protokoll). Eingefrorene `fixtures/projektdatei-v6.json` (aus `testhilfe/inhalt-v6.ts`).
- **Modelldateien** (`komprimierung.ts`, `Speicher.modelldateien`): SHA-256 über `crypto.subtle`, deflate-raw mit `fflate`
  0.8.3 (MIT, genau gepinnt, schon im Lockfile über `ausgabe`), Base64 über `btoa`/`atob`; `ablegen` idempotent, `laden`,
  `vorhanden`; Freigabe ungenutzter Bytes beim Öffnen des Speichers.
- **Repositories und `anwenden`** für Bauwerksmodell, Bauzeitenplan, Honorarberechnung, Mangel, Bautagebucheintrag (über RPC und
  Worker erreichbar), alle `konflikt`-Regeln aus dem Kommentar an `Speicher` (D-97.6, D-64), Massenbefehl
  `BauwerksmodellAnlegen` als Kopf und Prüfsumme (ohne `struktur` und `bauteile`), Undo durch Tausch je Art.
- **`LvUebersicht.nettoNachNachlass`** aus `summe_gesamt` (D-95.5, D-62).
- **Projektdatei Schema 6**: sechs optionale Listen (leer = weggelassen), Dekoder streng, Import prüft die Bytes vor der
  Transaktion, Export mit Grenze (`datei-zu-gross`).
- **Entfernt**: `vertrag-v16.ts` samt Test (`pruefeV16`), alle Marker „v1.6: mechanisch angepasst, Folgeticket 106“ in `speicher`
  (`kern.ts`, `client.ts`, `client.test.ts`, `dekoder.ts`, `kurzfassung.ts`, `testhilfe/umkehrung.ts`, `testhilfe/v14.ts`).
- **Tests**: `migrationen.test.ts` (Schemaabbild 6, Datenbank 5 → 6 mit Inhalt, Protokoll, CHECK, Dateimigration 5 → 6),
  `lv-uebersicht.test.ts`, `bauteile.test.ts`, `modelldateien.test.ts`, `bauwerksmodell.test.ts`, `v16-aggregate.test.ts`,
  `projektdatei-v6.test.ts` (Golden, Rundlauf über Repositories und Ablage, v1–v5 öffnen, 53 ungültige Formen, Grenze),
  `v16-leistung.test.ts` (Budgets); E2E „Vertrag v1.6 im OPFS“.

### Entscheidungen (Frage, Entscheidung, Grund)

- **D-106.0** Wo setzen die Tests an (Skill `tdd`, Demo-Modus)? Am `SpeicherKern` (anwenden, Repositories, Ablage, Projektdatei),
  am Client über `speicherUeberTransport`, an `migriere`/`MIGRATIONEN` und im Browser über den Prüfstand. Grund: öffentliche
  Schnittstellen des Pakets, wie D-79.0.
- **D-106.1** Tabellenform? Bauwerksmodell: Kopf in Spalten samt `anzahl_bauteile` (`auflisten`, Umbenennen und Löschregeln
  lesen nur ihn), Struktur und Bauteile als kanonisches JSON in eigener Tabelle (Umbenennen schreibt nur die kleine Kopfzeile).
  Übrige wie D-79.1: Kopfspalten plus JSON; `mangel` trägt `auftrags_lv_id` und `bauwerksmodell_id` zusätzlich als Spalten mit
  Fremdschlüssel und Index (Löschregeln ohne `json_each`), `UNIQUE (projekt_id, nummer)` bzw. `(projekt_id, datum)`. Grund:
  Lesen der Liste bei 10.000 Bauteilen ohne Parsen; ganze Aggregate werden ohnehin ganz geschrieben (D-57).
- **D-106.2** Ablage der Bytes? Eine Tabelle für den ganzen Speicher (nicht je Projekt), `inhalt` mit deflate-raw Stufe 6,
  `groesse` als Spalte (die Konfliktprüfung des Anlegens liest die Bytes nicht), Fremdschlüssel vom Modell auf den Hash; `SqlWert`
  um `Uint8Array` erweitert. `ablegen` läuft in der Reihe von `anwenden` (ein Schreiber) und komprimiert nicht neu, wenn der
  Hash schon da ist. Grund: Lesart an `Modelldateiablage` (dieselbe Datei in zwei Projekten liegt einmal ab).
- **D-106.3** Freigabe? In `SpeicherKern.oeffnen` nach den Migrationen (ab Schema 6) ein `DELETE … WHERE hash NOT IN (SELECT
  datei_hash FROM bauwerksmodell)`. Grund: D-97.5 (nur beim Öffnen; Undo von `BauwerksmodellLoeschen` in derselben Sitzung
  findet die Bytes, Test und E2E).
- **D-106.4** Bytes in der Projektdatei? Der Export schreibt die abgelegten komprimierten Bytes unverändert als Base64, der Import
  legt die Bytes der Datei so ab, wie sie kommen, nachdem er sie entpackt und den SHA-256 geprüft hat. Grund: kein zweites
  Komprimieren (Export 25 MB unter 1 s), Import → Export ist byte-gleich auch im Text `inhalt`; verglichen wird trotzdem nur der
  Hash der entpackten Bytes (D-51). Die Prüfung braucht Web Crypto und ist asynchron: `SpeicherKern.projektdateiImportieren`
  liefert jetzt ein `Promise` und läuft in der Reihe von `anwenden` (die Vertragsschnittstelle war schon asynchron; die Tests des
  Pakets warten mechanisch mit `await`).
- **D-106.5** Vollständigkeit und Reihenfolge beim Import? Der Dekoder verlangt `modelldateien` streng nach Hash aufsteigend und
  genau die Hashes der Modelle der Datei; die Länge der entpackten Bytes muss `datei.groesse` sein. Modelle werden mit dem
  Vorgänger zuerst geschrieben, Honorarberechnungen nach den Kostenermittlungen, Mängel nach Auftrags-LV und Modellen. Grund:
  Lesart an `Projektdatei.modelldateien`; starke Verweise gelten auch beim Import.
- **D-106.6** Grenze des Exports? 500.000.000 Zeichen (V8: 2^29 − 24 = 536.870.888), geprüft zuerst über die Base64-Länge der
  Bytes per SQL (`length(inhalt)`, nichts gelesen), dann am fertigen Text; ein `RangeError` der Laufzeit ist derselbe Fehler
  `datei-zu-gross`. Für Tests über `SpeicherKern.oeffnen(db, migrationen, { grenzeZeichen })`. Grund: „schlägt laut fehl, kürzt
  nie“ ohne 500 MB im Test.
- **D-106.7** Was misst „Modell speichern ≤ 3 s“? `anwenden` des Massenbefehls; zusätzlich geprüft: Ablegen der Bytes und Anlegen
  zusammen (so erlebt es der Nutzer). Beides weit im Budget.
- **D-106.8** Löschen eines Modells: Verglichen wird nach dem Vertrag nur der Kopf; dazu die Zahl der Bauteile und
  Strukturknoten von `inhalt.vorher` gegen die gespeicherte (billig, `konflikt`). Grund: Ein verkürzter Inhalt im ChangeSet würde
  sonst bei einem Undo still ein kleineres Modell zurücklegen (Q5).
- **D-106.9** `unbekannt` (Programmfehler, D-79.3): `bauteile: []` an einer Position (der Vertrag: „nie `[]`“; sie ließe sich nicht
  mehr importieren), ein Bauwerksmodell-ChangeSet gegen die Inhaltsregel (D-66), ein Umbenennen, das ein anderes Kopffeld ändert,
  eine geänderte Mangelnummer.
- **D-106.10** `konflikt` oder `nicht-gefunden`: ein Aggregat in einem unbekannten Projekt anzulegen oder ein unbekanntes zu
  ändern ist `nicht-gefunden` (wie D-79.5); starke Verweise und Löschregeln `konflikt`; schwache Verweise (Vorgangsbezug,
  `Mangel.positionId`, Bauteilzuordnung gegen ein Modell) prüft `speicher` nicht.
- **D-106.11** Strenge des Dekoders (Version 6): Felder, Listen der Werte, kanonische Dezimalwerte, GlobalIds nach
  `IFC_GLOBALID_MUSTER`, Hash 64 Hexziffern klein, Texte „nie `''`“/„nicht leer“, Leistungsphasen aufsteigend, Vorgänge und
  Firmen eindeutig, `ist` nicht dreimal `null`, `frist` am Verlaufseintrag nur bei `angezeigt` (D-66). Keine Regeln des Ausführers
  (Ring, Statuswechsel, Datumsformat), wie D-79.4.
- **D-106.12** `dateiAuf6` weist auch die Befehle aus v1.6 im Protokoll einer Datei der Version 5 ab (auch als Kurzfassung).
  Grund: Sie konnten dort nicht stehen; der aktuelle Dekoder kennte sie sonst.
- **D-106.13** Bauzeitenplan beim Ändern und Undo: Vergleich mit dem gespeicherten Text und Merkliste (Muster D-94.2/D-94.3),
  geschrieben wird nur, was sich ändert. Grund: Hinweis aus Ticket 94; bei 1.000 Vorgängen 8 ms statt eines doppelten Parsens.
- **D-106.14** Großes Modell für die Budgets: Bytes aus `fixtures/ifc/erzeugen.mjs` (12.000 Bauteile = 25,3 MB für das
  25-MB-Budget, 10.000 = 21,0 MB), das Bauwerksmodell aus einem eigenen Testerzeuger in der Form von v1.6 (`testhilfe/v16.ts`, Felder
  wie im Erzeuger, Mengensätze wie im Haus). Grund: `speicher` darf `ifc` nicht importieren (A3); Ticket 107 bildet erst ab.
- **D-106.15** `nettoNachNachlass` per `LEFT JOIN summe_gesamt`; ohne Zeile fehlt das Feld. Die bestehenden Tests mit genauer
  LV-Liste (`kern`, `projektliste`, `v14-felder`) nennen das Feld jetzt mit.

### Messungen (Node, In-Memory-SQLite, 4 Kerne mit bis zu 8 Agenten)

| Budget (D-54, D-57) | Last 2,5 (allein) | Last 19–29 (allein) | Budget |
|---|---|---|---|
| Modell 10.000 Bauteile: `anwenden` (Massenbefehl) | 345 ms | 441 ms | ≤ 3 s |
| dazu Ablegen der Bytes (21,0 MB: SHA-256 + deflate) | 678 ms (zusammen 1.023 ms) | 953 ms (zusammen 1.394 ms) | ≤ 3 s |
| Modell 10.000 Bauteile laden (D-66, SHOULD 11) | 44 ms | 49 ms | – |
| Projektdatei mit 25,3-MB-Modell (12.000 Bauteile, LV gross, 27,1 Mio. Zeichen): Export | 848 ms | 1.097 ms | ≤ 10 s |
| … Import (samt Hashprüfung) | 1.009 ms | 2.135 ms | ≤ 10 s |
| `MengeAendern` auf gross, Median: ohne / mit 10k-Modell | 4,3 / 4,3 ms | 9,1 / 6,1 ms | < 100 ms (D-29) |
| Bauzeitenplan 1.000 Vorgänge, Median: Setzen / Undo / Redo | 7,6 / 8,3 / 7,6 ms | 9,1 / 11,8 / 12,8 ms | < 100 ms (D-45, D-57) |

Damit ist kein `Aenderungen<Vorgang>` nötig (D-57). Das Budget aus Ticket 94 (Aufmaßblatt 5.000 Zeilen) fiel dreimal in der vollen
Suite des Pakets bei Last 23–35 (nicht in der Suite des ganzen Repos bei Last 4), allein jeweils grün: zuletzt 32,4 / 33,5 / 33,9 ms
(Setzen / Undo / Redo, Last 2,5). Der Aufmaßweg ist von diesem Ticket unberührt. Kein Budget gelockert, keines übersprungen.
E2E (OPFS): `MengeAendern` auf gross gesamt 15,7 ms (Testkontext) bzw. 9,0 ms (dauerhaftes Profil), Einzelbefehl Median 11 ms,
LV-Übersicht Median 1 ms.

### Folgearbeit und Hinweise

- **App (Tickets 114, 121 oder Review-Behebung):** In `apps/web/src/lv/texte.ts` (Zeile 202) steht noch der Marker „v1.6: mechanisch
  angepasst, Folgeticket 106“ am Text für `datei-zu-gross`; der Text passt (Export mit großen Modelldateien), der Marker gehört
  in `apps/web` entfernt (nicht mein Paket, P2). Die App legt die Bytes mit `speicher.modelldateien.ablegen` ab, bevor sie
  `BauwerksmodellAnlegen` schreibt (sonst `konflikt`); ein Undo von `BauwerksmodellLoeschen` gelingt nur in derselben Sitzung.
  Die Projektseite liest `LvUebersicht.nettoNachNachlass` (121).
- **Beobachtung (nicht neu):** `protokoll.id` ist über alle Projekte einer Datenbank eindeutig; zwei Projektdateien mit gleichen
  Protokollkennungen (etwa Testdateien mit `protokoll-000001`) lassen sich nicht beide importieren (`datei-ungueltig`). Die App
  vergibt UUIDv7, also kein Problem im Betrieb.
- **Offen (nicht gemessen):** Ein 25-MB-Modell im OPFS des dauerhaften Profils (rund 4 MB BLOB); die E2E prüfen die Ablage im OPFS
  mit kleinen Dateien.

### Prüfung

Nach dem Merge von `integration/welle-6` (bei `ef749df`, Tickets 105, 108–111, 113 und Review-Nachtrag D-66):
`NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün (Lint samt Paketgrenzen, Lizenzen und Clean
Room; Vitest 292 Dateien bestanden, 1 übersprungen; 3.761 Tests bestanden, 3 übersprungen wie zuvor; `node --test` 53/53).
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/speicher e2e`: 18 bestanden.

## Answer

Gemergt mit `9db5b29` (Branch `welle-6/106-speicher`, `16dca80`). Schema 6 mit Migration und Dateimigration 5→6, Modelldateiablage
(SHA-256, deflate-raw, Freigabe beim Öffnen), alle neuen Aggregate mit Löschregeln und Undo, `nettoNachNachlass`, Projektdatei v6.
Budgets: 10k-Modell speichern 1,0 s, Export/Import 25-MB-Modell 0,85/1,0 s, Plan-Undo 1.000 Vorgänge ~8 ms. Offen: 25-MB-Modell im
dauerhaften OPFS-Profil nicht gemessen; Marker in `apps/web/src/lv/texte.ts:202` entfernt Ticket 114.
