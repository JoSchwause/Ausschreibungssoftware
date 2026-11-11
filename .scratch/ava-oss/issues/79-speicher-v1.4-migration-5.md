# 79: Speicher v1.4: Migration 5, Repositories für Auftrags-LV, Aufmaß, Rechnung, Kostenermittlung

Status: claimed
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
