---
status: accepted
---
# Lizenz AGPL-3.0-or-later für das gesamte Repository

Das gesamte Repository steht unter AGPL-3.0-or-later, ohne Aufteilung in Fachpakete. Beiträge werden per DCO (Developer Certificate of Origin) eingereicht, Lizenzkennzeichnung erfolgt nach REUSE. Dies ersetzt die Lizenzregel in ADR 0007; die Clean-Room-Regel dort gilt unverändert. Grund: eine Lizenz für alles ist einfacher zu prüfen und zu erklären.

## Consequences
- Jede Abhängigkeit braucht eine AGPL-kompatible Lizenz; Lizenzprüfung in der CI (Regel C5).
- Beiträge von außen werden erst nach dem MVP angenommen; der Tracker bleibt bis dahin lokal (G-43).
- Entscheidung getroffen im Grilling vom 2026-11-09 (Frage G-40).
