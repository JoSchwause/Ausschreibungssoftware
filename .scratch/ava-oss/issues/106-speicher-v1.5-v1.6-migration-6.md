# 106: Speicher v1.5/v1.6: Migration 6, Modelldateien, neue Aggregate

Status: claimed
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

- [ ] Migrationstests 1→6, Projektdatei v6 Rundweg (mit Modell und Bytes), Löschregeln, Undo je neuer Art, Freigabe der Bytes,
      Leistungstests im Budget
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` grün, dazu
      `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm --filter @tethys/speicher e2e` (OPFS im Browser)

## Comments
