---
status: accepted
---
# Befehlsprotokoll als dauerhaftes Nebenbuch

Undo/Redo und benannte LV-Stände aus ADR 0006 bleiben. Zusätzlich speichert das Projekt dauerhaft ein Protokoll aller Befehle (wer, was, wann), ohne eigene Ansicht in v1. Das Protokoll ist ein Nebenbuch: Die Quelle der Wahrheit bleibt der Tabellenzustand, nicht ein Ereignisstrom. Das Feld „wer“ wird in v1 mit dem einen Nutzer befüllt und ist für den späteren Mehrbenutzerbetrieb vorgehalten.

Dies ersetzt teilweise ADR 0006, die einen Event-Log ausschloss. Grund: Das Recherche-Ziel eines unveränderlichen Protokolls wird vorbereitet, ohne den Zustand auf Ereignisse umzustellen.

## Consequences
- Jeder Befehl (Regel A5) schreibt einen Protokolleintrag; kein direkter Tabellenschreibzugriff.
- Das Protokoll ist nicht in der UI sichtbar und wird nicht von Undo verwendet.
- Entscheidung getroffen im Grilling vom 2026-11-09 (Frage G-24).
