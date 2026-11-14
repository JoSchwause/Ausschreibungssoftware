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
- Ergänzung E-13 (2026-11-10): Bei Massenbefehlen (z. B. `LeistungsverzeichnisAnlegen` aus einem GAEB-Import) werden nur Kopf und Prüfsumme protokolliert, nicht der vollständige Befehl. Alle anderen Befehle bleiben vollständig im Protokoll.
- Ergänzung (2026-11-10, `vertrag` v1.1b): Der Typ legt die Kurzfassung so fest. Ein `Protokolleintrag` trägt in `befehl` entweder den vollständigen `Befehl` oder eine `Befehlskurzfassung` (`art: 'Befehlskurzfassung'`) mit `kopf` und `pruefsumme`. Der Kopf ist der Befehl ohne seine lange Liste (`Massenbefehlskopf`: `LeistungsverzeichnisAnlegen` ohne `knoten`, `AngebotAnlegen` ohne `positionen`, `AuftragsLeistungsverzeichnisAnlegen` ohne `knoten`). Die Prüfsumme (`Pruefsumme`) nennt ihren Algorithmus als Feld (`sha-256` oder `sha-512`), damit er wechselbar bleibt, und den Wert hexadezimal. Welche Befehle Massenbefehle sind, steht in der Konstante `MASSENBEFEHLSARTEN`. Vorläufige Annahme, Entscheidung offen: Die Summe gilt für die kanonische JSON-Darstellung des vollständigen Befehls.
- Ergänzung (2026-11-14, `vertrag` v1.7c, D-104): Das Löschen eines Projekts samt Inhalt (`ProjektSamtInhaltLoeschen`) entfernt sein Protokoll mit ihm; der Eintrag des Löschens bleibt nicht stehen (wie bei `ProjektLoeschen`). Das Undo stellt das Protokoll wie zum Zeitpunkt des Löschens wieder her und hängt, wie jeder Befehl, einen Eintrag `Rueckgaengig` an. Beim erneuten Löschen (Wiederholen) muss das gespeicherte Protokoll mit dem des gelöschten Bestands beginnen; dahinter dürfen nur Einträge `Rueckgaengig` und `Wiederholen` stehen.
