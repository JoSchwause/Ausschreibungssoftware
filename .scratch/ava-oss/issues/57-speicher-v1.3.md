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

- [ ] Migrationstest 3 → 4 auf Datenbank und Projektdatei; eingefrorene Dateien v1–v3 öffnen sich
- [ ] Rundweg (Speichern → Laden, Export → Import, Undo) mit Mengenansatz, EPA-Bezeichnungen und Auftragnehmer
- [ ] `auflisten` liefert `LvUebersicht` sortiert
- [ ] `NODE_OPTIONS=--max-old-space-size=8192 pnpm lint && pnpm typecheck && pnpm test` und die E2E von `speicher` und
      `@tethys/web` grün

## Nicht-Ziele

Neue Befehle, Oberfläche, GAEB.

## Comments

### Aus Ticket 53 (Review, D-27)
- `Summenaenderung.vorher` ist Pflicht: Prüfung in `speicher` überall, nicht nur beim Löschen.
- `pruefeV13` (vorläufige Abweisung der neuen Felder) entfernen, sobald sie gespeichert werden.
- Projektdatei-Dekoder: neue Schemaversion mit den Feldern; Papierkorb- und LV-Stand-Rundweg mit Mengenansatz.
- EPA-Bezeichnungen in der Form aus D-28 (`nummer`, `anteil`, `bezeichnung | null`).
