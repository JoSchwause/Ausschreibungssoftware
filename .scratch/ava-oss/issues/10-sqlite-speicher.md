# 10: Speicher mit SQLite-WASM/OPFS, Migrationen, Befehlsprotokoll (S1)

Status: ready-for-agent
Type: task
Welle: 1 · Strang: S · Paket: `packages/speicher` (einziger Schreiber)
Blocked by: 02
Regeln: A1, A3, A5, A7, A8, G-35, G-56, ADR 0002, ADR 0009, Q5

## What to build

Schema für Projekt, LV, Gliederungsknoten, Positionen, Angebote und das **Befehlsprotokoll** (Nebenbuch; ADR 0009:
wer, was, wann), Repository-Schicht nach den Schnittstellen aus `vertrag` (Ticket 02), die ChangeSets persistiert.
**Speichern bei jedem Befehl** (G-35). SQLite-WASM im Origin Private File System (ADR 0002). Nummerierte, getestete
Vorwärts-Migrationen mit Schemaversion (A8). **Projektdatei zum Sichern/Austauschen ist JSON** (G-56): Export und
Import schreibt `speicher` selbst, mit Schemaversion; alte Dateien müssen sich weiter öffnen lassen (A8).
`speicher` importiert nur `vertrag`, nicht `kern` (A3). Der Test läuft im Browser (Playwright) und, wo möglich, mit Node-SQLite.

## Acceptance criteria

- [x] Daten überleben ein Neuladen (Playwright)
- [x] Jeder Befehl schreibt genau einen Protokolleintrag; direkter Tabellenschreibzugriff außerhalb der Repositories ist nicht möglich (A5)
- [x] Migrationen 1→n sind einzeln getestet; ein Test öffnet eine eingefrorene Projektdatei der Schemaversion 1 mit dem aktuellen Stand
- [x] Export → Import → Export ist byte-stabil (kanonische Reihenfolge der Schlüssel)
- [x] `fixtures/typisch` und `fixtures/gross` lassen sich speichern und laden; Laden von `gross` unter 2 s, Wert im Ticket
- [x] Bei voller Speicherquote oder gesperrtem OPFS gibt es einen Fehlerwert statt eines stillen Verlusts (Q5)
- [x] `navigator.storage.persist()` wird angefragt, der Zustand ist abrufbar (Empfehlung aus `spec.md` §9)

## Nicht-Ziele

Projektliste und Projektdatei-Dialoge (S2), Undo und LV-Stände (S3), PWA-Offline und Sicherungsordner (S4), Mehrbenutzer.

## Comments

### Ergebnis (Branch `worktree-agent-acca4e480e35b06c8`)

Geliefert in `packages/speicher` (einziger Schreiber): SQLite-Schema v1, nummerierte Migrationen, synchroner `SpeicherKern`, asynchrone `Speicher`-Schnittstelle des Vertrags über Worker, kanonische JSON-Projektdatei, Browser-Prüfstand mit Playwright. Außerhalb des Pakets nur `pnpm-lock.yaml` (über pnpm) und die Zeile `e2e` im Wurzel-`package.json`: `pnpm -r --if-present run e2e` statt `pnpm --filter @tethys/web e2e`, damit `pnpm e2e` auch die Browser-Tests dieses Pakets startet (Ports 4173 und 4174, kein Konflikt).

Ehrlicher Hinweis zum Vorgehen: Das Paket entstand zuerst als Kern, die Tests kamen unmittelbar danach (je Baustein), nicht strikt Rot-vor-Grün. Die Tests sind so geschrieben, dass sie fehlschlagen, wenn die Eigenschaft bricht (z. B. Rollback, Konflikterkennung, echtes `SQLITE_FULL`).

### Architektur

```
Hauptthread                          Worker (OPFS)
client.ts  --rpc.ts (Nachrichten)--> worker-host.ts --> kern.ts (SpeicherKern, synchron)
Speicher (async, Vertrag)                                  |-- lesen.ts      (nur SELECT)
                                                            |-- schreiben.ts  (einzige Stelle mit INSERT/UPDATE/DELETE)
                                                            |-- projektdatei.ts, dekoder.ts, kanonisch.ts
                                                            `-- migrationen.ts (Schema, PRAGMA user_version)
                                                      sql.ts: schmale synchrone Datenbank-Schnittstelle
                                                      backends.ts: OPFS (sahpool) | In-Memory
```

- **Trennung Logik/Backend:** Alles ab `kern.ts` kennt nur `Datenbank` (`sql.ts`). Dieselbe Logik läuft unter Node auf einer In-Memory-Datenbank **derselben SQLite-WASM-Bauart** (`@sqlite.org/sqlite-wasm`, Node-Einstieg `dist/node.mjs`; kein `node:sqlite` nötig) und im Browser gegen OPFS im Worker.
- **Async nur an der Kante:** `speicherOeffnen({ worker })` liefert `GeoeffneterSpeicher` (= `Speicher` + `schliessen()`); `speicherUeberTransport` und `direktTransport` erlauben Tests ohne Worker. Ein Absturz des Workers beantwortet offene Anfragen mit einem Fehlerwert statt sie hängen zu lassen.
- **App-Einbindung (Vite):** `import SpeicherWorker from '@tethys/speicher/worker?worker'; const r = await speicherOeffnen({ worker: new SpeicherWorker() });` (so im Prüfstand `harness/main.ts` gebaut und getestet). Exporte: `.` (Client, Kern, `kanonischesJson`, Migrationen), `./worker`, `./backends`.

### Schema v1 (`PRAGMA user_version = 1`, zugleich `schemaVersion` der Projektdatei)

| Tabelle | Inhalt |
|---|---|
| `projekt`, `bieter` | Name, Bauherr; Bieter geordnet (`reihenfolge`) |
| `leistungsverzeichnis` | Kopf: Name, `oz_maske` (kanonisches JSON), `mwst_satz`, Nachlass (`art`+`wert`) |
| `knoten` | alle Knotenarten in einer Tabelle, Schlüssel (`aggregat_id`, `id`); `eltern_id`, `reihenfolge`; Langtext/Hinweistext und EPA als JSON-Text; Menge/EP als TEXT |
| `summe_position`, `summe_gliederung`, `summe_gesamt` | gespeicherte Summen je Aggregat |
| `angebot`, `angebotsposition` | Kopf (Bieter per Fremdschlüssel), Preise oder `nicht-angeboten` |
| `auftrags_lv` | Kopf des Auftrags-LV; Knoten und Summen in denselben Tabellen wie das LV (`aggregat_id`) |
| `protokoll` | `seq` (Eintragsreihenfolge), `id` UNIQUE, Projekt, Aggregat, wer, wann, Befehl als kanonisches JSON |

Alle Tabellen `STRICT`, Fremdschlüssel an, `CHECK`s auf Arten und Flags. **Dezimalwerte stehen als TEXT in der kanonischen Zeichenkette und werden nie gerechnet oder in `number` gewandelt** (nur Casts auf die Typmarken in `zeilen.ts`, `dekoder.ts`). `number` gibt es nur für Schemaversion, `reihenfolge` und Zählwerte.

### Wie Konsistenz gesichert wird (`anwenden`)

`anwenden(eintrag, changeSet)` läuft in **einer** Transaktion (`BEGIN IMMEDIATE` … `COMMIT`) und schreibt genau einen Protokolleintrag am Ende. Weil `speicher` `kern` nicht importieren darf, wendet `schreiben.ts` das ChangeSet auf Tabellenebene an (`hinzugefuegt` einfügen, `geaendert.nachher` ersetzen, `entfernt` löschen samt Summenzeilen des Knotens, genannte Summen überschreiben, `kopf` ersetzen). **Es berechnet und prüft keine Summen.** Passt das ChangeSet nicht zum gespeicherten Stand, wird nichts geschrieben und ein Fehlerwert geliefert (nie ein stiller Teilschreibvorgang, Q5):

- **Vorherstand:** Vor jedem `geaendert`, `entfernt` und bei Kopfänderungen wird der gespeicherte Stand kanonisch mit `vorher` (bzw. dem vollen Stand in `entfernt`) verglichen. Abweichung: `unbekannt` mit Meldung „Konflikt: …“; fehlende Zeile: `nicht-gefunden`. Folge für den Kern: `vorher` muss exakt dem geladenen Zustand entsprechen (alle Felder, `null` statt fehlend).
- **Baum nach dem Schreiben:** keine verwaisten Knoten, `reihenfolge` je Elternknoten dicht 0..n-1; sonst Abbruch und Rollback.
- **Bezüge:** Eintrag und ChangeSet müssen dasselbe Aggregat und Projekt betreffen; ein neues LV braucht ein vorhandenes Projekt und Gesamtsummen; eine Angebotsposition muss eine Position des LV des Angebots sein.
- **Nicht vorgesehen und abgewiesen:** Projekt, LV oder Angebot per ChangeSet löschen (`nachher: null`); der Vertrag hat dafür keinen Befehl.
- **Rollback:** jede Ausnahme (Konflikt, Quote, Sperre, doppelte Protokoll-ID) rollt die ganze Transaktion zurück; sie wird an der Paketgrenze in einen Fehlerwert gewandelt (`fehler.ts`).

### A5: kein direkter Tabellenschreibzugriff

Die Datenbank liegt in einem echten privaten Feld (`#db`) des Kerns; über den Worker sind nur die zehn Methoden aus `RPC_METHODEN` erreichbar (Test: rohes SQL, `constructor` u. a. werden abgewiesen); schreibende SQL-Anweisungen stehen nur in `schreiben.ts` (Daten) und `migrationen.ts` (Schema), per Quelltext-Test erzwungen. Nicht abgedeckt: wer im selben Ursprung per DevTools oder eigenem Skript an das OPFS geht; das lässt sich im Browser nicht verhindern.

### VFS-Wahl und Header (Befund für den Nutzer)

- **Gewählt: `opfs-sahpool`** (SQLite-WASM, `installOpfsSAHPoolVfs`) im Worker. Er braucht **weder SharedArrayBuffer noch COOP/COEP**. Belegt: Der Prüfstand wird absichtlich ohne diese Header ausgeliefert, der Test prüft `crossOriginIsolated === false` und `typeof SharedArrayBuffer === 'undefined'`, und alle OPFS-Tests laufen trotzdem.
- **Der Alternativ-VFS `opfs`** (Async-Proxy) braucht SharedArrayBuffer und damit `Cross-Origin-Opener-Policy: same-origin` und `Cross-Origin-Embedder-Policy: require-corp`. GitHub Pages kann keine Header setzen; mit `opfs` wäre der Betrieb dort nur über Umwege (Service-Worker-Header-Shim) möglich. Daher nicht gewählt.
- **Was `apps/web` und GitHub Pages später brauchen:** nichts an Headern. Nötig sind ein sicherer Kontext (HTTPS oder `localhost`; GitHub Pages ist HTTPS), Modul-Worker-Unterstützung (alle aktuellen Browser) und der Worker-Import `@tethys/speicher/worker?worker`. Vite-Dev: `optimizeDeps.exclude: ['@sqlite.org/sqlite-wasm']`, `worker.format: 'es'` (siehe `packages/speicher/vite.config.ts`). Das WASM (~880 kB) wird als Asset ausgeliefert; das ist für das PWA-Caching (S4) einzuplanen.
- **Preis von `opfs-sahpool`:** Die Datenbank gehört **exklusiv einer Verbindung je Ursprung**. Ein zweiter Tab (oder ein zweiter Worker, auch ein doppelt gemounteter React-Effekt) bekommt den Fehlerwert `gesperrt` (real getestet: `NoModificationAllowedError … createSyncAccessHandle`). Die App muss das als „Projekt ist in einem anderen Tab geöffnet“ behandeln und den Worker beim Schließen mit `schliessen()` freigeben. Die Dateien liegen als Pool unter `.tethys-<name>/` im OPFS und sind dort nicht als normale Datei lesbar; die Sicherung läuft ohnehin über die JSON-Projektdatei (G-56). `initialCapacity` 12 Handles.
- **Datenverlust-Falle (behoben, getestet):** `removeVfs()` löscht die Daten; `schliessen` benutzt deshalb `pauseVfs()`.

### Gemessene Werte

Chromium (Playwright, `PW_CHROMIUM_PATH`), headless, OPFS, mehrere Läufe auf derselben Maschine:

| Messung | Wert |
|---|---|
| **Laden `gross` (5.000 Positionen) aus OPFS, erster Aufruf nach Neuladen der Seite und Neustart des Workers, einschließlich Worker-Nachricht** | **383 bis 463 ms** (Ziel < 2 s: erreicht) |
| Laden `gross`, Folgeläufe (Median von 5) | 129 bis 138 ms |
| Speichern `gross` (Projekt + ein `LeistungsverzeichnisAnlegen` mit 5.000 Positionen, ein `anwenden`) | 1.252 bis 1.427 ms |
| Einzelbefehl auf `gross` (ein geänderter Knoten, 20 Läufe) | Median 47 ms, Maximum 62 bis 93 ms (zwei Läufe; nicht optimiert; enthält Vorherstand-Vergleich und Baumprüfung) |
| Export `gross` / Import `gross` (OPFS → zweite OPFS-Datenbank) | 283 bis 297 ms / 955 bis 1.303 ms, Datei 10.349.082 Bytes |
| Node, In-Memory: speichern / laden `gross` | 471 ms / 158 ms |

Persistenzstatus in headless Chromium: `{"angefragt":true,"persistent":false}` (der Browser gewährt `persist()` dort nicht; in echten Browsern hängt es von Engagement und Installation ab).

### Verifikation je Kriterium

1. **Neuladen:** `e2e/speicher.spec.ts` speichert `typisch` und `gross` im OPFS, lädt die Seite neu, öffnet den Speicher neu und vergleicht LV, Angebote, Projekt und Protokollzahl kanonisch; ein dritter Test lädt ohne `schliessen` neu (Tab-Absturz nachgestellt) und findet den letzten Befehl.
2. **Ein Protokolleintrag je Befehl / A5:** `kern.test.ts` zählt Einträge vor und nach jedem `anwenden`, prüft Reihenfolge und Inhalt, und dass abgewiesene ChangeSets weder Daten noch Eintrag hinterlassen (auch wenn erst der Protokolleintrag scheitert); `client.test.ts` prüft Methodenliste, `#db` und die Quelltext-Regel.
3. **Migrationen:** `migrationen.test.ts`: `describe.each(MIGRATIONEN)` prüft je Migration Versionssprung n-1 auf n, Zeilenerhalt und das Soll-Schema (`SCHEMA_ABBILD` je Version); fehlschlagende Migration rollt zurück (`migration-fehlgeschlagen`); zu neue Datenbank gibt `schema-zu-neu`. Die Dateimigrationen sind mit künstlichen Versionen 2 und 3 getestet. **Eingefrorene Datei:** `fixtures/projektdatei-v1.json` (Prüfsumme im Test, nie ändern) wird mit dem aktuellen Stand importiert, Fachwerte werden geprüft; in Version 1 ist der Export byte-gleich der Datei. Der Test bleibt unverändert gültig, wenn Version 2 kommt (Datei wird über `datei`-Migrationen gehoben; für v2 kommt eine zweite eingefrorene Datei dazu).
4. **Byte-stabil:** Export → Import (neue Datenbank) → Export für `winzig`, `typisch`, `gross` unter Node und für `typisch`, `gross` im Browser (zwei OPFS-Datenbanken); die Datei ist kanonisch (Schlüssel aufsteigend, Arrays in Datenbank-Kanonreihenfolge, zwei Leerzeichen, Zeilenumbruch).
5. **Fixtures:** `typisch` (mit Angeboten) und `gross` kommen unverändert zurück (Node und Browser), Dezimalwerte bleiben Zeichenketten. Zeit siehe oben.
6. **Fehlerwerte:** *Gesperrt* real im Browser (zweiter Worker auf derselben OPFS-Datenbank). *Voll* real unter Node: `PRAGMA max_page_count` lässt SQLite echtes `SQLITE_FULL` werfen; Ergebnis `speicher-voll`, Datenbank unverändert und danach weiter nutzbar. Zusätzlich **injizierter Ausfall** (Datenbank-Decorator wirft mitten im ChangeSet): `QuotaExceededError`, `NoModificationAllowedError`, SQLite BUSY/FULL/IOERR; jeweils Fehlercode, Rollback. **Nicht getestet:** eine echte Erschöpfung der Browser-Quote im OPFS (nicht reproduzierbar ohne Füllen der Platte); die Abbildung `QuotaExceededError` auf `speicher-voll` ist nur über die Injektion belegt. Öffnungsfehler (gesperrt, voll, `schema-zu-neu`) gehen als Fehlerwert über den Worker und beenden ihn.
7. **`persist()`:** `speicherOeffnen` fragt `navigator.storage.persist()` an; `persistenzstatus()` liefert `{angefragt, persistent}` (`persistent: null`, wenn API fehlt oder wirft). Unit-Tests mit Attrappe, Browser-Test mit echtem Aufruf.

### Probleme mit dem Vertrag (`vertrag` unverändert; Vorschläge für ein eigenes Ticket, A4)

1. **Kein Fehlercode für Konflikte.** „ChangeSet passt nicht zum gespeicherten Stand“ und „Projekt existiert beim Import schon“ haben keinen Code in `Speicherfehlercode`. Umgesetzt als `unbekannt` mit Meldung „Konflikt: …“ beziehungsweise „… existiert bereits“. Vorschlag: `'konflikt'` und `'existiert-bereits'`.
2. **Auftrags-LV ohne Schreibweg und Repository.** `Projektdatei.auftragsLeistungsverzeichnisse` gibt es, aber `ChangeSet` hat keine Variante dafür und `Speicher` kein Repository. Das Paket speichert, exportiert und importiert Auftrags-LVs nur über die Projektdatei (Tabelle `auftrags_lv`, Test mit der eingefrorenen Datei); `anwenden` kann sie nicht erzeugen, Lesen geht nur über den Export.
3. **Kein Löschen.** Es gibt keinen Befehl und keinen ChangeSet-Weg „Projekt, LV, Angebot löschen“ (nur Knoten). `nachher: null` am Projekt, LV-Kopf oder Angebotskopf wird abgewiesen.
4. **`Speicher` hat kein `schliessen()`.** Der Worker muss beim Schließen die OPFS-Handles freigeben (sonst `gesperrt` beim nächsten Öffnen im selben Tab). Ergänzt in `GeoeffneterSpeicher` (Erweiterung im Paket, kein Vertragseingriff); Vorschlag: in die Schnittstelle aufnehmen.
5. **Protokoll speichert ganze Befehle.** `LeistungsverzeichnisAnlegen` trägt den vollen Inhalt (5.000 Positionen). Das Protokoll und damit die Projektdatei enthalten das LV deshalb doppelt: `gross` als Datei 10,3 MB, in der Datenbank entsprechend. Das ist ADR 0009 wörtlich, aber teuer; offene Frage an den Nutzer: große Importbefehle im Protokoll nur als Verweis oder gekürzt festhalten?
6. **Befehle werden beim Import nur flach geprüft.** `speicher` darf `kern` nicht importieren; ein importierter Befehl wird auf bekannte `art` und JSON-Tauglichkeit (keine Gleitkommazahlen) geprüft, nicht auf seine fachliche Form.
7. **Reihenfolgen sind kanonisch, nicht die der Eingabe.** `LvZustand.leistungsverzeichnis.knoten` kommt in Tiefensuche-Reihenfolge zurück (Fixtures wie `gross` sind anders sortiert); Summenlisten und `Angebot.positionen` nach Kennung. Inhaltlich geht nichts verloren; wer eine andere Anzeigereihenfolge braucht, bildet sie aus `elternId`/`reihenfolge`.

### Abweichungen und Grenzen

- Projektdatei-Import überschreibt kein vorhandenes Projekt (Q5); Dialoge und „ersetzen“ sind S2.
- `Los`, `Titel`, `Position`, `Hinweistext` liegen in einer Tabelle `knoten` mit nullbaren Spalten (CHECKs je Art), nicht in vier Tabellen.
- Gleitkommazahlen in Projektdatei oder Befehlen sind `datei-ungueltig`; Dezimalwerte außerhalb der kanonischen Schreibweise mit der Stellenzahl des Typs (N3) ebenso.
- Test-Hilfen (`src/testhilfe/`) lesen die Fixtures per `readFileSync`, nicht per Import (Paketgrenze A3 gilt für `speicher`).
- Der Prüfstand `harness/` mit eigener `vite.config.ts` und `playwright.config.ts` liegt im Paket; `apps/web` wurde nicht angefasst.
