# 139: Speicher v1.7: Migration 7, Projektdatei Schema 7, Einstellungen, Einlesen als Kopie

Status: resolved
Type: task
Welle: 7 · Strang: S · Paket/Ordner: `packages/speicher`
Blocked by: 127, 135
Modell: opus
Priorität: P (`../umfang-welle-7.md` §3: P nie gekürzt, S Soll, K Kann)
Regeln: A8, A6, Q4, Q5, U7; D-73, D-74
Herkunft: umfang §3 E8 (Projektdatei als Kopie, Zuschlag zurücknehmen), E15, E10

## What to build

1. **Migration 7** (SQLite) und **Projektdatei Schema 7** für alle Felder aus 127 (und später 128: Felder optional,
   Schema 7 reicht für beide, wenn 128 vor dem Ende gemergt ist; sonst vermerken).
2. **Einstellungen** (D-73): eigenes Repository und Tabelle, außerhalb der Projekt-Undo-Historie; Projektdatei trägt sie als
   optionalen Block; Einlesen füllt nur Fehlendes je Schlüssel und gibt zurück, was übernommen und was belassen wurde.
3. **Projektdatei einlesen, wenn das Projekt schon da ist:** Funktion „als Kopie einlesen“ (neue IDs für alle Entitäten,
   Verweise konsistent umgeschrieben, Modelldateien mit), Name mit Zusatz „(Kopie)“.
4. Speicherung der neuen Befehle aus 137/138 (falls generisch über ChangeSets schon abgedeckt, nur Tests); Zuschlag zurücknehmen
   über den bestehenden `konflikt`-Weg bei Mangelverweisen (v1.6).
6. **Befund aus 134:** nach einem Neuladen meldet die App einmal `createSyncAccessHandle … another open Access Handle`, weil der alte Speicher-Worker die OPFS-Datei noch hält. Ursache prüfen (Worker beim `pagehide` schließen oder Wiederholung mit Wartezeit), Test.
7. **Aus dem Review (D-82):** M1 – Tabelle für das Einstellungsprotokoll in Migration 7, `EinstellungenRepository.anwenden(eintrag, changeSet)` in einer Transaktion, `protokoll()`. M2 – ein Stand-ChangeSet mit `lvStand.vorher: null` friert nur bei `LvStandAnlegen` (oder `Wiederholen` davon) ein, sonst `unbekannt`. S1 – Stände nach `angelegt, seq` sortieren, Undo des Löschens legt den Stand an seinen Platz. S2 – Umbenennen (beide Seiten gesetzt, heute abgewiesen in `schreiben.ts:663`) und Wiederherstellen eines Stands mit Tests. S10 – beim Einlesen als Kopie auch die Kennungen in eingefrorenen Ständen umschreiben.
5. Ältere Projektdateien (Schema 1–6) öffnen weiter (A8): Tests mit den vorhandenen Projektdatei-Fixtures.

## Acceptance criteria

- [x] Migrationstest 6 → 7, Projektdatei 1–6 → 7, Kopie-Import mit Verweisprüfung; Budgets grün
- [x] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün; betroffene E2E grün
  (`CI=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/web exec playwright test <spec> --trace off`)
- [x] Kein Leistungsbudget gelockert, keine CI-Prüfung abgeschwächt; Texte für Nutzer nach L4/L5 (unpersönlich, keine
  Ticketnummern, keine Code-Kennungen, keine Paketnamen)

## Comments
- D-139.1 Migration 7 (`migrationen.ts`, `SCHEMA_V7`): neue Spalten als kanonisches JSON, `NULL` = fehlt (`projekt.angaben`,
  `bieter.angaben`, `leistungsverzeichnis.preisspiegel`, `knoten.kalkulation` mit CHECK „nur Position“); keine Neuberechnung
  (D-17), keine neue Aggregatart, `protokoll` bleibt. Einstellungen: **eine Zeile** (`einstellungen`, `id = 1`, der ganze Wert als
  kanonisches JSON). Grund: Das ChangeSet trägt sie immer ganz, sie werden nur ganz gelesen und sind klein; ein neues optionales
  Feld braucht so keine Migration. Dazu `einstellungen_protokoll` (`seq`, `id`, `wer`, `wann`, `befehl`) nach D-82 M1.
  Dateimigration 6 → 7 (`dateimigration7.ts`) lässt den Inhalt gleich und weist das Neue in einer Datei der Version 6 ab.
- D-139.2 A5 (Ticket 128) ist noch nicht im Vertrag. **Vermerk für 128/143:** Die Rechnung liegt ganz als JSON in
  `rechnung.angaben` (D-79.1); neue optionale Felder der Rechnung (Vertragsstrafe, Skonto, Bauabzugsteuer) und Zahlungen als Teil
  der Rechnung brauchen **keine SQL-Migration**, nur den Dekoder und eine Prüfung in der Dateimigration (Nachtrag zu Migration 7,
  solange Schema 7 nicht veröffentlicht ist; sonst Migration 8 ohne SQL). Werden Zahlungen ein eigenes Aggregat, braucht es eine
  Migration 8 mit Tabelle und neuer CHECK-Regel von `protokoll.aggregat_art` (Umkopieren wie Version 5/6) und einen Eintrag in
  `AGGREGATARTEN` (vom Typ erzwungen, samt `kennungen` für die Kopie).
- D-139.3 Schreibweg der neuen Felder: Was der Vertrag „nie“ nennt und der Dekoder darum abweist, schreibt `speicher` auch nicht
  (`unbekannt`, nichts geschrieben; wie D-79.3): Angaben oder Anschrift ganz `null`, leere Kalkulation, `preisspiegel` am
  Auftrags-LV. Der Dekoder prüft die Form der neuen Felder und des Blocks `einstellungen` (Texte nie `''`, kanonische Dezimalwerte,
  Aufzählungen, Namen und Nummern eindeutig, Kostengruppen geordnet), nicht die Regeln des Ausführers (Bereich der Sätze, A ≤ B):
  sonst ließe sich ein Export nicht wieder einlesen (D-79.4).
- D-139.4 Bieter: Ein Projekt-ChangeSet, das einen Bieter mit Angebot entfernt (auch als Undo), ist `konflikt` und nennt die
  Angebote, bevor etwas geschrieben ist (D-127.2; vorher hätte der Fremdschlüssel mit `unbekannt` abgebrochen).
- D-139.5 LV-Stände (D-127.1, D-82 M2, S1, S2): `anwenden` gibt dem Schreibweg den Anlass mit (Art des Befehls, bei
  `Rueckgaengig`/`Wiederholen` die Art des ursprünglichen). Einfrieren nur bei `LvStandAnlegen` und dessen `Wiederholen`, Entfernen
  ohne Inhalt nur als `Rueckgaengig` eines `LvStandAnlegen`, jede andere Form `unbekannt`. Umbenennen ändert nur `name` (gleiche
  Kennung, gleiches LV, kein Inhalt); Löschen prüft Kopf, `angelegt` und Zustand gegen den gespeicherten Stand (`konflikt`);
  Wiederherstellen legt genau den Stand aus dem ChangeSet ab. Ordnung `angelegt, seq` in Liste und Projektdatei; Stände mit genau
  demselben `angelegt` (nur in Tests, alle Fixtures bis Version 6) stehen nach der Reihenfolge des Schreibens, ein
  wiederhergestellter also hinter ihnen. Die Testhilfe `befehlFuer` gibt Tests, die einen Stand einfrieren, den Befehl
  `LvStandAnlegen`.
- D-139.6 Einlesen als Kopie (D-127.10, D-82 S10): Die `IdQuelle` (Funktionen) kommt nicht über `postMessage` zum Worker. Der
  Client fragt deshalb den Bedarf an Kennungen je Art ab (`projektdateiKennungsbedarf`, liest die Datei wie das Einlesen), zieht sie
  aus der `IdQuelle` und schickt sie als Daten (`kennungen.ts`, im Hauptthread ohne den Schreibweg). `AGGREGATARTEN` kennt je Art
  die global geschlüsselten Kennungen der Datei (`kennungen`, LV samt Ständen). `kopie.ts` ersetzt **jeden Wert** der Aggregate, der
  einer dieser Kennungen gleicht (Kennungen sind undurchsichtig und eindeutig, A7): So gehen auch Wurzel (`elternId`), Nachtrag,
  eingefrorene Stände, `bezug.id` von Vorgängen, Honorar und Mangel ohne Liste der Schlüssel mit, und ein neues Feld mit Verweis
  (etwa aus A5) ebenso. Test mit der Datei der Version 6 (jede Aggregatart, jede Verweisart): keine alte Kennung bleibt, zurück
  abgebildet gleicht die Kopie dem Original; über eine Grenze mit `structuredClone` wie beim Worker.
- D-139.7 Einstellungen in der Projektdatei (D-127.9 nach D-82 M1): Der Export trägt den Block, außer die Einstellungen sind leer.
  `projektdateiImportieren` übernimmt nichts; `projektdateiEinlesen` nur mit `einstellungsuebernahme` und schreibt dann
  `EinstellungenUebernehmen` mit dem ChangeSet in der Transaktion des Projekts, nur wenn etwas übernommen wird. Der Bericht folgt aus
  dem ChangeSet (`einstellungsbericht`). **Offener Rest:** Ausführer von `EinstellungenUebernehmen` ist der Kern (137, noch nicht in
  `integration/welle-7`); bis dahin rechnet `speicher` nach derselben Regel (`einstellungenUebernehmen`, D-127.9 lässt beides zu).
  Nach dem Merge von 137 ersetzt der Aufruf von `einstellungenBefehlAusfuehren` diese Funktion in
  `uebernimmEinstellungenDerDatei` (eine Zeile).
- D-139.8 Einstellungsprotokoll (D-82 M1): `anwenden(eintrag, changeSet)` prüft wie beim Projekt, dass `Rueckgaengig`/`Wiederholen`
  auf einen ursprünglichen Eintrag dieses Protokolls zeigt (`konflikt`), schreibt Einstellungen und Eintrag in einer Transaktion;
  `protokoll()` in Schreibreihenfolge. Das Protokoll steht nicht in der Projektdatei.
- D-139.9 Befund aus 134 (Punkt 6): Ursache ist nicht das Schließen (die App schließt bei `pagehide` und versucht es bei
  `gesperrt` erneut), sondern dass der VFS „opfs-sahpool“ den ersten, gescheiterten Zugriff selbst in der Konsole meldet, solange der
  Worker der vorigen Seite die Dateien noch hält. Der Worker prüft die Dateien des Pools nun vorher still (`opfs-pool.ts`): Hält sie
  jemand, ist das Öffnen `gesperrt` wie bisher, ohne dass SQLite es versucht. Kein zusätzliches Warten, also keine längere Zeit bis
  zur Meldung „anderer Tab“. Test: `opfs-pool.test.ts` (nachgebildetes OPFS) und `e2e/speicher.spec.ts` (ohne Probe rot mit genau
  der Meldung, mit Probe grün). Die Ausnahme für diese Meldung in `apps/web/e2e-basispfad/basispfad.spec.ts:14` kann entfallen
  (nicht mein Paket).
- D-139.10 Rest von 135 (D-135.5): Der Dekoder nimmt KG-Form, Hash-Form, Bauteilmengen-, Strukturknotenarten und IFC-Schemata aus
  `vertrag`.
- D-139.11 Ältere Goldens: Die Tests der Version 6 (Einheit und E2E), die den Export byte-gleich zur Datei verlangten, vergleichen
  nun mit der Datei in der aktuellen Version (nur die Versionsnummer anders); `aufSchema5` geht zuerst auf Version 6 (wie D-79.6).
  Die eingefrorene Datei der Version 7 entsteht aus `schritteV7` (Projekt- und Bieterangaben, Bieter angelegt und umbenannt,
  Preisspiegel, Kalkulation, Stand umbenannt, Stand angelegt, gelöscht und per Undo zurück, Einstellungen); erzeugt nach der
  Umbenennung zu `PreisspiegelEinstellungenSetzen` (D-82 S5).
- D-139.12 Prüfung: `pnpm lint` grün, `pnpm typecheck` grün. `pnpm test`: 4190 grün, 5 rot, alle Leistungsbudgets unter Last
  (Load 27–33 auf 4 Kernen, mehrere Agenten): `speicher` Aufmaßblatt (Median 144–229 ms), Modell 10.000 Bauteile (5,3–7,2 s, davon
  das Ablegen samt SHA-256 4,5–4,8 s), BauteileZuordnen samt Undo (130–143 ms); `vergabe` Preisspiegel, `apps/web` Aufmaß-Undo
  (nicht in diesem Paket; wie D-134.6, D-135.6). Gegenprobe A/B gleichzeitig unter derselben Last, alter Stand von
  `integration/welle-7` gegen diesen: Aufmaß 213/186/183 ms gegen 160/229/228 ms und 106/100/161 ms gegen 118/109/101 ms,
  BauteileZuordnen samt Undo 183 ms gegen 143 ms, also kein Unterschied über das Rauschen hinaus. Bei Load 3 liefen beide
  `speicher`-Budgetdateien grün (6/6). Kein Budget gelockert. E2E: `speicher` 19/19 grün (neu: keine Konsolenmeldung bei
  `gesperrt`; der Test „Version 6 importieren“ vergleicht den Export nun in der aktuellen Version), `apps/web` `start`, `huelle`,
  `sicherung`, `projekt`, `undo`, `lv` 21/21 grün. Keine Nutzertexte geändert.

## Answer

Gemergt nach `integration/welle-7` mit `6df195a`. Ergebnisse, Testläufe und Entscheidungen (D-139.x) unter `## Comments`.
