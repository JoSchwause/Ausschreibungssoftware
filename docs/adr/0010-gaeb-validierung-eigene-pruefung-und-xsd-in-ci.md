---
status: accepted
---
# GAEB-Validierung: eigene Prüfung in der App, XSD nur als CI-Gegenprüfung

Die App prüft GAEB-Dateien zur Laufzeit mit einer eigenen Validierung. Das offizielle XSD (© DIN, ohne Lizenz) wird nur zur Build- und Testzeit in der CI geladen, als unabhängige Gegenprüfung, und nie ins Repository committet.

Ein Export mit fehlgeschlagener formaler Prüfung wird nicht gesperrt, sondern mit einer Warnung versehen und als Entwurf gekennzeichnet.

Grund: Die eigene Prüfung allein wäre nicht unabhängig. Die XSD-Gegenprüfung in der CI macht sie nachprüfbar, ohne dass die lizenzierte Datei ins Repository gelangt.

## Consequences
- Regel Q3: Jeder Export wird in der CI gegen das XSD validiert; jede unterstützte Phase hat einen Roundtrip-Test.
- Milestone M2 bleibt so bestehen, ohne das XSD im Repository.
- Entscheidung getroffen im Grilling vom 2026-11-09 (Fragen G-12 und G-13).
