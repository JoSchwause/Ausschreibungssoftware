---
status: accepted
---
# SQLite-WASM in OPFS als Speicher

Projektdaten liegen relational in SQLite-WASM im Origin Private File System. Relationale Struktur passt zur LV-Hierarchie; die Datenbankdatei kann direkt als Projektdatei exportiert und als Backup re-importiert werden. IndexedDB/Dexie wurde wegen fehlender Relationen und Abfragen verworfen.
