---
status: accepted
---
# SQLite-WASM in OPFS als Speicher

Projektdaten liegen relational in SQLite-WASM im Origin Private File System. Relationale Struktur passt zur LV-Hierarchie; die Projektdatei zum Sichern und Austauschen ist eine **JSON-Datei** (G-56), nicht die Datenbankdatei. Export und Import schreibt und liest die Anwendung selbst, mit Schemaversion und Migrationen (Regel A8). IndexedDB/Dexie wurde wegen fehlender Relationen und Abfragen verworfen.
