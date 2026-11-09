---
status: accepted
---
# Lokale PWA ohne Server in v1

Die Software ist in v1 eine rein lokale, installierbare Web-App (PWA) für Einzelbenutzer. Es gibt keinen Server, keine Anmeldung und keine Mandanten; Daten werden ausschließlich über Dateien (GAEB, JSON-Projektdatei) ausgetauscht. Grund: privates Lern-/Open-Source-Projekt mit minimalem Betriebsaufwand. Ein Sync-Server wird frühestens nach v1 erwogen.

## Considered Options
- Postgres-Server als führende Datenquelle (verworfen: Betriebsaufwand, widerspricht Local-First)
- Desktop-Binary mit Tauri (später als Wrapper möglich)
