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

- [ ] Daten überleben ein Neuladen (Playwright)
- [ ] Jeder Befehl schreibt genau einen Protokolleintrag; direkter Tabellenschreibzugriff außerhalb der Repositories ist nicht möglich (A5)
- [ ] Migrationen 1→n sind einzeln getestet; ein Test öffnet eine eingefrorene Projektdatei der Schemaversion 1 mit dem aktuellen Stand
- [ ] Export → Import → Export ist byte-stabil (kanonische Reihenfolge der Schlüssel)
- [ ] `fixtures/typisch` und `fixtures/gross` lassen sich speichern und laden; Laden von `gross` unter 2 s, Wert im Ticket
- [ ] Bei voller Speicherquote oder gesperrtem OPFS gibt es einen Fehlerwert statt eines stillen Verlusts (Q5)
- [ ] `navigator.storage.persist()` wird angefragt, der Zustand ist abrufbar (Empfehlung aus `spec.md` §9)

## Nicht-Ziele

Projektliste und Projektdatei-Dialoge (S2), Undo und LV-Stände (S3), PWA-Offline und Sicherungsordner (S4), Mehrbenutzer.
